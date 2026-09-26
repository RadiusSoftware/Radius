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
    constructor(path) {
        super();
        this.ws = null;
        this.pending = {};
        this.lokker = mkLokker();

        if (window.location.protocol == 'https:') {
            this.url = `wss${window.location.origin.substring(5)}${path}`;
        }
        else if (window.location.protocol == 'http:') {
            this.url = `ws${window.location.origin.substring(4)}${path}`;
        }
    }

    async call(message) {
        if (ObjectType.verify(data) && StringType.verify(data.name)) {
            await this.lokker.lock();
            let trap = mkTrap();
            trap.setExpected(1);
            message['#TRAP'] = trap.id;
            this.ws.send(toJson(message));
            this.pending[trap.id] = trap;
            await this.lokker.free();
            return trap.promise;
        }
    }

    async close(code, reason) {
        if (this.ws && this.ws.readyState == 1) {
            await this.lokker.lock();
            this.ws.close(code, reason);
            await this.lokker.free();
        }

        return this;
    }

    connect() {
        if (!this.ws) {
            this.ws = new WebSocket(this.url);
            this.interval = setInterval(() => this.ping(), 30000);

            this.ws.onopen = async event => {
                this.send({
                    name: '##WEBSOCKET_OPEN##',
                });
            };

            this.ws.onerror = error => {
                this.onError(error);
            }

            this.ws.onclose = () => {
                this.onClose();
            };

            this.ws.onmessage = event => {
                this.onMessage(event);
            }
        }

        return this;
    }

    onClose() {
        // *************************************************************************
        // *************************************************************************
        /*
        if (this.ws && this.ws.readyState == 1) {
            this.ws.close(code, reason);
            this.ws = null;
            this.interval ? clearInterval(this.interval) : null;
            delete this.interval;
        }
        */
    }

    onError(error) {
        // *************************************************************************
        // *************************************************************************
    }

    async onMessage(event) {
        await this.lokker.lock();
        const isString = event.data == 'string';

        if (isString) {
            if (event.data == '#Ping') {
                this.pong();
            }
            else if (event.data != '#Pong') {
                try {
                    let message = fromJson(event.data);

                    if ('#TRAP' in message) {
                        // ****************************************************************
                        // ****************************************************************
                        /*
                        let trapId = message['#TRAP'];
                        let trap = this.awaiting[trapId];
                        delete this.awaiting[trapId];
                        trap.handleResponse(message['#RESPONSE']);
                        */
                    }
                    else if (message instanceof Buffer) {
                        await wait(this.emit({
                            name: 'WebsocketData',
                            type: 'binary',
                            payload: message,
                        }));
                    }
                    else {
                        await wait(this.emit({
                            name: 'WebsocketData',
                            type: 'message',
                            message: message,
                        }));
                    }

                    this.lokker.free();
                }
                catch (e) {}
            }
        }
        
        await wait(this.emit({
            name: 'WebsocketData',
            type: isString ? 'string' : 'binary',
            payload: event.data,
        }));

        this.lokker.free();
    }

    async ping() {
        if (this.ws) {
            this.sendData('#Ping');
        }
    }

    async pong() {
        if (this.ws) {
            this.sendData('#Pong');
        }
    }

    async send(data) {
        await this.lokker.lock();
        let payload;

        if (ObjectType.verify(data) && StringType.verify(data.name)) {
            payload = toJson(data);
        }
        else {
            payload = data;
        }

        this.ws.send(payload);

        while (this.ws.bufferAmount > 0) {
            await pause(20);
        }

        await this.lokker.free();
        return this;
    }
});
