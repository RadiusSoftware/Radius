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
global.sigBreak = 'SIGBREK';
global.sigBus   = 'SIGBUS';
global.sigFpe   = 'SIGFPE';
global.sigHup   = 'SIGHUP';
global.sigIll   = 'SIGILL';
global.sigInt   = 'SIGINT';
global.sigKill  = 'SIGKILL';
global.sigPipe  = 'SIGPIPE';
global.sigSegv  = 'SIGSEGV';
global.sigStop  = 'SIGSTOP';
global.sigTerm  = 'SIGTERM';
global.sigUsr1  = 'SIGUSR1';
global.sigWinch = 'SIGWINC';


/*****
*****/
global.nodeTypeController = '#CONTROLLER';
global.nodeTypeUndefined  = '#UNDEFINED';
global.nodeNameUndefined  = '#UNDEFINED';


/*****
*****/
singleton('', class Process extends Emitter {
    constructor() {
        super();
        this.children = {};
        let radius = this.getEnv('#RADIUS', 'json');

        if (typeof radius == 'object') {
            this.radius = radius;
        }
        else {
            this.radius = {
                nodeType: nodeTypeController,
            };
        }

        LibProcess.title = Crypto.generateUuid();
        this.radius.nodeName ? null : this.radius.nodeName = nodeNameUndefined;

        LibProcess.on('beforeExit', code => this.onBeforeExit(code));
        LibProcess.on('disconnect', () => this.onDisconnect());
        LibProcess.on('exit', code => this.onExit(code));
        LibProcess.on('message', async message => this.onParentMessage(message));
        LibProcess.on('rejectionHandled', (reason, promise) => this.onRejectiionHandled(reason, promise));
        LibProcess.on('uncaughtException', (error, origin) => this.onUncaughtException(error, origin));
        LibProcess.on('uncaughtExceptionMonitor', (error, origin) => this.onUncaughtExceptionMonitor(error, origin));
        LibProcess.on('unhandledRejection', (reason, promise) => this.onUnhandledRejection(reason, promise));
        LibProcess.on('warning', warning => this.onWarning(warning));
    }

    abort() {
        LibProcess.abort();
        return this;
    }

    callChild(child, message, sendHandle) {
        return new Promise((ok, fail) => {
            // TODO
        });
    }

    callChildren(message, sendHandle) {
        return new Promise((ok, fail) => {
            // TODO
        });
    }

    callParent(message, sendHandle) {
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
            nodeType = nodeTypeUndefined;
        }

        try {
            let subprocess = LibChildProcess.fork(
                this.getArg(1),
                [],
                {
                    env: Data.copy(LibProcess.env, {
                        '#RADIUS': toJson({
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

    getTitle() {
        return LibProcess.title;
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
            // TODO
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
    onUncaughtException(error, origin) {
        console.log(error);
        this.emit({
            name: 'UncaughtException',
            process: this,
            error: error,
            origin: origin,
        });
    }

    onUncaughtExceptionMonitor(error, origin) {
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

    sendChild(child, message, sendHandle) {
        // TODO
    }

    sendChildren(message, sendHandle) {
        // TODO
    }

    sendParent(message, sendHandle) {
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
*****/
register('', async function execIn(nodeType, func) {
    if (Array.isArray(nodeType)) {
        if (nodeType.filter(nodeTypeName => nodeTypeName == Process.getNodeType()).length) {
            await func();
        }
    }
    else if (typeof nodeType == 'string') {
        if (nodeType == Process.getNodeType()) {
            await func();
        }
    }
});

register('', function registerIn(nodeType, ns, arg) {
    if (Array.isArray(nodeType)) {
        if (nodeType.filter(nodeTypeName => nodeTypeName == Process.getNodeType()).length) {
            register(ns, arg);
        }
    }
    else if (typeof nodeType == 'string') {
        if (nodeType == Process.getNodeType()) {
            register(ns, arg);
        }
    }
});

register('', async function singletonIn(nodeType, ns, arg, ...args) {
    if (Array.isArray(nodeType)) {
        if (nodeType.filter(nodeTypeName => nodeTypeName == Process.getNodeType()).length) {
            singleton(ns, arg, ...args);
        }
    }
    else if (typeof nodeType == 'string') {
        if (nodeType == Process.getNodeType()) {
            singleton(ns, arg, ...args);
        }
    }
});