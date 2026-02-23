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
 * The controller contains owns the data that's used by one or more htmlElements
 * and widgets for controlling display and edit values.  Moreover, the controller
 * provides the features for binding display surfaces and attributes to those
 * values as they change.  Generally speaking, a controller controls the display
 * values for a subbranch of the HTML document.  Please note that only widgets
 * may contain subbranch controllers.  Hence, using a controller requires that
 * use of a widget, event if it's just a BaseWidget or "base-widget" tag.
*****/
define(class Controller extends Emitter {
    constructor(value) {
        super();
        this.objekt = mkObjekt(value);
        this.entanglements = mkEntanglements();
        this.objekt.on('Update', message => this.onUpdate(message));
    }

    clear() {
        delete Controller.controllers[this.id];
        return this;
    }

    delete(key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            delete objekt[propertyName];
        }

        return this;
    }

    entangleAttribute(docElement, name, key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            this.entanglements.entangleAttribute(docElement, name, ()=>objekt[propertyName]);
        }

        return this;
    }

    entangleAttributeFlag(docElement, name, key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            this.entanglements.entangleAttributeFlag(docElement, name, ()=>objekt[propertyName]);
        }

        return this;
    }

    entangleInner(docElement, key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            this.entanglements.entangleInner(docElement, ()=>objekt[propertyName]);
        }

        return this;
    }

    entangleInput(docElement, key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            this.entanglements.entangleInput(docElement, objekt, propertyName);
        }

        return this;
    }

    get(key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            return objekt[propertyName];
        }

        return undefined;
    }

    getKeys() {
        return Object.keys(this.objekt);
    }

    getObjekt(key) {
        let { objekt, propertyName } = this.resolve(key);
        return objekt;
    }

    getValue(key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            let value = objekt[propertyName];
            return Objekt.isObjekt(value) ? value.getValue() : value;
        }

        return undefined;
    }

    getValues() {
        return this.objekt.getValue();
    }

    has(key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            return propertyName in objekt;
        }

        return false;
    }

    isArray(key) {
        let { objekt, propertyName } = this.resolve(key);

        if (objekt) {
            if (propertyName) {
                if (Objekt.isObjekt(objekt[propertyName])) {
                    return objekt[propertyName].isArray();
                }
            }
            else {
                return objekt.isArray();
            }
        }

        return false;
    }

    onUpdate(message) {
        let forward = Data.copy(message);
        forward.name = message.key;
        this.emit(forward);
    }

    resolve(dotted) {
        let propertyName = null;
        let objekt = this.objekt;

        if (typeof dotted == 'string' && dotted.match(/[a-zA-Z0-9_.][a-zA-Z0-9_.]*/)) {
            let segments = TextUtils.split(dotted, '.');

            if (segments.length == 1) {
                propertyName = dotted;
            }
            else {
                propertyName = segments[segments.length - 1];

                for (let i = 0; i < segments.length - 1; i++) {
                    let segment = segments[i];
                    let property = objekt[segment];

                    if (Objekt.isObjekt(property)) {
                        objekt = property;
                    }
                    else {
                        propertyName = null;
                        objekt = null;
                        break;
                    }
                }
            }
        }

        return { objekt: objekt, propertyName: propertyName };
    }

    set(key, value) {
        let { objekt, propertyName } = this.resolve(key);

        if (ObjectType.verify(value)) {
            if (propertyName) {
                objekt[propertyName] = value;
            }
            else {
                for (let key in value) {
                    this.objekt[key] = Data.clone(value[key]);
                }
            }
        }
        else {
            if (propertyName) {
                if (value == undefined) {
                    if (!objekt.has(propertyName)) {
                        objekt[propertyName] = '';
                    }
                }
                else if (value != objekt[propertyName]) {
                    objekt[propertyName] = value;
                }
            }
        }

        return this;
    }

    [Symbol.iterator]() {
        let values = [];

        for (let key of Reflect.ownKeys(this.objekt)) {
            values.push({
                name: key,
                value: this.objekt[key],
            });
        }

        return values[Symbol.iterator]();
    }
});
