/*****
 * Copyright (c) 2017-2023 Kode Programming
 * https://github.com/KodeProgramming/kode/blob/main/LICENSE
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
 * The subclass of HttpX that's the super class for all Radius framework web
 * applications.  The WebApp class provides the framework for handling messages,
 * API calls, application stability, security, transsction procerssing, and
 * transaction integrity.  Subclassing WebApp is how developers create their own
 * applications.  What's unique about the web application is that when the method
 * is GET, 
*****/
register('', class WebApp extends HttpX {
    static html = '';

    static registrySettings = {
        timeout: 12*60*60000,
        enableWebsocket: false,
    };

    constructor(libEntry) {
        super(libEntry);
        this.webAppPath = __filename;
        this.webAppHtmlPath = Path.join(__filename.replace('.js', ''), '../webApp.html');
    }

    async establishSession(req, rsp) {
        let session;
        let sessionCookie = req.getCookie(this.getSessionCookieName());

        if (sessionCookie) {
            session = await Session.getSession(sessionCookie.getValue());
        }

        if (!session) {
            session = await Session.createSession({
                agentType: 'user',
                authType: 'password',
                remoteHost: req.getRemoteHost(),
                timeout: this.settings.timeout,
            });

            rsp.setCookie(mkCookie(this.getSessionCookieName(), session.token));
        }

        if (!session) {
            rsp.clearCookie(this.getSessionCookieName());
        }
    }

    getLanguage(langs) {
        let supported = {};

        Object.values(this.strings).forEach(strings => {
            Object.keys(strings).forEach(lang => supported[lang] = true);
        });

        for (let lang of Object.keys(langs)) {
            if (lang in supported) {
                return lang;
            }
        }

        return Object.keys(supported)[0];
    }

    getSessionCookieName() {
        return HttpServerWorker.settings.sessionCookie;
    }

    checkSetting(key, value) {
        return value;
    }

    getWebAppHtmlPath() {
        return this.webAppHtmlPath;
    }

    getWebAppPath() {
        return this.webAppPath;
    }

    getWidgetsDirPath() {
        return this.widgetsDirPath;
    }

    async handleGET(req, rsp) {
        let template = mkTextTemplate(WebApp.html);
        await this.establishSession(req, rsp);

        const settings = {
            uuid: this.getUUID(),
            path: this.getUrlPath(),
            enableWebsocket: this.getSetting('enableWebsocket'),
            sessionCookie: this.getSetting('sessionCookie'),
            webAppBundle: this.getSetting('webAppBundle'),
            lang: Bundles.getLanguage(Object.keys(req.getAcceptLanguage())),
        };

        return {
            status: 200,
            contentType: mkMime('text/html'),
            content: template.toString({
                settings: mkBuffer(toJson(settings)).toString('hex'),
            }),
        };
    }

    async handlePOST(req, rsp) {
        if (req.getMime() == 'application/json') {
            try {
                let message = await req.getBody();
                let cookie = req.getSessionToken();
                cookie ? message['#TOKEN'] = cookie.getValue() : null;
                let response = await this.api.handle(message);

                if (typeof response == 'object') {
                    return {
                        status: 200,
                        contentType: 'application/json',
                        content: toJson(response),
                    };
                }
                else {
                    return 404;
                }
            }
            catch (e) {
                await caught(e, req.getFullRequest(), req.getBody());
                return 500;
            }
        }
        else {
            return 422;
        }
    }

    async handleWebSocket(webSocket, message) {
        if (message.type == 'string') {
            try {
                let payloadMessage = fromJson(message.payload.toString());
    
                if ('#TRAP' in payloadMessage) {
                    payloadMessage['#RESPONSE'] = await this.api.handle(payloadMessage);
                    await webSocket.sendMessage(payloadMessage)
                }
                else {
                    this.api.handle(payloadMessage);
                }
            }
            catch (e) {}
            return;
        }

        this.emit(message);
    }

    async init() {
        await super.init();
        this.settings.sessionCookie = this.getSessionCookieName();
        this.permissionVerse = mkPermissionVerse().setPermissions(this.settings.permissions);
        this.acceptCookiesName = `${this.libEntry.fqClassName}.accept`;

        this.api = mkApi(this.permissionVerse);
        const webapp = this;

        this.setEndpoints(
            {}, function GetApi() {
                return webapp.api.getEndpointNames();
            },

            {}, function GetBundle(name, lang) {
                return Bundles.getBundle(name, lang);
            },

            {}, function ListBundles() {
                return Bundles.listBundles();
            },
        );

        if (!WebApp.html) {
            WebApp.html = await FileSystem.readFileAsString(this.webAppHtmlPath);
        }

        const bundlePaths = [
            Path.join(__filename.replace('.js', ''), '../../../mozilla/widgets'),
            this.getHttpXBundlesDir(),
        ];

        if (Array.isArray(this.libEntry.bundlePaths)) {
            this.libEntry.bundlePaths.forEach(bundlePath => {
                bundlePaths.push(bundlePath);
            });
        }

        for (let bundlePath of bundlePaths) {
            for (let filePath of await FileSystem.recurseFiles(bundlePath)) {
                await Bundles.load(filePath);
            }
        }

        return this;
    }

    setEndpoint(permissions, func) {
        this.api.setEndpoint(permissions, func);
        return this;
    }

    setEndpoints(...args) {
        for (let i = 0; i < args.length; i+=2) {
            if (args.length >= i+1) {
                this.api.setEndpoint(args[i], args[i+1]);
            }
        }

        return this;
    }
});
