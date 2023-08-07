/*****
 * 
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
*****
(async () => {
    let scriptUrl = document.currentScript;

    class Loader {
        constructor() {
            this.radiusUrl = scriptUrl.src.substring(0, scriptUrl.src.indexOf('/mozilla/radius.js'));
            this.http = this.radiusUrl.startsWith('http') ? true : false;
            this.xmlhttp = this.http ? new XMLHttpRequest() : false;
        }

        async load(url) {
            this.url = `${this.radiusUrl}/${url}`;
            this.http ? await this.loadHttp() : await this.loadFile();
        }

        loadFile() {
            return new Promise(async (ok, fail) => {
            });
        }

        loadHttp() {
            return new Promise(async (ok, fail) => {
                this.xmlhttp.onreadystatechange = event => {
                    if (this.xmlhttp.readyState == XMLHttpRequest.DONE) {
                        let contentType = this.http.getResponseHeader('content-type');
                        let rsp = new HttpResponse(this.req);
                        let status = rsp.getStatus();
        
                        if (rsp.isMessage()) {
                            let message = rsp.getMessage();
                            let pending = '#Pending' in message ? message['#Pending'] : [];
                            delete message['#Pending'];
                            Trap.pushReply(this.trap.id, message.response);
        
                            for (let pendingMessage of pending) {
                                global.send(pendingMessage);
                            }
                        }
                        else {
                            Trap.pushReply(this.trap.id, rsp);
                        }
                    }
                    else if (this.http.readyState == XMLHttpRequest.DONE) {
                    }
                };

                this.http.send();
            });
        }
    }

    window.addEventListener('load', async event => {
        let loader = new Loader();

        for (let fileName of [
            'core.js',
            'flow.js',
            'buffer.js',
            'data.js',
            'emitter.js',
            'cache.js',
            'json.js',
            'stringSet.js',
            'time.js',
            'mime.js',
            'text.js',
            'textTemplate.js',
            'language.js',
        ]) {
            await loader.load(`/core/${fileName}`);
        }
        
        for (let fileName of [
            'element.js',
            'document.js',
            'win.js',
        ]) {
            await loader.load(`/mozilla/${fileName}`);
        }
    })();
});*/


/*****
*****/
(async () => {
    window.addEventListener('load', async event => {
        console.log('COMPILING....');
        document.head.append(...scripts);
    });

    const scripts =[];
    const scriptElement = document.currentScript;
    const radiusUrl = scriptElement.src.substring(0, scriptElement.src.indexOf('/mozilla/radius.js'));
    console.log('LOADING....');

    for (let fileName of [
        'core.js',
        'flow.js',
        'buffer.js',
        'data.js',
        'emitter.js',
        'cache.js',
        'json.js',
        'language.js',
        'stringSet.js',
        'time.js',
        'mime.js',
        'textTemplate.js',
        'textUtils.js',
    ]) {
        let htmlElement = document.createElement('script');
        htmlElement.setAttribute('defer', false);
        htmlElement.setAttribute('async', false);
        htmlElement.setAttribute('src', `${radiusUrl}/core/${fileName}`);
        scripts.push(htmlElement);
    }
})();
