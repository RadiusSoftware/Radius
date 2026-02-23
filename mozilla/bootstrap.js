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
 * Our three major categories that we're searching for are phone, tablet, and
 * computer.  What we're really looking for is to distringuish between phone,
 * table, and computer.  Our approach is to find the phones and tablets after
 * which we assume everythiing else is a computer.
*****/
function assessUserAgent() {
    let flags = { phone: false, tablet: false, computer: false };
    let userAgent = Navigator.getUserAgent();
    
    if (userAgent.match(/iphone|pixel/i) != null) {
        flags.phone = true;
        return flags;
    }
    
    if (userAgent.match(/ipad/i) != null) {
        flags.tablet = true;
        return flags;
    }
    
    if (userAgent.match(/android/i) != null) {
        if (userAgent.match(/moto|tablet/i) != null) {
            flags.phone = true;
            return flags;
        }

        if (userAgent.match(/U;|15E148|SM-X906C|YT-J706X|NRD90M|SGP771|SM-T827R4|SM-T550|KFTHWI|LG-V410/) != null) {
            flags.tablet = true;
            return flags;
        }

        flags.phone = true;
        return flags;
    }
    
    if (userAgent.match(/intel mac/i) != null) {
        flags.computer = true;
        return flags;
    }
    
    if (userAgent.match(/macintosh/i) != null) {
        flags.computer = true;
        return flags;
    }

    flags.computer = true;
    return flags;
}


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
    
    let styles = [];
    const { phone, tablet, computer } = assessUserAgent();
    styles.push(`\n\n/* ${Navigator.getUserAgent()} */`);
    styles.push(`/* phone = ${phone} */`);
    styles.push(`/* tablet = ${tablet} */`);
    styles.push(`/* computer = ${computer} */`);

    if (phone) {
        styles.push(`.micro { display: unset };`);
        styles.push(`.macro { display: none };`);
    }
    else if (tablet) {
        styles.push(`.micro { display: none };`);
        styles.push(`.macro { display: unset };`);
    }
    else {
        styles.push(`.micro { display: none };`);
        styles.push(`.macro { display: unset };`);
    }

    define(function isPhone() { return phone; });
    define(function isTablet() { return tablet; });
    define(function isComputer() { return computer; });

    Doc.queryOne('#primary-stylesheet').append(mkDocText(styles.join('\n')));
    Packages.openApplication();
});
