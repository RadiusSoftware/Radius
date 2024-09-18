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
require('../nodejs/radius.js');


(async () => {
    /*****
    *****/
    await FileSystem.recurseModules(Path.join(__dirname, 'lib'));


    /*****
    *****/
    singletonIn(Process.nodeClassController, 'radius', class BootStrapper {
        constructor() {
            (async () => {
                await this.parseCommandLine();

                if (this.settings['-debug'] === true) {
                    Process.setEnv('RadiusDebug', 'TRUE');
                }

                this.inspectConfiguration();
                
                if ('-admin' in this.settings) {
                    this.launchAdminMode();
                }
                else {
                    this.launchLiveMode();
                }
            })();
        }

        getMode() {
            if (this.mode == this.launchLiveMode) return 'live';
            if (this.mode == this.launchAdminMode) return 'admin';
        }

        async inspectConfiguration() {
            if (this.inspectDbms()) {
                if (!('-admin' in this.settings)) {
                    return;
                }
            }
            else {
                // TODO *******************************************
            }

            this.settings['-admin'] = true;
        }

        async inspectDbms() {
            try {
                let path;

                if ('-dbms' in this.settings) {
                    path = Path.absolutePath(this.serverDirectoryPath, this.settings['-dbms']);
                }
                else {
                    path = Path.absolutePath(this.serverDirectoryPath, '../../Radius.json');
                }

                if (await FileSystem.isFile(path)) {
                    let dbmsSettings = fromJson((await FileSystem.readFile(path)).toString());

                    if (typeof dbmsSettings == 'object' && Dbms.setRadiusDbms(dbmsSettings)) {
                        if (!(await Dbms.doesDatabaseExist(dbmsSettings))) {
                            await Dbms.createDatabase(dbmsSettings);
                        }

                        let schema1 = await Dbms.getDatabaseSchema(dbmsSettings);
                        let schema2 = radius.mkSchema();

                        for (let diff of mkSchemaAnalysis(schema1, schema2)) {
                            SchemaUpdater.upgrade(dbmsSettings, diff);
                        }
                    }
                }

                return false;
            }
            catch (e) {}
            return false;
        }

        async launchAdminMode() {
            startServer('HttpServer', {
                deflang: 'en-US',
                workers: 1,
                interfaces: [
                    {
                        addr: '0.0.0.0',
                        port: 80,
                        tls: false,
                    },
                ],
                libEntries: [
                    {
                        type: 'httpx',
                        path: '/',
                        module: Path.join(__dirname, 'apps/adminApp.js'),
                        fqClassName: 'radius.AdminApp',
                        bundlePaths: [ '../../lib' ],
                    },
                ],
            });
        }

        async launchLiveMode() {
            // TODO *********************************************************************
            console.log('Launching LIVE mode!');
            console.log('Connect to DBMS -- for all settings!');
        }

        async parseCommandLine() {
            const args = Process.getArgs();
            this.nodePath = args[0];
            this.serverControllerPath = args[1];
            this.serverDirectoryPath = Path.dirname(this.serverControllerPath);
            this.settings = {};

            const supportedArgs = {
                '-debug':  { hasValue: false },
                '-admin':  { hasValue: false },
                '-dbms': { hasValue: true },
            };

            for (let i = 2; i < args.length; i++) {
                let arg = args[i];
                const supportedArg = supportedArgs[arg];

                if (supportedArg) {
                    if (supportedArg.hasValue) {
                        if (i+1 < args.length) {
                            if (!args[i+1].startsWith('-')) {
                                this.settings[arg] = args[++i];
                            }
                        }
                    }
                    else {
                        this.settings[arg] = true;
                    }
                }
            }
        }
    });
})();
