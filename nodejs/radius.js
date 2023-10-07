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
"use strict";


/*****
 * This is the nodejs bootstrapper or nodejs loader for the Radius Software
 * development framework.  It's loaded within the HEAD element of the HTML
 * document supported with Radius.  It's primary job is to load in each of
 * the specified framework script files and wait for each file to be fully
 * compiled before moving on to the next script file.  This is importatn
 * because the order of evaluation is critical due to dependencies.  Note that
 * this script only loads the framework.  Once loaded, the framework will be
 * used for loading in developer application code, CSS, and HTML framents.
*****/
(async () => {
    const sourceFileNames = [
        '../ctl.js',
        '../buffer.js',
        '../data.js',
        '../emitter.js',
        '../depot.js',
        '../json.js',
        '../language.js',
        '../stringSet.js',
        '../time.js',
        '../mime.js',
        '../textTemplate.js',
        '../textUtils.js',
        '../validator.js',
        './env.js',
        './serverUtils.js',
        './compression.js',
        './crypto.js',
        './jose.js',
        './ipc.js',
        './server.js',
        './acme.js',
        './servers/httpServer.js',
    ];

    const { join } = require('path');
    const Cluster = require('cluster');
    const Process = require('process');
    require(join(__dirname, '../core.js'));
    
    register('', function registerPrimary(ns, arg) {
        if (Cluster.isPrimary) {
            register(ns, arg);
        }
    });

    register('', function registerWorker(ns, arg) {
        if (Cluster.isWorker) {
            register(ns, arg);
        }
    });
    
    register('', async function singletonPrimary(ns, arg, ...args) {
        if (Cluster.isPrimary) {
            singleton(ns, arg, ...args);
        }
    });
    
    register('', async function singletonWorker(ns, arg, ...args) {
        if (Cluster.isWorker) {
            singleton(ns, arg, ...args);
        }
    });

    register('', function isPrimary() {
        return Cluster.isPrimary;
    });

    register('', function isWorker() {
        return Cluster.isWorker;
    });

    for (let sourceFileName of sourceFileNames) {
        require(join(__dirname, sourceFileName));
    }

    if (Cluster.isPrimary) {
        if (Process.argv.length >= 3) {
            require(Process.argv[2]);
        }
    }
    else if ('#ServerOpts' in Process.env) {
        let opts = fromJson(Process.env['#ServerOpts']);

        if (opts.serverClass) {
            let server = eval(`mk${opts.serverClass}(opts)`);
            await server.start();
        }
    }
})();
