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
register('', class Controller {
    constructor() {
        this.data = mkActive().on(message => this.onUpdate(message));
        this.elements = [];
        return this;
    }

    addElement(element) {
        if (!this.has(element)) {
            this.elements.push(element);
        }

        return this;
    }

    has(queryElement) {
        for (let element of this.elements) {
            if (Object.is(element, queryElement)) {
                return true;
            }
        }

        false;
    }

    off(handler) {
        this.active.off('Update', handler);
        return this;
    }

    on(handler) {
        this.active.on('Update', handler);
        return this;
    }

    onUpdate(message) {
    }

    once(handler) {
        this.active.once('Update', handler);
        return this;
    }

    removeElement(element) {
        for (let i = 0; i < this.elements.length; i++) {
            if (Object.is(this.elements[i]), element) {
                this.elements.splice(i, 1);
                break;
            }
        }

        return this;
    }

    value() {
        return this.active;
    }
});
