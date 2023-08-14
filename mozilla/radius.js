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


/*****
 * This is the client bootstrapper or client loader for the Radius Software
 * development framework.  It's loaded within the HEAD element of the HTML
 * document supported with Radius.  It's primary job is to load in each of
 * the specified framework script files and wait for each file to be fully
 * compiled before moving on to the next script file.  This is importatn
 * because the order of evaluation is critical due to dependencies.  Note that
 * this script only loads the framework.  Once loaded, the framework will be
 * used for loading in developer application code, CSS, and HTML framents.
*****/
(async () => {
    const registerRadius = () => {
        const attributes = {
            /*****
             *****/
            'radius-controller': info => {
                let ns;
                let controller;
                let segments = info.attribute.value.split('.');

                if (segments.length) {
                    if (segments.length == 1) {
                        ns = global;

                        if (ns[segments[0]]) {
                            controller = ns[segments[0]];
                        }
                        else {
                            controller = ns[segments[0]] = mkController(); 
                        }
                    }
                    else {
                        ns = ensureNamespace(segments.slice(0, segments.length-1).join('.'));

                        if (ns[segments[segments.length-1]]) {
                            controller = ns[segments[segments.length-1]];
                        }
                        else {
                            controller = ns[segments[segments.length-1]] = mkController(); 
                        }
                    }

                    controller.addElement(info.element);
                    info.element.setController(controller);
                }
            },

            /*****
             *****/
            'radius-attribute': info => {
            },

            /*****
             *****/
            'radius-innerhtml': info => {
            },
        };

        const processElement = element => {
            for (let attribute of element.getAttributes()) {
                if (attribute.name.startsWith('radius-')) {
                    if (attribute.name in attributes) {
                        attributes[attribute.name]({
                            element: element,
                            attribute: attribute,
                        });
                    }
                }
            }
        }

        register('', function radius(...args) {
            for (let arg of args) {
                let stack = [ arg ];

                while (stack.length) {
                    let docNode = wrapDocNode(stack.pop());

                    if (docNode.isElement()) {
                        processElement(docNode);
                        docNode.getChildren().reverse().forEach(el => stack.push(el));
                    }
                }
            }
        });
    };

    const sourceFileNames = [
        'core.js',
        'ctl.js',
        'buffer.js',
        'data.js',
        'emitter.js',
        'active.js',
        'json.js',
        'language.js',
        'stringSet.js',
        'time.js',
        'mime.js',
        'textTemplate.js',
        'textUtils.js',
        'mozilla/win.js',
        'mozilla/doc.js',
        'mozilla/element.js',
        'mozilla/svg.js',
        'mozilla/math.js',
        'mozilla/widget.js',
        'mozilla/styleSheet.js',
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
        registerRadius();
        radius(doc.getHtml());
        typeof bootstrap == 'function' ? bootstrap() : false;
    }

    loadNext();
})();
