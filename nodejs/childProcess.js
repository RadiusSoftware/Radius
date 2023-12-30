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
register('', class ChildProcess extends Emitter {
    constructor(subprocess) {
        super();
        this.subprocess = subprocess;
        this.subprocess.on('close', (code, signal) => this.onClose(code, signal));
        this.subprocess.on('disconnect', () => this.onDisconnect());
        this.subprocess.on('error', (error) => this.onError(error));
        this.subprocess.on('exit', (code, signal) => this.onExit(code, signal));
        this.subprocess.on('message', (message, sendHandle) => this.onMessage(message, sendHandle));
        this.subprocess.on('spawn', () => this.onSpawn());
    }

    async call(message, sendHandle) {
        // TODO
    }

    disconnect() {
        this.subprocess.disconnect();
        return this;
    }

    getConnected() {
        return this.subprocesses.connected;
    }

    getExitCode() {
        return this.subprocess.exitCode;
    }

    getKilled() {
        return this.subprocess.killed;
    }

    getPid() {
        return this.subprocesses.pid;
    }

    getSignalCode() {
        return this.subprocess.signalCode;
    }

    getSpawnArgs() {
        return this.subprocess.spawnargs;
    }

    getSpawnFile() {
        return this.subprocess.spawnfile;
    }

    getStdErr() {
        return this.subprocess.stderr;
    }

    getStdIn() {
        return this.subprocess.stdin;
    }

    getStdIo() {
        return this.subprocess.stdeio;
    }

    getStdOut() {
        return this.subprocess.stdout;
    }

    kill(signal) {
        this.subprocess.kill(signal);
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
            childProcessc: this,
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
            childProcessc: this,
        });
    }

    ref() {
        this.subprocess.ref();
        return this;
    }

    send(message, sendHandle) {
        // TODO
    }

    unref() {
        this.subprocess.unref();
        return this;
    }
});