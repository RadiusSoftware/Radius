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
 * Like the quantum physics principle of entabled particles, an Entanglement
 * is where one or more Objekt properties are tied with a DocNode in a weird and
 * spooky way.  In reality, an entanglement means that a node is automatically
 * bound to Objekt properties, and in the case of input elements, those properties
 * can also be bound to the input value.  There are multiple classes of the
 * Entanglement "interface", which are used to deal with the specifics of each
 * type of implemented entanglement.  Keep in mind that a set of entanglements
 * are bound to a specific controller, which is the controller that's responsible
 * for the bound DocNode or CssStyleSheet.
*****/
define(class Entanglements {
    constructor() {
        this.objekts = {};
        this.entanglements = [];
    }

    entangleAttribute(element, name, func) {
        let reflection = Objekt.reflect(func);

        for (let dependency of reflection) {
            let entanglement = mkAttributeEntanglement(
                element,
                name,
                dependency.objekt,
                dependency.key,
                func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    entangleAttributeFlag(element, name, func) {
        let reflection = Objekt.reflect(func);

        for (let dependency of reflection) {
            let entanglement = mkAttributeFlagEntanglement(
                element,
                name,
                dependency.objekt,
                dependency.key,
                func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    entangleInner(element, func) {
        let reflection = Objekt.reflect(func);

        for (let dependency of reflection) {
            let entanglement = mkInnerEntanglement(
                element,
                dependency.objekt,
                dependency.key,
                func,
            );

            this.setEntanglement(entanglement);
            entanglement.push();
        }
    }

    entangleInput(element, objekt, key) {
        let entanglement = mkInputEntanglement(element, objekt, key);
        this.setEntanglement(entanglement);
        entanglement.push();
    }
 
    findEntanglement(entanglement) {
        let prototype = Reflect.getPrototypeOf(entanglement);

        for (let i = 0; i < this.entanglements.length; i++) {
            let entangled = this.entanglements[i];

            if (Object.verify(Reflect.getPrototypeOf(entangled), prototype)) {
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

    getEntanglements() {
        return this.entanglements.slice(0);
    }

    getEntanglementsByObjekt(objekt) {
        let matching = [];

        if (objekt.reflectId in this.objekts) {
            let objektObject = this.objekts[objekt.reflectId];

            Object.values(objektObject)
            .forEach(array => {
                matching = matching.concat(array);
            });
        }

        return matching;
    }

    getEntanglementsByObjektKey(objekt, key) {
        let matching = [];

        if (objekt.reflectId in this.objekts) {
            let objektObject = this.objekts[objekt.reflectId];

            Object.values(objektObject)
            .forEach(array => {
                matching = matching.concat(array.filter(el => el.key == key));
            });
        }

        return matching;
    }

    setEntanglement(entanglement) {
        if (this.findEntanglement(entanglement) == -1) {
            this.entanglements.push(entanglement);

            let objekt;
            let entanglements;

            if (entanglement.objekt.reflectId in this.objekts) {
                objekt = this.objekts[entanglement.objekt.reflectId];
            }
            else {
                objekt = new Object();
                this.objekts[entanglement.objekt.reflectId] = objekt;
            }

            if (entanglement.key in objekt) {
                entanglements = objekt[entanglement.key];
            }
            else {
                entanglements = new Array();
                objekt[entanglement.key] = entanglements;
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
 * The entanglement of an element's attribute with an expression packed up
 * as a function, denoted as "func".  Note that the caller, the Entanglements
 * object, has already reflected the expr to build it into a function and to
 * determine its dependencies.
*****/
define(class AttributeEntanglement {
    constructor(element, attribute, objekt, key, func) {
        this.element = element;
        this.attribute = attribute;
        this.objekt = objekt;
        this.key = key;
        this.func = func;
        this.objekt.on('Update', message => this.push(), false, 'priority');
        this.element.on('Attribute', message => this.pull(), false, 'priority');
    }

    pull() {
    }

    push() {
        this.element.setAttribute(this.attribute, this.func());
    }
});


/*****
 * The attribute flag entanglement differs from the simple attribute entanglements.
 * The attribute flag entranglement controls whether an attribute exists.  The
 * primary purpose for this type of entanglement is to bind a "disabled" attribute
 * with a flag in the controller.
*****/
define(class AttributeFlagEntanglement {
    constructor(element, attribute, objekt, key, func) {
        this.element = element;
        this.attribute = attribute;
        this.objekt = objekt;
        this.key = key;
        this.func = func;
        this.objekt.on('Update', message => this.push(), false, 'priority');
        this.element.on('Attribute', message => this.pull(), false, 'priority');
    }

    pull() {
    }

    push() {
        if (this.func() === true) {
            this.element.setAttribute(this.attribute);
        }
        else {
            this.element.clearAttribute(this.attribute);
        }
    }
});


/*****
 * The entanglement of an element's inner HTML with an expression, denoted as
 * "expr".  Note that the caller, the Entanglements object, has already reflected
 * the expr to build it into a function and to determine its dependencies.
*****/
define(class InnerEntanglement {
    constructor(element, objekt, key, func) {
        this.element = element;
        this.objekt = objekt;
        this.key = key;
        this.func = func;
        this.objekt.on('Update', message => this.push(), false, 'priority');
        this.element.on('InnerHtmlChanged', message => this.pull(), false, 'priority');
    }

    pull() {
    }

    push() {
        let value = this.func();

        if (ObjectType.verify(value)) {
            this.element.setInnerHtml(JSON.stringify(value, null, 4));
        }
        else {
            this.element.setInnerHtml(value.toString());
        }
    }
});


/*****
 * The entanglement of an input element with a Objekt key, denoted as
 * "fqObjektName" and "key".  Note that the caller, the Entanglements object,
 * has already reflected the expr to build it into a function and to determine
 * its dependencies.
*****/
define(class InputEntanglement {
    constructor(element, objekt, key) {
        this.element = element;
        this.objekt = objekt;
        this.key = key;
        this.objekt.on('Update', message => this.push(), false, 'priority');
        this.element.on('input', message => this.pull(), false, 'priority');
    }

    pull() {
        if (this.element.node.type == 'select-multiple') {
            let length = this.element.node.selectedOptions.length;

            if (length == 0) {
                this.objekt[this.key] = '';
            }
            else if (length == 1) {
                this.objekt[this.key] = this.element.node.value;
            }

            return;
        }
        
        switch (this.element.node.type) {
            case 'number':
                this.objekt[this.key] = this.element.node.valueAsNumber;
                break;

            case 'date':
            case 'datetime-local':
                this.objekt[this.key] = this.element.node.valueAsDate;
                break;

            case 'radio':
                this.objekt[this.key] = this.element.getAttribute('value');
                break;

            case 'checkbox':
                this.objekt[this.key] = this.element.node.checked;
                break;

            default:
                this.objekt[this.key] = this.element.node.value;
                break;
        }
    }

    push() {
        if (this.element.node.type == 'checkbox') {
            this.element.node.checked = this.objekt[this.key];
        }
        else if (this.element.node.type == 'radio') {
            if (this.element.getAttribute('value') == this.objekt[this.key]) {
                this.element.setProperty('checked', true);
            }
            else {
                this.element.setProperty('checked', false);
            }
        }
        else {
            this.element.node.value = this.objekt[this.key];
        }
    }
});
