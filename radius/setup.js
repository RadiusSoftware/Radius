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
 * A very simple appliation with one purpose: to provide the user with the
 * opportunity to either accept or decline/block cookies from this website.
 * Accepting cookies will immediately result in two successive cookies being
 * placed on the browser: (1) a "kibble" cookie demonstrating that cookies
 * have been accepted and (2) a session cookie being added as soon as the
 * uer is forwarded back to the previous page.
*****/
define(class SetupApp extends Webapp {
    constructor() {
        super();
        this.state = 'setup#start';
    }

    async getNextState() {
        const system = mkSystemHandle();

        if (!await system.getTlsStatus()) {
            this.state = 'setup#acme';
            return this.state;
        }

        /*
        if (false) {
            this.state = 'system#setup-mode';
            return this.state;
        }

        if (false) {
            this.state = 'system#setup-swarm';
            return this.state;
        }

        if (false) {
            this.state = 'system#setup-dbms';
            return this.state;
        }

        if (false) {
            this.state = 'system#setup-user';
            return this.state;
        }

        if (false) {
            this.state = 'system#setup-verify';
            return this.state;
        }

        if (false) {
            this.state = 'system#setup-password';
            return this.state;
        }
        */
    }

    // ********************
    // getSigninPath
    // ********************
    async [Api.define(
        'getSigninPath',
    )](trx) {
        return await mkSystemHandle().getSigninPath();
    }

    // ********************
    // getSetupState
    // ********************
    async [Api.define(
        'getSetupState',
    )](trx) {
        return this.state;
    }

    // ********************
    // setupAcme
    // ********************
    async [Api.define(
        'setupAcme',
        {
            name: StringType,
            url: StringType,
            contact: [ StringType ],
        }
    )](trx, name, url, contact) {
        if (this.state == 'setup#acme') {
            await mkSystemHandle().setHost('development.infosearch.cloud');

            let acmeSettings = AcmeClient.settingsShape.getDefault();
            acmeSettings.name = name;
            acmeSettings.url = url;
            acmeSettings.days = 90;
            acmeSettings.account.contact = contact,
            acmeSettings.operator = {
                country: "US",
                state: "Nevada",
                locale: "Reno",
                org: "Infosearch International",
            }

            let acmeClient = mkAcmeClient(acmeSettings);
            acmeClient.on('Acme', message => console.log(message));
            await acmeClient.certify();
        }
        else {
            this.state = 'setup#start';
            return this.state;
        }
    }

    // ********************
    // startSetup
    // ********************
    async [Api.define(
        'startSetup',
    )](trx) {
        return await this.getNextState();
    }
});