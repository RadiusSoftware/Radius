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


/*****
*****/
singleton('', class ThisHost extends Emitter {
    constructor(nodeType) {
        super();
        this.ipV4 = {};
        this.ipV6 = {};
        this.hosts = {};
        this.zones = {};
        this.nodeType = typeof nodeType == 'string' ? nodeType : 'ROOT';

        for (let interfaceName in LibOs.networkInterfaces()) {
            for (let nodeInterface of LibOs.networkInterfaces()[interfaceName]) {
                let netInterface = NetInterfaces.add(interfaceName, nodeInterface).getFromAddr(nodeInterface.address);
                if (netInterface.getSubnet().isIPv4()) this.ipV4[interfaceName] = netInterface;
                if (netInterface.getSubnet().isIPv6()) this.ipV6[interfaceName] = netInterface;
            }
        }
    }

    getArchitecture() {
        return LibOs.arch();
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

    getNetworkInterface(name) {
        let array = [];
        if (name in this.ipV4) array.push(this.ipV4[name]);
        if (name in this.ipV6) array.push(this.ipV6[name]);
        return array;
    }

    getNetworkInterfaces() {
        return Object.values(this.ipV4).concat(Object.values(this.ipV6));
    }

    getMemory() {
        return { free: LibOs.freemem(), total: LibOs.totalmem() };
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

    getZone(name) {
        return this.zones[name];
    }

    getZones() {
        return Object.values(this.zones);
    }

    isRoot() {
        return this.nodeType == 'ROOT';
    }

    isWorker() {
        return this.nodeType == 'WORKER';
    }

    isZone() {
        return this.nodeType == 'ZONE';
    }

    async queryHost() {
        // TODO
    }

    async queryHosts() {
        // TODO
    }

    async queryZone() {
        // TODO
    }

    async queryZones() {
        // TODO
    }

    sendHost() {
        // TODO
    }

    sendHosts() {
        // TODO
    }

    sendZone() {
        // TODO
    }

    sendZones() {
        // TODO
    }

    async startZone(opts) {
        if (this.nodeType == 'ROOT') {
            if (!(opts.name in this.zones)) {
                console.log('attaching to the zone....')
                // TODO **************************
            }
        }

        return this;
    }

    async stopZone(name) {
        if (this.nodeType == 'ROOT') {
            if (opts.name in this.zones) {
                // TODO **************************
            }
        }

        return this;
    }
});


/*****
*****/
register('', class ApplicationZone extends Emitter {
    constructor() {
        super();
    }

    async getHost() {
    }

    async getHosts() {
    }

    async getWorker() {
    }

    async getWorkerss() {
    }

    async queryHost() {
    }

    async queryHosts() {
    }

    async queryWorker() {
    }

    async queryworkers() {
    }
    
    async queryZone() {
        return new Promise(async (ok, fail) => {
        });
    }

    sendHost() {
    }

    sendHosts() {
    }

    sendWorker() {
    }

    sendWorkers() {
    }

    sendZone() {
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
register('', async function execInRoot(func) {
    if (ThisHost.isRoot()) {
        await func();
    }
});

register('', async function execInWorker(func) {
    if (ThisHost.isWorker()) {
        await func();
    }
});

register('', async function execInZone(func) {
    if (ThisHost.isZone()) {
        await func();
    }
});

register('', function registerRoot(ns, arg) {
    if (ThisHost.isRoot()) {
        register(ns, arg);
    }
});

register('', function registerWorker(ns, arg) {
    if (ThisHost.isWorker()) {
        register(ns, arg);
    }
});

register('', function registerZone(ns, arg) {
    if (ThisHost.isZone()) {
        register(ns, arg);
    }
});

register('', async function singletonRoot(ns, arg, ...args) {
    if (ThisHost.isRoot()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonWorker(ns, arg, ...args) {
    if (ThisHost.isWorker()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonZone(ns, arg, ...args) {
    if (ThisHost.isZone()) {
        singleton(ns, arg, ...args);
    }
});