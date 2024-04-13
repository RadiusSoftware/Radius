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

    clearLibentry(libPath) {
        let libEntry = this.paths[libPath];

        if (libEntry) {
            delete this.paths[libEntry.path];

            if (libEntry.type == 'dir') {
                for (let path of Object.keys(this.paths)) {
                    let entry = this.paths[path];

                    if (entry.type == 'file') {
                        if (entry.dir === libEntry.dir) {
                            delete this.paths[entry.path];
                        }
                    }
                }
            }
            else if (libEntry.type == 'httpx') {
                Process.sendChildren({
                    name: 'HttpLibraryClearHttpX',
                    uuid: libEntry.uuid,
                });
            }
        }
    }

    async init(libEntries) {
        this.paths = {};
        this.libEntries = {};

        for (let libEntry of libEntries) {
            await this.setLibEntry(libEntry);
        }

        return this;
    }

    async onClearLibEntry(message) {
        return await this.clearLibEntry(message.path);
    }

    async onGetLibEntry(message) {
        if (typeof message.path == 'string') {
            if (message.path in this.paths) {
                let libEntry = this.paths[message.path];

                if (libEntry.once) {
                }
                
                if (libEntry.timeout) {
                }

                return libEntry;
            }
        }

        return 404;
    }

    async onSetLibEntry(message) {
        return await this.setLibEntry(message.libEntry);
    }

    async setLibEntry(libEntry) {
        if (libEntry.permissions === undefined || PermissionVerse.validatePermissions(libEntry.permissions)) {
            if (!(libEntry.path in this.paths)) {
                let libPath;

                try {
                    if (libEntry.type == 'data') {
                        libPath = await this.setData(libEntry);
                    }
                    else if (libEntry.type == 'file') {
                        libPath = await this.setFile(libEntry)
                    }
                    else if (libEntry.type == 'httpx') {
                        libPath = await this.setHttpX(libEntry);
                    }

                    if (libPath) {
                        if (this.paths[libPath].timeoutMillis) {
                            this.touch(libPath);
                        }
                    }
                }
                catch (e) {
                    caught(e, libEntry);
                }
            }
        }
    }

    async setData(libEntry) {
        this.paths[libEntry.path] = {
            type: 'data',
            path: libEntry.path,
            mime: mkMime(libEntry.mime),
            once: libEntry.once === true,
            timeoutMillis: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
            data: libEntry.data,
            requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
        }

        return libEntry.path;
    }

    async setFile(libEntry) {
        if (await FileSystem.isDirectory(libEntry.fspath)) {
            this.paths[libEntry.path] = {
                type: 'dir',
                path: libEntry.path,
                mime: mkMime(Path.extname(libEntry.fspath)),
                once: libEntry.once === true,
                timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
            };

            for (let fspath of await FileSystem.recurseFiles(libEntry.fspath)) {
                let path = Path.join(libEntry.path, fspath.substring(libEntry.fspath.length));

                this.paths[path] = {
                    type: 'file',
                    path: path,
                    dir: libEntry.path,
                    fspath: fspath,
                    mime: mkMime(Path.extname(fspath)),
                    once: libEntry.once === true,
                    timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                    requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
                };
            };

            return libEntry.path;
        }
        else if (await FileSystem.isFile(libEntry.fspath)) {
            this.paths[libEntry.path] = {
                type: 'file',
                path: libEntry.path,
                fspath: libEntry.fspath,
                mime: libEntry.mime ? mkMime(libEntry.mime) : mkMime(Path.extname(libEntry.fspath)),
                once: libEntry.once === true,
                timeout: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
                requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
            };

            return libEntry.path;
        }
    }

    async setHttpX(libEntry) {
        this.paths[libEntry.path] = {
            type: 'httpx',
            path: libEntry.path,
            module: libEntry.module,
            uuid: Crypto.generateUUID(),
            once: libEntry.once === true,
            timeoutMillis: typeof libEntry.timeout == 'number' ? libEntry.timeout : null,
            fqClassName: libEntry.fqClassName,
            requiredPermissions: libEntry.permissions === undefined ? {} : libEntry.permissions,
        };

        return libEntry.path;
    }

    touch(libPath) {
        let libEntry = this.paths[libPath];

        if (libEntry && libEntry.timeoutMillis) {
            if (libEntry.timeout) {
                clearTimeout(libEntry.timeout);
            }

            setTimeout(() => {
                this.clearContent(libPath);
            }, libEntry.timeoutMillis);
        }
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
        this.httpxs = {};
        mkHandlerProxy(Process, 'HttpLibrary', this);
    }

    async checkAuthorization(req, libEntry) {
        return true;
    }

    checkMethod(req, libEntry) {
        return true;
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

    async getHttpX(libEntry) {
        if (libEntry.uuid in this.httpxs) {
            return this.httpxs[libEntry.uuid];
        }

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

        return httpX;
    }

    async handle(req) {
        try {
            let libEntry = await Process.callParent({
                name: 'HttpLibraryGetLibEntry',
                method: req.method,
                path: req.path,
            });

            if (libEntry instanceof Error) {
                return 500;
            }
            else if (typeof libEntry == 'number') {
                return libEntry;
            }

            if (!libEntry) {
                return 404;
            }

            if (!this.checkMethod(req, libEntry)) {
                return 405;
            }

            if (!this.checkAuthorization(req, libEntry)) {
                return 401;
            }

            if (libEntry.type == 'data') {
                return {
                    contentType: libEntry.mime.code,
                    content: libEntry.data,
                };
            }
            else if (libEntry.type == 'file') {
                return this.getFileContent(libEntry);
            }
            else if (libEntry.type == 'httpx') {
                return await this.getHttpXContent(libEntry);
            }
            else {
                return 400;
            }
        }
        catch (e) {
            caught(e);
            return 500;
        }
    }

    async getFileContent(libEntry) {
        try {
            if (await FileSystem.isFile(libEntry.fspath)) {
                return {
                    contentType: libEntry.mime.code,
                    content: await FileSystem.readFile(libEntry.fspath),
                };
            }
            else {
                return 404;
            }
        }
        catch (e) {
            return 500
        }
    }

    async getHttpXContent(libEntry) {
        let httpx = await this.getHttpX(libEntry.uuid);
    }

    async init(httpServer) {
        this.httpServer = httpServer;
        return this;
    }

    async onClearHttpX(message) {
        delete this.httpxs[message.uuid];
    }
});
