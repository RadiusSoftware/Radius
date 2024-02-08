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
    /*****
     * Keep track of the platform tpye.  Essentially we need to know whether the
     * framework is running on a host, nodejs, or on a browser, mozilla.  If ever
     * needed, we can add more logic to detect other platforms.
    *****/
    globalThis.platform = 'window' in globalThis ? 'mozilla' : 'nodejs';

    
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

            this.object = globalThis;

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
            let objs = [ globalThis ];
            let obj = globalThis;

            for (let segment of this.getNamespaceSegments()) {
                obj = obj[segment];
                objs.push(obj);
            }

            objs.push(obj[this.getName()]);
            return objs[Symbol.iterator]();
        }
    }
    
    globalThis.mkFqn = (fqn, value) => new Fqn(fqn, value);


    /*****
     * Register a function or class in the specified namespace.  Functions must
     * be named using camcel case names, whereas classes are expected to use
     * pascal case.  Registered functions are placed into the specified namespace
     * are available to be called just like any other function.  Classes are also
     * added to the specified namespace, and a maker function is defined and place
     * into that same namespace:  register(class ClassName...), mkClassName() is
     * a ctor added to the namespace.
    *****/
    globalThis.register = (ns, arg) => {
        let fqn = ns ? mkFqn(`${ns}.${arg.name}`) : mkFqn(arg.name);
        let obj = fqn.getObject();

        if (arg.name in obj) {
            throw new Error(`register(), name already exists in container: ${arg.name}`);
        }
        
        if (arg.toString().startsWith('class')) {
            if (arg.name.match(/^[A-Z]/)) {
                let makerName = `mk${arg.name}`;
                obj[makerName] = (...args) => Reflect.construct(arg, args);
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
    };


    /*****
     * For singleton classes, an instance of the class is added to the specified
     * namespace under the class's name.  Neither a maker function nor the class
     * itself are made available when the singleton() function is called.  Note
     * that singleton's with an async function will also kick off initialization.
    *****/
    globalThis.singleton = (ns, arg, ...args) => {
        let fqn = ns ? mkFqn(`${ns}.${arg.name}`) : mkFqn(arg.name);
        let obj = fqn.getObject();

        if (!(arg.name in obj)) {
            if (arg.toString().startsWith('class')) {
                if (arg.name.match(/^[A-Z]/)) {
                    obj[arg.name] = Reflect.construct(arg, args);
                }
                else {
                    throw new Error(`singleton(), class name must start with an upper-case letter: ${arg.name}`);
                }
            }
        }
        else {
            throw new Error(`singleton(), name already exists in container: ${fqn.getNamespace()}`);
        }
    };


    /*****
     * This is a very simplistic function that's nice to have syntactically.  It
     * makes for some very nice code:  await pauseFor(800).  The input interval is
     * specified in milliseconds.
    *****/
    register('', function pause(milliseconds) {
        return new Promise((ok, fail) => {
            setTimeout(() => ok(), milliseconds);
        });
    });


    /*****
     * The framework-wide standard handler for catch(e) clauses.  The standard
     * procedure is to simply log the exception, e, with global system logger.
     * An "action" function may be provided as an alterative to the standard
     * feature of just logging the exception.  Note that the action function is
     * able to accept zero or more arguments provided to the caught() function.
    *****/
    register('', async function caught(e, action, ...args) {
        if (typeof action == 'function') {
            let result = action(e, ...args);
            return result instanceof Promise ? await result : result;
        }
        else {
            log(e);
        }
    });


    /*****
     * This provides a standard system-wide logging feature.  The actual logging
     * service is provided by the loggerFunction.  Note, the framework default is
     * to perform a console.log() for the provided argument.  Override the default
     * behavior by setting the logging function with a developer provider function.
     * Note that log() is actually an asynchronous function, which can be used for
     * outward messaging or event network-base communicatons.
    *****/
    let loggingFunction = (arg) => console.log(arg);

    register('', function setLogger(logger) {
        loggingFunction = logger;
    });
    
    register('', async function log(arg) {
        loggingFunction(arg);
    });


    /*****
     * For development purposes only!  The good ole fashion console.log() is useful
     * for debugging purposes.  Sometimes the number of console.logs() get out of
     * hand.  Hence, if we use debug() instead of console.log(), we can easily find
     * all instances of debugging statements in the code so we can remove them.
    *****/
    register('', function debug(...args) {
        for (let arg of args) {
            console.log(arg);
        }
    });
})();
