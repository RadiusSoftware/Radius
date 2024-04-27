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
        this.strings = {};
        this.docNodes = {};
        DocNode.emitter.on('Created', message => this.onDocNodeCreated(message));
    }

    ensureEntries(path, string) {
        let strings = this.strings;
        let docNode = this.docNodes;
        let branches = path.split('.');

        for (let i = 0; i < branches.length; i++) {
            let branch = branches[i];

            if (i == branches.length - 1) {
                if (!(branch in strings)) {
                    strings[branch] = false;
                    docNode[branch] = [];
                }

                if (strings[branch] === false && typeof string == 'string') {
                    strings[branch] = string;
                }
    
                return {
                    strings: strings[branch],
                    docNode: docNode[branch],
                };
            }
            else {
                if (branch in strings) {
                    strings = strings[branch];
                    docNode = docNode[branch];
                }
                else {
                    let newStrings = new Object();
                    strings[branch] = newStrings;
                    strings = newStrings;
    
                    let newDocNode = new Object();
                    docNode[branch] = newDocNode;
                    docNode = newDocNode;
                }
            }
        }
    }

    onDocNodeCreated(message) {
        if (message.docNode instanceof DocText) {
            let docText = message.docNode;

            for (let match of docText.toString().matchAll(/\${(Str\.([a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)+))}/g)) {
                let entries = this.ensureEntries(match[2]);

                if (entries.strings === false) {
                    entries.docNode.push(message.docNode);
                }
                else {
                    this.refreshNode(message.docNode);
                }
            }
        }
    }

    refreshNode(node) {
        let dynamic;
        let Str = this.strings;

        try {
            eval('dynamic = `' + node.toString() + '`');
        }
        catch (e) {
            dynamic = '{String Value Error}';
        }

        node.setText(dynamic);
        return this;
    }
    
    setText(path, string) {
        let entries = this.ensureEntries(path, string);

        for (let docNode of entries.docNode) {
            this.refreshNode(docNode);
        }

        entries.docNode.splice(0, entries.docNode.length);
        return this;
    }
});
