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
 * An object that is self configurahle has a close connection with a specifc set
 * of values in the overall settings.  A SelfConfigurable is always attached to
 * permanent settings, because there's not much value to add for associating with
 * temporary settings.
*****/
define(class RdsConfigurable {
    constructor(opts) {
        Object.assign(this, opts);
        this.ctor = Reflect.getProtototypeOf(this).constructor;
        this.settingName = `RdsConfigurable.${this.ctor.name}.${this.instanceName}`;
    }

    async createSetting() {
        await mkSettingsHandle().defineSetting(
            this.settingName,
            this.settingCategory,
            this.settingShape,
            this.settingShape.getDefault(),
        );
    }

    getClassName() {
        return this.ctor.name;
    }

    getCtor() {
        return this.ctor;
    }

    getSetting() {
        return this.setting;
    }

    getSettingCategory() {
        return this.settingCategory;
    }

    getSettingName() {
        return this.settingName;
    }

    getSettingShape() {
        return this.getSettingShape;
    }

    async hasSetting() {
        return await mkSettingsHandle().hasSetting(this.settingName);
    }

    async init() {
        this.setting = await mkSettingsHandle().getSetting(this.settingName);
    }

    async saveSetting() {
        if (this.settingShape.verify(this.setting)) {
            await mkSettingsHandle().setSetting(this.settingName, this.setting);
        }

        return this;
    }
});
