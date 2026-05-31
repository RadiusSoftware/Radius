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
LibZlib         = require('node:zlib');

NpmHtml         = require('node-html-parser');
NpmPemJwk       = require('pem-jwk');
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
        radius.path = LibPath.join(__dirname, '..');

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
            LibPath.join(radius.path, 'javascript'),
            LibPath.join(radius.path, 'nodejs'),
        );

        for (let nodejsFile of nodejsFiles) {
            if (nodejsFile.endsWith('.js')) {
                try {
                    require(nodejsFile);
                }
                catch (e) {
                    console.log(e);
                    throw e;
                }
            }
        }

        for (let mozillaFile of await enumerate(
            LibPath.join(radius.path, 'javascript'),
            LibPath.join(radius.path, 'mozilla'),
        )) {
            if (mozillaFile.endsWith('.js')) {
                mozillaFiles.push(
                    (await FileSystem.readFile(mozillaFile)).toString()
                )
            }
        }

        radius.nodejs = toJson(nodejsFiles);
        radius.webapp = (await FileSystem.readFile(Path.join(radius.path, 'nodejs/httpServer/webapp.html'))).toString();
        radius.mozilla = mozillaFiles.join('\n');
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