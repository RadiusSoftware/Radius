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
 * the host or system.  The system is accessable through the service handle.
 * Note that there are two imported system attributes:
 * 
 *      STATE
 *      *****
 *      system#loaded
 *      system#ready
 *      system#running
 * 
 *      MODE
 *      ****
 *      system#setup
 *      system#standalone
 *      system#swarm
 * 
 * Swarm mode is somewhat complex to describe because the DBMS access, user
 * management, and spooling (email, sms...) are all performed via thunks that
 * connect webservices within the swarm.
*****/
createService(class SystemService extends Service {
    static acmeSettingsShape = mkRdsShape({
        name: StringType,
        url: StringType,
        days: Int32Type,
        keyAlg: StringType,
        publicKey: StringType,
        privateKey: StringType,
        contact: [ StringType ],
        createdAt: StringType,
        status: StringType,
        kid: StringType,
        operator: {
            country: StringType,
            state: StringType,
            locale: StringType,
            org: StringType,
        },
    });

    static httpServerSettingsShape = mkRdsShape({
        enabled: BooleanType,
        workers: UInt16Type,
        acceptCookiesName: StringType,
        sessionCookieName: StringType,
    });

    static settingsShape = mkRdsShape({
        mode: StringType,
        hostId: StringType,
        publicKey: StringType,
        privateKey: StringType,
        certificate: {
            hostCert: StringType,
            authCert: StringType,
            rootCert: StringType,
            hostCertExpires: DateTimeType,
            hostCertSubject: StringType,
        },

        swarm: {
            swarmId: StringType,
            swarmSecret: StringType,
            swarmHosts: [ StringType ],
        },

        dbms: {
            dbmsType: StringType,
            timeout: Int32Type,
            host: StringType,
            port: Int32Type,
            database: StringType,
            username: StringType,
            password: StringType,
            certificate: StringType,
        },

        acme: SystemService.acmeSettingsShape,
        httpServer: SystemService.httpServerSettingsShape,
    });

    constructor() {
        super();
        this.bootTime = mkTime();
        this.bootUUID = Crypto.generateUUID();
        this.state = 'system#loaded';
        this.radiusFrameworkPath = '/radius';
        this.settings = SystemService.settingsShape.getDefault();

        this.componentStatus = {
            basic : false,
            acme: false,
            http: false,
            mode: false,
            swarm: false,
            standalone: {
                dbms: false,
                user: false,
                email: false,
            },
        };
    }

    analyzeConfiguration() {
        this.unconfigured = [];
        const stack = [{ dotted: '', component: this.componentStatus }];

        while (stack.length) {
            let unit = stack.pop();

            if (ObjectType.verify(unit.component)) {
                for (let key of Object.keys(unit.component).reverse()) {
                    let dotted;

                    if (unit.dotted) {
                        dotted = [ unit.dotted, key ].join('.');
                    }
                    else {
                        dotted = key;
                    }

                    stack.push({ dotted: dotted, component: unit.component[key] });
                }
            }
            else if (!Data.get(this.componentStatus, unit.dotted)) {
                this.unconfigured.push(unit.dotted);
            }
        }
    }

    analyzeNetworkInterfaces() {
        for (let netInterface of NetInterfaces) {
            if (netInterface.IPv6.getMac() != '00:00:00:00:00:00') {
                return true;
            }
        }

        return false;
    }

    async configureAcme() {
        if (await this.onGetTlsStatus()) {
            this.componentStatus.acme = true;
        }
        else {
            // ************************************************************************
            // ************************************************************************
            // If we have an account KID, attempt renew
            // If we don't or the prior step fails, go into setup mode
            //await this.saveBoot();
        }
    }

    async configureBasicSystem() {
        if (!this.settings.hostId) {
            this.settings.hostId = Crypto.generateUUID();
            const keyAlgorithm = 'rsa';
            const { publicKey, privateKey } = await Crypto.generateKeyPair(keyAlgorithm);
            this.settings.publicKey = Crypto.export(publicKey);
            this.settings.privateKey = Crypto.export(privateKey);
            await this.saveBoot();
        }

        this.componentStatus.basic = true;
    }

    async configureHttp() {
        if (!this.settings.httpServer.enabled) {
            this.settings.httpServer = {
                enabled: true,
                workers: 1,
                acceptCookiesName: 'cookies',
                sessionCookieName: 'session',
            };

            await this.saveBoot();
        }

        await mkSettingsHandle().defineTemporarySetting(
            'httpServer',
            'server',
            SystemService.httpServerSettingsShape,
            this.settings.httpServer,
        );

        this.componentStatus.http = true;
    }

    async configureMode() {
        if (this.settings.mode == 'standalone') {
            // ********************************************************************************
            // ********************************************************************************
        }
        else if (this.settings.mode == 'swarm') {
            // ********************************************************************************
            // ********************************************************************************
        }
        else {
            this.componentStatus.mode = false;
        }
    }

    async createBootKey() {
        let macs = [];

        for (let netInterface of NetInterfaces) {
            if (netInterface.IPv6.getMac() != '00:00:00:00:00:00') {
                macs.push(netInterface.IPv6.getMac());
            }
        }

        if (macs.length) {
            const filename = macs[0].replaceAll(':', '_');
            this.bootPath = Path.join(radius.path, `../${filename}`);

            this.bootKey = await Crypto.generateAesKeyFromSeed(
                'sha256',
                this.bootPath,
                macs.join('-').replaceAll(':', '_'),
                '',
                32,
            );
        }
    }

    async loadBoot() {
        if (await FileSystem.isFile(this.bootPath)) {
            try {
                let encrypted = await FileSystem.readFile(this.bootPath);
                let decrypted = await Crypto.decrypt(this.bootKey, encrypted);
                this.settings = fromJson(decrypted.toString());
            }
            catch (e) {}
        }
    }

    async onBoot(message) {
        if (this.state == 'system#loaded') {
            if (this.analyzeNetworkInterfaces()) {
                await mkPermissionSetHandle().addPermissionTypes(
                    'radius#signedin',
                    'radius#admin',
                    'radius#system',
                );

                await mkHttpLibraryHandle().addData({
                    path: this.radiusFrameworkPath,
                    mime: 'text/javascript',
                    mode: 'tls',
                    once: false,
                    pset: await mkPermissionSetHandle().createPermissionSet(),
                    data: radius.mozilla,
                });

                let packages = mkPackageHandle();
                await packages.loadDirectory(Path.join(radius.path, '/mozilla/package'), '/');
                await packages.loadDirectory(Path.join(radius.path, '/radius'), this.radiusFrameworkPath);

                await this.createBootKey();
                await this.loadBoot();

                await this.configureBasicSystem();
                await this.configureHttp();
                await this.configureAcme();
                await this.configureMode();
                this.analyzeConfiguration();

                if (this.unconfigured.length) {
                    this.mode = 'setup';
                }

                await this.startHttp();
            }
            else {
                throwError('Unable to boot server: no non-virtual network interfaces.');
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
        return { publicKey: this.settings.publicKey, privateKey: this.settings.privateKey };
    }

    async onGetMode(message) {
        return this.mode;
    }

    async onGetRadiusFrameworkPath(message) {
        return this.radiusFrameworkPath;
    }

    async onGetState(message) {
        return this.state;
    }

    async onGetTlsCerts(message) {
        if (mkTime(this.settings.certificate.hostCertExpires) < mkTime()) {
            if (this.settings.certificate.hostCert) {
                if (this.settings.certificate.authCert) {
                    if (this.settings.certificate.rootCert) {
                        return this.settings.certificate;
                    }
                }
            }
        }

        return null;
    }

    async onGetTlsStatus(message) {
        if (mkTime(this.settings.certificate.hostCertExpires) < mkTime()) {
            if (this.settings.certificate.hostCert) {
                if (this.settings.certificate.authCert) {
                    if (this.settings.certificate.rootCert) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    async onGetWebapp(message) {
        return radius.webapp;
    }

    async saveBoot() {
        try {
            let json = toJson(this.settings);
            let encrypted = await Crypto.encrypt(this.bootKey, json);
            await FileSystem.writeFile(this.bootPath, encrypted);
        }
        catch (e) {}
    }

    async startHttp() {
        this.httpServer = await createServer(HttpServer);
        await this.httpServer.start('httpServer');
    }

    async stoptHttp() {
        // ************************************************************************
        // ************************************************************************
    }
});


/*****
 * The handle object for objtaining services from the system service.  System
 * services are focused on managing the status of the installed software, how
 * up to date that software is, how up to date the packages are, and whether
 * the system is ready for operational execution.
*****/
define(class SystemHandle extends Handle {
    async boot() {
        return await this.callService({
        });
    }

    static fromJson(value) {
        return mkSystemHandle();
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

    async getRadiusFrameworkPath() {
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

    async restartHttp() {
        // ************************************************************************
        // ************************************************************************
        return await this.callService({
        });
    }

    async startHttp() {
        // ************************************************************************
        // ************************************************************************
        return await this.callService({
        });
    }

    async stopHttp() {
        // ************************************************************************
        // ************************************************************************
        return await this.callService({
        });
    }
});
    /*
    async bootStandaloneMode() {
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
            
            let httpServer = await createServer(HttpServer);
            await httpServer.start('httpServer');
            let webServices = await mkWebServiceHandle().load();
            await webServices.start();
            await this.launchServers();
        }
        catch (e) {}
        this.state = 'system#setup';
    }
    */

    /*
    async bootSwarmMode() {
        // **************************************************************************
        // **************************************************************************
        try {
        }
        catch (e) {}
        this.state = 'system#setup';
    }
    */

    /*
    async initDbms() {
        // **************************************************************************
        // **************************************************************************
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
    }
    */
/*******************************************************************************************************

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