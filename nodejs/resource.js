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
*****/
singletonIn(Process.nodeClassController, '', class Resources {
    constructor() {
        this.traces = {};
        this.monitors = {};
        this.resources = {};
        this.categories = {};
        mkHandlerProxy(Process, 'Resources', this);
    }

    async onClearTrace(message) {
    }

    async onControl(message) {
    }

    async onSetTrace(message) {
        let category = mkResourceCategory(message.category);
        let resource = mkResourceObject(category);

        let monitor = mkResourceMonitorThunk(
            message.monitorUUID,
            message['#ROUTING'] ? message['#ROUTING'] : [],
        );

        mkResourceTrace(monitor, resource);
    }

    async onTrace(message) {
        if (message.eventName == 'Register') {
            if (message.category in this.categories) {
                let category = mkResourceCategory(message.category);

                for (let trace of category.getTraces()) {
                    if (trace.getResourceUUID() == '*') {
                        trace.getMonitor().send({
                            category: message.category,
                            eventName: message.eventName,
                            resourceUUID: message.resourceUUID,
                        });
                    }
                }
            }
        }
        else if (message.eventName == 'Deregister') {
            if (message.category in this.categories) {
                let category = mkResourceCategory(message.category);

                for (let trace of category.getTraces()) {
                    if (trace.getResourceUUID() == '*') {
                        trace.getMonitor().send({
                            category: message.category,
                            eventName: message.eventName,
                            resourceUUID: message.resourceUUID,
                        });
                    }
                }
            }

        }
        else {
            // ******************************************************
        }
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceCategory {
    constructor(name) {
        if (name in Resources.categories) {
            return Resources.categories[name];
        }
        else {
            this.name = name;
            this.traces = {};
            this.monitors = {};
            this.resources = {};
            Resources.categories[this.name] = this;
            return this;
        }
    }

    getMonitor(uuid) {
        return this.monitors[uuid];
    }

    getMonitor() {
        return Object.values(this.monitors);
    }

    getName() {
        return this.name;
    }

    getResource(uuid) {
        if (uuid) {
            return this.resources[uuid];
        }
        else {
            return this.resources['*'];
        }
    }

    getResources() {
        return Object.values(this.resources);
    }

    getTrace(uuid) {
        return this.traces[uuid];
    }

    getTraces() {
        return Object.values(this.traces);
    }

    hasMonitor(uuid) {
        return uuid in this.monitors;
    }

    hasResource(uuid) {
        if (uuid) {
            return uuid in this.resources;
        }
        else {
            return '' in this.resources;
        }
    }

    hasTrace(uuid) {
        return uuid in this.traces;
    }

    [Symbol.iterator]() {
        return Object.values(this.resources)[Symbol.iterator]();
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceObject {
    constructor(category, route, uuid) {
        if (uuid in category.resources) {
            return category.resources[uuid];
        }
        else {
            this.category = category;
            this.route = route ? route : [];
            this.uuid = typeof uuid == 'string' ? uuid : '*';
            this.traces = {};
            this.category.resources[this.uuid] = this;
            Resources.resources[this.uuid] = this;
            return this;
        }
    }

    getCategory() {
        return this.category;
    }

    getTrace(uuid) {
        // TODO *************************************************
    }

    getTraces() {
        return Object.values(this.traces);
    }

    getRoute() {
        return this.route;
    }

    getUUID() {
        return this.uuid;
    }

    hasTrace(uuid) {
        // TODO *************************************************
    }

    hasTraces() {
        // TODO *************************************************
    }

    [Symbol.iterator]() {
        return Object.values(this.traces)[Symbol.iterator]();
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceMonitorThunk {
    constructor(uuid, route) {
        if (uuid in Resources.monitors) {
            return Resources.monitor[uuid];
        }
        else {
            this.traces = {};
            this.uuid = uuid;
            this.route = route;
        }
    }

    clearTrace(resource, eventName) {
        // TODO *************************************************
    }

    getRoute() {
        return this.route;
    }

    getTrace(uuid) {
        // TODO *************************************************
    }

    getTraces() {
        return Object.values(this.traces);
    }

    getUUID() {
        return this.monitorUUID;
    }

    hasTrace(uuid) {
        // TODO *************************************************
    }

    hasTraces() {
        // TODO *************************************************
    }

    send(obj) {
    }

    send(message) {
        message.name = this.uuid;

        if (this.route.length) {
            message['#ROUTING'] = this.route;
            Process.sendDown(message);
        }
        else {
            Process.emit(message);
        }
    }

    [Symbol.iterator]() {
        return Object.values(this.traces)[Symbol.iterator]();
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceTrace {
    constructor(monitor, resource) {
        this.monitor = monitor;
        this.resource = resource;
        this.uuid = Crypto.generateUUID();
        Resources.traces[this.uuid] = this;
        this.monitor.traces[this.uuid] = this;
        this.resource.traces[this.uuid] = this;
        this.resource.category.traces[this.uuid] = this;
    }

    delete() {
        // TODO *************************************************
    }

    getMonitor() {
        return this.monitor;
    }

    getMonitorUUID() {
        return this.monitor.uuid;
    }

    getResource() {
        return this.resource;
    }

    getResourceUUID() {
        return this.resource.uuid;
    }

    getUUID() {
        return this.uuid;
    }
});


/*****
*****/
register('', class Resource extends Emitter {
    constructor(category) {
        super();
        this.category = category;
        this.uuid = Crypto.generateUUID();
        Process.on(this.uuid, message => this.handleResourceMessage(message));
        
        Process.sendController({
            name: 'ResourcesTrace',
            category: this.category,
            eventName: 'Register',
            resourceUUID: this.uuid,
        });
    }

    getCategory() {
        return this.category;
    }

    getUUID() {
        return this.uuid;
    }

    async handleResourceMessage(message) {
        console.log('******** RESOURCE MESSAGE');
    }

    onClose(code, reason) {
        typeof code == 'undefined' ? code = 0 : null;
        typeof reason == 'undefined' ? reason = '' : null;

        Process.sendController({
            name: 'ResourcesTrace',
            category: this.category,
            eventName: 'Deregister',
            resourceUUID: this.uuid,
            code: code,
            reason: reason,
        });
    }
});


/*****
*****/
register('', class ResourceMonitor extends Emitter {
    constructor() {
        super();
        this.resources = {};
        this.uuid = Crypto.generateUUID();
        Process.on(this.uuid, message => this.handleTrace(message));
    }

    clearTrace(category, resourceUUID) {
        // TODO *************************************************
    }

    async handleTrace(message) {
        let methodName = `on${message.eventName}`;

        if (typeof this[methodName] == 'function') {
            if (!(await this[methodName](message))) {
                return;
            }
        }
        
        message.monitorUUID = this.uuid;
        message.name = message.eventName;
        this.emit(message);
    }

    setTrace(category, resourceUUID) {
        resourceUUID ? null : resourceUUID = '*';
        let key = `${category}-${resourceUUID}`;

        if (!(key in this.resources)) {
            this.resources[key] = {
                category: category,
                uuid: resourceUUID,
            };
        }

        Process.sendController({
            name: 'ResourcesSetTrace',
            category: category,
            resourceUUID: resourceUUID,
            monitorUUID: this.uuid,
        });
    }
});