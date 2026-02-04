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
 * This is the special error class used for notifying callers that a requested
 * Dbo lock was NOT able to be completd, generally speaking, because either (a)
 * the object is locked by another lokker or the object does NOT exist.  When
 * the lock 
*****/
define(class DboLokkerError extends Error {
    constructor() {
        super();
    }
});


/*****
 * DBO locks are useful primarily in cases where an external process, such as a
 * user editor, a remote server, or something else cannot tolerate any changes to
 * an object while that external process is performing an action.  Locks are
 * centrally recorded and managed with entries in the DboLock DBMS table in the
 * Radius database.  The DBMS system itself will coordiante asynchronous requests
*****/
define(class DboLokker {
    constructor() {
        this.id = Crypto.generateUUID();
    }

    async free() {
        await mkDbmsThunk().deleteObj(DboLock, { lockId: this.id });
    }

    getId() {
        return this.id;
    }

    async lock(...dbos) {
        let dbms = await mkDbmsThunk().startTransaction();

        for (let dbo of dbos) {
            let dboId = dbo instanceof Dbo ? dbo.id : dbo;

            if (!(dboId in this.locks)) {
                let dboLock = await dbms.selectOneObj(DboLock, { objId: dboId });

                if (dboLock) {
                    await dbms.rollback();
                    await this.free();
                    throw new DboLokkerError();
                }
                else {
                    dboLock = await dbms.createObj(DboLock, {
                        objId: dboId,
                        lockId: this.id,
                    });

                    this.locks[dboId] = dboLock;
                }
            }
        }

        await dbms.commit();
        return this;
    }
});