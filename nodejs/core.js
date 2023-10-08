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
const Cluster = require('cluster');


/*****
 * Convenience functions isPrimary() and isWorker() are uesd for splitting code
 * into primary processs or worker process components.  Generally speaking, we
 * expect isPrimary() and isWorker() to be invoked within an if-else clause to
 * split code execution as required.
*****/
register('', function isPrimary() {
    return Cluster.isPrimary;
});

register('', function isWorker() {
    return Cluster.isWorker;
});


/*****
 * The following are convenience functions that can be used define different
 * code in the primary process vs a worker process: registerPrimary(),
 * registerWorker(), singletonPrimary(), singletonWorker().  They act as
 * filters to ensure that code is registered only within the specified
 * process type.  This cleans up code that needs one definition of a class
 * in the primary vs a worker process.
*****/
register('', function registerPrimary(ns, arg) {
    if (Cluster.isPrimary) {
        register(ns, arg);
    }
});

register('', function registerWorker(ns, arg) {
    if (Cluster.isWorker) {
        register(ns, arg);
    }
});

register('', async function singletonPrimary(ns, arg, ...args) {
    if (Cluster.isPrimary) {
        singleton(ns, arg, ...args);
    }
});

register('', async function singletonWorker(ns, arg, ...args) {
    if (Cluster.isWorker) {
        singleton(ns, arg, ...args);
    }
});
