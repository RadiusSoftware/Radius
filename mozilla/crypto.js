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
let crypto = Crypto ? Crypto : null;


/*****
 * This is a smartish wrapper for available browser features with regards to
 * cryptographic facilities.  Note that the Crypto features are not available
 * with an open scheme, i.e., HTTP rather than HTTPS.  Hence, there may be
 * limited availablity for a server that hasn't gotten it's certification or
 * if it's certificate has expired.
*****/
singleton(class Crypto {
    generateUUID() {
        const blob = new Blob([''], { type: 'text/plain' });
        const urlString = URL.createObjectURL(blob);
        const url = new URL(urlString.replace('blob:', ''));
        const uuid = url.pathname.substring(1);
        URL.revokeObjectURL(urlString);
        return uuid;
    }
});
