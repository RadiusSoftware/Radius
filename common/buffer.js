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
    register('', class Buffer extends DataView {
        constructor(value, encoding) {
            let array;

            if (typeof value == 'string') {
                if (encoding == 'base64') {
                    let binaryString = atob(value);
                    array = new Uint8Array(binaryString.length);
                    
                    for (let i = 0; i < binaryString.length; i++) {
                        array[i] = binaryString.charCodeAt(i);
                    }
                }
                else if (encoding == 'hex') {
                    array = new Uint8Array(value.length/2);
  
                    for (let i = 0; i < value.length; i += 2) {
                        let byte = parseInt(value[i], 16) * 16 + parseInt(value[i + 1], 16);
                        array[i/2] = byte;
                    }
                }
                else {
                    array = (new TextEncoder(encoding ? encoding : 'utf-8').encode(value));
                }
            }
            else if (value instanceof Buffer) {
                array = new Uint8Array(value.buffer);
            }
            else {
                array = (new TextEncoder(encoding ? encoding : 'utf-8').encode(value.toString()));
            }

            super(array.buffer);
            this.array = array;
        }

        toString(encoding) {
            if (encoding == 'base64') {
                let decoder = new TextDecoder('utf-8');
                let utf8 = decoder.decode(this.buffer);

                return btoa(encodeURIComponent(utf8).replace(
                    /%([0-9A-F]{2})/g,
                    (match, p1) => {
                        return String.fromCharCode('0x' + p1);
                    }
                ));
            }
            else if (encoding == 'hex') {
                let bytes = [];
  
                for (let i = 0; i < this.array.byteLength; i++) {
                    let byte = this.getUint8(i);
                    bytes.push(byte.toString(16));
                }
  
                return bytes.join('');
            }
            else {
                let decoder = new TextDecoder(encoding ? encoding : 'utf-8');
                return decoder.decode(this.buffer);
            }
        }
    });
}
