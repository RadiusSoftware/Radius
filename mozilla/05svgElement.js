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
 * The encapsulation of an SVGElement in an HTML document.  In the framework,
 * it extends DocElement, which corresponds to Element Interface in MDN.  The
 * SVGs are special in that we have developed a feature that supports a library
 * of pre-defined SVG elements.  If an element has the rds-library attribute
 * and the attribute's value refers to an entry in the SVG library, the SvgElement
 * will effectively be transformed into an instance of the SVG library entry.
 * Hence, you can re-use SVG elements by name where every needed.  This is kind
 * of like re-using vector graphic images throughout the application.  It is
 * more powerful because an SVG element, which is what's entered into the SVG
 * library, is more than just a drawing.  It can contain iteractive attributes
 * as well.
*****/
define(class SvgElement extends DocElement {
    static library = {};

    constructor(arg) {
        if (arg instanceof SVGElement) {
            super(arg);
        }
        else if (typeof arg == 'string') {
            super(document.createElementNS('http://www.w3.org/2000/svg', arg));
        }
        else {
            throw new Error(`Invalid argument provided to mkSvgElement(): "${arg}"`);
        }
    }

    init() {
        super.init();

        if (this.getRdsShape) {
            let shape = Packages.getShape(this.getRdsShape());
            this.setShape(shape);
        }
    }

    setShape(shape) {
        if (typeof shape == 'string') {
            shape = Packages.getShape(shape);
        }

        if (shape) {
            for (let attribute of shape.attributes) {
                this.setAttribute(attribute.name, attribute.value);
            }

            this.setInnerHtml(shape.innerHtml);
        }
        
        return this;
    }
});
