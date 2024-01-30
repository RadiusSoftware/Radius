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
LibFiles = require('fs');


/*****
*****/
register('', class HttpLibrary {
    constructor(settings) {
        this.settings = settings;

        this.makers = {
            data: mkHttpData,
            files: mkHttpFileSystem,
            webx: mkHttpWebX,
        };
    }

    async add(entry) {
        try {
            if (typeof entry.url == 'string') {
                if (await this.validateUrl(entry.url)) {
                    let item = await this.makers[entry.type](this, entry);

                    if (await item.init()) {
                        for (let url of this.enumerateUrls(entry.url)) {
                            this.entries.add(url, item);
                        }
                    }
                }
            }
            else if (typeof entry.status == 'number') {
                let item = await this.makers[entry.type](this, entry);

                if (await item.init()) {
                    this.statuses[entry.status] = item;
                }
            }
        }
        catch (error) {
            // todo -- handle error
            console.log(e);
        }

        return this;
    }

    enumerateUrls(url) {
        return [url];
    }

    async get(arg) {
        if (typeof arg == 'number') {
        }
        else if (typeof arg == 'string') {
        }
    }

    async init(entries) {
        if (Array.isArray(entries)) {
            this.statuses = {};
            this.entries = mkTextTree('/');

            for (let entry of entries) {
                await this.add(entry);
            }
        }

        return this;
    }

    remove(arg) {
        // TODO
        return this;
    }

    async validateUrl(url) {
        if (typeof url == 'string') {
            if (url.startsWith('/')) {
                let asterisk = url.indexOf('*');
                if (asterisk == -1) return true;
                if (asterisk == url.length - 1) return true;
            }
        }

        return false;
    }
});


/*****
*****/
register('', class HttpItem {
    constructor(httpLibrary, entry) {
        this.httpLibrary = httpLibrary;
        this.entry = entry;
        this.content = {};
    }

    async encodeData() {
        // TODO
    }

    enumerateUrls(url) {
        return [this.url];
    }

    async getData(transferEncoding) {
        // TODO
    }

    getMime() {
        return this.entry.mime ? this.entry.mime : '';
    }

    getMime() {
        return this.entry.type;
    }

    async handleRequest(req, rsp) {
        rsp.respond(200, 'text/plain', mkTxt(`${Reflect.getPrototypeOf(this).constructor.name}.handleRequest() not implemented.`));
    }

    async init() {
        return true;
    }
});


/*****
*****/
register('', class HttpData extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }
});


/*****
*****/
register('', class HttpFileSystem extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async init() {
        if (LibFiles.existsSync(this.entry.path)) {
            let stats = await LibFiles.stat(this.entry.path);

            if (stats.isDirectory()) {
                return true;
            }
            else if (stats.isFile()) {
            }
        }
        
       return false;
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }
});


/*****
*****/
register('', class HttpWebX extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }
});
