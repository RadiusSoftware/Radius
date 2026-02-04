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
singleton(class Dbms {
    constructor() {
        this.dbmsMap = {};
        this.dbmsPools = {};
        this.settingsHandle = mkSettingsHandle();

        this.settingsShape = mkRdsShape({
            dbmsType: StringType,
            timeout: NumberType,
            host: StringType,
            port: NumberType,
            database: StringType,
            username: StringType,
            password: StringType,
        });
    }

    async alterColumnSize(settings, tableName, columnName, size) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.alterColumnSize(settings, tableName, columnName, size);
        }
    }

    async clearSettings(name) {
        let settingName = name ? `##DBMS##${name}` : '##DBMS##RADIUS';
        await this.settingsHandle.deleteSetting(settingName);
        return this;
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

    convertColumnNameToDbms(settings, columnName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return dbms.convertColumnNameToDbms(columnName);
        }
    }

    convertDatabaseNameToDbms(settings, databaseName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return dbms.convertColumnNameToDbms(databaseName);
        }
    }

    convertIndexNameToDbms(settings, indexName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return dbms.convertColumnNameToDbms(indexName);
        }
    }

    convertTableNameToDbms(settings, tableName) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return dbms.convertColumnNameToDbms(tableName);
        }
    }

    async createColumn(settings, dbTable, dbColumn) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.createColumn(settings, dbTable, dbColumn);
        }
    }

    createConnectionKey(settings) {
        if (ObjectType.is(settings)) {
            let normalized = {
                dbmsType: settings.dbmsType,
                timeout: settings.timeout,
                host: settings.host,
                port: settings.port,
                database: settings.database,
                username: settings.username,
                password: settings.password,
            };

            return toJson(normalized);
        }

        return 'undefined';
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

    async dropDatabase(settings) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return await dbms.dropDatabase(settings);
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

    async getSettings(name) {
        let settingName = name ? `##DBMS##${name}` : '##DBMS##RADIUS';
        return await this.settingsHandle.getSetting(settingName);
    }

    getTypeMapper(settings) {
        let dbms = this.getDbms(settings);

        if (dbms) {
            return dbms.getTypeMapper();
        }
    }

    async hasSettings(name) {
        let settingName = name ? `##DBMS##${name}` : '##DBMS##RADIUS';
        return await this.settingsHandle.hasSetting(settingName);
    }

    isSupported(dbmsType) {
        return dbmsType in this.dbms;
    }

    async listSettings() {
        let settings = {};

        for (let setting of await this.settingsHandle.listFilteredSettings({ category: 'dbms' })) {
            let dbmsSettingName = setting.name.substring(8);
            settings[dbmsSettingName] = setting.value;
        }

        return settings;
    }

    listSupportedDbmsTypes() {
        return Object.keys(this.dbms);
    }

    async setSettings(name, settings) {
        if (typeof name == 'string') {
            let settingName = `##DBMS##${name}`;

            if (await this.settingsHandle.hasSetting(settingName)) {
                await this.settingsHandle.setSetting(settingName, settings);
            }
            else {
                await this.settingsHandle.defineSetting(
                    settingName,
                    'dbms',
                    this.settingShape,
                    settings,
                );
            }

        }
        else {
            let settingName = '##DBMS##RADIUS';

            if (!(await this.settingsHandle.hasSetting(settingName))) {
                await this.settingsHandle.defineTemporarySetting(
                    settingName,
                    'dbms',
                    this.settingShape,
                    name,
                );
            }
        }
        
        return this;
    }
});


/*****
 * A convenience function that's globally available in all processes. When called
 * with no arguments, the default or radius DBMS is used for establishing the
 * connection.  Th is essentially the API function that developers required for
 * connecting to and running queries against databases.
*****/
define(async function dbConnect(dbmsSettings) {
    let dbconn;

    if (ObjectType.is(dbmsSettings)) {
        dbconn = await Dbms.connect(dbmsSettings);
    }
    else if (typeof dbmsSettings == 'string') {
        if (await Dbms.hasSettings(dbmsSettings)) {
            dbconn = await Dbms.connect(await Dbms.getSettings(dbmsSettings));
        }
        else {
            throw mkFailure(`Dbms settings "${dbmsSettings}" are unavailable.`);
        }
    }
    else if (await Dbms.hasSettings()) {
        dbconn = await Dbms.connect(await Dbms.getSettings());
    }
    else {
        throw mkFailure(`No suitable available database settings available.`);
    }

    return dbconn
});


/*****
 * A convenience function that's globally available in all processes. When called,
 * it opens a DBMS connection based on the settings or lack thereof, and then
 * execute the provided sql.  Note that sql must written to be DBMS specific. If
 * appropriate, a generic SQL object may be provided instead of hard coded SQL
 * statements.
*****/
define(async function eazy(func, settings) {
    let dbc = null;
    let result = null;

    try {
        dbc = await dbConnect(settings);
        result = await func(dbc);
    }
    catch (e) {}
    finally {
        if (dbc) {
            await dbc.close();
        }

        return result;
    }
});


/*****
 * A convenience function that's globally available in all processes. When called,
 * it opens a DBMS connection based on the settings or lack thereof, and then
 * execute the provided sql.  Note that sql must written to be DBMS specific. If
 * appropriate, a generic SQL object may be provided instead of hard coded SQL
 * statements.
*****/
define(async function eazySQL(sql, settings) {
    let dbc = null;
    let result = null;

    try {
        dbc = await dbConnect(settings);
        result = await dbc.query(sql);
    }
    catch (e) {}
    finally {
        if (dbc) {
            await dbc.close();
        }

        return result;
    }
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
define(class DbmsConnection {
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

    async delete(dbTable, where) {
        await this.connection.delete(dbTable, where);
        return this;
    }

    async free() {
        if (Pool.poolKey in this) {
            await this[Pool.poolKey].pool.free(this);
        }

        return null;
    }

    getDbms() {
        return this.dbms;
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

    async insert(opts) {
        await this.connection.insert(opts);
        return this;
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

    async select(dbTable, where, sort) {
        return await this.connection.select(dbTable, where, sort);
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

    async update(opts) {
        await this.connection.update(opts);
        return this;
    }
});


/*****
 * The DbTypeMapper must be provided by each DBMS implementation.  It's a
 * register of how the database types map to one of our global BaseTypes, which
 * is referred to as the js or javascript type.  Each type provides type name
 * mapping as well as an encode() and decoder() function saving and selecting
 * data.
*****/
define(class DbTypeMapper {
    constructor(types) {
        this.byDbType = {};
        this.byJsType = {};

        if (Array.isArray(types)) {
            for (let typeObject of types) {
                this.addType(typeObject);
            }
        }
    }

    addType(typeObject) {
        if (typeObject.jsType instanceof BaseType) {
            if (typeof typeObject.dbTypeName == 'string') {
                if (typeof typeObject.encode == 'function') {
                    if (typeof typeObject.decode == 'function') {
                        let entry = {
                            jsType: typeObject.jsType,
                            jsTypeName: typeObject.jsType.constructor.name,
                            dbTypeName: typeObject.dbTypeName,
                            encode: typeObject.encode,
                            decode: typeObject.decode,
                        };

                        this.byDbType[entry.dbTypeName] = entry;
                        this.byJsType[entry.jsTypeName] = entry;
                    }
                }
            }
        }

        return this;
    }

    getDbType(jsType) {
        return this.byJsType[jsType.constructor.name];
    }

    getJsType(dbTypeName) {
        return this.byDbType[dbTypeName];
    }

    getType(jsType) {
        return this.byJsType[jsType.getName()];
    }

    removeDbType(dbtypeName) {
        if (type instanceof BaseType) {
            let typeName = BaseType.constructor.name;

            if (typeName in this.byDbType) {
                let typeObject = this.byDbType[typeName];
                delete this.byDbType[typeName];
                delete this.byJsType[typeObject.jsType];
            }
        }

        return this;
    }

    removeJsType(jsType) {
        if (jsType instanceof BaseType) {
            let typeName = jsType.constructor.name;

            if (typeName in this.byDbType) {
                let typeObject = this.byDbType[typeName];
                delete this.byDbType[typeName];
                delete this.byJsType[typeObject.jsTypeName];
            }
        }
        else if (typeof jsType == 'string') {
            if (jsType in this.byDbType) {
                let typeObject = this.byDbType[jsType];
                delete this.byDbType[jsType];
                delete this.byJsType[typeObject.jsTypeName];
            }
        }

        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.types);
    }
});
