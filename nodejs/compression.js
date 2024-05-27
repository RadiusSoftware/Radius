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
const NpmYauzl = require('yauzl');
const NpmYazl = require('yazl');


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
register('', class Unzipper {
    constructor(buffer) {
        this.buffer = buffer;
        this.entries = {};
    }

    ensureEntry(path) {
        let entry = this.entries;

        for (let segment of path.split('/')) {
            if (segment) {
                if (segment in entry) {
                    entry = entry[segment];
                }
                else {
                    let subEntry = {};
                    entry[segment] = subEntry;
                    entry = subEntry
                }
            }
        }

        return entry;
    }

    findEntry(path) {
        let entry = this.entries;

        for (let segment of path.split('/')) {
            if (segment) {
                if (!(entry instanceof NpmYauzl.Entry)) {
                    if (segment in entry) {
                        entry = entry[segment];
                    }
                    else {
                        entry = false;
                        break;
                    }
                }
                else {
                    entry = false;
                    break;
                }
            }
        }

        return entry;
    }

    getEntry(path) {
        return new Promise((ok, fail) => {
            let entry = this.findEntry(path);

            if (entry instanceof NpmYauzl.Entry) {
                let buffers = [];

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
            else {
                ok(false);
            }
        });
    }

    hasEntry(path) {
        return this.findEntry(path) !== false;
    }

    init() {
        return new Promise((ok, fail) => {
            NpmYauzl.fromBuffer(this.buffer, (error, zipFile) => {
                this.zipFile = zipFile;
    
                zipFile.on('entry', entry => {
                    if (/\/$/.test(entry.fileName)) {
                        this.ensureEntry(entry.fileName);
                    }
                    else {
                        let directory;
                        let entryName;
                        let slash = entry.fileName.lastIndexOf('/');

                        if (slash > 0) {
                            directory = this.findEntry(entry.fileName.substring(0, slash));
                            entryName = entry.fileName.substring(slash+1);
                        }
                        else {
                            directory = this.findEntry(entry.fileName);
                            entryName = entry.fileName;
                        }

                        if (directory && entryName) {
                            directory[entryName] = entry;
                        }
                    }
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
        let list = [];
        let stack = [];

        for (let key in this.entries) {
            stack.push({ path: key, value: this.entries[key] });
        }

        while (stack.length) {
            let entry = stack.pop();
            
            if (entry.value instanceof NpmYauzl.Entry) {
                list.push(entry.path);
            }
            else {
                for (let key in entry.value) {
                    stack.push({ path: `${entry.path}/${key}`, value: entry.value[key] });
                }
            }
        }

        return list;
    }
});


/*****
 * The implementation of a memory-base zipper is used for creating the memory
 * image of a zip archive file.  In essence, the Zipper is made after which data
 * files are added to it.  When the zip is ready, its then converter to a bimary
 * blob, which is ready for data transfer or writing to a zip archive file with
 * an .zip extension.
*****/
register('', class Zipper {
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
