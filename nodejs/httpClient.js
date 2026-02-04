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
const LibHttp = require('http');
const LibHttps = require('https');
const LibUrl = require('url');
 
 
/*****
 * A framework wrapper class for simplifying the implementation of an HTTP
 * or HTTPS client request.  Note that the request is configured/formatted
 * to enable single-line get() and post() and other REST options to the
 * remote server.  There's also a conversions
*****/
define(class HttpClientProtocol {
    constructor(url, port) {
        this.url = LibUrl.parse(url);
        this.host = this.url.host;
        this.path = this.url.path;

        if (this.url.protocol) {
            this.protocol = this.url.protocol;
        }
        else {
            this.protocol = 'http';
        }

        if (typeof port == 'number') {
            this.port = port;
        }
        else if (this.protocol == 'https') {
            this.port = 443;
        }
        else {
            this.port = 80;
        }
    }

    async delete(headers) {
        this.method = 'DELETE';
        return await this.request('', '', headers);
    }

    async get(headers) {
        this.method = 'GET';
        return await this.request('', '', headers);
    }

    async head(headers) {
        this.method = 'HEAD';
        return await this.request('', '', headers);
    }

    async post(mime, content, headers) {
        this.method = 'POST';
        return await this.request(mime, content, headers);
    }

    async put(mime, content, headers) {
        this.method = 'POST';
        return await this.request(mime, content, headers);
    }

    request(mime, content, headers) {
        let opts = {
            client: this.protocol == 'https' ? LibHttps : LibHttp,
            headers: {},
            method: this.method,
            host: this.host,
            port: this.port,
            path: this.path,
        };

        if (headers) {
            for (let headerName in headers) {
                opts.headers[headerName] = headers[headerName];
            }
        }

        if (mime) {
            if (typeof content.length == 'number') {
                opts.content = content;
                opts.headers['Content-Length'] = opts.content.length;
            }
            else {
                opts.content = mkBuffer(content);
                opts.headers['Content-Length'] = opts.content.length;
            }
        }

        return new Promise((ok, fail) => {
            let req = opts.client.request(opts, rsp => {
                let body = [];
                
                rsp.on('data', buffer => {
                    body.push(buffer)
                });
                
                rsp.on('end', () => {
                    let buffer = Buffer.concat(...body);
                    let mime = rsp.headers['content-type'];
                    let content = HttpClientProtocolConverter.convert(mime, buffer);

                    ok({
                        status: rsp.statusCode,
                        mime: mime,
                        message: rsp.statusMessage,
                        headers: rsp.headers,
                        content: content,
                    });
                });
                
                rsp.on('error', error => {
                    ok({
                        status: 999,
                        mime: 'text/plain',
                        message: '',
                        headers: {},
                        content: error.toString(),
                    });
                });
            });

            'content' in opts ? req.write(opts.content) : false;
            req.end();
        });
    }
});


/**
 * Built in converts for responses returned by the remote server.  If one of
 * these MIME types are associated with the return value, the registered
 * converter is call to work its magic.  If the returned value has no entry
 * in this list of converters, we use the "application/octet-stream" mime
 * type converter to return the octet-stream.
 */
singleton(class HttpClientProtocolConverter {
    constructor() {
        this.converters = {
            'application/jso': buffer => fromJson(buffer.toString()),
            'application/json': buffer => fromJson(buffer.toString()),
            'application/octet-stream': buffer => buffer,
            'application/xml': buffer => buffer.toString(),
            'text/htm': buffer => buffer.toString(),
            'text/html': buffer => buffer.toString(),
            'text/plain': buffer => buffer.toString(),
        };
    }

    convert(buffer, mime) {
        if (buffer.length) {
            let semi = mime.indexOf(';');
            semi > 0 ? mime = mime.substring(0, semi - 1) : null;

            if (mime in this.converters) {
                return this.converters[mime](buffer);
            }
        }

        return buffer;
    }
});


/*****
*****/
define(class HttpClient {
    constructor() {
    }
});


/*****
*****/
createService(class HttpClientService extends Service {
    constructor() {
        super();
    }
});


/*****
*****/
define(class HttpClientHandle extends Handle {
    constructor() {
        super();
    }
});
