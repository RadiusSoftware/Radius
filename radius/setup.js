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
    }
    // ********************
    // setupAcme
    // ********************
    async [Api.define(
        'setupAcme',
        {
            acmeProviderName: StringType,
            acmeProviderUrl: StringType,
            operatorKid: StringType,
            operatorContact: [ StringType ],
        }
    )](trx, name, url, contact) {
        if (this.state == 'setup#acme') {
            let system = mkSystemHandle();

            /*
            const acmeSettingsShape = await system.getAcmeSettingsShape();
            let acmeSettings = acmeSettingsShape.getDefault();

            // *********************************************************************
            // *********************************************************************
            await system.setSetting('host', 'development.radiussoftware.org');

            acmeSettings.name = name;
            acmeSettings.url = url;
            acmeSettings.days = 75;
            acmeSettings.contact = contact,
            acmeSettings.operator = {
                country: "US",
                state: "Nevada",
                locale: "Reno",
                org: "Radius Software",
            }
            // *********************************************************************
            // *********************************************************************

            let acmeClient = mkAcmeClient(acmeSettings);
            acmeClient.on('Acme', message => console.log(message));
            let certBundle = await acmeClient.certifyHost();

            if (!(certBundle instanceof Failure)) {
                await system.setSetting('acme', acmeSettings);
                await system.setSetting('certificate', certBundle);
                await system.saveSettings();
            }
            */
        }
    }
});