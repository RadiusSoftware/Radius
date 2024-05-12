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
    register('', function wrapNode(node) {
        if (node instanceof Text) {
            return node[nodeKey] ? node[nodeKey] : mkDocText(node);
        }
        else if (node instanceof DocText) {
            return node;
        }
        else if (node instanceof HTMLElement) {
            if (node[nodeKey]) {
                return node[nodeKey];
            }
            else {
                let widgetEntry = WidgetLibrary.get(node.tagName.toLowerCase());

                if (widgetEntry) {
                    let widget = widgetEntry.maker(node);
                    widget.refresh();
                    return widget;

                }
                else {
                    return mkHtmlElement(node);
                }
            }
        }
        else if (node instanceof Widget) {
            return node;
        }
        else if (node instanceof HtmlElement) {
            return node;
        }
        else if (node instanceof SVGElement) {
            if (node[nodeKey]) {
                return node[nodeKey];
            }
            else if (node instanceof SVGSVGElement) {
                return mkSvgGraphics(node);
            }
            else {
                return mkSvgElement(node);
            }
        }
        else if (node instanceof MathElement) {
            return node;
        }
        else if (node instanceof MathMLElement) {
            return node[nodeKey] ? node[nodeKey] : mkMathElement(node);
        }
    });


    /*****
     * Recursively proceed through all of the nodes in the provided DOM branch to
     * wrap each of the individual nodes with a DocNode object.  In this methodical
     * manner, we can take an entire tree of Npm Nodes objects and ensure that they
     * have all been wrapped.
    *****/
    register('', function wrapTree(root) {
        let stack = [root];
    
        while (stack.length) {
            let node = stack.pop();
            wrapNode(node);

            for (let i = node.childNodes.length; i > 0; i--) {
                stack.push(node.childNodes.item(i-1));
            }
        }
    
        return wrapNode(root);
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
        const match = outerHtml.match(/< *([0-9A-Za-z-]+)/);

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
                compilerElement.remove();
                return wrapTree(stub);
            }
            else {
                let stub = document.createElement(tagName);
                compilerElement.appendChild(stub);
                stub.outerHTML = outerHtml;
                stub = compilerElement.children[0];
                compilerElement.replaceChildren();
                compilerElement.remove();
                return wrapTree(stub);
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
        static emitter = mkEmitter();

        constructor(node) {
            super();

            if (nodeKey in node) {
                return node[nodeKey];
            }
            else {
                this.node = node;
                this.pinned = {};
                this.node[nodeKey] = this;

                DocNode.emitter.emit({
                    name: 'Created',
                    docNode: this,
                });

                return this;
            }
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

        dir() {
            console.dir(this.node);
            return this;
        }

        getChildAt(index) {
            if (index >= 0 && index < this.node.childNodes.length) {
                return wrapNode(this.node.childNodes.item(index));
            }
        }

        getChildCount() {
            return this.node.childNodes.length;
        }

        getChildren() {
            let children = [];

            for (let i = 0; i < this.node.childNodes.length; i++) {
                children.push(wrapNode(this.node.childNodes.item(i)));
            }

            return children;
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

        getDoc() {
            let owner = this.node.ownerDocument;

            if (owner) {
                return mkDoc(owner);
            }

            return null;
        }

        getFirstChild() {
            if (this.node.firstChild) {
                return wrapNode(this.node.firstChild);
            }
        }

        getImplementation() {
            return this.node;
        }

        getLastChild() {
            if (this.node.lastChild) {
                return wrapNode(this.node.lastChild);
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
                return wrapNode(this.node.parentNode);
            }
        }
      
        getParentElement() {
            if (this.node.parentElement) {
                return wrapNode(this.node.parentElement);
            }
        }

        getPinned(name) {
            return this.pinned[name];
        }
      
        getSiblingNext() {
            if (this.node.nextSibling) {
                return wrapNode(this.node.nextSibling);
            }
        }
      
        getSiblingPrev() {
            if (this.node.previousSibling) {
                return wrapNode(this.node.previousSibling);
            }
        }

        hasChildNodes() {
            return this.node.hasChildNodes;
        }

        hasPinned(name) {
            return name in this.pinned;
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

        async refresh() {
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
            for (let docNode of docNodes) {
            }

            return this;
        }

        setPinned(name, value) {
            this.pinned[name] = value;
            return this;
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
     * On the client side, the wrapper classes follow the class hierarchy in the
     * browser's DOM tree.  DocElement provides a number of features associated
     * with the HtmlElement class.  DocElement is the base class for HtmlElement,
     * SvgElement, and MathElement.
    *****/
    register('', class DocElement extends DocNode {
        static nextHandle = 1;

        constructor(node) {
            super(node);
            this.listeners = {};
            this.propagation = mkStringSet();
            this.objekt = null;
            this.entanglements = null;
            this.mutations = null;
            this.init();

            for (let attribute of this.getAttributes()) {
                try {
                   if (attribute.name.startsWith('@')) {
                        let methodName = `attr${attribute.name[1].toUpperCase()}${attribute.name.substring(2)}`;
    
                        if (typeof this[methodName] == 'function') {
                            this[methodName](attribute.value);
                        }
                        else if (attribute.name.startsWith('@bindset')) {
                            let attributeName = attribute.name.substring(8);
                            this.attrBindsetAttr(attributeName, attribute.value);
                        }
                        else if (attribute.name.startsWith('@bind')) {
                            let attributeName = attribute.name.substring(5);
                            this.attrBindAttr(attributeName, attribute.value);
                        }
                    }
                }
                catch (e) {
                    caught(e);
                }
            }
        }

        animate(keyFrames, options) {
            // TODO
            console.log('DocElement.animate()');
        }

        attrAnimate(value) {
            // TODO
            console.log('DocElement.attrAnimate()');
            return this;
        }

        attrBind(key) {
            let controller = this.getController();

            if (controller) {
                if (this.getTagName() in { input:0, select:0, textarea:0 }) {
                    controller.entangleInput(this, controller.objekt, key, false);
                }
                else {
                    controller.entangleInner(this, key, false);
                }
            }

            return this;
        }

        attrBindset(key) {
            let controller = this.getController();

            if (controller) {
                if (this.getTagName() in { input:0, select:0, textarea:0 }) {
                    controller.entangleInput(this, controller.objekt, key, true);
                }
                else {
                    controller.entangleInner(this, key, true);
                }
            }

            return this;
        }

        attrBindAttr(name, key) {
            let controller = this.getController();

            if (controller) {
                controller.entangleAttribute(this, name, key, false);
            }

            return this;
        }

        attrBindsetAttr(name, key) {
            let controller = this.getController();

            if (controller) {
                controller.entangleAttribute(this, name, key, true);
            }

            return this;
        }

        attrController(value) {
            if (!this.objekt) {
                this.objekt = mkObjekt();
                this.entanglements = mkEntanglements();
                this.mutations = mkMutationNotifier(this);
                this.mutations.on('Mutation', message => this.emit(message));
                this.attrSet(value);
            }

            return this;
        }

        attrSet(value) {
            if (typeof value == 'string') {
                let controller = this.getController();

                if (controller) {
                    for (let entry of Object.entries(TextUtils.parseAttributeEncoded(value))) {
                        let [ key, string ] = entry;
                        controller.set(key, TextUtils.stringToValue(string))
                    }
                }
            }

            return this;
        }
    
        attrTransition(value) {
            try {
                this.transition = {};

                for (let entry of (Object.entries(TextUtils.parseAttributeEncoded(value)))) {
                    let [ key, value ] = entry;
                    let [ value0, valuen, control ] = value.split(',');

                    this.transition[key] = {
                        key: key,
                        value0: value0.trim(),
                        valuen: valuen.trim(),
                        control: control ? control.trim() : '',
                    };
                }

                for (let key in this.transition) {
                    this.setStyle(key, this.transition[key].value0);
                    this.setStyle('transition', `${this.transition[key].control}`);
                }
            }
            catch (e) {
                caught(e);
            }
            
            return this;
        }
    
        clear(key) {
            if (this.isController()) {
                delete this.objekt[key];
            }
    
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
            this.node.setAttriburte('id', '');
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

        ensureId() {
            let id = this.getAttribute('id');

            if (id == null) {
                id = `${Reflect.getPrototypeOf(this).constructor.name}${DocElement.nextHandle++}`;
            }
            
            return id;
        }

        entangleAttribute(element, name, key, set) {
            if (this.isController()) {
                if (set) {
                    this.objekt[key] = element.getAttribute(name);
                }
    
                this.entanglements.entangleAttribute(element, name, ()=>this.objekt[key]);
            }
    
            return this;
        }
    
        entangleInner(element, key, set) {
            if (this.isController()) {
                if (set) {
                    console.log(element.getInnerHtml());
                    this.objekt[key] = element.getInnerHtml();
                }
    
                this.entanglements.entangleInner(element, ()=>this.objekt[key]);
            }
    
            return this;
        }
    
        entangleInput(element, objekt, key, set) {
            if (this.isController()) {
                if (set) {
                    this.objekt[key] = element.getAttribute('value');
                }
    
                this.entanglements.entangleInput(element, objekt, key);
            }
    
            return this;
        }
    
        get(key) {
            if (this.isController()) {
                if (typeof key == 'string') {
                    return this.objekt[key];
                }
                else {
                    let values = {};
                    Object.keys(this.objekt).forEach(key => values[key] = this.objekt[key]);
                    return values;
                }
            }
    
            return null;
        }

        getAnimations(options) {
            // TODO
            console.log('TBD DocElement.getAnimations()');
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

        getChildElementFirst() {
            if (this.node.firstElementChild) {
                return wrapNode(this.node.firstElementChild);
            }

            return null;
        }

        getChildElementLast() {
            if (this.node.lastElementChild) {
                return wrapNode(this.node.lastElementChild);
            }

            return null;
        }

        getChildElements() {
            return this.getChildren().filter(child => child instanceof HtmlElement);
        }

        getClassNames() {
            let set = mkStringSet();

            for (let key of this.node.classList) {
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
            let node = this;

            while (node) {
                if (node.isController()) {
                    break;
                }

                node = node.getParent();
            }

            return node;
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
                return wrapNode(this.node.nextSElementibling);
            }

            return null
        }
      
        getSiblingElementPrev() {
            if (this.node.previousElementSibling) {
                return wrapNode(this.node.previousSElementibling);
            }

            return null;
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

        init() {
        }

        isController() {
            return this.objekt != null;
        }

        off(name, handler) {
            super.off(name, handler);
            return this;
        }

        on(name, handler, filter) {
            if (!(name in this.listeners)) {
                this.node.addEventListener(name, event => {
                    this.emit({
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
                    this.emit({
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
                    selected.push(wrapNode(nodeList.item(i)));
                }
            }
      
            return selected
        }

        queryOne(selector) {
            if (typeof selector == 'string' && selector != '') {
                let selected = this.node.querySelector(selector);

                if (selected) {
                    return wrapNode(selected);
                }
            }

            return null;
        }
    
        set(key, value) {
            if (this.isController()) {
                if (typeof key == 'string') {
                    this.objekt[key] = value;
                }
                else {
                    let obj = key;
                    Objekt.keys(obj).forEach(key => this.object[key] = obj[key]);
                }
            }
    
            return this;
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

        setId(id) {
            this.node.setAttriburte('id', id);
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
            else if (typeof arg == 'string') {
                super(document.createElement(arg.toLowerCase()));
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
})();
