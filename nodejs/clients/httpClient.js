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
const Http = require('http');
const Https = require('https');
const Url = require('url');
 
 
 (() => {
    /*****
     * A framework wrapper class for simplifying the implementation of an HTTP
     * or HTTPS client request.  Note that the request is configured/formatted
     * to enable single-line get() and post() and other REST options to the
     * remote server.
    *****/
    register('', class HttpClient {
        constructor(url, port) {
            this.url = Url.parse(url);
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
                client: this.protocol == 'https' ? Https : Http,
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
                        let content = '';
                        let mime = rsp.headers['content-type'];

                        if (mime) {
                            let semi = mime.indexOf(';');

                            if (semi > 0) {
                                mime = mime.substring(0, semi - 1);
                            }
                        }
                        else {
                            mime = 'text/plain';
                        }

                        if (body.length) {
                            if (mime in converters) {
                                content = converters[mime](body);
                            }
                            else {
                                content = converters['text/plain'](body);
                            }
                        }

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
    const convertBuffer = array => {
        let length = array.reduce((prev, curr) => prev + curr.length, 0);
        return Buffer.concat(array, length);
    };

    const convertString = array => {
        return array.map(el => el.toString()).join('');
    }

    const converters = {
        'application/jso': array => fromJson(convertString(array)),
        'application/json': array => fromJson(convertString(array)),
        'application/octet-stream': array => convertBuffer(array),
        'application/xml': array => convertString(array),
        'text/htm': array => convertString(array),
        'text/html': array => convertString(array),
        'text/plain': array => convertString(array),
    };
})();
