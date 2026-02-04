/*****
 * Copyright (c) 2024 Radius Software
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*****/


/*****
 * The session is the core infrastructure object used for tracking and managing
 * a user or host session on this Radius instance.  Sessions are the basis for
 * keeping track of authenticated users and for authorization requresed actions
 * for authenticated users.  One of the more esoteric features is that the
 * session can be used to communicate messages to a host or a user.  The socket
 * is used as a handle to send messages to the user if there's an available web
 * socket connection in place.
*****/
define(class Session extends Emitter {
    constructor() {
        super();
        this.token = '';
        this.live = false;
        this.data = {};
        this.addrHistory = [];
        this.initialPath = '';
        this.acceptedCookies = '';
        this.uuid = Crypto.generateUUID();
        this.team = mkTeamHandle();
        this.user = mkUserHandle();
        this.auths = [ 'submit-username' ];
        this.userAgent = '';
        this.timeout = null;
    }

    addRemoteHost(addr) {
        if (addr != this.getRemoteHost()) {
            this.addrHistory.push(addr);
        }

        return this;
    }

    async authorize(required) {
        return await mkPermissionSetHandle().authorize(
            required,
            this.permissions,
        );
    }

    clearData(key) {
        delete this.data[key];
       
        return this;
    }

    getAcceptedCookies() {
        return this.acceptedCookies;
    }

    getAuthState() {
        if (this.auths.length) {
            return this.auths[0];
        }
        else {
            this.live = true;
            return 'live';
        }
    }

    getData(key) {
        return this.data[key];
    }

    getInitialPath() {
        return this.initialPath;
    }

    getRemoteHost() {
        if (this.addrHistory.length) {
            return this.addrHistory[this.addrHistory.length - 1];
        }

        return '';
    }

    getRemoteHostHistory() {
        return this.addrHistory;
    }

    getTeam() {
        return this.teamHandle;
    }
    
    getToken() {
        return this.token;
    }

    getUser() {
        return this.user;
    }

    getUserAgent() {
        return this.userAgent;
    }

    async getUsername() {
        if (this.user.getId()) {
            let emailAddr = await this.user.getEmailAddr();
            let emailAddrObj = await emailAddr.getEmailAddrObj();
            return emailAddrObj.addr;
        }
        else {
            return '';
        }
    }
    
    getUUID() {
        return this.uuid;
    }

    async gotoNextAuthStep() {
        if (this.auths.length) {
            return this.auths[0];
        }
        else {
            this.live = true;

            if (!(await this.permissions.hasPermission('radius:signedin'))) {
                await this.permissions.setPermissions('radius:signedin');
                let userPermissions = await this.user.getPermissions();
                await this.permissions.setPermissions(...userPermissions);
            }

            return 'live';
        }
    }

    hasData(key) {
        return key in this.data;
    }

    async hasPermission(permissionType) {
        return this.permissions.hasPermission(permissionType);
    }
    
    async init() {
        this.permissions = await mkPermissionSetHandle().createPermissionSet('radius:session');
        this.timeoutMillis = await mkSettingsHandle().getSetting('sessionTimeoutMillis');
        this.shutdownMillis = await mkSettingsHandle().getSetting('sessionShutdowntMillis');
        this.token = await Crypto.generateToken('sha256', this.uuid);
        this.touch();
        return this;
    }

    async listPermissions() {
        return await this.permissions.listPermissions();
    }

    async revert() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.live = false;
        this.teamHandle = mkTeamHandle();
        this.userHandle = mkUserHandle();
        this.auths = [ 'submit-username' ];

        for (let permission of await this.permissions.listPermissions()) {
            if (!(permission in { 'radius:cookies':0, 'radius:session':0 })) {
                await this.permissions.clearPermissions(permission);
            }
        }

        this.touch();
        return this.auths[0];
    }

    async setAuthentication() {
        this.auths = [];
        let deviceId = this.acceptedCookies;
        let emailOnline = (await mkEmailerHandle().getStatus()) == 'online';
        let smsOnline = (await mkSmSHandle().getStatus()) == 'online';
        let authAppOnline = (await mkAuthAppHandle().getStatus()) == 'online';

        if (await this.user.hasExcessAttempts()) {
            await mkPasswordHandle().revokePassword(this.user.getId());

            if (emailOnline) {
                if (await this.user.isChannelVerified('email2')) {
                    this.auths.push('verify-email2');
                }
                else {
                    this.auths.push('verify-email');
                }
            }

            if (authAppOnline) {
                if (await this.user.isChannelVerified('authApp')) {
                    this.auths.push('verify-aapp');
                }
            }
            else if (smsOnline) {
                if (await this.user.isChannelVerified('sms')) {
                    this.auths.push('verify-sms');
                }
            }
        }
        else {
            if (await mkPasswordHandle().hasCurrentPassword(this.user.getId())) {
                this.auths.push('submit-password');
            }

            if (!(await this.user.isDeviceVerified(deviceId))) {
                if (emailOnline) {
                    this.auths.push('verify-email');
                }

                if (await this.user.hasAuxFactor()) {
                    if (otpOnline) {
                        if (await this.user.isChannelVerified('otp')) {
                            this.auths.push('verify-aapp');
                        }
                    }
                    else if (smsOnline) {
                        if (await this.user.isChannelVerified('mms')) {
                            this.auths.push('verify-sms');
                        }
                    }
                }

                this.auths.push('remember-device');
            }
        }
            
        if (!(await this.user.getEulaAccepted())) {
            this.auths.push('accept-eula');
        }

        if (!(await mkPasswordHandle().hasCurrentPassword(this.user.getId()))) {
            this.auths.push('set-password');
        }

        if ((await this.user.listUnverifiedChannels()).length) {
            this.auths.push('verify-channels');
        }
    }

    setData(name, value) {
        this.data[name] = value;
        return this;
    }

    async setPermissions(...permissionTypes) {
        await this.permissions.setPermissions(...permissionTypes);
        return this;
    }

    async submitAcceptEula() {
        if (this.getAuthState() == 'accept-eula') {
            await this.user.setEulaAccepted(true);
            this.auths.shift();
            return await this.gotoNextAuthStep();
        }
    }

    async submitPassword(password) {
        if (this.getAuthState() == 'submit-password') {
            if (await mkPasswordHandle().authenticate(this.user.id, password)) {
                this.auths.shift();
                await this.user.resetAttempts();
                this.auths.shift();
                return this.gotoNextAuthStep();
            }
            else {
                await this.user.incrementAttempts();
                return mkFailure('radius.org.passwordFailure');
            }
        }
    }

    async submitRememberDevice(rememberMe) {
        if (this.getAuthState() == 'remember-device') {
            let deviceId = this.acceptedCookies;

            if (deviceId) {
                if (rememberMe) {
                    await this.user.rememberDevice(deviceId);
                }
                else {
                    await this.user.forgetDevice(deviceId);
                }

                this.auths.shift();
            }

            return await this.gotoNextAuthStep();
        }
    }

    async submitSetPassword(password) {
        if (this.getAuthState() == 'set-password') {
            let result = await mkPasswordHandle().setPassword(this.user.id, password);

            if (result) {
                this.auths.shift();
                return await this.gotoNextAuthStep();
            }
            else {
                return this.getAuthState();
            }
        }

        return mkFailure('radius.org.passwordFailure');
    }

    async submitUsername(username) {
        if (this.getAuthState() == 'submit-username') {
            let settings = mkSettingsHandle();
            let clusterStatus = await settings.getSetting('radiusCluster');

            if (clusterStatus == '#NOUSER#') {
                let team = await mkTeamHandle().openNoTeam();
                
                let user = await mkUserHandle().createUser({
                    firstName: 'Firstname',
                    lastName: 'Lastname',
                    team: team,
                    emailAddr: username,
                    permissions: [ 'radius:system' ],
                });

                if (user instanceof Failure) {
                    return mkFailure('radius.org.userCreateFailure');
                }
                else {
                    await settings.setSetting('radiusCluster', '#NOCLUSTER#');
                }
            }
            else if (clusterStatus == '#NOTSET#') {
                return mkFailure('radius.org.internalFailure');
            }
            
            let emailAddr = await mkEmailAddrHandle().openEmailAddr(username);

            if (emailAddr.getId()) {
                let ownerId = await emailAddr.getOwnerId();

                if (ownerId && ownerId.startsWith('USER:')) {
                    let user = mkUserHandle(ownerId);

                    if (await user.isLive()) {
                        this.user = user;
                        this.team = await user.getTeam();
                        await this.setAuthentication();
                        return await this.gotoNextAuthStep();
                    }
                }
            }
        }

        return mkFailure('radius.org.usernameFailure');
    }
    
    touch() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (!this.live) {
            this.timeout = setTimeout(async () => {
                this.emit({
                    name: 'SessionShutdown',
                    token: this.token,
                    session: this,
                });
            }, this.shutdownMillis);
        }
        else {
            this.timeout = setTimeout(async () => {
                await this.signOut();
            }, this.timeoutMillis);
        }

        return this;
    }

    untouch() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timout = null;
    }
});


/*****
 * The session service is responsible for managing the closely guarded set of
 * sessions on the instance.  Sessions contain highly sensitive crptographic
 * and user data.  Sessions are established for all hosts and users that want
 * to interact with the Radius server instance.  Sessions are established for
 * all browser connections initially with a state of ''.  Sessions will timeout
 * after a prescribed time period, which means they revert from an 'ok' or other
 * signed-in states to the 'unknown' or '' state.
*****/
createService(class SessionService extends Service {
    constructor() {
        super();
        this.sessions = {};
    }

    async onAddRemoteHost(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            session.addRemoteHost(message.remoteHost);
            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onAuthorize(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.authorize(message.required);
        }

        return mkFailure('NOSESSION');
    }

    async onClearData(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            session.clearData(message.dataName);
            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onClearPermissions(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            let permissions = session.getPermissions();

            if (message.permissions.length) {
                await permissions.deletePermissions(...message.permissions);
            }
            else {
                await permissions.deletePermissions(...(await permissions.listPermissions()));
            }

            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onCreateSession(message) {
        let session = await mkSession().init();
        session.addRemoteHost(message.remoteHost);
        session.initialPath = message.initialPath;
        session.userAgent = message.userAgent;
        session.acceptedCookies = message.acceptedCookies;
        message.acceptedCookies ? await session.setPermissions('radius:cookies') : null;
        this.sessions[session.getToken()] = session;
        session.on('*', message => this.onSessionMessage(message));
        return session.getToken();
    }

    async onDelete(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            session.untouch();
            delete this.sessions[message.token];
        }

        return mkFailure('NOSESSION');
    }

    async onGetData(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return session.getData(message.dataName);
        }

        return mkFailure('NOSESSION');
    }

    async onGetInitialPath(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return session.getInitialPath();
        }

        return mkFailure('NOSESSION');
    }

    async onGetNextAuthState(message) {
        if (message.token in this.sessions) {
            return this.sessions[message.token].getAuthState();
        }

        return mkFailure('NOSESSION');
    }

    async onGetRemoteHost(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return session.getRemoteHost();
        }

        return mkFailure('NOSESSION');
    }

    async onGetRemoteHostHistory(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return session.getRemoteHostHistory();
        }

        return mkFailure('NOSESSION');
    }

    async onGetUser(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return session.getUser();
        }

        return mkFailure('NOSESSION');
    }

    async onGetUserAgent(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return session.getAgentType();
        }

        return mkFailure('NOSESSION');
    }

    async onGetUsername(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.getUsername();
        }

        return mkFailure('NOSESSION');
    }

    async onHasPermission(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.hasPermission(message.permissionType);
        }

        return mkFailure('NOSESSION');
    }

    async onListPermissions(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.listPermissions();
        }

        return mkFailure('NOSESSION');
    }

    async onOpen(message) {
        if (message.token in this.sessions) {
            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onPopData(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            let value = session.getData(message.dataName);
            session.clearData(message.dataName);
            return value;
        }

        return mkFailure('NOSESSION');
    }

    async onSessionMessage(message) {
        if (message.name == 'SessionShutdown') {
            if (message.token in this.sessions) {
                delete this.sessions[message.token];
            }
        }
    }

    async onSetAcceptedCookies(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            session.acceptedCookies = message.acceptCookiesUUID;
            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onSetData(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            session.setData(message.dataName, message.value);
            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onSetPermissions(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            await session.setPermissions(...message.permissions);
            return message.token;
        }

        return mkFailure('NOSESSION');
    }

    async onSignOut(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            await session.revert();
            return message.token;
        }

        return mkFailure('NOSESSION');
    }
    
    async onSubmitAcceptEula(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.submitAcceptEula();
        }

        return mkFailure('NOSESSION');
    }
    
    async onSubmitPassword(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.submitPassword(message.password);
        }

        return mkFailure('NOSESSION');
    }
    
    async onSubmitRememberDevice(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.submitRememberDevice(message.rememberMe);
        }

        return mkFailure('NOSESSION');
    }

    async onSubmitRevert(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.revert();
        }

        return mkFailure('NOSESSION');
    }
    
    async onSubmitAcceptEula(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.submitAcceptEula();
        }

        return mkFailure('NOSESSION');
    }
    
    async onSubmitSetPassword(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.submitSetPassword(message.password);
        }

        return mkFailure('NOSESSION');
    }
    
    async onSubmitUsername(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            return await session.submitUsername(message.username);
        }

        return mkFailure('NOSESSION');
    }

    async onTouch(message) {
        if (message.token in this.sessions) {
            let session = this.sessions[message.token];
            session.touch();
            return message.token;
        }

        return mkFailure('NOSESSION');
    }
});


/*****
 * The session handle is a little more interesting that a basic handle since
 * the constructor requires a copy of the session token, except for the method
 * createSession().  Upon sucessfuly return from the Service, the createSession
 * method will initialize the internal token value so that the handle can be
 * used for additional service calls if needed.
*****/
define(class SessionHandle extends Handle {
    constructor(token) {
        super();
        this.token = token ? token : '';
    }

    async addRemoteHost(remoteHost) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                remoteHost: remoteHost,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }

    async authorize(requiredPermissions) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                required: requiredPermissions,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            else {
                return rsp;
            }
        }

        return false;
    }

    async back() {
        if (this.token) {
            return await this.callService({
                token: this.token,
            });
        }
    }

    async clearData(name) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                dataName: name,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }

    async clearPermissions(...permissionTypes) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                permissions: permissionTypes,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }

    async createSession(opts) {
        this.token = await this.callService({
            userAgent: opts.userAgent,
            remoteHost: opts.remoteHost,
            initialPath: opts.initialPath,
            acceptedCookies: opts.acceptedCookies,
        });

        return this;
    }

    async delete() {
        if (this.token) {
            await this.callService({
                token: this.token,
            });

            this.token = '';
        }

        return this;
    }

    static fromJson(value) {
        return mkSessionHandle(value.token);
    }

    async getData(name) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                dataName: name,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async getInitialPath() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
                return '/';
            }
            
            return rsp;
        }

        return '/';
    }

    async getNextAuthState() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async getRemoteHost() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async getRemoteHostHistory() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    getToken() {
        return this.token;
    }

    async getUser() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async getUserAgent() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async getUsername() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async hasPermission(key) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                key: key,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async listPermissions() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            
            return rsp;
        }

        return mkFailure('NOSESSION');
    }

    async open(token) {
        let rsp = await this.callService({
            token: token ? token : this.token,
        });

            if (rsp instanceof Failure) {
            this.token = '';
        }
        else {
            this.token = rsp;
        }

        return this;
    }

    async popData(name) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                dataName: name,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
            else {
                return rsp;
            }
        }

        return mkFailure('NOSESSION');
    }

    async setAcceptedCookies(acceptCookiesUUID) {
        if (this.token) {
            this.token = await this.callService({
                token: this.token,
                acceptCookiesUUID: acceptCookiesUUID,
            });
        }

        return this;
    }

    async setData(name, value) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                dataName: name,
                value: value,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }

    async setPermissions(...permissionTypes) {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
                permissions: permissionTypes,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }
    
    async signOut() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }

    async submitAcceptEula() {
        if (this.token) {
            return await this.callService({
                token: this.token,
            });
        }

        return mkFailure('NOSESSION');
     }

    async submitPassword(password) {
        if (this.token) {
            return await this.callService({
                token: this.token,
                password: password,
            });
        }

        return mkFailure('NOSESSION');
     }

    async submitRememberDevice(rememberMe) {
        if (this.token) {
            return await this.callService({
                token: this.token,
                rememberMe: rememberMe,
            });
        }

        return mkFailure('NOSESSION');
     }

    async submitRevert() {
        if (this.token) {
            return await this.callService({
                token: this.token,
            });
        }

        return mkFailure('NOSESSION');
     }

    async submitSetPassword(password) {
        if (this.token) {
            return await this.callService({
                token: this.token,
                password: password,
            });
        }

        return mkFailure('NOSESSION');
     }

    async submitUsername(username) {
        if (this.token) {
            return await this.callService({
                token: this.token,
                username: username,
            });
        }

        return mkFailure('NOSESSION');
     }

    async touch() {
        if (this.token) {
            let rsp = await this.callService({
                token: this.token,
            });

            if (rsp instanceof Failure) {
                this.token = '';
            }
        }

        return this;
    }
});