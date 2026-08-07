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
 * The SetupApp is run only when a server intallation does NOT have a valid,
 * encrypted boot configuration file.  The purpose of this application is to
 * secure a TLS certificate via ACME, determine the operational mode, and then
 * to cofigure the operational settings for the specified mode: swarm or in
 * standalone.
*****/
define(class SetupApp extends Webapp {
    async getControllerData(handle) {
        /*
        return await mkSystemHandle().getSetupData();
        */
        let { shape, value } = await mkSystemHandle().getSetupData();
        let testShape = mkRdsShape(BooleanType);
        shape.keys.test = testShape;
        value.test = true;
        /*
        console.log(shape.verify(value));
        console.log();
        */
       return { shape: shape, value: value };
    }

    async init() {
        await super.init();
    }

    // ********************
    // certifyHost
    // ********************
    async [Api.defineEndpoint(
        '..certifyHost',
        {
            acmeSettings: 'acme',
        }
    )](trx, acmeSettings) {
        console.log('*** ACME TIME ***');
        console.log(acmeSettings);
        return '** RESPONSE SENT **';
    }
});