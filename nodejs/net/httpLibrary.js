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
    static watches = {};
    static nextWatchId = 1;

    constructor() {
        this.watches = mkEmitter();
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
            timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
            auth: libEntry.auth ? libEntry.auth : {},
            cache: { '': data },
            watches: {},
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
                    timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                    auth: libEntry.auth ? libEntry.auth : {},
                    cache: {},
                    watches: {},
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
                timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                auth: libEntry.auth ? libEntry.auth : {},
                cache: {},
                watches: {},
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
            let entry = {
                type: 'httpx',
                path: libEntry.path,
                mime: null,
                once: libEntry.once === true,
                timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                auth: libEntry.auth ? libEntry.auth : {},
                cache: { '': clssName },
                watches: {},
            };

            this.paths[libEntry.path] = entry;
            this.shared[libEntry.path] = entry;

            Process.sendChildren({
                name: 'HttpLibraryAdd',
                libEntry: libEntry,
            });
        }
        else {
            log(`Unable add HttpX libEntry to HttpLibrary.`, toJson(libEntry));
        }

        return this;
    }

    async checkAuth(libEntry, reqHeaders) {
        if (typeof libEntry.auth == 'object') {
            try {
                let response = this.authHandler(libEntry, reqHeaders);
                return response instanceof Promise ? await response : response;
            }
            catch (e) {
                caught(e);
                return false;
            }
        }
        else {
            return true;
        }
    }

    checkMethod(libEntry, method) {
        if (libEntry.type == 'data') {
            return method == 'GET';
        }
        else if (libEntry.type == 'file') {
            return method == 'GET';
        }
        else if (libEntry.type == 'httpx') {
            return true;
        }

        return false;
    }

    clearAuthHandler() {
        this.authHandler = () => true;
        return this;
    }

    clearWatch(handle) {
        // watches feature
        return this;
    }

    clearWatches(path) {
        // watches feature
        return this;
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

            if (info.encoding in info.libEntry.cache) {
                content = info.libEntry.cache[info.encoding].content;
            }
            else {
                let raw = info.libEntry.cache[''];

                if (info.encoding != '') {
                    content = await Compression.compress(info.encoding, raw);

                    if (content.length < this.getCacheMaxSizeMb()*1024*1024) {
                        info.libEntry.cache[info.encoding] = { content: content };
                        this.touch(info.libEntry, info.encoding);
                    }
                }
                else {
                    content = raw;
                }
            }

            return {
                type: 'data',
                status: 200,
                contentType: info.libEntry.mime.code,
                contentEncoding: info.encoding,
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

            if (info.encoding in info.libEntry.cache) {
                content = info.libEntry.cache[info.encoding].content;
            }
            else {
                let raw = info.libEntry.cache[''];

                if (!raw) {
                    raw = await FileSystem.readFile(info.libEntry.fspath);
                }

                if (raw.length < this.getCacheMaxSizeMb()*1024*1024) {
                    info.libEntry.cache[''] = { content: raw };
                    this.touch(info.libEntry, '');
                }

                if (info.encoding != '') {
                    content = await Compression.compress(info.encoding, raw);

                    if (content.length < this.getCacheMaxSizeMb()*1024*1024) {
                        info.libEntry.cache[info.encoding] = { content: content };
                        this.touch(info.libEntry, info.encoding);
                    }
                }
                else {
                    content = raw;
                }
            }

            return {
                type: 'file',
                status: 200,
                contentType: info.libEntry.mime.code,
                contentEncoding: info.encoding,
                contentCharset: '',
                content: content,
            };
        }
        catch (e) {
            caught(e);
            return 500;
        }
    }

    async getHttpX(info) {
        try {
            if (info.libEntry.type == 'httpx') {
                return {
                    type: 'httpx',
                    path: info.libEntry.path,
                    clss: info.libEntry.cache[''],
                    encoding: info.encoding,
                };
            }

            return 404;
        }
        catch (e) {
            caught(e);
            return 500;
        }
    }

    async handleWatches(libEntry) {
        // watches feature
    }

    async init(settings, libEntries) {
        this.paths = {};
        this.shared = {};
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

    async onChildInit(message) {
        return Object.values(this.shared);
    }

    async onGet(message) {
        if (message.path in this.paths) {
            let libEntry = this.paths[message.path];
            
            if (this.checkMethod(libEntry, message.method)) {
                if (await this.checkAuth(libEntry, message.headers)) {
                    let response;
                    let encoding = '';
            
                    for (let key in message.encoding) {
                        if (Compression.isSupported(key)) {
                            encoding = key;
                            break;
                        }
                    }

                    if (libEntry.type == 'data') {
                        response = await this.getData({
                            libEntry: libEntry,
                            encoding: encoding,
                        });
                    }
                    else if (libEntry.type == 'file') {
                        response = await this.getFile({
                            libEntry: libEntry,
                            encoding: encoding,
                        });
                    }
                    else if (libEntry.type == 'httpx') {
                        response = await this.getHttpX({
                            libEntry: libEntry,
                            encoding: encoding,
                        });
                    }

                    if (libEntry.once) {
                        this.remove(libEntry.path);
                    }

                    await this.handleWatches(libEntry);
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
        let libEntry = this.paths[path];

        if (timer in libEntry.cache) {
            clearTimeout(libEntry.cache.timer);
        }

        delete this.paths[path];
        delete this.shared[path];
        return this;
    }

    setAuthHandler(func) {
        if (typeof func == 'function') {
            this.authHandler = func;
        }
        else {
            this.authHandler = () => true;
        }

        return this;
    }

    touch(libEntry, encoding) {
        let duration;

        if (typeof libEntry.timeout == 'number') {
            duration = libEntry.timeout;
        }
        else {
            duration = this.getCacheDurationMs();
        }

        if (duration > 0) {
            if (libEntry.cache[encoding].timer) {
                clearTimeout(libEntry.cache[encoding].timer);
            }

            libEntry.cache[encoding].timer = setTimeout(() => {
                delete libEntry.cache[encoding];
            }, duration);
        }

        return this;
    }

    watch(path) {
        // watches feature
        // return watch handle
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpLibrary {
    constructor() {
        this.paths = {};
        mkHandlerProxy(Process, 'HttpLibrary', this);
    }

    async addData(libEntry) {
    }

    async addFile(libEntry) {
    }

    async addHttpX(libEntry) {
    }

    async clearWatch(handle) {
    }

    async clearWatches(path) {
    }

    async handle(req) {
        let response = await Process.callParent({
            name: 'HttpLibraryGet',
            path: req.getPath(),
            method: req.getMethod(),
            encoding: req.getAcceptEncoding(),
            language: req.getAcceptLanguage(),
            headers: req.getHeaders(),
        });

        if (typeof response == 'number') {
            return response;
        }
        else if (typeof response == 'object') {
            if (response.type == 'data') {
                return response;
            }
            else if (response.type == 'file') {
                return response;
            }
            else if (response.type == 'httpx') {
                return await this.handleHttpX(response, req);
            }
            else {
                return 410;
            }
        }
        else {
            return 400;
        }
    }

    async handleHttpX(httpXInfo, req) {
        const httpX = this.paths[httpXInfo.path];
        const method = `handle${req.getMethod()}`;

        if (typeof httpX[method] == 'function') {
            let httpXResponse = await httpX[method](req);
            return httpXResponse;
        }
        else {
            return 405;
        }
    }

    async init(httpServer) {
        this.httpServer = httpServer;

        try {
            for (let libEntry of await Process.callParent({ name: 'HttpLibraryChildInit' })) {
                if (libEntry.type == 'httpx') {
                    let httpX;
                    eval(`httpX = mk${libEntry.cache['']}()`);
                    this.paths[libEntry.path] = httpX;
                }
            }
        }
        catch (e) {
            caught(e);
        }

        return this;
    }

    async onAdd(message) {
        console.log(message);
    }

    async onRemove(message) {
        console.log(message);
    }

    async refresh(path) {
    }

    async remove(path) {
    }

    async setWatch(path) {
    }
});
