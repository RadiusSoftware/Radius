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
 * A wrapper object that generically represents any DBMS.  A number of features
 * are provided so that developer can avoid DBMS-specific management SQL commands.
 * This singleton is used for establishing connections, for managming connection
 * pools, and for performing DBMS tasks with a set of generic methods.
*****/
singleton('', class Dbms {
    constructor() {
        this.dbmsMap = {};
        this.dbmsPools = {};
        this.radius = null;
    }

    async alterColumnSize(settings, tableName, columnName, size) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.alterColumnSize(settings, tableName, columnName, size);
        }
    }

    async connect(settings) {
        try {
            let dbms = this.getDbms(settings);
            let pool = this.getDbmsPool(settings);
            const conn = await dbms.connect(settings);
            let dbmsConn = await pool.alloc();

            if (!dbmsConn) {
                dbmsConn = mkDbmsConnection(dbms, conn);

                if (dbmsConn && await dbmsConn.isConnected()) {
                    pool.addResource(dbmsConn);
                }
                else {
                    dbmsConn = null;
                }
            }
            
            return dbmsConn;
        }
        catch (e) {
            await caught(e);
        }

        return false;
    }

    async createColumn(settings, dbTable, dbColumn) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.createColumn(settings, dbTable, dbColumn);
        }
    }

    async createDatabase(settings) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.createDatabase(settings);
        }
    }

    async createIndex(settings, dbTable, dbIndex) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.createIndex(settings, dbTable, dbIndex);
        }
    }

    async createTable(settings, tableSchema) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.createTable(settings, tableSchema);
        }
    }

    async doesDatabaseExist(settings) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.doesDatabaseExist(settings);
        }
    }

    async doesTableExist(settings, tableName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.doesTableExist(settings, databaseName, tableName);
        }
    }

    async dropColumn(settings, tableName, columnName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.dropColumn(settings, tableName, columnName);
        }
    }

    async dropDatabase(settings, databaseName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.dropDatabase(settings, databaseName);
        }
    }

    async dropIndex(settings, indexName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.dropIndex(settings, indexName);
        }
    }

    async dropTable(settings, tableName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.dropTable(settings, tableName);
        }
    }

    async getDatabaseSchema(settings) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.getDatabaseSchema(settings);
        }
    }

    async getTableSchema(settings, databaseName, tableName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.getDatabaseSchema(settings, databaseName, tableName);
        }
    }

    getDbms(settings) {
        return this.dbmsMap[settings.dbmsType];
    }

    getDbmsPool(settings) {
        let dbmsPool = null;
        let dbms = this.dbmsMap[settings.dbmsType];

        if (dbms) {
            let poolKey = dbms.getDbmsKey(settings);

            if (!(poolKey in this.dbmsPools)) {
                this.dbmsPools[poolKey] = mkPool({
                    timeout: typeof settings.timeout == 'number' ? settings.timeout : null,
                });
            }

            dbmsPool = this.dbmsPools[poolKey];
        }

        return dbmsPool;
    }

    getTypeMapper(settings) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return dbms.getTypeMapper();
        }
    }

    isSupported(dbmsType) {
        return dbmsType in this.dbms;
    }

    listSupportedDbmsTypes() {
        return Object.keys(this.dbms);
    }

    setRadiusDbms(settings) {
        this.radius = settings;
        return this;
    }
});


/*****
 * A convenience function that's globally available in all processes. When called
 * with no arguments, the default or radius DBMS is used for establishing the
 * connection.  Th is essentially the API function that developers required for
 * connecting to and running queries against databases.
*****/
register('', async function dbConnect(settings) {
    if (settings) {
        return await Dbms.connect(settings);
    }
    else if (Dbms.radius) {
        return await Dbms.connect(Dbms.radius);
    }

    return false;
});


/*****
 * A DBMS connection is a wrapper object for a DBMS-specific connection.  This
 * generic DBMS connection provides higher-level features such as state tracking
 * and management.  All of the basic features such as queries, transactions,
 * commit, and rollback are provided by the "connection" member, which has a
 * common API interface across DBMS-specific framework drivers.  Given this
 * wrapper, the caller doesn't need to know about the details of opening and
 * executing a connection for any specific DBMS.  The doesn't mean, however,
 * the the SQL is the same across DBMS's.
*****/
register('', class DbmsConnection {
    constructor(dbms, connection) {
        this.dbms = dbms;
        this.connection = connection;
        this.state = 'connected';
    }

    async close() {
        if (this.state == 'transaction') {
            await this.connection.commit();
            this.state = 'connected';
        }

        if (this.state == 'connected') {
            this.free();
        }
        else {
            throw new Error(`DBMS connection cannot close(): "${this.state}"`);
        }

        return this;
    }

    async commit() {
        if (this.state == 'transaction') {
            await this.connection.commit();
            this.state = 'connected';
        }
        else {
            throw new Error(`DBMS connection cannot commit(): "${this.state}"`);
        }

        return this;
    }

    async free() {
        if (Pool.poolKey in this) {
            await this[Pool.poolKey].pool.free(this);
        }

        return null;
    }

    getDbmsType() {
        return this.dbms.dbmsType;
    }

    getPoolKeys() {
        return Object.keys(this.dbmsPools);
    }

    getPools() {
        return Object.values(this.dbmsPools);
    }

    getState() {
        return this.state;
    }

    async isConnected() {
        return await this.connection.isConnected();
    }

    async query(sql) {
        if (this.state in { connected:0, transaction:0 }) {
            return await this.connection.query(sql);
        }
        else {
            throw new Error(`DBMS connection not ready to query(): "${this.state}"`);
        }

        return this;
    }

    async rollback() {
        if (this.state == 'transaction') {
            await this.connection.rollback();
            this.state = 'connected';
        }
        else {
            throw new Error(`DBMS connection cannot rollback(): "${this.state}"`);
        }

        return this;
    }

    async startTransaction() {
        if (this.state == 'connected') {
            await this.connection.startTransaction();
            this.state = 'transaction';
        }
        else {
            throw new Error(`DBMS connection not ready for startTransaction(): "${this.state}"`);
        }

        return this;
    }
});
