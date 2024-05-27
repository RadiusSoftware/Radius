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
*****/
singletonIn(Process.nodeClassController, '', class WebSockets extends Emitter {
    constructor() {
        super();
        this.sockets = {};
        mkHandlerProxy(Process, 'WebsocketManager', this);
    }

    async onSocketCall(message) {
    }

    async onSocketCreated(message) {
        //console.log('\n*** SOCKET CREATED!');
        //console.log(message);
    }

    async onSocketDestroyed(message) {
        //console.log('\n*** SOCKET DESTROYED!');
        //console.log(message);
    }

    async onSocketSend(message) {
    }
});


/*****
 * The websocket object for the server.  Websockets are single-use and discarded
 * after they have been closed.  The WebSocket class is primarily an initializer
 * and a container for the frame builder and frame parser.  The frame build is
 * there to generate the frames for outgoing messages, while the frame parse
 * waits for incoming data from the socket and then parses frames as data arrives.
 * When the frame parse finishes a frame, the onFrame() method is called to enable
 * the WebSocket instances to assemble frames, and then to emit a notification
 * when a complete message has been received.
*****/
registerIn('HttpServerWorker', '', class WebSocket extends Emitter {
    /*
    static nextSocketNumber = 1;
    static webSockets = {};

    static onNotify = (() => {
        let handler = message => {
            let webSocket = WebSocket.webSockets[message.socketId];

            if (webSocket) {
                webSocket.sendMessage(message);
            }
        };

        Ipc.on('#NotifyClient', message => handler(message));
        return handler;
    })();
    */

    constructor(socket, extensions, headData) {
        super();
        this.socket = socket;
        this.uuid = Crypto.generateUUID();
        console.log('set websocket default timeout...');
        this.socket.setTimeout(0);
        this.socket.setNoDelay();
        this.analyzeExtensions(extensions);
        this.frameParser = mkFrameParser(this, headData);
        this.frameBuilder = mkFrameBuilder(this.extensions);
        this.type = '';
        this.payload = [];
        this.state = 'Ready';
        this.socket.on('close', (...args) => this.onClose(...args));

        Process.sendController({
            name: 'WebsocketManagerSocketCreated',
            pid: Process.getPid(),
            uuid: this.uuid,
        });
    }
  
    analyzeExtensions(extensions) {
        this.extensions = [];

        const supported = mkStringSet(
            //'permessage-deflate',
        );

        extensions.split(';').forEach(extension => {
            let [ left, right ] = extension.trim().split('=');

            if (supported.has(left)) {
                let rsv = this.extensions.length + 1;

                if (rsv >=1 && rsv <= 3) {
                    this.extensions.push({
                        rsv: rsv,
                        name: left,
                        value: right,
                    });
                }
            }
        });
    }

    close() {
        this.state = 'Closing';

        if (this.socket) {
            let frames = this.frameBuilder.build('', 0x8);
            frames.forEach(frame => this.socket.write(frame));
        }
    }

    destroy() {
        if (this.socket) {
            this.state = 'Closed';
            this.socket.destroy();
            this.socket = null;

            Process.sendController({
                name: 'WebsocketManagerSocketCreated',
                uuid: this.uuid,
            });
        }
    }

    onClose(hasError) {
        this.destroy();
    }

    onError(error) {
        this.destroy();
    }

    onFrame(frame) {
        if (this.state == 'Ready') {
            if (frame.opcode == 0x1) {
                this.type = 'string';
            }
            else if (frame.opcode == 0x2) {
                this.type = 'binary';
            }
            else if (frame.opcode == 0x8) {
                if (this.state == 'Ready') {
                    this.close();
                }

                this.destroy();
                return;
            }
            else if (frame.opcode == 0x9) {
                return;
            }
            else if (frame.opcode == 0xa) {
                return;
            }
            else {
                this.close();
                return;
            }

            if (frame.fin) {
                this.onMessage(frame.payload());
                this.reset();
            }
            else {
                this.state = 'Fragmented';
                this.payload.push(frame.payload());
            }
        }
        else if (this.state == 'Fragmented') {
            if (frame.opcode == 0x0) {
                this.payload.push(frame.payload());
            }
            else {
                this.close();
            }

            if (frame.fin) {
                this.onMessage(Buffer.concat(this.payload));
                this.reset();
            }
        }
    }
  
    async onMessage(payload) {
        this.emit({
            name: 'MessageReceived',
            type: this.type,
            payload: payload,
        });
    }

    queryMessage(message) {
        if (this.socket) {
            let trap = mkTrap();
            trap.setExpected(trap, 1);
            message['#TRAP'] = trap.id;
            let frames = this.frameBuilder.build(toJson(message), 0x1);
            frames.forEach(frame => this.socket.write(frame));
            return trap.promise;
        }
    }

    reset() {
        this.type = '';
        this.payload = [];
        this.state = 'Ready';
    }

    secWebSocketExtensions() {
        return this.extensions.map(ext => {
            if (ext.value === undefined) {
                return ext.name;
            }
            else {
                return `${ext.name}=${ext.value}`;
            }
        }).join('; ');
    }

    sendMessage(message) {
        if (this.socket) {
            let frames = this.frameBuilder.build(toJson(message), 0x1);
            frames.forEach(frame => this.socket.write(frame));
        }
    }
});


/*****
 * The frame builder object is responsible for implementing the framing protocol
 * for outgoing messages.  In websocket protocol, messages are sent and received
 * as a series of one or more frames, which have very specific instructions for
 * laying them out according to RFC 6455, https://www.rfc-editor.org/rfc/rfc6455.
 * This code implements that protocol by building one or more outgoing frames.
*****/
registerIn('HttpServerWorker', '', class FrameBuilder {
    static maxPayLoadLength = 50000;

    constructor(extensions) {
        this.extensions = extensions;
    }

    build(payload, opcode) {
        let frames = [];
        this.payload = payload;
        this.messageOpcode = opcode;
        this.frameOpcode = this.messageOpcode;

        while (this.payload.length) {
            if (this.payload.length <= FrameBuilder.maxPayLoadLength) {
                frames.push(this.buildFrame(this.payload.length, 0x80));
                this.payload = '';
            }
            else {
                let slice = payload.slice(0, FrameBuilder.maxPayLoadLength);
                frames.push(this.buildFrame(slice.length, 0x00));
                this.payload = this.payload.slice(FrameBuilder.maxPayLoadLength)
            }

            this.frameOpcode = 0;
        }

        return frames;
    }

    buildFrame(payloadLength, ctl) {
        let headerLength = 2;

        if (payloadLength > 65536) {
            headerLength += 4;
            var frame = Buffer.alloc(headerLength + payloadLength);
            frame[0] = ctl | this.frameOpcode;
            frame[1] = 127;
            frame.writeUInt32BE((payloadLength & 0xffff0000) >> 32, 2);
            frame.writeUInt32BE(payloadLength & 0x0000ffff, 6);
        }
        else if (payloadLength > 125) {
            headerLength += 2;
            var frame = Buffer.alloc(headerLength + payloadLength);
            frame[0] = ctl | this.frameOpcode;
            frame[1] = 126;
            frame.writeUInt16BE(payloadLength, 2);
        }
        else {
            var frame = Buffer.alloc(headerLength + payloadLength);
            frame[0] = ctl | this.frameOpcode;
            frame[1] = payloadLength;
        }

        for (let i = 0; i < payloadLength; i++) {
            frame[i + headerLength] = this.payload.charCodeAt(i);
        }

        return frame;
    }
});


/*****
 * The frame parse awaits incoming data. over the system socket and parses that
 * incoming data to form websocket protocol frames, which are then passed off to
 * the WebSocket instance.  The sneaky part of this algorithm is that we don't
 * want to assume that frames arrive intact.  Frames may appear in bits and pieces
 * with extra bits and pieces at either the front or back end.  When there're
 * extra bytes, we assume those bytes belong to the next incoming frame.  Hence,
 * this protocol will recognize the frame regardless of the chunk size of the
 * incoming data.
*****/
registerIn('HttpServerWorker', '', class FrameParser {
    constructor(webSocket, headData) {
        this.webSocket = webSocket;
        this.socket = webSocket.socket;
        this.socket.on('data', data => this.onData(data));
        this.socket.on('error', error => this.onError(error));
        this.state = 'GetInfo';
        this.rawFrame = Buffer.from(headData);

        this.analyzers = {
            GetInfo: this.getInfo,
            GetExtended: this.getExtended,
            GetMask: this.getMask,
            GetPayload: this.getPayload,
            HaveFrame: this.onFrame,
        }
    }

    getExtended() {
        if (this.payloadExtention == 'large') {
            if (this.rawFrame.length >= this.maskOffset) {
                this.payloadLength = this.rawFrame.readUInt32BE(2) << 32 | this.rawFrame.readUInt32BE(6);
                this.state = 'GetMask';
            }
        }
        else if (this.payloadExtention == 'medium') {
            if (this.rawFrame.length >= this.maskOffset) {
                this.payloadLength = this.rawFrame.readUInt16BE(2);
                this.state = 'GetMask';
            }
        }
        else {
            this.state = 'GetMask';
        }
    }

    getInfo() {
        if (this.rawFrame.length >= 4) {
            this.fin =  (this.rawFrame[0] & 0x80) === 0x80;
            this.rsv1 = (this.rawFrame[0] & 0x40) === 0x40;
            this.rsv2 = (this.rawFrame[0] & 0x20) === 0x20;
            this.rsv3 = (this.rawFrame[0] & 0x10) === 0x10;
            this.opcode = this.rawFrame[0] & 0x0f;

            this.masking = (this.rawFrame[1] & 0x08);
            this.payloadLength = this.rawFrame[1] & 0x7f;
            this.payloadExtention = 'none';

            if (this.payloadLength == 126) {
                this.maskOffset = 4;
                this.headerLength = 8;
                this.payloadExtention = 'medium';
            }
            else if (this.payloadLength == 127) {
                this.maskOffset = 10;
                this.headerLength = 14;
                this.payloadExtention = 'large';
            }
            else {
                this.maskOffset = 2;
                this.headerLength = 6;
            }

            this.state = 'GetExtended';
        }
    }

    getMask() {
        if (this.rawFrame.length >= this.maskOffset + 4) {
            this.mask = [];

            for (let i = 0; i < 4; i++) {
                this.mask.push(this.rawFrame[i + this.maskOffset]);
            }

            this.state = 'GetPayload';
        }
    }

    getPayload() {
        if (this.rawFrame.length >= this.headerLength + this.payloadLength) {
            this.state = 'HaveFrame';
        }
    }

    onData(buffer) {
        this.rawFrame = Buffer.concat([this.rawFrame, buffer]);

        while(this.state in this.analyzers) {
            let state = this.state;
            Reflect.apply(this.analyzers[this.state], this, []);

            if (this.state == state) {
                break;
            }
        }
    }

    onError(error) {
        this.webSocket.onError(error);
    }

    onFrame() {
        let frameLength = this.headerLength + this.payloadLength;
        let nextFrame = Buffer.from(this.rawFrame.slice(frameLength));
        this.rawFrame = this.rawFrame.slice(0, frameLength);
        this.webSocket.onFrame(this);

        this.state = 'GetInfo';
        this.rawFrame = nextFrame;
        delete this.fin;
        delete this.rsv1;
        delete this.rsv2;
        delete this.rsv3;
        delete this.masking;
        delete this.payloadLength;
        delete this.payloadExtention;
        delete this.maskOffset;
        delete this.headerLength;
        delete this.payloadExtention;
        delete this.mask;
    }

    payload() {
        let slice = this.rawFrame.slice(this.headerLength);
        let decoded = Buffer.alloc(slice.length);

        for (let i = 0; i < slice.length; i++) {
            decoded[i] = slice[i] ^ this.mask[i % 4];
        }

        return decoded;
    }
});
