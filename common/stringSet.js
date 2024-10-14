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


/*****
 * A set is an implementation of a set of keys for string values.  We have this
 * because it's a much better implementation that the underlying js engine's
 * Set.  This class may be somewhat slower, but it's API is much more like that
 * of an array and is much more modern that the js engine's Set.
*****/
register('', class StringSet {
    constructor(...args) {
        this.values = {};
        this.set(...args);
    }
  
    static arrayify(...args) {
        let array = [];
  
        for (let arg of args) {
            if (arg instanceof StringSet) {
                array = array.concat(Object.keys(arg.values));
            }
            else if (Array.isArray(arg)) {
                for (let element of arg) {
                    array.push(element.toString());
                }
            }
            else if (typeof arg == 'object') {
                if (arg !== null) {
                    array = array.concat(Object.keys(arg));
                }
            }
            else if (typeof arg == 'string') {
                array.push(arg);
            }
        }
  
        return array;
    }
  
    clear(...args) {
        if (args.length) {
            StringSet.arrayify(...args).forEach(el => delete this.values[el.toString()]);
        }
        else {
            this.values = {};
        }

        return this;
    }
  
    equals(...args) {
        let keys = Object.keys(this.values);
        let array = StringSet.arrayify(...args);
  
        if (keys.length == array.length) {
            for (let i = 0; i < array.length; i++) {
                let el = array[i];
  
                if (!(el in this.values)) {
                    return false;
                }
            }
  
            return true;
        }

        return false;
    }
  
    forEach(callback) {
        Object.keys(this.values).forEach(key => {
            callback(key);
        });

        return this;
    }
  
    getLength() {
        return Object.keys(this.values).length;
    }
  
    getValues() {
        return Object.keys(this.values);
    }
  
    has(str) {
        return this.hasAll(str);
    }
  
    hasAll(...args) {
        for (let element of StringSet.arrayify(...args)) {
            if (!(element in this.values)) {
                return false;
            }
        }
  
        return true;
    }
  
    hasAny(...args) {
        for (let element of StringSet.arrayify(...args)) {
            if (element in this.values) {
                return true;
            }
        }
  
        return false;
    }
  
    static intersectionOf(...args) {
        let intersection = mkStringSet();

        for (let element of StringSet.arrayify(...args)) {
            intersection.values[element] = '';       
        }
  
        return intersection;
    }
  
    isEmpty() {
        return Object.keys(this.values).length == 0;
    }
  
    isSubsetOf(...args) {
        let superset = mkStringSet(...args);

        if (this.getLength() <= superset.getLength()) {
            for (let element of Object.keys(this.values)) {
                if (!(element in superset.values)) {
                    return false;
                }
            }

            return true;
        }
  
        return false;
    }
  
    isSupersetOf(...args) {
        if (this.getLength() >= args.length) {
            for (let element of mkStringSet(...args)) {
                if (!(element in this.values)) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }
  
    set(...args) {
        StringSet.arrayify(...args).forEach(el => this.values[el.toString()] = '');
        return this;
    }

    [Symbol.iterator]() {
        return Object.keys(this.values)[Symbol.iterator]();
    }

    toArray() {
        return StringSet.arrayify(this);
    }

    toString() {
        return `StringSet: [ ${Object.keys(this.values).sort().join(', ')} ]`;
    }
  
    static unionOf(...args) {
        return mkStringSet(...args);
    }
});
