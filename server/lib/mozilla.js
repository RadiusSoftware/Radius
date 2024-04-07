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


(() => {
    /*****
     * Application level code written for the Radius application server, whose
     * purpose is to provide the non-framework layer of components required to
     * support the common application structure that's essential to booting an
     * application on the browser or Mozilla side.  This code is NOT part of the
     * basic Radius framework because it requires some level of personalization
     * in the form of runtime parameters.  That's why we have a function rather
     * than a static string for generating our bootstrap text.
    *****/
    const bootstrapCode = (settings) => `
    (async () => {
        wrapTree(document.documentElement);
        
        let websocket;

        register('', async function  openWebsocket(message) {
        });

        register('', async function  callServer(message) {
            if (websocket) {
            }
            else {
                let response = await mkHttpRequest().post('${settings.webAppPath}', message);
                console.log(response.getPayload());
            }
        });
        
        register('', function  sendServer(message) {
        });
        
        let response = await Bundles.get('testDiv');
        //console.log(response);
    })();
    `;


    /*****
     * The code that brings in all of the text from the various Mozilla framework
     * files into a single blob, which is ready for download to browsers.  This is
     * not a bundle!  It's the Radius framework download for a browser that needs
     * it to run a Radius server application.  This is a singleton and loads source
     * files in once per process.  The personalization step comes from personalizing
     * the bookstrap code, from above, using an object of parameters or settings.
    *****/
    singleton('radius', class Mozilla {
        constructor() {
            this.sourceCode = null;
        }

        async getSourceCode(settings) {
            if (!this.sourceCode) {
                const modules = ['"use strict";'];
        
                const frameworkFiles = [
                    'common/core.js',
                    'common/buffer.js',
                    'common/types.js',
                    'common/emitter.js',
                    'common/objekt.js',
                    'common/stringSet.js',
                    'common/textTemplate.js',
                    'common/data.js',
                    'common/json.js',
                    'common/language.js',
                    'common/time.js',
                    'common/mime.js',
                    'common/textUtils.js',
                    'common/textTree.js',
                    'common/chronos.js',
                    'common/cookie.js',
                    'common/expression.js',
                    'common/api.js',
                    
                    'mozilla/element.js',
                    'mozilla/win.js',
                    'mozilla/doc.js',
                    'mozilla/svg.js',
                    'mozilla/math.js',
                    'mozilla/style.js',
                    'mozilla/widget.js',
                    'mozilla/entanglements.js',
                    'mozilla/controller.js',
                    'mozilla/http.js',
                    'mozilla/websocket.js',
                    'mozilla/bundle.js',
                ];
            
                for (let frameworkFile of frameworkFiles) {
                    const path = Path.join(__dirname, `../../${frameworkFile}`);
                    modules.push((await FileSystem.readFile(path)).toString());
                }
                
                this.sourceCode = modules.join('\n');
            }

            return [ this.sourceCode, bootstrapCode(settings) ].join('');
        }
    });
})();
