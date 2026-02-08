/*****
 * Copyright (c) 2017-2023 Kode Programming
 * https://github.com/KodeProgramming/kode/blob/main/LICENSE
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
 * Base class for HTTP Extensions, which are the cornerstone for the Radius
 * HTTP server strategy for adding extensive features.  An HTTP Extension,
 * also known as HttpX, is a HttpServer class that provides a framework for
 * implementing server-side dynamic responses to requests.  This is the basis
 * for web applications and simpler algorithms such as realtime data steaming.
 * What it does is accept an HTTP request and provides an framework response
 * employing following shape:
 * 
 *      return {
 *          status: 200,
 *          mime: 'application/json',
 *          content: toJson({
 *              why: 'WHY',
 *              how: 'HOW',
 *          }),
 *      };
 * 
 * The HttpServerWorker accepts the response from the HttpX and places it into
 * the response pipeline.  An HttpX works equally well with both HTTP requests
 * and with a websocket.
*****/
define(class HttpX extends Emitter {
    static NotAllowed = Symbol('NotAllowed');

    constructor() {
        super();
        this.filepath = '';
        this.httppath = '';
        this.pkgName = '';
        this.options = {};
        this.ctor = Reflect.getPrototypeOf(this).constructor;
        this.className = this.ctor.name;
        this.namespace = this.ctor['#namespace'];
        this.fqn = this.ctor['#fqn'];
    }

    getClassName() {
        return this.className;
    }

    getCtor() {
        return this.ctor;
    }

    async getDependencies() {
        return mkPackageHandle().getDependencies(this.pkgName);
    }

    getFilePath() {
        return this.filepath;
    }

    getFqn() {
        return this.fqn;
    }

    getHttpPath() {
        return this.httppath;
    }

    getNamespace() {
        return this.namespace;
    }

    getOption(name) {
        if (name != 'settings') {
            if (name in this.options) {
                return this.options[name];
            }
        }

        return type.getDefault();
    }

    getOptions() {
        return this.options;
    }

    getPackageName() {
        return this.pkgName;
    }

    getSetting(name) {
        if (name in this.options.settings) {
            return this.options.settings[name];
        }

        return type.getDefault();
    }

    async listLoadOrder() {
        return mkPackageHandle().listLoadOrder(this.pkgName);
    }

    async handleDELETE(handle) {
        return HttpX.NotAllowed;
    }

    async handleGET(handle) {
        return HttpX.NotAllowed;
    }

    async handleHEAD(handle) {
        return HttpX.NotAllowed;
    }

    async handlePOST(handle) {
        return HttpX.NotAllowed;
    }

    async handlePUT(handle) {
        return HttpX.NotAllowed;
    }

    async handleWebsocket(data) {
    }

    async init() {
        return this;
    }
});
