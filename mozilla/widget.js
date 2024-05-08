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
 * The library of unique widgets downloaded from the server.  The primary purpose
 * of the widget library is to ensure that the client application can spread out
 * the downloads to (1) a burst of built-in bundles, and (2) download as needed.
 * The point is to NOT drag out how long it takes to download the application
 * launch time.
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
        let className = widgetClass.name;
        const tagName = `${className.substring(0, className.length-6).toLowerCase()}-widget`;
        const wrapperClassName = `${widgetClass.name}CustomElementWrapper`;

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
        eval(`wrapperClass = class ${wrapperClassName} extends HTMLElement {
            constructor() {
                super();
            }
        
            adoptedCallback() {
            }
        
            attributeChangedCallback(name, oldValue, newValue) {
            }
        
            connectedCallback() {
                return this;
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
    static id = 1;

    constructor(arg) {
        super(arg);

        this.setId(`widget${Widget.id++}`);
        let widgetEntry = WidgetLibrary.get(this.getTagName());

        if (widgetEntry.innerHtml) {
            this.setInnerHtml(widgetEntry.innerHtml);
        }
    }

    attrController(value) {
        this.objekt = mkObjekt();
        this.entanglements = mkEntanglements();
        this.attrSet(value);
    }
    
    clear(key) {
        if (this.isController()) {
            delete this.objekt[key];
        }

        return this;
    }

    entangleAttribute(element, name, key) {
        if (this.isController()) {
            this.entanglements.entangleAttribute(element, name, ()=>this.objekt[key]);
        }

        return this;
    }

    entangleInner(element, key) {
        if (this.isController()) {
            this.entanglements.entangleInner(element, ()=>this.objekt[key]);
        }

        return this;
    }

    entangleInput(element, objekt, key) {
        if (this.isController()) {
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

    init() {
        this.objekt = null;
        this.entanglements = null;
    }

    isController() {
        return this.objekt != null;
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
});
