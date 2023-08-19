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
     * For Depot instances, all of the relevant data are stored in both of these
     * WeakMaps.  Once is indexed by the proxy while the other is index by the
     * Depot instance itself.
    *****/
   const byProxy = new WeakMap();
   const byValue = new WeakMap();


    /*****
     * This is the proxy that makes the Depot instances become an active emitter.
     * Moreover, theis proxy handler is central to providing the reflect feature,
     * which is used to determine Depot dependencies for an expression.  With
     * Depot.reflect(), an expression is analyzed so that other code can them
     * entangle the reflected expression with the values in one or more Depots,
     * on which that expression depends.
    *****/
    const handler = {
        deleteProperty(obj, key) {
            const internal = byValue.get(obj);

            if (key in internal.value) {
                const previous = internal.value[key];
                delete internal.value[key];

                internal.depot.send({
                    name: 'Update',
                    depot: internal.proxy,
                    updateType: 'delete',
                    key: key,
                    value: previous,
                });
            }

            return true;
        },
 
        get(obj, key) {
            const internal = byValue.get(obj);

            if (reflecting) {
                let reflectionId = `${internal.depot.state.id}-${key}`;

                reflection[reflectionId] = {
                    depot: Depot.getDepot(internal.depot.state.id),
                    key: key,
                };

                return '';
            }
            else if (key in internal.depot) {
                return internal.depot[key];
            }
            else if (key in internal.value) {
                return internal.value[key];
            }

            return null;
        },
 
        has(obj, key) {
            const internal = byValue.get(obj);

            if (key in internal.depot) {
                return true;
            }
            else if (key in internal.value) {
                return true;
            }

            return false;
        },
 
        set(obj, key, value) {
            const internal = byValue.get(obj);
            const previous = internal.value[key];
            internal.value[key] = value;

            if (typeof previous != 'undefined') {
                if (!Data.areEqual(previous, value)) {
                    internal.depot.send({
                        name: 'Update',
                        depot: internal.proxy,
                        updateType: 'change',
                        key: key,
                        value: value,
                        previous: previous,
                    });

                    return true;
                }
            }

            internal.depot.send({
                name: 'Update',
                depot: internal.proxy,
                updateType: 'add',
                key: key,
                value: value,
            });

            return true;
        },
    };


    /*****
     * The ObjectCache and ArrayCache objects encapsulate the native Object and Array
     * classes in order to enable other objects to listen for changes to those
     * data containers.  This infrastructure enables the entanglement features on
     * the Mozilla / browser side of the implementation.  Entanglement provides a
     * elegant mechanism for controlling values and the display of values by the
     * mechanism of entangling them with each other.
    *****/
    let nextId = 1;
    let reflection = {};
    let reflecting = false;
    const depots = {};

    register('', class Depot extends Emitter {
        constructor(init, extended) {
            super();
            let value;
            this.state = { id: `depot_${nextId++}` };

            if (Array.isArray(init)) {
                value = new Array();

                for (let element of init) {
                    value.push(element);
                }
            }
            else if (init === 'array') {
                value = new Array();
            }
            else if (typeof init == 'object') {
                value = new Object(); 
                
                for (let key in init) {
                    value[key] = init[key];
                }  
            }
            else {
                value = new Object();
            }

            const proxy = new Proxy(value, handler);

            const internal = {
                depot: this,
                value: value,
                proxy: proxy,
            }

            byProxy.set(proxy, internal);
            byValue.set(value, internal);
            depots[this.state.id] = proxy;
            return proxy;
        }

        append(...args) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                for (let arg of args) {
                    if (Array.isArray(arg)) {
                        for (let element of arg) {
                            internal.value.push(element);
                        }
                    }
                }
            }

            return internal.proxy;
        }

        forEach(func) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                internal.value.forEach(element => func(element));
            }

            return internal.proxy;
        }

        getDepot() {
            return this;
        }

        static getDepot(did) {
            return depots[did];
        }

        getProxy() {
            return byProxy.get(this).proxy;
        }

        getValue() {
            return byProxy.get(this).value;
        }

        map(func) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                return internal.value.map(element => func(element));
            }
        }

        notify(internal, updateType, key, value) {
            let message = {
                name: 'Update',
                depot: internal.proxy,
                updateType: updateType,
            };

            key ? message.key = key : null;
            value ? message.value = value : null;
            internal.depot.send(message);
        }

        off(handler) {
            super.off('Update', handler);
            return byProxy.get(this).proxy;
        }

        on(handler) {
            super.on('Update', handler);
            return byProxy.get(this).proxy;
        }

        once(handler) {
            super.once('Update', handler);
            return byProxy.get(this).proxy;
        }

        push(...args) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                for (let arg of args) {
                    internal.value.push(arg);
                    this.notify(internal, 'push', internal.value.length -1, arg);
                }
            }

            return internal.proxy;
        }

        pop() {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                const popped = internal.value.pop();
                this.notify(internal, 'push', internal.value.length, popped);
                return popped;
            }
        }
  
        static reflect(func) {
            reflection = {};
            reflecting = true;
    
            try {
                func();
            }
            catch (e) {}
            finally {
                reflecting = false;
                return Object.values(reflection);
            }
        }

        refresh() {
            let internal = byProxy.get(this);
            this.notify(internal, 'refresh');
            return internal.proxy;
        }

        reverse() {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                internal.value.reverse();
                this.notify(internal, 'refresh');
            }

            return internal.proxy;
        }

        set(obj) {
            let internal = byProxy.get(this);

            for (let key in obj) {
                internal.proxy[key] = obj[key];
            }

            this.notify(internal, 'refresh');
            return internal.proxy;
        }

        shift() {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                const shifted = internal.value.shift();
                this.notify(internal, 'shift', 0, shifted);
                return shifted;
            }
        }

        slice(start, end) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                return internal.value.slice(start, end);
            }
        }

        sort(compareFunc) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                internal.value.sort(compareFunc);
                this.notify(internal, 'refresh');
            }

            return internal.proxy;
        }

        splice(...args) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                internal.value.splice(...args);
                this.notify(internal, 'refresh');
            }

            return internal.proxy;
        }

        [Symbol.iterator]() {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                return internal.value[Symbol.iterator]();
            }
            else {
                return Object.entries(internal.value)[Symbol.iterator]();
            }
        }

        unshift(...args) {
            let internal = byProxy.get(this);

            if (Array.isArray(internal.value)) {
                for (let arg of args) {
                    internal.value.unshift(arg);
                    this.notify(internal, 'unshift', 0, arg);
                }
            }

            return internal.proxy;
        }
    });
})();
