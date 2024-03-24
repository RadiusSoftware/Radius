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
 * For a single host, a PermissionVerse is the all inclusive permisstion set
 * pertaining to all applications and servers running on that host.  Each process
 * has a copy of the permission verse encapsulated as a singleton to ensure
 * a local, global copy.  The PermissionVerse is typically initialized with the
 * setPermissions() function before any of the child processes have been forked.
 * After launch changes are performed via interprocess communications to ensure
 * that all singleton PermessionVerses in all related processes are synchronized.
*****/
singleton('', class PermissionVerse {
    constructor() {
        this.permissionSet = mkPermissionSet();

        if (Process.hasEnv('#Permissions')) {
            if (Process.getNodeClass() != Process.nodeClassController) {    
                this.setPermissions(Process.getEnv('#Permissions', 'json'));
            }
        }
    }
    
    authorize(requirePermissions, grantedPermissions) {
        return this.permissionSet.authorize(requirePermissions, grantedPermissions);
    }
 
    setPermissions(permissions) {
        if (ObjectType.is(permissions)) {
            for (let permissionKey in permissions) {
                let permission = permissions[permissionKey];

                this.permissionSet.setPermission(
                    permissionKey,
                    permission.type,
                    permission.values,
                );
            }

            Process.setEnv('#Permissions', toJson(permissions));
        }

        return this;
    }

    validatePermissions(grants) {
        return this.permissionSet.validatePermissions(grants);
    }
});