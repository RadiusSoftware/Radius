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
 * An ApiEndpoint defines a "function" that can be called by a remote API object.
 * The endpoint represents a function that's managed by the endpoint and by the
 * API object itself.  ApiEndpoints will not propagate errors, which are caught
 * by the endpoint itself when the endpoint function is called.
*****/
define(class ApiEndpoint {
    constructor(api, name, method, args, permissionSet) {
        this.api = api;
        this.name = name;
        this.method = method;
        this.args = args;
        this.permissionSet = permissionSet;
    }

    async call(options) {
        let trx = mkTransaction({
            name: this.name,
            method: this.method,
            ishttp: options.ishttp,
            httpReq: options.httpReq,
            httpRsp: options.httpRsp,
            session: options.session,
        });

        try {
            let validation = this.validateArguments(...options.message.args);

            if (validation === true) {
                await trx.session.touch();
                let args = [trx].concat(options.message.args);
                let response = await wait(Reflect.apply(this.method, this.api.container, args));
                await trx.finalize();
                return response;
            }
            else {
                return {
                    status: 'invalid',
                    failure: 'Invalid argument shape.',
                }
            }
        }
        catch (e) {
            return {
                status: 'error',
                error: e,
            }
        }
    }

    getArgCount() {
        return this.args.length;
    }

    getArgNames() {
        return Object.keys(this.args);
    }

    getArgShape(name) {
        return this.args[name];
    }

    getMethod() {
        return this.method;
    }

    getName() {
        return this.name;
    }

    getPermissionSet() {
        return this.permissionSet;
    }

    validateArguments(...args) {
        if (args.length != Object.keys(this.args).length) {
            return false;
        }

        for (let i = 0; i < this.args.length; i++) {
            let arg = args[i];
            let shape = this.args[i].shape;

            if (!shape.validate(arg)) {
                return false;
            }
        }

        return true;
    }
});


/*****
 * The Api itself is essentially a collection of ApiEndpoints that are managed
 * by the Api container.  The Api is responsible for handling messages from a
 * caller, interpreting those messages, checking permissions and then responding
 * to the incoming call request by calling the registered API function.
*****/
define(class Api {
    constructor(container) {
        this.container = container;
        this.endpoints = {};
    }

    async call(options) {
        let endpoint = this.endpoints[options.message.name];

        if (endpoint) {
            if (await options.session.authorize(endpoint.getPermissionSet())) {
                try {
                    if (Array.isArray(options.message.args)) {
                        return await endpoint.call(options);
                    }
                }
                catch (e) {
                    return mkFailure(`API method call to "${endpoint.getName()}" FAILED:  ${e.stack}}`);
                }
            }
            else {
                return mkFailure(`API method call to "${endpoint.getName()}" UNAUTHORIZED.`);
            }
        }
        else {
            return mkFailure(`API method call to "${endpoint.getName()}" IGNORED.`);
        }
    }

    static define(name, args, permissions) {
        !ObjectType.verify(args) ? args = {} : args;
        Array.isArray(permissions) ? permissions : permissions = [];
        return `ApiEndPoint##${name}##${toJson(args)}##${toJson(permissions)}`;
    }

    getEndpoint(endpointName) {
        return this.endpoints[endpointName];
    }

    hasEndpoint(endpointName) {
        return endpointName in this.endpoints;
    }

    async init() {
        for (let prototype of Data.enumeratePrototypes(this.container)) {
            for (let propertyName of Object.getOwnPropertyNames(prototype.prototype)) {
                if (propertyName.startsWith('ApiEndPoint##')) {
                    if (typeof prototype.prototype[propertyName] == 'function') {
                        let method = prototype.prototype[propertyName];
                        let [ prefix, name, args, permissions ] = propertyName.split('##');
                        args = fromJson(args);
                        permissions = fromJson(permissions);
                        let permissionSet = await mkPermissionSetHandle().createPermissionSet(...permissions); 
                        await this.setEndpoint(method, name, args, permissionSet);
                    }
                }
            }
        }

        for (let key in this.permissionTypes) {
            let permissionType = this.permissionTypes[key];
            await this.permissions.addPermissionType(key, permissionType);
        }

        return this;
    }

    listEndpoints() {
        let endpointList = [];

        for (let key in this.endpoints) {
            let endpoint = this.endpoints[key];

            endpointList.push({
                name: endpoint.getName(),
                args: Object.entries(endpoint.args).map(entry => {
                    let [ name, shape ] = entry;
                    return { name: name, shape: shape };
                }),
            });
        }

        return endpointList;
    }

    async setEndpoint(method, name, args, permissionSet) {
        let endpointArgs = {};

        for (let key in args) {
            endpointArgs[key] = mkRdsShape(args[key]);
        }

        this.endpoints[name] = mkApiEndpoint(
            this,
            name,
            method,
            endpointArgs,
            permissionSet,
        );

        return this;
    }
});