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


/*****
*****/
register('', class Entanglement {
    constructor(controller, node, key, type, attr) {
        this.controller = controller;
        this.node = node;
        this.key = key;
        this.type = type;
        this.attr = attr;
    }

    disentangle() {
        this.controller.disentangle(this);
        return this;
    }

    entangle() {
        this.controller.entangle(this);
        return this;
    }

    equivalentTo(entanglement) {
        if (Object.is(entanglement.controller, this.controller)) {
            if (Object.is(entanglement.node, this.node)) {
                if (entanglement.key == this.key) {
                    if (entanglement.type == this.type) {
                        if (entanglement.attr == this.attr) {
                            return true;
                        }
                    }
                }
            }
        }

        return;
    }

    getAttr() {
        return this.attr;
    }

    getKey() {
        return this.key;
    }

    getNode() {
        return this.node;
    }

    getType() {
        return this.type;
    }

    setKey() {
        if (this.type == 'attr') {
        }
        else if (this.type == 'inner') {
        }
        else if (this.type == 'style') {
        }
        else if (this.type == 'text') {
        }

        return this;
    }

    setNode() {
        if (this.type == 'attr') {
            if (this.key in this.controller) {
                this.node.setAttribute(this.attr, this.controller[this.key]);
            }
            else {
                this.node.setAttribute(this.attr, '');
            }
        }
        else if (this.type == 'inner') {
            if (this.key in this.controller) {
                this.node.setInnerHtml(this.controller[this.key]);
            }
            else {
                this.node.setInnerHtml('');
            }
        }
        else if (this.type == 'style') {
            if (this.key in this.controller) {
                this.node.setStyle(this.attr, this.controller[this.key]);
            }
            else {
                this.node.setStyle(this.attr, '');
            }
        }
        else if (this.type == 'text') {
            if (this.key in this.controller) {
                this.node.setText(this.controller[this.key]);
            }
            else {
                this.node.setText('');
            }
        }

        return this;
    }
});


/*****
*****/
register('', class Controller extends Depot {
    constructor(element) {
        super();
        this.state.nextId = 1;
        this.state.element = element;
        this.setControllerId(element);
        this.state.element.setController(this.getProxy());
        this.state.entanglementsByKey = {};
        this.state.entanglementsByNode = {};
        this.on(message => this.onKeyChanged(message));
    }

    disentangle(entanglement) {
        // TODO
    }

    disentangleFunction(key) {
        // TODO
    }

    disentangleKey(key) {
        // TODO
    }

    disentangleNode(node) {
        // TODO
    }

    ensureEntry(node, key) {
        let byNode = this.state.entanglementsByNode[node.ctlId];

        if (!byNode) {
            this.state.entanglementsByNode[node.ctlId] = {
                node: node,
                keys: {},
            };
        }

        if (key) {
            let byKey = this.state.entanglementsByKey[key];

            if (!byKey) {
                this.state.entanglementsByKey[key] = {
                    key: key,
                    nodes: {},
                };
            }
        }
    }

    entangle(entanglement) {
        if (!this.hasEntanglement(entanglement)) {
            this.setControllerId(entanglement.getNode());
            this.ensureEntry(entanglement.getNode(), entanglement.getKey());
            const byKey = this.state.entanglementsByKey[entanglement.getKey()];
            const byNode = this.state.entanglementsByNode[entanglement.getNode().ctlId];
            
            if (!(entanglement.getKey() in byNode.keys)) {
                byNode.keys[entanglement.getKey()] = [];
            }
    
            if (!(entanglement.getNode() in byKey.nodes)) {
                byKey.nodes[entanglement.getNode().ctlId] = [];
            }

            byNode.keys[entanglement.getKey()].push(entanglement);
            byKey.nodes[entanglement.getNode().ctlId].push(entanglement);
            entanglement.getKey() in this ? false : this[entanglement.getKey()] = '' ;
            entanglement.setNode();
        }
        
        return this;
    }

    entangleFunction(func) {
        // TODO
        console.log('entangleFunction()');
        console.log(func);
    }
    
    getElement() {
        return this.state.element;
    }

    getEntanglement(entanglement) {
        const nodeEntry = this.state.entanglementsByNode[entanglement.getNode().ctlId];

        if (nodeEntry) {
            const keyEntry = nodeEntry.keys[entanglement.getKey()];

            if (keyEntry) {
                for (let entanglement2 of keyEntry) {
                    if (entanglement2.equivalentTo(entanglement)) {
                        return entanglement2;
                    }
                }
            }
        }

        return undefined;
    }

    getKeyEntanglements(key) {
        let array = [];
        const byKey = this.state.entanglementsByKey[key];

        if (byKey) {
            for (let entanglementsArray of Object.values(byKey.nodes)) {
                array = array.concat(entanglementsArray);
            }
        }

        return array;
    }

    getNodeEntanglements(node) {
        // TODO
    }

    hasEntanglement(entanglement) {
        return this.getEntanglement(entanglement) !== undefined;
    }

    onInputChanged(message) {
        // TODO
        console.log('\nonInputChanged()');
        console.log(message);
    }

    onKeyChanged(message) {
        if (message.updateType in { add:0, change:0, delete:0 }) {
            for (let entanglement of this.getKeyEntanglements(message.key)) {
                entanglement.setNode();
            }
        }
    }

    setControllerId(node) {
        if (node.ctlId === undefined) {
            node.ctlId = `ctl${this.state.nextId++}`;
        }

        return this;
    }
});


/*****
*****/
register('myns', class MyController extends Controller {
    constructor(element) {
        super(element);
    }
});
