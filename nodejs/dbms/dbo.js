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
 * The Dbo is an infrastructure class for managing database rows as objects.
 * Each Dbo instance has a unique identifier and is stored as such in the
 * DBMS.  Like javascripts builtin Object class, most of the features are provided
 * as static methods, so we don't interface with each instance's own properties
 * or names.  Once on object has been associated with the DBMS, a weak map is
 * used to keep trace of the DBMS connection and the appropriate schema table.
 * Since they are weak maps, disappearing objects will be silently removed from
 * them.  This is pretty much a management / bookeeping class, while the hard
 * core SQL transactions are exeuted by the DMBS-specific connection instance.
*****/
define(class Dbo {
    static dbTypes = {};
    static dbTables = new WeakMap();
    static unsaved = new WeakMap();

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
        
        if (!this.id) {
            this.id = `${dbTable.prefix.toUpperCase()}:${Crypto.generateUUID().replaceAll('-', '')}`;
            Dbo.unsaved.set(this, this);
        }
    }

    clone() {
        let clone = new (this.getCtor())(this);
        clone.id = `${this.getTable().prefix.toUpperCase()}:${Crypto.generateUUID().replaceAll('-', '')}`;
        Dbo.unsaved.set(clone, clone);
        return clone;
    }

    async delete(dbc) {
        if (!Dbo.unsaved.has(this)) {
            await dbc.delete(this.getTable(), { id: this.id });
        }
        
        return this;
    }

    static async deleteProperty(dbc, id, dotted) {
        let dboObj = await Dbo.get(dbc, id);
        let segments = TextUtils.split(dotted, '.');
        
        if (segments.length > 1) {
            if (dboObj) {
                Data.deleteDotted(dboObj, dotted);

                await dbc.update({
                    dbTable: dboObj.getTable(),
                    where: { id: dboObj.id },
                    values: dboObj }
                );
            }
        }

        return dboObj;
    }

    static async get(dbc, id) {
        let [ prefix, uuid ] = TextUtils.split(id, ':');

        if (prefix && uuid) {
            if (prefix in Dbo.dbTypes) {
                let dbTable = Dbo.dbTypes[prefix];

                if (dbTable) {
                    let records = await dbc.select(dbTable, { id: id });

                    if (records.length) {
                        return new dbTable.ctor(records[0]);
                    }
                }
            }
        }
        
        return null;
    }

    getCtor() {
        return Reflect.getPrototypeOf(this).constructor
    }

    getPrefix() {
        return this.dbTable.prefix;
    }

    static async getProperty(dbc, id, dotted) {
        let dboObj = await Dbo.get(dbc, id);

        if (dboObj) {
            return Data.getDotted(dboObj, dotted);
        }

        return undefined;
    }

    getTable() {
        return Dbo.dbTables[Reflect.getPrototypeOf(this).constructor];
    }

    static async hasObject(dbc, id) {
        let [ prefix, uuid ] = TextUtils.split(id, ':');

        if (prefix && uuid) {
            if (prefix in Dbo.dbTypes) {
                let dbTable = Dbo.dbTypes[prefix];

                if (dbTable) {
                    let records = await dbc.select(dbTable, { id: id });
                    return records.length == 1;
                }
            }
        }
        
        return false;
    }

    static async hasProperty(dbc, id, dotted) {
        let dboObj = await Dbo.get(dbc, id);

        if (dboObj) {
            return Data.hasDotted(dboObj, dotted);
        }

        return false;
    }

    async insert(dbc) {
        if (Dbo.unsaved.has(this)) {
            let dbTable = this.getTable();
            await dbc.insert({ dbTable: dbTable, values: this });
            Dbo.unsaved.delete(this);
        }

        return this;
    }

    static async modify(dbc, id, values) {
        let dboObj = await this.get(dbc, id);

        if (dboObj instanceof Dbo) {
            for (let dotted in values) {
                Data.setDotted(dboObj, dotted, values[dotted]);
            }

            await dboObj.save(dbc)
        }

        return dboObj;
    }

    async save(dbc) {
        if (Dbo.unsaved.has(this)) {
            await this.insert(dbc);
        }
        else {
            await this.update(dbc);
        }

        return this;
    }

    static async select(dbc, dboClass, where, order) {
        let records = await dbc.select(dboClass.dbTable, where, order);
        return records.map(record => new dboClass(record));
    }

    static async selectOne(dbc, dboClass, where) {
        let records = await dbc.select(dboClass.dbTable, where);

        if (records.length) {
            return new dboClass(records[0]);
        }

        return null;
    }

    static async setProperty(dbc, id, dotted, value) {
        let dboObj = await Dbo.get(dbc, id);

        if (dboObj) {
            Data.setDotted(dboObj, dotted, value);

            await dbc.update({
                dbTable: dboObj.getTable(),
                where: { id: dboObj.id },
                values: dboObj }
            );
        }

        return dboObj;
    }

    async update(dbc) {
        if (!Dbo.unsaved.has(this)) {
            await dbc.update({
                dbTable: this.getTable(),
                where: { id: this.id },
                values: this }
            );
        }

        return this;
    }
});


/*****
 * This is the kicker.  We can define a database object type that's specific for
 * each defiined table in a schema.  We can also assign them to different name-
 * spaces to avoid conflicting names.  This is a wrapper for creating a Dbo
 * instances, which is initialized / created with the details of the specified
 * DBMS table.
*****/
define(function defineDbo(ns, dbTable) {
    let ctor;
    let className = dbTable.getName()[0].toUpperCase() + dbTable.getName().substring(1);
    let adjustedNS = ns ? `${ns}.` : '';

    eval(`
    let namespace = mkNamespace('${adjustedNS}');

    namespace.define(class Dbo${className} extends Dbo {
        static dbTable = dbTable;

        constructor(properties) {
            super(dbTable, properties);
        }
    });

    ctor = namespace.get('Dbo${className}');
    `);
    
    dbTable.ctor = ctor;
    Dbo.dbTables[ctor] = dbTable;
    Dbo.dbTypes[dbTable.prefix] = dbTable;
});
