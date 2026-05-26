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
 * A singleton wrapper for standard library's WHATWG URL API with some added
 * features.  Note that the WHATWG is the current standard based on web standards
 * and based on security requirements.  This standard operates on both client
 * and server.
*****/
define(class Url {
    constructor(input, base) {
        this.input = input;
        this.base = StringType.verify(base) ? base : undefined;

        try {
            this.url = new URL(this.input, this.base);
        }
        catch (e) {
            this.error = e;
            this.url = null;
        }
    }

    getBase() {
        return this.base;
    }

    getCredentials() {
        if (this.url.username && this.url.password) {
            return `${this.url.username}:${this.url.password}`;
        }

        return '';
    }

    getHash() {
        return this.url.hash;
    }

    getHost() {
        return this.url.host;
    }

    getHostname() {
        return this.url.hostname;
    }

    getHref() {
        return this.url.href;
    }

    getInput() {
        return this.input;
    }

    getOrigin() {
        return this.url.origin;
    }

    getPassword() {
        return this.url.protocol;
    }

    getPath() {
        return `${this.url.pathname}${this.url.search}`;
    }

    getPathname() {
        return this.url.pathname;
    }

    getPort() {
        if (this.url.port) {
            return parseInt(this.url.port);
        }
        else {
            return null;
        }
    }

    getProtocol() {
        return this.url.protocol;
    }

    getSearch() {
        return this.url.search;
    }

    getSearchParam(key) {
        return this.url.searchParams[key];
    }

    getSearchParams() {
        return this.url.searchParams;
    }

    getUsername() {
        return this.url.username;
    }

    isValid() {
        return this.url instanceof URL;
    }

    hasBase() {
        return StringType.verify(this.base);
    }

    hasCredentials() {
        return this.url.username && this.url.password;
    }

    hasSearchParam(key) {
        return key in this.url.searchParams;
    }
});
