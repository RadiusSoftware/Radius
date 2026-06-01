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
 * 
 * https://datatracker.ietf.org/doc/html/rfc8555/
 * 
 * 
*****/
define(class AcmeClient extends Emitter {
    static settingsShape = mkRdsShape({
        name: StringType,
        url: StringType,
        days: Int32Type,
        account: {
            contact: [ StringType ],
            createdAt: StringType,
            status: StringType,
            kid: StringType,
        },
        operator: {
            country: StringType,
            state: StringType,
            locale: StringType,
            org: StringType,
        },
        keyAlg: StringType,
        publicKey: StringType,
        privateKey: StringType,
    });

    constructor(settings) {
        super();
        this.settings = settings;
    }

    async authorize(authorizationUrl) {
        this.emit({
            name: 'Acme',
            task: 'radius.org.acmeAuthorizationStarting',
        });

        let httpResp = await this.post(authorizationUrl, 'PostAsGet');

        if (httpResp.getStatusCode() == 200) {
            const challenge = {
                type: 'http-01',
            };

            for (let offeredChallenge of httpResp.getValue().challenges) {
                if (offeredChallenge.type == challenge.type) {
                    challenge.url = offeredChallenge.url;
                    challenge.status = offeredChallenge.status;
                    
                    if (challenge.type == 'dns-persist-01') {
                        challenge.methodName = 'challengeDnsPersist';
                        challenge['issuer-domain-names'] = offeredChallenge['issuer-domain-names'];
                    }
                    else if (challenge.type == 'http-01') {
                        challenge.methodName = 'challengeHttp';
                        challenge.token = offeredChallenge.token;
                    }
                    else if (challenge.type == 'tls-alpn-01') {
                        challenge.methodName = 'challengeTlsAlpn';
                        challenge.token = offeredChallenge.token;
                    }
                    else if (challenge.type == 'dns-01') {
                        challenge.methodName = 'challengeDns';
                        challenge.token = offeredChallenge.token;
                    }

                    break;
                }
            }

            if (challenge.methodName) {
                await this[challenge.methodName](challenge, authorizationUrl);

                this.emit({
                    name: 'Acme',
                    task: 'radius.org.acmeAuthorizationSuccessful',
                });
            }
            else {
                throwError('radius.org.challengeFailed');
            }
        }
        else {
            throw throwError('radius.org.challengeNotReceived');
        }
    }

    async certifyHost() {
        try {
            this.emit({
                name: 'Acme',
                task: 'radius.org.acmeCertifyStarting',
            });

            this.checkSettings();
            await this.establishSession();
            await this.ensureAccount();

            let httpResp = await this.post(
                this.newOrder,
                {
                    identifiers: [{
                        type: 'dns',
                        value: await mkSystemHandle().getHost(),
                    }]
                }
            );

            if (httpResp.getStatusCode() == 201) {
                let respValue = httpResp.getValue();
                await this.authorize(respValue.authorizations[0]);
                
                console.log(respValue.finalize);
                console.log();
            }
            else {
                throwError('radius.org.acmeCreateOrderFailed');
            }
        }
        catch (e) {
            this.emit({
                name: 'Acme',
                error: e.code,
            });

            return e;
        }
    }

    async challengeDns(challenge, authorizationUrl) {
        // ***** TODO
    }

    async challengeDnsPersist(challenge, authorizationUrl) {
        // ***** TODO
    }

    async challengeHttp(challenge, authorizationUrl) {
        if (challenge.status == 'pending') {
            let hash = await Crypto.hash('sha256', `{"e":"${this.jwk.e}","kty":"${this.jwk.kty}","n":"${this.jwk.n}"}`);
            let challengePath = `/.well-known/acme-challenge/${challenge.token}`;
            let authorizationSecret = `${challenge.token}.${hash.toString('base64url')}`;

            await mkHttpLibraryHandle().addData({
                path: challengePath,
                mime: 'text/plain',
                mode: 'plain',
                once: false,
                pset: await mkPermissionSetHandle().createPermissionSet(),
                data: authorizationSecret,
                flags: { disableCompression: true },
            });

            await this.post(challenge.url, {});
            await pause(2000);

            for (let i = 0; i < 10; i++) {
                let httpResp = await this.post(authorizationUrl, 'PostAsGet');
                let httpRespData = httpResp.getValue();
                
                let httpChallenge = httpRespData.challenges.filter(entry => {
                    return entry.type == challenge.type;
                })[0];
                
                if (httpChallenge.status == 'valid') {
                    await mkHttpLibraryHandle().delete(challengePath);
                    break;
                }
                else if (httpChallenge.status == 'invalid') {
                    throwError(`radius.org.httpChallengeFailed`);
                }

                await pause(2000);
            }
        }
    }

    async challengeTlsAlpn(challenge, authorizationUrl) {
        // ***** TODO
    }

    checkSettings() {
        this.emit({
            name: 'Acme',
            task: 'radius.org.acmeSettingsCheck',
        });

        if (!AcmeClient.settingsShape.verify(this.settings)) {
            throwError('radius.org.acmeSettingsFailure');
        }
    }
    
    async ensureAccount() {
        if (this.settings.account.kid) {
            this.jwk = NpmPemJwk.pem2jwk(this.settings.publicKey);

            this.emit({
                name: 'Acme',
                task: 'radius.org.acmeAccountFoundInSettings',
            });
        }
        else {
            const keyAlgMap = {
                rsa: 'RS256',
            };

            const keyAlg = await mkSystemHandle().getKeyAlg();
            const keyPair = await Crypto.generateKeyPair(keyAlg);
            this.settings.publicKey = Crypto.export(keyPair.publicKey);
            this.settings.privateKey = Crypto.export(keyPair.privateKey);
            this.settings.keyAlg = keyAlgMap[keyAlg];
            this.jwk = NpmPemJwk.pem2jwk(this.settings.publicKey);

            let httpResp = await this.post(
                this.newAccount,
                {
                    termsOfServiceAgreed: true,
                    contact: this.settings.account.contact.map(contact => `mailto:${contact}`),
                }
            );

            if (httpResp.getStatusCode() == 201) {
                Object.assign(this.settings.account, httpResp.getValue());
                this.settings.account.kid = httpResp.getHeader('location');
            }
            else {
                throwError('radius.org.acmeCreateAccount');
            }

            this.emit({
                name: 'Acme',
                task: 'radius.org.acmeAccountCreated',
            });
        }
    }

    async establishSession() {
        this.emit({
            name: 'Acme',
            task: 'radius.org.acmeSessionEstablishing',
        });

        let httpResp = await mkHttpClient().get(this.settings.url);

        if (httpResp.getStatusCode() == 200 && httpResp.getMime().getCode() == 'application/json') {
            Object.assign(this, httpResp.getValue());
            httpResp = await mkHttpClient().head(this.newNonce);
            this.nonce = httpResp.getHeader('replay-nonce');
        }
        else {
            return throwError('radius.org.acmeSessionFailed');
        }
    }

    getNewAccountUrl() {
        return this.newAccount;
    }

    getNewNonceUrl() {
        return this.newNonce;
    }

    getNewOrderUrl() {
        return this.newOrder;
    }

    getNonce() {
        return this.nonce;
    }

    async getRenewalInfo() {
        // ***************************************************************************
        // ***************************************************************************
    }

    getRenewelInfoUrl() {
        return this.renewalInfo;
    }

    getRevokeCertUrl() {
        return this.revokeCert;
    }

    async post(url, payload, headers) {
        headers = headers ? headers : {};
        headers['Connection'] = 'keep-alive';
        headers['User-Agent'] = 'RadiusAcmeClientV01';
        headers['Accept-Language'] = 'en-US';

        let jwsHeader = {
            alg: this.settings.keyAlg,
            nonce: this.nonce,
            url: url,
        };

        if (url == this.getNewAccountUrl()) {
            jwsHeader.jwk = this.jwk;
        }
        else {
            jwsHeader.kid = this.settings.account.kid;
        }

        let jwsHeaderB64 = mkBuffer(toStdJson(jwsHeader)).toString('base64url');
        let jwsPayloadB64 = payload == 'PostAsGet' ? '' : mkBuffer(toStdJson(payload)).toString('base64url');

        let jwsSignature = await Crypto.sign(
            Crypto.createPrivateKey(this.settings.privateKey),
            `${jwsHeaderB64}.${jwsPayloadB64}`,
        );
        
        let httpResp = await mkHttpClient({
            headers: headers
        }).post(url, 'application/jose+json', toStdJson({
            protected: jwsHeaderB64,
            payload: jwsPayloadB64,
            signature: jwsSignature.toString('base64url'),
        }));

        this.nonce = httpResp.getHeader('replay-nonce');
        return httpResp;
    }

    async revokeCertificate() {
        // ***************************************************************************
        // ***************************************************************************
    }
});
