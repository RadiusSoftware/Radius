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
 * JSON conversion for dates is somewhat problematic.  Dates are converted to
 * a string when strifified, but there's not good way to identify that a date
 * should be parsed back into a Date without already knowing which specific
 * properties or values should be restored as a date.  Hence, the extended
 * version for JSON conversion uses the Kode extended JSON format to be able
 * to automatically identify and restore the orignal values.  This new toJSON
 * function for the Date prototype takes care of this for dates.
*****/
let extension = true;
const stringifyDate = Date.prototype.toJSON;
const stringifyBuffer = Buffer.prototype.toJSON;

Date.prototype.toJSON = function() {
    if (extension) {
        return { '#DATE': this.valueOf() };
    }
    else {
        return Reflect.apply(stringifyDate, this, []);
    }
};

Buffer.prototype.toJSON = function() {
    if (extension) {
        return { '#BUFFER': this.toString('base64') };
    }
    else {
        return Reflect.apply(stringifyBuffer, this, []);
    }
};


/*****
 * As specified above, these functions provide backward compatibility with
 * Javascript's builtin JSON features.  Within the Kode framework, develoeprs
 * need to use these global functions in place of JSON.stirngify() and
 * JSON.parse().
*****/
register('', function toStdJson(value, humanReadable) {
    extension = false;

    if (humanReadable) {
        return JSON.stringify(value, null, 4);
    }
    else {
        return JSON.stringify(value);
    }
});

register('', function fromStdJson(value, humanReadable) {
    return JSON.parse(value);
});


/*****
 * The framework's toJson() and fromJson() functions are required in many
 * instances with regards to messaging.  The type and instance information is
 * retained for the core framework objects as well as objects of registered
 * classes.  This is accomplished by taking objects of specific types and
 * generating JSON "escape sequences" that are picked up at the receiving end
 * to recreate and exact copy of the original.  Theese functions DO NOT WORK
 * where objects have circular references such a self-referencing trees. Notice
 * the user of the Data prototype modifier.  That's because Dates are converted
 * to strings before they even reach the strinigifier function.
*****/
register('', function toJson(value, humanReadable) {
    extension = true;

    return JSON.stringify(value, (key, value) => {
        if (value === null) {
            return { '#NULL': 0 };
        }
        else if (typeof value == 'undefined') {
            return { '#UNDEFINED': 0 };
        }
        else if (Number.isNaN(value)) {
            return { '#NAN': 0 };
        }
        else if (typeof value == 'symbol') {                
            return undefined;
        }
        else if (value instanceof Time) {
            return { '#TIME': value.valueOf() };
        }
        else if (value instanceof Date) {
            return { '#Date': value.valueOf() };
        }
        else if (value instanceof RegExp) {
            return { '#REGEX': value.toString() };
        }
        else if (typeof value == 'function') {
            return { '#FUNC': mkBuffer(value.toString()).toString('base64') };
        }
        else if (value instanceof Buffer) {
            return { '#BUFFER': value.toString() };
        }
        else if (typeof value == 'bigint') {
            return { '#BIG': value.toString() };
        }
        else if (typeof value == 'object') {
            let prototype = Reflect.getPrototypeOf(value);
            let ctor = prototype.constructor;
            
            if (ctor.name == 'Object') {
                return value;
            }
            else {
                let decorated = Data.copy(value);
                decorated['#CTOR'] = ctor.name;

                if ('#NAMESPACE' in ctor) {
                    decorated['#NAMESPACE'] = ctor['#NAMESPACE'];
                }

                return decorated;
            }
        }

        return value;
    }, humanReadable ? 4 : 0);
});


/*****
 * The framework's toJson() and fromJson() functions are required in many
 * instances with regards to messaging.  The type and instance information is
 * retained for the core framework objects as well as objects of registered
 * classes.  This is accomplished by taking objects of specific types and
 * generating JSON "escape sequences" that are picked up at the receiving end
 * to recreate and exact copy of the original.  Theese functions DO NOT WORK
 * where objects have circular references such a self-referencing trees.
*****/
register('', function fromJson(json) {
    return JSON.parse(json, (key, value) => {
        if (typeof value == 'object' && !Array.isArray(value)) {
            if ('#NULL' in value) {
                return null;
            }
            else if ('#UNDEFINED' in value) {
                return undefined;
            }
            else if ('#NAN' in value) {
                return NaN;
            }
            else if ('#TIME' in value) {
                return mkTime(value['#TIME']);
            }
            else if ('#DATE' in value) {
                return mkTime(value['#DATE']);
            }
            else if ('#REGEX' in value) {
                return new RegExp(value['#REGEX']);
            }
            else if ('#FUNC' in value) {
                try {
                    let func;
                    eval('func=' + mkBuffer(value['#FUNC'], 'base64').toString());
                    return func;
                }
                catch (e) {
                    caught(e);
                    return mkBuffer(value['#FUNC'], 'base64').toString();
                }
            }
            else if ('#BUFFER' in value) {
                return mkBuffer(value['#BUFFER'], 'base64');
            }
            else if ('#BIG' in value) {
                return BigInt(value['#BIG']);
            }
            else if (typeof value == 'object') {
                if ('#CTOR' in value) {
                    let constructed;

                    try {
                        if (value['#NAMESPACE']) {
                            eval(`constructed = Reflect.construct(${value['#NAMESPACE']}.${value['#CTOR']}, [])`);
                        }
                        else {
                            eval(`constructed = Reflect.construct(${value['#CTOR']}, [])`);
                        }
                    } catch (e) {}

                    if (constructed) {
                        return constructed;
                    }
                }
            }
        }
 
        return value;
    }
)});
