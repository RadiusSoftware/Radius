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
                this.type = arg;
                this.keys = {};
            }
            else if (arg === EnumType) {
                this.type = arg;
                this.enum = null;
            }
            else if (arg instanceof BaseType) {
                this.type = arg;
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
            if (this.enum) {
                return this.enum.has(value);
            }
            else {
                return this.type.verify(value);
            }
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