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
 * An enumeration of the types of links thare are supported and may be created.
 * For security's sake, very tight code must be written for each of those
 * types.
*****/
const linkType = mkRdsEnum(
    'verifyself',
    'websocket',
);


/*****
 * The data shape for a link.  Links can be either volatile or non-volatile.
 * Volatile links are NOT stored in the DBMS and should therefore only be used
 * for very brief existence.  Non-volatile links may be used for things such
 * several-day new-user links, or reporting or informational things.  For
 * example, with a survey system, the link life could be a week or longer, and
 * should NOT be volatime.  Most security related links will be volatile.
*****/
const linkShape = mkRdsShape({
    uuid: StringType,
    type: mkRdsShape(linkType),
    path: StringType,
    action: FunctionType,
    settings: mkRdsShape({}),
    mime: StringType,
    verify: StringType,
    active: BooleanType,
    volatile: BooleanType,
    attempts: Int32Type,
    actuals: Int32Type,
    expires: DateTimeType,
    closed: DateTimeType,
});


/*****
 * When the link servier is constructed, it will initialize itself by scanning
 * the DBMS for active links to be loaded.  Links that are successfully created
 * and loaded during initialization, must be active.  Once a link is somehow
 * inactive or deactivated, it it physically removed from the service.  Also,
 * links are inspected during loading to deactivate links that have already
 * expired but NOT yet marked inactive.
*****/
createService(class LinkService extends Service {
    constructor() {
        super();
        this.linksByUUID = {};
        this.linksByPath = {};
    }

    async checkExpired() {
        // ********************************************************
        // ********************************************************
    }

    async deactivateLink(link) {
        if (!link.volatile) {
            link.active = false;
            link.closed = mkTime();
            await this.save(link);
        }

        delete this.linksByUUID[link.uuid];
        delete this.linksByPath[link.path];
    }

    async init() {
        // ********************************************************
        // ********************************************************
    }

    async load(uuid) {
        // ********************************************************
        // ********************************************************
    }

    async onCreate(message) {
        let link = linkShape.getDefault();
        link.uuid = Crypto.generateUUID();
        link.path = `/${Crypto.generateUUID()}/${Crypto.generateUUID()}`;
        link.expires = mkTime();
        link.attempts = 1;
        link.volatile = true;
        link.mime = 'application/octet-stream';

        for (let key of linkShape.getKeys()) {
            if (key in message.options) {
                link[key] = message.options[key];
            }
        }

        for (let key in message.options.lifetime) {
            let value = message.options.lifetime[key];

            if (value >= 0) {
                switch (key) {
                    case 'seconds':
                        link.expires.addSeconds(value);
                        break;

                    case 'minutes':
                        link.expires.addMinutes(value);
                        break;

                    case 'hours':
                        link.expires.addHours(value);
                        break;

                    case 'days':
                        link.expires.addDays(value);
                        break;

                    case 'weeks':
                        link.expires.addWeeks(value);
                        break;

                    case 'months':
                         link.expires.addMonths(value);
                        break;

                }
            }
        }

        if (link.attempts > 0 && link.expires.isGT(mkTime())) {
            link.active = true;
        }

        if (link.active) {
            if (!link.volative) {
                await this.save(link);
            }

            this.linksByUUID[link.uuid] = link;
            this.linksByPath[link.path] = link;
            return link.uuid;
        }
    }

    async onDeactivate(message) {
        if (message.uuid in this.linksByUUID) {
            await this.deactivateLink(this.linksByUUID[message.uuid]);
        }
    }

    async onExecute(message) {
        // ********************************************************************
        // ********************************************************************
        try {
            if (message.uuid in this.linksByUUID) {
                let link = this.linksByUUID[message.uuid];

                if (link.active) {
                    if (link.expires.isGT(mkTime())) {
                        link.actuals++;
                        
                        if (link.actuals >= link.attempts)  {
                            link.active = false;
                        }

                        await this.save(link);
                        link.action(...args);
                    }
                }
            }
        }
        catch (e) {
            await caught(e);
        }
    }

    async onGet(message) {
        if (message.uuid) {
            if (message.uuid in this.linksByUUID) {
                let link = this.linksByUUID[message.uuid];

                if (link.active) {
                    if (link.expires.isGT(mkTime())) {
                        return link;
                    }
                }
            }
        }
        else if (message.path) {
            if (message.path in this.linksByPath) {
                let link = this.linksByPath[message.path];

                if (link.active) {
                    if (link.expires.isGT(mkTime())) {
                        return link;
                    }
                }
            }
        }
    }

    async onGetPath(message) {
        if (message.uuid in this.linksByUUID) {
            return this.linksByUUID[message.uuid].path;
        }
    }

    async onGetType(message) {
        if (message.uuid in this.linksByUUID) {
            return this.linksByUUID[message.uuid].type;
        }
    }

    async onOpen(message) {
        if (message.arg in this.linksByPath) {
            let link = this.linksByPath[message.arg];

            if (link.active) {
                if (link.expires.isGT(mkTime())) {
                    return link.uuid;
                }
            }
        }

        if (message.arg in this.linksByUUID) {
            let link = this.linksByUUID[message.arg];

            if (link.active) {
                if (link.expires.isGT(mkTime())) {
                    return link.uuid;
                }
            }
        }
    }

    async save(link) {
        // ********************************************************
        // ********************************************************
    }
});


/*****
 * The handle that interacts with the link service and provides additional
 * functionality.  The shape for the new-link options differs from the actual
 * shape of the link itself due primarily to internal computations and security.
 * Link appropriate code and find, activate, and deactivate links in addition
 * to those automated features within the link service.
*****/
define(class LinkHandle extends Handle {
    static optionsShape = mkRdsShape({
        type: mkRdsShape(linkType),
        _action: FunctionType,
        _settings: mkRdsShape({}),
        _verify: StringType,
        _mime: StringType,
        _volatile: BooleanType,
        _attempts: Int32Type,
        lifetime: {
            _seconds: Int32Type,
            _minutes: Int32Type,
            _hours: Int32Type,
            _days: Int32Type,
            _weeks: Int32Type,
            _months: Int32Type,
        },
    });

    constructor(uuid) {
        super();
        this.uuid = typeof uuid == 'string' ? uuid : '';
    }

    async create(options) {
        if (!LinkHandle.optionsShape.verify(options)) {
            return undefined;
        }

        this.uuid = await this.callService({
            options: options,
        });

        return this;
    }

    async deactivate() {
        await this.callService({
            uuid: this.uuid,
        });

        return this;
    }

    async execute(...args) {
        await this.callService({
            uuid: this.uuid,
            args: args,
        });

        return this;
    }

    static fromJson(value) {
        return mkAuthAppHandle(value.uuid);
    }

    get(path) {
        let args = {};
        path ? args.path = path : args.uuid = this.uuid;
        return this.callService(args);
    }

    getPath() {
        if (this.uuid) {
            return this.callService({
                uuid: this.uuid,
            });
        }
    }

    getType() {
        if (this.uuid) {
            return this.callService({
                uuid: this.uuid,
            });
        }
    }

    getUUID() {
        return this.uuid;
    }

    async open(arg) {
        this.uuid = await this.callService({
            arg: arg,
        });

        return this;
    }
});