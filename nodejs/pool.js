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
 * Server-side resource pool, for instance, all of the connections to a specific
 * DBMS host and database. During construction, the opts may include a resource
 * maker, in which case the pool will create new objects as required when alloc()
 * is called.  If you prefer, resources can be constructed externally and the
 * added with the add() method, at which point, the pool takes over management
 * of that resource.  As usual, resources are allocated, freed up, and destroyed
 * after a specified timeout or decay period.
*****/
define(class Pool {
    static poolKey = Symbol('poolKey');

    constructor(opts) {
        this.allocated = {};
        this.available = [];
        this.resourceId = 1;
        this.pending = [];

        this.limit = 0;
        this.maker = null;
        this.timeout = null;

        if (opts) {
            typeof opts.limit == 'number' ? this.limit = opts.limit : null;
            typeof opts.maker == 'function' ? this.maker = opts.maker : null;
            typeof opts.timeout == 'number' ? this.timeout = opts.timeout : null;
        }
    }

    addResource(resource) {
        if (!(Pool.poolKey in resource)) {
            resource[Pool.poolKey] = {
                pool: this,
                resourceId: this.resourceId++,
                timeout: null,
            };

            this.allocated[resource[Pool.poolKey].resourceId] = resource;
        }

        return this;
    }

    async alloc(waitFlag) {
        if (this.available.length) {
            let resource = this.available.shift();
            resource[Pool.poolKey].timeout ? clearTimeout(resource[Pool.poolKey].timeout) : null;
            resource[Pool.poolKey].timeout = null;
            this.allocated[resource[Pool.poolKey].resourceId] = resource;
            return resource;
        }

        if (this.maker && Object.keys(this.available).length < this.limit) {
            let resource = this.maker();

            if (resource instanceof Promise) {
                resource = await resource;
            }

            resource[Pool.poolKey] = {
                pool: this,
                resourceId: this.resourceId++,
                timeout: null,
            };

            this.allocated[resource[Pool.poolKey].resourceId] = resource;
            return resource;
        }

        if (waitFlag) {
            let fulfill;

            let promise = new Promise(async (ok, fail) => {
                fulfill = resource => {
                    ok(resource);
                }
            });

            this.pending.push(fulfill);
            return promise;
        }
        else {
            return null;
        }
    }

    async free(resource) {
        if (Pool.poolKey in resource && Object.is(resource[Pool.poolKey].pool, this)) {
            if (this.pending.length) {
                this.pending.shift()(resource);
            }
            else {
                delete this.allocated[resource[Pool.poolKey].resourceId];
                this.available.push(resource);

                if (this.timeout) {
                    resource[Pool.poolKey].timeout = setTimeout(() => this.removeResource(resource), this.timeout);
                }
            }
        }

        return this;
    }

    hasAvailable() {
        return this.available.length > 0;
    }

    removeResource(resource) {
        if (Pool.poolKey in resource) {
            for (let i = 0; i < this.available.length; i++) {
                if (Object.is(resource, this.available[i])) {
                    resource[Pool.poolKey].timeout ? clearTimeout(resource[Pool.poolKey].timeout) : null;
                    delete resource[Pool.poolKey];
                    this.available.splice(i, 1);
                    break;
                }
            }
        }

        return this;
    }
});