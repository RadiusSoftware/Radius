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
 * A web service is a construct and framework for managing and implementing web
 * services based on specialized web-service classes and configuration data
 * stored in the web-services DBMS table.  Additionally, the WebServiceService
 * is provided to manage the run state and to configure web services that have
 * been defined by loaded packages.
*****/
if (Process.isPrimary()) {
    singleton(class WebServices extends Emitter {
        constructor() {
            super();
            this.webServiceTypes = {};
            this.webServicesById = {};
            this.webServicesByFqn = {};
            this.webServicesByPath = {};

            Namespace.emitter.on('ClassDefined', message => {
                if (Data.extends(message.clss, WebService)) {
                    if (message.clss != WebService) {
                        let entry = {
                            name: message.clss.name,
                            ns: message.clss['#namespace'],
                            fqn: message.clss['#fqn'],
                        };

                        this.webServiceTypes[entry.fqn] = entry;
                    }
                }
            });

            this.dataShape = mkRdsShape({
                namespace: StringType,
                className: StringType,
                fqn: StringType,
                authType: StringType,
                name: StringType,
                path: StringType,
                enabled: BooleanType,
                _locked: BooleanType,
                teamId: StringType,
                permissions: [ StringType ],
                addrs: [ StringType ],
                _apiKey: StringType,
                _clientKey: StringType,
                _clientSecret: StringType,
            });

            this.authTypes = mkRdsEnum('idsecret', 'apikey', 'none');
        }

        async disable(id) {
            // ********************************************************************
            // ********************************************************************
        }

        async enable(id) {
            // ********************************************************************
            // ********************************************************************
        }

        async create(config) {
            if (this.dataShape.validate(config)) {
                if (this.authTypes.has(config.authType)) {
                    if (this.isPathAvailable(config.path)) {
                        if (config.authType == 'apikey') {
                            config.apiKey = await Crypto.generateApiKey();
                        }
                        else if (config.authType == 'idsecret') {
                            let { clientId, clientSecret } = await Crypto.generateClientCredentials();
                            config.clientId = clientId;
                            config.clientSecret = clientSecret;
                        }

                        config.id = Crypto.generateUUID();

                        let webService = await mkSettingsHandle().defineSetting(
                            config.id,
                            'webservice',
                            this.dataShape,
                            config,
                        );

                        this.webServicesById[webService.value.id] = webService;
                        this.webServicesByFqn[webService.value.fqn] = [ webService ];
                        this.webServicesByPath[webService.value.path] = webService;
                        return webService.value.id;
                    }
                    else {
                        // TODO ***************************************************************************
                        // TODO ***************************************************************************
                    }
                }
                else {
                    // TODO ***************************************************************************
                    // TODO ***************************************************************************
                }
            }
            else {
                // TODO ***************************************************************************
                // TODO ***************************************************************************
            }
        }

        async delete(id) {
            // ********************************************************************
            // ********************************************************************
        }

        getFromFqn(fqn) {
            if (fqn in WebService.webServices) {
                let ws = Data.clone(this.webServicesByFqn[fqn]);
                delete ws.apiKey;
                delete ws.clientId;
                delete ws.clientSecret;
                return ws;
            }

            return null;
        }

        getFromId(id) {
            if (id in WebService.webServicesById) {
                let webService = Data.clone(this.webServicesById[path].value);
                delete webService.apiKey;
                delete webService.clientId;
                delete webService.clientSecret;
                return webService;
            }

            return null;
        }

        getFromPath(path) {
            if (id in WebService.webServicesByPath) {
                let webService = Data.clone(this.webServicesByPath[path].value);
                delete webService.apiKey;
                delete webService.clientId;
                delete webService.clientSecret;
                return webService;
            }

            return null;
        }

        getShape() {
            return this.dataShape;
        }

        isPathAvailable(path) {
            return !(path in this.webServicesByPath);
        }

        list() {
            return Object.values(this.webServicesById).map(setting => {
                let webService = Data.clone(setting.value);
                delete webService.apiKey;
                delete webService.clientId;
                delete webService.clientSecret;
                return webService;
            });
        }

        listTypes() {
            return Data.clone(Object.values(this.webServiceTypes));
        }

        async load() {
            for (let webService of await mkSettingsHandle().listFilteredSettings({ category: 'webservice' })) {
                if (!(webService.value.id in this.webServicesById)) {
                    this.webServicesById[webService.value.id] = webService;
                    this.webServicesByPath[webService.value.path] = webService;

                    if (webService.value.fqn in this.webServicesByFqn) {
                        this.webServicesByFqn[webService.value.fqn].push(webService);
                    }
                    else {
                        this.webServicesByFqn[webService.value.fqn] = [ webService ];
                    }
                }
            }
        }

        async setApiKey(id) {
            // ********************************************************************
            // ********************************************************************
        }

        async setAuthType(id, authType) {
            // ********************************************************************
            // ********************************************************************
        }

        async setClientCredentials(id) {
            // ********************************************************************
            // ********************************************************************
        }

        async setName(id, name) {
            // ********************************************************************
            // ********************************************************************
        }

        async setPath(id, name) {
            // ********************************************************************
            // ********************************************************************

        }

        async start(id) {
            // ********************************************************************
            // ********************************************************************
        }

        async stop(id) {
            // ********************************************************************
            // ********************************************************************
        }
    });
}


/*****
 * A webservice is the base class that provides the essential API and security
 * features for a webservice extension (WSE).  WSE's are defined to operator
 * for a specific scope and with API calls.
*****/
define(class WebService extends HttpX {
    constructor(options) {
        super(options);
    }

    getActive() {
        return this.active;
    }

    getApiKey() {
        return this.apiKey;
    }

    getAuthType() {
        return this.authType;
    }

    getClientId() {
        return this.clientId;
    }

    getClientSecret() {
        return this.clientSecret;
    }

    getName() {
        return this.name;
    }

    getPath() {
        return this.path;
    }

    getStatus() {
        return this.status;
    }

    async handleDELETE(handle) {
        // CHECK API *********************************************************************
    }

    async handleGET(handle) {
        // CHECK API *********************************************************************
    }

    async handleHEAD(handle) {
        // CHECK API *********************************************************************
    }

    async handlePOST(handle) {
        // CHECK API *********************************************************************
    }

    async handlePUT(handle) {
        // CHECK API *********************************************************************
    }

    init(config) {
        super.init();
    }
});
