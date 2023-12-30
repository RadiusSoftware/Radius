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
import LibChildProcess from 'node:child_process'
import LibProcess from 'node:process'


/*****
*****/
singleton('', class Process extends Emitter {
    constructor() {
        super();
        this.children = {};
        let radius = this.getEnv('RADIUS', 'json');

        if (typeof radius == 'object') {
            this.radius = radius;
        }
        else {
            this.radius = {
                nodeType: 'CONTROLLER',
                iid: Crypto.generateUuid(),
                appName: 'undefined',
            };
        }

        LibProcess.on('beforeExit', code => this.onBeforeExit(code));
        LibProcess.on('disconnect', () => this.onDisconnect());
        LibProcess.on('exit', code => this.onExit(code));
        LibProcess.on('message', async message => this.onParentMessage(message));
        LibProcess.on('rejectionHandled', (reason, promise) => this.onRejectiionHandled(reason, promise));
        LibProcess.on('uncaughtException', (error, origin) => this.onUncaughException(error, origin));
        LibProcess.on('uncaughtExceptionMonitor', (error, origin) => this.onUncaughtExceptionMonitor(error, origin));
        LibProcess.on('unhandledRejection', (reason, promise) => this.onUnhandledRejection(reason, promise));
        LibProcess.on('warning', warning => this.onWarning(warning));
    }

    abort() {
        LibProcess.abort();
        return this;
    }

    callChild(child, message) {
        return new Promise((ok, fail) => {
            // TODO
        });
    }

    callChildren(message) {
        return new Promise((ok, fail) => {
            // TODO
        });
    }

    callParent(message) {
        return new Promise((ok, fail) => {
            // TODO
        });
    }

    dump() {
        console.log(LibProcess);
    }

    exit(code) {
        LibProcess.exit(code);
        return this;
    }

    fork(nodeType) {
       let childProcess = null;

        if (typeof nodeType != 'string') {
            switch (this.radius.nodeType) {
                case 'CONTROLLER':
                    nodeType = 'APPLICATION';
                    break;

                case 'APPLICATION':
                    nodeType = 'WORKER';
                    break;

                default:
                    nodeType = 'MISC';
                    break;
            }
        }

        try {
            let subprocess = LibChildProcess.fork(
                this.getArg(1),
                [],
                {
                    env: Data.copy(LibProcess.env, {
                        RADIUS: toJson({
                            nodeType: nodeType,
                        }),
                    })
                }
            );

            if (subprocess) {
                childProcess = mkChildProcess(subprocess);
                childProcess.on('*', message => this.onChildMessage(message));
                this.children[subprocess.pid] = childProcess;
            }
        }
        catch (e) {}
        return childProcess;
    }

    getActiveResourceInfo() {
        return LibProcess.getActiveResourceInfo();
    }

    getArg(index) {
        return LibProcess.argv[index];
    }

    getArgs() {
        return LibProcess.argv;
    }

    getArgLength() {
        return LibProcess.argv.length;
    }

    getChildProcess(pid) {
        return this.children[pid];
    }

    getConfig() {
        return LibProcess.config;
    }

    getCpuUsage() {
        this.cpuUsage = LibProcess.cpuUsage();
        return this.cpuUsage;
    }

    getCpuUsageDiff() {
        if (!this.cpuUsage) {
            this.getCpuUsage();
        }

        this.cpuUsage = LibProcess.cpuUsage(this.cpuUsage);
        return this.cpuUsage;
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

    getEnv() {
        return Data.copy(LibProcess.env);
    }

    getExecArgv() {
        return Data.copy(LibProcess.execArgv);
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

    getImplementation() {
        return LibProcess;
    }

    getMemory() {
        return LibProcess.constrainedMemory();
    }

    getUid() {
        return LibProcess.getuid();
    }

    getEnv(name, flag) {
        let value = LibProcess.env[name];

        if (value) {
            if (flag == 'json') {
                try {
                    return fromJson(value);
                }
                catch (e) {
                    return new Object();
                }
            }
            else {
                return value;
            }
        }
    }

    getIid() {
        return this.iid;
    }

    getNodeType() {
        return this.radius.nodeType;
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
    
    isApplication() {
        return this.radius.nodeType == 'APPLICATION';
    }

    isController() {
        return this.radius.nodeType == 'CONTROLLER';
    }

    isOther() {
        return !(this.radius.nodeType in {
            'CONTROLLER': 0,
            'APPLICATION': 0,
            'WORKER': 0,
        });
    }

    isWorker() {
        return this.radius.nodeType == 'WORKER';
    }

    onBeforeExit(code) {
        this.emit({
            name: 'BeforeExit',
            process: this,
            code: code,
        });
    }
    
    onChildMessage(message) {
        message.name = `Child${message.name}`;

        if ('#CALL' in message) {
            return this.call(message);
        }
        else {
            this.emit(message);
        }
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

    onParentMessage(message) {
        if ('#CALL' in message) {
            //this.call(message);
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

    onUncaughtRejection(error, origin) {
        this.emit({
            name: 'UncaughtException',
            process: this,
            error: error,
            origin: origin,
        });
    }

    onUncaughtRejectionMonitor(error, origin) {
        this.emit({
            name: 'UncaughtExceptionMonitor',
            process: this,
            error: error,
            origin: origin,
        });
    }

    onUnhandledRejection(reason, promise) {
        this.emit({
            name: 'UnhandledRejection',
            process: this,
            reason: reason,
            promise: promise,
        });
    }

    onWarning(warning) {
        this.emit({
            name: 'Warning',
            process: this,
            warning: warning,
        });
    }

    sendChild(child, message) {
        // TODO
    }

    sendChildren(message) {
        // TODO
    }

    sendParent(message) {
        return new Promise((ok, fail) => {
            if ('HANDLE' in message) {
                LibProcess.send(
                    { json: toJson(message) },
                    () => ok(this),
                );
            }
            else {
                LibProcess.send(
                    { json: toJson(message) },
                    () => ok(this),
                );
            }
        });
    }

    [Symbol.iterator]() {
        return Object.values(this.children)[Symbol.iterator]();
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
register('', async function execApplication(func) {
    if (Process.isApplication()) {
        await func();
    }
});

register('', async function execController(func) {
    if (Process.isController()) {
        await func();
    }
});

register('', async function execNonController(func) {
    if (!Process.isController()) {
        await func();
    }
});

register('', async function execWorker(func) {
    if (Process.isWorker()) {
        await func();
    }
});

register('', async function execNonWorker(func) {
    if (!Process.isWorker()) {
        await func();
    }
});

register('', function registerApplication(ns, arg) {
    if (Process.isApplication()) {
        register(ns, arg);
    }
});

register('', function registerController(ns, arg) {
    if (Process.isController()) {
        register(ns, arg);
    }
});

register('', function registerNonController(ns, arg) {
    if (!Process.isController()) {
        register(ns, arg);
    }
});

register('', function registerWorker(ns, arg) {
    if (Process.isWorker()) {
        register(ns, arg);
    }
});

register('', function registerNonWorker(ns, arg) {
    if (!Process.isWorker()) {
        register(ns, arg);
    }
});

register('', async function singletonApplication(ns, arg, ...args) {
    if (Process.isApplication()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonController(ns, arg, ...args) {
    if (Process.isController()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonNonController(ns, arg, ...args) {
    if (!Process.isController()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonWorker(ns, arg, ...args) {
    if (Process.isWorker()) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonNonWorker(ns, arg, ...args) {
    if (!Process.isWorker()) {
        singleton(ns, arg, ...args);
    }
});