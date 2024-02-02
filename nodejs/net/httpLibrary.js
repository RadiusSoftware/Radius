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
const LibFiles = require('fs');


/*****
*****/
register('', class HttpItem {
    constructor(httpLibrary, entry) {
        this.httpLibrary = httpLibrary;
        this.entry = entry;
    }

    getUrl() {
        return this.entry.url;
    }

    isOnce() {
        return this.entry.once === true;
    }

    [Symbol.iterator]() {
        return Object.values(this.urls)[Symbol.iterator]();
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

    async init() {
    }
});


/*****
*****/
register('', class HttpFileSystem extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async init() {
        /*
        await super.init();

        if (LibFiles.existsSync(this.entry.path)) {
            let stats = await LibFiles.stat(this.entry.path);

            if (stats.isDirectory()) {
                return true;
            }
            else if (stats.isFile()) {
            }
        }
       */
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }

    isDynamic() {
        return this.entry.dynamic === true;
    }

    async validatePath(path) {
    }
});


/*****
*****/
register('', class HttpObject extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }

    async init() {
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

    async init() {
    }
});


/*****
*****/
singletonIn('HttpServer', '', class HttpLibrary {
    constructor(settings) {
        Process.on('HttpLibrary', message => this.onRequest(message));
    }

    getCacheDuration() {
        return this.settings.getCacheDuration;
    }

    getCacheMax() {
        return this.settings.cacheMax;
    }

    async onRequest(message) {
        console.log(message);
    }
});


/*****
*****/
singletonIn('HttpServerWorker', '', class HttpLibrary {
    constructor(settings) {
        this.settings = settings;
        this.tree = mkTextTree('/');
        
        this.makers = {
            data: mkHttpData,
            files: mkHttpFileSystem,
            object: mkHttpObject,
            webx: mkHttpWebX,
        };

        Process.sendParent({ name: 'HttpLibrary' });
    }

    async add(entry) {
        try {
            let item = this.makers[entry.type](this, entry);
            await item.init();
            this.tree.add(item.getUrl(), item);
        }
        catch (error) {
            console.log(e);
        }

        return this;
    }

    async get(url) {
    }

    async init(entries) {
        if (Array.isArray(entries)) {

            for (let entry of entries) {
                await this.add(entry);
            }
        }

        return this;
    }

    remove(url) {
        return this;
    }
});
