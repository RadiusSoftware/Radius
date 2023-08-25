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
     * A simplistic function responsible for massaging tag names as the widget
     * tags are processed.  We just want to enforce that there's only one hypen
     * in the tagname and that it starts with "widget-".  If it fails in any
     * way, we'll set a tagname of wdget-badtagname, which should get the 
     * attention of the developer.
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
     * A new Widget can be construted and/or made using the maker of the Widget
     * subclass.  The argument to the subclass can be either an HTML Element or
     * string with the tagName.  If the argument is a string, we have the chance
     * to fix the tagName before constructing the HTML Element object.   Once
     * construction is done, the creator of the object will call setFqcn() to
     * set both the internal fqcn value and the widget's controller.
    *****/
    register('', class Widget extends HtmlElement {
        constructor(arg) {
            if (arg instanceof HTMLElement) {
                super(arg);
            }
            else if (typeof arg == 'string') {
                super(document.createElement(fixTagName(arg)));
            }
            else {
                super('widget-badtagname');
            }
        }

        setFqcn(fqcn) {
            this.fqcn = fqcn;

            if (fqcn.getNamespaceSegments().length) {
                this.controller = fqcn.getObject()[`${fqcn.getNamespace()}mk${fqcn.getName()}Controller`](this);
            }
            else {
                this.controller = fqcn.getObject()[`mk${fqcn.getName()}Controller`](this);
            }
        }
    });
})();
