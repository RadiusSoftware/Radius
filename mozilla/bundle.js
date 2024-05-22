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
 * This is the bundle library for the Mozilla or browser client.  It's not a
 * library in the strict sense because it's not a repository of data / programs.
 * The bundle library downloads bundles from the server, "compiles" the bundles
 * on the browser, and keeps track of downloaded bundles.  When code requires
 * a specifically named bundle, the bundle library is used to download and compile
 * the required bundle.  If repeated requires are executed after the initial
 * require, no action is taken.  The main thing to understand is that the require
 * operation neither stores the bundle nor returns the bundle to the caller.
*****/
singleton('', class Bundles {
    constructor() {
        this.strings = {};
        this.bundles = {};
        this.style = mkHtmlElement('style');
        Doc.getHead().append(this.style);
    }

    async init(lang) {
        if (Object.keys(this.bundles).length == 0) {
            this.lang = lang;

            for (let bundleName of await server.ListBundles()) {
                this.bundles[bundleName] = false;
            }
        }
    }

    registerAnimations(animations) {
        for (let animation of animations) {
            let effect = mkBuffer(animation, 'base64').toString();
            let keyframes = effect.match(/@keyframes[ \t]+([a-zA-Z][a-zA-Z0-9_]*)[ \t]*{/);

            if (keyframes) {
                let name = keyframes[1];
                let tn = mkDocText(effect);
                this.style.append(tn);
            }
        }
    }

    registerApplication(application) {
        if (application) {
            let titleText = mkBuffer(application.title, 'base64').toString();
            Doc.getHead().queryOne('title').setInnerHtml(titleText);

            let homeHtml = mkBuffer(application.html, 'base64').toString();
            const homeElement = createElementFromOuterHtml(homeHtml);
            homeElement.setAttribute('id', 'ApplicationHomeView');
            Doc.getBody().append(homeElement);

            Win.awaitIdle(() => {
                DocElement.processDefElements();
                eval(mkBuffer(application.script, 'base64').toString());
            });
        }
    }

    registerScripts(scripts) {
        for (let script of scripts) {
            eval(mkBuffer(script, 'base64').toString());
        }
    }

    registerStyleSheets(styleSheets) {
        for (let styleSheet of styleSheets) {
            let styleElement = mkHtmlElement('style');
            styleElement.setInnerHtml(mkBuffer(styleSheet, 'base64').toString());
            Doc.getHead().append(styleElement);
        }
    }

    registerWidgets(widgets) {
        for (let widget of widgets) {
            let script = mkBuffer(widget.script, 'base64').toString();

            let tagName;
            eval('tagName=' + script);
            WidgetLibrary.get(tagName).innerHtml = mkBuffer(widget.html, 'base64').toString();
        }
    }

    async require(name) {
        if (name in this.bundles) {
            if (!(this.bundles[name])) {
                let box = await server.GetBundle(name, this.lang);

                if (box) {
                    for (let dependency in box.bundle.dependencies) {
                        await this.require(dependency);
                    }

                    for (let key in box.strings) {
                        StringLibrary.setText(`${name}.${key}`, box.strings[key]);
                    }

                    this.registerStyleSheets(box.bundle.styleSheets);
                    this.registerAnimations(box.bundle.animations);
                    this.registerWidgets(box.bundle.widgets);
                    this.registerScripts(box.bundle.scripts);
                    this.registerApplication(box.bundle.application);
                    this.bundles[name] = true;
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }

    [Symbol.iterator]() {
        return Object.keys(this.bundles)[Symbol.iterator]();
    }
});
