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
 * A service resides in the primary process and provides a service to the primary
 * process and all workers vis-a-vis an extension of the Handle class.  Services
 * are there aggregate global features or functionality that may not be performed
 * in each of the individual processes.  A service is required when resources are
 * employed by the service or computational constraints demand that implemented
 * of an algorithm must be centralized and managed.  All services are singletons.
*****/
define(class Service {
    static services = {};
    static remoteHosts = {};

    static {
        Process.on('*', async message => {
            if (message.name.indexOf('#..-..#') > -1) {
                let [ serviceName, messageName] = TextUtils.split(message.name, '#..-..#');

                if (serviceName in Service.services) {
                    let service = Service.services[serviceName];
                    let methodName = `on${messageName[0].toUpperCase()}${messageName.substring(1)}`;

                    if (typeof service[methodName] == 'function') {
                        if (this.serviceClassName in Service.remoteHosts) {
                            let remoteHost = Service.remoteHosts[this.serviceClassName];
                            // *****************************************************************************
                            // *****************************************************************************
                            // ** remote host call
                            // *****************************************************************************
                            // *****************************************************************************
                        }
                        else {
                            while (true) {
                                try {
                                    let response = service[methodName](message);
                                    return response;
                                }
                                catch (e) {
                                    return mkFailure(e);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    constructor() {
        this.ctor = Reflect.getPrototypeOf(this).constructor;
        this.namespace = this.ctor['#namespace'];

        if (!this.ctor.name.endsWith('Service')) {
            throwError(`Service "${this.ctor.name}" classname does NOT end with "Service"`);
        }

        this.serviceClassName = this.ctor.name;
        this.serviceName = this.ctor.name.substring(0, this.ctor.name.length - 'Service'.length);
        Service.services[this.serviceClassName] = this;
    }

    async callHandle(workerId, values) {
        let caller = getCaller().functionName;
        let request = caller.substring(2);
        let message = values;
        message.name = `${this.serviceName}Handle${request}`;
        return await Process.callProcess(workerId, message);
    }

    static clearRemoteHost(serviceClassName) {
        delete Service.remoteHosts[serviceClassName];
    }

    static clearRemoteHosts() {
        Service.remoteHosts = {};
    }

    async init() {
        return this;
    }

    getClassName() {
        return this.ctor.name;
    }

    getNamespace() {
        return this.namespace;
    }

    static getRemoteHost(serviceClassName) {
        return Service.remoteHosts[serviceClassName];
    }

    static getService(serviceClass) {
        if (Process.isPrimary()) {
            if (typeof serviceClass == 'function') {
                if (Data.classExtends(serviceClass, Service)) {
                    return Service.services[serviceClass.name];
                }
            }
        }
    }

    getServiceName() {
        return this.serviceName;
    }

    sendHandle(workerId, values) {
        let caller = getCaller().functionName;
        let request = caller.substring(2);
        let message = values;
        message.name = `${this.serviceName}Handle${request}`;
        Process.sendProcess(workerId, message);
    }

    static setRemoteHoss(serviceClassName, remoteHost) {
        Service.remoteHosts[serviceClassName] = remoteHost;
    }
});


/*****
 * To construct a service, call the service function with a single parameter,
 * which is a class that extends Service.  If you want to specify a namespace
 * as well, construct an instance and pass two parameters, the namespace instance
 * and the service class definition.
*****/
define(async function createService(...args) {
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

        if (Data.extends(clss, Service)) {
            if (!(clss.name in Service.services)) {
                let service = new clss();
                await service.init();
                return service;
            }
        }
    }
});


/*****
 * A handle is the base class for objects that are used for connecting with and
 * fetching appliation services.  The extension is for example ThunkHandle.  The
 * handle classes are created as instances (NOT SINGLETONS) and communicate with
 * the primary process regardless of the process in which the handle was created.
*****/
define(class Handle {
    constructor() {
        this.ctor = Reflect.getPrototypeOf(this).constructor;

        if (!this.ctor.name.endsWith('Handle')) {
            throwError(`Handle "${this.ctor.name}" classname does NOT end with "Handle"`);
        }

        this.handleClassName = this.ctor.name;
        this.serviceName = this.ctor.name.substring(0, this.ctor.name.length - 'Handle'.length);
        this.returnFailures = false;
    }

    async callService(values) {
        let caller = getCaller().functionName;
        let request = `${caller[0].toUpperCase()}${caller.substring(1)}`;
        let message = values;
        message.name = `${this.serviceName}Service#..-..#${request}`;
        message.workerId = Process.getWorkerId();
        return await Process.callPrimary(message);
    }

    getHandleClassName() {
        return this.handleClassName;
        return `${this.handleClassName}Service`;
    }

    getServiceName() {
        return this.serviceName;
    }

    sendService(values) {
        let caller = getCaller().functionName;
        let request = `${caller[0].toUpperCase()}${caller.substring(1)}`;
        let message = values;
        message.name = `${this.serviceName}Service#..-..#${request}`;
        message.workerId = Process.getWorkerId();
        Process.sendPrimary(message);
    }

    setReturnFailures() {
        this.returnFailures = true;
        return this;
    }
});
