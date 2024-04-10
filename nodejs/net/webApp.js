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
 * applications.
*****/
register('', class WebApp extends HttpX {
    constructor() {
        super();
        this.allowWebsocket = false;
        this.webAppPath = __filename;
        this.webAppDir = Path.join(__filename.replace('.js', ''), '../../webApp');
        this.bundles = {};
        this.api = mkApi();
        const webapp = this;

        this.setEndpoints(
            {}, function GetBundle(name) {
                return webapp.getBundle(name);
            },

            {}, function GetApi() {
                return webapp.api.getEndpointNames();
            }
        );
    }

    allowWebsocket() {
        this.allowWebsocket = true;
        return this;
    }

    disallowWebsocket() {
        this.allowWebsocket = false;
        return this;
    }

    getAllowWebsocket() {
        return this.allowWebsocket;
    }

    getWebAppDir() {
        return this.webAppDir;
    }

    getWebAppPath() {
        return this.webAppPath;
    }

    getBundle(name, encoding) {
        if (name in this.bundles) {
            let bundle = this.bundles[name]
            return bundle.get();
        }
    }

    async handleGET(req, rsp) {
        let contentType;
        let contentEncoding = '';
        let contentCharset = '';
        let content;

        for (let encoding in req.getAcceptEncoding()) {
            if (Compression.isSupported(encoding)) {
                contentEncoding = encoding;
                break;
            }
        }

        let query = req.getQuery();

        if (query) {
            let entry = this.getContent(query);

            if (typeof entry == 'number') {
                return entry;
            }
            else {
                content = entry.value;
                contentType = entry.mime;
            }
        }
        else {
            content = this.html;
            contentCharset = 'utf-8';
            contentType = 'text/html';
        }

        if (contentEncoding) {
            content = await Compression.compress(contentEncoding, content);
        }

        return {
            status: 200,
            contentType: contentType,
            contentEncoding: contentEncoding,
            contentCharset: contentCharset,
            content: content,
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
                    let encoding = '';

                    for (let algorithm in req.getAcceptEncoding()) {
                        if (Compression.isSupported(algorithm)) {
                            encoding = algorithm;
                            break;
                        }
                    }
                   
                    return {
                        status: 200,
                        contentType: 'application/json',
                        contentEncoding: encoding,
                        contentCharset: 'utf-8',
                        content: await Compression.compress(encoding, toJson(response)),
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

    async handleWebSocketMessage(message) {
        // TODO
        console.log('\nIMPLEMENT the websocket handler on webApp.js!');
    }

    hasBundle(name) {
        return name in this.bundles;
    }

    async init() {
        super.init();
        this.htmlPath = `${this.className[0].toLowerCase()}${this.className.substring(1)}.html`;
        this.stylePath = `${this.className[0].toLowerCase()}${this.className.substring(1)}.css`;
        this.html = (await FileSystem.readFile(Path.join(this.httpXDir, this.htmlPath))).toString();
        this.setContent('style', 'text/css', (await FileSystem.readFile(Path.join(this.httpXDir, this.stylePath))).toString());

        let mozilla = await Mozilla.getSourceCode({
            webAppPath: this.path,
            userSocket: this.allowWebsocket,
        });
        
        this.setContent('radius', 'text/javascript', mozilla);

        for (let filePath of await FileSystem.recurseFiles(Path.join(this.getWebAppDir(), '../../mozilla/widgets'))) {
            if (filePath.endsWith('.html')) {
                await this.registerBundle(filePath);
            }
        }

        for (let filePath of await FileSystem.recurseFiles(this.getWebAppDir())) {
            if (filePath.endsWith('.html')) {
                await this.registerBundle(filePath);
            }
        }

        for (let filePath of await FileSystem.recurseFiles(this.getHttpXDir())) {
            if (filePath.endsWith('.html')) {
                await this.registerBundle(filePath);
            }
        }
        
        return this;
    }

    async registerBundle(filePath) {
        try {
            let bundle = await mkBundle(filePath).init();

            if (bundle.isValid()) {
                if (bundle.getName() in this.bundles) {
                    throw new Error(`Duplicate Bundle name: "${bundle.getName()}"`);
                }
                else {
                    this.bundles[bundle.getName()] = bundle;
                }
            }
        }
        catch (e) {}
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
