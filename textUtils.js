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


singleton('', class TextUtils {
    /*****
     * A very simple implementation of the percent-encoding algorithm used for URI
     * values in the query portion of the URI.  To generate the value, iterate
     * through the characters from the source string and move them to the dest
     * directly or firset convert characters based on the dictionary of characters
     * that need to be percent encoded.
    *****/
    encodePercentEncoded(str) {
        let encoded = [];
    
        const map = {
            ':': '%3A',
            '/': '%2F',
            '?': '%3F',
            '#': '%23',
            '[': '%5B',
            ']': '%5D',
            '@': '%40',
            '!': '%21',
            '$': '%24',
            '&': '%26',
            "'": '%27',
            '(': '%28',
            ')': '%29',
            '*': '%2A',
            '+': '%2B',
            ',': '%2C',
            ';': '%3B',
            '=': '%3D',
            '%': '%25',
            ' ': '%20',
        };
    
        for (let i = 0; i < str.length; i++) {
            let char = str[i];
    
            if (char in map) {
                encoded.push(map[char]);
            }
            else {
                encoded.push(char);
            }
        }
    
        return encoded.join('');
    }

    /*****
     * This utility attempts to provide an accurate fixed-width numberic value based
     * on the provided width parameter.  If the number is wider thant width, a value
     * of all asterisks will be returned.  Other wise, the number is returned and
     * will be zero-padded as necessary to hit the width specified in the call.
    *****/
    fillNumber(n, width) {
        if (typeof n == 'number' || typeof n == 'bigint') {
            let text = n.toString();
            let len = text.length;
    
            if (len == width) {
                return text;
            }
            else if (len > width) {
                return fillWithChar(width, '*');
            }
            else {
                return [
                    fillWithChar(width - len, '0'),
                    text,
                ].join('');
            }
        }
    
        return '';
    }
    
    /*****
     * Takes a single character and builds a string that's as long as the specified
     * count parameter.  It's not padding, it's just a repeating sequence of the
     * same char that's resturned as a string.
    *****/
    fillWithChar(count, char) {
        char = char === undefined ? '' : char;
        let chars = [];
    
        for (let i = 0; i < count; i++) {
            chars.push(char);
        }
    
        return chars.join('');
    }

    /*****
     * What a hellacious function to code.  It just takes internet-based blobs of
     * text that are formatted using the mime code multipart/form-data and generates
     * an array of objects that represent that parse form of the entire blob.  Note
     * that each blob has a content-disposition, possibly a content-type, and always
     * some content, which could be empty content.
    *****/
    parseMultipartFormData(text, boundary) {
        let formData = {};
    
        for (let part of text.split(`--${boundary}`)) {
            let data = new Object();
    
            for (let line of part.trim().split('\r\n')) {
                if (line.match(/content-disposition/i)) {
                    let properties = line.split(':')[1].split(';');
                    let dispoName = properties[0].trim();
    
                    if (dispoName == 'form-data') {
                        for (let i = 1; i < properties.length; i++) {
                            if (properties[i].indexOf('=') > 0) {
                                let [ name, value ] = properties[i].split('=').map(item => item.trim().replaceAll('"', ''));
                                data[name] = value;
                            }
                        }
                    }
                }
                else if (line.match(/^content-type/i)) {
                    let properties = line.split(':')[1].split(';');
                    let contentType = properties[0].trim();
                    data.mime = contentType;
    
                    for (let i = 1; i < properties.length; i++) {
                        if (properties[i].indexOf('=') > 0) {
                            let [ name, value ] = properties[i].split('=').map(item => item.trim());
                            data[name] = value;
                        }
                    }
                }
                else if (line == '') {
                    break;
                }
            }
    
            if (data.name) {
                let index = part.indexOf('\r\n\r\n');
                data.content = part.substr(index + 4).trim();
                formData[data.name] = data;
            }
        }
    
        return formData;
    }

    /*****
     * In general, it's useful to be able to convert characters between camelCase,
     * PascalCase, and snake_case.  In our world, PascalCase is just a special case
     * of camelCase.  This function takes a programming word and splits it apart
     * into segments based on the rules of camelCase.  Splitting stops when a non-
     * valid character or end-of-line is encountered.  Note that an underscore is
     * considered to be valid.
    *****/
    splitCamelCase(str) {
        let word = [];
        let split = [];
      
        for (let i = 0; i < str.length; i++) {
            let char = str[i];
      
            if (char.match(/[A-Z]/)) {
                if (word.length) {
                    split.push(word.join(''));
                    word = [char.toLowerCase()];
                }
                else {
                    word.push(char.toLowerCase());
                }
            }
            else if (char.match(/[a-z0-9_]/)) {
                word.push(char);
            }
            else {
                break;
            }
        }
      
        if (word.length) {
            split.push(word.join(''));
        }
      
        return split;
    }
    
    /*****
     * In general, it's useful to be able to convert characters between camelCase,
     * PascalCase, and snake_case.  In our world, PascalCase is just a special case
     * of camelCase.  This function takes a programming word and splits it apart
     * into segments based on the rules of snake_case.  Splitting stops when a non-
     * valid character or end-of-line is encountered.
    *****/
    splitSnakeCase(str) {
        let word = [];
        let split = [];
      
        for (let i = 0; i < str.length; i++) {
            let char = str[i];
      
            if (char == '_') {
                if (word.length) {
                    split.push(word.join(''));
                    word = [];
                }
            }
            else if (char.match(/[A-Za-z0-9_]/)) {
                word.push(char.toLowerCase());
            }
        }
      
        if (word.length) {
            split.push(word.join(''));
        }
      
        return split;
    }
    
    /*****
     * In general, it's useful to be able to convert characters between camelCase,
     * PascalCase, and snake_case.  These functions are toCamelCase(), toSnakeCase(),
     * and toPascalCase().  These functions do NOT detect the naming style for the
     * passed argument.  It's up to the caller to know.
    *****/
    toCamelCase(snakeCase) {
        let first = true;
        
        return splitSnakeCase(snakeCase).map(word => {
            if (first) {
                first = false;
                return word;
            }
            else {
                return `${word[0].toUpperCase()}${word.substr(1)}`;
            }
        }).join('');
    }
    
    /*****
     * In general, it's useful to be able to convert characters between camelCase,
     * PascalCase, and snake_case.  These functions are toCamelCase(), toSnakeCase(),
     * and toPascalCase().  These functions do NOT detect the naming style for the
     * passed argument.  It's up to the caller to know.
    *****/
    toPascalCase(snakeCase) {
        return splitSnakeCase(snakeCase).map(word => {
            return `${word[0].toUpperCase()}${word.substr(1)}`;
        }).join('');
    }
    
    /*****
     * In general, it's useful to be able to convert characters between camelCase,
     * PascalCase, and snake_case.  These functions are toCamelCase(), toSnakeCase(),
     * and toPascalCase().  These functions do NOT detect the naming style for the
     * passed argument.  It's up to the caller to know.
    *****/
    toSnakeCase(camelCase) {
        let first = true;
        
        return splitCamelCase(camelCase).map(word => {
            if (first) {
                first = false;
                return word;
            }
            else {
                return `_${word}`;
            }
        }).join('');
    }

    urlDecode() {
        // TODO
    }

    urlDecodeBase64() {
        // TODO
    }

    urlEncode() {
        // TODO
    }

    urlEncodeBase64() {
        // TODO
    }
});