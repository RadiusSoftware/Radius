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
 * The framework API wrapper for the DOM document object.  Our primary purpose
 * is to simplifiy the complexity and histority mess associated with the long
 * history of the document API.
*****/
register('', class Doc extends Emitter {
    constructor(doc) {
        super();
        this.doc = doc ? doc : document;

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
        ].forEach(eventName => this.doc.addEventListener(eventName, event => {
            this.send({
                messageName: `${eventName}`,
                event: mkElementEvent(event)
            });
        }));
    }

    adoptNode(externalNode) {
        let internalNode = this.doc.adoptNode(unwarpDocNode(externalMode));
        return wrapDocNode(internalNode);
    }

    close() {
        this.doc.close();
    }

    async copy(value) {
        if ((await navigator.permissions.query({name: "clipboard-write"})).state == 'granted') {
            navigator.clipboard.writeText(value);
        }

        return this;
    }

    createRange() {
        return this.doc.createRange();
    }

    createTreeWalker(node, includes) {
        return this.doc.createTreeWalkter(node, includes);
    }

    exitFullScreen() {
        this.doc.exitFullScreen();
        return this;
    }

    exitPictureInPicture() {
        this.doc.exitPictureInPicture();
        return this;
    }

    exitPointerLock() {
        this.doc.exitPointerLock();
        return this;
    }

    getActiveElement() {
        return wrapDocNode(this.doc.activeElement);
    }

    getAdoptedStyleSheets() {
        return this.doc.adoptedStyleSheets().map(adopted => mkCssStyleSheet(adopted));
    }

    getAnimations() {
        return this.doc.getAnimations();
    }

    getBody() {
        return wrapDocNode(this.doc.body);
    }

    getCaretPositionFromPoint(x, y) {
        return this.doc.caretPositionFromPoint(x, y);
    }

    getCharacterSet() {
        return this.doc.characterSet;
    }

    getCompatMode() {
        return this.doc.compatMode;
    }

    getContentType() {
        return this.doc.contentType;
    }

    getCookie() {
        // TODO ******************        
    }

    getCurrentScript() {
        return mkDocNode(this.doc.currentScript);
    }

    getDesignMode() {
        return this.doc.designMode;
    }

    getDir() {
        return this.doc.dir;
    }

    getDocType() {
        return this.doc.doctype;
    }

    getDocumentUri() {
        return this.doc.documentURI;
    }

    getElementById(id) {
        return this.doc.getElementById(id);
    }

    getElementFromPoint(x, y) {
        let element = this.doc.elementFromPoint(x, y);
        return element ? wrapDocNode(element) : null;
    }

    getElementFromPoints(x, y) {
        let elements = [];

        for (let element of this.doc.elementsFromPoint(x, y)) {
            elements.push(wrapDocNode(element));
        }

        return elements;
    }

    getFonts() {
        return this.doc.fonts;
    }

    getForms() {
        return this.doc.forms;
    }

    getFullScreenElement() {
        return this.doc.fullScreenElement;
    }

    getFullScreenEnabled() {
        return this.doc.fullscreenEnabled;
    }

    getHead() {
        return wrapDocNode(this.doc.head);
    }

    getHtml() {
        return wrapDocNode(this.doc.documentElement);
    }

    getImages() {
        let elements = [];

        for (let i = 0; i < this.doc.images.length; i++) {
            elements.push(wrapDocNode(this.doc.images.item(i)));
        }

        return elements;
    }

    getImplementation() {
        return this.doc.implementation;
    }

    getLastModiied() {
        return this.mkTime(this.doc.lastModified);
    }

    getLocation() {
        return this.doc.location;
    }

    getLinks() {
        let elements = [];

        for (let i = 0; i < this.doc.links.length; i++) {
            elements.push(wrapDocNode(this.doc.links.item(i)));
        }

        return elements;      
    }

    getPictureInPictureElement() {
        if (this.doc.pictureInPictureElement) {
            return wrapDocNode(this.doc.pictureInPictureElement);
        }

        return null;
    }

    getPointerLockElement() {
        if (this.doc.pointLockElement) {
            return wrapDocNode(this.doc.pointLockElement);
        }

        return null;
    }

    getPlugins() {
        return this.doc.plugins;
    }

    getReadyState() {
        return this.doc.readyState;
    }

    getReferrer() {
        return this.doc.referrer;
    }

    getScripts() {
        let elements = [];

        for (let i = 0; i < this.doc.scripts.length; i++) {
            elements.push(wrapDocNode(this.doc.scripts.item(i)));
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
            return mkCssStyleSheet(this.doc.styleSheets[0]);
        }
    }

    getStyleSheets() {
        let styleSheets = [];

        for (let i = 0; i < this.doc.styleSheets.length; i++) {
            styleSheets.push(wrapDocNode(this.doc.styleSheets.item(i)));
        }

        return styleSheets;       
    }

    getTimeline() {
        return this.doc.timeline;
    }

    getTitle() {
        return this.doc.title;
    }

    getUrl() {
        return this.doc.URL;
    }

    getVisibilityState() {
        return this.doc.visibilityState;
    }

    getWindow() {
        return mkWin(this.doc.defaultView);
    }

    hasFocus() {
        return this.doc.hasFocus();
    }

    isHidden() {
        return this.doc.hidden;
    }

    queryAll(selector) {
        let selected = [];
      
        if (typeof selector == 'string' && selector != '') {
            let nodeList = this.doc.querySelectorAll(selector);
      
            for (let i = 0; i < nodeList.length; i++) {
                selected.push(wrapDocNode(nodeList.item(i)));
            }
        }

        return selected;
    }

    queryOne(selector) {
        if (typeof selector == 'string' && selector != '') {
            let selected = this.doc.querySelector(selector);

            if (selected) {
                return wrapDocNode(selected);
            }
        }

        return null;
    }

    setCookie() {
        // TODO ****************** 
        return this;
    }

    setDesignMode(mode) {
        this.doc.designMode = mode ? 'on' : 'off';
        return this;
    }

    setDir(dir) {
        switch (dir) {
            case 'rtl':
            case 'ltr':
                this.doc.dir = dir;
                break;
        }

        return this;
    }

    setTitle(title) {
        this.doc.title = title;
        return this;
    }
});
