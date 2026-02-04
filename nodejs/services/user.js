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
 * tables used throughout that server instance.  Users and teams are part of
 * the radius DBMS specified user permissions for all access, both web pages
 * and web applications, that are part of that instance.   User records are
 * associated with credentials records, which are separate from the user, to
 * facilitate authentication.
*****/
createService(class UserService extends Service {
    constructor() {
        super();
    }

    async onClearEmail2(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.emailAddr2Id) {
            await dbms.modifyObj(dboUser.emailAddr2Id, { ownerId: '' });
            await dbms.modifyObj(dboUser.id, { emailAddr2Id: '' });
        }
    }

    async onClearOtp(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.otpId) {
            await dbms.modifyObj(dboUser.otpId, { ownerId: '' });
            await dbms.modifyObj(dboUser.id, { otpId: '' });
        }
    }

    async onClearPhone(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser && dboUser.phoneId) {
            await dbms.modifyObj(dboUser.phoneId, { ownerId: '' });
            await dbms.modifyObj(dboUser.id, { phoneId: '' });
        }
    }

    async onCreateUser(message) {
        let dbms = await mkDbmsThunk().startTransaction();
        let emailAddr = await mkEmailAddrHandle().ensureEmailAddr(message.emailAddr);

        if (!emailAddr.getId()) {
            return mkFailure('radius.org.badEmailAddr');
        }

        if (await emailAddr.getOwnerId()) {
            return mkFailure('radius.org.emailInUse');
        }

        if (!message.firstName.trim().length || !message.lastName.trim().length) {
            return mkFailure('radius.org.NameRequired');
        }

        if (!message.team.getId()) {
            return 'radius.org.badTeam';
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

        let dboUser = await dbms.createObj(DboUser, {
            emailAddrId: emailAddr.getId(),
            firstName: message.firstName.trim(),
            lastName: message.lastName.trim(),
            teamId: message.team.getId(),
            active: typeof message.active == 'boolean' ? message.active : true,
            settings: typeof message.settings == 'object' ? message.settings : {},
            verifier: {
                devices: {},
                channels: { email: 'unverified', email2: 'unverified', phone: 'unverified', authApp: 'unverified' },
                auxFactor: false,
            },
            permissions: userPermissions,
        });

        await dbms.modifyObj(emailAddr.getId(), { ownerId: dboUser.id });
        await dbms.commit();
        return dboUser.id;
    }

    async onForgetDevice(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);
        
        if (dboUser instanceof DboUser) {
            await dbms.deleteObjProperty(message.id, `verifier.devices.${message.deviceId}`);
        }
    }

    async onGetChannelStatus(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            return dboUser.verifier.channels[message.channel] == 'verified';
        }
        
        return false;
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

    async onGetPermissions(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'permissions');
    }

    async onGetPhone(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'phoneId');
    }

    async onGetSetting(message) {
        let dotted = `settings.${message.settingName}`;
        return await mkDbmsThunk().getObjProperty(message.id, dotted);
    }

    async onGetTeam(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'teamId');
    }

    async onGetUserObject(message) {
        return await mkDbmsThunk().getObj(message.id);
    }

    async onHasAuxFactor(message) {
        return await mkDbmsThunk().getObjProperty(message.id, `verifier.auxFactor`);
    }

    async onHasExcessAttempts(message) {
        let failedLogins = await mkDbmsThunk().getObjProperty(message.id, `failedLogins`);
        let loginMaxFailures = await mkSettingsHandle().getSetting('loginMaxFailures');
        return failedLogins > loginMaxFailures;
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

    async onIsDeviceVerified(message) {
        let dbms = mkDbmsThunk();

        if (message.deviceId) {
            let dboUser = await dbms.getObj(message.id);

            if (dboUser instanceof DboUser) {
                let tag = dboUser.verifier.devices[message.deviceId];

                if (tag instanceof Time) {
                    let rememberDays = await mkSettingsHandle().getSetting('forgetDeviceDays');
                    tag.addDays(rememberDays);
                    return tag.isGT(mkTime());
                }
            }
        }

        return false;
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

    async onListUnverifiedChannels(message) {
        let channels = [];
        let dboUser = await mkDbmsThunk().getObj(message.id);

        if (dboUser instanceof DboUser) {
            for (let key in dboUser.verifier.channels) {
                if (dboUser.verifier.channels[key] == 'unverified') {

                    if (key in { email:0, email2:0 }) {
                        if ((await mkEmailerHandle().getStatus()) == 'online') {
                            channels.push(key);
                        }
                    }
                    else if (key == 'phone') {
                        if ((await mkSmSHandle().getStatus()) == 'online') {
                            channels.push(key);
                        }
                    }
                    else if (key == 'authApp') {
                        if ((await mkAuthAppHandle().getStatus()) == 'online') {
                            channels.push(key);
                        }
                    }
                }
            }
        }

        return channels;
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

    async onSetAuthApp(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            if (dboUser.authAppId) {
                let authApp = await dbms.getObj(dboUser.authAppId);
                authApp.serviceId = message.serviceId;
                authApp.settings = message.settings;
                await dbms.updateObj(authApp);
            }
            else {
                let authApp = await dbms.createObj(DboAuthApp, {
                    ownerId: message.id,
                    serviceId: message.serviceId,
                    settings: message.settings,
                });

                await dbms.modifyObj(dboUser.id, { authAppId: authApp.id });
            }

            return true;
        }

        return mkFailure('radius.org.userNotFound');
    }

    async onSetEmail(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let newEmailAddr = await mkEmailAddrHandle().ensureEmailAddr(message.username);

            if (!newEmailAddr.getId()) {
                return mkFailure('radius.org.badEmailAddr');
            }

            if (newEmailAddr.getId() == dboUser.emailAddrId) {
                return true;
            }

            if (await newEmailAddr.hasOwner()) {
                return mkFailure('radius.org.emailInUse');
            }

            await mkEmailAddrHandle(dboUser.emailAddrId).clearOwner();
            await newEmailAddr.setOwner(this.dboUser.id);
            dboUser.emailAddrId = newEmailAddr.getId();

            await dbms.modifyObj(dboUser.id, {
                emailAddrId: newEmailAddr.getId(),
                'verification.channels.email': false,
            });

            return true;
        }

        return mkFailure('radius.org.userNotFound');
    }

    async onSetEmail2(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let newEmailAddr2 = await mkEmailAddrHandle().ensureEmailAddr(message.emailAddr);

            if (!newEmailAddr2.getId()) {
                return mkFailure('radius.org.badEmailAddr');
            }

            if (newEmailAddr2.getId() == dboUser.emailAddr2Id) {
                return true;
            }

            if (await newEmailAddr2.hasOwner()) {
                return mkFailure('radius.org.emailInUse');
            }

            await newEmailAddr2.setOwner(this.dboUser.id);
            dboUser.emailAddr2Id = newEmailAddr2.getId();

            await dbms.modifyObj(dboUser.id, {
                emailAddrId: newEmailAddr2.getId(),
                'verification.channels.email': false,
            });

            return true;
        }

        return mkFailure('radius.org.userNotFound');
    }

    async onSetEulaAccepted(message) {
        await mkDbmsThunk().modifyObj(message.id, { eulaAccepted: true});
    }

    async onSetPermissions(message) {
        let dbms = mkDbmsThunk();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let permissionSet = mkPermissionSet();
            let permissionTypeSet = mkStringSet(...dboUser.permissions);

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
        let dbms = await mkDbmsThunk().startTransaction();
        let dboUser = await dbms.getObj(message.id);

        if (dboUser instanceof DboUser) {
            let newPhone = await mkPhoneHandle().ensurePhoneNumber(message.phonenum);

            if (newPhone.getId()) {
                if (newPhone.getId() != dboUser.phoneId) {
                    if (dboUser.phoneId) {
                        let oldDboPhone = await dbms.getObj(dboUser.phoneId);

                        if (oldDboPhone instanceof DboPhone) {
                            await dbms.modifyObj(oldDboPhone, { ownerId: '' });
                        }
                        else {
                            await dbms.rollback();
                            return mkFailure('radius.org.oldPhoneNotFound');
                        }
                    }

                    await dbms.modifyObj(newPhone.getId(), { ownerId: user.id });
                    await dbms.modifyObj(oldPhone.id, { phoneId: oldDboPhone.id });
                }
                
                await dbms.commit();
                return true;
            }
            else {
                await dbms.rollback();
                return mkFailure('radius.org.userNotFound');
            }
        }
        else {
            await dbms.rollback();
            return mkFailure('radius.org.userNotFound');
        }
    }

    async onSetSetting(message) {
        let dotted = `settings.${message.settingName}`;

        return await mkDbmsThunk().setObjProperty(
            message.id,
            dotted,
            message.settingValue
        );
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

    async clearPhone() {
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

    async forgetDevice(deviceId) {
        if (this.id) {
            await this.callService({
                id: this.id,
                deviceId: deviceId,
            });
        }

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

    async getSetting(settingName) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                settingName: settingName,
            });
        }

        return null;
    }

    async getTeam() {
        let teamId;

        if (this.id) {
            teamId = await this.callService({
                id: this.id,
            });
        }

        return mkTeamHandle(teamId);
    }

    async getUserObject() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async hasAcceptedEula() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async hasAuxFactor() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
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

    async hasPhone() {
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

    async isChannelVerified(channel) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                channel: channel,
            });
        }

        return false;
    }

    async isDeviceVerified(deviceId) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                deviceId: deviceId,
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

    async listUnverifiedChannels() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return [];
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

    async rememberDevice(deviceId) {
        if (this.id) {
            await this.callService({
                id: this.id,
                deviceId: deviceId,
            });
        }

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

    async setEmail(username) {
        if (this.id) {
            await this.callService({
                id: this.id,
                username: username,
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
});