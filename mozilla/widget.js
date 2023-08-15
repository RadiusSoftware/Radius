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
register('', class Widget {
    constructor(tagName) {
    }
});
/*
(() => {
    let nextId = 1;
    let nextHandlerId = 1;
    const handlerKey = Symbol('handler');

    register('', class Widget extends HtmlElement {
        constructor(arg) {
            if (arg instanceof Node) {
                super(arg);
                this.setWidgetStyle(`widget-${arg.tagName.toLowerCase()}`);
            }
            else if (arg instanceof DocNode) {
                super(arg);
                this.setWidgetStyle(`widget-${arg.tagName()}`);
            }
            else {
                super(typeof arg == 'string' ? arg : 'div');
                this.setWidgetStyle('widget');
            }

            this.id = nextId++;
            this.listened = {};
            this.styleStack = [];
            this.concealed = null;
            this.refreshers = mkStringSet();
            this.panelState = mkPanelState(this);

            this.setId(`widget${this.id}`);
            this.setAttribute('widget-class', `${Reflect.getPrototypeOf(this).constructor.name}`);
            global.on('#NotifyClient', message => this.onServerNotify(message));
        }

        append(...args) {
            super.append(...args);

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        bind(activeData, key, arg) {
            if (arg === Binding.valueBinding) {
                mkValueBinding(this, activeData, key);
            }
            else if (typeof arg == 'string') {
                mkAttributeBinding(this, activeData, key, arg);
            }
            else if (typeof arg == 'object') {
                mkMapBinding(this, activeData, key, arg);
            }
            else if (typeof arg == 'function') {
                mkFunctionBinding(this, activeData, key, arg);
            }
            else if (arg === undefined) {
                mkInnerHtmlBinding(this, activeData, key);
            }

            return this;
        }

        clear() {
            super.clear();

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        clearAttribute(name) {
            super.clearAttribute(name);

            this.send({
                messageName: 'Widget.Changed',
                type: 'attribute',
                widget: this,
                name: name,
                value: null,
            });

            return this;
        }

        clearClassName(className) {
            if (className) {
                super.clearClassName(className);

                this.send({
                    messageName: 'Widget.Changed',
                    type: 'attribute',
                    widget: this,
                    name: 'class',
                    value: null,
                });
            }

            return this;
        }

        clearClassNames() {
            this.setAttribute('class', '');

            this.send({
                messageName: 'Widget.Changed',
                type: 'attribute',
                widget: this,
                name: 'class',
                value: null,
            });

            return this;
        }

        clearMenu(menu) {
            menu ? menu.detach(this) : false;
            return this;
        }

        clearRefreshers(...endpointNames) {
            this.refreshers.clear(...endpointNames);
            return this;
        }

        clearStyle() {
            super.clearStyle();

            this.send({
                messageName: 'Widget.Changed',
                type: 'style',
                widget: this,
                value: null,
            });

            return this;
        }

        clearValue() {
            this.clearAttribute('value');
            return this;
        }

        conceal() {
            if (typeof this.concealed != 'string') {
                this.silence();
                this.concealed = this.getStyle('display');
                this.setStyle('display', 'none');
                this.resume();
            }

            return this;
        }

        disable() {
            if (this.isEnabled()) {
                super.disable();

                this.send({
                    messageName: 'Widget.Changed',
                    type: 'attribute',
                    widget: this,
                    name: 'disabled',
                    value: true,
                });

                this.silence();
            }

            return this;
        }

        enable() {
            if (this.isDisabled()) {
                super.enable();
                this.resume();

                this.send({
                    messageName: 'Widget.Changed',
                    type: 'attribute',
                    widget: this,
                    name: 'disabled',
                    value: false,
                });
            }

            return this;
        }

        getPanel() {
            return this.searchAncestor({ type: 'ctor', ctor: WPanel });
        }

        getReveal() {
            return !this.getFlag('conceal');
        }

        getView() {
            return this.searchAncestor({ type: 'ctor', ctor: WView });
        }

        getWidgetStyle() {
            return this.getAttribute('widget-style');
        }

        hasValue() {
            return this.hasAttribute('value');
        }

        ignore(widget, messageName) {
            if (widget) {
                if (widget.getId() in this.listened) {
                    let widgetEntry = this.listened[widget.getId()];

                    if (messageName) {
                        if (messageName in widgetEntry.messages) {
                            let messageNameGroup = widgetEntry.messages[messageName];

                            for (let handler of Object.values(messageNameGroup.handlers)) {
                                widgetEntry.widget.off(messageNameGroup.messageName, handler);
                            }

                            messageNameGroup.handlers = {};
                        }
                    }
                    else {
                        for (let messageNameGroup of Object.values(widgetEntry.messages)) {
                            for (let handler of Object.values(messageNameGroup.handlers)) {
                                widgetEntry.widget.off(messageNameGroup.messageName, handler);
                            }
                        }

                        widgetEntry.messages = {};
                    }
                }
            }
            else {
                for (let widgetId in this.listened) {
                    let widgetEntry = this.listened[widgetId];

                    for (let messageNameGroup of Object.values(widgetEntry.messages)) {
                        for (let handler of Object.values(messageNameGroup.handlers)) {
                            widgetEntry.widget.off(messageNameGroup.messageName, handler);
                        }
                    }
                }

                this.listened = {};
            }

            return this;
        }

        insertAfter(...args) {
            super.insertAfter(...args);

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        insertBefore(...args) {
            super.insertBefore(...args);

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        isConcealed() {
            return this.concealed != null;
        }

        listen(widget, messageName, handler) {
            if (handlerKey in handler) {
                var hid = handler[handlerKey];
            }
            else {
                var hid = nextHandlerId++;
                handler[handlerKey] = hid;
            }

            if (widget.getId() in this.listened) {
                var widgetEntry = this.listened[widget.getId()];
            }
            else {
                var widgetEntry = new Object({
                    widget: widget,
                    messages: {},
                });

                this.listened[widget.getId()] = widgetEntry;
            }

            if (messageName in widgetEntry.messages) {
                var messageNameGroup = widgetEntry.messages[messageName];

                if (hid in messageNameGroup.handlers) {
                    return this;
                }
            }
            else {
                var messageNameGroup = {
                    messageName: messageName,
                    handlers: {}
                };

                widgetEntry.messages[messageName] = messageNameGroup;
            }

            messageNameGroup.handlers[hid] = handler;
            widget.on(messageName, handler);
            return this;
        }

        off(messageName, handler, filter) {
            if (messageName.startsWith('dom.')) {
                return super.off(messageName, handler);
            }
            else {
                return Reflect.apply(Emitter.prototype.off, this, [messageName, handler, filter]);
            }
        }

        on(messageName, handler, filter) {
            if (messageName.startsWith('dom.')) {
                return super.on(messageName, handler);
            }
            else {
                return Reflect.apply(Emitter.prototype.on, this, [messageName, handler, filter]);
            }
        }

        once(messageName, handler, filter) {
            if (messageName.startsWith('dom.')) {
                return super.once(messageName, handler);
            }
            else {
                return Reflect.apply(Emitter.prototype.once, this, [messageName, handler, filter]);
            }
        }

        onServerNotify(message) {
            if (this.refreshers.has(message.endpoint)) {
                this.refresh();
            }
        }

        popStyle() {
            if (this.styleStack.length) {
                let style = this.styleStack[this.styleStack.length - 1];
                this.clearStyle();
                this.setStyle(style);
            }

            return this;
        }

        prepend(...args) {
            super.prepend(...args);

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        pushStyle(styleObj) {
            let style = this.getStyle();
            this.styleStack.push(style);
            style = clone(style);

            for (let key in styleObj) {
                style[key] = styleObj[key];
            }

            this.clearStyle();
            this.setStyle(style);
            return this;
        }

        async refresh() {
        }

        remove() {
            let parent = this.parent();

            if (parent) {
                super.remove();

                this.send({
                    messageName: 'remove',
                    type: 'innerHtml',
                    widget: parent,
                });
            }

            return this;
        }

        replace(...args) {
            let parent = this.parent();

            if (parent) {
                super.replace(...args);

                this.send({
                    messageName: 'Widget.Changed',
                    type: 'innerHtml',
                    widget: parent,
                });
            }

            return this;
        }

        restorePanelState() {
            // TODO
            return this;
        }

        reveal() {
            if (typeof this.concealed == 'string') {
                this.silence();
                this.setStyle('display', this.concealed);
                this.concealed = null;
                this.resume();
            }

            return this;
        }

        searchAncestor(opts) {
            let parent = this.parent();

            if (opts.type == 'ctor') {
                while (parent && !(parent instanceof opts.ctor)) {
                    parent = parent.parent();
                }
            }
            else if (opts.type == 'flag') {
                while (parent && !parent.getFlag(opts.name)) {
                    parent = parent.parent();
                }
            }
            else if (opts.type == 'pin') {
                while (parent && parent.getPinned([opts.name]) !== opts.value) {
                    parent = parent.parent();
                }
            }
            else {
                parent = undefined;
            }

            return parent;
        }

        searchDescendant(opts) {
            let hits = [];
            let stack = this.children();

            while (stack.length) {
                let descendant = stack.pop();

                if (opts.type == 'ctor') {
                    if (descendant instanceof (opts.ctor)) {
                        hits.push(descendant);
                    }
                }
                else if (opts.type == 'flag') {
                    if (descendant.getFlag(opts.name)) {
                        hits.push(descendant);
                    }
                }
                else if (opts.type == 'pin') {
                    if (descendant.getPinned(opts.name) === opts.value) {
                        hits.push(descendant);
                    }
                }

                descendant.children().reverse().forEach(descendant => stack.push(descendant));
            }

            return hits;
        }

        setAttribute(name, value) {
            super.setAttribute(name, value);

            this.send({
                messageName: 'Widget.Changed',
                type: 'attribute',
                widget: this,
                name: name,
                value: value,
            });

            return this;
        }

        setClassName(className) {
                if (className) {
                super.setClassName(className);

                this.send({
                    messageName: 'Widget.Changed',
                    type: 'attribute',
                    widget: this,
                    name: 'class',
                    value: this.getAttribute('class'),
                });
            }

            return this;
        }

        setClassNames(classNames) {
            if (classNames) {
                super.setClassNames(classNames);

                this.send({
                    messageName: 'Widget.Changed',
                    type: 'attribute',
                    widget: this,
                    name: 'class',
                    value: this.getAttribute('class'),
                });
            }

            return this;
        }

        setInnerHtml(innerHtml) {
            super.setInnerHtml(innerHtml);

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        setMenu(menu) {
            menu ? menu.attach(this) : false;
            return this;
        }

        setOuterHtml(outerHtml) {
            super.setOuterHtml(outerHtml);

            this.send({
                messageName: 'Widget.Changed',
                type: 'innerHtml',
                widget: this,
            });

            return this;
        }

        setPanelState(name, value) {
            // TODO
            return this;
        }

        setRefreshers(...endpointNames) {
            this.refreshers.set(...endpointNames);
            return this;
        }

        setStyle(arg, value) {
            super.setStyle(arg, value);

            this.send({
                messageName: 'Widget.Changed',
                type: 'style',
                widget: this,
                value: this.getStyle(),
            });

            return this;
        }

        setWidgetStyle(widgetStyle) {
            this.setAttribute('widget-style', widgetStyle);
            return this;
        }

        unbind(activeData) {
            if (activeData) {
                Binding.unbind(activeData, this);
            }
            else {
                Binding.unbindWidget(this);
            }

            return this;
        }
    });
})();
*/