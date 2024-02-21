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
 * Once the rest of the Radius Mozilla framework has been loaded, the purpose
 * of this module is to make final preparations that are dependent on having
 * the framework loaded.
*****/
wrapTree(document.documentElement);


let str = 'Hëllô Wõrľd D';
let buffer = mkBuffer(str);
debug(str);
debug(buffer.toString());

let b64 = buffer.toString('base64');
debug(b64);
let b64Buffer = mkBuffer(b64, 'base64');
debug(b64Buffer.toString());

let hex = buffer.toString('hex');
debug(hex);
let hexBuffer = mkBuffer(hex, 'hex');
debug(hexBuffer.toString());
