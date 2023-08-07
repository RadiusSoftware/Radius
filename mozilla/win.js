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


/*****
 * The framework wrapper for the window object.  Remember that a window can be
 * a browser tab, a frame, or an iframe.  Hence, there are hierarchy features
 * associated with DOM windows and we don't just have a singleton object for
 * our window wrapper.  One of the key features is that the framework window is
 * an Emitter and will send messages for all registerd window events.
*****/
register(class Win extends Emitter {  
    constructor(win) {
        super();
        this.win = win;

        [
            'afterprint',
            'animationcancel',
            'animiationend',
            'animationiteration',
            'animationstart',
            'beforeunload',
            'beforeprint',
            'blur',
            'copy',
            'cut',
            'devicemotion',
            'deviceorientation',
            'DOMContentLoaded',
            'error',
            'focus',
            'gamepadconnected',
            'gamepaddisconnected',
            'hashchange',
            'languagechange',
            'load',
            'offline',
            'online',
            'pagehide',
            'pageshow',
            'paste',
            'popstate',
            'resize',
            'storage',
            'unload',
        ].forEach(eventName => this.win.addEventListener(eventName, event => {
            this.send({
                messageName: `dom.${eventName}`,
                event: event
            });
        }));
    }

    alert() {
        this.win.alert();
        return this;
    }

    blur() {
        this.win.blur();
        return this;
    }

    clientInformation() {
        return this.win.clientInformation;
    }

    close() {
        this.win.close();
        return this;
    }

    confirm(message) {
        return this.win.confirm(message);
    }

    closed() {
        return this.win.closed;
    }

    crypto() {
        return this.win.crypto;
    }

    doc() {
        return mkDoc(this.win.document);
    }

    focus() {
        this.win.focus();
        return this;
    }

    frameElement() {
        return wrapDocNode(this.win.frameElement);
    }

    frames() {
        let frames = [];

        for (let i = 0; i < this.win.frames.length; i++) {
            frames.push(mkWindow(this.win.frames[i]));
        }

        return frames;
    }

    getScreen() {
        return this.win.screen;
    }

    innerHeight() {
        return this.win.innerHeight;
    }

    innerWidth() {
        return this.win.innerWidth;
    }

    isSecure() {
        return this.win.isSecureContext;
    }

    location(url) {
        if (url) {
            this.win.location.assign(url);
        }
        else {
            return this.win.location;
        }
    }

    name() {
        return this.win.name;
    }

    outerHeight() {
        return this.win.outerHeight;
    }

    outerWidth() {
        return this.win.outerWidth;
    }

    pageXOffset() {
        return this.win.pageXOffset;
    }

    pageYOffset() {
        return this.win.pageYOffset;
    }

    parent() {
        if (this.win.parent) {
            return mkWindow(this.win.parent);
        }

        return null;
    }

    pixelRatio() {
        return this.win.devicePixelRatio;
    }

    resizeBy(dx, dy) {
        this.win.resizeBy(dx, dy);
        return this;
    }

    resizeTo(x, y) {
        this.win.resizeTo(x, y);
        return this;
    }

    screenX() {
        return this.win.screenX;
    }

    screenY() {
        return this.win.screenY;
    }

    scroll(x, y) {
        this.win.scroll(x, y);
        return this;
    }

    scrollBy(dx, dy) {
        this.win.scrollBy(dx, dy);
        return this;
    }

    scrollX() {
        return this.win.scrollX;
    }

    scrollY() {
        return this.win.scrollY;
    }

    top() {
        return mkWindow(this.win.top);
    }

    viewport() {
        return this.win.visualViewport;
    }
});