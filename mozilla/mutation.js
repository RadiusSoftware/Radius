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
 * A Radius object wrapper for the mutation observer features provided by the
 * MDN browser framework.  The primary usage for this class within the framework
 * is to enable controller elements to emit mutation and other related events
 * as the controller's subtree is modified.  These events are provide the ability
 * to cleanly develop dynamic HTML, SVG, MATHML, and Widgets for an application.
*****/
register('', class MutationNotifier extends Emitter {
    constructor(element) {
        super();
        this.element = element;

        this.mutationObserver = new MutationObserver((...args) => {
            this.onMutation(...args);
        });

        this.mutationObserver.observe(this.element.node, {
            childList: true,
            subtree: true,
        });
    }

    async onMutation(records, observer) {
        for (let mutationRecord of records) {
            let mutation = {
                name: 'Mutation',
                added: [],
                attributeName: mutationRecord.attributeName,
                attributeNamespace: mutationRecord.attributeNamespace,
                nextSibling: mutationRecord.nextSibling,
                oldValue: mutationRecord.oldValue,
                previousSibling: mutationRecord.previousSibling,
                removed: [],
                target: wrapTree(mutationRecord.target),
                type: mutationRecord.type,
                owner: this.element,
            };

            for (let i = 0; i < mutationRecord.addedNodes.length; i++) {
                mutation.added.push(wrapTree(mutationRecord.addedNodes.item(i)));
            }

            for (let i = 0; i < mutationRecord.removedNodes.length; i++) {
                mutation.removed.push(wrapTree(mutationRecord.removedNodes.item(i)));
            }

            this.emit(mutation);
        }
    }
});
