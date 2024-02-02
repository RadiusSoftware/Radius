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


/*****
 * Starting an application is a non-obvious and coordinated task requiring the
 * correct seequence of operations in three different process nodes: (a) the
 * controller, (b) the main application node, and (c) the application worker nodes.
 * startApplication() can be called in any process to launch a new application.
 * Note that multiple instances of an application be launched on a host, with
 * the primary issue being that each instance may require full controll of one
 * resource such as a network interface's port.
 * 
 * The startApplication() function sends a message to the controller, to inform
 * the controller that a request to launch application instance was initiated.
 * The controller then launches the application process via Process.fork().
 * What's created in the application's "primary" process.  The management of
 * worker processes is under the control the the application's "primary" process.
 * 
 * Applications only work if the process's node class matches the application
 * class's class name.  For workers, that name is {application-class}Worker.
*****/
register('', async function startApplication(fqClassName, settings) {
    Process.sendController({
        name: '#STARTAPPLICATION',
        fqClassName: fqClassName,
        settings: settings,
    });
});

Process.on('#SPAWNED', async message => {
    try {
        let nodeClass = Process.getNodeClass();
        let settings = Process.getEnv(nodeClass, 'json');

        if (typeof settings == 'object') {
            let application;
            eval(`application = mk${nodeClass}(settings)`);
            await application.start();
        }
    }
    catch (error) {
        // TODO - log error
    }
});

execIn(Process.nodeClassController, () => {
    Process.on('#STARTAPPLICATION', async message => {
        Process.fork(message.fqClassName, message.fqClassName, message.settings);
    });
});


/*****
 * An application is a construct within the Radius server framework wherein
 * there is a child of the controller process with that has zero or more child
 * processes called workers.  Yes, the terminology is like the builtin Cluster
 * module in nodeJS.  The difference is that there can be multiple differenet
 * applications on the server with different "main"  or "primary" application
 * processes.  An application has two different node classes.  Best practices
 * is to have an application-named class and its accompanying workers classes:
 * 
 *          HttpServer
 *          HttpServerWorker
 * 
 * Using the nodeclass feature of the Radius framework, execIn(), registerIn(),
 * and singletonIn() can be used segregate application code to the process node
 * class, in which it will execute;
*****/
register('', class Application extends Emitter {
    constructor(settings) {
        super();
        this.settings = settings;
        this.className = this.getClassName();
        this.workers = {};
        Process.on('*', message => this.emit(message));
    }

    getApplication() {
        if (this.radius.nodeClass in LibProcess.env) {
            return fromJson(LibProcess.env[this.radius.nodeClass]);
        }
    }

    getClassName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }

    getSetting(name) {
        return this.settings[name];
    }

    getSettings() {
        return Data.clone(settings);
    }

    getSettingsFromProcess() {
        if ('nodeClass' in this.radius && this.radius.nodeClass in LibProcess.env) {
            return fromJson(this.getEnv(this.radius.nodeClass));
        }

        return {};
    }

    hasSetting(name) {
        return name in this.settings;
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

    async queryWorker(worker, message) {
    }

    sendWorker(worker, message) {
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
        let worker = Process.fork(workerClassName, workerClassName, this.settings);
        this.workers[worker.getPid()] = worker;
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
 * An application is a construct within the Radius server framework wherein
 * there is a child of the controller process with that has zero or more child
 * processes called workers.  Yes, the terminology is like the builtin Cluster
 * module in nodeJS.  The difference is that there can be multiple differenet
 * applications on the server with different "main"  or "primary" application
 * processes.  An application has two different node classes.  Best practices
 * is to have an application-named class and its accompanying workers classes:
 * 
 *          HttpServer
 *          HttpServerWorker
 * 
 * Using the nodeclass feature of the Radius framework, execIn(), registerIn(),
 * and singletonIn() can be used segregate application code to the process node
 * class, in which it will execute;
*****/
register('', class ApplicationWorker extends Emitter {
    constructor() {
        super();
        this.state = 'paused';
        this.className = Reflect.getPrototypeOf(this).constructor.name;

        if (Process.hasEnv(this.className)) {
            this.settings = Process.getEnv(this.className, 'json');
        }
        else {
            this.settings = {};
        }
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

    async queryApplication(message) {
        return this;
    }

    sendApplication(message) {
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
