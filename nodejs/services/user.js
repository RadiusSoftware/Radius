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
 * Each Radius application server has a "radius" DBMS, with a set of common
 * tables used throughout that server instance.  Users and groups are part of
 * the radius DBMS specified user permissions for all access, both web pages
 * and web applications, that are part of that instance.   User records are
 * associated with credentials records, which are separate from the user, to
 * facilitate authentication.
*****/
createService(class UserService extends Service {
    async onCheckUserNameAvailability(message) {
        let dbms = mkDbmsThunk();

        let dboUser = await dbms.selectDboOneObj(DboUser, {
            userName: message.userName.toLowerCase(),
        });

        return !(dboUser instanceof DboUser);
    }

    
    async onClearEmail2(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.emailAddr2Id) {
            await dbms.modifyObj(dboUser.id, { emailAddr2Id: '' });
        }
    }

    async onClearOtp(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.otpId) {
            await dbms.deleteObj(dboUser.otpId);
            await dbms.modifyObj(dboUser.id, { otpId: '' });
        }
    }

    async onClearOtp2(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.otpId2) {
            await dbms.deleteObj(dboUser.otpId2);
            await dbms.modifyObj(dboUser.id, { otpId2: '' });
        }
    }

    async onClearPhone(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.phoneId) {
            await dbms.modifyObj(dboUser.id, { phoneId: '' });
        }
    }

    async onClearPhone2(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.phone2Id) {
            await dbms.modifyObj(dboUser.id, { phone2Id: '' });
        }
    }

    async onCreateUser(message) {
        let dbms = await mkDbmsThunk().startTransaction();

        if (!message.userName.trim()) {
            return mkFailure('radius.org.userNameRequired');
        }

        if (!message.userName.trim().match(/^[a-zA-Z0-9-_@]+$/)) {
            return mkFailure('radius.org.userNameInvalid');
        }

        let existingDboUser = await dbms.selectDboOneObj(DboUser, {
            userName: message.userName.trim().toLowerCase(),
        });

        if (existingDboUser instanceof DboUser) {
            return mkFailure('radius.org.userNameInUse');
        }

        let emailAddr = await mkEmailAddrHandle().ensureEmailAddr(message.emailAddr);

        if (!emailAddr.getId()) {
            return mkFailure('radius.org.badEmailAddr');
        }

        if (!message.firstName.trim().length || !message.lastName.trim().length) {
            return mkFailure('radius.org.namesRequired');
        }

        if (!(message.userGroup instanceof UserGroupHandle) || !message.userGroup.getId()) {
            return 'radius.org.badUserGroup';
        }

        let userPermissions = [];
        let permissions = mkPermissionSetHandle();

        if (Array.isArray(message.permissions)) {
            for (let permissionType of message.permissions) {
                if (permissions.hasPermissionType(permissionType)) {
                    userPermissions.push(permissionType);
                }
            }
        }

        let userSettings = {
            emailVerified: false,
            email2Verified: false,
            phoneVerified: false,
            phone2Verified: false,
            otpVerified: false,
            otp2Verified: false,
        };

        if (ObjectType.verify(message.settings)) {
            for (let key in message.settings) {
                if (!(key in userSettings)) {
                    userSettings[key] = message.settings[key];
                }
            }
        }

        let dboUser = await dbms.createObj(DboUser, {
            emailAddrId: emailAddr.getId(),
            userName: message.userName.trim().toLowerCase(),
            firstName: message.firstName.trim(),
            lastName: message.lastName.trim(),
            UserGroup: message.userGroup.getId(),
            active: typeof message.active == 'boolean' ? message.active : true,
            settings: userSettings,
            permissions: userPermissions,
        });

        await dbms.commit();
        return dboUser.id;
    }

    async onGetEmailAddr(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'emailAddrId');
    }

    async onGetEmailAddr2(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'emailAddr2Id');
    }

    async onGetEulaAccepted(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'eulaAccepted');
    }

    async onGetOtp(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'otpId');
    }

    async onGetOtp2(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'otp2Id');
    }

    async onGetPermissions(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'permissions');
    }

    async onGetPhone(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'phoneId');
    }

    async onGetPhone2(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'phone2Id');
    }

    async onGetSetting(message) {
        let dotted = `settings.${message.settingName}`;
        return await mkDbmsThunk().getObjProperty(message.id, dotted);
    }

    async onGetUserGroup(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'userGroupId');
    }

    async onGetUserName(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'userName');
    }

    async onHasEmailAddr2(message) {
        return (await mkDbmsThunk().getObjProperty(message.id, 'emailAddr2Id')) != '';
    }

    async onHasExcessAttempts(message) {
        let failedLogins = await mkDbmsThunk().getObjProperty(message.id, `failedLogins`);
        let loginMaxFailures = await mkSettingsHandle().getSetting('loginMaxFailures');
        return failedLogins > loginMaxFailures;
    }

    async onHasEmailOtp(message) {
        return (await mkDbmsThunk().getObjProperty(message.id, 'emailOtpId')) != '';
    }

    async onHasEmailOtp2(message) {
        return (await mkDbmsThunk().getObjProperty(message.id, 'emailOtp2Id')) != '';
    }

    async onHasEmailPhone(message) {
        return (await mkDbmsThunk().getObjProperty(message.id, 'emailPhoneId')) != '';
    }

    async onHasEmailPhone2(message) {
        return (await mkDbmsThunk().getObjProperty(message.id, 'emailPhone2Id')) != '';
    }

    async onIncrementAttempts(message) {
        let dbms = mkDbmsThunk();
        let failedAttempts = await dbms.getObjProperty(message.id, 'failedLogins');

        if (typeof failedAttempts == 'number') {
            await dbms.modifyObj(message.id, {
                failedAttempts: failedAttempts + 1,
            });
        }
    }

    async onIsActive(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'active');
    }

    async onIsLive(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            if (dboUser.active) {
                return await mkTeamHandle(dboUser.teamId).isActive();
            }
        }

        return false;
    }

    async onIsZombie(message) {
        let zombie = await mkDbmsThunk().getObjProperty(message.id, 'zombie');
        return zombie != null ? zombie : false;
    }

    async onOpen(message) {
        let dboUser = await mkDbmsThunk().getObj(message.id);
        return dboUser instanceof DboUser ? dboUser.id : '';
    }

    async onOpenFromEmailAddr(message) {
        let dbms = mkDbmsThunk();
        let dboEmailAddr = await dbms.selectOneObj(DboEmailAddr, { addr: message.emailAddr});

        if (dboEmailAddr instanceof DboEmailAddr) {
            if (dboEmailAddr.ownerId) {
                let dboUser = await dbms.getObj(dboEmailAddr.ownerId);
                return dboUser instanceof DboUser ? dboUser.id : '';
            }
        }

        return '';
    }

    async onRememberDevice(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            await dbms.setObjProperty(
                message.id, 
                `verifier.devices.${message.deviceId}`,
                mkTime(),
            );
        }
    }

    async onResetAttempts(message) {
        await mkDbmsThunk().modifyObj(message.id, { failedLogins: 0 });
    }

    async onSetEmail(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let newEmailAddr = await mkEmailAddrHandle().ensureEmailAddr(message.emailAddr);

            if (!newEmailAddr.getId()) {
                return mkFailure('radius.org.badEmailAddr');
            }

            if (newEmailAddr.getId() == dboUser.emailAddrId) {
                return true;
            }

            dboUser.settings.emailVerified = false;
            dboUser.emailAddrId = newEmailAddr.getId();
            await dbms.updateObj(dboUser);
            return true;
        }

        return mkFailure('radius.org.userNotFound');
    }

    async onSetEmail2(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let newEmailAddr = await mkEmailAddrHandle().ensureEmailAddr(message.emailAddr);

            if (!newEmailAddr.getId()) {
                return mkFailure('radius.org.badEmailAddr');
            }

            if (newEmailAddr.getId() == dboUser.emailAddr2Id) {
                return true;
            }

            dboUser.settings.email2Verified = false;
            dboUser.emailAddr2Id = newEmailAddr.getId();
            await dbms.updateObj(dboUser);
            return true;
        }

        return mkFailure('radius.org.userNotFound');
    }

    async onSetEulaAccepted(message) {
        await mkDbmsThunk().modifyObj(message.id, { eulaAccepted: true});
    }

    async onSetOtp(message) {
        let field = message.field;
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            if (dboUser[field]) {
                let dboOtp = await dbms.getObj(dboUser[field]);
                dboOtp.serviceId = message.serviceId;
                dboOtp.settings = message.settings;
                await dbms.updateObj(dboOtp);
            }
            else {
                let dboOtp = await dbms.createObj(DboOtp, {
                    ownerId: message.id,
                    serviceId: message.serviceId,
                    settings: message.settings,
                });

                await dbms.modifyObj(dboUser.id, ({})[field] = dboOtp.id);
            }

            return true;
        }

        return mkFailure('radius.org.userNotFound');
    }

    async onSetOtp2(message) {
        return await this.onSetOtp(message);
    }

    async onSetPermissions(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let permissionSet = mkPermissionSet();
            let permissionTypeSet = mkRdsEnum(...dboUser.permissions);

            for (let permissionType of message.permissions) {
                if (!permissionTypeSet.has(permissionType)) {
                    dboUser.permissions.push(permissionType);
                }
            }
        }
        else {
            return mkFailure('radius.org.userNotFound');
        }
    }

    async onSetPhone(message) {
        let field = message.field;
        let dbms = await mkDbmsThunk().startTransaction();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let newPhone = await mkPhoneHandle().ensurePhoneNumber(message.phonenum);

            if (newPhone.getId()) {
                if (newPhone.getId() != dboUser[field]) {
                    await dbms.modifyObj(dboUser, ({})[field] = newPhone.getId());
                }
                
                await dbms.commit();
                return true;
            }
        }
    }

    async onSetPhone2(message) {
        return await this.onSetPhone2(message);
    }

    async onSetSetting(message) {
        let dotted = `settings.${message.settingName}`;

        return await mkDbmsThunk().setObjProperty(
            message.id,
            dotted,
            message.settingValue
        );
    }

    async onSetUserGroup(message) {
        let dbms = await mkDbmsThunk().startTransaction();
        let userGroup = await dbms.getObj(message.userGroupId);

        if (userGroup instanceof DboUserGroup) {
            await dbms.setObjProperty(
                message.id,
                'userGroupId',
                userGroup.id,
            );
        }
    }

    async onSetUserName(message) {
        let dbms = await mkDbmsThunk().startTransaction();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUserGroup) {
            if (message.userName.trim().match(/^[a-zA-Z0-9-_@]+$/)) {
                return mkFailure('radius.org.userNameInvalid');
            }

            await dbms.setObjProperty(
                message.id,
                'userName',
                message.userName.trim().toLowerCase(),
            );
        }
    }
});


/*****
 * The user handle manages users on a system-wide basis and controls all access,
 * updates, and other interfactions withe user DBMS records.  This is critical
 * to ensure no errant code created by application developers will accidentially
 * breach standard and enhanced security and data consistency practices.
*****/
define(class UserHandle extends Handle {
    constructor(id) {
        super();
        this.id = id ? id : '';
    }

    async checkUserNameAvailability(userName) {
        return await this.callService({
            userName: userName,
        });
    }

    async clearEmail2() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async clearOtp() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async clearOtp2() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async clearPhone() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async clearPhone2() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async createUser(opts) {
        let response = await this.callService(opts);

        if (response instanceof Failure) {
            return response;
        }

        this.id = response;
        return this;
    }

    static fromJson(value) {
        return mkUserHandle(value.id);
    }

    async getEmailAddr() {
        let emailAddrId;

        if (this.id) {
            emailAddrId = await this.callService({
                id: this.id
            });
        }

        return mkEmailAddrHandle(emailAddrId);
    }

    async getEmailAddr2() {
        let emailAddrId;

        if (this.id) {
            emailAddrId = await this.callService({
                id: this.id
            });
        }

        return mkEmailAddrHandle(emailAddrId);
    }

    async getEulaAccepted() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    getId() {
        return this.id;
    }

    async getOtp() {
        let otpId;

        if (this.id) {
            otpId = await this.callService({
                id: this.id
            });
        }

        return mkOtpHandle(otpId);
    }

    async getOtp2() {
        let otpId;

        if (this.id) {
            otpId = await this.callService({
                id: this.id
            });
        }

        return mkOtpHandle(otpId);
    }

    async getPermissions() {
        if (this.id) {
            if (this.id) {
                return await this.callService({
                    id: this.id,
                });
            }
        }

        return [];
    }

    async getPhone() {
        let phoneId;

        if (this.id) {
            phoneId = await this.callService({
                id: this.id
            });
        }

        return mkPhoneHandle(phoneId);
    }

    async getPhone2() {
        let phoneId;

        if (this.id) {
            phoneId = await this.callService({
                id: this.id
            });
        }

        return mkPhoneHandle(phoneId);
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

    async getUserGroup() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async getUserName() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async hasEmail2() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async hasExcessAttempts() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async hasOtp() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async hasOtp2() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async hasPhone() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async hasPhone2() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async incrementAttempts() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async isActive() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async isLive() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async isZombie() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async open(id) {
        this.id = await this.callService({
            uuser: id,
        });

        return this;
    }

    async openFromEmailAddr(emailAddr) {
        this.id = await this.callService({
            id: this.id,
            emailAddr: emailAddr,
        });

        return this;
    }

    async resetAttempts() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async setEmail(emailAddr) {
        if (this.id) {
            await this.callService({
                id: this.id,
                emailAddr: emailAddr,
            });
        }

        return this;
    }

    async setEmail2(emailAddr) {
        if (this.id) {
            await this.callService({
                id: this.id,
                emailAddr: emailAddr,
            });
        }

        return this;
    }

    async setEulaAccepted() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async setOtp(serviceId, settings) {
        if (this.id) {
            await this.callService({
                id: this.id,
                field: 'otp',
                serviceId: serviceId,
                settings: settings,
            });
        }

        return this;
    }

    async setOtp2(serviceId, settings) {
        if (this.id) {
            await this.callService({
                id: this.id,
                field: 'otp2',
                serviceId: serviceId,
                settings: settings,
            });
        }

        return this;
    }

    async setPermissions(permissions) {
        if (this.id) {
            await this.callService({
                id: this.id,
                permissions: permissions,
            });
        }

        return this;
    }

    async setPhone(phonenum) {
        if (this.id) {
            await this.callService({
                id: this.id,
                field: 'phoneId',
                phonenum: phonenum,
            });
        }

        return this;
    }

    async setPhone2(phonenum) {
        if (this.id) {
            await this.callService({
                id: this.id,
                field: 'phone2Id',
                phonenum: phonenum,
            });
        }

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

    async setUserGroup(userGroup) {
        let ugid = userGroup instanceof UserGroupHandle ? userGroup.getId() : userGroup;

        if (this.id) {
            await this.callService({
                id: this.id,
                userGroupId: ugid,
            });
        }

        return this;
    }

    async setUserName(userName) {
        if (this.id) {
            let result = await this.callService({
                id: this.id,
                userName: userName,
            });

            if (result instanceof Failure) {
                return result;
            }
        }

        return this;
    }
});