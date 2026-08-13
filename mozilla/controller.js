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
        this.shape = {};
        this.value = {};
        this.nodes = new WeakMap();
        this.bindingsByDotted = {};
        this.bindingsByDocElement = new WeakMap();
        this.eventAliases = new WeakMap();

        this.on('Set', message => {
            let byDotted = this.bindingsByDotted[message.dotted];
            
            if (byDotted) {
                for (let binding of byDotted.bindings) {
                    if (binding.isEnabled()) {
                        binding.push();
                    }
                }
            }
        });

        Doc.on('Mutation', message => this.onMutationChildList(message));
        Doc.on('Attr-Mutation', message => this.onMutationAttr(message));
    }

    bindAttr(docElement, attrName, ref) {
        this.setBinding(docElement, ref, 'attr', attrName);
        return this;
    }

    bindAttrToggle(docElement, attrName, ref) {
        this.setBinding(docElement, ref, 'attrToggle', attrName);
        return this;
    }

    bindInner(docElement, ref) {
        this.setBinding(docElement, ref, 'inner');
        return this;
    }

    bindInput(docElement, ref) {
        this.setBinding(docElement, ref, 'input');
        return this;
    }

    bindMethod(docElement, methodName, ...args) {
        for (let dotted of args) {
            this.setBinding(docElement, dotted, 'method', methodName);
        }

        return this;
    }

    bindOptions(docElement, ref) {
        this.setBinding(docElement, 'options', ref);
        return this;
    }

    bindProperty(docElement, property, ref) {
        this.setBinding(docElement, ref, 'property', property);
        return this;
    }

    bindShow(docElement, ref, ...values) {
        this.setBinding(docElement, ref, 'show', values);
        return this;
    }

    bindStyle(docElement, styleProperty, ref) {
        this.setBinding(docElement, ref, 'style', styleProperty);
        return this;
    }

    defineData(shape, value, dotted) {
        if (dotted) {
            if (this.shape instanceof RdsShape) {
                let rdsShape = shape instanceof RdsShape ? shape : mkRdsShape(shape);

                if (rdsShape.verify(value)) {
                    this.shape.set(dotted, shape);
                    RdsData.set(this.value, dotted, value);
                }
            }
        }
        else {
            if (shape instanceof RdsShape && shape.getType() == ObjectType) {
                if (shape.verify(value)) {
                    this.shape = shape;
                    this.value = value;
                }
            }
        }

        return this;
    }

    deleteBindingsByDocElement(docElement) {
        let bindingEntry = this.bindingsByDocElement.get(docElement);

        if (bindingEntry) {
            let array = RdsData.copy(bindingEntry.bindings);

            for (let binding of array) {
                binding.delete();
            }
        }

        return this;
    }

    deleteBindingsByDotted(dotted) {
        let bindingEntry = this.bindingsByDotted[dotted];

        if (bindingEntry) {
            let array = RdsData.copy(bindingEntry.bindings);

            for (let binding of array) {
                binding.delete();
            }
        }

        return this;
    }

    getShape(dotted) {
        if (StringType.verify(dotted) && dotted) {
            return this.shape.get(dotted);
        }
        else {
            return this.shape;
        }
    }

    getValue(dotted) {
        if (StringType.verify(dotted)) {
            return RdsData.get(this.value, dotted);
        }
        else {
            return this.value;
        }
    }

    hasData(dotted) {
        return RdsData.has(this.value, dotted);
    }

    // ***********************************************************************************
    // ***********************************************************************************
    // ***********************************************************************************
    setEventAlias(docElement, eventName, eventAlias) {
        let docElementAliases = this.eventAliases.get(docElement);

        if (!docElementAliases) {
            docElementAliases = {};
            this.eventAliases.set(docElement, docElementAliases);
        }

        if (!(eventName in docElementAliases)) {
            docElementAliases[eventName] = eventAlias;

            docElement.on(eventName, message => {
                console.log(`${eventName} => ${eventAlias}`);
            });
        }
    }

    initNode(docNode) {
        if (!this.nodes.has(docNode)) {
            if (docNode instanceof Widget) {
                if (docNode.hasSubstitute()) {
                    docNode.substituteNode();
                }
                
                for (let key of Reflect.ownKeys(Reflect.getPrototypeOf(docNode))) {
                    if (StringType.verify(key) && key.startsWith('onEvent')) {
                        if (FunctionType.verify(docNode[key])) {
                            let eventName = key.substring(7).toLowerCase();
                            //docNode.on(eventName, message => docNode.handleEvent(message));
                        }
                    }
                }
                /*
                    if (message.event.rdsAlias) {
                        let aliasName = message.event.rdsAlias;
                        let methodName = `onEvent${aliasName[0].toUpperCase()}${aliasName.substring(1)}`;

                        if (FunctionType.verify(this[methodName])) {
                            this[methodName](message);
                            message.event.preventDefault();
                            return;
                        }
                    }

                    let eventName = message.name;
                    let methodName = `onEvent${eventName[0].toUpperCase()}${eventName.substring(1)}`;

                    if (FunctionType.verify(this[methodName])) {
                        this[methodName](message);
                        message.event.preventDefault();
                        return;
                    }
                */
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

            this.nodes.set(docNode, {});
        }
    }

    isArray(ref) {
        let shape = this.shape.get(ref);
        return shape && shape.type === ArrayType;
    }

    onMutationAttr(message) {
        let bindings = this.bindingsByDocElement.get(message.target);

        if (bindings) {
            for (let binding of bindings.bindings) {
                if (binding.type == 'attr') {
                    binding.pull();
                }
                else if (binding.type == 'attrToggle') {
                    binding.pull();
                }
                else if (binding.type == 'style') {
                    binding.pull();
                }
            }
        }
    }

    onMutationChildList(message) {
        let bindings = this.bindingsByDocElement.get(message.target);

        if (bindings) {
            for (let binding of bindings.bindings) {
                if (binding.type == 'inner') {
                    binding.pull();
                }
            }
        }
    }

    popValue(dotted) {
        if (StringType.verify(dotted)) {
            let shape = this.shape.get(dotted);
            
            if (shape && shape.getType() == ArrayType) {
                RdsData.delete(this.value, `${dotted}.pop`);
                this.signalBindings(dotted);
            }
        }

        return this;
    }

    pushValue(dotted, value) {
        if (StringType.verify(dotted)) {
            let shape = this.shape.get(dotted);
            
            if (shape && shape.getType() == ArrayType) {
                if (shape.verify([ value ])) {
                    RdsData.set(this.value, `${dotted}.push`, value);
                    this.signalBindings(dotted);
                }
            }
        }

        return this;
    }

    revokeData(dotted) {
        let shape = this.shape.get(dotted);

        if (shape) {
            this.shape.delete(dotted);
            RdsData.delete(this.value, dotted);
        }

        return this;
    }

    setBinding(docElement, ref, type, name) {
        let expr;

        if (typeof ref == 'string' && ref.trim() != '') {
            expr = mkControllerExpr(ref);
        }
        else if (ref instanceof Expr) {
            expr = ref;
        }

        if (expr) {
            for (let dependency of expr.getDependencies()) {
                if (dependency.type == 'controller') {
                    mkControllerBinding(docElement, expr, dependency.dotted, type, name);
                }
            }
        }

        return this;
    }

    setValue(dotted, newValue) {
        let shape = this.shape.get(dotted);

        if (shape) {
            if (shape.verify(newValue)) {
                RdsData.set(this.value, dotted, newValue);
                this.signalBindings(dotted);
            }
            else {
                this.emit({
                    name: 'SetFailed',
                    details: 'value failed verification',
                    dotted: dotted,
                    value: newValue,
                });
            }
        }
        else {
            this.emit({
                name: 'SetFailed',
                details: 'dotted not found',
                dotted: dotted,
                value: newValue,
            });
        }

        return this;
    }

    shiftValue(dotted) {
        if (StringType.verify(dotted)) {
            let shape = this.shape.get(dotted);
            
            if (shape && shape.getType() == ArrayType) {
                RdsData.delete(this.value, `${dotted}.shift`);
                this.signalBindings(dotted);
            }
        }

        return this;
    }

    signalBindings(dotted) {
        let chain;
        let segments = RdsText.split(dotted, '.');

        while (segments.length) {
            chain = chain ? `${chain}.${segments.shift()}` : segments.shift();
            let bindingsByDotted = this.bindingsByDotted[chain];

            if (bindingsByDotted) {
                for (let binding of bindingsByDotted.bindings) {
                    binding.push();
                }
            }
        }

        return this;
    }

    unshiftValue(dotted, value) {
        if (StringType.verify(dotted)) {
            let shape = this.shape.get(dotted);
            
            if (shape && shape.getType() == ArrayType) {
                if (shape.verify([ value ])) {
                    RdsData.set(this.value, `${dotted}.unshift`, value);
                    this.signalBindings(dotted);
                }
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
