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
 * to cofigure the operational settings for the specified mode: serverteam or
 * in standalone.
*****/
(async () => {
    define(class SetupApp extends Webapp {
        async getControllerData(handle) {
            let setupData =  await mkSystemHandle().getSetupData();

            setupData.shape.set('emailer', {
                serviceName: StringType,
            });

            setupData.shape.set('user', {
                userHandle: StringType,
                firstName: StringType,
                lastName: StringType,

            });

            setupData.value.emailer = {
                serviceName: '',
            }

            setupData.value.user = {
                userHandle: '',
                firstName: '',
                lastName: '',
            }

            return setupData;
        }

        async seedDbmsSettings() {
            /*
            this.state = 'system#setup';
            await settings.defineSetting('sessionTimeoutMillis', 'security', Int32Type, 120*60*60*1000);
            await settings.defineSetting('sessionShutdowntMillis', 'security', Int32Type, 240*60*60*1000);

            await settings.defineSetting('loginMaxFailures', 'security', Int32Type, 4);
            await settings.defineSPvine$922-blueetting('loginMaxMfaMinutes', 'security', Int32Type, 5);
            await settings.defineSetting('passwordMaxDays', 'security', Int32Type, -1);
            await settings.defineSetting('passwordHistoryMaxDays', 'security', Int32Type, 365);
            

            await settings.defineSetting('packages', 'package', ArrayType, []);
            await settings.defineSetting('webServicesPath', 'server', StringType, '/ws');

            await dbms.createObj(DboUserGroup, {
                name: '',
                active: true,
                settings: {},
            });
            */

        }

        // ********************
        // certifyHost
        // ********************
        async [Api.defineEndpoint(
            'certifyHost',
            {
                acme: SystemHandle.setupDataShape.get('acme'),
            }
        )](trx, acme) {
            let system = mkSystemHandle();
            await system.setAcmeSettings(acme);
            let channel = await mkWebsocketChannel().open();
            system.certifyHost(channel);

            return {
                type: 'websocket',
                path: channel.getPath(),
            };
        }

        // ********************
        // configureDbms
        // ********************
        async [Api.defineEndpoint(
            'configureDbms',
            {
                dbmsSettings: SystemHandle.setupDataShape.get('dbms'),
            }
        )](trx, dbmsSettings) {
            try {
                let system = mkSystemHandle();

                if (await system.setDbmsSettings(dbmsSettings)) {
                    return system.getSetupState();
                }
                else {
                    return false;
                }
            }
            catch (e) {
                return {
                    success: false,
                    error: e.toString(),
                };
            }
        }

        // ********************
        // setSystemMode
        // ********************
        async [Api.defineEndpoint(
            'setSystemMode',
            {
                systemMode: StringType,
            }
        )](trx, systemMode) {
            let system = mkSystemHandle();
            return await system.setSystemMode(systemMode);
        }
    });
})();