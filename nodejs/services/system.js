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
 *      system#started
 *      system#tls
 *      system#configure
 *      system#setemail
 *      system#verifyemail
 *      system#setpassword
 *      system#setcluster
 *      system#running
 *      system#stopped
 * 
 * When a system is first installed, it must be configured by attaching it to a
 * cluster or configuring it for standalone operation before is can be used.
*****/
createService(class SystemService extends Service {
    constructor() {
        super();
        this.state = 'system#started';
    }

    async onGetState(message) {
        return this.state;
    }

    async onInitState(message) {
        if (this.state == 'system#started') {
            if (false /* check for TLS certificate */) {
                // ******************************************************************
                // ******************************************************************
                return 'system#tls';
            }

            let thunk = mkDbmsThunk();
            let users = await thunk.selectObj(DboUser);

            if (users.length > 0) {
                this.state = 'system#running';
            }
            else {
                let settings = mkSettingsHandle();
                let clusterFlag = await mkSettingsHandle().getSetting('cluster');

                if (clusterFlag) {
                    this.state = 'system#running';
                }
                else {
                    this.state = 'system#configure';
                }
            }
        }

        return this.state;
    }

    async onResetConfiguration(message) {
        if (this.state in {
            'system#setemail':0,
            'system#verifyemail':0,
            'system#setpassword':0,
            'system#setcluster':0,
        }) {
            this.state = 'system#configure';
            return this.state;
        }

        return mkFailure('resetConfiguration: FAILED');
    }

    async onStartConfiguration(message) {
        if (this.state == 'system#configure') {
            if (message.configType == 'standalone') {
                this.state = 'system#setemail';
                return this.state;
            }
            else if (message.configType == 'cluster') {
                this.state = 'system#setcluster';
                return this.state;
            }
        }

        return mkFailure('startConfiguration: FAILED');
    }
});


/*****
 * The handle object for objtaining services from the system service.  System
 * services are focused on managing the status of the installed software, how
 * up to date that software is, how up to date the packages are, and whether
 * the system is ready for operational execution.
*****/
define(class SystemHandle extends Handle {
    static fromJson(value) {
        return mkSystemHandle();
    }

    async getState() {
        return await this.callService({
        });
    }

    async initState() {
        await this.callService({
        });

        return this;
    }

    async resetConfiguration() {
        return await this.callService({
        });
    }

    async restart(when) {
        // ***************************************************************
        // ***************************************************************
    }

    async shutdown(when) {
        // ***************************************************************
        // ***************************************************************
    }

    async startConfiguration(configType) {
        return await this.callService({
            configType: configType,
        });
    }

    async update(when) {
        // ***************************************************************
        // ***************************************************************
    }
});