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
 * The database schema object provides a repository of the logical schema data
 * for a logical scherma.  The schema may represent a DBMS-specific schema or
 * it can be logical and will be converted to a DBMS-specific schema via the
 * Radius server framework. A schema primarily managres a set of table schemas.
 * With the DBMS-specific code, which is wrapped in the Dbms singleton, one can
 * use the schema to generate all of the tables and indexes necessary to support
 * an application server.
*****/
register('', class DbSchema {
    constructor(arg) {
        this.name = '';
        this.tableArr = [];
        this.tableMap = {};

        if (typeof arg == 'object') {
            this.name = arg.name;

            for (let table of arg.tables) {
                let dbTable = mkDbTable(table);
                this.tableArr.push(dbTable);
                this.tableMap[dbTable.getName()] = dbTable;
            }
        }
        else if (typeof arg == 'string') {
            this.name = arg;
        }
    }

    addTable(table) {
        this.tableArr.push(table.getName());
        this.tableMap[table.getName()] = table;
        return this;
    }

    getName() {
        return this.name;
    }

    getTable(tableName) {
        return this.tableMap[tableName];
    }

    getTableAt(index) {
        return this.tableArr[index];
    }

    getTables() {
        return this.tableArr;
    }

    hasTable(tableName) {
        return tableName in this.tableMap;
    }

    removeTable(tableName) {
        let table = this.tableMap[tableName];

        if (table) {
            delete this.tableArr[tableName];

            for (let i = 0; i < this.tableArr.length; i++) {
                if (Object.is(table, this.tableArr[i])) {
                    this.tableArr.splice(i, 1);
                    break;
                }
            }
        }

        return this;
    }

    setName(name) {
        this.name = name;
        return this;
    }

    [Symbol.iterator]() {
        return this.tableArr[Symbol.iterator]();
    }

    toJso() {
        return {
            name: this.name,
            tables: this.tableArr.map(table => table.toJso()),
        };
    }

    toJson() {
        return toJson(this.toJso());
    }
});


/*****
 * The DbTable is the schema object used for representing relational DBMS table
 * in a logical manner.  The DbTable contains columns and indexes, which is the
 * primary driver of DBMS constructus.  The DbTable may be made with either a
 * javascript object as a single parameter or may be programmtically made with
 * a series of method invokations on newly constructed DbTable objects.
*****/
register('', class DbTable {
    constructor(arg) {
        this.name = '';
        this.columnArr = [];
        this.columnMap = {};
        this.indexArr = [];
        this.indexMap = {};

        if (typeof arg == 'string') {
            try {
                arg = fromJson(arg);
            }
            catch (e) {
                this.name = typeof name == 'string' ? name : '';
                return;
            }
        }

        if (typeof arg == 'object') {
            this.name = arg.name;

            if (Array.isArray(arg.columns)) {
                for (let column of arg.columns) {
                    this.addColumn(mkDbColumn(column.name, column.type, column.size));
                }
            }

            if (Array.isArray(arg.indexes)) {
                for (let index of arg.indexes) {
                    this.addIndex(mkDbIndex(index));
                }
            }
        }
    }

    addColumn(column) {
        this.columnArr.push(column);
        this.columnMap[column.getName()] = column;
        return this;
    }

    addIndex(index) {
        this.indexArr.push(index);
        this.indexMap[index.getName()] = index;
    }

    getColumn(columnName) {
        return this.columnMap[columnName];
    }

    getColumnAt(index) {
        return this.columnArr[index];
    }

    getColumnCount() {
        return this.columnArr.length;
    }

    getColumns() {
        return this.columnArr;
    }

    getIndex(indexName) {
        return this.indexMap[indexName];
    }

    getIndexAt(index) {
        return this.indexArr[index];
    }

    getIndexeCount() {
        return this.indexArr.length;
    }

    getIndexes() {
        return this.indexArr;
    }

    getName() {
        return this.name;
    }

    removeColumn(columnName) {
        let column = this.columnMap[columnName];

        if (column) {
            for (let i = 0; i < this.columnArr.length; i++) {
                if (Object.is(column, this.columnArr[i])) {
                    this.columnArr.splice(i, 1);
                    delete this.columnMap[columnName];
                    return this;
                }
            }
        }

        return this;
    }

    removeColumnAt(index) {
        let column = this.columnArr[index];
        delete this.columnMap[column.getName()];
        this.columnArr.splice(i, 1);
        return this;
    }

    removeIndex(indexName) {
        let index = this.indexMap[indexName];

        if (index) {
            for (let i = 0; i < this.indexArr.length; i++) {
                if (Object.is(index, this.indexArr[i])) {
                    this.indexArr.splice(i, 1);
                    delete this.indexMap[indexName];
                    return this;
                }
            }
        }

        return this;
    }

    removeIndexAt(indexIndex) {
        let index = this.indexArr[indexIndex];
        delete this.indexMap[index.getName()];
        this.indexArr.splice(i, 1);
        return this;
    }

    setName(name) {
        this.name = name;
        return this;
    }

    [Symbol.iterator]() {
        return this.columnArr[Symbol.iterator]();
    }

    toJso() {
        return {
            name: this.name,
            columns: this.columnArr.map(column => column.toJso()),
            indexes: this.indexArr.map(index => index.toJso()),
        };
    }

    toJson() {
        return toJson(this.toJso());
    }
});


/*****
 * The functional wrap of the data necessary to express a DBMS column as prt of
 * the definition of a DBMS table: name, type, and size.  Name is the camel case
 * name of the table, which may be translated by the DBMS module to something
 * similar.  For instance, "userInfo" is translated into PostgreSQL to _user_info.
 * Each DBMS module will take care of the naming convensions for their own tables.
 * Morover, the type provided is a javascript type in the from of a BaseType.
 * Finally, the size is generally an aggregate size for a type such as a varchar.
 * In PostgreSQL, the varchar[size] is ignored because it's not necessary.
*****/
register('', class DbColumn {
    constructor(name, type, size) {
        this.name = typeof name == 'string' ? name : '';
        this.type = type instanceof BaseType ? type : NullType;
        this.size = typeof size == 'number' ? size : 0;
    }

    getName() {
        return this.name;
    }

    getSize() {
        return this.size;
    }

    getType() {
        return this.type;
    }

    getTypeName() {
        return this.type.constructor.name;
    }

    setName(name) {
        if (typeof name == 'string') {
            this.name = name;
        }

        return this;
    }

    setSize(size) {
        if (typeof size == 'number') {
            this.size = sie;
        }

        return this;
    }

    setType(type) {
        if (type instanceof BaseType) {
            this.type = type;
        }

        return this;
    }

    toJso() {
        return {
            name: this.name,
            type: this.type,
            size: this.size,
        };
    }

    toJson() {
        return toJson({
            name: this.name,
            type: this.type.constructor.name,
            size: this.size,
        });
    }
});


/*****
 * The logical representation of a table's index object.  It's primarily an array
 * of column items, which are the combination of column name and a direction,
 * which is either ASC or DESC.  If you wish to generate an index name, call the
 * getName() method to generate a unique name for the index based on the content
 * of the index's entire array of items.
*****/
register('', class DbIndex {
    constructor(columnItems) {
        this.columnItems = [];
        
        if (Array.isArray(columnItems)) {
            for (let columnItem of columnItems) {
                this.addColumnItem(columnItem.column, columnItem.direction);
            }
        }
    }

    addColumnItem(column, direction) {
        if (typeof column == 'string') {
            if (direction.toUpperCase() in { ASC:0, DESC:0 }) {
                this.columnItems.push({ column: column, direction: direction.toUpperCase() });
            }
        }

        return this;
    }

    getName() {
        return this.columnItems.map(columnItem => columnItem.column).join('_');
    }

    insertColumnItemAfter(column, direction, index) {
        if (typeof column == 'string') {
            if (direction.toUpperCase() in { ASC:0, DESC:0 }) {
                this.columnItems.splice(index, 0, { column: column, direction: direction.toUpperCase() });
            }
        }

        return this;
    }

    insertColumnItemBefore(column, direction, index) {
        if (typeof column == 'string') {
            if (direction.toUpperCase() in { ASC:0, DESC:0 }) {
                this.columnItems.splice(index - 1, 0, { column: column, direction: direction.toUpperCase() });
            }
        }

        return this;
    }

    removeColumnItem(column) {
        for (let i = 0; i < this.columnItems.length; i++) {
            if (this.columnItems[i].column === column) {
                this.columnItems.splice(i, 1);
                break;
            }
        }

        return this;
    }

    removeColumnItemAt(index) {
        this.columnItems.splice(index, 1);
        return this;
    }

    [Symbol.iterator]() {
        return this.columnItems[Symbol.iterator]();
    }

    toJso() {
        return this.columnItems.map(columnItem => {
            return {
                column: column,
                direction: direction,
            };
        });
    }

    toJson() {
        return toJson(this.toJso(this.toJso()));
    }
});


/*****
 * The DbTypeMapper must be provided by each DBMS implementation.  It's a
 * register of how the database types map to one of our global BaseTypes, which
 * is referred to as the js or javascript type.  Each type provides type name
 * mapping as well as an encode() and decoder() function saving and selecting
 * data.
*****/
register('', class DbTypeMapper {
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

    getTypeFromDb(dbTypeName) {
        return this.byDbType[dbTypeName];
    }

    getTypeFromJs(jsType) {
        return this.byJsType[jsType.constructor.name];
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