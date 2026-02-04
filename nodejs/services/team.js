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
 * Teams are groups of users whether companies, clubs, divisions, departments,
 * or some such other group, which have user members that can be selected and
 * monitored and managed as an entire group.  For instance, all team users may
 * be deactivated by setting the team to be inactive.  Also note that all users
 * must be assigned to a team and must remain within a team.  For single-user
 * applications, almost all users will be assigned to the '#NOTEAM' team, which
 * is created when the framework is installed.
*****/
createService(class TeamService extends Service {
    async onCreateTeam(message) {
        if (!message.name.trim()) {
            return mkFailure('radius.org.badTeamName');
        }

        let dbms = mkDbmsThunk();
        let dboParent = await dbms.getObj(message.parentId);
        
        if (!(dboParent instanceof DboTeam)) {
            return mkFailure('radius.org.badParentTeamId');
        }

        let team = await dbms.createObj(DboTeam, {
            name: message.name.trim(),
            parentId: dboParent.id,
            active: message.active === false ? false : true,
        });

        return team.id;
    }

    async onGetChildren(message) {
        let childTeams = await mkDbmsThunk().selectObj(
            DboTeam,
            { parentId: message.id },
            { name: 'asc' }
        );

        return childTeams.map(childTeam => childTeam.id);
    }

    async onGetParent(message) {
        let dboTeam = await mkDbmsThunk().getObj(message.id);

        if (dboTeam instanceof DboTeam) {
            return dboTeam.parentId;
        }
        
        return '';
    }

    async onGetSetting(message) {
        let dotted = `settings.${message.settingNam3}`;
        return await mkDbmsThunk().getObjProperty(message.id, dotted);
    }

    async onGetTeamObject(message) {
        return await mkDbmsThunk().getObj(message.id);
    }

    async onIsActive(message) {
        let dbms = mkDbmsThunk();
        let dboTeam = await dbms.getObj(message.id);

        if (dboTeam instanceof DboTeam) {
            while (dboTeam) {
                if (!dboTeam.active) {
                    return false;
                }

                if (dboTeam.parentId) {
                    dboTeam = await dbms.getObj(dboTeam.parentId);
                }
                else {
                    dboTeam = null;
                }
            }

            return true;
        }

        return false;
    }

    async onOpen(message) {
        let dboTeam = await mkDbmsThunk().getObj(message.id);
        return dboTeam instanceof DboTeam ? dboTeam.id : '';
    }

    async onOpenNoTeam(message) {
        let dbms = mkDbmsThunk();
        let noTeam = await dbms.selectOneObj(DboTeam, { name: '' });

        if (!noTeam) {
            noTeam = await dbms.createObj(DboTeam, {
                name: '',
                active: true,
            });
        }

        return noTeam.id;
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
 * This is the API handle for managing teams and using the features of the team
 * API.  In a single-user application server, users will be assigned to the
 * "#NOTEAM" team, while system managers are assigned to the "#SYSTEM" team.
 * Outside of this very simplified basic structure, users can create and manage
 * hierarchical structures of teams, which can be nested as needed to reflect
 * almost any imaginable organization struct.  Teams do not, however, support
 * employees or individuals that report to multiple supervisors and those that
 * belong to multiple departments.
*****/
define(class TeamHandle extends Handle {
    constructor(id) {
        super();
        this.id = '';

        if (id && id.startsWith('TEAM:')) {
            this.id = id;
        }
    }

    async createTeam(opts) {
        this.id = await this.callService(opts);
        return this;
    }

    static fromJson(value) {
        return mkTeamHandle(value.id);
    }

    async getChildren() {
        let children = [];

        if (this.id) {
            let childIds = await this.callService({
                id: this.id,
            });

            for (let childId of childIds) {
                children.push(mkTeam(childId));
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

        return mkTeamHandle(parentId);
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

    async getTeamObject() {
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

    async openNoTeam() {
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

    async setName(teamName) {
        if (this.id) {
            await this.callService({
                id: this.id,
                teamName: teamName,
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