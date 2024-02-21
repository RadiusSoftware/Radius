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
singleton('', class Doc extends Emitter {
    constructor() {
        super();
        [
            'animationcancel',
            'animationend',
            'animationiteration',
            'animationstart',
            'click',
            'contextmenu',
            'copy',
            'cut',
            'dblclick',
            'DOMContentLoaded',
            'drag',
            'dragend',
            'dragenter',
            'dragleave',
            'dragover',
            'dragstart',
            'drop',
            'fullscreenchange',
            'fullscreenerror',
            'gotpointercapture',
            'keydown',
            'keyup',
            'lostpointercapture',
            'paste',
            'pointercancel',
            'pointerdown',
            'pointerenter',
            'pointerleave',
            'pointerlockchange',
            'pointerlockerror',
            'pointermove',
            'pointerout',
            'pointerover',
            'pointerup',
            'readystatechange',
            'scroll',
            'selectinchange',
            'touchcancel',
            'touchend',
            'touchmove',
            'touchstart',
            'transitioncancel',
            'transitionend',
            'transitionrun',
            'transitionstart',
            'visibilitychange',
            'wheel',
        ].forEach(eventName => document.addEventListener(eventName, event => {
            this.emit({
                name: `${eventName}`,
                event: mkElementEvent(event)
            });
        }));
    }

    adoptNode(externalNode) {
        let internalNode = document.adoptNode(unwarpDocNode(externalMode));
        return wrapNode(internalNode);
    }

    close() {
        document.close();
    }

    async copy(value) {
        if ((await navigator.permissions.query({name: "clipboard-write"})).state == 'granted') {
            navigator.clipboard.writeText(value);
        }

        return this;
    }

    createRange() {
        return document.createRange();
    }

    createTreeWalker(node, includes) {
        return document.createTreeWalkter(node, includes);
    }

    exitFullScreen() {
        document.exitFullScreen();
        return this;
    }

    exitPictureInPicture() {
        document.exitPictureInPicture();
        return this;
    }

    exitPointerLock() {
        document.exitPointerLock();
        return this;
    }

    getActiveElement() {
        return wrapNode(document.activeElement);
    }

    getAdoptedStyleSheets() {
        return document.adoptedStyleSheets().map(adopted => mkCssStyleSheet(adopted));
    }

    getAnimations() {
        return document.getAnimations();
    }

    getBody() {
        return wrapNode(document.body);
    }

    getCaretPositionFromPoint(x, y) {
        return document.caretPositionFromPoint(x, y);
    }

    getCharacterSet() {
        return document.characterSet;
    }

    getCompatMode() {
        return document.compatMode;
    }

    getContentType() {
        return document.contentType;
    }

    getCookie() {
        // TODO ******************        
    }

    getCurrentScript() {
        return mkDocNode(document.currentScript);
    }

    getDesignMode() {
        return document.designMode;
    }

    getDir() {
        return document.dir;
    }

    getDocType() {
        return document.doctype;
    }

    getDocumentUri() {
        return document.documentURI;
    }

    getElementById(id) {
        return document.getElementById(id);
    }

    getElementFromPoint(x, y) {
        let element = document.elementFromPoint(x, y);
        return element ? wrapNode(element) : null;
    }

    getElementFromPoints(x, y) {
        let elements = [];

        for (let element of document.elementsFromPoint(x, y)) {
            elements.push(wrapNode(element));
        }

        return elements;
    }

    getFonts() {
        return document.fonts;
    }

    getForms() {
        return document.forms;
    }

    getFullScreenElement() {
        return document.fullScreenElement;
    }

    getFullScreenEnabled() {
        return document.fullscreenEnabled;
    }

    getHead() {
        return wrapNode(document.head);
    }

    getHtml() {
        return wrapNode(document.documentElement);
    }

    getImages() {
        let elements = [];

        for (let i = 0; i < document.images.length; i++) {
            elements.push(wrapNode(document.images.item(i)));
        }

        return elements;
    }

    getImplementation() {
        return document.implementation;
    }

    getLastModiied() {
        return this.mkTime(document.lastModified);
    }

    getLocation() {
        return document.location;
    }

    getLinks() {
        let elements = [];

        for (let i = 0; i < document.links.length; i++) {
            elements.push(wrapNode(document.links.item(i)));
        }

        return elements;      
    }

    getPictureInPictureElement() {
        if (document.pictureInPictureElement) {
            return wrapNode(document.pictureInPictureElement);
        }

        return null;
    }

    getPointerLockElement() {
        if (document.pointLockElement) {
            return wrapNode(document.pointLockElement);
        }

        return null;
    }

    getPlugins() {
        return document.plugins;
    }

    getReadyState() {
        return document.readyState;
    }

    getReferrer() {
        return document.referrer;
    }

    getScripts() {
        let elements = [];

        for (let i = 0; i < document.scripts.length; i++) {
            elements.push(wrapNode(document.scripts.item(i)));
        }

        return elements;      
    }

    getStyleSheet(title) {
        if (title) {
            for (let styleSheet of this.getStyleSheets()) {
                if (styleSheet.title() == title) {
                    return styleSheet;
                }
            }

            return null;
        }
        else {
            return mkCssStyleSheet(document.styleSheets[0]);
        }
    }

    getStyleSheets() {
        let styleSheets = [];

        for (let i = 0; i < document.styleSheets.length; i++) {
            styleSheets.push(mkCssStyleSheet(document.styleSheets.item(i)));
        }

        return styleSheets;       
    }

    getTimeline() {
        return document.timeline;
    }

    getTitle() {
        return document.title;
    }

    getUrl() {
        return document.URL;
    }

    getVisibilityState() {
        return document.visibilityState;
    }

    getWindow() {
        return mkWin(document.defaultView);
    }

    hasFocus() {
        return document.hasFocus();
    }

    isHidden() {
        return document.hidden;
    }

    queryAll(selector) {
        let selected = [];
      
        if (typeof selector == 'string' && selector != '') {
            let nodeList = document.querySelectorAll(selector);
      
            for (let i = 0; i < nodeList.length; i++) {
                selected.push(wrapNode(nodeList.item(i)));
            }
        }

        return selected;
    }

    queryOne(selector) {
        if (typeof selector == 'string' && selector != '') {
            let selected = document.querySelector(selector);

            if (selected) {
                return wrapNode(selected);
            }
        }

        return null;
    }

    setCookie() {
        // TODO ****************** 
        return this;
    }

    setDesignMode(mode) {
        document.designMode = mode ? 'on' : 'off';
        return this;
    }

    setDir(dir) {
        switch (dir) {
            case 'rtl':
            case 'ltr':
                document.dir = dir;
                break;
        }

        return this;
    }

    setTitle(title) {
        document.title = title;
        return this;
    }
});