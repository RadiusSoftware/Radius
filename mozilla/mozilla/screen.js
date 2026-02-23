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
 * This is the Radius-like API wrapper for the traditional Mozilla screen object,
 * which is found at window.screen.  The Screen singleton provides access to the
 * basic API features that are neither deprecate nor experimental.  There are few
 * such features on the Screen object.
*****/
singleton(class Screen extends Emitter {
    constructor() {
        super();

        window.screen.addEventListener('change', event => {
            this.emit({
                name: event.type,
                event: event,
            });
        });
    }

    getAvailHeight() {
        return window.screen.availHeight;
    }

    getAvailSize() {
        return {
            height: window.screen.availHeight,
            width: window.screen.availWidth,
        };
    }

    getAvailWidth() {
        return window.screen.availWidth;
    }

    getColorDepth() {
        return window.screen.colorDepth;
    }

    getColorHeight() {
        return window.screen.height;
    }

    getOrientation() {
        return window.screen.orientation;
    }

    getPixelDepth() {
        return window.screen.pixelDepth;
    }

    isExtended() {
        return window.screen.isExtended;
    }
});
