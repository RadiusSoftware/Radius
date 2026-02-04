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


(() => {
    /*****
     * The hexmap is used for generating the bits associated with a single hex
     * character or hexit.  It's the four bits represented by that specific hex
     * character.
    *****/
    const hexmap = {
        0: [0, 0, 0, 0],
        1: [0, 0, 0, 1],
        2: [0, 0, 1, 0],
        3: [0, 0, 1, 1],
        4: [0, 1, 0, 0],
        5: [0, 1, 0, 1],
        6: [0, 1, 1, 0],
        7: [0, 1, 1, 1],
        8: [1, 0, 0, 0],
        9: [1, 0, 0, 1],
        a: [1, 0, 1, 0],
        b: [1, 0, 1, 1],
        c: [1, 1, 0, 0],
        d: [1, 1, 0, 1],
        e: [1, 1, 1, 0],
        f: [1, 1, 1, 1],
    };


    /*****
     * This is also a map but a nibble valus is used as the key into looking up
     * the ASCII character that represents that nibble in hexadecimal.  Again,
     * since an array is a map when a number index is the key, this functions
     * like a map.
    *****/
    const nibblemap = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
    ];


    /*****
     * Convert an IP address that's represented as an array of bits back into
     * the string representation of that IP address value, e.g., 12.15.217.44,
     * fe80::, ::1.
    *****/
    const arrayToString = array => {
        if (array.length == 32) {
            let octets = [];

            for (let i = 0; i < 32; i += 8) {
                let byte = 0;

                for (let j = 0; j < 8; j++) {
                    byte += Math.pow(2, 7-j)*array[i + j];
                }

                octets.push(byte.toString());
            }

            return octets.join('.');
        }
        else if (array.length == 128) {
            let groups = [];
            let nibbles = [];

            for (let i = 0; i < 128; i += 4) {
                let nibble = 0;

                for (let j = 0; j < 4; j++) {
                    if (array[i+j]) {
                        nibble += 1 << 3-j;
                    }
                }

                nibbles.push(nibblemap[nibble]);

                if (nibbles.length == 4) {
                    groups.push(parseInt(nibbles.join(''), 16));
                    nibbles = [];
                }
            }

            let maxGap;
            let activeGap;

            for (let i = 0; i < 8; i++) {
                let group = groups[i];

                if (group == 0) {
                    if (activeGap) {
                        activeGap.size++;
                    }
                    else {
                        activeGap = { index: i, size: 1 };
                    }

                    if (!maxGap || activeGap.size > maxGap.size) {
                        maxGap = activeGap;
                    }
                }
                else {
                    activeGap = null;
                }
            }

            let result = [];

            for (let i = 0; i < 8; i++) {
                if (maxGap) {
                    if (i == maxGap.index) {
                        i == 0 ? result.push('::') : result.push(':');
                        continue;
                    }
                    else if (i > maxGap.index && i < maxGap.index + maxGap.size) {
                        continue;
                    }
                }

                result.push(groups[i].toString(16));
            }

            return result.join(':');
        }

        return '';
    }


    /*****
     * Convert an IP address from its string form into a bit array representation.
     * The return array of 1's and 0's is either 32 or 128 bits in length.  There
     * shouldn't be any other options.  The bit array is used for computations
     * such as getting the network address or the host address.
    *****/
    const stringToArray = string => {
        let array = [];

        if (string.indexOf('.') > -1) {
            for (let octet of string.split('.')) {
                let byte;

                if (octet.length == 3) {
                    byte = 100*parseInt(octet[0]) + 10*parseInt(octet[1]) + parseInt(octet[2]);
                }
                else if (octet.length == 2) {
                    byte = 10*parseInt(octet[0]) + parseInt(octet[1]);
                }
                else if (octet.length == 1) {
                    byte = parseInt(octet[0]);
                }

                const binary = byte.toString(2);
                
                for (let i = binary.length; i < 8; i++) {
                    array.push(0);
                }

                for (let bit of binary) {
                    array.push(parseInt(bit));
                }
            }
        }
        else if (string.indexOf(':') > -1) {
            const groupToArray = (group) => {
                switch (group.length) {
                    case 1:
                        array.push(0);
                        array.push(0);
                        array.push(0);
                        array.push(0);
                    case 2:
                        array.push(0);
                        array.push(0);
                        array.push(0);
                        array.push(0);
                    case 3:
                        array.push(0);
                        array.push(0);
                        array.push(0);
                        array.push(0);
                }

                for (let hexit of group) {
                    for (let bit of hexmap[hexit]) {
                        array.push(bit);
                    }
                }
            };

            let group;
            let filler = -1;
            let flag = false;
            let groups = [];

            for (let char of string) {
                if (char == ':') {
                    if (flag) {
                        filler = groups.length;
                        groups.push('GAP');
                        flag = false;
                    }
                    else {
                        group = undefined;
                        flag = true;
                    }
                }
                else {
                    if (!group) {
                        group = [];
                        groups.push(group);
                    }

                    flag = false;
                    group.push(char);
                }
            }

            for (let group of groups) {
                if (group == 'GAP') {
                    for (let i = 0; i < 8 - (groups.length - 1); i++) {
                        for (let j = 0; j < 16; j++) {
                            array.push(0);
                        }
                    }
                }
                else {
                    groupToArray(group);
                }
            }
        }

        return array;
    };


    /*****
     * The subnet library.  The subnet library represents localhost subnetworks
     * that have been created.  Note that each in the local subnet library is
     * create only once and that instance is right here, registered in this lib.
    *****/
    singleton(class Subnets {
        constructor() {
            this.subnets = {};
        }

        add(cidr) {
            if (!(cidr in this.subnets)) {
                let subnet = mkSubnet(cidr);
                this.subnets[cidr] = subnet;
            }

            return this;
        }

        get(cidr) {
            return this.subnets[cidr];
        }

        has(cidr) {
            return cidr in this.subnets;
        }

        remove(cidr) {
            if (cidr in this.subnets) {
                delete this.subnets[cidr];
            }

            return this;
        }

        search(addr) {
            let addrArray = stringToArray(addr);

            for (let subnet of Object.values(this.subnets)) {
                if (addrArray.length == subnet.bits) {
                    let i = 0;

                    for (; i < subnet.netBits; i++) {
                        if (addrArray[i] != subnet.netAddrArray[i]) {
                            break;
                        }
                    }

                    if (i == subnet.netBits) {
                        return subnet;
                    }
                }
            }

            return null;
        }

        [Symbol.iterator]() {
            return Object.values(this.subnets)[Symbol.iterator]();
        }
    });


    /*****
     * Class that represents the logical features and functionality of an IP
     * subnet.  The subnet is constructed with a single parameter, which is the
     * CIDR, which provides all we need to know about the subnet addresss and
     * both the subnet and host masks.
    *****/
    define(class Subnet {
        constructor(cidr) {
            this.interfaces = {};
            this.netMaskArray = [];
            this.netAddrArray = [];
            this.hostMaskArray = [];

            let [ addr, bits ] = cidr.split('/');
            this.addrArray = stringToArray(addr);
            this.netBits = parseInt(bits);

            if (this.addrArray.length == 32) {
                this.bits = 32;
                this.family = 'IPv4';
            }
            else if (this.addrArray.length == 128) {
                this.bits = 128;
                this.family = 'IPv6';
            }

            this.hostBits = this.bits - this.netBits;

            for (let i = 0; i < this.bits; i++) {
                if (i < this.netBits) {
                    this.netMaskArray.push(1);
                    this.hostMaskArray.push(0);
                }
                else {
                    this.netMaskArray.push(0);
                    this.hostMaskArray.push(1);
                }
            }
            
            for (let i = 0; i < this.bits; i++) {
                this.netAddrArray.push(this.addrArray[i] & this.netMaskArray[i]);
            }

            this.netAddr = arrayToString(this.netAddrArray);
            this.netMask = arrayToString(this.netMaskArray);
            this.hostMask = arrayToString(this.hostMaskArray);

            let bcastAddrArray = Data.copy(this.netAddrArray);

            for (let i = this.netBits; i < this.bits; i++) {
                bcastAddrArray[i] = 1;
            }

            this.bcastAddr = arrayToString(bcastAddrArray);
        }

        getBits() {
            return this.bits;
        }

        getBroadcastAddr() {
            return this.bcastAddr;
        }

        getFamily() {
            if (this.isIPv4()) return 4;
            if (this.isIPv6()) return 6;
            return 0;
        }

        getFamilyName() {
            if (this.isIPv4()) return 'IPv4';
            if (this.isIPv6()) return 'IPv6';
            return '';
        }

        getHostAddr(addr) {
            if (this.belongs(addr)) {
                return arrayToString();
            }

            return '';
        }

        getHostBits() {
            return this.hostBits;
        }

        getHostMask() {
            return this.hostMask;
        }

        getHostMaskArray() {
            return this.hostMaskArray.slice(0);
        }

        getNetAddr() {
            return this.netAddr;
        }

        getNetAddrArray() {
            return this.netAddrArray.slice(0);
        }

        getNetBits() {
            return this.netBits;
        }

        getNetMask() {
            return this.netMask;
        }

        getNetMaskArray() {
            return this.netMaskArray.slice(0);
        }

        getSubnetHost(addr) {
            let hostArray = [];
            let addrArray = stringToArray(addr);

            if (addrArray.length == this.bits) {
                for (let i = 0; i < this.bits; i++) {
                    hostArray.push(addrArray[i] & this.hostMaskArray[i]);
                }

                return arrayToString(hostArray);
            }

            return '';
        }

        getSubnetHostArray(addr) {
            let hostArray = [];
            let addrArray = stringToArray(addr);

            if (addrArray.length == this.bits) {
                for (let i = 0; i < this.bits; i++) {
                    hostArray.push(addrArray[i] & this.hostMaskArray[i]);
                }

                return hostArray;
            }

            return [];
        }

        getSubnetNet(addr) {
            let netArray = [];
            let addrArray = stringToArray(addr);

            if (addrArray.length == this.bits) {
                for (let i = 0; i < this.bits; i++) {
                    netArray.push(addrArray[i] & this.netMaskArray[i]);
                }

                return arrayToString(netArray);
            }

            return '';
        }

        getSubnetNetArray(addr) {
            let netArray = [];
            let addrArray = stringToArray(addr);

            if (addrArray.length == this.bits) {
                for (let i = 0; i < this.bits; i++) {
                    netArray.push(addrArray[i] & this.netMaskArray[i]);
                }

                return netArray;
            }

            return [];
        }

        isIPv4() {
            return this.family == 'IPv4';
        }

        isIPv6() {
            return this.family == 'IPv6';
        }

        [Symbol.iterator]() {
            return Object.values(this.interfaces)[Symbol.iterator]();
        }
    });


    /*****
     * The interface library.  The subnet library represents localhost interfaces
     * that have been created.  Note that each in the local interface library is
     * create only once and that instance is right here.
    *****/
    singleton(class NetInterfaces {
        constructor() {
            this.byName = {};
            this.byAddr = {};
        }

        add(name, info) {
            if (!(info.address in this.byAddr)) {
                let netInterface = mkNetInterface(name, info);
                this.byAddr[netInterface.getAddr()] = netInterface;

                if (!(name in this.byName)) {
                    this.byName[name] = {};
                }

                this.byName[name][netInterface.getSubnet().getFamilyName()] = netInterface;
            }

            return this;
        }

        getFromAddr(addr) {
            return this.byAddr[addr];
        }

        getFromName(name) {
            if (name in this.byName) {
                return {
                    IPv4: this.byName[name].IPv4,
                    IPv6: this.byName[name].IPv6,
                };
            }
        }

        hasAddr(addr) {
            return addr in this.byAddr;
        }

        hasName(name) {
            return name in this.byName;
        }

        summarize() {
            let summaries = {};

            for (let key in this.byName) {
                let interfaces = this.byName[key];
                let key1 = Object.keys(interfaces)[0];

                let summary = {
                    name: interfaces[key1].name,
                    mac: interfaces[key1].mac,
                };

                for (let family in interfaces) {
                    if (family in { IPv4:0, IPv6:0 }) {
                        let netInterface = interfaces[family];

                        summary[family] = {
                            family: netInterface.subnet.family,
                            addr: netInterface.subnet.netAddr,
                            netmask: netInterface.subnet.netMask,
                            hostmask: netInterface.subnet.hostMask,
                            broadcast: netInterface.subnet.bcastAddr,
                        };
                    }
                }

                summaries[key] = summary;
            }

            return Object.values(summaries);
        }

        removeByAddr(addr) {
            return this;
        }

        removeByName(name) {
            return this;
        }

        [Symbol.iterator]() {
            return Object.values(this.byName)[Symbol.iterator]();
        }
    });


    /*****
     * The logical representation of a single network interface on the host.
     * The interface has two prinmary data properties: (1) an address, and
     * (2) a subnet.  All Radius sockets are registerd and stored in the owning
     * NetInterface.  What distinguishes sockets is the localPort, remoteAddr,
     * and remotePort.
    *****/
    define(class NetInterface {
        constructor(name, info) {
            this.name = name;
            this.mac = info.mac;
            this.address = info.address;
            this.sockets = {};

            if (!Subnets.has(info.cidr)) {
                Subnets.add(info.cidr);
            }

            this.subnet = Subnets.get(info.cidr);
        }

        createBroadcastSocket(opts) {
            // TODO ******************************************************************************
        }

        createDgrmSocket(localPort, opts) {
            /*
            let options = {};
            Object.assign(options, opts);
            options.localAddr = this.address;
            options.localPort = localPort;
            options.remoteAddr = remoteAddr;
            options.remotePort = remotePort;
            return mkDgrmSocket(this, options);
            */
        }

        createTcpSocket(localPort, remoteAddr, remotePort, opts) {
            let options = {};
            typeof opts == 'object' ? Object.assign(options, opts) : false;
            options.localAddr = this.address;
            options.localPort = localPort;
            options.remoteAddr = remoteAddr;
            options.remotePort = remotePort;
            return mkTcpSocket(this, options);
        }

        getAddr() {
            return this.address;
        }

        getMac() {
            return this.mac;
        }

        getName() {
            return this.name;
        }

        getSocket(port) {
            return this.sockets[port];
        }

        getSockets() {
            return Object.values(this.sockets);
        }

        getSubnet() {
            return this.subnet;
        }

        static importDgrmSocket(socket) {
            // TODO ******************************************************************************
        }

        static importTcpSocket(socket) {
            // TODO ******************************************************************************
        }
    });
})();
