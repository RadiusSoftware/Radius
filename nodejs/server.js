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
const Cluster = require('cluster');
const Process = require('process');


/*****
*****/
registerPrimary('', class Server {
    constructor(opts) {
        this.workers = {};
        this.pid = Process.pid;
        this.primaryPid = Cluster.isPrimary;
        this.serverClass = Reflect.getPrototypeOf(this).constructor.name;
        Object.assign(this, opts);
    }

    getPid() {
        return this.pid;
    }

    getPrimary() {
        return this.pid;
    }

    getServerClass() {
        return this.serverClass;
    }

    async restart() {
        return this;
    }

    async start() {
        let count = Object.keys(this.workers).length;

        for (let i = 0; i < this.workerCount; i++) {
            Cluster.fork({
                '#ServerOpts': toJson({
                    primaryPid: this.pid,
                    serverClass: this.serverClass,
                })
            });
        }

        return this;
    }

    async stop() {
        return this;
    }
});


/*****
*****/
registerWorker('', class Server {
    constructor(opts) {
        this.pid = Process.pid;
        this.primaryPid = Cluster.isPrimary;
        this.serverClass = Reflect.getPrototypeOf(this).constructor.name;
        Object.assign(this, opts);
    }

    getPid() {
        return this.pid;
    }

    getPrimary() {
        return this.pid;
    }

    getServerClass() {
        return this.serverClass;
    }

    async restart() {
        return this;
    }

    async start() {
        return this;
    }

    async stop() {
        return this;
    }
});
