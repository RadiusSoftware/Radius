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
        return 'No Response';
    }

    async handlePOST(req) {
        console.log(req.getFullRequest());
        return 404;
    }

    async init() {
        super.init();
        this.htmlPath = `${this.className[0].toLowerCase()}${this.className.substring(1)}.html`;
        this.stylePath = `${this.className[0].toLowerCase()}${this.className.substring(1)}.css`;
        this.html = (await FileSystem.readFile(Path.join(this.httpXDir, this.htmlPath))).toString();
        this.setContent('style', 'text/css', (await FileSystem.readFile(Path.join(this.httpXDir, this.stylePath))).toString());
        this.setContent('radius', 'text/javascript', await Mozilla.getSourceCode());
        await this.loadStandardBundles();
        await this.loadSubclassBundles();
        return this;
    }

    async loadStandardBundles() {
        for (let filepath of await FileSystem.recurseFiles(this.getWebAppDir())) {
            console.log(filepath);
        }
    }

    async loadSubclassBundles() {
        for (let filepath of await FileSystem.recurseFiles(this.getHttpXDir())) {
            if (filepath.endsWith(this.htmlPath)) continue;
            if (filepath.endsWith(this.stylePath)) continue;

            console.log(filepath);
        }
    }
});
