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
define(class AcmeClient {
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
        this.settings = settings;

        if (!AcmeClient.settingsShape.verify(this.settings)) {
            return mkFailure('ACME settings have failed verification!');
        }
    }

    async authorize(authorizationUrl) {
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
                let challengePath = await this[challenge.methodName](challenge);

                if (!await this.confirmChallenge(challenge, authorizationUrl)) {
                    throwError('radius.org.confirmChallengeFailed');
                }

                await mkHttpLibraryHandle().delete(challengePath);
            }
            else {
                throwError('radius.org.challengeFailed');
            }
        }
        else {
            throw throwError('radius.org.challengeNotReceived');
        }
    }

    async certify() {
        try {
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
            return mkFailure(e);
        }
    }

    async challengeDnsPersist(challenge) {
        // ***** TODO
    }

    challengeHttp(challenge) {
        return new Promise(async (ok, fail) => {
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

                await mkHttpLibraryHandle().listen(challengePath, false, libEntry => {
                    ok(challengePath);
                });

                let httpResp = await this.post(challenge.url, {});
            }
        });
    }

    async challengeTlsAlpn(challenge) {
        // ***** TODO
    }

    async confirmChallenge(challenge, authorizationUrl) {
        for (let i = 0; i < 10; i++) {
            let httpResp = await this.post(authorizationUrl, 'PostAsGet');
            let httpRespData = httpResp.getValue();
            
            let httpChallenge = httpRespData.challenges.filter(entry => {
                return entry.type == challenge.type;
            })[0];
            
            if (httpChallenge.status == 'valid') {
                return true;
            }
            else if (httpChallenge.status == 'invalid') {
                return false;
            }

            await pause(2000);
        }

        return false;
    }
    
    async ensureAccount() {
        if (this.settings.account.kid) {
            this.jwk = NpmPemJwk.pem2jwk(this.settings.publicKey);
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
        }
    }

    async establishSession() {
        let httpResp = await mkHttpClient().get(this.settings.url);

        if (httpResp.getStatusCode() == 200 && httpResp.getMime().getCode() == 'application/json') {
            Object.assign(this, httpResp.getValue());
            httpResp = await mkHttpClient().head(this.newNonce);
            this.nonce = httpResp.getHeader('replay-nonce');
        }
        else {
            return throwError('radius.org.acmeEstablishSession');
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

    async revoke() {
        // ***************************************************************************
        // ***************************************************************************
    }
});
