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

        this.shape = mkRdsShape({});
        this.nodes = new WeakMap();
        this.bindingsByUUID = {};
        this.bindingsByDocElement = new WeakMap();
        this.byUUID = {};

        this.decorated = {
            uuid: Crypto.generateUUID(),
            parent: null,
            shape: this.shape,
            value: {},
        };

        this.on('Set', message => {
            let bindingsByUUID = this.bindingsByUUID[message.uuid];
            
            if (bindingsByUUID) {
                for (let binding of bindingsByUUID.bindings) {
                    if (binding.isEnabled()) {
                        binding.push();
                    }
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
        let decorated = this.getDecorated(dotted);

        if (decorated) {
            let expr = mkControllerExpr(decorated.uuid);

            for (let dependency of expr.getDependencies()) {
                if (dependency.type == 'controller') {
                    let binding = mkControllerBinding(docElement, expr, decorated.uuid, type, name);

                    if (!this.hasBinding(binding)) {
                        this.setBinding(binding);
                    }
                    else {
                        binding.deactivate();
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

            this.import({
                parent: this.decorated,
                key: key,
                dotted: '',
                shape: shape.get(key),
                value: object[key],
            });
        }

        return this;
    }

    deleteBindingsByDocElement(docElement) {
        let bindingEntry = this.bindingsByDocElement.get(docElement);

        if (bindingEntry) {
            this.bindingsByDocElement.delete(docElement);

            for (let binding of bindingEntry.bindings) {
                binding.deactivate();
            }
        }

        return this;
    }

    deleteBindingsByDotted(dotted) {
        return this.deleteBindingsByUUID(this.getUUID(dotted));
    }

    deleteBindingsByUUID(uuid) {
        if (uuid) {
            let bindingEntry = this.bindingsByUUID[uuid];

            if (bindingEntry) {
                delete this.bindingsByUUID[uuid];

                for (let binding of bindingEntry.bindings) {
                    binding.deactivate();
                }
            }
        }

        return this;
    }

    enumerate(decorated) {
        let enumerated = [];

        if (decorated) {
            enumerated.push(decorated);
            let stack = [];

            while (stack.length) {
                let decorated = stack.pop();
                enumerated.push(decorated);

                if (decorated.shape.getType() === ObjectType) {
                    for (let key of Object.keys(decorated.value).reverse()) {
                        stack.push(decorated.value[key]);
                    }
                }
                else if (decorated.shape.getType() === ArrayType) {
                    for (let decoratedElement of decorated.value.reverse()) {
                        stack.push(decoratedElement);
                    }
                }
            }
        }

        return enumerated;
    }

    getDecorated(dotted) {
        if (StringType.verify(dotted) && dotted) {
            let decorated = this.decorated;

            for (let key of RdsText.split(dotted, '.')) {
                if (decorated.shape.getType() === ObjectType) {
                    if (key in decorated.value) {
                        decorated = decorated.value[key];
                        continue;
                    }
                }
                else if (decorated.shape.getType() === ArrayType) {
                    let index = parseInt(key);

                    if (index.toString() == key) {
                        if (index < decorated.value.length) {
                            decorated = decorated.value[index];
                            continue;
                        }
                    }
                }
                
                decorated = undefined;
                break;
            }

            return decorated;
        }
        else {
            return this.decorated;
        }
    }

    getShape(dotted) {
        if (StringType.verify(dotted) && dotted) {
            return this.shape.get(dotted);
        }
        else {
            return this.shape;
        }
    }

    getUUID(dotted) {
        let decorated = this.getDecorated(dotted);
        return decorated ? decorated.uuid : undefined;
    }

    getValue(dotted) {
        let decorated = this.getDecorated(dotted);

        if (decorated) {
            if (decorated.shape.getType().isScalar()) {
                return decorated.value;
            }

            let value;
            let stack = [];

            if (decorated.shape.getType() === ObjectType) {
                value = {};

                stack.push({
                    value: value,
                    decorated: decorated.value,
                });
            }
            else if (decorated.shape.getType() === ArrayType) {
                value = [];

                stack.push({
                    value: value,
                    decorated: decorated.value,
                });
            }

            while (stack.length) {
                let { value, decorated } = stack.pop();

                if (ObjectType.verify(value)) {
                    for (let key in decorated) {
                        let decoratedValue = decorated[key];

                        if (decoratedValue.shape.getType() === ObjectType) {
                            value[key] = {};

                            stack.push({
                                value: value[key],
                                decorated: decoratedValue.value,
                            });
                        }
                        else if (decoratedValue.shape.getType() === ArrayType) {
                            value[key] = [];

                            stack.push({
                                value: value[key],
                                decorated: decoratedValue.value,
                            });
                        }
                        else {
                            value[key] = decoratedValue.value;
                        }
                    }
                }
                else if (ArrayType.verify(value)) {
                    for (let decoratedValue of decorated) {
                        if (decoratedValue.shape.getType() === ObjectType) {
                            // ******************************************************************
                            // ******************************************************************
                            // ******************************************************************
                        }
                        else if (decoratedValue.shape.getType() === ArrayType) {
                            // ******************************************************************
                            // ******************************************************************
                            // ******************************************************************
                        }
                        else {
                            value.push(decoratedValue.value);
                        }
                    }
                }
            }

            return value;
        }
        
        return undefined;
    }

    hasBinding(controllerBinding) {
        if (controllerBinding.isValid()) {
            if (controllerBinding.getUUID() in this.bindingsByUUID) {
                let byUUID = this.bindingsByUUID[controllerBinding.getUUID()];

                for (let binding of byUUID.bindings) {
                    if (binding.getElement().isSame(controllerBinding.getElement())) {
                        if (binding.getType() == controllerBinding.getType()) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    hasData(dotted) {
        let decorated = this.getDecorated(dotted);
        return decorated ? true : false;
    }

    import(parent) {
        let stack = [ parent ];

        while (stack.length) {
            let { parent, key, dotted, shape, value } = stack.pop();
            let uuid = Crypto.generateUUID();
            dotted = dotted ? `${dotted}.${key}` : key;

            let decorated = {
                uuid: uuid,
                dotted: dotted,
                parent: parent,
                shape: shape
            };

            this.byUUID[uuid] = decorated;

            if (shape.getType() === ObjectType) {
                decorated.value = {};
            }
            else if (shape.getType() === ArrayType) {
                decorated.value = [];
            }
            else {
                decorated.value = value;
            }

            if (parent.shape.getType() === ObjectType) {
                parent.value[key] = decorated;
            }
            else if (parent.shape.getType() === ArrayType) {
                parent.value.push(decorated);
            }
            
            if (shape.getType() === ObjectType) {
                for (let key of shape.getKeys().reverse()) {
                    stack.push({
                        parent: decorated,
                        key: key,
                        dotted: dotted,
                        shape: shape.get(key),
                        value: value[key],
                    });
                }
            }
            else if (shape.getType() === ArrayType) {
                for (let i = value.length - 1; i >= 0; i--) {
                    stack.push({
                        parent: decorated,
                        key: i,
                        dotted: dotted,
                        shape: shape.getClass(),
                        value: value[i],
                    });
                }
            }
        }
    }
    
    initNode(docNode) {
        if (!this.nodes.has(docNode)) {
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

            this.nodes.set(docNode, {});
        }
    }

    isArray(dotted) {
        let shape = this.shape.get(dotted);
        return shape && shape.type === ArrayType;
    }

    peekValue(uuid) {
        let decorated = this.byUUID[uuid];
        return decorated ? decorated.value : undefined;
    }

    pokeValue(uuid, newValue) {
        let decorated = this.byUUID[uuid];
        decorated ? this.setValue(decorated.dotted, newValue) : null;
    }

    // **************************************************************************
    // **************************************************************************
    // **************************************************************************
    /*
    pop(dotted) {
        if (StringType.verify(dotted)) {
            let shape = this.shape.get(dotted);
            
            if (shape && shape.getType() == ArrayType) {
                RdsData.delete(this.value, `${dotted}.pop`);
                this.signalBindings(dotted);
            }
        }

        return this;
    }
    */

    // **************************************************************************
    // **************************************************************************
    // **************************************************************************
    /*
    push(dotted, value) {
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
    */

    rebuildArray(dotted, ...arrayElements) {
        let decoratedArray = this.getDecorated(dotted);

        if (decoratedArray) {
            while (decoratedArray.value.length) {
                let decoratedElement = decoratedArray.value.shift();

                for (let decorated of this.enumerate(decoratedElement)) {
                    this.deleteBindingsByUUID(decorated.uuid);
                }
            }

            for (let i = 0; i < arrayElements.length; i++) {
                let value = arrayElements[i];

                this.import({
                    parent: decoratedArray,
                    key: i,
                    dotted: decoratedArray.dotted,
                    shape: decoratedArray.shape.getClass(),
                    value: value,
                });
            }
        }

        this.signalBindings(decoratedArray.uuid, { action: 'refresh' });
        return this;
    }

    revokeData(key) {
        if (key in shape) {
            // **************************************************************************
            // Delete bindings
            // **************************************************************************
            // **************************************************************************
            this.shape.delete(key);
            delete this.value[key];
        }

        return this;
    }

    setBinding(binding) {
        let byDocElement = this.bindingsByDocElement.get(binding.getElement());
        
        if (!byDocElement) {
            byDocElement = {
                docElement: this.docElement,
                bindings: [],
            };

            this.bindingsByDocElement.set(binding.getElement(), byDocElement);
        }

        let byUUID = this.bindingsByUUID[binding.getUUID()];

        if (!byUUID) {
            byUUID = {
                uuid: this.uuid,
                bindings: [],
            };

            this.bindingsByUUID[binding.getUUID()] = byUUID;
        }

        byDocElement.bindings.push(binding);
        byUUID.bindings.push(binding);
        binding.push({ action: 'refresh' });
        return this;
    }

    setValue(dotted, newValue) {
        let decorated = this.getDecorated(dotted);

        if (!decorated) {
            this.emit({
                name: 'SetFailed',
                details: 'dotted not found',
                dotted: dotted,
                value: newValue,
            });
        }

        if (!decorated.shape.verify(newValue)) {
            this.emit({
                name: 'SetFailed',
                details: 'value failed verification',
                dotted: dotted,
                uuid: decorated.uuis,
                value: newValue,
            });
        }

        let stack = [{
            decorated: decorated,
            value: newValue
        }];

        while (stack.length) {
            let { decorated, value } = stack.pop();

            if (decorated.shape.getType() === ObjectType) {
                for (let key  in value) {
                    stack.push({
                        decorated: decorated.value[key],
                        value: value[key]
                    });
                }
            }
            else if (decorated.shape.getType() === ArrayType) {
                this.rebuildArray(decorated.dotted, ...newValue);
            }
            else {
                decorated.value = value;
                this.signalBindings(decorated.uuid);
            }
        }

        return this;
    }

    // **************************************************************************
    // **************************************************************************
    // **************************************************************************
    /*
    shift(dotted) {
        if (StringType.verify(dotted)) {
            let shape = this.shape.get(dotted);
            
            if (shape && shape.getType() == ArrayType) {
                RdsData.delete(this.value, `${dotted}.shift`);
                this.signalBindings(dotted);
            }
        }

        return this;
    }
    */

    signalBindings(uuid, details) {
        let bindingsByUUID = this.bindingsByUUID[uuid];

        if (bindingsByUUID) {
            for (let binding of bindingsByUUID.bindings) {
                binding.push(details);
            }
        }

        return this;

    }

    // **************************************************************************
    // **************************************************************************
    // **************************************************************************
    /*
    unshift(dotted, value) {
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
    */
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
    constructor(uuid) {
        super();
        this.uuid = uuid;
    }

    eval() {
        return Controller.peekValue(this.uuid);
    }

    static fromJson(obj) {
        return mkControllerExpr(obj.uuid);
    }

    getDependencies() {
        return [{
            type: 'controller',
            expr: this,
            uuid: this.uuid,
        }];
    }

    getShapes() {
        return [ mkRdsShape(StringType) ];
    }
});
