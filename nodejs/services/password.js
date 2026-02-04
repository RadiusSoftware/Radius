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
 * The PasswordService provides a logical secure framework for managing user
 * passwords and enforcing password rules.  Essentially, passwords are stored in
 * some sort of digested form with lots of various security safeguards.  Also,
 * passwords are only manipulated by the server's primary task to ensure central
 * consistency and timing associated with password operations.  The service is
 * designed to support multiple password digests in use at the same time.  This
 * enables us to improvide the password digester algorithms without forcing all
 * users to set new passwords.  Each password digest also contains the name of
 * the digester algorithm used.
*****/
createService(class PasswordService extends Service {
    static passwordSymbolSet = `-_/?;:'"!@#$%^&*+=(){}\\[\\]`;

    static passwordRequirements = [
        new RegExp(`[a-zA-Z]`),
        new RegExp(`[0-9]`),
        new RegExp(`[${PasswordService.passwordSymbolSet}]`),
    ];

    static passwordVerse = new RegExp(`^[a-zA-Z0-9${PasswordService.passwordSymbolSet}]+$`);

    static passwordDigesters = {
        '001': async (userId, password) => {
            let prefix = await Crypto.hash('sha512', userId);
            let part1 = await Crypto.hash('sha512', `${prefix}${password}${userId}`);
            let part2 = await Crypto.hash('sha512', `${part1}${prefix}${password}`);
            return `${part1}#${part2}`
        },
    };

    static currentPasswordVariant = '001';
    static currentPasswordDigester = PasswordService.passwordDigesters[
        PasswordService.currentPasswordVariant
    ];

    constructor() {
        super();
    }

    async hasPasswordInHistory(userId, passwordString) {
        let digests = {};

        for (let password of await this.selectAllPasswords(userId)) {
            let variant = password.value.variant;

            if (!(variant in digests)) {
                digests[variant] = await PasswordService.passwordDigestors[variant](userId, passwordString);
            }

            if (digests[variant] === password.value.digest) {
                return true;
            }
        }

        return false;
    }

    async onAuthenticate(message) {
        await this.scrubPasswordHistory(message.userId);
        let currentPassword = await this.selectCurrentPassword(message.userId);

        if (currentPassword) {
            let passwordDigester = PasswordService.passwordDigesters[currentPassword.value.variant];
            let passwordDigest = await passwordDigester(message.userId, message.password);
            return passwordDigest === currentPassword.value.digest;
        }

        return false;
    }

    async onGetPasswordRules(message) {
        return {
            charverse: PasswordService.passwordVerse,
            requirements: PasswordService.passwordRequirements,
        };
    }

    async onHasCurrentPassword(message) {
        await this.scrubPasswordHistory(message.userId);
        let password = await this.selectCurrentPassword(message.userId);
        return password != null;
    }

    async onHasPassword(message) {
        await this.scrubPasswordHistory(message.userId);
        let passwords = await this.selectAllPasswords(message.userId);
        return passwords.length > 0;
    }

    async onRevokePassword(message) {
        await this.scrubPasswordHistory(message.userId);
        let password = await this.selectCurrentPassword(message.userId);

        if (password) {
            await mkDbmsThunk.modifyObj(password.id, { 'active': false });
        }
    }

    async onSetPassword(message) {
        await this.scrubPasswordHistory(message.userId);
        let passwordString = this.validatePasswordString(message.password);
        
        if (passwordString) {
            if (await this.hasPasswordInHistory(message.userId, passwordString)) {
                return mkFailure('radius.org.passwordUsed');
            }
            else {
                let dbms = mkDbmsThunk();
                let passwordDigest = await PasswordService.currentPasswordDigester(message.userId, passwordString);
                let currentPassword = await this.selectCurrentPassword(message.userId);
                let passwordMaxDays = await mkSettingsHandle().getSetting('passwordMaxDays');
                let expires = passwordMaxDays > 0 ? mkTime().addDays(passwordMaxDays) : mkTime(0);

                if (currentPassword) {
                    await dbms.modifyObj(currentPassword.id, { active: false });
                }

                await dbms.createObj(DboPassword, {
                    userId: message.userId,
                    expires: expires,
                    created: mkTime(),
                    active: true,
                    value: {
                        digest: passwordDigest,
                        variant: PasswordService.currentPasswordVariant,
                    }
                });

                return true;
            }
        }
        else {
            return mkFailure('radius.org.passwordFailure');
        }
    }

    async scrubPasswordHistory(userId) {
        let dbms = mkDbmsThunk();
        let passwordHistoryMaxDays = await mkSettingsHandle().getSetting('passwordHistoryMaxDays');
        let passwordHistoryDate = mkTime().addDays(-passwordHistoryMaxDays);

        for (let password of await this.selectAllPasswords(userId)) {
            if (password.active) {
                if (password.expires.isGT(mkTime())) {
                    await dbms.modifyObj(DboPassword, { active: false });
                }
            }
            else if (passwordHistoryMaxDays > 0) {
                if (password.expires.isNE(mkTime(0))) {
                    if (password.created.isLT(passwordHistoryDate)) {
                        await dbms.deleteObj(password);
                    }
                }
            }
            else {
                await dbms.deleteObj(password);
            }   
        }
    }

    async selectAllPasswords(userId) {
        return await mkDbmsThunk().selectObj(
            DboPassword,
            { userId: userId },
            { created: 'desc' }
        );
    }

    async selectCurrentPassword(userId) {
        return await mkDbmsThunk().selectOneObj(
            DboPassword,
            { active: true }
        );
    }

    validatePasswordString(password) {
        if (password.length >= 8) {
            if (password.match(PasswordService.passwordVerse)) {
                for (let requirement of PasswordService.passwordRequirements) {
                    if (!password.match(requirement)) {
                        return false;
                    }
                }
            }

            return password;
        }

        return false;
    }
});


/*****
 * Application code does NOT directly manage passwords!  Password handles are
 * employed to interact with the PasswordService running in the primary server
 * process.  It provides the essential services for setting passwords and then
 * using those passwords to authenticate users.  Note that setting a password
 * may result in a validate failure, which is captured at this end and reported
 * to the caller.
*****/
define(class PasswordHandle extends Handle {
    constructor() {
        super();
    }

    async authenticate(userId, password) {
        return await this.callService({
            userId: userId,
            password: password,
        });
    }

    static fromJson(value) {
        return mkPasswordHandle();
    }

    async getPasswordRules() {
        return await this.callService({
        });
    }

    async hasCurrentPassword(userId) {
        return await this.callService({
            userId: userId,
        });
    }

    async hasPassword(userId) {
        return await this.callService({
            userId: userId,
        });
    }

    async revokePassword(userId) {
        await this.callService({
            userId: userId,
        });

        return this;
    }

    async setPassword(userId, password) {
        let result = await this.callService({
            userId: userId,
            password: password,
        });

        return result === true ? true : result.info;
    }
});