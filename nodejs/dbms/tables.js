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
define(function mkFrameworkSchema() {
    return mkDbSchema({
        name: 'Radius',
        tables: [
            {
                name: 'authApp',
                type: 'object',
                prefix: 'OTP',
                columns: [
                    { name: 'serviceId', type: StringType, size: 50 },
                    { name: 'ownerId', type: StringType, size: 50 },
                    { name: 'status', type: StringType },
                    { name: 'statusDate', type: DateType },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'ownerId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'serviceId', direction: 'asc' } ]},
                ]
            },
            {
                name: 'dboLock',
                type: 'object',
                prefix: 'dbol',
                columns: [
                    { name: 'objId', type: StringType, size: 50 },
                    { name: 'lockId', type: StringType, size: 50 },
                ],
                indexes: [
                    { columnItems: [ { column: 'objId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'lockId', direction: 'asc' } ]},
                ]
            },
            {
                name: 'domain',
                type: 'object',
                prefix: 'DOM',
                columns: [
                    { name: 'domainName', type: StringType, size: 200 },
                    { name: 'status', type: JsonType },
                    { name: 'statusDate', type: DateType },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'domainName', direction: 'asc' } ]},
                ]
            },
            {
                name: 'emailAddr',
                type: 'object',
                prefix: 'EMAIL',
                columns: [
                    { name: 'addr', type: StringType, size: 250 },
                    { name: 'user', type: StringType, size: 200 },
                    { name: 'domain', type: StringType, size: 200 },
                    { name: 'domainId', type: StringType, size: 50 },
                    { name: 'ownerId', type: StringType, size: 50 },
                    { name: 'status', type: StringType },
                    { name: 'statusDate', type: DateType },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'addr', direction: 'asc' } ]},
                    { columnItems: [ { column: 'domain', direction: 'asc' } ]},
                    { columnItems: [ { column: 'ownerId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'domainId', direction: 'asc' } ]},
                ]
            },
            {
                name: 'password',
                type: 'object',
                prefix: 'PWD',
                columns: [
                    { name: 'userId', type: StringType, size: 50 },
                    { name: 'active', type: BooleanType },
                    { name: 'created', type: DateType },
                    { name: 'expires', type: DateType },
                    { name: 'value',  type: JsonType, size: 2048 },
                ],
                indexes: [
                    { columnItems: [ { column: 'userId', direction: 'asc' } ]},
                ]
            },
            {
                name: 'phone',
                type: 'object',
                prefix: 'PHON',
                columns: [
                    { name: 'phonum', type: StringType, size: 20 },
                    { name: 'status', type: StringType },
                    { name: 'statusDate', type: DateType },
                    { name: 'ownerId', type: StringType, size: 50 },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'phonum', direction: 'asc' } ]},
                    { columnItems: [ { column: 'ownerId', direction: 'asc' } ]},
                ]
            },
            {
                name: 'setting',
                type: 'object',
                prefix: 'SETT',
                columns: [
                    { name: 'name', type: StringType, size: 50 },
                    { name: 'category', type: StringType, size: 50 },
                    { name: 'shape', type: JsonType },
                    { name: 'value', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'name', direction: 'asc' } ]},
                    { columnItems: [ { column: 'category', direction: 'asc' } ]},
                ]
            },
            {
                name: 'team',
                type: 'object',
                prefix: 'TEAM',
                columns: [
                    { name: 'name', type: StringType, size: 100 },
                    { name: 'parentId', type: StringType, size: 50 },
                    { name: 'active', type: BooleanType },
                    { name: 'settings', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'name', direction: 'asc' } ]},
                ]
            },
            {
                name: 'user',
                type: 'object',
                prefix: 'USER',
                columns: [
                    { name: 'teamId', type: StringType, size: 50 },
                    { name: 'firstName', type: StringType, size: 50 },
                    { name: 'lastName', type: StringType, size: 50 },
                    { name: 'emailAddrId', type: StringType, size: 50 },
                    { name: 'emailAddr2Id', type: StringType, size: 50 },
                    { name: 'phoneId', type: StringType, size: 50 },
                    { name: 'authAppId', type: StringType, size: 50 },
                    { name: 'active', type: BooleanType },
                    { name: 'zombie', type: BooleanType },
                    { name: 'eulaAccepted', type: BooleanType },
                    { name: 'failedLogins', type: Int32Type },
                    { name: 'permissions', type: JsonType },
                    { name: 'settings', type: JsonType },
                    { name: 'verifier', type: JsonType },
                ],
                indexes: [
                    { columnItems: [ { column: 'emailAddrId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'emailAddr2Id', direction: 'asc' } ]},
                    { columnItems: [ { column: 'phoneId', direction: 'asc' } ]},
                    { columnItems: [ { column: 'teamId', direction: 'asc' } ]},
                ]
            },
        ]
    });
});