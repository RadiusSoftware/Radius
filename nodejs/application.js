/*****
 * Copyright (c) 2023 Radius Software
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
register('', class Application {
    constructor() {
        this.workers = {};
        this.className = Reflect.getPrototypeOf(this).constructor.name;

        if (Process.hasEnv(this.className)) {
            this.settings = Process.getEnv(this.className, 'json');
        }
        else {
            this.settings = {};
        }
    }

    getClassName() {
        return this.settings.appClass;
    }

    getSetting(name) {
        return this.settings[name];
    }

    getSettings() {
        return this.settings;
    }

    getSettingsFromProcess() {
        if ('nodeClass' in this.radius && this.radius.nodeClass in LibProcess.env) {
            return fromJson(this.getEnv(this.radius.nodeClass));
        }

        return {};
    }

    getWorker() {
    }

    hasSetting(name) {
        return name in this.settings;
    }

    hasWorker() {
    }

    async pause() {
    }

    async pauseWorker() {
    }

    async stop() {
    }

    async stopWorker() {
    }

    async start() {
        if (typeof this.settings.workers == 'number') {
            for (let i = 0; i < this.settings.workers; i++) {
                await this.startWorker();
            }
        }
    }

    async startWorker() {
        let workerClassName = `${this.className}Worker`;
        let worker = Process.fork(workerClassName, workerClassName, this.settings);
        //console.log(worker);
        return worker;
    }

    [Symbol.iterator]() {
        return Object.values(this.workers)[Symbol.iterator]();
    }
});


/*****
*****/
register('', class ApplicationWorker {
    constructor() {
        this.className = Reflect.getPrototypeOf(this).constructor.name;

        if (Process.hasEnv(this.className)) {
            this.settings = Process.getEnv(this.className, 'json');
        }
        else {
            this.settings = {};
        }
    }

    async start() {
    }

    async stop() {
    }

    async stop() {
    }
});


/*****
*****/
Process.on('#SPAWNED', async message => {
    console.log(Process.getNodeClass());
    let settings = Process.getApplication();
    console.log(settings);
});
