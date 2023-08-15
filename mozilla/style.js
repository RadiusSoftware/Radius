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

    enabled() {
        return !this.cssGroup.disable;
    }

    href() {
        return this.cssGroup.href;
    }

    language() {
        return this.cssGroup.type();
    }

    media() {
        return this.cssGroup.media;
    }

    ownerNode() {
        return this.cssGroup.ownerNode;
    }

    parentStyleSheet() {
        return mkCssStyleSheet(this.cssGroup.parentStyleSheet);
    }

    rule(index) {
        return mkCssRuleList(this.cssGroup, this.cssGroup.cssRules).item(index);
    }

    rules() {
        return mkCssRuleList(this.cssGroup, this.cssGroup.cssRules);
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

    title() {
        return this.cssGroup.title;
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

    item(index) {
        let cssRule = this.cssRuleList.item(index);
        let ctor = Reflect.getPrototypeOf(cssRule).constructor;
        return CssMakers.get(ctor)(this.cssGroup, cssRule);
    }

    length() {
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

    cssText() {
        return this.cssRule.cssText;
    }

    index() {
        for (let i = 0; i < this.cssGroup.length; i++) {
            if (Object.is(this.cssRule, this.cssGroup.item(i))) {
                return i;
            }
        }
    }

    parent() {
        this.cssRule.parentRule;
    }

    remove() {
        this.cssGroup.deleteRule(this.index());
    }

    ruleList() {
        return this.ruleList;
    }

    styleSheet() {
        return this.ruleList.styleSheet;
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

    parentStyleSheet() {
        return mkCssStyleSheet(this.cssGroup.parentStyleSheet);
    }

    rule(index) {
        return mkCssRuleList(this.cssGroup, this.cssRule.cssRules).item(index);
    }

    rules() {
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

    conditionText() {
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

    type() {
        return 'CssFontFaceRule';
    }
});

register('', class CssImportRule extends CssRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    type() {
        return 'CssImportRule';
    }
});

register('', class CssKeyframeRule extends CssRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    keyText() {
        return this.cssRule.keyText;
    }

    type() {
        return 'CssKeyframeRule';
    }
});

register('', class CssKeyframesRule extends CssRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    rules() {
        return mkCssRuleList(this.cssRule, this.cssRule.cssRules);
    }

    name() {
        return this.cssRule.name;
    }

    type() {
        return 'CssKeyframesRule';
    }
});

register('', class CssMediaRule extends CssConditionRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    media() {
        return this.cssRule.media;
    }

    type() {
        return 'CssMediaRule';
    }
});

register('', class CssNamespaceRule extends CssRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    namespaceURI() {
        return this.cssRule.namespaceURI;
    }

    prefix() {
        return this.cssRule.prefix;
    }

    type() {
        return 'CssNamespaceRule';
    }
});

register('', class CssPageRule extends CssRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    selector() {
        return this.cssRule.selectorText;
    }

    type() {
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

    selector() {
        return this.cssRule.selectorText;
    }

    set(values) {
        this.clear();
        return this.change(values);
    }

    settings(values) {
        return this.cssRule.style;
    }

    type() {
        return 'CssStyleRule';
    }
});

register('', class CssSupportsRule extends CssConditionRule {
    constructor(cssGroup, cssRule) {
        super(cssGroup, cssRule);
    }

    type() {
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
