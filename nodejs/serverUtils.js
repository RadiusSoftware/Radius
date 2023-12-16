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
import * as LibChildProcess from 'child_process'
import * as LibFileSystem from 'fs'
import * as LibPath from 'path'
import * as LibProcess from 'process'


(() => {
    /*****
     * Temporary File Object.  This object is only meant to be created / managed
     * by the ServerUtils singleton.  We use the system provided temp directory
     * and generate a unique filename as a random UUID.  Data can be appened
     * and read during the life of the file.  If the temp file is deleted, it can
     * be used again simply by writing to it.  If the temp file does NOT exist
     * when read, the return value will be null.
    *****/
    class TempFile {
        constructor(path, ext) {
            this.ext = typeof ext == 'string' ? ext.startsWith('.') ? ext.substr(1) : ext : '';
            this.path = path ? path : LibPath.join(Env.getTempPath(), Crypto.generateRandomUuid());
        }

        async append(data) {
            if (await this.exists()) {
                await Files.appendFile(this.getPath(), data);
            }
            else {
                await Files.writeFile(this.getPath(), data);
            }

            return this;
        }

        async delete() {
            if (await this.exists()) {
                Files.rm(this.getPath());
            }

            return this;
        }

        async exists() {
            return FileSys.existsSync(this.getPath());
        }

        getBasePath() {
            return this.path;
        }

        getPath() {
            return this.ext ? `${this.path}.${this.ext}` : this.path;
        }

        async read() {
            if (await this.exists()) {
                return await Files.readFile(this.getPath());
            }

            return '';
        }

        replica(ext) {
            return new TempFile(this.path, ext);
        }

        async rm() {
            if (await this.exists()) {
                Files.rm(this.getPath());
            }

            return this;
        }
    }

    /*****
     * A set of utility functions that are appropriate for simplifying stuff on
     * the Radius server.  In fact, these utilities won't even run on the browser
     * because they require the nodeJS environment, builtin library, and other
     * intalled NPM modules that are host, not browser, oriented.
    *****/
    singleton('', class ServerUtils {
        createTempFile(ext) {
            return new TempFile(null, ext);
        }

        execInShell(script) {
            return new Promise((ok, fail) => {
                LibChildProcess.exec(script, (error, stdout, stderr) => {
                    ok({
                        error: error,
                        stdout: stdout,
                        stderr: stderr,
                    });
                });        
            });
        }

        async fileExists(path) {
            return existsSync(path);
        }
    });

    /*****
     * Quick call to fetch the nodeJS proecess object.
    *****/
    register('', function getProcess() {
        return LibProcess;
    });
})();
