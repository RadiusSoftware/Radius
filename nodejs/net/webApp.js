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

    static settings = {
        enableWebsocket: false,
        webAppBundle: '',
    };

    constructor(settings) {
        super();
        this.webAppPath = __filename;
        this.webAppHtmlPath = Path.join(__filename.replace('.js', ''), '../webApp.html');
        this.widgetsDirPath = Path.join(__filename.replace('.js', ''), '../../../mozilla/widgets');
        this.api = mkApi();
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

    getSetting(key) {
        return this.settings[key];
    }

    async handleGET(req, rsp) {
        let template = mkTextTemplate(WebApp.html);

        const settings = {
            uuid: this.getUUID(),
            path: this.getUrlPath(),
            enableWebsocket: this.settings.enableWebsocket,
            webAppBundle: this.settings.webAppBundle,
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

    async handleWebSocket(message) {
        // TODO
        console.log('\nIMPLEMENT the websocket handler on webApp.js!');
    }

    async init(libEntry, settings) {
        super.init(libEntry);
        this.settings = {};

        for (let key in WebApp.settings) {
            if (key in settings) {
                this.settings[key] = this.checkSetting(key, settings[key]);
            }
            else {
                this.settings[key] = WebApp.settings[key];
            }
        }

        if (!WebApp.html) {
            WebApp.html = await FileSystem.readFileAsString(this.webAppHtmlPath);
        }

        await this.registerBundles(this.getWidgetsDirPath(), this.getHttpXDir());
        return this;
    }

    async registerBundles(...paths) {
        for (let path of paths) {
            for (let filePath of await FileSystem.recurseFiles(path)) {
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
