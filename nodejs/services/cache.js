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
 * The cache service provides a mechanism for sharing small to moderately sized
 * date values across all server processes.  The primary use case is for HTTP
 * services, which may need to store some data on one call on one process and may
 * subsequently required access to that value on from a HTTPX running in another
 * process.  The purpose of the reason argument is to enable different processes
 * to have the own "namespaces" for naming purposes.  For example, "oath2-name"
 * will be unique to the oath2 HTTPX.  There are other uses, but the HTTPX values
 * cahcing is what led to the creation of this service.
*****/
createService(class CacheService extends Service {
    constructor() {
        super();
        this.values = {};
        this.defaultMillis = 5*60*1000;
    }

    async onDeleteValue(message) {
        let key = `${message.reason}-${message.name}`;
        delete this.values[key];
    }

    async onGetValue(message) {
        let key = `${message.reason}-${message.name}`;
        return this.values[key];
    }

    async onHasValue(message) {
        let key = `${message.reason}-${message.name}`;
        return key in this.values;
    }

    async onPopValue(message) {
        let key = `${message.reason}-${message.name}`;
        let value = this.values[key];
        delete this.values[key];
        return value;
    }

    async onSetValue(message) {
        let key = `${message.reason}-${message.name}`;
        this.values[key] = value;
        let millis = typeof message.millis == 'number' ? millis : this.defaultMillis;
        millis > 0 ? null : millis = this.defaultMillis;
        setTimeout(() => delete this.values[key], millis);
    }
});


/*****
 * The cache service provides a mechanism for sharing small to moderately sized
 * date values across all server processes.  The primary use case is for HTTP
 * services, which may need to store some data on one call on one process and may
 * subsequently required access to that value on from a HTTPX running in another
 * process.  The purpose of the reason argument is to enable different processes
 * to have the own "namespaces" for naming purposes.  For example, "oath2-name"
 * will be unique to the oath2 HTTPX.  There are other uses, but the HTTPX values
 * cahcing is what led to the creation of this service.
*****/
define(class CacheHandle extends Handle {
    constructor() {
        super();
    }

    async deleteValue(reason, key) {
        this.callService({
            reason: reason,
            key: key,
        });

        return this;
    }

    static fromJson(value) {
        return mkCacheHandle();
    }

    async getValue(reason, key) {
        return this.callService({
            reason: reason,
            key: key,
        });
    }

    async hasValue(reason, key) {
        return this.callService({
            reason: reason,
            key: key,
        });
    }

    async popValue(reason, key) {
        return this.callService({
            reason: reason,
            key: key,
        });
    }

    async setValue(reason, key, value, millis) {
        return this.callService({
            reason: reason,
            key: key,
            value: value,
            millis: millis,
        });
    }
});