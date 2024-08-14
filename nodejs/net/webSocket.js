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
const LibZlib = require('zlib');


/*****
 * The websocket object for the server.  Websockets are single-use and discarded
 * after they have been closed.  The WebSocket class is primarily an initializer
 * and a container for the frame builder and frame parser.  The frame build is
 * there to generate the frames for outgoing messages, while the frame parse
 * waits for incoming data from the socket and then parses frames as data arrives.
 * When the frame parse finishes a frame, the onFrame() method is called to enable
 * the WebSocket instances to assemble frames, and then to emit a notification
 * when a complete message has been received.
 * 
 * https://en.wikipedia.org/wiki/WebSocket#Frame-based_message
 * https://datatracker.ietf.org/doc/html/rfc7692#page-10
 * https://datatracker.ietf.org/doc/html/rfc7692#section-7.2.2
 * https://www.ietf.org/rfc/rfc1951.txt
 * https://thuc.space/posts/deflate/
 * https://github.com/libyal/assorted/blob/main/documentation/Deflate%20(zlib)%20compressed%20data%20format.asciidoc#
*****/
registerIn('HttpServerWorker', '', class WebSocket extends Emitter {
    static supportedExtensions = {
        'permessage-deflate': () => mkPerMessageDeflator,
    };

    constructor(socket, extensions, headData) {
        super();
        this.socket = socket;
        this.uuid = Crypto.generateUUID();
        this.socket.setTimeout(0);
        this.socket.setNoDelay();

        this.analyzeExtensions(extensions);
        mkWebSocketMessageParser(this, headData);
        this.frameBuilder = mkWebSocketFrameBuilder(this);
        
        Process.sendController({
            name: 'ResourcesTrace',
            category: 'websocket',
            eventName: 'Register',
            resourceUUID: this.uuid,
        });

        Process.on('ContactMonitorable', message => {
            console.log(message);
        });

        Process.on('TraceMonitorable', message => {
            console.log(message);
        });
    }
  
    analyzeExtensions(extensionsHeader) {
        this.extensions = {};

        extensionsHeader.split(',').forEach(extensionSpecification => {
            let extension = null;
            let parameters = {};
            let parts = extensionSpecification.split(';');
            let name = parts[0].trim();

            for (let i = 1; i < parts.length; i++) {
                let part = parts[i].trim();

                if (part.indexOf('=') > 0) {
                    let [ left, right ] = part.split('=');
                    parameters[left.trim()] = right.trim();
                }
                else {
                    parameters[part] = null;
                }
            }

            let settings;
            let supportedExtension = WebSocket.supportedExtensions[name];

            if (supportedExtension) {
                if (!(name in this.extensions)) {
                    let rsv = Object.keys(this.extensions).length + 1;

                    settings =  {
                        rsv: rsv,
                        name: name,
                        parameters: parameters,
                    };

                    extension = supportedExtension()(settings);
                }
            }

            extension ? this.extensions[settings.name] = extension : null;
        });

        return this;
    }

    async close(code, reason) {
        if (this.socket) {
            code = code ? code : 1000;
            reason = reason ? reason : 'none';
            let buffer = Buffer.concat([ mkBuffer('0000', 'hex'), mkBuffer(reason) ]);
            buffer.writeUint16BE(code, 0);

            for (let frame of await this.frameBuilder.buildFrames(buffer, 'close')) {
                this.socket.write(frame);
            }

            this.onClose(buffer);
        }

        return this;
    }

    getSecWebSocketExtensions() {
        return Object.values(this.extensions).map(extension => {
            let specification = [ extension.settings.name ];

            for (let parameterName in extension.settings.parameters) {
                let parameterValue = extension.settings.parameters[parameterName];

                if (parameterValue != null) {
                    specification.push(`${parameterName}=${parameterValue}`);
                }
            }

            return specification.join('; ');
        }).join(', ');
    }

    hasExtension(extensionName) {
        return extensionName in this.extensions;
    }

    hasExtensions() {
        return Object.keys(this.extensions).length > 0;
    }

    onClose(payload) {
        let code = -1;
        let reason = '';

        if (payload.length >= 2) {
            code = payload.readUInt16BE(0);
        }

        if (payload.length > 2) {
            reason = payload.subarray(2).toString();
        }

        Process.sendController({
            name: 'ResourcesTrace',
            category: 'websocket',
            eventName: 'Deregister',
            resourceUUID: this.uuid,
            code: code,
            reason: reason,
        });

        this.socket.destroy();
        this.socket = null;
    }

    onMessage(type, payload) {
        if (type == 'close') {
            this.onClose(payload);
        }
        else if (type == 'string' && payload.toString() == '#Ping') {
            this.pong();
        }
        else if (type == 'string' && payload.toString() != '#Pong') {
            this.emit({
                name: 'DataReceived',
                type: type,
                payload: payload,
            });
        }
        else if (type == 'binary') {
            this.emit({
                name: 'DataReceived',
                type: type,
                payload: payload,
            });
        }
    }

    ping(message) {
        this.sendData('#Ping');
    }

    pong(message) {
        this.sendData('#Pong');
    }

    async queryMessage(message) {
        if (this.socket) {
            let trap = mkTrap();
            trap.setExpected(trap, 1);
            message['#TRAP'] = trap.id;

            for (let frame of await this.frameBuilder.buildFrames(mkBuffer(toJson(message)), 'text')) {
                this.socket.write(frame);
            }
            
            return trap.promise;
        }
    }

    async sendData(data) {
        if (this.socket) {
            if (data instanceof Buffer) {
                for (let frame of await this.frameBuilder.buildFrames(data, 'text')) {
                    this.socket.write(frame);
                }
            }
            else {
                for (let frame of await this.frameBuilder.buildFrames(mkBuffer(data), 'text')) {
                    this.socket.write(frame);
                }
            }
        }
    }

    async sendMessage(message) {
        if (this.socket) {
            for (let frame of await this.frameBuilder.buildFrames(mkBuffer(toJson(message)), 'text')) {
                this.socket.write(frame);
            }
        }

        return this;
    }
});


/*****
 * The frame builder object is responsible for implementing the framing protocol
 * for outgoing messages.  In websocket protocol, messages are sent and received
 * as a series of one or more frames, which have very specific instructions for
 * laying them out according to RFC 6455, https://www.rfc-editor.org/rfc/rfc6455.
 * This code implements that protocol by building one or more outgoing frames.
 * 
 * https://en.wikipedia.org/wiki/WebSocket#Frame-based_message
 * https://datatracker.ietf.org/doc/html/rfc7692#page-10
 * https://datatracker.ietf.org/doc/html/rfc7692#section-7.2.2
 * https://www.ietf.org/rfc/rfc1951.txt
 * https://thuc.space/posts/deflate/
 * https://github.com/libyal/assorted/blob/main/documentation/Deflate%20(zlib)%20compressed%20data%20format.asciidoc#
 * 
*****/
registerIn('HttpServerWorker', '', class WebSocketFrameBuilder {
    static maxPayLoadLength = 50000;

    constructor(webSocket) {
        this.webSocket = webSocket;
        this.extensions = webSocket.extensions;
    }

    buildFrame(payload, opcode, fin) {
        let headerLength = 2;
        let finBit = fin ? 0x80 : 0x00;

        if (payload.length > 65536) {
            headerLength += 4;
            var frame = Buffer.alloc(headerLength + payload.length);
            frame[0] = finBit | opcode;
            frame[1] = 127;
            frame.writeUInt32BE((payload.length & 0xffff0000) >> 32, 2);
            frame.writeUInt32BE(payload.length & 0x0000ffff, 6);
        }
        else if (payload.length > 125) {
            headerLength += 2;
            var frame = Buffer.alloc(headerLength + payload.length);
            frame[0] = finBit | opcode;
            frame[1] = 126;
            frame.writeUInt16BE(payload.length, 2);
        }
        else {
            var frame = Buffer.alloc(headerLength + payload.length);
            frame[0] = finBit | opcode;
            frame[1] = payload.length;
        }

        for (let extension of Object.values(this.extensions)) {
            switch (extension.settings.rsv) {
                case 1:
                    frame[0] = frame[0] | 0x40;
                    break;

                case 2:
                    frame[0] = frame[0] | 0x20;
                    break;

                case 3:
                    frame[0] = frame[0] | 0x10;
                    break;
            }
        }

        for (let i = 0; i < payload.length; i++) {
            frame[i + headerLength] = payload.readUInt8(i);
        }
        
        return frame;
    }

    async buildFrames(payload, opcodeName) {
        let frames = [];
        let opcode = WebSocketFrameBuilder.convertOpcodeName(opcodeName);

        if (typeof payload == 'string') {
            payload = mkBuffer(payload);
        }

        for (let extension of Object.values(this.webSocket.extensions)) {
            payload = await extension.processOutgoing(payload);
        }

        while (payload.length) {
            if (payload.length <= WebSocketFrameBuilder.maxPayLoadLength) {
                frames.push(this.buildFrame(payload, opcode, true));
                break;
            }
            else {
                let subarray = payload.subarray(0, WebSocketFrameBuilder.maxPayLoadLength);
                frames.push(this.buildFrame(subarray, opcode, false));
                payload = payload.subarray(WebSocketFrameBuilder.maxPayLoadLength);
            }

            opcode = 0;
        }

        return frames;
    }

    static convertOpcodeName(name) {
        const opcodes = {
            'text': 1,
            'binary': 2,
            'close': 8,
            'ping': 9,
            'pong': 10,
        };

        return opcodes[name];
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
 * https://en.wikipedia.org/wiki/WebSocket#Frame-based_message
 * https://datatracker.ietf.org/doc/html/rfc7692#page-10
 * https://datatracker.ietf.org/doc/html/rfc7692#section-7.2.2
 * https://www.ietf.org/rfc/rfc1951.txt
 * https://thuc.space/posts/deflate/
 * https://github.com/libyal/assorted/blob/main/documentation/Deflate%20(zlib)%20compressed%20data%20format.asciidoc#
 * 
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
        if (this.payloadExtension == 'large') {
            if (this.buffered.length >= this.maskOffset) {
                this.payloadLength = this.buffered.readUInt32BE(2) << 32 | this.buffered.readUInt32BE(6);
                this.state = 'CheckMask';
            }
        }
        else if (this.payloadExtension == 'medium') {
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
            this.payloadExtension = 'none';

            if (this.payloadLength == 126) {
                this.maskOffset = 4;
                this.headerLength = 8;
                this.payloadExtension = 'medium';
            }
            else if (this.payloadLength == 127) {
                this.maskOffset = 10;
                this.headerLength = 14;
                this.payloadExtension = 'large';
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

        while(this.buffered.length > 0 && this.state in this.analyzers) {
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
                this.type = 'unsupported';
            }

            if (this.fin) {
                this.onMessage();
            }
            else {
                this.fragmented = true;
            }            
        }
    }

    async onMessage() {
        let type = this.type;
        let payload = this.payload;

        for (let i = 0; i < Object.values(this.webSocket.extensions).length; i++) {
            if (this[`rsv${i + 1}`]) {
                let extension = Object.values(this.webSocket.extensions)[i];
                payload = await extension.processIncoming(payload);
            }
        }

        this.reset();
        this.webSocket.onMessage(type, payload);
    }

    reset() {
        delete this.fin;
        delete this.rsv1;
        delete this.rsv2;
        delete this.rsv3;
        delete this.type;
        delete this.mask;
        delete this.masking;
        delete this.maskOffset;
        delete this.fragmented;
        delete this.headerLength;
        delete this.payloadLength;
        delete this.payloadExtension;

        this.payload = mkBuffer();
        this.fragmented = false;
        this.state = 'CheckHeader';
        this.buffered = mkBuffer();
    }
});


/*****
 * This is the most important and most commonly used extension for a websocket
 * permessage-deflate.  This should always be used to help improve application
 * performance.  The key to making this work is to create a persistent raw
 * deflator and raw inflator object.  The need to be persistent so they can
 * maintain their LZ77 sliding window with
 * 
 * Additionally, this extension demonstrates how a websocket extension plugs
 * into the overall application framework.  There's a constructor, which must
 * run synchronously.  Moreover, the extension object must have two async
 * methods: processesIncoming and processOutgoing.  Each of these methods
 * performs the extension's algorithm based on the settings provided to the
 * constructor.
*****/
registerIn('HttpServerWorker', '', class PerMessageDeflator {
    constructor(settings) {
        this.settings = settings;
        this.deflatorDone = null;
        this.inflatorDone = null;

        this.deflator = LibZlib.createDeflateRaw({ flush: 2 });
        this.inflator = LibZlib.createInflateRaw();

        this.deflator.on('data', deflated => {
            let deflatorDone = this.deflatorDone;
            this.deflatorDone = null;
            deflatorDone(deflated.subarray(0, deflated.length - 4));
        });

        this.inflator.on('data', inflated => {
            let inflatorDone = this.inflatorDone;
            this.inflatorDone = null;
            inflatorDone(inflated);
        });
    }

    getParameter(name) {
        return this.settings.parameters[name];
    }

    hasParameter(name) {
        return name in this.settings.parameters;
    }

    async processIncoming(deflated) {
        return new Promise((ok, fail) => {
            this.inflatorDone = ok;
            deflated = Buffer.concat([ deflated, mkBuffer('0000ffff', 'hex') ]);
            this.inflator.write(deflated);
        });
    }

    async processOutgoing(inflated) {
        return new Promise((ok, fail) => {
            this.deflatorDone = ok;
            this.deflator.write(inflated);
        });
    }
});
