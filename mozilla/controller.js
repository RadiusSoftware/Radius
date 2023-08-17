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
            if (this.node instanceof DocElement) {
                this.node.setAttribute(this.attr, this.controller[this.key]);
            }
        }
        else if (this.type == 'inner') {
        }
        else if (this.type == 'style') {
        }
        else if (this.type == 'text') {
            if (this.node instanceof DocText) {
            }
        }

        return this;
    }
});


/*****
*****/
register('', class Controller extends Active {
    static controllers = new WeakMap();

    constructor(element) {
        super();
        this.state.element = element;
        this.state.element.setController(this.getProxy());
        this.state.entanglementsByKey = new Object();
        this.state.entanglementsByNode = new WeakMap();
        this.on(message => this.onKeyChanged(message));
    }

    disentangle(entanglement) {
    }

    disentangleKey(key) {
    }

    disentangleNode(node) {
    }

    ensureEntry(node, key) {
        let byNode = this.state.entanglementsByNode.get(node);

        if (!byNode) {
            this.state.entanglementsByNode.set(node, {
                node: node,
                keys: {},
            });
        }

        if (key) {
            let byKey = this.state.entanglementsByKey[key];

            if (!byKey) {
                this.state.entanglementsByKey[key] = {
                    key: key,
                    nodes: new WeakMap(),
                };
            }
        }
    }

    entangle(entanglement) {
        if (!this.hasEntanglement(entanglement)) {
            this.ensureEntry(entanglement.getNode(), entanglement.getKey());
            const byKey = this.state.entanglementsByKey[entanglement.getKey()];
            const byNode = this.state.entanglementsByNode.get(entanglement.getNode());
            
            if (!(entanglement.getKey() in byNode.keys)) {
                byNode.keys[entanglement.getKey()] = [];
            }
    
            if (!byKey.nodes.has(entanglement.getNode())) {
                byKey.nodes.set(entanglement.getNode(), []);
            }

            byNode.keys[entanglement.getKey()].push(entanglement);
            byKey.nodes.get(entanglement.getNode()).push(entanglement);
            entanglement.getKey() in this ? false : this[entanglement.getKey()] = 'midnight' ;
            entanglement.setNode();
        }
        
        return this;
    }
    
    getElement() {
        return this.state.element;
    }

    getEntanglement(entanglement) {
        const nodeEntry = this.state.entanglementsByNode.get(entanglement.getNode());

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
        const byKey = this.state.entanglementsByKey[key];

        if (byKey) {
            console.log(byKey);
        }

        return [];
    }

    getNodeEntanglements(node) {
    }

    hasEntanglement(entanglement) {
        return this.getEntanglement(entanglement) !== undefined;
    }

    onInputChanged(message) {
    }

    onKeyChanged(message) {
        if (message.updateType == 'change') {
            for (let entanglement of this.getKeyEntanglements(message.key)) {
                console.log(entanglement);
            }
        }
        else if (message.updateType == 'delete') {
        }
    }
});


/*****
*****/
register('myns', class MyController extends Controller {
    constructor(element) {
        super(element);
    }
});
