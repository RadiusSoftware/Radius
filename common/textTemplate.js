/*****
 * 
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
 * Simplified approach to creating and using text templates, which are useful
 * for all types of plain and markup text management.  They're also useful for
 * letter or event HTML document templates.  The template uses the standard js
 * template format of ${symbol} embedded within other text.  The template class
 * then modifes the text itself for the appropiate lexical scope and creates an
 * object containing symbol names as key with the substitution text as values.
*****/


/*****
 * Dynamic text containing forumals that relate to dynamic data stores is
 * critial for making this a happy framework.  The DynamicText class analyzes
 * a string and breaks it up into parts that are considered to be expressions
 * within standard javascript template values, ${...}, separate with sections
 * of staic text:  `  ${x.u.z()} + static text`.  Once analyzed and separated,
 * the DynamicText can be useful for generating new content when the data
 * stores have updated their values.
*****/
register('', class TextTemplate {
    constructor(text) {
        this.text = text;
        this.exprs = [];
        this.parts = [];

        for (let match of text.matchAll(/\${.*?}/g)) {
            this.exprs.push(match[0]);
        }

        let next = 0;
        let expr = 0;

        for (; next >= 0 && expr < this.exprs.length ; expr++) {
            let prev = next;
            next = text.indexOf(this.exprs[expr], next);

            if (next >= 0) {
                if (next > prev) {
                    this.parts.push({ dynamic: false, value: text.substring(prev, next) });
                }

                this.parts.push({ dynamic: true, value: this.exprs[expr] });
                next += this.exprs[expr].length;
            }
        }

        if (next < text.length) {
            this.parts.push({ dynamic: false, value: text.substring(next) });
        }
    }

    getExprs() {
        return this.exprs;
    }

    getParts() {
        return this.parts;
    }

    isDynamic() {
        return this.exprs.length > 0;
    }

    [Symbol.iterator]() {
        return this.exprs[Symbol.iterator]();
    }

    toString(scope) {
        let code = [];

        function v2s(value) {
            switch (typeof value) {
                case 'bigint':
                    return value.toString();

                case 'boolean':
                    return value.toString();

                case 'number':
                    return value.toString();

                case 'string':
                    return "`" + value + "`";

                case 'undefined':
                    return 'undefined';
            }

            if (value instanceof Date) {
                return `mkTime('${value.toISOString()}')`;
            }

            if (value === null) {
                return 'null';
            }

            return toJson(value);
        }

        for (let key in scope) {
            let value = v2s(scope[key]);
            code.push(`let ${key} = ${value};`);
        }

        let dynamicValue;
        code.push('dynamicValue = `' + this.text + '`');
        eval(code.join('\n'));
        return dynamicValue;
    }
});
