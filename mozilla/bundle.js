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
 * Bundles are bundles of data and programming code that are transferred from
 * the server to the Mozilla client.  Bundles contain a variety of data and code
 * types and uses.  When a bundle is download, it has an immeidate impact on the
 * globalThis properties and is used to define widgets, provide GUI text that's
 * locale or language specific, and to exeute javascript code to modify and
 * configure the globalThis environment.  As shown below, right at initialization,
 * the complete set of available bundles is downloaded.  Each bundle is downloaded
 * and processed just a single time.
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
                    this.bundles[name] = await mkBundle().init(data);
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
 * The individual bundle is downloaded from the server, processed and stored
 * locallly, which is proof that the bundle has been downloaded.  Each bundle
 * is downloaded, constructed, and initialized once!  That means the global
 * environmental changes are applied only once, during execute of the imit()
 * method.  There are a number of effects that can be processed within the
 * registerXXX() methods, each of which are specialized registering each of their
 * own bundle items.
*****/
register('', class Bundle {
    constructor() {
    }

    getItem(index) {
        return this.items[index];
    }

    getItemCount() {
        return this.items.length;
    }

    async init(data) {
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

    async registerDependencies(item) {
        for (let dependency of item.names) {
            await Bundles.require(name);
        }
    }

    async registerHome(item) {
        let html = mkBuffer(item.html, 'base64').toString();
        let script = mkBuffer(item.script, 'base64').toString();

        try {
            const element = createElementFromOuterHtml(html);
            Doc.getBody().append(element);
            eval(script);
        }
        catch (e) {
            caught(e);
        }
    }

    async registerScript(item) {
        try {
            eval(mkBuffer(item.code, 'base64').toString());
        }
        catch (e) {
            console.log(e);
            caught(e);
        }
    }

    async registerStyle(item) {
        let style = mkHtmlElement('style').setAttribute('id', 'item.name');
        Doc.getHead().append(style);
        style.setInnerHtml(mkBuffer(item.code, 'base64').toString());
    }

    async registerStrings(item) {
        let entries = mkBuffer(item.entries, 'base64').toString();

        for (let line of entries.split('\n')) {
            let trim = line.trim();

            try {
                let match = trim.match(/([a-zA-Z0-9_]+)[ \t]*=[ \t]*([^$]*)/);

                if (match) {
                    StringsLib.set(match[1], match[2]);
                }
            }
            catch (e) {}
        }
    }

    async registerTitle(item) {
        let title = Doc.getHead().queryOne('title')
        title.setInnerHtml(mkBuffer(item.code, 'base64').toString());
    }

    async registerWidget(item) {
        let html = mkBuffer(item.html, 'base64').toString();
        let script = mkBuffer(item.script, 'base64').toString();

        try {
            const element = createElementFromOuterHtml(html);
            Doc.getBody().append(element);
            eval(script);
        }
        catch (e) {
            caught(e);
        }
    }

    [Symbol.iterator]() {
        return this.items[Symbol.iterator]();
    }
});


/*****
 * We want an internationalizable application!  There means we need to be able
 * to handle text in multiple languages.  To this end, text is isolated from
 * the HTML and other code and stored here in the StringsLib.  The StringsLib
 * is populated as various bundles are downloaded.  So, in order to change the
 * language, the application needs to be re-downloaded and initialized using
 * new text.
*****/
singleton('', class StringsLib {
    constructor() {
        this.lib = mkObjekt();
    }

    set(key, value) {
        this.lib[key] = value;
    }
});
