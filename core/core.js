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
"use strict";


/*****
 * This is Radius framework core and must be first module to be loaded for both
 * the mozilla and the nodejs environments.  One of the purposes of the Radius
 * is to create an environment where client and server code can be readily used
 * on either platform (depending on compatibility of feature sets).  register()
 * and singleton() ensure that classes and functions are compatabily from a source
 * code point of view.
*****/
(() => {
    try {
        window.global = window;
        global.platform = 'mozilla';
    }
    catch (e) {
        global.platform = 'nodejs';
    }


    /*****
     * Feature to ensure that a specified namespace has been created and is
     * available.  If the namespace requires a chain of objects, this will create
     * the entire chain: obj1.obj2.obj3.   The returned value is the object that
     * represents the namespace argument, which is a string: 'obj1.obj2.obj3'.
    *****/
    function ensureNamespace(namespace) {
        if (typeof namespace == 'string') {
            let ns = global;

            if (namespace) {
                for (let name of namespace.trim().split('.')) {
                    if (!(name in ns)) {
                        ns[name] = new Object();
                    }

                    ns = ns[name];
                }
            }

            return ns;
        }
        else if (typeof namespace == 'object') {
            return namespace;
        }
    }


    /*****
    *****/
    global.exitApp = (ok, reason) => {
        if (platform == 'mozilla') {
            throw new Error(`Exiting application.  ${reason}`);
        }
        else if (platform == 'nodejs') {
        }
    }


    /*****
    *****/
    global.exitProcess = (ok, reason) => {
        if (platform == 'mozilla') {
            throw new Error(`Exiting process.  ${reason}`);
        }
        else if (platform == 'nodejs') {
        }
    }


    /*****
    *****/
    global.logError = (ok, reason) => {
        if (platform == 'mozilla') {
            console.log(reason);
        }
        else if (platform == 'nodejs') {
        }
    }


    /*****
     * Singletons may have init() methods, and the init() methods may be async.
     * When async, it may be necessary to wait on the singleton's initialization
     * before proceeding with additional code.  The function returns a promise
     * that will be unfulfilled until all initializing singletons have completed
     * that process.
    *****/
    global.onSingletons = (arg) => {
        return new Promise((ok, fail) => {
            if (initializingSingletonCount > 0) {
                initializingSingletonWaiting.push(ok);
            }
            else {
                ok();
            }
        });
    };


    /*****
     * In some cases, developers may find that they don't know whether a value
     * is a promise or a regular objevt.  The function handles that by returning
     * a promise that will be fulfilled wither when (a) the value is NOT a promise
     * or (b) immediately by returning the original value (promise) itself.
    *****/
    global.onValue = async (arg) => {
        return new Promise(async (ok, fail) => {
            if (arg instanceof Promise) {
                ok(await arg);
            }
            else {
                ok(arg);
            }
        });
    }


    /*****
     * Register a function or class in the specified namespace.  Functions must
     * be named using camcel case names, whereas classes are expected to use
     * pascal case.  Registered functions are placed into the specified namespace
     * are available to be called just like any other function.  Classes are also
     * added to the specified namespace, and a maker function is defined and place
     * into that same namespace:  register(class ClassName...), mkClassName() is
     * a ctor added to the namespace.
    *****/
    global.register = (ns, arg) => {
        let namespace = ensureNamespace(ns);

        if (arg.name && !(arg.name in namespace)) {
            arg[namespace] = namespace;

            if (arg.toString().startsWith('class')) {
                if (arg.name.match(/^[A-Z]/)) {
                    let makerName = `mk${arg.name}`;

                    let makerFunc;
                    eval(`makerFunc = function ${makerName}(...args) {
                        let made = Reflect.construct(arg, args);
                        return made;
                    };`);

                    namespace[makerName] = makerFunc;
                    namespace[makerName]['#NS'] = ns;
                    namespace[arg.name] = arg;
                    namespace[arg.name]['#NAMESPACE'] = ns;
                    return makerFunc;
                }
                else {
                    throw new Error(`register(), class name must start with an upper-case letter: ${func.name}`);
                }
            }
            else if (arg.name) {
                if (arg.name.match(/^[a-z]/)) {
                    namespace[arg.name] = (...args) => {
                        return Reflect.apply(arg, namespace, args);
                    };
                    
                    namespace[arg.name].code = arg.toString();
                }
                else {
                    throw new Error(`register(), function name must start with an lower-case letter: ${func.name}`);
                }
            }
        }
        else {
            throw new Error(`register(), name already exists in container: ${func.name}`);
        }
    }


    /*****
     * For singleton classes, an instance of the class is added to the specified
     * namespace under the class's name.  Neither a maker function nor the class
     * itself are made available when the singleton() function is called.  Note
     * that singleton's with an async function will also kick off initialization.
    *****/
    let initializingSingletonCount = 0;
    let initializingSingletonWaiting = [];

    global.singleton = async (ns, arg, ...args) => {
        let namespace = ensureNamespace(ns);

        if (arg.name && !(arg.name in namespace)) {
            arg[namespace] = namespace;

            if (arg.toString().startsWith('class')) {
                if (arg.name.match(/^[A-Z]/)) {
                    const obj = Reflect.construct(arg, args);
                    namespace[arg.name] = obj;
                    const proto = Reflect.getPrototypeOf(obj);

                    if (typeof proto.init == 'function') {
                        let value = proto.init();

                        if (value instanceof Promise) {
                            (async () => {
                                initializingSingletonCount++;
                                await value;
                                initializingSingletonCount--;

                                if (initializingSingletonCount == 0) {
                                    for (let waiting of initializingSingletonWaiting) {
                                        waiting();
                                    }
                                }
                            })();
                        }
                    }

                    return obj;
                }
                else {
                    throw new Error(`register(), class name must start with an upper-case letter: ${func.name}`);
                }
            }
        }
        else {
            throw new Error(`register(), name already exists in container: ${func.name}`);
        }
    }
})();
