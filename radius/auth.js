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
*****/
define(class AuthApp extends Webapp {
    constructor() {
        super();
    }

    // ********************
    // forgotPassword
    // ********************
    async [Api.define(
        'forgotPassword',
        {
            username: StringType,
        },
    )](trx, username) {
        // TODO **************************************************************
    }

    // ********************
    // forgotUsername
    // ********************
    async [Api.define(
        'forgotUsername',
        {
            phoneNumber: StringType,
        },
    )](trx, phoneNumber) {
        // TODO **************************************************************
    }

    // ********************
    // getAuthState
    // ********************
    async [Api.define(
        'getAuthState',
    )](trx) {
        return await trx.session.getNextAuthState();
    }

    // ********************
    // getTargetPath
    // ********************
    async [Api.define(
        'getTargetPath',
    )](trx) {
        return await trx.session.getInitialPath();
    }

    // ********************
    // getUsername
    // ********************
    async [Api.define(
        'getUsername',
    )](trx) {
        return await trx.session.getUsername();
    }

    // ********************
    // setPassword
    // ********************
    async [Api.define(
        'setPassword',
        {
            password: StringType,
        },
    )](trx, password) {
        // TODO **************************************************************
    }

    // ********************
    // submitAcceptEula
    // ********************
    async [Api.define(
        'submitAcceptEula',
    )](trx) {
        return await trx.session.submitAcceptEula();
    }

    // ********************
    // submitCode
    // ********************
    async [Api.define(
        'submitCode',
        {
            code: StringType,
        },
    )](trx, code) {
        // TODO **************************************************************
    }

    // ********************
    // submitDeviceRemember
    // ********************
    async [Api.define(
        'submitDeviceRemember',
        {
            rememberMe: BooleanType,
        },
    )](trx, rememberMe) {
        if (trx.isHttp) {
            return trx.session.submitRememberDevice(rememberMe);
        }

        return  mkFailure('radius.org.httpOnly');
    }

    // ********************
    // submitPassword
    // ********************
    async [Api.define(
        'submitPassword',
        {
            password: StringType,
        },
    )](trx, password) {
        return await trx.session.submitPassword(password);
    }

    // ********************
    // submitRevert
    // ********************
    async [Api.define(
        'submitRevert',
    )](trx) {
        return await trx.session.submitRevert();
    }

    // ********************
    // submitSetPassword
    // ********************
    async [Api.define(
        'submitSetPassword',
        {
            password: StringType,
        },
    )](trx, password) {
        return await trx.session.submitSetPassword(password);
    }

    // ********************
    // submitUsername
    // ********************
    async [Api.define(
        'submitUsername',
        {
            username: StringType,
        },
    )](trx, username) {
        return await trx.session.submitUsername(username);
    }
});