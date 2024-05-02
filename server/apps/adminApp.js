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
register('radius', class AdminApp extends WebApp {
    constructor(libEntry) {
        super(libEntry, {
            enableWebsocket: false,
            webAppBundle: 'radius.apps.admin',
        });
    }

    /*
    async handleGET(req, rsp) {
        let token = await req.getSession();

        if (!token) {
            const session = await Session.createSession({
                agentType: 'none',
                authType: 'none',
                remoteHost: req.getRemoteHost(),
                //permissions: { 'admin:all': true },
                timeout: 12*60*60000,
            });

            rsp.setSession(session.token);
        }
        
        return super.handleGET(req, rsp);
    }
    */

    /*
    async handlePOST(req, rsp) {
        let session = await req.getSession();

        if (session) {
            return await super.handlePOST(req, rsp);
        }
        else {
            return 401;
        }
    }
    */
});