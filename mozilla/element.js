/*****
 * 
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
    const nodeKey = Symbol('node-key');


    /*****
     * Analyzes the argument type with and returns which DocNode or DocElement type
     * to return to the caller.  In any case, the returned value is always once of
     * the wrapper objects defined in this source file.  If we're unable to find
     * any specific type of object, just return a Text node using the argument as
     * the value to be converted to text.
    *****/
    register('' ,function wrapDocNode(arg) {
        if (arg instanceof Text) {
            return arg[nodeKey] ? arg[nodeKey] : mkDocText(arg);
        }
        else if (arg instanceof DocText) {
            return arg;
        }
        else if (arg instanceof HTMLElement) {
            return arg[nodeKey] ? arg[nodeKey] : mkHtmlElement(arg);
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
    register('' ,function unwrapDocNode(arg) {
        if (arg instanceof DocNode) {
            return arg.node;
        }
        else if (arg instanceof Node) {
            return arg;
        }
        else {
            return document.createTextNode(arg.toString());
        }
    });


    /*****
     * The DocNode class provides a wrapper for existing DOM HTMLElements and Text
     * objects.  This class is NOT used for creating new objects.  It's only for
     * wrapping existing objects with a more efficient API.  DocNode is the base
     * class for DocText and HtmlElement.  Methods in this class are applicable for
     * both types of derived object instances.
    *****/
    register('' ,class DocNode extends Emitter {
        constructor(node) {
            super();
            this.node = node;
            this.flags = {};
            this.pinned = {};

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

        assignFlag(name, bool) {
            if (typeof bool == 'boolean') {
                this.flags[name] = bool;
            }

            return this;
        }

        childAt(index) {
            if (index >= 0 && index < this.node.childNodes.length) {
                return wrapDocNode(this.node.childNodes.item(index));
            }
        }

        children() {
            let children = [];

            for (let i = 0; i < this.node.childNodes.length; i++) {
                children.push(wrapDocNode(this.node.childNodes.item(i)));
            }

            return children;
        }

        clear() {
            this.node.replaceChildren();
            return this;
        }

        clearFlag(name) {
            delete this.flags[name];
            return this;
        }

        clearPinned(name) {
            delete this.pinned[name];
            return this;
        }

        contains(docNode) {
            return this.node.contains(docNode.node);
        }

        descendants() {
            let stack = this.children();
            let descendants = [];

            while (stack.length) {
                let docNode = stack.pop();
                descendants.push(docNode);
                docNode.children().reverse().forEach(child => stack.push(child));
            }

            return descendants;
        }

        dir() {
            console.dir(this.node);
            return this;
        }

        doc() {
            let owner = this.node.ownerDocument;

            if (owner) {
                return mkDoc(owner);
            }
        }

        firstChild() {
            if (this.node.firstChild) {
                return wrapDocNode(this.node.firstChild);
            }
        }

        getFlag(name) {
            return name in this.flags ? this.flags[name] : false;
        }

        getPinned(name) {
            return this.pinned[name];
        }

        getTextContent() {
            return this.node.textContent;
        }

        hasChildNodes() {
            return this.node.hasChildNodes;
        }

        hasFlag(name) {
            return name in this.flags;
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

        invoke(func, ...args) {
            Reflect.apply(func, null, [this].concat(args));
            return this;
        }

        isConnected() {
            return this.node.isConnected;
        }

        isElement() {
            return this instanceof DocElement;
        }

        isHtmlElement() {
            return this instanceof HtmlElement;
        }
      
        isSame(arg) {
            return unwrapDocNode(arg) === this.node;
        }

        isText() {
            return this.node instanceof Text;
        }

        isWidget() {
            return this.node instanceof Widget;
        }

        lastChild() {
            if (this.node.lastChild) {
                return wrapDocNode(this.node.lastChild);
            }
        }

        length() {
            return this.node.childNodes.length;
        }

        log() {
            console.log(this.node);
            return this;
        }

        logFlags() {
            console.log(this.flags);
            return this;
        }

        name() {
            return this.node.nodeName.toLowerCase();
        }
      
        nextSibling() {
            if (this.node.nextSibling) {
                return wrapDocNode(this.node.nextSibling);
            }
        }

        nodeName() {
            return this.node.nodeName;
        }

        nodeType() {
            return this.node.nodeType;
        }

        nodeValue() {
            return this.node.nodeValue;
        }
      
        parent() {
            if (this.node.parentNode) {
                return wrapDocNode(this.node.parentNode);
            }
        }
      
        parentElement() {
            if (this.node.parentElement) {
                return wrapDocNode(this.node.parentElement);
            }
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
      
        prevSibling() {
            if (this.node.previousSibling) {
                return wrapDocNode(this.node.previousSibling);
            }
        }

        async refresh() {
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
                    inserted = unwrapDocNode(args[0]);
                    this.node.parentNode.replaceChild(inserted, this.node);

                    for (let i = 1; i < args.length; i++) {
                        let node = unwrapDocNode(args[i]);
                        inserted.insertAfter(node, inserted);
                        inserted = node;
                    }
                }
                else {
                    this.node.parentNode.removeChild(this.node);
                }
            }

            return this;
        }

        resetFlag(name) {
            this.flags[name] = false;
            return this;
        }

        revert() {
            return this;
        }

        setFlag(name) {
            this.flags[name] = true;
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

        [Symbol.iterator]() {
            return this.children()[Symbol.iterator]();
        }

        toggleFlag(name) {
            if (name in this.flags) {
                this.flags[name] = !this.flags[name];
            }
            else {
                this.flags[name] = true;
            }

            return this;
        }
    });


    /*****
     * The DocText element is a wrapper the DOM built in Text class.  Instances
     * of DocText are return in API class that refer to the underlying Text class.
     * Moreover, DocText provides a link-free copy function.
    *****/
    register('' ,class DocText extends DocNode {
        constructor(arg) {
            super(typeof arg == 'string' ? document.createTextNode(arg) : unwrapDocNode(arg));
        }
      
        text() {
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

    register('' ,class ElementEvent {
        constructor(event) {
            this[eventKey] = event;
            return new Proxy(this, eventProxy);
        }

        composedPath(...args) {
            return this[eventKey].composedPath(...args);
        }

        preventDefault(...args) {
            return this[eventKey].preventDefault(...args);
        }

        rawEvent() {
            return this[eventKey];
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
    register('' ,class DocElement extends DocNode {
        constructor(node) {
            super(node);
            this.listeners = {};
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

        clientHeight() {
            return this.node.clientHeight;
        }

        clientLeft() {
            return this.node.clientLeft;
        }

        clientTop() {
            return this.node.clientTop;
        }

        clientWidth() {
            return this.node.clientWidth;
        }

        disable() {
            this.setAttribute('disabled');
            return this;
        }

        disablePropagation(eventName) {
            this.propagation.clear(eventName);
            return this;
        }

        enable() {
            this.clearAttribute('disabled');
            return this;
        }

        enablePropagation(eventName) {
            this.propagation.set(eventName);
            return this;
        }

        firstElementChild() {
            if (this.node.firstElementChild) {
                return wrapDocNode(this.node.firstElementChild);
            }
        }

        focus() {
            setTimeout(() => this.node.focus(), 10);
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

        getComputedStyle(pseudoElement) {
            return window.getComputedStyle(this.node, pseudoElement);
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

        insertAdjacentHtml(position, text) {
            this.node.insertAdjacentHTML(position, text);
            return this;
        }

        insertAdjacentHtml(where, data) {
            this.node.insertAdjacentText(where, data);
            return this;
        }

        isDisabled() {
            return this.hasAttribute('disabled');
        }

        isEnabled() {
            return !this.hasAttribute('disabled');
        }

        lastElementChild() {
            if (this.node.lastElementChild) {
                return wrapDocNode(this.node.lastElementChild);
            }
        }
      
        nextElementSibling() {
            if (this.node.nextElementSibling) {
                return wrapDocNode(this.node.nextSElementibling);
            }
        }

        off(messageName, handler) {
            super.off(messageName, handler);
            return this;
        }

        on(messageName, handler, filter) {
            if (!(messageName in this.listeners)) {
                this.node.addEventListener(messageName.substr(4), event => {
                    this.send({
                        messageName: messageName,
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

            super.on(messageName, handler, filter);
            return this;
        }

        once(messageName, handler, filter) {
            if (!(messageName in this.listeners)) {
                this.node.addEventListener(messageName.substr(4), event => {
                    this.send({
                        messageName: messageName,
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

            super.once(messageName, handler, filter);
            return this;
        }
      
        prevElementSibling() {
            if (this.node.previousElementSibling) {
                return wrapDocNode(this.node.previousSElementibling);
            }
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

        async refresh() {
            for (let child of this) {
                await child.refresh();
            }

            return this;
        }

        revert() {
            for (let child of this) {
                child.revert();
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

        tagName() {
            return this.node.tagName.toLowerCase();
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
    register('' ,class HtmlElement extends DocElement {
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

        getInnerHtml() {
            return this.node.innerHTML;
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

        getOuterHtml() {
            return this.node.outerHTML;
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
