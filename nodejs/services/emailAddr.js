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
 * The EmailAddrService owns and manages email addresses on the Radius server
 * and in the Radius DBMS.  This service is responsbile for all DBMS operations
 * to ensure data consistency and standard rules for the population of those
 * records.  An EmailAddr is an object that represents a standard Internet email
 * address:  <username> @ <domain>.  The Radius server needs to know if an email
 * address exists, if that email address's domain exists and whether one or both
 * are deliverable or undeliverable.
*****/
createService(class EmailAddrService extends Service {
    static allowedStatuses = mkStringSet(
        'none',
        'deliverable',
        'undeliverable',
        'blacklisted',
    );

    static supportedDetails = {
        optedOut: mkDataShape({ type: BooleanType }),
        lastErrorMessage: mkDataShape({ type: StringType }),
        lastErrorDate: mkDataShape({ type: DateType }),
        lastDeliveryDate: mkDataShape({ type: DateType }),
        suspendedUntil: mkDataShape({ type: DateType }),
    };

    async onClearOwner(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            await mkDbmsThunk().modifyObj(dboEmailAddr.id, { ownerId: '' });
            return message.id;
        }
        
        return '';
    }

    async onEnsureEmailAddr(message) {
        let match = message.emailAddr.trim().toLowerCase().match(/^([a-z0-9-_.']+)@((?:[a-z0-9-_]+)(?:\.[a-z0-9-_]+)+)$/);

        if (match) {
            let dbms = mkDbmsThunk();

            let dboEmailAddr = await dbms.selectOneObj(
                DboEmailAddr,
                { addr: match[0].trim().toLowerCase() }
            );

            if (!(dboEmailAddr instanceof DboEmailAddr)) {
                let domain = mkDomainHandle();

                if (await domain.test(match[2], 'mx')) {
                    await domain.ensureDomain(match[2]);

                    if (domain.getId()) {
                        dboEmailAddr = await dbms.createObj(DboEmailAddr, {
                            addr: match[0].trim().toLowerCase(),
                            user: match[1].trim().toLowerCase(),
                            domain: match[2].trim().toLowerCase(),
                            domainId: domain.getId(),
                            status: 'none',
                            statusDate: mkTime(),
                            settings: {
                                optedOut: false,
                                lastErrorMessage: '',
                                lastErrorDate: mkTime(0),
                                lastDeliveryDate: mkTime(0),
                            }
                        });

                        return dboEmailAddr.id;
                    }
                }

                return mkFailure('radius.org.badEmailDomain');
            }

            return dboEmailAddr.id;
        }

        return mkFailure('radius.org.badEmailAddr');
    }

    async onGetDomain(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return dboDomain.domainId;
        }
        
        return '';
    }

    async onGetEmailAddr(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return dboEmailAddr.addr;
        }
        
        return '';
    }

    async onGetEmailAddrObj(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return dboEmailAddr;
        }
        
        return null;
    }

    async onGetOwnerId(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return dboEmailAddr.ownerId;
        }
        
        return '';
    }

    async onGetSetting(message) {
        let dotted = `settings.${message.settingName}`;
        return await mkDbmsThunk().getObjProperty(message.id, dotted);
    }

    async onGetStatus(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return {
                status: dboEmailAddr.status,
                statusDate: dboEmailAddr.statusDate,
            };
        }
        
        return null;
    }

    async onHasEmailAddr(message) {
        let emailAddrString = this.validateEmailAddressString(message.emailAddr);

        if (emailAddrString) {
            let dboEmailAddr = await mkDbmsThunk().selectOneObj(DboEmailAddr, {
                addr: emailAddrString,
            });

            return dboEmailAddr instanceof DboEmailAddr;
        }

        return false;
    }

    async onHasOwner(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return dboEmailAddr.ownerId != '';
        }
        
        return false;
    }

    async onIsAssigned(message) {
        let ownerId = await mkDbmsThunk().getObjProperty(message.id, 'ownerId');
        return typeof ownerId == string ? ownerId != '' : false;
    }

    async onOpen(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            return dboEmailAddr.id;
        }
        
        return '';
    }

    async onOpenEmailAddr(message) {
        let emailAddrString = this.validateEmailAddressString(message.emailAddr);

        if (emailAddrString) {
            let dboEmailAddr = await mkDbmsThunk().selectOneObj(DboEmailAddr, { addr: emailAddrString });
            return dboEmailAddr instanceof DboEmailAddr ? dboEmailAddr.id : '';
        }

        return '';
    }

    async onSetOwner(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);

        if (dboEmailAddr instanceof DboEmailAddr) {
            await mkDbmsThunk().modifyObj(dboEmailAddr.id, { ownerId: message.ownerId });
            return message.id;
        }
        
        return '';
    }

    async onSetSetting(message) {
        let setting = {};
        setting[`settings.${message.settingName}`] = message.settingValue;
        await mkDbmsThunk.modifyObj(message.id, settings);
    }


    async onSetStatus(message) {
        await mkDbmsThunk().modifyObj(message.id, {
            status: message.status,
            statusDate: mkTime(),
        });
    }

    async onTestDomain(message) {
        let dboEmailAddr = await mkDbmsThunk().getObj(message.id);
        return await mkDomainHandle().test(dboEmailAddr.domain, 'mx');
    }

    validateEmailAddressString(str) {
        if (typeof str == 'string') {
            let match = str.trim().toLowerCase().match(/^[a-z0-9-_.]+@(?:[a-z0-9-_]+)(?:\.[a-z0-9-_]+)+$/);

            if (match) {
                return match[0];
            }
        }

        return false;
    }
});


/*****
 * Email addresses are controlled as a managed resource meaning that all email
 * address operations must be funneled through the EmailAddrService and one of
 * its EmailAddrHandles.  Emails contain data pertaining to the delivery and the
 * ability to deliver messages to the specifid user and/or receiving domain. The
 * EmailAddrHandle is an object-specific handle, meaning that after it's opened,
 * the EmailAddr id is retained in the handle doesn't need to be provided on
 * subsequent operations with a given handle instance.
*****/
define(class EmailAddrHandle extends Handle {
    constructor(id) {
        super();
        this.id = id ? id : '';
    }

    async clearOwner() {
        if (this.id) {
            this.id = await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async ensureEmailAddr(emailAddr) {
        this.id = await this.callService({
            emailAddr: emailAddr,
        });
        
        return this;
    }

    static fromJson(value) {
        return mkEmailAddrHandle(value.id);
    }

    async getDomain() {
        let domainId;

        if (this.id) {
            domainId = await this.callService({
                id: this.id,
            });
        }
        
        return mkDomainHandle(domainId);
    }

    async getEmailAddr() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async getEmailAddrObj() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    getId() {
        return this.id;
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
            return await this.callService({
                id: this.id,
            })
        }

        return '';
    }

    async hasEmailAddr(emailAddr) {
        return await this.callService({
            emailAddr: emailAddr,
        });

        return this;
    }

    async hasOwner() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async isAssigned() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            })
        }

        return false;
    }

    async open(id) {
        this.id = await this.callService({
            id: id,
        });

        return this;
    }

    async openEmailAddr(emailAddr) {
        this.id = await this.callService({
            emailAddr: emailAddr,
        });

        return this;
    }

    async setOwner(ownerId) {
        if (this.id) {
            this.id = await this.callService({
                id: this.id,
                ownerId: ownerId,
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

    async setStatus(status) {
        if (this.id) {
            await this.callService({
                id: this.id,
                status: status,
            });
        }

        return this;
    }

    async testDomain() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }
});