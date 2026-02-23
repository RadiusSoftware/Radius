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
 * The nodeKey is a symbol that's used for accessing the DocElement object
 * associated with the native browser implemented Node object.  We're just
 * ensuring that no one outside of your code can replace or remove this
 * value since we want our DocElement objects to be stateful.
*****/
const nodeKey = Symbol('NodeKey');


/*****
 * Supporting mechanism for specialized wrappers for standard elements, which
 * extend the features available in the standard set of HTML, SVG, and MATHML
 * elements.
*****/
const htmlElementClasses = {};
const svgElementClasses  = {};
const mathElementClasses = {};


/*****
 * Analyzes the argument type with and returns which DocNode or DocElement type
 * to return to the caller.  In any case, the returned value is always once of
 * the wrapper objects defined in this source file.  If we're unable to find
 * any specific type of object, just return a Text node using the argument as
 * the value to be converted to text.
*****/
define(function wrapNode(node) {
    if (node instanceof Text) {
        return node[nodeKey] ? node[nodeKey] : mkDocText(node);
    }
    else if (node instanceof HTMLElement) {
        if (node[nodeKey]) {
            return node[nodeKey];
        }
        else {
            if (node.tagName.toLowerCase() in htmlElementClasses) {
                return htmlElementClasses[node.tagName.toLowerCase()](node);
            }
            else {
                return mkHtmlElement(node);
            }
        }
    }
    else if (node instanceof SVGElement) {
        if (node[nodeKey]) {
            return node[nodeKey];
        }
        else {
            if (node.tagName.toLowerCase() in svgElementClasses) {
                return svgElementClasses[node.tagName.toLowerCase()](node);
            }
            else {
                return mkSvgElement(node);
            }
        }
    }
    else if (node instanceof MathMLElement) {
        if (node[nodeKey]) {
            return node[nodeKey];
        }
        else {
            if (node.tagName.toLowerCase() in mathElementClasses) {
                return mathElementClasses[node.tagName.toLowerCase()](node);
            }
            else {
                return mkMathElement(node);
            }
        }
    }
    else if (node instanceof DocText) {
        return node;
    }
    else if (node instanceof HtmlElement) {
        return node;
    }
    else if (node instanceof SvgElement) {
        return node;
    }
    else if (node instanceof MathElement) {
        return node;
    }
});


/*****
 * Recursively proceed through all of the nodes in the provided DOM branch to
 * wrap each of the individual nodes with a DocNode object.  In this methodical
 * manner, we can take an entire tree of Npm Nodes objects and ensure that they
 * have all been wrapped.
*****/
define(function wrapTree(root) {
    let stack = [root];

    while (stack.length) {
        let node = stack.pop();
        let docNode = wrapNode(node);

        if (docNode) {
            for (let i = docNode.node.childNodes.length; i > 0; i--) {
                stack.push(docNode.node.childNodes.item(i-1));
            }
        }
    }

    return root instanceof DocNode ? root : root[nodeKey];
});


/*****
 * From creating HTML elements from outer text, out approach is to create a
 * "compiler element" and then set the inner HTML of the compiler element
 * or CE with the outer HTML of what we want to create.  Essentially, the
 * picky element types belong to tables: tbody, thead, tr, td, and th. This
 * compilation approach doesn't work unless you set the inner HTML of the
 * appropriate parent.  That's what this code does.  Moreover, it's smart
 * enough to parse through outer HTML to identify the first tagname if we're
 * dealing with outer HTML instead of a tagname.
*****/
function getCompilerHtmlElement(tagName, outerHtml) {
    if (!tagName) {
        let match = outerHtml.match(/< *([0-9A-Za-z]+)/);

        if (match) {
            tagName = match[1].toLowerCase();
        }
        else {
            return mkHtmlElement('notagname');
        }
    }

    if (tagName in { tbody:0, thead:0 }) {
        return mkHtmlElement('table');
    }
    else if (tagName == 'tr') {
        let table = mkHtmlElement('table').setInnerHtml('<tbody></tbody>');
        return table.getChildAt(0);
    }
    else if (tagName in { td:0, th:0 }) {
        let table = mkHtmlElement('table').setInnerHtml('<tbody><tr></tr></tbody>');
        return table.getChildAt(0).getChildAt(0);
    }
    else {
        return mkHtmlElement('div');
    }
}


/*****
 * Similar to the previous function, this function creates an entire complex
 * HTML element given a tagName and either an array or object of attributes.
 * Keep in min that attributes are optional.  The follow on step is simple
 * enough.  Just create a DIV, set its inner HTML, and then return the created
 * child.
*****/
define(function createElement(tagName, attrs) {
    let attributes = [];

    if (Array.isArray(attrs)) {
        attributes = attrs;
    }
    else if (ObjectType.verify(attrs)) {
        for (let attributeName in attrs) {
            attributes.push({
                name: attributeName,
                value: attrs[attributeName],
            })
        }
    }

    let html = [`<${tagName}`];

    for (let attr of attributes) {
        if (ObjectType.verify(attr.value) || ArrayType.verify(attr.value)) {
            html.push(` ${attr.name}="${Tunnel.push(attr.value)}"`);
        }
        else if (UndefinedType.verify(attr.value) || NullType.verify(attr.value)) {
            html.push(` ${attr.name}`);
        }
        else {
            let string = attr.value.toString();

            if (string) {
                html.push(` ${attr.name}="${string}"`);
            }
            else {
                html.push(` ${attr.name}`);
            }
        }
    }

    html.push(`></${tagName}>`);
    let compiler = getCompilerHtmlElement(tagName, '');
    compiler.setInnerHtml(html.join(''));
    return compiler.getChildAt(0);
});


/*****
 * This is a nice little tricky thing for creating an HTML element from HTML
 * text.  The real trick is to create a DIV element, into which the provided
 * outerHtml is deposited.  Through the magic of the browser, one or more
 * child elements will be created and be part of the DIV.  Finally, return
 * this child or children from the DIV.
*****/
define(function createElementFromOuterHtml(html) {
    let compiler = getCompilerHtmlElement('', html.trim());
    compiler.setInnerHtml(html);

    if (compiler.getChildCount() == 1) {
        let element = compiler.getChildAt(0);
        return element;
    }
    else if (compiler.getChildCount() > 1) {
        return compiler.getChildren();
    }
});


/*****
 * Initialization is how elements are dynamijcally built and configured when
 * added to the document tree.  Note that elements are initialized from the top
 * to the bottom to ensure that controllers have been created and are available
 * when the init() methods are invoked.  Also note that the controller is made
 * available right here to make it available during initialization.
*****/
Doc.on('Mutation-Add', message => {
    for (let addedNode of message.added) {
        let docNodes = addedNode.enumerateDescendents();
        docNodes.unshift(addedNode);

        for (let docNode of docNodes) {
            if (!docNode.initializedSelf) {
                Packages.processNode(docNode);
                docNode.init();
                docNode.initializedSelf = true;
                
                (async () => {
                    await docNode.subTreeInitialization();
                    docNode.subTreeInitialized();

                    docNode.emit({
                        name: 'DocNodeInitialized',
                        element: docNode,
                    });
                })();
            }
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
define(class DocNode extends Emitter {
    constructor(node) {
        super();
        this.node = node;
        this.pinned = {};
        this.initializedSelf = false;
        this.node[nodeKey] = this;
        return this;
    }

    append(...docNodes) {
        for (let docNode of docNodes) {
            this.node.appendChild(docNode.node);
        }

        return this;
    }

    clear() {
        this.node.replaceChildren();
        return this;
    }

    contains(docNode) {
        return this.node.contains(docNode.node);
    }

    deleteProperty(name) {
        delete this.node[name];
        return this;
    }

    dir() {
        console.dir(this.node);
        return this;
    }

    enumerateDescendents() {
        let docNodes = [];
        let stack = this.getChildren().reverse();

        while (stack.length) {
            let docNode = stack.pop();
            docNodes.push(docNode);

            for (let childNode of docNode.getChildren().reverse()) {
                stack.push(childNode);
            }
        }

        return docNodes;
    }

    getChildAt(index) {
        if (index >= 0 && index < this.node.childNodes.length) {
            return wrapTree(this.node.childNodes.item(index));
        }
    }

    getChildByAttr(attrName, attrValue) {
        for (let descendent of this.enumerateElementDescendents()) {
            if (descendent.getAttribute(attrName) == attrValue) {
                return descendent;
            }
        }

        return null;
    }

    getChildCount() {
        return this.node.childNodes.length;
    }

    getChildren() {
        let children = [];

        for (let i = 0; i < this.node.childNodes.length; i++) {
            children.push(wrapTree(this.node.childNodes.item(i)));
        }

        return children;
    }

    getClassName() {
        return Reflect.getPrototypeOf(this).constructor.name;
    }

    getCtor() {
        return Reflect.getPrototypeOf(this).constructor;
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
        if (this.node.firstChild) {
            return wrapTree(this.node.firstChild);
        }
    }

    getImplementation() {
        return this.node;
    }

    getLastChild() {
        if (this.node.lastChild) {
            return wrapTree(this.node.lastChild);
        }
    }

    getNode() {
        return this.node;
    }

    getNodeIndex() {
        for (let i = 0; i < this.node.parentNode.childNodes.length; i++) {
            if (this.node.isSame(this.node.parentNode.childNodes.item(i))) {
                return i;
            }
        }

        return -1;
    }

    getNodeType() {
        return this.node.nodeType;
    }
    
    getParent() {
        if (this.node.parentNode) {
            let wrapped = wrapTree(this.node.parentNode);

            if (wrapped instanceof DocNode) {
                return wrapped;
            }
        }

        return null;
    }
    
    getParentElement() {
        if (this.node.parentElement) {
            let wrapped = wrapTree(this.node.parentElement);

            if (wrapped instanceof DocElement) {
                return wrapped;
            }
        }

        return null;
    }

    getPinned(key) {
        return this.pinned[key];
    }

    getProperty(name) {
        return this.node[name];
    }
    
    getSiblingNext() {
        if (this.node.nextSibling) {
            return wrapTree(this.node.nextSibling);
        }
    }
    
    getSiblingPrev() {
        if (this.node.previousSibling) {
            return wrapTree(this.node.previousSibling);
        }
    }

    getWidget() {
        let node = this;

        while (node) {
            if (node instanceof Widget) {
                return node;
            }

            node = node.getParent();
        }

        return null;
    }

    hasChildNodes() {
        return this.node.hasChildNodes;
    }
    
    hasParent() {
        return this.node.parentNode != null;
    }

    hasPinned(key) {
        return key in this.pinned;
    }

    hasProperty(name) {
        return name in this.node;
    }

    init() {
    }

    insertAfter(...docNodes) {
        if (this.node.parentNode) {
            let nextSibling = this.node.nextSibling;
    
            if (nextSibling) {
                for (let docNode of docNodes) {
                    this.node.parentNode.insertBefore(docNode.node, nextSibling);
                }
            }
            else {
                for (let docNode of docNodes) {
                    this.node.parentNode.appendChild(docNode.node);
                }
            }
        }
    
        return this;
    }

    insertBefore(...docNodes) {
        if (this.node.parentNode) {
            for (let docNode of docNodes) {
                this.node.parentNode.insertBefore(docNode.node, this.node);
            }
        }

        return this;
    }

    isElement() {
        return this instanceof DocElement;
    }

    isHtmlElement() {
        return this instanceof HtmlElement;
    }
    
    isSame(docNode) {
        return this.node.isSameNode(docNode.node);
    }

    isText() {
        return this instanceof DocText;
    }

    log() {
        console.log(this.node);
        return this;
    }

    pin(key, value) {
        this.pinned[key] = value;
        return this;
    }

    prepend(...docNodes) {
        if (this.node.childNodes.length) {
            let beforeChild = this.node.firstChild;

            for (let docNode of docNodes) {
                this.node.insertBefore(docNode.node, beforeChild);
            }
        }
        else {
            for (let docNode of docNodes) {
                this.node.appendChild(docNode.node);
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

    replace(...docNodes) {
        if (this.node.parentNode) {
            if (docNodes.length) {
                let inserted = docNodes[0];
                this.node.parentNode.replaceChild(inserted.node, this.node);

                for (let i = 1; i < docNodes.length; i++) {
                    let docNode = docNodes[i];
                    inserted.insertAfter(docNode);
                    inserted = docNode;
                }
            }
            else {
                this.node.parentNode.removeChild(this.node);
            }
        }

        return this;
    }

    setProperty(name, value) {
        this.node[name] = value;
        return this;
    }
    
    subTreeInitialization() {
        return new Promise((ok, fail) => {
            let count = 0;

            for (let descendent of this.enumerateDescendents()) {
                if (!descendent.initializedSelf) {
                    count++;

                    descendent.once('DocNodeInitialized', message => {
                        count--;

                        if (count == 0) {
                            ok();
                        }
                    });
                }
            }

            if (count == 0) {
                ok();
            }
        });
    }

    subTreeInitialized() {
    }

    unpin(key) {
        delete this.pinned[key];
        return this;
    }
});


/*****
 * DocText is a subclass of DocNode and represents the DOM Text node.  The
 * constructor is used both for constructing a new DocText object and for
 * wrapping an existing DOM node.  DocText nodes should never have child
 * nodes are always leaves within the DOM tree.
*****/
define(class DocText extends DocNode {
    constructor(arg) {
        super(typeof arg == 'string' ? document.createTextNode(arg) : arg);
    }

    append() {
    }
    
    getText() {
        return this.node.wholeText;
    }
    
    getTextLength() {
        return this.node.wholeText.length;
    }

    insertAfter() {
    }

    insertBefore() {
    }

    prepend() {
    }

    setText(arg) {
        if (typeof arg == 'undefined' || arg === null) {
            this.node.deleteData(0, this.getTextLength());
        }
        else if (typeof arg == 'string') {
            this.node.replaceData(0, this.getTextLength(), arg);
        }
        else {
            this.node.replaceData(0, this.getTextLength(), arg.toString());
        }
        
        return this;
    }

    toString() {
        return this.node.wholeText;
    }
});


/*****
 * In essence, this is a proxy class that is used for handling events
 * generated by the DOM tree and emitting them as Radius Messages which are
 * readily handled within a Radius application.  Part of the concept is
 * efficiency.  You don't want to register handlers for every imaginable
 * DOM event unless there's an event handler added to the Radius Element
 * object.  That's the primary purpose for this proxy.
*****/
const eventKey = Symbol('event');

const eventProxy = {
    get: (ev, name) => {
        if (name in ev) {
            return ev[name];
        }
        else if (name in ev[eventKey]) {
            return ev[eventKey][name];
        }
        else {
            return null;
        }
    },
};

define(class ElementEvent {
    constructor(event) {
        this[eventKey] = event;
        return new Proxy(this, eventProxy);
    }

    composedPath(...args) {
        return this[eventKey].composedPath(...args);
    }

    getDataTransfer() {
        return this[eventKey].dataTransfer;
    }

    getRawEvent() {
        return this[eventKey];
    }

    getSrcElement() {
        return wrapTree(this[eventKey].srcElement);
    }

    getTarget() {
        return wrapTree(this[eventKey].target);
    }

    preventDefault(...args) {
        return this[eventKey].preventDefault(...args);
    }

    stopImmediatePropagation(...args) {
        return this[eventKey].stopImmediatePropagation(...args);
    }

    stopPropagation(...args) {
        return this[eventKey].stopPropagation(...args);
    }
});


/*****
 * On the client side, the wrapper classes follow the class hierarchy in the
 * browser's DOM tree.  DocElement provides a number of features associated
 * with the HtmlElement class.  DocElement is the base class for HtmlElement,
 * SvgElement, and MathElement.
*****/
define(class DocElement extends DocNode {
    constructor(node) {
        super(node);
        this.listeners = {};
        this.propagation = mkStringSet();
        this.controller = null;

        for (let attribute of this.getAttributes()) {
            try {
                if (attribute.name.startsWith('evt-')) {
                    let eventName = attribute.name.substring(4);

                    if (eventName == 'all') {
                        eventName = '*';
                    }
                    
                    this.on(eventName, message => {
                        let docElement = this;
                        
                        if (eventName == 'submit') {
                            message.event.preventDefault();

                            if (message.htmlElement.checkValidity() !== true) {
                                return;
                            }
                        }

                        while (docElement) {
                            let value = attribute.value;
                            let handlerName = `on${value[0].toUpperCase()}${value.substring(1)}`;

                            if (docElement.handleEvent(handlerName, message)) {
                                return;
                            }

                            docElement = docElement.getParent();
                        }
                    });
                }
                else if (attribute.name.startsWith('rds-')) {
                    if (attribute.value.startsWith('TUNNEL:')) {
                        let rdsName = attribute.name.substring(4);
                        let value = Tunnel.pop(attribute.value);

                        if (value) {
                            this.pin(rdsName, value);
                        }
                    }
                    else {
                        let rdsName = attribute.name.substring(4);
                        let snakeCase = rdsName.replaceAll('-', '_');
                        let pascalCase = TextUtils.toPascalCase(snakeCase);
                        let rdsValue = typeof attribute.value == 'string' ? attribute.value.trim() : '';
                        this[`getRds${pascalCase}`] = () => rdsValue;
                    }
                }
            }
            catch (e) {
                caught(e);
            }
        }
    }

    appendElement(docElement) {
        return new Promise((ok, fail) => {
            docElement.on('DocNodeInitialized' , docElement => ok());
            this.append(docElement);
        });
    }

    autofocus() {
        if (this.hasAttribute('autofocus')) {
            this.focus();
            return this;
        }

        for (let docElement of this.enumerateElementDescendents()) {
            if (docElement.hasAttribute('autofocus')) {
                docElement.focus();
                return this;
            }
        }

        return this;
    }

    blur() {
        this.node.blur();
        return this;
    }

    clearAttribute(name) {
        this.node.removeAttribute(name);
        return this;
    }

    clearClassName(className) {
        this.node.classList.remove(className);
        return this;
    }

    clearClassNames() {
        this.node.className = '';
        return this;
    }

    clearId() {
        this.node.setAttribute('id', '');
        return this;
    }

    clearStyle(styleName) {
        if (typeof styleName == 'string') {
            this.node.attributeStyleMap.delete(styleName);
        }
        else {
            while (this.node.style.length) {
                let styleProperty = this.node.style.item(0);
                this.node.style.removeProperty(styleProperty);
            }
        }

        return this;
    }

    clearTransition() {
        this.node.attributeStyleMap.delete('transition-behavior');
        this.node.attributeStyleMap.delete('transition-delay');
        this.node.attributeStyleMap.delete('transition-duration');
        this.node.attributeStyleMap.delete('transition-property');
        this.node.attributeStyleMap.delete('transition-timing');
        return this;
    }

    computeNaturalStyle() {
        let computedStyle;
        let parentElement = this.getParentElement();

        if (parentElement) {
            let parentStyle = parentElement.getComputedStyle();
            parentStyle.width = 'auto';
            parentStyle.height = 'auto';

            let container = createElementFromOuterHtml('<span></span>');
            container.setStyle(parentStyle);
            Doc.getBody().append(container);

            let placeholder = createElementFromOuterHtml('<span></span>');
            this.replace(placeholder);

            container.append(this);
            computedStyle = this.getComputedStyle();
            placeholder.replace(this);
            container.remove();
        }

        return computedStyle;
    }

    disablePropagation(eventName) {
        this.propagation.clear(eventName);
        return this;
    }

    enablePropagation(eventName) {
        this.propagation.set(eventName);
        return this;
    }

    entangle(key) {
        if (this.controller) {
            this.controller.set(key);

            if (this.getTagName() in { input:0, select:0, textarea:0 }) {
                this.controller.entangleInput(this, key);
            }
            else {
                this.controller.entangleInner(this, key);
            }
        }

        return this;
    }

    entangleAttribute(name, key) {
        if (this.controller) {
            this.controller.set(key);
            this.controller.entangleAttribute(this, name, key);
        }

        return this;
    }

    entangleAttributeFlag(name, key) {
        if (this.controller) {
            this.controller.set(key);
            this.controller.entangleAttributeFlag(this, name, key);
        }

        return this;
    }
    
    entangleMethod(key, methodName) {
        if (this.controller && typeof this[methodName] == 'function') {
            this.controller.on(key, message => this[methodName](message.value));
            let value = this.controller.get(key);

            if (value !== undefined) {
                this[methodName](value);
            }
        }

        return this;
    }

    enumerateElementDescendents() {
        let elements = [];
        let stack = this.getChildren().reverse();

        while (stack.length) {
            let docNode = stack.pop();

            if (docNode instanceof DocElement) {
                elements.push(docNode);
    
                for (let childNode of docNode.getChildren().reverse()) {
                    stack.push(childNode);
                }
            }
        }

        return elements;
    }

    filterAttributes(...ignoredAttributes) {
        let filtered = {};
        let ignored = mkStringSet(...ignoredAttributes);

        for (let attribute of this.getAttributes()) {
            if (!ignored.has(attribute.name)) {
                filtered[attribute.name] = attribute.value;
            }
        }

        return filtered;
    }

    static filterDocElement(filter, docNode) {
        if (!ObjectType.verify(filter)) {
            return false;
        }

        if (!(docNode instanceof DocNode)) {
            return false;
        }

        if (typeof filter.tagName == 'string') {
            if (docNode.getTagName() != filter.tagName) {
                return false;
            }
        }

        return true;
    }

    filterChildren(filter) {
        let filtered = [];

        for (let docNode of this.getChildren()) {
            if (DocElement.filterDocElement(filter, docNode)) {
                filtered.push(docNode);
            }
        }

        return filtered;
    }

    filterDescendents(filter) {
        let filtered = [];

        for (let docNode of this.enumerateElementDescendents()) {
            if (DocElement.filterDocElement(filter, docNode)) {
                filtered.push(docNode);
            }
        }

        return filtered;
    }

    focus() {
        this.node.focus();
        return this;
    }

    getApplication() {
        return Doc.getBody().getChildAt(0);
    }

    getAttribute(name) {
        return this.node.getAttribute(name);
    }

    getAttributeNames() {
        let attributeNames = [];

        for (let i = 0; i < this.node.attributes.length; i++) {
            let attribute = this.node.attributes.item(i);
            attributeNames.push(attribute.name);
        }

        return attributeNames;
    }

    getAttributes() {
        let attributes = [];

        for (let i = 0; i < this.node.attributes.length; i++) {
            let attribute = this.node.attributes.item(i);
            attributes.push({ name: attribute.name, value: attribute.value });
        }

        return attributes;
    }

    getBoundingClientRect() {
        return this.node.getBoundingClientRect();
    }

    getChildElementAt(index) {
        return this.getChildren().filter(child => child instanceof DocElement)[index];
    }

    getChildElementFirst() {
        if (this.node.firstElementChild) {
            return wrapTree(this.node.firstElementChild);
        }

        return null;
    }

    getChildElementLast() {
        if (this.node.lastElementChild) {
            return wrapTree(this.node.lastElementChild);
        }

        return null;
    }

    getChildElements() {
        return this.getChildren().filter(child => child instanceof DocElement);
    }

    getClassNames() {
        let set = mkStringSet();

        for (let key of this.node.classList) {
            set.set(key)
        }

        return set;
    }

    getClientHeight() {
        return this.node.clientHeight;
    }

    getClientLeft() {
        return this.node.clientLeft;
    }
    
    getClientRects() {
        return this.node.getClientRects()
    }

    getClientTop() {
        return this.node.clientTop;
    }

    getClientWidth() {
        return this.node.clientWidth;
    }
    
    getComputedStyle(key, pseudoElement) {
        let liveStyle = window.getComputedStyle(this.node, pseudoElement);

        if (!key) {
            let computedStyle = {};

            for (let i = 0; i < liveStyle.length; i++) {
                let property = liveStyle.item(i);
                computedStyle[property] = liveStyle[property];
            }

            return computedStyle;
        }
        else {
            return liveStyle[key];
        }
    }

    getController() {
        return this.controller;
    }

    getControllerKey(key) {
        if (this.controller) {
            return this.controller.get(key);
        }

        return undefined;
    }

    getControllerKeys() {
        if (this.controller) {
            return this.controller.getKeys();
        }

        return [];
    }

    getControllerValue(key) {
        if (this.controller) {
            return this.controller.get(key);
        }

        return null;
    }

    getControllerValues() {
        let values = {};

        if (this.controller) {
            return this.controller.getValues();
        }

        return values;
    }

    getId() {
        return this.node.getAttribute('id');
    }

    getInnerHtml() {
        return this.node.innerHTML;
    }

    getOuterHtml() {
        return this.node.outerHTML;
    }

    getScrollHeight() {
        return this.node.scrollHeight;
    }

    getScrollLeft() {
        return this.node.scrollLeft;
    }

    getScrollTop() {
        return this.node.scrollTop;
    }

    getScrollWidth() {
        return this.node.scrollWidth;
    }
    
    getSiblingElementNext() {
        if (this.node.nextElementSibling) {
            return wrapTree(this.node.nextSElementibling);
        }

        return null
    }
    
    getSiblingElementPrev() {
        if (this.node.previousElementSibling) {
            return wrapTree(this.node.previousSElementibling);
        }

        return null;
    }

    getStyle(arg) {
        if (arg) {
            return this.node.style[arg];
        }
        else {
            let style = {};

            for (let i = 0; i < this.node.style.length; i++) {
                let styleProperty = this.node.style.item(i);
                style[styleProperty] = this.node.style[styleProperty];
            }

            return style;
        }
    }
    
    getTagged(tag) {
        for (let docElement of this.enumerateElementDescendents()) {
            for (let attribute of docElement.getAttributes()) {
                if (attribute.name.startsWith('tag-')) {
                    let key = attribute.name.substring(4);
                    
                    if (tag == key) {
                        return docElement;
                    }
                }
            }
        }

        return null;
    }

    getTagName() {
        return this.node.tagName.toLowerCase();
    }

    handleEvent(handlerName, message) {
        if (typeof this[handlerName] == 'function') {
            this[handlerName](message);
            return true;
        }

        return false;
    }

    hasAttribute(name) {
        return mkStringSet(this.node.getAttributeNames()).has(name);
    }

    hasClassName(className) {
        return this.node.classList.contains(className);
    }

    hasController() {
        return this.controller != null;
    }

    hasControllerKey(key) {
        if (this.controller) {
            return this.controller.has(key);
        }

        return false;
    }

    hasPointerCapture(pointerId) {
        return this.node.hasPointerCapture(pointerId);
    }

    hasRds(key) {
        return typeof this[`getRds${key}`] == 'function';
    }
    
    init() {
        super.init();

        if (this.getRdsController) {
            this.controller = mkController();
        }
        else {
            this.controller = null;
            let node = this.getParent();

            while (node) {
                if (node.controller) {
                    this.controller = node.controller;
                    break;
                }

                node = node.getParent();
            }
        }

        if (this.getRdsBind) {
            this.entangle(this.getRdsBind());
        }

        if (this.getRdsBindAttr) {
            let [ key, name ] = this.getRdsBindAttr().split(',');
            this.entangleAttribute(key, name);
        }

        if (this.getRdsBindAttrFlag) {
            let [ key, name ] = this.getRdsBindAttrFlag().split(',');
            this.entangleAttributeFlag(key, name);
        }

        if (this.getRdsBindMethod) {
            let [ key, methodName ] = this.getRdsBindMethod().split(',');
            this.entangleMethod(key, methodName);
        }

        if (this.getRdsDisabled) {
            this.entangleAttributeFlag('disabled', this.getRdsDisabled());
        }

        if (this.getRdsSetValue) {
            for (let entry of Object.entries(TextUtils.parseAttributeEncoded(this.getRdsSetValue()))) {
                let [ key, string ] = entry;
                this.setControllerValue(key, TextUtils.stringToValue(string));
            }
        }

        if (this.getRdsTransition) {
            this.setTransition(this.getRdsTransition())
        }

        if (this.getRdsStyleTrigger) {
            this.setStyleTrigger(this.getRdsStyleTrigger());
        }

        if (this.getRdsFragment) {
            let fragment = Packages.getFragment(this.getRdsFragment());
            this.append(fragment);
        }

        if (this.getRdsDynamicSize) {
            this.setDynamicSize();
        }

        this.runInlineScripts();
    }

    insertAdjacentElement(position, element) {
        this.node.insertAdjacentElement(position, element);
        return this;
    }

    insertAdjacentHtml(position, htmlk) {
        this.node.insertAdjacentHTML(position, html);
        return this;
    }

    insertAdjacentHtml(where, data) {
        this.node.insertAdjacentText(where, data);
        return this;
    }

    isControllerArray(key) {
        if (this.controller) {
            return this.controller.isArray(key);
        }

        return false;
    }

    off(name, handler) {
        super.off(name, handler);
        return this;
    }

    on(name, handler, filter, entangle) {
        if (!(name in this.listeners)) {
            let listener = evt => {
                this.emit({
                    name: name,
                    htmlElement: this,
                    event: mkElementEvent(evt),
                });

                let propagation = nodeKey in evt.target ? evt.target[nodeKey].propagation : false;

                if (!propagation || !propagation.has(evt.type)) {
                    evt.stopPropagation();
                    return;
                }
            };

            this.listeners[name] = listener;
            this.node.addEventListener(name, listener);
        }

        super.on(name, handler, filter, entangle);
        return this;
    }

    once(name, handler, filter) {
        if (!(name in this.listeners)) {
            let listener = evt => {
                this.emit({
                    name: name,
                    htmlElement: this,
                    event: mkElementEvent(evt),
                });

                let propagation = nodeKey in evt.target ? evt.target[nodeKey].propagation : false;

                if (!propagation || !propagation.has(evt.type)) {
                    evt.stopPropagation();
                    return;
                }
            };

            this.listeners[name] = listener;
            this.node.addEventListener(name, listener);
        }

        super.once(name, handler, filter);
        return this;
    }

    queryAll(selector) {
        let selected = [];
    
        if (typeof selector == 'string' && selector != '') {
            let nodeList = this.node.querySelectorAll(selector);
    
            for (let i = 0; i < nodeList.length; i++) {
                selected.push(wrapTree(nodeList.item(i)));
            }
        }
    
        return selected
    }

    queryOne(selector) {
        if (typeof selector == 'string' && selector != '') {
            let selected = this.node.querySelector(selector);

            if (selected) {
                return wrapTree(selected);
            }
        }

        return null;
    }

    runInlineScripts() {
        let element = this;

        for (let childElement of this.getChildElements()) {
            if (childElement.getTagName() == 'script') {
                try {
                    eval(childElement.getInnerHtml());
                }
                catch (e) {}
            }
        }
    }

    selectAncestor(attrEncoded) {
        let htmlElement = this.getParentElement();
        let opts = TextUtils.parseAttributeEncoded(attrEncoded);

        while (htmlElement) {
            if (opts.tagname) {
                if (htmlElement.getTagName() == opts.tagname) {
                    break;
                }
            }
            else if (opts.id) {
                if (htmlElement.getId() == opts.id) {
                    break;
                }
            }

            htmlElement = htmlElement.getParentElement();
        }

        return htmlElement;
    }

    setAttribute(name, value) {
        if (value === undefined) {
            this.node.setAttribute(name, '');
        }
        else {
            this.node.setAttribute(name, value);
        }

        this.emit({
            name: 'AttributeChanged',
            key: name,
            value: this.node.getAttribute(name),
        });

        return this;
    }

    setAttributes(source, ...ignoredAttributes) {
        let ignored = mkStringSet(...ignoredAttributes);

        for (let attribute of source.getAttributes()) {
            if (!ignored.has(attribute.name)) {
                this.setAttribute(attribute.name, attribute.value);
            }
        }

        return this;
    }

    setClassName(className) {
        if (className) {
            this.node.classList.add(className);
        }

        return this;
    }

    setClassNames(classNames) {
        if (classNames) {
            this.node.className = classNames;
        }

        return this;
    }

    setController(controller) {
        this.controller = controller;
        return this;
    }

    setControllerValue(key, value) {
        if (this.controller) {
            this.controller.set(key, value);
        }

        return this;
    }

    setDynamicSize() {
        let parent = this.getParentElement();

        while (parent) {
            let width = parent.getClientWidth();
            let height = parent.getClientHeight();

            if (height && width) {
                this.setStyle({
                    width: `${width}px`,
                    height: `${height}px`,
                });

                break;
            }

            parent = parent.getParentElement();
        }

        if (parent) {
            let observer = new ResizeObserver(entries => {
                let width = entries[0].contentRect.width;
                let height = entries[0].contentRect.height;

                this.setStyle({
                    width: `${width}px`,
                    height: `${height}px`,
                });
            });

            observer.observe(parent.node);
        }
    }

    setId(id) {
        this.node.setAttribute('id', id);
        return this;
    }

    setInnerHtml(innerHtml) {
        this.node.innerHTML = innerHtml;

        this.emit({
            name: 'InnerHtmlChanged',
            innerHtml: innerHtml,
        });

        return this;
    }

    setPointerCapture(pointerId) {
        this.node.setPointerCapture(pointerId);
        return this;
    }

    setOuterHtml(outerHtml) {
        this.node.outerHTML = outerHtml;
        return this;
    }

    setScrollLeft(value) {
        this.node.scrollLeft = value;
        return this;
    }

    setScrollTop(value) {
        this.node.scrollTop = value;
        return this;
    }

    setStyle(arg, value) {
        if (typeof arg == 'object') {
            for (let property in arg) {
                let value = arg[property];
                this.node.style[property] = value;
            }
        }
        else {
            this.node.style[arg] = value;
        }

        return this;
    }

    setStyleTrigger(value) {
        let style0 = {};
        let style1 = {};
        let properties = TextUtils.parseAttributeEncoded(value);

        for (let key in properties) {
            let [ value0, value1 ] = TextUtils.split(properties[key], ',');
            style0[key] = value0;
            style1[key] = value1;
        }

        this.setStyle(style0);
        setTimeout(() => this.setStyle(style1), 20);
        return this;
    }

    setTransition(value) {
        let properties = TextUtils.parseAttributeEncoded(value);
        let transition = {};

        for (let key in properties) {
            if (key == 'behavior') {
                transition['transition-behavior'] = properties[key];
            }
            else if (key == 'delay') {
                transition['transition-delay'] = properties[key];
            }
            else if (key == 'duration') {
                transition['transition-duration'] = properties[key];
            }
            else if (key == 'property') {
                transition['transition-property'] = properties[key];
            }
            else if (key == 'timing') {
                transition['transition-timing-function'] = properties[key];
            }
        }

        this.setStyle(transition);
        return this;
    }

    subTreeInitialized() {
        super.subTreeInitialized();

        for (let childElement of this.getChildElements()) {
            if (childElement.getTagName() == 'script' && childElement.hasAttribute('validitycheck')) {
                let  func;
                let locator;
                let element;
                eval(`func = ${childElement.getInnerHtml().trim()}`);

                if (childElement.getRdsDiagnostic) {
                    locator = childElement.getRdsDiagnostic();
                }

                if (childElement.getRdsElement) {
                    let elementName = childElement.getRdsElement();
                    element = this.getElement(elementName);
                }

                if (typeof func == 'function') {
                    if (locator && typeof locator == 'string') {
                        if (element instanceof HtmlElement) {
                            this.checks.push({
                                func: func,
                                element: element,
                                diagnostic: locator,
                            });
                        }
                    }
                }
            }
        }
    }

    [Symbol.iterator]() {
        return this.getChildElements()[Symbol.iterator]();
    }
});
