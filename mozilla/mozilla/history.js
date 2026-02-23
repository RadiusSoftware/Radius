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
 * A singleton impelementation of the window's history object.  Once of the
 * features is to wrap the property-based API with a functional API.  Use this
 * History singletone to control going back and forth through the browsing
 * history.
*****/
singleton(class History {
    constructor() {
    }

    getLength() {
        return window.history.length;
    }

    getScrollRestoration() {
        return window.history.scrollRestoration;
    }

    getState() {
        return window.history.state;
    }

    go(delta) {
        window.history.go(delta);
        return this;
    }

    goBack() {
        window.history.back();
        return this;
    }

    goForward() {
        window.history.forward();
        return this;
    }

    pushState(state, unused, url) {
        window.history.pushState(state, unused, url);
        return this;
    }

    replaceState(state, unused, url) {
        window.history.replac3State(state, unused, url);
        return this;
    }

    setAutoScrollRestoration() {
        window.history.scrollRestoration = 'auto';
        return this;
    }

    setManualScrollRestoration() {
        window.history.scrollRestoration = 'manual';
        return this;
    }
});
