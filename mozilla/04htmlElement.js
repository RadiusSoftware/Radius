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
 * The HtmlElement provides a wrapper for the underlying DOM HTMLElement object.
 * Primarily, it's an extension or refrinement of the underlying DOM API and is
 * oriented to facilitate chaining function calls, where possible.  Note that get
 * and has calls do NOT logically support chaining.  Additionally, this class
 * also wraps the standard Emitter class to make the event-structure associated
 * with an HMTLElement fits within the framework API for events and messaging.
*****/
define(class HtmlElement extends DocElement {
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

    clearTabIndex() {
        this.node.tabIndex = 0;
        return this;
    }

    clearTitle() {
        this.clearAttribute('title');
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

    getOffsetHeight() {
        return this.node.offsetHeight;
    }

    getOffsetWidth() {
        return this.node.offsetWidth;
    }

    getOffsetX() {
        return this.node.offsetLeft;
    }

    getOffsetY() {
        return this.node.offsetTop;
    }

    getTabIndex() {
        return this.node.tabIndex;
    }

    getTitle() {
        return this.getAttribute('title');
    }

    hasData(key) {
        return key in this.node.dataset;
    }

    hasTitle() {
        return this.hasAttribute('title');
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

    setTabIndex(index) {
        if (typeof index == 'number' && index > 0) {
        }
        else {
            this.node.tabIndex = 0;
        }

        return this;
    }

    setTitle(title) {
        this.setAttribute('title', title);
        return this;
    }
});
