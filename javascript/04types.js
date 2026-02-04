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
    getName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }
});

singleton(class ArrayType extends BaseType {
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

singleton(class DateType extends BaseType {
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
    fromString(str) {
        return fromJson(str);
    }

    getDefault() {
        return '';
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
        if (this.is(value)) {
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

singleton(class ObjectType extends BaseType {
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
        if (Array.isArray(value)) return false;
        if (value instanceof Boolean) return false;
        if (value instanceof Date) return false;
        if (value instanceof Number) return false;
        if (value instanceof RegExp) return false;
        if (value instanceof String) return false;
        return true;
    }
});

singleton(class PatternType extends BaseType {
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
 * Global function that returns the essential javascript data type for the
 * given value.  Note that the essential data type does not include constrained
 * types such as Int16 or UInt32.  Constrained types cannot be infered from a
 * single value and constrained are not used with the expressions framework.
*****/
define(function getJsType(value) {
    switch (typeof value) {
        case 'bigint':
            return BigIntType;

        case 'boolean':
            return BooleanType;

        case 'function':
            return FunctionType;

        case 'number':
            return NumberType;

        case 'object':
            if (typeof value === null) {
                return NullType;
            }
            else if (Array.isArray(value)) {
                return ArrayType;
            }
            else if (value instanceof RdsEnum) {
                return EnumType;
            }
            else if (value instanceof Date) {
                return DateType;
            }
            else if (value instanceof RegExp) {
                return PatternType;
            }
            else if (value instanceof Number) {
                return NumberType;
            }
            else if (value instanceof Boolean) {
                return BooleanType;
            }
            else {
                return ObjectType;
            }

        case 'string':
            return StringType;

        case 'undefined':
            return UndefinedType;
    }
});