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


(() => {
    /*****
     * In the CSS object model, some objects have a cssRules property, while others
     * do not.  It's not as simple as one would hope to distinguish between them.
     * We have therefore added a rules-list base type and a non-rules-list base type
     * for other object.  These base types provide a uniform API for all objects
     * with regards to rules lists but also provides information regarding the rules
     * list satus of the underlying CSS object.
    *****/
    class CssRuleListBase {
        constructor(cssObject) {
            this.native = cssObject;
        }

        appendRule(cssRule) {
            // TODO **********************************************************************
        }

        deleteRule(index) {
            // TODO **********************************************************************
        }

        enumerateRules() {
            let enumerated = [];
            let stack = this.getArray();

            while (stack.length) {
                let rule = stack.shift();
                enumerated.push(rule);

                for (let cssRule of rule.getRules().getArray().reverse()) {
                    stack.unshift(cssRule);
                }
            }

            return enumerated;
        }

        getArray() {
            let array = [];

            for (let i = 0; i < this.native.cssRules.length; i++) {
                let rule = this.native.cssRules.item(i);
                array.push(wrapCssObject(rule));
            }

            return array;
        }

        getRuleCount() {
            return this.native.cssRules ? this.native.cssRules.length : 0;
        }

        getRule(index) {
            if (this.native) {
                let cssRule = this.cssRuleList.item(index);
                let ctor = Reflect.getPrototypeOf(cssRule).constructor;
                return CssMakers.get(ctor)(this.cssGroup, cssRule);
            }
        }

        hasRules() {
            return true;
        }

        insertRule(cssRule, index) {
            // TODO **********************************************************************
        }

        [Symbol.iterator]() {
            return this.getArray()[Symbol.iterator]();
        }
    }

    class CssNoRuleListBase {
        constructor(cssObject) {
            this.native = cssObject;
        }

        appendRule(cssRule) {
            return this;
        }

        deleteRule(index) {
            return this;
        }

        enumerateRules() {
            return [];
        }

        getArray() {
            return [];
        }

        getRuleCount() {
            return 0;
        }

        getRule(index) {
            return null;
        }

        hasRules() {
            return false;
        }

        insertRule(cssRule, index) {
            return this;
        }

        [Symbol.iterator]() {
            return [][Symbol.iterator]();
        }
    }


    /*****
     * The CssStyleSheet class wraps the features and functionality of both the
     * StyleSheet and CSSStyleSheet classes into one handy wrapper.  When fetching
     * styles sheets with the Doc singleton, an instance of this object is that
     * which is returned.
    *****/
    define(class CssStyleSheet extends CssRuleListBase {
        constructor(cssStyleSheet) {
            super(cssStyleSheet);
        }

        disable() {
            this.native.disabled = true;
            return this;
        }

        enable() {
            this.native.disabled = false;
            return this;
        }

        getHref() {
            return this.native.href;
        }

        getMedia() {
            return this.native.media;
        }

        getOwnerNode() {
            if (this.native.ownerNode) {
                return wrapNode(this.native.ownerNode);
            }

            return null;
        }

        getOwnerRule() {
            if (this.native.ownerRule) {
                return mkCssImportrule(this.native.ownerRule);
            }

            return null;
        }

        getParentStyleSheet() {
            if (this.native.parentStyleSheet) {
                return mkCssStyleSheet(this.native.parentStyleSheet);
            }

            return null;
        }

        getTitle() {
            return this.native.title;
        }

        getType() {
            return this.native.type;
        }

        isDisabled() {
            return this.native.disabled;
        }

        isEnabled() {
            return !this.native.disabled;
        }
    });


    /*****
     * There are two basic rule base classes, one for listful rules and one for
     * non-listful rules.  Listful means they have a rules list, non-listfuls
     * do NOT have a rules list, i.e., cssRules property in the native object.
    *****/
    class CssRuleWithRuleList extends CssRuleListBase {
        super(cssObject) {
            this.super(cssObject);
        }

        getCssText() {
            return this.native.cssText;
        }

        getParentRule() {
            if (this.native.parentRule) {
                return wrapCssObject(this.native.parentRule);
            }

            return null;
        }

        getParentStyleSheet() {
            if (this.native.parentStyleSheet) {
                return wrapCssObject(this.nativeParentStyleSheet);
            }

            return null;
        }
    };

    class CssRuleNoRuleList extends CssNoRuleListBase {
        super(cssObject) {
            this.super(cssObject);
        }

        getCssText() {
            return this.native.cssText;
        }

        getParentRule() {
            if (this.native.parentRule) {
                return wrapCssObject(this.native.parentRule);
            }

            return null;
        }

        getParentStyleSheet() {
            if (this.native.parentStyleSheet) {
                return wrapCssObject(this.nativeParentStyleSheet);
            }

            return null;
        }
    };


    /*****
    *****/
    define(class CssFontFaceDescriptors {
        constructor(cssFontFaceDescriptors) {
            // TODO **********************************************************************
        }
    });


    /*****
    *****/
    define(class CssMediaList {
        constructor(mediaList) {
            // TODO **********************************************************************
        }
    });


    /*****
    *****/
    define(class CssPageDescriptors {
        constructor(cssPageDescriptors) {
            // TODO **********************************************************************
        }
    });


    /*****
     * This is the wrapper for the native CSSStyleDeclaration object. Styles are
     * large complex objects containing all of the style properties, values, and
     * all of the logic associated with them.  A style properties object can be
     * used to modify the live style of elements in an HTML document.  Note that
     * style properties also implent the style declaration interface.
    *****/
    define(class CssStyleDeclaration {
        constructor(cssStyleDeclaration) {
            this.native = cssStyleDeclaration;
        }

        getCssText() {
            return this.native.cssText;
        }

        getItem(index) {
            return this.native.item(index);
        }

        getLength() {
            return this.native.length;
        }

        getParentRule() {
            return wrapCssObject(this.native.parentRule);
        }

        getPropertyPriority(property) {
            return this.native.getPropertyPriority(property);
        }

        getPropertyValue(property) {
            return this.native.getPropertyValue(property);
        }

        removeProperty(property) {
            this.native.removeProperty(property);
            return this;
        }

        setProperty(property, value, priority) {
            this.native.setProperty(property, value, priority);
            return this;
        }

        [Symbol.iterator]() {
            let properties = [];

            for (let i = 0; i < this.native.length; i++) {
                properties.push(this.native.item(i));
            }

            return properties[Symbol.iterator]();
        }
    });


    /*****
     * Here's the list of specific style-rule types.  Generally speaking, these
     * instances are returned by the rule-list API object.  They may be created
     * by the developer and can also be inserted and appended to a specifc node,
     * meanning either rule or stylesheet.  Unimplemnted rules are:
     * 
     *      CSSCounterStyleRule
     *      CSSFontFeatureValuesRule
     *      CSSFontPalletteValuesRule
     *      CSSLayerBlockRule
     *      CSSLayerStatementRule
     *      CSSNestedDeclarations
     *      CSSViewTransitionRule
    *****/
   define(class CssFontFaceRule extends CssRuleNoRuleList {
    constructor(cssFontFaceDescriptors) {
        super(cssFontFaceDescriptors);
    }

    getStyle() {
        return mkCssFontFaceDescriptors(this.native.style);
    }
   });

    define(class CssImportRule extends CssRuleWithRuleList {
        constructor(cssImportRule) {
            super(cssImportRule);
        }

        getHref() {
            return this.native.href;
        }

        getLayerName() {
            return this.native.layerName;
        }

        getMediaList() {
            if (this.native.mediaList) {
                return mkCssMediaList(this.native.mediaList);
            }

            return null;
        }

        getStyleSheet() {
            if (this.native.styleSheet) {
                return wrapCssObject(this.styleSheet);
            }

            return null;
        }

        getSupportsText() {
            return this.native.supportsText;
        }
    });

    define(class CssKeyframeRule extends CssRuleWithRuleList {
        constructor(cssKeyframerule) {
            super(cssKeyframerule);
        }
        
        getKeyText() {
            return this.native.keyFrameText;
        }

        getStyle() {
            return mkCssStyleDeclaration(this.native.style);
        }
    });

    define(class CssKeyframesRule extends CssRuleWithRuleList {
        constructor(cssKeyframesrule) {
            super(cssKeyframesrule);
        }

        getName() {
            return this.native.name;
        }
    });

    define(class CssMediaRule extends CssRuleWithRuleList {
        constructor(cssMediaRule) {
            super(cssMediaRule);
        }

        getConditionText() {
            return this.native.conditionText;
        }

        getMedia() {
            return mkCssMediaList(this.native.media);
        }
    });

    define(class CssNamespaceRule extends CssRuleNoRuleList {
        constructor(cssNamespaceRule) {
            super(cssNamespaceRule);
        }

        getNamespaceURI() {
            return this.native.getNamespaceURI;
        }

        getPrefix() {
            return this.native.prefix;
        }
    });

    define(class CssPageRule extends CssRuleNoRuleList {
        constructor(cssPageRule) {
            super(cssPageRule);
        }

        getSelectorArray() {
            return RdsText.split(this.native.selectorText, ',');
        }

        getSelectorText() {
            return this.native.selectorText;
        }

        setSelectorText(selectorText) {
            this.native.selectorText = selectorText;
            return this;
        }

        getStyle() {
            return mkCssPageDescriptors(this.native.style);
        }
    });

    define(class CssStyleRule extends CssRuleNoRuleList {
        constructor(cssStyleRule) {
            super(cssStyleRule);
        }

        getSelectorArray() {
            return RdsText.split(this.native.selectorText, ',');
        }

        getSelectorText() {
            return this.native.selectorText;
        }

        getStyle() {
            return mkCssStyleDeclaration(this.native.style);
        }

        setSelectorText(selectorText) {
            this.native.selectorText = selectorText;
            return this;
        }
    });

    define(class CssSupportsRule extends CssRuleWithRuleList {
        constructor(cssSupportsRule) {
            super(cssSupportsRule);
        }

        getConditionText() {
            return this.native.conditionText;
        }
    });


    /*****
     * Like HTML nodes, this features provides a clean mechanism for wrapping and
     * return CSS objects as objects from the framework.  Note that there is not
     * an individual class for each of the native CSS objects.  We are providing
     * higher level functional objects.
    *****/
    const cssMakers = new WeakMap();
    cssMakers.set(CSSFontFaceRule, mkCssFontFaceRule);
    cssMakers.set(CSSImportRule, mkCssImportRule);
    cssMakers.set(CSSKeyframeRule, mkCssKeyframeRule);
    cssMakers.set(CSSKeyframesRule, mkCssKeyframesRule);
    cssMakers.set(CSSMediaRule, mkCssMediaRule);
    cssMakers.set(CSSNamespaceRule, mkCssNamespaceRule);
    cssMakers.set(CSSPageRule, mkCssPageRule);
    cssMakers.set(CSSStyleRule, mkCssStyleRule);
    cssMakers.set(CSSSupportsRule, mkCssSupportsRule);

    function wrapCssObject(cssObject) {
        if (cssObject instanceof CssRuleWithRuleList) {
            return cssObject;
        }
        else if (cssObject instanceof CssRuleNoRuleList) {
            return cssObject;
        }
        else if (cssObject instanceof CssStyleSheet) {
            return cssObject;
        }
        else if (cssObject instanceof CSSStyleSheet) {
            return mkCssStyleSheet(cssObject);
        }
        else {
            let ctor = Reflect.getPrototypeOf(cssObject).constructor;

            if (cssMakers.has(ctor)) {
                return cssMakers.get(ctor)(cssObject);
            }
        }

        return null;
    }
})();
