/*****
 * Copyright (c) 2017-2023 Kode Programming
 * https://github.com/KodeProgramming/kode/blob/main/LICENSE
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
 * This is a tiny HTTP extension that coordinates with the WebMonitorService to
 * provide updates / notifications to the caller.  Note that the WebMonitor obj
 * is placed in the HTTP Library at every /notify and /cancel path.  There is
 * actually neither state nor notification contained within the HttpX.  Rather,
 * all of the notification information is implied by the the request path.
*****/
define(class WebMonitor extends HttpX {
    async handleDELETE(handle) {
        let path = handle.req.getPath();
        let uuid = path.substring(1);

        if (await mkWebMonitorHandle(uuid).delete()) {
            handle.rsp.respond(
                200,
                'text/plain',
                '',
                'WebMonitor Deleted',
            );
        }
        else {
            handle.rsp.respondStatus(404);
        }
    }

    async handleGET(handle) {
        let path = handle.req.getPath();
        let uuid = path.substring(1);
        let notificationObj = await mkWebMonitorHandle(uuid).get();

        if (notificationObj) {
            handle.rsp.respond(
                200,
                'application/json',
                '',
                toJson(notificationObj),
            );
        }
        else {
            handle.rsp.respondStatus(404);
        }
    }
});


/*****
 * The WebMonitor anchors the communication between the browser client and the
 * HttpWorkers and the application that's running and providing updates to an
 * ongoing process.  This facilittes our need to securely provide real-time date
 * without using a websocket, which is blocked by many organizational firewalls.
*****/
createService(class WebMonitorService extends Service {
    constructor() {
        super();
        this.monitors = {};
        this.lib = mkHttpLibraryHandle();
    }

    async onCreate(message) {
        let monitor = {
            uuid: Crypto.generateUUID(),
            path: `/${uuid}`,
            pending: [],
            trigger: null,
        };

        this.monitors[monitor.uuid] = monitor;

        await this.lib.addHttpX({
            path: monitor.path,
            mime: 'application/json',
            mode: 'tls',
            once: false,
            pset: await mkPermissionSetHandle().createPermissionSet(),
            jsPath: __filename,
        });

        return uuid;
    }

    async onDelete(message) {
        // **********************************************************************
        // **********************************************************************
        if (message.uuid in this.monitors) {
            let monitor = this.monitors[message.uuid];

            if (message.immediate) {
            }
            else {
            }

            delete this.monitors[message.uuid];
            await this.lib.delete(monitor.path);
            return true;
        }

        return false;
    }

    async onGet(message) {
        if (message.uuid in this.monitors) {
            let shifted;
            let monitor = this.monitors[uuid];

            if (!monitor.trigger) {
                if (monitor.pending.length) {
                    shifted = monitor.pending.shift();
                }
                else {
                    await new Promise((ok, fail) => {
                        monitor.trigger = () => ok();
                    });

                    shifted = monitor.pending.shift();
                }

                if (ObjectType.verify(shifted)) {
                    return shifted;
                }
            }

            return {};
        }
    }

    async onUpdate(message) {
        if (message.uuid in this.monitors) {
            let monitor = this.monitors[uuid];

            if (ObjectType.verify(message.obj)) {
                monitor.pending.push(message.obj);

                if (monitor.pending.trigger) {
                    let trigger = monitor.pending.trigger;
                    monitor.pending.trigger = null;
                    trigger();
                }
            }
        }
    }
});


/*****
 * The web monitor service and handle provide the WebMonitor HttpX with stateful
 * data and handling between the HTTP client and the server.  In a WebApp, the
 * <monitor-widget> is used for automatically handling the coordiantiion between
 * the HTML page and the server.  The update() method is how the ongoing process
 * queues up and sends message to the browser, while the get() method is used by
 * the WebMonitor HttpX for gettiing a notification object so it can return that
 * object to the MonitorWidget.
*****/
define(class WebMonitorHandle extends Handle {
    constructor(uuid) {
        super();
        this.uuid = StringType.verify(uuid) ? uuid : '';
    }

    async create() {
        this.uuid = await this.callService({
        });

        return this;
    }

    async delete() {
        return await this.callService({
            uuid: this.uuid,
        });
    }

    static fromJson(value) {
        return mkWebMonitorHandle(value.uuid);
    }

    async get() {
        return await this.callService({
            uuid: this.uuid,
            obj: obj,
        });
    }

    async update(obj) {
        await this.callService({
            uuid: this.uuid,
            obj: obj,
        });

        return this;
    }
});
