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
 * This is the library of bundles on the server.  Each webapp process will have
 * a copy of this libryar, which has bundles contributed to it every time a
 * webapp is created and initialized.  During initialization, directories are
 * scanned for available bundles for loading.  Although bundles are loaded by
 * file, they are stored by their name: <bundle name="x.y.z">.  Hence, contents
 * of multiple files may be merged together into a single bundle depending on
 * the bundle name.  The overall loop is that the client application calls the
 * webapp API to request a bundle.  The webapp uses the library services ot see
 * if there's something available and then retrieves the requesrted bundle from
 * the bundle library in order to return that bundle to the browser.
*****/
singleton('', class Bundles {
    constructor() {
        this.paths = {};
        this.bundles = {};
    }

    getBundle(name, lang) {
        let bundle = this.bundles[name];

        if (bundle) {
            return {
                bundle: bundle.getCore(),
                strings: bundle.getStrings(lang),
            };
        }
        else {
            return {};
        }
    }

    getLanguage(langs) {
        let supported = this.getSupportedLanguages();

        for (let lang of langs) {
            if (lang in supported) {
                return lang;
            }
        }

        return Object.keys(supported)[0];
    }

    getSupportedLanguages() {
        let supported = {};

        for (let bundle of Object.values(this.bundles)) {
            Object.keys(bundle.strings).forEach(lang => supported[lang] = true);
        }

        return supported;
    }

    hasBundle(name) {
        return name in this.bundles;
    }

    hasPath(path) {
        return path in this.paths;
    }

    listBundles() {
        return Object.keys(this.bundles);
    }

    async load(path) {
        if (!(path in this.paths)) {
            try {
                this.paths[path] = true;

                if (path.endsWith('.html')) {
                    if (Path.isAbsolute(path)) {
                        let bundleElement = createDocElementFromOuterHtml(await FileSystem.readFileAsString(path));

                        if (bundleElement.getTagName() == 'bundle') {
                            let bundle = mkBundle(bundleElement);
                            this.paths[path] = bundle;
                            this.setBundle(bundle);
                        }
                        else {
                            throw new Error(`Bundle at "${path}" NOT a BUNDLE element.`);
                        }
                    }
                    else {
                        throw new Error(`Bundle path "${path}" is not an ABSOLUTE path.`);
                    }
                }
                else {
                    throw new Error(`File "${path}" NOT an HTML file.`);
                }
            }
            catch (e) {
                caught(e);
            }
        }
    }

    setBundle(bundle) {
        let libBundle = this.bundles[bundle.getName()];

        if (libBundle) {
            if (bundle.application) {
                if (libBundle.application) {
                    throw new Error(`Two or more applications per bundle not allowed.  "${bundle.name}"`)
                }
                else {
                    libBundle.application = bundle.application;
                }

                for (dependency in bundle.dependencies) {
                    libBundle.dependencies[dependency] = dependency;
                }

                libBundle.scripts = libBundle.scripts.concat(bundle.scripts);
                libBundle.styleSheets = libBundle.scripts.concat(bundle.styleSheets);
                libBundle.widgets = libBundle.scripts.concat(bundle.widgets);

                for (let lang in bundle.strings) {
                    if (!(lang in libBundle.strings)) {
                        libBundle.strings[lang] = {};
                    }

                    for (let key in bundle.strings[lang]) {
                        libBundle.strings[lang][key] = bundle.strings[lang][key];
                    }
                }
            }
        }
        else {
            this.bundles[bundle.getName()] = bundle;
        }
    }

    [Symbol.iterator]() {
        return Object.values(this.bundles)[Symbol.iterator]();
    }
});


/*****
 * The bundle is the basic unit of aggregation for transferring programs and
 * resources from the server to the browser client.  Resource types include
 * CSS style sheets, international text, and HTML code.  Program blocks provide
 * definitions of widgets as well as any other type of javascript code.  Note
 * that the support for building, transferring, and compiling bundles are built
 * into the Radius framework for Mozilla.
*****/
register('', class Bundle {
    constructor(bundleElement) {
        this.name = bundleElement.getAttribute('name');

        if (!this.name) {
            throw new Error(`Unnamed bundle Encountered!`);
        }

        let match = this.name.trim().match(/(?:[a-zA-Z](?:[a-zA-Z0-9_])*)(?:\.(?:[a-zA-Z](?:[a-zA-Z0-9_])*))*/);
        
        if (!match) {
            throw new Error(`Invalid bundle name: "${this.name}"`);
        }

        this.application = null;
        this.branches = this.name.trim().split('.');
        this.dependencies = {};
        this.scripts = [];
        this.strings = {};
        this.styleSheets = [];
        this.widgets = [];
        this.animations = [];

        for (let childElement of bundleElement) {
            let methodName = `process${childElement.getTagName()[0].toUpperCase()}${childElement.getTagName().substring(1)}`;

            if (methodName in this) {
                this[methodName](childElement);
            }
        }
    } 

    getApplication() {
        return this.application;
    }

    getBranches() {
        return this.branches;
    }

    getCore() {
        let core = {};
        
        Object.entries(this).forEach(entry => {
            let [ key, value ] = entry;

            if (key != 'strings') {
                if (typeof value != 'function') {
                    core[key] = value;
                }
            }
        });

        return core;
    }

    getDependencies() {
        return this.dependencies;
    }

    getLangs() {
        return Object.keys(this.strings);
    }

    getName() {
        return this.name;
    }

    getScripts() {
        return this.scripts;
    }

    getStrings(lang) {
        if (lang in this.strings) {
            return this.strings[lang];
        }
        else {
            return {};
        }
    }

    getStyleSheets() {
        return this.styleSheets;
    }

    hasApplication() {
        return this.application != null;
    }

    hasLang(lang) {
        return lang in this.strings;
    }

    processAnimation(animationElement) {
        this.animations.push(mkBuffer(animationElement.getInnerHtml()).toString('base64'));
    }

    processApplication(applicationElement) {
        let application = { html: null, script: null, title: null };

        for (let childElement of applicationElement) {
            let tagName = childElement.getTagName();

            if (tagName in application) {
                application[tagName] = mkBuffer(childElement.getInnerHtml()).toString('base64');
            }
        }

        if (this.application) {
            throw new Error(`Bundle "${this.name}" has more than one application object.`);
        }
        else {
            this.application = application;
        }
    }

    processDependencies(dependenciesElement) {
        dependenciesElement.getInnerHtml().split(';')
        .forEach(dependencyName => {
            if (dependencyName) {
                this.dependencies[dependencyName] = dependencyName;
            }
        });
    }

    processScript(scriptElement) {
        this.scripts.push(mkBuffer(scriptElement.getInnerHtml()).toString('base64'));
    }

    processStrings(stringsElement) {
        let lang = stringsElement.getAttribute('lang');

        if (lang) {
            let state = 0;
            let key = [];
            let text = [];

            for (let char of stringsElement.getInnerHtml()) {
                if (state == 0) {
                    if (char.match(/[a-zA-z]/)) {
                        state = 1;
                        key.push(char);
                    }
                    else if (!char.match(/\s/)) {
                        state = -1;
                        break;
                    }
                }
                else if (state == 1) {
                    if (char.match(/[a-zA-z0-9_]/)) {
                        key.push(char);
                    }
                    else {
                        state = 2;
                    }
                }
                else if (state == 2) {
                    if (char == '=') {
                        state = 3;
                    }
                    else if (!char.match(/\s/)) {
                        break;
                    }
                }
                else if (state == 3) {
                    if (char == '\\') {
                        this.processStringValue(lang, key, text);
                        state = 0;
                        key = [];
                        text = [];
                    }
                    else {
                        text.push(char);
                    }
                }
            }

            if (state != 0) {
                throw new Error(`Bad strings bundle ensountered: ${stringsElement.getInnerHtml()}`)
            }
        }
        else {
            throw new Error(`Strings element must always have a non-empty "lang" attribute.`);
        }
    }

    processStringValue(lang, keyArray, textArray) {
        let key = keyArray.join('');
        let scrubbedTextArray = [];
        let state = 0;

        for (let char of textArray) {
            if (state == 0) {
                if (char == '\n') {
                    state = 1;
                }
                else {
                    scrubbedTextArray.push(char);
                }
            }
            else if (state == 1) {
                if (!char.match(/\s/)) {
                    state = 0;
                    scrubbedTextArray.push(' ');
                    scrubbedTextArray.push(char);
                }
            }
        }

        let langGroup = this.strings[lang];

        if (!langGroup) {
            langGroup = {};
            this.strings[lang] = langGroup;
        }

        langGroup[key] = scrubbedTextArray.join('').trim();
    }

    processStyle(styleElement) {
        this.styleSheets.push(mkBuffer(styleElement.getInnerHtml()).toString('base64'));
    }

    processWidget(widgetElement) {
        let widget = { script: '', html: '' };

        for (let childElement of widgetElement) {
            let tagName = childElement.getTagName();

            if (tagName in widget) {
                widget[tagName] = mkBuffer(childElement.getInnerHtml()).toString('base64');
            }
        }

        this.widgets.push(widget);
    }
});
