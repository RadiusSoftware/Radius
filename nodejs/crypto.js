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
const crypto = require('node:crypto');


(() => {
    /*****
     * Exports a KeyObject value to one of four formats: pem, der, jwk or simple
     * buffer in the case of a symmetric key.  Private keys can be optionally
     * protected by encrypting them with a provided cipher and a passphrase.
     * This function supports public keys, private keys, and secret keys, of
     * which AES and HMAC are supported at this time.  Hence, this function is
     * called for both Asymmetric and Symmetric keys.  The exported format is
     * called a Radius KeyBlob, which is an object contain all that's required
     * to restore the key to it's former value by the Radius framework using
     * a single call to Crypto.importKey().
    *****/
    function exportKey(key, format, type, cipher, passphrase) {
        type = typeof type == 'string' ? type : 'pkcs1';

        if (typeof cipher == 'string' && typeof passphrase == 'string') {
            if (key.keyObj.type == 'private') {
                return {
                    key: key.keyObj.export({
                        type: type,
                        format: format,
                        cipher: cipher,
                        passphrase: passphrase,
                    }),
                    keyType: key.keyObj.type,
                    format: format,
                    type: type,
                    cipher: cipher,
                    passpharse: passphrase,
                };
            }
        }

        if (format == 'buffer') {
            return {
                key: key.keyObj.export({
                    type: type,
                    format: format,
                }),
                keyType: key.keyObj.type,
                format: format,
            };
        }
        else {
            return {
                key: key.keyObj.export({
                    type: type,
                    format: format,
                }),
                keyType: key.keyObj.type,
                format: format,
                type: type,
            };
        }
    }


    /*****
     * An asymmetic key is either a public or private key, and is often generate
     * by the RSA algorithm.  An asymmetric needs to be paired up with its
     * counterpart in order to be useful.  Asymmetric keys can be exported in
     * either PEM, DER, and/or as a JWK object.
    *****/
    class AsymmetricKey {
        constructor(keyObj) {
            this.keyObj = keyObj;
        }

        decrypt(buffer) {
            if (this.getType() == 'public') {
                return crypto.publicDecrypt(this.keyObj, buffer);
            }
            else {
                return crypto.privateDecrypt(this.keyObj, buffer);
            }
        }

        encrypt(buffer) {
            if (this.getType() == 'public') {
                return crypto.publicEncrypt({
                    key: this.keyObj,
                }, buffer);
            }
            else {
                return crypto.privateEncrypt({
                    key: this.keyObj,
                }, buffer);
            }
        }

        getType() {
            return this.keyObj.type;
        }

        sign() {
            // TODO
        }

        toDer(cipher, passphrase) {
            return exportKey(this, 'der', cipher, passphrase);
        }

        toJwk(cipher, passphrase) {
            return exportKey(this, 'jwk', cipher, passphrase);
        }

        toPem(cipher, passphrase) {
            return exportKey(this, 'pem', cipher, passphrase);
        }

        verify() {
            // TODO
        }
    }


    /*****
     * A symmetric or secret key is the shared secret used by partners, Bob and
     * Alice, when securely exchaning data.  The symmetric key provides the
     * ability to encrypt and decrypt data using the shared key supported with
     * the methods in this class.  Supported encryption algorithms, e.g., AES,
     * are employed as expected.  Other algorithms, such as HMAC, are used for
     * signature and verification purposes.
    *****/
    class SymmetricKey {
        constructor(keyObj, algorithm) {
            this.keyObj = keyObj;
            this.algorithm = algorithm;
        }

        decrypt(mode, vector, buffer) {
            return new Promise(async (ok, fail) => {
                if (mode in { cbc:0 }) {
                    let chunks = [];

                    let decipher = crypto.createDecipheriv(
                        `${this.algorithm}-${this.keyObj.symmetricKeySize*8}-${mode}`,
                        this.keyObj,
                        vector,
                    );

                    decipher.on('readable', () => {
                      let chunk;

                      while (null !== (chunk = decipher.read())) {
                        chunks.push(chunk);
                      }
                    });

                    decipher.on('end', () => {
                        ok(Buffer.concat(chunks));
                    });

                    decipher.write(buffer);
                    decipher.end();
                }
                else {
                    fail(`Unsupported decipher mode ${mode}`);
                }
            });
        }

        encrypt(mode, buffer) {
            return new Promise(async (ok, fail) => {
                if (mode in { cbc:0 }) {
                    let chunks = [];
                    const vector = await Crypto.generateRandomArray(this.keyObj.symmetricKeySize/2);

                    let cipher = crypto.createCipheriv(
                        `${this.algorithm}-${this.keyObj.symmetricKeySize*8}-${mode}`,
                        this.keyObj,
                        vector,
                    );

                    cipher.on('data', chunk => {
                        chunks.push(chunk);
                    });

                    cipher.on('end', () => {
                        ok({
                            value: Buffer.concat(chunks),
                            vector: vector,
                        });
                    });

                    cipher.write(buffer);
                    cipher.end();
                }
                else {
                    fail(`Unsupported cipher mode ${mode}`);
                }
            });
        }

        getType() {
            return this.keyObj.type;
        }

        sign() {
            // TODO
        }

        toBuffer(cipher, passphrase) {
            return exportKey(this, 'buffer', cipher, passphrase);
        }

        toJwk(cipher, passphrase) {
            return exportKey(this, 'jwk', cipher, passphrase);
        }

        verify() {
            // TODO
        }
    }


    /*****
    *****/
    class CertificateSigningRequest {
        constructor() {
            // TODO
        }
    }


    /*****
    *****/
    class Certificate {
        constructor() {
            // TODO
        }
    }


    /*****
    *****/
    singleton('', class Crypto {
        async createCsr(opts) {
            // TODO
            /*
            let csrTemp;
            let derTemp;
            let pkeyTemp;

            try {
                csrTemp = await writeTemp('');
                pkeyTemp = await writeTemp(opts.privateKey);

                let subj = `/C=${opts.country}/ST=${opts.state}/L=${opts.locale}/O=${opts.org}/CN=${opts.hostname}`;
                await execShell(`openssl req -new -key ${pkeyTemp.path} -out ${csrTemp.path} -days ${opts.days} -subj "${subj}"`);

                if (opts.der) {
                    derTemp = await writeTemp('');
                    await execShell(`openssl req -in ${csrTemp.path} -out ${derTemp.path} -outform DER`);
                    return await derTemp.read();
                }
                else {
                    return (await csrTemp.read()).toString();
                }
            }
            finally {
                csrTemp ? await csrTemp.rm() : false;
                derTemp ? await derTemp.rm() : false;
                pkeyTemp ? await pkeyTemp.rm() : false;
            }
            */
        }

        generateKey(algorithm, bits) {
            return new Promise((ok, fail) => {
                if (algorithm == 'aes') {
                    if (bits != 128 && bits != 192 && bits != 256) {
                        fail(`Unsupported AES bits: ${bits}`);
                    }
                    else {
                        crypto.generateKey('aes', { length: bits }, (error, keyObject) => {
                            ok(new SymmetricKey(keyObject, algorithm));
                        });
                    }
                }
                else if (algorithm == 'hmac') {
                    if (bits < 8 || bits >= 64) {
                        fail(`Unsupported HMAC bits: ${bits}`)
                    }
                    else {
                        crypto.generateKey('hmac', { length: bits }, (error, keyObject) => {
                            ok(new SymmetricKey(keyObject, algorithm));
                        });
                    }
                }
                else {
                    fail(`Unsupported Algorithm: ${algorithm}`);
                }
            });
        }

        generateKeyPair(algorithm, bits, opts) {
            return new Promise((ok, fail) => {
                opts = typeof opts == 'object' ? opts : {};
                opts.modulusLength = bits;

                crypto.generateKeyPair(algorithm, opts, (error, publicKey, privateKey) => {
                    if (error) {
                        fail(error);
                    }
                    else {
                        ok({
                            publicKey: new AsymmetricKey(publicKey),
                            privateKey: new AsymmetricKey(privateKey),
                        });
                    }
                });
            });
        }

        generateRandomArray(count) {
            return new Promise((ok, fail) => {
                crypto.randomFill(new Uint8Array(count), (error, array) => {
                    ok(array);
                });
            });
        }

        generateRandomInt(min, max) {
            return new Promise((ok, fail) => {
                if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
                    throw new Error('Parameter not a safe integer.');
                }
                else if (min >= max) {
                    throw new Error('Parameter min >= max.');
                }

                crypto.randomInt(min, max, (error, n) => {
                    if (error) {
                        fail(error);
                    }
                    else {
                        ok(n);
                    }
                });
            });
        }

        async generateSshKeyPair() {
            // TODO
        }

        listEm() {
            for (let em of crypto.getHashes()) {
                console.log(em);
            }
        }
        
        hash(algorithm, buffer) {
            return new Promise((ok, fail) => {
                const hasher = crypto.createHash(algorithm);

                hasher.on('readable', () => {
                    let hashed = hasher.read();

                    if (hashed) {
                        ok(hashed);
                    }
                });

                hasher.write(buffer);
                hasher.end();
            });
        }

        hmac(buffer) {
            return new Promise((ok, fail) => {
                // TODO
            });
        }

        importKey(keyExport) {
            if (keyExport.keyType == 'public') {
                return crypto.createPublicKey({
                    key: keyExport.key,
                    format: keyExport.format,
                    type: keyExport.type,
                });
            }
            else if (keyExport.keyType == 'private') {
                return crypto.createPrivateKey({
                    key: keyExport.key,
                    format: keyExport.format,
                    type: keyExport.type,
                    passphrase: keyExport.passpharse,
                });
            }
            else if (keyExport.keyType == 'secret') {
                if (keyExport.format == 'jwk') {
                    return crypto.createSecretKey(keyExport.key.k);
                }
                else if (keyExport.format == 'buffer') {
                    return crypto.createSecretKey(keyExport.key);
                }
            }
        }

        async parseCertificateChain() {
            // TODO
            /*
            let pemChain = certificateChain.split('\n\n');
            let pemChainTemp = await writeTemp(pemChain[0]);

            let result = await execShell(`openssl x509 -in ${pemChainTemp.path} -enddate -noout`);
            let expires = mkTime(result.stdout.split('=')[1]);
            result = await execShell(`openssl x509 -in ${pemChainTemp.path} -subject -noout`);
            let subject = result.stdout;
            
            await pemChainTemp.rm();

            return {
                expires: expires,
                subject: subject,
                created: mkTime(),
                certificate: pemChain,
            };
            */
        }

        scrypto(value, salt) {
            return new Promise((ok, fail) => {
                // TODO
            });
        }
    });
})();