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
 * A permission set defines the set or universe of allowable permissions within
 * an application space.  Generally speaking, a single PermissionSet defines the
 * permission structure for an application, a server, a host, or an entire host
 * cluster.  Permission sets are the definitive way that hosts and applications
 * communicate with each other with regards to allowable permissions with a scope.
 * Both required permissions and granted permissions must be validate by the
 * permission set before authorization is allowed to be performed.
*****/
register('', class PermissionSet {
    constructor() {
        this.permissions = {};
    }

    authorize(requiredPermissions, grantedPermissions) {
        try {
            if (this.validatePermissions(requiredPermissions)) {
                if (this.validatePermissions(grantedPermissions)) {
                    for (let requiredKey in requiredPermissions) {
                        let definedPermission = this.permissions[requiredKey];
                        let grantedPermission = grantedPermissions[requiredKey];
                        let requiredPermission = requiredPermissions[requiredKey];

                        if (definedPermission.type.getClass() === BigIntType.getClass()) {
                            if (requiredPermission !== 0n && grantedPermission !== requiredPermission) {
                                return false;
                            }
                        }
                        else if (definedPermission.type.getClass() === BooleanType.getClass()) {
                            if (requiredPermission === true && grantedPermission !== true) {
                                return false;
                            }
                        }
                        else if (definedPermission.type.getClass() === EnumType.getClass()) {
                            if (!grantedPermission.isSupersetOf(requiredPermission)) {
                                return false;
                            }
                        }
                        else if (definedPermission.type.getClass() === NumberType.getClass()) {
                            if (grantedPermission >= requiredPermission) {
                                return false;
                            }
                        }
                        else {
                            throw new Error(`Illogical case encountered while authorizing permissions.`);
                        }
                    }

                    return true;
                }
            }
        }
        catch (e) {
            caught(e);
        }

        return false;
    }

    clearPermission(permissionKey) {
        if (permissionKey in this.permissions) {
            delete this.permissions[permissionKey];
        }

        return this;
    }

    hasPermission(permissionKey) {
        return permissionKey in this.permissions;
    }

    getPermission(permissionKey) {
        if (permissionKey in this.permissions) {
            return Data.copy(this.permissions[permissionKey]);
        }

        return null;
    }

    setPermission(key, type, values) {
        if (typeof key != 'string') {
            throw new Error(`Invalid permission key type: "${key}" "${typeof key}".`);
        }

        if (key in this.permissions) {
            return;
        }

        if (type == 'bigint') {
            this.permissions[key] = {
                key: key,
                type: BigIntType,
            };
        }
        else if (type == 'boolean') {
            this.permissions[key] = {
                key: key,
                type: BooleanType,
            };
        }
        else if (type == 'enum') {
            if (Array.isArray(values)) {
                let filteredValues = values.filter(value => typeof value == 'string');

                if (filteredValues.length > 0) {
                    let permission = this.permissions[key] = {
                        key: key,
                        type: EnumType,
                        values: mkStringSet(...filteredValues),
                    };
                }
                else {
                    throw new Error(`Invalid permission values for key: "${key}".`);
                }
            }
            else {
                throw new Error(`Expecting an array of enumeration values.`);
            }
        }
        else if (type == 'number') {
            this.permissions[key] = {
                key: key,
                type: type,
            };
        }
        else {
            throw new Error(`Invalid permission type: "${key}" "${typeof type}".`);
        }
    }

    validatePermissions(grants) {
        try {
            if (typeof grants == 'object') {
                for (let permissionKey in grants) {
                    if (!(permissionKey in this.permissions)) {
                        return false;
                    }

                    let permission = this.permissions[permissionKey];

                    if (permission.type.getClass() === EnumType.getClass()) {
                        for (let permissionValue of grants[permissionKey]) {
                            if (!permission.type.is(permissionValue, permission.values)) {
                                return false;
                            }
                        }
                    }
                    else {
                        if (!permission.type.is(grants[permissionKey])) {
                            return false;
                        }
                    }
                }
            }

            return true;
        }
        catch (e) {
            caught(e);
        }

        return false;
    }
});


/*****
 * On a host, there is one permission-verse singleton residing in the controller
 * process.  It's just an adaptation of ther PermissionSet to be the centralized
 * guardian of authorization on the host.  There is a non-controller-process
 * version of the PermissionVerse, which provides a functional API for handling
 * permission requests.  All data are stored and all requests are always passed
 * through the central singleton, PermissionVerse.
*****/
singletonIn(Process.nodeClassController, '', class PermissionVerse extends PermissionSet {
    constructor() {
        super();
        mkHandlerProxy(Process, 'Permissions', this);
    }

    async onAuthorize(message) {
        return this.authorize(
            message.authoriedPermissions,
            message.grantedPermissions
        );
    }

    async onClearPermission(message) {
        this.clearPermission(message.permissionKey);
    }

    async onHasPermission(message) {
        return this.hasPermission(message.permissionKey);
    }

    async onGetPermission(message) {
        return this.getPermission(message.permissionKey);
    }

    async onSetPermission(message) {
        this.setPermission(
            message.key,
            message.type,
            message.values,
        );
    }
});


/*****
 * On a host, there is one permission-verse singleton residing in the controller
 * process.  It's just an adaptation of ther PermissionSet to be the centralized
 * guardian of authorization on the host.  There is a non-controller-process
 * version of the PermissionVerse, which provides a functional API for handling
 * permission requests.  All data are stored and all requests are always passed
 * through the central singleton, PermissionVerse.
*****/
singletonNotIn(Process.nodeClassController, '', class PermissionVerse {
    async authorize(requiredPermissions, grantedPermissions) {
        return await Process.call({
            name: 'PermissionsAuthorize',
            requiredPermissions: requiredPermissions,
            grantedPermissionsL: grantedPermissions,
        });
    }

    async clearPermission(permissionKey) {
        await Process.call({
            name: 'PermissionsClearPermission',
            permissionKey: permissionKey,
        });

        return this;
    }

    async hasPermission(permissionKey) {
        return await Process.call({
            name: 'PermissionsHasPermission',
            permissionKey: permissionKey,
        });
    }

    async getPermission(permissionKey) {
        return await Process.call({
            name: 'PermissionsGetPermission',
            permissionKey: permissionKey,
        });
    }

    async setPermission(key, type, values) {
        await Process.call({
            name: 'PermissionsSetPermission',
            permissionKey: permissionKey,
        });

        return this;
    }
});