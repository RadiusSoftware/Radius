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
 * The session object, which should only exist in the controller process node.
 * The session is responsible for tracking and maintaining data with regards
 * to individual sessions, which include GUI applications, GUI browser apps,
 * external hosts and applications exuting on those hosts.  A session can be
 * self timed out or kept indefinitely.  Moreover, multiple approachs to session
 * authtentication are available.  Once established, the application tracks the
 * session's permission set, which is used for verifying whether an entity has
 * been granted access to complete the current request.
*****/
registerIn(Process.nodeClassController, '', class Session {
    static agentTypes = mkStringSet('none', 'user', 'app');
    static authTypes = mkStringSet('none', 'password', 'key', 'oauth2');
    static states = [ 'unauthenticated', 'unverified', 'verified', 'eula', 'password', 'ok' ];

    clearAccount() {
        this.account = null;
        return this;
    }

    clearData(key) {
        if (key) {
            delete this.data[key];
        }
        else {
            this.data = new Object();
        }

        return this;
    }

    clearPermission(permissionKey) {
        if (permissionKey in this.permissions) {
            delete this.permissions[permissionKey];
        }

        return this;
    }

    clearPermissions() {
        this.permissions = new Object();
        return this;
    }

    close() {
        for (let websocket of this.websockets) {
            websocket.close();
        }

        for (let socket of this.sockets) {
            socket.close();
        }

        delete SessionManager.sessionsByUUID[this.uuid];
        delete SessionManager.sessionsByToken[this.token];
        return this;
    }

    getAccount() {
        return this.account;
    }

    getAgentType() {
        return this.agentType;
    }

    getAuthType() {
        return this.authType;
    }

    getData(key) {
        if (key) {
            return this.data[key];
        }
        else {
            return this.data;
        }
    }

    getPermissions() {
        return this.permissions;
    }

    getRemoteHost() {
        return this.remoteHost[this.remoteHost.length - 1];
    }

    getRemoteHostHistory() {
        return this.remoteHost;
    }

    getToken() {
        return this.token;
    }

    getUUID() {
        return this.uuid;
    }

    hasPermission(name, value) {
        if (value !== undefined) {
        }
        else {
        }
    }

    async init(opts) {
        this.data = {};
        this.account = null;
        this.timeoutMillis = 0;
        this.setPermissions(opts.permissions);

        if (!EnumType.is(opts.agentType, Session.agentTypes)) {
            return false;
        }

        if (!EnumType.is(opts.authType, Session.authTypes)) {
            return false;
        }

        if (opts.remoteHost) {
            this.remoteHost = [ opts.remoteHost ];
        }
        else {
            this.remoteHost = [ 'unknown' ];
        }

        this.agentType = opts.agentType;
        this.authType = opts.authType;
        this.sockets = [];
        this.websockets = [];
        this.timeout = null;

        this.uuid = Crypto.generateUUID();
        this.token = await Crypto.generateToken('sha256', this.uuid);
        this.lastActivity = mkTime(0);

        if (typeof opts.timeout == 'number' && opts.timeout > 0) {
            this.timeoutMillis = opts.timeout;

            this.timeout = setTimeout(() => {
                this.close();
                this.detach();
            }, this.timeoutMillis);
        }

        SessionManager.sessionsByUUID[this.uuid] = this;
        SessionManager.sessionsByToken[this.token] = this;
        return this;
    }

    sanitize() {
        return {
            account: this.account,
            data: this.data,
            token: this.token,
            agentType: this.agentType,
            authType: this.authType,
            remoteHost: this.getRemoteHost(),
        };
    }

    setAccount(account) {
        this.account = account;
        return this;
    }

    setData(...args) {
        if (args.length == 2) {
            this.data[args[0]] = args[1];
        }
        else if (args.length == 1 && typeof args[0] == 'object') {
            this.data = args[0];
        }

        return this;
    }

    setPermission(permissionKey, permissionType, values) {
        let permission = new Object();
        permission[permissionKey] = { type: permissionType, value: values };

        if (PermissionVerse.validate(permission)) {
            this.permissions[permissionKey] = permission[permissionKey];
        }

        return this;
    }

    setPermissions(permissions) {
        if (typeof permissions == 'object' && PermissionVerse.validatePermissions(permissions)) {
            this.permissions = permissions;
        }
        else {
            this.permissions = {};
        }

        return this;
    }

    touch(remoteHost) {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.timeoutMillis > 0) {
            this.timeout = setTimeout(() => this.close(), this.timeoutMillis);
        }

        if (remoteHost && remoteHost != this.remoteHost[this.remoteHost.length - 1]) {
            this.remoteHost.push(remoteHost);
        }

        return this;
    }
});


/*****
 * The SessionManager is a controller-class-node singleton responsible for being
 * a container for all current sessions.  There is only a single instance of the
 * session object on the server that's right here.  Hence, subprocesses must
 * contact the controller process in order to check session authorization.  The
 * SessionManager also serves as an endpoint for communcating with subprocesses
 * that require access to session and permission data.
*****/
singletonIn(Process.nodeClassController, '', class SessionManager {
    constructor() {
        mkHandlerProxy(Process, 'SessionManager', this);
        this.sessionsByUUID = {};
        this.sessionsByToken = {};
        this.sessionCookieName = 'session';
    }

    async onCloseSession(message) {
        if (message.uuid && message.uuid in this.sessionsByUUID) {
            let closing = this.sessionsByToken[message.token].sanitize();
            closing.close();
            return closing;
        }

        return null;
    }

    async onCreateSession(message) {
        return (await mkSession().init(message.opts)).sanitize();
    }

    async onGetData(message) {
        if (message.uuid && message.uuid in this.sessionsByUUID) {
            return this.sessionsByUUID[message.uuid].getData(message.key);
        }
    }

    async onGetSession(message) {
        if (message.token && message.token in this.sessionsByToken) {
            return this.sessionsByToken[message.token].sanitize();
        }
        
        return false;
    }

    async onGetSessionCookieName(message) {
        return this.sessionCookieName;
    }

    async onSetData(message) {
        if (message.uuid && message.uuid in this.sessionsByUUID) {
            if (message.data) {
                if (message.key) {
                    this.sessionsByUUID[message.uuid].getData(message.key, message.data);
                }
                else {
                    this.sessionsByUUID[message.uuid].getData(message.data);
                }
            }

            return true;
        }

        return false;
    }
});


/*****
 * This is the application interface for sessions made available to the general
 * population of processes.  Note (1) availability for managing sessions is
 * limited to this singleton API object, and (2) 
*****/
singletonNotIn(Process.nodeClassController, '', class Session {
    async createSession(opts) {
        return await Process.callController({
            name: 'SessionManagerCreateSession',
            opts: opts,
        });
    }

    async closeSession(uuid) {
        await Process.callController({
            name: 'SessionManagerCloseSession',
            uuid: uuid,
        });

        return this;
    }

    async getData(uuid, key) {
        return await Process.callController({
            name: 'SessionManagerGetData',
            uuid: uuid,
            key: key,
        });
    }

    async getSession(token) {
        return await Process.callController({
            name: 'SessionManagerGetSession',
            token: token,
        });
    }

    async getSessionCookieName() {
        return await Process.callController({ name: 'SessionManagerGetSessionCookieName' });
    }

    async setData(uuid, key, data) {
        return await Process.callController({
            name: 'SessionManagerSetData',
            uuid: uuid,
            key: key,
            data: data,
        });
    }
});