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
const LibZlib = require('node:zlib');
const NpmGzip = require('node-gzip');


/*****
 * An encapsulation of the various supported compression algorithms available
 * within Radius.  Each supported algorithm has an encode() and expand() function
 * the defines the features for them.  If there are variants or arguments to
 * the those algorithms, they need to be passed as an opts argument, which wil
 * then be passed via the compress() / uncompress() functions to the under-
 * lying algorithm.
*****/
singleton('', class Compression {
    constructor() {
        this.algorithms = {
            '': {
                compress: async uncompressed => uncompressed,
                uncompress: async compressed => compressed,
            },
            gzip: {
                compress: async uncompressed => await NpmGzip.gzip(uncompressed),
                uncompress: async compressed => await NpmGzip.ungzip(compressed),
            },
            deflate: {
                compress: uncompressed => {
                    return new Promise((ok, fail) => {
                        LibZlib.deflateRaw(uncompressed, (error, compressed) => {
                            ok(compressed);
                        });
                    });
                },
                uncompress: compressed => {
                    return new Promise((ok, fail) => {
                        LibZlib.inflateRaw(compressed, (error, uncompressed) => {
                            ok(uncompressed);
                        });
                    });
                },
            }
        };
    }
    
    async compress(algorithm, uncompressed, opts) {
        if (algorithm in this.algorithms) {
            return await this.algorithms[algorithm].compress(uncompressed, opts);
        }
        
        return false;
    }

    async uncompress(algorithm, compressed, opts) {
        if (algorithm in this.algorithms) {
            return await this.algorithms[algorithm].uncompress(compressed, opts);
        }
        
        return false;
    }
    
    isSupported(algorithm) {
        return algorithm in this.algorithms;
    }
});
