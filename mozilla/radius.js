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
"use strict";


(async () => {
    /*****
     * The Radius class is dependent on the entire core and Mozilla framework
     * being loaded and initialized.  Hence, the registration of the Radius class
     * is encapsualted within a function that's called after the core framework
     * component have been loaded.
     * 
     * The Radius class is called to assimilate DocElements into the Radius
     * framework.  The first task at hand is to ensure that each assimilated doc
     * element has been wrapped so that Radius can exploit those features.  Once
     * wrapped, the assimilation elements are processed one at a time, include
     * each element's entire tree of descendents.
    *****/
    function registerRadius() {
        register('', class Radius {
            constructor(...elements) {
                this['radius-attr'] = (element, ...args) => this.processAttr(element, ...args);
                this['radius-controller'] = (element, ...args) => this.processController(element, ...args);
                this['radius-depot'] = (element, ...args) => this.processDepot(element, ...args);
                this['radius-inner'] = (element, ...args) => this.processInner(element, ...args);
                this['radius-input'] = (element, ...args) => this.processInput(element, ...args);
                this['radius-style'] = (element, ...args) => this.processStyle(element, ...args);

                this.inputTags = mkStringSet(
                    'input',
                    'textarea',
                    'select'
                );

                for (let element of elements) {
                    if (element instanceof DocElement) {
                        let stack = [ element ];
        
                        while (stack.length) {
                            let docNode = wrapDocNode(stack.pop());
        
                            if (docNode.isElement()) {
                                this.processElement(docNode);
                                docNode.getChildren().reverse().forEach(el => stack.push(el));
                            }
                        }
                    }
                }
            }

            processAttr(element, attributeName, expr) {
                element.getController().entangleAttribute(element, attributeName, expr);
            }

            processController(element, fqClassName, fqObjectName) {
                let fqcn = mkFqn(fqClassName);
                let controller = fqcn.getObject()[`mk${fqcn.getName()}`](element);
                
                if (fqObjectName) {
                    mkFqn(fqObjectName, controller);
                }
            }

            processDepot(element, ...fqDepotNames) {
                for (let fqDepotName of fqDepotNames) {
                    mkFqn(fqDepotName, mkDepot());
                }
            }

            processElement(element) {
                for (let attribute of element.getAttributes()) {
                    if (attribute.name in this) {
                        let args = attribute.value.split(',').map(arg => arg.trim());
    
                        try {
                            this[attribute.name](element, ...args);
                        }
                        catch (e) { console.log(e) }
                    }
                }
                
                for (let childNode of element) {
                    if (childNode instanceof DocText) {
                        this.processTextNode(element, childNode);
                    }
                }
            }

            processInner(element, expr) {
                element.getController().entangleInner(element, expr);
            }

            processInput(element, depot, key) {
                if (element instanceof HtmlElement) {
                    if (this.inputTags.has(element.getTagName())) {
                        element.getController().entangleInput(element, depot, key);
                    }
                }
            }

            processStyle(element, ...args) {
                if (element instanceof HtmlElement) {

                    for (let arg of args) {
                        let parts = arg.split(';');

                        if (parts.length == 2) {
                            let styleProperty = parts[0].trim();
                            let expr = parts[1].trim();
                            element.getController().entangleStyle(element, styleProperty, expr);
                        }
                    }
                }
            }

            processTextNode(element, textNode) {
                const blocks = [];
                let exprFlags = [];
                let blockString = [];
    
                let state = 0;
                let wholeText = textNode.toString();
                
                for (let i = 0; i < wholeText.length; i++) {
                    const chr = wholeText[i];
    
                    if (state == 0) {
                        if (chr == '$') {
                            state = 1;
                        }
                        else {
                            blockString.push(chr);
                        }
                    }
                    else if (state == 1) {
                        if (chr == '{') {
                            state = 2;
                        }
                        else {
                            state = 0;
                            blockString.push('$');
                            blockString.push(chr);
                        }
                    }
                    else if (state == 2) {
                        if (chr == '{') {
                            state = 3;
    
                            if (blockString.length) {
                                blocks.push(`${blockString.join('')}`);
                                exprFlags.push(false);
                                blockString = [];
                            }
                        }
                        else {
                            state = 0;
                            blockString.push('$');
                            blockString.push('{');
                            blockString.push(chr);
                        }
                    }
                    else if (state == 3) {
                        if (chr == '}') {
                            state = 4;
                        }
                        else {
                            blockString.push(chr);
                        }
                    }
                    else if (state == 4) {
                        if (chr == '}') {
                            state = 0;
                            blocks.push(`${blockString.join('')}`);
                            exprFlags.push(true);
                            blockString = [];
                        }
                        else {
                            blockString.push('}');
                            exprStriing.push(chr);
                        }
                    }
                }
    
                if (blockString.length) {
                    blocks.push(blockString.join(''));
                    exprFlags.push(false);
                }
                
                if (exprFlags.filter(el => el).length) {
                    let nodes = [];
                    let entanglements = [];
    
                    for (let i = 0; i < exprFlags.length; i++) {
                        if (blocks[i] !== '') {
                            if (exprFlags[i]) {
                                let docText = mkDocText();
                                nodes.push(docText);

                                entanglements.push(() => {
                                    element
                                    .getController()
                                    .getEntanglements()
                                });
                            }
                            else {
                                nodes.push(mkDocText(blocks[i]));
                            }
                        }
                    }
    
                    textNode.replace(...nodes);
                    entanglements.forEach(entanglement => entanglement());
                }
            }
        });
    }


    /*****
     * This is where we bootstrap the client framework.  In the development
     * version, each file is downloaded individually into the browser.  In the
     * release version, this code is replaced to download a compactified frame
     * work in one single blow.  That however is left to the independent promote
     * program used for promoting radius from a development version to a live
     * version.  Once all of the javascript files have been loaded, finalize()
     * is called to boot the framework and get things started.
    *****/
    const frameworkFiles = [
        'core.js',
        'objekt.js',
        'txt.js',
        'ctl.js',
        'buffer.js',
        'data.js',
        'emitter.js',
        'depot.js',
        'json.js',
        'language.js',
        'stringSet.js',
        'time.js',
        'mime.js',
        'textTemplate.js',
        'textUtils.js',
        'textTree.js',
        'mozilla/core.js',
        'mozilla/win.js',
        'mozilla/doc.js',
        'mozilla/element.js',
        'mozilla/svg.js',
        'mozilla/mathml.js',
        'mozilla/style.js',
        'mozilla/ctl.js',
        'mozilla/entanglements.js',
        'mozilla/controller.js',
        'mozilla/widget.js',
        'mozilla/http.js',
        'mozilla/websocket.js',
    ];
    
    const scripts = [];
    const scriptElement = document.currentScript;
    const radiusUrl = scriptElement.src.substring(0, scriptElement.src.indexOf('/mozilla/radius.js'));

    document.addEventListener('DOMContentLoaded', async event => {
        await loadFramework();
        await onSingletons();
        await loadApplication();
        await onSingletons();

        for (let scriptElement of scripts) {
            wrapDocNode(scriptElement).remove();
        }

        global.win = mkWin();
        global.doc = mkDoc();
        registerRadius();
        mkRadius(doc.getHtml());

        for (let controller of Controller.controllers) {
            await controller.init();
        }
    });

    async function loadApplication() {
        if (Array.isArray(window.applicationFiles)) {
            let rootUrl = document.URL.substring(0, document.URL.lastIndexOf('/'));

            for (let fileName of window.applicationFiles) {
                await loadScript(`${rootUrl}/${fileName}`);
            }

            delete window.applicationFiles;
        }
    };

    async function loadFramework() {
        for (let filePath of frameworkFiles) {
            await loadScript(`${radiusUrl}/${filePath}`);
        }
    }

    async function loadScript(url) {
        let fulfill;

        let promise = new Promise((ok, fail) => {
            fulfill = () => ok();
        });

        let htmlElement = document.createElement('script');
        htmlElement.setAttribute('defer', false);
        htmlElement.setAttribute('async', false);
        htmlElement.setAttribute('src', url);

        htmlElement.addEventListener('load', () => {
            fulfill();
        });

        document.head.append(htmlElement);
        scripts.push(htmlElement);
        return promise;
    }
})();
