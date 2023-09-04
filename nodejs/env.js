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
const cluster = require('cluster');
const os = require('os');
const { argv, pid } = require('process');


/*****
 * The computing environment, in which this code is running.  Notice that it's
 * a singleton, making it globally available for all processes on this host. It
 * provides all of the basics plus additional features and treats to make for
 * the application developer simpler.
*****/
singleton('', class Env extends Emitter {
    constructor() {
        super();
    }

    get() {
        return {
            arch: os.arch(),
            cpus: os.cpus(),
            endianness: os.endianness(),
            eol: os.EOL,
            hostname: os.hostname(),
            isPrimary: cluster.isPrimary,
            isWorker: cluster.isWorker,
            memory: ({ free: os.freemem(), total: os.totalmem() }),
            network: os.networkInterfaces(),
            pid: pid,
            platform: os.platform(),
            release: os.release(),
            tempdir: os.tmpdir(),
            version: os.version(),
        };
    }

    getArch() {
        return os.arch();
    }

    getCpuCount() {
        return os.cpus().length;
    }

    getCpus() {
        return os.cpus();
    }

    getEndianness() {
        return os.endianness();
    }

    getEol() {
        return os.EOL;
    }

    getHostname() {
        return os.hostname();
    }

    getMemory() {
        return ({ free: os.freemem(), total: os.totalmem() });
    }

    getNetwork() {
        return os.networkInterfaces();
    }

    getPid() {
        return pid;
    }

    getPlatform() {
        return os.platform();
    }

    getRelease() {
        return os.release();
    }

    getTempPath() {
        return os.tmpdir();
    }

    getVersion() {
        return os.version();
    }

    isPrimary() {
        return cluster.isPrimary;
    }

    isWorker() {
        return cluster.isWorker;
    }
});
