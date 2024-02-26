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


(() => {
    /*****
    *****/
    register('', class ApiEndpoint {
        constructor(name, handler, permissions, ...args) {
            this.name = name;
            this.handler = typeof handler == 'function' ? handler : async trx => null;
            this.permisions = typeof permissions == 'object' ? permissions : {};
            this.args = args;
        }

        getArgAt(index) {
            return this.args[index];
        }

        getArgs() {
            return new Array(this.args);
        }

        getArgsLength() {
            return this.args.length;
        }

        getHandler() {
            return this.handler;
        }

        getName() {
            return this.name;
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
    const api = Symbol('api');

    register('', class Api {
        constructor() {
            this[api] = {
                endpoints: {},
                emitters: [],
            };
        }

        clearEmitter(emitter) {
        }

        clearEmitters() {
        }

        getEmitters() {
            return this[apii].emitters.slice(0);
        }

        getEndpoint(name) {
            return this[apii].endpoints[name];
        }

        async handleIncoming(message) {
        }

        hasEndpoint(name) {
            return name in this[apii].endpoints;
        }

        setEndpoint(endpoint) {
            if (endpoint instanceof ApiEndpoint) {
                this[apii].endpoints[endpoint.getName()] = endpoint;
            }

            return this;
        }

        setEmitter(emitter) {
            for (let logged of this[apii].emitters) {
                if (Object.is(emitter, logged)) {
                    return this;
                }
            }

            emitter.on('*', async message => this.handleIncoming(message));
            this[apii].emitters.push(emitter);
            return this;
        }

        setEndpoint(endpoint) {
            if (endpoint instanceof ApiEndpoint) {
                this[apii].endpoints[endpoint.getName()] = endpoint;
            }

            return this;
        }

        setEndpoints(...endpoints) {
            for (let endpoint in endpoints) {
                this[apii].setEndpoint(endpoint);
            }

            return this;
        }
    });
})();