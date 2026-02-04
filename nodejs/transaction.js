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
 * The transaction object is closely associated with the API API.  Each API
 * endpoint accepts a trx argument as the first parameter.  The transaction
 * object provides DBMS, logging, and error-handling services.
*****/
define(class Transaction {
    constructor(context) {
        this.session = context.session;
        this.name = context.name;
        this.method = context.method;
        this.ishttp = context.ishttp;
        this.httpReq = context.httpReq;
        this.httpRsp = context.httpRsp;
        this.thunks = {};
    }

    async commit() {
        for (let dbmsThunk of Object.values(this.thunks)) {
            try {
                await dbmsThunk.commit();
            }
            catch (e) {}
        }

        return this;
    }

    async connect(settings) {
        try {
            let key = Dbms.createConnectionKey(settings);

            if (key in this.thunks) {
                return this.thunks;
            }
            else {
                let thunk = this.thunks[key] = mkDbmsThunk(settings);
                await thunk.startTransaction();
                return thunk;
            }
        }
        catch (e) {}
    }

    async finalize() {
        await this.commit();
    }

    getMethod() {
        return this.method;
    }

    getName() {
        return this.name;
    }

    getReq() {
        return this.httpReq;
    }

    getRsp() {
        return this.httpRsp;
    }

    getSession() {
        return this.session;
    }

    isHttp() {
        return this.ishttp;
    }

    async rollback() {
        for (let dbmsThunk of Object.values(this.thunks)) {
            try {
                await dbmsThunk.rollback();
            }
            catch (e) {}
        }

        return this;
    }
});
