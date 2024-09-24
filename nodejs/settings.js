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

    async onClear(message) {
    }

    async onDefine(message) {
        console.log(message);
    }

    async onDeregister(message) {
    }

    async onList(message) {
    }

    async onRegister(message) {
    }

    async onSet(message) {
    }

    async onUndefine(message) {
    }
});


/*****
*****/
register('', class Settings {
    constructor(area, name, schema) {
        this.setKey(area, name);
        this.nodeTree = mkNodeTree();

        if (Array.isArray(items)) {
            for (let item of items) {
                this.setItem('', item);
            }
        }
    }
    clearItem(path) {
        //  TODO *******************************************
        delete this.items[key];
        return this;
    }

    getArea() {
        return this.area;
    }

    getDefault(path) {
        //  TODO *******************************************
    }

    getItem(path) {
        //  TODO *******************************************
    }

    getName() {
        return this.name;
    }

    getValue(path) {
        //  TODO *******************************************
    }

    hasItem(path) {
        //  TODO *******************************************
    }

    async refresh() {
        //  TODO *******************************************
        return this;
    }

    async setArea(area) {
        this.area = area;
        return this;
    }

    setItem(path, item) {
        //  TODO *******************************************
        return this;
    }

    async setName(name) {
        this.name = name;
        return this;
    }

    [Symbol.iterator]() {
        //  TODO *******************************************
    }

    async update() {
        //  TODO *******************************************
        return this;
    }
});


/*****
*****/
register('', class SettingsObject {
    constructor(schema) {
        this.parent = null;
    }

    getPath() {
    }

    remove() {
    }
});


/*****
*****/
register('', class SettingsArray {
    constructor(schema) {
        this.parent = null;
    }

    getPath() {
    }

    remove() {
    }
});


/*****
*****/
register('', class SettingsScalar {
    constructor(schema) {
        this.parent = null;
    }

    getPath() {
    }

    remove() {
    }
});