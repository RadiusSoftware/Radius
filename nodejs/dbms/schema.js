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
 * FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE
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
define(class DbSchema {
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

    clearTable(tableName) {
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

    setName(name) {
        this.name = name;
        return this;
    }

    setTable(dbTable) {
        this.tableArr.push(dbTable);
        this.tableMap[dbTable.getName()] = dbTable;
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
define(class DbTable {
    constructor(arg) {
        this.name = '';
        this.columnArr = [];
        this.columnMap = {};
        this.indexArr = [];
        this.indexMap = {};
        this.primaryKey = [];
        this.prefix = 'prefix' in arg ? arg.prefix : '';

        if (typeof arg == 'string') {
            try {
                arg = fromJson(arg);
            }
            catch (e) {
                this.name = typeof name == 'string' ? name : '';
                return;
            }
        }

        this.name = arg.name;

        if (arg.type in { object:0 }) {
            this.type = arg.type;
        }
        else {
            this.type = 'simple';
        }

        if (arg.type == 'object') {
            this.setColumn(mkDbColumn({ name: 'id', type: StringType, size: 50 }));
            this.setPrimaryKey('id');
        }

        if (Array.isArray(arg.columns)) {
            for (let columnDefinition of arg.columns) {
                this.setColumn(mkDbColumn(columnDefinition));
            }
        }

        if (Array.isArray(arg.indexes)) {
            for (let indexDefinition of arg.indexes) {
                let dbIndex = mkDbIndex(this, indexDefinition);

                if (dbIndex.checkColumn(this)) {
                    this.setIndex(dbIndex);
                }
            }
        }

        if (arg.type != 'object') {
            if (Array.isArray(arg.primaryKey) && arg.primaryKey.length > 0) {
                this.setPrimaryKey(...arg.primaryKey);
            }
        }
    }

    checkIndex(dbIndex) {
        return dbIndex.check(this);
    }

    clearColumn(columnName) {
        let dbColumn = this.columnMap[columnName];

        if (dbColumn) {
            for (let i = 0; i < this.columnArr.length; i++) {
                if (Object.is(dbColumn, this.columnArr[i])) {
                    this.columnArr.splice(i, 1);
                    delete this.columnMap[columnName];

                    for (let dbIndex of this.enumerateColumnIndexes(dbColumn)) {
                        this.clearIndex(dbIndex);
                    }

                    return this;
                }
            }
        }

        return this;
    }

    clearColumnAt(index) {
        let dbColumn = this.columnArr[index];
        delete this.columnMap[dbColumn.getName()];
        this.columnArr.splice(i, 1);

        for (let dbIndex of this.enumerateColumnIndexes(dbColumn)) {
            this.clearIndex(dbIndex);
        }

        return this;
    }

    clearIndex(indexName) {
        let dbIndex = this.indexMap[indexName];

        if (dbIndex) {
            for (let i = 0; i < this.indexArr.length; i++) {
                if (Object.is(dbIndex, this.indexArr[i])) {
                    this.indexArr.splice(i, 1);
                    delete this.indexMap[indexName];
                    return this;
                }
            }
        }

        return this;
    }

    clearIndexAt(indexIndex) {
        let index = this.indexArr[indexIndex];
        delete this.indexMap[indexIndex];
        this.indexArr.splice(i, 1);
        return this;
    }

    clearPrimaryKey() {
        this.primaryKey = [];
        return this;
    }

    enumerateColumnIndexes(dbColumn) {
        let indexes = [];

        for (let dbIndex of this.indexes) {
            for (let columnItem of dbIndex.columnItems) {
                if (column.column == dbColumn.name) {
                    indexes.push(dbIndex);
                    break;
                }
            }
        }

        return indexes;
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

    getIndexEnum() {
        return mkRdsEnum(...this.indexArr.map(dbIndex => dbIndex.getName()));
    }

    getName() {
        return this.name;
    }

    getPrefix() {
        return this.prefix;
    }

    getPrimaryKey() {
        return Data.copy(this.primaryKey);
    }

    getType() {
        return this.type;
    }

    hasPrimaryKey() {
        return this.primaryKey.length > 0;
    }

    setColumn(dbColumn) {
        this.columnArr.push(dbColumn);
        this.columnMap[dbColumn.getName()] = dbColumn;
        return this;
    }

    setColumnAt(dbColumn, index) {
        this.columnArr.splice(index, 1, dbColumn);
        this.columnMap[dbColumn.getName()] = dbColumn;
        return this;
    }

    setIndex(dbIndex) {
        this.indexArr.push(dbIndex);
        this.indexMap[dbIndex.getName()] = dbIndex;
        return this;
    }

    setIndexAt(dbIndex, index) {
        this.indexArr.splice(index, 1, dbIndex);
        this.indexMap[dbIndex.getName()] = dbIndex;
        return this;
    }

    setName(name) {
        this.name = name;
        return this;
    }

    setPrimaryKey(...columns) {
        this.primaryKey = [];

        for (let column of columns) {
            if (typeof column == 'string') {
                if (column in this.columnMap) {
                    this.primaryKey.push(this.columnMap[column]);
                }
            }
            else if (column instanceof DbColumn) {
                if (column.getName() in this.columnMap) {
                    this.primaryKey.push(column);
                }
            }
        }

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
define(class DbColumn {
    constructor(columnDefinition) {
        this.name = typeof columnDefinition.name == 'string' ? columnDefinition.name : '';
        this.type = columnDefinition.type instanceof BaseType ? columnDefinition.type : NullType;
        this.size = typeof columnDefinition.size == 'number' ? columnDefinition.size : 0;
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

    hasSize() {
        return typeof this.size == 'number' && this.size > 0;
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
define(class DbIndex {
    constructor(dbTable, indexDefinition) {
        this.dbTable = dbTable;
        this.columnItems = [];
        
        if (Array.isArray(indexDefinition.columnItems)) {
            for (let columnItem of indexDefinition.columnItems) {
                this.setColumnItem(columnItem);
            }
        }
    }

    checkColumn(table) {
        for (let columnItem of this.columnItems) {
            if (!(columnItem.column in table.columnMap)) {
                return false;
            }
        }

        return true;
    }

    clearColumnItem(column) {
        for (let i = 0; i < this.columnItems.length; i++) {
            if (this.columnItems[i].column === column) {
                this.columnItems.splice(i, 1);
                break;
            }
        }

        return this;
    }

    clearColumnItemAt(index) {
        this.columnItems.splice(index, 1);
        return this;
    }

    getName() {
        let nameParts = [ this.dbTable.getName() ];

        for (let columnItem of this.columnItems) {
            nameParts.push(
                columnItem.column[0].toUpperCase() +
                columnItem.column.substring(1) +
                columnItem.direction[0].toUpperCase() +
                columnItem.direction.substring(1).toLowerCase()
            );
        }

        return nameParts.join('');
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

    setColumnItem(columnItem) {
        if (typeof columnItem.direction == 'stirng') {
            let direction = columnItem.direction.toUpperCase();

            if (direction in { ASC:0, DESC:0 }) {
                this.columnItems.push({ column: columnItem.column, direction: direction });
            }
            else {
                this.columnItems.push({ column: columnItem.column, direction: 'ASC' });
            }
        }
        else {
            this.columnItems.push({ column: columnItem.column, direction: 'ASC' });
        }

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
