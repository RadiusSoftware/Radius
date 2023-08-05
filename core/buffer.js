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
 * There are two variants of Buffer.  In the server, Buffer extends the builtin
 * Buffer class by providing some additional features.  On the browser, it's
 * a class the implements the same features based on a uint8 array.  This makes
 * coding buffers the same on both the client and server.  Additionally, the
 * framework buffer is JSON transferable so that buffers can be easily sent
 * between processes, cluster hosts, and the application clients.
*****/
if (platform == 'nodejs') {
    register('', function mkBuffer(...args) {
        return Buffer.from(...args);
    });
}
else if (platform == 'mozilla') {
    register('', class Buffer {
        constructor(value, encoding) {
            this.set(value, encoding);
        }
      
        set(value, encoding) {
            if (typeof value == 'string') {
                switch (encoding) {
                    case 'hex':
                        if (value.length % 2 != 0) {
                            throw new Error('Hex string comprised of odd character count!');
                        }
      
                        this.jsArray = new Uint8Array(value.length/2);
                        let array = new DataView(this.jsArray.buffer);
      
                        for (let i = 0; i < value.length; i += 2) {
                            let byte = parseInt(value[i], 16) * 16 + parseInt(value[i + 1], 16);
                            array.setUint8(i/2, byte);
                        }
                        break;

                    case 'base64':
                        let binary = atob(value);
                        this.jsArray = (new TextEncoder()).encode(binary);
                        break;

                    default:
                        this.jsArray = (new TextEncoder()).encode(value);
                }
            }
            else {
                this.jsArray = new Uint8Array(value);
            }
        }

        toString(encoding) {
            switch (encoding) {
                case 'hex':
                    let bytes = [];
                    let array = new DataView(this.jsArray.buffer);
      
                    for (let i = 0; i < array.byteLength; i++) {
                        let byte = array.getUint8(i);
                        bytes.push(byte.toString(16));
                    }
      
                    return bytes.join('');

                case 'base64':
                    let string = (new TextDecoder()).decode(this.jsArray);
                    return btoa(string);

                default:
                    return (new TextDecoder()).decode(this.jsArray);
            }
        }
    });
}
