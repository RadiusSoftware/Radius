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

    mkTraceMessage(message) {
        let traceMessage = { name: '' };

        for (let key in message) {
            if (!(key in { name:0 })) {
                traceMessage[key] = message[key];
            }
        }

        return traceMessage;
    }

    async onClearTrace(message) {
        if (message.traceUUID in this.traces) {
            let trace = this.traces[message.traceUUID];
            trace.delete();
        }
    }

    async onExecCommand(message) {
        // TODO *************************************************
    }

    async onSetTrace(message) {
        let monitored;
        let category = mkResourceCategory(message.category);
        
        if (message.resourceUUID == 'category') {
            monitored = category;
        }
        else {
            monitored = mkResourceObject(category, message.resourceUUID, message.resourceRouting);
        }

        let monitor = mkResourceMonitorThunk(
            message.monitorUUID,
            message['#ROUTING'],
        );

        let trace = mkResourceTrace(
            monitor,
            monitored,
        );

        return trace.getUUID();
    }

    async onTrace(message) {
        if (message.eventName == 'Register') {
            let category = mkResourceCategory(message.category);
            let traceMessage = this.mkTraceMessage(message);

            for (let trace of category.getTraces()) {
                trace.getMonitor().send(traceMessage);
            }

            mkResourceObject(
                category,
                message.resourceUUID,
                message['#ROUTING'],
            );
        }
        else if (message.eventName == 'Deregister') {
            let category = mkResourceCategory(message.category);
            let traceMessage = this.mkTraceMessage(message);

            for (let trace of category.getTraces()) {
                trace.getMonitor().send(traceMessage);
            }

            let resource = mkResourceObject(message.resourceUUID);
            resource.delete();
        }
        else {
            let resourceObject = mkResourceObject(message.resourceUUID);
            let traceMessage = this.mkTraceMessage(message);

            for (let trace of resourceObject.getTraces()) {
                traceMessage.traceUUID = trace.getUUID();
                trace.getMonitor().send(traceMessage);
            }
        }
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceCategory {
    constructor(categoryName) {
        if (categoryName in Resources.categories) {
            return Resources.categories[categoryName];
        }
        else {
            this.name = categoryName;
            this.resources = {};
            this.traces = {};
            Resources.categories[this.name] = this;
            return this;
        }
    }

    delete() {
        // TODO *************************************************
    }

    getName() {
        return this.name;
    }

    getResource(uuid) {
        return this.resources[uuid];
    }

    getResources() {
        return Object.values(this.resources);
    }

    getTraces() {
        return Object.values(this.traces);
    }

    hasResource(uuid) {
        return uuid in this.resources;
    }

    hasResources() {
        return Object.keys(this.resources).length > 0;
    }

    hasTrace(uuid) {
        return uuid in this.traces;
    }

    hasTraces() {
        return Object.keys(this.traces).length > 0;
    }

    [Symbol.iterator]() {
        return Object.values(this.resources)[Symbol.iterator]();
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceObject {
    constructor(...args) {
        if (args.length == 1) {
            return Resources.resources[args[0]];
        }
        else if (args[1] in Resources.resources) {
            return Resources.resources[args[1]];
        }
        else {
            this.category = args[0];
            this.uuid = args[1];
            this.routing = args[2] ? args[2] : null;
            this.traces = {};
            Resources.resources[this.uuid] = this;
            this.category.resources[this.uuid] = this;
            return this;
        }
    }

    delete() {
        for (let trace of Object.values(this.traces)) {
            trace.delete();
        }

        delete Resources.resources[this.uuid];
        delete this.category.resources[this.uuid];
    }

    getCategory() {
        return this.category;
    }

    getRouting() {
        return this.routing;
    }

    getTrace(uuid) {
        return this.traces[uuid];
    }

    getTraces() {
        return Object.values(this.traces);
    }

    getUUID() {
        return this.uuid;
    }

    hasTrace(uuid) {
        return uuid in this.traces;
    }

    hasTraces() {
        return Object.keys(this.traces).length > 0;
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceMonitorThunk {
    constructor(monitorUUID, routing) {
        if (monitorUUID in Resources.monitors) {
            return Resources.monitors[monitorUUID];
        }
        else {
            this.uuid = monitorUUID;
            this.routing = routing ? routing : null;
            this.traces = {};
            Resources.monitors[this.uuid] = this;
             return this;
        }
    }

    delete() {
        // TODO ***************************************************
    }

    getRouting() {
        return this.routing;
    }

    getTrace(uuid) {
        return this.traces[uuid];
    }

    getTraces() {
        return Object.values(this.traces);
    }

    getUUID() {
        return this.monitorUUID;
    }

    hasTrace(uuid) {
        return uuid in this.traces;
    }

    hasTraces() {
        return Object.keys(this.traces).length > 0;
    }

    send(message) {
        message.name = this.uuid;

        if (this.routing && this.routing.path.length) {
            message['#ROUTING'] = this.getRouting();
            Process.sendDown(message);
        }
        else {
            Process.emit(message);
        }
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class ResourceTrace {
    constructor(monitor, monitored) {
        this.uuid = Crypto.generateUUID();
        this.monitor = monitor;
        this.monitored = monitored;
        Resources.traces[this.uuid] = this;
        this.monitor.traces[this.uuid] = this;
        this.monitored.traces[this.uuid] = this;

        if (this.monitored instanceof ResourceObject) {
            Process.sendDescendent({
                name: this.monitored.getUUID(),
                eventName: 'StartMonitoring',
                '#ROUTING': this.monitored.getRouting(),
            });
        }
    }

    delete() {
        if (this.monitored instanceof ResourceObject) {
            Process.sendDescendent({
                name: this.monitored.getUUID(),
                eventName: 'StopMonitoring',
                '#ROUTING': this.monitored.getRouting(),
            });
        }

        delete Resources.traces[this.uuid];
        delete this.monitor.traces[this.uuid];
        delete this.monitored.traces[this.uuid];
    }

    getMonitor() {
        return this.monitor;
    }

    getMonitored() {
        return this.monitored;
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

    getType() {
        if (monitored instanceof Category) {
            return 'category';
        }
        else if (monitored instanceof ResourceObject) {
            return 'resource';
        }
    }

    getUUID() {
        return this.uuid;
    }

    isCategory() {
        return monitored instanceof Category;
    }

    isResource() {
        return monitored instanceof ResourceObject;
    }
});


/*****
*****/
register('', class Resource extends Emitter {
    constructor(category) {
        super();
        this.category = category;
        this.uuid = Crypto.generateUUID();
        Process.on(this.uuid, message => this.onControl(message));
        this.sendEvent('Register');
        this.monitoring = 0;
    }

    clearMonitoring() {
        this.monitoring > 0 ? this.monitoring-- : null;
        return this;
    }

    getCategory() {
        return this.category;
    }

    getUUID() {
        return this.uuid;
    }

    isMonitoring() {
        return this.monitoring > 0;
    }

    onClose(code, reason) {
        typeof code == 'undefined' ? code = 0 : null;
        typeof reason == 'undefined' ? reason = '' : null;

        this.sendEvent(
            'Deregister',
            {
                code: code,
                reason: reason,
            }
        );
    }

    async onControl(message) {
        if (message.eventName == 'StartMonitoring') {
            this.monitoring++;
        }
        else if (message.eventName == 'StopMonitoring') {
            this.monitoring > 0 ? this.monitoring-- : 0;
        }
        else {
            this.onExecCommand(message);
        }
    }

    async onExecCommand(message) {
    }

    sendEvent(eventName, properties) {
        if (this.monitoring || eventName in { 'Register':0, 'Deregister':0 }) {
            console.log(`\n ****************************** ${eventName}\n`)
            let message = {
                name: 'ResourcesTrace',
                category: this.category,
                eventName: eventName,
                resourceUUID: this.uuid,
            };

            if (typeof properties == 'object') {
                for (let key in properties) {
                    if (!(key in message)) {
                        message[key] = properties[key];
                    }
                }
            }

            Process.sendController(message);
        }
    }

    setMonitoring() {
        this.monitoring = true;
        return this;
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

    async clearTrace(traceUUID) {
        Process.sendController({
            name: 'ResourcesClearTrace',
            traceUUID: traceUUID,
        });

        return this;
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

    async setTrace(category, resourceUUID, resourceRouting) {
        resourceUUID ? null : resourceUUID = 'category';
        let key = `${category}-${resourceUUID}`;

        if (!(key in this.resources)) {
            let traceUUID = await Process.callController({
                name: 'ResourcesSetTrace',
                category: category,
                resourceUUID: resourceUUID,
                resourceRouting: resourceRouting,
                monitorUUID: this.uuid,
            });

            this.resources[key] = traceUUID;
        }

        return this;
    }
    
    async listCategories() {
        // TODO ****************************************************
    }
    
    async listResources(category) {
        // TODO ****************************************************
    }
    
    async listStats(category) {
        // TODO ****************************************************
    }
});