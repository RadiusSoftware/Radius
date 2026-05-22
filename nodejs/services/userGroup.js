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
 * UserGroups provide a mechanism for managing permissions and other features
 * for multiple users at a time.  UserGroups may also be used to manage clients,
 * locations, or other organizations as needed by the application.  UserGroups
 * for a heirarchy with funnels up to the top level with the empty or root user
 * group.  UserGroups do NOT inherit permissions its ancestors. UserGroup trees
 * define the basis for which authorized admins have visiblity.  Note that users
 * may be inserted into one or more user groups.
*****/
createService(class UserGroupService extends Service {
    async onCreateUserGroup(message) {
        if (!message.name.trim()) {
            return mkFailure('radius.org.emptyUserGroupName');
        }

        let dbms = mkDbmsThunk();
        let dboParent = await dbms.getObj(message.parentId);
        
        if (!(dboParent instanceof DboUserGroup)) {
            return mkFailure('radius.org.badParentUserGroupId');
        }

        let userGroup = await dbms.createObj(DboUserGroup, {
            name: message.name.trim(),
            parentId: dboParent.id,
            active: message.active === false ? false : true,
        });

        return userGroup.id;
    }

    async onGetChildren(message) {
        let childUserGroups = await mkDbmsThunk().selectObj(
            DboUserGroup,
            { parentId: message.id },
            { name: 'asc' }
        );

        return childUserGroup.map(childUserGroup => childUserGroup.id);
    }

    async onGetParent(message) {
        let dboUserGroup = await mkDbmsThunk().getObj(message.id);

        if (dboUserGroup instanceof DboUserGroup) {
            return dboUserGroup.parentId;
        }
        
        return '';
    }

    async onGetSetting(message) {
        let dotted = `settings.${message.settingName}`;
        return await mkDbmsThunk().getObjProperty(message.id, dotted);
    }

    async onGetUserGroupObject(message) {
        return await mkDbmsThunk().getObj(message.id);
    }

    async onIsActive(message) {
        let dbms = mkDbmsThunk();
        let dboUserGroup = await dbms.getObj(message.id);

        if (dboUserGroup instanceof DboUserGroup) {
            while (dboUserGroup) {
                if (!dboUserGroup.active) {
                    return false;
                }

                if (dboUserGroup.parentId) {
                    dboUserGroup = await dbms.getObj(dboUserGroup.parentId);
                }
                else {
                    dboUserGroup = null;
                }
            }

            return true;
        }

        return false;
    }

    async onOpen(message) {
        let dboUserGroup = await mkDbmsThunk().getObj(message.id);
        return dboUserGroup instanceof DboUserGroup ? dboUserGroup.id : '';
    }

    async onOpenRoot(message) {
        let dbms = mkDbmsThunk();
        let root = await dbms.selectOneObj(DboUserGroup, { name: 'ROOTUSERGROUP' });
        return root.id;
    }

    async onSetActive(message) {
        await mkDbmsThunk().modifyObj(message.id, { active: true });
    }

    async onSetInactive(message) {
        await mkDbmsThunk().modifyObj(message.id, { active: false });
    }

    async onSetName(message) {
        let trimmed = message.name.trim();

        if (trimmed) {
            await mkDbmsThunk().modifyObj(message.id, { name: trimmed });
        }
    }

    async onSetSetting(message) {
        let setting = {};
        setting[`settings.${message.settingName}`] = message.settingValue;
        await mkDbmsThunk.modifyObj(message.id, settings);
    }
});


/*****
 * UserGroups provide a mechanism for managing permissions and other features
 * for multiple users at a time.  UserGroups may also be used to manage clients,
 * locations, or other organizations as needed by the application.  UserGroups
 * for a heirarchy with funnels up to the top level with the empty or root user
 * group.  UserGroups do NOT inherit permissions its ancestors. UserGroup trees
 * define the basis for which authorized admins have visiblity.  Note that users
 * may be inserted into one or more user groups.
*****/
define(class UserGroupHandle extends Handle {
    constructor(id) {
        super();
        this.id = '';

        if (id && id.startsWith('USERGROUP:')) {
            this.id = id;
        }
    }

    async createUserGroup(opts) {
        this.id = await this.callService(opts);
        return this;
    }

    static fromJson(value) {
        return mkUserGroupHandle(value.id);
    }

    async getChildren() {
        let children = [];

        if (this.id) {
            let childIds = await this.callService({
                id: this.id,
            });

            for (let childId of childIds) {
                children.push(mkUserGroupHandle(childId));
            }
        }

        return children;
    }

    getId() {
        return this.id;
    }

    async getParent() {
        let parentId;

        if (this.id) {
            parentId = await this.callService({
                id: this.id,
            });
        }

        return mkUserGroupHandle(parentId);
    }

    async getSetting(settingName) {
        if (this.id) {
            return await this.callService({
                id: this.id,
                settingName: settingName,
            });
        }

        return null;
    }

    async getmkUserGroupHandleObject() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return null;
    }

    async isActive() {
        if (this.id) {
            return await this.callService({
                id: this.id,
            });
        }

        return false;
    }

    async open(id) {
        this.id = await this.callService({
            id: id,
        });

        return this;
    }

    async openRoot() {
        this.id = await this.callService({
        });

        return this;
    }

    async setActive() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async setInactive() {
        if (this.id) {
            await this.callService({
                id: this.id,
            });
        }

        return this;
    }

    async setName(name) {
        if (this.id) {
            await this.callService({
                id: this.id,
                name: name,
            });
        }

        return this;
    }

    async setSetting(settingName, settingValue) {
        if (this.id) {
            await this.callService({
                id: this.id,
                settingName: settingName,
                settingValue: settingValue,
            });
        }

        return this;
    }
});