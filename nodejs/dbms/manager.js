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
 * An object, whose constructor generates a differential analysis of two schemas:
 * schema1 is the baseline or current schema, while schema 2 is the new or target
 * schema.  It returns an array of zero or more "diffs".  A diff is either a
 * missing table, extra table or elements that specify the differences between
 * the two tables.
*****/
register('', class SchemaAnalysis {
    constructor(dbSchema1, dbSchema2) {
        this.dbSchema1 = dbSchema1;
        this.dbSchema2 = dbSchema2;
        this.diffs = [];
        this.analyzeTables();
    }

    analyzeTables() {
        for (let dbTable1 of this.dbSchema1) {
            if (this.dbSchema2.hasTable(dbTable1.getName())) {
                mkTableAnalysis(
                    dbTable1,
                    this.dbSchema2.getTable(dbTable1.getName()),
                    this,
                );
            }
            else {
                this.diffs.push({
                    level: 'schema',
                    schema1: this.dbSchema1,
                    schema2: this.dbSchema2,
                    type: 'extra-table',
                    table1: dbTable1,
                    table2: null,
                });
            }
        }

        for (let dbTable2 of this.dbSchema2) {
            if (!this.dbSchema1.hasTable(dbTable2.getName())) {
                this.diffs.push({
                    level: 'schema',
                    schema1: this.dbSchema1,
                    schema2: this.dbSchema2,
                    type: 'missing-table',
                    table1: null,
                    table2: dbTable2,
                });
            }
        }
    }

    getDiffs() {
        return this.diffs;
    }

    getSchema1() {
        return this.dbSchema1;
    }

    getSchema2() {
        return this.dbSchema2;
    }

    [Symbol.iterator]() {
        return this.diffs[Symbol.iterator]();
    }
});


/*****
 * An object, whose constructor generates a differential analysis of two tables:
 * table1 is the baseline or current schema, while table2 is the new or target
 * schema.  It returns an array of zero or more "diffs".  Diffs may be one of the
 * following: missing column, extra column, mismatch colum, missing index or an
 * extra index.
*****/
register('', class TableAnalysis {
    constructor(dbTable1, dbTable2, schemaAnalysis) {
        this.table1 = dbTable1;
        this.table2 = dbTable2;
        this.schemaAnalysis = schemaAnalysis;
        this.diffs = [];
        this.analyzeColumns();
        this.analyzeIndexes();
    }

    analyzeColumn(dbColumn1, dbColumn2) {
        if (dbColumn1.getTypeName() != dbColumn2.getTypeName()) {
            if (dbColumn1.hasSize() && dbColumn2.hasSize && dbColumn1.getSize() != dbColumn2.getSize()) {
                this.setDiff({
                    level: 'table',
                    table1: this.table1,
                    table2: this.table2,
                    type: 'type-mismatch',
                    column1: dbColumn1,
                    column2: dbColumn2,
                });
            }
        }
        else if (dbColumn1.getType() == StringType) {
            if (dbColumn1.hasSize() && dbColumn2.hasSize && dbColumn1.getSize() != dbColumn2.getSize()) {
                this.setDiff({
                    level: 'table',
                    table1: this.table1,
                    table2: this.table2,
                    type: 'size-mismatch',
                    column1: dbColumn1,
                    column2: dbColumn2,
                });
            }
        }

        return this;
    }

    analyzeColumns() {
        for (let dbColumn of this.table1) {
            if (dbColumn.getName() in this.table2.columnMap) {
                this.analyzeColumn(dbColumn, this.table2.getColumn(dbColumn.getName()));
            }
            else {
                this.setDiff({
                    level: 'table',
                    table1: this.table1,
                    table2: this.table2,
                    type: 'extra-column',
                    column1: dbColumn,
                    column2: null,
                });
            }
        }

        for (let dbColumn of this.table2.columnArr) {
            if (!(dbColumn.getName() in this.table1.columnMap)) {
                this.setDiff({
                    level: 'table',
                    table1: this.table1,
                    table2: this.table2,
                    type: 'missing-column',
                    column1: null,
                    column2: dbColumn,
                });
            }
        }

        return this;
    }

    analyzeIndexes() {
        let indexSet1 = this.table1.getIndexSet();
        let indexSet2 = this.table2.getIndexSet();

        for (let indexName of indexSet1) {
            if (!(indexSet2.has(indexName))) {
                this.setDiff({
                    level: 'table',
                    table1: this.table1,
                    table2: this.table2,
                    type: 'extra-index',
                    indexName: indexName,
                });
            }
        }

        for (let indexName of indexSet2) {
            if (!(indexSet1.has(indexName))) {
                this.setDiff({
                    level: 'table',
                    table1: this.table1,
                    table2: this.table2,
                    type: 'missing-index',
                    index: this.table2.getIndex(indexName),
                });
            }
        }
    }

    getDiffs() {
        return this.diffs;
    }

    getTable1() {
        return this.table1;
    }

    getTable2() {
        return this.table2;
    }

    setDiff(diff) {
        this.diffs.push(diff);

        if (this.schemaAnalysis instanceof SchemaAnalysis) {
            this.schemaAnalysis.diffs.push(diff);
        }

        return this;
    }

    [Symbol.iterator]() {
        return this.diffs[Symbol.iterator]();
    }
});


/*****
 * This is simply an API or singleton whose task is apply changes to the schema
 * as specified by the provided DBMS object.  The reason for the two functions,
 * which perform almost identical features is to filter out which diffs can be
 * processed.  One method will add items, while the other, downgrade(), removes
 * abandoned DBMS objects.  Upgrading needs to occur when required by a new
 * software release.  Downgrades should be applied only after you are certain
 * those DMBS objects are no longer required.
*****/
singleton('', class SchemaUpdater {
    async downgrade(settings, diff) {
        if (diff.type == 'extra-table') {
            await Dbms.dropTable(settings, diff.table1.getName());
        }
        else if (diff.type == 'extra-column') {
            await Dbms.dropColumn(settings, diff.table1.getName(), diff.column1.getName());
        }
        else if (diff.type == 'size-mismatch') {
            if (diff.column1.getSize() > diff.column2.getSize()) {
                await Dbms.alterColumnSize(diff.table.getName(), diff.column.getName(), diff.column2.getSize());
            }
        }
        else if (diff.type == 'extra-index') {
            await Dbms.dropIndex(settings, diff.indexName);
        }

        return this;
    }

    async upgrade(settings, diff) {
        if (diff.type == 'missing-table') {
            await Dbms.createTable(settings, diff.table2);
        }
        else if (diff.type == 'missing-column') {
            await Dbms.createColumn(settings, diff.table1, diff.column2);
        }
        else if (diff.type == 'size-mismatch') {
            if (diff.column1.getSize() < diff.column2.getSize()) {
                await Dbms.alterColumnSize(diff.table.getName(), diff.column.getName(), diff.column2.getSize());
            }
        }
        else if (diff.type == 'missing-index') {
            await Dbms.createIndex(settings, diff.table1, diff.index);
        }

        return this;
    }
});
