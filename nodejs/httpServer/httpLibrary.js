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

        if (!(libEntry.mode in { '':0, 'tls':0, 'open':0 })) {
            return mkFailure(`HttpLibrary.adding to library at "${libEntry.path}": INVALID MODE`);
        }

        if (!BooleanType.is(libEntry.once)) {
            return mkFailure(`HttpLibrary.adding to library at "${libEntry.path}": INVALID ONCE`);
        }

        if (!(libEntry.pset instanceof PermissionSetHandle)) {
            return mkFailure(`HttpLibrary.adding to library at "${libEntry.path}": INVALID PERMISSION SET`);
        }

        this.entries[libEntry.path] = libEntry;
        return true;
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
        };

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
        };

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
        };

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
        };

        for (let key in libEntry.opts.settings) {
            let type = libEntry.opts.settings[key].type;
            let value = type.fromString(libEntry.opts.settings[key].value);
            await mkSettingsHandle().defineTemporarySetting(key, 'general', type, value);
        }

        return this.addLibraryEntry(libEntry);
    }

    async onDelete(message) {
        if (message.path in this.entries) {
            let libEntry = this.entries[path];
            delete this.entries[libEntry.path];
            return libEntry;
        }
    }

    async onGet(message) {
        if (message.path in this.entries) {
            let libEntry = this.entries[message.path];

            if (libEntry.once) {
                delete this.entries[libEntry.path];
            }

            if (libEntry) {
                return libEntry;
            }
        }

        return 404;
    }

    async onRestore(message) {
        let libEntry = message.libEntry;
        this.entries[libEntry.path] = libEntry;
    }

    async onSetFlag(message) {
        let libEntry = this.entries[message.path];

        if (libEntry) {
            libEntry[message.flagName] = true;
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
    constructor() {
        super();
        this.setReturnFailures();
    }

    async addData(entry) {
        return await this.callService(entry);
    }

    async addFile(entry) {
        return await this.callService(entry);
    }

    async addFunction(entry) {
        return await this.callService(entry);
    }

    async addHttpX(entry) {
        return await this.callService(entry);
    }

    async get(path) {
        return await this.callService({
            path: path,
        });
    }

    async remove(path) {
        return await this.callService({
            path: path,
        });
    }

    async setFlag(path, flagName) {
        return await this.callService({
            path: path,
            flagName: flagName,
        });
    }
});