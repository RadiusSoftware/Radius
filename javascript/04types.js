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
 * Data type singletons who job is to support data-type conversions, validation,
 * and other sorts of checking.  The base class, BaseType, can be extended by
 * other modules to create specific Type subclasses with features specific to
 * that class.  Types is part of the foundation for supporting database objects,
 * and objects derived from ProtoType.
*****/
define(class BaseType {
    compare(a, b) {
        let jsType = getJsType(a);

        if (jsType === getJsType(b)) {
            if (a > b) {
                return 'gt';
            }

            if (a < b) {
                return 'lt';
            }

            if (a === b) {
                return 'eq';
            }
        }
        
        return 'ne';
    }

    getName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }
});

singleton(class AnyType extends BaseType {
    fromString(str) {
        return undefined;
    }

    getDefault() {
        return undefined;
    }

    isScalar() {
        return undefined;
    }

    toBool(value) {
        let jsType = getJsType(value);

        if (jsType !== undefined) {
            return jsType.toBool(value);
        }

        return false;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        let jsType = getJsType(value);
        return jsType !== undefined;
    }
});

singleton(class ArrayType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            for (let i = 0; i < a.length && i < b.length; i++) {
                let ela = a[i];
                let elb = b[i];
                let jsType = getJsType(ela);

                if (getJsType(elb) !== jsType) {
                    return 'ne';
                }

                let comp = jsType.compare(ela, elb);

                if (comp != 'eq') {
                    return comp;
                }
            }

            if (a.length > b.length) {
                return 'gt';
            }

            if (a.length < b.length) {
                return 'lt';
            }

            return 'eq';
        }
        
        return 'ne';
    }

    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return new Array();
    }

    isScalar() {
        return false;
    }

    toBool(value) {
        return value.length > 0;
    }

    toString(value) {
        return `[${value.forEach(el => el.toString())}]`;
    }

    verify(value) {
        return Array.isArray(value);
    }
});

singleton(class BigIntType extends BaseType {
    fromString(str) {
        return BigInt(str);
    }

    getDefault() {
        return 0n;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0n;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        return typeof value == 'bigint';
    }
});

singleton(class BooleanType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            if (a === true) {
                return a === b ? 'eq' : 'gt';
            }
            else if (b === true) {
                return 'lt';
            }
            else {
                return 'eq';
            }
        }

        return 'ne';
    }

    fromString(str) {
        let bool;
        eval(`bool = ${str} === true`);
        return bool;
    }

    getDefault() {
        return false;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        return typeof value == 'boolean' || value instanceof Boolean;
    }
});

singleton(class BufferType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            let comp = Buffer.compare(a, b);

            if (comp == -1) {
                return 'lt';
            }
            else if (comp == 1) {
                return 'gt';
            }

            return 'eq';
        }

        return 'ne';
    }

    fromString(str, coding) {
        return mkBuffer(str, coding ? coding : 'hex');
    }

    getDefault() {
        return mkBuffer();
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value.length > 0;
    }

    toString(value) {
        return value.toString('base64');
    }

    verify(value) {
        return value instanceof Buffer;
    }
});

singleton(class ClassType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            if (a.name == b.name) {
                return 'eq';
            }

            return a.name > b.name ? 'gt' : 'lt';
        }

        return 'ne';
    }

    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return new Object();
    }

    instanceOf(clss, value) {
        if (this.verify(clss)) {
            return value instanceof clss;
        }

        return false;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return true;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (typeof value == 'function') {
            if (value.toString().startsWith('class ')) {
                return true;
            }

            if (value.toString().match(/\[native code\]/)) {
                return nativeClasses.has(value.name);
            }
        }

        return false;
    }
});

singleton(class DateType extends BaseType {
    compare(a, b) {
        if (getJsType(a) === this && getJsType(b) === this) {
            return super.compare(a.valueOf(), b.valueOf());
        }

        return 'ne';
    }

    fromString(str) {
        return mkTime(str);
    }

    getDefault() {
        return new Date(0);
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value.valueOf() != 0;
    }

    toString(value) {
        return value.toISOString();
    }

    verify(value) {
        return value instanceof Date;
    }
});

singleton(class DateTimeType extends BaseType {
    compare(a, b) {
        if (getJsType(a) === this && getJsType(b) === this) {
            return super.compare(a.valueOf(), b.valueOf());
        }

        return 'ne';
    }

    fromString(str) {
        return mkTime(str);
    }

    getDefault() {
        return new Date(0);
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value.valueOf() != 0;
    }

    toString(value) {
        return value.toISOString();
    }

    verify(value) {
        return value instanceof Date;
    }
});

singleton(class DoubleType extends BaseType {
    fromString(str) {
        return parseFloat(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            return typeof value == 'number' || value instanceof Number;
        }

        return false;
    }
});

singleton(class EnumType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            let aKeys = Object.keys(a.values).sort();
            let bKeys = Object.keys(b.values).sort();

            for (let i = 0; i < aKeys.length && i < bKeys.length; i++) {
                if (aKeys[i] > bKeys[i]) {
                    return 'gt';
                }

                if (aKeys[i] < bKeys[i]) {
                    return 'lt';
                }
            }

            if (aKeys.length == bKeys.length) return 'eq';
            return aKeys.length > bKeys.length ? 'gt' : 'lt';
        }

        return 'ne';
    }

    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return mkRdsEnum();
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value.length > 0;
    }

    toString(value) {
        return value;
    }

    verify(value) {
        return value instanceof RdsEnum;
    }
});

singleton(class FunctionType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            if (a.name == b.name) {
                return 'eq';
            }

            return a.name > b.name ? 'gt' : 'lt';
        }

        return 'ne';
    }

    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return () => {};
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return true;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        return typeof value == 'function';
    }
});

singleton(class JsonType extends BaseType {
    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return new Object();
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        if (this.verify(value)) {
            return toJson(fromJson(value)) != {};
        }
        
        return false;
    }

    toString(value) {
        return toJson(value);
    }

    verify(value) {
        try {
            let object = fromJson(value);
            return true;
        }
        catch (e) {}
        return false;
    }
});

singleton(class NullType extends BaseType {
    fromString(str) {
        return fromJson(null);
    }

    getDefault() {
        return null;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return false;
    }

    toString(value) {
        return 'null';
    }

    verify(value) {
        return value === null;
    }
});

singleton(class NumberType extends BaseType {
    fromString(str) {
        if (str.indexOf('.') >= 0) {
            return parseFloat(str);
        }
        else {
            return parseInt(str);
        }
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            return typeof value == 'number' || value instanceof Number;
        }

        return false;
    }
});

singleton(class NumericType extends BaseType {
    fromString(str) {
        if (str.indexOf('.') >= 0) {
            return parseFloat(str);
        }
        else {
            return parseInt(str);
        }
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        if (typeof value == 'bigint') return valjue != 0n;
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            return typeof value == 'number' || value instanceof Number;
        }

        return false;
    }
});

singleton(class ObjectType extends BaseType {
    compare(a, b) {
        let stack = [{ a: a, b: b, path: '' }];
        let circular = new WeakMap();
        
        while (stack.length) {
            let { a, b, path } = stack.pop();
            
            if (this.verify(a)) {
                if (this.verify(b)) {
                    let aPath = circular.get(a);
                    let bPath = circular.get(b);

                    if (StringType.verify(aPath) || StringType.verify(bPath)) {
                        if (aPath === bPath) {
                            continue;
                        }
                        else {
                            return 'ne';
                        }
                    }
                    
                    let aKeys = Object.keys(a).sort();
                    let bKeys = Object.keys(b).sort();

                    circular.set(a, path);
                    circular.set(b, path);

                    for (let i = 0; i < aKeys.length && i < bKeys.length; i++) {
                        let aKey = aKeys[i];
                        let bKey = bKeys[i];

                        if (aKey > bKey) {
                            return 'gt';
                        }

                        if (aKey < bKey) {
                            return 'lt';
                        }

                        let aValue = a[aKey];
                        let bValue = b[bKey];

                        let backPath = path ? `${path}.${aKey}` : aKey;
                        stack.push({ a: aValue, b: bValue, path: backPath });
                    }

                    if (aKeys.length > bKeys.length) return 'gt';
                    if (aKeys.length < bKeys.length) return 'lt';
                }
                else {
                    return 'ne';
                }
            }
            else {
                let comp = Data.compare(a, b);

                if (comp != 'eq') {
                    return comp;
                }
            }
        }
        
        return 'eq';
    }

    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return new Object();
    }

    isScalar() {
        return false;
    }

    toBool(value) {
        return Object.keys(value).length > 0;
    }

    toString(value) {
        return toJson(value);
    }

    verify(value) {
        if (typeof value != 'object') return false;
        if (value === null) return false;
        if (Array.isArray(value)) return false;
        if (value instanceof Boolean) return false;
        if (value instanceof Buffer) return false;
        if (value instanceof Date) return false;
        if (value instanceof Number) return false;
        if (value instanceof RegExp) return false;
        if (value instanceof String) return false;
        if (value instanceof Time) return false;
        return true;
    }
});

singleton(class RegexType extends BaseType {
    compare(a, b) {
        if (this.verify(a) && this.verify(b)) {
            if (a.toString() == b.toString()) return 'eq';
            return a.toString() > b.toString() ? 'gt' : 'lt';
        }

        return 'ne';
    }

    fromString(str, flags) {
        return new RegExp(str, flags);
    }

    getDefault() {
        return new RegExp('.*');
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return true;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        return value instanceof RegExp;
    }
});

singleton(class StringType extends BaseType {
    fromString(str) {
        return str;
    }

    getDefault() {
        return '';
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        if (value.toLowerCase() == 'true') return true;
        if (value.toLowerCase() == 'false') return false;
        return value.length > 0;
    }

    toString(value) {
        return value;
    }

    verify(value) {
        return typeof value == 'string' || value instanceof String;
    }
});

singleton(class UndefinedType extends BaseType {
    fromString(str) {
        return undefined;
    }

    getDefault() {
        return undefined;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return false;
    }

    toString(value) {
        return 'undefined';
    }

    verify(value) {
        return typeof value == 'undefined';
    }
});

singleton(class Float32Type extends classOf(NumberType) {
    fromString(str) {
        return parseFloat(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            return typeof value == 'number' || value instanceof Number;
        }

        return false;
    }
});

singleton(class Float64Type extends classOf(BigIntType) {
    fromString(str) {
        return parseDouble(str);
    }

    getDefault() {
        return 0n;
    }

    is(value) {
        if (value != NaN) {
            return typeof value == 'number' || value instanceof Number;
        }

        return false;
    }

    toBool(value) {
        return value != 0n;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        return typeof value == 'bigint';
    }
});

singleton(class Int8Type extends classOf(NumberType) {
    fromString(str) {
        return parseInt(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            if (typeof value == 'number' || value instanceof Number) {
                if (value <= 127) {
                    if (value >= -128) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
});

singleton(class Int16Type extends classOf(NumberType) {
    fromString(str) {
        return parseInt(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            if (typeof value == 'number' || value instanceof Number) {
                if (value <= 32767) {
                    if (value >= -32768) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
});

singleton(class Int32Type extends classOf(NumberType) {
    fromString(str) {
        return parseInt(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            if (typeof value == 'number' || value instanceof Number) {
                if (value <= 2147483647) {
                    if (value >= -2147483648) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
});

singleton(class Int64Type extends classOf(BigIntType) {
    fromString(str) {
        return BigInt(str);
    }

    getDefault() {
        return 0n;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        return typeof value == 'bigint';
    }
});

singleton(class UInt8Type extends classOf(NumberType) {
    fromString(str) {
        return parseInt(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            if (typeof value == 'number' || value instanceof Number) {
                if (value <= 255) {
                    if (value >= 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
});

singleton(class UInt16Type extends classOf(NumberType) {
    fromString(str) {
        return parseInt(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            if (typeof value == 'number' || value instanceof Number) {
                if (value <= 65535) {
                    if (value >= 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
});

singleton(class UInt32Type extends classOf(NumberType) {
    fromString(str) {
        return parseInt(str);
    }

    getDefault() {
        return 0;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (value != NaN) {
            if (typeof value == 'number' || value instanceof Number) {
                if (value <= 4294967295) {
                    if (value >= 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
});

singleton(class UInt64Type extends classOf(BigIntType) {
    fromString(str) {
        return BigInt(str);
    }

    getDefault() {
        return 0n;
    }

    isScalar() {
        return true;
    }

    toBool(value) {
        return value != 0n;
    }

    toString(value) {
        return value.toString();
    }

    verify(value) {
        if (typeof value == 'bigint') {
            return value >= 0n;
        }

        return false;
    }
});


/*****
 * A (hopefully) exhaustive list of native Javascript classes.
*****/
const nativeClasses = mkRdsEnum(
    'Array',
    'ArrayBuffer',
    'AsyncGenerator',
    'AsyncInterator',
    'Boolean',
    'DataView',
    'Date',
    'Generator',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Int64Array',
    'Iterator',
    'Math',
    'Number',
    'Object',
    'Proxy',
    'String',
    'Symbol',
    'UInt8Array',
    'UInt16Array',
    'UInt32Array',
    'UInt64Array',
    'WeakMap',
);


/*****
 * Global function that returns the essential javascript data type for the
 * given value.  Note that the essential data type does not include constrained
 * types such as Int16 or UInt32.  Constrained types cannot be infered from a
 * single value and constrained are not used with the expressions framework.
*****/
define(function getJsType(value) {
    if (value === null) return NullType;
    if (value === undefined) return UndefinedType;

    let typename = typeof value;
    if (typename == 'bigint') return BigIntType;
    if (typename == 'boolean') return BooleanType;
    if (typename == 'number') return NumberType;
    if (typename == 'string') return StringType;

    if (typename == 'function') {
        if (ClassType.verify(value)) {
            return ClassType;
        }

        return FunctionType;
    }

    if (typename == 'object') {
        if (Array.isArray(value)) return ArrayType;
        if (value instanceof Boolean) return BooleanType;
        if (value instanceof Buffer) return BufferType;
        if (value instanceof Date) return DateType;
        if (value instanceof RdsEnum) return EnumType;
        if (value instanceof Number) return NumberType;
        if (value instanceof RegExp) return RegexType;
        if (value instanceof String)  return StringType;
        if (value instanceof Time)  return TimeType;
        return ObjectType;
    }

    return undefined;
});