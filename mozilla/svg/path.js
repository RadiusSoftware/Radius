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
*****/
register('', class SvgPath {
    static regexp = new RegExp(
        '',
        'g'
    );

    constructor(arg) {
        this.cmmds = [];

        if (typeof arg == 'string') {
        }
        else if (typeof arg == 'array') {
        }
    }

    clear() {
        this.cmmds = [];
        return this;
    }

    getAt(index) {
        return this.cmmds[index];
    }

    insertAt(index, ...cmmds) {
        return this;
    }

    removeAt(index) {
        this.cmmds.splice(index, 1);
        return this;
    }

    setPath(string) {
        this.clear();

        for (let cmmd of string.trim().matchAll(SvgPath.regexp)) {
        }

        return this;
    }

    [Symbol.iterator]() {
        return this.cmmds[Symbol.iterator]();
    }

    toArray(opts) {
        return new Array(this.cmmds);
    }

    toString(opts) {
    }

    toStringArray(opts) {
    }
});
