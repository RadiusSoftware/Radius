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
 * Expression and its subclasses provide a framework for defining expressions
 * use expressions as meta data.  Expressions have use for implementing GUI
 * editors to generate expressions, for communicating and expressive algorithm,
 * from process to process via serialization, and for storing a serialized 
 * algorithm in a DBMS.
*****/
define (class Expr {
    static types = {};

    static {
        Namespace.on('ClassDefined', message => {
            if (Data.extends(message.clss, Expr)) {
                if (message.clss !== Expr) {
                    Expr.types[message.clss['#fqn']] = {
                        ns: message.namespace,
                        clss: message.clss,
                    };
                }
            }
        });
    }

    constructor() {
        if (Reflect.getPrototypeOf(this).constructor !== Expr) {
            this.operands = arguments;
            this.className = Reflect.getPrototypeOf(this).constructor.name;
        }
        else {
            throwError(`mkExpr() may NOT be called directly!  Construct subclasses.`);
        }
    }

    async evalBool() {
        let value = await this.eval();
        return getJsType(value).toBool(value);
    }
    
    async evalOperands() {
        let values = [];
        let repeat = false;
        let shapes = this.getShapes();
        
        if (shapes[shapes.length - 1] === '...') {
            repeat = true;
            shapes = shapes.slice(0, shapes.length - 1);
        }

        for (var i = 0; i < shapes.length; i++) {
            var shape = shapes[i];
            let operand = this.operands[i];

            if (operand instanceof Expr) {
                var value = await operand.eval();
            }
            else {
                var value = operand;
            }

            if (shape.verify(value)) {
                values.push(value);
            }
            else {
                throwError(`Invalid operand for expression type ${this.className}:  "${value}"`);
            }
        }

        if (repeat) {
            for (; i < this.operands.length; i++) {
                let operand = this.operands[i];

                if (operand instanceof Expr) {
                    var value = await operand.eval();
                }
                else {
                    var value = operand;
                }

                if (shape.verify(value)) {
                    values.push(value);
                }
                else {
                    throwError(`Invalid operand for expression type ${this.className}:  "${value}"`);
                }
            }
        }
        
        return values;
    }

    async evalString() {
        let value = await this.eval();
        return getJsType(value).toString(value);
    }

    getDependencies() {
        let dependencies = [];

        for (let operand of this.operands) {
            dependencies = dependencies.concat(operand.getDependencies());
        }

        return dependencies;
    }

    getName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }
    
    getOperands() {
        return this.operands;
    }

    [Symbol.iterator]() {
        return this.operands[Symbol.iterator]();
    }
});

define(class AddExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let sum = 0;
        let operands = await this.evalOperands();

        if (operands.length > 0) {
            for (let operand of operands) {
                sum += operand;
            }
        }
        
        return sum;
    }

    static fromJson(obj) {
        return mkAddExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType), '...' ];
    }
});

define(class AndExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let and = false;
        let operands = await this.evalOperands();

        if (operands.length > 0) {
            and = operands[0];

            for (let operand of operands.slice(1)) {
                and &&= operand;
            }
        }
        
        return and;
    }

    static fromJson(obj) {
        return mkAndExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(BooleanType), '...' ];
    }
});

define(class ConcatExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let operands = await this.evalOperands();
        return operands.join('');
    }

    static fromJson(obj) {
        return mkConcatExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(StringType), '...' ];
    }
});

define(class DivExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let div = null;
        let operands = await this.evalOperands();

        if (operands.length > 0) {
            div = operands[0];

            for (let operand of operands.slice(1)) {
                div /= operand;
            }
        }
        
        return div;
    }

    static fromJson(obj) {
        return mkDivExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType), '...' ];
    }
});

define(class EqExpr extends Expr {
    constructor(lh, rh) {
        super(lh, rh);
    }

    async eval() {
        let [ lh, rh ] = await this.evalOperands();
        return Data.eq(lh, rh);
    }

    static fromJson(obj) {
        return mkEqExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

define(class ExpExpr extends Expr {
    constructor(number, exp) {
        super(number, exp);
    }

    async eval() {
        let [ number, exp ] = await this.evalOperands();
        return Math.pow(number, exp);
    }

    static fromJson(obj) {
        return mkExpExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType), mkRdsShape(NumericType) ];
    }
});

define(class FunctionExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let operands = await this.evalOperands();
        return wait(operands[0](...operands.slice(1)));
    }

    static fromJson(obj) {
        return mkFunctionExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(FunctionType), mkRdsShape(AnyType), '...' ];
    }
});

define(class GeExpr extends Expr {
    constructor(lh, rh) {
        super(lh, rh);
    }

    async eval() {
        let [ lh, rh ] = await this.evalOperands();
        return Data.ge(lh, rh);
    }

    static fromJson(obj) {
        return mkGeExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

define(class GtExpr extends Expr {
    constructor(lh, rh) {
        super(lh, rh);
    }

    async eval() {
        let [ lh, rh ] = await this.evalOperands();
        return Data.gt(lh, rh);
    }

    static fromJson(obj) {
        return mkGtExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

define(class IsArrayExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return ArrayType.verify(value);
    }

    static fromJson(obj) {
        return mkIsArrayExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsBigIntExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return BigIntType.verify(value);
    }

    static fromJson(obj) {
        return mkIsBigIntExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsBooleanExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return BooleanType.verify(value);
    }

    static fromJson(obj) {
        return mkIsBooleanExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsBufferExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return BufferType.verify(value);
    }

    static fromJson(obj) {
        return mkIsBufferExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsDateExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return DateType.verify(value);
    }

    static fromJson(obj) {
        return mkIsDateExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsDateTimeExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return DateTimeType.verify(value);
    }

    static fromJson(obj) {
        return mkIsDateTimeExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsDoubleExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return DoubleType.verify(value);
    }

    static fromJson(obj) {
        return mkIsDoubleExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsEnumExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return value instanceof RdsEnum;
    }

    static fromJson(obj) {
        return mkIsEnumExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsFunctionExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return FunctionType.verify(value);
    }

    static fromJson(obj) {
        return mkIsFunctionExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsJsonExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return JsonType.verify(value);
    }

    static fromJson(obj) {
        return mkIsJsonExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class IsNumberExpr extends Expr {
    constructor(value) {
        super(value);
    }

    async eval() {
        let [ value ] = await this.evalOperands();
        return NumberType.verify(value);
    }

    static fromJson(obj) {
        return mkIsNumberExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class LeExpr extends Expr {
    constructor(lh, rh) {
        super(lh, rh);
    }

    async eval() {
        let [ lh, rh ] = await this.evalOperands();
        return Data.le(lh, rh);
    }

    static fromJson(obj) {
        return mkLeExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

define(class LowerExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        return (await this.evalOperands())[0].toLowerCase();
    }

    static fromJson(obj) {
        return mkLowerExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(StringType) ];
    }
});

define(class LtExpr extends Expr {
    constructor(lh, rh) {
        super(lh, rh);
    }

    async eval() {
        let [ lh, rh ] = await this.evalOperands();
        return Data.lt(lh, rh);
    }

    static fromJson(obj) {
        return mkLtExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

define(class MulExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let prod = 1;
        let operands = await this.evalOperands();

        if (operands.length > 0) {
            for (let operand of operands) {
                prod *= operand;
            }
        }
        
        return prod;
    }

    static fromJson(obj) {
        return mkMulExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType), '...' ];
    }
});

define(class NeExpr extends Expr {
    constructor(lh, rh) {
        super(lh, rh);
    }

    async eval() {
        let [ lh, rh ] = await this.evalOperands();
        return !Data.eq(lh, rh);
    }

    static fromJson(obj) {
        return mkNeExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

define(class NorExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let nor = true;
        let operands = await this.evalOperands();

        for (let operand of operands) {
            nor = !operand ? nor : false;
        }
        
        return nor;
    }

    static fromJson(obj) {
        return mkNorExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(BooleanType), '...' ];
    }
});

define(class NotExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let operands = await this.evalOperands();
        return operands[0] === false;
    }

    static fromJson(obj) {
        return mkNotExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(BooleanType) ];
    }
});

define(class OrExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let or = false;
        let operands = await this.evalOperands();

        for (let operand of operands) {
            or = operand ? true : or;
        }
        
        return or;
    }

    static fromJson(obj) {
        return mkOrExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(BooleanType), '...' ];
    }
});

define(class RootExpr extends Expr {
    constructor(number, exp) {
        super(number, exp);
    }

    async eval() {
        let [ number, exp ] = await this.evalOperands();
        return Math.pow(number, 1/exp);
    }

    static fromJson(obj) {
        return mkRootExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType), mkRdsShape(NumericType) ];
    }
});

define(class SqrtExpr extends Expr {
    constructor(number) {
        super(number);
    }

    async eval() {
        let [ number ] = await this.evalOperands();
        return Math.sqrt(number);
    }

    static fromJson(obj) {
        return mkSqrtExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType) ];
    }
});

define(class StringExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        return (await this.evalOperands())[0].toString();
    }

    static fromJson(obj) {
        return mkStirngExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType) ];
    }
});

define(class SubExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let sum = 0;
        let operands = await this.evalOperands();

        if (operands.length > 0) {
            sum = operands[0];

            for (let operand of operands.slice(1)) {
                sum -= operand;
            }
        }
        
        return sum;
    }

    static fromJson(obj) {
        return mkSubExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(NumericType), '...' ];
    }
});

define(class TernaryExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        const evaluate = async operand => {
            if (operand instanceof Expr) {
                return await operand.eval();
            }
            else {
                return operand;
            }
        };

        if (this.operands.length == 3) {
            let operand = await evaluate(this.operands[0]);

            if (typeof operand == 'boolean') {
                if (operand) {
                    return await evaluate(this.operands[1]);
                }
                else {
                    return await evaluate(this.operands[2]);
                }
            }
            else {
                throwError('TernaryExpr first operand must be a boolean expression!')
            }
        }
        else {
            throwError('TernaryExpr requires 3 operands!')
        }
    }

    static fromJson(obj) {
        return mkTernaryExpr(...this.operands);
    }

    getShapes() {
    }
});

define(class UpperExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        return (await this.evalOperands())[0].toUpperCase();
    }

    static fromJson(obj) {
        return mkUpperExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(StringType) ];
    }
});
