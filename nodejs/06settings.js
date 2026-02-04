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
 * The settings service is a centralized approach to managing settings for the
 * Radius instance, i.e., top-level process.  Settings include both temporary
 * values, which are generally dynamic in nature, and permanent values, which
 * are stored in the DBMS for the next go around.  Settings can be ued for either
 * boot-time configuration settings or used more dynamically with a changing
 * value throughout the server lifetime.  It's up to how application code uses
 * this service.
*****/
createService(class SettingsService extends Service {
    constructor() {
        super();
        this.settings = {};
        this.temporary = {};
    }

    async defineSetting(name, category, shape, temporary, value) {
        let dataShape;

        if (shape instanceof DataShape) {
            dataShape = shape;
        }
        else if (shape instanceof BaseType) {
            dataShape = mkDataShape({ type: shape });
        }
        else {
            dataShape = mkDataShape({ type: StringType })
        }

        if (dataShape.validate(value)) {
            if (temporary) {
                let setting = this.settings[name] = mkDboSetting({
                    name: name,
                    category: category,
                    shape: dataShape,
                    value: value,
                });

                this.temporary[setting.id] = setting;
                return setting;
            }
            else {
                return this.settings[name] = await mkDbmsThunk().createObj(DboSetting, {
                    name: name,
                    category: category,
                    shape: dataShape,
                    value: value,
                });
            }
        }
        
        return mkFailure('radius.org.badValue');
    }

    async onDefineTemporarySetting(message) {
        if (!(message.settingName in this.settings)) {
            return await this.defineSetting(
                message.settingName,
                message.category,
                message.shape,
                true,
                message.value,
            );
        }

        return mkFailure('radius.org.duplicateSetting');
    }

    async onDefineSetting(message) {
        if (!(message.settingName in this.settings)) {
            return await this.defineSetting(
                message.settingName,
                message.category,
                message.shape,
                false,
                message.value,
            );
        }

        return mkFailure('radius.org.duplicateSetting');
    }

    async onDeleteSetting(message) {
        if (message.settingName in this.settings) {
            let setting = this.settings[message.settingName];
            delete this.settings[message.settingName];

            if (setting.id in this.temporary) {
                delete this.temporary[setting.id];
            }
            else {
                await mkDbmsThunk().deleteObj(setting);
            }
        }

        return true;
    }

    async onGetSetting(message) {
        if (message.settingName in this.settings) {
            return this.settings[message.settingName].value;
        }

        return mkFailure('radius.org.notFound');
    }

    async onGetSettings(message) {
        let settings = {};

        for (let settingName of message.settingNames) {
            if (settingName in this.settings) {
                let setting = this.settings[settingName];
                settings[settingName] = {
                    name: settingName,
                    shape: setting.shape,
                    value: setting.value,
                };
            }
        }

        return settings;
    }

    async onHasSetting(message) {
        return message.settingName in this.settings;
    }

    async onListSettings(message) {
        let list = Object.values(this.settings);

        if (message.temporary === true) {
            list = list.filter(setting => setting.id in this.temporary);
        }
        else if (message.temporary === false) {
            list = list.filter(setting => !(setting.id in this.temporary));
        }

        return list;
    }

    async onListFilteredSettings(message) {
        let filtered = Object.values(this.settings);

        if (message.filter.prefix) {
            filtered = filtered.filter(setting => setting.name.startsWith(message.filter.prefix));
        }

        if (message.filter.category) {
            filtered = filtered.filter(setting => setting.category == message.filter.category);
        }

        return filtered;
    }

    async onLoadSettings(message) {
        let dbms = mkDbmsThunk();

        let dboSetting = await dbms.selectOneObj(
            DboSetting,
            { name: 'system#settings-initialized' }
        );

        if (dboSetting && dboSetting.value === true) {
            let storedSettings = await dbms.selectObj(DboSetting);

            if (storedSettings.length > 0) {
                for (let storedSetting of storedSettings) {
                    this.settings[storedSetting.name] = storedSetting;
                }

                return true;
            }
        }

        return false;
    }

    async onSetSetting(message) {
        if (message.settingName in this.settings) {
            let setting = this.settings[message.settingName];

            if (setting.shape.validate(message.value)) {
                setting.value = message.value;

                if (!(setting.id in this.temporary)) {
                    await mkDbmsThunk().modifyObj(
                        setting.id,
                        { value: message.value }
                    );
                }

                return true;
            }
        }

        return false;
    }
});


/*****
 * The settings service is a centralized approach to managing settings for the
 * Radius instance, i.e., top-level process.  Settings include both temporary
 * values, which are generally dynamic in nature, and permanent values, which
 * are stored in the DBMS for the next go around.  This handle is generic which
 * means that a single handle does NOT change its internal state while being
 * used for acccessing services.
*****/
define(class SettingsHandle extends Handle {
    constructor() {
        super();
    }

    async defineTemporarySetting(settingName, category, shape, value) {
        return await this.callService({
            settingName: settingName,
            category: category,
            shape: shape,
            value: value,
        });
    }

    async defineSetting(settingName, category, shape, value) {
        return await this.callService({
            settingName: settingName,
            category: category,
            shape: shape,
            value: value,
        });
    }

    async deleteSetting(settingName) {
        return await this.callService({
            settingName: settingName,
        });
    }

    async getSetting(settingName) {
        return await this.callService({
            settingName: settingName,
        });
    }

    async getSettings(...settingNames) {
        return await this.callService({
            settingNames: settingNames,
        });
    }

    async hasSetting(settingName) {
        return await this.callService({
            settingName: settingName,
        });
    }

    async listFilteredSettings(filter) {
        return await this.callService({
            filter: filter
        });
    }

    async listSettings(temporary) {
        return await this.callService({
            temporary: temporary,
        });
    }

    async loadSettings() {
        return await this.callService({
        });
    }

    async setSetting(settingName, value) {
        return await this.callService({
            settingName: settingName,
            value: value,
        });
    }
});