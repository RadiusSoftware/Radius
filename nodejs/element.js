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
 * The nodeKey is a symbol that's used for accessing the DocElement object
 * associated with the native browser implemented Node object.  We're just
 * ensuring that no one outside of your code can replace or remove this
 * value since we want our DocElement objects to be stateful.
*****/
const nodeKey = Symbol('NodeKey');


/*****
 * Analyzes the argument type with and returns which DocNode or DocElement type
 * to return to the caller.  In any case, the returned value is always once of
 * the wrapper objects defined in this source file.  If we're unable to find
 * any specific type of object, just return a Text node using the argument as
 * the value to be converted to text.
*****/
register('', function wrapDocNode(arg) {
    if (arg instanceof NpmHtml.TextNode) {
        return arg[nodeKey] ? arg[nodeKey] : mkDocText(arg);
    }
    else if (arg instanceof DocText) {
        return arg;
    }
    else if (arg instanceof NpmHtml.HTMLElement) {
        return arg[nodeKey] ? arg[nodeKey] : mkDocElement(arg);
    }
    else if (arg instanceof DocElement) {
        return arg;
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
    constructor(node) {
        super();
        this.node = node;
        this.pinned = {};
        this.node[nodeKey] = this;
    }

    append(...docNodes) {
        for (let arg of args) {
            this.node.childNodes.push(arg);
        }

        return this;
    }

    clear() {
        this.node.childNodes.splice(0, this.node.childNodes.length);
        return this;
    }

    contains(arg) {
        for (let childNode of this.node.childNodes) {
            if (Object.is(childNode, arg)) {
                return true;
            }
        }
        
        return false;
    }

    getChildAt(index) {
        if (index >= 0 && index < this.node.childNodes.length) {
            return this.node.childNodes[index][nodeKey];
        }
    }

    getChildCount() {
        return this.node.childNodes.length;
    }

    getChildren() {
        return this.node.childNodes.map(childNode => childNode[nodeKey]);
    }

    getDescendants() {
        let descendants = [];
        let stack = this.getChildren();

        while (stack.length) {
            let docNode = stack.pop();
            descendants.push(docNode);
            docNode.getChildren().reverse().forEach(child => stack.push(child));
        }

        return descendants;
    }

    getFirstChild() {
        if (this.node.childNodes.length) {
            return this.node.childNodes[0][nodeKey];
        }
    }

    getLastChild() {
        if (this.node.childNodes.length) {
            return this.node.childNodes[this.node.childNodes.length - 1][nodeKey];
        }
    }
  
    getNextSibling() {
        if (this.node.nextSibling) {
            return wrapDocNode(this.node.nextSibling);
        }
    }

    getNodeIndex() {
        if (this.node.parent) {
            for (let i = 0; i < this.parent.childNodes.length; i++) {
                if (Object.is(this.parent.node, this.node)) {
                    return i;
                }
            }
        }

        return -1;
    }

    getNodeName() {
        /*
        return this.node.nodeName;
        */
    }

    getNodeType() {
        /*
        return this.node.nodeType;
        */
    }

    getNodeValue() {
        /*
        return this.node.nodeValue;
        */
    }
  
    getParent() {
        /*
        if (this.node.parentNode) {
            return wrapDocNode(this.node.parentNode);
        }
        */
    }
  
    getParentElement() {
        /*
        if (this.node.parentElement) {
            return wrapDocNode(this.node.parentElement);
        }
        */
    }
  
    getPrevSibling() {
        /*
        if (this.node.previousSibling) {
            return wrapDocNode(this.node.previousSibling);
        }
        */
    }

    /*
    getPinned(name) {
        return this.pinned[name];
    }

    getTextContent() {
        return this.node.textContent;
    }

    hasChildNodes() {
        return this.node.hasChildNodes;
    }

    hasPinned(name) {
        return name in this.pinned;
    }

    insertAfter(...args) {
        if (this.node.parentNode) {
            let nextSibling = this.node.nextSibling;
  
            if (nextSibling) {
                for (let arg of args) {
                    this.node.parentNode.insertBefore(unwrapDocNode(arg), nextSibling);
                }
            }
            else {
                for (let arg of args) {
                    this.node.parentNode.appendChild(unwrapDocNode(arg));
                }
            }
        }
  
        return this;
    }

    insertBefore(...args) {
        if (this.node.parentNode) {
            for (let arg of args) {
                this.node.parentNode.insertBefore(unwrapDocNode(arg), this.node);
            }
        }

        return this;
    }

    isConnected() {
        return this.node.isConnected;
    }

    isElement() {
        return this.node instanceof Element;
    }

    isHtmlElement() {
        return this.node instanceof HTMLElement
    }
  
    isSame(arg) {
        return unwrapDocNode(arg).isSameNode(this.node);
    }

    isText() {
        return this.node instanceof Text;
    }

    log() {
        console.log(this.node);
        return this;
    }

    prepend(...args) {
        if (this.node.childNodes.length) {
            let beforeChild = this.node.firstChild;

            for (let arg of args) {
                this.node.insertBefore(unwrapDocNode(arg), beforeChild);
            }
        }
        else {
            for (let arg of args) {
                this.node.appendChild(unwrapDocNode(arg));
            }
        }

        return this;
    }

    remove() {
        if (this.node.parentNode) {
            this.node.parentNode.removeChild(this.node);
        }

        return this;
    }

    replace(...args) {
        if (this.node.parentNode) {
            let inserted;

            if (args.length) {
                inserted = wrapDocNode(args[0]);
                this.node.parentNode.replaceChild(unwrapDocNode(inserted), this.node);

                for (let i = 1; i < args.length; i++) {
                    let node = wrapDocNode(args[i]);
                    inserted.insertAfter(node);
                    inserted = node;
                }
            }
            else {
                this.node.parentNode.removeChild(this.node);
            }
        }

        return this;
    }

    setPinned(name, value) {
        this.pinned[name] = value;
        return this;
    }

    setTextContent(content) {
        this.node.textContent = content;
        return this;
    }
    */

    [Symbol.iterator]() {
        return this.getChildren()[Symbol.iterator]();
    }
});


/*****
 * The DocText element is a wrapper the DOM built in Text class.  Instances
 * of DocText are return in API class that refer to the underlying Text class.
 * Moreover, DocText provides a link-free copy function.
*****/
register('', class DocText extends DocNode {
    constructor(node) {
        super(node);
    }
});


/*****
 * An element is distinguished from an HTML Element to be more generic.  It is
 * the base class/interface for node types such as HTMLElement, SVGElement, and
 * MathMLElement.  It has attributes, children, a parent, ... etc.  Just keep
 * in min that this wrapper class is non-specific.
*****/
register('', class DocElement extends DocNode {
    constructor(node) {
        super(node);
        this.indentSize = 2;
    }

    getOuterHtml(hr) {
        let snippets = [];
        const lf = hr ? '\n' : '';
        let stack = [{ node: this.node, indent: 0, pending: false }];

        while (stack.length) {
            let entry = stack.pop();
            const indent = hr ? TextUtils.fillWithChar(entry.indent*this.indentSize, ' ') : '';

            if (entry.node instanceof NpmHtml.HTMLElement) {
                if (entry.pending) {
                    snippets.push(`${indent}</${entry.node.tagName.toLowerCase()}>${lf}`);
                    continue;
                }
                else {
                    snippets.push(`${indent}<${entry.node.tagName.toLowerCase()}`);
                    
                    for (let attributeName in entry.node.attributes) {
                        snippets.push(` attributeName="${entry.node.attributes[attributeName]}"`);
                    }

                    snippets.push(`>${lf}`);
                    entry.pending = true;
                    stack.push(entry);
                }
            }
            else if (entry.node instanceof NpmHtml.TextNode) {

                snippets.push(`${indent}${entry.node.textContent}${lf}`);
                continue;
            }

            for (let i = entry.node.childNodes.length; i > 0; i--) {
                stack.push({
                    node: entry.node.childNodes[i-1],
                    indent: entry.indent+1,
                    pending: false,
                });
            }
        }

        return snippets.join('');
    }
});


/*****
 * This is a nice little tricky thing for creating an HTML element from HTML
 * text.  The first point is that this won't work unless the HTML passsed to
 * this function is the outer HTML for a single HEML element.  It doesn't work
 * on fragments.  Moreover, once we've parsed the HTML, we need to wrap all of
 * the parsed nodes in subclasses of DocNode so that our API is almost the same
 * as that on the Mozilla size of the API.
*****/
register('', function createElementFromOuterHtml(outerHtml) {
function wrapBranch(node) {
        if (node instanceof NpmHtml.HTMLElement) {
            let htmlElement = mkDocElement(node);
            let stack = [].concat(node.childNodes);
    
            while (stack.length) {
                let node = stack.pop();
                let docNode = wrapBranch(node);

                if (docNode) {
                    for (let i = node.childNodes.length; i > 0; i--) {
                        stack.push(node.childNodes[i-1]);
                    }
                }
            }

            return htmlElement;
        }
        else if (node instanceof NpmHtml.TextNode) {
            return mkDocText(node);
        }
    }

    for (let childNode of NpmHtml.parse(outerHtml).childNodes) {
        if (childNode instanceof NpmHtml.HTMLElement) {
            childNode.removeWhitespace();
            let htmlElement = wrapBranch(childNode);
            return htmlElement;
        }
    }
});
