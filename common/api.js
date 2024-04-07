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
*****/
register('', class ApiEndpoint {
    constructor(permissions, func) {
        this.permissions = permissions;
        this.func = func;
    }

    call(...args) {
        return new Promise(async (ok, fail) => {
            let result = Reflect.apply(this.func, null, args);

            if (result instanceof Promise) {
                ok(await result);
            }
            else {
                ok(result);
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
*****/
register('', class Api {
    constructor() {
        this.emitters = [];
        this.endpoints = {};
    }

    async call(name, ...args) {
        if (name in this.endpoints) {
            return await this.endpoints[name].call(...args);
        }
    }

    clearEmitter(emitter) {
        let index = this.findEmitter(emitter);

        if (index >= 0) {
            emitter.off('*', this.handle);
            this.emitters.splice(i, 1);
        }
        
        return this;
    }

    findEmitter(emitter) {
        for (let i = 0; i < this.emitters.length; i++) {
            if (Object.is(this.emitters[i], emitter)) {
                return i;
            }
        }

        return -1;
    }

    getEmitters() {
        return this.emitters.slice(0);
    }

    getEndpoint(endpointName) {
        return this.endpoints[endpointName];
    }

    getEndpointNames() {
        return Object.keys(this.endpoints);
    }

    async handle(message) {
        if (typeof message.token == 'string') {
            console.log(message.token);
        }
        else if (message.permissions == 'object') {
            console.log(message.permissions);
        }

        if (message.name in this.endpoints) {
            return await this.endpoints[message.name].call(...message.args);
        }
     }

    hasEmitter(emitter) {
        return this.findEmitter(emitter) >= 0;
    }

    hasEndpoint(endpointName) {
        return endpointName in this.endpoints;
    }

    setEmitter(emitter) {
        if (!this.hasEmitter(emitter)) {
            emitter.on('*', async message => this.handle(message));
            this.emitters.push(emitter);
        }

        return this;
    }

    setEndpoint(permissions, func) {
        let endpoint = mkApiEndpoint(permissions, func);
        this.endpoints[endpoint.getName()] = endpoint;
        return this;
    }
});


/*****
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