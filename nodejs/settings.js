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
singletonIn(Process.nodeClassController, '', class Registry {
    constructor() {
        this.tree = mkNodeTree();
        this.providers = [];
        mkHandlerProxy(Process, 'Registry', this);
    }

    async onClearSetting(message) {
        //  TODO *******************************************
    }

    async onClearValue(message) {
        //  TODO *******************************************
    }

    async onDeregisterProvider(message) {
        //  TODO *******************************************
    }

    async onGetValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).value;
            }
        }
        catch (e) {
            await caught(e, 'Settings.onGetValue');
        }
        return false;
    }

    async onHasValue(message) {
        try {
            if (this.tree.hasNode(message.path)) {
                return this.tree.getValue(message.path).value != null;
            }
        }
        catch (e) {
            await caught(e, 'Settings.onHasValue');
        }
        return false;
    }

    async onListProviders(message) {
        //  TODO *******************************************
    }

    async onListSettings(message) {
        //  TODO *******************************************
    }

    async onRegisterProvider(message) {
        //  TODO *******************************************
    }

    async onSetSetting(message) {
        try {
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

            return true;
        }
        catch (e) {}
        return false;
    }

    async onSetValue(message) {
        //  TODO *******************************************
    }
});


/*****
*****/
singleton('', class Settings {
    constructor() {
    }

    async clearSetting(path) {
        //  TODO *******************************************
        return this;
    }

    async clearValue(path) {
        //  TODO *******************************************
        return this;
    }

    async DeregisterProvider(provider) {
        //  TODO *******************************************
    }

    async getDefault(path) {
        //  TODO *******************************************
    }

    async getSetting(path) {
        //  TODO *******************************************
    }

    async getValue(path) {
        return await Process.callController({
            name: 'RegistryGetValue',
            path: path,
        });
    }

    async hasSetting(path) {
        //  TODO *******************************************
    }

    async hasValue(path) {
        return await Process.callController({
            name: 'RegistryHasValue',
            path: path,
        });
    }

    async listProviders() {
        //  TODO *******************************************
    }

    async registerProvider(provider) {
        //  TODO *******************************************
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
        //  TODO *******************************************
    }

    async toJson(path) {
        //  TODO *******************************************
    }

    async toObject(path) {
        //  TODO *******************************************
    }
});