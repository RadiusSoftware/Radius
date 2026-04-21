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
 * This is the code that must be called upon loading and compiling the rest of
 * the Radius Mozilla framework.  This function initializes the HTML document,
 * finalizes the code, and manages the data connection to the Radius server.
 * Once the application has been initialized, we're ready to load in the app's
 * primary bundles, which are required for launching the application.  Once the
 * primary bundles have been loaded, they will cascade and load in dependencies
 * during their loading cycle.  Additionally, there's code here to determine
 * whether the browser will use a "macro" or "micro" model.  It's all about the
 * user's expectations regarding display layout and the proper display widgets
 * to use.  Essentially, the micro model is a phone, while the macro model is
 * for notebooks, tablets/pads, and desktops.
*****/
Doc.on('DOMContentLoaded', async () => {
    webappSettings = fromJson(mkBuffer(webappSettings, 'hex'));
    
    define(async function callServer(message) {
        const rsp = await mkHttpRequest().post(Location.getApplicationPath(), message);
        return rsp.getPayload();
    });

    define(async function sendServer(message) {
        mkHttpRequest().post(Location.getApplicationPath(), message);
    });

    apiEndpoints = fromJson(mkBuffer(apiEndpoints, 'hex').toString());
    wrapTree(document.documentElement);
    Api['#ImportEndpoints'](apiEndpoints);

    for (let packageName of await Api.getLoadOrder()) {
        await Packages.require(packageName);
    }
    
    Packages.openApplication();
});
