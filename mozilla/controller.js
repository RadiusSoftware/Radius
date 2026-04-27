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

    bindProperty(docElement, property, ref) {
        this.setBinding(docElement, ref, 'property', property);
        return this;
    }

    bindStyle(docElement, styleProperty, ref) {
        this.setBinding(docElement, ref, 'style', styleProperty);
        return this;
    }

    deleteBindings(docElement) {
        // TODO ************************************************************************
        // TODO ************************************************************************
    }

    deleteData(docElement, dotted) {
        // TODO ************************************************************************
        // TODO ************************************************************************
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
        let data = this.getData(docElement);

        if (data) {
            return Data.get(data.value, dotted);
        }

        return undefined;
    }

    hasData(docElement, dotted) {
        return this.getDataValue() != undefined;
    }

    initNode(docNode) {
        if (!this.nodes.has(docNode)) {
            Packages.processNode(docNode);
            docNode.configure();

            if (docNode instanceof DocElement) {
                if (!(docNode instanceof Widget) || docNode.getSetting('type') != 'stub') {
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

                    if (docNode.getRdsBindProperty) {
                        let [ property, dotted ] = docNode.getRdsBindProperty().split(',');
                        this.bindProperty(docNode, property, dotted);
                    }

                    if (docNode.getRdsBindStyle) {
                        let [ styleProperty, dotted ] = docNode.getRdsBindStyle().split(',');
                        this.bindStyle(docNode, styleProperty, dotted);
                    }
                }
            }

            docNode.init();
            this.nodes.set(docNode, {});
            
            if (docNode.hasReplacement()) {
                docNode.replace(docNode.getReplacement());
            }
        }
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

    setBinding(docElement, ref, type, name) {
        let dataEntry = this.getData(docElement);

        if (dataEntry) {
            let expr;

            if (typeof ref == 'string' && ref.trim() != '') {
                expr = mkControllerExpr(docElement, ref);
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
        }
    }

    setDataValue(docElement, dotted, newValue) {
        let data = this.getData(docElement);

        if (data) {
            let shape = data.shape.get(dotted);

            if (shape) {
                if (shape.verify(newValue)) {
                    let oldValue = Data.get(data.value, dotted);

                    if (Data.ne(oldValue, newValue)) {
                        Data.set(data.value, dotted, newValue);

                        this.emit({
                            name: 'Set',
                            dotted: dotted,
                            oldValue: oldValue,
                            newValue: newValue,
                        });

                        return;
                    }
                }
            }
        }

        this.emit({
            name: 'SetFailed',
            dotted: dotted,
            value: newValue,
        });

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
    constructor(docElement, dotted) {
        super();
        this.dotted = dotted;
        this.docElement = docElement;
    }

    eval() {
        return Controller.getDataValue(this.docElement, this.dotted);
    }

    static fromJson(obj) {
        return mkControllerExpr(obj.docElement, obj.dotted);
    }

    getDependencies() {
        return [{
            type: 'controller',
            expr: this,
            docElement: this.docElement,
            dotted: this.dotted,
        }];
    }

    getShapes() {
        return [ mkRdsShape(StringType) ];
    }
});
