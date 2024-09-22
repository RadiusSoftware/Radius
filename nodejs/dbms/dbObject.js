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
 * The DbObject is an infrastructure class for managing database rows as objects.
 * Each DbObject instance has a unique identifier and is stored as such in the
 * DBMS.  Like javascripts builtin Object class, most of the features are provided
 * as static methods, so we don't interface with each instance's own properties
 * or names.  Once on object has been associated with the DBMS, a weak map is
 * used to keep trace of the DBMS connection and the appropriate schema table.
 * Since they are weak maps, disappearing objects will be silently removed from
 * them.  This is pretty much a management / bookeeping class, while the hard
 * core SQL transactions are exeuted by the DMBS-specific connection instance.
*****/
register('', class DbObject {
    static dbTables = new WeakMap();
    static dbConnections = new WeakMap();

    constructor(dbTable, properties) {
        for (let dbColumn of dbTable) {
            let key = dbColumn.getName();

            if (properties && key in properties) {
                this[key] = properties[key];
            }
            else {
                this[key] = dbColumn.getType().getDefault();
            }
        }

        if (dbTable.getType() == 'object') {
            if (!this.objId) {
                this.objId = DbObject.generateId();
            }
        }
    }

    static clone(dbo) {
        let clone = null;
        let dbTable = DbObject.dbTables.get(dbo);

        if (dbTable && typeof dbTable.ctor == 'function') {
            clone = new dbTable.ctor(dbo);
            clone.objId = DbObject.generateId();
        }

        return clone;
    }

    static async delete(dbo) {
        let dbc = DbObject.dbConnections.get(dbo);

        if (dbc) {
            let dbTable = DbObject.dbTables.get(dbo);

            if (dbTable && typeof dbTable.ctor == 'function') {
                await dbc.delete(dbTable, { objId: dbo.objId });
                DbObject.dbTables.delete(dbo);
                DbObject.dbConnections.delete(dbo);
            }
        }
    }

    static async free(...dbo) {
        // TODO ****************************************************************
    }

    static generateId() {
        return Crypto.generateUUID();
    }

    static async get(dbc, dboClass, objId) {
        let dbo = null;
        let records = await dbc.select(dboClass.dbTable, { objId: objId });

        if (records.length) {
            dbo = new dboClass(records[0]);
            DbObject.dbConnections.set(dbo, dbc);
            DbObject.dbTables.set(dbo, dboClass.dbTable);
        }

        return dbo;
    }
    
    static getConnection(dbo) {
        if (DbObject.dbConnections.has(dbo)) {
            return DbObject.dbConnections.get(dbo);
        }

        return null;
    }

    static getTable(dbo) {
        return DbObject.dbTables.get(Reflect.getPrototypeOf(dbo).constructor);
    }
    
    static hasConnection(dbo) {
        DbObject.dbConnections.has(dbo);
    }

    static async insert(dbo, dbc) {
        if (!DbObject.hasConnection(dbo)) {
            if (dbc) {
                DbObject.dbConnections.set(dbo, dbc);
            }
            else {
                return dbo;
            }
        }

        let dbTable = DbObject.getTable(dbo);
        dbc = DbObject.getConnection(dbo);

        await dbc.insert({
            dbTable: dbTable,
            values: dbo,
        });

        return dbo;
    }

    static async isFree(...dbo) {
        // TODO ****************************************************************
    }

    static async lock(...dbo) {
        // TODO ****************************************************************
    }

    static async select(dbc, dboClass, where, order) {
        let records = await dbc.select(dboClass.dbTable, where, order);

        if (records.length) {
            return records.map(record => {
                let dbo = new dboClass(record);
                DbObject.dbConnections.set(dbo, dbc);
                DbObject.dbTables.set(dbo, dboClass.dbTable);
                return dbo;
            });
        }

        return [];
    }

    static async selectOne(dbc, dboClass, where) {
        let dbo = null;
        let records = await dbc.select(dboClass.dbTable, where);

        if (records.length) {
            dbo = new dboClass(records[0]);
            DbObject.dbConnections.set(dbo, dbc);
            DbObject.dbTables.set(dbo, dboClass.dbTable);
        }

        return dbo;
    }

    static async update(dbo) {
        let dbTable = DbObject.getTable(dbo);
        let dbc = DbObject.getConnection(dbo);

        await dbc.update({
            dbTable: dbTable,
            where: { objId: dbo.objId },
            values: dbo,
        });

        return dbo;
    }
});


/*****
 * This is the kicker.  We can define a database object type that's specific for
 * each defiined table in a schema.  We can also assign them to different name-
 * spaces to avoid conflicting names.  This is a wrapper for creating a DbObject
 * instances, which is initialized / created with the details of the specified
 * DBMS table.
*****/
register('', function registerDbObject(ns, dbTable) {
    let className = dbTable.getName()[0].toUpperCase() + dbTable.getName().substring(1);
    let adjustedNS = ns ? `${ns}.` : '';

    eval(`register('${ns}', class Dbo${className} extends DbObject {
        static dbTable = dbTable;

        constructor(properties) {
            super(dbTable, properties);
        }
    });

    register('${ns}', async function deleteDbo${className}(dbc, where) {
        if (where instanceof DbObject) {
            await DbObject.delete(where);
        }
        else if (typeof where == 'string') {
            await dbc.delete(dbTable, { objId: where })
        }
        else {
            await dbc.delete(dbTable, where);
        }
    });

    register('${ns}', async function getDbo${className}(dbc, objId) {
        return await DbObject.get(dbc, ${adjustedNS}Dbo${className}, objId);
    });

    register('${ns}', async function selectDbo${className}(dbc, where, sort) {
        return await DbObject.select(dbc, ${adjustedNS}Dbo${className}, where, sort);
    });

    register('${ns}', async function selectOneDbo${className}(dbc, where, sort) {
        return await DbObject.selectOne(dbc, ${adjustedNS}Dbo${className}, where, sort);
    });
    `);

    let ctor;
    eval(`ctor = ${ns}.Dbo${className}`);
    DbObject.dbTables.set(ctor, dbTable);
    dbTable.ctor = ctor;
});
