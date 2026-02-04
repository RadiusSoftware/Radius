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


/*****
*****
registerPrimary('', class TcpServer extends Server {
    constructor(opts) {
        super(opts);
        this.idle = [];
        this.busy = {};
        this.backlog = [];
        this.server = null;
        this.options = opts;
        this.on('#WorkerDone', message => this.handleWorkerDone(message));
    }

    getFreeWorker(socket) {
        return new Promise((ok, fail) => {
            if (this.idle.length) {
                const worker = this.idle.shift();
                this.busy[worker.id] = worker;
                ok(worker);
            }
            else {
                this.backlog.push(socket);
            }
        });
    }

    async handleWorkerDone(message) {
    }

    async handleWorkerExit(worker, code, signal) {
        if (code != 0) {
            if (worker.id in this.busy) {
                delete this.busy[worker.id];
                return;
            }

            for (let i = 0; i < this.idle.length; i++) {
                let idle = this.idle[i];

                if (idle.id == worker.id) {
                    this.idle.splice(i, 1);
                    return;
                }
            }

            super.handleWorkerExit(worker, code, signal);
            let worker = this.startWorker();
        }
    }
    
    async start() {
        if (!this.server) {
            try {
                await this.startWorkers();
                this.idle = Object.values(this.workers).slice();

                this.server = new Net.Server(async socket => {
                    console.log(socket.remotePort);
                    //const worker = await this.getFreeWorker(socket);
                    //this.sendWorker(worker, socket);
                    //await Ctl.pause(1000);
                    //socket.on('close', () => console.log('**************************** closing'));
                    //socket.on('data', data => console.log(data));
                });

                this.server.listen(this.options);
            }
            catch (e) {
                logit({
                    file: __filename,
                    action: 'Start TCP Server',
                    class: Reflect.getPrototypeOf(this).constructor.name,
                    error: e,
                });
            }
        }

        return this;
    }
    
    async stop() {
        if (this.server) {
            // TODO *****************************************************************************
        }

        return this;
    }
});


/*****
*****
registerWorker('', class TcpServer extends Server {
    constructor(opts) {
        super(opts);
        this.idle = true;

        Cluster.worker.on('message', async (...args) => {
            if (args[0] === 'socket') {
                const socket = args[1];
                //socket.on('data', data => console.log(data));
                
                this.client = await mkTcpClient(args[1]);
                this.client.on('data', (...args) => this.handleData(...args));
                this.client.resume();
            }
        });
    }

    async handleData(...args) {
        console.log('\n**************************');
        console.log(...args);
    }

    async restart() {
    }

    async start() {
    }

    async stop() {
    }
});
*/
