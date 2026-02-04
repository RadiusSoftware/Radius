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
createService(class AuthAppService extends Service {
    static services = {
    };

    async onClearSetting(message) {
        // TODO *******************************************************
    }

    async onCreateOtp(message) {
        // TODO *******************************************************
    }

    async onGetOtpObject(message) {
        // TODO *******************************************************
    }

    async onGetService(message) {
        // TODO *******************************************************
    }

    async onGetServiceId(message) {
        // TODO *******************************************************
    }

    async onGetSetting(message) {
        // TODO *******************************************************
    }

    async onGetStatus(message) {
        // TODO *******************************************************
        return 'offline';
    }

    async onGetSettings(message) {
        // TODO *******************************************************
    }

    async onOpen(message) {
        // TODO *******************************************************
    }

    async onSetSetting(message) {
        // TODO *******************************************************
    }

    async onSetSettings(message) {
        // TODO *******************************************************
    }
});


/*****
*****/
define(class AuthAppHandle extends Handle {
    constructor(id) {
        super();
        this.id = typeof id == 'string' ? id : '';
    }

    async clearSetting(settingName) {
        await this.callService({
            id: this.id,
            settingName: settingName,
        });

        return this;
    }

    async createAuthApp(user, serviceId, settings) {
        let userId = user instanceof UserHandle ? user.getId() : user;

        this.id = await this.callService({
            userId: userId,
            serviceId: serviceId,
            settings: settings,
        });

        return this;
    }

    static fromJson(value) {
        return mkAuthAppHandle(value.id);
    }

    getId() {
        return this.id;
    }

    async getAuthAppObject() {
        return await this.callService({
            id: this.id,
        });
    }
    
    async getOwnerId() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return '';
    }

    async getSetting(settingName) {
        return await this.callService({
            id: this.id,
            settingName: settingName,
        });
    }

    async getSettings() {
        return await this.callService({
            id: this.id,
        });
    }

    async getService() {
        return await this.callService({
            serviceId: serviceId,
        });

        return null;
    }

    async getServiceId() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return '';
    }

    async getStatus() {
        return await this.callService(({
        }));
    }

    async open(authAppId) {
        this.id = await this.callService({
            id: authAppId,
        });
        
        return this;
    }

    async setSetting(settingName, value) {
        await this.callService({
            id: this.id,
            settingName: settingName,
            value: value,
        });

        return this;
    }

    async setSettings(values) {
        await this.callService({
            id: this.id,
            values: values,
        });

        return this;
    }
});