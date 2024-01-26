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
const NpmHtml = require('node-html-parser');


/*****
 * Analyzes the argument type with and returns which DocNode or DocElement type
 * to return to the caller.  In any case, the returned value is always once of
 * the wrapper objects defined in this source file.  If we're unable to find
 * any specific type of object, just return a Text node using the argument as
 * the value to be converted to text.
*****/
register('', function wrapDocNode(arg) {
    if (arg instanceof NpmHtml.TextNode) {
        return arg.wrapper ? arg.wrapper : mkDocText(arg);
    }
    else if (arg instanceof DocText) {
        return arg;
    }
    else if (arg instanceof NpmHtml.CommentNode) {
        return arg.wrapper ? arg.wrapper : mkDocText(arg);
    }
    else if (arg instanceof DocComment) {
        return arg;
    }
    else if (arg instanceof NpmHtml.HTMLElement) {
        return arg.wrapper ? arg.wrapper : mkHtmlElement(arg);
    }
    else if (arg instanceof HtmlElement) {
        return arg;
    }
    else if (arg instanceof SvgElement) {
        return arg;
    }
    else if (arg instanceof MathElement) {
        return arg;
    }
    else {
        try {
            return mkDocElement(arg.toString());
        }
        catch (e) {
            return mkDocText(arg.toString());
        }
    }
});


/*****
 * The DocNode class provides a wrapper for existing DOM HTMLElements and Text
 * objects.  This class is NOT used for creating new objects.  It's only for
 * wrapping existing objects with a more efficient API.  DocNode is the base
 * class for DocText and HtmlElement.  Methods in this class are applicable for
 * both types of derived object instances.
*****/
register('', class DocNode extends Emitter {
    constructor(arg) {
        super();

        if (typeof arg == 'string') {
            this.node = NpmHtml.parse(arg);
        }
        else {
            this.node = arg;
        }

        this.node.wrapper = this;
    }

    append(...args) {
        for (let arg of args) {
            this.node.childNodes.push(unwrapDocNode(arg));
        }

        return this;
    }

    getNodeType() {
        return this.node.nodeType;
    }

    [Symbol.iterator]() {
        return this.node.childNodes.map(childNode => wrapDocNode(childNode))[Symbol.iterator]();
    }
});


/*****
*****/
register('', class DocText extends DocNode {
    constructor(arg) {
        super(arg);
    }
});


/*****
*****/
register('', class DocComment extends DocNode {
    constructor(arg) {
        super(arg);
    }
});


/*****
*****/
register('', class DocElement extends DocNode {
    constructor(arg) {
        super(arg);
    }
});


/*****
*****/
register('', class HtmlElement extends DocElement {
    constructor(arg) {
        super(arg);
    }
});


/*****
*****/
register('', class SvgElement extends DocElement {
    constructor(arg) {
        super(arg);
    }
});


/*****
*****/
register('', class MathElement extends DocElement {
    constructor(arg) {
        super(arg);
    }
});
