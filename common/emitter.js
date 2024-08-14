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

    call(message) {
        const trap = mkTrap();

        if (!this.silent && message.name != '*') {
            const callees = [];

            for (let messageName of [message.name, '*']) {
                if (messageName in this.handlers) {
                    let thunks = this.handlers[messageName];
                    let recycled = this.handlers[messageName] = [];

                    for (let thunk of thunks) {
                        trap.incrementExpected();
                        callees.push(thunk.func);

                        if (!thunk.once) {
                            recycled.push(thunk);
                        }
                    }
                }
            }

            if (callees.length) {
                for (let callee of callees) {
                    (async () => {
                        let response = callee(message);
                        response instanceof Promise ? response = await response : null;
                        trap.handleResponse(response);
                    })();
                }
            }
            else {
                trap.done();
            }
        }

        return trap.promise;
    }

    emit(message) {
        if (!this.silent && message.name != '*') {
            for (let messageName of [message.name, '*']) {
                if (messageName in this.handlers) {
                    let thunks = this.handlers[messageName];
                    let recycled = this.handlers[messageName] = [];

                    for (let thunk of thunks) {
                        thunk.func(message);

                        if (!thunk.once) {
                            recycled.push(thunk);
                        }
                    }

                    this.handlers[messageName] = recycled;
                }
            }
        }

        return this;
    }

    handles(name) {
        if (name in this.handlers) {
            return this.handlers[name].length > 0;
        }
        else if ('*' in this.handlers) {
            return this.handlers['*'].length > 0;
        }
        
        return false;
    }

    isSilent() {
        return this.silent;
    }

    off(name, func) {
        if (func === undefined) {
            (Array.isArray(name) ? name : [name]).forEach(name => {
                delete this.handlers[name];
            });
        }
        else {
            if (typeof func['#HANDLER'] == 'symbol') {
                (Array.isArray(name) ? name : [name])
                .forEach(name => {
                    if (name in this.handlers) {
                        let thunks = this.handlers[name];

                        if (func['#HANDLER'] in thunks) {
                            for (let i = 0; i < thunks.length; i++) {
                                let thunk = thunks[i];

                                if (thunk.func['#HANDLER'] === func['#HANDLER']) {
                                    thunk.splice(i, 1);
                                    delete thunks[func['#HANDLER']];
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        }

        return this;
    }

    on(name, func, once) {
        if (!('#HANDLER' in func)) {
            func['#HANDLER'] = Symbol('handler');
        }

        (Array.isArray(name) ? name : [name])
        .forEach(name => {
            let thunks;

            if (name in this.handlers) {
                thunks = this.handlers[name];
            }
            else {
                thunks = [];
                this.handlers[name] = thunks;
            }
            
            if (!(func['#HANDLER'] in thunks)) {
                thunks[func['#HANDLER']] = true;
                thunks.push({ func: func, once: once === true });
            }
        });

        return this;
    }

    once(name, func) {
        return this.on(name, func, true);
    }

    resume() {
        this.silent = false;
        return this;
    }

    silence() {
        this.silent = true;
        return this;
    }

    strictlyHandles(name) {
        if (name in this.handlers) {
            return this.handlers[name].length > 0;
        }
        
        return false;
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

    constructor(expected) {
        this.id = Trap.nextId++;
        Trap.traps[this.id] = this;

        this.expected = typeof expected == 'number' ? expected : 0;
        this.received = 0;
        this.responses = [];
        this.pending = true;
        this.timeout = null;
  
        this.promise = new Promise((ok, fail) => {
            const done = () => {
                delete Trap.traps[this.id];

                switch (this.responses.length) {
                    case 0:
                        ok(null);
                        break;
                    case 1:
                        ok(this.responses[0]);
                        break;
                    default:
                        ok(this.responses);
                        break;
                }
            };
            
            this.done = () => done();
        });
    }
    
    cancel() {
        delete Trap.traps[this.id];
        this.responses = [];
        this.done();
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
            this.received++;

            if (response !== undefined) {
                this.responses.push(response);
            }
  
            if (this.received == this.expected) {
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

    setTimeout(millis) {
        if (this.timeout === null && typeof millis == 'number') {
            this.timeout = setTimeout(() => this.cancel(), millis);
        }

        return this;
    }
});


/*****
 * A handle is an object the handlers incoming messages from an emitter with
 * methods based on "on" plus the message.name or a substring thereof.  The
 * reason for the message.name prefix is to ensure we can distringuish between
 * our messages and messages from other sources on a busy emitter.
*****/
register('', class HandlerProxy {
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
                    try {
                        return this.handler[methodName](message);
                    }
                    catch (e) {
                        await caught(e);
                        return null;
                    }
                }
            }
        });
    }
});


