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
 * The docEvent is a high-level wrapper for the browser native event object.
 * The primary purpose for this wrapper is to provide a framework-like AP for
 * each object and to provide access directly to framework objects, instead of
 * the raw nodes and elements.
*****/
define(class RdsEvent {
    constructor(event) {
        this.event = event;
    }

    composedPath(...args) {
        return this.event.composedPath(...args);
    }

    getDataTransfer() {
        return this.event.dataTransfer;
    }

    getSrcElement() {
        return wrapTree(this.event.srcElement);
    }

    getTarget() {
        return wrapTree(this.event.target);
    }

    preventDefault(...args) {
        return this.event.preventDefault(...args);
    }

    stopImmediatePropagation(...args) {
        return this.event.stopImmediatePropagation(...args);
    }

    stopPropagation(...args) {
        return this.event.stopPropagation(...args);
    }
});