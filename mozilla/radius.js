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
                this['radius-attr'] = opts => this.processAttr(opts);
                this['radius-controller'] = opts => this.processController(opts);
                this['radius-depot'] = opts => this.processDepot(opts);
                this['radius-inner'] = opts => this.processInner(opts);
                this['radius-style'] = opts => this.processStyle(opts);

                for (let element of elements) {
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

            processAttr(opts) {
                /*
                mkEntanglement(
                    opts.element.getController(),
                    opts.element,
                    opts.parameters[1],
                    'attr',
                    opts.parameters[0],
                ).entangle();
                */
            }

            processController(opts) {
                /*
                const fqcn = parseNamespaceString(opts.parameters[0]);
                const fqon = parseNamespaceString(opts.parameters[1]);
                fqon.ns[fqon.name] = fqcn.ns[`mk${fqcn.name}`](opts.element, ...(opts.parameters.slice(2)));
                */
            }

            processDepot(opts) {
            }

            processElement(element) {
                return;
                for (let attribute of element.getAttributes()) {
                    if (attribute.name in this) {
                        let parameters = attribute.value.split(',').map(arg => arg.trim());
    
                        try {
                            attributes[attribute.name]({
                                element: element,
                                parameters: parameters,
                            });
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }
                }
                /*
                if (!(element.getTagName() in {script:0, style:0})) {
                    for (let childNode of element) {
                        if (childNode instanceof DocText) {
                            processTextNode(element.getController(), childNode);
                        }
                    }
                }
                */
            }

            processInner(opts) {
                /*
                mkEntanglement(
                    opts.element.getController(),
                    opts.element,
                    opts.parameters[0],
                    'inner',
                ).entangle();
                */
            }

            processStyle(opts) {
            }

            processTextNode(element, textNode) {
                const blocks = [];
                const exprFlags = [];
                let hasExpr = false;
    
                let exprString = [];
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
                                blocks.push(blockString.join(''));
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
                            exprString.push(chr);
                        }
                    }
                    else if (state == 4) {
                        if (chr == '}') {
                            state = 0;
                            blocks.push(exprString.join(''));
                            exprFlags.push(true);
                            hasExpr = true;
                            exprString = [];
                        }
                        else {
                            exprString.push('}');
                            exprStriing.push(chr);
                        }
                    }
                }
    
                if (state == 0 && blockString.length) {
                    blocks.push(blockString.join(''));
                    exprFlags.push(false);
                }
                
                if (hasExpr) {
                    let nodes = [];
    
                    for (let i = 0; i < exprFlags.length; i++) {
                        if (exprFlags[i]) {
                            let tn = mkDocText();
                            nodes.push(tn);
                            /*
                            nodes.push(mkDocText(`---${blocks[i]}---`));
    
                            mkEntanglement(
                                controller,
                                tn,
                                null,
                                'attr',
                                opts.parameters[0],
                            ).entangle();
                            // TODO -- reflect active, iterate through dependencies
                            //         and make entanglements for all dependencies.
                            */
                        }
                        else {
                            nodes.push(mkDocText(blocks[i]));
                        }
                    }
    
                    textNode.replace(...nodes);
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
    const sourceFileNames = [
        'core.js',
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
        'validator.js',
        'mozilla/win.js',
        'mozilla/doc.js',
        'mozilla/element.js',
        'mozilla/svg.js',
        'mozilla/math.js',
        'mozilla/widget.js',
        'mozilla/style.js',
        'mozilla/ctl.js',
        'mozilla/controller.js',
    ];

    let index = 0;
    const scripts = [];
    const scriptElement = document.currentScript;
    const radiusUrl = scriptElement.src.substring(0, scriptElement.src.indexOf('/mozilla/radius.js'));

    const loadNext = () => {
        let fileName = sourceFileNames[index++];
        let htmlElement = document.createElement('script');
        htmlElement.setAttribute('defer', true);
        htmlElement.setAttribute('async', false);
        htmlElement.setAttribute('src', `${radiusUrl}/${fileName}`);
        scripts.push(htmlElement);
        document.head.append(htmlElement);

        htmlElement.addEventListener('load', event => {
            if (index >= sourceFileNames.length) {
                finalize();
            }
            else {
                loadNext();
            }
        });
    };

    async function finalize() {
        await onSingletons();
        global.win = mkWin();
        global.doc = mkDoc();
        console.log('*** Encapsulate stylesheets');
        registerRadius();
        mkRadius(doc.getHtml());
        typeof bootstrap == 'function' ? bootstrap() : false;
    }

    loadNext();
})();
