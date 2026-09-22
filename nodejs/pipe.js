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
 * Provides features to all objects that inherit from RdsPipe.  An RdsPipe is a
 * one-way, unidirectional, data pipe, whose intent is to be used as a way of
 * updating the other end of the pipe as to the status of what's happening at
 * this end of the pipe.  The send and close methods are async just to ensure
 * that we don't generate any squirrely errors when racing through simpel tasks.
 * Note that this base class can be instantiated as an inert stub if needed.
*****/
define(class RdsPipe {
    constructor() {
    }

    async close() {
        return this;
    }

    async send(message) {
        return this;
    }
});


/*****
 * The logging pipe will collect data from incoming notification messages and
 * retain the data and depending on the provided options to the constructor,
 * will send out the final log to a listener or will perhaps save the entire
 * log or parts of the log in the DBMS.
*****/
define(class LoggingPipe extends RdsPipe {
    constructor() {
        super();
        // TBD ***************************************
        // TBD ***************************************
    }

    async close() {
        // TBD ***************************************
        // TBD ***************************************
        return this;
    }

    async send(message) {
        // TBD ***************************************
        // TBD ***************************************
        return this;
    }
});


/*****
 * The WebsocketPipe's primary purpose is to notify a browser widget using the
 * progress-update protocol to provide feedback to a user that's monitoring a
 * slow process, especially a process or procedure that has a chance to fail.
*****/
define(class WebsocketPipe extends RdsPipe {
    constructor(websocketHandle) {
        super();
        this.websocketHandle = websocketHandle;
    }

    async close() {
        await this.websocketHandle.close();
        return this;
    }

    async send(message) {
        await this.websocketHandle.sendMessage(message);
        return this;
    }
});
