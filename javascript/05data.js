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


singleton(class Data {
    /*****
     * Performs a binary search and returns the index, at which to insert the value
     * into the given array.  If the array contains one or more values (in a sequence)
     * of the same value and the provided value matches the sequence, the returned
     * index will be right at the start of that sequence.  Given a valid parameter
     * set, this function will always return a valid index.
    *****/
    binarySearch(array, func, value) {
        let l = 0;
        let r = array.length - 1;
    
        while (l <= r) {
            if (value <= func(array[l])) {
                return l;
            }
            else if (value > func(array[r])) {
                return r + 1;
            }
    
            let m = Math.floor((r - l)/2 + l);
            let v = func(array[m]);
    
            if (value <= v) {
                r = m;
            }
            else {
                l = m + 1;
            }
        }
    
        return l;
    }

    /*****
     * This utility provides a robust algorithm for deeply cloning any javascript
     * value, including objects and arrays with circular references.  When viewing
     * this code below, remember that javascript non-object values, NOVs, are
     * immutable.  Hence, there's no need to clone them.  If an immutable value is
     * passed as the argument, it is simply returned.  If an object is passed, it
     * gets interesting.  Now we have to recursively create new objects to be clones
     * and add values from the source object network.  We need the weak map to
     * keep instances of objects and arrays to know where they link when there are
     * circular references.
    *****/
    clone(value) {
        let clone;
        let stack = [];
        let cloned = new WeakMap();

        if (Array.isArray(value)) {
            clone = new Array(value.length);
            cloned.set(value, clone);

            for (let i = 0; i < value.length; i++) {
                stack.push({ dst: clone, value: value[i], key: i });
            }
        }
        else if (typeof value == 'object') {
            clone = new Object();
            cloned.set(value, clone);

            for (let key of Object.keys(value).reverse()) {
                stack.push({ dst: clone, value: value[key], key: key });
            }
        }
        else {
            clone = value;
        }

        while (stack.length) {
            let item = stack.pop();

            if (Array.isArray(item.value)) {
                if (!cloned.has(item.value)) {
                    let array = new Array(item.value.length);
                    cloned.set(item.value, array);

                    for (let i = 0; i < item.value.length; i++) {
                        stack.push({ dst: array, value: item.value[i], key: i });
                    }

                    item.dst[item.key] = array;
                }
                else {
                    item.dst[item.key] = cloned.get(item.value);
                }
            }
            else if (typeof item.value == 'object') {
                if (item.value === null) {
                    item.dst[item.key] = null;
                }
                else {
                    if (!cloned.has(item.value)) {
                        if (item.value['#singleton']) {
                            item.dst[item.key] = item.value;
                        }
                        else {
                            let object = new Object();
                            cloned.set(item.value, object);
                
                            for (let key of Object.keys(item.value).reverse()) {
                                stack.push({ dst: object, value: item.value[key], key: key });
                            }

                            item.dst[item.key] = object;
                        }
                    }
                    else {
                        item.dst[item.key] = cloned.get(item.value);
                    }
                }
            }
            else {
                item.dst[item.key] = item.value;
            }
        }

        return clone;
    }

    /*****
     * This function compares two generic js values to determine whether they are
     * one of eq, lt, le, gt, or get.  The return value is one of these values.
     * For aggregate values, objects, that means comparing the instance types and
     * all of their content to determine if there are any differences.  For
     * arrays, that includes checking the length and order of the array elements.
     * This function is fully recursive and can deal with circular references.
    *****/
    compare(a, b) {
        let jsType = getJsType(a);

        if (jsType === getJsType(b)) {
            return jsType.compare(a, b);
        }
        else {
            return 'ne';
        }
    }
    
    /*****
     * Function to create a shallow copy of the original or src object.  A shallow
     * copy is especially useful when the src contains browser-based DOM objects, in
     * which case a deep clone is not practical to generated.
    *****/
    copy(value, arg) {
        if (Array.isArray(value)) {
            let copy = value.slice(0);

            if (Array.isArray(arg)) {
                copy = copy.concat(arg);
            }

            return copy;
        }
        else if (typeof value == 'object') {
            let copy = Object.assign(new Object(), value);

            if (typeof arg == 'object') {
                Object.assign(copy, arg);
            }

            return copy;
        }
        else {
            return value;
        }
    }

    /*****
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * deletes that object property.
    *****/
    delete(obj, dotted) {
        if (StringType.verify(dotted)) {
            let object = obj;
            let segments = RdsText.split(dotted, '.');

            for (let i = 0; i < segments.length; i++) {
                let segment = segments[i];

                if (i == segments.length - 1) {
                    delete object[segment];
                }
                else {
                    if (!ObjectType.verify(object[segment])) {
                        break;
                    }

                    object = object[segment];
                }
            }
        }

        return obj;
    }

    /*****
     * Generates an array containing the class hierarchy list for the given class.
     * The first element of the returned hierarchy contains the class itself.  As
     * we dig down into base classes, they are pushed onto the array value, such
     * that the very last element will be the last super class above Object.
    *****/
    enumerateClassHierarchy(arg) {
        let ctor;
        let classes = [];
    
        if (typeof arg == 'object') {
            ctor = Reflect.getPrototypeOf(arg).constructor;
        }
        else if (typeof arg == 'function' && arg.toString().startsWith('class')) {
            ctor = arg;
        }
    
        if (ctor) {
            classes.push(ctor);

            while (ctor.prototype) {
                ctor = Reflect.getPrototypeOf(ctor);

                if (ctor.name) {
                    classes.push(ctor);
                }
            }
        }
    
        return classes;
    }

    /*****
     * A handy utility for creating and returning an array of prototypes for the
     * provided object.  The prototype array is sort from the most super class
     * to the most subclass.  Note that this last element of the return array is
     * the object itself.
    *****/
    enumeratePrototypes(obj) {
        let prototypes = [];

        if (ObjectType.verify(obj)) {
            let prototype = Reflect.getPrototypeOf(obj).constructor.prototype;

            while (prototype) {
                prototypes.unshift({
                    className: prototype.constructor.name,
                    prototype: prototype,
                });

                prototype = Reflect.getPrototypeOf(prototype);
            }
        }

        return prototypes;
    }

    /*****
     * Tests whether two values are strictly equal.
    *****/
    eq(a, b) {
        return this.compare(a, b) == 'eq';
    }

    /*****
     * This has essentially one use.  It's shorthand for determining whether a
     * CTOR function, i.e., class, is a sub ctor-class of the given base ctor.
     * This function expects that both of the arguments are functions, class ctors
     * to be more specific.
    *****/
    extends(clss, base) {
        for (let prototype of this.enumerateClassHierarchy(clss)) {
            if (prototype === base) {
                return true;
            }
        }
    
        return false;
    }

    /*****
     * Simple utility that can check the lineage of a specific object.  It's
     * purpose is to return a boolean indicating whether the specific obj value
     * directly extends the specified base class.
    *****/
    extendsDirectly(obj, baseClass) {
        let heirarchy = this.enumerateClassHierarchy(obj);
        return heirarchy[1] === baseClass;
    }

    /*****
     * This utility function flattens a complex object into a single object containing
     * all of the properties of the original object.  There can be cases where sub-
     * object property names may clash with other sub-object property names.  That's
     * where the "override" parameter comes in play.  If override is true, sub-object
     * values will overwrite previously written property values on the flat object.
    *****/
    flatten(object, override) {
        const flat = {};
        const stack = [object];
    
        const useAsValue = value => {
            if (typeof value == 'object') {
                for (let ctor of [ Date ]) {
                    if (value instanceof ctor) {
                        return true;
                    }
                }
    
                return false;
            }
    
            return true;
        };
    
        while (stack.length) {
            let obj = stack.pop();
    
            for (let property in obj) {
                let value = obj[property];
    
                if (useAsValue(value)) {
                    if (override || !(property in flat)) {
                        flat[property] = obj[property];
                    }
                }
                else {
                    stack.push(value);
                }
            }   
        }
    
        return flat;
    }

    /*****
     * Tests if a is strictly greater than or equal to b.
    *****/
    ge(a, b) {
        return this.compare(a, b) in { eq:0, gt:0 };
    }

    /*****
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * returns the implied value or undefined if the path does NOT exist within
     * the object structure.
    *****/
    get(obj, dotted) {
        if (StringType.verify(dotted)) {
            let value = obj;

            for (let key of RdsText.split(dotted, '.')) {
                if (!ObjectType.verify(value)) {
                    return undefined;
                }

                if (key in value) {
                    value = value[key];
                }
                else {
                    return undefined;
                }
            }

            return value;
        }

        return undefined;
    }

    /*****
     * Tests if a is strictly greater than b.
    *****/
    gt(a, b) {
        return this.compare(a, b) == 'gt';
    }

    /*****
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * returns true if the implied value exits and false otherwise.
    *****/
    has(obj, dotted) {
        if (StringType.verify(dotted)) {
            let value = obj;

            for (let key of RdsText.split(dotted, '.')) {
                if (!ObjectType.verify(value)) {
                    return false;
                }

                if (key in value) {
                    value = value[key];
                }
                else {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    /*****
     * Tests if a is strictly less than or equal to b.
    *****/
    le(a, b) {
        return this.compare(a, b) in { eq:0, lt:0 };
    }

    /*****
     * Tests if a is strictly less than b.
    *****/
    lt(a, b) {
        return this.compare(a, b) == 'lt';
    }

    /*****
     * Tests whether two values are NOT strictly equal.
    *****/
    ne(a, b) {
        return this.compare(a, b) != 'eq';
    }

    /*****
     * Given a dotted path, an object, and a value, ensure the entire path in
     * dotted exists and set the value.  Note that conflicting values along the
     * way will be overwritten to accompated the provided dotted path.
    *****/
    set(obj, dotted, value) {
        if (StringType.verify(dotted)) {
            let object = obj;
            let segments = RdsText.split(dotted, '.');

            for (let i = 0; i < segments.length; i++) {
                let segment = segments[i];

                if (i == segments.length - 1) {
                    object[segment] = value;
                }
                else {
                    if (!ObjectType.verify(object[segment])) {
                        object[segment] = new Object();
                    }

                    object = object[segment];
                }
            }
        }

        return obj;
    }
});