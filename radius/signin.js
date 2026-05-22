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
*****/
define(class AuthApp extends Webapp {
    constructor() {
        super();
    }

    // ********************
    // getSessionState
    // ********************
    async [Api.define(
        'getSessionState',
    )](trx) {
        let systemState = await mkSystemHandle().getState();

        if (systemState == 'system:configure') {
            return systemState;
        }
        else if (systemState == 'system:running') {
            return await trx.session.getState();
        }
        else {
            return systemState;
        }
    }

    // ********************
    // getSystemState
    // ********************
    async [Api.define(
        'getSystemState',
    )](trx) {
        let systemState = await mkSystemHandle().getState();

        if (systemState == 'system:configure') {
            return systemState;
        }
        else if (systemState == 'system:running') {
            return await trx.session.getState();
        }
        else {
            return systemState;
        }
    }

    // ********************
    // resetSystemConfiguration
    // ********************
    async [Api.define(
        'resetSystemConfiguration',
    )](trx) {
        return await mkSystemHandle().resetConfiguration();
    }

    // ********************
    // startSystemConfiguration
    // ********************
    async [Api.define(
        'startSystemConfiguration',
        {
            configType: StringType,
        },
    )](trx, configType) {
        return await mkSystemHandle().startConfiguration(configType);
    }
});