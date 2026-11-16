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
 *      MODE
 *      ****
 *      system#setup
 *      system#standalone
 *      system#serverteam
 * 
 *      SETUP
 *      *****
 *      setup#acme
 *      setup#mode
 *      setup#dbms
 *      setup#mailer
 *      setup#user
 *      setup#serverteam
 * 
 * ServerTeam mode is somewhat complex to describe because the DBMS access,
 * user management, and spooling (email, sms...) are all performed via thunks
 * that connect via webservices within the server team.
*****/
createService(class SystemService extends Service {
    static acmeSettingsShape = mkRdsShape({
        name: StringType,
        url: StringType,
        days: Int32Type,
        keyAlg: StringType,
        publicKey: StringType,
        privateKey: StringType,
        contact: [ EmailType ],
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

    static dbmsSettingsShape = mkRdsShape({
        dbmsType: StringType,
        timeout: Int32Type,
        host: StringType,
        port: Int32Type,
        database: StringType,
        username: StringType,
        password: StringType,
        certificate: StringType,
    });

    static serverTeamSettingsShape = mkRdsShape({
        serverTeamId: StringType,
        serverTeamSecret: StringType,
        serverTeamHosts: [ StringType ],
    });

    static httpServerSettingsShape = mkRdsShape({
        enabled: BooleanType,
        workers: UInt16Type,
        acceptCookiesName: StringType,
        sessionCookieName: StringType,
    });

    static settingsShape = mkRdsShape({
        mode: StringType,
        host: StringType,
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

        serverteam: SystemService.serverTeamSettingsShape,
        dbms: SystemService.dbmsSettingsShape,
        acme: SystemService.acmeSettingsShape,
        httpServer: SystemService.httpServerSettingsShape,
    });

    constructor() {
        super();
        this.bootTime = mkTime();
        this.bootUUID = Crypto.generateUUID();
        this.radiusFrameworkPath = '/radius';
        this.settings = SystemService.settingsShape.getDefault();

        this.componentStatus = {
            basic : false,
            http: false,
            acme: false,
            mode: false,
            dbms: false,
            email: false,
            user: false,
            serverteam: false,
        };
    }

    analyzeConfiguration() {
        this.unconfigured = Object.keys(this.componentStatus);

        if (!this.componentStatus.basic) return;
        this.unconfigured.shift();

        if (!this.componentStatus.acme) return;
        this.unconfigured.shift();
        
        if (!this.componentStatus.http) return;
        this.unconfigured.shift();
        
        if (!this.componentStatus.mode) return;
        this.unconfigured.shift();
        
        if (this.systemMode == 'system#standalone') {
            if (!this.componentStatus.dbms) return;
            this.unconfigured.shift();

            if (!this.componentStatus.email) return;
            this.unconfigured.shift();

            if (!this.componentStatus.user) return;
            this.unconfigured.shift();
        }
        else if (this.systemMode == 'system#serverteam') {
            if (!this.componentStatus.serverteam) return;
            this.unconfigured.shift();
        }
    }

    async certifyHost(channel) {
        let acmeClient = await mkAcmeClient();

        let response = await acmeClient.certifyHost({
            hostname: this.settings.host,
            shape: SystemService.acmeSettingsShape,
            settings: this.settings.acme,
            privateKey: this.settings.privateKey,
            channel: channel,
        });

        if (response instanceof Failure) {
            return response;
        }
        else {
            this.settings.certificate.rootCert = response.rootCert;
            this.settings.certificate.authCert = response.authCert;
            this.settings.certificate.hostCert = response.hostCert;
            this.settings.certificate.hostCertSubject = response.hostCertSubject;
            this.settings.certificate.hostCertExpires = response.hostCertExpires;
            await this.saveBoot();
            await this.restartHttp();
        }
    }

    async createBootKey() {
        let machineId;

        if (LibOs.platform == 'darwin') {
            let out = await Process.runScript('ioreg -rd1 -c IOPlatformExpertDevice');

            if (!out.stderr) {
                const match = out.stdout.match(/"IOPlatformUUID" = "([^"]+)"/);
                match ? machineId = match[1] : null;
            }
        }
        else if (LibOs.platform == 'linux') {
            machineId = (await FileSystem.readFileAsString('/etc/machine-id')).trim();
        }
        else if (LibOs.platform == 'win32') {
            const out = await Process.runScript(
                'reg',
                [
                'query',
                'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
                '/v',
                'MachineGuid'
                ],
                { encoding: 'utf8' }
            );

            const match = out.match(/MachineGuid\s+REG_SZ\s+(.+)/);
            return match ? machineId = match[1] : null;
        }

        if (machineId) {
            this.bootPath = Path.join(radius.path, '..', 'rdsboot');

            this.bootKey = await Crypto.generateAesKeyFromSeed(
                'sha256',
                this.bootPath,
                `machineId`,
                '',
                32,
            );
        }
        else {
            throwError('Unable to generate the Radius boot key.');
        }
    }

    getSetupState() {
        if (this.settings.mode == 'system#setup') {
            if (this.unconfigured.length) {
                return `setup#${this.unconfigured[0]}`;
            }
        }
        
        return 'setup#done';
    }

    hasAcmeAccount() {
        let acme = this.settings.acme;

        if (acme.name && acme.url && acme.kid) {
            if (acme.publicKey && acme.privateKey) {
                if (acme.operator.country) {
                    if (acme.operator.state) {
                        if (acme.operator.locale) {
                            if (acme.operator.org) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    async initAcme() {
        if (await this.onGetTlsStatus()) {
            this.componentStatus.acme = true;
        }
        else if (!this.settings.acme.publicKey) {
            const keyPair = await Crypto.generateKeyPair('rsa');

            this.settings.acme = {
                name: 'Let\'s Encrypt',
                url: 'https://acme-v02.api.letsencrypt.org/directory',
                days: 90,
                keyAlg: 'RS256',
                publicKey: Crypto.export(keyPair.publicKey),
                privateKey: Crypto.export(keyPair.privateKey),
                contact: [],
                createdAt: '',
                status: '',
                kid: '',
                operator: {
                    country: '',
                    state: '',
                    locale: '',
                    org: '',
                }
            };
        }
    }

    async initBasicSystem() {
        if (!this.settings.host) {
            this.settings.host = '';
            this.settings.hostId = Crypto.generateUUID();
            const keyAlgorithm = 'rsa';
            const { publicKey, privateKey } = await Crypto.generateKeyPair(keyAlgorithm);
            this.settings.publicKey = Crypto.export(publicKey);
            this.settings.privateKey = Crypto.export(privateKey);
        }

        this.componentStatus.basic = true;
    }

    async initDbms() {
        if (this.settings.dbms.dbmsType) {
            let settings = RdsData.clone(this.settings.dbms);
            settings.database = '';
            let dbc = await Dbms.connect(settings);
            let dbcState = dbc.getState();
            await dbc.close();
            await dbc.free();

            if (dbcState == 'connected') {
                this.componentStatus.dbms = true;
                return true;
            }
        }

        return false;
    }

    async initEmailer() {
        // **************************************************************************
        // **************************************************************************
    }

    async initHttp() {
        if (!this.settings.httpServer.enabled) {
            this.settings.httpServer = {
                enabled: true,
                workers: 1,
                acceptCookiesName: 'cookies',
                sessionCookieName: 'session',
            };
        }

        await mkSettingsHandle().defineTemporarySetting(
            'httpServer',
            'server',
            SystemService.httpServerSettingsShape,
            this.settings.httpServer,
        );

        this.componentStatus.http = true;
    }

    async initMode() {
        if (this.settings.systemMode == 'system#standalone') {
            this.componentStatus.mode = true;
            await this.initDbms();

            if (this.componentStatus.dbms) {
                await this.initEmailer();

                if (this.componentStatus.email) {
                    await this.initUser();
                }
            }
        }
        else if (this.settings.mode == 'system#serverteam') {
            this.componentStatus.mode = true;
            await this.initServerTeam();
        }
    }

    async initServerTeam() {
        // **************************************************************************
        // **************************************************************************
    }

    async initUser() {
        // **************************************************************************
        // **************************************************************************
    }

    async loadBoot() {
        if (await FileSystem.isFile(this.bootPath)) {
            try {
                let encrypted = await FileSystem.readFile(this.bootPath);
                let decrypted = await Crypto.decrypt(this.bootKey, encrypted);
                this.settings = fromJson(decrypted.toString());
            }
            catch (e) {
                await FileSystem.deleteFile(this.bootPath);
            }
        }
    }

    async loadPackages() {
        let packages = mkPackageHandle();
        await packages.loadPackage(Path.join(radius.path, '/mozilla/package'), '/');

        if (this.settings.mode == 'system#serverteam') {
            // **************************************************************************
            // **************************************************************************
            console.log(`Packages ${this.settings.mode}`);
        }
        else if (this.settings.mode == 'system#standalone') {
            let settings = mkSettingsHandle();

            if (await settings.hasSetting('packagePaths')) {
                for (let packagePath of await settings.getSetting('packagePaths')) {
                    await packages.loadPackage(Path.join(radius.path, packagePath), '/');
                }
            }
        }
    }

    async onBoot(message) {
        await mkHttpLibraryHandle().addData({
            path: this.radiusFrameworkPath,
            mime: 'text/javascript',
            mode: 'tls',
            once: false,
            pset: await mkPermissionSetHandle().createPermissionSet(),
            data: radius.mozilla,
        });

        await this.createBootKey();
        await this.loadBoot();
        await this.initBasicSystem();
        await this.initHttp();
        await this.initAcme();
        await this.initMode();
        this.analyzeConfiguration();

        if (this.unconfigured.length) {
            this.settings.mode = 'system#setup';
            await this.saveBoot();
        }

        await this.loadPackages();
        await this.upgradeSchema();
        await this.startHttp();
    }

    async onCertifyHost(message) {
        await message.channel.ready();
        this.certifyHost(message.channel);
    }

    async onGetAcmeSettings(message) {
        return {
            shape: SystemService.acmeSettingsShape,
            value: this.settings.acme,
        };
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
        return this.settings.mode;
    }

    async onGetRadiusFrameworkPath(message) {
        return this.radiusFrameworkPath;
    }

    async onGetSetupData(message) {
        return {
            shape: mkRdsShape({
                setupState: StringType,
                systemMode: StringType,

                acme: {
                    host: StringType,
                    name: StringType,
                    url: StringType,
                    contact: [ EmailType ],
                    operator: {
                        country: StringType,
                        state: StringType,
                        locale: StringType,
                        org: StringType,
                    }
                },

                dbms: SystemService.dbmsSettingsShape,
                serverteam: SystemService.serverTeamSettingsShape,
            }),

            value: {
                setupState: this.getSetupState(),
                systemMode: this.settings.mode,

                acme: {
                    host: this.settings.host,
                    name: this.settings.acme.name,
                    url: this.settings.acme.url,
                    contact: this.settings.acme.contact,
                    operator: {
                        country: this.settings.acme.operator.country,
                        state: this.settings.acme.operator.state,
                        locale: this.settings.acme.operator.locale,
                        org: this.settings.acme.operator.org,
                    }
                },

                dbms: this.settings.dbms,
                serverteam: this.settings.serverteam,
            }
        };
    }

    async onGetTlsCerts(message) {
        if (mkTime(this.settings.certificate.hostCertExpires) > mkTime()) {
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
        if (mkTime(this.settings.certificate.hostCertExpires) > mkTime()) {
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

    async onRestartHttp(message) {
        this.restartHttp();
    }

    async onSaveBoot(message) {
        await this.saveBoot();
    }

    async onSetAcmeSettings(message) {
        this.settings.host = message.settings.host;
        this.settings.acme.name = message.settings.name;
        this.settings.acme.url = message.settings.url;
        this.settings.acme.contact = message.settings.contact;
        this.settings.acme.operator = message.settings.operator;
        await this.saveBoot();
    }

    async onSetDbmsSettings(message) {
        if (this.settings.systemMode == 'system#standalone') {
            if (SystemService.dbmsSettingsShape.verify(message.settings)) {
                Object.assign(this.settings.dbms);
                return await this.initDbms();
            }
        }

        return false;
    }

    async onSetSystemMode(message) {
        if (message.systemMode != this.settings.systemMode) {
            if (message.systemMode in { 'system#standalone':0, 'system#serverteam':0 }) {
                this.settings.systemMode = message.systemMode;
                this.componentStatus.mode = true;
                this.unconfigured.shift();
                await this.saveBoot();
                return this.getSetupState();
            }
        }
    }

    async onStartHttp(message) {
        await this.startHttp();
    }
    
    async onStopHttp(message) {
        await this.stopHttp();
    }

    async restartHttp() {
        if (this.httpServer) {
            await this.stopHttp();
            await this.startHttp();
        }
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
        if (!this.httpServer) {
            this.httpServer = await createServer(HttpServer);
            await this.httpServer.start('httpServer');
        }
    }

    async stopHttp() {
        if (this.httpServer) {
            await this.httpServer.shutdown();
            delete this.httpServer;
        }
    }

    // **************************************************************************
    // **************************************************************************
    async upgradeSchema() {
        if (this.componentStatus.dbms) {
            try {
                if (!(await Dbms.doesDatabaseExist(settings))) {
                    await Dbms.createDatabase(settings);
                }

                let schema1 = await Dbms.getDatabaseSchema(settings);
                let schema2 = mkFrameworkSchema();

                for (let diff of mkSchemaAnalysis(schema1, schema2)) {
                    await SchemaUpdater.upgrade(settings, diff);
                }

                for (let dbTable of schema2) {
                    if (dbTable.getType() == 'object') {
                        defineDbo('', dbTable);
                    }
                }

                await Dbms.setSettings(this.sysdb);
            }
            catch (e) {
                return {
                    error: e,
                }
            }
        }
    }

    async wipeSchema() {
        // **************************************************************************
        // **************************************************************************
        /*
        if (await Dbms.doesDatabaseExist(radiusDbms)) {
            await Dbms.dropDatabase(radiusDbms);
        }
        */
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

    async certifyHost(channel) {
        return await this.callService({
            channel: channel,
        });
    }

    static fromJson(value) {
        return mkSystemHandle();
    }

    async getAcmeSettings() {
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

    async getSetupData() {
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

    async getSetupData() {
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
        return await this.callService({
        });
    }

    async setAcmeSettings(settings) {
        return await this.callService({
            settings: settings,
        });
    }

    async setDbmsSettings(settings) {
        return await this.callService({
            settings: settings,
        });
    }

    async setSystemMode(systemMode) {
        if (systemMode in { 'system#standalone':0, 'system#serverteam':0 }) {
            return await this.callService({
                systemMode: systemMode,
            });
        }
    }

    async startHttp() {
        return await this.callService({
        });
    }
    
    async stopHttp() {
        return await this.callService({
        });
    }

    static {
        (async () => {
            let setupData = await (new SystemHandle()).getSetupData();
            SystemHandle.setupDataShape = setupData.shape;
        })();
    }
});