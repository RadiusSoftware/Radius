/*****
 * Copyright (c) 2024 Radius Software
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
        this.xhr = new XMLHttpRequest();

        if (typeof timeoutMilliseconds == 'number' && timeoutMilliseconds > 0) {
            this.xhr.timeout = timeoutMilliseconds;
        }

        this.xhr.addEventListener('abort', event => this.onAbort(event));
        this.xhr.addEventListener('error', event => this.onError(event));
        this.xhr.addEventListener('load', event => this.onLoad(event));
        this.xhr.addEventListener('loadend', event => this.onLoadEnd(event));
        this.xhr.addEventListener('loadstart', event => this.onLoadStart(event));
        this.xhr.addEventListener('progress', event => this.onProgress(event));
        this.xhr.addEventListener('readystatechange', event => this.onReadyStateChange(event));
        this.xhr.addEventListener('timeout', event => this.onTimeout(event));

        this.promise = new Promise((ok, fail) => {
            this.done = () => ok(mkHttpResponse(this.xhr));
            this.fail = reason => { throw new Error(reason) };
        });
    }

    cancel() {
        this.xhr.abort();
        return this;
    }

    delete(url) {
        this.xhr.open('DELETE', url, true);
        return this.send();
    }

    get(url) {
        this.xhr.open('GET', url, true);
        return this.send();
    }

    getUpload() {
        return mkHttpUpload(this);
    }

    head(url) {
        this.xhr.open('HEAD', url, true);
        return this.send();
    }

    onAbort(event) {
        this.fail(event);
    }

    onError(event) {
        this.fail(event);
    }

    onLoad(event) {
    }

    onLoadEnd(event) {
    }

    onLoadStart(event) {
    }

    onProgress(event) {
    }

    onReadyStateChange(event) {
        if (this.xhr.readyState == 4) {
            this.done();
        }
    }

    onTimeout(event) {
        this.fail(event);
}

    post(url, payload, mime, headers) {
        return this.request('POST', url, payload, mime, headers);
    }

    put(url, payload, mime, headers) {
        return this.request('PUT', url, payload, mime, headers);
    }

    request(method, url, payload, mime, headers) {
        this.xhr.open(method, url, true);

        if (typeof mime == 'text') {
            return this.send(mime, payload instanceof Buffer ? payload : mkBuffer(payload), headers);
        }
        else {
            if (typeof mime == 'object') {
                headers = mime;
            }

            if (payload instanceof Buffer) {
                return this.send('application/octet-stream', payload, headers);
            }
            else if (typeof payload == 'object') {
                return this.send('application/json', toJson(payload), headers);
            }
            else {
                return this.send('text/plain', payload.toString(), headers);
            }
        }
    }

    send(mime, payload, headers) {
        if (headers) {
            for (let headerName in headers) {
                this.xhr.setRequestHeader(headerName, headers[headerName]);
            }
        }

        if (mime && payload) {
            this.xhr.setRequestHeader(
                'Content-Type',
                mime instanceof Mime ? mime.getCode() : mime,
            );

            this.xhr.send(payload);
        }
        else {
            this.xhr.send();
        }

        return this.promise;
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
    constructor(xhr) {
        this.xhr = xhr;
    }

    getHeader(name) {
        return this.xhr.getResponseHeader(name);
    }

    getHeaders() {
        return this.xhr.getAllResponseHeaders();
    }

    hasHeader(name) {
        return this.xhr.getResponseHeader(name) != null;
    }

    getLength() {
        return this.xhr.response.length;
    }

    getMime() {
        return mkMime(this.xhr.getResponseHeader('content-type'));
    }

    getPayload() {
        let type = this.xhr.responseType;

        if (type == '' || type == 'text') {
            if (this.xhr.getResponseHeader('content-type').startsWith('application/json')) {
                return fromJson(this.xhr.responseText);
            }
            else {
                return this.xhr.responseText;
            }
        }
        else if (type == 'json') {
            return this.xhr.response;
        }
        else {
            return this.xhr.respoonse;
        }
    }

    getStatus() {
        return this.xhr.status;
    }

    getType() {
        return this.xhr.type ? this.xhr.type : 'text';
    }

    getUrl() {
        return this.xhr.responseUrl;
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
            'abort',
            'error',
            'load',
            'loadend',
            'loadstart',
            'progress',
            'timeout',
        ]) {
            http.xhr.upload.addEventListener(eventName, event => {
                this.emit({
                    name: 'UploadStatus',
                    status: eventName,
                    http: http,
                    event, event,
                })
            });
        }
    }
});
