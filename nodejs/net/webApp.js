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
*****/
register('', class WebApp extends HttpX {
    constructor(filename) {
        super();
        this.content = {};
        this.filename = filename;
        this.prototype = Reflect.getPrototypeOf(this);
        this.classname = this.prototype.constructor.name;
        this.webAppDir = this.filename.replace('.js', '');
    }

    clearContent(name) {
        delete this.content[name];
        return this;
    }

    getContent(name) {
        if (name in this.content) {
            return this.content[name];
        }
        else {
            return 404;
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
        return 'No Response';
    }

    async handlePOST(req) {
        return 501;
    }

    async init() {
        this.html = (await FileSystem.readFile(Path.join(this.webAppDir, `${this.classname}.html`))).toString();
        let cssPath = Path.join(this.webAppDir, `${this.classname}.css`);
        this.setContent('css', 'text/css', (await FileSystem.readFile(cssPath)).toString());
        this.setContent('radius', 'text/javascript', await require(Path.join(__dirname, '../mozilla.js'))());
        return this;
    }

    setContent(name, mime, value) {
        this.content[name] = {
            name: name,
            mime: mime instanceof Mime ? mime.getCode() : mime,
            value: value
        };

        return this;
    }
});
