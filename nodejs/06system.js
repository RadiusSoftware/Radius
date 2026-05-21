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
 *      system#setup
 *      system#ready
 *      system#running
 * 
 * When a system is first installed, it must be configured by attaching it to a
 * swarm or configuring it for standalone operation before is can be used.
*****/
createService(class SystemService extends Service {
    constructor() {
        super();
        this.bootTime = mkTime();
        this.bootUUID = Crypto.generateUUID();
        this.state = 'system#loaded';
    }

    async bootSetupMode() {
        this.hostId = Crypto.generateUUID();

        let { ipv4, ipv6 } = NetInterfaces.getDefaultNetworkInterfacePair();
        this.ipv4 = ipv4;
        this.ipv6 = ipv6;

        let { publicKey, privateKey } = await Crypto.generateKeyPair('rsa');
        this.publicKey = publicKey.export({ type: 'pkcs1', format: 'pem' });
        this.privateKey = privateKey.export({ type: 'pkcs1', format: 'pem' });

        await mkSettingsHandle().defineTemporarySetting(
            'httpServer',
            'server',
            mkRdsShape({
                enabled: BooleanType,
                workers: UInt16Type,
                ipv4: StringType,
                ipv6: StringType,
                radiusPath: StringType,
                acceptCookie: StringType,
                sessionCookie: StringType,
            }),
            {
                enabled: true,
                workers: 1,
                ipv4: this.ipv4 ? this.ipv4.address : '',
                ipv6: this.ipv6 ? this.ipv6.address : '',
                radiusPath: '/radius',
                acceptCookie: 'accept',
                sessionCookie: 'session',
            }
        );

        this.httpServer = await createServer(HttpServer);
        await this.httpServer.start('httpServer');
    }

    async bootSwarmMode() {
        // **************************************************************************
        // **************************************************************************
        try {
        }
        catch (e) {}
        this.state = 'system#setup';
    }

    async bootStandaloneMode() {
        // **************************************************************************
        // **************************************************************************
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

    async onBoot(message) {
        if (this.state == 'system#loaded') {
            let bootData = await this.scanBootFile();

            if (this.status == 'system#ready') {
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

    async onGetMozilla(message) {
        return radius.mozilla;
    }

    async onGetState(message) {
        return this.state;
    }

    async onGetWebapp(message) {
        return radius.webapp;
    }

    async scanBootFile() {
        const bootPath = LibPath.join(__dirname, '../../../.boot');

        if (await FileSystem.isFile(bootPath)) {
            try {
                const bootSettings = fromJson((await FileSystem.readFile(bootPath)).toString());

                const bootShape = mkRdsShape({
                    mode: mkRdsEnum('system#swarm', 'system#standalone'),
                    ipv4: StringType,
                    ipv6: StringType,
                    hostId: StringType,

                    _swarm: {
                        id: StringType,
                        secret: StringType,
                        hosts: [ StringType ],
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

                if (bootSettings && bootShape.verify(bootSettings)) {
                    this.mode = bootSettings.mode;
                    this.ipv4 = bootSettings.ipv4;
                    this.ipv6 = bootSettings.ipv6;
                    this.hostId = bootSettings.hostId;

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
                            id: bootSettings.swarm.id,
                            secret: bootSettings.swarm.secret,
                            hosts: bootSettings.swarm.hosts,
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
});


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

    async getKeypair() {
        return await this.callService({
        });
    }

    async getMode() {
        return await this.callService({
        });
    }

    async getMozilla() {
        return await this.callService({
        });
    }

    async getState() {
        return await this.callService({
        });
    }

    async getWebapp() {
        return await this.callService({
        });
    }
});