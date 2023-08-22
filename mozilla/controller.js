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
 * The Controller, which extends the Entanglements class, owns chunk of real
 * estate on the screen, mean that it contains the display acton logic pertaining
 * to an Element and some or all of its descendents.  Any descentent with its
 * own Controller is treated as a single Element with respect to the Element and
 * its Controller.
*****/
register('', class Controller extends Entanglements {
    constructor(element, fqObjectName) {
        super();
        this.element = element;
        this.depots = {};
        this.element.setController(this);
        this.fqon = mkFqn(fqObjectName);
        this.fqon.getObject()[this.fqon.getName()] = this;

        this.observer = new MutationObserver((records, observer) => {
            this.onDomChange(records, observer);
        });

        this.observer.observe(this.element.node, {
            childList: true,
            subtree: true,
        })
    }

    createDepot(depotName, value) {
        let depot = mkDepot(value);
        this.depots[depotName] = depot;
        this.fqon.getObject()[depotName] = depot;
        return depot;
    }

    getDepot(depotName) {
        return this.depots[depotName];
    }

    getDepots() {
        return Object.values(this.depots);
    }

    getElement() {
        return this.element;
    }

    onDomChange(mutationRecords, observer) {
        for (let mutationRecord of mutationRecords) {
            let docNode = wrapDocNode(mutationRecord.target);

            if (Object.is(docNode.getController(), this)) {
                //console.log(mutationRecord);
            }
        }
    }

    [Symbol.iterator]() {
        // TODO
    }
});
