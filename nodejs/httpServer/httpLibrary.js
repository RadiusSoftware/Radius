/*****
 * Copyright (c) 2024 Radius Software
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
 * The HTTP library service provides a central repository for web servers on the
 * entire execution node.  It stores both static and dynamic data.  Static data
 * may refer to directory structures, individual files, or more interestingly yet,
 * a blob of data that's been added to the library.  On the flip side, the dynamic
 * data refers to functions and HTTP extensions, often referred to as HttpXs.  For
 * functions, a remote call is made to the function's process, whereas for an HttpX,
 * the web server worker process left to create the httpX and execute its code to
 * get the desired dynamic result.
*****/
createService(class HttpLibraryService extends Service {
    constructor() {
        super();
        this.entries = {};
    }

    addLibraryEntry(libEntry) {
        if (typeof libEntry.path != 'string') {
            return mkFailure(`HttpLibrary.adding to library: INVALID PATH"`);
        }

        if (!(libEntry.mode in { 'plain':0, 'tls':0 })) {
            return mkFailure(`HttpLibrary.adding to library at "${libEntry.path}": INVALID MODE`);
        }

        if (!BooleanType.verify(libEntry.once)) {
            return mkFailure(`HttpLibrary.adding to library at "${libEntry.path}": INVALID ONCE`);
        }

        if (!(libEntry.pset instanceof PermissionSetHandle)) {
            return mkFailure(`HttpLibrary.adding to library at "${libEntry.path}": INVALID PERMISSION SET`);
        }

        libEntry.watchers = {};
        this.entries[libEntry.path] = libEntry;
    }

    async createEtag(libEntry) {
        let hash = await Crypto.hash('sha256', libEntry.data);
        libEntry.headers['Etag'] = hash.toString('base64url');
    }

    async onAddData(message) {
        let libEntry = {
            type: 'data',
            pkg: message.pkg,
            path: message.path,
            mime: message.mime,
            mode: message.mode,
            once: message.once,
            pset: message.pset,
            data: message.data,
            notify: message.notify,
            headers: ArrayType.verify(message.headers) ? message.headers : {},
            flags: ObjectType.verify(message.flags) ? message.flags : {},
        };

        await this.createEtag(libEntry);
        return this.addLibraryEntry(libEntry);
    }

    async onAddFile(message) {
        if (!(await FileSystem.isFile(message.filePath))) {
            return mkFailure(e, `HttpLibrary.addFunction() at "${libEntry.path}": INVALID FUNCTION`);
        }

        let buffer = await FileSystem.readFile(message.filepath);

        let libEntry = {
            type: 'file',
            pkg: message.pkg,
            path: message.path,
            mime: message.mime,
            mode: message.mode,
            once: message.once,
            pset: message.pset,
            data: buffer,
            notify: message.notify,
            headers: ArrayType.verify(message.headers) ? message.headers : {},
            flags: ObjectType.verify(message.flags) ? message.flags : {},
        };

        await this.createEtag(libEntry);
        return this.addLibraryEntry(libEntry);
    }

    async onAddFunction(message) {
        if (!typeof message.func == 'function') {
            return mkFailure(e, `HttpLibrary.addFile() at "${libEntry.path}": NO FUNCTION PROVIDED`);
        }

        let libEntry = {
            type: 'function',
            pkg: message.pkg,
            path: message.path,
            mime: message.mime,
            mode: message.mode,
            once: message.once,
            pset: message.pset,
            func: message.func,
            args: message.args,
            headers: ArrayType.verify(message.headers) ? message.headers : {},
            flags: ObjectType.verify(message.flags) ? message.flags : {},
        };

        libEntry.headers['Cache-Control'] = 'no-cache';
        return this.addLibraryEntry(libEntry);
    }

    async onAddHttpX(message) {
        let libEntry = {
            type: 'httpx',
            pkg: message.pkg,
            path: message.path,
            mime: message.mime,
            mode: message.mode,
            once: message.once,
            pset: message.pset,
            opts: message.opts,
            jsPath: message.jsPath,
            headers: ArrayType.verify(message.headers) ? message.headers : {},
            flags: ObjectType.verify(message.flags) ? message.flags : {},
        };

        for (let key in libEntry.opts.settings) {
            let type = libEntry.opts.settings[key].type;
            let value = type.fromString(libEntry.opts.settings[key].value);
            await mkSettingsHandle().defineTemporarySetting(key, 'general', type, value);
        }

        libEntry.headers['Cache-Control'] = 'no-cache';
        return this.addLibraryEntry(libEntry);
    }

    async onDelete(message) {
        if (message.path in this.entries) {
            let libEntry = this.entries[message.path];

            if (libEntry) {
                delete this.entries[libEntry.path];
                let httpServer = Server.getServer(HttpServer);
                
                for (let worker of httpServer.getWorkers()) {
                    Process.sendWorker(
                        worker,
                        {
                            name: 'HttpLibraryDelete',
                            libEntry: libEntry,
                        }
                    );
                }
            }

            return libEntry;
        }
    }

    async onGet(message) {
        if (message.path in this.entries) {
            let libEntry = this.entries[message.path];
            return libEntry;
        }

        return 404;
    }

    async onIgnore(message) {
        if (message.path in this.entries) {
            const libEntry = this.entries[message.path];

            if (message.workerId in libEntry.watchers) {
                libEntry.watchers[message.workerId]--;
            }
        }
    }

    async onTriggerNotify(message) {
        if (message.path in this.entries) {
            const libEntry = this.entries[message.path];
            
            for (let workerKey in libEntry.watchers) {
                const workerId = parseInt(workerKey);
                
                const notification = {
                    name: 'HttpLibraryServed',
                    path: libEntry.path,
                    libEntry: libEntry,
                };

                if (workerId == -1) {
                    Process.sendPrimary(notification);
                }
                else {
                    Process.sendWorker(workerId, notification);
                }
            }
        }
    }

    async onWatch(message) {
        if (message.path in this.entries) {
            const libEntry = this.entries[message.path];

            if (message.workerId in libEntry.watchers) {
                libEntry.watchers[message.workerId]++;
            }
            else {
                libEntry.watchers[message.workerId] = 1;
            }

            return true;
        }
        else {
            return false;
        }
    }
});


/*****
 * The HTTP Library handle provides the mechanism for accessing and controlling
 * data in the HttpLibraryService.  An HttpServerWorker is the primary user of
 * HttpLibraryHandle objects, althought it's been set up as a library such that
 * all objects and processes can interact with the library.
*****/
define(class HttpLibraryHandle extends Handle {
    static watchers = {};

    static {
        Process.on('HttpLibraryServed', message => {
            if (message.path in HttpLibraryHandle.watchers) {
                let watchers = HttpLibraryHandle.watchers[message.path];

                for (let key in watchers) {
                    let handler = watchers[key];

                    try {
                        handler(key, message.libEntry);
                    }
                    catch (e) {}
                }
            }
        });

        Process.on('HttpLibraryDelete', async message => {
            for (let path in HttpLibraryHandle.watchers) {
                if (path == message.libEntry.path) {
                    delete HttpLibraryHandle.watchers[path];
                }
            }
        });
    }

    async addData(entry) {
        await this.callService(entry)
        return this;
    }

    async addFile(entry) {
        await this.callService(entry)
        return this;
    }

    async addFunction(entry) {
        await this.callService(entry)
        return this;
    }

    async addHttpX(entry) {
        await this.callService(entry)
        return this;
    }

    async delete(path) {
        return await this.callService({
            path: path,
        });
    }

    async get(path) {
        return await this.callService({
            path: path,
        });
    }

    async has(path) {
        return await this.callService({
            path: path,
        });
    }

    async ignore(uuid) {
        for (let path in HttpLibraryHandle.watchers) {
            let pathWatcher = HttpLibraryHandle.watchers[path];

            for (let uuid in pathWatcher) {
                if (uuid == uuid) {
                    await this.callService({ path: path });
                    delete pathWatcher[uuid];

                    if (Object.keys(pathWatcher).length == 0) {
                        delete HttpLibraryHandle.watchers[path];
                    }

                    return this;
                }
            }
        }

        return this;
    }

    async triggerNotify(path) {
        await this.callService({
            path: path,
        });

        return this;
    }

    async watch(path, handler) {
        if (path in HttpLibraryHandle.watchers) {
            var pathWatchers = HttpLibraryHandle.watchers[path];
        }
        else {
            var pathWatchers = {};
            HttpLibraryHandle.watchers[path] = pathWatchers;
        }

        for (let func of (Object.values(pathWatchers))) {
            if (Object.is(func, handler)) {
                return '';
            }
        }

        await this.callService({
            path: path,
            workerId: Process.getWorkerId(),
        });

        let uuid = Crypto.generateUUID();
        pathWatchers[uuid] = handler;

        return uuid;
    }
});