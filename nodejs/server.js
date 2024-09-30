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
 * A server is a construct within the Radius environmental framework wherein
 * there is a child of the controller process with that has zero or more child
 * processes called workers.  Yes, the terminology is like the builtin Cluster
 * module in nodeJS.  The difference is that there can be multiple differenet
 * radius servers on the server with different "main"  or "primary" server
 * processes.  A server has two different node classes.  Best practices is to
 * have a server-named class and its accompanying workers classes:
 * 
 *          HttpServer
 *          HttpServerWorker
 * 
 * Using the nodeclass feature of the Radius framework, execIn(), registerIn(),
 * and singletonIn() can be used to segregate server code to the process node
 * class, in which it will execute;
*****/
register('', class Server extends Emitter {
    static settings = {
        workers: 1,
    };

    constructor() {
        super();
        this.workers = {};
        this.settings = {};
        this.className = Reflect.getPrototypeOf(this).constructor.name;
        this.appName = Reflect.getPrototypeOf(this).constructor.name;
        mkHandlerProxy(Process, this.appName, this);
    }

    async callWorker(worker, message) {
        const name = message.name;
        message.name = `${this.appName}WorkerOn${name}`;
        let response = await worker.sendChild(message);
        message.name = name;
        return response;
    }

    getAppName() {
        return this.appName;
    }

    getClassName() {
        return this.className;
    }

    getSetting(name) {
        if (name in this.settings) {
            return this.settings[name];
        }
        else {
            return this.settings;
        }
    }

    getSettingsPath() {
        return `/${this.className}`;
    }

    async init() {
        this.settings = await Settings.getValue(`/${this.className}`);
        return this;
    }

    async kill() {
        return this;
    }

    async killWorker(pid) {
        return this;
    }

    async pause() {
        return this;
    }

    async pauseWorker(pid) {
        return this;
    }

    sendWorker(worker, message) {
        const name = message.name;
        message.name = `${this.appName}${name}`;
        worker.sendChild(message);
        message.name = name;
        return this;
    }

    async start() {
        if (typeof this.settings.workers == 'number') {
            for (let i = 0; i < this.settings.workers; i++) {
                await this.startWorker();
            }
        }
    }

    async startWorker() {
        let workerClassName = `${this.className}Worker`;
        let worker = await Process.fork(workerClassName, workerClassName, this.settings);
        this.workers[worker.getPid()] = worker;
        await this.callWorker(worker, { name: 'Init' });
        return worker;
    }

    async stop() {
        return this;
    }

    async stopWorker(pid) {
        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.workers)[Symbol.iterator]();
    }
});


/*****
 * A server is a construct within the Radius environmental framework wherein
 * there is a child of the controller process with that has zero or more child
 * processes called workers.  Yes, the terminology is like the builtin Cluster
 * module in nodeJS.  The difference is that there can be multiple different
 * radius servers on the server with different "main" or "primary" server
 * processes.  A server has two different node classes.  Best practices is to
 * have a server-named class and its accompanying workers classes:
 * 
 *          HttpServer
 *          HttpServerWorker
 * 
 * Using the nodeclass feature of the Radius framework, execIn(), registerIn(),
 * and singletonIn() can be used to segregate server code to the process node
 * class, in which it will execute;
*****/
register('', class ServerWorker extends Emitter {
    constructor() {
        super();
        this.settings = {};
        this.state = 'paused';
        this.className = Reflect.getPrototypeOf(this).constructor.name;
        this.appName = Reflect.getPrototypeOf(this).constructor.name.replace('Worker', '');
        mkHandlerProxy(Process, this.appName, this);
    }

    async callApp(message) {
        const name = message.name;
        message.name = `${this.appName}${name}`;
        let response = await Process.callParent(message);
        message.name = name;
        return response;
    }

    getAppName() {
        return this.appName;
    }

    getClassName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }

    getSetting(name) {
        if (name in this.settings) {
            return this.settings[name];
        }
        else {
            return this.settings;
        }
    }

    getSettingsPath() {
        return `/${this.className.replace('Worker', '')}`;
    }

    async init() {
        this.settings = await Settings.getValue(this.getSettingsPath());
        return this;
    }

    async kill() {
        Process.exit(0);
        return this;
    }

    async pause() {
        if (this.state == 'running') {
            this.state = 'paused';
            this.emit({ name: 'WorkerState',  state: 'paused' });
        }

        return this;
    }

    sendApp(message) {
        const name = message.name;
        message.name = `${this.appName}${name}`;
        Process.sendParent(message);
        return this;
    }

    async start() {
        if (this.state == 'paused') {
            this.state = 'running';
            this.emit({ name: 'WorkerState',  state: 'running' });
        }

        return this;
    }

    async stop() {
        if (this.state == 'running') {
            this.emit({ name: 'WorkerState',  state: 'stopped' });
            Process.exit(0);
        }

        return this;
    }
});


/*****
 * Starting a radius server is a non-obvious and coordinated task requiring the
 * correct seequence of operations in three different process nodes: (a) the
 * controller, (b) the main server node, and (c) the server worker nodes.
 * startServer() can be called in any process to launch a new server process
 * tree.  Note that multiple instances of a server may be launched on a host,
 * with the primary issue being that each instance may require full control of
 * one resource such as a network interface's port.
 * 
 * The startServer() function sends a message to the controller, to inform the
 * controller that a request to launch a new instance was initiated.  The
 * controller then launches the server process via Process.fork().  What's
 * created in the server's "primary" process.  The management of worker
 * processes is under the control the the server's "primary" process.
 * 
 * Servers only work if the process's node class matches the server class's
 * class name.  For workers, that name is {server-class}Worker.
*****/
register('', async function startServer(fqClassName) {
    Process.sendController({
        name: '#StartServer',
        fqClassName: fqClassName,
    });
});

execIn(Process.nodeClassController, () => {
    Process.on('#StartServer', async message => {
        await Process.fork(message.fqClassName, message.fqClassName);
    });
});

Process.on('#Spawned', async message => {
    let server;
    eval(`server = ${Process.getNodeClass()}`);

    for (let clss of Data.enumerateClassHierarchy(server).reverse()) {
        if (typeof clss.settings == 'object') {
            for (let key in clss.settings) {
                server.settings[key] = Data.clone(clss.settings[key]);
            }
        }
    }
    
    await Settings.setSetting(`/${server.constructor.name}`, server.settings);
    await server.init();
    await server.start();
});
