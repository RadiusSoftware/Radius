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
const LibOs = require('os');


/*****
*****/
singleton('', class Host {
    constructor() {
        this.ipV4 = {};
        this.ipV6 = {};
        this.iid = Crypto.generateUuid();

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

    getHostname() {
        return LibOs.hostname();
    }

    getIid() {
        return this.iid;
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
});