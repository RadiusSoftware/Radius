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
     * This class provides support for managing namespaces and fully qualified
     * names, fqn.  We're using the framework registration due to dependencies.
     * This class and the subsequent mkFqn() function are used by the core
     * framework to register classes, functions, and singletons.  While providing
     * FQN services to the framework, it's also a globally available for use
     * as part of the core framework.
    *****/
    class Fqn {
        constructor(fqn, value) {
            if (typeof fqn == 'string') {
                this.segments = fqn.split('.').map(segment => segment.trim());
            }
            else {
                this.segments = [];
            }

            this.object = global;

            for (let segment of this.getNamespaceSegments()) {
                if (!(segment in this.object)) {
                    this.object[segment] = new Object();
                }

                this.object = this.object[segment];
            }

            if (value) {
                this.setValue(value);
            }
        }

        getFqn() {
            return this.segments.join('.');
        }

        getFqnSegments() {
            return this.segments;
        }

        getName() {
            if (this.segments.length > 0) {
                return this.segments[this.segments.length - 1];
            }
            else {
                return '';
            }
        }

        getNamespace() {
            if (this.segments.length > 1) {
                return this.segments.slice(0, this.segments.length - 1).join('.');
            }
            else {
                return '';
            }
        }

        getNamespaceSegments() {
            if (this.segments.length > 1) {
                return this.segments.slice(0, this.segments.length - 1);
            }
            else {
                return [];
            }
        }

        getObject() {
            return this.object;
        }

        getValue() {
            return this.object[this.getName()];
        }

        setValue(value) {
            this.object[this.getName()] = value;
            return this;
        }

        [Symbol.iterator]() {
            let objs = [ global ];
            let obj = global;

            for (let segment of this.getNamespaceSegments()) {
                obj = obj[segment];
                objs.push(obj);
            }

            objs.push(obj[this.getName()]);
            return objs[Symbol.iterator]();
        }
    }
    
    global.mkFqn = (fqn, value) => new Fqn(fqn, value);


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
        if (typeof arg == 'function' && arg.name) {
            let fqn = ns ? mkFqn(`${ns}.${arg.name}`) : mkFqn(arg.name);
            let obj = fqn.getObject();

            if (!(arg.name in obj)) {
                try {
                    if (arg.toString().startsWith('class')) {
                        if (arg.name.match(/^[A-Z]/)) {
                            let makerName = `mk${arg.name}`;

                            let makerFunc;
                            eval(`makerFunc = function ${makerName}(...args) {
                                let made = Reflect.construct(arg, args);
                                return made;
                            };`);

                            obj[makerName] = makerFunc;
                            obj[makerName]['#NS'] = ns;
                            obj[arg.name] = arg;
                            obj[arg.name]['#NAMESPACE'] = ns;
                        }
                        else {
                            throw new Error(`register(), class name must start with an upper-case letter: ${arg.name}`);
                        }
                    }
                    else {
                        if (arg.name.match(/^[a-z]/)) {
                            obj[arg.name] = (...args) => {
                                return Reflect.apply(arg, obj, args);
                            };
                            
                            obj[arg.name].code = arg.toString();
                        }
                        else {
                            throw new Error(`register(), function name must start with an lower-case letter: ${arg.name}`);
                        }
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
            else {
                throw new Error(`register(), name already exists in container: ${arg.name}`);
            }
        }
    };


    /*****
     * For singleton classes, an instance of the class is added to the specified
     * namespace under the class's name.  Neither a maker function nor the class
     * itself are made available when the singleton() function is called.  Note
     * that singleton's with an async function will also kick off initialization.
    *****/
    global.singleton = (ns, arg, ...args) => {
        if (typeof arg == 'function' && arg.name) {
            let fqn = ns ? mkFqn(`${ns}.${arg.name}`) : mkFqn(arg.name);
            let obj = fqn.getObject();

            if (!(arg.name in obj)) {
                if (arg.toString().startsWith('class')) {
                    if (arg.name.match(/^[A-Z]/)) {
                        try {
                            obj[arg.name] = Reflect.construct(arg, args);
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }
                    else {
                        throw new Error(`singleton(), class name must start with an upper-case letter: ${arg.name}`);
                    }
                }
            }
            else {
                throw new Error(`singleton(), name already exists in container: ${fqn.getNamespace()}`);
            }
        }
    };
})();
