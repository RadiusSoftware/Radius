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
 * This is an illustrative stub showing the required API for impelemnting a data
 * provider for the single-instance Registry object.  This stub actually does
 * nothing, but demonstrates the interface.  It is also the default, builtin data
 * provider within the framework.  The false returns that nothing is actually
 * available in this provider.
*****/
singletonIn(Process.nodeClassController, '', class RegistryStorageManagerStub {
    async deleteSetting(path) {
    }

    async retrieveValue(path) {
        return SymEmpty;
    }

    async storeValue(path, value) {
    }
});


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
        this.storage = RegistryStorageManagerStub;
        mkHandlerProxy(Process, 'Registry', this);
    }

    listValues(path) {
        let values = [];
        let root = path ? this.tree.getNode(path) : this.tree.getRoot();
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
 
    async onClearSettings(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                this.tree.getNode(message.path).clear();
                return true;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onClearStorageManager(message) {
        try {
            this.storage = RegistryStorageManagerStub();
            return true;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onClearValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                let node = this.tree.getNode(message.path);
                node.getValue().value = node.getValue().defaultValue;
                return true;
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onGetDefaultValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return Data.clone(this.tree.getValue(message.path).defaultValue);
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onGetSettings(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).dataShape.toJson();
            }
            
            return false;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onGetValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return Data.clone(this.tree.getValue(message.path).value);
            }
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onHasSetting(message) {
        try {
            return this.tree.hasNode(message.path);
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
            return this.listValues(message.path);
        }
        catch (e) { await caught(e) }
        return false;
    }
 
    async onRefreshValues(message) {
        try {
            for (let entry of this.listValues(message.path)) {
                let storedValue = await this.storage.retrieveValue(entry.path);

                if (storedValue !== SymEmpty) {
                    let shaped = dataShape.shapeValue(storedValue);
                    this.tree.getNode(entry.path).getValue().value = shaped;
                }
            }

            return true;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onSetSettings(message) {
        try {
            if (!this.tree.hasNode(message.path)) {
                let node = this.tree.ensureNode(message.path);
                let dataShape = mkDataShape(message.value);

                node.setValue({
                    dataShape: dataShape,
                    defaultValue: message.value,
                    value: Data.clone(message.value),
                });

                let storedValue = await this.storage.retrieveValue(node.getPath());

                if (storedValue !== SymEmpty) {
                    let shaped = dataShape.shapeValue(storedValue);
                    node.getValue().value = shaped;
                }
            }

            return true;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onSetStorageManager(message) {
        try {
            let maker;
            let storageManager;

            eval(`maker = fqnClassMakerName(${message.storageManagerClassName});`);
            eval(`storageManager = ${maker}()`);
            this.storage = storageManager;
            return true;
        }
        catch (e) { await caught(e) }
        return false;
    }

    async onSetValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                let node = this.tree.getNode(message.path);
                let { dataShape, defaultValue } = node.getValue();
                let shapedValue = dataShape.shapeValue(defaultValue, message.value);
                node.getValue().value = shapedValue;
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
    async clearSettings(path) {
        return await Process.callController({
            name: 'RegistryClearSettings',
            path: path,
        });
    }

    async setStorageManager() {
        await Process.callController({
            name: 'RegistryClearStorageManager',
        });

        return this;
    }

    async clearValue(path) {
        await Process.callController({
            name: 'RegistryClearValue',
            path: path,
        });

        return this;
    }

    async getDefaultValue(path) {
        return await Process.callController({
            name: 'RegistryGetDefaultValue',
            path: path,
        });
    }

    async getSettings(path) {
        let response = await Process.callController({
            name: 'RegistryGetSettings',
            path: path,
        });

        if (response) {
            return mkDataShape(response);
        }

        return response;
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

    async refreshValues(path) {
        return await Process.callController({
            name: 'RegistryRefreshValues',
            path: typeof path == 'string' ? path : '',
        });
    }

    async setClassSettings(obj) {
        let settings = {};
        let path = fqnClassName(obj);
        let clss = Reflect.getPrototypeOf(obj).constructor;

        for (let classOf of Data.enumerateClassHierarchy(clss).reverse()) {
            if (typeof classOf.registrySettings == 'object') {
                for (let key in classOf.registrySettings) {
                    settings[key] = Data.clone(classOf.registrySettings[key]);
                }
            }
        }

        if (Object.keys(settings).length) {
            await Process.callController({
                name: 'RegistrySetSettings',
                path: path,
                value: settings,
            });
        }

        return path;
    }

    async setSettings(path, value) {
        await Process.callController({
            name: 'RegistrySetSettings',
            path: path,
            value: value,
        });

        return this;
    }

    async setStorageManager(storageManagerClassName) {
        await Process.callController({
            name: 'RegistrySetStorageManager',
            storageManagerClassName: storageManagerClassName,
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