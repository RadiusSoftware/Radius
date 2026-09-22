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
(async () => {
    let setupData = await mkSystemHandle().getSetupData();

    define(class SetupApp extends Webapp {
        async getControllerData(handle) {
            return setupData;
        }

        async init() {
            await super.init();
        }

        // ********************
        // certifyHost
        // ********************
        async [Api.defineEndpoint(
            'certifyHost',
            {
                acme: setupData.shape.get('acme'),
            }
        )](trx, acme) {
            let system = mkSystemHandle();
            await system.setAcmeData(acme);

            let link = await mkLinkHandle().create({
                type: 'websocket',
                action: certifyHostAcme,
                lifetime: {
                    minutes: 1,
                },
            });

            return {
                type: 'websocket',
                path: await link.getPath(),
            };
        }
    });
})();


/*****
 * This is the link callback used for running and tracking ACME certification.
 * The protocol here is to wait for the browser-based MonitorWidget to send the
 * "##READY##" message via the Websocket, after which we'll launch the ACME
 * certificaiton and send status updates to the client MonitorWidget.
*****/
define(function certifyHostAcme(settings, webSocket) {
    webSocket.on('DataReceived', async message => {
        let messageName;

        if (message.payload.toString() == '##READY##') {
            let system = mkSystemHandle();
            messageName = await system.certifyHost();
            let lokker = mkLokker();

            Process.on(messageName, async message => {
                await lokker.lock();
                await webSocket.sendMessage(message.update);
                lokker.free();
            });
        }
        else if (message.payload.toString() == '##CLOSE##') {
            // *******************************************************************
            // *******************************************************************
            console.log('canceling.....');
            Process.off(messageName);
        }
    });
});