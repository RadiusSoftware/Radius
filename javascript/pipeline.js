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
 * A classic computing queue implementation where items are pushed onto the back
 * of the queue and popped off of the front.  The safety value is that popping an
 * empty Queue returns a null value with no other negative consequences.
*****/
define(class Queue {
    constructor(name) {
        this.items = [];
        this.name = name;
    }

    isEmpty() {
        return this.items.length == 0;
    }

    isNotEmpty() {
        return this.items.length > 0;
    }

    push(item) {
        this.items.push(item);
        return this;
    }

    pop() {
        return this.items.shift();
    }
});


/*****
 * A pipe is a queue of pending items to be processed, a currently executing
 * function, and a set of controls to ensure that one item is being processed
 * at a time.  Once one item has either completed processing or it has failled
 * out with error, the next item in the Pipe enters into the exec phase.
*****/
define(class Pipe extends Emitter {
    constructor(name, func) {
        super();
        this.name = name;
        this.func = func;
        this.paused = false;
        this.queue = mkQueue();
        this.lokker = mkLokker();
    }

    getFunc() {
        return this.func;
    }

    getName() {
        return this.name;
    }

    pause() {
        this.resume;
        let promise = new Promise((ok, fail) => this.halt = ok());

        setTimeout(async () => {
            await this.lokker.lock(true);
            this.paused = true;
        }, 0);

        return this;
    }

    async push(value) {
        this.queue.push(value);
        setTimeout(() => this.run(), 0);
        return this;
    }

    resume() {
        if (this.paused) {
            this.paused = false;
            this.lokker.free();
        }

        return this;
    }

    async run() {
        if (this.lokker.isFree() && this.queue.isNotEmpty()) {
            await this.lokker.lock();
            let value = this.queue.pop();
            let output;

            try {
                output = await wait(this.func(value));
            }
            catch (e) {
                output = mkFailure(e);
            }

            this.emit({
                name: 'PipeDone',
                pipe: this,
                value: value,
                output: output,
            });

            this.lokker.free();
            setTimeout(() => this.run(), 0);
        }
    }
});


/*****
 * A pipeline is a controlled or regulated execution pipeline, which consists of
 * one or more pipes.  Each pipe is a queue of items to be processed by the
 * pipes execution function.  Hence, each pipe of a pipeline will execute at
 * most a single item at a time.  However, a pipline does execute all of its
 * pipes asynchronously.  To summarize, each pipe is synchronous while the
 * overall pipeline pipes are asynchronous.  The pipeline is designed to ensure
 * the correct order of processing of items in a controlled manner.
*****/
define(class Pipeline extends Emitter {
    static key = Symbol('pipeline');

    constructor(...pipes) {
        super();
        this.pipes = pipes.map(pipe => mkPipe(pipe.name, pipe.func));

        for (let i = 0; i < this.pipes.length; i++) {
            let pipe = this.pipes[i];

            pipe.on('PipeDone' , message => {
                if (message.output instanceof Failure) {
                    this.onFailure({
                        pipenum: i,
                        pipename: this.pipes[i].getName(),
                        value: message.value,
                        failure: message.output,
                    });
                }
                else {
                    this.onDone({
                        pipenum: i,
                        pipename: this.pipes[i].getName(),
                        value: message.value,
                        output: message.output,
                    });
                }
            });

        }
    }

    getPipeCount() {
        return this.pipes.length;
    }

    getPipes() {
        return this.pipes;
    }

    async onDone(message) {
        if (message.pipenum + 1 >= this.pipes.length) {
            this.emit({
                name: 'PipelineDone',
                value: message.value,
                output: message.output,
            });
        }
        else {
            this.pipes[message.pipenum + 1].push(message.output);
        }
    }

    async onFailure(message) {
        this.emit({
            name: 'PipelineFailure',
            pipenum: message.pipenum,
            pipename: message.pipename,
            value: message.value,
            failure: message.failure,
        });
    }

    async pause() {
        for (let pipe of this.pipes) {
            pipe.pause();
        }

        return this;
    }

    async push(value) {
        if (this.pipes.length) {
            this.pipes[0].push(value);
        }

        return this;
    }

    pushPipe(name, func) {
        this.pipes.push(mkPipe(name, func));
        return this;
    }

    async resume() {
        for (let pipe of this.pipes) {
            pipe.resume();
        }

        return this;
    }

    [Symbol.iterator]() {
        return this.pipes[Symbol.iterator]();
    }
});