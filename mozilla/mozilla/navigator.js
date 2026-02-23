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
 * This is the Radius-like API wrapper for the traditional Mozilla Navigator
 * object, which is found at window.navigator.  The Navigator singleton provides
 * access to the basic API features that are neither deprecate nor experimental.
 * The Navigator is provided to ensure compatibility with a number of needed
 * features with a familiar name for the advanced Mozilla developer.
*****/
singleton(class Navigator {
    constructor() {
    }

    getConnection() {
        return window.navigator.connection;
    }

    getCookiesEnabled() {
        return window.navigator.cookieEnabled;
    }

    getDeviceMemory() {
        return window.navigator.deviceMemory;
    }

    getLanguages() {
        return window.navigator.languages;
    }

    getLocicalProcessors() {
        return window.navigator.hardwareConcurrency;
    }

    getMaxTouchPoints() {
        return window.navigator.maxTouchPoints;
    }

    getPreferredLanguage() {
        return window.navigator.language
    }

    getUserAgent() {
        return window.navigator.userAgent;
    }

    isOnline() {
        return window.navigator.onLine;
    }

    isPdfViewerEnabled() {
        return window.navigator.pdfViewerEnabled;
    }

    isWebdriver() {
        return window.navigator.webdriver;
    }
});
