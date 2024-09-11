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
const npmPg = require('pg');


/*****
 * Here's a little kludge or adjustment to the underlying PG module.  When the
 * PG, and new Date() as well, are used to convert the timezoneless timestamp
 * from the PG server to a js timesstamp, js automatically shifts the timezeone
 * to UTC, from a value that's already in UTC. Hence, we have a problem.  The
 * solution is to mark each time with +0000 to indicate that it's already in
 * UTC and thus shouldn't be converted.
*****/
const parser1114 = npmPg.types.getTypeParser(1114);

npmPg.types.setTypeParser(1114, function(dateText) {
    return parser1114(`${dateText}+0000`);
});


/*****
 * Need to escape a value such that it can be saved in the database as a string
 * value.  Generally, we know the DBMS standard escape sequences.  Since we're
 * being careful about DBMS-specific approaches, each DBMS module will need to
 * do its own escaping.
*****/
function escape(raw) {
    let escaped = raw.replace(/'/g, "''");
    return escaped;
}


/*****
*****/
singleton('', class PostgresDbms {
    constructor() {
        Dbms.dbmsMap['postgres'] = this;
    }

    async connect(settings) {
        const pgconn = mkPostgresConnection(settings);
        await pgconn.connect();
        return pgconn;
    }

    async createDatabase(settings, databaseName) {
        // TODO ****************************************
    }

    async createTable(settings, table) {
        // TODO ****************************************
    }

    async dropDatabase(settings, databaseName) {
        // TODO ****************************************
    }

    async dropTable(settings, tableName) {
        // TODO ****************************************
    }

    async doesDatabaseExist(settings, databaseName) {
        // TODO ****************************************
    }

    async getDatabaseSchema(settings, databaseName) {
        // TODO ****************************************
    }

    getDbmsKey(settings) {
        return `${settings.dbmsType}-${settings.host}-${settings.database}`;
    }

    mapDbmsType(dbmsType) {
        // TODO ****************************************
    }

    mapJsType(jsType) {
        // TODO ****************************************
    }
});


/*****
 * The PostgreSQL implementaiton-specific connection object.  It performs only
 * the most basic tasks and isn't a complete DBMS client.  It's primary purpose
 * is to execute queries and interpret the results.  It additionally takes care
 * of starting transactions, as well as commits and rollbacks.  Note that
 * PostgreSQL clients are able to connection either via unencrypted or encrypted
 * connections assume a TLS certificate that's avaiable for the PG client.
*****/
register('', class PostgresConnection {
    constructor(settings) {
        this.pg = null;

        this.settings = {
            host: settings.host,
            port: settings.port,
            database: settings.database,
            user: settings.username,
            password: settings.password,

        };
    }

    async close() {
        await this.pg.end();
        this.pg = null;
        return this;
    }

    async commit() {
        await this.query('COMMIT');
        return this;
    }

    async connect() {
        this.pg = new npmPg.Client(this.settings);
        await this.pg.connect();
        return this;
    }

    async isConnected() {
        let result = await this.query('SELECT NOW()');
        return Array.isArray(result) && result.length == 1;
    }

    query(sql) {
        return new Promise((ok, fail) => {
            this.pg.query(sql, (error, result) => {
                if (error) {
                    throw error;
                }
                else {
                    ok(result.rows);
                }
            });
        });
    }

    async rollback() {
        await this.query('ROLLBACK');
        return this;
    }

    async startTransaction() {
        await this.query('START TRANSACTION');
        return this;
    }
});
