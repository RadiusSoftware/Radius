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
 * ChildProcess is a class that extends the features of the core nodejs library
 * to help manage interprocess communications with a parent process and the
 * management of child processes by the current process.  Part of the functions
 * are to convert nodejs ChildProcess events into Radius messages.  Remember
 * that the Radius Message class along with the Radius Emitter provies the core
 * features for all intraprocess, interprocess, and host-to-host communications
 * and event management.  One point to note is that all messaging employs the
 * the enhanced JSON features provided by Radius.  Hence, the IPC messageing
 * implemented in this module performs conversion between messages and bulk
 * JSON automatically.  Bulk JSON is simply where an object or message is first
 * converted to JSON using Radius JSON features and transmitted as a "bulk" JSON
 * message: { "json": "<JSON encoded object>" }.
*****/
register('', class ChildProcess extends Emitter {
    constructor(settings) {
        super();
        this.settings = settings;
        this.settings.childProcess.on('close', (code, signal) => this.onClose(code, signal));
        this.settings.childProcess.on('disconnect', () => this.onDisconnect());
        this.settings.childProcess.on('error', (error) => this.onError(error));
        this.settings.childProcess.on('exit', (code, signal) => this.onExit(code, signal));
        this.settings.childProcess.on('message', (message, sendHandle) => this.onMessage(message, sendHandle));
        this.settings.childProcess.on('spawn', () => this.onSpawn());
    }

    callChild(message) {
        let trap = mkTrap().setExpected(1);
        message['#TRAP'] = trap.id;
        message['#CALL'] = true;

        this.settings.childProcess.send(
            { json: toJson(message) },
        );

        return trap.promise;
    }

    disconnect() {
        this.settings.childProcess.disconnect();
        return this;
    }

    getClass() {
        return this.settings.nodeClass;
    }

    getConnected() {
        return this.settings.childProcesses.connected;
    }

    getExitCode() {
        return this.settings.childProcess.exitCode;
    }

    getGuid() {
        return this.settings.nodeGuid;
    }

    getKilled() {
        return this.settings.childProcess.killed;
    }

    getPid() {
        return this.settings.childProcess.pid;
    }

    getSignalCode() {
        return this.settings.childProcess.signalCode;
    }

    getSpawnArgs() {
        return this.settings.childProcess.spawnargs;
    }

    getSpawnFile() {
        return this.settings.childProcess.spawnfile;
    }

    getStdErr() {
        return this.settings.childProcess.stderr;
    }

    getStdIn() {
        return this.settings.childProcess.stdin;
    }

    getStdIo() {
        return this.settings.childProcess.stdeio;
    }

    getStdOut() {
        return this.settings.childProcess.stdout;
    }

    getTitle() {
        return this.settings.nodeTitle;
    }

    kill(signal) {
        this.settings.childProcess.kill(signal);
        return this;
    }

    async onClose(code, signal) {
        this.emit({
            name: 'Close',
            childProcess: this,
            code: code,
            signal: signal,
        });
    }

    async onDisconnect() {
        this.emit({
            name: 'Disconnect',
            childProcess: this,
        });
    }

    async onError(error) {
        this.emit({
            name: 'Error',
            childProcess: this,
            error: error,
        });
    }

    async onExit(code, signal) {
        this.emit({
            name: 'Exit',
            childProcess: this,
            code: code,
            signal: signal,
        });
    }

    async onMessage(obj, sendHandle) {
        const message = fromJson(obj.json);
        message.childProcess = this;
        sendHandle ? message.sendHandle = sendHandle : null;
        this.emit(message);
    }

    async onSpawn() {
        this.emit({
            name: 'Spawn',
            childProcess: this,
        });
    }

    ref() {
        this.settings.childProcess.ref();
        return this;
    }

    sendChild(message, sendHandle) {
        this.settings.childProcess.send(
            { json: toJson(message) },
            sendHandle,
        );

        return this;
    }

    unref() {
        this.settings.childProcess.unref();
        return this;
    }
});