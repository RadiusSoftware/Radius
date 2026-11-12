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
 * The permissions management service.  This is responsible for managing the
 * central repository of currently available permission types and for performing
 * the validation and authorization services when called.  Authorization must
 * be conducted here in the Service since it's the only repository or dictionary
 * of permission names and types, and we won't allow any authorization without
 * first validating said permissions.
*****/
createService(class PermissionSetService extends Service {
    constructor() {
        super();
        this.permissionSets = {};
        this.permissionTypes = mkRdsEnum();
    }

    async onAddPermissionTypes(message) {
        let added = [];

        for (let permissionType of message.permissionTypes) {
            if (!this.permissionTypes.has(permissionType)) {
                this.permissionTypes.set(permissionType);
                added.push(permissionType);
            }
        }

        return added;
    }

    async onAuthorize(message) {
        if (message.required in this.permissionSets) {
            if (message.granted in this.permissionSets) {
                let required = this.permissionSets[message.required].permissionTypes;
                let granted = this.permissionSets[message.granted].permissionTypes;
                return granted.hasAll(...required);
            }
        }

        return false;
    }

    async onCopyPermissionSet(message) {
        if (message.uuid in this.permissionSets) {
            let pset = {
                uuid: Crypto.generateUUID(),
                permissionTypes: mkRdsEnum(),
            };

            pset.permissionTypes.set(...this.permissionSets[message.uuid].permissionTypes.toStrings());
            this.permissionSets[pset.uuid] = pset;
            return pset.uuid;
        }

        return null;
    }

    async onCreatePermissionSet(message) {
        let pset = {
            uuid: Crypto.generateUUID(),
            permissionTypes: mkRdsEnum(),
        };

        for (let permissionType of message.permissionTypes) {
            if (this.permissionTypes.has(permissionType)) {
                pset.permissionTypes.set(permissionType);
            }
        }

        this.permissionSets[pset.uuid] = pset;
        return pset.uuid;
    }

    async onDeletePermissions(message) {
        if (message.uuid in this.permissionSets) {
            this.permissionSets[message.uuid].permissionTypes.delete(...message.permissionTypes);
        }
    }

    async onDeletePermissionSet(message) {
        if (message.uuid in this.permissionSets) {
            delete this.permissionSets[message.uuid];
            return true;
        }

        return false;
    }

    async onHasPermissions(message) {
        if (message.uuid in this.permissionSets) {
            let permissionSet = this.permissionSets[message.uuid];

            for (let permissionType of message.permissionTypes) {
                if (!permissionSet.permissionTypes.has(permissionType)) {
                    return false;
                }
            }
        }

        return true;
    }

    async onHasPermissionTypes(message) {
        for (let permissionType of message.permissionTypes) {
            if (!this.permissionTypes.has(permissionType)) {
                return false;
            }
        }

        return true;
    }

    async onListPermissions(message) {
        if (message.uuid in this.permissionSets) {
            return this.permissionSets[message.uuid].permissionTypes.toStrings();
        }

        return [];
    }

    async onListPermissionTypes(message) {
        let permissionTypes = this.permissionTypes.toStrings();

        if (message.prefix) {
            permissionTypes = permissionTypes.filter(permissionType => {
                return permissionType.startsWith(message.prefix)
            });
        }

        return permissionTypes.sort();
    }

    async onOpen(message) {
        if (message.uuid in this.permissionSets) {
            return message.uuid;
        }
        
        return '';
    }

    async onSetPermissions(message) {
        if (message.uuid in this.permissionSets) {
            for (let permissionType of message.permissionTypes) {
                if (this.permissionTypes.has(permissionType)) {
                    this.permissionSets[message.uuid].permissionTypes.set(permissionType);
                }
            }
        }
    }
});


/*****
 * The handle used for accessing the Permissions Service.  Everything that needs
 * to be done for Permissions is found right here in the PermissionsHandle class.
 * Note that there's also a Permissions class, which encapsulates many of the
 * handle's features for simplicity's sake.  The handle method createPermissions
 * is used for generating a uniquely identifiable Permissions object io the
 * PermissionsService and accessable with the Permissions object.
*****/
define(class PermissionSetHandle extends Handle {
    constructor(uuid) {
        super();
        this.uuid = uuid ? uuid : '';
    }

    async addPermissionTypes(...permissionTypes) {
        return await this.callService({
            permissionTypes: permissionTypes,
        });
    }

    async authorize(required, granted) {
        let requiredUUID = required instanceof PermissionSetHandle ? required.uuid : required;
        let grantedUUID = granted instanceof PermissionSetHandle ? granted.uuid : granted;

        return await this.callService({
            required: requiredUUID,
            granted: grantedUUID,
        });
    }

    async copyPermissionSet() {
        if (this.uuid) {
            let uuid = await this.callService({
                uuid: this.uuid,
            });

            return mkPermissionSetHandle(uuid);
        }

        return false;
    }

    async createPermissionSet(...permissionTypes) {
        this.uuid = await this.callService({
            permissionTypes: permissionTypes,
        });

        return this;
    }

    async deletePermissions(...permissionTypes) {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
                permissionTypes: permissionTypes,
            });
        }

        return this;
    }

    async deletePermissionSet() {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
            });
        }

        this.uuid = '';
        return this;
    }

    static fromJson(value) {
        return mkPermissionSetHandle(value.uuid);
    }

    getUUID() {
        return this.uuid;
    }

    async hasPermissions(...permissionTypes) {
        return await this.callService({
            uuid: this.uuid,
            permissionTypes: permissionTypes,
        });
    }

    async hasPermissionTypes(...permissionTypes) {
        return await this.callService({
            permissionTypes: permissionTypes,
        });
    }

    async listPermissions() {
        if (this.uuid) {
            return await this.callService({
                uuid: this.uuid,
            });
        }

        return [];
    }

    async listPermissionTypes(prefix) {
        return await this.callService({
            prefix: prefix,
        });
    }

    async open(uuid) {
        this.uuid = await this.callService({
            uuid: uuid,
        });

        return this;
    }

    async setPermissions(...permissionTypes) {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
                permissionTypes: permissionTypes,
            });
        }

        return this;
    }
});