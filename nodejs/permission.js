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


/*****
*****/
singleton('', class PermissionVerse {
    constructor() {
        if (Process.hasEnv('#Permissions')) {
            this.set(Process.getEnv('#Permissions', 'json'), true);
        }
    }

    authorize(required, granted) {
        // TODO
    }

    createPermission(key, type, ...values) {
        if (typeof key != 'string') {
            throw new Error(`Invalid permission key type: "${key}" "${typeof key}".`);
        }

        if (key in this.permissions) {
            return;
        }

        if (type == 'bigint') {
            this.permissions[key] = {
                key: key,
                type: type,
            };
        }
        else if (type == 'boolean') {
            this.permissions[key] = {
                key: key,
                type: type,
            };
        }
        else if (type == 'enum') {
            let filteredValues = values.filter(v => typeof v == 'string');

            if (filteredValues.length > 0) {
                let permission = this.permissions[key] = {
                    key: key,
                    type: type,
                    values: {},
                };

                filteredValues.forEach(value => {
                    if (value in permission.values) {
                        throw new Error(`Duplicate value for key: "${key}".`);
                    }

                    permission.values[value] = true;
                });
            }
            else {
                throw new Error(`Invalid permission values for key: "${key}".`);
            }
        }
        else if (type == 'number') {
            this.permissions[key] = {
                key: key,
                type: type,
            };
        }
        else if (type == 'pattern') {
            try {
                this.permissions[key] = {
                    key: key,
                    type: type,
                    values: patterns.map(regex => new RegExp(regex)),
                };
            }
            catch (e) {
                throw new Error(`Invalid pattern permission: "${key}" "${pattern}".`);
            }
        }
        else {
            throw new Error(`Invalid permission type: "${key}" "${typeof type}".`);
        }
    }

    set(permissions, force) {
        if (Process.getNodeClass() == Process.nodeClassController || force) {
            if (typeof this.permissions != 'object') {
                this.permissions = {};

                if (ObjectType.is(permissions)) {
                    for (let permissionKey in permissions) {
                        let permission = permissions[permissionKey];

                        if (Array.isArray(permission.values)) {
                            this.createPermission(
                                permissionKey,
                                permission.type,
                                ...permission.values,
                            );
                        }
                        else {
                            this.createPermission(
                                permissionKey,
                                permission.type,
                            );
                        }
                    }

                    this.createPermission('session', 'enum', 'none', 'lax', 'strict');
                    Process.setEnv('#Permissions', toJson(permissions));
                    console.log(this.permissions);
                }
            }
        }
    }
});


/*****
*****/
register('', class PermissionSet {
});