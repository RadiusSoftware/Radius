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
 * The system service is used for managing the initialization and management of
 * the host or system.  The system has calls for attaching, detaching the host
 * from a swarm and also tracks a newly installed system to know that it must
 * be either initialized or attached before it can be used:
 * 
 *      system#loaded
 *      system#setup-acme
 *      system#setup-mode
 *      system#setup-cluster
 *      system#setup-dbms
 *      system#setup-user
 *      system#setup-verify
 *      system#setup-password
 *      system#ready
 *      system#running
 * 
 * When a system is first installed, it must be configured by attaching it to a
 * swarm or configuring it for standalone operation before is can be used.
*****/
createService(class SystemService extends Service {
    static bootShape = mkRdsShape({
        mode: mkRdsEnum('system#swarm', 'system#standalone'),
        hostId: StringType,
        hostName: StringType,
        privateKey: StringType,
        publicKey: StringType,
        tlsCert: StringType,
        caaCert: StringType,

        _swarm: {
            swarmId: StringType,
            swarmSecret: StringType,
            swarmHosts: [ StringType ],
        },

        _dbms: {
            dbmsType: StringType,
            timeout: Int32Type,
            host: StringType,
            port: Int32Type,
            database: StringType,
            username: StringType,
            password: StringType,
            _certificate: StringType,
        }
    });

    constructor() {
        super();
        this.bootTime = mkTime();
        this.bootUUID = Crypto.generateUUID();
        this.state = 'system#loaded';
        this.radiusPath = '/radius';
    }

    async bootSetupMode() {
        const { publicKey, privateKey } = await Crypto.generateKeyPair('rsa');

        this.mode = 'system#setup';
        this.hostId = Crypto.generateUUID();
        this.hostName = this.hostId.replaceAll('-', '_');
        this.publicKey = publicKey.export({ type: 'pkcs1', format: 'pem' });
        this.privateKey = privateKey.export({ type: 'pkcs1', format: 'pem' });

        await mkSettingsHandle().defineTemporarySetting(
            'httpServer',
            'server',
            HttpServer.settingsShape,
            {
                enabled: true,
                workers: 1,
                acceptCookiesName: 'cookies',
                sessionCookieName: 'session',
            },
        );

        this.httpServer = await createServer(HttpServer);
        await this.httpServer.start('httpServer');
    }

    async bootStandaloneMode() {
        try {
            /*
            if (!(await Dbms.doesDatabaseExist(this.sysdb))) {
                await Dbms.createDatabase(this.sysdb);
            }

            let schema1 = await Dbms.getDatabaseSchema(this.sysdb);
            let schema2 = mkFrameworkSchema();

            for (let diff of mkSchemaAnalysis(schema1, schema2)) {
                await SchemaUpdater.upgrade(this.sysdb, diff);
            }

            for (let dbTable of schema2) {
                if (dbTable.getType() == 'object') {
                    defineDbo('', dbTable);
                }
            }

            await Dbms.setSettings(this.sysdb);
            */
            /*
            let httpServer = await createServer(HttpServer);
            await httpServer.start('httpServer');
            let webServices = await mkWebServiceHandle().load();
            await webServices.start();
            await this.launchServers();
            */
        }
        catch (e) {}
        this.state = 'system#setup';
    }

    async bootSwarmMode() {
        // **************************************************************************
        // **************************************************************************
        /*
        try {
        }
        catch (e) {}
        this.state = 'system#setup';
        */
    }

    async onBoot(message) {
        if (this.state == 'system#loaded') {
            await mkPermissionSetHandle().addPermissionTypes(
                'radius#cookies',
                'radius#session',
                'radius#signedin',
                'radius#admin',
                'radius#system',
            );

            await mkHttpLibraryHandle().addData({
                path: this.radiusPath,
                mime: 'text/javascript',
                mode: '',
                once: false,
                pset: await mkPermissionSetHandle().createPermissionSet(),
                data: radius.mozilla,
            });

            let packages = mkPackageHandle();
            await packages.loadDirectory(Path.join(radius.path, '../mozilla/package'), '/');
            await packages.loadDirectory(Path.join(radius.path, '../radius'), '/');

            let bootData = await this.readBootFile();

            if (this.state == 'system#ready') {
                if (this.mode == 'swarm') {
                    await this.bootSwarmMode();
                }
                else if (this.mode == 'standalone') {
                    await this.bootStandaloneMode();
                }
            }

            if (this.state == 'system#setup') {
                await this.bootSetupMode();
            }
        }
    }

    async onGetBootTime(message) {
        return this.bootTime;
    }

    async onGetBootUUID(message) {
        return this.bootUUID;
    }

    async onGetKeyPair(message) {
        return { publicKey: this.publicKey, privateKey: this.privateKey };
    }

    async onGetMode(message) {
        return this.mode;
    }

    async onGetRadiusPath(message) {
        return this.radiusPath;
    }

    async onGetState(message) {
        return this.state;
    }

    async onGetTlsCerts(message) {
        if (this.tlsCert && this.caaCert) {
            return {
                tlsCert: this.tlsCert,
                caaCert: this.caaCert,
            };
        }

        return null;
    }

    async onGetTlsStatus(message) {
        if (this.tlsCert && this.caaCert) {
            return true;
        }

        return false;
    }

    async onGetWebapp(message) {
        return radius.webapp;
    }

    async readBootFile() {
        const bootPath = LibPath.join(radius.path, '../.boot');

        if (await FileSystem.isFile(bootPath)) {
            try {
                const bootSettings = fromJson(await FileSystem.readFileAsString(bootPath));

                if (bootSettings && SystemService.bootShape.verify(bootSettings)) {
                    this.mode = bootSettings.mode;
                    this.hostId = bootSettings.hostId;
                    this.hostName = bootSettings.hostName;
                    this.privateKey = bootSettings.privateKey;
                    this.publicKey = bootSettings.publiKey;
                    this.tlsCert = bootSettings.tlsCert;
                    this.caaCert = bootSettings.caaCert;

                    if (bootSettings.bootMode == 'standalone') {
                        this.sysdb = {
                            dbms: bootSettings.dbms.dbmsType,
                            timeout: bootSettings.dbms.timeout,
                            host: bootSettings.dbms.host,
                            port: bootSettings.dbms.port,
                            database: bootSettings.dbms.database,
                            username: bootSettings.dbms.username,
                            password: bootSettings.dbms.password,
                            certificate: bootSettings.dbms.certificate,
                        };
                    }
                    else if (bootSettings.mode == 'swarm') {
                        this.swarm = {
                            swarmId: bootSettings.swarm.swarmId,
                            swarmSecret: bootSettings.swarm.swarmSecret,
                            swarmHosts: bootSettings.swarm.swarmHosts,
                        };
                    }

                    this.state = 'system#ready';
                    return;
                }
            }
            catch (e) {}
        }

        this.state = 'system#setup';
    }

    async setupDbms() {
        // **************************************************************************
        // **************************************************************************
        /*
        try {
            if (!(await Dbms.doesDatabaseExist(this.sysdb))) {
                await Dbms.createDatabase(this.sysdb);
            }

            let schema1 = await Dbms.getDatabaseSchema(this.sysdb);
            let schema2 = mkFrameworkSchema();

            for (let diff of mkSchemaAnalysis(schema1, schema2)) {
                await SchemaUpdater.upgrade(this.sysdb, diff);
            }

            for (let dbTable of schema2) {
                if (dbTable.getType() == 'object') {
                    defineDbo('', dbTable);
                }
            }

            await Dbms.setSettings(this.sysdb);
        }
        catch (e) {}
        this.state = 'system#setup';
        */
    }
});
/*******************************************************************************************************

            await settings.defineSetting('sessionTimeoutMillis', 'security', Int32Type, 120*60*60*1000);
            await settings.defineSetting('sessionShutdowntMillis', 'security', Int32Type, 240*60*60*1000);

            await settings.defineSetting('loginMaxFailures', 'security', Int32Type, 4);
            await settings.defineSetting('loginMaxMfaMinutes', 'security', Int32Type, 5);
            await settings.defineSetting('passwordMaxDays', 'security', Int32Type, -1);
            await settings.defineSetting('passwordHistoryMaxDays', 'security', Int32Type, 365);
            

            await settings.defineSetting('packages', 'package', ArrayType, []);
            await settings.defineSetting('webServicesPath', 'server', StringType, '/ws');

            await dbms.createObj(DboUserGroup, {
                name: '',
                active: true,
                settings: {},
            });
        }

        async load() {
            if (await this.initializeRadiusDbms()) {
                if (!await mkSettingsHandle().isInitialized()) {
                    this.initializeSystem();
                }

                await this.buildConfiguration();
                await mkSystemHandle().initState();
                let permissionTypes = await mkSettingsHandle().getSetting('permissionTypes');
                await mkPermissionSetHandle().addPermissionTypes(...permissionTypes);

                let packages = mkPackageHandle();
                let library = mkHttpLibraryHandle();
                let settings = mkSettingsHandle();

                for (let { path, url } of await mkSettingsHandle().getSetting('packages')) {
                    await packages.loadDirectory(path, url);
                }

                let radiusPath = await settings.getSetting('radiusPath');
                let acceptCookiesPath = await settings.getSetting('acceptCookiesPath');

                await Namespace.init();
                let httpServer = await createServer(HttpServer);
                await httpServer.start('httpServer');
                let webServices = await mkWebServiceHandle().load();
                await webServices.start();
                await this.launchServers();
            }
            else {
                console.log(`\nFailed to initialize Radius DBMS: "${this.args['-dbms']}"`);
            }
        }
    });
    */


/*****
 * The handle object for objtaining services from the system service.  System
 * services are focused on managing the status of the installed software, how
 * up to date that software is, how up to date the packages are, and whether
 * the system is ready for operational execution.
*****/
define(class SystemHandle extends Handle {
    static fromJson(value) {
        return mkSystemHandle();
    }

    async boot() {
        return await this.callService({
        });
    }

    async getBootTime() {
        return await this.callService({
        });
    }

    async getBootUUID() {
        return await this.callService({
        });
    }

    async getKeyPair() {
        return await this.callService({
        });
    }

    async getMode() {
        return await this.callService({
        });
    }

    async getRadiusPath() {
        return await this.callService({
        });
    }

    async getState() {
        return await this.callService({
        });
    }

    async getTlsCerts() {
        return await this.callService({
        });
    }

    async getTlsStatus() {
        return await this.callService({
        });
    }

    async getWebapp() {
        return await this.callService({
        });
    }
});