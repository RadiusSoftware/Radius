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
const LibCrypto = require('node:crypto');


/*****
 * A collection of useful functions related to cryptolographic features within
 * nodeJS and functions related to dealing with TLS, ACME protocol, and other
 * security related technologies.  Most developer application code will not
 * directly apply these features.  However, other internal libraries that
 * provide simplified APIs do require this library such as the ACME protocol
 * and the JOSE library, which implements java web objects such as JWTs.
 * Where possible, nodeJS functions are preferred over using openssl via a
 * child process, and single functions are implemented to deal with multiple
 * cyrptographic type such as the sign() and verify() functions, both of
 * which accept any supported cryptographic KeyObject.
*****/
singleton('', class Crypto {
    createAesKey(base64) {
        return LibCrypto.createSecretKey(base64, 'base64');
    }

    async createCertificateSigningRequest(opts) {
        let csrTemp;
        let derTemp;
        let pkeyTemp;

        try {
            let pem = this.export(opts.privateKey);
            csrTemp = await ServerUtils.createTempFile();
            pkeyTemp = await (ServerUtils.createTempFile()).append(pem);

            let subj = `/C=${opts.country}/ST=${opts.state}/L=${opts.locale}/O=${opts.org}/CN=${opts.hostname}`;
            await ServerUtils.execInShell(`openssl req -new -key ${pkeyTemp.getPath()} -out ${csrTemp.getPath()} -days ${opts.days} -subj "${subj}"`);

            if (opts.der) {
                derTemp = await createTempFile();
                await ServerUtils.execInShell(`openssl req -in ${csrTemp.getPath()} -out ${derTemp.getPath()} -outform DER`);
                return await derTemp.read();
            }
            else {
                return (await csrTemp.read()).toString();
            }
        }
        finally {
            csrTemp ? await csrTemp.delete() : false;
            derTemp ? await derTemp.delete() : false;
            pkeyTemp ? await pkeyTemp.delete() : false;
        }
    }

    createHmac(algorithm, aesKey) {
        let hmac = LibCrypto.createHmac(algorithm, aesKey);
        hmac._algorithm = algorithm;
        hmac._aesKey = aesKey;
        return hmac;
    }

    createPrivateKey(pem) {
        return LibCrypto.createPrivateKey(pem);
    }

    createPublicKey(pem) {
        return LibCrypto.createPublicKey(pem);
    }

    decrypt(keyObj, data, iv, mode) {
        return new Promise(async (ok, fail) => {
            if (keyObj.type == 'public') {
                ok(LibCrypto.publicDecrypt(
                    keyObj,
                    data instanceof Buffer ? data : mkBuffer(data, 'base64'),
                ));
            }
            else if (keyObj.type == 'private') {
                ok(LibCrypto.privateDecrypt(
                    keyObj,
                    data instanceof Buffer ? data : mkBuffer(data, 'base64'),
                ));
            }
            else {
                let chunks = [];
                mode = typeof mode == 'undefined' ? 'cbc' : mode;
    
                let decipher = LibCrypto.createDecipheriv(
                    `aes-${keyObj.symmetricKeySize*8}-${mode}`,
                    keyObj,
                    iv,
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
    
                decipher.write(data);
                decipher.end();
            }
        });
    }

    encrypt(keyObj, data, mode) {
        return new Promise(async (ok, fail) => {
            if (keyObj.type == 'public') {
                ok(LibCrypto.publicEncrypt(
                    keyObj,
                    data instanceof Buffer ? data : mkBuffer(data),
                ));
            }
            else if (keyObj.type == 'private') {
                ok(LibCrypto.privateEncrypt(
                    keyObj,
                    data instanceof Buffer ? data : mkBuffer(data),
                ));
            }
            else {
                let chunks = [];
                mode = typeof mode == 'undefined' ? 'cbc' : mode;
                let iv = await this.generateRandomArray(16);
    
                let cipher = LibCrypto.createCipheriv(
                    `aes-${keyObj.symmetricKeySize*8}-${mode}`,
                    keyObj,
                    iv,
                );
    
                cipher.on('data', chunk => {
                    chunks.push(chunk);
                });
    
                cipher.on('end', () => {
                    ok({
                        data: Buffer.concat(chunks),
                        iv: iv,
                    });
                });
    
                cipher.write(data);
                cipher.end();
            }
        });
    }

    export(keyObj) {
        if (keyObj.type == 'public') {
            return keyObj.export({
                type: 'pkcs1',
                format: 'pem',
                encoding: 'base64',
            });
        }
        else if (keyObj.type == 'private') {
            return keyObj.export({
                type: 'pkcs1',
                format: 'pem',
                encoding: 'base64',
            });
        }
        else {
            return keyObj.export({
                format: 'buffer',
            }).toString('base64');
        }
    }

    generateAesKey(bits) {
        return new Promise(async (ok, fail) => {
            if (bits == 128 || bits == 192 || bits == 256) {
                LibCrypto.generateKey('aes', { length: bits }, (error, keyObj) => {
                    if (error) {
                        fail(`\nFailed to generate AES key.\n${error}`);
                    }
                    else {
                        ok(keyObj);
                    }
                });
            }
            else {
                fail(`\Symmetric key paremters failed verification: bits=${arg}.`);
            }
        });
    }

    generateKeyPair(algorithm, opts) {
        return new Promise((ok, fail) => {
            let options = {
                modulusLength: opts && opts.bits ? opts.bits : 4096,
            };

            LibCrypto.generateKeyPair(algorithm, options, (error, publicKey, privateKey) => {
                if (error) {
                    fail(error);
                }
                else {
                    ok({
                        publicKey: publicKey,
                        privateKey: privateKey,
                    });
                }
            });
        });
    }

    generateRandomArray(count) {
        return new Promise((ok, fail) => {
            LibCrypto.randomFill(new Uint8Array(count), (error, array) => {
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

            LibCrypto.randomInt(min, max, (error, n) => {
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
        let pem = ServerUtils.createTempFile('pem');
        let pub = pem.replica('pem.pub');

        await ServerUtils.execInShell(`ssh-keygen -t rsa -b 4096 -N "" -f ${pem.getPath()}`);

        let publicKey = (await pub.read()).toString();
        let privateKey = (await pem.read()).toString();

        await pub.delete();
        await pem.delete();

        return {
            publicKey: publicKey,
            privateKey: privateKey,
        };
    }

    generateToken(algorithm, value) {
        return new Promise((ok, fail) => {
            const hash = LibCrypto.createHash(algorithm);

            hash.on('readable', () => {
                let hashed = hash.read();

                if (hashed) {
                    ok(hashed.toString('hex'));
                }
            });

            hash.write(value);
            hash.end();
        });
    }

    generateUUID() {
        return LibCrypto.randomUUID();
    }

    hash(algorithm, value) {
        return new Promise((ok, fail) => {
            const hash = LibCrypto.createHash(algorithm);

            hash.on('readable', () => {
                let hashed = hash.read();

                if (hashed) {
                    ok(hashed.toString('base64'));
                }
            });

            hash.write(value);
            hash.end();
        });
    }

    async parseAcmeCertificate(certificateChain) {
        let pemChain = certificateChain.split('\n\n');
        let pemChainTemp = await ServerUtils.createTempFile().append(pemChain[0]);

        let result = await ServerUtils.execInShell(`openssl x509 -in ${pemChainTemp.getPath()} -enddate -noout`);
        let expires = mkTime(result.stdout.split('=')[1]);
        result = await execShell(`openssl x509 -in ${pemChainTemp.getPath()} -subject -noout`);
        let subject = result.stdout;
        
        await pemChainTemp.rm();

        return {
            expires: expires,
            subject: subject,
            created: mkTime(),
            certificate: pemChain,
        };
    }

    scrypt(password, salt, keylen) {
        return new Promise((ok, fail) => {
            LibCrypto.scrypt(password, salt, keylen, (error, derived) => {
                ok(derived);
            })
        });
    }

    sign(keyObj, data) {
        return new Promise((ok, fail) => {
            if (keyObj instanceof LibCrypto.KeyObject) {
                LibCrypto.sign(null, data, keyObj, (error, signature) => {
                    ok(signature);
                });
            }
            else {
                let hmac = LibCrypto.createHmac(keyObj._algorithm, keyObj._aesKey);
                ok(hmac.update(data).digest());
            }
        });
    }

    verify(keyObj, data, signature) {
        return new Promise((ok, fail) => {
            if (keyObj instanceof LibCrypto.KeyObject) {
                LibCrypto.verify(null, data, keyObj, signature, (error, result) => {
                    ok(result);
                });
            }
            else {
                let hmac = LibCrypto.createHmac(keyObj._algorithm, keyObj._aesKey);
                ok(hmac.update(data).digest().equals(signature));
            }
        })
    }
});
