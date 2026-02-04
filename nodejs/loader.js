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
            this.radiusPath = LibPath.join(__dirname, 'radius');
            this.sourceFiles = {};
            this.nodejsFramework = [];
            this.load();
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
            /*
            let breed = mkRdsEnum('collie', 'aussie', 'shepard');
            let citrus = mkRdsEnum('lemon', 'orange', 'lime', 'grapefruit');
            let touch = mkRdsEnum('soft', 'firm');

            let shape = mkRdsShape({
                name: StringType,
                created: DateType,
                breed: breed,
                _sub: {
                    fruit: citrus,
                    count: UInt8Type,
                    texture: {
                        touch: touch,
                        smoothness: NumberType,
                        blemished: BooleanType,
                    }
                }
            });

            let json = toJson(shape);
            shape = fromJson(json);

            console.log(shape.verifyStrictly({
                name: 'Fido',
                created: mkTime(),
                breed: 'aussie',
                sub: {
                    fruit: 'grapefruit',
                    count: 255,
                    texture: {
                        touch: 'soft',
                        smoothness: 78,
                        blemished: false,
                    }
                }
            }));
            */

            /*
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
            */
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
    })();
}