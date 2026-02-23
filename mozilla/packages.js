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
 * when download to the browser.  This code manages packages on Mozilla.
*****/
singleton(class Packages {
    constructor() {
        this.images = {};
        this.shapes = {};
        this.strings = {};
        this.fragments = {};
        this.packages = {};
        this.styleSheet = Doc.queryOne('#primary-stylesheet');
    }

    appendStyle(note, cssText) {
        let textNode = mkDocText(`\n/* ${note} */\n${cssText}`);
        this.styleSheet.append(textNode);
    }

    getFragment(fragmentId) {
        if (fragmentId in this.fragments) {
            let innerHtml = this.fragments[fragmentId];
            return createElementFromOuterHtml(innerHtml);
        }

        return mkHtmlElement('div');
    }

    getImage(imageId) {
        return this.images[imageId];
    }

    getShape(shapeId) {
        return this.shapes[shapeId];
    }

    getString(text) {
        let trimmed = 'unknown';

        if (typeof text == 'string') {
            trimmed = text.trim();

            if (trimmed in this.strings) {
                return this.strings[trimmed];
            }
            else {
                let match = trimmed.match(/##([a-zA-Z0-9._]+)##/);

                if (match && match[1] in this.strings) {
                    return this.strings[match[1]];
                }
            }
        }

        return `${text}`;
    }
    
    getSvg(shapeId) {
        let svg = mkSvgElement('svg');

        if (shapeId in this.shapes) {
            svg.setShape(this.shapes[shapeId]);
        }

        return svg;
    }

    hasFragment(fragmentId) {
        return framentId in this.fragments;
    }
    
    hasImage(imageId) {
        return imageId in this.images;
    }

    hasShape(shapeId) {
        return shapeId in this.shapes;
    }

    hasString(stringId) {
        return stringId in this.strings;
    }

    openApplication() {
        if (webappSettings.title) {
            Doc.setTitle(this.processText(webappSettings.title));
        }

        if (webappSettings.bodyStyle) {
            Doc.getBody().setAttribute('style', webappSettings.bodyStyle);
        }

        if (webappSettings.bodyClass) {
            Doc.getBody().setAttribute('class', webappSettings.bodyClass);
        }
        
        Doc.getBody().setInnerHtml(`<${webappSettings.tagName}></${webappSettings.tagName}>`);
    }

    processNode(docNode) {
        if (docNode instanceof DocText) {
            let text0 = docNode.toString();
            let text1 = this.processText(text0);

            if (text0 != text1) {
                docNode.setText(text1);
            }
        }
        else if (docNode instanceof DocElement) {
            if ('value' in docNode.node) {
                let value0 = docNode.value;
                
                if (typeof value0 == 'string') {
                    let value1 = this.processText(value0);

                    if (value0 != value1) {
                        this.docNode.value = value2;
                    }
                }
            }
            
            for (let attribute of docNode.getAttributes()) {
                let text0 = attribute.value;
                let text1 = this.processText(text0);

                if (text1 != text0) {
                    docNode.setAttribute(attribute.name, text1);
                }
            }
        }
    }
    
    processText(text) {
        let index = 0;
        let segments = [];

        for (let match of text.matchAll(/##([a-zA-Z0-9._]+)##/mg)) {
            if (match.index > index) {
                segments.push(text.substring(index, match.index));
                index = match.index;
            }

            if (match[1] in this.strings) {
                var value = this.strings[match[1]];
            }
            else {
                var value = `## ${match[1]} ##`;
            }

            segments.push(value);
            index += match[0].length;
        }

        segments.push(text.substring(index));
        return segments.join('');
    }

    registerFragments(pkg) {
        for (let key in pkg.fragments) {
            let fragment = pkg.fragments[key];

            if (key in this.fragments) {
                console.log(`Duplicate Fragment in package "${pkg.name}" => ${key}.`);
            }
            else {
                this.fragments[key] = fragment;
            }
        }
    }

    registerImages(pkg) {
        for (let key in pkg.images) {
            let code = pkg.images[key];
            this.images[key] = mkHtmlElement('img').setProperty('src', code);
        }
    }
    
    registerScripts(pkg) {
        for (let script of pkg.scripts) {
            let scriptElement = mkHtmlElement('script');
            scriptElement.setInnerHtml(script);
            scriptElement.setAttribute('package', pkg.name);
            Doc.getHead().append(scriptElement);
        }
    }

    registerShapes(pkg) {
        for (let key in pkg.shapes) {
            this.shapes[key] = pkg.shapes[key];
        }
    }

    registerStrings(pkg) {
        for (let key in pkg.strings) {
            let string = pkg.strings[key];
            this.strings[key] = string;
        }
    }
    
    registerStyleSheets(pkg) {
        for (let styleSheet of pkg.styleSheets) {
           let textNode = mkDocText(`\n/* ${pkg.name} */\n${styleSheet}`);
           this.styleSheet.append(textNode);
        }
    }

    registerWidgets(pkg) {
        for (let tagName in pkg.widgets) {
            let widget = pkg.widgets[tagName];

            if (widget.style) {
                let textNode = mkDocText(`\n/* ${widget.tagName} */\n${widget.style}`);
                this.styleSheet.append(textNode);
            }

            WidgetLibrary.define({
                package: pkg,
                tagName: widget.tagName,
                innerHtml: widget.innerHtml,
                attributes: widget.attributes,
                classId: widget.classId,
                script: widget.script,
            });
        }
    }
    
    async require(packageName) {
        if (!(packageName in this.packages)) {
            let pkg = await Api.getPackage(packageName, Doc.getLanguage());
            this.packages[packageName] = pkg;
            this.registerStyleSheets(pkg);
            this.registerScripts(pkg);
            this.registerWidgets(pkg);
            this.registerImages(pkg);
            this.registerStrings(pkg);
            this.registerFragments(pkg);
            this.registerShapes(pkg);
        }
    }
});
