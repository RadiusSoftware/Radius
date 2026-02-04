/*****
 * Copyright (c) 2024 Radius Software
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
     * Keep track of the platform tpye.  Essentially we need to know whether the
     * framework is running on a host, nodejs, or on a browser, mozilla.  If ever
     * needed, we can add more logic to detect other platforms.
    *****/
    globalThis.platform = 'window' in globalThis ? 'mozilla' : 'node';


    /*****
     * A stylized Error constructor that automatically throws the error after
     * being constructed and adorned with additional data.  Our primary goal is
     * to provide the data necessary to track and destroy programming defects.
    *****/
    globalThis.throwError = function(info, ...additional) {
        let stack = Error().stack.split('\n');
        let match = stack[2].match(/([a-zA-Z0-9_./]+):([0-9]+):([0-9]+)/);
        let error = info ? Error(info) : Error('DEVELOPMENT ISSUE');
        stack.splice(1, 1);
        error.stack = stack.join('\n');
        error.fileName = match[1];
        error.lineNumber = parseInt(match[2]);
        error.additional = [];

        for (let element of additional) {
            error.additional.push(element.toString());
        }

        throw error;
    };


    /*****
     * This is the class that provides features for managing the definition of
     * functions, classes, and singletons.
    *****/
    class Namespace {
        static namespaces = {};
        static initializers = [];
        static emitter = null;

        constructor(ns) {
            ns = typeof ns == 'string' ? ns : '';
            
            if (ns in Namespace.namespaces) {
                return Namespace.namespaces[ns];
            }
            else {
                let object = globalThis;

                for (let key of Namespace.split(ns, '.')) {
                    if (!(key in object)) {
                        object[key] = new Object();
                    }

                    object = object[key];
                }

                this.ns = ns;
                this.object = object;
                this.object.define = (...args) => this.define(...args);
                this.object.singleton = (...args) => this.singleton(...args);
                Namespace.namespaces[ns] = this;
            }
        }

        define(...funcs) {
            for (let func of funcs) {
                if (typeof func == 'function') {
                    if (func.name && func.name.length) {
                        if (!(func.name in this.object)) {
                            if (func.toString().startsWith('class')) {
                                this.defineClass(func);
                            }
                            else {
                                this.defineFunction(func);
                            }
                        }
                        else {
                            throwError(`Namespace.define(): Duplicate class or funciton name: "${func.name}"`);
                        }
                    }
                    else {
                        throwError(`Namespace.define(): Unnamed function or class.`);
                    }
                }
                else {
                    throwError(`Namespace.define(): Provided function argument is not of type "function".`);
                }
            }

            return this;
        }

        defineClass(clss) {
            if (clss.name.match(/^[A-Z]/)) {
                let makerName = `mk${clss.name}`;

                this.object[makerName] = (...args) => {
                    return Reflect.construct(clss, args);
                }

                this.object[makerName]['#namespace'] = this.ns;
                this.object[clss.name] = clss;
                this.object[clss.name]['#namespace'] = this.ns;
                this.object[clss.name]['#fqn'] = this.ns ? `${this.ns}.${clss.name}` : clss.name;

                for (let key of Reflect.ownKeys(clss)) {
                    if (key == 'init' && typeof clss[key] == 'function') {
                        Namespace.initializers.push(clss);
                    }
                }

                if (Namespace.emitter) { 
                    Namespace.emitter.emit({
                        name: 'ClassDefined',
                        namespace: this,
                        clss: this.object[clss.name],
                        maker: this.object[makerName],
                    });         
                }
            }
            else {
                throw throwError(`Namespace.defineClass(), class name must start with an upper-case letter: ${clss.name}`);
            }

            return this;
        }

        defineFunction(func) {
            if (func.name.match(/^[a-z]/)) {
                this.object[func.name] = func;
                this.object[func.name]['#namespace'] = this.ns;
                this.object[func.name]['#fqn'] = this.ns ? `${this.ns}.${clss.name}` : func.name;

                if (Namespace.emitter) { 
                    Namespace.emitter.emit({
                        name: 'FunctionDefined',
                        namespace: this,
                        func: this.object[func.name],
                    });         
                }
            }
            else {
                throw new Error(`Namespace.defineFunctiion(), function name must start with an lower-case letter: ${arg.name}`);
            }

            return this;
        }

        get(name) {
            return this.object[name];
        }

        getClass(className) {
            if (typeof this.object[className] == 'object') {
                return Reflect.getPrototypeOf(this.object).constructor;
            }
            else {
                return this.object[className];
            }
        }

        static getClass(fqn) {
            let parts = Namespace.split(fqn, '.');

            if (parts.object == 0) {
                return null;
            }
            else if (parts.length == 1) {
                return mkNamespace().getClass(parts[0]);
            }
            else {
                let ns = parts.slice(0, parts.length - 1).join('.');
                return mkNamespace(ns).getClass(parts[parts.length - 1]);
            }
        }

        getObject() {
            return this.object;
        }

        getType(name) {
            if (name in this.object) {
                return typeof this.object[name];
            }

            return 'undefined';
        }

        has(name) {
            return name in this.object;
        }

        static async init() {
            for (let clss of Namespace.initializers) {
                await wait(clss.init());
            }
        }

        static off(...args) {
            if (Namespace.emitter) {
                Namespace.emitter.off(...args);
            }
        }

        static on(...args) {
            if (Namespace.emitter) {
                Namespace.emitter.on(...args);
            }
        }

        static once(...args) {
            if (Namespace.emitter) {
                Namespace.emitter.once(...args);
            }
        }

        singleton(...classes) {
            for (let clss of classes) {
                if (typeof clss == 'function') {
                    if (clss.name) {
                        if (clss.toString().startsWith('class')) {
                            if (clss.name.match(/^[A-Z]/)) {
                                this.object[clss.name] = Reflect.construct(clss, []);
                                this.object[clss.name]['#namespace'] = this.ns;
                                this.object[clss.name]['#singleton'] = true;
                                this.object[clss.name]['#fqn'] = this.ns ? `${this.ns}.${clss.name}` : clss.name;

                                if (Namespace.emitter) { 
                                    Namespace.emitter.emit({
                                        name: 'SingletoneConstructed',
                                        namespace: this,
                                        singleton: this.object[clss.name],
                                    });         
                                }
                            }
                            else {
                                throw throwError(`Namespace.defineClass(), class name must start with an upper-case letter: ${clss.name}`);
                            }
                        }
                        else {
                            throw throwError(`Namespace.create(): provided class is NOT a class: ${clss}`);
                        }
                    }
                    else {
                        throw throwError(`Namespace.create(): Provided class is unnamed!`);
                    }
                }
            }

            return this;
        }

        static split(str, delimiter) {
            let segments = str.split(delimiter);
    
            for (let i = segments.length - 1; i >= 0; i--) {
                if (segments[i] == '') {
                    segments.splice(i, 1);
                }
            }
    
            return segments;
        }
    }


    /*****
     * The initial "seed" types have not been defined using the Radius framework
     * tools.  Hence, we need make a few adjustments to ensure they look like
     * they were defined with the framework tools.  Note that classes may be
     * created with either the maker function or the standard new ClassName()
     * constructor syntax.
    *****/
    globalThis.Namespace = Namespace;
    globalThis.Namespace['#namespace'] = '';
    globalThis.mkNamespace = (...args) => new Namespace(...args);
    globalThis.mkNamespace['#namespace'] = '';
    mkNamespace();
})();


/*****
 * A bit of a clusterfuck of a function but it comes in handy.  It's purpose
 * is to determine the name of the calling fucntion (caller) and return it.
 * In some cases, it's really useful for generating some elegant code.
*****/
define(function getCaller(className) {
    let e = new Error('');
    let stack = e.stack.split('\n');
    let regex = new RegExp(`at (([a-zA-Z0-9_<>]+)\\.)?([a-zA-Z0-9_<>]+) `);
    let matches = stack[3].match(regex);
    return { className: matches[2], functionName: matches[3] };
});


/*****
 * The primary purpose of this core function is to provide a facility that can
 * convert a singleton object into it's class so that singleton names can be
 * used as a base class for other classes.  Remember that for singleton objects,
 * the class name in the namespace is replaced with a reference to the singleton
 * object itself.  This function makes the class (function) itself available if
 * required.
*****/
define(function classOf(arg) {
    if (typeof arg == 'object') {
        return Reflect.getPrototypeOf(arg).constructor;
    }
    else if (typeof arg == 'function') {
        return arg;
    }

    return undefined;
});


/*****
 * This is a very simplistic function that's nice to have syntactically.  It
 * makes for some very nice code:  await pauseFor(800).  The input interval is
 * specified in milliseconds.
*****/
define(function pause(milliseconds) {
    return new Promise((ok, fail) => {
        setTimeout(() => ok(), milliseconds);
    });
});


/*****
 * When we don't know what the response from a function is, Promise or not
 * a Promise, this function comes in handy.  Use it to wait on promises but
 * return straight away when the value is NOT a Promise.
*****/
define(async function wait(value) {
    if (value instanceof Promise) {
        return await value;
    }
    else {
        return value;
    }
});


/*****
 * caught is a ubiquitous global function that's used for reporting on thrown
 * errors.  There are many creative ways that an implementation may report them.
 * Hence, the real work is done by the caught.handler property, which shoudl be
 * set by server implementation to do more than simply do a console.log().
*****/
define(async function caught(error, ...args) {
    await wait(caught.handler(error, ...args));
});

caught.handler = (error, ...args) => {
    console.log('\n');
    console.log(error);
    args.forEach(arg => console.log(arg));
};


/*****
 * The failure class is and should always be the standard mechanism for returning
 * a failed or error state to a caller, including callers that an IPC callers.
 * Using this mechanism ensures that we can code and review code across applications
 * and the framework to ensure it's consistent.
*****/
define(class Failure {
    constructor(info, ...additional) {
        this.info = info != undefined ? info.toString() : '';

        if (info instanceof Error) {
            let stack = Error().stack.split('\n');
            let match = stack[2].match(/([a-zA-Z0-9_./]+):([0-9]+):([0-9]+)/);
            stack.splice(1, 1);
            this.stack = stack.join('\n');
            this.fileName = match[1];
            this.lineNumber = parseInt(match[2]);
            this.additional = [];
        }
        else {
            this.stack = '';
            this.fileName = '';
            this.lineNumber = '';
            this.additional = [];
        }
    
        for (let element of additional) {
            this.additional.push(element);
        }
    }

    static fromJson(object) {
        let failure = mkFailure('');
        Object.assign(failure, object);
        return failure;
    }

    getAdditional(index) {
        if (typeof index == 'number') {
            return this.additional[index];
        }
        else {
            return this.additional;
        }
    }

    getFileName() {
        return this.fileName;
    }

    getInfo() {
        return this.info;
    }

    getLineNumber() {
        return this.lineNumber;
    }

    getStack() {
        return this.stack;
    }

    [Symbol.iterator]() {
        return this.additional[Symbol.iterator]();
    }
});
