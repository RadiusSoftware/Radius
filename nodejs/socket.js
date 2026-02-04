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
const LibNet = require('net');
const LibDgrm = require('node:dgram');


/*****
*****/
singleton(class Sockets {
    constructor() {
        this.sockets = [];
    }

    [Symbol.iterator]() {
        return this.sockets[Symbol.iterator]();
    }
});


/*****
 * Each socket object encapsulates an OS socket and is associated with a
 * network interface and consequently with a subnet.  A socket has a many
 * to one relationship with a network interface, because each socket is
 * the intersection of a network interface with a port.
*****/
define(class TcpSocket extends Emitter {
    constructor(netInterface, opts) {
        super();
        this.data = [];
        this.opts = {};
        Object.assign(this.opts, opts);
        this.netInterface = netInterface;

        if (opts instanceof LibNet.Socket) {
            // TODO ******************************************************************************
            /*
            this.socket = netInterface;
            this.registerHandlers();
            */
        }
        else {
            this.netInterface.sockets[opts.localPort] = this;
            
            this.socket = new LibNet.Socket({
                allowHalfOpen: true,
            });

            this.registerHandlers();
        }
    }

    abort() {
        this.socket.destroy();
        return this;
    }

    close() {
        this.socket.destroySoon();
        return this;
    }

    async connect() {
        this.socket.connect({
            host: this.opts.remoteAddr,
            port: this.opts.remotePort,
            localAddress: this.opts.localAddr,
            localPort: this.opts.localPort,
            family: this.netInterface.getSubnet().getFamilyName(),
        });

        return this;
    }

    getBytesRead() {
        return this.socket.bytesRead;
    }

    getBytesWritten() {
        return this.socket.bytesWritten;
    }

    getLocalAddress() {
        return this.socket.localAddress;
    }

    getLocalPort() {
        return this.socket.localPort;
    }

    getReadyState() {
        return this.socket.readyState;
    }

    getRemoteAddress() {
        return this.socket.remoteAddress;
    }

    getRemotePort() {
        return this.socket.remotePort;
    }

    getStatus() {
        return this.status;
    }

    getSubNet() {
        return this.subnet;
    }

    isIPv4() {
        return this.subnet.isIPv4();
    }

    isIPv6() {
        return this.subnet.isIPv6();
    }

    async onClose(hadError) {
        return true;
    }

    async onConnect() {
        return true;
    }

    async onDrain() {
        return true;
    }

    async onError(error) {
        return true;
    }

    async onReady() {
        return true;
    }

    async onTimeout() {
        return true;
    }

    registerHandlers() {
        this.socket.on('close', async hadError => {
            if (await this.onClose()) {
                this.send({
                    name: 'Close',
                    hadError: hadError,
                });
            }
        });

        this.socket.on('connect', async () => {
            if (await this.onConnect()) {
                this.send({
                    name: 'Connect',
                });
            }
        });

        this.socket.on('data', async data => {
            this.data.push(data);
        });

        this.socket.on('drain', async() => {
            if (await this.onDrain()) {
                this.send({
                    name: 'Drain',
                });
            }
        });

        this.socket.on('end', () => {
            let block = [].concat(...this.data);
            this.data = [];

            this.send({
                name: 'Received',
                data: block,
            });
        });

        this.socket.on('error', async error => {
            if (await this.onError(error)) {
                this.send({
                    name: 'Error',
                    error: error,
                });
            }
        });

        this.socket.on('ready', async () => {
            if (await this.onReady()) {
                this.send({
                    name: 'Ready',
                });
            }
        });

        this.socket.on('timeout', async () => {
            if (await this.onTimeout()) {
                this.send({
                    name: 'Timeout',
                });
            }
        });
    }

    write(data, encoding) {
        return new Promise((ok, fail) => {
            if (typeof data == 'string') {
                this.socket.write(data, encoding, () => {
                    ok(this);
                });
            }
            else {
                this.socket.write(data, () => {
                    ok(this);
                });
            }
        });
    }
});


/*****
*****/
define(class DgrmSocket extends Emitter {
    constructor(netInterface, opts) {
        super();
    }
});
