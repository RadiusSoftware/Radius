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
 * The controller is a single global class providing features defined by the
 * standard "C" part of the MVC GUI model.  A controller contains operational
 * data, entangles GUI elements with those values, and notifies other listeners
 * when changes to those data values are executed.  The controller is how the
 * Radius framework provides features for controlling viewables with data.
*****/
singleton(class Controller extends Emitter {
    constructor() {
        super();

        this.value = {};
        this.shape = mkRdsShape({});
        this.bindingsByDotted = {};
        this.bindingsByDocElement = new WeakMap();

        this.on('Set', message => {
            let bindingsByDotted = this.bindingsByDotted[message.dotted];
            
            if (bindingsByDotted) {
                for (let binding of bindingsByDotted.bindings) {
                    binding.push();
                }
            }
        });
    }

    bindArray(docElement, dotted) {
        this.createBinding(docElement, dotted, 'array');
        return this;
    }

    bindAttr(docElement, attrName, dotted) {
        this.createBinding(docElement, dotted, 'attr', attrName);
        return this;
    }

    bindAttrToggle(docElement, attrName, dotted) {
        this.createBinding(docElement, dotted, 'attrToggle', attrName);
        return this;
    }

    bindInner(docElement, dotted) {
        this.createBinding(docElement, dotted, 'inner');
        return this;
    }

    bindInput(docElement, dotted) {
        this.createBinding(docElement, dotted, 'input');
        return this;
    }

    bindMethod(docElement, methodName, ...args) {
        for (let dotted of args) {
            this.createBinding(docElement, dotted, 'method', methodName);
        }

        return this;
    }

    bindOptions(docElement, dotted) {
        this.createBinding(docElement, 'options', dotted);
        return this;
    }

    bindProperty(docElement, property, dotted) {
        this.createBinding(docElement, dotted, 'property', property);
        return this;
    }

    bindShow(docElement, dotted, ...values) {
        this.createBinding(docElement, dotted, 'show', values);
        return this;
    }

    bindStyle(docElement, styleProperty, dotted) {
        this.createBinding(docElement, dotted, 'style', styleProperty);
        return this;
    }

    createBinding(docElement, dotted, type, name) {
        let expr = mkControllerExpr(dotted);

        for (let dependency of expr.getDependencies()) {
            if (dependency.type == 'controller') {
                let binding = mkControllerBinding(docElement, expr, dotted, type, name);

                if (binding.isValid()) {
                    if (this.hasBinding(binding)) {
                        binding.deactivate();
                    }
                    else {
                        let byDocElement = this.bindingsByDocElement.get(binding.getElement());
                        
                        if (!byDocElement) {
                            byDocElement = {
                                docElement: binding.getElement(),
                                bindings: [],
                            };

                            this.bindingsByDocElement.set(binding.getElement(), byDocElement);
                        }

                        let byDotted = this.bindingsByDotted[binding.getDotted()];

                        if (!byDotted) {
                            byDotted = {
                                byDotted: binding.getDotted(),
                                bindings: [],
                            };

                            this.bindingsByDotted[binding.getDotted()] = byDotted;
                        }

                        byDocElement.bindings.push(binding);
                        byDotted.bindings.push(binding);
                        binding.push({ action: 'refresh' });
                    }
                }
            }
        }

        return this;
    }

    defineData(shape, object) {
        if (shape.getType() !== ObjectType) {
            throwError(`Controller.defineData(), value is NOT an object!`);
        }

        if (!shape.verify(object)) {
            throwError(`Controller.defineData(), value fails verification!`);
        }

        for (let key of shape.getKeys().reverse()) {
            if (this.shape.hasKey(key)) {
                throwError(`Controller.defineData():  root key name collision: "${key}"`);
            }

            this.shape.set(key, shape.get(key));
            this.value[key] = object[key];
        }

        return this;
    }

    deleteBindings(dotted) {
        for (let enumerated of this.enumerate(dotted)) {
            this.deleteBindingsByDotted(enumerated);
        }

        return this;
    }

    deleteBindingsByDocElement(docElement) {
        let bindingsByDocElement = this.bindingsByDocElement.get(docElement);

        if (bindingsByDocElement) {
            this.bindingsByDocElement.delete(docElement);

            for (let binding of bindingsByDocElement.bindings) {
                let bindingsByDotted = this.bindingsByDotted(binding.getDotted());

                if (bindingsByDotted.bindings.length < 2) {
                    delete this.bindingsByDotted[binding.getDotted()];
                }
                else {
                    for (let i = 0; i < bindingsByDotted.bindings.length; i++) {
                        if (bindingsByDotted.bindings[i].getUUID() == binding.getUUID()) {
                            bindingsByDotted.bindings.splice(i, 1);
                            break;
                        }   
                    }
                }

                binding.deactivate();
            }
        }

        return this;
    }

    deleteBindingsByDotted(dotted) {
        let bindingsByDotted = this.bindingsByDotted[dotted];

        if (bindingsByDotted) {
            delete this.bindingsByDotted[dotted];

            for (let binding of bindingsByDotted.bindings) {
                let bindingsByDocElement = this.bindingsByDocElement.get(binding.getElement());

                if (bindingsByDocElement.bindings.length < 2) {
                    this.bindingsByDocElement.delete(binding.getElement());
                }
                else {
                    for (let i = 0; i < bindingsByDocElement.bindings.length; i++) {
                        if (bindingsByDocElement.bindings[i] == binding.getUUID()) {
                            bindingsByDocElement.bindings.splice(i, 1);
                            break;
                        }
                    }
                }

                binding.deactivate();
            }
        }

        return this;
    }

    deleteRow(dotted, index) {
        let shape = this.getShape(dotted);

        if (shape) {
            let array = this.getValue(dotted);

            if (NumberType.verify(index) && index >= 0 && index < array.length) {
                for (let i = array.length - 1; i > index; i--) {
                    this.shiftBindings(dotted, index, -1);
                }

                array.splice(index, 1);

                this.signalBindings(dotted, {
                    action: 'delete',
                    index: index,
                });
            }
        }

        return this;
    }

    enumerate(dotted) {
        let enumerated = [];
        let stack = [ dotted ];

        while (stack.length) {
            let dotted = stack.pop();
            let value = this.getValue(dotted);
            enumerated.push(dotted);

            if (ObjectType.verify(value)) {
                for (let key of Object.keys(value).reverse()) {
                    stack.push(`${dotted}.${key}`);
                }
            }
            else if (ArrayType.verify(value)) {
                for (let i = value.length - 1; i >= 0; i--) {
                    stack.push(`${dotted}.${i}`);
                }
            }
        }

        return enumerated;
    }

    getShape(dotted) {
        return this.shape.get(dotted);
    }

    getValue(dotted) {
        return RdsData.get(this.value, dotted);
    }

    hasBinding(controllerBinding) {
        if (controllerBinding.getDotted() in this.bindingsByDotted) {
            let byDotted = this.bindingsByDotted[controllerBinding.getDotted()];

            for (let binding of byDotted.bindings) {
                if (binding.getElement().isSame(controllerBinding.getElement())) {
                    if (binding.getType() == controllerBinding.getType()) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    hasData(dotted) {
        return RdsData.has(this.value, dotted);
    }
    
    initNode(docNode) {
        if (!docNode['##INITIALIZED##']) {
            if (docNode instanceof Widget) {
                if (docNode.hasSubstitute()) {
                    docNode.substituteNode();
                }
            }

            Packages.processNode(docNode);
            docNode.init();

            if (docNode instanceof DocElement) {
                if (docNode.getRdsBind) {
                    if (docNode.getTagName() in { input:0, select:0, textarea:0 }) {
                        this.bindInput(docNode, docNode.getRdsBind());
                    }
                    else {
                        this.bindInner(docNode, docNode.getRdsBind());
                    }
                }

                if (docNode.getRdsBindArray) {
                    let dotted = docNode.getRdsBindArray();
                    this.bindArray(docNode, dotted);
                }

                if (docNode.getRdsBindAttr) {
                    let [ attrName, dotted ] = docNode.getRdsBindAttr().split(',');
                    this.bindAttr(docNode, attrName, dotted);
                }

                if (docNode.getRdsBindAttrToggle) {
                    let [ attrName, dotted ] = docNode.getRdsBindAttrToggle().split(',');
                    this.bindAttrToggle(docNode, attrName, dotted);
                }

                if (docNode.getRdsBindMethod) {
                    let args = docNode.getRdsBindMethod().split(',');
                    this.bindMethod(docNode, args[0], ...args.slice(1));
                }

                if (docNode.getRdsBindOptions) {
                    let dotted = docNode.getRdsBindOptions();
                    let shape = this.getShape(dotted);

                    if (shape && shape.getType() == ArrayType) {
                        if (FunctionType.verify(docNode['setOptions'])) {
                            this.bindOptions(docNode, dotted);
                        }
                    }
                }

                if (docNode.getRdsBindProperty) {
                    let [ property, dotted ] = docNode.getRdsBindProperty().split(',');
                    this.bindProperty(docNode, property, dotted);
                }

                if (docNode.getRdsBindShow) {
                    let [ dotted, values ] = RdsText.split(docNode.getRdsBindShow(), ';');
                    this.bindShow(docNode, dotted, ...RdsText.split(values, ','));
                }

                if (docNode.getRdsBindStyle) {
                    let [ styleProperty, dotted ] = docNode.getRdsBindStyle().split(',');
                    this.bindStyle(docNode, styleProperty, dotted);
                }
            }

            docNode['##INITIALIZED##'] = true;
        }
    }

    insertRow(dotted, index, value) {
        let shape = this.getShape(dotted);

        if (shape) {
            let elementValue;
            let array = this.getValue(dotted);

            if (NumberType.verify(index)) {
                for (let i = array.length - 1; i >= 0; i--) {
                    this.shiftBindings(dotted, index, 1);
                }
            }

            if (shape.verify(value)) {
                elementValue = value;
            }
            else {
                elementValue = shape.getClass().getDefault();
            }

            if (index === undefined) {
                array.push(elementValue);
            }
            else {
                array.splice(index, 0, elementValue);
            }

            this.signalBindings(dotted, {
                action: 'insert',
                index: NumberType.verify(index) ? index : array.length - 1,
            });
        }

        return this;
    }

    revokeData(key) {
        if (key in this.value) {
            this.shape.delete(key);
            delete this.value[key];
            this.deleteBindings(key);
        }

        return this;
    }

    setValue(dotted, newValue) {
        let shape = this.shape.get(dotted);

        if (shape && shape.verify(newValue)) {
            RdsData.set(this.value, dotted, newValue);

            for (let modified of this.enumerate(dotted)) {
                this.signalBindings(modified, { action: 'refresh' });
            }
        }

        return this;
    }

    shiftBindings(array, index, delta) {
        let dotted = `${array}.${index}`;

        for (let key of Object.keys(this.bindingsByDotted)
            .sort()
            .filter(path => path.startsWith(dotted))) {
                let bindingsByDotted = this.bindingsByDotted[key];
                let redotted = `${array}.${index+ + delta}`;

                if (key.length > redotted.length) {
                    redotted += `.${key.substring(redotted.length + 1)}`;
                }

                for (let binding of bindingsByDotted.bindings) {
                    binding.dotted = redotted;
                }

                bindingsByDotted.byDotted = redotted;
                delete this.bindingsByDotted[key];
                this.bindingsByDotted[redotted] = bindingsByDotted;
        }
    }

    signalBindings(dotted, details) {
        let bindingsByDotted = this.bindingsByDotted[dotted];

        if (bindingsByDotted) {
            for (let binding of bindingsByDotted.bindings) {
                binding.push(details);
            }
        }

        return this;

    }
});


/*****
 * When the mutation observer notices that a node is added to the document,
 * there are processes required to prepare that node for inclusion in the HTML
 * document: (a) use the Packages features to process the node and replace text
 * placeholders with the localized text, (b) call the node's init() method,
 * which is a non-async method used for configuring the node, and finally,
 * (c) mark the node as being initialized.
*****/
Doc.on('Mutation-Add', message => {
    for (let addedNode of message.added) {
        let docNodes = addedNode.enumerateDescendents();
        docNodes.unshift(addedNode);

        for (let docNode of docNodes) {
            Controller.initNode(docNode);
        }
    }
});


/*****
 * A controller expression is one that uses a dotted key for a controller value.
 * It's one of the extended types that returns an actual dependency to a key in
 * the controller and it returns the controller value when evaluated.
*****/
define(class ControllerExpr extends Expr {
    constructor(dotted) {
        super();
        this.dotted = dotted;
    }

    eval() {
        return Controller.getValue(this.dotted);
    }

    static fromJson(obj) {
        return mkControllerExpr(obj.dotted);
    }

    getDependencies() {
        return [{
            type: 'controller',
            expr: this,
            dotted: this.dotted,
        }];
    }

    getShapes() {
        return [ mkRdsShape(StringType) ];
    }
});
