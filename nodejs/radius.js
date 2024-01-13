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
require('../core.js');
require('../ctl.js');
require('../buffer.js');
require('../data.js');
require('../emitter.js');
require('../depot.js');
require('../json.js');
require('../language.js');
require('../messaging.js');
require('../stringSet.js');
require('../time.js');
require('../mime.js');
require('../textTemplate.js');
require('../textUtils.js');

require('./core.js');
require('./crypto.js');
require('./tempFile.js');
require('./network.js');
require('./socket.js');
require('./tls.js');
require('./host.js');
require('./process.js');
require('./childProcess.js');
require('./compression.js');
require('./jose.js');
require('./acme.js');
require('./urlLibrary.js');
require('./application.js');

require('./net/httpClient.js');
require('./net/httpServer.js');
require('./net/tcpClient.js');
require('./net/tcpServer.js');
