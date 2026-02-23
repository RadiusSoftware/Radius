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


/*****
 * The tunnel or serial tunnel is a singleton whose only task is to replace
 * non-serial values, generally objects, and temporarily replace them with a
 * UUID for retrieval.  The concept is that the text key can be used as an
 * attribute when constructing an element.  During initialization, the element
 * will pop values from the tunnel to get the original value.
*****/
singleton(class Tunnel {
    constructor() {
        this.spooky = {};
    }

    pop(key) {
        if (key in this.spooky) {
            let value = this.spooky[key];
            delete this.spooky[key];
            return value;
        }

        return null;
    }

    push(value) {
        let key = `TUNNEL:${Crypto.generateUUID()}`;
        this.spooky[key] = value;
        return key;
    }
});
