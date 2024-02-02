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
const LibPath = require('path');


/*****
 * File system utilities that come to the rescue when dealing with your server
 * side needs.  This singleton will perform more complex tasks such as recursing
 * file structures to generate a depth-first array of directory and file paths.
 * It will provides and asynchronous method for determining whether the specified
 * path exists.  These are examples of the types of utilities that are included
 * and will be added to this singleton.
*****/
singleton('', class FileSystem {
    absolutePath(base, path) {
        if (LibPath.isAbsolute(path)) {
            return path;
        }
        else {
            return LibPath.join(base, path);
        }
    }

    async isDirectory(path) {
        if (await this.pathExists(path)) {
            let stats = await LibFiles.stat(path);
            return stats.isDirectory();
        }
    
        return false;
    }

    async isFile(path) {
        if (await pathExists(path)) {
            let stats = await LibFiles.stat(path);
            return stats.isFile();
        }
    
        return false;
    }

    async pathExists(path) {
        return new Promise(async (ok, fail) => {
            try {
                let handle = await LibFiles.open(path);
                await handle.close();
                ok(true);
            }
            catch (e) {
                ok(false);
            }
        });
    }

    async recurseDirectories(...args) {
        let dirs = [];
        let stack = [await LibPath.resolve(LibPath.resolve(...args))];
    
        while (stack.length) {
            let path = stack.pop();
      
            try {
                let stats = await LibPath.stat(path);
      
                if (stats.isDirectory()) {
                    dirs.push(path);
    
                    (await LibFiles.readdir(path)).forEach(fileName => {
                        if (!fileName.startsWith('.')) {
                            stack.push(`${path}/${fileName}`);
                        }
                    });
                }
            } catch (e) {}
        }
      
        return dirs;
    }

    async recurseFiles(...args) {
        let files = [];
        let stack = [await LibPath.resolve(LibPath.resolve(...args))];
    
        while (stack.length) {
            let path = stack.pop();
      
            try {
                let stats = await LibFiles.stat(path);
      
                if (stats.isDirectory()) {
                    (await LibFiles.readdir(path)).forEach(fileName => {
                        if (!fileName.startsWith('.')) {
                            stack.push(`${path}/${fileName}`);
                        }
                    });
                }
                else if (stats.isFile()) {
                    files.push(path);
                }
            } catch (e) {}
        }
      
        return files;
    }
});
