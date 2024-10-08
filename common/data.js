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


singleton('', class Data {
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
            
            if (typeof a == 'object') {
                if (typeof b == 'object') {
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
     * This has essentially one use.  It's shorthand for determining whether a
     * CTOR function, i.e., class, is a sub ctor-class of the given base ctor.
     * This function expects that both of the arguments are functions, class ctors
     * to be more specific.
    *****/
    classExtends(clss, base) {
        for (let prototype of this.enumerateClassHierarchy(clss)) {
            if (prototype === base) {
                return true;
            }
        }
    
        return false;
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
    clone(value, arg) {
        let clone;
        let stack = [];

        if (Array.isArray(value)) {
            clone = new Array(value.length);

            for (let i = 0; i < value.length; i++) {
                stack.push({ dst: clone, value: value[i], key: i });
            }
        }
        else if (typeof value == 'object') {
            clone = new Object();

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
                let array = new Array(item.value.length);

                for (let i = 0; i < item.value.length; i++) {
                    stack.push({ dst: array, value: item.value[i], key: i });
                }

                item.dst[item.key] = array;
            }
            else if (typeof item.value == 'object') {
                if (item.value === null) {
                    item.dst = null;
                }
                else {
                    let object = new Object();
        
                    for (let key of Object.keys(item.value).reverse()) {
                        stack.push({ dst: object, value: item.value[key], key: key });
                    }

                    item.dst[item.key] = object;
                }
            }
            else {
                item.dst[item.key] = item.value;
            }
        }

        if (Array.isArray(arg)) {
            clone = clone.concat(arg);
        }
        else if (typeof arg == 'object') {
            Object.assign(clone, arg);
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
     * This utility function flattens a complex object into a single object containing
     * all of the properties of the original object.  There can be cases where sub-
     * object property names may clash with other sub-object property names.  That's
     * where the "override" parameter comes in play.  If override is true, sub-object
     * values will overwrite previously written property values on the flat object.
    *****/
    flattenObject(object, override) {
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
});


/*****
 * A data-shapes is contructed with a value and the end result is a tree-like
 * structure representing the topology and types of the data encountered, it's
 * the data structure of the passed value.  Given that a DataStruture is readily
 * converted to/from JSON, it's simply to pass data structures in interprocess
 * communications as needed.  When the DataShape constructor is called with
 * JSON, the original DataShape will be reconstituted to its former glory.
*****/
register('', class DataShape {
    constructor(value) {
        try {
            this.jso = fromJson(value);
            this.fromJson();
        }
        catch (e) {
            let arrayOf = false;
            let type = getJsType(value);

            if (Array.isArray(value)) {
                arrayOf = true;
                value = value[0];
                type = getJsType(value);
            }

            if (type == ObjectType) {
                this.struct = {
                    depth: 0,
                    type: ObjectType,
                    arrayOf: arrayOf,
                    struct: {},
                    value: value,
                };

                this.structify(this.struct);
            }
            else {
                this.struct = {
                    depth: 0,
                    type: type,
                    arrayOf: arrayOf,
                };
            }
        }
        finally {
            delete this.jso;
        }
    }

    enumerate() {
        let enumerated = [];
        let stack = [{ key: '', struct: this.struct }];

        while(stack.length) {
            let item = stack.pop();

            enumerated.push({
                key: item.key,
                depth: item.struct.depth,
                type: item.struct.type,
                arrayOf: item.struct.arrayOf,
            });

            if (item.struct.struct) {
                for (let key of Object.keys(item.struct.struct).reverse()) {
                    stack.push({ key: key, struct: item.struct.struct[key] });
                }
            }
        }

        return enumerated;
    }

    equalsStruct(dataStruct) {
        if (dataStruct instanceof DataShape) {
            let stack = [{ struct1: this.struct, struct2: dataStruct.struct }];

            while (stack.length) {
                let { struct1, struct2 } = stack.pop();
                if (struct1.depth != struct2.depth) return false;
                if (struct1.type != struct2.type) return false;
                if (struct1.arrayOf != struct2.arrayOf) return false;

                if (struct1.type == ObjectType) {
                    if (Object.keys(struct1.struct).length != Object.keys(struct2.struct).length) return false;

                    for (let key in struct1.struct) {
                        if (!(key in struct2.struct)) {
                            return false;
                        }

                        stack.push({
                            struct1: struct1.struct[key],
                            struct2: struct2.struct[key],
                        });
                    }
                }
            }

            return true;
        }

        return false;
    }

    fromJson() {
        if (this.jso.depth !== 0) throw 'error';
        if (typeof this.jso.arrayOf != 'boolean') throw 'error';

        let type;
        eval('type = globalThis[this.jso.type]');

        let rootStruct = {
            depth: this.jso.depth,
            type: type,
            arrayOf: this.jso.arrayOf,
        }

        if (rootStruct.type == ObjectType) {
            rootStruct.struct = {};
            let stack = [{ struct: rootStruct, jso: this.jso }];

            while (stack.length) {
                let entry = stack.pop();

                for (let key in entry.jso) {
                    if (key.startsWith('~~')) {
                        let name = key.substring(2);
                        eval('type = globalThis[entry.jso[key].type]');
    
                        entry.struct.struct[name] = {
                            depth: entry.jso[key].depth,
                            type: type,
                            arrayOf: entry.jso[key].arrayOf,
                        };
    
                        if (type == ObjectType) {
                            entry.struct.struct[name].struct = {};
                            stack.push({ struct: entry.struct.struct[name], jso: entry.jso[key] });
                        }
                    }
                }
            }
        }

        this.struct = rootStruct;
    }

    static shapeArray(struct, defaultArray, array) {
        let shapedArray;

        if (Array.isArray(array)) {
            if (struct.type == UndefinedType) {
                shapedArray = Data.clone(array);
            }
            else {
                shapedArray = [];

                for (let i = 0; i < array.length; i++) {
                    if (struct.type == ObjectType) {
                        shapedArray.push(DataShape.shapeObject(struct, defaultArray[i], array[i]));
                    }
                    else {
                        shapedArray.push(DataShape.shapeScalar(struct, defaultArray[i], array[i]));
                    }
                }
            }
        }
        else {
            shapedArray = Data.clone(defaultArray);
        }

        return shapedArray;
    }

    static shapeObject(struct, defaultValue, value) {
        let shapedObject = {};

        for (let key in struct.struct) {
            if (key in value) {
                if (getJsType(value[key]) == struct.struct[key].type) {
                    if (struct.struct[key].type == ObjectType) {
                        shapedObject[key] = DataShape.shapeObject(
                            struct.struct[key],
                            defaultValue[key],
                            value[key],
                        );
                    }
                    else {
                        shapedObject[key] = DataShape.shapeScalar(
                            struct.struct[key],
                            defaultValue[key],
                            value[key],
                        );
                    }
                }
                else if (Array.isArray(value[key])) {
                    shapedObject[key] = DataShape.shapeArray(
                        struct.struct[key],
                        defaultValue[key],
                        value[key],
                    );
                }
                else {
                    shapedObject[key] = Data.clone(defaultValue);
                }
            }
            else {
                shapedObject[key] = Data.clone(defaultValue);
            }
        }

        return shapedObject;
    }

    static shapeScalar(struct, defaultValue, value) {
        if (getJsType(value) == struct.type) {
            return Data.clone(value);
        }
        else if (Array.isArray(value[key])) {
            return DataShape.shapeArray(
                struct,
                defaultValue,
                value,
            );
        }
        else {
            return Data.clone(defaultValue);
        }
    }

    shapeValue(defaultValue, value) {
        let shaped;

        if (this.validateValue(defaultValue)) {
            if (this.struct.arrayOf) {
                shaped = DataShape.shapeArray(this.struct, defaultValue, value);
            }
            else if (this.struct.type == ObjectType) {
                shaped = DataShape.shapeObject(this.struct, defaultValue, value);
            }
            else {
                shaped = DataShape.shapeScalar(this.struct, defaultValue, value);
            }
        }

        return shaped;
    }

    structify(struct) {
        let stack = [ struct ];

        while (stack.length) {
            let struct = stack.pop();
            let value = struct.value;
            delete struct.value;

            if (struct.type == ObjectType) {
                for (let key in value) {
                    let arrayOf = false;
                    let property = value[key];
                    let type = getJsType(property);

                    if (Array.isArray(property)) {
                        arrayOf = true;
                        property = property[0];
                        type = getJsType(property);
                    }

                    if (type == ObjectType) {
                        struct.struct[key] = {
                            depth: struct.depth+ 1,
                            type: type,
                            arrayOf: arrayOf,
                            struct: {},
                            value: property,
                        };

                        stack.push(struct.struct[key]);
                    }
                    else {
                        struct.struct[key] = {
                            depth: struct.depth+ 1,
                            type: type,
                            arrayOf: arrayOf,
                        };
                    }
                }
            }
        }

        return struct;
    }

    [Symbol.iterator]() {
        return this.enumerate()[Symbol.interator]();
    }

    toJso() {
        let stack = [];

        let jso = {
            depth: this.struct.depth,
            type: this.struct.type.getName(),
            arrayOf: this.struct.arrayOf,
        };

        if (this.struct.type == ObjectType) {
            stack.push({ struct: this.struct, jso: jso });
        }

        while (stack.length) {
            let entry = stack.pop();

            for (let key of Object.keys(entry.struct.struct)) {
                let jso = {
                    depth: entry.struct.struct[key].depth,
                    type: entry.struct.struct[key].type.getName(),
                    arrayOf: entry.struct.struct[key].arrayOf,
                };

                entry.jso[`~~${key}`] = jso;

                if (entry.struct.struct[key].type == ObjectType) {
                    stack.push({ struct: entry.struct.struct[key], jso: jso })
                }
            }
        }

        return jso;
    }

    toJson(readable) {
        return toJson(this.toJso(), readable !== undefined);
    }

    toString() {
        return this.enumerate().map(struct => {
            return `${TextUtils.pad(struct.depth*4)}${struct.key}   ${struct.arrayOf ? `[ ${struct.type.getName()} ]` : struct.type.getName()}`;
        }).join('\n');
    }

    validateValue(value) {
        let dataStruct = mkDataShape(value);
        return this.equalsStruct(dataStruct);
    }
});