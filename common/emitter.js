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
 * An emitter is an object with the capability to emit messages, which are the
 * currency of communications between objects, processes, and hosts.  Messages
 * are in the form of Radius extended JSON content, that it's JSON formatted
 * using the Radius specific funtions toJson() and fromJson().  Emitters are
 * like a radio antenna.  The emitter emits messages and registered handles
 * receive those messages as they wish.
*****/
register('', class Emitter {
    constructor() {
        this.handlers = {};
        this.silent = false;
    }

    async call(message) {
        if (!this.silent) {
            if (!this.filter(message)) {
                let trap = mkTrap();
                message['#TRAP'] = trap.id;

                if (message.name in this.handlers) {
                    let handler = this.handlers[message.name];

                    if (handler.thunks.length) {
                        let thunks = handler.thunks;
                        handler.thunks = [];
                        trap.setExpected(thunks.length);

                        for (let thunk of thunks) {
                            if (!thunk.once) {
                                handler.thunks.push(thunk);
                            }

                            if (typeof thunk.filter != 'function' || thunk.filter(message)) {
                                (async () => {
                                    let response = thunk.func(message);
                                    response instanceof Promise ? response = await response : null;
                                    trap.handleResponse(response);
                                })();
                            }
                        };
                    }
                    else {
                        trap.done();
                    }
                }
                else {
                    trap.done();
                }
            }
        }
        
        return trap.promise;
    }

    emit(message) {
        if (!this.silent) {
            if (!this.filter(message)) {
                if (message.name in this.handlers) {
                    let handler = this.handlers[message.name];
                    let thunks = handler.thunks;
                    handler.thunks = [];

                    thunks.forEach(thunk => {
                        if (!thunk.once) {
                            handler.thunks.push(thunk);
                        }

                        if (typeof thunk.filter != 'function' || thunk.filter(message)) {
                            thunk.func(message);
                        }
                    });
                }
            }
        }

        return this;
    }

    filter(message, method) {
        let filteredOut = false;

        //if (!('*' in this.handlers)) {
        if ('*' in this.handlers) {
            let handler = this.handlers['*'];
            let thunks = handler.thunks;
            handler.thunks = [];

            thunks.forEach(thunk => {
                if (!thunk.once) {
                    handler.thunks.push(thunk);
                }

                if (typeof thunk.filter != 'function' || thunk.filter(message)) {
                    if (thunk.func(message, method) === true) {
                        filteredOut = true;
                    }
                }
            });
        }

        return filteredOut;
    }

    handles(name) {
        if (name in this.handlers) {
            return this.handlers.length > 0;
        }
        
        return false;
    }
  
    listening(name) {
        if (name in this.handlers) {
            return this.handlers[name].thunks.length;
        }
  
        return 0;
    }

    off(name, func) {
        if (func === undefined) {
            delete this.handlers[name];
        }
        else {
            if ('#HANDLER' in func) {
                (Array.isArray(name) ? name : [name]).forEach(name => {
                    let handler = this.handlers[name];

                    if (handler && (func['#HANDLER'] in handler.map)) {
                        for (let i = 0; i < handler.thunks.length; i++) {
                            let thunk = handler.thunks[i];
                            
                            if (func['#HANDLER'] === thunk.func['#HANDLER']) {
                                handler.thunks.splice(i, 1);
                                break;
                            }
                        }
                        
                        delete handler.map[func['#HANDLER']];
                    }
                });
            }
        }

        return this;
    }

    on(name, func, filter) {
        if (!('#HANDLER' in func)) {
            func['#HANDLER'] = Symbol('handler');
        }

        (Array.isArray(name) ? name : [name]).forEach(name => {
            if (name in this.handlers) {
                var handler = this.handlers[name];
            }
            else {
                var handler = { map: {}, thunks: [] };
                this.handlers[name] = handler;
            }
            
            if (!(func['#HANDLER'] in handler.map)) {
                let thunk = { func: func, once: false, filter: filter ? filter : false };
                handler.thunks.push(thunk);
                handler.map[func['#HANDLER']] = thunk;
            }
        });

        return this;
    }

    once(name, func, filter) {
        if (!('#HANDLER' in func)) {
            func['#HANDLER'] = Symbol('handler');
        }

        (Array.isArray(name) ? name : [name]).forEach(name => {
            if (name in this.handlers) {
                var handler = this.handlers[name];
            }
            else {
                var handler = { map: {}, thunks: [] };
                this.handlers[name] = handler;
            }
            
            if (!(func['#HANDLER'] in handler.map)) {
                let thunk = { func: func, once: true, filter: filter ? filter : false };
                handler.thunks.push(thunk);
                handler.map[func['#HANDLER']] = thunk;
            }
        });

        return this;
    }

    resume() {
        this.silent = false;
        return this;
    }

    silence() {
        this.silent = true;
        return this;
    }
});


/*****
 * A trap is shared across platforms and has the same functionality in all uses.
 * On all emitters, there is a emit() and a call() methiod.  The call method
 * provides an async service and returns when the remote endpoint has responded
 * to the call.  The Trap class provides the features required to emit the
 * message and asynchronously return a response to the caller when the reply has
 * been recieved from the remote endpoint.
*****/
register('', class Trap {
    static traps = {};
    static nextId = 1;

    constructor(timeoutMillis) {
        this.id = Trap.nextId++;
        Trap.traps[this.id] = this;

        this.expected = 0;
        this.responses = [];
        this.pending = true;
        this.timeout = null;

        if (typeof timeoutMillis == 'number') {
            this.timeout = setTimeout(() => this.onTimeout());
        }
  
        this.promise = new Promise((ok, fail) => {
            delete Trap.traps[this.id];

            const done = () => {
                switch (this.responses.length) {
                    case 0:
                        ok(null);
                    case 1:
                        ok(this.responses[0]);
                    default:
                        ok(this.responses);
                }
            };
            
            this.done = () => done();
        });
    }
    
    cancel() {
        delete Trap.traps[this.id];
        return this;
    }

    decrementExpected() {
        this.expected--;

        if (this.responses.length == this.expected) {
            trap.pending = false;
            trap.done();
        }

        return this;
    }

    static get(trapId) {
        return Trap.traps(trapId);
    }

    getExpected() {
        return this.expected;
    }

    static handleResponse(trapId, response) {
        if (trapId in Trap.traps) {
            Trap.traps[trapId].handleResponse(response);
        }
    }

    handleResponse(response) {
        if (this && this.pending) {
            this.responses.push(response);
  
            if (this.responses.length == this.expected) {
                this.pending = false;
                this.done();
            }
        }

        return this;
    }

    incrementExpected() {
        this.expected++;
        return this;
    }

    onTimeout() {
        trap.pending = false;
        trap.done();
    }
  
    setExpected(expected) {
        this.expected = expected;
        return this;
    }
});


/*****
 * A handle is an object the handlers incoming messages from an emitter with
 * methods based on "on" plus the message.name or a substring thereof.  The
 * reason for the message.name prefix is to ensure we can distringuish between
 * our messages and messages from other sources on a busy emitter.
*****/
register('', class Handler {
    constructor(emitter, prefix, handler) {
        if (typeof prefix == 'string') {
            this.prefix = prefix;
            this.handler = handler;
        }
        else {
            this.prefix = '';
            this.handler = prefix;
        }

        emitter.on('*', async message => {
            if (!this.prefix || message.name.startsWith(this.prefix)) {
                const name = message.name.substring(this.prefix.length);
                let methodName = `on${name[0].toUpperCase()}${name.substring(1)}`;

                if (typeof this.handler[methodName] == 'function') {
                    if ('#CALL' in message) {
                        let response = await this.handler[methodName](message);

                        if (response instanceof Promise) {
                            debug(message);
                        }
                        else {
                            debug(message);
                        }
                    }
                    else {
                        this.handler[methodName](message);
                    }
                }
            }
        });
    }
});


