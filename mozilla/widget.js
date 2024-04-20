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


/*****
*****/
singleton('', class WidgetLibrary {
    constructor() {
        this.widgetClasses = {};
    }

    get(arg) {
        return this.widgetClasses[arg];
    }

    has(arg) {
        return arg in this.widgetClasses;
    }

    register(ns, widgetClass) {
        if (!Data.classExtends(widgetClass, Widget)) {
            throw new Error(`Attempted to register class "${widgetClass.name}" as a Widget.`);
        }

        const lib = this;
        const tagName = TextUtils.toSnakeCase(widgetClass.name).replace('_', '-');
        const wrapperClassName = `${widgetClass.name}CustomElementWrapper`;
        const baseHTMLElementClass = widgetClass.baseClass ? widgetClass.baseClass : HTMLElement;

        if (tagName.indexOf('-') == -1) {
            throw new Error(`Attempted to register Widget with tag name "${tagName}"`);
        }

        if (tagName in this.widgetClasses) {
            throw new Error(`Attempted to register a duplicate Widget tag name "${tagName}"`);
        }

        if (widgetClass.name in this.widgetClasses) {
            throw new Error(`Attempted to register a duplicate Widget classname "${widgetClass.name}"`);
        }

        let wrapperClass;
        eval(`wrapperClass = class ${wrapperClassName} extends ${baseHTMLElementClass.name} {
            constructor() {
                super();
            }
        
            adoptedCallback() {
            }
        
            attributeChangedCallback(name, oldValue, newValue) {
            }
        
            connectedCallback() {
                return wrapNode(this);
            }
        
            disconnectedCallback() {
            }
        }`);

        customElements.define(tagName, wrapperClass);
        const widgetMaker = register(ns, widgetClass);
        this.widgetClasses[tagName] = { className: widgetClass, maker: widgetMaker };
        this.widgetClasses[wrapperClassName] = { className: widgetClass, maker: widgetMaker };
        this.widgetClasses[widgetClass.name] = { className: widgetClass, maker: widgetMaker };
        return tagName;
    }
});


/*****
 * The widget is the high feature wrapper for document elements and provide a
 * number of features.  An HtmlWidget is specifically designed to wrap HTML
 * elements with a customer tag name, which means it's a hyphenated tag name.
 * Note that the tag name is based on the widget class name only, not the name
 * speace.  Hence, all widget class names must be unique.  The Widget provides
 * features like that of a GUI controller and will entangle GUI element values
 * and attributes using those Objekt-based entanglements.  Moreover, Widgets
 * provide an implementation of the Mutation Obvserver to provide additional
 * dynamic GUI support to the application.
*****/
register('', class Widget extends HtmlElement {
    constructor(arg) {
        super(arg);
        let widgetEntry = WidgetLibrary.get(this.getTagName());

        if (widgetEntry.innerHtml) {
            this.setInnerHtml(widgetEntry.innerHtml);
        }
    }
});
