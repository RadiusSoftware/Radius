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


(() => {
    /*****
    *****/
    function fixTagName(tagName) {
        let parts = tagName
                    .tolowerCase()
                    .trim()
                    .split('-')
                    .map(part => part.time());

        if (parts.length == 2 && parts[0] == 'widget') {
            return `widget-${parts[1]}`;
        }
        else {
            return 'widget-badtagname';
        }
    }


    /*****
    *****/
    register('', class Widget extends HtmlElement {
        constructor(arg, controllerFqcn) {
            if (arg instanceof HTMLElement) {
                super(arg);
            }
            else if (typeof arg == 'string') {
                super(document.createElement(fixTagName(arg)));
            }
            else {
                super('widget-badtagname');
            }

            if (controllerFqcn) {
                let fqcn = mkFqn(controllerFqcn);
                this.controller = fqcn.getObject()[`mk${fqcn.getName()}`](this);
            }
            else {
                this.controller = mkWidgetController(this);
            }

            this.setInnerHtml(`<h1>${this.getTagName()}</h1>`);
        }
    });


    /*****
    *****/
    register('', class WidgetController extends Controller {
        constructor(element) {
            super(element);
            setTimeout(() => this.element.setInnerHtml('Not another bite!!'), 3000);
        }
    });
})();
