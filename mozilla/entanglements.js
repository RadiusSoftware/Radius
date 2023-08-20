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
register('', class Entanglements {
    constructor(controller) {
        this.controller = controller;
        this.depots = {};
        this.entanglements = [];
    }

    disentangle(entanglement) {
        // TODO ***********************
    }

    disentangleAll() {
        // TODO ***********************
    }

    disentangleDepot(depot) {
        // TODO ***********************
    }

    disentangleKey(depot, key) {
        // TODO ***********************
    }

    entangleAttribute(element, name, expr) {
        let reflection = this.reflect(expr);

        for (let dependency of reflection.dependencies) {
            let entanglement = mkAttributeEntanglement(
                element,
                name,
                dependency.depot,
                dependency.key,
                reflection.func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    entangleInner(expr) {
        // TODO ***********************
    }

    entangleIput(element, expr) {
        // TODO ***********************
    }

    entangleStyle(name, expr) {
        // TODO ***********************
    }

    entangleTextNode(expr) {
        // TODO ***********************
    }

    findEntanglement(entaglement) {
        for (let i = 0; i < this.entanglements.length; i++) {
            let prototype = Reflect.getPrototypeOf(entanglement);

            if (Object.is(Reflect.getPrototypeOf(this.entanglements[i]), prototype)) {
                let equal = true;

                for (let key of Object.keys(entanglement)) {
                    if (key != 'func') {
                        if (entangle[key] != entanglement[key]) {
                            equal = false;
                            break;
                        }
                    }
                }

                if (equal) {
                    return i;
                }
            }
        }

        return -1;
    }

    getDocNode() {
        return this.docNode;
    }

    getEntanglements() {
        return this.entanglements.slice(0);
    }

    getEntanblementsByDepot(depot) {
    }

    getEntanblementsByKey(depot, key) {
    }

    reflect(expr) {
        let func;
        eval(`func = () => { return ( ${expr} )}`);

        return {
            func: func,
            dependencies: Depot.reflect(func),
        };
    }

    setEntanglement(entanglement) {
        if (this.findEntanglement(entanglement) == -1) {
            this.entanglements.push(entanglement);

            let depot;
            let entanglements;

            if (entanglement.depot.state.depotId in this.depots) {
                depot = this.depots[entanglement.depot.state.depotId];
            }
            else {
                depot = new Object();
                this.depots[entanglement.depot.state.depotId] = depot;
            }

            if (entanglement.key in depot) {
                entanglements = depot[entanglement.key];
            }
            else {
                entanglements = new Array();
                depot[entanglement.key] = entanglements;
            }

            entanglements.push(entanglement);
        }

        return this;
    }

    [Symbol.iterator]() {
        return this.entanglements[Symbol.iterator]();
    }
});


/*****
*****/
register('', class AttributeEntanglement {
    constructor(element, attribute, depot, key, func) {
        this.element = element;
        this.attribute = attribute;
        this.depot = depot;
        this.key = key;
        this.func = func;
        this.depot.on(message => this.push());
    }

    push() {
        this.element.setAttribute(this.attribute, this.func());
    }
});


/*****
*****/
register('', class InnerEntanglement {
    constructor(element, depot, key, func) {
    }

    push() {
    }
});


/*****
*****/
register('', class InputEntanglement {
    constructor(element, depot, key, func) {
    }

    pull() {
    }

    push() {
    }
});


/*****
*****/
register('', class StyleEntanglement {
    constructor(element, property, depot, key, func) {
    }

    push() {
    }
});


/*****
*****/
register('', class TextNodeEntanglement {
    constructor(docText, depot, key, func) {
    }

    push() {
    }
});
/*****
*****
register('', class EntanglementXXX {
    constructor(opts) {
        this.func = func;
        this.key = key;
        this.depot = depot;
        this.node = node;
        this.attr = attr;
        this.attrKey = attrKey;
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

    getController() {
        return this.controller;
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
/*
register('', class Controller extends Emitter {
    constructor(element) {
        super();
        this.element = element;
        this.element.controller = this;
        this.entanglementsByKey = {};
        this.entanglementsByNode = {};
        this.depot = mkDepot();
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
        let byNode = this.entanglementsByNode[node.ctlId];

        if (!byNode) {
            this.entanglementsByNode[node.ctlId] = {
                node: node,
                keys: {},
            };
        }

        if (key) {
            let byKey = this.entanglementsByKey[key];

            if (!byKey) {
                this.entanglementsByKey[key] = {
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
            const byKey = this.entanglementsByKey[entanglement.getKey()];
            const byNode = this.entanglementsByNode[entanglement.getNode().ctlId];
            
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
    
    getElement() {
        return this.element;
    }

    getEntanglement(entanglement) {
        const nodeEntry = this.entanglementsByNode[entanglement.getNode().ctlId];

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
        const byKey = this.entanglementsByKey[key];

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
        //return this.getEntanglement(entanglement) !== undefined;
    }

    onInputChanged(message) {
        // TODO
    }

    onKeyChanged(message) {
        if (message.updateType in { add:0, change:0, delete:0 }) {
            for (let entanglement of this.getKeyEntanglements(message.key)) {
                entanglement.setNode();
            }
        }
    }
});*/
