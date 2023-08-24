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
        if (arg instanceof Text) {
            return arg[nodeKey] ? arg[nodeKey] : mkDocText(arg);
        }
        else if (arg instanceof DocText) {
            return arg;
        }
        else if (arg instanceof HTMLElement) {
            if (arg.tagName.toLowerCase().startsWith('widget-')) {
                if (arg[nodeKey]) {
                    return arg[nodeKey];
                }
                else {
                    let attr = arg.getAttribute('radius-widget');
                    let args = attr ? attr.split(',').map(text => text.trim()) : [];
                    let widget = mkWidget(arg, args[0]);

                    if (args.length >= 2) {
                        mkFqn(args[1], widget.getController());
                    }

                    return widget;
                }
            }
            else {
                return arg[nodeKey] ? arg[nodeKey] : mkHtmlElement(arg);
            }
        }
        else if (arg instanceof Widget) {
            return arg;
        }
        else if (arg instanceof HtmlElement) {
            return arg;
        }
        else if (arg instanceof SVGElement) {
            return arg[nodeKey] ? arg[nodeKey] : mkSvgElement(arg);
        }
        else if (arg instanceof SvgElement) {
            return arg;
        }
        else if (arg instanceof MathMLElement) {
            return arg[nodeKey] ? arg[nodeKey] : mkMathElement(arg);
        }
        else if (arg instanceof MathElement) {
            return arg;
        }
        else {
            return mkDocText(arg.toString());
        }
    });


    /*****
     * Reverses the effect of any DOM node wrapping by returning the naked DOM node
     * object.  The return node extends beyond HTML because it includes our wrapper
     * objects as well as SVG and MathML elements, both of which extend Node.
    *****/
    register('',  function unwrapDocNode(arg) {
        if (arg instanceof DocNode) {
            return arg.node;
        }
        else if (arg instanceof Node) {
            return arg;
        }
        else {
            return document.createTextNode(typeof arg == 'undefined' ? '' : arg);
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

            if (!(nodeKey in node)) {
                this.node[nodeKey] = this;
            }
        }

        append(...args) {
            for (let arg of args) {
                this.node.appendChild(unwrapDocNode(arg));
            }

            return this;
        }

        clear() {
            this.node.replaceChildren();
            return this;
        }

        contains(arg) {
            return this.node.contains(unwrapDocNode(arg));
        }

        dir() {
            console.dir(this.node);
            return this;
        }

        getChildAt(index) {
            if (index >= 0 && index < this.node.childNodes.length) {
                return wrapDocNode(this.node.childNodes.item(index));
            }
        }

        getChildCount() {
            return this.node.childNodes.length;
        }

        getChildren() {
            let children = [];

            for (let i = 0; i < this.node.childNodes.length; i++) {
                children.push(wrapDocNode(this.node.childNodes.item(i)));
            }

            return children;
        }

        getDescendants() {
            let stack = this.children();
            let descendants = [];

            while (stack.length) {
                let docNode = stack.pop();
                descendants.push(docNode);
                docNode.children().reverse().forEach(child => stack.push(child));
            }

            return descendants;
        }

        getDoc() {
            let owner = this.node.ownerDocument;

            if (owner) {
                return mkDoc(owner);
            }

            return null;
        }

        GetFirstChild() {
            if (this.node.firstChild) {
                return wrapDocNode(this.node.firstChild);
            }
        }

        getLastChild() {
            if (this.node.lastChild) {
                return wrapDocNode(this.node.lastChild);
            }
        }

        getName() {
            return this.node.nodeName.toLowerCase();
        }
      
        getNextSibling() {
            if (this.node.nextSibling) {
                return wrapDocNode(this.node.nextSibling);
            }
        }

        getNodeName() {
            return this.node.nodeName;
        }

        getNodeType() {
            return this.node.nodeType;
        }

        getNodeValue() {
            return this.node.nodeValue;
        }
      
        getParent() {
            if (this.node.parentNode) {
                return wrapDocNode(this.node.parentNode);
            }
        }
      
        getParentElement() {
            if (this.node.parentElement) {
                return wrapDocNode(this.node.parentElement);
            }
        }
      
        getPrevSibling() {
            if (this.node.previousSibling) {
                return wrapDocNode(this.node.previousSibling);
            }
        }

        getTextContent() {
            return this.node.textContent;
        }

        hasChildNodes() {
            return this.node.hasChildNodes;
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

        setTextContent(content) {
            this.node.textContent = content;
            return this;
        }

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
        constructor(arg) {
            super(typeof arg == 'string' ? document.createTextNode(arg) : unwrapDocNode(arg));
        }
      
        getText() {
            return this.node.wholeText;
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

            let oldNode = this.node;
            let newNode = new Text(text);
            newNode[nodeKey] = this;
            oldNode.parentNode.replaceChild(newNode, oldNode);
            this.node = newNode;

            return this;
        }

        toString() {
            return this.node.wholeText;
        }
    });


    /*****
     * A wrapper class for native DOM-related events.  The intention is to provide
     * additional data and additional features to enhance code that uses and handles
     * HTML-generated events.
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

    register('', class ElementEvent {
        constructor(event) {
            this[eventKey] = event;
            return new Proxy(this, eventProxy);
        }

        composedPath(...args) {
            return this[eventKey].composedPath(...args);
        }

        getEvent() {
            return this[eventKey];
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
     * An element is distinguished from an HTML Element to be more generic.  It is
     * the base class/interface for node types such as HTMLElement, SVGElement, and
     * MathMLElement.  It has attributes, children, a parent, ... etc.  Just keep
     * in min that this wrapper class is non-specific.
    *****/
    register('', class DocElement extends DocNode {
        constructor(node) {
            super(node);
            this.listeners = {};
            this.contoller = null;
            this.propagation = mkStringSet();
        }

        animate() {
            console.log('TBD DocElement.animate()');
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

        disablePropagation(eventName) {
            this.propagation.clear(eventName);
            return this;
        }

        enablePropagation(eventName) {
            this.propagation.set(eventName);
            return this;
        }

        getAnimation() {
            console.log('TBD DocElement.getAnimation()');
        }

        getAttribute(name) {
            return this.node.getAttribute(name);
        }

        getAttributeNames() {
            return this.node.getAttributeNames();
        }

        getAttributes() {
            return this.node.getAttributeNames().map(attrName => {
                return { name: attrName, value: this.node.getAttribute(attrName) };
            });
        }

        getBoundingClientRect() {
            return this.node.getBoundingClientRect()
        }

        getBoundingRects() {
            return this.node.getBoundingRects()
        }

        getClassNames() {
            let set = mkStringSet();

            for (let key of this.node.classList.keys()) {
                set.set(key)
            }

            return set;
        }

        getClientLeft() {
            return this.node.clientLeft;
        }

        getClientHeight() {
            return this.node.clientHeight;
        }

        getClientTop() {
            return this.node.clientTop;
        }

        getClientWidth() {
            return this.node.clientWidth;
        }

        getComputedStyle(pseudoElement) {
            return window.getComputedStyle(this.node, pseudoElement);
        }

        getController() {
            let docNode = this;

            while (docNode) {
                if (docNode.controller) {
                    return docNode.controller;
                }

                docNode = docNode.getParent();
            }

            return null;
        }

        getFirstElementChild() {
            if (this.node.firstElementChild) {
                return wrapDocNode(this.node.firstElementChild);
            }

            return null;
        }

        getLastElementChild() {
            if (this.node.lastElementChild) {
                return wrapDocNode(this.node.lastElementChild);
            }

            return null;
        }

        getInnerHtml() {
            return this.node.innerHTML;
        }
      
        getNextextElementSibling() {
            if (this.node.nextElementSibling) {
                return wrapDocNode(this.node.nextSElementibling);
            }

            return null
        }

        getOuterHtml() {
            return this.node.outerHTML;
        }
      
        getPrevElementSibling() {
            if (this.node.previousElementSibling) {
                return wrapDocNode(this.node.previousSElementibling);
            }

            return null;
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

        getTagName() {
            return this.node.tagName.toLowerCase();
        }

        hasAttribute(name) {
            return mkStringSet(this.node.getAttributeNames()).has(name);
        }

        hasClassName(className) {
            return this.node.classList.contains(className);
        }

        hasPointerCapture(pointerId) {
            return this.node.hasPointerCapture(pointerId);
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

        off(name, handler) {
            super.off(name, handler);
            return this;
        }

        on(name, handler, filter) {
            if (!(name in this.listeners)) {
                this.node.addEventListener(name, event => {
                    this.send({
                        name: name,
                        htmlElement: this,
                        event: mkElementEvent(event),
                    });

                    let propagation = nodeKey in event.target ? event.target[nodeKey].propagation : false;

                    if (!propagation || !(event.type in propagation)) {
                        event.stopPropagation();
                        return;
                    }
                });
            }

            super.on(name, handler, filter);
            return this;
        }

        once(name, handler, filter) {
            if (!(name in this.listeners)) {
                this.node.addEventListener(name, event => {
                    this.send({
                        name: name,
                        htmlElement: this,
                        event: mkElementEvent(event),
                    });

                    let propagation = nodeKey in event.target ? event.target[nodeKey].propagation : false;

                    if (!propagation || !(event.type in propagation)) {
                        event.stopPropagation();
                        return;
                    }
                });
            }

            super.once(name, handler, filter);
            return this;
        }

        queryAll(selector) {
            let selected = [];
      
            if (typeof selector == 'string' && selector != '') {
                let nodeList = this.node.querySelectorAll(selector);
      
                for (let i = 0; i < nodeList.length; i++) {
                    selected.push(mkHtmlElement(nodeList.item(i)));
                }
            }
      
            return selected
        }

        queryOne(selector) {
            if (typeof selector == 'string' && selector != '') {
                let selected = this.node.querySelector(selector);

                if (selected) {
                    return mkHtmlElement(selected);
                }
            }

            return null;
        }

        setAttribute(name, value) {
            if (value === undefined) {
                this.node.setAttribute(name, '');
            }
            else {
                this.node.setAttribute(name, value);
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
            if (!this.controller) {
                this.controller = controller;
            }

            return this;
        }

        setInnerHtml(innerHtml) {
            this.node.innerHTML = innerHtml;
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
    });


    /*****
     * The HtmlElement provides a wrapper for the underlying DOM HTMLElement object.
     * Primarily, it's an extension or refrinement of the underlying DOM API and is
     * oriented to facilitate chaining function calls, where possible.  Note that get
     * and has calls do NOT logically support chaining.  Additionally, this class
     * also wraps the standard Emitter class to make the event-structure associated
     * with an HMTLElement fits within the framework API for events and messaging.
    *****/
    register('', class HtmlElement extends DocElement {
        constructor(arg) {
            if (arg instanceof HTMLElement) {
                super(arg);
            }
            else if (arg instanceof HtmlElement) {
                super(arg.node)
            }
            else if (typeof arg == 'string') {
                super(document.createElement(arg.toLowerCase()));
            }
            else {
                super(document.createElement('noname'));
            }
        }

        blur() {
            setTimeout(() => this.node.blur(), 10);
            return this;
        }

        clearData(key) {
            delete this.node.dataset[name];
            return this;
        }

        clearStyle() {
            while (this.node.style.length) {
                let styleProperty = this.node.style.item(0);
                this.node.style.removeProperty(styleProperty);
            }

            return this;
        }

        clearTabIndex() {
            this.node.tabIndex = 0;
            return this;
        }

        click() {
            setTimeout(() => this.node.click(), 10);
            return this;
        }

        disable() {
            this.setAttribute('disabled');
            return this;
        }

        enable() {
            this.clearAttribute('disabled');
            return this;
        }

        focus() {
            setTimeout(() => this.node.focus(), 10);
            return this;
        }

        getData(key) {
            return this.node.dataset[key];
        }

        getId() {
            return this.node.id;
        }

        getOffset() {
            let x = 0;
            let y = 0;
            let dx = 0;
            let dy = 0;
            let node = this.node;

            if (node) {
                dx = node.offsetWidth;
                dy = node.offsetHeight;

                while (node) {
                    if (node.nodeName.toLowerCase() in { body:0, head:0, html:0 }) {
                        break;
                    }

                    x += node.offsetLeft;
                    y += node.offsetTop;
                    node = node.offsetParent;
                }
            }

            return { left:x, top:y, width:dx, height:dy };
        }

        getOffsetHeight() {
            return this.node.offsetHeight;
        }

        getOffsetLeft() {
            return this.node.offsetLeft;
        }

        getOffsetTop() {
            return this.node.offsetTop;
        }

        getOffsetWidth() {
            return this.node.offsetWidth;
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

        getTabIndex() {
            return this.node.tabIndex;
        }

        getTitle() {
            return this.node.title;
        }

        hasData(key) {
            return key in this.node.dataset;
        }

        isDisabled() {
            return this.hasAttribute('disabled');
        }

        isEnabled() {
            return !this.hasAttribute('disabled');
        }

        setData(name, value) {
            this.node.dataset[name] = value;
            return this;
        }

        setId(id) {
            this.node.id = id;
            return this;
        }

        setInnerText(text) {
            this.node.innerText = text;
            return this;
        }

        setOuterText(text) {
            this.node.outerText = text;
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

        setTabIndex(index) {
            if (typeof index == 'number' && index > 0) {
            }
            else {
                this.node.tabIndex = 0;
            }

            return this;
        }

        setTitle(title) {
            this.node.title = title;
            return this;
        }
    });


    /*****
     * This is a nice little tricky thing for creating an HTML element from HTML
     * text.  The first point is that this won't work unless the HTML passsed to
     * this function is the outer HTML for a single HEML element.  It doesn't work
     * on fragments.  The second point is that we need first create an element with
     * the proper tagName and then attach that tag to our <COMPILER></COMPILER>
     * HTML element.  Next, set the outer HTML equal to the outerHtml paramrter.
     * The browser compiles it and replaces the original stub with a new stub.
     * That's why we need to then fetch the first child from either the parent or
     * the <COMPILER></COMPILER> HTML element.
    *****/
    const requiredParents = {
        'td': ['table', 'tr'],
        'th': ['table', 'tr'],
        'tr': ['table'],
    };

    register('', function createElementFromOuterHtml(outerHtml) {
        const match = outerHtml.match(/< *([0-9A-Za-z]+)/);

        if (match) {
            let tagName = match[1];
            const compilerElement = document.createElement('div');
            document.documentElement.appendChild(compilerElement);

            if (tagName in requiredParents) {
                let parent;

                requiredParents[tagName].forEach(tagName => {
                    let element = document.createElement(tagName);
                    parent ? parent.appendChild(element) : compilerElement.appendChild(element);
                    parent = element;
                });

                let stub = document.createElement(tagName);
                parent.appendChild(stub);
                stub.outerHTML = outerHtml;
                parent.appendChild(stub);
                stub = parent.children[0];
                parent.replaceChildren();
                compilerElement.replaceChildren();
                compilerElement.replace();
                return mkHtmlElement(stub);                
            }
            else {
                let stub = document.createElement(tagName);
                compilerElement.appendChild(stub);
                stub.outerHTML = outerHtml;
                stub = compilerElement.children[0];
                compilerElement.replaceChildren();
                compilerElement.replace();
                return mkHtmlElement(stub);
            }
        }
    });
})();
