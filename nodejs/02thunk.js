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
 * A thunk provides a convenient API for calling functions and performing operations
 * on the localhost or a remote host.  Some thunks will execute locally while
 * others will be redirected via a web-service call to another host in the cluster
 * if so configured.  The user/caller of the Thunk does not need to worry whether
 * the calls are executed locally or remotely.  Unlike services, Thunk calls are
 * executed in the worker class in both the caller and handler hosts.
*****/
define(class Thunk {
    static remoteHosts = {};

    constructor() {
        this.ctor = Reflect.getPrototypeOf(this).constructor;
        this.namespace = this.ctor['#namespace'];

        if (!this.ctor.name.endsWith('Thunk')) {
            throwError(`Thunk "${this.ctor.name}" classname does NOT end with "Thunk"`);
        }

        this.thunkClassName = this.ctor.name;
        this.thunkName = this.ctor.name.substring(0, this.ctor.name.length - 'Thunk'.length);
        let prototype = Reflect.getPrototypeOf(this);
        this.objekt = mkObjekt();

        for (let propertyName of Reflect.ownKeys(prototype)) {
            if (propertyName != 'constructor') {
                if (typeof this[propertyName] == 'function') {
                    let thunk = this;
                    this.objekt[propertyName] = async (...args) => thunk.call(propertyName, ...args);
                }
            }
        }

        return this.objekt;
    }

    async call(methodName, ...args) {
        if (this.thunkClassName in Thunk.remoteHosts) {
            let remoteHostName = Thunk.remoteHosts[this.thunkClassName];
            // *********************************************************************************
            // REMOTE HOST CALL *********************************************************
            // this requires webservices and API support!
            // *********************************************************************************
        }
        else {
            let response = await this[methodName](...args);
            return response;
        }
    }

    static clearRemoteHost(thunkClassName) {
        delete Thunk.remoteHosts[thunkClassName];
    }

    static clearRemoteHosts() {
        Thunk.remoteHosts = {};
    }

    getClassName() {
        return this.ctor.name;
    }

    getNamespace() {
        return this.namespace;
    }

    static getRemoteHost(thunkClassName) {
        return Thunk.remoteHosts[thunkClassName];
    }

    getThunkName() {
        return this.thunkName;
    }

    static setRemoteHost(thunkClassName, remoteHost) {
        Thunk.remoteHosts[thunkClassName] = remoteHost;
    }
});