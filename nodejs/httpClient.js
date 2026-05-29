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
 * The radius framework wrapper for the HTTP / HTTPS request() calls in nodejs.
 * It provides single-statement syntax for calling and receiving results in a
 * single-line, async manner.  It also works along with the HttpClientResponse
 * object to encapsulate and analyze received results and to handle user errors.
*****/
define(class HttpClient {
    constructor(options) {
        this.options = ObjectType.verify(options) ? options : {};
    }

    buildHttpOptions() {
        this.httpOptions = {
            method: this.method,
            protocol: this.url.getProtocol(),
            host: this.url.getHost(),
            path: this.url.getPath(),
            headers: {},
        };

        if (this.url.hasCredentials()) {
            this.httpOptions.authorization = this.url.getCredentials();
        }

        if (Object.keys(this.headers).length) {
            Object.assign(this.httpOptions.headers, this.headers);
        }

        if (ObjectType.verify(this.options.headers)) {
            Object.assign(this.httpOptions.headers, this.options.headers);
        }

        if (this.options.family == 4 || this.options.family == 6) {
            this.httpOptions.family = this.options.family;
        }

        if (this.url.getPort()) {
            this.httpOptions.port = this.url.getPort();
        }

        if (StringType.verify(this.options.localAddress)) {
            this.httpOptions.localAddres = this.options.localAddress;
        }

        if (UInt16Type.verify(this.options.localPort)) {
            this.httpOptions.localPort = this.options.localPort;
        }
    }

    async delete(url) {
        this.method = 'DELETE';
        this.url = mkUrl(url);
        return await this.exec();
    }

    async exec() {
        this.headers = {};

        try {
            this.handleAuthorization();
            this.handlePayload();
            this.buildHttpOptions();

            return new Promise((ok, fail) => {
                const client = this.url.getProtocol() == 'https:' ? LibHttps : LibHttp;

                const httpRequest = client.request(this.httpOptions, async httpResponse => {
                    ok(await HttpClientResponse.handleResponse(httpResponse));
                });

                if (this.data) {
                    httpRequest.write(this.data);
                }

                httpRequest.end();
            });
        }
        catch (e) {
            return mkHttpClientResponse(e);
        }
    }

    async get(url) {
        this.method = 'GET';
        this.url = mkUrl(url);
        return await this.exec();
    }

    handleAuthorization() {
        if (this.url.getProtocol() == 'https') {
            if (this.options.apiKey) {
                this.headers['X-Api-Key'] = this.options.apiKey;
            }
            else if (this.options.clientSecret) {
                let b64 = mkBuffer(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64');
                this.headers['Authorization'] = `Basic ${b64}`;
            }
            else if (this.options.bearerToken) {
                this.headers['Authorization'] = `Bearer ${this.options.bearerToken}`;
            }
            else if (this.options.password) {
                let b64 = mkBuffer(`${this.options.username}:${this.options.password}`).toString('base64');
                this.headers['Authorization'] = `Basic ${b64}`;
            }
        }
    }

    handlePayload() {
        if (this.payload && this.mime && this.method in { POST:0, PUT:0 }) {
            if (ObjectType.verify(this.payload)) {
                if (this.mime.getCode() == 'application/json') {
                    this.data = toStdJson(this.payload);
                    this.headers['Content-Type'] = this.mime.getCode();
                    this.headers['Content-Length'] = `${this.buffer.length}`;
                    return;
                }
                else if (this.mime.getCode() == 'application/x-www-form-urlencoded') {
                    this.data = Data.toWwwUrlEncoded(this.payload);
                    this.headers['Content-Type'] = this.mime.getCode();
                    this.headers['Content-Length'] = `${this.buffer.length}`;
                    return;
                }
            }

            this.data = mkBuffer(this.payload);
            this.headers['Content-Type'] = this.mime.getCode();
            this.headers['Content-Length'] = `${this.data.length}`;
        }
    }

    async head(url) {
        this.method = 'GET';
        this.url = mkUrl(url);
        return await this.exec();
    }

    async post(url, mime, payload) {
        this.method = 'POST';
        this.url = mkUrl(url);
        this.payload = payload;
        this.mime = mkMime(mime);
        return await this.exec();
    }

    async put(url, mime, payload) {
        this.method = 'PUT';
        this.url = mkUrl(url);
        this.payload = payload;
        this.mime = mkMime(mime);
        return await this.exec();
    }
});


/*****
 * The framework class used for building and wrapping an HTTP / HTTPS response
 * result.  It firstly works with the HttpClient accept and organize all of the
 * response data from the remote host.  It also encapsulates and wraps the
 * basic http response object by providing methods for fetch and testing the
 * status and results of the http request.  Finally, it also has framework for
 * returning fully constituted objects that were received from the remote host.
*****/
define(class HttpClientResponse {
    constructor() {
        this.error = null;
        this.httpResponse = null;
    }

    getHeader(name) {
        if (this.hasSucceeded()) {
            return this.httpResponse.headers[name];
        }

        return null;
    }

    getHeaderCount() {
        if (this.hasSucceeded()) {
            return Object.keys(this.httpResponse.headers).length;
        }

        return 0;
    }

    getHeaders() {
        if (this.hasSucceeded()) {
            return this.httpResponse.headers;
        }

        return {};
    }

    getLength() {
        if (this.hasSucceeded()) {
            return this.buffer.length;
        }

        return 0;
    }

    getMime() {
        if (this.hasSucceeded()) {
            let contentType = this.httpResponse.headers['content-type'];
            let semi = contentType.indexOf(';');

            if (semi > 0) {
                return mkMime(contentType.substring(0, semi));
            }
            else {
                return mkMime(contentType);
            }
        }

        return null;
    }

    getRawBuffer() {
        if (this.hasSucceeded()) {
            return this.buffer;
        }

        return null;
    }

    getRawText() {
        if (this.hasSucceeded()) {
            return this.buffer.toString();
        }

        return '';
    }

    getStatusCode() {
        if (this.hasSucceeded()) {
            return this.httpResponse.statusCode;
        }

        return 0;
    }

    getStatusMessage() {
        if (this.hasSucceeded()) {
            return this.httpResponse.statusMessage;
        }

        return '';
    }

    getValue() {
        if (this.hasSucceeded()) {
            return RdsConverter.convert(this.buffer, this.getMime());
        }

        return null;
    }

    static async handleResponse(httpResponse) {
        let rsp = mkHttpClientResponse();

        try {
            let chunks = [];
            
            httpResponse.on('data', chunk => {
                chunks.push(mkBuffer(chunk));
            });
            
            httpResponse.on('end', () => {
                rsp.buffer = chunks.length ? Buffer.concat(chunks) : mkBuffer();
                rsp.httpResponse = httpResponse;
                return rsp;
            });
        }
        catch (e) {
            rsp.error = e;
        }

        return rsp;
    }

    hasFailed() {
        return this.error != null;
    }

    hasHeader(name) {
        if (this.hasSucceeded()) {
            return name in this.httpResponse.headers;
        }

        return false;
    }

    hasSucceeded() {
        return this.error == null;
    }

    isEmpty() {
        return !this.buffer || this.buffer.length == 0;
    }

    [Symbol.iterator]() {
        if (this.hasSucceeded()) {
            return Object.entries(this.httpResponse.headers)[Symbol.iterator]();
        }

        return [][Symbol.iterator]();
    }
});


/**
 * Built in converts for converting buffers with a specified MIME type to an
 * object, image, audio file, or whatever is best the result for the provided
 * data.  If all attempts fail, a null value is returned.  Moreover, this object
 * is easily expanded to incorporate extensions for new data types, even vendor
 * specific types such as Microsoft Office and the Apple equivalents like Pages
 * and Numbers.
 */
singleton(class RdsConverter {
    constructor() {
        this.supported = {
            'application/jso': this.convertJsObject,
            'application/json': this.convertJson,
            'application/problem+json': this.convertJson,
            'application/octet-stream': this.convertOctetStream,
            'application/xml': this.convertXml,
            'application/x-www-urlencoded': this.convertWwwUrlEncoded,
            'text/htm': this.convertHtml,
            'text/html': this.convertHtml,
            'text/plain': this.convertText,
        };
    }

    convert(buffer, mime) {
        try {
            if (mime.getCode() in this.supported) {
                return this.supported[mime.getCode()](buffer);
            }
            else {
                return null;
            }
        }
        catch (e) {
            return mkFailure(e);
        }
    }

    convertHtml(buffer) {
        return createDocElementFromOuterHtml(buffer.toString());
    }

    convertJsObject(buffer) {
        let jso;
        eval(`jso = ${buffer.toString()}`);
        return jso;
    }

    convertJson(buffer) {
        return fromJson(buffer.toString());
    }

    convertOctetStream(buffer) {
        return buffer;
    }

    convertText(buffer) {
        return buffer.toString();
    }

    convertXml(buffer) {
        // TODO ********
    }

    convertWwwUrlEncoded(buffer) {
        // TODO ********
    }
});
