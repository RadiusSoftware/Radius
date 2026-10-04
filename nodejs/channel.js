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
 * The base class RdsChannel is an object that exists in both worker and the
 * primary processes.  A channel is a communications channel for streaming data
 * from the primary process to the channel in a worker.  RdsChannel sub classes
 * exist only within a worker, it's corresponding RdsChannel object will exist
 * only within the primary.  The data that is signalled by the primary process
 * RdsChannel is received and handled by the sub classes object in the worker.
 * The primary reason for channels is to support real-time data flow from an
 * algorithm in the primary process to worker process that caused that action.
 * The worker may be a websocket connected to a browsesr or a logging algorithm
 * sending data to the DBMS logging mechanism.
*****/
define(class RdsChannel {
    constructor() {
        this.primary = Process.isPrimary();

        if (this.primary) {
            this.uuid = arguments[0].uuid;
            this.workerId = arguments[0].workerId;

            Process.on(this.getMessageName(), message => {
                // TODO *********************************
            });
        }
        else {
            this.uuid = Crypto.generateUUID();
            this.workerId = Process.getWorkerId();

            Process.on(this.getMessageName(), async message => {
                if (message.reason == 'ready') {
                    return await this.ready();
                }
                else if (message.reason == 'close') {
                    return await this.close();
                }
                else if (message.reason == 'update') {
                    await this.signal(message.value);
                }
            });
        }
    }

    async close() {
        if (this.primary) {
            return await Process.callWorker(
                this.workerId,
                {
                    name: this.getMessageName(),
                    reason: 'close',
                }
            );
        }

        return this;
    }

    static fromJson(obj) {
        if (Process.isPrimary()) {
            return mkRdsChannel(obj);
        }
    }

    getMessageName() {
        return `Channel:${this.uuid}`;
    }

    async open() {
        return this;
    }

    async ready() {
        if (this.primary) {
            return await Process.callWorker(
                this.workerId,
                {
                    name: this.getMessageName(),
                    reason: 'ready',
                }
            );
        }
    }

    getUUID() {
        return this.channel;
    }

    getWorkerId() {
        return this.workerId;
    }

    async signal(value) {
        await Process.sendWorker(
            this.workerId,
            {
                name: this.getMessageName(),
                reason: 'update',
                value: value,
            }
        );

        return this;
    }
});


/*****
 * The WebsocketChannel is used for funneling signalled data from the primary
 * process to a websocket on the browser.  A websocket handle is a mechanism
 * for creating a websocket connectioin that was authorized by the executing
 * code.  This channel and channels in generate were driver by the need to
 * provide progress to a user when the ACME certification progress is ongoing.
 * Informational nibblets are displayed on a dialog on the browser side so the
 * user can follow and diagnose ongoing performance and potential issues.
*****/
define(class WebsocketChannel extends RdsChannel {
    async close() {
        await this.websocketHandle.done();
        return this;
    }

    getPath() {
        return this.websocketHandle.getPath();
    }

    async open() {
        this.websocketHandle = await mkWebsocketHandle().create();
        return this;
    }

    async ready() {
        await this.websocketHandle.connected();
    }

    async signal(data) {
        this.websocketHandle.send({
            name: 'RdsUpdate',
            value: data,
        });

        Process.sendPrimary({
            name: this.getMessageName(),
            value: data,
        });

        return this;
    }
});
