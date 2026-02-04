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
const LibHttp = require('http');
const LibHttps = require('https');
const LibQueryString = require('node:querystring');
const LibUrl = require('url');


/*****
 * The HTTP server primary process object's features and tasks are performed
 * primarily by nodejs's builtin HTTP module features.  In fact, nodejs does
 * not require any developer code in order the configure the HTTP server.  All
 * work is performed in the worker processes.  In essence, the HttpServer
 * class is a stub that makes the HttpServer fit the mold of what an server
 * looks like in the Radius framework.  The main HttpServer provides features
 * related to managing and executing watches.
*****/
define(class HttpServer extends Server {
    constructor() {
        super();
    }
});


/*****
 * The HTTP server worker is implemented as a feature-rich wrapper for the basic
 * nodejs HTTP server framework.  Each HTTP worker may be configured to listen on
 * more than a single netInterface, which is defined as the intersection of an
 * IP address and  a port.  Each netInterface may have it's TLS settings on or.
 * When on, each TLS setting may have its own certificate, as necessary.
 * 
 * The HttpServerWorker is responsible for handling and responsing to server
 * requests as well as sharing responsibility for managing and executing watches
 * with the primary HttpServer process.  The HttpServerWorker is responsible
 * for handling requests to upgrade to a websocket connection.
*****/
define(class HttpWorker extends Worker {
    constructor() {
        super();
        this.httpxs = {};
        this.library = mkHttpLibraryHandle();
    }

    async encodeContent(handle) {
        if (handle.content) {
            for (let key in handle.req.getAcceptEncoding()) {
                if (Compression.isSupported(key)) {
                    handle.encoding = key;
                    handle.content = await Compression.compress(key, handle.content);
                    break;
                }
            }
        }
        else {
            handle.encoding = '';
            handle.content = '';
        }
    }

    async getHttpX(handle) {
        if (handle.libEntry.path in this.httpxs) {
            return this.httpxs[handle.libEntry.path];
        }
        else {
            return await (() => {
                return new Promise((ok, fail) => {
                    Namespace.once('ClassDefined', async message => {
                        let httpx = message.maker();
                        httpx.filepath = handle.libEntry.jsPath;
                        httpx.httppath = handle.libEntry.path;
                        httpx.pkgName = handle.libEntry.pkg;
                        httpx.options = handle.libEntry.opts;
                        await httpx.init();
                        this.httpxs[handle.libEntry.path] = httpx;
                        ok(httpx);
                    });

                    require(handle.libEntry.jsPath);
                });
            })();
        }
    }

    async handleLink(handle) {
        // TODO ****************************************************************
        // TODO ****************************************************************
    }

    async handleRequest(httpReq, httpRsp) {
        let req = mkHttpRequest(this, httpReq);
        let rsp = mkHttpResponse(this, httpRsp);

        let handle = {
            req: req,
            rsp: rsp,
        };

        try {
            let settings = mkSettingsHandle();

            if ((await settings.getSetting('radiusCluster')) == '#NOTSET#') {
                let clusterPath = await settings.getSetting('clusterPath');
                handle.rsp.setHeader('Location', clusterPath);
                handle.rsp.respondStatus(307);
                return;
            }

            handle.libEntry = await this.library.get(handle.req.getPath());

            if (typeof handle.libEntry == 'number') {
                handle.rsp.respondStatus(handle.libEntry);
                return;
            }

            if (handle.libEntry.type == 'link') {
                this.handleWebService(handle);
            }
            else if (handle.libEntry.type == 'webservice') {
                this.handleWebService(handle);
            }
            else {
                if (this.scheme == 'https') {
                    if (handle.req.getScheme() == 'http') {
                        if (handle.libEntry.mode != 'open') {
                            let location = handle.req.getFullRequest().replace('http://', 'https://');
                            rsp.setHeader('Location', location);
                            rsp.respondStatus(301);
                            return;
                        }
                    }
                }

                handle.permissions = mkPermissionSetHandle();
                handle.acceptCookiesCookie = handle.req.getCookie(this.acceptCookiesName);
                handle.sessionCookie = handle.req.getCookie(this.sessionCookieName);
                let token = handle.sessionCookie ? handle.sessionCookie.getValue() : '';
                handle.session = await mkSessionHandle().open(token);

                if (!handle.session.getToken()) {
                    let acceptedCookies = '';

                    if (handle.acceptCookiesCookie) {
                        acceptedCookies = handle.acceptCookiesCookie.getValue();
                    }

                    await handle.session.createSession({
                        remoteHost: handle.req.getRemoteHost(),
                        initialPath: handle.req.getPath(),
                        userAgent: handle.req.getHeader('user-agent'),
                        acceptedCookies: acceptedCookies,
                    });

                    handle.sessionCookie = mkCookie(this.sessionCookieName, handle.session.getToken());
                    handle.sessionCookie.setHttpOnly();
                    handle.rsp.setCookie(handle.sessionCookie);
                }

                for (let cookie of handle.req.getCookieArray()) {
                    if (cookie.getName().startsWith(this.sessionCookiePrefix)) {
                        if (cookie.getName() != this.sessionCookieName) {
                            handle.rsp.clearCookie(cookie);
                        }
                    }
                }
                
                if (!(await handle.session.authorize(handle.libEntry.pset))) {
                    if (this.acceptCookiesPath) {
                        if (!handle.acceptCookiesCookie && handle.req.getPath() != this.acceptCookiesPath) {
                            handle.rsp.setHeader('Location', this.acceptCookiesPath);
                            handle.rsp.respondStatus(307);
                            return;
                        }
                    }

                    if (this.authorizePath) {
                        if (!(await handle.session.hasPermission('radius:signedin'))) {
                            if (await handle.libEntry.pset.hasPermission('radius:signedin')) {
                                handle.rsp.setHeader('Location', this.authorizePath);
                                handle.rsp.respondStatus(307);
                                return;
                            }
                        }
                    }

                    rsp.respondStatus(401);
                    return;
                }

                if (handle.libEntry.type == 'httpx') {
                    await this.respondHttpx(handle);
                }
                else if (handle.libEntry.type == 'file') {
                    await this.respondFile(handle);
                }
                else if (handle.libEntry.type == 'data') {
                    await this.respondData(handle);
                }
                else if (handle.libEntry.type == 'function') {
                    await this.respondFunction(handle);
                }

                if (handle.httpFailure) {
                    handle.respondStatus(handle.httpStatusCode);
                    return;
                }

                await this.encodeContent(handle);
                
                handle.rsp.respond(
                    200,
                    handle.mime,
                    handle.encoding,
                    handle.content,
                );

                if (handle.libEntry.once) {
                    if (handle.libEntry.type == 'httpx') {
                        delete this.httpxs[handle.libEntry.path];
                    }
                }
            }
        }
        catch (e) {
            await caught(e);
            rsp.respondStatus(500);
        }
    }

    async handleWebService(handle) {
        // TODO ****************************************************************
        // TODO ****************************************************************
    }

    async init() {
        await super.init();
        let settings = mkSettingsHandle();
        this.sessionCookiePrefix = await settings.getSetting('sessionCookiePrefix');
        this.sessionCookieName = `${this.sessionCookiePrefix}${await settings.getSetting('sessionCookieName')}`;
        this.acceptCookiesName = await settings.getSetting('acceptCookiesName');
        this.acceptCookiesDays = await settings.getSetting('acceptCookiesDays');
        this.acceptCookiesPath = await settings.getSetting('acceptCookiesPath');
        this.authorizePath = await settings.getSetting('authorizePath');

        if (ObjectType.is(this.settings.tls)) {
            this.scheme = 'https';
            await mkHttpLibraryHandle().setSecureMode();

            this.server = LibHttps.createServer({
                key: this.settings.tls.privateKey,
                cert: this.settings.tls.myCertificate,
                ca: this.settings.tls.caCertificate,
            }, (httpReq, httpRsp) => this.handleRequest(httpReq, httpRsp));

            this.settings.ipv4 ? this.server.listen(443, this.settings.ipv4) : null;
            this.settings.ipv6 ? this.server.listen(443, this.settings.ipv6) : null;
            this.server.on('upgrade', (...args) => this.onUpgrade(...args));
        }
        else {
            this.scheme = 'http';
        }

        this.server = LibHttp.createServer({}, (...args) => this.handleRequest(...args));
        this.settings.ipv4 ? this.server.listen(80, this.settings.ipv4) : null;
        this.settings.ipv6 ? this.server.listen(80, this.settings.ipv6) : null;
        this.server.on('upgrade', (...args) => this.onUpgrade(...args));
        return this;
    }

    async onUpgrade(httpReq, socket, headData) {
        let req = mkHttpRequest(this, httpReq);

        try {
            let libEntry = await this.library.get(req.getPath());

            if (libEntry && libEntry.type == 'httpx') {
                let httpx = await this.getHttpX({ libEntry: libEntry });

                if (httpx) {
                    let sessionCookie = req.getCookie(this.sessionCookieName);
                    let token = sessionCookie ? sessionCookie.getValue() : '';
                    let session = await mkSessionHandle().open(token);

                    if (await session.hasPermission('radius:websocket')) {
                        let secureKey = req.getHeader('sec-websocket-key');
                        let hash = await Crypto.hash('sha1', `${secureKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`);
                        let webSocket = mkWebSocket(socket, req.getHeader('sec-websocket-extensions'), headData);
                        
                        let headers = [
                            'HTTP/1.1 101 Switching Protocols',
                            'Upgrade: websocket',
                            'Connection: upgrade',
                            `Sec-WebSocket-Accept: ${hash}`,
                        ];
                        
                        if (webSocket.hasExtensions()) {
                            headers.push(`Sec-WebSocket-Extensions: ${webSocket.getSecWebSocketExtensions()}`);
                        }

                        headers.push('\r\n');
                        socket.write(headers.join('\r\n'));
                        
                        webSocket.on('DataReceived', data => {
                            httpx.handleWebSocket(data);
                        });
                    }
                }
            }
        }
        catch (e) {
            await caught(e);
        }
    }

    async respondData(handle) {
        if (handle.req.getMethod() == 'GET') {
            handle.mime = handle.libEntry.mime;
            handle.content = handle.libEntry.data;
            handle.httpFailure = false;
            handle.httpStatusCode = 200;
        }
        else {
            handle.httpFailure = true;
            handle.httpStatusCode = 405;
        }
    }

    async respondFile(handle) {
        if (handle.req.getMethod() == 'GET') {
            handle.mime = handle.libEntry.mime;
            handle.content = handle.libEntry.data;
            handle.httpFailure = false;
            handle.httpStatusCode = 200;
        }
        else {
            handle.httpFailure = true;
            handle.httpStatusCode = 405;
        }
    }

    async respondFunction(handle) {
        if (handle.req.getMethod() in { GET:0, POST:0 }) {
            let argumentsList = [];
            let variables = handle.req.getVariables();

            for (let arg in handle.libEntry.arg) {
                if (arg.name in variables) {
                    let value = variables[arg.name];

                    if (arg.type instanceof DataShape) {
                        if (arg.type.validate(value)) {
                            argumentsList.push(value);
                            continue;
                        }
                        else {
                            handle.httpFailure = true;
                            handle.httpStatusCode = 400;
                            handle.content = `Invalid value for "${arg.name}"`;
                            return;
                        }
                    }
                    else if (arg.type instanceof BaseType) {
                        if (arg.type.is(value)) {
                            argumentsList.push(value);
                            continue;
                        }
                        else {
                            handle.httpFailure = true;
                            handle.httpStatusCode = 400;
                            handle.content = `Invalid value for "${arg.name}"`;
                            return;
                        }
                    }
                }
                else {
                    handle.httpFailure = true;
                    handle.httpStatusCode = 400;
                    handle.content = `Missing variable "${arg.name}"`;
                    return;
                }
            }

            handle.mime = handle.libEntry.mime;
            let result = Reflect.apply(handle.libEntry.func, globalThis, argumentsList);
            handle.content = await wait(result);
            handle.httpFailure = false;
            handle.httpStatusCode = 200;
        }
        else {
            handle.httpFailure = true;
            handle.httpStatusCode = 405;
        }
    }

    async respondHttpx(handle) {
        let httpx = await this.getHttpX(handle);

        if (httpx) {
            try {
                let methodName = `handle${handle.req.getMethod()}`;
                let response = await httpx[methodName](handle);

                if (response === HttpX.NotAllowed) {
                    handle.httpFailure = true;
                    handle.httpStatusCode = 405;
                }
                else {
                    handle.httpFailure = false;
                    handle.httpStatusCode = response.status;
                    handle.mime = response.mime;
                    handle.content = response.content;
                }
            }
            catch (e) {
                handle.httpError = e;
                handle.httpFailure = true;
                handle.httpStatusCode = 500;
            }
        }
        else {
            handle.httpFailure = true;
            handle.httpStatusCode = 404;
        }
    }
});


/*****
 * A wrapper for the node JS builtin incoming request object.  This wrapper
 * has multiple purposes.  (1) provide a fast/simplified API for fetching data
 * that's often required.  (2) provide an asynchronous interface to all of the
 * base class's features, and (3) automatically load the HTTP request's body or
 * content when making a new HTTP request instance.
*****/
define(class HttpRequest {
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

    async getBody() {
        return new Promise((ok, fail) => {
            if (this.body) {
                this.object ? ok(this.object) : ok(this.body);
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
                        let mimeCode = this.getHeader('content-type');
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
                                ok(this.object);
                            }
                            catch (e) {}
                        }
                        else if (mimeCode == 'application/x-www-form-urlencoded') {
                            try {
                                this.object = LibQueryString.parse(this.body.value);
                                ok(this.object);
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
        if (this.hasHeader('cookie')) {
            for (let cookieString of TextUtils.split(this.getHeader('cookie'), '; ')) {
                let [ cookieName, cookieValue ] = cookieString.split('=');

                if (cookieName.trim() == name) {
                    return mkCookie(cookieString);
                }
            }
        }

        return null;
    }

    getCookieArray() {
        if (this.hasHeader('cookie')) {
            return TextUtils.split(this.getHeader('cookie'), '; ').map(cookieString => {
                return mkCookie(cookieString);
            });
        }

        return [];
    }

    getCookieMap() {
        let cookies = {};

        if (this.hasHeader('cookie')) {
            TextUtils.split(this.getHeader('cookie'), '; ').forEach(cookieString => {
                let cookie = mkCookie(cookieString);
                cookies[cookie.getName()] = cookie;
            });
        }

        return cookies;
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
        return this.getHeader('Content-Type');
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

    getRemoteHost() {
        return this.httpReq.socket.remoteAddress;
    }

    getScheme() {
        return this.isTls ? 'https' : 'http';
    }

    getSearch() {
        return this.parsedUrl.search !== null ? this.parsedUrl.search : '';
    }

    getUrl() {
        return this.httpReq.url !== null ? this.httpReq.url : '';
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

    hasVariables() {
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
define(class HttpResponse {
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
        this.cookies = {};
    }

    clearCookie(...cookies) {
        for (let cookie of cookies) {
            cookie.setExpires(mkTime(0));
            this.cookies[cookie.getName()] = cookie;
        }

        return this;
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

    hasHeader(name) {
        return this.httpRsp.hasHeader(name);
    }

    removeHeader(headerName) {
        this.httpRsp.removeHeader(headerName);
        return this;
    }

    respond(status, contentType, contentEncoding, content) {
        this.setContentType(contentType);
        this.setContentEncoding(contentEncoding ? contentEncoding : '');

        if (Object.keys(this.cookies).length) {
            this.httpRsp.setHeader(
                'Set-Cookie',
                Object.values(this.cookies).map(cookie => cookie.toString()),
            );
        }
        
        this.httpRsp.writeHead(status);
        this.httpRsp.end(content);
    }
    
    respondStatus(statusCode) {
        let statusText = HttpResponse.statusCodes[statusCode].text;

        let html = `<!DOCTYPE html>
            <html>
                <head>
                    <title>Server Response Code ${statusCode}</title>
                    <style>
                        html {
                            width: 100vw;
                            height: 100vh;
                            color: black;
                            background-color: white;
                        }
                        body {
                            margin: 0x;
                            padding: 20px;
                            font-size: 18px;
                            font-family: Verdana, Geneva, Tahoma, sans-serif;
                        }
                        .title {
                            margin-bottom: 32px;
                            font-size: 22px;
                            font-weight: bold;
                        }
                        .content {
                            font-size: 18px;
                        }
                    </style>
                </head>
                <body>
                    <div class="title">Server Responded with HTTP status ${statusCode}</div>
                    <div class="content">${statusText}</div>
                </body>
            </html>`
        
        if (statusCode in HttpResponse.statusCodes) {
            this.respond(statusCode, 'text/html', '', html);
        }
        else {
            statusCode = 500;
            this.respond(statusCode, 'text/html', '', html);
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

    setContentType(mimeInfo) {
        let mime = mimeInfo instanceof Mime ? mimeInfo : mkMime(mimeInfo);
        this.httpRsp.setHeader('Content-Type', mime.getCode());
        return this;
    }

    setCookie(...cookies) {
        for (let cookie of cookies) {
            this.cookies[cookie.getName()] = cookie;
        }

        return this;
    }

    setHeader(headerName, value) {
        this.httpRsp.setHeader(headerName, value);
        return this;
    }
});
