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
        this.permissionTypesByName = {};
        this.permissionTypesByCode = {};
    }

    async init() {
        singleton(class PermissionSetThunk extends Thunk {
            async getPermissionTypeSet() {
                let permissionTypes = mkRdsEnum();

                for (let permissionType of await mkSettingsHandle().getSetting('permissionTypes')) {
                    permissionTypes.set(permissionType);
                }
                
                return permissionTypes;
            }
        });
    }

    async onAddPermissionTypes(message) {
        let added = [];

        for (let typeName of message.typeNames) {
            if (!(typeName in this.permissionTypesByName)) {
                let typeCode = Crypto.generateUUID();
                this.permissionTypesByName[typeName] = typeCode;
                this.permissionTypesByCode[typeCode] = typeName;
                added.push(typeName);
            }
        }

        return added;
    }

    async onAuthorize(message) {
        if (message.required in this.permissionSets) {
            if (message.granted in this.permissionSets) {
                let required = this.permissionSets[message.required].types;
                let granted = this.permissionSets[message.granted].types;

                for (let typeCode of required) {
                    if (!granted.has(typeCode)) {
                        return false;
                    }
                }

                return true;
            }
        }

        return false;
    }

    async onCopy(message) {
        if (message.uuid in this.permissionSets) {
            let copy = {
                uuid: Crypto.generateUUID(),
                types: mkRdsEnum(),
            };

            this.permissionSets[copy.uuid] = copy;
            copy.types.set(...this.permissionSets[message.uuid].types.getValues());
            return copy.uuid;
        }
        
        return '';
    }

    async onCreatePermissionSet(message) {
        let pset = {
            uuid: Crypto.generateUUID(),
            types: mkRdsEnum(),
        };

        this.permissionSets[pset.uuid] = pset;

        for (let typeName of message.typeNames) {
            if (!(typeName in this.permissionTypesByName)) {
                return false;
            }

            let typeCode = this.permissionTypesByName[typeName];
            pset.types.set(typeCode);
        }

        return pset.uuid;
    }

    async onDeletePermissions(message) {
        if (message.uuid in this.permissionSets) {
            let pset = this.permissionSets[message.uuid];

            for (let typeName of message.typeNames) {
                let typeCode = this.permissionTypesByName[typeName];

                if (typeCode) {
                    pset.types.clear(typeCode)
                }
            }
        }

        return true;
    }

    async onDeletePermissionSet(message) {
        if (message.uuid in this.permissionSets) {
            delete this.permissionSets[message.uuid];
            return true;
        }

        return false;
    }

    async onHasPermission(message) {
        if (message.typeName in this.permissionTypesByName) {
            let permissionTypeCode = this.permissionTypesByName[message.typeName];

            if (message.uuid in this.permissionSets) {
                let permissionSet = this.permissionSets[message.uuid];
                return permissionSet.types.has(permissionTypeCode);
            }
        }

        return false;
    }

    async onHasPermissionType(message) {
        return message.typeName in this.permissionTypesByName;
    }

    async onListPermissions(message) {
        if (message.uuid in this.permissionSets) {
            return this.permissionSets[message.uuid].types.getValues().map(typeCode => {
                return this.permissionTypesByCode[typeCode];
            });
        }

        return [];
    }

    async onListPermissionTypes(message) {
        let types = Object.keys(this.permissionTypesByName);

        if (message.prefix) {
            types = types.filter(typeName => typeName.startsWith(message.prefix));
        }

        return types.sort();
    }

    async onOpen(message) {
        if (message.uuid in this.permissionSets) {
            return message.uuid;
        }
        
        return '';
    }

    async onSetPermissions(message) {
        if (message.uuid in this.permissionSets) {
            let pset = this.permissionSets[message.uuid];

            for (let typeName of message.typeNames) {
                if (typeName in this.permissionTypesByName) {
                    let typeCode = this.permissionTypesByName[typeName];
                    pset.types.set(typeCode);
                }
            }
            
            return true;
        }

        return false;
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

    async addPermissionTypes(...typeNames) {
        return await this.callService({
            typeNames: typeNames,
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

    async copy() {
        if (this.uuid) {
            let uuid = await this.callService({
                uuid: this.uuid,
            });

            return await mkPermissionSetHandle(uuid);
        }

        return false;
    }

    async createPermissionSet(...typeNames) {
        this.uuid = await this.callService({
            typeNames: typeNames,
        });

        return this;
    }

    async deletePermissions(...typeNames) {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
                typeNames: typeNames,
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

    async hasPermission(typeName) {
        return await this.callService({
            uuid: this.uuid,
            typeName: typeName,
        });
    }

    async hasPermissionType(typeName) {
        return await this.callService({
            typeName: typeName,
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

    async setPermissions(...typeNames) {
        if (this.uuid) {
            await this.callService({
                uuid: this.uuid,
                typeNames: typeNames,
            });
        }

        return this;
    }
});