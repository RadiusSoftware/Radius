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
const LibNet = require('net');


/*****
*****/
register('', class TcpClient extends Emitter {
    constructor(...args) {
        return new Promise(async (ok, fail) => {
            super();

            if (args[0] instanceof Net.Socket) {
                this.socket = args[0];
                this.host = this.socket.remoteAddress;
                this.port = this.socket.remotePort;
            }
            else {
                this.host = args[0];
                this.port = args[1];
                this.socket = new Net.Socket(args[2]);
                await this.socket.connect(this.port, this.host);
            }

            this.socket.on('data', async data => {
                this.send({
                    name: 'data',
                    data: data,
                })
            });

            this.socket.on('end', async () => {
                console.log('***** END');
            });

            this.socket.on('close', async () => {
                console.log('***** CLOSE');
            });

            ok(this);
        });
    }

    destroy() {
        this.socket.destroy();
    }

    destroySoon() {
    }

    getReadyState() {
        return this.socket.readyState;
    }

    pause() {
        this.socket.pause();
    }

    async query(data) {
        return new Promise(async (ok, fail) => {
        });
    }

    resume() {
        this.socket.resume();
    }

    write(data, encoding) {
        return new Promise(async (ok, fail) => {
            encoding = typeof encoding == 'string' ? encoding : 'utf8';

            this.socket.write(data, encoding, async () => {
                ok(this);
            });
        });
    }
});
