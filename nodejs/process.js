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
LibChildProcess = require('node:child_process');
LibProcess = require('node:process');


/*****
 * The Process singleton provides a bundle of features within each nodejs process:
 * process management, process reflection, and interprocess communications.  Our
 * basic model is that each process has a parent process and zero or more child
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
*****/
singleton('', class Process extends Emitter {
    constructor() {
        super();
        this.nodeClassController = '#CONTROLLER';
        this.nodeClassUndefined  = '#UNDEFINED';
        this.nodeTitleUndefined  = '#UNDEFINED';
    
        this.sigBreak = 'SIGBREK';
        this.sigBus   = 'SIGBUS';
        this.sigFpe   = 'SIGFPE';
        this.sigHup   = 'SIGHUP';
        this.sigIll   = 'SIGILL';
        this.sigInt   = 'SIGINT';
        this.sigKill  = 'SIGKILL';
        this.sigPipe  = 'SIGPIPE';
        this.sigSegv  = 'SIGSEGV';
        this.sigStop  = 'SIGSTOP';
        this.sigTerm  = 'SIGTERM';
        this.sigUsr1  = 'SIGUSR1';
        this.sigWinch = 'SIGWINC';

        this.routing = {};
        this.children = {};
        let radius = this.getEnv('#RADIUS', 'json');

        if (typeof radius == 'object') {
            this.radius = radius;
        }
        else {
            this.radius = {
                nodeGuid: Crypto.generateUuid(),
                nodeClass: this.nodeClassController,
                nodeTitle: 'Radius Server',
            };
        }

        LibProcess.title = this.radius.nodeTitle;
        LibProcess.on('beforeExit', code => this.onBeforeExit(code));
        LibProcess.on('disconnect', () => this.onDisconnect());
        LibProcess.on('exit', code => this.onExit(code));
        LibProcess.on('message', async (message, sendHandle) => this.onParentMessage(message, sendHandle));
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

    async callChild(child, message) {
        let childProcess;

        if (typeof child == 'number') {
            if (child in this.children) {
                childProcess = child;
            }
        }
        else if (child instanceof ChildProcess) {
            childProcess = child;
        }
        
        if (childProcess) {
            return await childProcess.callChild(message);
        }

        return undefined;
    }

    async callChildren(message) {
        return Promise.all(
            Object.values(this.children).map(async childProcess => {
                return (async () => await childProcess.callChild(message))();
            })
        );
    }

    callParent(message) {
        let trap = mkTrap();
        trap.setCount(1);
        message['#TRAP'] = trap.id;
        message['#CALL'] = true;

        LibProcess.send(
            { json: toJson(message) },
        );

        return trap.promise;
    }

    dump() {
        console.log(LibProcess);
    }

    execInShell(script) {
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

    exit(code) {
        LibProcess.exit(code);
        return this;
    }

    fork(nodeClass, nodeTitle, settings) {
       let childProcess = null;
       let nodeGuid = Crypto.generateUuid();
       nodeClass ? null : nodeClass = this.nodeClassUndefined;
       nodeTitle ? null : nodeTitle = this.nodeTitleUndefined;

        try {
            let env = Data.copy(LibProcess.env, {
                '#RADIUS': toJson({
                    nodeGuid: nodeGuid,
                    nodeClass: nodeClass,
                    nodeTitle: nodeTitle,
                }),
            });

            if (typeof settings == 'object') {
                env[nodeClass] = toJson(settings);
            }

            let subprocess = LibChildProcess.fork(
                this.getArg(1),
                [],
                {
                    env: env,
                }
            );

            if (subprocess) {
                childProcess = mkChildProcess({
                    childProcess: subprocess,
                    nodeGuid: nodeGuid,
                    nodeClass: nodeClass,
                    nodeTitle: nodeTitle,
                });

                childProcess.on('*', message => this.onChildMessage(message));
                this.children[subprocess.pid] = childProcess;
            }
        }
        catch (e) {
            log(e);
        }

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

    getEnv(name, flag) {
        if (name) {
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
        else {
            return Data.copy(LibProcess.env);
        }
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

    getIid() {
        return this.iid;
    }

    getImplementation() {
        return LibProcess;
    }

    getMemory() {
        return LibProcess.constrainedMemory();
    }

    getNodeGuid() {
        return this.radius.nodeGuid;
    }

    getNodeClass() {
        return this.radius.nodeClass;
    }

    getNodeTitle() {
        return LibProcess.title;
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

    getUid() {
        return LibProcess.getuid();
    }

    hasEnv(name) {
        return typeof LibProcess.env[name] != 'undefined';
    }

    onAbort(message) {
        this.abort();
    }

    onBeforeExit(code) {
        this.emit({
            name: 'BeforeExit',
            process: this,
            code: code,
        });
    }

    onChildClose(childProcess, message) {
        message.childProcess = childProcess;
        this.emit(message);
    }

    onChildDisconnect(childProcess, message) {
        message.childProcess = childProcess;
        this.emit(message);
    }

    onChildError(childProcess, message) {
        message.childProcess = childProcess;
        this.emit(message);
    }

    onChildExit(childProcess, message) {
        if (childProcess.getPid() in this.children) {
            delete this.children[childProcess.getPid()];
        }

        message.childProcess = childProcess;
        this.emit(message);
    }
    
    async onChildMessage(message) {
        if (!this.routeUp(message)) {
            if ('#RESULT' in message) {
                let trapId = message['#TRAP'];
                let result = message['#RESULT'];
                delete message['#TRAP'];
                delete message['#RESULT'];
                Trap.handleReply(trapId, result);
            }
            else if ('#CALL' in message) {
                let trapId = message['#TRAP'];
                message['#RESULT'] = await this.call(message);
                message['#TRAP'] = trapId;
                delete message['#CALL'];
                let childProcess = message.childProcess;
                delete message.childProcess;
                childProcess.sendChild(message);
            }
            else {
                let messageCopy = Data.copy(message);
                let methodName = `onChild${messageCopy.name}`;
                messageCopy.name = methodName.substring(2);

                if (methodName in this) {
                    let childProcess = messageCopy.childProcess;
                    delete messageCopy.childProcess;
                    this[methodName](childProcess, messageCopy);
                }
                else {
                    this.emit(message);
                }
            }
        }
    }

    onChildSpawn(childProcess, message) {
        childProcess.sendChild({ name: '#SPAWNED' });
        message.childProcess = childProcess;
        this.emit(message);
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

    onParentAbort(message) {
        this.abort();
    }

    onParentEnd(message) {
        this.exit(message.code ? message.code : 9999);
    }

    async onParentMessage(encoded, sendHandle) {
        let message = fromJson(encoded.json);

        if (!this.routeDown(message, sendHandle)) {
            sendHandle ? message.sendHandle = sendHandle : null;

            if ('#RESULT' in message) {
                let trapId = message['#TRAP'];
                let result = message['#RESULT'];
                delete message['#TRAP'];
                delete message['#RESULT'];
                Trap.handleReply(trapId, result);
            }
            else if ('#CALL' in message) {
                let trapId = message['#TRAP'];
                message['#RESULT'] = await this.call(message);
                message['#TRAP'] = trapId;
                delete message['#CALL'];
                this.sendParent(message);
            }
            else {
                let methodName = `onParent${message.name}`;

                if (methodName in this) {
                    this[methodName](message);
                }
                else {
                    this.emit(message);
                }
            }
        }
    }

    onParentPause(message) {
        this.emit(message);
    }

    onParentResume(message) {
        this.emit(message);
    }

    onParentShutdown(message) {
        this.exit(message.code ? message.code : 9999);
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
        if (this.handles('UnhandledRejection')) {
            this.emit({
                name: 'UncaughtException',
                process: this,
                exception: e,
                origin: origin,
            });
        }
        else {
            log(e);
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
        if (this.handles('UnhandledRejection')) {
            this.emit({
                name: 'UnhandledRejection',
                process: this,
                reason: reason,
                promise: promise,
            });
        }
        else {
            log(reason);
        }
    }

    onWarning(warning) {
        this.emit({
            name: 'Warning',
            process: this,
            warning: warning,
        });
    }

    routeDown(message, sendHandle) {
        if ('#ROUTING' in message) {
            let routing = message['#ROUTING'];

            if (routing.type == 'NodeClass') {
                if (routing.nodeClass == this.getNodeClass()) {
                    delete message['#ROUTING'];
                    return false;
                }
                else {
                    this.routeDownRelay(message, sendHandle);
                    return true;
                }
            }
            else if (routing.type == 'Pid') {
                if (routing.nodePid == this.getPid()) {
                    delete message['#ROUTING'];
                    return false;
                }
                else {
                    this.routeDownRelay(message, sendHandle);
                    return true;
                }
            }
        }

        return false;
    }

    routeDownRelay(message, sendHandle) {
        for (let childProcess of this) {
            childProcess.sendChild(message, sendHandfe);
        }
    }

    routeUp(message) {
        if ('#ROUTING' in message) {
            let routing = message['#ROUTING'];

            if (routing.type == 'NodeClass') {
                if (routing.nodeClass == this.getNodeClass()) {
                    delete message['#ROUTING'];
                    return false;
                }
                else {
                    this.routeUpRelay(message);
                    return true;
                }
            }
            else if (routing.type == 'Pid') {
                if (routing.nodePid == this.getPid()) {
                    delete message['#ROUTING'];
                    return false;
                }
                else {
                    this.routeUpRelay(message);
                    return true;
                }
            }
        }

        return false;
    }

    routeUpRelay(message) {
        let sendHandle = message.sendHandle;
        delete message.sendHandle;
        delete message.childProcess;
        this.sendParent(message, sendHandle);
    }

    sendChild(child, message, sendHandle) {
        if (child instanceof ChildProcess) {
            child.sendChild(message, sendHandle);
        }
        else if (typeof child == 'number') {
            if (child in this.children) {
                this.children[child].sendChild(message, sendHandle);
            }
        }

        return this;
    }

    sendChildren(message, sendHandle) {
        for (let childProcess of this) {
            childProcess.sendChild(message, sendHandle);
        }

        return this;
    }

    sendController(message, sendHandle) {
        if (this.getNodeClass() == this.nodeClassController) {
            this.emit(message, sendHandle);
        }
        else {
            message['#ROUTING'] = {
                type: 'NodeClass',
                nodeClass: this.nodeClassController,
            };
        
            return this.sendParent(message, sendHandle);
        }
    }

    sendParent(message, sendHandle) {
        LibProcess.send(
            { json: toJson(message) },
            sendHandle,
        );

        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.children)[Symbol.iterator]();
    }
});


/*****
 * Radius processes are grouped and typed using a "ClassName".  The ClassName
 * can be used for controlling source code execution using the functions shown
 * below.  In this manner, a process's ClassName can be used to avoid loading
 * all code except for the code that's relevant to that process's features and
 * functionality.
*****/
register('', async function execIn(nodeClass, func) {
    if (Array.isArray(nodeClass)) {
        if (nodeClass.filter(nodeClass => nodeClass == Process.getNodeClass()).length) {
            await func();
        }
    }
    else if (typeof nodeClass == 'string') {
        if (nodeClass == Process.getNodeClass()) {
            await func();
        }
    }
});

register('', function registerIn(nodeClass, ns, arg) {
    if (Array.isArray(nodeClass)) {
        if (nodeClass.filter(nodeClassName => nodeClassName == Process.getNodeClass()).length) {
            register(ns, arg);
        }
    }
    else if (typeof nodeClass == 'string') {
        if (nodeClass == Process.getNodeClass()) {
            register(ns, arg);
        }
    }
});

register('', async function singletonIn(nodeClass, ns, arg, ...args) {
    if (Array.isArray(nodeClass)) {
        if (nodeClass.filter(nodeClassName => nodeClassName == Process.getNodeClass()).length) {
            singleton(ns, arg, ...args);
        }
    }
    else if (typeof nodeClass == 'string') {
        if (nodeClass == Process.getNodeClass()) {
            singleton(ns, arg, ...args);
        }
    }
});