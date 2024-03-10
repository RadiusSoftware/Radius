/*****
 * Copyright (c) 2017-2023 Kode Programming
 * https://github.com/KodeProgramming/kode/blob/main/LICENSE
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
register('', class Bundle {
    constructor(path) {
        this.path = path;
        this.error = null;
        this.valid = true;
        this.items = [];
    }

    getError() {
        return this.error;
    }

    getErrorInfo() {
        return this.error.info;
    }

    getErrorStack() {
        return this.error.stack;
    }

    getName() {
        return this.name;
    }

    async get(encoding) {
    }

    async init() {
        try {
            if (this.path.endsWith('.html')) {
                if (Path.isAbsolute(this.path)) {
                    let buffer = await FileSystem.readFile(this.path);
                    let outerHtml = buffer.toString();
                    this.bundle = createDocElementFromOuterHtml(outerHtml);

                    if (this.bundle.getTagName() == 'radius') {
                        for (let element of this.bundle) {
                            let tag = element.getTagName();
                            let methodName = `process${tag[0].toUpperCase()}${tag.substring(1)}`;

                            if (typeof this[methodName] == 'function') {
                                await this[methodName](element);
                            }
                            else {
                                this.valid = false;
                            }
                        }
                    }
                    else {
                        this.valid = false;
                    }
                }
                else {
                    this.valid = false;

                    this.error = {
                        info: `Expecting an absolute path! "${this.path}"`,
                        stack: '',
                    };
                }
            }
            else {
                    this.valid = false;

                this.error = {
                    info: `Expecting and HTML File! "${this.path}"`,
                    stack: '',
                };
            }
        }
        catch (e) {
            this.valid = false;

            this.error = {
                info: e.toString(),
                stack: e.stack,
            };
        }

        return this;
    }

    isValid() {
        return this.valid;
    }

    async processName(element) {
        if (this.name) {
            this.valid = false;
        }
        else {
            this.name = element.getInnerHtml();
        }
    }

    async processScript(script) {
        this.items.push({
            type: 'script',
            code: element.getInnerHtml(),
        });
    }

    async processWidget(element) {
        let widget = {};

        for (let childElement of element) {
            //console.log(childElement.getOuterHtml());
        }

        //this.items.push(element.getInnerHtml());
    }
});
