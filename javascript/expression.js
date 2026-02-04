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


(() => {
    /*****
     * Detect the value type provide.  If the value is an expression, return
     * the provided value.  If the value is not an expression, such as a
     * JS value, JS expression, or a JS function, wrap that value in either
     * a Const or Funktion expression objecct.  Those two classes are the
     * interface between Expressions and barebones Javascript.
    *****/
    function wrapOperand(value) {
        if (value instanceof Expression) {
            return value;
        }
        else {
            return mkConst(value);
        }
    }


    /*****
     * Expression and its subclasses provide a framework for defining expressions
     * use expressions as meta data.  Expressions have use for implementing GUI
     * editors to generate expressions, for communicating and expressive algorithm,
     * from process to process via serialization, and for storing a serialized 
     * algorithm in a DBMS.
    *****/
    define (class Expression {
        constructor() {
        }

        getExpressionType() {
            return Reflect.getPrototypeOf(this).constructor.name;
        }

        async evalBool() {
            let value = await this.eval();
            return getJsType(value).toBool(value);
        }

        async evalString() {
            let value = await this.eval();
            return getJsType(value).toString(value);
        }
    });
    
    define(
        class Add extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                let lhs = await this.lhs.eval();
                let rhs = await this.rhs.eval();
    
                if (BigIntType.is(lhs) || BigIntType.is(rhs)) {
                    return BigInt(lhs) + BigInt(rhs);
                }
                else {
                    return lhs + rhs;
                }
            }
        },

        class And extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                if (await this.lhs.evalBool()) {
                    if (await this.rhs.evalBool()) {
                        return true;
                    }
                }
    
                return false;
            }
        },

        class Concat extends Expression {
            constructor(...args) {
                super();
                this.args = args.map(arg => wrapOperand(arg));
            }
    
            async eval() {
                let strings = [];
    
                for (let arg of this.args) {
                    strings.push(await arg.eval());
                }
    
                return strings.join('');
            }
        },

        class Divide extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                let lhs = await this.lhs.eval();
                let rhs = await this.rhs.eval();
    
                if (BigIntType.is(lhs) || BigIntType.is(rhs)) {
                    return BigInt(lhs) / BigInt(rhs);
                }
                else {
                    return lhs / rhs;
                }
            }
        },

        class Const extends Expression {
            constructor(value) {
                super();
                this.value = value;
            }
    
            async eval() {
                if (typeof this.value == 'function') {
                    return await waitOn(this.value());
                }
                else {
                    return this.value;
                }
            }
        },

        class Equal extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return (await this.lhs.eval()) == (await this.lhs.eval());
            }
        },

        class Exponential extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return Math.pow(await this.lhs.eval(), await this.rhs.eval());
            }
        },

        class Funktion extends Expression {
            constructor(func, ...args) {
                super();
                this.func = func;
                this.args = args.map(arg => wrapOperand(arg));
            }
    
            async eval() {
                let args = [];
    
                for (let arg of this.args) {
                    args.push(await arg.eval());
                }
    
                return await waitOn(Reflect.apply(this.func, null, args));
            }
        },

        class GreaterEqual extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return (await this.lhs.eval()) >= (await this.lhs.eval());
            }
        },

        class GreaterThan extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return (await this.lhs.eval()) > (await this.lhs.eval());
            }
        },

        class LessEqual extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return (await this.lhs.eval()) <= (await this.lhs.eval());
            }
        },

        class LessThan extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return (await this.lhs.eval()) < (await this.lhs.eval());
            }
        },

        class Multiply extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                let lhs = await this.lhs.eval();
                let rhs = await this.rhs.eval();
    
                if (BigIntType.is(lhs) || BigIntType.is(rhs)) {
                    return BigInt(lhs) * BigInt(rhs);
                }
                else {
                    return lhs * rhs;
                }
            }
        },

        class Nor extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
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
        },

        class Not extends Expression {
            constructor(expr) {
                super();
                this.expr = wrapOperand(expr);
            }
    
            async eval() {
                return !(await this.expr.evalBool());
            }
        },

        class NotEqual extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                return (await this.lhs.eval()) != (await this.lhs.eval());
            }
        },

        class Or extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
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
        },

        class Subtract extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
            }
    
            async eval() {
                let lhs = await this.lhs.eval();
                let rhs = await this.rhs.eval();
    
                if (BigIntType.is(lhs) || BigIntType.is(rhs)) {
                    return BigInt(lhs) - BigInt(rhs);
                }
                else {
                    return lhs - rhs;
                }
            }
        },

        class Switch extends Expression {
            constructor(value, ifTrue, ifFalse) {
                super();
                this.value = wrapOperand(value);
                this.ifTrue = wrapOperand(ifTrue);
                this.ifFalse = wrapOperand(ifFalse);
            }
    
            async eval() {
                if (await this.value.evalBool()) {
                    return await this.ifTrue.eval();
                }
                else {
                    return await this.ifFalse.eval();                
                }
            }
        },

        class Xor extends Expression {
            constructor(lhs, rhs) {
                super();
                this.lhs = wrapOperand(lhs);
                this.rhs = wrapOperand(rhs);
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
        },
    );
})();
