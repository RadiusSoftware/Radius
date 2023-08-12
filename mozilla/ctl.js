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
 * Create a task to be executed when the browser is idle and doesn't any CPU.
 * The func argument is the callback to be executed during idle periods on
 * the browser.  opts is an object with a single options value, timeout.
 * If the number of milliseconds represented by this parameter has elapsed and
 * the callback has not already been called, then a task to execute the callback
 * is queued in the event loop (even if doing so risks causing a negative
 * performance impact). timeout must be a positive value or it is ignored.
*****/
Ctl.setIdleTask = (func, opts) => {
    return win.win.requestIdleCallback(fund, opts);
}

Ctl.clearIdleTask = (handle) => {
    this.win.win.cancelIdleCallback(handle);
}
