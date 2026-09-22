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
 * The empty Pipe is just a stub to ensure compatability of some features with
 * how it's used.  The stub Pipe is just an empty abyss in cyberspace.  This is
 * great for development or for internal back-end processes.
*****/
define(class BasePipe {
    send(message) {
    }
});


/*****
 * The logging pipe will collect data from incoming notification messages and
 * retain the data and depending on the provided options to the constructor,
 * will send out the final log to a listener or will perhaps save the entire
 * log or parts of the log in the DBMS.
*****/
define(class LoggingPipe {
    construct() {
    }

    send(message) {
    }
});


/*****
 * This is how we transfer data from the primary process to a worker and at the
 * worker that are many options available such as sending additional information
 * along to the browser so the user can watch the progress of a request.
*****/
define(class WorkerPipe {
    constructor(workerId) {
        this.workerId = workerId;
        this.uuid = Crypto.generateUUID();
    }

    getUUID() {
        return this.uuid;
    }

    getWorkerId() {
        return this.workerId;
    }

    send(message) {
        let name = message.name;
        message.name = this.uuid;
        Process.sendWorker(this.workerId, message);
        name ? message.name = name : delete message.name;
        return this;
    }
});
