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
 * A cluster node is the intersection of a Radius server and a host.  More than
 * one Radius server may run on a single host.  A cluster is where there are one
 * or more servers connected together to work in a cluster.  Clusters are multi-
 * host groups of Radius servers on one or more hosts that coordinate their tasks
 * to achieve higher security, better fault tolerance, and higher performance
 * than performing all of these tasks in a single Radius server instance.
*****/
createService(class ClusterService extends Service {
    constructor() {
        super();
    }
});


/*****
 * The cluster handle. Note that when making a new cluster handle, there are no
 * arguments.  Hence, a cluster handle can be used for all operations with all
 * nodes within the cluster.  Remember that a node represents an instance of a
 * running Radius server process.  That includes both remote and local processes. 
*****/
define(class ClusterHandle extends Handle {
    constructor() {
        super();
    }
});