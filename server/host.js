/*****
 * Copyright (c) 2023 Radius Software
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
*****/
singletonIn(Process.nodeClassController, 'radius', class Host {
    constructor() {
        (async () => {
            await this.parseCommandLine();
            await this.detectDbms();
            await this.launcher();
        })();
    }

    async checkRadiusDatabase(dbc) {
        display('\nCHECK CONSISTENCY OF RADIUS TABLES.\n');
        display('\nCHECK TABLE SCHEMAS/UPGRADE.\n');
        //this.launcher = this.launchLiveMode;
    }

    async detectDbms() {
        this.launcher = this.launchAdminMode;

        if ('-admin' in this.commandLine) return;
        if (!('-dbtype' in this.commandLine)) return;
        if (!('-dbhost' in this.commandLine)) return;
        if (!('-dbuser' in this.commandLine)) return;
        if (!('-dbpass' in this.commandLine)) return;

        const settings = {
            type: this.commandLine['-dbtype'],
            host: this.commandLine['-dbhost'],
            user: this.commandLine['-dbuser'],
            pass: this.commandLine['-dbpass'],
        };

        try {
            settings.dbname = 'radius';
            var dbc = await Dbms.connect(settings);

            if (dbc) {
                await this.checkRadiusDatabase(dbc);
            }
        }
        catch (e) {
            caught(e);
            this.launcher = this.launchAdminMode;
        }
    }

    async launchAdminMode() {
    }

    async launchLiveMode() {
        display('\n..launching LIVE MODE\n');
    }

    async parseCommandLine() {
        const args = Process.getArgs();
        this.nodePath = args[0];
        this.serverPath = args[1];
        this.commandLine = {};

        const supportedArgs = {
            '-admin':  { hasValue: false },
            '-dbtype': { hasValue: true },
            '-dbhost': { hasValue: true },
            '-dbuser': { hasValue: true },
            '-dbpass': { hasValue: true },
        };

        for (let i = 2; i < args.length; i++) {
            let arg = args[i];
            const supportedArg = supportedArgs[arg];

            if (supportedArg) {
                if (supportedArg.hasValue) {
                    if (i+1 < args.length) {
                        if (!args[i+1].startsWith('-')) {
                            this.commandLine[arg] = args[++i];
                        }
                    }
                }
                else {
                    this.commandLine[arg] = true;
                }
            }
        }
    }
});
/*****
*****
register('', class MyWebExtension extends HttpX {
    constructor() {
        super();
    }

    async handleGET(req) {
        return {
            status: 200,
            contentType: 'application/json',
            contentEncoding: '',
            contentCharset: '',
            content: toJson({
                why: 'Because we need it',
                how: 'Increased efficiency and productivity',
            }),
        };
    }
});
execIn(Process.nodeClassController, async () => {
    console.log(`***********************************`);
    console.log(`Test App -- Radius Framework nodejs`);
    console.log(`***********************************\n`);

    startApplication('HttpServer', {
        deflang: 'en-US',
        workers: 1,
        interfaces: [
            {
                addr: '0.0.0.0',
                port: 80,
                tls: false,
            },
        ],
        upgradHandler: (...args) => mkWebSocket(...args),
        libSettings: {
            blockSizeMb: 50,
            cacheMaxSizeMb: 100,
            cacheDurationMs: 10*60*1000,
            HttpStatusTemplates: false,
            authHandler: (liEntry, req) => {
                return true;
            },
        },
        libEntries: [
            {
                type: 'file',
                path: '/colby/dog',
                fspath: '/Users/christoph/Documents/RadiusTest',
                once: false,
                timeout: 10*1000,
            },
            {
                type: 'file',
                path: '/special',
                fspath: '/Users/christoph/Documents/kodeJS.json',
                once: false,
                auth: {
                    level: 1,
                    group: { 17:0, 18:0, 110:0 },
                },
            },
            {
                type: 'data',
                path: '/data',
                data: mkBuffer('Hello Data'),
            },
            {
                type: 'data',
                path: '/object',
                data: {
                    hello: 'Object',
                    today: 'yesterday',
                },
            },
            {
                type: 'httpx',
                path: '/httpExtension',
                clss: MyWebExtension,
            },
        ],
    });
});
execIn('HttpServerWorker', async () => {
    await HttpServerWorker.watch('/special');
    console.log('\n*** GOT IT ***');
});
*/
