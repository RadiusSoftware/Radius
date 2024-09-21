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
     * Recurse the server library to load in server-side code that's required
     * for supporting the server-side features.  These features are extensions
     * of the framework classes and are specific to the Radius server.
    *****/
    await FileSystem.recurseModules(Path.join(__dirname, 'lib'));


    /*****
     * The singleton bootstrapper object, which is used for starting the Radius
     * server.  (1) Detect the presence of a valid Radius.json file containing
     * DBMS settings for connecting to the server's management database.  (2)
     * inspect the radius database to determine whether it exists, if it exists,
     * inspect the database schema and automatically perform upgrades if needed.
     * Downgrades are not automatically performed during the boot process.  When
     * the Radius server is first run against a DBMS, this means a new empty
     * schema will be created in that database.  Note that the database must be
     * present for this to work.  (3a) If either -admin switch was provided or if
     * there is proper web application configuration settings, the server is
     * launched in admin mode.  When launching in admin mode, if the necessary
     * basic parameters are NOT found in the radius database, the user / system
     * administrator will be required to initialize the server with the requsite
     * parameters.  (3b) If the DBMS configuration passes all of the required
     * checks and the -admin switch is not present, the server will be launched
     * in live mode, which means the remaining bootstrap sequence will be guided
     * by the launch parameters.
    *****/
    singletonIn(Process.nodeClassController, 'radius', class BootStrapper {
        constructor() {
            (async () => {
                await this.parseCommandLine();

                if (this.settings['-debug'] === true) {
                    Process.setEnv('RadiusDebug', 'TRUE');
                }

                this.inspectConfiguration();
                
                if (this.settings['-admin'] === true) {
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

                        for (let dbTable of schema2) {
                            registerDbObject('radius', dbTable);
                        }
                        // ******************************************************************************
                        // ******************************************************************************
                        /*
                        let dbc = await dbConnect();

                        let parameter = radius.mkDboParameter({
                            context: 'startup',
                            name: 'BADNAME',
                            value: { reason: 'all', grasp: 'strong', fast: true }
                        });

                        await DbObject.insert(parameter, dbc);
                        */

                        /*
                        let dbo = await DbObject.selectOne(dbc, radius.DboParameter, { name: 'BADNAME' });
                        await DbObject.delete(dbo);
                        */

                        /*
                        let dbo = await DbObject.get(dbc, radius.DboParameter, '1320d4e7-c33b-4bd0-b58f-57ae9b208e9b');
                        //dbo.name = 'another-newer-name';
                        //await DbObject.update(dbo);
                        //console.log(dbo);

                        let clone = DbObject.clone(dbo);
                        console.log(dbo);
                        console.log(clone);

                        await dbc.close();
                        */
                        // ******************************************************************************
                        // ******************************************************************************
                    }
                }

                return true;
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
                        bundlePaths: [],
                    },
                ],
            });
        }

        async launchLiveMode() {
            // TODO *********************************************************************
            /*
            console.log('Launching LIVE mode!');
            console.log('Connect to DBMS -- for all settings!');
            */
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
