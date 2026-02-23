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


/*****
 * A server is an object that exists and runs in the primary process with zero
 * or more workers.  Workers are primarily there to distribute workload and
 * enhance performance although workers are NOT limited to the role. Possibly,
 * workers could be specialized and perform different tasks for the overall
 * processing goal.  Workers are created and destroyed vis-a-vis the primary
 * process's Server object.  Servers have been designed such that they can be
 * killed and then re-created with new settings to alter functionality or to
 * respond to a change in environment.
*****/
define(class Server extends Emitter {
    static servers = {};

    constructor() {
        super();
        this.ctor = Reflect.getPrototypeOf(this).constructor;

        if (!this.ctor.name.endsWith('Server')) {
            throwError(`Server "${this.ctor.name}" classname does NOT end with "Server"`);
        }

        this.namespace = this.ctor['#namespace'];
        this.serverName = this.ctor.name.substring(0, this.ctor.name.length - 'Server'.length);
        this.serverClassName = this.ctor.name;
        this.workerClassName = `${this.serverClassName.replace('Server', '')}Worker`;
        this.workers = {};
        this.settings = {};

        mkHandlerProxy(Process, this.serverClassName, this);
        Server.servers[this.serverClassName] = this;
    }

    async callWorker(worker, message, sendHandle) {
        let action = `${message.name[0].toUpperCase()}${message.name.substring(1)}`;
        message.name = `${this.workerClassName}${action}`;
        return Process.callWorker(worker, message, sendHandle);
    }

    async callWorkers(message) {
        let promises = [];

        for (let worker of this) {
            promises.push(Process.callWorker(worker, message));
        }

        return Promise.all(promises);
    }

    getClassName() {
        return this.className;
    }

    getCtor() {
        return this.ctor;
    }

    static getServer(serverClass) {
        if (Process.isPrimary()) {
            if (typeof serverClass == 'function') {
                if (Data.classExtends(serverClass, Server)) {
                    return Server.servers[serverClass.name];
                }
            }
        }
    }

    getSettings() {
        return Data.clone(this.settings);
    }

    getWorkerCount() {
        return Object.keys(this.workers).length;
    }

    getWorkers() {
        return Object.values(this.workers);
    }

    getWorkerPids() {
        return Object.keys(this.workers);
    }

    async init() {
        return this;
    }

    async kill() {
        await this.killWorkers();
        delete Server.servers[this.getClassName()];
        return;
    }

    async killWorker(worker) {
        let killed;

        let promise = new Promise((ok, fail) => {
            killed = ok;
        });

        worker.on('disconnect', message => {
            delete this.workers[worker.id];
            killed(this);
        });

        this.sendWorker(worker, { name: 'kill' });
        return promise;
    }

    async killWorkers() {
        let workers = Object.values(this.workers);

        for (let worker of workers) {
            await this.killWorker(worker);
        }

        return this;
    }

    async onGetSettings(message) {
        return this.settings;
    }

    sendWorker(worker, message, sendHandle) {
        let action = `${message.name[0].toUpperCase()}${message.name.substring(1)}`;
        message.name = `${this.workerClassName}${action}`;
        Process.sendWorker(worker, message, sendHandle)
        return this;
    }

    sendWorkers(message) {
        for (let worker of workers) {
            this.sendWorker(worker, message);
        }

        return this;
    }

    async start(settingName) {
        let settings = await mkSettingsHandle().getSetting(settingName);

        if (settings) {
            this.settings = settings;

            if (this.settings.enabled) {
                for (let i = 0; i < this.settings.workers; i++) {
                    await this.startWorker();
                }
            }
        }

        return this;
    }

    async startWorker() {
        let worker = await Process.runWorker(`async () => {
            await Process.ensureClass('${this.namespace}', '${this.workerClassName}');
            let worker = mk${this.workerClassName}();
            await worker.init();
        }`);

        this.workers[worker.id] = worker;
        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.workers)[Symbol.iterator]();
    }
});


/*****
 * To construct a server, call the createServer function with a single parameter,
 * which is a class that extends Server class.  If you want to specify a namespace
 * as well, construct an instance and pass two parameters, the namespace instance
 * and the service class definition.
*****/
define(async function createServer(...args) {
    if (Process.isPrimary()) {
        let ns;
        let clss;

        if (args.length == 1) {
            ns = mkNamespace();
            clss = args[0];
        }
        else if (args.length == 2) {
            ns = typeof args[0] == 'string' ? mkNamespace(ns) : ns;
            clss = args[1];
        }

        if (Data.extends(clss, Server)) {
            if (!(clss.name in Server.servers)) {
                let server = new clss();
                await server.init();
                return server;
            }
        }
    }
});


/*****
 * A server worker or simply worker is a child of a server running in the primary
 * process.  Each server will spawn it's own workers, which means that if there
 * are two running servers in the primary, each will have its own distinct set of
 * workers.  Servers DO NOT share workers.  Each server manages its own workers
 * independently of the other servers.  Servers and Workers have features to
 * simplofy Interprocess Communications (IPC) between them.
*****/
define(class Worker {
    constructor() {
        this.ctor = Reflect.getPrototypeOf(this).constructor;

        if (!this.ctor.name.endsWith('Worker')) {
            throwError(`Worker "${this.ctor.name}" classname does NOT end with "Worker"`);
        }

        this.namespace = this.ctor['#namespace'];
        this.workerClassName = this.ctor.name;
        this.serverName = this.ctor.name.substring(0, this.ctor.name.length - 'Worker'.length);
        mkHandlerProxy(Process, this.workerClassName, this);
    }

    async callServer(message) {
        message.name = `${this.serverName}Server${message.name}`;
        return await Process.callPrimary(message);
    }

    getClassName() {
        return this.className;
    }

    getCtor() {
        return this.ctor;
    }

    async getSettings() {
        return this.settings
    }

    getServerName() {
        return this.serverName;
    }

    async init() {
        this.settings = await this.callServer({
            name: 'GetSettings'
        });

        return this;
    }

    async onKill(message) {
        Process.exit(0);
    }

    sendServer(message) {
        message.name = `${this.serverName}Server${message.name}`;
        Process.sendPrimary(message);
    }
});
