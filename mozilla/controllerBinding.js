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
 * The controller binding object defines and controlers the interaction between
 * a single binding and a single value in the controller.  The binding not only
 * connects the two, it also provides the two-way interaction between the HTML
 * element and the controller.
*****/
define(class ControllerBinding {
    constructor(docElement, expr, dotted, type, name) {
        this.docElement = docElement;
        this.expr = expr;
        this.dotted = dotted;
        this.valid = false;
        this.enabled = true;
        
        if (type == 'inner') {
            this.valid = true;
            this.type = type;
        }
        else if (type == 'input') {
            this.valid = true;
            this.type = type;

            this.docElement.on('input', message => {
                this.pull();
            });
        }
        else if (type == 'attr') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
        else if (type == 'attrToggle') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
        else if (type == 'method') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
        else if (type == 'property') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
        else if (type == 'style') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }

        if (this.valid) {
            let binding = ControllerBinding.get(this);
            
            if (binding) {
                return binding;
            }

            let byDocElement = Controller.bindingsByDocElement.get(this.docElement);
            
            if (!byDocElement) {
                byDocElement = {
                    docElement: this.docElement,
                    bindings: [],
                };

                Controller.bindingsByDocElement.set(this.docElement, byDocElement);
            }

            let byDotted = Controller.bindingsByDotted[this.dotted];

            if (!byDotted) {
                byDotted = {
                    dotted: this.dotted,
                    bindings: [],
                };

                Controller.bindingsByDotted[this.dotted] = byDotted;
            }

            byDocElement.bindings.push(this);
            byDotted.bindings.push(this);
            this.push(undefined, Controller.getDataValue(this.docElement, this.dotted))
            return this;
        }
        
        return null;
    }

    delete() {
        // TODO **************************************************************************
        // TODO **************************************************************************
    }

    disable() {
        this.enabled = false;
        return this;
    }

    enable() {
        this.enabled = true;
        return this;
    }

    static get(controllerBinding) {
        if (controllerBinding.valid) {
            if (controllerBinding.dotted in Controller.bindingsByDotted) {
                let byDotted = Controller.bindingsByDotted[controllerBinding.dotted];

                for (let binding of byDotted.bindings) {
                    if (binding.docElement.isSame(controllerBinding.docElement)) {
                        if (binding.type == controllerBinding.type) {
                            if (binding.type == 'inner') {
                                return binding;
                            }
                            else if (binding.type == 'input') {
                                return binding;
                            }

                            if (binding.name == controllerBinding.name) {
                                return binding;
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    static has(controllerBinding) {
        return ControllerBinding.get(controllerBinding) != null;
    }

    isDisabled() {
        return !this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    pull() {
        this.disable();

        if (this.type == 'inner') {
            let newValue = this.docElement.getInnerHtml();
            Controller.setDataValue(this.docElement, this.dotted, newValue);
        }
        else if (this.type == 'input') {
            if (this.docElement.getAttribute('type') == 'checkbox') {
                let newValue = this.docElement.getProperty('checked');
                Controller.setDataValue(this.docElement, this.dotted, newValue);
            }
            else {
                let newValue = this.docElement.getProperty('value');
                Controller.setDataValue(this.docElement, this.dotted, newValue);
            }
        }
        else if (this.type == 'attr') {
            let newValue = this.docElement.getAttribute(this.name);
            Controller.setDataValue(this.docElement, this.dotted, newValue);
        }
        else if (this.type == 'attrToggle') {
            let bool = this.docElement.hasAttribute(this.name);
            Controller.setDataValue(this.docElement, this.dotted, bool);
        }
        else if (this.type == 'style') {
            let stylePropertyValue = this.docElement.getStyle(this.name);
            Controller.setDataValue(this.docElement, this.dotted, stylePropertyValue);
        }

        this.enable();
    }

    push() {
        if (this.type == 'inner') {
            this.docElement.setInnerHtml(this.expr.eval());
        }
        else if (this.type == 'input') {
            if (this.docElement.getAttribute('type') == 'checkbox') {
                this.docElement.setProperty('checked', this.expr.eval());
            }
            else {
                this.docElement.setProperty('value', this.expr.eval());
            }
        }
        else if (this.type == 'attr') {
            this.docElement.setAttribute(this.name, this.expr.eval());
        }
        else if (this.type == 'attrToggle') {
            if (this.expr.eval() == true) {
                this.docElement.setAttribute(this.name);
            }
            else {
                this.docElement.clearAttribute(this.name);
            }
        }
        else if (this.type == 'method') {
            this.docElement[this.name]();
        }
        else if (this.type == 'property') {
            this.docElement.setProperty(this.name, this.expr.eval());
        }
        else if (this.type == 'style') {
            let styleProperty = {};
            styleProperty[this.name] = this.expr.eval();
            this.docElement.setStyle(styleProperty);
        }
    }
});
