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
 * ***********************************************************************************
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
 * ***********************************************************************************
*****/
define(class CssFontFaceDescriptors extends CssStyleDeclaration {
    constructor(cssFontFaceDescriptors) {
        super(cssFontFaceDescriptors);
    }
});


/*****
 * ***********************************************************************************
*****/
define(class CssMediaList {
    constructor(mediaList) {
        this.native = mediaList;
    }
});


/*****
 * ***********************************************************************************
*****/
define(class CssPageDescriptors extends CssStyleDeclaration {
    constructor(cssPageDescriptors) {
        super(cssPageDescriptors);
    }
});


/*****
 * ***********************************************************************************
*****/
define(class CssStyleProperties extends CssStyleDeclaration {
    constructor(cssStyleProperties) {
        super(cssStyleProperties);
    }
});


/*****
 * ***********************************************************************************
*****/
define(class CssStylePropertyMap {
    constructor(cssStylePropertyMap) {
        this.native = cssStylePropertyMap;
    }
});


(() => {
    /*****
    *****/
    interface(class CssRules {
        appendRule(index) {
            // **************************************************************
        }

        deleteRule(index) {
            // **************************************************************
        }

        enumerateRules() {
            let enumerated = [];
            let stack = this.getRules();

            while (stack.length) {
                let rule = stack.shift();
                enumerated.push(rule);

                for (let cssRule of rule.getRules().getRules().reverse()) {
                    stack.unshift(cssRule);
                }
            }

            return enumerated;
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

        getRules() {
            let array = [];

            for (let i = 0; i < this.native.cssRules.length; i++) {
                let rule = this.native.cssRules.item(i);
                array.push(wrapCssObject(rule));
            }

            return array;
        }

        insertRule(index) {
            // **************************************************************
        }

        [Symbol.iterator]() {
            return this.getRules()[Symbol.iterator]();
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    class CssRule {
        constructor(cssRule) {
            this.native = cssRule;
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
                return wrapCssObject(this.native.parentStyleSheet);
            }

            return null;
        }
    }


    /*****
    * ***********************************************************************************
    *****/
    define(class CssGroupingRule extends CssRule {
        constructor(cssGroupingRule) {
            super(cssGroupingRule);
        }
    }, CssRules);


    /*****
    * ***********************************************************************************
    *****/
    define(class CssConditionRule extends CssGroupingRule {
        constructor(cssConditionRule) {
            super(cssConditionRule);
        }

        getConditionText() {
            return this.native.conditionText;
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    define(class CssFontFaceRule extends CssRule {
        constructor(cssFontFaceDescriptors) {
            super(cssFontFaceDescriptors);
        }

        getStyle() {
            return mkCssFontFaceDescriptors(this.native.style);
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    define(class CssImportRule extends CssRule {
        constructor(cssImportRule) {
            super(cssImportRule);
        }

        getHref() {
            return this.native.href;
        }

        getLayerName() {
            return this.native.layerName;
        }

        getMedia() {
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


    /*****
    * ***********************************************************************************
    *****/
    define(class CssKeyframeRule extends CssRule {
        constructor(cssKeyframerule) {
            super(cssKeyframerule);
        }
        
        getKeyText() {
            return this.native.keyFrameText;
        }

        getkeyTextArray() {
            return RdsText.split(this.native.keyFrameText, ',');
        }

        getStyle() {
            return mkCssStyleDeclaration(this.native.style);
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    define(class CssKeyframesRule extends CssRule {
        constructor(cssKeyframesrule) {
            super(cssKeyframesrule);
        }

        getName() {
            return this.native.name;
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    define(class CssMediaRule extends CssConditionRule {
        constructor(cssMediaRule) {
            super(cssMediaRule);
        }

        getMedia() {
            return mkCssMediaList(this.native.media);
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    define(class CssNamespaceRule extends CssRule {
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


    /*****
    * ***********************************************************************************
    *****/
    define(class CssPageRule extends CssGroupingRule {
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


    /*****
    * ***********************************************************************************
    *****/
    define(class CssStyleRule extends CssGroupingRule {
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
            return mkCssStyleProperties(this.native.style);
        }

        getStyleMap() {
            return mkCssStylePropertyMap(this.native.styleMap);
        }

        setSelectorText(selectorText) {
            this.native.selectorText = selectorText;
            return this;
        }
    });


    /*****
    * ***********************************************************************************
    *****/
    define(class CssSupportsRule extends CssConditionRule {
        constructor(cssSupportsRule) {
            super(cssSupportsRule);
        }

        getConditionText() {
            return this.native.conditionText;
        }
    });


    /*****
     * The CssStyleSheet class wraps the features and functionality of both the
     * StyleSheet and CSSStyleSheet classes into one handy wrapper. When fetching
     * styles sheets with the Doc singleton, an instance of this object is that
     * which is returned.
    *****/
    define(class CssStyleSheet {
        constructor(cssStyleSheet) {
            this.native = cssStyleSheet;
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
    }, CssRules);


    /*****
     * Like HTML nodes, this features provides a clean mechanism for wrapping and
     * return CSS objects as objects from the framework.  Note that there is not
     * an individual class for each of the native CSS objects.  We are providing
     * higher level functional objects.  Here are the unimplemented CssRules:
     * 
     *      CSSCounterStyleRule
     *      CSSFontFeatureValuesMap
     *      CSSFontFeatureValuesRule
     *      CSSFunctionDeclarations
     *      CSSFunctionDescriptors
     *      CSSFunctionRule
     *      CSSPositionTryRule
     *      CSSPositionTryDescriptors
     *      CSSStartingStyleRule
     *      CSSNestedDeclarations
     *      FontFace
     *      FontFaceSet
     *      FontFaceSetLoadEvent
     *      Screen
     * 
     * This list should shrink over time as the development teams implements them.
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
        if (cssObject instanceof CssRule) {
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
