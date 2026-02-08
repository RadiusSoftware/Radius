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
 * Provides a fundamental class for defining and supporting the features required
 * for enumerations.  An enumeration is a mapping of strings, key -> value.  By
 * default, enumeration values are identical to the string.  If an enumeration
 * value contains a colon, the text to the right of the hash is a value for the
 * enumeration key: e.g., dog:Hund is such a pair.
*****/
define(class RdsEnum {
    constructor(...values) {
        this.values = {};
        this.set(...values);
    }

    delete(...keys) {
        for (let key of keys) {
            if (StringType.verify(key)) {
                delete this.values[key];
            }
        }

        return this;
    }

    get(key) {
        if (StringType.verify(key)) {
            if (key in this.values) {
                return this.values[key];
            }
        }

        return undefined;
    }

    getAll(...keys) {
        let values = [];

        for (let key of keys) {
            if (StringType.verify(key)) {
                if (key in this.values) {
                    values.push(this.values[key]);
                }
            }
        }

        return values;
    }

    getKeys() {
        return Object.keys(this.values);
    }

    getValues() {
        return Object.values(this.values);
    }

    has(key) {
        if (StringType.verify(key)) {
            return key in this.values;
        }

        return false;
    }

    hasAll(...keys) {
        for (let key of keys) {
            if (StringType.verify(key)) {
                if (!(key in this.values)) {
                    return false;
                }
            }
        }

        return true;
    }

    hasAny(...keys) {
        for (let key of keys) {
            if (StringType.verify(key)) {
                if (key in this.values) {
                    return true;
                }
            }
        }

        return false;
    }

    hasValue(value) {
        if (StringType.verify(value)) {
            for (let enumValue of Object.values(this.values)) {
                if (value == enumValue) {
                    return true;
                }
            }
        }

        return false;
    }
  
    set(...values) {
        for (let value of values) {
            if (StringType.verify(value)) {
                value = value.trim();
                let index = value.indexOf(':');

                if (index == -1) {
                    this.values[value] = value;
                }
                else if (index == 0) {
                    this.values[value.substring(1)] = value.substring(1);
                }
                else {
                    let [ key, text ] = RdsText.split(value, ':');
                    this.values[key] = text;
                }
            }
        }

        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.values)[Symbol.iterator()];
    }

    toArray() {
        return Object.entries(this.values).map(entry => {
            return { key: entry[0], text: entry[1] };
        });
    }

    toString() {
        return Object.entries(this.values).map(entry => {
            return `${entry[0]}:${entry[1]}`;
        });
    }
});
