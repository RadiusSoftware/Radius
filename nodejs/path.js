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
const LibPath = require('path');


/*****
 * A singleton wrapper for the nodejs module.  We simply want this as a global
 * wrapper so we don't need to keep on importing the path libray and then using
 * LibPath within those modules.
*****/
singleton(class Path {
    absolutePath(base, path) {
        if (LibPath.isAbsolute(path)) {
            return path;
        }
        else {
            return LibPath.join(base, path);
        }
    }

    basename(path) {
        return LibPath.basename(path);
    }

    dirname(path) {
        return LibPath.dirname(path);
    }

    extname(path) {
        return LibPath.extname(path);
    }

    isAbsolute(path) {
        return LibPath.isAbsolute(path);
    }

    join(...args) {
        return LibPath.join(...args);
    }

    normalize(path) {
        return LibPath.normalize(path);
    }

    parse(path) {
        return LibPath.parse(path);
    }

    resolve(...args) {
        return LibPath.resolve(...args);
    }
});
