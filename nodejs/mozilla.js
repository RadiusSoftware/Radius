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
*****/
let radius;


/*****
*****/
exports = module.exports = async function() {
    if (!radius) {
        const modules = ['"use strict";'];

        const frameworkFiles = [
            'common/core.js',
            'common/buffer.js',
            'common/emitter.js',
            'common/objekt.js',
            'common/stringSet.js',
            'common/textTemplate.js',
            'common/data.js',
            'common/json.js',
            'common/language.js',
            'common/time.js',
            'common/mime.js',
            'common/textUtils.js',
            'common/textTree.js',
            'common/chronos.js',
            'common/api.js',
            'common/cookie.js',
            
            'mozilla/element.js',
            'mozilla/win.js',
            'mozilla/doc.js',
            'mozilla/svg.js',
            'mozilla/math.js',
            'mozilla/style.js',
            'mozilla/widget.js',
            'mozilla/entanglements.js',
            'mozilla/controller.js',
            'mozilla/http.js',
            'mozilla/websocket.js',
            'mozilla/finalize.js',
        ];
    
        for (let frameworkFile of frameworkFiles) {
            const path = Path.join(__dirname, `../${frameworkFile}`);
            modules.push((await FileSystem.readFile(path)).toString());
        }

        radius = modules.join('\n');
    }

    return radius;
};
