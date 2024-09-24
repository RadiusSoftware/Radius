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
*****/
singletonIn(Process.nodeClassController, '', class SettingsManager {
    constructor() {
        this.areas = {};
        mkHandlerProxy(Process, 'SettingsManager', this);
    }

    onClear(message) {
    }

    onDefine(message) {
    }

    onList(message) {
    }

    onSet(message) {
    }

    onUndefine(message) {
    }
});


/*****
*****/
register('', class Settings {
    constructor(schema, values) {
        this.schema = schema;
        this.values = values;
    }

    clear(key) {
        if (key in this.values) {
            this.values[key] = this.schema.get(key).getDefault();
        }

        return this;
    }

    get(key) {
        return this.values[key];
    }

    getDefault(key) {
        return this.schema.get(key).getDefault();
    }

    getType(key) {
        return this.schema.get(key);
    }

    has(key) {
        return this.schema.has(key);
    }

    set(key, value) {
        if (key in this.values) {
            let type = this.schema.get(key);
        }

        return this;
    }

    [Symbol.iterator]() {
        Object.values(this.values)[Symbol.iterator]();
    }
});


/*****
*****/
register('', class SettingsSchema {
    constructor(area, name, schema) {
        this.area = area;
        this.name = name;
        this.items = {};

        if (typeof schema == 'object') {
            for (let key in schema) {
                this.set(key, schema[key]);
            }
        }
    }

    clear(key) {
        delete this.items[key];
        return this;
    }

    get(key) {
        return this.items[key].type;
    }

    getArea() {
        return this.area;
    }

    getDefault(key) {
        return this.items[key].getDefault();
    }

    getName() {
        return this.name;
    }

    has(key) {
        return key in this.items;
    }

    set(key, type) {
        if (typeof key == 'string' && type instanceof BaseType) {
            this.items[key] = { key: key, type: type };
        }

        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.items)[Symbol.iterator]();
    }
});