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


/*****
*****/
registerIn('HttpServer', '', class HttpLibrary {
    constructor() {
        mkHandler(Process, 'HttpLibrary', this);
    }

    getBlockSizeMb() {
        return this.settings.blockSizeMb;
    }

    getCacheDurationMs() {
        return this.settings.cacheDurationMs;
    }

    getCacheMaxSizeMb() {
        return this.settings.cacheMaxSizeMb;
    }

    async onGetFile(message) {
        return 'Hello';
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpLibrary {
    constructor() {
        this.tree = mkTextTree('/');

        this.makers = {
            data: mkHttpData,
            files: mkHttpFileSystem,
            object: mkHttpObject,
            webx: mkHttpWebX,
        };
    }

    async addItem(entry) {
        let item = await this.makers[entry.type](this, entry).init();
        let node = this.tree.ensureNode(entry.path);
        node.setValue(item);
        return this;
    }

    getItem(path) {
        let node = this.tree.getBestNode(path);
        console.log(node.getValue());
        console.log(node.getPath());
        return node.getValue();
    }

    getBlockSizeMb() {
        return this.settings.blockSizeMb;
    }

    getCacheDurationMs() {
        return this.settings.cacheDurationMs;
    }

    getCacheMaxSizeMb() {
        return this.settings.cacheMaxSizeMb;
    }

    async init(settings, entries) {
        debug(await Process.callParent({ name: 'HttpLibraryGetFile'}))
        this.settings = settings;

        if (Array.isArray(entries)) {
            for (let entry of entries) {
                await this.addItem(entry);
            }
        }
    }

    removeItem(path) {
        this.tree.remove(path);
        return this;
    }
});


/*****
*****/
register('', class HttpItem {
    constructor(httpLibrary, entry) {
        this.httpLibrary = httpLibrary;
        this.entry = entry;

        this.methods = {
            delete: false,
            get: false,
            head: false,
            options: false,
            patch: false,
            post: false,
            put: false,
            trace: false,
        };
    }

    clearMethod(methodName) {
        if (methodName.toLowerCase() in this.methods) {
            this.methods[this.methodName.toLowerCase()] = false;
        }

        return this;
    }

    getMethod(methodName) {
        if (methodName.toLowerCase() in this.methods) {
            return this.methods[this.methodName.toLowerCase()];
        }

        return null;
    }

    getMethods() {
        return Data.copy(this.methods);
    }

    getPath() {
        return this.entry.path;
    }

    getSettings() {
        return Data.copy(this.entry);
    }

    isOnce() {
        return this.entry.once === true;
    }

    setMethod(methodName) {
        if (methodName.toLowerCase() in this.methods) {
            this.methods[this.methodName.toLowerCase()] = true;
        }

        return this;
    }

    [Symbol.iterator]() {
        return [][Symbol.iterator]();
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpData extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }

    async init() {
    }

    [Symbol.iterator]() {
        return [][Symbol.iterator]();
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpFileSystem extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
        this.paths = {};
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }

    async init() {
        if (await FileSystem.pathExists(this.entry.file)) {
            let stats = await FileSystem.stat(this.entry.file);

            if (stats.isDirectory()) {
                this.fsType = 'directory';

                if (!this.isDynamic()) {
                    for (let path of await FileSystem.recurseFiles(this.entry.file)) {
                        this.paths[path] = {
                            path: path,
                            expires: mkTime(0),
                            valid: true,
                            content: {},
                        };
                    }
                }
            }
            else if (stats.isFile()) {
                this.fsType = 'file';

                this.paths[this.entry.path] = {
                    path: this.entry.path,
                    expires: mkTime(0),
                    valid: true,
                    content: {},
                };
            }
        }
    }

    isDirectory() {
        return this.fsType == 'directory';
    }

    isDynamic() {
        return this.entry.dynamic === true;
    }

    isFile() {
        return this.fsType == 'file';
    }

    [Symbol.iterator]() {
        return Object.values(this.paths)[Symbol.iterator]();
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpObject extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }

    async init() {
    }

    [Symbol.iterator]() {
        return [][Symbol.iterator]();
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpWebX extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleRequest(req, rsp) {
        return await super.handleRequest(req, rsp);
    }

    async init() {
    }

    [Symbol.iterator]() {
        return [][Symbol.iterator]();
    }
});
