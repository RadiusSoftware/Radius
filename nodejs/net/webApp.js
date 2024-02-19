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
    constructor(opts) {
        super();
        this.debug = typeof opts.debug == 'boolean' ? opts.debug : false;
        this.title = typeof opts.title == 'string' ? opts.title : 'Web Application';
        this.htmlPath = Path.join(__dirname, 'webApp.html');
        this.cssPath = typeof opts.css == "string" ? opts.css : Path.join(__dirname, 'webApp.css');
    }

    async handleGET(req) {
        if (req.getQuery()) {
        }
        else {
            return {
                status: 200,
                contentType: 'text/plain',
                contentEncoding: '',
                contentCharset: '',
                content: 'Hello Application',
            };
        }
    }

    async handleMessage(message) {
    }

    async handlePOST(req) {
        return 501;
    }

    async init() {
        this.css = (await FileSystem.readFile(this.cssPath)).toString();
        this.html = (await FileSystem.readFile(this.htmlPath)).toString();
        display(this);
        return this;
    }
});
