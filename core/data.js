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
                let object = new Object();
    
                for (let key of Object.keys(item.value).reverse()) {
                    stack.push({ dst: object, value: item.value[key], key: key });
                }

                item.dst[item.key] = object;
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
    copy(value) {
        if (Array.isArray(value)) {
            return value.slice(0);
        }
        else if (typeof value == 'object') {
            return Object.assign(new Object(), value);
        }
        else {
            return value;
        }
    }
});