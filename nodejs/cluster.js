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
import * as LibCluster from 'cluster'
import * as LibOs from 'os'
import * as LibProcess from 'process'


/*****
*****/
singleton('', class Cluster extends Emitter {
    constructor() {
        super();
        this.ipV4 = {};
        this.ipV6 = {};
        this.apps = {};
        this.hosts = {};

        for (let interfaceName in LibOs.networkInterfaces()) {
            for (let nodeInterface of LibOs.networkInterfaces()[interfaceName]) {
                let netInterface = NetInterfaces.add(interfaceName, nodeInterface).getFromAddr(nodeInterface.address);
                if (netInterface.getSubnet().isIPv4()) this.ipV4[interfaceName] = netInterface;
                if (netInterface.getSubnet().isIPv6()) this.ipV6[interfaceName] = netInterface;
            }
        }

        let config = this.getEnv('RADIUS', 'json');

        if (typeof config == 'object') {
            this.config = config;
        }
        else {
            this.config = {
                nodeType: 'ROOT',
                iid: Crypto.generateUuid(),
            };
        }
    }

    getApp(name) {
        return this.apps[name];
    }

    getApps() {
        return Object.values(this.apps);
    }

    getArchitecture() {
        return LibOs.arch();
    }

    getConfig() {
        return this.getConfig;
    }

    getCpuCount() {
        return LibOs.cpus().length;
    }

    getCpus() {
        return LibOs.cpus();
    }

    getEndianness() {
        return LibOs.endianness();
    }

    getEnv(name, flag) {
        let value = LibProcess.env[name];

        if (value) {
            if (flag == 'json') {
                try {
                    return fromJson(value);
                }
                catch (e) {
                    return new Object();
                }
            }
            else {
                return value;
            }
        }
    }

    getEol() {
        return LibOs.EOL;
    }

    getHost(name) {
        return this.hosts[name];
    }

    getHosts() {
        return Object.values(this.hosts);
    }

    getHostname() {
        return LibOs.hostname();
    }

    getIID() {
        return this.config.iid;
    }

    getMemory() {
        return { free: LibOs.freemem(), total: LibOs.totalmem() };
    }

    getNetworkInterface(name) {
        let array = [];
        if (name in this.ipV4) array.push(this.ipV4[name]);
        if (name in this.ipV6) array.push(this.ipV6[name]);
        return array;
    }

    getNetworkInterfaces() {
        return Object.values(this.ipV4).concat(Object.values(this.ipV6));
    }

    getPid() {
        return LibProcess.pid;
    }

    getPlatform() {
        return LibOs.platform();
    }

    getRelease() {
        return LibOs.release();
    }

    getSpecifications() {
        return {
            arch: LibOs.arch(),
            cpus: LibOs.cpus(),
            endianness: LibOs.endianness(),
            eol: LibOs.EOL,
            hostname: LibOs.hostname(),
            memory: ({ free: LibOs.freemem(), total: LibOs.totalmem() }),
            network: LibOsLibOs.networkInterfaces(),
            platform: LibOs.platform(),
            release: LibOs.release(),
            tempdir: LibOs.tmpdir(),
            version: LibOs.version(),
        };
    }

    getSubnet(cidr) {
        return this.subNets[cidr];
    }

    getSubnets() {
        return Object.values(this.subnets);
    }

    getTmpdir() {
        return LibOs.tmpdir();
    }

    getV4NetworkInterface(name) {
        return this.ipV4[name];
    }

    getV4NetworkInterfaces() {
        return Object.values(this.ipV4);
    }

    getV6NetworkInterface(name) {
        return this.ipV6[name];
    }

    getV6NetworkInterfaces() {
        return Object.values(this.ipV6);
    }

    getVersion() {
        return LibOs.version();
    }

    isApp() {
        return this.config.nodeType == 'APP';
    }

    isRoot() {
        return this.config.nodeType == 'ROOT';
    }

    isWorker() {
        return this.config.nodeType == 'WORKER';
    }

    async onAppDisconnect(app) {
    }

    async onAppExit(app) {
    }

    async onAppOnline(app) {
    }

    async queryApp() {
        // TODO
    }

    async queryApps() {
        // TODO
    }

    async queryHost() {
        // TODO
    }

    async queryHosts() {
        // TODO
    }

    sendApp() {
        // TODO
    }

    sendApps() {
        // TODO
    }

    sendHost() {
        // TODO
    }

    sendHosts() {
        // TODO
    }

    startApp(config) {
        config.iid = Crypto.generateUuid();
        config.nodeType = 'APP';
        let app = LibCluster.fork({ 'RADIUS': toJson(config) });
        this.apps[config.iid] = app;
        app.on('online', app => this.onAppOnline(app));
        app.on('disconnect', () => this.onAppDisconnect(app));
        app.on('exit', () => this.onAppExit(app));
        return config.iid;
    }

    async stopApp(name) {
    }
});


/*****
 * The following are convenience functions that can be used define different
 * code in the primary process vs a worker process: registerPrimary(),
 * registerWorker(), singletonPrimary(), singletonWorker().  They act as
 * filters to ensure that code is registered only within the specified
 * process type.  This cleans up code that needs one definition of a class
 * in the primary vs a worker process.
*****/
register('', async function execInApp(func) {
    if (Cluster.isApp()) {
        await func();
    }
});

register('', async function execInRoot(func) {
    if (Cluster.isRoot()) {
        await func();
    }
});

register('', async function execInWorker(func) {
    if (Cluster.isWorker()) {
        await func();
    }
});

register('', function registerApp(ns, arg) {
    if (Cluster.isApp()) {
        register(ns, arg);
    }
});

register('', function registerRoot(ns, arg) {
    if (Cluster.isRoot()) {
        register(ns, arg);
    }
});

register('', function registerWorker(ns, arg) {
    if (Cluster.isWorker()) {
        register(ns, arg);
    }
});

register('', async function singletonApp(ns, arg, ...args) {
    if (Cluster.isApp()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonRoot(ns, arg, ...args) {
    if (Cluster.isRoot()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonWorker(ns, arg, ...args) {
    if (Cluster.isWorker()) {
        singleton(ns, arg, ...args);
    }
});