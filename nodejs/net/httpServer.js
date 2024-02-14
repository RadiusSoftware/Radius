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
const LibHttp = require('http');
const LibHttps = require('https');
const LibPath = require('path');
const LibQueryString = require('node:querystring');
const LibUrl = require('url');


/*****
*****/
singletonIn('HttpServer', '', class HttpServer extends Application {
    constructor() {
        super();
        this.httpLibrary = mkHttpLibrary();
    }

    getLibEntries() {
        return this.settings.libEntries;
    }

    getLibSettings() {
        return this.settings.libSettings;
    }

    async init() {
        await this.httpLibrary.init(this.settings.libSettings, this.settings.libEntries);
        await super.init();
        return this;
    }
});


/*****
*****/
singletonIn('HttpServerWorker', '', class HttpServerWorker extends ApplicationWorker {
    constructor() {
        super();

        // ITERATE OVER all addresses and ports.
        display('\n**********  Iterate over all addresses and ports.\n');
        if (this.settings.tls instanceof Tls) {
            this.scheme = 'https';

            this.server = LibHttps.createServer({
                key: this.settings.getPrivateKey(),
                cert: this.settings.getCert(),
                ca: this.settings.getCaCert(),
            }, (httpReq, httpRsp) => this.handleRequest(httpReq, httpRsp));

            this.server.listen(this.settings.port, this.settings.addr);
            this.server.on('upgrade', (...args) => this.onUpgrade(...args));
        }
        else {
            this.scheme = 'http';
            this.server = LibHttp.createServer({}, (...args) => this.handleRequest(...args));
            this.server.listen(this.settings.port, this.settings.addr);
            this.server.on('upgrade', (httpReq) => this.onUpgrade(httpRsp));
        }
    }

    getLibEntries() {
        return this.settings.libEntries;
    }

    getLibSettings() {
        return this.settings.libSettings;
    }
    
    getStatusResponseTemplate(statusCode) {
        if (statusCode in this.httpStatusResponses) {
            return this.httpStatusResponses[statusCode];
        }
        else {
            return this.httpStatusResponses.default;
        }
    }

    async handleRequest(httpReq, httpRsp) {
        const req = mkHttpRequest(this, httpReq);
        const rsp = mkHttpResponse(this, httpRsp);
        const httpItem = this.httpLibrary.getItem(req.getPath());

        if (httpItem) {
            try {
                for (let httpFilter of this.httpLibrary) {
                    let filterResult = await httpFilter.exec(req, httpItem);

                    if (filterResult === true) {
                        continue;
                    }
                    else if (typeof filterResult == 'object') {
                        rsp.respond(filterResult.status, filterResult.mime, filterResult.content);
                        return;
                    }
                    else if (typeof filterResult == 'number') {
                        rsp.respondStatus(filterResult);
                        return;
                    }
                    else {
                        rsp.respondStatus(400);
                        return;
                    }
                }

                let response = await httpItem[`handle${req.getMethod()}`](req);

                if (typeof response == 'number') {
                    rsp.respondStatus(response);
                }
                else {
                    response.contentEncoding ? rsp.setContentEncoding(response.contentEncoding) : null;
                    response.contentLength ? rsp.setHeader('Content-Length', response.contentLength) : null;
                    rsp.respond(response.status, response.mime, response.content);
                }
            }
            catch (e) {
                await caught(e);
                rsp.respndStatus(500);
            }
        }
        else {
            rsp.respondStatus(404);
        }
    }

    async init() {
        this.httpStatusResponses = {};
        
        if (typeof this.settings.HttpStatusTemplates == 'string') {
            let path = this.settingsHttpStatusTemplates;

            if (FileSystem.isDirectory(path)) {
                for (let httpStatusCode in HttpResponse.statusCodes) {
                    let htmlpath = LibPath.join(path, `httpStatusResponse${httpStatusCode}.html`);

                    if (await FileSystem.isFile(htmlpath)) {
                        let text = await FileSystem.readFile(htmlpath);
                        this.httpStatusResponses[httpStatusCode] = mkTextTemplate(text);
                    }
                }
            }
            else if (FileSystem.isFile(path)) {
                if (path.endsWith('.html')) {
                    let text = await FileSystem.readFile(path);
                    this.httpStatusResponses.default = mkTextTemplate(text);
                }
            }
        }

        if (!this.httpStatusResponses.default) {
            let text = await FileSystem.readFile(LibPath.join(__dirname, 'statusResponse.html'));
            this.httpStatusResponses.default = mkTextTemplate(text);
        }

        this.httpLibrary = await mkHttpLibrary();
        await this.httpLibrary.init(this.settings.libSettings, this.settings.libEntries);
        return this;
    }

    isTls() {
        return this.settings.tls instanceof Tls;
    }

    async onUpgrade(httpReq, socket, headPacket) {
        /*
        let req = await mkHttpRequest(this, httpReq);
        let webItem = await WebLibrary.get(req.pathname());

        if (webItem && webItem instanceof Webx) {
            try {
                await webItem.upgrade(req, socket, headPacket);
            }
            catch (e) {
                log(`Web Socket Upgrade Request Error: ${req.url()}`, e);
            }
        }
        */
    }

    async start() {
        await super.start();
        return this;
    }
});


/*****
 * A wrapper for the node JS builtin incoming request object.  This wrapper
 * has multiple purposes.  (1) provide a fast/simplified API for fetching data
 * that's often required.  (2) provide an asynchronous interface to all of the
 * base class's features, and (3) automatically load the HTTP request's body or
 * content when making a new HTTP request instance.
*****/
registerIn('HttpServerWorker', '', class HttpRequest {
    constructor(httpServer, httpReq) {
        this.httpServer = httpServer;
        this.httpReq = httpReq;
        this.object = {};
        this.params = {};
        this.parsedUrl = LibUrl.parse(this.httpReq.url);
        let iterator = new LibUrl.URLSearchParams(this.getQuery()).entries();

        for (let param = iterator.next(); !param.done; param = iterator.next()) {
            this.params[param.value[0]] = param.value[1];
        }
    }

    getAccept() {
        return this.getAcceptor('accept');
    }

    getAcceptEncoding() {
        return this.getAcceptor('accept-encoding');
    }
  
    getAcceptLanguage() {
        return this.getAcceptor('accept-language');
    }

    getAcceptor(headerName) {
        let items = {};
        let value = this.getHeader(headerName);

        if (value) {
            value.split(',').forEach(item => {
                let [ value, quality ] = item.split(';');
                value = value.trim();
                
                items[value] = {
                    value: value,
                    quality: quality ? parseFloat(quality.substr(2)) : 0
                };
            });
        }

        return items;
    }

    getAuth() {
        return this.parsedUrl.auth;
    }

    async getBody() {
        return new Promise((ok, fail) => {
            if (this.body) {
                ok(this.body);
            }
            else {
                let size = 0;
                let chunks = [];
                
                this.httpReq.on('data', data => {
                    size += data.length;
                    
                    if (size > 100000000) {
                        this.body = {
                            mime: mkMime('text/plain'),
                            value: 'Payload Too Large'
                        };
                        
                        ok(this.body);
                    }
                    else {
                        chunks.push(data);
                    }
                });
                
                this.httpReq.on('end', () => {
                    if (chunks.length) {
                        let mimeCode = this.header('content-type');
                        let mime = mkMime(mimeCode);
                        
                        if (mime.type == 'binary') {
                            this.body = {
                                mime: mime,
                                value: mkBuffer(Buffer.concat(chunks)),
                            };
                        }
                        else {
                            this.body = {
                                mime: mime,
                                value: chunks.map(chunk => chunk.toString()).join(''),
                            };
                        }
                        
                        if (mimeCode == 'application/json') {
                            try {
                                this.object = fromJson(this.body.value);
                            }
                            catch (e) {}
                        }
                        else if (mimeCode == 'application/x-www-form-urlencoded') {
                            try {
                                this.object = LibQueryString.parse(this.body.value);
                            }
                            catch (e) {}
                        }
                    }
                    else {
                        this.body = {
                            mime: mkMime('text/plain'),
                            data: ''
                        };
                    }
    
                    ok(this.body);
                });
            }
        });
    }

    getCipher() {
        if ('getCipher' in this.httpReq.socket) {
            return this.httpReq.socket.getCipher();
        }
        else {
            return '';
        }
    }

    getCookie(name) {
        // TODO
    }

    getCookies() {
        // TODO
    }

    getEncoding() {
        if ('content-encoding' in this.getHeaders()) {
            return this.header('content-encoding');
        }
    }

    getFullRequest() {
        return `${this.getScheme()}://${this.httpReq.headers.host}${this.httpReq.url}`;
    }

    getHeader(headerName) {
        return this.httpReq.headers[headerName.toLowerCase()];
    }

    getHeaders() {
        return this.httpReq.headers;
    }

    getHost() {
        return this.parsedUrl.host !== null ? this.parsedUrl.host : '';
    }

    getHostname() {
        return this.parsedUrl.hostname !== null ? this.parsedUrl.hostname : '';
    }

    getHref() {
        return this.parsedUrl.href;
    }

    getMethod() {
        return this.httpReq.method;
    }

    getMime() {
        return this.requestBody ? this.requestBody.mime : '';
    }

    getObject() {
        return this.object;
    }

    getParameters() {
        return this.params;
    }

    getPath() {
        if (this.parsedUrl.pathname) {
            if (this.parsedUrl.pathname == '/') {
                return this.parsedUrl.pathname;
            }
            else if (this.parsedUrl.pathname.endsWith('/')) {
                let length = this.parsedUrl.pathname.length;
                return this.parsedUrl.pathname.substring(0, length - 1);
            }
            else {
                return this.parsedUrl.pathname;
            }
        }
        else {
            return '/';
        }
    }

    getProtocol() {
        return this.parsedUrl.protocol !== null ? this.parsedUrl.protocol : '';
    }

    getQuery() {
        return this.parsedUrl.query !== null ? this.parsedUrl.query : '';
    }

    getSearch() {
        return this.parsedUrl.search !== null ? this.parsedUrl.search : '';
    }

    getScheme() {
        return this.isTls ? 'https' : 'http';
    }

    getUrl() {
        return this.httpReq.url !== null ? this.httpReq.url : '';
    }

    getUserAgent() {
        return this.header('user-agent');
    }

    getVariables() {
        let variables = new Object();
        Object.assign(variables, this.parameters());
        Object.assign(variables, this.vars);
        return variables;
    }

    hasParameters() {
        return Object.keys(this.params).length > 0;
    }

    hasHeader(headerName) {
        return headerName.toLowerCase() in this.httpReq.headers;
    }

    hasVars() {
        return Object.entries(this.vars).length > 0;
    }

    async init() {
        await this.mkHttpLibrary.init();
        return this;
    }
});


/*****
 * A wrapper for the node JS HTTP server response object, whose primary purpose
 * is to integrate the server response object into the framework using the
 * framework style API.  This class provides response header management and also
 * "narrows" the API to features that are useful within and required by the
 * server side framework.
*****/
registerIn('HttpServerWorker', '', class HttpResponse {
    static statusCodes = {
        100: { text: 'Continue' },
        101: { text: 'Switching Protocols' },
        102: { text: 'WebDav Processing' },
        103: { text: 'Early Hints' },
        200: { text: 'OK' },
        201: { text: 'Created' },
        202: { text: 'Accepted' },
        203: { text: 'Non-Authoritative Information' },
        204: { text: 'No Content' },
        205: { text: 'Reset Content' },
        206: { text: 'PartialContent' },
        207: { text: 'WebDav Multi-Status' },
        208: { text: 'WebDav Already Reported' },
        226: { text: 'WebDav IM Used' },
        300: { text: 'Multiple Choices' },
        301: { text: 'Moved Permanently' },
        302: { text: 'Found' },
        303: { text: 'See Other' },
        304: { text: 'Not Modified' },
        305: { text: 'Use Proxy' },
        306: { text: 'unused' },
        307: { text: 'Temporary Redirect' },
        308: { text: 'Permanent Redirect' },
        400: { text: 'Bad Request' },
        401: { text: 'Unauthorized' },
        402: { text: 'Payment Required' },
        403: { text: 'Forbidden' },
        404: { text: 'Not Found' },
        405: { text: 'Method Not Allowed' },
        406: { text: 'Not Acceptable' },
        407: { text: 'Proxy Authentiation Required' },
        408: { text: 'Request Timeout' },
        409: { text: 'Conflict' },
        410: { text: 'Gone' },
        411: { text: 'Length Required' },
        412: { text: 'Precondition Failed' },
        413: { text: 'Payload Too Large' },
        414: { text: 'URI Too Long' },
        415: { text: 'Unsupported Media Type' },
        416: { text: 'Range Not Satisfiable' },
        417: { text: 'Expectation Failed' },
        418: { text: 'I\'m a teapot' },
        421: { text: 'Misdirected Request' },
        422: { text: 'Unprocessable Entity' },
        423: { text: 'Locked' },
        424: { text: 'Failed Dependency' },
        425: { text: 'Too Early' },
        426: { text: 'Upgrade Required' },
        428: { text: 'Precondition Required' },
        429: { text: 'Too Many Requests' },
        431: { text: 'Request Header Fields Too Large' },
        451: { text: 'Unavailable For Legal Reasons' },
        500: { text: 'Internal Server Error' },
        501: { text: 'Not Implemented' },
        502: { text: 'Bad Gateway' },
        503: { text: 'Service Unavailable' },
        504: { text: 'Gateway Timeout' },
        505: { text: 'HTTP Version Not Supported' },
        506: { text: 'Variant Also Negotiates' },
        507: { text: 'Insuficient Storage' },
        508: { text: 'Loop Detected' },
        510: { text: 'Not Extended' },
        511: { text: 'Network Authentiation Failed' },
    };

    constructor(httpServer, httpRsp) {
        this.httpServer = httpServer;
        this.httpRsp = httpRsp;
    }

    clearCookie(name) {
        // TODO
    }

    clearCookies() {
        // TODO
    }

    getHeader(headerName) {
        return this.httpRsp.getHeader(headerName);
    }

    getHeaderArray() {
        return this.httpRsp.getHeaderNames().map(headerName => {
            return { name: headerName, value: this.httpRsp.getHeader(headerName) };
        });
    }

    getHeaderNames() {
        return this.httpRsp.getHeaderNames();
    }

    getHeaderObject() {
        let obj = {};

        for (let headerName of this.httpRsp.getHeaderNames()) {
            obj[headerName] = this.httpRsp.getHeader(headerName);
        }

        return obj;
    }

    hasHeader(name) {
        return this.httpRsp.hasHeader(name);
    }

    removeHeader(headerName) {
        this.httpRsp.removeHeader(headerName);
        return this;
    }

    respond(...args) {
        let status;
        let contentType;
        let charset;
        let content;

        if (args.length == 3) {
            status = args[0];
            contentType = args[1];
            content = args[2];
        }
        else if (args.length > 3) {
            status = args[0];
            contentType = args[1];
            charset = args[2];
            content = args[3];
        }
        else {
            this.respondStatus(500);
            return;
        }

        this.setContentType(contentType, charset);
        this.httpRsp.writeHead(status);
        this.httpRsp.end(content);
    }

    respondChunk(chunk) {
        // TODO
    }

    respondChunked(status, contentType, chunk) {
        // TODO
        // Transfer-Encoding: chunked
    }
    
    respondStatus(statusCode) {
        let template = this.httpServer.getStatusResponseTemplate(statusCode);
        
        if (statusCode in HttpResponse.statusCodes) {
            this.respond(statusCode, 'text/html', template.toString({
                statusCode: statusCode,
                statusText: HttpResponse.statusCodes[statusCode].text,
            }));
        }
        else {
            statusCode = 500;

            this.respond(statusCode, 'text/html', template.toString({
                statusCode: statusCode,
                statusText: HttpResponse.statusCodes[statusCode].text,
            }));
        }
    }

    setContentEncoding(algorithm) {
        if (typeof algorithm == 'string') {
            this.httpRsp.setHeader('content-encoding', algorithm);
        }

        return this;
    }

    setContentLanguage(lang) {
        if (typeof lang == 'string') {
            this.httpRsp.setHeader('content-language', lang);
        }

        return this;
    }

    setContentType(mimeInfo, charset) {
        let mime = mimeInfo instanceof Mime ? mimeInfo : mkMime(mimeInfo);

        if (mime.getType() == 'string' && typeof charset == 'string') {
            this.httpRsp.setHeader('Content-Type', `${mime.getCode()}; charset="${charset}"`);
        }
        else {
            this.httpRsp.setHeader('Content-Type', mime.getCode());
        }

        return this;
    }

    setCookie(cookie) {
        // TODO
    }

    setHeader(headerName, value) {
        this.httpRsp.setHeader(headerName, value);
        return this;
    }
});
