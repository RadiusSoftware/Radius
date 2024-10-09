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
 * This is a standard builtin application, which is used for managing a host
 * that's running one or more Radius servers and radius web extensions.  The
 * AdmiinApp extends WebApp, is not part of the framework itself, and is needed
 * to configure the server and get it ready to run in live mode.  The admin
 * app will be used for managing configuration settings, probing the network
 * environment, monitoring networking activity, monitoring web extension activty
 * and performance, and for monitoring user activity and clustered hosting
 * activity.
*****/
register('radius', class AdminApp extends WebApp {
    static registrySettings = {
        webAppBundle: 'server.apps.admin',
        enableWebsocket: true,
        permissions: {
            AdminApp: { type: 'boolean' }
        },
    };

    constructor(libEntry) {
        super(libEntry);
    }
});