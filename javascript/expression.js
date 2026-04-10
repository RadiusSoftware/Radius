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
            dependencies = dependencies.concat(operand.dependencies);
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

/*
define(class AndExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        if (await this.lhs.evalBool()) {
            if (await this.rhs.evalBool()) {
                return true;
            }
        }

        return false;
    }

    static fromJson(obj) {
        return mkAndExpr(obj.lhs, obj.rhs);
    }
});

define(class ConcatExpr extends Expr {
    constructor(...args) {
        super();
        this.args = args.map(arg => wrapExpressionOperand(arg));
    }

    async eval() {
        let strings = [];

        for (let arg of this.args) {
            strings.push(new String(await arg.eval()));
        }

        return strings.join('');
    }

    static fromJson(obj) {
        return mkConcatExpr(obj.args);
    }
});
*/

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

/*
define(class FuncExpr extends Expr {
    constructor(func, ...args) {
        super();
        this.func = func;
        this.args = args.map(arg => wrapExpressionOperand(arg));
    }

    async eval() {
        let args = [];

        for (let arg of this.args) {
            args.push(await arg.eval());
        }

        return await waitOn(Reflect.apply(this.func, null, args));
    }

    static fromJson(obj) {
        return mkFuncExpr(obj.func, obj.args);
    }
});

define(class GeExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        return (await this.lhs.eval()) >= (await this.lhs.eval());
    }

    static fromJson(obj) {
        return mkGeExpr(obj.lhs, obj.rhs);
    }
});

define(class GtExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        return (await this.lhs.eval()) > (await this.lhs.eval());
    }

    static fromJson(obj) {
        return mkGtExpr(obj.lhs, obj.rhs);
    }
});
*/

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

/*
define(class LeExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        return (await this.lhs.eval()) <= (await this.lhs.eval());
    }

    static fromJson(obj) {
        return mkLeExpr(obj.lhs, obj.rhs);
    }
});

define(class LowerExpr extends Expr {
    constructor(str) {
        super(str);
    }
}

define(class LtExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        return (await this.lhs.eval()) < (await this.lhs.eval());
    }

    static fromJson(obj) {
        return mkLtExpr(obj.lhs, obj.rhs);
    }
});
*/

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
        return mkEqExpr(...this.operands);
    }

    getShapes() {
        return [ mkRdsShape(AnyType), mkRdsShape(AnyType) ];
    }
});

/*
define(class NorExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        if (await this.lhs.evalBool()) {
            return false;
        }
        else if (await this.rhs.evalBool()) {
            return false;
        }

        return true;
    }

    static fromJson(obj) {
        return mkNorExpr(obj.lhs, obj.rhs);
    }
});

define(class NotExpr extends Expr {
    constructor(expr) {
        super();
        this.expr = wrapExpressionOperand(expr);
    }

    async eval() {
        return !(await this.expr.evalBool());
    }

    static fromJson(obj) {
        return mkNotExpr(obj.expr);
    }
});

define(class OrExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        if (await this.lhs.evalBool()) {
            return true;
        }

        if (await this.rhs.evalBool()) {
            return true;
        }

        return false;
    }

    static fromJson(obj) {
        return mkOrExpr(obj.lhs, obj.rhs);
    }
});
*/

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

define(class SubExpr extends Expr {
    constructor(...operands) {
        super(...operands);
    }

    async eval() {
        let sum = 0;
        let operands = await this.evalOperands();

        if (operands.length > 0) {
            sum = this.operands[0];

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

/*
define(class TernaryExpr extends Expr {
    constructor(cond, ifTrue, ifFalse) {
        super();
        this.cond = wrapExpressionOperand(cond);
        this.ifTrue = wrapExpressionOperand(ifTrue);
        this.ifFalse = wrapExpressionOperand(ifFalse);
    }

    async eval() {
        if (await this.cond.evalBool()) {
            return await this.ifTrue.eval();
        }
        else {
            return await this.ifFalse.eval();                
        }
    }

    static fromJson(obj) {
        return mkSwitchExpr(obj.expr, obj.ifTrue, obj.ifFalse);
    }
});

define(class UpperExpr extends Expr {
    constructor(str) {
        super(str);
    }
}

define(class XorExpr extends Expr {
    constructor(lhs, rhs) {
        super();
        this.lhs = wrapExpressionOperand(lhs);
        this.rhs = wrapExpressionOperand(rhs);
    }

    async eval() {
        if (await this.lhs.evalBool()) {
            if (await this.rhs.evalBool()) {
                return false;
            }
            else {
                return true;
            }
        }
        else {
            if (await this.rhs.evalBool()) {
                return true;
            }
            else {
                return false;
            }
        }
    }

    static fromJson(obj) {
        return mkXorExpr(obj.lhs, obj.rhs);
    }
});
*/
