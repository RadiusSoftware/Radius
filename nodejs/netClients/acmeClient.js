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
 * Integrated implementation of the ACME protocol!  The network interface is from
 * the primary kode.json configuration file.  Here's a description of the primary
 * methods in this class.  Please keep in min that the AcmeProvider can only be
 * used for a single requested opertion at a time.  Once that request/order has
 * been completed or rejected, the AcmeProvider object can no longer be used.
 * 
 * authorize()
 * After a session has been established, with establishSession(), before much can
 * happen, we need to get authorization from the ACME provider that we have the
 * authorization to control the specified DNS host.
 * 
 * certify()
 * Certifiy the specified network interface and get a certificate chain to be
 * installed into the kode.json configuration file.  Before certify() is called,
 * establishSession() and checkAccount() must be called to ensure we proper
 * preparation to certify: (a) submit a new order, (b) obtain authorization for
 * the certificate, (c) create and submit the CSR, (d) finialize and return the
 * certificate chain.
 * 
 * confirmChallenge()
 * When obtaining authorization for a new serive order, we need to perform an
 * asynchrnous step, which is used to provide that we have control of the host
 * specified in the service order.  Confirming the authorization challenge posed
 * by the remote ACME server is the final step in obtaining authorization/.
 * 
 * confirmOrder()
 * When a servie order for a certificate has been accepted, it may be either
 * immediately processed or it may return with a status of "processing".  If
 * the latter, we need to poll the ACME server until the status has changed
 * from "processing" to "valid".
 * 
 * ensureAccount()
 * Ensures that we have a configured Acme provider account.  If there are no
 * account settings in the configuration, we'll create a new account.  If there
 * is an existing acccount, just load it.
 * 
 * establishSession()
 * The first step performing any actions using ACME is to establish a session
 * with the remote server.  We'll initialize our session with a set or returned
 * links and we'll receive our first nonce string, which is required for our
 * first post.
 * 
 * post()
 * The post method provides the engine for dynamically building JWS HTTP POST
 * requests for the ACME server.  Each JWS post requires a protected header,
 * request content, and a crypto signature.  Note that the "protected" and
 * "payload" properties of the POST's JSON object are encoded using Base 64
 * URL encoding.
 * 
 * revoke()
 * Provides the ability to revoke a TLS certificate.  Due to data management
 * archtiecture, revoke() must be called for the current interface.  It's best
 * if the calling code makes a duplicate of the interface code before revoke()
 * is called.
 * 
 * https://datatracker.ietf.org/doc/html/rfc8555/
*****/
define(class AcmeClient {
    static settingsShape = mkRdsShape({
        name: StringType,
        url: StringType,
        account: {
            key: {
                kty: StringType,
                n: StringType,
                e: StringType,
            },
            contact: [ StringType ],
            createdAt: StringType,
            status: StringType,
            kid: StringType,
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

    async certify() {
        try {
            if (await this.establishSession()) {
                await this.ensureAccount();
                this.jwk = NpmPemJwk.pem2jwk(this.settings.publicKey);
            }
            else {
                // *******************************************************
                // *******************************************************
            }
        }
        catch (e) {
            // *******************************************************
            // *******************************************************
            console.log(e);
            console.log();
        }
    }
    
    async ensureAccount() {
        if (this.settings.account.kid) {
            return true;
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
                return true;
            }
            else {
                return false;
            }
        }
    }

    async establishSession() {
        let httpResp = await mkHttpClient().get(this.settings.url);

        if (httpResp.getStatusCode() == 200 && httpResp.getMime().getCode() == 'application/json') {
            Object.assign(this, httpResp.getValue());
            httpResp = await mkHttpClient().head(this.newNonce);
            this.nonce = httpResp.getHeader('replay-nonce');
            return true;
        }

        return false;
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
            jwsHeader.jwk = NpmPemJwk.pem2jwk(this.settings.publicKey);
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
});
