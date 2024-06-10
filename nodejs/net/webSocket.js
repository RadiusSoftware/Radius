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
    constructor(socket, extensions, headData) {
        super();
        this.socket = socket;
        this.uuid = Crypto.generateUUID();
        console.log('\nwebsocket.js: set websocket default timeout...\n');
        this.socket.setTimeout(0);
        this.socket.setNoDelay();

        this.analyzeExtensions(extensions);
        mkWebSocketMessageParser(this, headData);
        this.frameBuilder = mkWebSocketFrameBuilder(this.extensions);
        this.socket.on('close', (...args) => this.onClose(...args));
        
        Process.sendController({
            name: 'WebsocketManagerSocketCreated',
            pid: Process.getPid(),
            uuid: this.uuid,
        });
    }
  
    analyzeExtensions(extensions) {
        this.extensions = {};

        const supported = mkStringSet(
            'permessage-deflate',
        );

        extensions.split(';').forEach(extension => {
            let [ left, right ] = extension.trim().split('=');

            if (supported.has(left)) {
                let rsv = Object.keys(this.extensions).length + 1;

                if (rsv >= 1 && rsv <= 3) {
                    this.extensions[left] = {
                        rsv: rsv,
                        name: left,
                        value: right,
                    };
                }
            }
        });

        return this;
    }

    async close() {
        if (this.socket) {
            for (let frame of await this.frameBuilder.buildFrames('', 0x8)) {
                this.socket.write(frame);
            }
        }

        return this;
    }

    destroy() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;

            Process.sendController({
                name: 'WebsocketManagerSocketDestroyed',
                uuid: this.uuid,
            });
        }

        return this;
    }

    getSecWebSocketExtensions() {
        return Object.values(this.extensions).map(ext => {
            if (ext.value === undefined) {
                return ext.name;
            }
            else {
                return `${ext.name}=${ext.value}`;
            }
        }).join('; ');
    }

    hasExtension(extensionName) {
        return extensionName in this.extensions;
    }

    hasExtensions() {
        return Object.keys(this.extensions).length > 0;
    }

    onClose(hasError) {
        this.destroy();
    }

    onError(error) {
        this.destroy();
    }

    onMessage(type, payload) {
        this.emit({
            name: 'DataReceived',
            type: type,
            payload: payload,
        });
    }

    async queryMessage(message) {
        if (this.socket) {
            let trap = mkTrap();
            trap.setExpected(trap, 1);
            message['#TRAP'] = trap.id;

            for (let frame of await this.frameBuilder.buildFrames(mkBuffer(toJson(message)), 0x1)) {
                this.socket.write(frame);
            }
            
            return trap.promise;
        }
    }

    async sendMessage(message) {
        if (this.socket) {

            for (let frame of await this.frameBuilder.buildFrames(mkBuffer(toJson(message)), 0x1)) {
                this.socket.write(frame);
            }
        }

        return this;
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
 * 
 * https://datatracker.ietf.org/doc/html/rfc7692#section-7.2.2
 * http://zsync.moria.org.uk/paper/ch03s02.html
*****/
registerIn('HttpServerWorker', '', class WebSocketMessageParser {
    constructor(webSocket, headData) {
        this.webSocket = webSocket;
        this.socket = webSocket.socket;
        this.socket.on('data', data => this.onData(data));
        this.socket.on('error', error => this.onError(error));

        this.payload = mkBuffer();
        this.fragmented = false;
        this.state = 'CheckHeader';
        this.buffered = Buffer.from(headData);

        this.analyzers = {
            CheckHeader: this.checkHeader,
            CheckExtended: this.checkExtended,
            CheckMask: this.checkMask,
            CheckPayload: this.checkPayload,
            OnFrame: this.onFrame,
        }
    }

    checkExtended() {
        if (this.payloadExtention == 'large') {
            if (this.buffered.length >= this.maskOffset) {
                this.payloadLength = this.buffered.readUInt32BE(2) << 32 | this.buffered.readUInt32BE(6);
                this.state = 'CheckMask';
            }
        }
        else if (this.payloadExtention == 'medium') {
            if (this.buffered.length >= this.maskOffset) {
                this.payloadLength = this.buffered.readUInt16BE(2);
                this.state = 'CheckMask';
            }
        }
        else {
            this.state = 'CheckMask';
        }
    }

    checkHeader() {
        if (this.buffered.length >= 4) {
            this.fin =  (this.buffered[0] & 0x80) === 0x80;
            this.rsv1 = (this.buffered[0] & 0x40) === 0x40;
            this.rsv2 = (this.buffered[0] & 0x20) === 0x20;
            this.rsv3 = (this.buffered[0] & 0x10) === 0x10;
            this.opcode = this.buffered[0] & 0x0f;

            this.masking = (this.buffered[1] & 0x08);
            this.payloadLength = this.buffered[1] & 0x7f;
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

            this.state = 'CheckExtended';
        }
    }

    checkMask() {
        if (this.buffered.length >= this.maskOffset + 4) {
            this.mask = [];

            for (let i = 0; i < 4; i++) {
                this.mask.push(this.buffered[i + this.maskOffset]);
            }

            this.state = 'CheckPayload';
        }
    }

    checkPayload() {
        if (this.buffered.length >= this.headerLength + this.payloadLength) {
            let subarray = this.buffered.subarray(this.headerLength);
            let demasked = Buffer.alloc(subarray.length);
    
            for (let i = 0; i < subarray.length; i++) {
                demasked[i] = subarray[i] ^ this.mask[i % 4];
            }

            this.payload = Buffer.concat([ this.payload, demasked ]);
            this.state = 'OnFrame';
        }
    }

    onData(buffer) {
        this.buffered = Buffer.concat([this.buffered, buffer]);

        while(this.state in this.analyzers) {
            let state = this.state;
            Reflect.apply(this.analyzers[this.state], this, []);

            if (this.state == state) {
                break;
            }
        }
    }

    async onError(error) {
        this.webSocket.onError(error);
    }

    onFrame() {
        let frameLength = this.headerLength + this.payloadLength;
        let frame = this.buffered.subarray(0, frameLength);
        this.buffered = this.buffered.subarray(frameLength);

        if (this.fragmented) {
            if (this.opcode == 0x0) {
                this.payloads.push(frame);
            }
            else {
                this.close();
            }

            if (this.fin) {
                this.onMessage();
            }
        }
        else {
            if (this.opcode == 0x1) {
                this.type = 'string';
            }
            else if (this.opcode == 0x2) {
                this.type = 'binary';
            }
            else if (this.opcode == 0x8) {
                this.type = 'close';
            }
            else if (this.opcode == 0x9) {
                this.type = '0x09';
            }
            else if (this.opcode == 0xa) {
                this.type = '0x0A';
            }
            else {
                this.type = 'unknown';
            }

            if (this.fin) {
                this.onMessage();
            }
            else {
                this.fragmented = true;
            }            
        }
    }

    onMessage() {
        let type = this.type;
        let payload = this.payload;
        this.reset();

        if ('permessage-deflate' in this.webSocket.extensions) {
            (async () => {
                let deflated = Buffer.concat([ payload, mkBuffer('0000ffff', 'hex') ]);
                let inflated = await Compression.uncompress('deflate-raw', deflated);
                this.webSocket.onMessage(type, inflated);
            })();
        }
        else {
            this.webSocket.onMessage(type, payload);
        }
    }

    reset() {
        delete this.fin;
        delete this.rsv1;
        delete this.rsv2;
        delete this.rsv3;
        delete this.mask;
        delete this.masking;
        delete this.maskOffset;
        delete this.fragmented;
        delete this.headerLength;
        delete this.payloadLength;
        delete this.payloadExtention;
        delete this.payloadExtention;

        this.payload = mkBuffer();
        this.fragmented = false;
        this.state = 'CheckHeader';
        this.buffered = mkBuffer();
    }
});


/*****
 * The frame builder object is responsible for implementing the framing protocol
 * for outgoing messages.  In websocket protocol, messages are sent and received
 * as a series of one or more frames, which have very specific instructions for
 * laying them out according to RFC 6455, https://www.rfc-editor.org/rfc/rfc6455.
 * This code implements that protocol by building one or more outgoing frames.
 * 
 * https://datatracker.ietf.org/doc/html/rfc7692#section-7.2.2
*****/
registerIn('HttpServerWorker', '', class WebSocketFrameBuilder {
    static maxPayLoadLength = 50000;

    constructor(extensions) {
        this.extensions = extensions;
    }

    buildFrame(payload, opcode, ctl) {
        let headerLength = 2;

        if (payload.length > 65536) {
            headerLength += 4;
            var frame = Buffer.alloc(headerLength + payload.length);
            frame[0] = ctl | opcode;
            frame[1] = 127;
            frame.writeUInt32BE((payload.length & 0xffff0000) >> 32, 2);
            frame.writeUInt32BE(payload.length & 0x0000ffff, 6);
        }
        else if (payload.length > 125) {
            headerLength += 2;
            var frame = Buffer.alloc(headerLength + payload.length);
            frame[0] = ctl | opcode;
            frame[1] = 126;
            frame.writeUInt16BE(payload.length, 2);
        }
        else {
            var frame = Buffer.alloc(headerLength + payload.length);
            frame[0] = ctl | opcode;
            frame[1] = payloadLength;
        }

        for (let i = 0; i < payload.length; i++) {
            frame[i + headerLength] = payload.readUInt8(i);
        }

        return frame;
    }

    async buildFrames(payload, opcode) {
        let frames = [];

        if (typeof payload == 'string') {
            payload = mkBuffer(payload);
        }

        if ('permessage-deflate' in this.extensions) {
            payload = (await Compression.compress('deflate-raw', payload));

            console.log(payload.toString('hex'));
            console.log();
            console.log(payload.toBitString());
            console.log();
            //let lastByte = payload.readUInt8(payload.length - 1);

            if (true) {//lastByte != 1) {
                payload = Buffer.concat([payload, mkBuffer('06', 'hex')]);
            }
            
            console.log(payload.toString('hex'));
            console.log();
        }

        while (payload.length) {
            if (payload.length <= WebSocketFrameBuilder.maxPayLoadLength) {
                frames.push(this.buildFrame(payload, opcode, 0x80));
                break;
            }
            else {
                let subarray = payload.subarray(0, WebSocketFrameBuilder.maxPayLoadLength);
                frames.push(this.buildFrame(subarray, opcode, 0x00));
                payload = payload.subarray(WebSocketFrameBuilder.maxPayLoadLength);
            }
        }

        return frames;
    }
});
