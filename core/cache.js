/*****
 * Copyright (c) 2023 Radius Software
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
 * A cache is a data storage object that notifies listeners when it's been
 * modified.  This makes the cache a nexux for communications between some sort
 * of algorithm, a background task, or an asyncronous event and other objects
 * that are handling those events as they occur.  There are two types of Cache
 * aggregates: ObjectCache and ArrayCache.  Each of these classes have been
 * written to work with the underlying data aggregate type.
*****/
register('', class ObjectCache extends Emitter {
    constructor() {
        super();
        this.properties = {};
    }

    clear(key) {
        if (typeof key == 'string') {
            if (key in this.properties) {
                let previousValue = this.properties[key];
                delete this.properties[key];

                this.send({
                    name: 'CacheUpdate',
                    type: 'CLEARED',
                    sender: this,
                    property: key,
                    previousValue: previousValue,
                });
            }
        }

        return this;
    }

    get(key) {
        if (typeof key == 'string') {
            if (key in this.properties) {
                return this.properties(key);
            }
        }
        else {
            return Data.clone(this.elements);
        }
    }

    set(key, value) {
        if (typeof key == 'string' && typeof value != 'undefined') {
            if (key in this.properties) {
                let previousValue = this.properties[key];
                this.properties[key] = value;

                if (previousValue != value) {
                    this.send({
                        name: 'CacheUpdate',
                        type: 'CHANGED',
                        sender: this,
                        property: key,
                        previousValue: previousValue,
                        newValue: value,
                    });
                }

                return this;
            }
            else {
                this.properties[key] = value;

                this.send({
                    name: 'CacheUpdate',
                    type: 'ADDED',
                    sender: this,
                    property: key,
                    newValue: value,
                });
            }
        }

        return this;
    }
});


/*****
 * A cache is a data storage object that notifies listeners when it's been
 * modified.  This makes the cache a nexux for communications between some sort
 * of algorithm, a background task, or an asyncronous event and other objects
 * that are handling those events as they occur.  There are two types of Cache
 * aggregates: ObjectCache and ArrayCache.  Each of these classes have been
 * written to work with the underlying data aggregate type.
*****/
register('', class ArrayCache extends Emitter {
    constructor() {
        super();
        this.elements = [];
    }

    delete(index, count) {
        if (typeof index == 'number') {
            if (index >= 0 && index < this.elements.length) {
                let sliceCount = typeof count == 'number' ? count : 1;

                if (index + sliceCount > this.elements.length) {
                    sliceCount = this.elements.length - 1;
                }

                let previousValues = this.elements.slice(index, index + sliceCount);
                this.elements.splice(index, sliceCount);

                this.send({
                    name: 'CacheUpdate',
                    type: 'DELETE',
                    sender: this,
                    index: index,
                    count: sliceCount,
                    previousValues: previousValues,
                });
            }
        }

        return this;
    }

    getLength() {
        return this.elements.length;
    }

    get(index) {
        if (typeof index == 'number' && index >= 0 && index <= this.elements.length) {
            return this.elements[index];
        }
        else {
            return Data.copy(this.elements);
        }
    }

    insert(index, value) {
        if (typeof value != 'undefined') {
            if (typeof index == 'number' && index >= 0) {
                if (index >= this.elements.length) {
                    this.push(value);
                }
                else {
                    this.elements.splice(index, 0, value);

                    this.send({
                        name: 'CacheUpdate',
                        type: 'INSERT',
                        sender: this,
                        index: index,
                        newValue: value,
                    });
                }
            }
        }

        return this;
    }

    pop(value) {
        if (this.elements.length) {
            if (typeof value != 'undefined') {
                let previousValue = this.elements.pop();

                this.send({
                    name: 'CacheUpdate',
                    type: 'POP',
                    sender: this,
                    previousValue: previousValue,
                });
            }
        }

        return this;
    }

    push(value) {
        if (typeof value != 'undefined') {
            this.elements.push(value);

            this.send({
                name: 'CacheUpdate',
                type: 'PUSH',
                sender: this,
                index: this.elements.length - 1,
                newValue: value,
            });
        }

        return this;
    }

    set(index, value) {
        if (typeof index == 'number' && index >= 0 && index <= this.elements.length) {
            if (typeof value != 'undefined') {
                let previousValue = this.elements[index];
                this.elements[index] = value;

                if (previousValue != value) {
                    this.send({
                        name: 'CacheUpdate',
                        type: 'CHANGE',
                        sender: this,
                        index: index,
                        previousValue: previousValue,
                        newValue: value,
                    });
                }
            }
        }

        return this;
    }
});
