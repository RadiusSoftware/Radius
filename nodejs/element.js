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
const NpmHtml = require('node-html-parser');


/*****
 * The nodeKey is a symbol that's used for accessing the DocElement object
 * associated with the native browser implemented Node object.  We're just
 * ensuring that no one outside of your code can replace or remove this
 * value since we want our DocElement objects to be stateful.
*****/
const nodeKey = Symbol('NodeKey');


/*****
 * Here's the list of HTML tags that we're treaing as being void tags.  These
 * tags have NO content and will be represented with a single tag that has no
 * slash:  <hr>, <br>.
*****/
const voidTags = {
    area: 0,
    base: 0,
    br: 0,
    col: 0,
    embed: 0,
    hr: 0,
    img: 0,
    input: 0,
    link: 0,
    meta: 0,
    param: 0,
    source: 0,
    track: 0,
    wbr: 0,
};


/*****
 * Wrap a single Npm node in the appropriate DocNode subclass.  Note that this
 * only wraps individual nodes, not an entire tree.  Use wrapDocTree() to wrap
 * an entire tree or a subtree.  This is the safe method for wrapping an unknown
 * Npm Node with the appropriate DocNode type.  Please note, unlike the MDN
 * version of this code, all document elements are represented with DocElement.
*****/
register('', function wrapNode(node) {
    let docNode;

    if (node instanceof NpmHtml.TextNode) {
        return node[nodeKey] ? node[nodeKey] : mkDocText(node);
    }
    else if (node instanceof DocText) {
        return node;
    }
    else if (node instanceof NpmHtml.HTMLElement) {
        return node[nodeKey] ? node[nodeKey] : mkDocElement(node);
    }
    else if (node instanceof DocElement) {
        return node;
    }
});


/*****
 * Recursively proceed through all of the nodes in the provided DOM branch to
 * wrap each of the individual nodes with a DocNode object.  In this methodical
 * manner, we can take an entire tree of Npm Nodes objects and ensure that they
 * have all been wrapped.
*****/
register('', function wrapTree(node) {
    const root = wrapNode(node);
    let stack = [root.node];

    while (stack.length) {
        let node = stack.pop();
        wrapNode(node);
        node.childNodes.forEach(childNode => stack.push(childNode));
    }

    return root;
});


/*****
 * This function employs the features of our HTML parser to generate a single
 * HtmlElement object from raw HTML text.  This function can be used to generate
 * an entire HTML document structure for generating and manipulating and HTML
 * document or fragment for server-side dyanmic document generation.
*****/
register('', function createDocElementFromOuterHtml(outerHtml) {
    const options = {
        lowerCaseTagName: true,
        comment: false,
        voidTag:{
          tags: Object.keys(voidTags),
          closingSlash: false,
        },
        blockTextElements: {
          script: true,
          noscript: true,
          style: true,
          pre: true,
        }
    };

    for (let childNode of NpmHtml.parse(outerHtml, options).childNodes) {
        if (childNode instanceof NpmHtml.HTMLElement) {
            childNode.removeWhitespace();
            return wrapTree(childNode);
        }
    }

    return mkDocElement('div');
});


/*****
 * Hidden utility function, whose purpose is to encapsulate the mechanics for
 * removing a node from it's position within the DOM tree.  Note that this logic
 * is use repeatedly through the DOM tree feature set.
*****/
function detach(docNode) {
    let index = docNode.getNodeIndex();

    if (index >= 0) {
        docNode.node.parentNode.childNodes.splice(index, 1);
        docNode.node.parentNode = null;
    }
}


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

        if (nodeKey in node) {
            return node[nodeKey];
        }
        else {
            this.node = node;
            this.pinned = {};
            this.node[nodeKey] = this;
            return this;
        }
    }

    append(...docNodes) {
        for (let docNode of docNodes) {
            detach(docNode);
            docNode.node.parentNode = this.node;
            this.node.childNodes.push(docNode.node)
        }

        return this;
    }

    clear() {
        this.node.childNodes.forEach(childNode => childNode.parentNode = null);
        this.node.childNodes.splice(0, this.node.childNodes.length);
        return this;
    }

    contains(docNode) {
        for (let childNode of this.node.childNodes) {
            if (Object.is(childNode, docNode.node)) {
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
        let stack = this.getChildren().reverse();

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

    getImplementation() {
        return this.node;
    }

    getLastChild() {
        if (this.node.childNodes.length) {
            return this.node.childNodes[this.node.childNodes.length - 1][nodeKey];
        }
    }

    getNodeIndex() {
        if (this.node.parentNode) {
            for (let i = 0; i < this.node.parentNode.childNodes.length; i++) {
                if (Object.is(this.node.parentNode.childNodes[i], this.node)) {
                    return i;
                }
            }
        }

        return -1;
    }

    getNodeType() {
        return this.node.nodeType;
    }
  
    getParent() {
        if (this.node.parentNode) {
            return wrapNode(this.node.parentNode);
        }
    }
  
    getParentElement() {
        if (this.node.parentNode instanceof NpmHtml.HTMLElement) {
            return wrapNode(this.node.parentNode);
        }
    }

    getPinned(name) {
        return this.pinned[name];
    }
  
    getSiblingNext() {
        let index = this.getNodeIndex();

        if (index >= 0) {
            if (index < this.node.parentNode.childNodes.length - 1) {
                return this.node.parentNode.childNodes[index + 1][nodeKey];
            }
        }
    }
  
    getSiblingPrev() {
        let index = this.getNodeIndex();

        if (index > 0) {
            return this.node.parentNode.childNodes[index - 1][nodeKey];
        }
    }

    hasChildNodes() {
        return this.node.childNodes.length > 0;
    }

    hasPinned(name) {
        return name in this.pinned;
    }

    insertAfter(...docNodes) {
        let index = this.getNodeIndex();

        if (index == this.node.parentNode.childNodes.length - 1) {
            for (let docNode of docNodes) {
                detach(docNode);
                docNode.node.parentNode = this.node.parentNode;
                this.node.parentNode.childNodes.push(docNode.node);
            }
        }
        else if (index >= 0) {
            for (let docNode of docNodes) {
                detach(docNode);
                docNode.node.parentNode = this.node.parentNode;
                this.node.parentNode.childNodes.splice(index + 1, 0, docNode.node);
            }
        }
  
        return this;
    }

    insertBefore(...docNodes) {
        let index = this.getNodeIndex();

        if (index == 0) {
            for (let docNode of docNodes) {
                detach(docNode);
                docNode.node.parentNode = this.node.parentNode;
                this.node.parentNode.childNodes.unshift(docNode.node);
            }
        }
        else if (index > 0) {
            for (let docNode of docNodes) {
                detach(docNode);
                docNode.node.parentNode = this.node.parentNode;
                this.node.parentNode.childNodes.splice(index, 0, docNode.node);
            }
        }
        
        return this;
    }

    isElement() {
        return this instanceof DocElement;
    }
  
    isSame(docNode) {
        return Object.is(docNode.node, this.node);
    }

    isText() {
        return this instanceof DocText;
    }

    prepend(...docNodes) {
        for (let docNode of docNodes.reverse()) {
            detach(docNode);
            docNode.node.parentNode = this.node;
            this.node.childNodes.unshift(docNode.node);
        }

        return this;
    }

    remove() {
        detach(this);
        return this;
    }

    replace(...docNodes) {
        const index = this.getNodeIndex();

        if (index >= 0) {
            this.node.parentNode.childNodes.splice(
                index,
                1,
                ...(docNodes.map(docNode => {
                    detach(docNode);
                    docNode.node.parentNode = this;
                    return docNode.node;
                }))
            );
        }

        return this;
    }

    setPinned(name, value) {
        this.pinned[name] = value;
        return this;
    }

    [Symbol.iterator]() {
        return this.getChildren()[Symbol.iterator]();
    }
});


/*****
 * DocText is a subclass of DocNode and represents the DOM Text node.  The
 * constructor is used both for constructing a new DocText object and for
 * wrapping an existing DOM node.  DocText nodes should never have child
 * nodes are always leaves within the DOM tree.
*****/
register('', class DocText extends DocNode {
    constructor(arg) {
        if (typeof arg == 'string') {
            super(new NpmHtml.TextNode(arg));
        }
        else {
            super(arg);
        }
    }

    append() {
    }
  
    getText() {
        return this.node.rawText;
    }

    insertAfter() {
    }

    insertBefore() {
    }

    prepend() {
    }

    setText(arg) {
        let text;

        if (typeof arg == 'undefined' || arg === null) {
            text = '';
        }
        else if (typeof arg == 'string') {
            text = arg;
        }
        else {
            text = arg.toString();
        }

        let docText = mkDocText(text);
        this.replace(docText);
        return docText;
    }

    toString() {
        return this.node.rawText;
    }
});


/*****
 * On the server side, we're using a simplified DOM model by pushing all of the
 * element types, Element, HTMLElement, SVGElement, and MATHMLElement, into a
 * single wrapper calss called DocElement.  That's primarily a simplification
 * due to the fact that there's no runtime functionality on the server side so
 * there is no need to differential between element types.
*****/
register('', class DocElement extends DocNode {
    constructor(arg) {
        if (arg instanceof NpmHtml.HTMLElement) {
            super(arg);
        }
        else if (typeof arg == 'string') {
            let tagName = arg.trim().toLowerCase();
            let html = tagName in voidTags ? `<${tagName}>` : `<${tagName}></${tagName}>`;
        
            let htmlElement = NpmHtml.parse(html, {
                lowerCaseTagName: true,
                comment: false,
                voidTag:{
                  tags: Object.keys(voidTags),
                  closingSlash: false,
                },
                blockTextElements: {
                  script: true,
                  noscript: true,
                  style: true,
                  pre: true,
                }
            });
            
            super(htmlElement.childNodes[0]);
        }

        this.indentSize = 2;
    }

    clearAttribute(name) {
        this.node.removeAttribute(name);
        return this;
    }

    clearClassName(className) {
        this.node.classList.remove(className);

        if (this.getClassNames().length == 0) {
            this.node.removeAttribute('class');
        }

        return this;
    }

    clearClassNames() {
        for (let className of this.getClassNames()) {
            this.node.classList.remove(className);
        }

        this.node.removeAttribute('class');
        return this;
    }

    getAttribute(name) {
        return this.node.getAttribute(name);
    }

    getAttributeNames() {
        return Object.keys(this.node.attributes);
    }

    getAttributes() {
        return Object.keys(this.node.attributes).map(key => {
            return { name: key, value: this.node.attributes[key] };
        });
    }

    getChildElementFirst() {
        for (let childNode of this.node.childNodes) {
            if (childNode instanceof NpmHtml.HTMLElement) {
                return childNode[nodeKey];
            }
        }

        return null;
    }

    getChildElementLast() {
        for (let i = this.node.childNodes.length; i > 0; i--) {
            let childNode = this.node.childNodes[i];

            if (childNode instanceof NpmHtml.HTMLElement) {
                return childNode[nodeKey];
            }
        }

        return null;
    }

    getClassNames() {
        let array = [];

        for (let key of this.node.classList._set.keys()) {
            array.push(key);
        }

        return array;
    }

    getHtml(hr, ...nodes) {
        let stack = [];
        let snippets = [];
        const lf = hr ? '\n' : '';

        for (let node of nodes) {
            stack.push({ node: node, indent: 0, pending: false });
        }

        while (stack.length) {
            let entry = stack.pop();
            const indent = hr ? TextUtils.pad(entry.indent*this.indentSize, ' ') : '';

            if (entry.node instanceof NpmHtml.HTMLElement) {
                if (entry.node.rawTagName in voidTags) {
                    snippets.push(`${indent}<${entry.node.tagName.toLowerCase()}`);
                    
                    for (let attributeName in entry.node.attributes) {
                        snippets.push(` ${attributeName}="${entry.node.attributes[attributeName]}"`);
                    }

                    snippets.push(`>${lf}`);               
                }
                else {
                    if (entry.pending) {
                        snippets.push(`${indent}</${entry.node.tagName.toLowerCase()}>${lf}`);
                        continue;
                    }
                    else {
                        snippets.push(`${indent}<${entry.node.tagName.toLowerCase()}`);
                        
                        for (let attributeName in entry.node.attributes) {
                            snippets.push(` ${attributeName}="${entry.node.attributes[attributeName]}"`);
                        }

                        snippets.push(`>${lf}`);
                        entry.pending = true;
                        stack.push(entry);
                    }
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

    getInnerHtml(hr) {
        return this.getHtml(hr, ...this.node.childNodes);
    }

    getOuterHtml(hr) {
        return this.getHtml(hr, this.node)
    }

    getSiblingElementNext() {
        let index = this.getNodeIndex();

        if (index >= 0) {
            for (let i = index + 1; i < this.node.parentNode.childNodes.length; i++) {
                let childNode = this.node.parentNode.childNodes[i];

                if (childNode instanceof NpmHtml.HTMLElement) {
                    return childNode[nodeKey];
                }
            }
        }

        return null;
    }

    getSiblingElementPrev() {
        let index = this.getNodeIndex();

        if (index >= 0) {
            for (let i = index; i > 0; i--) {
                let childNode = this.node.parentNode.childNodes[i-1];

                if (childNode instanceof NpmHtml.HTMLElement) {
                    return childNode[nodeKey];
                }
            }
        }

        return null;
    }

    getTagName() {
        return this.node.rawTagName;
    }

    hasAttribute(name) {
        return name in this.node.attributes;
    }

    hasClassName(className) {
        return this.node.classList._set.has(className);
    }

    queryAll(selector) {
        let selected = [];
  
        if (typeof selector == 'string' && selector != '') {
            for (let node of this.node.querySelectorAll(selector)) {
                selected.push(mkDocElement(node));
            }
        }
  
        return selected
    }

    queryOne(selector) {
        if (typeof selector == 'string' && selector != '') {
            let selected = this.node.querySelector(selector);

            if (selected) {
                return mkDocElement(selected);
            }
        }

        return null;
    }

    setAttribute(name, value) {
        this.node.setAttribute(name, value);
        return this;
    }

    setClassName(className) {
        this.node.classList.add(className);
        return this;
    }

    setClassNames(classNames) {
        this.clearClassNames();

        if (typeof classNames == 'string' && classNames.trim()) {
            for (let className of classNames.trim().split(' ')) {
                if (className.trim()) {
                    this.setClassName(className.trim());
                }
            }
        }

        return this;
    }

    setInnerHtml(innerHtml) {
        const options = {
            lowerCaseTagName: true,
            comment: false,
            voidTag:{
              tags: Object.keys(voidTags),
              closingSlash: false,
            },
            blockTextElements: {
              script: true,
              noscript: true,
              style: true,
              pre: true,
            }
        };
    
        this.clear();
        let htmlElement = NpmHtml.parse(innerHtml, options);
        let childNodes = typeof htmlElement.tagName == 'text' ? htmlElement : htmlElement.childNodes;

        for (let childNode of childNodes) {
            if (childNode.nodeType == 1) {
                childNode.removeWhitespace();
                this.append(wrapNode(childNode));
            }
        }
        
        return this;
    }

    setOuterHtml(outerHtml) {
        let docElement = createDocElementFromOuterHtml(outerHtml);

        if (this.node.parentNode) {
            this.replace(docElement);
            return this;
        }
        else {
            return docElement;
        }
    }
});
