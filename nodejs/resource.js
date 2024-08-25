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
 * Here are some constants that are useful throughout all of the process nodes.
 * These regular pings is how we control the lifetime of MonitorThunks
 * and ResourceThunks in the controller process.
*****/
const resourcesPingMonitorInterval = 15000;
const resourcesPingMonitorLifetime = 30000;
const resourcesPingResourceInterval = 15000;
const resourcesPingResourceLifetime = 30000;


/*****
 * This is the singleton object resident in the controller process who job is
 * to manage and monitor resource objects that comply with the ResourceThunk
 * specification.  In effect, it's a connector for resources and monitors that
 * are observing / monitoring the activity of those resources.  The overall
 * feature set is quite complex.  This singleton provides a simple API and addr
 * for all processes and monitors to communicate with one another.  This object
 * controls that communication!
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
        if (message.traceUUID in this.traces) {
            this.traces[message.traceUUID].delete();
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
            monitored = mkResourceThunk(category, message.resourceUUID, message.resourceRouting);
        }

        let monitor = mkMonitorThunk(
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
            let traceMessage = Data.clone(message);

            for (let trace of category.getTraces()) {
                trace.getMonitor().send(traceMessage);
            }

            mkResourceThunk(
                category,
                message.resourceUUID,
                message['#ROUTING'],
            );
        }
        else if (message.eventName == 'Deregister') {
            if (message.category in this.categories) {
                let category = mkResourceCategory(message.category);
                let traceMessage = Data.clone(message);
    
                for (let trace of category.getTraces()) {
                    trace.getMonitor().send(traceMessage);
                }
    
                if (message.resourceUUID in this.resources) {
                    let resource = mkResourceThunk(message.resourceUUID);
                    resource.delete();
                }
            }
        }
        else if (message.eventName == 'PingResource') {
            if (message.resourceUUID in this.resources) {
                this.resources[message.resourceUUID].onPing();
            }
        }
        else if (message.eventName == 'PingMonitor') {
            if (message.monitorUUID in this.monitors) {
                this.monitors[message.monitorUUID].onPing();
            }
        }
        else {
            let resourceThunk = mkResourceThunk(message.resourceUUID);
            let traceMessage = Data.clone(message);

            for (let trace of resourceThunk.getTraces()) {
                traceMessage.traceUUID = trace.getUUID();
                trace.getMonitor().send(traceMessage);
            }
        }
    }
});


/*****
 * TODO ********************************************************************
 * TODO ********************************************************************
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
 * The ResourceThunk is the proxy or thunk for controlling and communicationg
 * with the actual remote (other process) ResourceBase object.  A resource bade
 * is an object that can be tracked, traced, and remotely controlled. The first
 * example is the framework based Websocket class.  One of several features
 * provided by the ResourceThunk is the ability to send a message remotely via
 * the websocket to a browser.
*****/
registerIn(Process.nodeClassController, '', class ResourceThunk {
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
            this.onPing();
            return this;
        }
    }

    delete() {
        delete Resources.resources[this.uuid];
        delete this.category.resources[this.uuid];

        for (let trace of Object.values(this.traces)) {
            delete Resources.traces[trace.uuid];
            delete trace.monitor.traces[trace.uuid];
        }
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

    onPing() {
        this.timeout ? clearTimeout(this.timeout) : null;

        this.timeout = setTimeout(() => {
            this.delete();
        }, resourcesPingResourceLifetime);
    }
});


/*****
*****/
registerIn(Process.nodeClassController, '', class MonitorThunk {
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
        // TODO *************************************************
        console.log(`##### delete ${Reflect.getPrototypeOf(this).constructor.name}`);
        // TODO *************************************************
        for (let trace of Object.values(this.traces)) {
            trace.delete();
        }
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
 * A ResourceTrace object is a management object that's only resident in the
 * controller process.  It's the intersetion of a MonitorThunk and Resousource
 * Thunk and represents the data and methods required to manage and execute a
 * resource trace.
*****/
registerIn(Process.nodeClassController, '', class ResourceTrace {
    constructor(monitor, monitored) {
        this.uuid = Crypto.generateUUID();
        this.monitor = monitor;
        this.monitored = monitored;
        Resources.traces[this.uuid] = this;
        this.monitor.traces[this.uuid] = this;
        this.monitored.traces[this.uuid] = this;

        if (this.monitored instanceof ResourceThunk) {
            Process.sendDescendent({
                name: this.monitored.getUUID(),
                eventName: 'StartMonitoring',
                '#ROUTING': this.monitored.getRouting(),
            });
        }
    }

    delete() {
        if (this.monitored instanceof ResourceThunk) {
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
        else if (monitored instanceof ResourceThunk) {
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
        return monitored instanceof ResourceThunk;
    }
});


/*****
 * The is the base class for resource objects created on the server.  A resource
 * object is what's being monitored and controlled by this infrastructure.  Note
 * that resource objects may created and managed in any of the server processes.
 * To be a resource, the developer needs to adhere to these four steps to ensure
 * compliance and proper functionality:
 * 
 * (1)  The resource class extends Resource.
 * 
 * (2)  The resource class calls super.onClose(code, reason) when the resource
 *      object is being closed and/or disposed of.
 * 
 * (3)  When activity in the resource occurs, the subclassed object needs to
 *      invoke the sendEvent(name, properties) method to report activity to the
 *      Resources singleton in the controller processes.  Note that the super
 *      class, Resource, ignores sendEvent() calls if no one is listening.
 * 
 * (4)  To enable your resource class to be controlled via onControl messages,
 *      override the super class's onExecCommand() method to provide functionality.
 *      For instance, in the case of a websocket, this means that the coller
 *      from another process is able to send messages / data to another process's
 *      websocket client (browser).
*****/
register('', class ResourceBase extends Emitter {
    constructor(category) {
        super();
        this.category = category;
        this.uuid = Crypto.generateUUID();
        Process.on(this.uuid, message => this.onControl(message));
        this.sendEvent('Register');
        this.monitoring = 0;

        this.interval = setInterval(
            () => this.sendEvent('PingResource', { uuid: this.uuid }),
            resourcesPingResourceInterval,
        );
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
        this.interval ? clearInterval(this.interval) : null;
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
 * ResourceMonitor is the base class for an object that wishes to monitor and
 * report on application server resources.  A monitor may appear in any application
 * process and wil communicate with resources via the singleton Resources object
 * resident in the controller process.  The ResourceMonitor provides the features
 * necessary to monitor the registration, degregistration, and other activity of
 * resource objects throughout the system.  To use these features, extend the
 * ResourceMonitor class and provide additional features to the subclassed monitor
 * object.
*****/
register('', class MonitorBase extends Emitter {
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

    onClose() {
        // TODO ****************************************************
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