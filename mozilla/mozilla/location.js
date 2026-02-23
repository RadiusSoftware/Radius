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
 * Framework implementation of the document location object in the form of a
 * singleton.  It's purpose is to simply wrap the original implementation w/o
 * changing too much and adding some convenience features.
*****/
singleton(class Location {
    constructor() {
        this.hash = location.hash;
        this.host = location.host;
        this.hostname = location.hostname;
        this.href = location.href;
        this.origin = location.origin;
        this.pathname = location.pathname;
        this.port = location.port;
        this.protocol = location.protocol;
        this.segments = TextUtils.split(this.pathname, '/');
        this.applicationPath = `/${this.segments[0]}`;
        this.applicationOrigin = `${this.origin}${this.applicationPath}`;
        this.applicationWidget = null;
    }

    assign(urlString) {
        location.assign(urlString);
        return this;
    }

    getApplicationPath() {
        return this.applicationPath;
    }
    
    getHash() {
        return this.hash;
    }

    getHost() {
        return this.host;
    }

    getHostname() {
        return this.hostname;
    }

    getHref() {
        return this.href;
    }

    getOrigin() {
        return this.origin;
    }

    getPathname() {
        return this.pathname;
    }

    getPort() {
        return this.port;
    }

    getProtocol() {
        return this.protocol;
    }

    getSegments() {
        return Data.copy(this.segments);
    }

    reload() {
        location.reload();
        return this;
    }

    replace(urlString) {
        location.replace(urlString);
        return this;
    }
});
