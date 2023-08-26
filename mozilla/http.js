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


/*****
 * Single use XMLHttpRequest object wrapper providing a simplistic API for using
 * the XMLHttpRequest feature set in your application, featuring async bheavior.
 * 
 *      const httpResponse = await mkHttpRequest().get('/some/path/file.ext');
 *      const httpResponse = await mkHttpRequest().post('some/path', object);
 * 
 * This class wraps and simplifies making HTTP calls to the server and responding
 * to various types of server response values.  It also attempts to reduce the
 * overhead of posting data by having various analog of the post() method.
*****/
register('', class HttpRequest {
    constructor(timeoutMilliseconds) {
        this.req = new XMLHttpRequest();
        this.setTimeout(timeoutMilliseconds);
        this.headers = {};
        this.monitors = [];

        this.req.onreadystatechange = event => {
            if (this.req.readyState == XMLHttpRequest.DONE) {
                this.hook();
            }
        };
    }

    cancel() {
        if (this.hook) {
            this.req.abort();
        }
    }

    clearHeader(name) {
        delete this.headers[name];
        return this;
    }

    delete(url) {
        return this.send('DELETE', url);
    }

    get(url) {
        return this.send('GET', url);
    }

    head(url) {
        return this.send('HEAD', url);
    }

    monitor(...handlers) {
        for (let handler of handlers) {
            this.monitors.push(
                () => mkHttpUpload(this).on('Upload', message => handler(message))
            )
        }

        return this;
    }

    post(url, ...args) {
        if (args.length == 1) {
            if (args[0] instanceof Buffer) {
                this.setHeader('content-type', 'application/octet-stream');
                return this.send('POST', url, toJson(args[0]));
            }
            else if (typeof args[0] == 'object') {
                this.setHeader('content-type', 'applicaton/json');
                return this.send('POST', url, toJson(args[0]));
            }
            else {
                this.setHeader('content-type', 'text/plain');
                return this.send('POST', url, args[0].toString());
            }
        }
        else if (args.length >= 2) {
            let mime = args[0] instanceof Mime ? args[0].getCode() : args[0];
            this.setHeader('content-type', mime);

            if (args[0] instanceof Buffer) {
                return this.send('POST', url, toJson(args[0]));
            }
            else if (typeof args[0] == 'object') {
                return this.send('POST', url, toJson(args[0]));
            }
            else {
                return this.send('POST', url, args[0].toString());
            }
        }
    }

    send(method, url, mime, payload) {
        if (!this.hook) {
            this.req.open(method, url, true);

            for (let header of Object.entries(this.headers)) {
                this.req.setRequestHeader(header[0], header[1]);
            }

            for (let monitor of this.monitors) {
                monitor();
            }

            if (mime && payload) {
                this.req.setRequestHeader(
                    'Content-Type',
                    mime instanceof Mime ? mime.getCode() : mime,
                );

                this.send(payload);
            }
            else {
                this.send();
            }

            return new Promise((ok, fail) => {
                this.hook = () => ok(mkHttpResponse(this.req));
            });
        }
    }

    setHeader(name, value) {
        this.headers[name] = value;
        return this;
    }
});


/*****
 * A simplified wrapper that meets Radius requirements for monitoring the status
 * and progress of an HTTP upload.  This object ensures that all of the available
 * XMLHttpRequest.upload events are triggered and sent to listeners.  Use this in
 * GUI operations that might be large and take a long time.
*****/
register('', class HttpUpload extends Emitter {
    constructor(http) {
        super();

        for (let eventName of [
            'loadstart',
            'progress',
            'abort',
            'error',
            'load',
            'timeout',
            'loadend',
        ]) {
            http.req.upload.addEventListener(eventName, event => {
                this.send({
                    name: 'Upload',
                    status: eventName,
                    http: http,
                    event, event,
                })
            });
        }
    }
});


/*****
 * The HttpResponse object provides an API to properties and methods in the
 * XMLHttpRequest object.  Hence, it's a different view on the HTTP request.
 * It provides a stylized approach accepting, analyzing, and fetching the
 * response data when the request is done, aborted, errored out, or timed
 * out.  It also provides simplicity in fetching formatted payload data.
*****/
register('', class HttpResponse {
    constructor(xmlHttpRequest) {
        this.xmlHttpRequest = xmlHttpRequest;
    }

    getHeader(name) {
        return this.xmlHttpRequest.getResponseHeader(name);
    }

    getHeaders() {
        return this.xmlHttpRequest.getAllResponseHeaders();
    }

    hasHeader(name) {
        return this.xmlHttpRequest.getResponseHeader(name) != null;
    }

    getMime() {
        return mkMime(this.xmlHttpRequest.getResponseHeader('content-type'));
    }

    getPayload() {
        let type = this.xmlHttpRequest.responseType;

        if (type == '' || type == 'text') {
            return this.xmlHttpRequest.responseText;
        }
        else if (type == 'json') {
            return fromJson(this.xmlHttpRequest);
        }
        else {
            return this.xmlHttpRequest.respoonse;
        }
    }

    getStatus() {
        return this.xmlHttpRequest.status;
    }

    getType() {
        return this.xmlHttpRequest.type ? this.xmlHttpRequest.type : 'text';
    }

    getUrl() {
        return this.xmlHttpRequest.responseUrl;
    }
});
