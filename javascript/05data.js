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
     * This is the most generic and powerful comparison function for two js values.
     * The return value is a simple boolean specifying whether the two argument
     * values are identical.  For aggregate values, objects, that means comparing
     * the instance types and all of their contents to determine if there are any
     * differences.  For arrays, that includes checking the length and order of
     * the array elements.  This function is fully recursive and can deal with
     * circular references.
    *****/
    areEqual(a, b) {
        let stack = [{ a: a, b: b }];
        let circular = new WeakMap();
        
        while (stack.length) {
            let { a, b } = stack.pop();
            
            if (ObjectType.verify(a)) {
                if (ObjectType.verify(b)) {
                    if (circular.has(a)) {
                        if (circular.get(a) !== b) {
                            return false;
                        }
                    }
                    else {
                        if (a instanceof Reflect.getPrototypeOf(b).constructor) {
                            circular.set(a, b);
             
                            if (Array.isArray(a)) {
                                if (a.length == b.length) {
                                    for (let i = 0; i < a.length; i++) {
                                        stack.push({ a: a[i], b: b[i] });
                                    }
                                }
                                else {
                                    return false;
                                }
                            }
                            else {
                                let keysA = Object.keys(a);
             
                                if (keysA.length == Object.keys(b).length) {
                                    for (let key of keysA) {
                                        if (key in b) {
                                            stack.push({ a: a[key], b: b[key]});
                                        }
                                        else {
                                            return false;
                                        }
                                    }
                                }
                                else {
                                    return false;
                                }
                            }
                        }
                        else {
                            return false;
                        }
                    }
                }
                else {
                    return false;
                }
            }
            else if (a !== b) {
                return false;
            }
        }
        
        return true;
    }

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
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * deletes that object property.
    *****/
    delete(obj, dotted) {
        if (StringType.is(dotted)) {
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
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * returns the implied value or undefined if the path does NOT exist within
     * the object structure.
    *****/
    get(obj, dotted) {
        if (StringType.is(dotted)) {
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
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * returns true if the implied value exits and false otherwise.
    *****/
    has(obj, dotted) {
        if (StringType.is(dotted)) {
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
     * Given an object and a "dotted path", e.g., x.alpha.numeric, this method
     * sets the provided value and extends data points if necessary.
    *****/
    set(obj, dotted, value) {
        if (StringType.is(dotted)) {
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


/*****
 * Shapes are used for providing control over data types by adding features to
 * define a data shape, validate a data shape, and to transfer data meta data
 * across processes as required.  A shape is a single object, except when the
 * shape represents an object, in which case, the second ctor parameter must be
 * an object describing the shape's subshape.
*****/
define(class RdsShape {
    constructor(arg, ...values) {
        if (arg != undefined) {
            if (arg instanceof RdsShape) {
                return arg;
            }
            else if (arg === ObjectType) {
                thrrowError('ObjectType is not a ctor parameter');
            }
            else if (arg === EnumType) {
                thrrowError('EnumType is not a ctor parameter');
            }
            else if (ArrayType.verify(arg)) {
                this.type = ArrayType;
                this.vals = arg.map(el => mkRdsShape(el));
            }
            else if (ClassType.verify(arg)) {
                this.type = ClassType;
                this.clss = arg;
            }
            else if (EnumType.verify(arg)) {
                this.type = EnumType;
                this.enum = arg;
            }
            else if (arg instanceof BaseType) {
                this.type = arg;
            }
            else if (ObjectType.verify(arg)) {
                this.type = ObjectType;
                this.keys = {};

                for (let key in arg) {
                    this.keys[key] = mkRdsShape(arg[key]);
                }
            }
            else if (RegexType.verify(arg)) {
                this.type = StringType;
                this.expr = arg;
            }
            else {
                this.type = getJsType(arg);
            }
        }
    }

    static fromJson(obj) {
        let shape = mkRdsShape();
        shape.type = obj.type;
        obj.clss ? shape.clss = obj.clss : null;
        obj.enum ? shape.enum = obj.enum : null;
        obj.expr ? shape.expr = obj.expr : null;
        obj.keys ? shape.keys = obj.keys : null;
        obj.vals ? shape.vals = obj.vals : null;
        return shape;
    }

    getKeys() {
        return Object.keys(this.keys);
    }

    getType() {
        return this.type;
    }

    getValue(key) {
        if (this.keys) {
            return this.keys[key];
        }

        return undefined;
    }

    isArray() {
        return this.type === ArrayType;
    }

    isScalar() {
        return !this.isArray();
    }

    verify(value) {
        if (this.type === ArrayType) {
            return this.verifyArray(value);
        }
        else if (this.type == ObjectType) {
            return this.verifyObject((value));
        }
        else if (this.type == EnumType) {
            return this.enum.has(value);
        }
        else if (this.type == ClassType) {
            return ClassType.instanceOf(this.clss, value);
        }
        else if (this.type === StringType) {
            if (StringType.verify(value)) {
                if (this.expr) {
                    return value.match(this.expr) != null;
                }
                else {
                    return true;
                }
            }

            return false;
        }
        else {
            return this.type.verify(value);
        }
    }

    verifyArray(value) {
        if (!ArrayType.verify(value)) {
            return false;
        }

        for (let arrayElement of value) {
            let ok = false;

            for (let shape of this.vals) {
                if (shape.verify(arrayElement)) {
                    ok = true;
                    break;
                }
            }

            if (!ok) {
                return false;
            }
        }

        return true;
    }

    verifyObject(value) {
        if (!ObjectType.verify(value)) {
            return false;
        }

        for (let rawKey in this.keys) {
            let optional = rawKey.startsWith('_');
            let key = optional ? rawKey.substring(1) : rawKey;

            if (optional && !(key in value)) {
                continue;
            }
            
            if (!this.keys[rawKey].verify(value[key])) {
                return false;
            }
        }

        if (this.strict) {
            for (let key in value) {
                if (!(key in this.keys) && !(`_${key}` in this.keys)) {
                    return false;
                }
            }
        }

        return true;
    }

    verifyStrictly(value) {
        try {
            this.strict = true;
            return this.verify(value);
        }
        finally {
            delete this.strict;
        }
    }
});