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
 * The Controller, which extends the Entanglements class, owns a chunk of real
 * estate on the screen, meaning that it contains the display acton logic
 * pertaining to an Element and some or all of its descendents that are not
 * controlled by another controller.  The controller provides an encapsulated
 * object containing viewer and application logic in response to events.
 * A controller is how to make a specialized or specific HTML Element perform
 * specific behaviors.
*****/
register('', class Controller extends Entanglements {
    static controllers = [];

    constructor(element) {
        super();
        this.element = element;
        this.element.setController(this);
        Controller.controllers.push(this);

        this.observer = new MutationObserver((records, observer) => {
            this.onMutation(records, observer);
        });

        this.observer.observe(this.element.node, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeOldValue: true,
        })
    }

    getElement() {
        return this.element;
    }

    async init() {
        return this;
    }

    onAttributeChanged(mutation) {
    }

    onChildListChanged(mutation) {
    }

    onMutation(mutationRecords, observer) {
        for (let mutationRecord of mutationRecords) {
            let mutation = mkMutation(this, mutationRecord);

            if (mutation.isOwned()) {
                switch (mutation.getType()) {
                    case 'attributes':
                        this.onAttributeChanged(mutation);
                        break;

                    case 'childList':
                        this.onChildListChanged(mutation);
                        break;
                }
            }
        }
    }
});


/*****
 * The controller requires real-time data pertaining to changes to the DOM tree
 * to enable the controller logic respond as necessary to make the controller's
 * subtree perform its magic.  This class wraps the built in mutation record to
 * provide features that are incoporate into the Radius framework.
*****/
register('', class Mutation {
    constructor(controller, mutationRecord) {
        this.controller = controller;
        this.mutationRecord = mutationRecord;
        this.ownership = Object.is(this.getTarget().getController(), this.controller);
    }

    getAddedNodes() {
        let added = [];

        for (let i = 0; i < this.mutationRecord.addedNodes.length; i++) {
            added.push(wrapDocNode(this.mutationRecord.addedNodes.item(i)));
        }
    
        return added;
    }

    getAddedNodesCount() {
        return this.mutationRecord.addedNodes.length;
    }

    getAttributeName() {
        return this.mutationRecord.attributeName;
    }

    getOldValue() {
        return 'oldValue' in this.mutationRecord ? this.mutationRecord.oldValue : '';
    }

    getRemovedNodes() {
        let removed = [];

        for (let i = 0; i < this.mutationRecord.addedNodes.length; i++) {
            removed.push(wrapDocNode(this.mutationRecord.removedNodes.item(i)));
        }
    
        return removed;
    }

    getRemovedNodesCount() {
        return this.mutationRecord.removedNodes.length;
    }

    getTarget() {
        return wrapDocNode(this.mutationRecord.target);
    }

    getType() {
        return this.mutationRecord.type;
    }

    isOwned() {
        return this.ownership;
    }

    toString() {
        if (this.mutationRecord.type == 'attributes') {
            console.log(this.mutationRecord);
            return `Attribute: "${this.getAttributeName()}"; TagName: "${this.getTarget().getTagName()}"`;
        }
        else if (this.mutationRecord.type == 'childList') {
            return `Added: ${this.getAddedNodesCount()}; Removed: ${this.getRemovedNodesCount()}`;
        }
        
        return '';
    }
});
