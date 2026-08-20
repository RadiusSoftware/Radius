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
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, xEXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*****/


/*****
 * The library of all widgets that are registered on the browser.  This library
 * not only maintains all relevant data for the widgets that were provided via
 * the packaging mechanism, it registers those widgets and defines the script
 * needed to (1) create the functional HtmlElement object, and (2) and activate
 * the hooks for dynamical initialization.  The primary difference between an
 * HtmlElement and a Widget is that widgets have an active initialization step
 * as they are created and added to the document.
*****/
singleton(class WidgetLibrary {
    constructor() {
        this.widgetClasses = {};
    }

    define(widget) {
        if (widget.tagName in this.widgetClasses) {
            throw new Error(`Duplicate Widget tagname "${widget.tagName}"`);
        }

        if (widget.script) {
            widget.scriptElement = mkHtmlElement('script');
            widget.scriptElement.setAttribute('widget', widget.tagName);
            widget.scriptElement.setInnerHtml(`globalThis['${widget.classId}']=(\n            ${widget.script.trim()})`);
            Doc.getHead().append(widget.scriptElement);
            widget.clss = globalThis[widget.classId];
            widget.className = widget.clss.name;
            delete globalThis[widget.classId];
        }
        else {
            widget.clss = Widget;
            widget.className = Widget.name;
        }

        let tagNameParts = RdsText.split(widget.tagName, '-');

        if (tagNameParts.length != 2 || !tagNameParts[0] || !tagNameParts[1]) {
            throw new Error(`Invalid tag name for Widget registration" "${widget.tagName}"`);
        }

        let prefix = tagNameParts[0][0].toUpperCase() + tagNameParts[0].substring(1);
        let suffix = tagNameParts[1][0].toUpperCase() + tagNameParts[1].substring(1);
        widget.wrapperClassName = `${prefix}${suffix}Handler`;

        widget.wrapperClassScript = mkHtmlElement('script');
        widget.wrapperClassScript.setAttribute('widget-wrapper', widget.tagName);
        widget.wrapperClassScript.setInnerHtml(`globalThis['${widget.classId}'] = (class ${widget.wrapperClassName} extends HTMLElement {
            constructor() {
                super();
                let widgetData = WidgetLibrary.widgetClasses['${widget.tagName}'];
                
                for (let attributeName in widgetData.attributes) {
                    let attributeValue = widgetData.attributes[attributeName];
                    
                    if (!this.hasAttribute(attributeName)) {
                        this.setAttribute(attributeName, attributeValue);
                    }
                }

                const widget = new widgetData.clss(this);
                widget.widgetData = widgetData;

                if (widgetData.innerHtml.trim()) {
                    widget.setInnerHtml(widgetData.innerHtml);
                }
            }
        })`);

        Doc.getHead().append(widget.wrapperClassScript);
        widget.wrapperClass = globalThis[widget.classId];
        delete globalThis[widget.classId];
        customElements.define(widget.tagName, widget.wrapperClass);
        this.widgetClasses[widget.tagName] = widget;
    }

    get(tagName) {
        return this.widgetClasses[tagName];
    }

    has(tagName) {
        return tagName in this.widgetClasses;
    }
});


/*****
 * The base class for all Widgets.  Once of the important features is to assign
 * the widget data object to the widget itself in the constructor right after
 * the call to super().  This ensures that widgets will have access to defining
 * data during initialization if needed.
*****/
define(class Widget extends HtmlElement {
    getPackage() {
        return this.widgetData.package;
    }

    getSetting(key) {
        if (key) {
            return this.widgetData.settings[key];
        }
        else {
            return this.widgetData.settings;
        }
    }

    getSubstituteTagName() {
        return this.widgetData.settings.substitute;
    }

    hasSetting(key) {
        return key in this.widgetData.settings;
    }

    hasSubstitute() {
        return StringType.verify(this.widgetData.settings.substitute);
    }

    init() {
        if (this.hasSetting('eventTransforms')) {
            for (let entry of Object.entries(this.getSetting('eventTransforms'))) {
                let eventName = entry[0];
                let transform = entry[1];
                this.eventTransforms[eventName] = transform;
            }
        }

        super.init();
        
        for (let key of Reflect.ownKeys(Reflect.getPrototypeOf(this))) {
            if (StringType.verify(key)) {
                if (key.startsWith('onHandleEvent') || FunctionType.verify(this[key])) {
                    let eventName = RdsText.toSnakeCase(key.substring(13)).replace('_', '-');

                    if (!(`on${eventName}` in this.node)) {
                        this.node.addEventListener(eventName, event => {
                            this.handleEvent(event, eventName);
                        });
                    }
                }
                else if (key.startsWith('onInspectEvent') || FunctionType.verify(this[key])) {
                    let eventName = RdsText.toSnakeCase(key.substring(14)).replace('_', '-');

                    if (!(`on${eventName}` in this.node)) {
                        this.node.addEventListener(eventName, event => {
                            this.handleEvent(event, eventName);
                        });
                    }
                }
            }
        }
    }

    substituteNode() {
        let oldNode = this.node;
        let newDocElement = createElement(this.getSubstituteTagName());
        let newNode = newDocElement.node;

        if (newDocElement.getTagName() in { input:0 }) {
            newDocElement.setAttribute('value', this.getInnerHtml().trim());
        }

        for (const attr of oldNode.attributes) {
            newNode.setAttribute(attr.name, attr.value);
        }

        while (oldNode.firstChild) {
            newNode.appendChild(oldNode.firstChild);
        }

        oldNode.parentNode.replaceChild(newNode, oldNode);
        this.node = newNode;
        newNode[nodeKey] = this;
        delete oldNode[nodeKey];
        return this;
    }
});


/*****
 * Base class for widgets that user-editable / changable.  This is a base class
 * for widgets that display a value and then toggle between read mode and edit
 * mode.  There's a few interesting features that need to be implemented and
 * it's betst to place there here in this super class.
*****/
define(class EditingWidget extends Widget {
    getDotted() {
        return this.dotted;
    }

    getShape() {
        return this.shape;
    }

    init() {
        this.readonly = true;
        this.editing = false;

        if (this.getRdsBind) {
            this.dotted = this.getRdsBind();
            delete this.getRdsBind;
            this.shape = Controller.getShape(this.dotted);
        }

        if (this.getRdsReadonly) {
            this.setReadonly(this.getRdsReadonly())
            delete this.getRdsReadonly();
        }

        super.init();
    }

    isEditing() {
        return this.editing;
    }

    isReadonly() {
        return this.readonly;
    }

    onReadonlyChanged() {
    }

    onStartEditing() {
    }

    onStopEditing() {
    }

    static setReadonly(docElement, readonly) {
        for (let docNode in docElement.enumerateDescendents()) {
            if (docNode instanceof EditingWidget) {
                docNode.setReadonly(readonly);
            }
        }
    }

    setReadonly(readonly) {
        let newValue;

        if (StringType.verify(readonly)) {
            if (readonly.trim().toLowerCase() == 'true') {
                newValue = true;
            }
            else if (readonly.trim().toLowerCase() == 'false') {
                newValue = false;
            }
            else {
                return;
            }
        }
        else if (BooleanType.verify(readonly)) {
            newValue = readonly;
        }

        if (newValue != this.readonly) {
            this.readonly = newValue;

            if (newValue) {
                if (this.editing) {
                    this.stopEdit();
                }
            }

            this.onReadonlyChanged();

            this.emit({
                name: 'ReadonlyChanged',
                widget: this,
                readonly: this.readonly,
            });
        }

        return this;
    }

    startEdit() {
        if (!this.editing) {
            this.editing = true;
            this.triggerCustomEvent('edit-start');
            this.onStartEditing();
        }
    }

    stopEdit() {
        if (this.editing) {
            this.editing = false;
            this.triggerCustomEvent('edit-stop');
            this.onStopEditing();
        }
    }
});
