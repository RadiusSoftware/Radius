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
        else if (typeof value == 'function') {
            return mkFunktion(value);
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
    register('', class Expression {
        constructor() {
        }

        getExpressionType() {
            return Reflect.getPrototypeOf(this).constructor.name;
        }

        async evalBool() {
            let value = await this.eval();
            return getJsType(value).toBool();
        }

        async evalString() {
            let value = await this.eval();
            return getJsType(value).toString();
        }
    });

    /*****
     * Add
    *****/
    register('', class Add extends Expression {
        constructor(l, r) {
            super();
            this.l = wrapOperand(l);
            this.r = wrapOperand(r);
        }

        async eval() {
            let lev = await this.l.eval();
            let rev = await this.r.eval();

            if (BigIntType.is(lev) || BigIntType.is(rev)) {
                return BigInt(lev) + BigInt(rev);
            }
            else {
                return lev + rev;
            }
        }
    });

    /*****
    *****
    register('', class And extends Expression {
        constructor(...args) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Concat extends Expression {
        constructor(...args) {
            super();
        }
    });
    */

    /*****
     * Const
    *****/
    register('', class Const extends Expression {
        constructor(value) {
            super();
            this.value = value;
            this.jsType = getJsType(value);
        }

        async eval() {
            if (typeof this.value == 'function') {
                return this.value();
            }
            else {
                return this.value;
            }
        }
    });

    /*****
    *****
    register('', class Divide extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Equal extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Exponential extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
     * Funktion
    *****
    register('', class Funktion extends Expression {
        constructor(func, ...args) {
            super();
            this.func = func;
            this.args = args;
        }

        async eval() {
            let args = [];

            for (let arg of this.args) {
                if (arg instanceof Expression) {
                    args.push(await arg.eval());
                }
                else if (typeof arg == 'function') {
                    args.push(arg());
                }
                else {
                    args.push(arg);
                }
            }

            return Reflect.apply(this.func, args);
        }
    });
    */

    /*****
    *****
    register('', class GreaterThan extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class GreaterThanEqual extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class LessThan extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class LessThanEqual extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Multiply extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Nor extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Not extends Expression {
        constructor(arg) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class NotEqual extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Or extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Paren extends Expression {
        constructor(arg) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Sub extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */

    /*****
    *****
    register('', class Xor extends Expression {
        constructor(l, r) {
            super();
        }
    });
    */
})();
