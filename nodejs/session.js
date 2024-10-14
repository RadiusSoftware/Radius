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
*****/
registerIn(Process.nodeClassController, '', class Session {
    static agentTypes = mkStringSet('user', 'host');
    static authTypes = mkStringSet('none', 'password', 'key', 'sharedsecret');
    static verificationTypes = mkStringSet('none', 'email', 'mms', 'authenticator');
    static states = [ 'unknown', 'unverified', 'accepteula', 'setpassword', 'ok' ];
    static timeouts = {};

    addWebSocket(uuid, webSocket) {
        if (!(uuid in this.webSockets)) {
            this.webSockets[uuid] = webSocket;
        }
    }

    clearData(key) {
        if (key) {
            delete this.data[key];
        }
        else {
            this.data = {};
        }

        return this;
    }

    getData(key) {
        return this.data[key];
    }

    hasData(key) {
        return key in this.data;
    }

    hasWebSocket(uuid) {
        return uuid in this.webSockets;
    }
    
    async init(opts) {
        this.account = {
            id: '',
            email: '',
            firstName: '',
            lastName: '',
            name: '',
        };

        this.teams = {};
        this.data = {};
        this.permissions = {};
        this.state = 'unknown';
        this.authType = 'none';
        this.remoteHost = null;
        this.hostSocket = null;
        this.webSockets = mkStringSet();
        this.remoteHostHistory = [];
        this.uuid = Crypto.generateUUID();
        this.token = await Crypto.generateToken('sha256', this.uuid);
        this.idleSince = mkTime(0);
        this.timeout = 0;
        this.agentType = '';
        this.authType = '';
        this.userAgent = '';

        if (!EnumType.is(opts.agentType, Session.agentTypes)) {
            return false;
        }
        else {
            this.agentType = opts.agentType;
        }

        if (typeof opts.agentType == 'string') {
            this.userAgent = opts.userAgent;
        }
        else {
            this.userAgent = 'unknown';
        }

        if (typeof opts.timeout == 'number' && opts.timeout > 0) {
            this.timeout = opts.timeout;
        }

        this.setRemoteHost(opts.remoteHost);
        SessionManager.sessionsByUUID[this.uuid] = this;
        SessionManager.sessionsByToken[this.token] = this;
        console.log(this);
        return this;
    }

    promoteEulaAccepted() {
        // TODO ***********************************************************************
    }

    promotePasswordSet() {
        // TODO ***********************************************************************
    }

    promoteUnknown() {
        // TODO ***********************************************************************
    }

    promoteVerified() {
        // TODO ***********************************************************************
    }

    removeWebSocket(uuid) {
        delete this.webSockets[uuid];
        return this;
    }

    sanitize() {
        return {
            name: this.account.name,
            accountId: this.account.id,
            email: this.account.email,
            firstName: this.account.firstName,
            lastName: this.account.lastName,
            teams: Data.clone(this.teams),
            permissions: Data.clone(this.permissions),
            state: this.state,
            token: this.token,
            idleSince: this.idleSince,
            agentType: this.agentType,
            userAgent: this.userAgent,
        };
    }

    setData(name, value) {
        this.data[name] = value;
        return this;
    }
    
    setRemoteHost(ipaddr) {
        this.remoteHost = {
            ipaddr: ipaddr,
            timestamp: mkTime(),
        };

        this.remoteHostHistory.push(this.remoteHost);
        return true;
    }

    signOut() {
        // close application
        // close webSockets
        // close hostSocket
        delete Session.timeouts[this.uuid];

        this.account = {
            id: '',
            email: '',
            firstName: '',
            lastName: '',
            name: '',
        };

        this.teams = {};
        this.data = {};
        this.permissions = {};
        this.state = 'unknown';
        this.authType = 'none';
        this.remoteHost = null;
        this.hostSocket = null;
        this.webSockets = mkStringSet();
        this.remoteHostHistory = [];
        this.idleSince = mkTime(0);
        this.timeout = 0;
    }

    touch() {
        if (this.state == 'ok') {
            let timeout;

            if (this.uuid in Session.timeouts) {
                timeout = Session.timeouts[this.uuid];
                clearTimeout(timeout);
                delete Session.timeouts[this.uuid];
            }

            if (this.timeout > 0) {
                timeout = setTimeout(() => this.signOut(), this.timeout);
            }
        }
        
        return this;
    }
});


/*****
*****/
singletonIn(Process.nodeClassController, '', class SessionManager {
    constructor() {
        mkHandlerProxy(Process, 'SessionManager', this);
        this.sessionsByUUID = {};
        this.sessionsByToken = {};
    }

    async onCreateSession(message) {
        return (await mkSession().init(message.opts)).sanitize();
    }

    async onGetData(message) {
        /*
        if (message.uuid && message.uuid in this.sessionsByUUID) {
            return this.sessionsByUUID[message.uuid].getData(message.key);
        }
        */
    }

    async onGetSessionFromToken(message) {
        if (message.token && message.token in this.sessionsByToken) {
            return this.sessionsByToken[message.token].sanitize();
        }
        
        return false;
    }

    async onGetSessionFromUUID(message) {
        if (message.uuid && message.luuid in this.sessionsByUUID) {
            return Data.clone(this.sessionsByUUID[message.uuid]);
        }
        
        return false;
    }

    async onSendMessage(message) {
        // TODO ***********************************************************************
    }
    
    async onSetData(message) {
        /*
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
        */
    }

    async onSetPassword(message) {
        // TODO ***********************************************************************
    }

    async onSetVerified(message) {
        // TODO ***********************************************************************
    }

    async onSignOut(message) {
        // TODO ***********************************************************************
    }

    async onTouch(message) {
        // TODO ***********************************************************************
    }

    verifyMessage(message) {
        // TODO ***********************************************************************
    }
});


/*****
*****/
singletonNotIn(Process.nodeClassController, '', class Session {
    async createSession(opts) {
        return await Process.callController({
            name: 'SessionManagerCreateSession',
            opts: opts,
        });
    }

    async getSessionFromToken(token) {
        return await Process.callController({
            name: 'SessionManagerGetSessionFromToken',
            token: token,
        });
    }

    async getSessionFromUUID(uuid) {
        return await Process.callController({
            name: 'SessionManagerGetSessionFromUUID',
            uuid: uuid,
        });
    }
    /*
    async sendMessage(uuid, message) {
        return await Process.callController({
            name: 'SessionManagerSendMessage',
            uuid: uuid,
            message: message,
        });
    }

    async touch(uuid) {
        return await Process.callController({
            name: 'SessionManagerTouch',
            uuid: uuid,
        });
    }
    */
});