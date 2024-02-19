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
        this.parse(text.toString());
    }

    clearSymbol(symbol) {
        if (symbol in this.symbols) {
            this.symbols[symbol] = '${' + symbol + '}';
        }

        return this;
    }

    clearSymbols() {
        for (let symbol in this.symbols) {
            this.symbols[symbol] = '${' + symbol + '}';
        }

        return this;
    }

    getSymbol(symbol) {
        return this.symbols[symbol];
    }

    listSymbols() {
        return Object.keys(this.symbols);
    }

    parse(text) {
        if (!this.text) {
            this.symbols = {};
            this.runtime = {};

            const pushChar = (char, chars) => {
                if (char == '`') {
                    chars.push('\\\`');
                }
                else {
                    chars.push(char);
                }
            }
    
            let state = 0;
            let chars = [];
            let symbolChars = [];
    
            for (let char of text) {
                if (state == 0) {
                    if (char == '$') {
                        state = 1;
                    }
                    else {
                        pushChar(char, chars);
                    }                
                }
                else if (state == 1) {
                    if (char == '{') {
                        state = 2;
                    }
                    else {
                        state = 0;
                        chars.push('$');
                        pushChar(char, chars);
                    }
                }
                else if (state == 2) {
                    if (char == '}') {
                        let symbolName = symbolChars.join('').trim();
                        symbolChars = new Array();
                        state = 0;
    
                        if (symbolName.match(/^[a-zA-Z][a-zA-Z0-9_]*$/m)) {
                            this.symbols[symbolName] = '${' + symbolName + '}';
                            chars.push('${this.symbols.' + symbolName + '}');
                        }
                        else {
                            chars.push('${' + symbolName + '}');
                        }
                    }
                    else {
                        symbolChars.push(char);
                    }
                }
            }
    
            this.text = chars.join('');
        }
    }

    setSymbol(symbol, value) {
        if (symbol in this.symbols) {
            this.symbols[symbol] = value.toString();
        }

        return this;
    }

    setSymbols(values) {
        if (typeof values == 'object') {
            Object.keys(values).forEach(key => {
                if (key in this.symbols) {
                    this.symbols[key] = values[key].toString();
                }
            });
        }

        return this;
    }

    [Symbol.iterator]() {
        return Object.keys(this.symbols)[Symbol.iterator]();
    }

    toString(values) {
        this.setSymbols(values);

        let text;
        eval('text=`' + this.text + '`');
        return text;
    }
});
