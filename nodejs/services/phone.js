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
 * Phone numbers are managed as a centalized resource in the Radius DBMS
 * and are internally represented as formatted strings with the country
 * code followed by a hash, #, followed by a sequence of digits.  Here's
 * an example: 1#2123539301.  This service provides neither the parsing nor
 * the string formatting functions for phone numbers.  That's part of the
 * common framework infrastruture.  The main point is that phone numbers
 * must be in phonum format when utilizing these services.
*****/
createService(class PhoneService extends Service {
    static statuses = mkStringSet(
        'none',
        'bad',
        'call-only',
        'call-text',
        'text-only',
    );

    async onEnsurePhoneNumber(message) {
        let dbms = mkDbmsThunk();
        let phonenum = this.validatePhonum(message.phonenum);

        if (phonenum) {
            let phone = await dbms.selectOneObj(DboPhone, { phonenum: phonenum });

            if (!phone) {
                phone = await dbms.createObj(DboPhone, {
                    phonenum: phonenum,
                    status: 'none',
                    statusDate: mkTime(),
                    ownerId: '',
                });
            }

            return phone.id;
        }

        return '';
    }

    async onGetPhoneObject(message) {
        return await mkDbmsThunk().getObj(message.phoneId);
    }

    async onGetSetting(message) {
        let dotted = `settings.${message.settingName}`;
        return await mkDbmsThunk().getObjProperty(message.id, dotted);
    }

    async onIsAssigned(message) {
        let ownerId = await mkDbmsThunk().getObjProperty(message.id, 'ownerId');
        return typeof ownerId == 'string' ? ownerId != '' : false;
    }

    async onOpen(message) {
        let dboPhone = await mkDbmsThunk().getObj(message.id);
        return dboPhone instanceof DboPhone ? dboPhone.id : '';
    }

    async onOpenPhoneNumber(message) {
        let phonum = this.validatePhonum(message.phonum);
        
        if (phonum) {
            let dboPhone = await mkDbmsThunk().selectOneObj(DboPhone, { phonum: phonum });
            return dboPhone instanceof DboPhone ? dboPhone.id : '';
        }

        return '';
    }

    async onSetSetting(message) {
        let dotted = `settings.${message.settingName}`;
        await mkDbmsThunk().modifyObj(message.id, dotted, message.settingValue);
    }

    async onSetStatus(message) {
        await mkDbmsThunk().modifyObj(message.id, {
            status: message.status,
            statusDate: mkTime(),
        });
    }

    validatePhonum(phonum) {
        if (typeof phonum == 'string') {
            let match = phonum.trim().match(/^([0-9]+)#([0-9]+)$/);

            if (match) {
                return `${match[1]}#${match[2]}`;
            }

            return false;
        }
    }
});


/*****
 * The phone handle provides services for a specific phone object once that
 * object has been opened.  Once a phone number has been added to the DMBS,
 * it will NOT be removed.  It will retain its most recent status along with
 * other flags and settings.  Once opened, the handle is for the specified
 * phone number.  Open create and open another handle when switching phone
 * numbers.
*****/
define(class PhoneHandle extends Handle {
    constructor(id) {
        super();
        this.id = id ? id : '';
    }

    async ensurePhoneNumber(phonenum) {
        this.id = await this.callService({
            phonenum: phonenum,
        });

        return this;
    }

    static fromJson(value) {
        return mkPhoneHandle(value.id);
    }

    getId() {
        return this.id;
    }

    async getPhoneObject() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async getSetting(settingName) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                settingName: settingName,
            });
        }

        return null;
    }

    async getStatus() {
        if (this.id) {
            return this.callService({
                id: this.id,
            });
        }
    }

    async getUser() {
        let userId = '';

        if (this.id) {
            userId = await this.callService({
                id: this.id,
            });
        }

        return mkUserHandle().open(userId);
    }

    async isAssigned() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async open(id) {
        this.id = await this.callService({
            id: id,
        });

        return this;
    }

    async openPhoneNumber(phonum) {
        this.id = await this.callService({
            phonum: phonum,
        });

        return this;
    }

    async setSetting(settingName, settingValue) {
        if (this.id) {
            await this.callService({
                id: this.id,
                settingName: settingName,
                settingValue: settingValue,
            });
        }

        return this;
    }

    async setStatus(status) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                status: status,
            });
        }

        return this;
    }
});