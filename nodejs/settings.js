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
 * There are the Registry and the Settings singletons.  The Registry resides
 * in the #Controller process node and is the repository of the settings and
 * values.  The Registry is always used via the single Settings object, which
 * provides an API for managing Registry data.  Note that a setting contains
 * both a default value and the current value, whereas the value refers only
 * to the current value.  A setting may be set just once!  Once set, additional
 * onSetSettings messages will be ignored.  If you really need to change the
 * definition of a setting, clear it and then set it, which will then cause
 * the new value to take effect.
*****/
singletonIn(Process.nodeClassController, '', class Registry {
    constructor() {
        this.tree = mkNodeTree();
        mkHandlerProxy(Process, 'Registry', this);
    }

    async onClearSetting(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                this.tree.clearNode(message.path);
                return true;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onClearValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                let node = this.tree.ensureNode(message.path);
                node.getValue().value = node.getValue().def;
                return true;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onGetDefault(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).def;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onGetSetting(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path);
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onGetValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).value;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onHasSetting(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).value != null;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onHasValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).value != null;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onListValues(message) {
        try {
            let values = [];
            let root = message.path ? this.tree.getNode(message.path) : this.tree.getRoot();
            let stack = [ root ];

            while (stack.length) {
                let node = stack.pop();
                let value = node.getValue();

                if (value) {
                    values.push({ path: node.getPath(), value: value.value });
                }
                
                for (let childNode of node) {
                    stack.push(childNode);
                }
            }

            return values;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onSetSetting(message) {
        try {
            if (!this.tree.hasNode(message.path)) {
                let node = this.tree.ensureNode(message.path);

                if (Array.isArray(message.value)) {
                    node.setValue({
                        type: ArrayType,
                        def: message.value,
                        value: message.value,
                    });
                }
                else if (typeof message.value == 'object') {
                    node.setValue({
                        type: ObjectType,
                        def: message.value,
                        value: message.value,
                    });
                }
                else {
                    node.setValue({
                        type: getJsType(message.value),
                        def: message.value,
                        value: message.value,
                    });
                }
            }

            return true;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onSetValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                this.tree.ensureNode(message.path).getValue().value = message.value;
                return true;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }
});


/*****
 * There are the Registry and the Settings singletons.  The Registry resides
 * in the #Controller process node and is the repository of the settings and
 * values.  The Registry is always used via the single Settings object, which
 * provides an API for managing Registry data.  The Settings singleton resides
 * in every process, including the #CONTROLLER.  Settings is essentially a
 * shell singleton, whose purpose is to simplify the communications with the
 * #CONTROLLER-base Registry.
*****/
singleton('', class Settings {
    async clearSetting(path) {
        return await Process.callController({
            name: 'RegistryClearSetting',
            path: path,
        });
    }

    async clearValue(path) {
        await Process.callController({
            name: 'RegistryClearValue',
            path: path,
        });

        return this;
    }

    async getDefault(path) {
        return await Process.callController({
            name: 'RegistryGetDefault',
            path: path,
        });
    }

    async getSetting(path) {
        return await Process.callController({
            name: 'RegistryGetSetting',
            path: path,
        });
    }

    async getValue(path) {
        return await Process.callController({
            name: 'RegistryGetValue',
            path: path,
        });
    }

    async hasSetting(path) {
        return await Process.callController({
            name: 'RegistryHasSetting',
            path: path,
        });
    }

    async hasValue(path) {
        return await Process.callController({
            name: 'RegistryHasValue',
            path: path,
        });
    }

    async listValues(path) {
        return await Process.callController({
            name: 'RegistryListValues',
            path: typeof path == 'string' ? path : '',
        });
    }

    async setSetting(path, value) {
        await Process.callController({
            name: 'RegistrySetSetting',
            path: path,
            value: value,
        });

        return this;
    }

    async setValue(path, value) {
        await Process.callController({
            name: 'RegistrySetValue',
            path: path,
            value: value,
        });

        return this;
    }
});