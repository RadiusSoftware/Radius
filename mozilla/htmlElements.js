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
 * Specialized define function just for wrapping HTML elements with extension
 * wrappers.  The extension wrappers facilitate additional features such as
 * additional valiation checks in forms.  Note that the extended class MUST be
 * written without a constructor.  The default JS constructor is what's needed
 * for constructing new HtmlElements.  Also note, that the class name must be
 * creates as <tagname cap first letter> HtmlElement.  Break this rule and an
 * error will be generated.
*****/
define(function defineHtmlElement(clss) {
    if (!clss.name.endsWith('HtmlElement')) {
        throw new Error(`Invalid HtmlElement class name: ${clss.name}`);
    }

    let tagName = clss.name.replace('HtmlElement', '').toLowerCase();
    let makerName = `mk${clss.name}`;

    define(clss);
    htmlElementClasses[tagName] = globalThis[makerName];
});


/*****
 * The FormHtmlElement provides simplified form validation features, which may
 * be difficult to incorporate into a Radius package in a clear and unambiguous
 * manner.  We've also added in some useful validation features to perform more
 * complex types of validations with developer-provided functions.
*****/
defineHtmlElement(class FormHtmlElement extends HtmlElement {
    checkValidity() {
        this.valid = true;

        if (!this.node.checkValidity()) {
            for (let check of this.checks) {
                check.element.node.setCustomValidity('');
            }

            return this.valid = false;
        }

        for (let check of this.checks) {
            if (!check.func()) {
                this.valid = false;
                let message = Packages.getString(check.diagnostic);
                check.element.node.setCustomValidity(message);
                break;
            }
        }

        return this.valid;
    }

    getElement(elementName) {
        return wrapTree(this.node.elements[elementName]);
    }

    init() {
        super.init();
        this.valid = false;
        this.checks = [];
        
        for (let element of this.enumerateElementDescendents()) {
            if (element.getTagName() in {
                button: '',
                fieldset: '',
                input: '',
                output: '',
                select: '',
                textarea: '',
            }) {
                element.on('input', message => this.checkValidity());
            }
        }
    }
});
