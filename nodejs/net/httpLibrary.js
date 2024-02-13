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

    async addDynamicFiles(entry) {
        if (await FileSystem.pathExists(entry.file)) {
            let stats = await FileSystem.stat(entry.file);

            if (stats.isDirectory()) {
                this.paths[entry.file] = {
                    type: 'dir',
                    path: entry.file,
                    mime: mkMime(LibPath.extname(entry.file)),
                    once: entry.once === true,
                    cached: {},
                };
            }
            else if (stats.isFile()) {
                this.paths[entry.file] = {
                    type: 'file',
                    path: entry.file,
                    mime: mkMime(LibPath.extname(entry.file)),
                    once: entry.once === true,
                    cached: {},
                };
            }
        }
    }

    async addData(entry) {
    }

    async addOject(entry) {
    }

    async addStaticFiles(entry) {
        if (await FileSystem.pathExists(entry.file)) {
            let stats = await FileSystem.stat(entry.file);

            if (stats.isDirectory()) {
                for (let path of await FileSystem.recurseFiles(entry.file)) {
                    this.paths[path] = {
                        type: 'file',
                        path: path,
                        mime: mkMime(LibPath.extname(path)),
                        once: entry.once === true,
                        cache: {},
                    };
                };
            }
            else if (stats.isFile()) {
                this.paths[entry.file] = {
                    type: 'file',
                    path: entry.file,
                    mime: mkMime(LibPath.extname(entry.file)),
                    once: entry.once === true,
                    cache: {},
                };
            }
        }
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
        this.paths = {};
        this.settings = settings;

        for (let entry of entries) {
            if (entry.type == 'file') {
                if (entry.isDynamic === true) {
                    await this.addDynamicFiles(entry);
                }
                else {
                    await this.addStaticFiles(entry);
                }
            }
            else if (entry.type == 'data') {
            }
            else if (entry.type == 'object') {
            }
        }

        return this;
    }

    async loadFileDynamic(entry) {
    }

    async loadFileStatic(entry, encodings) {
        let content;
        let encoding = '';
        
        for (let key in encodings) {
            if (Compression.isSupported(key)) {
                encoding = key;
                break;
            }
        }

        if (encoding in entry.cache) {
            content = entry.cache[encoding].content;
            entry.cache[encoding].expires = mkTime().addMilliseconds(this.settings.cacheDurationMs);
        }
        else {
            let raw = entry.cache[''];

            if (!('' in entry.cache)) {
                raw = await FileSystem.readFile(entry.path);
            }

            content = await Compression.compress(encoding, raw);

            if (raw.length < this.settings.cacheMaxSizeMb*1024*1024) {
                entry.cache[''] = {
                    content: raw,
                    expires: mkTime().addMilliseconds(this.settings.cacheDurationMs),
                };
            }

            if (content.length < this.settings.cacheMaxSizeMb*1024*1024) {
                entry.cache[encoding] = {
                    content: content,
                    expires: mkTime().addMilliseconds(this.settings.cacheDurationMs),
                };
            }
        }

        return {
            status: 200,
            mime: entry.mime,
            encoding: encoding,
            content: content,
        };
    }

    async onAddEntry(message) {
        if (message.entry.type == 'file') {
        }
        else if (message.entry.tye == 'data') {
        }
        else if (message.entry.tye == 'object') {
        }
    }

    async onGet(message) {
        console.log(message);
        let libEntry = this.paths[message.path];

        if (libEntry) {
            if (libEntry.type == 'file') {
                let rsp;

                try {
                    if (libEntry.dynamic) {
                        rsp = await this.loadFileDynamic(libEntry, acceptedEncoding);
                    }
                    else {
                        rsp = await this.loadFileStatic(libEntry, message.encoding);
                    }

                    if (typeof rsp == 'object') {
                        return rsp;
                    }
                }
                catch (e) {
                    return 410;
                }
            }
            else if (libEntry.type == 'data') {
            }
            else if (libEntry.type == 'object') {
            }
        }
        
        return 404;
    }

    async onHead(message) {
        if (libEntry.type == 'file') {
        }
        else if (libEntry.type == 'data') {
        }
        else if (libEntry.type == 'object') {
        }
    }

    async onRemove(message) {
        if (libEntry.type == 'file') {
        }
        else if (libEntry.type == 'data') {
        }
        else if (libEntry.type == 'object') {
        }
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpLibrary {
    constructor() {
        this.filters = [];
        this.tree = mkTextTree('/');
        mkHandlerProxy(Process, 'HttpLibrary', this);

        this.makers = {
            data: mkHttpData,
            file: mkHttpFileSystem,
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
        this.settings = settings;

        if (Array.isArray(entries)) {
            for (let entry of entries) {
                await this.addItem(entry);
            }
        }

        this.filters = [
            await mkHttpMethodFilter(this).init(),
        ];

        if (Array.isArray(this.settings.libFilters)) {
            for (let httpFilterMaker of this.settings.libFilters) {
                this.filters.push(httpFilterMaker(this));
            }
        }

        return this;
    }

    async onAdd(message) {
    }

    async onRemove(message) {
    }

    removeItem(path) {
        this.tree.remove(path);
        return this;
    }

    [Symbol.iterator]() {
        return this.filters[Symbol.iterator]();
    }
});


execIn('HttpServerWorker', () => {
    /*****
     * A library filter is a programmable object whose purpose is to filter out
     * HTTP requests due to things such as bad method, unauthorized, or other
     * issues associated with the passed request.  In fact, outside callers may
     * add filters to their HTTP server that are specific to their application
     * or permissions framework.
    *****/
    register('', class HttpLibraryFilter {
        constructor(httpLibrary) {
            this.httpLibrary = httpLibrary;
        }

        async exec(req, httpItem) {
            return true;
        }

        async init() {
            return this;
        }
    });


    /*****
     * The most fundamental of built-in HttpLibrary filters.  This particulare
     * filter just checks the method name from the request to determine wheterh
     * provided httpItem had a method for handle that particular method.  The
     * negative response is 405, which is "Method Not Allowed".
    *****/
    register('', class HttpMethodFilter extends HttpLibraryFilter {
        constructor(httpLibrary) {
            super(httpLibrary);
        }

        async exec(req, httpItem) {
            if (typeof httpItem[`handle${req.getMethod()}`] == 'function') {
                return true;
            }

            return 405;
        }
    });


    /*****
     * Here's how the HTTP server works.  The HTTP request includes a URL with the
     * path.  The path of the URL is used to search for the best matching in the path
     * tree.  The best-match is the "subdirectory" chain starting from the root and
     * following the branches until there's no longer a match.  Here's an example:
     * 
     *      available path -- /dir1/dir2
     *      requested path -- /dir1/dir2/dir3/filename.ext
     *      best/longest path -- /dir1/dir2
     * 
     * In this case, the HTTP server will be able to fetch the HttpItem in the path
     * tree at /dir/dir2.  The remaining part of the path is /dir3/filename.txt, is
     * passed to the item as part of the request.  It's up to the HttpItem on how to
     * reespond the request.
     * 
     * Examples of some of the first built HttpItem classes are HttpFileSystem and
     * HttpWebX.  The former pulls files off of the server's file system, while the
     * latter is a programming object that computes its response vis-a-vis a class
     * that extends HttpWebX.
     * 
     * Essentially, handling an HTTP request has three-part responsibility between
     * the HttpServerWorker, the HttpItem base class, the HttpItem subclass that's
     * used by the server.
    *****/
    register('', class HttpLibraryItem {
        constructor(httpLibrary, entry) {
            this.httpLibrary = httpLibrary;
            this.entry = entry;
            this.paths = {};
        }
    
        getPath() {
            return this.entry.path;
        }
    
        getSettings() {
            return Data.copy(this.entry);
        }
    
        async init() {
            return this;
        }
    });
    
    
    /*****
    *****/
    registerIn('HttpServerWorker', '', class HttpData extends HttpLibraryItem {
        constructor(httpLibrary, entry) {
            super(httpLibrary, entry);
        }
    });
    
    
    /*****
     * The HttpFileSystem item provides the features for servering files resident on
     * the server's file system.  This is the original and classic task assigned to
     * HTTP servers.  As discussed above under HttpItem, the URL path is used to find
     * the HttpFileSystem item, wheres the remaining part of the path locate a file
     * within the filesystem itself.
     * 
     * HttpFileSystem items may be either static (default) or dynamic.  Dynamic
     * files are simple.  When are request is received, a (slow) search for the file
     * is performed and depending on whether the file was found, will be served or
     * an error message is generated.
     * 
     * Static file systems are more complex because caching is part of the mix.
     * For efficiency, dynamic files are searched for, loaded, cached and otherwise
     * managed by the Application-processes HttpLibrary object.  It's the application
     * process that's responsible for all file-system operations for static file
     * systems.
    *****/
    registerIn('HttpServerWorker', '', class HttpFileSystem extends HttpLibraryItem {
        constructor(httpLibrary, entry) {
            super(httpLibrary, entry);
        }
    
        async handleGET(req) {
            let path = LibPath.join(this.entry.file, req.getPath().substring(this.entry.path.length));
    
            let rsp = await Process.callParent({
                name: 'HttpLibraryGet',
                path: path,
                encoding: req.getAcceptEncoding(),
            });
    
            if (typeof rsp == 'number') {
                return rsp;
            }
            else {
                return {
                    status: 200,
                    mime: rsp.mime.code,
                    encoding: rsp.encoding,
                    content: rsp.content,
                }
            }
        }
    
        async handleHEAD(req, rsp) {
            if (this.entry.head === true) {
            }
            else {
                return 405;
            }
        }
    });
    
    
    /*****
    *****/
    registerIn('HttpServerWorker', '', class HttpObject extends HttpLibraryItem {
        constructor(httpLibrary, entry) {
            super(httpLibrary, entry);
        }
    });
    
    
    /*****
    *****/
    registerIn('HttpServerWorker', '', class HttpWebX extends HttpLibraryItem {
        constructor(httpLibrary, entry) {
            super(httpLibrary, entry);
        }
    });
});
