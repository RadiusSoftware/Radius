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
 * and other sorts of checking.  The base class, Type, can be extended by other
 * modules to create specific Type subclasses with features specific to that
 * class.  Types is part of the foundation for supporting database objects, and
 * objects derived from ProtoType.
*****/
register('', class BaseType {
    getName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }
});

/*****
 * Array
*****/
singleton('', class ArrayType extends BaseType {
    getDefault() {
        return new Array();
    }

    is(value) {
        return Array.isArray(value);
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
});

/*****
 * Bigint
*****/
singleton('', class BigIntType extends BaseType {
    getDefault() {
        return 0n;
    }

    is(value) {
        return typeof value == 'bigint';
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
});

/*****
 * Boolean
*****/
singleton('', class BooleanType extends BaseType {
    getDefault() {
        return false;
    }

    is(value) {
        return typeof value == 'boolean';
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
});

/*****
 * Buffer
*****/
singleton('', class BufferType extends BaseType {
    getDefault() {
        return mkBuffer();
    }

    is(value) {
        return value instanceof Buffer;
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
});

/*****
 * Date
*****/
singleton('', class DateType extends BaseType {
    getDefault() {
        return new Date(0);
    }

    is(value) {
        return value instanceof Date;
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
});

/*****
 * Double
*****/
singleton('', class DoubleType extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        return typeof value == 'number' && value != NaN;
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
});

/*****
 * Enum
*****/
singleton('', class EnumType extends BaseType {
    getDefault() {
        return '';
    }

    is(value, values) {
        if (values instanceof StringSet) {
            return typeof value == 'string' && values.has(value);
        }
        
        return false;
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
});

/*****
 * Float8
*****/
singleton('', class Float8Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        return typeof value == 'number' && value != NaN;
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
});

/*****
 * Float16
*****/
singleton('', class Float16Type extends BaseType {
    getDefault() {
        return 0n;
    }

    is(value) {
        return typeof value == 'bigint';
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
});

/*****
 * Funtion
*****/
singleton('', class FunctionType extends BaseType {
    getDefault() {
        return () => {};
    }

    is(value) {
        return typeof value == 'function';
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
});

/*****
 * Int8
*****/
singleton('', class Int8Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        if (typeof value == 'number' && value != NaN) {
            if (value <= 127) {
                if (value >= -128) {
                    return true;
                }
            }
        }

        return false;
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
});

/*****
 * Int16
*****/
singleton('', class Int16Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        if (typeof value == 'number' && value != NaN) {
            if (value <= 32767) {
                if (value >= -32768) {
                    return true;
                }
            }
        }

        return false;
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
});

/*****
 * Int32
*****/
singleton('', class Int32Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        if (typeof value == 'number' && value != NaN) {
            if (value <= 2147483647) {
                if (value >= -2147483648) {
                    return true;
                }
            }
        }

        return false;
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
});

/*****
 * Int64
*****/
singleton('', class Int64Type extends BaseType {
    getDefault() {
        return 0n;
    }

    is(value) {
        return typeof value == 'bigint';
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
});

/*****
 * JSON
*****/
singleton('', class JsonType extends BaseType {
    getDefault() {
        return '{}';
    }

    is(value) {
        try {
            let object = fromJson(value);
            return true;
        }
        catch (e) {}
        return false;
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
});

/*****
 * Key Type
*****/
singleton('', class KeyType extends BaseType {
    getDefault() {
        return '';
    }

    is(value) {
        return typeof value == 'string';
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
});

/*****
 * Null
*****/
singleton('', class NullType extends BaseType {
    getDefault() {
        return null;
    }

    is(value) {
        return value === null;
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
});

/*****
 * Number
*****/
singleton('', class NumberType extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        return typeof value == 'number' && value != NaN;
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
});

/*****
 * Object
*****/
singleton('', class ObjectType extends BaseType {
    getDefault() {
        return new Object();
    }

    is(value) {
        return typeof value == 'object';
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
});

/*****
 * Pattern
*****/
singleton('', class PatternType extends BaseType {
    getDefault() {
        return new RegExp('.*');
    }

    is(value) {
        return value instanceof RegExp;
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
});

/*****
 * String
*****/
singleton('', class StringType extends BaseType {
    getDefault() {
        return '';
    }

    is(value) {
        return typeof value == 'string';
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
});

/*****
 * UInt8
*****/
singleton('', class UInt8Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        if (typeof value == 'number' && value != NaN) {
            if (value <= 256) {
                if (value >= 0) {
                    return true;
                }
            }
        }

        return false;
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
});

/*****
 * UInt16
*****/
singleton('', class UInt16Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        if (typeof value == 'number' && value != NaN) {
            if (value <= 65535) {
                if (value >= 0) {
                    return true;
                }
            }
        }

        return false;
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
});

/*****
 * Uint32
*****/
singleton('', class UInt32Type extends BaseType {
    getDefault() {
        return 0;
    }

    is(value) {
        if (typeof value == 'number' && value != NaN) {
            if (value <= 4294967295) {
                if (value >= 0) {
                    return true;
                }
            }
        }

        return false;
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
});

/*****
 * Uint64
*****/
singleton('', class UInt64Type extends BaseType {
    getDefault() {
        return 0n;
    }

    is(value) {
        if (typeof value == 'bigint') {
            return value >= 0n;
        }

        return false;
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
});

/*****
 * Undefined
*****/
singleton('', class UndefinedType extends BaseType {
    getDefault() {
        return undefined;
    }

    is(value) {
        return typeof value == 'undefined';
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
});


/*****
 * Global function that returns the essential javascript data type for the
 * given value.  Note that the essential data type does not include constrained
 * types such as Int16 or UInt32.  Constrained types cannot be infered from a
 * single value and constrained are not used with the expressions framework.
*****/
register('', function getJsType(value) {
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
            if (typeof value === null)
                return NullType;
            else if (Array.isArray(value))
                return ArrayType;
            else if (value instanceof Date)
                return DateType;
            else
                return ObjectType;

        case 'string':
            return StringType;

        case 'undefined':
            return UndefinedType;
    }
});