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
 * The websocket object for the server.  Websockets are single-use and discarded
 * after they have been closed.  The Websocket class is primarily an initializer
 * and a container for the frame builder and frame parser.  The frame build is
 * there to generate the frames for outgoing messages, while the frame parse
 * waits for incoming data from the socket and then parses frames as data arrives.
 * When the frame parse finishes a frame, the onFrame() method is called to enable
 * the Websocket instances to assemble frames, and then to emit a notification
 * when a complete message has been received.
 * 
 * https://en.wikipedia.org/wiki/WebSocket#Frame-based_message
 * https://datatracker.ietf.org/doc/html/rfc7692#page-10
 * https://datatracker.ietf.org/doc/html/rfc7692#section-7.2.2
 * https://www.ietf.org/rfc/rfc1951.txt
 * https://thuc.space/posts/deflate/
 * https://github.com/libyal/assorted/blob/main/documentation/Deflate%20(zlib)%20compressed%20data%20format.asciidoc#
*****/
define(class Websocket extends Emitter {
    static supportedExtensions = {
        'permessage-deflate': () => mkPerMessageDeflator,
    };

    constructor(socket, extensions, headData) {
        super();
        this.socket = socket;
        this.socket.setTimeout(2*60*1000);
        this.socket.setNoDelay();
        this.lokker = mkLokker();

        this.socket.on('timeout', () => {
            this.onClose();
        });

        this.analyzeExtensions(extensions);
        mkWebsocketMessageParser(this, headData);
        this.frameBuilder = mkWebsocketFrameBuilder(this);
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
            let supportedExtension = Websocket.supportedExtensions[name];

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

    async call(message) {
        if (this.socket) {
            let trap = mkTrap();
            trap.setExpected(1);
            message['#TRAP'] = trap.id;
            message['#CALL'] = true;

            for (let frame of await this.frameBuilder.buildFrames(mkBuffer(toJson(message)), 'text')) {
                this.socket.write(frame);
            }
            
            return trap.promise;
        }
    }

    async close(code, reason) {
        if (this.socket) {
            code = code ? code : 1000;
            reason = reason ? reason : 'unavailable';
            let buffer = Buffer.concat([ mkBuffer('0000', 'hex'), mkBuffer(reason) ]);
            buffer.writeUint16BE(code, 0);

            for (let frame of await this.frameBuilder.buildFrames(buffer, 'close')) {
                this.socket.write(frame);
            }

            this.onClose(buffer);
        }

        return this;
    }

    getSecWebsocketExtensions() {
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

        if (payload) {
            if (payload.length >= 2) {
                code = payload.readUInt16BE(0);
            }

            if (payload.length > 2) {
                reason = payload.subarray(2).toString();
            }
        }

        this.socket.destroy();
        this.socket = null;
        this.emit({ name: 'SocketClosed' });
    }

    onMessage(type, payload) {
        if (type == 'close') {
            this.onClose(payload);
        }
        else if (type == 'string' && payload.toString() == '#Ping') {
            this.pong();
        }
        else if (type == 'string' && payload.toString() != '#Pong') {
            let message;

            try {
                let payloadMessage = fromJson(payload.toString());
                
                if (payloadMessage.type == 'message') {
                    message = fromJson(payloadMessage.payload);
                }
            }
            catch (e) {}

            if (message && message.name == '##RESPONSE##') {
                Trap.handleResponse(message['#TRAP'], message.response);
            }
            else {
                this.emit({
                    name: 'DataReceived',
                    type: type,
                    payload: payload,
                });
            }
        }
        else if (type == 'binary') {
            this.emit({
                name: 'DataReceived',
                type: type,
                payload: payload,
            });
        }
    }

    ping() {
        this.send('#Ping');
    }

    pong() {
        this.send('#Pong');
    }

    async send(payload) {
        if (this.socket) {
            await this.lokker.lock();

            if (ObjectType.verify(payload) && StringType.verify(payload.name)) {
                for (let frame of await this.frameBuilder.buildFrames(mkBuffer(toJson(payload)), 'text')) {
                    this.socket.write(frame);
                }
            }
            else {
                if (payload instanceof Buffer) {
                    for (let frame of await this.frameBuilder.buildFrames(payload, 'text')) {
                        this.socket.write(frame);
                    }
                }
                else {
                    for (let frame of await this.frameBuilder.buildFrames(mkBuffer(payload), 'text')) {
                        this.socket.write(frame);
                    }
                }
            }

            this.lokker.free();
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
define(class WebsocketFrameBuilder {
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
        let opcode = WebsocketFrameBuilder.convertOpcodeName(opcodeName);

        if (typeof payload == 'string') {
            payload = mkBuffer(payload);
        }

        for (let extension of Object.values(this.webSocket.extensions)) {
            payload = await extension.processOutgoing(payload);
        }

        while (payload.length) {
            if (payload.length <= WebsocketFrameBuilder.maxPayLoadLength) {
                frames.push(this.buildFrame(payload, opcode, true));
                break;
            }
            else {
                let subarray = payload.subarray(0, WebsocketFrameBuilder.maxPayLoadLength);
                frames.push(this.buildFrame(subarray, opcode, false));
                payload = payload.subarray(WebsocketFrameBuilder.maxPayLoadLength);
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
 * the Websocket instance.  The sneaky part of this algorithm is that we don't
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
define(class WebsocketMessageParser {
    constructor(webSocket, headData) {
        this.webSocket = webSocket;
        this.socket = webSocket.socket;
        this.socket.on('data', data => this.onData(data));
        this.socket.on('error', error => this.onError(error));
        this.buffered = mkBuffer(headData);
        this.backlog = [];
        this.lokker = mkLokker();
        this.reset();

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
            let subarray = this.buffered.subarray(this.headerLength, this.headerLength + this.payloadLength);
            let demasked = Buffer.alloc(subarray.length);
    
            for (let i = 0; i < subarray.length; i++) {
                demasked[i] = subarray[i] ^ this.mask[i % 4];
            }

            this.payload = Buffer.concat([ this.payload, demasked ]);
            this.state = 'OnFrame';
        }
    }

    async onData(buffer) {
        this.backlog.push(buffer);

        if (this.lokker.isFree()) {
            await this.lokker.lock();

            while (this.backlog.length) {
                this.buffered = Buffer.concat([this.buffered, this.backlog.shift()]);

                while(this.buffered.length > 0 && this.state in this.analyzers) {
                    let state = this.state;
                    await wait(Reflect.apply(this.analyzers[this.state], this, []));

                    if (this.state == state) {
                        break;
                    }
                }
            }

            this.lokker.free();
        }
    }

    async onError(error) {
        this.webSocket.onError(error);
    }

    async onFrame() {
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
                await this.onMessage();
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
define(class PerMessageDeflator {
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


/*****
 * The WebsocketService and WebsocketHandle jointly provide a managed service
 * for individually enabling a websocket and securely facilitating interprocess
 * communications with that socket.  The WebsockeHandle functions a sort of
 * proxy for a Websocket that's actually in one of the worker processes, which
 * can be either the same or a different worker process than the code that's
 * currently using the handle.
*****/
createService(class WebsocketService extends Service {
    constructor() {
        super();
        this.byPath = {};
        this.byUUID = {};

        Process.on('##WEBSOCKET_SERVICE_CONSUMER_CLOSED##', message => {
            try {
                if (message.uuid in this.byUUID) {
                    let websocketThunk = this.byUUID[message.uuid];
                    delete this.byUUID[websocketThunk.uuid];
                    delete this.byPath[websocketThunk.path];

                    Process.sendWorker(
                        websocketThunk.consumerId,
                        {
                            name: '##WEBSOCKET_CONSUMER_CLOSED##',
                            uuid: message.uuid,
                        }
                    );
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_SERVICE_CONSUMER_DATA##', message => {
            try {
                if (message.uuid in this.byUUID) {
                    let websocketThunk = this.byUUID[message.uuid];

                    Process.sendWorker(
                        websocketThunk.consumerId,
                        {
                            name: '##WEBSOCKET_CONSUMER_DATA##',
                            uuid: message.uuid,
                            payload: message.payload,
                        }
                    );
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_SERVER_CONSUMER_RESPONSE##', message => {
            try {
                if (message.uuid in this.byUUID) {
                    let websocketThunk = this.byUUID[message.uuid];

                    Process.sendWorker(
                        websocketThunk.consumerId,
                        {
                            name: '##WEBSOCKET_CONSUMER_RESPONSE##',
                            uuid: message.uuid,
                            '#TRAP': message['#CALLER_TRAP'],
                            response: message.response,
                        }
                    );
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_SERVICE_PRODUCER_CALL##', message => {
            try {
                if (message.uuid in this.byUUID) {
                    let websocketThunk = this.byUUID[message.uuid];
                    
                    Process.sendWorker(
                        websocketThunk.producerId,
                        {
                            name: '##WEBSOCKET_PRODUCER_CALL##',
                            uuid: message.uuid,
                            '#CALLER_TRAP': message['#CALLER_TRAP'],
                            payload: message.payload,
                        },
                    );
                }
            }
            catch (e) {}
        });
    }

    async onClose(message) {
        if (message.uuid in this.byUUID) {
            let websocketThunk = this.byUUID[message.uuid];

            Process.sendWorker(websocketThunk.producerId, {
                name: '##WEBSOCKET_PRODUCER_CLOSED##',
                uuid: websocketThunk.uuid,
                code: Int32Type.verify(message.code) ? message.code : 1000,
                reason: StringType.verify(message.reason) ? message.reason : 'unavailable',
            });
        }
    }

    async onConnect(message) {
        if (message.path in this.byPath) {
            let websocketThunk = this.byPath[message.path];
            websocketThunk.producerId = message.workerId;
            return websocketThunk.uuid;
        }
    }

    async onCreate(message) {
        let path = `/${Crypto.generateUUID()}/${Crypto.generateUUID()}`;

        let websocketThunk = {
            path: path,
            uuid: Crypto.generateUUID(),
            producerId: null,
            consumerId: message.workerId,
        };

        this.byPath[websocketThunk.path] = websocketThunk;
        this.byUUID[websocketThunk.uuid] = websocketThunk;

        return {
            uuid: websocketThunk.uuid,
            path: websocketThunk.path,
        };
    }

    async onSend(message) {
        if (message.uuid in this.byUUID) {
            let websocketThunk = this.byUUID[message.uuid];

            Process.sendWorker(
                websocketThunk.producerId,
                {
                    name: '##WEBSOCKET_PRODUCER_DATA##',
                    uuid: message.uuid,
                    payload: message.payload,
                }
            );
        }
    }
});


/*****
 * The WebsocketService and WebsocketHandle jointly provide a managed service
 * for individually enabling a websocket and securely facilitating interprocess
 * communications with that socket.  The WebsockeHandle functions a sort of
 * proxy for a Websocket that's actually in one of the worker processes, which
 * can be either the same or a different worker process than the code that's
 * currently using the handle.
*****/
define(class WebsocketHandle extends Handle {
    static consumers = {};
    static producers = {};
    static synchronous = Symbol('synchronous');
    static asynchronous = Symbol('asynchronous');

    static {
        Process.on('##WEBSOCKET_CONSUMER_CLOSED##', message => {
            try {
                if (message.uuid in WebsocketHandle.consumers) {
                    let handle = WebsocketHandle.consumers[message.uuid];
                    delete WebsocketHandle.consumers[message.uuid];
                    handle.uuid = '';
                    
                    if (handle.trigger) {
                        handle.trigger('');
                        handle.trigger = null;
                    }
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_CONSUMER_DATA##', message => {
            try {
                if (message.uuid in WebsocketHandle.consumers) {
                    let handle = WebsocketHandle.consumers[message.uuid];

                    try {
                        let payloadMessage = fromJson(message.payload.toString());

                        if (payloadMessage.type == 'message') {
                            let payload = fromJson(payloadMessage.payload);

                            if (payload.name == 'WebsocketOpen') {
                                if (message.uuid in WebsocketHandle.consumers) {
                                    let handle = WebsocketHandle.consumers[message.uuid];
                                    handle.trigger();
                                    handle.trigger = null;
                                }
                            }
                            else {
                                handle.push(payloadMessage);
                            }
                        }
                        else {
                            handle.push(payloadMessage);
                        }
                    }
                    catch(e) {}
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_CONSUMER_RESPONSE##', message => {
            try {
                if (message.uuid in this.consumers) {
                    Trap.handleResponse(message['#TRAP'], message.response);
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_PRODUCER_CALL##', async message => {
            try {
                if (message.uuid in WebsocketHandle.producers) {
                    let handle = WebsocketHandle.producers[message.uuid];
                    let response = await handle.websocket.call(message.payload);

                    Process.sendPrimary({
                        name: '##WEBSOCKET_SERVER_CONSUMER_RESPONSE##',
                        uuid: message.uuid,
                        '#CALLER_TRAP': message['#CALLER_TRAP'],
                        response: response,
                    });
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_PRODUCER_CLOSED##', message => {
            try {
                if (message.uuid in WebsocketHandle.producers) {
                    let handle = WebsocketHandle.producers[message.uuid];
                    delete WebsocketHandle.producers[message.uuid];
                    handle.uuid = '';
                    handle.websocket.close(message.code, message.reason);
                    handle.websocket = null;
                }
            }
            catch (e) {}
        });

        Process.on('##WEBSOCKET_PRODUCER_DATA##', message => {
            try {
                if (message.uuid in WebsocketHandle.producers) {
                    let handle = WebsocketHandle.producers[message.uuid];
                    handle.websocket.send(message.payload);
                }
            }
            catch (e) {}
        });
    }

    constructor(mode) {
        super();
        this.uuid = '';
        this.payloads = [];
        this.trigger = null;
        this.lokker = mkLokker();
        this.emitter = mkEmitter();

        if (mode == WebsocketHandle.synchronous) {
            this.mode = WebsocketHandle.synchronous;
        }
        else {
            this.mode = WebsocketHandle.asynchronous;
        }
    }

    call(payload) {
        if (this.uuid) {
            if (ObjectType.verify(payload) && StringType.verify(payload.name)) {
                let trap = mkTrap(1);

                Process.sendPrimary({
                    name: '##WEBSOCKET_SERVICE_PRODUCER_CALL##',
                    uuid: this.uuid,
                    '#CALLER_TRAP': trap.id,
                    payload: payload,
                });

                return trap.promise;
            }
        }
    }

    async close(code, reason) {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
                code: code,
                reason: reason,
            });
        }

        return this;
    }
    
    async connect(socket, req, headData) {
        this.uuid = await this.callService({
            path: req.getPath(),
        });

        if (this.uuid) {
            WebsocketHandle.producers[this.uuid] = this;

            this.websocket = mkWebsocket(
                socket,
                req.getHeader('sec-websocket-extensions'),
                headData,
            );

            this.websocket.on('SocketClosed', message => {
                Process.sendPrimary({
                    name: '##WEBSOCKET_SERVICE_CONSUMER_CLOSED##',
                    uuid: this.uuid,
                });

                delete WebsocketHandle.producers[this.uuid];
                this.uuid = '';
            });

            this.websocket.on('DataReceived', async data => {
                Process.sendPrimary({
                    name: '##WEBSOCKET_SERVICE_CONSUMER_DATA##',
                    uuid: this.uuid,
                    payload: data.payload,
                });
            });

            let secureKey = req.getHeader('sec-websocket-key');
            let hash = await Crypto.hash('sha1', `${secureKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`);
            
            let headers = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: upgrade',
                `Sec-WebSocket-Accept: ${hash.toString('base64')}`,
            ];
            
            if (this.websocket.hasExtensions()) {
                headers.push(`Sec-WebSocket-Extensions: ${this.websocket.getSecWebsocketExtensions()}`);
            }

            headers.push('\r\n');
            socket.write(headers.join('\r\n'));
        }

        return this;
    }

    connected() {
        if (this.uuid) {
            return new Promise((ok, fail) => {
                this.trigger = () => ok(this);
            });
        }
        else {
            return new Promise((ok, fail) => this);
        }
    }

    async create() {
        let { uuid, path } = await this.callService({
            uuid: this.uuid,
        });

        if (uuid && path) {
            this.uuid = uuid;
            WebsocketHandle.consumers[this.uuid] = this;

            return {
                websocketHandle: this,
                path: path,
            };
        }
    }

    async get() {
        if (this.uuid) {
            if (this.mode == WebsocketHandle.synchronous) {
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
    }

    getUUID() {
        return this.uuid;
    }

    async has() {
        if (this.uuid) {
            if (this.mode == WebsocketHandle.synchronous) {
                try {
                    await this.lokker.lock()
                    return this.payloads.length > 0;
                }
                finally {
                    this.lokker.free();
                }
            }
        }
    }

    off(...args) {
        this.emitter.off(...args);
        return this;
    }

    on(...args) {
        this.emitter.on(...args);
        return this;
    }

    once(...args) {
        this.emitter.once(...args);
        return this;
    }

    async push(payload) {
        if (this.mode == WebsocketHandle.asynchronous) {
            this.emitter.emit({
                name: 'Data',
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

    async send(payload) {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
                payload: payload,
            });
        }
    }
});