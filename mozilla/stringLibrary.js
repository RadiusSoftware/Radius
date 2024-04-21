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
 * We want an internationalizable application!  There means we need to be able
 * to handle text in multiple languages.  To this end, text is isolated from
 * the HTML and other code and stored here in the StringsLib.  The StringsLib
 * is populated as various bundles are downloaded.  So, in order to change the
 * language, the application needs to be re-downloaded and initialized using
 * new text.
*****/
singleton('', class StringLibrary {
    constructor() {
        this.textNodes = [];
        this.lib = mkObjekt();
        DocNode.emitter.on('Created', message => this.onDocNodeCreated(message));
    }

    ensurePrefix(prefix) {
        let objekt = this.lib;

        for (let branch of prefix.split('.').reverse()) {
            if (branch in objekt) {
                objekt = objekt[branch];
            }
            else {
                let newObjekt = mkObjekt();
                objekt[branch] = newObjekt;
                objekt = newObjekt;
            }
        }

        return objekt;
    }

    get(prefix, key) {
        let objekt = this.lib;

        for (let branch of prefix.split('.').reverse()) {
            if (branch in objekt) {
                objekt = objekt[branch];
            }
            else {
                return '';
            }
        }

        if (objekt instanceof Objekt) {
            if (typeof key == 'string') {
                return objekt[key];
            }
        }

        return objekt;
    }

    onDocNodeCreated(message) {
        if (message.docNode instanceof DocText) {
            this.textNodes.push(docNode);
            console.log(message.docNode.toString());
        }
    }

    set(prefix, key, value) {
        let objekt = this.ensurePrefix(prefix);
        objekt[key] = value;
    }
});
