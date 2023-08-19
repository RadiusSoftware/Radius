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


(() => {
/*****
     * A dynamic wrapper for a single DOM stylesheet object.  Like all other wrappers,
     * when a value is returned, such as a rules list, the return value is also a
     * wrapper object.  Our mission here is to allow application developers to cleanly
     * analyze and modify stylesheets from within application code.
    *****/
    register('',class CssStyleSheet {
        constructor(cssStyleSheet) {
            this.cssGroup = cssStyleSheet;
        }

        createRule(cssText, index) {
            let ruleList = mkCssRuleList(this.cssGroup, this.cssGroup.cssRules);
            let ruleIndex = this.cssGroup.insertRule(cssText, index ? index : ruleList.length());
            let cssRule = this.cssGroup.cssRules.item(ruleIndex);
            let ctor = Reflect.getPrototypeOf(cssRule).constructor;
            return CssMakers.get(ctor)(this.cssGroup, cssRule);
        }

        getHref() {
            return this.cssGroup.href;
        }

        getLanguage() {
            return this.cssGroup.type();
        }

        getMedia() {
            return this.cssGroup.media;
        }

        getOwnerNode() {
            return this.cssGroup.ownerNode;
        }

        getParentStyleSheet() {
            return mkCssStyleSheet(this.cssGroup.parentStyleSheet);
        }

        getRule(index) {
            return mkCssRuleList(this.cssGroup, this.cssGroup.cssRules).item(index);
        }

        getRules() {
            return mkCssRuleList(this.cssGroup, this.cssGroup.cssRules);
        }

        getTitle() {
            return this.cssGroup.title;
        }

        isEnabled() {
            return !this.cssGroup.disable;
        }

        search(selector) {
            for (let styleRule of this) {
                if (styleRule.type() == 'CssStyleRule') {
                    if (styleRule.selector() == selector) {
                        return styleRule;
                    }
                }
            }
        }

        [Symbol.iterator]() {
            return mkCssRuleList(this.cssGroup, this.cssGroup.cssRules)[Symbol.iterator]();
        }
    });


    /*****
     * A rule list contains a list of style rules of various types.  Some rules are
     * singular while other rules may be groupiing rules that contain their own rule
     * list in a recursive fashion.  Note that we also have the means here to 
    *****/
    register('', class CssRuleList {
        constructor(cssGroup, cssRuleList) {
            this.cssGroup = cssGroup;
            this.cssRuleList = cssRuleList;
        }

        getItem(index) {
            let cssRule = this.cssRuleList.item(index);
            let ctor = Reflect.getPrototypeOf(cssRule).constructor;
            return CssMakers.get(ctor)(this.cssGroup, cssRule);
        }

        getLength() {
            return this.cssRuleList.length;
        }

        [Symbol.iterator]() {
            let rulesArray = [];

            for (let cssRule of this.cssRuleList) {
                let ctor = Reflect.getPrototypeOf(cssRule).constructor;
                let rule = CssMakers.get(ctor)(this, cssRule);
                rulesArray.push(rule);
            }

            return rulesArray[Symbol.iterator]();
        }
    });


    /*****
     * The fundamental interface is the base class for all of the CSS rule classes,
     * and provides common features that are applicable to all of derived or CSS
     * style subclasses.  
    *****/
    register('', class CssRule {
        constructor(cssGroup, cssRule) {
            this.cssGroup = cssGroup;
            this.cssRule = cssRule;
        }

        getCssText() {
            return this.cssRule.cssText;
        }

        getIndex() {
            for (let i = 0; i < this.cssGroup.length; i++) {
                if (Object.is(this.cssRule, this.cssGroup.item(i))) {
                    return i;
                }
            }
        }

        getParent() {
            this.cssRule.parentRule;
        }

        getRuleList() {
            return this.ruleList;
        }

        getStyleSheet() {
            return this.ruleList.styleSheet;
        }

        remove() {
            this.cssGroup.deleteRule(this.index());
        }
    });


    /*****
     * A grouping rule is a CSS rule that behaves in a manner similar to the style
     * sheet itself.  It has its own rules list and has been made to be iterable to
     * make scanning and searching rules simple then it would be otherwise.  Rules
     * may also be accessed by index but the catch with that is you need to know the
     * index, which requires a sweep through the group's rules to ascertain what that
     * index is.
    *****/
    register('', class CssGroupingRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        createRule(cssText, index) {
            let ruleList = mkCssRuleList(this.cssGroup, this.cssGroup.cssRules);
            let ruleIndex = this.cssGroup.insertRule(cssText, index);
            let cssRule = this.cssGroup.cssRules.item(ruleIndex);
            let ctor = Reflect.getPrototypeOf(cssRule).constructor;
            return CssMakers.get(ctor)(this.cssGroup, cssRule);
        }

        getParentStyleSheet() {
            return mkCssStyleSheet(this.cssGroup.parentStyleSheet);
        }

        getRule(index) {
            return mkCssRuleList(this.cssGroup, this.cssRule.cssRules).item(index);
        }

        getRules() {
            return mkCssRuleList(this.cssGroup, this.cssRule.cssRules);
        }

        [Symbol.iterator]() {
            return mkCssRuleList(this.cssGroup, this.cssRule.cssRules)[Symbol.iterator]();
        }
    });


    /*****
     * A condition rule is one that uses specific rules to determine whether rules
     * contained within the condition rule should be active.  Notice that condition
     * rule extends grouping rule.  There are no rule classes that are a condition
     * rule without being a grouping rule.
    *****/
    register('', class CssConditionRule extends CssGroupingRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getConditionText() {
            return this.cssRule.conditionText;
        }
    });


    /*****
     * These are the specific CSS rules instances that are created by the browser.
     * They have one of either two differing base rules, either CssRule or the
     * more interestng CssConditionRule.  Rules derived from CssConditionRule are
     * also CssGroupingRules and consequently are CSS rule containers.
    *****/
    register('', class CssFontFaceRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getType() {
            return 'CssFontFaceRule';
        }
    });

    register('', class CssImportRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getType() {
            return 'CssImportRule';
        }
    });

    register('', class CssKeyframeRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getKeyText() {
            return this.cssRule.keyText;
        }

        gettType() {
            return 'CssKeyframeRule';
        }
    });

    register('', class CssKeyframesRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getRules() {
            return mkCssRuleList(this.cssRule, this.cssRule.cssRules);
        }

        getName() {
            return this.cssRule.name;
        }

        getType() {
            return 'CssKeyframesRule';
        }
    });

    register('', class CssMediaRule extends CssConditionRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getMedia() {
            return this.cssRule.media;
        }

        getType() {
            return 'CssMediaRule';
        }
    });

    register('', class CssNamespaceRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getNamespaceURI() {
            return this.cssRule.namespaceURI;
        }

        getPrefix() {
            return this.cssRule.prefix;
        }

        getType() {
            return 'CssNamespaceRule';
        }
    });

    register('', class CssPageRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getSelector() {
            return this.cssRule.selectorText;
        }

        getType() {
            return 'CssPageRule';
        }
    });

    register('', class CssStyleRule extends CssRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        change(values) {
            for (let entry of Object.entries(values)) {
                let [ name, value ] = entry;
                this.cssRule.style[name] = value;
            }

            return this;
        }

        clear() {
            while (this.cssRule.style.length) {
                let property = this.cssRule.style.item(0);
                this.cssRule.style.removeProperty(property);
            }

            return this;
        }

        getSelector() {
            return this.cssRule.selectorText;
        }

        getSettings(values) {
            return this.cssRule.style;
        }

        getType() {
            return 'CssStyleRule';
        }

        set(values) {
            this.clear();
            return this.change(values);
        }
    });

    register('', class CssSupportsRule extends CssConditionRule {
        constructor(cssGroup, cssRule) {
            super(cssGroup, cssRule);
        }

        getType() {
            return 'CssSupportsRule';
        }
    });


    /*****
     * This weak map is used for finding maker function, e.g., mkMediaRul(), based on
     * a given DOM CSS class type.  This is the complete enumeration of all CSS rule
     * types supported by the DOM specification and by this software.
    *****/
    const CssMakers = new WeakMap();
    CssMakers.set(CSSFontFaceRule, mkCssFontFaceRule);
    CssMakers.set(CSSImportRule, mkCssImportRule);
    CssMakers.set(CSSKeyframeRule, mkCssKeyframeRule);
    CssMakers.set(CSSKeyframesRule, mkCssKeyframesRule);
    CssMakers.set(CSSMediaRule, mkCssMediaRule);
    CssMakers.set(CSSNamespaceRule, mkCssNamespaceRule);
    CssMakers.set(CSSPageRule, mkCssPageRule);
    CssMakers.set(CSSStyleRule, mkCssStyleRule);
    CssMakers.set(CSSSupportsRule, mkCssSupportsRule);
})();
