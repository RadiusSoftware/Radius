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
*****/
//if (Cluster.isPrimary) {
    singletonPrimary('', class Ipc extends Emitter {
        /*
        async queryWorker(worker, message) {
            if (typeof worker == 'number') {
                worker = CLUSTER.workers[worker];
            }
            
            let trap = mkTrap();
            Trap.setExpected(trap.id, 1);
            message['#Worker'] = worker.id;
            message['#Trap'] = trap.id;
            message['#IpcQuery'] = true;
            worker.send(toJson(message));
            return trap.promise;
        }

        async queryWorkers(message) {
            let trap = mkTrap();
            Trap.setExpected(trap.id, Object.entries(CLUSTER.workers).length);
            
            for (let workerId in CLUSTER.workers) {
                let worker = CLUSTER.workers[workerId];
                message['#Worker'] = worker.id;
                message['#Trap'] = trap.id;
                message['#IpcQuery'] = true;
                worker.send(toJson(message));
            }
            
            return trap.promise;
        }

        sendWorker(worker, message) {
            if (typeof worker == 'number') {
                worker = CLUSTER.workers[worker];
            }

            let socket = message['#Socket'];
            delete message['#Socket'];
            worker.send(toJson(message), socket);
        }

        sendWorkers(message) {
            for (const id in CLUSTER.workers) {
                let worker = CLUSTER.workers[id];
                worker.send(toJson(message));
            }
        }
        */
        send(workerId, message) {
            if (typeof workerId == 'number') {
                let worker = Cluster.workers[workerId];
                worker.send(toJson(message));
            }
            else if (typeof workerId == 'object') {
                message = workerId;
                /*
                for (const id in CLUSTER.workers) {
                    let worker = CLUSTER.workers[id];
                    worker.send(toJson(message));
                }
                */
            }
        }
    });
//}
//else {
    singletonWorker('', class Ipc extends Emitter {
        async query(message) {
            let trap = mkTrap();
            trap.setCount(1);
            message['#Worker'] = Cluster.worker.id;
            message['#Trap'] = trap.id;
            message['#IpcQuery'] = true;
            Process.send(toJson(message));
            return trap.promise;
        }

        send(message) {
            message['#Worker'] = Cluster.worker.id;
            return Process.send(toJson(message));
        }
    });
//}


/*****
*****/
if (Cluster.isPrimary) {
    Cluster.on('message', async (worker, json) => {
        let message = fromJson(json);
        
        if ('#IpcReply' in message) {
            /*
            delete message['#IpcReply'];
            Trap.pushReply(message['#Trap'], message.reply);
            */
        }
        else if ('#IpcQuery' in message) {
            let trapId = message['#Trap'];
            message.reply = await Ipc.query(message);
            message['#Trap'] = trapId;
            message['#IpcReply'] = true;
            delete message['#IpcQuery'];
            Ipc.send(message['#Worker'], message);
        }
        else {
            Ipc.send(message);
        }
    });
}
else {
    Cluster.worker.on('message', async json => {
        let message = fromJson(json);
        //console.log('\n************');
        //console.log(message);
        //console.log(Cluster.worker.id);

        if ('#IpcReply' in message) {
            delete message['#Worker'];
            delete message['#IpcReply'];
            Trap.handleReply(message['#Trap'], message.reply);
        }
        else if ('#IpcQuery' in message) {
            /*
            message.reply = await Ipc.query(message);
            message['#IpcReply'] = true;
            delete message['#IpcQuery'];
            Ipc.sendPrimary(message);
            */
        }
        else {
            Ipc.send(message);
        }
    });
}
