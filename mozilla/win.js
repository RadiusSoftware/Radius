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
 * The framework wrapper for the window object.  Remember that a window can be
 * a browser tab, a frame, or an iframe.  Hence, there are hierarchy features
 * associated with DOM windows and we don't just have a singleton object for
 * our window wrapper.  One of the key features is that the framework window is
 * an Emitter and will send messages for all registerd window events.
*****/
register('', class Win extends Emitter {  
    constructor(win) {
        super();
        this.win = win ? wind : window;

        [
            'afterprint',
            'animationcancel',
            'animiationend',
            'animationiteration',
            'animationstart',
            'appinstalled',
            'beforeinstallprompt',
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
            'mnessage',
            'messageerror',
            'offline',
            'online',
            'pagehide',
            'pageshow',
            'paste',
            'popstate',
            'rejectionhandled',
            'resize',
            'storage',
            'transitioncancel',
            'transitionend',
            'transitionrun',
            'transitionstart',
            'unhandledrejection',
            'unload',
        ].forEach(eventName => this.win.addEventListener(eventName, event => {
            this.send({
                messageName: `dom.${eventName}`,
                event: event
            });
        }));
    }

    blur() {
        this.win.blur();
        return this;
    }

    close() {
        this.win.close();
        return this;
    }

    focus() {
        this.win.focus();
        return this;
    }

    getComputedStyle() {
        return this.win.getComputedStyle();
    }

    getDevicePixelRatio() {
        return this.win.devicePixelRatio;
    }

    getDocument() {
        return mkDoc(this.win.document);
    }

    getFrameElement() {
        return this.win.frameElement ? wrapDocNode(this.win.frameElement) : null;
    }

    getFrames() {
        let frames = [];

        for (let i = 0; i < this.win.frames.length; i++) {
            frames.push(mkWin(this.win.frames[i]));
        }

        return frames;
    }

    getInnerHeight() {
        return this.win.innerHeight;
    }

    getInnerWidth() {
        return this.win.innerWidth;
    }

    getLength() {
        return this.win.length;
    }

    getMenuBar() {
        return this.win.menubar;
    }

    getLocation() {
        return this.win.location;
    }

    getLocationBar() {
        return this.win.locationbar;
    }

    getName() {
        return this.win.name;
    }

    getOpener() {
        return mkWin(this.win.opener);
    }

    getOrigin() {
        return this.win.origin;
    }

    getOuterHeight() {
        return this.win.outerHeight;
    }

    getOuterWidth() {
        return this.win.outerWidth;
    }

    getPageXOffset() {
        return this.win.pageXOffset;
    }

    getPageYOffset() {
        return this.win.pageYOffset;
    }

    getParent() {
        return this.win.parent;
    }

    getPersonalBar() {
        return this.win.personalbar;
    }

    getScreenY() {
        return this.win.screenY;
    }

    getScrollBars() {
        return this.win.scrollbars;
    }

    getScrollMaxX() {
        return this.win.scrollMaxX;
    }

    getScrollMaxY() {
        return this.win.scrollMaxY;
    }

    getSelection() {
        return this.win.getSelection();
    }

    getStatusBar() {
        return this.win.statusbar;
    }

    getToolBar() {
        return this.win.toolbar;
    }

    getTop() {
        return this.win.top;
    }

    isClosed() {
        return this.win.closed;
    }

    isFullScreen() {
        return this.win.fullScreen;
    }

    isSecureContext() {
        return this.win.isSecureContext;
    }

    moveBy(deltaX, deltaY) {
        this.win.moveBy(deltaX, deltaY);
        return this;
    }

    moveTo(x, y) {
        this.win.moveTo(x, y);
        return this;
    }

    resizeBy(xDelta, yDelta) {
        this.win.resizeBy(xDelta, yDelta);
        return this;
    }

    resize(width, height) {
        this.win.resizeTo(width, height);
        return this;
    }

    scroll(xCoord, yCoord) {
        this.win.scroll(xCoord, yCoord);
        return this;
    }

    scrollTo(x, y) {
        this.win.scrollTo(x, y);
        return this;
    }

    setName(name) {
        this.win.name = name;
        return this;
    }

    stop() {
        this.win.stop();
        return this;
    }
});