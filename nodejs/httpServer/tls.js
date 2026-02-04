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
 * An instance of a TLS certificate requires a hostname, public crypto data,
 * and of course the certficate data.  In our model, a single interface is
 * enabled to have multiple multtiple hostnames, each of which may have its
 * own certificate.
*****/
define(class Tls {
    constructor(opts) {
        this.hostName = typeof opts.hostName == 'string' ? opts.hostName : '';
        this.publicKey = opts.publicKey == 'string' ? opts.publicKey : '';
        this.privateKey = opts.privateKey == 'string' ? opts.privateKey : '';
        this.cert = opts.cert == 'string' ? opts.cert : '';
        this.caCert = opts.caCert == 'string' ? opts.caCert : '';
    }

    getCaCert() {
        return this.caCert;
    }

    getCert() {
        return this.cert;
    }

    getHostName() {
        return this.hostName;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getPrivateKey() {
        return this.privateKey;
    }

    isValid() {
        if (!typeof this.hostName) return false;
        if (!typeof this.publicKey) return false;
        if (!typeof this.privateKey) return false;
        if (!typeof this.cert) return false;
        if (!typeof this.caCert) return false;
        return true;
    }
});
