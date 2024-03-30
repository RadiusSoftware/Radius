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
 * This is the HttpLibrary class associated with the HttpServerWorker.  Content
 * types that are serializable, such as files and static data objects, are NOT
 * stored here.  Content types that are "active" objects, which are called by
 * the HTTP server to dynamically generate responses, such as HttpX, are ctored
 * here in this process.  Regardless whether it's the HttpServer or the worker,
 * all authorization and library management occurs fully or partially in the
 * HttpServer, which is the main server process.  When removing an item,
 * such as after a once is triggered, the main process will remove that item
 * from the library and then if it's an HttpX entry, the main process instructs
 * all children to remove  that instance from it's local set of paths.
*****/
registerIn('HttpServer', '', class HttpLibrary {
    constructor() {
        mkHandlerProxy(Process, 'HttpLibrary', this);
    }

    async add(libEntry) {
        if (libEntry.permissions === undefined || PermissionVerse.validatePermissions(libEntry.permissions)) {
            if (!libEntry.uuid || !(libEntry.path in this.paths)) {
                if (libEntry.type == 'data') {
                    await this.addData(libEntry);
                }
                else if (libEntry.type == 'file') {
                    await this.addFile(libEntry)
                }
                else if (libEntry.type == 'httpx') {
                    await this.addHttpX(libEntry);
                }

                if (libEntry.uuid && libEntry.type != 'httpx') {
                    this.httpxs[libEntry.uuid].paths[libEntry.path] = libEntry;
                }
            }
        }
    }

    async addData(libEntry) {
        this.paths[libEntry.path] = {
            type: 'data',
            path: libEntry.path,
            mime: mkMime(libEntry.mime),
            once: libEntry.once === true,
            timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
            cache: { '': { content: libEntry.data }},
            requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
        }

        return this;
    }

    async addFile(libEntry) {
        if (await FileSystem.isDirectory(libEntry.fspath)) {
            for (let fspath of await FileSystem.recurseFiles(libEntry.fspath)) {
                let path = Path.join(libEntry.path, fspath.substring(libEntry.fspath.length));
                this.paths[path] = {
                    type: 'file',
                    path: path,
                    fspath: fspath,
                    mime: mkMime(Path.extname(fspath)),
                    once: libEntry.once === true,
                    timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                    cache: {},
                    requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
                };
            };
        }
        else if (await FileSystem.isFile(libEntry.fspath)) {
            this.paths[libEntry.path] = {
                type: 'file',
                path: libEntry.path,
                fspath: libEntry.fspath,
                mime: mkMime(Path.extname(libEntry.fspath)),
                once: libEntry.once === true,
                timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                cache: {},
                requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
            };
        }

        return this;
    }

    async addHttpX(libEntry) {
        if (libEntry.fqClassName) {
            let entry = {
                type: 'httpx',
                path: libEntry.path,
                paths: {},
                module: libEntry.module,
                uuid: Crypto.generateUUID(),
                mime: null,
                once: libEntry.once === true,
                timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                cache: { '': libEntry.fqClassName },
                requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
            };

            this.paths[libEntry.path] = entry;
            this.httpxs[entry.uuid] = entry;

            Process.sendChildren({
                name: 'HttpLibraryAdd',
                libEntry: libEntry,
            });
        }
        else {
            await log(`Unable to add HttpX libEntry to HttpLibrary.`, toJson(libEntry));
        }

        return this;
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
                let raw = info.libEntry.cache[''].content;

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
                contentType: info.libEntry.mime.getCode(),
                contentEncoding: info.encoding,
                contentCharset: '',
                content: content,
            };
        }
        catch (e) {
            await caught(e);
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
                contentType: info.libEntry.mime.getCode(),
                contentEncoding: info.encoding,
                contentCharset: '',
                content: content,
            };
        }
        catch (e) {
            await caught(e);
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
            await caught(e);
            return 500;
        }
    }

    async has(path) {
        return path in this.paths;
    }

    async init(settings, libEntries) {
        this.paths = {};
        this.httpxs = {};
        this.settings = settings;

        for (let libEntry of libEntries) {
            await this.add(libEntry);
        }

        return this;
    }

    async onAdd(message) {
        await this.add(message.libEntry);
    }

    async onChildInit(message) {
        return Object.values(this.httpxs);
    }

    async onGet(message) {
        if (message.path in this.paths) {
            let libEntry = this.paths[message.path];
            
            if (this.checkMethod(libEntry, message.method)) {
                if (PermissionVerse.authorize(libEntry.requiredPermissions, message.grantedPermissions)) {
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

                        if (libEntry.type in { httpx:0 }) {
                            response.once = true;
                        }
                    }

                    return response;
                }
                else {
                    return 401;
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

    async onHas(message) {
        return await this.has(message.path);
    }

    async onRefresh(message) {
        this.refresh(message.path);
    }

    async onRemove(message) {
        this.remove(message.path);
    }

    async onRemoveHttpX(message) {
        Process.sendChildren({
            name: 'HttpLibraryRemove',
            type: 'httpx',
            path: message.path,
            uuid: message.uuid,
        });
    }

    refresh(path) {
        if (path in this.paths) {
            let libEntry = this.paths[path];

            if (libEntry.type in { data:0, file:0 }) {
                let cache = libEntry.cache;

                for (let encoding in cache) {
                    if ('timer' in cache[encoding]) {
                        clearTimeout(cache[encoding].timer);
                    }
                }

                for (let encoding in cache) {
                    delete cache[encoding];
                }
            }
        }

        return this;
    }

    remove(path) {
        let libEntry = this.paths[path];

        if (libEntry.type in { data:0, file:0 }) {
            let cache = libEntry.cache;

            for (let encoding in cache) {
                if ('timer' in cache[encoding]) {
                    clearTimeout(cache[encoding].timer);
                }
            }
        }

        if (libEntry.uuid) {
            let httpx = this.httpxs[libEntry.uuid];
            delete this.httpxs[libEntry.uuid];

            setTimeout(() => {
                for (let path in httpx.paths) {
                    delete this.paths[path];
                }
            }, 30000);
        }

        delete this.paths[path];
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
});


/*****
 * This is the HttpLibrary class associated with the HttpServerWorker.  Content
 * types that are serializable, such as files and static data objects, are NOT
 * stored here.  Content types that are "active" objects, which are called by
 * the HTTP server to dynamically generate responses, such as HttpX, are ctored
 * here in this process.  Regardless whether it's the HttpServer or the worker,
 * all library management occurs fully or partially in the HttpServer, which is
 * the main application process.  When removing an item, such as after a once
 * is triggered, the main process will remove that item from the library and
 * then if it's an HttpX entry, the main process instructs all children to remove
 * that instance from it's local set of paths.
*****/
registerIn('HttpServerWorker', '', class HttpLibrary {
    constructor() {
        this.paths = {};
        mkHandlerProxy(Process, 'HttpLibrary', this);
    }

    async add(libEntry) {
        await Process.sendParent({
            name: 'HttpLibraryAdd',
            libEntry: libEntry,
        });
    }

    async addInternal(libEntry) {
        if (libEntry.type == 'httpx') {
            require(libEntry.module);
            let makerName = fqnMakerName(libEntry.cache['']);

            let httpX;
            eval(`httpX = ${makerName}()`);

            if (httpX instanceof HttpX) {
                httpX.uuid = libEntry.uuid;
                httpX.prototype = Reflect.getPrototypeOf(httpX);
                httpX.className = httpX.prototype.constructor.name;
                httpX.fqClassName = libEntry.cache[''];
                httpX.fqMakerName = makerName;
                httpX.httpXPath = libEntry.module;
                httpX.httpXDir = libEntry.module.replace('.js', '');
                httpX.path = libEntry.path;
                httpX.once = libEntry.once;
                httpX.requiredPermissions = libEntry.requiredPermissions;
                await httpX.init();
                this.paths[libEntry.path] = httpX;
            }
        }
    }

    async handle(req) {
        let response = await Process.callParent({
            name: 'HttpLibraryGet',
            path: req.getPath(),
            method: req.getMethod(),
            encoding: req.getAcceptEncoding(),
            language: req.getAcceptLanguage(),
            headers: req.getHeaders(),
            grantedPermissions: req.getGrantedPermissions(),
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

            if (httpXInfo.once === true) {
                delete this.paths[httpXInfo.path];

                Process.sendParent({
                    name: 'HttpLibraryRemoveHttpX',
                    path: httpX.path,
                    uuid: httpX.uuid,
                });
            }

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
                await this.addInternal(libEntry);
            }
        }
        catch (e) {
            await caught(e);
        }

        return this;
    }

    async onAdd(message) {
        this.addInternal(message.libEntry);
    }

    async onRemove(message) {
        this.removeInternal(message.path, message.uuid);
    }

    async refresh(path) {
        await Process.sendParent({
            name: 'HttpLibraryRefresh',
            path: path,
        });

        return this;
    }

    async remove(path) {
        await Process.sendParent({
            name: 'HttpLibraryRemove',
            path: path,
        });

        return this;
    }

    removeInternal(path, uuid) {
        if (path in this.paths) {
            let httpx = this.paths[path];

            if (httpx.uuid == uuid) {
                delete this.paths[path];
            }
        }

        return this;
    }
});
