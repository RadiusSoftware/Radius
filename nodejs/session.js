/*****
 * Copyright (c) 2023 Radius Software
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
singletonIn(Process.nodeClassController, '', class SessionManager {
    constructor() {
        mkHandlerProxy(Process, 'SessionManager', this);
        this.sessionsByUUID = {};
        this.sessionsByToken = {};
    }

    clearSession(session) {
    }

    getSession(token) {
    }

    async onCloseSession(message) {
    }

    async onCreateSession(message) {
        return await mkSession().init(message.opts);
    }

    async onGetSession(message) {
    }

    setSession(session) {
    }

    touchSession(session) {
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class Session {
    static agentTypes = mkStringSet('user', 'host', 'app');
    static authTypes = mkStringSet('none', 'password', 'key', 'oauth2');

    constructor() {
        this.status = '';
    }

    attach() {
    }

    clearAgentHost() {
    }

    clearAgentId() {
    }

    clearPermission(permissionKey) {
    }

    clearPermissions() {
    }

    close() {
    }

    detach() {
    }

    getAgentHost() {
        return this.agentHost[this.agentHost.length - 1];
    }

    getAgentId() {
    }

    getAgentType() {
    }

    getAuthenticationType() {
    }

    getPermissions() {
    }

    generateToken() {
    }

    getUUID() {
    }

    hasPermission() {
    }

    async init(opts) {
        if (!EnumType.is(opts.agentType, Session.agentTypes)) {
            return false;
        }

        if (!EnumType.is(opts.authType, Session.authTypes)) {
            return false;
        }

        this.agentType = opts.agentType;
        this.authType = opts.authType;
        this.agentHost = [ opts.agentHost ];
        this.sockets = [];
        this.websockets = [];
        this.timeout = null;

        this.uuid = Crypto.generateUUID();
        this.token = await Crypto.hash('sha256', this.uuid);
        this.lastActivity = mkTime(0);

        if (typeof opts.timeout == 'number' && opts.timeout > 0) {
            this.timeout = setTimeout(() => {
                this.close();
                this.detach();
            }, opts.timeout);
        }

        this.status = 'established';
        this.attach();
        return this;
    }

    setAgentHost() {
    }

    setAgentId(uuid) {
    }

    setPermission(permissionKey, permissionType, values) {
    }

    setPermissions() {
    }

    touch() {
    }
});


/*****
*****/
singletonNotIn(Process.nodeClassController, '', class Session {
    async createSession(opts) {
        let session = await Process.callController({
            name: 'SessionManagerCreateSession',
            opts: opts,
        });

        return session;
    }
});