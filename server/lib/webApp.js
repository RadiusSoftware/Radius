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
register('radius', class WebApp extends HttpX {
    constructor() {
        super();
        this.allowWebsocket = false;
        this.webAppPath = __filename;
        this.webAppDir = Path.join(__filename.replace('.js', ''), '../../webApp');
        this.bundles = {};
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

    async getBundle(name, encoding) {
        if (name in this.bundles) {
            let bundle = this.bundles[name]
            return await bundle.get(encoding);
        }
    }

    async handleGET(req) {
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

    async handleMessage(message) {
        console.log(message);

        let response = await Session.createSession({
            agentType: 'user',
            authType: 'password',
            agentHost: '172.0.0.1',
            //timeout: 10*60000,
        });

        console.log(response);

        return {
            //'#ContentType': '',
            //'#ContentEncoding': '',
            //'#ContentCharset': '',
            //'#Error': '',
            content: { done: true },
        };
    }

    async handlePOST(req) {
        if (req.getMime() == 'application/json') {
            try {
                let message = await req.getBody();
                let response = await this.handleMessage(message);
                let encoding = response['#ContentEncoding'];

                if (!encoding) {
                    for (let algorithm in req.getAcceptEncoding()) {
                        if (Compression.isSupported(algorithm)) {
                            encoding = algorithm;
                            break;
                        }
                    }
                }

                return {
                    status: 200,
                    contentType: '#ContentType' in response ? response['#ContentType'] : 'application/json',
                    contentCharset: '#ContentCharset' in response ? response['#ContentCharset'] : 'utf-8',
                    contentEncoding: '#ContentCharset' in response ? response['#ContentCharset'] : 'utf-8',
                    contentEncoding: encoding,
                    content: await Compression.compress(encoding, toJson(response.content)),
                };
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

    hasBundle(name) {
        return name in this.bundles;
    }

    async init() {
        super.init();
        this.htmlPath = `${this.className[0].toLowerCase()}${this.className.substring(1)}.html`;
        this.stylePath = `${this.className[0].toLowerCase()}${this.className.substring(1)}.css`;
        this.html = (await FileSystem.readFile(Path.join(this.httpXDir, this.htmlPath))).toString();
        this.setContent('style', 'text/css', (await FileSystem.readFile(Path.join(this.httpXDir, this.stylePath))).toString());

        let mozilla = await radius.Mozilla.getSourceCode({
            webAppPath: this.path,
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
});
