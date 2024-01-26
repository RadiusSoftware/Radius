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
     * The proxyKey is the symbol that's used for maintaining a reference to the
     * proxy within the Objekt.  The reason is that when an Objekt is processed,
     * we need to return the proxy to the caller, not the Objekt itself.
    *****/
    const proxyKey = Symbol('proxykey');
    const objektKey = Symbol('objektKey');


    /*****
     * This is the proxy that makes the Objekt instances become an active emitter.
     * Moreover, theis proxy handler is central to providing the reflect feature,
     * which is used to determine Objekt dependencies for an expression.  With
     * Objekt.reflect(), an expression is analyzed so that other code can them
     * entangle the reflected expression with the values in one or more Objekts,
     * on which that expression depends.
    *****/
    const ObjektProxy = {
        deleteProperty(objekt, key) {
            if (key in objekt.value) {
                const previous = objekt.value[key];
                delete objekt.value[key];

                objekt.emit({
                    name: 'Update',
                    updateType: 'Delete',
                    key: key,
                    value: previous,
                    objekt: objekt[proxyKey],
                });
            }
        },
 
        get(objekt, key) {
            if (reflecting) {
                let reflectId = `${objekt.reflectId}-${key}`;

                if (!(reflectId in reflection)) {
                    reflection[reflectId] = {
                        objekt: objekt,
                        key: key,
                    };
                }
            }
            else if (key in objekt.value) {
                return objekt.value[key];
            }
            else if (key in objekt) {
                return objekt[key];
            }
            else {
                return null;
            }
        },

        getOwnPropertyDescriptor(objekt, key) {
            return Reflect.getOwnPropertyDescriptor(objekt.value, key);
        },
 
        has(objekt, key) {
            if (key in objekt.value) {
                return true;
            }
            else if (key in objekt) {
                return true;
            }
            else {
                return false;
            }
        },

        ownKeys(objekt) {
            return Object.keys(objekt.value);
        },
 
        set(objekt, key, value) {
            let previous = objekt.value[key];
            objekt.value[key] = value;

            if (typeof previous != 'undefined') {
                if (!Data.areEqual(previous, value)) {
                    objekt.emit({
                        name: 'Update',
                        updateType: 'Change',
                        key: key,
                        value: value,
                        previous: previous,
                        objekt: objekt[proxyKey],
                    });
                }
            }
            else {
                objekt.emit({
                    name: 'Update',
                    updateType: 'Add',
                    key: key,
                    value: value,
                    objekt: objekt[proxyKey],
                });
            }

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
    let reflectId = 1;
    let reflection = {};
    let reflecting = false;

    register('', class Objekt extends Emitter {
        constructor(init) {
            super();
            this.reflectId = reflectId++;

            if (Array.isArray(init)) {
                this.value = new Array();

                for (let element of init) {
                    this.value.push(element);
                }
            }
            else if (typeof init == 'string') {
                if (init == 'array') {
                    this.value = new Array();
                }
                else {
                    this.value = new Object();
                }
            }
            else if (typeof init == 'object') {
                this.value = new Object(init);
            }
            else {
                this.value = new Object();
            }

            const proxy = new Proxy(this, ObjektProxy);
            this[proxyKey] = proxy;
            proxy[objektKey] = this;
            return proxy;
        }

        off(name, handler) {
            super.off(name, handler);
            return this[proxyKey];
        }

        on(name, handler) {
            super.on(name, handler);
            return this[proxyKey];
        }

        once(name, handler) {
            super.once(name, handler);
            return this[proxyKey];
        }
  
        static reflect(func) {
            reflection = {};
            reflecting = true;
    
            try {
                func();
            }
            catch (e) {
                console.log('Objekt Reflection Error');
                console.log(`func = ${func}`);
                console.log(e);
            }
            finally {
                reflecting = false;
                return Object.values(reflection);
            }
        }

        resume() {
            this[proxyKey][objektKey].silent = false;
            return this;
        }

        silence() {
            this[proxyKey][objektKey].silent = true;
            return this;
        }

        [Symbol.iterator]() {
            if (Array.isArray(this.value)) {
                return this.value[Symbol.iterator]();
            }
            else {
                return Object.entries(this.value).map(entry => ({ key: entry[0], value: entry[1] }))[Symbol.iterator]();
            }
        }
    });
})();
