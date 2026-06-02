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
 * Here's the essential procedure ACME protocol certification provess from the
 * client's point of view, not the ACME provider, broken down into steps that
 * occur when calling certifyHost():
 * 
 * (1) checkSettings() -- method that takes a look at the AcmeSettings object
 * to determine whether the settings provided can be verified against the ACME
 * settings shape. 
 * 
 * (2) establishSession() -- contact the ACME provider, e.g., Lets Encrypt, and
 * received an informational response that includes a nonce in the response
 * headers.  A new nonce is required for each ACME post / transaction.
 * 
 * (3) ensureAccount() -- Either (a) the account is established and the ACME
 * settings the account kid is used or (b) a key pair is generated and the JWK
 * of the public key is essentially the ACME account key.  When creating the
 * account, the ACME server will return the kid, Key ID I believe.
 * 
 * (4) post() -- a customized post function used during the rest of the ACME
 * protocol session.  All posts are sent as mime type "application/jose+json",
 * meaning that the content is JSON along with a crptographically signed JWS
 * "header".  It also supports PostAsGet, which essentialy uses a POST method
 * to get data.  It also fetches the nonce header after each call and saves the
 * new / next nonce for the next post().
 * 
 * (5) authorize() -- this method is called after the new order has been created
 * successfully.  Internet-based challenges are used to demonstrate proof of
 * "ownership" and uses one of four different challenge types.  For now, only
 * the http-01 challenge is supported.  In essence, a secret cryptographic values
 * is made available on the web server and is challenged by the ACME server
 * several times until it's satisfied enought to authorize the transaction.
 * While those challenges are happening, we slowly iterate through a polling
 * loop to see when the challenges are done.  Once done, we get the yay or nay
 * on authorization.
 * 
 * (6) 
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
                        value: await this.system.getHost(),
                    }]
                }
            );

            if (httpResp.getStatusCode() == 201) {
                const orderUrl = httpResp.getHeader('location');
                const orderHandle = httpResp.getValue();
                const authorizeUrl = orderHandle.authorizations[0];
                const finalizeUrl = orderHandle.finalize;
                await this.authorize(authorizeUrl);
                const keyPair = await this.system.getKeyPair();

                this.emit({
                    name: 'Acme',
                    task: 'radius.org.acmeCsrCreating',
                });

                let csr = await Crypto.createCsr({
                    der: true,
                    privateKey: keyPair.privateKey,
                    country: this.settings.operator.country,
                    state: this.settings.operator.state,
                    locale: this.settings.operator.locale,
                    org: this.settings.operator.org,
                    hostname: await this.system.getHost(),
                    days: this.settings.days,
                });

                httpResp = await this.post(finalizeUrl, {
                    csr: csr.toString('base64url'),
                });
                
                if (httpResp.getStatusCode() == 200) {
                    this.emit({
                        name: 'Acme',
                        task: 'radius.org.acmeOrderFinalizing',
                    });

                    httpResp = await this.pollOrder(httpResp);
                    const certificateUrl = httpResp.getValue().certificate;

                    if (certificateUrl) {
                        httpResp = await this.post(certificateUrl, 'PostAsGet', {
                            Accept: 'application/pem-certificate-chain',
                        });

                        let certBundle = await Crypto.parseAcmeCertificate(httpResp.getValue());
                        return certBundle;
                    }
                }
                else {
                    /*
                    this.emit({
                        name: 'Acme',
                        task: 'radius.org.acmeCsrCreateFailed',
                    });

                    await this.pause(reply.headers);
                    await this.confirmOrder(5);
                    */
                }
                /*
                if (this.certificateUrl) {
                    reply = await this.post(this.certificateUrl, 'PostAsGet', {
                        Accept: 'application/pem-certificate-chain',
                    });

                    return await Crypto.analyzeCertificateChain(reply.content.toString());
                }
                */
            }
            else {
                throwError('radius.org.acmeCreateOrderFailed');
            }
        }
        catch (e) {
            this.emit({
                name: 'Acme',
                error: e.code ? e.code : e.toString(),
            });

            return e;
        }
    }

    async challengeDns(challenge, authorizationUrl) {
        // ***** TODO
        // ***************************************************************************
        // ***************************************************************************
    }

    async challengeDnsPersist(challenge, authorizationUrl) {
        // ***** TODO
        // ***************************************************************************
        // ***************************************************************************
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
                flags: { disableCompression: true, noEtag: true },
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
        // ***************************************************************************
        // ***************************************************************************
    }

    checkSettings() {
        this.emit({
            name: 'Acme',
            task: 'radius.org.acmeSettingsCheck',
        });

        if (!AcmeClient.settingsShape.verify(this.settings)) {
            throwError('radius.org.acmeSettingsFailure');
        }

        this.system = mkSystemHandle();
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

            const keyAlg = await this.system.getKeyAlg();
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
        // ***** TODO
        // ***************************************************************************
        // ***************************************************************************
    }

    getRenewelInfoUrl() {
        return this.renewalInfo;
    }

    getRevokeCertUrl() {
        return this.revokeCert;
    }

    async pause(httpResp) {
        if (httpResp.hasHeader('retry-after')) {
            await pause(parseInt(httpResp.getHeader('retry-after')) * 1000);
        }
        else {
            await pause(3000);
        }
    }

    async pollOrder(httpResp) {
        await this.pause(httpResp);
        let orderUrl = httpResp.getHeader('location');

        for (let attempts = 0; attempts < 10; attempts++) {
            let httpResp = await this.post(orderUrl, 'PostAsGet');
            let resp = httpResp.getValue();

            if (resp.status == 'valid') {
                return httpResp;
            }
            else if (resp.status == 'invalid') {
                throwError(`radius.org.acmeOrderFailed`);
            }

            await this.pause(reply.headers);
        }

        throwError(`radius.org.acmeOrderTimedOut`);
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
        // ***** TODO
        // ***************************************************************************
        // ***************************************************************************
    }
});
