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
const crypta = require('node:crypto');


/*****
 * Framework implementation of an AES key, which is used for encryption and
 * decryption.  The key length may be either 128, 192, or 256 bits, the longest
 * of which is the most secure.  In essence, the AES key is generated to be
 * represented in base64 format.  Moreover, the encrypt() method returns the
 * encrypted value as a buffer.  The input to the decrypt() must be either a
 * buffer or a base64 representation of a buffer.
*****/
register('crypto', class Aes {
    constructor(arg, base64) {
        return new Promise(async (ok, fail) => {
            if (typeof arg == 'object' && arg.algorithm == 'aes') {
                this.algorithm = 'aes';
                this.bits = arg.bits;
                this.base64 = arg.base64;
                ok(this);
            }
            else if (typeof base64 == 'string') {
                this.algorithm = 'aes';
                this.bits = arg;
                this.base64 = base64;
                ok(this);
            }
            else {
                if (arg == 128 || arg == 192 || arg == 256) {
                    crypta.generateKey('aes', { length: arg }, (error, keyObj) => {
                        if (error) {
                            fail(`\nFailed to generate symmetric key.\n${error}`);
                        }
                        else {
                            this.algorithm = 'aes';
                            this.bits = arg;

                            this.base64 = keyObj.export({
                                format: 'buffer',
                            }).toString('base64');

                            ok(this);
                        }
                    });
                }
                else {
                    fail(`\Symmetric key paremters failed verification: bits=${arg}.`);
                }
            }
        });
    }

    decrypt(encrypted, mode) {
        return new Promise(async (ok, fail) => {
            let chunks = [];
            mode = typeof mode == 'undefined' ? 'cbc' : mode;

            let decipher = crypta.createDecipheriv(
                `aes-${this.bits}-${mode}`,
                mkBuffer(this.base64, 'base64'),
                this.iv,
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

            decipher.write(encrypted instanceof Buffer ? encrypted : mkBuffer(base64, 'base64'));
            decipher.end();
        });
    }

    encrypt(buffer, mode) {
        return new Promise(async (ok, fail) => {
            let chunks = [];
            mode = typeof mode == 'undefined' ? 'cbc' : mode;
            this.iv = await Crypto.generateRandomArray(16);

            let cipher = crypta.createCipheriv(
                `aes-${this.bits}-${mode}`,
                mkBuffer(this.base64, 'base64'),
                this.iv,
            );

            cipher.on('data', chunk => {
                chunks.push(chunk);
            });

            cipher.on('end', () => {
                ok(Buffer.concat(chunks));
            });

            cipher.write(buffer);
            cipher.end();
        });
    }

    getIv() {
        return this.iv;
    }

    setIv(iv) {
        this.iv = iv;
        return this;
    }
});


/*****
 * The global singleton that provides crypto-related utility functions that are
 * both self serving and also used by classes and functions in the global crypto
 * namespace.
*****/
singleton('', class Crypto {
    generateKeyPair(algorithm, opts) {
        return new Promise((ok, fail) => {
            /*
            opts = typeof opts == 'object' ? opts : {};
            opts.modulusLength = opts.bits;

            crypta.generateKeyPair(algorithm, opts, (error, publicKey, privateKey) => {
                if (error) {
                    fail(error);
                }
                else {
                    ok({
                        publicKey: radius.mkAsymmetricKey(publicKey, algorithm),
                        privateKey: radius.mkAsymmetricKey(privateKey, algorithm),
                    });
                }
            });
            */
        });
    }

    generateRandomArray(count) {
        return new Promise((ok, fail) => {
            crypta.randomFill(new Uint8Array(count), (error, array) => {
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

            crypta.randomInt(min, max, (error, n) => {
                if (error) {
                    fail(error);
                }
                else {
                    ok(n);
                }
            });
        });
    }
});


// ***************************************************************************
// ***************************************************************************
// ***************************************************************************
// ***************************************************************************
// ***************************************************************************
// ***************************************************************************
// ***************************************************************************


/*****
 * An asymmetic key is either a public or private key, and is often generated
 * by the RSA algorithm.  An asymmetric key needs to be paired up with its
 * counterpart in order to be useful.  Asymmetric keys can be exported in
 * either PEM, DER, and/or as a JWK object.  Additionally, key pairs can be
 * used for signing and verifying encrypted and unencrypted messages or data
 * blocks.
*****/
register('crypto', class AsymmetricKey {
    constructor(keyObj, algorithm) {
        return new Promise(async (ok, fail) => {
            this.algorithm = algorithm;
            this.bits = keyObj.asymmetricKeyDetails.modulusLength;
        });
    }

    decrypt(buffer) {
        if (this.keyObj.type == 'public') {
            return crypto.publicDecrypt(this.keyObj, buffer);
        }
        else {
            return crypto.privateDecrypt(this.keyObj, buffer);
        }
    }

    encrypt(buffer) {
        if (this.keyObj.type == 'public') {
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
});


/*****
 * TODO
*****/
register('crypto', class Certificate {
    constructor(certificateBundle) {
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

    export() {
    }

    toPem() {
    }
});


/*****
 * TODO
*****/
register('crypto', class CertificateRequest {
    constructor(opts) {
        this.opts = opts;
    }

    build() {
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

    export() {
    }

    toPem() {
    }
});


/*****
 * The implementation of a hashing or message digest function.  The hash
 * generates a single value based on the algorithm and the values provided
 * to the digest function.  The final result is returned in base64 format.
*****/
register('crypto', class Hash {
    constructor(algorithm) {
        this.cryptoClass = 'Hash';
        this.algorithm = algorithm;
    }

    digest(...values) {
        return new Promise((ok, fail) => {
            const hash = crypto.createHash(this.algorithm);

            hash.on('readable', () => {
                let hashed = hash.read();

                if (hashed) {
                    ok(hashed.toString('base64'));
                }
            });

            for (let value of values) {
                if (typeof value != 'undefined') {
                    if (value instanceof Buffer) {
                        hash.write(value);
                    }
                    else {
                        hash.write(mkBuffer(value));
                    }
                }
            }

            hash.end();
        });
    }
});


/*****
 * TODO
*****/
register('crypto', class Hmac {
    constructor(algorithm, keyObj) {
        this.algorithm = algorithm;
        this.symmetricKey = keyObj;
    }

    digest() {
    }

    export() {
        return {
            bundleClass: 'Hmac',
            algorithm: this.algorithm,
            key: this.symmetricKey.export(),
        };
    }

    sign(value) {
    }

    verify(signed) {
    }
});


/*****
 * TODO
*****/
register('crypto', class Scrypt {
    constructor() {
    }

    export() {
    }
});


/*****
 * TODO
*****/
register('crypto', class Sign {
    constructor(algorithm) {
        this.sign = crypto.createSign(algorithm);
        this.algorithm = algorithm;
    }

    export() {
        return {
            bundleClass: 'Sign',
            algorithm: this.algorithm,
        };
    }

    sign(value) {
    }

    update(value) {
    }

    write(value) {
    }
});


/*****
 * TODO
*****/
register('crypto', class Verify {
    constructor(algorithm) {
        this.sign = crypto.createSign(algorithm);
        this.algorithm = algorithm;
    }

    export() {
        return {
            bundleClass: 'Sign',
            algorithm: this.algorithm,
        };
    }

    sign(value) {
    }

    update(value) {
    }

    write(value) {
    }
});
/*
(() => {
    /*****
     * Several crypto classes employ the features of the CryptoKey base class.
     * In effect, the crypto key is an information container that usefule for
     * exporting crypto objects into a crypto bundle, which is how we retain the
     * data when exporting a crypto object.  Pleaase note that crypto objects
     * not extending CryptoKey are responsible for their own unique export func
     * for returning a cryptoBundle.
    *****
    register('radius', class CryptoKey {
        constructor(keyObj) {
            this.keyObj = keyObj;
        }

        export(opts) {
            opts = typeof opts == 'object' ? opts : {};

            let cryptoBundle = {
                bundleClass: Reflect.getPrototypeOf(this).constructor.name,
                algorithm: this.algorithm,
                bits: this.bits,
                format: opts.format,
                key: null,
            };

            if (this.keyObj.type == 'private') {
                let type;

                if (this.algorithm = 'rsa') {
                    type = 'pkcs1';
                }
                else if (this.algorithm == 'ec') {
                    type = 'sec1';
                }
                else {
                    type = 'pkcs8';
                }

                if (opts.format == 'pem' || typeof opts.format == 'undefined') {
                    cryptoBundle.format = 'pem';

                    cryptoBundle.key = this.keyObj.export({
                        type: type,
                        format: 'pem',
                        cipher: this.cipher,
                        passphrase: this.passphrase,
                        encoding: 'base64',
                    });
                }
                else if (opts.format == 'der') {
                    cryptoBundle.key = this.keyObj.export({
                        type: type,
                        format: opts.format,
                        cipher: this.cipher,
                        passphrase: this.passphrase,
                    }).toString('base64');
                }
                else if (opts.format == 'jwk') {
                    cryptoBundle.key = this.keyObj.export({
                        type: type,
                        format: opts.format,
                        cipher: this.cipher,
                        passphrase: this.passphrase,
                    });
                }

                cryptoBundle.type = type;
                cryptoBundle.keyType = 'private';
            }
            else if (this.keyObj.type == 'public') {
                let type;
                
                if (this.algorithm = 'rsa') {
                    type = 'pkcs1';
                }
                else {
                    type = 'spki';
                }

                if (opts.format == 'pem' || typeof opts.format == 'undefined') {
                    cryptoBundle.format = 'pem';

                    cryptoBundle.key = this.keyObj.export({
                        type: type,
                        format: 'pem',
                    });
                }
                else if (opts.format == 'der') {
                    cryptoBundle.key = this.keyObj.export({
                        type: type,
                        format: opts.format,
                    }).toString('base64');
                }
                else if (opts.format == 'jwk') {
                    cryptoBundle.key = this.keyObj.export({
                        type: type,
                        format: opts.format,
                    });
                }

                cryptoBundle.type = type;
                cryptoBundle.keyType = 'public';
            }
            else if (this.keyObj.type == 'secret') {
                if (opts.format == 'buffer' || typeof opts.format == 'undefined') {
                    cryptoBundle.format = 'buffer';

                    cryptoBundle.key = this.keyObj.export({
                        format: 'buffer',
                    }).toString('base64');
                }
                else if (opts.format == 'jwk') {
                    cryptoBundle.key = this.keyObj.export({
                        format: opts.format,
                    });
                }

                cryptoBundle.type = '';
            }

            return cryptoBundle;
        }

        getAlgorithm() {
            return this.algorithm;
        }

        getBits() {
            return this.bits;
        }
    });
    */


    /*****
    *****
    singleton('', class Crypto {
        createCertification(certificateBundle) {
            // TODO
        }
        
        createHash(arg) {
            if (typeof arg == 'object') {
                return radius.mkHash(arg.algorithm);
            }
            else {
                return radius.mkHash(arg);
            }
        }

        createHmac(hmac) {
            // TODO
            return radius.mkHmac(algorithm, symmetricKey);
        }

        createSign(algorithm) {
            // TODO
            return radius.mkSign(algorithm);
        }

        createScrypt(algorithm) {
            // TODO
        }

        createSshKeyPair(opts) {
            // TODO
        }

        async generateHmac(algorithm, bits) {
            // TODO
            return await radius.Hmac(algorithm, bits);
        }

        generateKeyPair(algorithm, opts) {
            // TODO
            return new Promise((ok, fail) => {
                opts = typeof opts == 'object' ? opts : {};
                opts.modulusLength = opts.bits;

                crypto.generateKeyPair(algorithm, opts, (error, publicKey, privateKey) => {
                    if (error) {
                        fail(error);
                    }
                    else {
                        ok({
                            publicKey: radius.mkAsymmetricKey(publicKey, algorithm),
                            privateKey: radius.mkAsymmetricKey(privateKey, algorithm),
                        });
                    }
                });
            });
        }

        generateRandomArray(count) {
            // TODO
            return new Promise((ok, fail) => {
                crypto.randomFill(new Uint8Array(count), (error, array) => {
                    ok(array);
                });
            });
        }

        generateRandomInt(min, max) {
            // TODO
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

        generateSymmetricKey(algorithm, bits) {
            return new Promise((ok, fail) => {
                crypto.generateKey(algorithm, { length: bits }, (error, keyObj) => {
                    if (error) {
                        fail(`\nFailed to generate symmetric key.\n${error}`);
                    }
                    else {
                        let base64 = keyObj.export({
                            format: 'buffer',
                        }).toString('base64');

                        ok(radius.mkSymmetricKey(algorithm, base64));
                    }
                });
            });
        }
        /*
        import(cryptoBundle) {
            if (cryptoBundle.bundleClass == 'SymmetricKey') {
                if (cryptoBundle.format == 'buffer') {
                    return radius.mkSymmetricKey(
                        crypto.createSecretKey(cryptoBundle.key, 'hex'),
                        cryptoBundle.algorithm,
                    );
                }
                else if (cryptoBundle.format == 'jwk') {
                    return radius.mkSymmetricKey(
                        crypto.createSecretKey(cryptoBundle.key.k, 'base64'),
                        cryptoBundle.algorithm,
                    );
                }
            }
            else if (cryptoBundle.bundleClass == 'AsymmetricKey') {
                if (cryptoBundle.keyType == 'private') {
                    if (cryptoBundle.format == 'pem') {
                        return radius.mkAsymmetricKey(
                            crypto.createPrivateKey({
                                key: cryptoBundle.key,
                                format: cryptoBundle.format,
                                type: cryptoBundle.type,
                                passphrase: cryptoBundle.passphrase,
                            }),
                            cryptoBundle.algorithm,
                        );
                    }
                    else if (cryptoBundle.format == 'der') {
                        return radius.mkAsymmetricKey(
                            crypto.createPrivateKey({
                                key: cryptoBundle.key,
                                format: cryptoBundle.format,
                                type: cryptoBundle.type,
                                passphrase: cryptoBundle.passphrase,
                                encoding: 'base64',
                            }),
                            cryptoBundle.algorithm,
                        );
                    }
                    else if (cryptoBundle.format == 'jwk') {
                        return radius.mkAsymmetricKey(
                            crypto.createPrivateKey({
                                key: cryptoBundle.key,
                                format: cryptoBundle.format,
                                type: cryptoBundle.type,
                                passphrase: cryptoBundle.passphrase,
                            }),
                            cryptoBundle.algorithm,
                        );
                    }
                }
                else if (cryptoBundle.keyType == 'public') {
                    if (cryptoBundle.format == 'pem') {
                        return radius.mkAsymmetricKey(
                            crypto.createPublicKey({
                                key: cryptoBundle.key,
                                format: cryptoBundle.format,
                                type: cryptoBundle.type,
                            }),
                            cryptoBundle.algorithm,
                        );
                    }
                    else if (cryptoBundle.format == 'der') {
                        return radius.mkAsymmetricKey(
                            crypto.createPublicKey({
                                key: cryptoBundle.key,
                                format: cryptoBundle.format,
                                type: cryptoBundle.type,
                                encoding: 'base64',
                            }),
                            cryptoBundle.algorithm,
                        );
                    }
                    else if (cryptoBundle.format == 'jwk') {
                        return radius.mkAsymmetricKey(
                            crypto.createPublicKey({
                                key: cryptoBundle.key,
                                format: cryptoBundle.format,
                                type: cryptoBundle.type,
                            }),
                            cryptoBundle.algorithm,
                        );
                    }
                }
            }
            else if (cryptoBundle.bundleClass == 'Hash') {
                return radius.mkHash(cryptoBundle.algorithm);
            }
            else if (cryptoBundle.bundleClass == 'Hmac') {
                return radius.mkHmac(cryptoBundle.algorithm, cryptoBundle.key);
            }
            else if (cryptoBundle.bundleClass == 'Sign') {
            }
            else if (cryptoBundle.bundleClass == 'Verify') {
            }
        }
    });
})();
*/