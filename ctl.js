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


singleton('', class Ctl {
    /*****
     * In some cases, developers may find that they don't know whether a value
     * is a promise or a regular objevt.  The function handles that by returning
     * a promise that will be fulfilled wither when (a) the value is NOT a promise
     * or (b) immediately by returning the original value (promise) itself.
    *****/
    onValue(arg) {
        return new Promise(async (ok, fail) => {
            if (arg instanceof Promise) {
                ok(await arg);
            }
            else {
                ok(arg);
            }
        });
    }

    /*****
     * This is a very simplistic function that's nice to have syntactically.  It
     * makes for some very nice code:  await pauseFor(800).  The input interval is
     * specified in milliseconds.
    *****/
    pause(interval) {
        return new Promise((ok, fail) => {
            setTimeout(() => ok(), interval);
        });
    }

    /*****
     * Use this to wait for asynchronouse processes to complete by polling a function
     * on a periodic basis.  The func parameter is an argumentless function the returns
     * a boolean like value of either true or false.  When func() returns true, the
     * promise is fulfilled and the calling code can continue it's inline execution.
    *****/
    poll(func, interval) {
        return new Promise(async (ok, fail) => {
            if (func()) ok();
    
            let intervalObject = setInterval(() => {
                if (func()) {
                    clearInterval(intervalObject);
                    ok();
                }
            }, interval);
        });
    }
});