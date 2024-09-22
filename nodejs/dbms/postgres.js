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
 * The NPM pg module doesn't parse all of the returned results as desirect.
 * Hence, there're some cases where we need to do some extra special parsing.
 * Here's an explanation of the changes added at the start of development"
 * 
 * ()   1114 is a datetime type.  There are issues with the PG module wanted to
 *      automatically switch the provided time from UTC to local time.  Hence,
 *      we'll supplant the parser by adding in zero time offset beforee using
 *      the provided parser to get UTC time.
 * 
 * ()   20 is a int8.  Unfortunately, int8 values are turn by NPM PG as strings.
 *      Not very good!  We'll just get PG to create a BigInt before return the
 *      final value.
 * 
 * User this link to get a list of PostgreSQL types and codes:
 * https://jdbc.postgresql.org/documentation/publicapi/constant-values.html
*****/
npmPg.types.setTypeParser(20, function(text) {
    return BigInt(text);
});

const parser1114 = npmPg.types.getTypeParser(1114);
npmPg.types.setTypeParser(1114, function(text) {
    return parser1114(`${text}+0000`);
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
 * The PostgresDbms is the implementation of what's necessry to make Postgres
 * integrate into the Radius framework.  This code provides (1) a method for
 * connecting to a PosgreSQL DBMS given connection settings, and (2) a set of
 * DBMS methods to manage a Postgres DBMS based on the given settings.  These
 * functions are useful in the context of system management and configuration,
 * note in the context of OLTP systems.  OLTP system features are provided by
 * the PostgreSQL connection object.
*****/
singleton('', class PostgresDbms {
    constructor() {
        Dbms.dbmsMap['postgres'] = this;
    }

    async alterColumnSize(settings, tableName, columnName, size) {
    }

    async connect(settings) {
        const pgconn = mkPostgresConnection(settings);
        await pgconn.connect();
        return pgconn;
    }

    convertColumnNameToDbms(columnName) {
        return toPgName(columnName);
    }

    convertDatabaseNameToDbms(databaseName) {
        return databaseName;
    }

    convertIndexNameToDbms(indexName) {
        return toPgName(indexName);
    }

    convertTableNameToDbms(tableName) {
        return toPgName(tableName);
    }

    async createColumn(settings, dbTable, dbColumn) {
        let pgTableName = toPgName(dbTable.getName());
        let pgColumnName = toPgName(dbColumn.getName());
        let pgTypeName = typeMapper.getDbType(dbColumn.getType()).dbTypeName;
        let pg = await mkPostgresConnection(settings).connect();
        await pg.query(`ALTER TABLE ${pgTableName} ADD COLUMN ${pgColumnName} ${pgTypeName}`);
        await pg.close();
    }

    async createDatabase(settings) {
        let dbName = settings.database;
        let pgSettings = Data.clone(settings);
        pgSettings.database = 'postgres';
        let pg = await mkPostgresConnection(pgSettings).connect();
        await pg.query(`CREATE DATABASE ${dbName};`);
        await pg.close();
    }

    async createIndex(settings, dbTable, dbIndex) {
        let columnItems = [];

        for (let columnItem of dbIndex) {
            columnItems.push(`_${TextUtils.toSnakeCase(columnItem.column)} ${columnItem.direction}`);
        }

        let sql = [
            `CREATE INDEX _${TextUtils.toSnakeCase(dbIndex.getName())}`,
            ` on _${TextUtils.toSnakeCase(dbTable.getName())} (${columnItems.join(', ')})`,
        ];

        let pg = await mkPostgresConnection(settings).connect();
        await pg.query(sql.join(''));
        await pg.close();
    }

    async createTable(settings, dbTable) {
        let pgTableName = toPgName(dbTable.getName());
        let sql = [ `CREATE TABLE ${pgTableName} (` ];

        sql.push(dbTable.getColumns().map(column => {
            let columnName = toPgName(column.getName());
            let pgType = typeMapper.getDbType(column.type);
            return `${columnName} ${pgType.dbTypeName}`;

        }).join(','));
        sql.push(')');

        let pg = await mkPostgresConnection(settings).connect();
        await pg.query(sql.join(''));

        for (let index of dbTable.getIndexes()) {
            let columnItems = [];

            for (let columnItem of index) {
                columnItems.push(`_${TextUtils.toSnakeCase(columnItem.column)} ${columnItem.direction}`);
            }

            let sql = [
                `CREATE INDEX _${TextUtils.toSnakeCase(index.getName(dbTable.getName()))}`,
                `on _${TextUtils.toSnakeCase(dbTable.getName())} (${columnItems.join(', ')})`,
            ];

            await pg.query(sql.join(' '));
        }

        if (dbTable.hasPrimaryKey()) {
            let sql = [
                `ALTER TABLE ${pgTableName} ADD PRIMARY KEY`,
                `(${dbTable.getPrimaryKey().map(column => toPgName(column.getName())).join(',')})`
            ];

            await pg.query(sql.join(' '));
        }

        await pg.close();
    }

    async doesDatabaseExist(settings) {
        let dbName = settings.database;
        let pgSettings = Data.clone(settings);
        pgSettings.database = 'postgres';
        let pg = await mkPostgresConnection(pgSettings).connect();
        let result = await pg.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname='${dbName}'`);
        await pg.close();
        return Array.isArray(result) && result.length == 1;
    }

    async doesTableExist(settings, tableName) {
        let pgDbName = settings.database;
        let pgTableName = toPgName(tableName);
        let pg = await mkPostgresConnection(settings).connect();
        let result = await pg.query(`SELECT table_name FROM information_schema.TABLES WHERE table_schema='public' AND table_catalog='${pgDbName}' AND table_name='${pgTableName}'`);
        await pg.close();
        return result.length > 0;
    }

    async dropColumn(settings, tableName, columnName) {
        let pgTableName = toPgName(tableName);
        let pgColumnName = toPgName(columnName);
        let pg = await mkPostgresConnection(settings).connect();
        await pg.query(`ALTER TABLE ${pgTableName} DROP COLUMN ${pgColumnName}`);
        await pg.close();
    }

    async dropDatabase(settings) {
        let dbName = settings.database;
        let pgSettings = Data.clone(settings);
        pgSettings.database = 'postgres';
        let pg = await mkPostgresConnection(pgSettings).connect();
        await pg.query(`DROP DATABASE ${dbName};`);
        await pg.close();
    }

    async dropIndex(settings, indexName) {
        let pgIndexName = toPgName(indexName);
        let pg = await mkPostgresConnection(settings).connect();
        await pg.query(`DROP INDEX ${pgIndexName}`);
        await pg.close();
    }

    async dropTable(settings, tableName) {
        let pgTableName = toPgName(tableName);
        let pg = await mkPostgresConnection(settings).connect();
        await pg.query(`DROP TABLE ${pgTableName}`);
        await pg.close();
    }

    async getDatabaseSchema(settings) {
        let pg = await mkPostgresConnection(settings).connect();
        let schema = await (new PgDatabaseSchema()).load(pg, settings.database);
        await pg.close();
        return schema;
    }

    getDbmsKey(settings) {
        return `${settings.dbmsType}-${settings.host}-${settings.database}`;
    }

    getTypeMapper() {
        return typeMapper;
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

    async delete(dbTable, where) {
        if (where) {
            let sql = [
                `DELETE FROM ${toPgName(dbTable.getName())}`,

                `WHERE ${Object.entries(where).map(entry => {
                    let dbColumn = dbTable.getColumn(entry[0]);
                    let dbType = typeMapper.getDbType(dbColumn.getType());
                    let pgValue = dbType.encode(entry[1]);
                    return `${toPgName(entry[0])}=${pgValue}`;
                }).join(' AND ')}`,
            ];

            await this.query(sql.join(' '));
        }
        else {
            await this.query(`DELETE FROM ${toPgName(dbTable.getName())}`);
        }
    }
    
    async insert(opts) {
        let columnNames = [];
        let columnValues = [];

        for (let key in opts.values) {
            let dbColumn = opts.dbTable.getColumn(key);

            if (dbColumn) {
                let dbType = typeMapper.getDbType(dbColumn.getType());
                columnNames.push(toPgName(dbColumn.getName()));
                columnValues.push(dbType.encode(opts.values[key]));
            }
        }

        let sql = [
            `INSERT INTO ${toPgName(opts.dbTable.getName())}`,
            `(${columnNames.join(',')})`,
            `VALUES (${columnValues.join(',')})`,
        ];

        await this.query(sql.join(' '));
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

    async select(dbTable, where, sort) {
        let sql = [
            `SELECT `,
            dbTable.getColumns().map(column => toPgName(column.getName())).join(','),
            `FROM ${toPgName(dbTable.getName())}`,
        ];

        if (typeof where == 'object' && Object.keys(where).length > 0) {
            sql.push(`WHERE ${Object.entries(where).map(entry => {
                let dbColumn = dbTable.getColumn(entry[0]);
                let dbType = typeMapper.getDbType(dbColumn.getType());
                let pgValue = dbType.encode(entry[1]);
                return `${toPgName(entry[0])}=${pgValue}`
            }).join(' AND ')}`);
        }

        if (typeof sort == 'object' && Object.keys(sort).length > 0) {
            let sorters = [];

            for (let columnName in sort) {
                let value = sort[columnName];

                if (typeof value == 'string' && value.toLowerCase() in { asc:0, desc:0 }) {
                    sorters.push(`${toPgName(columnName)} ${value.toUpperCase()}`);
                }
            }

            sql.push(`ORDER BY ${sorters.join(',')}`);
        }
        
        let result = await this.query(sql.join(' '));

        if (Array.isArray(result)) {
            return result.map(pgRow => {
                let row = {};

                Object.keys(pgRow).forEach(key => {
                    row[fromPgName(key)] = pgRow[key];
                });

                return row;
            });
        }

        return null;
    }

    async startTransaction() {
        await this.query('START TRANSACTION');
        return this;
    }
    
    async update(opts) {
        let set = [];
        let where = [];

        for (let key in opts.values) {
            let dbColumn = opts.dbTable.getColumn(key);

            if (dbColumn) {
                let dbType = typeMapper.getDbType(dbColumn.getType());
                let columnName = dbColumn.getName();
                let dbColumnName = toPgName(columnName);
                let dbValue = dbType.encode(opts.values[key]);

                if (dbColumn.getName() in opts.where) {
                    where.push(`${dbColumnName}=${dbValue}`);
                }
                else {
                    set.push(`${dbColumnName}=${dbValue}`);
                }
            }
        }

        let sql = [
            `UPDATE ${toPgName(opts.dbTable.getName())}`,
            `SET ${set.join(',')}`,
            `WHERE ${where.join(' AND ')}`,
        ];

        await this.query(sql.join(' '));
    }
});


/*****
 * This is the standard PostgreSQL Javascript-to-DBMS type mapper.  One of the
 * more powerful featurs of PostgreSQL is that table columns may contain JSON
 * and arrays of scalar values.  In fact, PostgreSQL is handle a binary array as
 * a column value.  PostgreSQL has a variety of specialized built-in types, not
 * all of which (in fact just a small subject) have an entry in the type mapper.
*****/
const typeMapper = mkDbTypeMapper([
    {
        jsType: BooleanType,
        dbTypeName: 'bool',
        encode: value => value === true ? 'true' : 'false',
        decode: value => value,
    },
    {
        jsType: BufferType,
        dbTypeName: 'bytea',
        encode: value => `E'\\x${value.toString('hex')}'`,
        decode: value => mkBuffer(value),
    },
    {
        jsType: DateType,
        dbTypeName: 'timestamp',
        encode: value => `'${value.toISOString()}'`,
        decode: value => mkTime(value),
    },
    {
        jsType: Float8Type,
        dbTypeName: 'float8',
        encode: value => value.toString(),
        decode: value => value,
    },
    {
        jsType: Float16Type,
        dbTypeName: 'float16',
        encode: value => value.toString(),
        decode: value => bigint(value),
    },
    {
        jsType: Int16Type,
        dbTypeName: 'int2',
        encode: value => value.toString(),
        decode: value => value,
    },
    {
        jsType: Int32Type,
        dbTypeName: 'int4',
        encode: value => value.toString(),
        decode: value => value,
    },
    {
        jsType: Int64Type,
        dbTypeName: 'int8',
        encode: value => value.toString(),
        decode: value => BigInt(value),
    },
    {
        jsType: JsonType,
        dbTypeName: 'json',
        encode: value => `'${escape(toJson(value))}'`,
        decode: value => value,
    },
    {
        jsType: KeyType,
        dbTypeName: 'varchar',
        encode: value => `'${escape(value)}'`,
        decode: value => value,
    },
    {
        jsType: StringType,
        dbTypeName: 'varchar',
        encode: value => `'${escape(value)}'`,
        decode: value => value,
    },
]);


/*****
 * A couple of quick-n-easy utilities needed for converting between the standard
 * Radius database column names and the naming convention we're using on the PG
 * database.  For example, userName => _user_name.  The extra preceeding under-
 * score ensures that our table names won't conflict with reserved words.  Also
 * keep in mind that the preceeding _ is not used for database names.  Hence,
 * these methods don't apply to the database naming convention.
*****/
function toPgName(stdName) {
    return `_${TextUtils.toSnakeCase(stdName)}`
}

function fromPgName(pgName) {
    return TextUtils.toCamelCase(pgName.substring(1));
}


/*****
 * Each DBMS client supported by this framework must be able to load a complete
 * schema definition in the standard form.  The standard form means it matches
 * the schema that's built with the original schema definition.  The primary need
 * for this class is to be able to compare the definition of a schema with what's
 * implemented on the server. The output of such a comparison is used for applying
 * modifications to the implemented schema on the server.
*****/
class PgDatabaseSchema {
    async load(pg, dbName) {
        this.pg = pg;
        let pgDbName = TextUtils.toSnakeCase(dbName);
        let dbSchema = mkDbSchema(dbName);
        let result = await this.pg.query(`SELECT table_name FROM information_schema.TABLES WHERE table_schema='public' AND table_catalog='${pgDbName}' ORDER BY table_name`);
        
        for (let table of result) {
            let dbTable = await this.loadTable(table.table_name);
            dbSchema.setTable(dbTable);
        }

        return dbSchema;
    }
    
    async loadTable(pgTableName) {
        let objId = false;
        let columns = [];
        let indexes = [];
        let primaryKey = [];
        let dbTableName = TextUtils.toCamelCase(pgTableName.substring(1));
        let result = await this.pg.query(`SELECT table_catalog, table_name, column_name, ordinal_position, udt_name FROM information_schema.COLUMNS WHERE table_catalog='${this.pg.settings.database}' AND table_name='${pgTableName}' ORDER BY ordinal_position`);

        for (let column of result) {
            try {
                let columnName = TextUtils.toCamelCase(column.column_name.substring(1));
                columnName == 'objId' ? objId = true : null;
                var jsType = typeMapper.getJsType(column.udt_name);
                columns.push({ name: columnName, type: jsType, size: null });
            }
            catch (e) {}
        }

        result = await this.pg.query(`SELECT X.indexname, I.indnatts, I.indisunique, I.indisprimary, I.indkey, I.indoption FROM pg_indexes AS X JOIN pg_class AS C ON C.relname=X.indexname JOIN pg_index AS I ON I.indexrelid=C.oid WHERE X.tablename='${pgTableName}'`);
        
        for (let row of result) {
            let indkey = row.indkey.split(' ').map(el => parseInt(el));
            let indopt = row.indoption.split(' ').map(el => parseInt(el));

            if (row.indexname.endsWith('_pkey')) {
                for (let i = 0; i < indkey.length; i++) {
                    let columnIndex = indkey[i] - 1;
                    primaryKey.push(columns[columnIndex].name);
                }
            }
            else {
                let columnItems = [];
                
                for (let i = 0; i < indkey.length; i++) {
                    let columnIndex = indkey[i] - 1;
                    columnItems.push({ column: columns[columnIndex].name, direction: indopt[i] ? 'DESC' : 'ASC' });
                }

                indexes.push({ columnItems: columnItems });
            }
        }
        
        return mkDbTable({
            name: dbTableName,
            type: objId ? 'object' : 'simple',
            columns: columns,
            indexes: indexes,
            primaryKey: primaryKey,
        });
    }
}
