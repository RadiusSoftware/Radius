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
 * The is is the schema used by the Radius server infrastructure.  This schema
 * supports all of the features in the admin app and features that are intended
 * to be utilized across applications and the essential server infrastructure.
*****/
register('radius', function mkSchema() {
    return mkDbSchema({
        name: 'Radius',
        tables: [
            {
                name: 'email',
                type: 'object',
                columns: [
                    { name: 'user', type: StringType, size: 100 },
                    { name: 'domain', type: StringType, size: 100 },
                    { name: 'domainId', type: KeyType },
                    { name: 'addr', type: StringType, size: 120 },
                    { name: 'verified', type: BooleanType },
                    { name: 'lastVerified', type: DateType },
                    { name: 'optedOut', type: JsonType },
                    { name: 'optedIn', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'user', direction: 'asc' } ]},
                    { columnItems: [ { column: 'addr', direction: 'asc' } ]},
                    { columnItems: [ { column: 'domain', direction: 'asc' } ]},
                    { columnItems: [ { column: 'domainId', direction: 'asc' } ]},
                ]
            },
            {
                name: 'org',
                type: 'object',
                columns: [
                    { name: 'name', type: StringType, size: 80 },
                    { name: 'parentId', type: KeyType },
                    { name: 'active', type: BooleanType },
                    { name: 'mfaType', type: StringType, size: 20 },
                    { name: 'mfaSettings', type: JsonType },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'name', direction: 'asc' } ]},
                ]
            },
            {
                name: 'parameter',
                type: 'object',
                columns: [
                    { name: 'name', type: StringType, size: 40 },
                    { name: 'value', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'name', direction: 'asc' } ]},
                ]
            },
            {
                name: 'user',
                type: 'object',
                columns: [
                    { name: 'email', type: StringType, size: 100 },
                    { name: 'emailId', type: KeyType },
                    { name: 'firstName', type: StringType, size: 50 },
                    { name: 'lastName', type: StringType, size: 50 },
                    { name: 'orgId', type: KeyType },
                    { name: 'active', type: BooleanType },
                    { name: 'mfaType', type: StringType, size: 20 },
                    { name: 'mfaSettings', type: JsonType },
                    { name: 'eulaAccepted', type: BooleanType },
                    { name: 'passwordValid', type: BooleanType },
                    { name: 'failedLogins', type: Int32Type },
                    { name: 'permissions', type: JsonType },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'email', direction: 'asc' } ]},
                    { columnItems: [ { column: 'emailId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'orgId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'firstName', direction: 'asc' } ]},
                    { columnItems: [ { column: 'firstName', direction: 'asc' }, { column: 'lastName', direction: 'asc' }]},
                ]
            },
        ]
    });
});