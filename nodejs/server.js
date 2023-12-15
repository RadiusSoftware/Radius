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
import * as LibNet from 'net'
import * as LibProcess from 'process'


/*****
 * The Server base class for the PRIMARY process.  In essence, this server
 * primary is responseible for managing its workers.  Extensions specific to
 * interprocess communications, IPC, are provided to filter and respond to
 * messages routed specifically to this server instance.  Remember, that all
 * instances of all started servers types execute in the server's single
 * primary process.  That's why message routing ia automatically applied.
 * Server also serves as base class for extensions to the base server class.
 * For instance, HttpServer extends Server to provide necessary features for
 * launching an instance of an HttpServer.  Note that multiple instances of
 * Server may be launched and reside, of course, together wihtin the server's
 * primary process.
*****
/*
registerPrimary('', class Server {
    static servers = (() => {
        Cluster.on('disconnect', (...args) => Server.handleClusterEvent('disconnect', ...args));
        Cluster.on('exit', (...args) => Server.handleClusterEvent('exit', ...args));
        Cluster.on('fork', (...args) => Server.handleClusterEvent('fork', ...args));
        Cluster.on('listening', (...args) => Server.handleClusterEvent('listening', ...args));
        Cluster.on('online', (...args) => Server.handleClusterEvent('online', ...args));
        return new Object();
    })();

    constructor(opts) {
        this.workers = {};
        this.started = false;
        this.pid = Process.pid;
        this.serverClass = Reflect.getPrototypeOf(this).constructor.name;
        Object.assign(this, opts);
        this.route = `#${this.serverClass}#${Object.keys(Server.servers).length + 1}`;
        Server.servers[this.route] = this;
    }

    getPid() {
        return this.pid;
    }

    getPrimaryPid() {
        return this.pid;
    }

    getRoute() {
        return this.route;
    }

    getServerClass() {
        return this.serverClass;
    }

    static async handleClusterEvent(eventName, ...args) {
        let worker = args[0];
        let primaryRoute = await Ipc.queryWorker(worker, { name: '#GetPrimaryRoute' });

        if (primaryRoute && primaryRoute in Server.servers) {
            let server = Server.servers[primaryRoute];
            let handlerName = `handleWorker${eventName[0].toUpperCase()}${eventName.substr(1)}`;
            
            if (typeof server[handlerName] == 'function') {
                await server[handlerName](...args);
            }
        }
    }

    async handleWorkerExit(worker, code, signal) {
        if (this.autoRestart === true) {
            if (code != 0) {
                return await this.startWorker();
            }
        }
    }

    off(name, handler) {
        Ipc.on(name, handler, message => message.route == this.route);
        return this;
    }

    on(name, handler) {
        Ipc.on(name, handler, message => message.route == this.route);
        return this;
    }

    once(name, handler) {
        Ipc.once(name, handler, message => message.route == this.route);
        return this;
    }

    async restartWorkers() {
        if (this.started) {
            await this.sendWorkers({ name: '#Restart' });
        }

        return this;
    }
    
    queryWorker(worker, message) {
        message.route = this.route;
        return Ipc.queryWorker(worker, message);
    }

    queryWorkers(message) {
        message.route = this.route;
        return Ipc.queryWorkers(message);
    }

    sendWorker(worker, value) {
        if (typeof value == 'string') {
            message.route = this.route;
            return Ipc.sendWorker(worker, message);
        }
        else if (value instanceof Net.Socket) {
            console.log(worker);
            worker.send('socket', value);
        }
    }

    sendWorkers(message) {
        message.route = this.route;
        return Ipc.sendWorkers(message);
    }

    startWorkers() {
        if (!this.started) {
            for (let i = 0; i < this.workerCount; i++) {
                let worker = Cluster.fork({
                    '#ServerOpts': toJson({
                        primaryPid: this.pid,
                        serverClass: this.serverClass,
                        primaryRoute: this.route,
                    })
                });

                this.workers[worker.id] = worker;
            }

            this.started = true;
        }

        return this;
    }

    startWorker() {
        return Cluster.fork({
            '#ServerOpts': toJson({
                primaryPid: this.pid,
                serverClass: this.serverClass,
                primaryRoute: this.route,
            })
        });

        return null;
    }

    async stopWorkers() {
        if (this.started) {
            await this.sendWorkers({ name: '#Stop' });
            this.started = false;
        }

        return this;
    }
});
*/


/*****
 * The server base class for WORKER processes.  In the standard server model,
 * Server in the primary process forks off workers as required by the application
 * server.  Each forked child process is responsible for executing a single
 * instance of an object that extends a Server worker.  Server primaries will
 * generally, but not always, listen and accept connections from remote hosts.
 * The Server primary will then find an idle worker and pass the socket to that
 * worker to perform whatever processing is required.  This Server worker class
 * does not provide the socket managerment features just described, whic are
 * defined in servers/socketServer.js.  This class defines the bare minimum of
 * control and communcations features required to deal with the server model.
*****/
/*
registerWorker('', class Server {
    constructor(opts) {
        this.pid = Process.pid;
        this.serverClass = Reflect.getPrototypeOf(this).constructor.name;
        Object.assign(this, opts);

        this.on('#Restart', message => this.handleRetart(message));
        this.on('#Start', message => this.handleStart(message));
        this.on('#Stop', message => this.handleStop(message));

        Ipc.on('#GetPrimaryRoute', message => {
            Message.reply(message, this.primaryRoute);
        });
    }

    getPid() {
        return this.pid;
    }

    getPrimaryPid() {
        return this.pid;
    }

    getRoute() {
        return this.primaryRoute;
    }

    getServerClass() {
        return this.serverClass;
    }

    getWorkerId() {
        return Cluster.worker.id;
    }

    async handleRestart(message) {
        if (typeof this.restart == 'function') {
            await this.restart();
        }
    }

    async handleStart(message) {
        if (typeof this.start == 'function') {
            await this.start();
        }
    }

    async handleStop(message) {
        if (typeof this.stop == 'function') {
            await this.stop();
        }
        else {
            Process.exit(0);
        }
    }

    off(name, handler) {
        Ipc.on(name, handler, message => message.route == this.getRoute());
        return this;
    }

    on(name, handler) {
        Ipc.on(name, handler, message => message.route == this.getRoute());
        return this;
    }

    once(name, handler) {
        Ipc.once(name, handler, message => message.route == this.getRoute());
        return this;
    }

    async query(message) {
        message.route = this.primaryRoute;
        return Ipc.queryPrimary(message);
    }

    send(message) {
        message.route = this.primaryRoute;
        return Ipc.sendPrimary(message);
    }

    async shutdown() {
    }
});
*/
