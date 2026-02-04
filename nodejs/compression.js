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
const NpmYauzl = require('yauzl');
const NpmYazl = require('yazl');
const LibZlib = require('node:zlib');


/*****
 * An encapsulation of the various supported compression algorithms available
 * within Radius.  Each supported algorithm has an encode() and expand() function
 * the defines the features for them.  If there are variants or arguments to
 * the those algorithms, they need to be passed as an opts argument, which wil
 * then be passed via the compress() / uncompress() functions to the under-
 * lying algorithm.
*****/
singleton(class Compression {
    constructor() {
        this.algorithms = {
            '': {
                compress: async uncompressed => uncompressed,
                uncompress: async compressed => compressed,
            },

            deflate: {
                compress: uncompressed => {
                    return new Promise(async (ok, fail) => {
                        LibZlib.deflate(uncompressed, (error, compressed) => ok(compressed));
                    });
                },
                uncompress: compressed => {
                    return new Promise((ok, fail) => {
                        LibZlib.deflate(compressed, (error, uncompressed) => ok(uncompressed));
                    });
                },
            },

            'deflate-raw': {
                compress: uncompressed => {
                    return new Promise(async (ok, fail) => {
                        let deflator = LibZlib.createDeflateRaw();
                        deflator.on('data', compressed => ok(compressed));
                        deflator.write(uncompressed);
                        deflator.end();
                    });
                },
                uncompress: compressed => {
                    return new Promise((ok, fail) => {
                        let inflator = LibZlib.createInflateRaw();
                        inflator.on('data', uncompressed => ok(uncompressed));
                        inflator.write(compressed);
                    });
                },
            },
            
            gzip: {
                compress: uncompressed => {
                    return new Promise((ok, fail) => {
                        LibZlib.gzip(uncompressed, (error, buffer) => ok(buffer));
                    });
                },
                uncompress: compressed => {
                    return new Promise((ok, fail) => {
                        LibZlib.gunzip(compressed, (error, buffer) => ok(buffer));
                    });
                },
            },
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


/*****
 * The implementation of a memory-based ZIP archive unzipper.  Remember that zip
 * files are NOT just compression/decompression!  They are akin to TAR or other
 * types of archive files.  Hence, there are directories and multiple files within
 * that zip archive file.  The Unzipper is provided a buffer representing a valid
 * zip file and then the init() method catalogs the directories and files contained
 * within the archive.  Upon request, getEntry() method, the uncompressed / original
 * contents of the specified file can be pulled from the zip archive.
*****/
define(class Unzipper {
    constructor(buffer) {
        this.buffer = buffer;
        this.entries = {};
    }

    getEntry(path) {
        return new Promise((ok, fail) => {
            if (path in this.entries) {
                let buffers = [];
                let entry = this.entries[path];

                this.zipFile.openReadStream(entry, (error, readStream) => {
                    if (error) {
                        throw error;
                    }
                    else {
                        readStream.on('data', buffer => {
                            buffers.push(buffer.toString());
                        });
        
                        readStream.on('end', () => {
                            ok(buffers[0].concat(...buffers.slice(1)));
                        });
                    }
                });
            }
        });
    }

    hasEntry(path) {
        return path in this.entries;
    }

    init() {
        return new Promise((ok, fail) => {
            NpmYauzl.fromBuffer(this.buffer, (error, zipFile) => {
                this.zipFile = zipFile;
    
                zipFile.on('entry', entry => {
                    this.entries[entry.fileName] = entry;
                });
        
                zipFile.on('error', error => {
                    throw new Error(error);
                });
        
                zipFile.on('end', entry => {
                    ok(this);
                });
            });
        });
    }

    listEntries() {
        return Object.keys(this.entries);
    }

    [Symbol.iterator]() {
        return Object.values(this.entries)[Symbol.iterator]();
    }
});


/*****
 * The implementation of a memory-base zipper is used for creating the memory
 * image of a zip archive file.  In essence, the Zipper is made after which data
 * files are added to it.  When the zip is ready, its then converter to a bimary
 * blob, which is ready for data transfer or writing to a zip archive file with
 * an .zip extension.
*****/
define(class Zipper {
    constructor() {
        this.zipFile = new NpmYazl.ZipFile();
    }

    async addBuffer(buffer, path) {
        this.zipFile.addBuffer(buffer, path);
        return this;
    }

    async addEmptyDirectory(path) {
        this.zipFile.addEmptyDirectory(path);
        return this;
    }

    async addFile(filePath, path) {
        this.zipFile.addFile(filePath, path);
        return this;
    }

    async addReadStream(readStream, path) {
        this.zipFile.addReadStream(readStream, path);
        return this;
    }

    getBuffer() {
        return new Promise((ok, fail) => {
            let buffers = [];

            this.zipFile.outputStream.on('data', buffer => {
                buffers.push(buffer);
            });

            this.zipFile.outputStream.on('end', () => {
                ok(Buffer.concat(buffers));
            });

            this.zipFile.end();
        });
    }
});
