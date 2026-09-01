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
    constructor(docElement, expr, uuid, type, name) {
        this.docElement = docElement;
        this.expr = expr;
        this.uuid = uuid;
        this.valid = false;
        this.blockingFeedback = false;
        
        if (type == 'inner') {
            this.valid = true;
            this.type = type;
        }
        else if (type == 'input') {
            this.valid = true;
            this.type = type;

            this.docElement.on(
                'EventInput',
                message => {
                    if (this.valid) {
                        this.pull();
                    }
                },
                false,
                'priority'
            );
        }
        else if (type == 'array') {
            this.valid = true;
            this.type = type;
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
        else if (type == 'options') {
            this.valid = true;
            this.type = type;
        }
        else if (type == 'property') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
        else if (type == 'show') {
            if (ArrayType.verify(name)) {
                this.valid = true;
                this.type = type;
                this.values = mkRdsEnum(...name);
                this.display = docElement.getStyle('display');
            }
        }
        else if (type == 'style') {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
    }

    deactivate() {
        this.valid = false;
        return this;
    }

    getElement() {
        return this.docElement;
    }

    getExpr() {
        return this.expr;
    }

    getType() {
        return this.type;
    }

    getUUID() {
        return this.uuid;
    }

    isValid() {
        return this.valid;
    }

    pull() {
        if (this.valid && !this.blockingFeedback) {
            this.blockingFeedback = true;

            try {
                if (this.type == 'array') {
                    // **************************************************************************
                    // **************************************************************************
                }
                else if (this.type == 'input') {
                    switch (this.docElement.getAttribute('type')) {
                        case 'number':
                            Controller.pokeValue(this.uuid, this.docElement.getProperty('valueAsNumber'));
                            break;

                        case 'date':
                        case 'datetime-local':
                            Controller.pokeValue(this.uuid, this.docElement.getProperty('valueAsDate'));
                            break;

                        case 'radio':
                            Controller.pokeValue(this.uuid, this.docElement.getAttribute('value'));
                            break;

                        case 'checkbox':
                            Controller.pokeValue(this.uuid, this.docElement.getProperty('checked'));
                            break;

                        default:
                            Controller.pokeValue(this.uuid, this.docElement.getProperty('value'));
                            break;
                    }
                }
            }
            catch (e) {
                caught(e);
            }

            this.blockingFeedback = false;
        }

        return this;
    }

    push(details) {
        if (this.valid && !this.blockingFeedback) {
            this.blockingFeedback = true;

            try {
                if (this.type == 'array') {
                    if (details.action == 'refresh') {
                        this.docElement.onArrayRender(this.expr.eval(), details);
                    }
                    else if (details.action == 'append') {
                        this.docElement.onArrayAppendElement(details);
                    }
                    else if (details.action == 'delete') {
                        this.docElement.onArrayDeleteElement(details);
                    }
                    else if (details.action == 'insert') {
                        this.docElement.onArrayInsertElement(details);
                    }
                    else if (details.action == 'prepend') {
                        this.docElement.onArrayPrependElement(details);
                    }
                }
                else if (this.type == 'inner') {
                    this.docElement.setInnerHtml(this.expr.eval());
                }
                else if (this.type == 'input') {
                    if (this.docElement.getAttribute('type') == 'checkbox') {
                        this.docElement.setProperty('checked', this.expr.eval());
                    }
                    else if (this.docElement.getAttribute('type') == 'radio') {
                        if (this.docElement.getAttribute('value') == this.expr.eval()) {
                            this.docElement.setProperty('checked', true);
                        }
                        else {
                            this.docElement.setProperty('checked', false);
                        }
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
                    this.docElement[this.name](this.expr.eval());
                }
                else if (this.type == 'options') {
                    this.docElement.setOptions(this.expr.eval());
                }
                else if (this.type == 'property') {
                    this.docElement.setProperty(this.name, this.expr.eval());
                }
                else if (this.type == 'show') {
                    let value = this.expr.eval();

                    if (value && this.values.has(value)) {
                        if (this.docElement.getStyle('display') == 'none') {
                            this.docElement.setStyle('display', this.display);
                        }
                    }
                    else if (this.docElement.getStyle('display') != 'none') {
                        this.docElement.setStyle('display', 'none');
                    }
                }
                else if (this.type == 'style') {
                    let styleProperty = {};
                    styleProperty[this.name] = this.expr.eval();
                    this.docElement.setStyle(styleProperty);
                }
            }
            catch (e) {
                caught(e);
            }

            this.blockingFeedback = false;
        }

        return this;
    }
});
