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


/*****
 * An ApiEndpoint defines a "function" that can be called by a remote API object.
 * The endpoint represents a function that's managed by the endpoint and by the
 * API object itself.  ApiEndpoints will not propagage errors, which are caught
 * by the endpoint itself when the endpoint function is called.
*****/
register('', class ApiEndpoint {
    constructor(permissions, func) {
        this.permissions = permissions;
        this.func = func;
    }

    call(...args) {
        return new Promise(async (ok, fail) => {
            try {
                let result = Reflect.apply(this.func, this, args);

                if (result instanceof Promise) {
                    result = await result;
                    ok({ result: result });
                }
                else {
                    ok({ result: result });
                }
            }
            catch (e) {
                ok({ error: e });
            }
        });
    }

    getArgNameAt(index) {
        return this.argNames[index];
    }

    getArgNames() {
        return new Array(this.argNames);
    }

    getArgsLength() {
        return this.argNames.length;
    }

    getFunc() {
        return this.func.toString();
    }

    getName() {
        return this.func.name;
    }

    getPermissions() {
        return Object.assign(new Object(), permissions);
    }

    [Symbol.iterator]() {
        return this.args[Symbol.iterator]();
    }
});


/*****
 * The Api itself is essentially a collection of ApiEndpoints that are managed
 * by the Api container.  The Api is responsible for handling messages from a
 * caller, interpreting those messages, checking permissions and then responding
 * to the incoming call request by calling the registered API function.
*****/
register('', class Api {
    static ignore = Symbol('ignore');
    static noauth = Symbol('noauth');

    constructor(permissionVerse) {
        this.endpoints = {};
        this.permissionVerse = permissionVerse;
    }

    async call(name, ...args) {
        if (name in this.endpoints) {
            return await this.endpoints[name].call(...args);
        }
    }

    getEndpoint(endpointName) {
        return this.endpoints[endpointName];
    }

    getEndpointNames() {
        return Object.keys(this.endpoints);
    }

    async handle(message) {
        let endpoint = this.endpoints[message.name];

        if (endpoint) {
            if ('#TOKEN' in message) {
                let session = await Process.callController({
                    name: 'SessionManagerGetSession',
                    token: message['#TOKEN'],
                });

                const permissions = session ? session.permissions : {};

                if (this.permissionVerse.authorize(endpoint.permissions, permissions)) {
                    try {
                        if (message.args) {
                            return await endpoint.func(...message.args);
                        }
                        else {
                            return await endpoint.func([]);                                
                        }
                    }
                    catch (e) {
                        return 500;
                    }
                }
                else {
                    return Api.noauth;
                }
            }
            else {
                return 404;
            }
        }
        else {
            return Api.ignore;
        }
     }

    hasEndpoint(endpointName) {
        return endpointName in this.endpoints;
    }

    setEndpoint(permissions, func) {
        let endpoint = mkApiEndpoint(permissions, func);
        this.endpoints[endpoint.getName()] = endpoint;
        return this;
    }
});


/*****
 * A RemoteApi object is constructed with a list of function names available in
 * the remote API and a calling function, whose job is to use the required lib
 * to call the API and return the response to the caller.
*****/
(() => {
    const call = Symbol('call');
    const exec = Symbol('exec');

    register('', class RemoteApi {
        constructor(names, caller) {
            this[call] = caller;

            for (let name of names) {
                this[name] = async (...args) => {
                    return await this[exec](name, ...args);
                };
            }
        }

        async [exec](name, ...args) {
            let message = {
                name: name,
                args: args,
            };

            return await this[call](message);
        }
    });
})();