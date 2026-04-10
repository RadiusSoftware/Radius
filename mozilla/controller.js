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
 * A controller expression is one that uses a dotted key for a controller value.
 * It's one of the extended types that returns an actual dependency to a key in
 * the controller and it returns the controller value when evaluated.
*****/
/*
define(class ControllerExpXXX extends Expr {
    constructor(dotted) {
        super();
        this.dotted = dotted;
    }

    async eval() {
        return Controller.get(dotted);
    }

    getDependencies() {
        return [ this.dotted ];
    }

    static fromJson(obj) {
        return mkControllerExpr(obj.dotted);
    }
});
*/


/*****
 * The controller is a single global class providing features defined by the
 * standard "C" part of the MVC GUI model.  A controller contains operational
 * data, entangles GUI elements with those values, and notifies other listeners
 * when changes to those data values are executed.  The controller is how the
 * Radius framework provides features for controlling viewables with data.
*****/
singleton(class Controller extends Emitter {
    constructor() {
        super();
        this.data = {};
        this.bound = {};
        this.shapes = {};
    }

    bind(docElement, arg) {
        let { expr, dependencies } = evalExpression(arg);
        
        if (docElement instanceof DocElement) {
            if (docElement.getTagName() in { input:0, select:0, textarea:0 }) {
                // entangle input
            }
            else {
                // entangle inner
            }
        }

        return this;
    }

    bindAttribute(docElement, attributeName, expr) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindAttributeFlag(docElement, attributeName, expr) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindFunction(func, expr) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindMethod(docElement, methodName, expr) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    /*
    delete(dotted) {
        if (Data.has(this.data, dotted)) {
            let value = Data.get(this.data, dotted);
            Data.delete(this.data, dotted);
            this.onUpdate(dotted, 'delete', value);
            
            this.emit({
                name: 'Delete',
                dotted: dotted,
                value: value,
            });
        }

        return this;
    }
    */

    define(key, shape, value) {
        if (key in this.data) {
            throwError(`Controller key "${key}" is already defined.`);
        }

        if (shape instanceof RdsShape) {
            var rdsShape = shape;
        }
        else if (shape instanceof BaseType) {
             var rdsShape = mkRdsShape(shape);
        }
        else {
            throwError(`Controller shape is NOT a valid value.`);
        }

        this.data[key] = rdsShape.getDefault();
        this.shapes[key] = rdsShape;
        this.set(key, value);
        return this;
    }

    evalExpression(value) {
        if (StringType.verify(value)) {
            var expr = mkControllerExpr(value);
        }
        else {
            var expr = wrapExpressionOperand(value);
        }

        let dependencies = expr
        return { expr: expr, dependencies: dependencies };
    }

    get(dotted) {
        return Data.get(this.data, dotted);
    }

    getShape(dotted) {
        let shape = null;
        let array = RdsText.split(dotted, '.');

        if (array.length) {
            shape = this.shapes[array[0]];

            if (shape && array.length > 1) {
                shape = shape.get(array.slice(1).join('.'));
            }
        }

        return shape;
    }

    has(dotted) {
        return Data.has(this.data, dotted);
    }

    set(dotted, newValue) {
        let shape = this.getShape(dotted);

        if (shape) {
            if (shape.verify(newValue)) {
                let oldValue = Data.get(this.data, dotted);

                if (Data.ne(oldValue, newValue)) {
                    this.emit({
                        name: 'SetNoChange',
                        dotted: dotted,
                        value: newValue,
                    });
                }
                else {
                    Data.set(this.data, dotted, newValue);
                    this.updated(dotted, oldValue, newValue);
                }
            }
        }
        else {
            this.emit({
                name: 'SetFailed',
                dotted: dotted,
                value: newValue,
            });
        }

;       return this;
    }

    updated(dotted, oldValue, newValue) {
        let entanglements = this.bound[dotted];

        if (entanglements) {
            for (let entanglement of entanglements) {
                entanglement.broadcast(dotted);
            }
        }

        this.emit({
            name: 'Set',
            dotted: dotted,
            oldValue: oldValue,
            newValue: newValue,
        });
    }
});
