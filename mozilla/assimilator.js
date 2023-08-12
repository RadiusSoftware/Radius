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
(() => {
    const assimilationKey = Symbol('assimilation');

    register('', class Assimilator {
        constructor(element) {
            this.root = wrapDocNode(element);
        }

        async assimilate() {
            if (this.root instanceof DocElement) {
                const stack = [ this.root ];

                while (stack.length) {
                    let element = stack.pop();
                    await this.assimilateElement(element);

                    for (let child of element.getChildren().reverse()) {
                        if (child.isElement()) {
                            stack.push(child);
                        }
                    }
                }
            }
        }

        async assimilateAttribute(element, attribute) {
            if (attribute.name.startsWith('radius')) {
                const directiveName = attribute.name.split('-')[1];
                console.log(`${element.getName()}.${directiveName}`);
            }
        }

        async assimilateElement(element) {
            if (element.node[assimilationKey]) {
                return;
            }

            element.node[assimilationKey] = true;

            for (let attribute of element.getAttributes()) {
                await this.assimilateAttribute(element, attribute);
            }
        }
    });
})();
