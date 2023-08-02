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
*****/
register('', class Cache extends Emitter {
    static nextId = 1;

    constructor() {
        this.properties = {};
    }

    clear(name) {
    }

    get(name) {
    }

    set(name, value) {
    }
});
/*
register('', class CacheX {
    static nextId = 1;
    static idKey = Symbol('id');
    static pathKey = Symbol('Path');
    static nakedKey = Symbol('Naked');
    static proxyKey = Symbol('Proxy');
    static emitterKey = Symbol('Emitter');
    static rootKey = Symbol('Root');
    static reflection = null;
    static reflecting = false;
    static suppress = false;
  
    static proxy = {
        deleteProperty(nakedCache, key) {
            if (key in nakedCache) {
                let oldValue = nakedCache[key];
  
                if (Array.isArray(nakedCache)) {
                    nakedCache.splice(key, 1);
                }
                else {
                    delete nakedCache[key];
                }
 
                nakedCache[Cache.emitterKey].send({
                    messageName: 'Cache',
                    CacheId: nakedCache[Cache.idKey],
                    Cache: nakedCache[Cache.proxyKey],
                    action: 'delete',
                    key: key,
                    oldValue: oldValue,
                });
 
                return nakedCache[Cache.proxyKey];
            }
        },
 
        get(nakedCache, key) {
            if (Cache.reflecting) {
                let refid = `{nakedCache[Cache.idKey]}-{key}`;
                reflection[refid] = {Cache: nakedCache[Cache.proxyKey], key: key};
                return nakedCache[key];
            }
            else if (key === Cache.nakedKey) {
                return nakedCache;
            }
            else {
                return nakedCache[key];
            }
        },
 
        set(nakedCache, key, value) {
            if (key in nakedCache) {
                let oldValue = Cache.value(nakedCache[key]);
 
                if (typeof value == 'object' && !(value instanceof Date) && !(value instanceof Time)) {
                    Cache.assign(nakedCache[Cache.proxyKey], value);
                }
                else {
                    nakedCache[key] = value;
                }
 
                if (!Cache.suppress) {
                    nakedCache[Cache.emitterKey].send({
                        messageName: 'Cache',
                        CacheId: nakedCache[Cache.idKey],
                        Cache: nakedCache[Cache.proxyKey],
                        action: 'change',
                        key: key,
                        oldValue: oldValue,
                        newValue: value,
                    });
                }
            }
            else {
                if (Array.isArray(nakedCache)) {
                    if (key < 0) {
                        nakedCache.unshift(value);
                    }
                    else if (key >= nakedCache.length) {
                        nakedCache.push(value);
                    }
                }
                else if (typeof value == 'object' && !(value instanceof Date) && !(value instanceof Time)) {
                    Cache.suppress = true;
                    nakedCache[key] = new Cache(value, nakedCache, key);
                    Cache.suppress = false;
                }
                else {
                    nakedCache[key] = value;
                }
 
                if (!Cache.suppress) {
                    nakedCache[Cache.emitterKey].send({
                        messageName: 'Cache',
                        CacheId: nakedCache[Cache.idKey],
                        Cache: nakedCache[Cache.proxyKey],
                        action: 'add',
                        key: key,
                        value: value
                    });
                }
            }
 
            return nakedCache[Cache.proxyKey];
        },
    };

    constructor(arg, naked, key) {
        let init;
        let Cache;
  
        if (arg === true) {
            init = false;
            Cache = new Array();
        }
        else if (arg === false || arg instanceof Date || arg instanceof Time) {
            init = false;
            Cache = new Object();
        }
        else if (typeof arg == 'undefined') {
            init = false;
            Cache = new Object();
        }
        else if (Array.isArray(arg)) {
            init = true;
            Cache = new Array();
        }
        else if (typeof arg == 'object') {
            init = true;
            Cache = new Object();
        }
        else  {
            init = false;
            Cache = new Object();
        }
 
        Cache[Cache.idKey] = Cache.nextId++;
        Cache[Cache.proxyKey] = new Proxy(Cache, Cache.proxy);
 
        if (naked) {
            Cache[Cache.pathKey] = naked[Cache.pathKey] ? `{naked[Cache.pathKey]}.{key}` : key;
            Cache[Cache.rootKey] = naked[Cache.rootKey][Cache.proxyKey];
            Cache[Cache.emitterKey] = naked[Cache.emitterKey];
        }
        else {
            Cache[Cache.pathKey] = '';
            Cache[Cache.rootKey] = Cache[Cache.proxyKey];
            Cache[Cache.emitterKey] = mkEmitter();
        }
 
        if (init) {
            Cache.assign(Cache[Cache.proxyKey], arg);
        }
 
        return Cache[Cache.proxyKey];
    }
 
    static assign(proxy, arg) {
        if (typeof proxy == 'object' && proxy[Cache.nakedKey] !== undefined) {
            if (Array.isArray(proxy) && Array.isArray(arg)) {
                for (let i = 0; i < arg.length; i++) {
                    proxy[i] = arg[i];
                }
            }
            else if (typeof arg == 'object') {
                for (let key in arg) {
                    proxy[key] = arg[key];
                }
            }
        }
  
        return Cache;
    }

    static clear(proxy, key) {
        if (typeof proxy == 'object' && proxy[Cache.nakedKey] !== undefined) {
            let naked = proxy[Cache.nakedKey];

            if (key) {
                 if (Array.isArray(naked[key])) {
                    naked[key].splice(0, naked[key].length);
                }
                else if (typeof naked[key] == 'object') {
                    for (let propertyName in naked[key]) {
                        delete naked[key][propertyName];
                    }
                }
            }
            else {
                 if (Array.isArray(naked)) {
                    naked.splice(0, naked.length);
                }
                else if (typeof naked == 'object') {
                    for (let propertyName in naked) {
                        delete naked[propertyName];
                    }
                }
            }
        }
    }

    static id(proxy) {
        if (typeof proxy == 'object' && proxy[Cache.nakedKey] !== undefined) {
            return proxy[Cache.nakedKey][Cache.idKey];
        }
  
        return null;
    }

    static is(arg1, arg2) {
        if (typeof arg1 == 'object' && typeof arg2 == 'object') {
            if (arg1[Cache.idKey] && arg2[Cache.idKey]) {
                return arg1[Cache.idKey] == arg2[Cache.idKey];
            }
        }

        return false;
    }

    static has(proxy, key) {
        if (typeof proxy == 'object' && proxy[Cache.nakedKey] !== undefined) {
            return key in proxy[Cache.nakedKey];
        }
  
        return false;
    }
 
    static isCache(arg) {
        if (typeof arg == 'object') {
            return arg[Cache.idKey] !== undefined;
        }
 
        return false;
    }
  
    static off(Cache, handler) {
        Cache[Cache.emitterKey].off('Cache', handler);
        return Cache;
    }
 
    static on(Cache, handler, filter) {
        Cache[Cache.emitterKey].on('Cache', handler, filter);
        return Cache;
    }
 
    static once(Cache, handler, filter) {
        Cache[Cache.emitterKey].once('Cache', handler, filter);
        return Cache;
    }
  
    static reflect(func, ...args) {
        Cache.reflection = {};
        Cache.reflecting = true;

        try {
            func(...args);
        }
        catch (e) {
            console.log('Cache refelction error!');
            console.log(func.toString());
            console.log(e);
        }
        finally {
            Cache.reflecting = false;
            return Object.values(Cache.reflection);
        }
    }
  
    static root(proxy) {
        if (proxy) {
            return proxy[Cache.rootKey];
        }
    }
  
    static value(arg) {
        if (typeof arg == 'object' && arg[Cache.idKey]) {
            if (Array.isArray(arg)) {
                let val = [];
 
                for (let i = 0; i < arg.length; i++) {
                    val.push(Cache.value(arg[i]));
                }
 
                return val;
            }
            else {
                let val = {};
 
                Object.entries(arg).forEach(entry => {
                    val[entry[0]] = Cache.value(entry[1]);
                });
 
                return val;
            }
        }
        else {
            return arg;
        }
    }
});
*/
