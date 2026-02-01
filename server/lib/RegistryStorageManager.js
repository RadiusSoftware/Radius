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
 * This is the registry storage manager for the Radius server framework, which
 * is outside the score of the core framework.  The Radius server uses the radius
 * DBMS to store settings values in the _settings table.  This supports the
 * Radius server's approach of securely storing all settings within the Radius
 * server framework DBMS
*****/
singletonIn(Process.nodeClassController, 'radius', class RegistryStorageManager {
    async deleteSettings(path) {
        let dbc;

        try {
            let dbc = await dbConnect();
            let settings = await radius.selectOneDboSettings(dbc, { path: path });
            await dbc.close();

            if (settings) {
                await DbObject.delete(settings);
                return SymOk;
            }
            else {
                return SymEmpty;
            }

        }
        catch (e) {
            if (dbc) {
                await dbc.close();
            }

            return SymError;
        }
    }
    
    async retrieveValue(path) {
        let dbc;

        try {
            dbc = await dbConnect();
            let settings = await radius.selectOneDboSettings(dbc, { path: path });
            await dbc.close();
            return settings === null ? SymEmpty : settings.value;
        }
        catch (e) {
            if (dbc) {
                await dbc.close();
            }

            return SymError;
        }
    }

    async storeValue(path, value) {
        let dbc;

        try {
            dbc = await dbConnect();
            let stored = await this.retrieveValue(path);

            let settings = radius.mkDboSettings({
                path: path,
                value: value,
            });

            if (stored === SymEmpty) {
                await DbObject.insert(settings, dbc);
            }
            else {
                await DbObject.update(settings, dbc);
            }

            await dbc.close();
            return SymOk;
        }
        catch (e) {
            if (dbc) {
                await dbc.close();
            }

            return SymError;
        }
    }
});