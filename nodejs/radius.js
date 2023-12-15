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
"use strict";


/*****
 * This is the nodejs bootstrapper or nodejs loader for the Radius Software
 * development framework.  It's loaded within the HEAD element of the HTML
 * document supported with Radius.  It's primary job is to load in each of
 * the specified framework script files and wait for each file to be fully
 * compiled before moving on to the next script file.  This is importatn
 * because the order of evaluation is critical due to dependencies.  Note that
 * this script only loads the framework.  Once loaded, the framework will be
 * used for loading in developer application code, CSS, and HTML framents.
*****/
import '../core.js'
import '../ctl.js'
import '../buffer.js'
import '../data.js'
import '../emitter.js'
import '../depot.js'
import '../json.js'
import '../language.js'
import '../stringSet.js'
import '../time.js'
import '../mime.js'
import '../textTemplate.js'
import '../textUtils.js'
import '../validator.js'

import './net.js'
import './socket.js'
import './tls.js'
import './process.js'
import './cluster.js'
import './ipc.js'
import './serverUtils.js'
import './compression.js'
import './crypto.js'
import './jose.js'
import './server.js'
import './acme.js'

import './clients/tcpClient.js'
import './clients/httpClient.js'

import './servers/tcpServer.js'
import './servers/httpServer.js'
