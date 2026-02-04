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
 * A lock is a mechanism to ensure asynchronous activity is synchronized and
 * coordinated.  This ensures exclusive access to a sequence of protected code.
 * After lock() is called, the caller waits until it's its turn.  The user must
 * in turn call free() when done with the critical section of code.  The lock
 * is generally used along with the Pipeline in a controller or server process
 * to coordinate incoming requests from child processes.
*****/
define(class Lokker {
    constructor() {
        this.queue = [];
        this.owner = false;
    }

    free() {
        this.owner = false;

        if (this.queue.length) {
            this.owner = true;
            this.queue.shift()();
        }

        return this;
    }

    isFree() {
        return this.queue.length == 0;
    }

    lock() {
        if (this.owner) {
            let release;

            let promise = new Promise((ok, fail) => {
                release = () => ok();
            });

            this.queue.push(release);
            return promise;
        }
        else {
            this.owner = true;
            return new Promise((ok, fail) => ok());
        }
    }
});