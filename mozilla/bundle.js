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
singleton('', class Bundles {
    constructor() {
        this.bundles = {};
    }

    async init() {
        for (let bundleName of await server.ListBundles()) {
            if (bundleName in this.bundles) {

            }
            else {
                this.bundles[bundleName] = null;
            }
        }
    }

    async require(name) {
        if (Object.keys(this.bundles).length == 0) {
            await this.init();
        }

        if (name in this.bundles) {
            if (this.bundles[name]) {
                return this.bundles[name];
            }
            else {
                let data = await server.GetBundle(name);

                if (data) {
                    this.bundles[name] = mkBundle(data);
                    return this.bundles[name];
                }
                else {
                    return null;
                }
            }
        }
        else {
            return null;
        }
    }

    [Symbol.iterator]() {
        return Object.keys(this.bundles)[Symbol.iterator]();
    }
});


/*****
*****/
register('', class Bundle {
    constructor(data) {
        this.items = [];

        for (let item of data.items) {
            this.items.push(item);
            let methodName = `register${item.type[0].toUpperCase()}${item.type.substring(1)}`;

            if (typeof this[methodName] == 'function') {
                try {
                    this[methodName](item);
                }
                catch (e) {
                    item.error = e;
                }
            }
        }
    }

    getItem(index) {
        return this.items[index];
    }

    getItemCount() {
        return this.items.length;
    }

    registerAppname(item) {
        let title = Doc.getHead().queryOne('title')
        title.setInnerHtml(mkBuffer(item.code, 'base64').toString());
    }

    registerDependencies(item) {
        // TODO
    }

    registerMeta(item) {
        // TODO
    }

    registerName(item) {
        // TODO
    }

    registerScript(item) {
        // TODO
    }

    registerStyle(item) {
        let style = Doc.getHead().queryOne('style');

        if (!style) {
            style = mkHtmlElement('style');
            head.append(style);
            style.setInnerHtml(mkBuffer(item.code, 'base64').toString());
        }
        else {
            style.setInnerHtml(`${style.getInnerHtml()}\n${mkBuffer(item.code, 'base64').toString()}`);
        }
    }

    registerText(item) {
        // TODO
    }

    registerTitle(item) {
        // TODO
    }

    registerWidget(item) {
        // TODO
    }

    [Symbol.iterator]() {
        return this.items[Symbol.iterator]();
    }
});


/*****
*****/
singleton('', class Widgets {
    constructor() {
        this.widgets = {};
    }

    clear() {
    }

    replace() {
    }

    set() {
    }
});


/*****
*****/
singleton('', class LocaleText {
    constructor() {
        this.text = {};
    }

    clear() {
    }

    replace() {
    }

    set() {
    }
});
