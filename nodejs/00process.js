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
LibCluster      = require('node:cluster');
LibChildProcess = require('node:child_process');
LibOs           = require('node:os');
LibProcess      = require('node:process');


/*****
 * The Process singleton provides a bundle of features within each nodejs process:
 * process management, process reflection, and interprocess communications.  Our
 * basic model is that each process has a parent process and zero or more worker
 * processes.  Process features enable interprocess communications (IPC) using
 * standard Radius messages.  Each Process may communication directly with its
 * parent and children.
 * 
 * NodeJS events and messages are converted into Radius messages.  Remember
 * that the Radius Message class along with the Radius Emitter provies the core
 * features for all intraprocess, interprocess, and host-to-host communications
 * and event management.  One point to note is that all messaging employs the
 * the enhanced JSON features provided by Radius.  Hence, the IPC messageing
 * implemented in this module performs conversion between messages and bulk
 * JSON automatically.  Bulk JSON is simply where an object or message is first
 * converted to JSON using Radius JSON features and transmitted as a "bulk" JSON
 * message: { "json": "<JSON encoded object>" }.
 * 
 * The most complex part to understand is the messge routing.  Here are some
 * special message properties to help with the routing:
 * 
 *      #TRAP     - The calling processes's call-trap ID
 *      #CALL     - Available with a value of true for a call message
 *      #WORKER   - Request to primary to call worker(s)
 *      #RESPONSE - The response or return value for IPC calls
 * 
 * Handling and routing based on these special-purpose properties is performed
 * in the onMessageFromChild() and onMessageFromParent() methods.
*****/
singleton(class Process extends Emitter {
    constructor() {
        super();
        LibProcess.on('beforeExit', code => this.onBeforeExit(code));
        LibProcess.on('disconnect', () => this.onDisconnect());
        LibProcess.on('exit', code => this.onExit(code));
        LibProcess.on('rejectionHandled', (reason, promise) => this.onRejectiionHandled(reason, promise));
        LibProcess.on('uncaughtException', (error, origin) => this.onUncaughtException(error, origin));
        LibProcess.on('uncaughtExceptionMonitor', (error, origin) => this.onUncaughtExceptionMonitor(error, origin));
        LibProcess.on('unhandledRejection', (reason, promise) => this.onUnhandledRejection(reason, promise));
        LibProcess.on('warning', warning => this.onWarning(warning));

        if (LibCluster.isPrimary) {
            LibCluster.on('message', (worker, json, sendHandle) => {
                let message = fromJson(json);

                if (sendHandle) {
                    message['#handle'] = sendHandle
                }

                this.onMessageFromWorker(worker, message);
            });

            this.on('GetClassCode', message => this.onGetClassCode(message));
            this.on('GetClusterNodeId', message => this.clusterNodeId);
        }
        else {
            LibProcess.on('message', (json, sendHandle) => {
                let message = fromJson(json);

                if (sendHandle) {
                    message['#handle'] = sendHandle
                }

                this.onMessageFromPrimary(message);
            });
        }
    }

    abort() {
        LibProcess.abort();
        return this;
    }

    async callPrimary(message, sendHandle) {
        if (this.isPrimary()) {
            return this.query(message);
        }
        else {
            let trap = mkTrap(1);
            message['#TRAP'] = trap.id;
            message['#CALL'] = true;
            LibProcess.send(toJson(message), sendHandle);
            return trap.promise;
        }
    }

    async callProcess(dest, message) {
        if (dest >= 0) {
            return await this.callWorker(dest, message);
        }
        else {
            return await this.callPrimary(message);
        }
    }

    async callWorker(dest, message, sendHandle) {
        if (this.isPrimary()) {
            let worker;

            if (typeof dest == 'number') {
                worker = LibCluster.workers[dest];
            }
            else if (dest instanceof LibCluster.Worker) {
                worker = dest; 
            }

            if (worker) {
                let trap = mkTrap(1);
                message['#TRAP'] = trap.id;
                message['#CALL'] = true;
                worker.send(toJson(message), sendHandle);
                return trap.promise;
            }
        }
        else {
            message['#WORKER'] = dest;
            return await this.callPrimary(message, sendHandle);
        }

        return new Promise((ok, fail) => { ok(undefined) });
    }

    async callWorkers(message, sendHandle) {
        let promises = [];

        if (this.isPrimary()) {
            for (let worker of this) {
                promises.push(this.callWorker(worker, message, sendHandle));
            }
        }
        else {
            message['#WORKER'] = '*';
            return await this.callPrimary(message, sendHandle);
        }

        return Promise.all(promises);
    }

    deleteEnv(name) {
        delete LibProcess.env[name];
        return this;
    }

    async ensureClass(namespace, classname) {
        let ns = mkNamespace(namespace);
        let clss = ns.getClass(classname);

        if (!clss && this.isWorker()) {
            let classCode = await this.callPrimary({
                name: 'GetClassCode',
                namespace: namespace,
                classname: classname,
            });

            if (classCode) {
                eval(`clss = ${classCode}`);
                mkNamespace(namespace).define(clss);
            }
        }

        return clss;
    }

    exit(code) {
        LibProcess.exit(code);
        return this;
    }

    getEnv(name) {
        if (name) {
            return LibProcess.env[name];
        }
        else {
            return LibProcess.env;
        }
    }

    getActiveResourceInfo() {
        return LibProcess.getActiveResourceInfo();
    }

    getArg(index) {
        return LibProcess.argv[index];
    }

    getArgv() {
        return LibProcess.argv;
    }

    getArgvLength() {
        return LibProcess.argv.length;
    }

    getCwd() {
        return LibProcess.cwd;
    }

    getEffectiveGid() {
        return LibProcess.getegid();
    }

    getEffectiveUid() {
        return LibProcess.geteuid();
    }

    getExecPath() {
        return Data.copy(LibProcess.execPath);
    }

    getGid() {
        return LibProcess.getgid();
    }

    getGroups() {
        return LibProcess.getgroups();
    }

    getMemory() {
        return LibProcess.constrainedMemory();
    }

    getParentPid() {
        return LibProcess.ppid;
    }

    getPath() {
        return LibProcess.execPath;
    }

    getPid() {
        return LibProcess.pid;
    }

    getRelease() {
        return LibProcess.release;
    }

    getTmpDir() {
        LibOs.tmpdir();
    }

    getWorker() {
        return LibCluster.worker;
    }

    getWorkerId() {
        if (this.isPrimary()) {
            return -1;
        }
        else {
            return LibCluster.worker.id;
        }
    }

    hasEnv(name) {
        return typeof LibProcess.env[name] != 'undefined';
    }

    isPrimary() {
        return LibCluster.isPrimary;
    }

    isWorker() {
        return LibCluster.isWorker;
    }

    onBeforeExit(code) {
        this.emit({
            name: 'BeforeExit',
            process: this,
            code: code,
        });
    }

    onDisconnect() {
        this.emit({
            name: 'Disconnect',
            process: this,
        });
    }

    onExit(code) {
        this.emit({
            name: 'Exit',
            process: this,
            code: code,
        });
    }

    async onGetClassCode(message) {
        let classCode = '';

        if (this.isPrimary()) {
            let namespace = mkNamespace(message.namespace);
            let clss = namespace.getClass(message.classname);

            if (typeof clss == 'function') {
                classCode = clss.toString();
            }
        }

        return classCode;
    }

    async onMessageFromPrimary(message) {
        if ('#RESPONSE' in message) {
            let trapId = message['#TRAP'];
            let response = message['#RESPONSE'];
            delete message['#CALL'];
            delete message['#RESPONSE'];
            Trap.handleResponse(trapId, response);
            return;
        }
        else if ('#CALL' in message) {
            let trapId = message['#CALL'];
            delete message['#CALL'];
            message['#RESPONSE'] = await this.query(message);
            message['#CALL'] = trapId;
            LibProcess.send(toJson(message));
            return;
        }
        
        this.emit(message);
    }

    async onMessageFromWorker(worker, message) {
        if ('#RESPONSE' in message) {
            let trapId = message['#TRAP'];
            let response = message['#RESPONSE'];
            delete message['#CALL'];
            delete message['#RESPONSE'];
            Trap.handleResponse(trapId, response);
            return;
        }
        else if ('#CALL' in message) {
            let trapId = message['#TRAP'];
            delete message['#CALL'];

            if ('#WORKER' in message) {
                let workerId = message['#WORKER'];
                delete message['#WORKER'];

                if (workerId == '*') {
                    message['#RESPONSE'] = await this.callWorkers(message);
                }
                else if (typeof workerId == 'number' && workerId in LibCluster.workers) {
                    message['#RESPONSE'] = await this.query(message);
                }
                else {
                    return null;
                }
            }
            else {
                message['#RESPONSE'] = await this.query(message);
            }

            message['#TRAP'] = trapId;
            worker.send(toJson(message));
            return;
        }
        else if ('#WORKER' in message) {
            let workerId = message['#WORKER'];
            delete message['#WORKER'];

            if (workerId == '*') {
                this.sendWorkers(message);
            }
            else if (typeof workerId == 'number' && workerId in LibCluster.workers) {
                this.sendWorker(workerId, message);
            }
        }
        else {
            this.emit(message);
        }
    }

    onRejectionHandled(reason, promise) {
        this.emit({
            name: 'RejectionHandled',
            process: this,
            reason: reason,
            promise: promise,
        });
    }

    onUncaughtException(e, origin) {
        if (this.strictlyHandles('UnhandledRejection')) {
            this.emit({
                name: 'UncaughtException',
                process: this,
                exception: e,
                origin: origin,
            });
        }
        else {
            caught(e);
        }
    }

    onUncaughtExceptionMonitor(e, origin) {
        this.emit({
            name: 'UncaughtExceptionMonitor',
            process: this,
            exception: e,
            origin: origin,
        });
    }

    onUnhandledRejection(reason, promise) {
        if (this.strictlyHandles('UnhandledRejection')) {
            this.emit({
                name: 'UnhandledRejection',
                process: this,
                reason: reason,
                promise: promise,
            });
        }
        else {
            caught(reason);
        }
    }

    onWarning(warning) {
        this.emit({
            name: 'Warning',
            process: this,
            warning: warning,
        });
    }

    runProcess(command, ...argv) {
        let childProcess = LibChildProcess.spawn(
            command,
            argv,
            {
                detached: true,
            }
        );

        let ready;
        let promise = new Promise((ok, fail) => {
            ready = ok;
        });

        childProcess.on('spawn', () => {
            childProcess.unref();
            ready(childProcess);
        });

        return promise;
    }

    runRadius(...args) {
        let command = this.getArg(0);
        let argv = [ this.getArg(1) ];

        for (let arg of args) {
            argv.push(arg);
        }

        return this.runProcess(command, ...argv);
    }

    runScript(script) {
        return new Promise((ok, fail) => {
            LibChildProcess.exec(script, (error, stdout, stderr) => {
                ok({
                    error: error,
                    stdout: stdout,
                    stderr: stderr,
                });
            });        
        });
    }

    async runWorker(...args) {
        if (this.isPrimary()) {
            let launcher;

            if (args.length == 1) {
                launcher = args[0];
            }
            else if (args.length == 2) {
                launcher = args[1];
            }

            let bootUUID = Crypto.generateUUID();
            typeof launcher == 'function' ? launcher = launcher.toString() : null;

            let ready;
            let worker = LibCluster.fork({ bootUUID: bootUUID });

            this.once(bootUUID, async message => {
                let settingsHandle = mkSettingsHandle();
                worker.send(await settingsHandle.getSetting('nodejsFramework'));
                
                this.sendWorker(worker, {
                    name: 'StartProcessLauncher',
                    launcher: mkBuffer(launcher.toString()).toString('base64') 
                });

                ready(worker);
            });

            return new Promise((ok, fail) => {
                ready = ok;
            });
        }
        else {
            return new Promise((ok, fail) => ok());
        }
    }

    sendPrimary(message, sendHandle) {
        if (this.isPrimary()) {
            this.emit(message);
        }
        else {
            LibProcess.send(toJson(message), sendHandle);
        }

        return this;
    }

    sendProcess(dest, message) {
        if (dest >= 0) {
            this.sendWorker(dest, message);
        }
        else {
            this.sendPrimary(message);
        }

        return this;
    }

    sendWorker(dest, message, sendHandle) {
        if (this.isPrimary()) {
            let worker;

            if (typeof dest == 'number') {
                worker = LibCluster.workers[dest];
            }
            else if (dest instanceof LibCluster.Worker) {
                worker = dest; 
            }

            if (worker) {
                worker.send(toJson(message), sendHandle);
            }
        }
        else {
            message['#WORKER'] = dest;
            this.sendPrimary(message);
        }

        return this;
    }

    sendWorkers(message, sendHandle) {
        if (this.isPrimary()) {
            for (let worker of this) {
                worker.send(toJson(message), sendHandle)
            }
        }
        else {
            message['#WORKER'] = '*';
            this.sendPrimary(message, sendHandle);
        }

        return this;
    }

    setEnv(name, value) {
        if (typeof value == 'object' && value !== null) {
            LibProcess.env[name] = toJson(value);
        }
        else {
            LibProcess.env[name] = value.toString();
        }

        return this;
    }

    [Symbol.iterator]() {
        if (this.isPrimary) {
            return Object.values(LibCluster.workers)[Symbol.iterator]();
        }
        else {
            return [];
        }
    }
});