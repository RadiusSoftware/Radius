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
     * For Active instances, all of the relevant data are stored in both of these
     * WeakMaps.  Once is indexed by the proxy while the other is index by the
     * active instance itself.
    *****/
   const byProxy = new WeakMap();
   const byActive = new WeakMap();


    /*****
     * The expected standard proxy functions that are normally expected.  Each
     * of these functions are shared by both Array and Object caches.  The proxies
     * not only perform the requested operation, but also emit a message when
     * relevant to the requested operation.  That's what makes our ObjectCache
     * and ArrayCache objects active or dynamic.
    *****/
    const handler = {
        deleteProperty(active, key) {
            const internal = byActive.get(active);

            if (key in internal.value) {
                const previous = internal.value[key];
                delete internal.value[key];

                internal.emitter.send({
                    name: 'Update',
                    active: internal.proxy,
                    updateType: 'delete',
                    key: key,
                    value: previous,
                });
            }
        },
 
        get(active, key) {
            const internal = byActive.get(active);
            return internal.value[key];
        },
 
        set(active, key, value) {
            const internal = byActive.get(active);
            const previous = internal.value[key];

            if (typeof previous != 'undefined') {
                if (!Data.areEqual(previous, value)) {
                    internal.value[key] = value;

                    internal.emitter.send({
                        name: 'Update',
                        active: internal.proxy,
                        updateType: 'change',
                        key: key,
                        value: value,
                        previous: previous,
                    });

                    return;
                }
            }
            
            if (Array.isArray(internal.value)) {
                internal.value.push(value);
            }
            else {
                internal.value[key] = value;
            }

            internal.emitter.send({
                name: 'Update',
                active: internal.proxy,
                updateType: 'add',
                key: key,
                value: value,
            });
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
    register('', class Active {
        constructor(init) {
            const proxy = new Proxy(this, handler);
            const emitter = mkEmitter();
            const value = Array.isArray(init) ? new Array() : new Object();

            const internal = {
                active: this,
                value: value,
                proxy: proxy,
                emitter: emitter,
            }

            byProxy.set(proxy, internal);
            byActive.set(this, internal);

            if (Array.isArray(init)) {
                for (let element of init) {
                    value.push(element);
                }
            }
            else if (typeof init == 'object') {
                for (let key in init) {
                    value[key] = value[key];
                }
            }

            return proxy;
        }

        static getValue(proxy) {
            return byProxy.get(proxy).value;
        }

        static off(proxy, handler) {
            let internal = byProxy.get(proxy);
            internal.emitter.off('Update', handler);
        }

        static on(proxy, handler) {
            let internal = byProxy.get(proxy);
            internal.emitter.on('Update', handler);
        }

        static once(proxy, handler) {
            let internal = byProxy.get(proxy);
            internal.emitter.once('Update', handler);
        }

        static pop(proxy, value) {
            let internal = byProxy.get(proxy);

            if (Array.isArray(internal.value)) {
                if (internal.value.length) {
                    let popped = internal.value.push(value);

                    internal.emitter.send({
                        name: 'Update',
                        active: internal.proxy,
                        updateType: 'pop',
                        length: internal.value.length,
                        value: popped,
                    });

                    return popped;
                }
            }
        }

        static push(proxy, value) {
            let internal = byProxy.get(proxy);

            if (Array.isArray(internal.value)) {
                internal.value.push(value);

                internal.emitter.send({
                    name: 'Update',
                    active: internal.proxy,
                    updateType: 'push',
                    length: internal.value.length,
                    value: value,
                });
            }
        }
    });
})();
