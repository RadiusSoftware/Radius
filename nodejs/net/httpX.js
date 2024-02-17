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
 * Base class for HTTP Extensions, which are the cornerstone for the Radius
 * HTTP server strategy for adding extensive features.  An HTTP Extension,
 * also known as HttpX, is a HttpServerWorker class that provides framework
 * for implementing server-side dynamic responses to requests.  This is the
 * basis for web applications and simpler algorithms such as realtime data
 * steaming.  What it does is accept an HTTP request and provides an frame-
 * work response employing shape:
 * 
 *      return {
 *          status: 200,
 *          contentType: 'application/json',
 *          contentEncoding: 'gzip',
 *          contentCharset: 'utf-8',
 *          content: toJson({
 *              why: 'WHY',
 *              how: 'HOW',
 *          }),
 *      };
 * 
 * The calling HttpServerWorker will then place this response into the HTTP
 * response object to br sent back to the browser.  For stub's sake, only
 * the GET handler is implemented in this class for demonstration purposes
 * only.  Other handlers / methods could include all of the REST methods.
*****/
register('', class HttpX extends Emitter {
    constructor() {
        super();
    }

    async handleGET(req) {
        return 501;
    }
});
