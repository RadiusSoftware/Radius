/*****
 * Copyright (c) 2017-2023 Kode Programming
 * https://github.com/KodeProgramming/kode/blob/main/LICENSE
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
 * A package is a bundle of code and other resources, such as images, strings,
 * style sheets, and widgets that are meant to be used by the brosser. Packages
 * may have a single application (Web Application).  Infrastructure packages
 * have no applications, while application packages do.  Packages are serialized
 * when download to the browser.
*****/
define(class Package {
    constructor() {
        this.name = '';
        this.type = '';
        this.url = '';
        this.path = '';
        this.status = '';
        this.dependencies = [];
        this.lib = mkHttpLibraryHandle();
        this.boxed = null;

        this.nodejs = {
            workers: [],
            errors: [],
        };

        this.mozilla = {
            errors: [],
            images: {},
            shapes: {},
            scripts: [],
            strings: {},
            fragments: {},
            styleSheets: [],
            widgets: {},
        };
    }

    getDependencies() {
        return this.dependencies;
    }
    
    getDocType(text) {
        let match = text.trim().match(/<!DOCTYPE[ \t]+([a-z]+)[ \t]*>/);

        if (match) {
            return {
                type: match[1],
                length: match.length,
            };
        }
        
        return {
            type: 'nodoctype',
            length: 0,
        };
    }

    getFailure() {
        return this.failure;
    }

    getMozillaPackage(lang) {
        let box = {
            name: this.name,
            images: this.mozilla.images,
            shapes: this.mozilla.shapes,
            scripts: this.mozilla.scripts,
            styleSheets: this.mozilla.styleSheets,
            widgets: this.mozilla.widgets,
        };

        if (lang in this.mozilla.strings) {
            box.strings = this.mozilla.strings[lang];
        }
        else {
            let langs = Object.keys(this.mozilla.strings);

            if (langs.length) {
                box.strings = this.mozilla.strings[langs[0]];
            }
            else {
                box.strings = {};
            }
        }

        if (lang in this.mozilla.fragments) {
            box.fragments = this.mozilla.fragments[lang];
        }
        else {
            let langs = Object.keys(this.mozilla.fragments);

            if (langs.length) {
                box.fragments = this.mozilla.fragments[langs[0]];
            }
            else {
                box.fragments = {};
            }
        }

        return box;
    }

    getName() {
        return this.name;
    }

    getPackageType() {
        return this.type;
    }

    getPath() {
        return this.path;
    }

    getStatus() {
        return this.status;
    }

    getType() {
        return this.type;
    }

    getUrl() {
        return this.url;
    }

    hasFailure() {
        return this.failure !== undefined;
    }

    async loadBundle(bundleElement) {
        for (let childElement of bundleElement) {
            let methodName = `process${childElement.getTagName()[0].toUpperCase()}${childElement.getTagName().substring(1)}`;

            if (methodName in this) {
                this[methodName](childElement);
            }
        }
    }

    async loadDirectory(path, url) {
        try {
            this.path = path;
            this.url = url;
            this.type = 'filesystem';

            let basicPermissions = mkFilePermissions(await mkPermissionSetHandle().createPermissionSet());
            await basicPermissions.getDirPermissionSet().setPermissions('radius:cookies', 'radius:session');

            if (await this.loadPackage(path)) {
                let stack = [{
                    path: path,
                    url: this.url,
                    filePermissions: basicPermissions,
                }];

                while (stack.length) {
                    let node = stack.pop();

                    let handle = {
                        path: node.path,
                        url: node.url,
                        fileNames: {},
                        filePermissions:  await FilePermissions.load(node.path, node.filePermissions),
                    };

                    for (let dirEntry of await FileSystem.readDirectory(node.path)) {
                        if (!dirEntry.endsWith('.json')) {
                            let abspath = Path.join(node.path, dirEntry);

                            if (await FileSystem.isDirectory(abspath)) {
                                stack.push({
                                    path: abspath,
                                    url: Path.join(node.url, dirEntry),
                                    filePermissions: handle.filePermissions,
                                });
                            }
                            else {
                                handle.fileNames[dirEntry] = abspath;
                            }
                        }
                    }

                    await this.loadHttpXs(handle);
                    await this.loadFiles(handle);
                }
            }
        }
        catch (e) {
            this.failure = `ERROR: ${e.toString()}\n${e.stack}`;
        }

        return this;
    }

    async loadFiles(handle) {
        for (let fileName in handle.fileNames) {
            let filePath = handle.fileNames[fileName];
            
            if (fileName.endsWith('.css')) {
                this.mozilla.styleSheets.push(await FileSystem.readFileAsString(filePath));
            }
            else if (fileName.endsWith('.js')) {
                await this.registerCode(filePath);
            }
            else if (fileName.endsWith('.html')) {
                let html = await FileSystem.readFileAsString(filePath);
                let doctype = this.getDocType(html);

                if (doctype.type == 'html') {
                    let info = Path.parse(fileName);
                    let permissionSet = await handle.filePermissions.getFilePermissionSet(fileName);

                    await this.lib.addFile({
                        pkg: this.name,
                        path: Path.join(handle.url, fileName),
                        mime: Mime.getMimeType(info.ext).getCode(),
                        mode: '',
                        once: false,
                        pset: await permissionSet,
                        filePath: filePath,
                    });
                }
                else if (doctype.type == 'bundle') {
                    let htmlElement = createDocElementFromOuterHtml(html.substring(doctype.length));

                    if (htmlElement.getTagName() == 'bundle') {
                        await this.loadBundle(htmlElement);
                    }
                }
            }
            else {
                let info = Path.parse(fileName);
                let permissionSet = await handle.filePermissions.getFilePermissionSet(fileName);

                if (Mime.isSupported(info.ext)) {
                    await this.lib.addFile({
                        pkg: this.name,
                        path: Path.join(handle.url, fileName),
                        mime: Mime.getMimeType(info.ext).getCode(),
                        mode: '',
                        once: false,
                        pset: await permissionSet,
                        filePath: filePath,
                    });
                }
            }
        }
    }

    async loadHttpXs(handle) {
        let spentFiles = [];

        for (let fileName in handle.fileNames) {
            if (fileName.endsWith('.js')) {
                let jsPath = handle.fileNames[fileName];
                let parsed = Path.parse(jsPath);
                let htmlFileName = `${parsed.name}.html`;
                let htmlPath = `${Path.join(parsed.dir, parsed.name)}.html`;
                let httpXName = parsed.name.toLowerCase();

                if (htmlFileName in handle.fileNames) {
                    if (await FileSystem.isFile(htmlPath)) {
                        let html = await FileSystem.readFileAsString(htmlPath);
                        let doctype = this.getDocType(html);

                        if (doctype.type == 'httpx') {
                            let htmlElement = createDocElementFromOuterHtml(html.substring(doctype.length));

                            if (htmlElement.getTagName() == 'bundle') {
                                for (let childElement of htmlElement.getChildElements()) {
                                    if (childElement.getTagName() == 'httpx') {
                                        let context = {
                                            url: Path.join(handle.url, httpXName),
                                        };

                                        let opts = this.loadOptions(childElement, context);
                                        let permissionSet = await handle.filePermissions.getFilePermissionSet(httpXName);
                                        let path = httpXName.startsWith('ROOT') ? handle.url : Path.join(handle.url, httpXName);

                                        await this.lib.addHttpX({
                                            pkg: this.name,
                                            path: path,
                                            mime: 'text/html',
                                            mode: opts.mode ? opts.mode : '',
                                            once: opts.once === true,
                                            pset: permissionSet,
                                            opts: opts,
                                            jsPath: jsPath,
                                        });

                                        spentFiles.push(fileName);
                                        spentFiles.push(htmlFileName);
                                        await this.loadBundle(htmlElement);
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        for (let fileName of spentFiles) {
            delete handle.fileNames[fileName];
        }
    }

    loadOptions(httpxElement, context) {
        let opts = { settings: {}};

        for (let childElement of httpxElement) {
            if (childElement.getTagName() == 'opt') {
                let key = childElement.getAttribute('key');

                if (key === 'setting') {
                    let name = childElement.getAttribute('name');
                    let value = childElement.getAttribute('value');
                    let type = childElement.getAttribute('type');

                    if (typeof name == 'string' && typeof value == 'string') {
                        if (typeof type == 'string') {
                            let valueType;
                            eval(`valueType=${type}`)

                            opts.settings[name] = {
                                name: name,
                                type: valueType,
                                value: eval('`' + value + '`'),
                            };
                        }
                    }
                }
                else {
                    let typeName = childElement.getAttribute('type');
                    let value = childElement.getAttribute('value');

                    let type;
                    eval(`type=${typeName}`);

                    if (type === StringType) {
                        opts[key] = this.substituteMarkers(value);
                    }
                    else {
                        opts[key] = type.fromString(value);
                    }
                }
            }
        }

        return opts;
    }

    async loadPackage(dirpath) {
        if (await FileSystem.isDirectory(dirpath)) {
            let path = Path.join(dirpath, 'package.json');

            if (await FileSystem.isFile(path)) {
                let pkgMeta = fromJson(await FileSystem.readFileAsString(path));
                this.name = pkgMeta.name;

                if (Array.isArray(pkgMeta.dependencies)) {
                    this.dependencies = pkgMeta.dependencies;
                }

                this.status = 'package-found';
                return true;
            }
        }

        return false;
    }

    async processFragment(fragmentElement) {
        let prefix = this.name ? `${this.name}.` : '';
        let lang = fragmentElement.getAttribute('lang');
        let name = fragmentElement.getAttribute('name');
        let key = `${prefix}${name}`;
        let langGroup = this.mozilla.fragments[lang];

        if (!langGroup) {
            langGroup = {};
            this.mozilla.fragments[lang] = langGroup;
        }

        langGroup[key] = fragmentElement.getInnerHtml();
    }

    async processImages(imagesElement) {
        let prefix = this.name ? `${this.name}.` : '';

        for (let image of RdsText.split(imagesElement.getInnerHtml(), '\n')) {
            let [ name, code ] = RdsText.split(image.trim(), '#');
            let imageId = `${prefix}${name}`;
            this.mozilla.images[imageId] = code;
        }
    }

    async processScript(scriptElement) {
        let script = this.substituteMarkers(scriptElement.getInnerHtml().trim());
        this.mozilla.scripts.push(script);
;    }

    async processShapes(shapesElement) {
        let prefix = this.name ? `${this.name}.` : '';

        for (let shape of shapesElement.getChildren()) {
            let tagName = shape.getTagName();

            if (tagName == 'shape') {
                let shapeName = shape.getAttribute('name');

                if (shapeName) {
                    if (shapeName in this.mozilla.shapes) {
                        mkFailure(`Duplicate shape name encountered: "${shapeName}"`);
                    }
                    else {
                        let shapeId = `${prefix}${shapeName}`;

                        this.mozilla.shapes[shapeId] = {
                            shapeId: shapeId,
                            shapeName: shapeName,
                            attributes: shape.getAttributes().filter(attr => attr.name != 'name'),
                            innerHtml: shape.getInnerHtml(),
                        };
                    }
                }
            }
        }
    }

    async processStrings(stringsElement) {
        let lang = stringsElement.getAttribute('lang');

        if (lang) {
            let state = 0;
            let key = [];
            let text = [];

            for (let char of stringsElement.getInnerHtml()) {
                if (state == 0) {
                    if (char.match(/[a-zA-z]/)) {
                        state = 1;
                        key.push(char);
                    }
                    else if (!char.match(/\s/)) {
                        state = -1;
                        break;
                    }
                }
                else if (state == 1) {
                    if (char.match(/[a-zA-z0-9_]/)) {
                        key.push(char);
                    }
                    else {
                        state = 2;
                    }
                }
                else if (state == 2) {
                    if (char == '=') {
                        state = 3;
                    }
                    else if (!char.match(/\s/)) {
                        break;
                    }
                }
                else if (state == 3) {
                    if (char == '\\') {
                        this.processStringValue(lang, key, text);
                        state = 0;
                        key = [];
                        text = [];
                    }
                    else {
                        text.push(char);
                    }
                }
            }

            if (state != 0) {
                throw new Error(`Bad strings bundle ensountered: ${stringsElement.getInnerHtml()}`)
            }
        }
        else {
            throw new Error(`Strings element must always have a non-empty "lang" attribute.`);
        }
    }

    async processStringValue(lang, keyArray, textArray) {
        let prefix = this.name ? `${this.name}.` : '';
        let key = `${prefix}${keyArray.join('')}`;
        let scrubbedTextArray = [];
        let state = 0;

        for (let char of textArray) {
            if (state == 0) {
                if (char == '\n') {
                    state = 1;
                }
                else {
                    scrubbedTextArray.push(char);
                }
            }
            else if (state == 1) {
                if (!char.match(/\s/)) {
                    state = 0;
                    scrubbedTextArray.push(' ');
                    scrubbedTextArray.push(char);
                }
            }
        }

        let langGroup = this.mozilla.strings[lang];

        if (!langGroup) {
            langGroup = {};
            this.mozilla.strings[lang] = langGroup;
        }

        langGroup[key] = scrubbedTextArray.join('').trim();
    }

    async processStyle(styleElement) {
        this.mozilla.styleSheets.push(this.scrubStyleText(styleElement.getInnerHtml()));
    }

    async processWidget(widgetElement) {
        let tagName = widgetElement.getAttribute('tagname');

        if (tagName) {
            tagName = tagName.trim().toLowerCase();

            let widget = {
                attributes: {},
                classId: Crypto.generateUUID(),
                className: '',
                innerHtml: '',
                package: this.name,
                script: '',
                style: '',
                tagName: tagName,
            };

            widget.attributes.design = `${widget.tagName}-self`;
            let tagNameParts = RdsText.split(widget.tagName.trim().toLowerCase(), '-');

            if (tagNameParts.length != 2) {
                this.mozilla.errors.push(
                    mkFailure(
                        `Invalid widget tagName format: "${widget.tagName}"`
                    ));

                return ;
            }

            if (widget.tagName in this.mozilla.widgets) {
                this.mozilla.errors.push(
                    mkFailure(`Duplicate widget tagName: "${widget.tagName}"`)
                );

                return ;
            }

            for (let childElement of widgetElement) {
                let tagName = childElement.getTagName();

                if (tagName == 'script') {
                    let script = childElement.getInnerHtml().trim();
                    widget.script = this.substituteMarkers(script);
                    let match = widget.script.match(/class[\t ]+([a-zA-Z0-9_]+)/);

                    if (match) {
                        widget.className = match[1];
                    }
                    else {
                        mkFailure(`Unable to find widget class name: "${widget.tagName}"`);
                    }
                }
                else if (tagName == 'html') {
                    for (let attribute of childElement.getAttributes()) {
                        if (attribute.name == 'design') {
                            let value = `${widget.tagName}-${attribute.value}`;
                            widget.attributes[attribute.name] = value;
                        }
                        else {
                            let attributeValue = this.substituteMarkers(attribute.value);
                            widget.attributes[attribute.name] = attributeValue;
                        }
                    }

                    let stack = childElement.getChildren();

                    while (stack.length) {
                        let docNode = stack.pop();

                        if (docNode instanceof DocElement) {
                            let design = docNode.getAttribute('design');

                            if (design) {
                                docNode.setAttribute('design', `${widget.tagName}-${design}`);
                            }

                            stack = stack.concat(docNode.getChildren());
                        }
                    }
                    
                    widget.innerHtml = this.substituteMarkers(childElement.getInnerHtml().trim());
                }
                else if (tagName == 'style') {
                    let innerHtml = childElement.getInnerHtml();
                    let matches = [...innerHtml.matchAll(/\[design=([a-zA-Z0-9-_]+)\]/g)];

                    for (let match of matches) {
                        let styleCode = `${widget.tagName}-${match[1]}`;
                        innerHtml = innerHtml.replace(match[0], `[design=${styleCode}]`)
                    }

                    innerHtml = innerHtml.replaceAll('[self]', `[design=${widget.tagName}-self]`);
                    widget.style = this.scrubStyleText(innerHtml);
                }
            }

            this.mozilla.widgets[widget.tagName] = widget;
        }
    }

    async registerCode(filePath) {
        let primary = true;
        let workers = true;
        let jscode = await FileSystem.readFileAsString(filePath);

        if (jscode.search(/`#primary`/gm)) {
            workers = false;
        }
        else if (jscode.search(/`#workers`/gm)) {
            primary = false;
        }

        if (primary) {
            try {
                require(filePath);
            }
            catch (e) {
                this.nodejs.errors.push({
                    error: e,
                    stack: e.stack,
                    filePath: filePath,
                    fileName: fileName,
                });
            }
        }

        if (workers) {
            this.nodejs.workers.push(filePath);
        }

        return types;
    }
    
    scrubStyleText(styleText) {
        let state = 0;
        let scrubbed = [];

        for (let text of RdsText.split(styleText, '\n')) {
            let line = text.trim();

            if (line.endsWith('{')) {
                scrubbed.push(line);
            }
            else if (line.endsWith(',')) {
                scrubbed.push(`${line}`);
            }
            else if (line.endsWith('}')) {
                scrubbed.push(`${line}`);
            }
            else {
                scrubbed.push(`    ${line}`);
            }
        }

        return scrubbed.join('\n');
    }
    
    substituteMarkers(text) {
        let index = 0;
        let segments = [];
        let prefix = this.name ? `${this.name}.` : '';

        for (let match of text.matchAll(/##([a-zA-Z0-9_.]+)##/mg)) {
            let symbolName = match[1];

            if (match.index > index) {
                segments.push(text.substring(index, match.index));
                index = match.index;
            }

            segments.push(`##${prefix}${symbolName}##`);
            index += match[0].length;
        }

        segments.push(text.substring(index));
        return segments.join('');
    }
});


/*****
 * The PackageService is responsible for managing client-side feature packages.
 * Packages are loaded only ONCE and reused as necessary by processing and web
 * applications.  Packages have been developed to be loaded from the file system
 * or the Net.  Additionally, packages have a provision for multilingual support.
 * It's part of the package itself.
*****/
createService(class PackageService extends Service {
    constructor() {
        super();
        this.packages = [];
        this.packagesByUrl = {};
        this.packagesByName = {};
        this.packagesByPath = {};
    }

    async onGetLanguage(message) {
        if (message.packageName in this.packagesByName) {
            let supported = mkStringSet();
            let pkg = this.packagesByName[message.packageName];
            Object.keys(pkg.mozilla.strings).forEach(lang => supported.set(lang));

            for (let language of message.languages) {
                if (supported.has(language)) {
                    return language;
                }
            }

            if (supported.getLength()) {
                return supported.toArray()[0];
            }
        }

        return 'en';
    }

    async onGetMozillaPackage(message) {
        if (message.packageName in this.packagesByName) {
            let pkg = this.packagesByName[message.packageName];
            return pkg.getMozillaPackage(message.lang);
        }
    }

    async onGetPackageMeta(message) {
        if (message.packageName in this.packagesByName) {
            let pkg = this.packagesByName[message.packageName];

            return {
                packageName: pkg.getName(),
                packageType: pkg.getType(),
                packageStatus: pkg.getStatus(),
                packagePath: pkg.getPath(),
                packageUrl: pkg.getUrl(),
                nodejsErrors: pkg.nodejs.errors,
                mozillaErrors: pkg.mozilla.errors,
            };
        }

        return null;
    }

    async onHasPackage(message) {
        return message.packageName in this.packagesByName;
    }

    async onHasErrors(message) {
        return this.mozilla.errors.length > 0 || this.nodejs.errors.length > 0;
    }

    async onHasPath(message) {
        return message.path in this.packagesByPath;
    }

    async onHasUrl(message) {
        return message.url in this.packagesByUrl;
    }

    async onListDependencies(message) {
        if (message.packageName in this.packagesByName) {
            return this.packagesByName[message.packageName].getDependencies();
        }

        return [];
    }

    async onListErrors(message) {
        return {
            mozilla: this.mozilla.errors,
            nodejs: this.nodejs.errors,
        };
    }

    async onListLoadOrder(message) {
        let loadOrder = [];

        if (message.packageName in this.packagesByName) {
            for (let pkg of this.packages) {
                loadOrder.push(pkg.getName());

                if (pkg.getName() == message.packageName) {
                    break;
                }
            }
        }

        return loadOrder;
    }

    async onListPackages() {
        return Object.keys(this.packagesByName);
    }

    async onListPaths(message) {
        return Object.keys(this.packagesByPath);
    }

    async onListUrls(message) {
        return Object.keys(this.packagesByUrl);
    }

    async onLoadDirectory(message) {
        try {
            if (!(message.path in this.packagesByPath)) {
                let pkg = await mkPackage().loadDirectory(message.path, message.url);

                if (!pkg.hasFailure()) {
                    if (!(pkg.getName() in this.packagesByName)) {
                        this.packages.push(pkg);
                        this.packagesByUrl[pkg.getUrl()] = pkg;
                        this.packagesByName[pkg.getName()] = pkg;
                        this.packagesByPath[pkg.getPath()] = pkg;
                        return true;
                    }
                }
            }
        }
        catch (e) {}
        return false;
    }
});


/*****
 * The PackageService is responsible for managing client-side feature packages.
 * Packages are loaded only ONCE and reused as necessary by processing and web
 * applications.  Packages have been developed to be loaded from the file system
 * or the Net.  Additionally, packages have a provision for multilingual support.
 * It's part of the package itself.
*****/
define(class PackageHandle extends Handle {
    constructor() {
        super();
    }

    async getLanguage(packageName, languages) {
        return await this.callService({
            packageName: packageName,
            languages: languages,
        });
    }

    async getMozillaPackage(packageName, lang) {
        return await this.callService({
            packageName: packageName,
            lang: lang,
        });
    }

    async getPackageMeta(packageName) {
        return await this.callService({
            packageName: packageName,
        });
    }

    async hasPackage(packageName) {
        return await this.callService({
            packageName: packageName,
        });
    }

    async hasErrors(packageName) {
        return await this.callService({
            packageName: packageName,
        });
    }

    async hasPath(path) {
        return await this.callService({
            path: path,
        });
    }

    async hasUrl(url) {
        return await this.callService({
            url: url,
        });
    }

    async listDependencies(packageName) {
        return await this.callService({
            packageName: packageName,
        });
    }

    async listErrors(packageName) {
        return await this.callService({
            packageName: packageName,
        });
    }

    async listLoadOrder(packageName) {
        return await this.callService({
            packageName: packageName,
        });
    }

    async listPackages() {
        return await this.callService({
        });
    }

    async listPaths() {
        return await this.callService({
        });
    }

    async listUrls() {
        return await this.callService({
        });
    }

    async loadDirectory(path, url) {
        return await this.callService({
            path: path,
            url: url,
        });
    }
});
