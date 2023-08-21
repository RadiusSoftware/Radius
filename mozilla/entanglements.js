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

    entangleInner(element, expr) {
        let reflection = this.reflect(expr);

        for (let dependency of reflection.dependencies) {
            let entanglement = mkInnerEntanglement(
                element,
                dependency.depot,
                dependency.key,
                reflection.func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    entangleInput(element, fqDepotName, key) {
        let entanglement = mkInputEntanglement(element, fqDepotName, key);
        this.setEntanglement(entanglement);
        entanglement.push();
    }

    entangleStyle(element, styleProperty, expr) {
        let reflection = this.reflect(expr);

        for (let dependency of reflection.dependencies) {
            let entanglement = mkStyleEntanglement(
                element,
                styleProperty,
                dependency.depot,
                dependency.key,
                reflection.func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    entangleTextNode(docText, expr) {
        let reflection = this.reflect(expr);

        for (let dependency of reflection.dependencies) {
            let entanglement = mkTextNodeEntanglement(
                docText,
                dependency.depot,
                dependency.key,
                reflection.func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    findEntanglement(entanglement) {
        let prototype = Reflect.getPrototypeOf(entanglement);

        for (let i = 0; i < this.entanglements.length; i++) {
            let entangled = this.entanglements[i];

            if (Object.is(Reflect.getPrototypeOf(entangled), prototype)) {
                let equal = true;

                for (let key of Object.keys(entanglement)) {
                    if (key != 'func') {
                        if (entangled[key] != entanglement[key]) {
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
        this.element = element;
        this.depot = depot;
        this.key = key;
        this.func = func;
        this.depot.on(message => this.push());
    }

    push() {
        this.element.setInnerHtml(this.func());
    }
});


/*****
*****/
register('', class InputEntanglement {
    constructor(element, fqDepotName, key) {
        this.element = element;
        this.depot = mkFqn(fqDepotName).getValue(),
        this.key = key;
        this.depot.on(message => this.push());
        this.element.on('input', message => this.pull());
    }

    pull() {
        if (this.element.node.type == 'select-multiple') {
            let length = this.element.node.selectedOptions.length;

            if (length == 0) {
                this.depot[this.key] = '';
            }
            else if (length == 1) {
                this.depot[this.key] = this.element.node.value;
            }

            return;
        }
        
        this.depot[this.key] = this.element.node.value;
    }

    push() {
        this.element.node.value = this.depot[this.key];
    }
});


/*****
*****/
register('', class StyleEntanglement {
    constructor(element, styleProperty, depot, key, func) {
        this.element = element;
        this.styleProperty = styleProperty;
        this.depot = depot;
        this.key = key;
        this.func = func;
        this.depot.on(message => this.push());
    }

    push() {
        this.element.setStyle(this.styleProperty, this.func());
    }
});


/*****
*****/
register('', class TextNodeEntanglement {
    constructor(docText, depot, key, func) {
        this.docText = docText;
        this.depot = depot;
        this.key = key;
        this.func = func;
        this.depot.on(message => this.push());
    }

    push() {
        this.docText.setText(this.func());
    }
});
