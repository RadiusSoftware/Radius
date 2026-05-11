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
 * The system service is used for managing the initialization and management of
 * the host or system.  The system has calls for attaching, detaching the host
 * from a cluster and also tracks a newly installed system to know that it must
 * be either initialized or attached before it can be used:
 * 
 *      system:status
 *      system:installed
 *      system:cluster
 *      system:standalone
 *      system:configureCluster
 *      system:configureEmail
 *      system:configurePassword
 *      system:configureEula
 * 
 * When a system is first installed, it must be configured by attaching it to a
 * cluster or configuring it for standalone operation before is can be used.
*****/
createService(class SystemService extends Service {
    constructor() {
        super();
        this.state = 'system:startup';
    }

    async onConfigureCluster(message) {
        // ********************************************************************
        // ********************************************************************
        if (this.state == 'system:installed') {
        }

        return this.state;
    }

    async onConfigureStandalone(message) {
        // ********************************************************************
        // ********************************************************************
        if (this.state == 'system:installed') {
        }
        else if (this.state == 'system:configureEmail') {
        }
        else if (this.state == 'system:configurePassword') {
        }
        else if (this.state == 'system:configureEula') {
        }

        return this.state;
    }

    async onGetState(message) {
        return this.state;
    }

    async onStartup(message) {
        if (this.state == 'system:startup') {
            let thunk = mkDbmsThunk();
            let users = await thunk.selectObj(DboUser);

            if (users.length == 0) {
                this.state = 'system:standalone';
            }
            else if (false) {
                // ********************************************************************
                // ********************************************************************
                // CHECK IF ATTACHED TO CLUSTER.............
                //this.state = 'system:attached';
            }
            else {
                this.state = 'system:installed';
            }
        }

        return this.state;
    }
});


/*****
*****/
define(class SystemHandle extends Handle {
    static fromJson(value) {
        return mkSystemHandle();
    }

    async configureCluster(clusterName) {
        let state = await this.callService({
        });

        return state;
    }

    async configureStandalone() {
        let state = await this.callService({
        });

        return state;
    }

    async getState() {
        return await this.callService({
        });
    }

    async startup() {
        await this.callService({
        });

        return this;
    }
});