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
register('', class Websocket extends Emitter {
    constructor(url) {
        super();
        this.ws = null;
        this.pending = [];
        this.awaiting = {};

        if (window.location.protocol == 'https:') {
            this.url = `wss${window.location.origin.substring(5)}${url}`;
        }
        else if (window.location.protocol == 'http:') {
            this.url = `ws${window.location.origin.substring(4)}${url}`;
        }

        setInterval(() => {
            if (this.ws) {
                this.sendServerMessage({ name: '#Ping' });
            }
        }, 20000);
    }

    callServer(message) {
        let trap = mkTrap();
        trap.setExpected(1);
        message['#TRAP'] = trap.id;
        this.pending.push(toJson(message));
        this.awaiting[trap.id] = trap;
        this.sendPending();
        return trap.promise;
    }

    close() {
        if (this.ws && this.ws.readyState == 1) {
            this.ws.close();
        }
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = event => {
            this.emit({
                name: 'open',
                event: event,
                websocket: this,
            });

            this.sendPending();
        };

        this.ws.onerror = error => {
            this.emit({
                name: 'error',
                event: event,
                websocket: this,
            });

            this.ws = null;
        }

        this.ws.onclose = () => {
            this.emit({
                name: 'close',
                event: event,
                websocket: this,
            });

            this.ws = null;
        };

        this.ws.onmessage = event => this.onMessage(fromJson(event.data));
        return this;
    }

    onMessage(message) {
        if (message.name == '#Ping') {
            this.sendMessage({ name: '#Pong' });
        }
        else if ('#TRAP' in message) {
            let trapId = message['#TRAP'];
            let trap = this.awaiting[trapId];
            delete this.awaiting[trapId];
            trap.handleResponse(message['#RESPONSE']);
        }
        else {
            globalThis.emit(message);
        }
    }

    sendServerData(data) {
        this.pending.push(data);
        this.sendPending();
    }

    sendServerMessage(message) {
        this.pending.push(toJson(message));
        this.sendPending();
    }

    sendPending() {
        while (this.pending.length) {
            if (!this.ws) {
                this.connect();
                return;
            }
            else if (this.ws.readyState != 1) {
                return;
            }
            else {
                //this.ws.send(toJson({ name: 'RoadHouse', value: 'Peter Griffin' }));
                this.ws.send(this.pending.shift());
            }
        }
    }
});
