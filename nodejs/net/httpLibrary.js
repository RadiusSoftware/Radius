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
        this.paths = {};
        mkHandlerProxy(Process, 'HttpLibrary', this);
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

    async onClearData(message) {
        // TODO
        return 'CLEAR DATA';
    }

    async onClearFile(message) {
        // TODO
        return 'FILE DATA';
    }

    async onGetData(message) {
        // TODO
        return 'GET DATA';
    }

    async onGetFile(message) {
        // TODO
        return 'GET FILE';
    }

    async onGetMime(message) {
        // TODO
        return 'GET MIME';
    }

    async onScanFileSystem(message) {
        if (await FileSystem.pathExists(message.path)) {
            let stats = await FileSystem.stat(message.path);

            if (stats.isDirectory()) {
                let pathArray = await FileSystem.recurseFiles(message.path);

                for (let path of pathArray) {
                    this.paths[path] = {
                        type: 'file',
                        path: path,
                        mime: mkMime(LibPath.extname(path)),
                        encodings: {},
                    };
                }

                return pathArray;
            }
            else if (stats.isFile()) {
                this.paths[message.path] = {
                    type: 'file',
                    path: message.path,
                    mime: mkMime(LibPath.extname(message.path)),
                    encodings: {},
                };

                return [message.path];
            }
        }

        return [];
    }

    async onSetData(message) {
        // TODO
        return 'SET DATA';
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
        this.settings = settings;

        if (Array.isArray(entries)) {
            for (let entry of entries) {
                await this.addItem(entry);
            }
        }

        return this;
    }

    removeItem(path) {
        this.tree.remove(path);
        return this;
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
register('', class HttpItem {
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
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpData extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleGET(req, rsp) {
        return {
            status: 404,
            encoding: '',
            content: '',
        };
    }

    async init() {
        return this;
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
registerIn('HttpServerWorker', '', class HttpFileSystem extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleGET(req, rsp) {
        if (this.entry.dynamic === true) {
        }
        else {
        }
    }

    async handleHEAD(req, rsp) {
        if (this.entry.head === true) {
        }
        else {
        }
    }

    async init() {
        if (this.entry.dynamic === true) {
        }
        else {
            for (let fileinfo of await Process.callParent({
                name: 'HttpLibraryScanFileSystem',
                path: this.entry.file,
            })) {
                let path = `${this.entry.path}${fileinfo.replace(this.entry.file, '')}`;
                this.paths[path] = { dynamic: false };
            }
        }

        return this;
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpObject extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }

    async handleGET(req, rsp) {
        return {
            status: 404,
            encoding: '',
            content: '',
        };
    }

    async init() {
        return this;
    }
});


/*****
*****/
registerIn('HttpServerWorker', '', class HttpWebX extends HttpItem {
    constructor(httpLibrary, entry) {
        super(httpLibrary, entry);
    }
});
