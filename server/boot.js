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


/*****
 * TODO
 * ()   Clean up sessions
 * ()   HttpLibrary: ckeckMethod()
 * ()   HttpLibrary: ckeckAuthorization()
 * ()   HttpLibrary: getLibEntry()
 * ()   DboObject locking
 * ()   Http/HttpX requests: JOSE, bearer token, API, shape checking,
 *      object locking, authorization, other integrity algorithms
 * ()   DocElement Editing features: messages, methods such as getModified()
 *      getValid(), getValue(), resetValue().
 * ()   Schema tables: credentials, permissions,
 * ()   User signin, multifactor
 * ()   Allow cookies dialog
 * ()   Multilingual applications
*****/


/*****
 * Let's ensure that the radius.AdminApp settings are properly configured.
 * This is the lib-entry for the HttpServer, which will be able to load in
 * the required nodeJS modules and webb-browser bundles for the application.
*****/
execIn('HttpServer', () => {
    Reflect.getPrototypeOf(HttpServer).constructor.registrySettings.libEntries.push({
        type: 'httpx',
        path: '/',
        module: Path.join(__dirname, 'apps/adminApp'),
        fqClassName: 'radius.AdminApp',
        bundlePaths: [ Path.join(__dirname, 'bundles') ],
    });
});


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
        // ****************************************************************
        constructor() {
            (async () => {
                await this.parseCommandLine();

                if (this.settings['-debug'] === true) {
                    Process.setEnv('RadiusDebug', 'TRUE');
                }

                this.inspectConfiguration();
                this.launch();
            })();
        }

        // ****************************************************************
        getMode() {
            if (this.mode == this.launchLiveMode) return 'live';
            if (this.mode == this.launchAdminMode) return 'admin';
        }

        // ****************************************************************
        async inspectConfiguration() {
            if (this.inspectDbms()) {

                return;
            }

            this.settings['-admin'] = true;
        }

        // ****************************************************************
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

                    if (typeof dbmsSettings == 'object' && Dbms.setDefaultDbms(dbmsSettings)) {
                        if (!(await Dbms.doesDatabaseExist(dbmsSettings))) {
                            await Dbms.createDatabase(dbmsSettings);
                        }

                        let schema1 = await Dbms.getDatabaseSchema(dbmsSettings);
                        let schema2 = radius.mkSchema();

                        for (let diff of mkSchemaAnalysis(schema1, schema2)) {
                            await SchemaUpdater.upgrade(dbmsSettings, diff);
                        }

                        for (let dbTable of schema2) {
                            if (dbTable.getType() == 'object') {
                                registerDbObject('radius', dbTable);
                            }
                        }
                    }
                }

                return true;
            }
            catch (e) {}
            return false;
        }

        // ****************************************************************
        async launch() {
            await Settings.setStorageManager('radius.RegistryStorageManager');
            startServer('HttpServer');
        }

        // ****************************************************************
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
