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
 * The framework encapsulation and enhancement of the browser's builtin in
 * websocket class.  One important featue is that the websocket can be either
 * connected or not.  When a user sends a message to the server, the websocket
 * wil automatically establish a new connection if not already connected.  This
 * ensures that we don't need to worry about Apple's aggressive socket-closing
 * functionality built into its browsers.  Also note that an automatical ping
 * function is started when the socket is connected so we don't need to worry
 * about aggressive time outs.  The application layer is then able to control
 * the socket-life duration.
*****/
define(class Websocket extends Emitter {
    static synchronous = Symbol('synchronous');
    static asynchronous = Symbol('asynchronous');

    constructor(path, mode) {
        super();
        this.ws = null;
        this.pending = [];
        this.payloads = [];
        this.trigger = null;
        this.lokker = mkLokker();

        if (window.location.protocol == 'https:') {
            this.url = `wss${window.location.origin.substring(5)}${path}`;
        }
        else if (window.location.protocol == 'http:') {
            this.url = `ws${window.location.origin.substring(4)}${path}`;
        }

        if (mode == Websocket.synchronous) {
            this.mode = Websocket.synchronous;
        }
        else {
            this.mode = Websocket.asynchronous;
        }
    }

    /*
    call(message) {
        if (ObjectType.verify(data) && StringType.verify(data.name)) {
            let trap = mkTrap();
            trap.setExpected(1);
            message['#TRAP'] = trap.id;
            this.ws.send(toJson(message));
            this.pending[trap.id] = trap;
            return trap.promise;
        }
    }
    */

    close(code, reason) {
        if (this.ws && this.ws.readyState == 1) {
            this.ws.close(
                Int32Type.verify(code) ? code : 1000,
                StringType.verify(reason) ? reason : 'unavailable',
            );
        }

        return this;
    }

    connect() {
        if (!this.ws) {
            this.ws = new WebSocket(this.url);
            this.interval = setInterval(() => this.ping(), 30000);

            this.ws.onopen = async event => {
                this.send({
                    name: 'WebsocketOpen',
                });

                for (let pending of this.pending) {
                    this.send(pending);
                }

                this.pending = [];
            };

            this.ws.onclose = () => {
                this.onClose();
            };

            this.ws.onmessage = event => {
                this.onMessage(event);
            }
        }

        return this;
    }

    async get() {
        if (this.mode == Websocket.synchronous) {
            try {
                await this.lokker.lock();

                if (this.payloads.length) {
                    if (this.trigger) {
                        this.trigger(this.payloads.shift());
                        this.trigger = null;
                    }
                    else {
                        return this.payloads.shift();
                    }
                }
                else {
                    return new Promise((ok, fail) => {
                        this.trigger = payload => ok(payload);
                    });
                }
            }
            finally {
                this.lokker.free();
            }
        }
    }

    async has() {
        if (this.mode == Websocket.synchronous) {
            try {
                await this.lokker.lock()
                return this.payloads.length > 0;
            }
            finally {
                this.lokker.free();
            }
        }
    }

    onClose() {
        this.ws = null;
        this.interval ? clearInterval(this.interval) : null;
    }

    onMessage(event) {
        let type;
        let payload;

        if (StringType.verify(event.data)) {
            if (event.data == '#Ping') {
                this.pong();
            }
            else if (event.data != '#Pong') {
                try {
                    let message = fromJson(event.data);

                    if (message instanceof Buffer) {
                        type = 'binary';
                        payload = message;
                    }
                    else if (ObjectType.verify(message) && StringType.verify(message.name)) {
                        type = 'message';
                        payload = message;
                    }
                    else {
                        type = 'string';
                        payload = event.data;
                    }
                }
                catch (e) {
                    type = 'string';
                    payload = event.data;
                }
            }
        }
        else {
            type = 'binary';
            payload = event.data;
        }

        if (type == 'message' && payload['#CALL']) {
            (async () => {
                let response = await this.query(payload);
                
                this.send({
                    name: '##RESPONSE##',
                    '#TRAP': payload['#TRAP'],
                    response: response,
                });
            })();
        }
        else {
            this.push(type, payload);
        }
    }

    ping() {
        if (this.ws) {
            this.send('#Ping');
        }

        return this;
    }

    pong() {
        if (this.ws) {
            this.send('#Pong');
        }

        return this;
    }

    async push(type, payload) {
        if (this.mode == Websocket.asynchronous) {
            this.emit({
                name: 'Data',
                type: type,
                payload: payload,
            });
        }
        else {
            try {
                await this.lokker.lock();
                this.payloads.push(payload);

                if (this.trigger) {
                    this.trigger(this.payloads.shift());
                    this.trigger = null;
                }
            }
            finally {
                this.lokker.free();
            }
        }
    }

    send(data) {
        let type;
        let payload;

        if (ObjectType.verify(data) && StringType.verify(data.name)) {
            type = 'message';
            payload = toJson(data);
        }
        else if (StringType.verify(data)) {
            type = 'string';
            payload = data;
        }
        else {
            type = 'binary';
            payload = data;
        }

        if (this.ws.readyState == 1) {
            this.ws.send(toJson({
                type: type,
                payload: payload,
            }));
        }
        else {
            this.pending.push(payload);
        }

        return this;
    }
});
