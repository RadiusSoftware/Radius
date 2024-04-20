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
 * An HTML bundle is how we dynamially transfer features from a cache on the server
 * to the browser client.  Bundles contain a mix of different types of data such
 * as HTML, javascript, CSS, and other text and binary data.  Bundles are created
 * on the server as non-standard HTML.  By non-standard, we mean that HTML is used
 * alot like XML for defining said data types.  The bundle is transfered to the
 * client upon request as a JSON object.  It's up to the client Bundel singleton
 * to interpret and use the provded bundle data.
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

    async init() {
        try {
            if (this.path.endsWith('.html')) {
                if (Path.isAbsolute(this.path)) {
                    let buffer = await FileSystem.readFile(this.path);
                    let outerHtml = buffer.toString();
                    this.source = createDocElementFromOuterHtml(outerHtml);

                    if (this.source.getTagName() == 'bundle') {
                        for (let element of this.source) {
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

        delete this.source;
        return this;
    }

    isValid() {
        return this.valid;
    }

    async processDependencies(element) {
        let dependencyNames = element.getInnerHtml().split(';');
        dependencyNames = dependencyNames.filter(el => el != '' && el != undefined);

        this.items.push({
            type: 'dependencies',
            names: dependencyNames,
        });
    }

    async processHome(element) {
        let item = {
            type: 'home',
        };

        for (let childElement of element) {
            if (childElement.getTagName() == 'html') {
                item.html = mkBuffer(childElement.getInnerHtml().toString('base64'));
            }
            else if (childElement.getTagName() == 'script') {
                item.script = mkBuffer(childElement.getInnerHtml().toString('base64'));
            }
        }

        this.items.push(item);
    }

    async processName(element) {
        if (this.name) {
            this.valid = false;
        }
        else {
            this.name = element.getInnerHtml();
        }
    }

    async processScript(element) {
        this.items.push({
            type: 'script',
            code: mkBuffer(element.getInnerHtml()).toString('base64'),
        });
    }

    async processStrings(element) {
        let lang = element.hasAttribute('lang') ? element.getAttribute('lang') : '';

        this.items.push({
            type: 'strings',
            lang: lang,
            prefix: this.name,
            entries: mkBuffer(element.getInnerHtml()).toString('base64'),
        });
    }

    async processStyle(element) {
        this.items.push({
            type: 'style',
            code: mkBuffer(element.getInnerHtml()).toString('base64'),
        });
    }

    async processTitle(element) {
        this.items.push({
            type: 'title',
            code: mkBuffer(element.getInnerHtml()).toString('base64'),
        });
    }

    async processWidget(element) {
        let item = {
            type: 'widget',
        };

        for (let childElement of element) {
            if (childElement.getTagName() == 'html') {
                item.html = mkBuffer(childElement.getInnerHtml()).toString('base64');
            }
            else if (childElement.getTagName() == 'script') {
                item.script = mkBuffer(childElement.getInnerHtml()).toString('base64');
            }
        }
        
        this.items.push(item);
    }
});
