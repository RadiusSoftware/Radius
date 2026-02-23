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
 * This is the available API on the client side.  The API endpoints are located
 * in the HTML source file and is populated with the set of endpoints that are
 * relevant for the specific Webapp.  The API makes it really simple for the app
 * developer to properly communicate with the server regardless of the specific
 * mechanism, HTTP or WebSocket, and the overall mechanics regquired for properly
 * making a secure call.  Note that the api has functions for every availabel API
 * function and no more than the webapp requires.
*****/
singleton(class Api {
    ['#DefineEndpoint'](name, args) {
        this[name] = async (...args) => {
            return this['#ExecuteEndpoint'](name, endpoint.args, args);
        };
        return this;
    }

    async ['#ExecuteEndpoint'](name, definedArgs, callingArgs) {
        if (callingArgs.length != definedArgs.length) {
            return mkFailure(`Invalid number of args provided for API call "${name}"`);
        }

        for (let i = 0; i < callingArgs.length; i++) {
            let definedArg = definedArgs[i];
            let callingArg = callingArgs[i];

            if (definedArg.shape.validate(callingArg) !== true) {
                return mkFailure(`Invalid argument "${definedArg.name}" provided for API call "${name}"`);
            }
        }
        
        let response = await callServer({
            name: name,
            args: callingArgs,
        });

        return response;
    }

    ['#ImportEndpoints']() {
        for (let endpoint of apiEndpoints) {
            this[endpoint.name] = async (...args) => {
                return this['#ExecuteEndpoint'](endpoint.name, endpoint.args, args);
            };
        }

        return this;
    }
});
