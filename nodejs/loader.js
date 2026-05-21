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

LibCrypto       = require('node:crypto');
LibChildProcess = require('node:child_process');
LibCluster      = require('node:cluster');
LibDgrm         = require('node:dgram');
LibDns          = require('node:dns');
LibFileSystem   = require('node:fs');
LibHttp         = require('http');
LibHttps        = require('https');
LibNet          = require('net');
LibOs           = require('node:os');
LibPath         = require('node:path');
LibProcess      = require('node:process');
LibQueryString  = require('node:querystring');
LibUrl          = require('url');
LibZlib         = require('node:zlib');
NpmHtml         = require('node-html-parser');
NpmPg           = require('pg');
NpmYauzl        = require('yauzl');
NpmYazl         = require('yazl');


/*****
 * When a new process is started, either the primary or a worker, this function
 * kicks everything off by loading in the Radius framework right from the file
 * system.  Note that Mozilla code is NOT loaded at this time.  That's the job
 * of the System Service.  Once the Radius framework is loaded, that's where
 * they diverge.  The primary process creates a System Service handle to boot
 * the system, whereas the worker process starts the server worker.  Spawning
 * a server worker is what triggers this code to be called for a worker.
*****/
if (LibCluster.isPrimary) {
    globalThis.radius = {};

    (async () => {
        let radiusPath = LibPath.join(__dirname, '..');

        async function enumerate(...dirs) {
            let files = [];

            for (let dir of dirs) {
                let stack = [ dir ];

                while (stack.length) {
                    let dir = stack.shift();
                    let dirEntries = await LibFileSystem.promises.readdir(dir);

                    dirEntries = dirEntries.filter(dirEntry => {
                        if (dirEntry.startsWith('.')) return false;
                        if (dirEntry == 'package') return false;
                        if (dirEntry == 'webapp.html') return false;
                        return true;
                    });

                    for (let dirEntry of dirEntries) {
                        let path = LibPath.join(dir, dirEntry);
                        let stats = await LibFileSystem.promises.stat(path);

                        if (stats.isFile()) {
                            files.push(path);
                        }
                        else if (stats.isDirectory()) {
                            stack.push(path);
                        }
                    }
                }
            }

            return files;
        };

        let mozillaFiles = [];
        let nodejsFiles = await enumerate(
            LibPath.join(radiusPath, 'javascript'),
            LibPath.join(radiusPath, 'nodejs'),
        );

        for (let nodejsFile of nodejsFiles) {
            if (nodejsFile.endsWith('.js')) {
                require(nodejsFile);
            }
        }

        for (let mozillaFile of await enumerate(
            LibPath.join(radiusPath, 'javascript'),
            LibPath.join(radiusPath, 'mozilla'),
        )) {
            if (mozillaFile.endsWith('.js')) {
                mozillaFiles.push(
                    (await FileSystem.readFile(mozillaFile)).toString()
                )
            }
        }

        radius.nodejs = toJson(nodejsFiles);
        radius.webapp = (await FileSystem.readFile(Path.join(radiusPath, 'nodejs/httpServer/webapp.html'))).toString();
        radius.mozilla = mkBuffer(mozillaFiles.join()).toString('base64');
        mkSystemHandle().boot();
    })();
}


/*****
 * This code is called when a worker is created.  The first thing that needs to
 * happen is to load the Radius nodejs framework.  It's convenient that the
 * process environment variable "nodejsFramework" contains an encoded array of
 * file paths to require.  Once the nodejs framework has been loaded, the next
 * step is to execute the launcher, which starts the server worker.  Finally,
 * clean up after everything and notify the primary Process that initializion
 * has taken place.
*****/
if (!LibCluster.isPrimary) {
    (async () => {
        for (let file of JSON.parse(LibProcess.env.nodejsFramework)) {
            require(file);
        }

        let launcher;
        eval(`launcher = ${mkBuffer(Process.getEnv('launcher'), 'base64').toString()}`);
        await launcher();

        Process.sendPrimary({ name: Process.getEnv('oneTimeUUID') });
        Process.deleteEnv('nodejsFramework');
        Process.deleteEnv('launcher');
        Process.deleteEnv('oneTimeUUID');
    })();
}
/*
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
    */
    // *******************************************************************************************************
    // *******************************************************************************************************
    // *******************************************************************************************************
    // *******************************************************************************************************
    /*
    globalThis.Loader = new (class Loader {
        constructor() {
            //this.sourceFiles = [];
            //this.radiusPath = LibPath.join(__dirname, '..');
            //this.javascriptPath = LibPath.join(this.radiusPath, 'javascript');
            //this.nodejsPath = LibPath.join(this.radiusPath, 'nodejs');
            //this.load();
        }

        async buildConfiguration() {
            let settings = mkSettingsHandle();
            await settings.loadSettings();

            for (let arg of Object.values(this.args)) {
                if (arg.settingName) {
                    await settings.defineTemporarySetting(
                        arg.settingName,
                        'parameters',
                        arg.settingType == 'boolean' ? BooleanType : StringType,
                        arg.value
                    );
                }
            }

            await settings.defineTemporarySetting('nodeId', 'system', StringType, Crypto.generateUUID());
            await settings.defineTemporarySetting('bootTime', 'system', DateType, mkTime());

            await settings.defineTemporarySetting(
                'nodejsFramework',
                'system',
                StringType,
                this.nodejsFramework.join('\n'),
            );
        }

        async initializeSystem() {
            let dbms = mkDbmsThunk();
            let settings = mkSettingsHandle()

            await settings.defineSetting(
                'httpServer',
                'server',
                mkRdsShape({
                    enabled: BooleanType,
                    workers: UInt16Type,
                    _ipv4: StringType,
                    _ipv6: StringType,
                    _host: StringType,
                    _cert: StringType,
                    _auth: StringType,
                }),
                {
                    enabled: true,
                    workers: 1,
                    ipv4: '0.0.0.0',
                    ipv6: '::',
                }
            );
            
            await settings.defineSetting(
                'permissionTypes',
                'security',
                [ StringType ],
                [
                    'radius:cookies',
                    'radius:session',
                    'radius:signedin',
                    'radius:admin',
                    'radius:system',
                    'radius:websocket',
                ]
            );

            await settings.defineSetting(
                'cluster',
                'system',
                BooleanType,
                false
            );

            await settings.defineSetting('radiusPath', 'general', StringType, '/radius');
            await settings.defineSetting('acceptCookiesName', 'privacy', StringType, 'kibble');
            await settings.defineSetting('acceptCookiesDays', 'privacy', Int32Type, 180);
            await settings.defineSetting('sessionTimeoutMillis', 'security', Int32Type, 120*60*60*1000);
            await settings.defineSetting('sessionShutdowntMillis', 'security', Int32Type, 240*60*60*1000);
            await settings.defineSetting('sessionCookieName', 'security', StringType, `sxkibble`);
            await settings.defineSetting('loginMaxFailures', 'security', Int32Type, 4);
            await settings.defineSetting('loginMaxMfaMinutes', 'security', Int32Type, 5);
            await settings.defineSetting('passwordMaxDays', 'security', Int32Type, -1);
            await settings.defineSetting('passwordHistoryMaxDays', 'security', Int32Type, 365);
            await settings.defineSetting('forgetDeviceDays', 'security', Int32Type, 90);
            await settings.defineSetting('packages', 'package', ArrayType, []);
            await settings.defineSetting('webServicesPath', 'server', StringType, '/ws');
            await settings.defineSetting('system#settings-initialized', 'system', BooleanType, true);

            const { publicKey, privateKey } = await Crypto.generateKeyPair('rsa');
            let publicPem = publicKey.export({ type: 'pkcs1', format: 'pem' });
            let privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' });
            await settings.defineSetting('publicKey', 'security', StringType, publicPem);
            await settings.defineSetting('privateKey', 'security', StringType, privatePem);

            await dbms.createObj(DboTeam, {
                name: '',
                active: true,
                settings: {},
            });
        }

        async load() {
            for (let context of [ 'javascript', 'nodejs' ]) {
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

            mkSystemHandle().boot();
            /*
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
    });
    */