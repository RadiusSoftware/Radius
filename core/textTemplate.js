/*****
 * 
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
 * Simplified approach to creating and using text templates, which are useful
 * for all types of plain and markup text management.  They're also useful for
 * letter or event HTML document templates.  The template uses the standard js
 * template format of ${symbol} embedded within other text.  The template class
 * then modifes the text itself for the appropiate lexical scope and creates an
 * object containing symbol names as key with the substitution text as values.
*****/
register('', class TextTemplate {
    constructor(text) {
        this.symbols = {};

        let state = 0;
        let chars = [];
        let symbol = [];

        for (let char of text) {
            if (state == 0) {
                if (char == '$') {
                    state = 1;
                }
                else {
                    chars.push(char);
                }                
            }
            else if (state == 1) {
                if (char == '{') {
                    state = 2;
                }
                else {
                    state = 0;
                    chars.push('$');
                    chars.push(char);
                }
            }
            else if (state == 2) {
                if (char == '}') {
                    let joined = symbol.join('');
                    symbol = new Array();
                    state = 0;

                    if (joined.match(/^[a-zA-Z][a-zA-Z0-9_]*$/m)) {
                        this.symbols[joined] = `\${${joined}}`;
                        chars.push(`\${this.symbols.${joined}}`);
                    }
                }
                else {
                    symbol.push(char);
                }
            }
        }

        this.text = chars.join('').trim();
    }

    clear(symbol) {
        if (typeof symbol == 'undefined') {
            this.symbols = {};
        }
        else if (symbol in this.symbols) {
            this.symbols[symbol] = '${' + symbol + '}';
        }

        return this;
    }

    get(symbol) {
        if (typeof symbol == 'undefined') {
            return Data.clone(this.symbols);
        }
        else {
            return this.symbols[symbol];
        }
    }

    set(symbol, value) {
        if (typeof symbol == 'object') {
            Object.keys(symbol).forEach(key => {
                if (key in this.symbols) {
                    this.symbols[key] = symbol[key].toString();
                }
            });
        }
        else if (typeof symbol == 'string' && symbol in this.symbols) {
            this.symbols[symbol] = value.toString();
        }

        return this;
    }

    toString() {
        let text;
        eval('text=`' + this.text + '`');
        return text;
    }
});