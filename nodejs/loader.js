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
"user strict"
LibCluster      = require('node:cluster');
LibFileSystem   = require('node:fs');
LibOs           = require('node:os');
LibPath         = require('node:path');
LibProcess      = require('node:process');


/*****
 * The Loader is part of the Radius project, which is apart from the framework
 * itself.  The framework itself does not have its own load and cannot load
 * itself.  The primary process Loader does the heavy lifting of processing the
 * command line, searching for files, and configuring settings that are needed
 * by the framework.  When the framework is loaded and built (and minified if
 * appropriately not in debug mode), it stores the framework in the settings for
 * the child processes.  Once ready, the launch mode is determined and the proper
 * launch function is called to start the Radius application server.
*****/
if (LibCluster.isPrimary) {
    globalThis.Loader = new (class Loader {
        constructor() {
            this.argInfo = {
                '-dbms': {
                    hasValue: true,
                    settingName: 'dbmsPath',
                    default: LibPath.join(__dirname, '../../Radius.json')
                },
                '-debug': {
                    hasValue: false,
                    settingName: 'debugMode'
                },
                '-factory-reset-everything-on-this-host': {
                    hasValue: false,
                },
            };

            this.radiusPath = LibPath.join(__dirname, '..');
            this.javascriptPath = LibPath.join(__dirname, '..', 'javascript');
            this.nodejsPath = LibPath.join(__dirname, '..', 'nodejs');
            this.mozillaPath = LibPath.join(__dirname, '..', 'mozilla');
            this.serverPath = LibPath.join(__dirname, 'server');
            this.sourceFiles = {};
            this.nodejsFramework = [];
            this.load();
        }

        async buildConfiguration() {
            let settings = mkSettingsHandle();

            if (!await settings.loadSettings()) {
                await settings.defineSetting(
                    'httpServer',
                    'server',
                    mkRdsShape({
                        publicKey: StringType,
                        privateKey: StringType,
                        listeners: [{
                            workers: Int32Type,
                            ipv4: StringType,
                            ipv6: StringType,
                            _cert: StringType,
                            _auth: StringType,
                        }]
                    }),
                    {
                        publicKey: '',
                        privateKey: '',
                        listeners: [{
                            workers: 1,
                            ipv4: '0.0.0.0',
                            ipv6: '::'
                        }]
                    }
                );
                
                await settings.defineSetting(
                    'permissionTypes',
                    'general',
                    EnumType,
                    [
                        'radius#cookies',
                        'radius#session',
                        'radius#signedin',
                        'radius#admin',
                        'radius#system',
                        'radius#websocket',
                    ]
                );

                await settings.defineSetting('acceptCookiesName', 'general', StringType, 'kibble');
                await settings.defineSetting('radiusPath', 'general', StringType, '/radius');
                await settings.defineSetting('sessionTimeoutMillis', 'general', Int32Type, 120*60*60*1000);
                await settings.defineSetting('sessionShutdowntMillis', 'general', Int32Type, 240*60*60*1000);
                await settings.defineSetting('sessionCookiePrefix', 'general', StringType, 'sx-');
                await settings.defineSetting('loginMaxFailures', 'general', Int32Type, 4);
                await settings.defineSetting('loginMaxMfaMinutes', 'general', Int32Type, 5);
                await settings.defineSetting('passwordMaxDays', 'general', Int32Type, -1);
                await settings.defineSetting('passwordHistoryMaxDays', 'general', Int32Type, 365);
                await settings.defineSetting('forgetDeviceDays', 'general', Int32Type, 90);
                await settings.defineSetting('packages', 'general', ArrayType, []);
                await settings.defineSetting('webServicesPath', 'general', StringType, '/ws');
                // TODO ********************************************************************************
                // TODO ********************************************************************************
                //await settings.defineSetting('radiusCluster', 'cluster', StringType, '#NOTSET#');
                await settings.defineSetting('clusterName', 'cluster', StringType, '#NOUSER#');
                await settings.defineSetting('clusterKey', 'cluster', StringType, '');
                await settings.defineSetting('clusterSubnet', 'cluster', StringType, '');
                // TODO ********************************************************************************
                // TODO ********************************************************************************

                await this.createClusterWebServices();
                await settings.defineSetting('system#settings-initialized', 'general', BooleanType, true);
            }

            for (let arg of Object.values(this.args)) {
                if (arg.settingName) {
                    await settings.defineTemporarySetting(
                        arg.settingName,
                        'general',
                        arg.settingType == 'boolean' ? BooleanType : StringType,
                        arg.value
                    );
                }
            }

            await settings.defineTemporarySetting('nodeId', 'general', StringType, Crypto.generateUUID());
            await settings.defineTemporarySetting('bootTime', 'general', DateType, mkTime());
            await settings.defineTemporarySetting('sessionCookieName', 'general', StringType, Crypto.generateUUID());

            await settings.defineTemporarySetting(
                'nodejsFramework',
                'general',
                StringType,
                this.nodejsFramework.join('\n'),
            );
        }

        async createClusterWebServices() {
            /*
            let wsHandle = mkWebServiceHandle();
            let teamId = (await mkTeamHandle().openNoTeam()).id;
            console.log(teamId);

            await wsHandle.create({
                clss: ServiceWebService,
                name: 'Web Service Cluster Connection',
                enabled: false,
                locked: true,
                path: '/clusterwebservice',
                authType: 'apikey',
                teamId: teamId,
                permissions: [],
                addrs: [],
            });

            await wsHandle.create({
                clss: ThunkWebService,
                name: 'DBMS Thunk Cluster Connection',
                enabled: false,
                locked: true,
                path: '/clusterthunk',
                authType: 'apikey',
                teamId: teamId,
                permissions: [],
                addrs: [],
            });
            */
        }

        async enumerateContext(context) {
            let path = this[`${context}Path`];
            let stack = [{ context: context, path: path }];

            while (stack.length) {
                let { context, path } = stack.shift();
                let dirEntries = await LibFileSystem.promises.readdir(path);
                dirEntries = dirEntries.filter(dirEntry => !dirEntry.startsWith('.'));

                for (let dirEntry of dirEntries) {
                    let entryPath = LibPath.join(path, dirEntry);
                    let entryContext = `${context}.${dirEntry}`;
                    let stats = await LibFileSystem.promises.stat(entryPath);

                    if (stats.isFile()) {
                        this.sourceFiles[entryContext] = { path: entryPath };
                    }
                    else if (stats.isDirectory()) {
                        stack.push({ context: entryContext, path: entryPath });
                    }
                }
            }
        }

        async initializeRadiusDbms() {
            let path = this.args['-dbms'].value;

            try {
                let stats = await LibFileSystem.promises.stat(path);

                if (stats.isFile()) {
                    let content = await LibFileSystem.promises.readFile(path);
                    let radiusDbms =  JSON.parse(content.toString());

                    if (this.args['-factory-reset-everything-on-this-host'].value) {
                        if (this.args['-debug'].value) {
                            if (await Dbms.doesDatabaseExist(radiusDbms)) {
                                await Dbms.dropDatabase(radiusDbms);
                            }
                        }
                    }

                    if (!(await Dbms.doesDatabaseExist(radiusDbms))) {
                        await Dbms.createDatabase(radiusDbms);
                    }

                    let schema1 = await Dbms.getDatabaseSchema(radiusDbms);
                    let schema2 = mkFrameworkSchema();

                    for (let diff of mkSchemaAnalysis(schema1, schema2)) {
                        await SchemaUpdater.upgrade(radiusDbms, diff);
                    }

                    for (let dbTable of schema2) {
                        if (dbTable.getType() == 'object') {
                            defineDbo('', dbTable);
                        }
                    }

                    await Dbms.setSettings(radiusDbms);
                    return true;
                }
            }
            catch (e) {}
            return false;
        }

        async launchServers() {
            // **********************************************************************************
            // **********************************************************************************
            console.log('\n*** LAUNCH REMAINING CONFIGURED SERVERS\n');
        }

        async load() {
            this.parseCommandLine();
            let mozillaFramework = [];

            for (let context of [ 'javascript', 'mozilla', 'nodejs' ]) {
                await this.enumerateContext(context);
            }

            for (let context of Object.keys(this.sourceFiles)) {
                let sourceFile = this.sourceFiles[context];
                let content = await LibFileSystem.promises.readFile(sourceFile.path);

                if ((context.startsWith('javascript') || context.startsWith('mozilla')) && sourceFile.path.endsWith('.js')) {
                    mozillaFramework.push(content.toString());
                }

                if (!context.startsWith('mozilla') && sourceFile.path.endsWith('.js')) {
                    require(sourceFile.path);
                    this.nodejsFramework.push(`require('${sourceFile.path}');`);
                }
            }

            let json = toJson(mkRdsShape({
                name: StringType,
                code: [ /[0-9]{4,4}_[a-z]+/, /abcd-alpha/ ],
                count: UInt8Type,
                choice: mkRdsEnum('one:ONE', 'two:TWO', 'three:THREE'),
                func: FunctionType,
                value: MultiplyExpr,
                buff: BufferType,
                obj: {
                    four: {
                        one: Int32Type,
                        two: Int32Type,
                        three: ObjectType,
                    }
                },
            }));

            let shape = fromJson(json);

            console.log(shape.verify({
                name: 'Mr Bean',
                code: [ '1234_eiuerhugrejkhgeriuhgreiuh', 'abcd-alpha', '1234_eiuerhugrejkhgeriuhgreiuh' ],
                count: 3,
                choice: 'one',
                func: () => 'hello world',
                value: mkMultiplyExpr(4, 4),
                buff: mkBuffer('hello world'),
                obj: {
                    one: 1,
                    two: 2,
                    four: {
                        one: 1,
                        two: 2,
                        three: {
                        }
                    }
                }
            }));

            return;

            if (await this.initializeRadiusDbms()) {
                await this.buildConfiguration();

                let permissionTypes = await mkSettingsHandle().getSetting('permissionTypes');
                await mkPermissionSetHandle().addPermissionTypes(...permissionTypes);

                let packages = mkPackageHandle();
                let library = mkHttpLibraryHandle();
                let settings = mkSettingsHandle();

                await packages.loadDirectory(Path.join(__dirname, '../mozilla/package'), '/');
                await packages.loadDirectory(Path.join(__dirname, '../radius'), '/');

                for (let { path, url } of await mkSettingsHandle().getSetting('packages')) {
                    await packages.loadDirectory(path, url);
                }

                let radiusPath = await settings.getSetting('radiusPath');
                let acceptCookiesPath = await settings.getSetting('acceptCookiesPath');

                await library.addData({
                    path: radiusPath,
                    mime: 'text/javascript',
                    mode: '',
                    once: false,
                    pset: await mkPermissionSetHandle().createPermissionSet(),
                    data: mozillaFramework.join('\n'),
                });

                await library.setFlag(radiusPath, 'nocookies');
                await library.setFlag(acceptCookiesPath, 'nocookies');

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

        parseCommandLine() {
            this.args = {};

            for (let argName in this.argInfo) {
                let argInfo = this.argInfo[argName];

                if (argInfo.hasValue) {
                    this.args[argName] = {
                        argName: argName,
                        settingName: argInfo.settingName,
                        settingType: 'string',
                        value: argInfo.default ? argInfo.default : '',
                    };
                }
                else {
                    this.args[argName] = {
                        argName: argName,
                        settingName: argInfo.settingName,
                        settingType: 'boolean',
                        value: false,
                    };
                }
            }
            
            for (let i = 2; i < LibProcess.argv.length; i++) {
                let processArg = LibProcess.argv[i];

                if (processArg in this.args) {
                    let arg = this.args[processArg];

                    if (arg.settingType == 'string') {
                        if (i + 1 < LibProcess.argv.length) {
                            if (i + 1 < LibProess.argv.length) {
                                if (!LibProcess.argv[i + 1].startsWith('-')) {
                                    arg.value = LibProcess.argv[i + 1];
                                }
                            }
                        }
                    }
                    else {
                        arg.value = true;
                    }
                }
            }
        }
    })();
}


/*****
 * The Loader is part of the Radius project, which is apart from the framework
 * itself.  The framework itself does not have its own load and cannot load
 * itself.  The child process Loader was developed to be quick and efficient.
 * Necessary settings are loaded from the well known temporary file and used
 * to launch the Radius server.  The nodejsFramework settng is executed with
 * eval(), which requires all of the parts of the common framework and the nodejs
 * framework.  At this point, call the Process's launch() function to invoke the
 * launcher function, if properly provided.
*****/
else {
    globalThis.Loader = new (class Loader {
        constructor() {
            let bootUUID = LibProcess.env.bootUUID;
            delete LibProcess.env.bootUUID;
            LibProcess.send(JSON.stringify({ name: bootUUID }));

            LibProcess.on('message', async data => {
                if (globalThis.Process) {
                    if (this.bootstrap) {
                        let func = this.bootstrap;
                        this.bootstrap = null;
                        await func(data);
                    }

                }
                else {
                    eval(data);
                }
            });
        }

        async bootstrap(data) {
            let launcher;
            let message = fromJson(data);
            let launcherCode = mkBuffer(message.launcher, 'base64').toString();            
            await eval(`launcher=${launcherCode}`);
            await Namespace.init();
            await launcher();
        }
    })();
}
