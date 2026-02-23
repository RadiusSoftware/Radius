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
 * The singleton Radius framework object that manages the underlying window
 * object.  The document wrap is not just a wrap, it's a value-added wrap with
 * features such as returning framework DocElements value-add features for
 * extending window appearance and placemeent.  Win extends Emitter to help
 * extend make the underlying window events available as real-time messages.
*****/
singleton(class Win extends Emitter {  
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

        if (window.matchMedia('(prefers-color-scheme: dark)')) {
            this.colorScheme = 'dark';
        }
        else {
            this.colorScheme = 'light';
        }

        window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', event => {
            this.colorScheme = event.matches ? "dark" : "light";
            
            this.emit({
                name: 'ColorSchemeChange',
                scheme: this.colorScheme,
            });
        });
    }

    awaitEngineIdle(func) {
        window.requestAnimationFrame(func);
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

    download(content, baseName, fileExt) {
        const mime = mkMime(fileExt);
        const fileName = `${baseName}${mime.getPrimaryExtension()}`;
        const blob = new Blob([content], { type: mime.getType() });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.style.display = "none";
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    focus() {
        window.focus();
        return this;
    }

    getColorScheme() {
        return this.colorScheme;
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

    getScreen() {
        return mkScreen();
    }

    getScreenX() {
        return window.screenX;
    }

    getScreenY() {
        return window.screenY;
    }

    getScrollBars() {
        return window.scrollbars;
    }

    getScrollX() {
        return window.scrollX;
    }

    getScrollY() {
        return window.scrollY;
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

    setName(name) {
        window.name = name;
        return this;
    }

    stop() {
        window.stop();
        return this;
    }
});