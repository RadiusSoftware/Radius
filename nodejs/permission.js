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
register('', class PermissionSet extends Emitter {
    constructor() {
        super();
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
                        }
                        else if (definedPermission.type.getClass() === BooleanType.getClass()) {
                            if (requiredPermission === true && granted !== true) {
                                return false;
                            }
                        }
                        else if (definedPermission.type.getClass() === EnumType.getClass()) {
                            let grantedValues = {};
                            
                            for (let grantedValue of grantedPermission) {
                                grantedValues[grantedValue] = 0;
                            }

                            for (let requiredValue of requiredPermission) {
                                if (!(requiredValue in grantedValues)) {
                                    return false;
                                }
                            }
                        }
                        else if (definedPermission.type.getClass() === NumberType.getClass()) {
                        }
                        else if (definedPermission.type.getClass() === PatternType.getClass()) {
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
            let permission = this.permissions[permissionKey];
            delete this.permissions[permissionKey];

            this.emit({
                name: 'PermissionsModified',
                action: 'clear',
                permissionKey: permissionKey,
            });
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

    setPermission(key, type, ...values) {
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
            let filteredValues = values.filter(v => typeof v == 'string');

            if (filteredValues.length > 0) {
                let permission = this.permissions[key] = {
                    key: key,
                    type: EnumType,
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
                            if (!permission.type.is(permissionValue, Object.keys(permission.values))) {
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
*****/
singleton('', class PermissionVerse extends PermissionSet {
    constructor() {
        super();
        this.on('PermissionsModified', message => this.onModified(message));

        if (Process.hasEnv('#Permissions')) {
            if (Process.getNodeClass() != Process.nodeClassController) {
                this.setPermissions(Process.getEnv('#Permissions', 'json'), true);
            }
            
        }
    }

    async onModified(message) {
        // TODO
    }

    setPermissions(permissions) {
        if (ObjectType.is(permissions)) {
            for (let permissionKey in permissions) {
                let permission = permissions[permissionKey];

                if (Array.isArray(permission.values)) {
                    this.setPermission(
                        permissionKey,
                        permission.type,
                        ...permission.values,
                    );
                }
                else {
                    this.setPermission(
                        permissionKey,
                        permission.type,
                    );
                }
            }

            this.setPermission('session', 'enum', 'none', 'lax', 'strict');
            Process.setEnv('#Permissions', toJson(permissions));
        }

        return this;
    }
});