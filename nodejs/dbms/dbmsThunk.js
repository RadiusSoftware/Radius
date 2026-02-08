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
 * The Dbo or database object thunk is an abstraction of the modules in the
 * DBMS directory, which are in turn abstractions of the native DBMS features.
 * This service provides three services: (a) enables recirection of DMS features
 * to another host on the cluster, (b) additional features such as object
 * locking, and (c) a simplified API that's fast enough for most interactions
 * that required discrete OLTP transactions.
*****/
define(class DbmsThunk extends Thunk {
    constructor(settings) {
        super();
        this.dbc = null;
        this.transaction = '';
        this.settings = settings;
    }

    async commit() {
        if (this.transaction) {
            await this.eazy(async dbc => {
                await dbc.commit();
                await dbc.close();

            });
            
            this.dbc = null;
            this.transaction = false;
        }

        return this;
    }

    async createObj(dboType, values) {
        return await this.eazy(async dbc => {
            let fname = `mk${dboType.name}`;
            let dbo;
            eval(`dbo = ${fname}(values)`);
            await dbo.save(dbc);
            return dbo;
        });
    }

    async deleteObj(dbo) {
        await this.eazy(async dbc => {
            await dbo.delete(dbc);
        });
        
        return dbo;
    }

    async deleteObjProperty(id, dotted) {
        return await this.eazy(async dbc => {
            return await Dbo.deleteProperty(dbc, id, dotted);
        });
    }

    async eazy(func) {
        let dbc = null;
        let result = null;

        try {
            if (this.transaction) {
                dbc = this.dbc;
            }
            else {
                dbc = await dbConnect(this.settings);
            }

            result = await func(dbc);
        }
        catch (e) {console.log(e)}
        finally {
            if (!this.transaction) {
                if (dbc) {
                    await dbc.close();
                }
            }

            return result;
        }
    }

    async exec(sql) {
        return await this.eazy(async dbc => {
            return await dbc.query(exec);
        });
    }

    async getObj(id) {
        return await this.eazy(async dbc => {
            return Dbo.get(dbc, id);
        });
    }

    async getObjProperty(id, dotted) {
        return await this.eazy(async dbc => {
            return Dbo.getProperty(dbc, id, dotted);
        });
    }

    async hasObjProperty(id, dotted) {
        return await this.eazy(async dbc => {
            return Dbo.hasProperty(dbc, id, dotted);
        });
    }

    async modifyObj(id, values) {
        return await this.eazy(async dbc => {
            return await Dbo.modify(dbc, id, values);
        });
    }

    async rollback() {
        if (this.transaction) {
            await this.eazy(async dbc => {
                await dbc.rollback();
                await this.dbc.close();
            });

            this.dbc = null;
            this.transaction = false;
        }

        return this;
    }

    async selectObj(dboType, where, sort) {
        return await this.eazy(async dbc => {
            return Dbo.select(dbc, dboType, where, sort);
        });
    }

    async selectOneObj(dboType, where) {
        return await this.eazy(async dbc => {
            return Dbo.selectOne(dbc, dboType, where);
        });
    }

    async setObjProperty(id, dotted, value) {
        return await this.eazy(async dbc => {
            return await Dbo.setProperty(dbc, id, dotted, value);
        });
    }

    async startTransaction() {
        if (!this.transaction) {
            this.dbc = await dbConnect(this.settings);
            this.transaction = true;
            await this.eazy(async dbc => await dbc.startTransaction());
        }

        return this;
    }

    async updateObj(obj) {
        return await this.eazy(async dbc => {
            return await obj.update(dbc)
        });
    }
});