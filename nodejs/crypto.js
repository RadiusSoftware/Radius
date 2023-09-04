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
    *****/
    function exportKey(key, format, type, cipher, passphrase) {
        type = typeof type == 'string' ? type : 'pkcs1';

        if (typeof cipher == 'string' && typeof passphrase == 'string') {
            if (key.keyObj.type == 'private') {
                return key.keyObj.export({
                    type: type,
                    format: format,
                    cipher: cipher,
                    passphrase: passphrase,
                });
            }
        }

        return key.keyObj.export({
            type: type,
            format: format,
        });
    }


    /*****
    *****/
    function keyFromDer(der) {
        console.log(der);
    }


    /*****
    *****/
    function keyFromJwk(jwk) {
        console.log(jwk);
    }


    /*****
    *****/
    function keyFromPem(pem) {
        console.log(pem);
    }


    /*****
    *****/
    class AsymmetricKey {
        constructor(keyObj) {
            this.keyObj = keyObj;
        }

        getType() {
            return this.keyObj.type;
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
    }


    /*****
    *****/
    class SymmetricKey {
        constructor(keyObj, algorithm) {
            this.keyObj = keyObj;
            this.algorithm = algorithm;
        }

        decrypt(mode, iv, encrypted) {
            return new Promise(async (ok, fail) => {
                if (mode in { cbc:0 }) {
                    let chunks = [];

                    let decipher = crypto.createDecipheriv(
                        `${this.algorithm}-${this.keyObj.symmetricKeySize*8}-${mode}`,
                        this.keyObj,
                        iv,
                    );

                    decipher.on('readable', () => {
                      let chunk;

                      while (null !== (chunk = decipher.read())) {
                        chunks.push(chunk);
                      }
                    });

                    decipher.on('end', () => {
                        ok(Buffer.concat(chunks).toString('utf8'));
                    });

                    decipher.write(encrypted, 'base64');
                    decipher.end();
                }
                else {
                    fail(`Unsupported decipher mode ${mode}`);
                }
            });
        }

        encrypt(mode, clear) {
            return new Promise(async (ok, fail) => {
                if (mode in { cbc:0 }) {
                    let chunks = [];
                    const iv = await Crypto.generateRandomArray(this.keyObj.symmetricKeySize/2);

                    let cipher = crypto.createCipheriv(
                        `${this.algorithm}-${this.keyObj.symmetricKeySize*8}-${mode}`,
                        this.keyObj,
                        iv,
                    );

                    cipher.on('data', chunk => {
                        chunks.push(chunk);
                    });

                    cipher.on('end', () => {
                        ok({
                            b64: Buffer.concat(chunks).toString('base64'),
                            iv: iv,
                        });
                    });

                    cipher.write(clear);
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

        toDer(cipher, passphrase) {
            return exportKey(this, 'der', cipher, passphrase);
        }

        toJwk(cipher, passphrase) {
            return exportKey(this, 'jwk', cipher, passphrase);
        }

        toPem(cipher, passphrase) {
            return exportKey(this, 'pem', cipher, passphrase);
        }
    }


    /*****
    *****/
    class CertificateSigningRequest {
        constructor() {
        }
    }


    /*****
    *****/
    class Certificate {
        constructor() {
        }
    }


    /*****
    *****/
    singleton('', class Crypto {
        async createCsr(opts) {
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

        generateKeyAes(bits) {
            crypto.generateKey(algorithm, { lengths: bits }, (error, keyObject) => {
                ok(new SymmetricKey(keyObject, algorithm));
            });
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
                else if (algorithm == 'hmace') {
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
        }
        
        hash(algorithmName, value, encoding) {
            /*
            return new Promise((ok, fail) => {
                const hasher = CRYPTO.createHash(algorithmName);
                
                hasher.on('readable', () => {
                    let buffer = hasher.read();

                    if (buffer) {
                        switch (encoding) {
                            case 'base64':
                                ok(buffer.toString('base64'));
                                break;
                                
                            case 'base64url':
                                ok(
                                    buffer.toString('base64').split('=')[0]
                                    .replace(/[+]/g, '-').replace(/[\/]/g, '_')
                                );
                                break;
                                
                            case 'hex':
                                ok(buffer.toString('hex'));
                                break;

                            default:
                                ok(buffer);
                                break;
                        }
                    }
                });

                if (value instanceof Buffer || value instanceof Uint8Array) {
                    hasher.write(value);
                }
                else {
                    hasher.write(mkBuffer(value));
                }

                hasher.end();
            });
            */
        }

        importKey(arg) {
            if (arg instanceof Buffer) {
                return keyFromDer(arg);
            }
            else if (typeof arg == 'object') {
                return keyFromJwk(arg);
            }
            else if (typeof arg == 'string') {
                return keyFromPem(arg);
            }
        }

        async parseCertificateChain() {
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
            });
        }
    });
})();
/*
singleton('', class Crypto {
    
    decodeBase64Url(base64url, type) {
        let base64 = base64url.replaceAll('-', '+').replaceAll('_', '/');

        switch (base64.Length % 4)
        {
            case 0: break;
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }

        if (type == 'object') {
            return fromStdJson(mkBuffer(base64, 'base64').toString());
        }
        else if (type == 'base64') {
            return base64;
        }
        else {
            return mkBuffer(base64, 'base64').toString();
        }
    }
    
    digestSalted(algorithmName, value) {
        return new Promise((ok, fail) => {
            let hash = CRYPTO.createHash(algorithmName);
            let salt = Crypto.random(0, 1000000000000).toString();

            hash.on('readable', () => {
                let hashValue = hash.read();

                if (hashValue) {
                    ok({ hash: hashValue.toString('base64'), salt: salt });
                }
            });

            hash.write(value);
            hash.write(salt);
            hash.end();
        });
    }
    
    digestUnsalted(algorithmName, value) {
        return new Promise((ok, fail) => {
            let hash = CRYPTO.createHash(algorithmName);

            hash.on('readable', () => {
                let hashValue = hash.read();

                if (hashValue) {
                    ok(hashValue.toString('base64'));
                }
            });

            hash.write(value);
            hash.end();
        });
    }
    
    encodeBase64Url(value) {        
        if (value instanceof Buffer) {
            return value.toString('base64')
                .split('=')[0]
                .replaceAll('+', '-')
                .replaceAll('/', '_');
        }
        else if (typeof value == 'object') {
            return mkBuffer(toStdJson(value))
                .toString('base64')
                .split('=')[0]
                .replaceAll('+', '-')
                .replaceAll('/', '_');
        }
        else {
            return mkBuffer(value)
                .toString('base64')
                .split('=')[0]
                .replaceAll('+', '-')
                .replaceAll('/', '_');
        }
    }
    
    sign(alg, pem, value, encoding) {
        let signer = CRYPTO.createSign(alg);
        signer.write(value);
        signer.end();
        
        switch (encoding) {
            case 'base64':
                return signer.sign(pem, 'base64');
                
            case 'base64url':
                return signer.sign(pem, 'base64').split('=')[0]
                        .replace(/[+]/g, '-').replace(/[\/]/g, '_');
                
            case 'hex':
                return signer.sign(pem, 'hex');

            default:
                return signer.sign(pem);
        }
    }
    
    signHmac(alg, key, content, encoding) {
        let signer = CRYPTO.createHmac(alg, key);
        signer.update(content);
        let hmac = signer.digest();

        switch (encoding) {
            case 'base64':
                return hmac.toString('base64');
                
            case 'base64url':
                return hmac.toString('base64').split('=')[0]
                        .replace(/[+]/g, '-').replace(/[\/]/g, '_');
                
            case 'hex':
                return hmac.toString('hex');

            default:
                return hmac;
        }
    }
});*/