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
const LibFiles = require('fs');


/*****
 * File system utilities that come to the rescue when dealing with your server
 * side needs.  This singleton will perform more complex tasks such as recursing
 * file structures to generate a depth-first array of directory and file paths.
 * It will provides and asynchronous method for determining whether the specified
 * path exists.  These are examples of the types of utilities that are included
 * and will be added to this singleton.
*****/
singleton('', class FileSystem extends Emitter {
    constructor() {
        super();
        this.watches = {};
    }

    async appendFile(path, mode) {
        await LibFiles.promises.appendFile(path, mode);
        return this;
    }

    async chmod(path, mode) {
        await LibFiles.promises.chmod(path, mode);
        return this;
    }

    async chown(path, uid, gid) {
        await LibFiles.promises.chown(path, uid, gid);
        return this;
    }

    async deleteDirectory(path, recursive) {
        await LibFiles.promises.rmdir(path, { recursive: recursive });
        return this;
    }

    async deleteFile(path, force, recursive) {
        await LibFiles.promises.rm(path, { force: force, recursive: recursive });
        return this;
    }

    async enumerateDirectories(...args) {
        let dirs = [];

        for (let arg of args) {
            if (await this.isDirectory(arg)) {
                for (let dirname of await LibFiles.promises.readdir(arg)) {
                    if (!dirname.startsWith('.')) {
                        let path = Path.join(arg, dirname);

                        if (await this.isDirectory(path)) {
                            dirs.push(path);
                        }
                    }
                }
            }
        }

        return dirs;
    }

    async enumerateFiles(...args) {
        let dirs = [];

        for (let arg of args) {
            if (await this.isDirectory(arg)) {
                for (let dirname of await LibFiles.promises.readdir(arg)) {
                    if (!dirname.startsWith('.')) {
                        let path = Path.join(arg, dirname);

                        if (await this.isFile(path)) {
                            dirs.push(path);
                        }
                    }
                }
            }
        }

        return dirs;
    }

    async isDirectory(path) {
        try {
            let stats = await LibFiles.promises.stat(path);
            return stats.isDirectory();
        }
        catch (e) {
            return false;
        }
    }

    async isFile(path) {
        try {
            let stats = await LibFiles.promises.stat(path);
            return stats.isFile();
        }
        catch (e) {
            return false;
        }
    }

    async isLink(path) {
        try {
            let stats = await LibFiles.promises.stat(path);
            return stats.isSymbolicLink();
        }
        catch (e) {
            return false;
        }
    }

    async openDirectory(path, recursive) {
        return LibFiles.promises.opendir(path, { recursive: recursive });
    }

    async openFile(path, mode) {
        return await LibFiles.promises.open(path, mode);
    }

    async pathExists(path) {
        try {
            LibFiles.promises.stat(path);
            return true;
        }
        catch (e) {
            return false;
        }
    }

    async readDirectory(path, recursive) {
        return await LibFiles.promises.readdir(
            path,
            { recursive: recursive }
        );
    }

    async readFile(path, encoding) {
        return await LibFiles.promises.readFile(
            path,
            encoding ? { encoding: encoding } : undefined,
        );
    }

    async readFileAsString(path, encoding) {
        let buffer = await LibFiles.promises.readFile(
            path,
            encoding ? { encoding: encoding } : undefined,
        );

        return buffer.toString();
    }

    async readLink(path, encoding) {
        return await LibFiles.promises.readFile(
            path,
            encoding ? { encoding: encoding } : undefined,
        );
    }

    async realPath(path) {
        return await LibFiles.promises.realpath(
            path,
            { encoding: 'utf8' }
        );
    }

    async recurseDirectories(...args) {
        let dirs = [];
        let stack = [await Path.resolve(...args)];
    
        while (stack.length) {
            let path = stack.pop();

            if (await this.isDirectory(path)) {
                for (let fileName of await LibFiles.promises.readdir(path)) {
                    if (!fileName.startsWith('.')) {
                        let abspath = Path.join(path, fileName);

                        if (await this.isDirectory(abspath)) {
                            stack.push(abspath);
                        }
                    }
                }
            }
        }
      
        return dirs;
    }

    async recurseFiles(...args) {
        let files = [];
        let stack = [await Path.resolve(...args)];
    
        while (stack.length) {
            let path = stack.pop();

            if (await this.isDirectory(path)) {
                for (let fileName of await LibFiles.promises.readdir(path)) {
                    if (!fileName.startsWith('.')) {
                        let abspath = Path.join(path, fileName);

                        if (await this.isDirectory(abspath)) {
                            stack.push(abspath);
                        }
                        else if (await this.isFile(abspath)) {
                            files.push(abspath);
                        }
                    }
                }
            }
        }
      
        return files;
    }

    async recurseModules(...directories) {
        let stack = [await Path.resolve(...directories)];
    
        while (stack.length) {
            let path = stack.pop();
  
            if (await this.isDirectory(path)) {
                for (let fileName of await LibFiles.promises.readdir(path)) {
                    if (!fileName.startsWith('.')) {
                        let abspath = Path.join(path, fileName);

                        if (await this.isDirectory(abspath)) {
                            stack.push(abspath);
                        }
                        else if (await this.isFile(abspath)) {
                            if (abspath.endsWith('.js')) {
                                require(abspath);
                            }
                        }
                    }
                }
            }
        }
      
        return this;
    }

    async rename(oldPath, newPath) {
        await LibFiles.promises.rename(oldPath, newPath);
        return this;
    }

    async setUtimes(path, atimeArg, mtimeArg) {
        let atime;
        let mtime;

        if (typeof atimeArg == 'number') {
            atime = atimeArg;
        }
        else if (typeof atimeArg == 'string') {
            atime = parseNumber(atimeArg);
        }
        else if (atimeArg instanceof Time) {
            atime = atimeArg.valueOf();
        }

        if (typeof mtimeArg == 'number') {
            mtime = mtimeArg;
        }
        else if (typeof mtimeArg == 'string') {
            mtime = parseNumber(mtimeArg);
        }
        else if (mtimeArg instanceof Time) {
            mtime = mtimeArg.valueOf();
        }

        await LibFiles.promises.utimes(path, atime, mtime);
        return this;
    }

    async stat(path) {
        if (await this.pathExists(path)) {
            return await LibFiles.promises.stat(path);
        }

        return null;
    }

    async truncate(path, bytes) {
        await LibFiles.promises.truncate(path, bytes);
        return this;
    }

    async unlink(path) {
        if (this.isSymbolicLink(path)) {
            await LibFiles.promises.unlink(path);
        }

        return this;
    }

    async writeFile(path, data, mode, encoding) {
        let options = {
            mode: mode ? mode : 0o666,
            encoding: encoding ? encoding : 'utf8',
        };

        await LibFiles.writeFile(path, data, options);
        return this;
    }

    async writeLink(targetPath, linkPath) {
        await LibFiles.promises.symlink(targetPath, linkPath);
        return this;
    }
});
