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
const LibPath = require('path');


/*****
*****/
registerIn('HttpServer', '', class HttpLibrary {
    constructor() {
        mkHandlerProxy(Process, 'HttpLibrary', this);
    }

    async addData(libEntry) {
        let data;
        let mime;

        if (typeof libEntry.data == 'object') {
            data = toJson(libEntry.data);
            mime = mkMime('application/json');
        }
        else if (typeof libEntry.data == 'string') {
            data = libEntry.data;
            mime = mkMime('text/plain');
        }
        else {
            if (libEntry.data instanceof Buffer) {
                data = libEntry.data;
            }
            else {
                data = mkBuffer(libEntry.data);
            }

            if (libEntry.mime instanceof Mime) {
                mime = libEntry.mime;
            }
            else if (typeof libEntry.mime == 'string') {
                mime = mkMime(libEntry.mime);
            }
            else {
                mime = mkMime('');
            }
        }

        this.paths[libEntry.path] = {
            type: 'data',
            path: libEntry.path,
            mime: mime,
            once: libEntry.once === true,
            auth: libEntry.auth ? libEntry.auth : {},
            cache: { '': data },
        }

        return this;
    }

    async addFile(libEntry) {
        if (await FileSystem.isDirectory(libEntry.fspath)) {
            for (let fspath of await FileSystem.recurseFiles(libEntry.fspath)) {
                let path = LibPath.join(libEntry.path, fspath.substring(libEntry.fspath.length));
                this.paths[path] = {
                    type: 'file',
                    path: path,
                    fspath: fspath,
                    mime: mkMime(LibPath.extname(fspath)),
                    once: libEntry.once === true,
                    auth: libEntry.auth ? libEntry.auth : {},
                    cache: {},
                };
            };
        }
        else if (await FileSystem.isFile(libEntry.fspath)) {
            this.paths[libEntry.path] = {
                type: 'file',
                path: libEntry.path,
                fspath: libEntry.fspath,
                mime: mkMime(LibPath.extname(libEntry.fspath)),
                once: libEntry.once === true,
                auth: libEntry.auth ? libEntry.auth : {},
                cache: {},
            };
        }

        return this;
    }

    async addHttpX(libEntry) {
        let clssName;

        if (typeof libEntry.clss == 'function') {
            if (Data.classExtends(libEntry.clss, HttpX)) {
                clssName = libEntry.clss.name;
            }
        }
        else if (typeof libEntry.clss == 'string') {
            clssName = libEntry.clss;
        }

        if (clssName) {
            this.paths[libEntry.path] = {
                type: 'httpx',
                path: libEntry.path,
                mime: null,
                once: libEntry.once === true,
                auth: libEntry.auth ? libEntry.auth : {},
                cache: { '': clssName },
            }
        }
        else {
            log(`Unable add HttpX libEntry to HttpLibrary.`, toJson(libEntry));
        }

        return this;
    }

    async checkAuth(libEntry, authObj) {
        let response = this.authHandler(libEntry, authObj); 
        return response instanceof Promise ? await response :response;
    }

    checkMethod(libEntry, method) {
        if (libEntry.type == 'data') {
            return method == 'GET';
        }
        else if (libEntry.type == 'file') {
            return method == 'GET';
        }
        else if (libEntry.type == 'httpx') {
        }
    }

    clearAuthHandler() {
        this.authHandler = () => true;
    }

    getAuthHandler() {
        return this.authHandler;
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

    async getData(info) {
        try {
            let content;
            let encoding = '';
            
            for (let key in info.encoding) {
                if (Compression.isSupported(key)) {
                    encoding = key;
                    break;
                }
            }

            if (encoding in info.libEntry.cache) {
                content = info.libEntry.cache[encoding].content;
            }
            else {
                let raw = info.libEntry.cache[''];
                content = await Compression.compress(encoding, raw);

                if (content.length < this.getCacheMaxSizeMb()*1024*1024) {
                    info.libEntry.cache[encoding] = { content: content };
                    this.touch(info.libEntry.cache[encoding]);
                }
            }

            return {
                status: 200,
                contentType: info.libEntry.mime.code,
                contentEncoding: encoding,
                contentCharset: '',
                content: content,
            };
        }
        catch (e) {
            caught(e);
            return 500;
        }
    }

    async getFile(info) {
        try {
            let content;
            let encoding = '';
            
            for (let key in info.encoding) {
                if (Compression.isSupported(key)) {
                    encoding = key;
                    break;
                }
            }

            if (encoding in info.libEntry.cache) {
                content = info.libEntry.cache[encoding].content;
            }
            else {
                let raw = info.libEntry.cache[''];

                if (!raw) {
                    raw = await FileSystem.readFile(info.libEntry.fspath);
                }

                content = await Compression.compress(encoding, raw);

                if (raw.length < this.getCacheMaxSizeMb()*1024*1024) {
                    info.libEntry.cache[''] = { content: raw };
                    this.touch(info.libEntry.cache['']);
                }

                if (content.length < this.getCacheMaxSizeMb()*1024*1024) {
                    info.libEntry.cache[encoding] = { content: content };
                    this.touch(info.libEntry.cache[encoding]);
                }
            }

            return {
                status: 200,
                contentType: info.libEntry.mime.code,
                contentEncoding: encoding,
                contentCharset: '',
                content: content,
            };
        }
        catch (e) {
            caught(e);
            return 500;
        }
    }

    async getHttpX(libEntry) {
    }

    async init(settings, libEntries) {
        this.paths = {};
        this.settings = settings;
        this.setAuthHandler(this.settings.authHandler);

        for (let libEntry of libEntries) {
            if (libEntry.type == 'data') {
                await this.addData(libEntry);
            }
            else if (libEntry.type == 'file') {
                await this.addFile(libEntry)
            }
            else if (libEntry.type == 'httpx') {
                await this.addHttpX(libEntry);
            }
        }

        return this;
    }

    async onAdd(message) {
    }

    async onGet(message) {
        if (message.path in this.paths) {
            let libEntry = this.paths[message.path];
            
            if (this.checkMethod(libEntry, message.method)) {
                if (await this.checkAuth(libEntry)) {
                    let response;

                    if (libEntry.type == 'data') {
                        response = await this.getData({
                            libEntry: libEntry,
                            encoding: message.encoding,
                            language: message.language,
                        });
                    }
                    else if (libEntry.type == 'file') {
                        response = await this.getFile({
                            libEntry: libEntry,
                            encoding: message.encoding,
                            language: message.language,
                        });
                    }
                    else if (libEntry.type == 'httpx') {
                        response = await this.getHttpX(libEntry);
                    }

                    if (libEntry.once) {
                        this.remove(libEntry.path);
                    }

                    return response;
                }
                else {
                    return 403;
                }
            }
            else {
                return 405;
            }
        }
        else {
            return 404;
        }
    }

    async onRefresh(message) {
    }

    async onRemove(message) {
    }

    async onWatch(message) {
    }

    refresh(path) {
        if (path in this.paths) {
            let libEntry = this.paths[path];

            if (libEntry.type == 'data') {
            }
            else if (libEntry.type == 'file') {
            }
            else if (libEntry.type == 'httpx') {
            }
        }

        return this;
    }

    remove(path) {
        delete this.paths[path];
    }

    setAuthHandler(func) {
        if (typeof func == 'function') {
            this.authHandler = func;
        }
        else {
            this.authHandler = () => true;
        }
    }

    touch(libEntry) {
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpLibrary {
    constructor() {
        mkHandlerProxy(Process, 'HttpLibrary', this);
    }

    async addData(libEntry) {
    }

    async addFile(libEntry) {
    }

    async addHttpX(libEntry) {
    }

    async awaitData(libEntry) {
    }

    async awaitFile(libEntry) {
    }

    async awaitHttpX(libEntry) {
    }

    async handle(req) {
        let response = await Process.callParent({
            name: 'HttpLibraryGet',
            path: req.getPath(),
            method: req.getMethod(),
            encoding: req.getAcceptEncoding(),
            language: req.getAcceptLanguage(),
        });

        return response;
    }

    async init(httpServer) {
        this.httpServer = httpServer;
        return this;
    }

    async refresh(path) {
    }

    async remove(path) {
    }
});
