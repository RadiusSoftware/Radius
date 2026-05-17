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
        this.nodes = new WeakMap();
        this.bindingsByDotted = {};
        this.data = new WeakMap();
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

    bindShow(docElement, ref, ...values) {
        this.setBinding(docElement, ref, 'show', values);
        return this;
    }

    bindStyle(docElement, styleProperty, ref) {
        this.setBinding(docElement, ref, 'style', styleProperty);
        return this;
    }

    defineData(docElement, shape, value) {
        if (!(docElement instanceof DocElement)) {
            throwError(`Controller define(): docElement must be a DocElement.`);
        }

        if (this.data.has(docElement)) {
            throwError(`Controller define(): docElement data already defined.`);
        }

        if (shape instanceof RdsShape && shape.type == ObjectType) {
            var rdsShape = shape;
        }
        else if (ObjectType.verify(shape)) {
             var rdsShape = mkRdsShape(shape);
        }
        else {
            throwError(`Controller define(): shape must be either of type RdsShape / Object.`);
        }

        let dataEntry = {
            docElement: docElement,
            shape: rdsShape,
        };

        this.data.set(docElement, dataEntry);

        if (!UndefinedType.verify(value)) {
            if (rdsShape.verify(value)) {
                dataEntry.value = value;
            }
            else {
                throwError('Controller define(): invalid value provided.');
            }
        }
        else {
            dataEntry.value = rdsShape.getDefault();
        }

        return this;
    }

    deleteBindingsByDocElement(docElement) {
        let bindingEntry = this.bindingsByDocElement.get(docElement);

        if (bindingEntry) {
            let array = Data.copy(bindingEntry.bindings);

            for (let binding of array) {
                binding.delete();
            }
        }

        return this;
    }

    deleteBindingsByDotted(dotted) {
        let bindingEntry = this.bindingsByDotted[dotted];

        if (bindingEntry) {
            let array = Data.copy(bindingEntry.bindings);

            for (let binding of array) {
                binding.delete();
            }
        }

        return this;
    }

    getDataBin(docElement, dotted) {
        let dataBins = this.getDataBins(docElement);

        if (dataBins.length) {
            if (StringType.verify(dotted)) {
                for (let dataBin of dataBins) {
                    let shape = dataBin.shape.get(dotted);
                    if (shape) return dataBin;
                }
            }
            else {
                return dataBins[0];
            }
        }

        return undefined;
    }

    getDataBins(docElement) {
        let dataBins = [];
        let element = docElement;

        while (element) {
            let dataBin = this.data.get(element);
            dataBin ? dataBins.push(dataBin) : null;
            element = element.getParentElement();
        }

        return dataBins;
    }

    getDataShape(docElement, dotted) {
        let dataBin = this.getDataBin(docElement, dotted);
        
        if (dataBin) {
            if (StringType.verify(dotted)) {
                return dataBin.shape.get(dotted);
            }
            else {
                return dataBin.shape;
            }
        }

        return undefined;
    }

    getDataValue(docElement, dotted) {
        let dataBin = this.getDataBin(docElement, dotted);
        
        if (dataBin) {
            if (StringType.verify(dotted)) {
                return Data.get(dataBin.value, dotted);
            }
            else {
                return dataBin.value;
            }
        }

        return undefined;
    }

    hasData(docElement, dotted) {
        return this.getDataValue(docElement, dotted) != undefined;
    }

    initNode(docNode) {
        if (!this.nodes.has(docNode)) {
            Packages.processNode(docNode);

            if (docNode instanceof DocElement) {
                if (!(docNode instanceof Widget) || docNode.getSetting('stub') != 'true') {
                    this.initRdsDataDefine(docNode);
                    this.initRdsDataSet(docNode);

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

                    if (docNode.getRdsBindShow) {
                        let [ dotted, values ] = RdsText.split(docNode.getRdsBindShow(), ';');
                        this.bindShow(docNode, dotted, ...RdsText.split(values, ','));
                    }

                    if (docNode.getRdsBindStyle) {
                        let [ styleProperty, dotted ] = docNode.getRdsBindStyle().split(',');
                        this.bindStyle(docNode, styleProperty, dotted);
                    }
                }
            }

            docNode.init();
            this.nodes.set(docNode, {});
            
            if (docNode instanceof Widget && docNode.getSetting('stub') == 'true') {
                if (docNode.replacement instanceof DocElement) {
                    docNode.replace(docNode.replacement);
                }
            }
        }
    }

    initRdsDataDefine(docElement) {
        if (docElement.getRdsDataDefine) {
            let shape = {};
            let values = {};

            for (let entry of Object.entries(RdsText.parseAttributeEncoded(docElement.getRdsDataDefine()))) {
                let [ key, typeName ] = entry;
                let tilda = typeName.indexOf('~');
                let valueText = '';

                if (tilda > 0) {
                    valueText = typeName.substring(tilda + 1);
                    typeName = typeName.substring(0, tilda);
                }
                
                if (globalThis[typeName] instanceof BaseType) {
                    shape[key] = globalThis[typeName];

                    if (valueText) {
                        values[key] = shape[key].fromString(valueText);
                    }
                    else {
                        values[key] = shape[key].getDefault();
                    }
                }
            }

            if (Object.keys(shape).length) {
                this.defineData(docElement, shape, values);
            }
        }
    }

    initRdsDataSet(docElement) {
        if (docElement.getRdsDataSet) {
            for (let entry of Object.entries(RdsText.parseAttributeEncoded(docElement.getRdsDataSet()))) {
                let [ dotted, value ] = entry;
                let shape = this.getDataShape(docElement, dotted);
                
                if (shape) {
                    this.setDataValue(docElement, dotted, shape.getType().fromString(value));
                }
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

        return this;
    }

    setDataValue(docElement, dotted, newValue) {
        if (StringType.verify(dotted)) {
            let dataBin = this.getDataBin(docElement, dotted);

            if (dataBin) {
                let shape = dataBin.shape.get(dotted);

                if (shape) {
                    if (shape.verify(newValue)) {
                        let oldValue = Data.get(dataBin.value, dotted);

                        if (Data.ne(oldValue, newValue)) {
                            Data.set(dataBin.value, dotted, newValue);

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
