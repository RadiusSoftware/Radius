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
 * Temporary files can be very useful when processing large data sets or large
 * files.  This class provides a means for rapidly creating a temporary file
 * with a guaranteed unique file name, opening it, and then making it ready for
 * use within one of the server processes.
*****/
register('', class TempFile {
    constructor(extension) {
        this.handle = null;
        this.path = Path.join(Env.getTempPath(), Crypto.generateRandomUuid());

        if (typeof extension == 'string' && extension != '') {
            if (extension.startsWith('.')) {
                this.extension = extension.substring(1);
            }
            else {
                this.extension = extension;
            }
        }
        else {
            this.extension = '';
        }
    }

    async close() {
        if (this.handle) {
            await this.handle.close();
            this.handle = null;
        }

        return this;
    }

    async delete() {
        await this.close();

        if (await FileSystem.pathExists(this.path)) {
            await FileSystem.deleteFile(this.path);
        }

        return this;
    }

    getPath() {
        return this.path;
    }

    async open() {
        if (!this.handle) {
            this.handle = await FileSystem.open(this.path, 'w');
        }

        return this;
    }

    async read() {
        if (!this.handle) {
            await this.open();
        }

        if (this.handle) {
            return this.handle.readFile();
        }

        return mkBuffer('');
    }

    async touch() {
        if (!this.handle) {
            this.handle = await this.open();
        }
        else {
            this.open();
        }

        return this;
    }

    async write(data) {
        if (!this.handle) {
            await this.open();
        }

        if (this.handle) {
            return this.handle.appendFile(data);
        }

        return this;
    }
});
