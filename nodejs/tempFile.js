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
const LibPath = require('path');


/*****
*****/
register('', class TempFile {
    constructor(ext) {
        return new Promise((ok, fail) => {
            this.ext = typeof ext == 'string' ? ext.startsWith('.') ? ext.substr(1) : ext : '';
            this.path = path ? path : LibPath.join(Env.getTempPath(), Crypto.generateRandomUuid());
            ok(this);
        });
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
});
