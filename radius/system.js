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
define(class SystemAdmin extends Webapp {
    constructor() {
        super();
    }
    
    async [Api.define(
        'getSystemStatus',
    )](trx) {
        let settings = mkSettingsHandle();
        let systemStatus = { config: {} };

        for (let setting of Object.values(await settings.getSettings(
            'debugMode',
            'nodeId',
            'bootTime',
            'radiusPath',
            'httpServer',
            'radiusCluster',
            'radiusClusterKey',
            'radiusClusterSubnet',
        ))) {
            systemStatus.config[setting.name] = setting.value;
        }
        
        let dbmss = await Dbms.listSettings();

        systemStatus.dbms = Object.entries(dbmss).map(entry => {
            let [ name, settings ] = entry;
            settings.name = name;
            return settings;
        });

        systemStatus.net = await NetInterfaces.summarize();
        return systemStatus;
    }
    
    async [Api.define(
        'listWebServices',
    )](trx) {
        let webServices = await mkWebServiceHandle().list();

        for (let webService of webServices) {
            delete webService.clss;
        }

        return webServices;
    }
});