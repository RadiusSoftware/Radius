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


/*****
 * The global singleton that provides crypto-related utility functions that are
 * both self serving and also used by classes and functions in the global crypto
 * namespace.
*****/
singleton('', class Crypto {
    createAesKey(base64) {
        return crypto.createSecretKey(base64, 'base64');
    }

    createCertificateSigningRequest() {
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

    createPrivateKey(pem) {
        return crypto.createPrivateKey(pem);
    }

    createPublicKey(pem) {
        return crypto.createPublicKey(pem);
    }

    decryptAes(keyObj, data, iv, mode) {
        return new Promise(async (ok, fail) => {
            let chunks = [];
            mode = typeof mode == 'undefined' ? 'cbc' : mode;

            let decipher = crypto.createDecipheriv(
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
        });
    }

    decryptPrivate(keyObj, data) {
        return crypto.privateDecrypt(
            keyObj,
            data instanceof Buffer ? data : mkBuffer(data, 'base64'),
        );
    }

    decryptPublic(keyObj, data) {
        return crypto.publicDecrypt(
            keyObj,
            data instanceof Buffer ? data : mkBuffer(data, 'base64'),
        );
    }

    encryptAes(keyObj, data, mode) {
        return new Promise(async (ok, fail) => {
            let chunks = [];
            mode = typeof mode == 'undefined' ? 'cbc' : mode;
            let iv = await this.generateRandomArray(16);

            let cipher = crypto.createCipheriv(
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
        });
    }

    encryptPrivate(keyObj, data) {
        return crypto.privateEncrypt(
            keyObj,
            data instanceof Buffer ? data : mkBuffer(data),
        );
    }

    encryptPublic(keyObj, data) {
        return crypto.publicEncrypt(
            keyObj,
            data instanceof Buffer ? data : mkBuffer(data),
        );
    }

    exportAesKey(keyObj) {
        return keyObj.export({
            format: 'buffer',
        }).toString('base64');
    }

    exportPrivateKey(keyObj, cipher, passphrase) {
        if (cipher && passphrase) {
            return keyObj.export({
                type: 'pkcs1',
                format: 'pem',
                cipher: this.cipher,
                passphrase: this.passphrase,
                encoding: 'base64',
            });
        }
        else {
            return keyObj.export({
                type: 'pkcs1',
                format: 'pem',
                encoding: 'base64',
            });
        }
    }

    exportPublicKey(keyObj) {
        return keyObj.export({
            type: 'pkcs1',
            format: 'pem',
            encoding: 'base64',
        });
    }

    generateAesKey(bits) {
        return new Promise(async (ok, fail) => {
            if (bits == 128 || bits == 192 || bits == 256) {
                crypto.generateKey('aes', { length: bits }, (error, keyObj) => {
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

            crypto.generateKeyPair(algorithm, options, (error, publicKey, privateKey) => {
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

    generateSshKeyPair() {
    }

    hash(algorithm, value) {
        return new Promise((ok, fail) => {
            const hash = crypto.createHash(algorithm);

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

    parseAcmeCertificate(certificate) {
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

    scrypt() {
    }

    urlDecode() {
    }

    urlEncode() {
    }
});
