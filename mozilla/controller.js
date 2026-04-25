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
        this.data = new WeakMap();
        this.nodes = new WeakMap();
        this.bindingsByDotted = {};
        this.bindingsByDocElement = new WeakMap();
    }

    bindAttrExists(docElement, attributeName, ref) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindAttrValue(docElement, attributeName, ref) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindMethod(docElement, methodName, ref) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindInner(docElement, ref) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    bindProperty(docElement, property, ref) {
        if (typeof property == 'string' && property.trim() != '') {
            this.setBinding(docElement, ref, 'property', property);
        }

        return this;
    }

    deleteData(docElement) {
        /*
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
        */
    }

    defineData(docElement, shape, value) {
        if (!(docElement instanceof DocElement)) {
            throwError(`Controller define(): docElement must be a DocElement.`);
        }

        if (shape instanceof RdsShape) {
            var rdsShape = shape;
        }
        else if (shape instanceof BaseType) {
             var rdsShape = mkRdsShape(shape);
        }
        else {
            throwError(`Controller define(): shape must be either of type RdsShape or a BaseType.`);
        }

        if (!this.data.has(docElement)) {
            let dataEntry = {
                docElement: docElement,
                shape: shape,
            };

            this.data.set(docElement, dataEntry);

            if (!UndefinedType.verify(value)) {
                if (shape.verify(value)) {
                    dataEntry.value = value;
                }
                else {
                    throwError('Controller define(): invalid value provided.');
                }
            }
        }

        return this;
    }

    getData(docElement) {
        let node = docElement;

        while (node) {
            if (this.data.has(node)) {
                return this.data.get(node);
            }

            node = node.getParent();
        }
        
        return null;
    }

    getDataShape(docElement, dotted) {
        let shape = null;

        if (this.data.has(docElement)) {
            let data = this.data.get(docElement);
            shape = data.shape.get(dotted);
        }

        return shape;
    }

    getDataValue(docElement, dotted) {
        /*
        return Data.get(this.data, dotted);
        */
    }

    hasData(docElement, dotted) {
        /*
        return Data.has(this.data, dotted);
        */
    }

    async initNode(docNode) {
        if (!this.nodes.has(docNode)) {
            Packages.processNode(docNode);

            if (docNode instanceof DocElement) {
                if (docNode.getRdsBind) {
                    if (docNode.getTagName() in { input:0, select:0, textarea:0 }) {
                        this.bindProperty(docNode, 'value', docNode.getRdsBind());
                    }
                    else {
                        this.bindInner(docNode, docNode.getRdsBind());
                    }
                }

                /*
                if (docNode.getRdsBindAttr) {
                    let [ dotted, attrName ] = docNode.getRdsBindAttr().split(',');
                    this.bindAttribute(docNode, attrName, dotted);
                }

                if (docNode.getRdsBindAttrFlag) {
                    let [ dotted, attrName ] = docNode.getRdsBindAttrFlag().split(',');
                    this.bindAttributeFlag(docNode, attrName, dotted);
                }

                if (docNode.getRdsBindMethod) {
                    let [ dotted, methodName ] = docNode.getRdsBindMethod().split(',');
                    this.bindMethod(docNode, methodName, dotted);
                }

                if (docNode.getRdsBindProperty) {
                    let [ property, dotted ] = docNode.getRdsBindProperty().split(',');
                    this.bindProperty(docNode, property, dotted);
                }
                */
            }

            docNode.init();
            this.nodes.set(docNode, {});
            
            if (docNode.hasReplacement()) {
                docNode.replace(docNode.getReplacement());
            }
        }
    }

    setBinding(docElement, ref, type, name) {
        let dataEntry = this.getData(docElement);

        if (dataEntry) {
            let expr;

            if (typeof ref == 'string' && ref.trim() != '') {
                expr = mkControllerExpr(ref)
            }
            else if (ref instanceof Expr) {
                expr = ref;
            }

            if (expr) {
                for (let dependency of expr.getDependencies()) {
                    if (dependency.type == 'controller') {
                        let binding = mkControllerBinding(docElement, dependency.dotted, type, name);
                        console.log(binding);
                    }
                }
            }
        }
    }

    setDataValue(docElement, dotted, newValue) {
        let shape = this.getDataShape(docElement, dotted);

        if (shape) {
            if (shape.verify(newValue)) {
                let oldValue = Data.get(this.data, dotted);

                if (Data.eq(oldValue, newValue)) {
                    this.emit({
                        name: 'SetNoChange',
                        dotted: dotted,
                        value: newValue,
                    });
                }
                else {
                    Data.set(this.data, dotted, newValue);

                    this.emit({
                        name: 'Set',
                        dotted: dotted,
                        oldValue: oldValue,
                        newValue: newValue,
                    });
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
Doc.on('Mutation-Add', async message => {
    for (let addedNode of message.added) {
        let docNodes = addedNode.enumerateDescendents();
        docNodes.unshift(addedNode);

        for (let docNode of docNodes) {
            await Controller.initNode(docNode);
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
        super(dotted);
        this.dotted = dotted;
    }

    async eval() {
        let dotted = await this.evalOperands();
        return Controller.get(dotted);
    }

    static fromJson(obj) {
        return mkCtlExpr(...this.operands);
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


/*****
*****/
define(class ControllerBinding {
    constructor(docElement, dotted, type, name) {
        this.docElement = docElement;
        this.dotted = dotted;
        this.inner = false;
        this.valid = false;
        this.enabled = true;
        
        if (type == 'inner') {
            this.valid = true;
            this.inner = true;
        }
        else if (type in { attrValue:0, attrExists:0, property:0 }) {
            if (typeof name == 'string' && name != '') {
                this.valid = true;
                this.type = type;
                this.name = name;
            }
        }
        else if (type == 'method') {
            if (typeof name == 'string' && name != '') {
                if (name in docElement) {
                    this.valid = true;
                    this.type = type;
                    this.name = name;
                }
            }
        }

        if (this.valid) {
            let binding = ControllerBinding.get(this);
            console.log(binding);
            
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
            return this;
        }
        
        return null;
    }

    delete() {
        // *****************************************************************************
        // *****************************************************************************
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

                            if (binding.type == controllerBinding.type) {
                                if (binding.name == controllerBinding.name) {
                                    return binding;
                                }
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
});
