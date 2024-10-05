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
 * also known as HttpX, is a HttpServerWorker class that provides a framework
 * for implementing server-side dynamic responses to requests.  This is the
 * basis for web applications and simpler algorithms such as realtime data
 * steaming.  What it does is accept an HTTP request and provides an frame-
 * work response employing following shape:
 * 
 *      return {
 *          status: 200,
 *          contentType: 'application/json',
 *          content: toJson({
 *              why: 'WHY',
 *              how: 'HOW',
 *          }),
 *      };
 * 
 * The calling HttpServerWorker will then place this response into the HTTP
 * response object to be sent back to the browser.  The base-class restful
 * handlers must be overriden by the subclass in order to make this functional.
*****/
register('', class HttpX extends Emitter {
    constructor(libEntry) {
        super();
        this.libEntry = libEntry;
    }

    clearSetting(key) {
        delete this.settings[key];
        return this;
    }

    getClassName() {
        return this.className;
    }

    getFqClassName() {
        return this.fqClassName;
    }

    getFqMakerName() {
        return this.fqMakerName;
    }

    getHttpXDir() {
        return this.httpXDir;
    }

    getHttpXPath() {
        return this.httpXPath;
    }

    getLibEntry() {
        return this.libEntry;
    }

    getOnce() {
        return this.once;
    }

    getPrototype() {
        return this.prototype;
    }

    getSetting(key) {
        if (key in this.settings) {
            return this.settings[key];
        }
        else {
            return false;
        }
    }

    getUrlPath() {
        return this.path;
    }

    getUUID() {
        return this.uuid;
    }

    async handleDELETE(req, rsp) {
        return 501;
    }

    async handleGET(req, rsp) {
        return 501;
    }

    async handlePOST(req, rsp) {
        return 501;
    }

    async handlePUT(req, rsp) {
        return 501;
    }

    async handleWebSocket(data) {
    }

    async init() {
        let path = await Settings.setClassSettings(this);
        this.settings = await Settings.getValue(path);
        this.uuid = this.libEntry.uuid;
        this.prototype = Reflect.getPrototypeOf(this);
        this.className = this.prototype.constructor.name;
        this.fqClassName = this.libEntry.fqClassName;
        this.fqMakerName = this.libEntry.makerName;
        this.httpXPath = this.libEntry.module;
        this.httpXDir = this.libEntry.module.replace('.js', '');
        this.path = this.libEntry.path;
        this.once = this.libEntry.once;
        this.requiredPermissions = this.libEntry.requiredPermissions;
        this.settings.sessionCookie = Session.getSessionCookieName();
        await FileSystem.recurseModules(this.httpXDir);
        return this;
    }
});
