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
 * A simple wrapper for handling nodes of type SVGElement.  It's also use for
 * constructing SVGElements given a tagName.  It's just DocElement extension,
 * and is the base class for any of the SVG...Element objects.  Extension of
 * SVGElement will only occur where it adds value.  Most or prehaps all of the
 * SVGElement classes, with the exception of SVGSVGElement, may not need to be
 * extended.
*****/
register('', class SvgElement extends DocElement {
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
});


/*****
 * An extension of the SVGSVGElement class as provided in the Scalable Vector
 * Graphics, SVG, specification.  The class provides an array of calls for
 * managing the graphics element.  Some calls will construct and insert a new
 * element with the specified tagName at the specified location in the graphics.
 * Other methods will get or remove items.  Remember that all of the standard
 * DocElement features are alrady provided here.
*****/
register('', class SvgGraphics extends SvgElement {
    constructor(arg) {
        super(arg instanceof SVGSVGElement ? arg : 'svg');
    }

    addOption(option) {
        return this;
    }

    addShape(shape) {
        return this;
    }

    getOption(id) {
    }

    getOptions() {
    }

    getShape(id) {
    }

    getShapes() {
    }

    removeOption(arg) {
        return this;
    }

    removeShape(arg) {
        return this;
    }
});
