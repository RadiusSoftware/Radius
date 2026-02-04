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
 * File permissions are read directly from a JSON file, permissions.json, found
 * in every directory with packages to import.  The permissions JSON file can be
 * read to create new permission types, define directory-level permissions, and
 * to define file-level permissions for any and all file types.  An instance of
 * the FilePermissions object is created, after which the asynd lod() method is
 * invoked analyze the file directory and permissions.json file to determine the
 * permissions to constructor for that directory and individual files.
*****/
define(class FilePermissions {
    constructor(dirPermissionSet) {
        this.permissionTypes = [];
        this.dirPermissionSet = dirPermissionSet;
        this.filePermissionSets = {};
    }

    getDirPermissionSet() {
        return this.dirPermissionSet;
    }

    async getFilePermissionSet(fileName) {
        if (fileName in this.filePermissionSets) {
            return this.filePermissionSets[fileName];
        }
        else {
            return this.dirPermissionSet;
        }
    }

    getPermissionType(typename) {
        return this.permissionTypes
        .filter(typeName => typeName == typename)[0];
    }

    getPermissionTypes() {
        return this.permissionTypes;
    }

    hasDirPermissionSet() {
        return this.dirPermissionSet != null;
    }

    hasFilePermissionSet(filename) {
        return filename in this.filePermissionSets;
    }

    hasPermissionType(typename) {
        return this.permissionTypes
        .filter(typeName => typeName == typename)
        .length > 0;
    }

    static async load(dirpath, parentFilePermissionSet) {
        let filePermissionsObject = mkFilePermissions(await parentFilePermissionSet.dirPermissionSet.copy());

        if (await FileSystem.isDirectory(dirpath)) {
            let path = Path.join(dirpath, 'permissions.json');

            if (await FileSystem.isFile(path)) {
                let permissionsJson = fromJson(await FileSystem.readFileAsString(path));
                let permissionHandle = mkPermissionSetHandle();

                if ('..' in permissionsJson) {
                    filePermissionsObject.permissionTypes = await permissionHandle.addPermissionTypes(...permissionsJson['..']);
                }

                if ('.' in permissionsJson) {
                    for (let permissionType in permissionsJson['.']) {
                        let action = permissionsJson['.'][permissionType];

                        if (action == '+') {
                            await filePermissionsObject.dirPermissionSet.setPermissions(permissionType);
                        }
                        else if (action == '-') {
                            await filePermissionsObject.dirPermissionSet.deletePermissions(permissionType);
                        }
                    }
                }

                for (let filename in permissionsJson) {
                    if (!(filename in { '.':0, '..':0 })) {
                        let filePermissionSet = await filePermissionsObject.dirPermissionSet.copy();
                        filePermissionsObject.filePermissionSets[filename] = filePermissionSet;

                        for (let permissionType in permissionsJson[filename]) {
                            let action = permissionsJson[filename][permissionType];

                            if (action == '+') {
                                await filePermissionSet.setPermissions(permissionType);
                            }
                            else if (action == '-') {
                                await filePermissionSet.deletePermissions(permissionType);
                            }
                        }
                    }
                }
            }
        }

        return filePermissionsObject;
    }
});