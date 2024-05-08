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
register('', class MutationNotifier extends Emitter {
    constructor(element) {
        super();
        this.element = element;

        this.mutationObserver = new MutationObserver((...args) => {
            this.onMutation(...args);
        });

        this.mutationObserver.observe(this.element, {
            childList: true,
            subtree: true,
        });
    }

    async onMutation(records, observer) {
        for (let record of records) {
        }
    }

    off() {
    }

    on() {
    }

    once() {
    }
});


/*****
*****/
register('', class Mutation {
    constructor(controller, mutationRecord) {
        this.controller = controller;
        this.mutationRecord = mutationRecord;
        this.ownership = Object.is(this.getTarget().getController(), this.controller);
        
        this.observer = new MutationObserver((records, observer) => {
            this.onMutation(records, observer);
        });

        this.observer.observe(this.element.node, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeOldValue: true,
        });
    }

    getAddedNodes() {
        let added = [];

        for (let i = 0; i < this.mutationRecord.addedNodes.length; i++) {
            added.push(wrapNode(this.mutationRecord.addedNodes.item(i)));
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
            removed.push(wrapNode(this.mutationRecord.removedNodes.item(i)));
        }
    
        return removed;
    }

    getRemovedNodesCount() {
        return this.mutationRecord.removedNodes.length;
    }

    getTarget() {
        return wrapNode(this.mutationRecord.target);
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
