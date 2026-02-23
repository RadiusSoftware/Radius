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
createService(class WebServiceService extends Service {
    constructor() {
        super();
    }

    async notify() {
        // *******************************************************************
        // *******************************************************************
    }

    async onCreate(message) {
        let webService = WebServices.create(message.options);
        return webService;
    }

    async onDelete(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onDisable(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onEnable(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onGetApiKey(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onGetClientCredentials(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onGetId(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onGetShape(message) {
        console.log(WebServices.getShape());
        return WebServices.getShape();
    }

    async onList(message) {
        return WebServices.list();
    }

    async onListFromFqn(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onLoad(message) {
        await WebServices.load();
    }

    async onSearchFromPath(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onStart(message) {
        // *******************************************************************
        // *******************************************************************
    }

    async onStop(message) {
        // *******************************************************************
        // *******************************************************************
    }
});


/*****
*****/
define(class WebServiceHandle extends Handle {
    constructor(id) {
        super();
        this.id = typeof id == 'string' ? id : '';
    }

    async create(options) {
        if (FunctionType.verify(options.clss) && Data.classExtends(options.clss, WebService)) {
            options.fqn = options.clss['#fqn'];
        }
        else if (!StringType.verify(options.fqn)) {
            this.id = '';
            return this;
        }
        
        this.id = await this.callService({
            options: options,
        });

        return this;
    }

    async delete() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async disable() {
        await this.callService({});
        return this;
    }

    async enable() {
        await this.callService({});
        return this;
    }

    static fromJson(value) {
        return mkWebServiceHandle(value.id);
    }

    async getApiKey() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }
    }

    async getClientCredentials() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }
    }

    getId() {
        return this.id;
    }

    async getShape() {
        return await this.callService({});
    }

    async list() {
        return await this.callService({});
    }

    async listFromFqn(fqn) {
        return await this.callService({
            fqn: fqn,
        });
    }

    async load() {
        await this.callService({});
        return this;
    }

    async searchByPath(path) {
        this.id = await this.callService({
            path: path,
        });

        return this;
    }

    async start() {
        await this.callService({});
        return this;
    }

    async stop() {
        await this.callService({});
        return this;
    }
});
