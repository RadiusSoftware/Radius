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
 * There are several configurable classes and objects in the system.  A
 * configuration represents and instance of settings used for configuring an
 * instance of an object such as a web service, web client, or a web hook.
*****/
define(class RdsConfiguration {
    constructor(category) {
        this.name = '';
        this.category = category;
    }

    /*
    async createSetting() {
        await mkSettingsHandle().defineSetting(
            this.settingName,
            this.settingCategory,
            this.settingShape,
            this.settingShape.getDefault(),
        );
    }
    */

    getCategory() {
        return this.category;
    }

    getName() {
        return this.name ? `${category}-${this.name}` : '';
    }

    getShape() {
        return this.shape;
    }

    async load() {
        this.value = await mkSettingsHandle().getSetting(this.settingName);
    }

    async save() {
        /*
        if (this.settingShape.verify(this.setting)) {
            await mkSettingsHandle().setSetting(this.settingName, this.setting);
        }
        */

        return this;
    }

    setName(name) {
        this.name = name;
        return this;
    }
});
