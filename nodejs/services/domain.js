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
const LibDns = require('node:dns');


/*****
 * The domain service provides a series of features for searching, tracking, and
 * verifying DNS domains on the wide-open Internet.  The most obvious reason for
 * this is eamil related.  There's a lot of fuss that can occur with SMTP / email
 * and the DomainService will collect and analyze domains via their DNS properties
 * and our ability to find hosts, connect to hosts, and to delivery emails to
 * users in a domain.
*****/
createService(class DomainService extends Service {
    static dnsRecordTypes = {
        A:     { type: 'IPv4 address',       value: StringType   },
        AAAA:  { type: 'IPv6 address',       value: StringType   },
        ANY:   { type: 'Any Records',        value: ObjectType   },
        CAA:   { type: 'CA Authorization',   value: ObjectType   },
        CNAME: { type: 'Canonical Name',     value: StringType   },
        MX:    { type: 'Mail Exchange',      value: ObjectType   },
        NAPTR: { type: 'Name Authority PTR', value: ObjectType   },
        NS:    { type: 'Name Server',        value: StringType   },
        PTR:   { type: 'Pointer Record',     value: StringType   },
        SOA:   { type: 'Start of Authority', value: ObjectType   },
        SRV:   { type: 'Service Records',    value: ObjectType   },
        TXT:   { type: 'Text Records',       value: [StringType] },
    };

    async onEnsureDomain(message) {
        let domainName = this.validateDomainName(message.domainName);

        if (domainName) {
            let dbms = mkDbmsThunk();

            let dboDomain = await dbms.selectOneObj(
                DboDomain,
                { domainName: domainName }
            );

            if (!dboDomain) {
                dboDomain = await dbms.createObj(DboDomain, {
                    domainName: domainName,
                    status: 'none',
                    statusDate: mkTime(),
                    settings: {
                        verified: false,
                        sendable: true,
                    }
                });
            }

            return dboDomain.id;
        }

        return mkFailure('radius.org.badDomain');
    }

    async onGetDnsRecords(message) {
        let records = {};
        let dboDomain = await mkDbmsThunk().getObj(message.id);

        if (dboDomain instanceof DboDomain) {
            for (let recordType of message.recordTypes) {
                if (recordType in DomainService.dnsRecordTypes) {
                    await new Promise((ok, fail) => {
                        LibDns.resolve(dboDomain.domainName, recordType, (error, data) => {
                            if (data) {
                                records[recordType.toLowerCase()] = data;
                            }

                            ok();
                        });
                    });
                }
            }
        }

        return records;
    }

    async onGetDomainName(message) {
        return await mkDbmsThunk().getObjProperty(message.id, 'domainName');
    }

    async onGetDomainObject(message) {
        return await mkDbmsThunk().getObj(message.id);
    }

    async onHasDomain(message) {
        let domainName = this.validateDomainName(message.domainName);

        if (domainName) {
            let dboDomain = await mkDbmsThunk().selectOneObj(
                DboDomain,
                { domainName, domainName }
            );

            return dboDomain instanceof DboDomain;
        }

        return false;
    }

    async onOpen(message) {
        let dboDomain = await mkDbmsThunk().getObj(message.id);

        if (dboDomain instanceof DboDomain) {
            return dboDomain.id;
        }
        
        return '';
    }

    async onOpenFromName(message) {
        let domainName = this.validateDomainName(message.domainName);

        if (domainName) {
            let dboDomain = await mkDbmsThunk().selectOneObj(
                DboDomain,
                { domainName, domainName }
            );

            if (dboDomain instanceof DboDomain) {
                return dboDomain.id;
            }
        }

        return '';
    }

    async onTest(message) {
        return new Promise((ok, fail) => {
            LibDns.resolve(message.domainName, 'ANY', (error, records) => {
                if (error) {
                    if (error.code === 'ENOTFOUND') {
                        ok(false);
                    }
                    else {
                        ok(false);
                    }
                }
                else {
                    if (message.recordTypes.length) {
                        let recordTypes = {};
                        message.recordTypes.forEach(recordType => recordTypes[recordType] = false);

                        for (let record of records) {
                            if (record.type.toLowerCase() in recordTypes) {
                                recordTypes[record.type.toLowerCase()] = true;
                            }
                        }

                        for (let found of Object.values(recordTypes)) {
                            if (!found) {
                                ok(false);
                            }
                        }
                    }
                    
                    ok(true);
                }
            });
        });
    }

    async onVerify(message) {
        let dboDomain = await mkDbmsThunk().getObj(message.id);

        if (dboDomain instanceof DboDomain) {
            if (await this.verifyDomain(dboDomain)) {
                dboDomain.status = 'verified';
                dboDomain.statusDate = mkTime();
                dboDomain.settings.verified = true;
            }
            else {
                dboDomain.status = 'not-found';
                dboDomain.statusDate = mkTime();
                dboDomain.settings.verified = false;
            }

            await mkDbmsThunk().updateObj(dboDomain);
            return dboDomain.settings.verified;
        }

        return false;
    }

    validateDomainName(domainName) {
        if (typeof domainName == 'string') {
            let match = domainName.trim().toLowerCase().match(/^[a-z0-9-_]+(?:\.[a-z0-9-_]+)+$/);

            if (match) {
                return match[0];
            }
        }

        return false;
    }
    
    async verifyDomain(dboDomain) {
        return new Promise((ok, fail) => {
            LibDns.resolve(dboDomain.domainName, 'ANY', (error, records) => {
                if (error) {
                    if (error.code === 'ENOTFOUND') {
                        ok(false);
                    }
                    else {
                        ok(false);
                    }
                }
                else {
                    ok(true);
                }
            });
        });
    }
});


/*****
 * Initialize the domain handle by using openDomain() or openDomain().
 * Thereafter, the DomainHandle retains the id as the id, which is
 * then automatically used for subsequent calls to the DomainService.  To
 * work with a another different domain, make a new DomainHandle and call
 * the appropriate open method as described above. Some useful features include
 * the DNS record searching capabilities, also the ability to verify that a
 * domain exists.  Updates made through the handle are permanent and saved
 * to the Radius database.
*****/
define(class DomainHandle extends Handle {
    constructor(id) {
        super();
        this.id = id ? id : '';
    }

    async ensureDomain(domainName) {
        this.id = await this.callService({
            domainName: domainName,
        });

        return this;
    }

    static fromJson(value) {
        return mkDomainHandle(value.id);
    }

    async getDnsRecords(...recordTypes) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                recordTypes: recordTypes,
            });
        }

        return [];
    }

    async getDomainName() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async getDomainObject() {
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

    async hasDomain(domainName) {
        return await this.callService({
            domainName: domainName,
        });
    }

    async open(id) {
        this.id = await this.callService({
            id: id,
        });

        return this;
    }

    async openFromName(domainName) {
        this.id = await this.callService({
            domainName: domainName,
        });

        return this;
    }

    async test(domainName,  ...recordTypes) {
        return await this.callService({
            domainName: domainName,
            recordTypes: recordTypes,
        });
    }

    async verify() {
        if (this.id) {
            return await this.callService({
                id: id,
            });
        }

        return false;
    }
});