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
singleton('', class Win extends Emitter {  
    constructor() {
        super();
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
        ].forEach(eventName => window.addEventListener(eventName, event => {
            this.emit({
                name: `${eventName}`,
                event: event
            });
        }));
    }

    blur() {
        window.blur();
        return this;
    }

    clearIdleTask(handle) {
    }

    close() {
        window.close();
        return this;
    }

    focus() {
        window.focus();
        return this;
    }

    getComputedStyle() {
        return window.getComputedStyle();
    }

    getDevicePixelRatio() {
        return window.devicePixelRatio;
    }

    getDocument() {
        return mkDoc(window.document);
    }

    getFrameElement() {
        return window.frameElement ? wrapNode(window.frameElement) : null;
    }

    getFrames() {
        let frames = [];

        for (let i = 0; i < window.frames.length; i++) {
            frames.push(mkWin(window.frames[i]));
        }

        return frames;
    }

    getInnerHeight() {
        return window.innerHeight;
    }

    getInnerWidth() {
        return window.innerWidth;
    }

    getLength() {
        return window.length;
    }

    getMenuBar() {
        return window.menubar;
    }

    getLocation() {
        return window.location;
    }

    getLocationBar() {
        return window.locationbar;
    }

    getName() {
        return window.name;
    }

    getOpener() {
        return mkWin(window.opener);
    }

    getOrigin() {
        return window.origin;
    }

    getOuterHeight() {
        return window.outerHeight;
    }

    getOuterWidth() {
        return window.outerWidth;
    }

    getPageXOffset() {
        return window.pageXOffset;
    }

    getPageYOffset() {
        return window.pageYOffset;
    }

    getParent() {
        return window.parent;
    }

    getPersonalBar() {
        return window.personalbar;
    }

    getScreenY() {
        return window.screenY;
    }

    getScrollBars() {
        return window.scrollbars;
    }

    getScrollMaxX() {
        return window.scrollMaxX;
    }

    getScrollMaxY() {
        return window.scrollMaxY;
    }

    getSelection() {
        return window.getSelection();
    }

    getStatusBar() {
        return window.statusbar;
    }

    getToolBar() {
        return window.toolbar;
    }

    getTop() {
        return window.top;
    }

    isClosed() {
        return window.closed;
    }

    isFullScreen() {
        return window.fullScreen;
    }

    isSecureContext() {
        return window.isSecureContext;
    }

    moveBy(deltaX, deltaY) {
        window.moveBy(deltaX, deltaY);
        return this;
    }

    moveTo(x, y) {
        window.moveTo(x, y);
        return this;
    }

    resizeBy(xDelta, yDelta) {
        window.resizeBy(xDelta, yDelta);
        return this;
    }

    resize(width, height) {
        window.resizeTo(width, height);
        return this;
    }

    scroll(xCoord, yCoord) {
        window.scroll(xCoord, yCoord);
        return this;
    }

    scrollTo(x, y) {
        window.scrollTo(x, y);
        return this;
    }

    setIdleTask(func, opts) {
    }

    setName(name) {
        window.name = name;
        return this;
    }

    stop() {
        window.stop();
        return this;
    }
});