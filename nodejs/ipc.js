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
const Process = require('process');


/*****
 * This is the primary side of the IPC messaging pipe.  There's a singleton
 * Ipc object extending Emitter and there's listener that's there to handle
 * incoming messages.  The singleton can send or query a single worker or all
 * workers simultaneously.  The message handler does the bookeeping required
 * for incoming queries, replies, and/or simple messages being sent to the
 * primary process.
*****/
singletonPrimary('', class Ipc extends Emitter {
    async queryWorker(worker, message) {
        if (typeof worker == 'number') {
            worker = Cluster.workers[worker];
        }
        
        let trap = mkTrap();
        trap.setCount(1);
        message['#Worker'] = worker.id;
        message['#Trap'] = trap.id;
        message['#IpcQuery'] = true;
        worker.send(toJson(message));
        return trap.promise;
    }

    async queryWorkers(message) {
        let trap = mkTrap();
        trap.setCount(Object.entries(Cluster.workers).length);
        
        for (let workerId in Cluster.workers) {
            let worker = Cluster.workers[workerId];
            message['#Worker'] = worker.id;
            message['#Trap'] = trap.id;
            message['#IpcQuery'] = true;
            worker.send(toJson(message));
        }
        
        return trap.promise;
    }

    sendWorker(worker, message) {
        if (typeof worker == 'number') {
            worker = Cluster.workers[worker];
        }

        worker.send(toJson(message));
    }

    sendWorkers(message) {
        for (const id in Cluster.workers) {
            let worker = Cluster.workers[id];
            worker.send(toJson(message));
        }
    }
});

if (isPrimary()) {
    Cluster.on('message', async (worker, json) => {
        let message = fromJson(json);
        
        if ('#IpcReply' in message) {
            let trapId = message['#Trap'];
            delete message['#Trap'];
            delete message['#IpcReply'];
            Trap.handleReply(trapId, message.reply);
        }
        else if ('#IpcQuery' in message) {
            let trapId = message['#Trap'];
            message.reply = await Ipc.query(message);
            message['#Trap'] = trapId;
            message['#IpcReply'] = true;
            delete message['#IpcQuery'];
            Ipc.sendWorker(message['#Worker'], message);
        }
        else {
            Ipc.send(message);
        }
    });
}


/*****
 * This is the worker side of the IPC messaging pipe.  There's a singleton
 * Ipc object extending Emitter and there's listener that's there to handle
 * incoming messages.  The singleton can send or query the primary process.
 * The message handler does the bookeeping required for incoming queries,
 * replies, and/or simple messages being sent to a worker process.
*****/
singletonWorker('', class Ipc extends Emitter {
    async queryPrimary(message) {
        let trap = mkTrap();
        trap.setCount(1);
        message['#Worker'] = Cluster.worker.id;
        message['#Trap'] = trap.id;
        message['#IpcQuery'] = true;
        Process.send(toJson(message));
        return trap.promise;
    }

    sendPrimary(message) {
        message['#Worker'] = Cluster.worker.id;
        return Process.send(toJson(message));
    }
});

if (isWorker()) {
    Cluster.worker.on('message', async json => {
        let message = fromJson(json);

        if ('#IpcReply' in message) {
            let trapId = message['#Trap'];
            delete message['#Trap'];
            delete message['#IpcReply'];
            delete message['#Worker'];
            Trap.handleReply(trapId, message.reply);
        }
        else if ('#IpcQuery' in message) {
            let trapId = message['#Trap'];
            message.reply = await Ipc.query(message);
            message['#Trap'] = trapId;
            message['#IpcReply'] = true;
            delete message['#IpcQuery'];
            Ipc.sendPrimary(message);
        }
        else {
            Ipc.send(message);
        }
    });
}
