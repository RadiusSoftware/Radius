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


singleton(class RdsText {
    /*****
     * This extends the disinfectString() utility method to recursively ensure
     * that all strings within an object tree are properly disinfected.  See the
     * disinfectString() for additional information regarding the string clean
     * approach.
    *****/
    disinfect(arg) {
        if (typeof arg == 'string') {
            return this.disinfectString(arg);
        }
        else if (ObjectType.verify(arg)) {
            let stack = [ arg ];

            while (stack.length) {
                let obj = stack.pop();

                for (let key in obj) {
                    let value = obj[key];

                    if (typeof value == 'string') {
                        obj[key] = this.disinfectString(value);
                    }
                    else if (ObjectType.verify(value)) {
                        stack.push(value);
                    }
                }
            }
        }
        else {
            return arg;
        }
    }

    /*****
     * There are times when we need to scrub incoming text, provided by a form
     * or some such thing, to not only trim it but to also remove controller or
     * other such characters.  Note that a webform should never be evaled() or
     * some other seriosuly dangerous operation.
    *****/
    disinfectString(str) {
        let clean = [];
        let trimmed = str.trim();

        for (let i = 0; i < trimmed.length; i++) {
            if (trimmed.charCodeAt(i) > 31) {
                clean.push(trimmed[i]);
            }
        }

        return clean.join('');
    }

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
     * In a dotted or other delimited sequece, return the last element of that
     * sequence it it exists.  If it doesn't exist, return an empty string.
    *****/
    getLastLink(chain, delimiter) {
        delimiter = typeof delimiter == 'string' ? delimiter : '.';
        let links = this.split(chain, delimiter);

        if (links.length > 0) {
            return links[links.length - 1];
        }
        else {
            return '';
        }
    }

    /*****
     * Provides a neat utility to check whether a value is a proper hex-encoded
     * string.  Hex encoded strings are useful to use in some cases because they
     * have no special symbols or other cap to interfer with web and URL values.
     * Note that the big drawback for hex encoding is their length;
    *****/
    isHexEncoded(str) {
        if (typeof str == 'string') {
            if (str.length > 0) {
                if (str.length % 2 == 0) {
                    for (let char of str) {
                        if (!((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f'))) {
                            return false;
                        }
                    }

                    return true;
                }
            }
        }

        return false;
    }
    
    /*****
     * Takes a single character and builds a string that's as long as the specified
     * count parameter.  It's not padding, it's just a repeating sequence of the
     * same char that's returned as a string.
    *****/
    pad(count, char) {
        typeof char == 'string' ? null : char = ' ';
        let chars = [];
    
        for (let i = 0; i < count; i++) {
            chars.push(char);
        }
    
        return chars.join('');
    }

    /*****
     * This utility attempts to provide an accurate fixed-width numberic value based
     * on the provided width parameter.  If the number is wider thant width, a value
     * of all asterisks will be returned.  Other wise, the number is returned and
     * will be zero-padded as necessary to hit the width specified in the call.
    *****/
    padNumber(n, width) {
        if (typeof n == 'number' || typeof n == 'bigint') {
            let text = n.toString();
            let len = text.length;
    
            if (len == width) {
                return text;
            }
            else if (len > width) {
                return this.pad(width, '*');
            }
            else {
                return [
                    this.pad(width - len, '0'),
                    text,
                ].join('');
            }
        }
    
        return '';
    }

    /*****
     * Utility to parse what I call attribute-encoded strings: key1: value; key2: value.
     * This has a lot of utility on the browser side when processing and is useful in
     * multiple application and infrastructure areas.
    *****/
    parseAttributeEncoded(str) {
        let values = {};

        try {
            for (let pair of str.trim().split(';')) {
                if (pair.trim()) {
                    let [ key, string ] = pair.split(':');
                    values[key.trim()] = string.trim();
                }
            }            
        }
        catch (e) {}
        return values;
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
     * In certain instances, the String.split() function is unsatisfying because it
     * will leave one or more empty strings in the returned array.  This function
     * avoids this messy detail by removing all empty, '', elements from the array
     * before returning it to the caller.
    *****/
    split(str, delimiter) {
        let segments = str.split(delimiter);

        for (let i = segments.length - 1; i >= 0; i--) {
            if (segments[i] == '') {
                segments.splice(i, 1);
            }
        }

        return segments;
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
     * Strips out all whitespace from the provided string, which includes spaces,
     * tabs, line feeds, and new line characters.  The result value is otherwise
     * identical tothe original provided string.
    *****/
    strip(string) {
        let stripped = [];

        for (let char of string) {
            switch (char) {
                case ' ':
                case '\t':
                case '\r':
                case '\n':
                    continue;

                default:
                    stripped.push(char);
                    break;
            }
        }

        return stripped.join('');
    }
    
    /*****
     * In general, it's useful to be able to convert characters between camelCase,
     * PascalCase, and snake_case.  These functions are toCamelCase(), toSnakeCase(),
     * and toPascalCase().  These functions do NOT detect the naming style for the
     * passed argument.  It's up to the caller to know.
    *****/
    toCamelCase(snakeCase) {
        let first = true;
        
        return this.splitSnakeCase(snakeCase).map(word => {
            if (first) {
                first = false;
                return word;
            }
            else {
                return `${word[0].toUpperCase()}${word.substring(1)}`;
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
        return this.splitSnakeCase(snakeCase).map(word => {
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
        
        return this.splitCamelCase(camelCase).map(word => {
            if (first) {
                first = false;
                return word;
            }
            else {
                return `_${word}`;
            }
        }).join('');
    }
    
    /*****
     * A useful albeit slow function that makes multiple attempts to interpret
     * a string as a non-string value.  This utility was originally writtten to
     * facilitate the interpretation of text-based or programming-based values.
     * If a non-string value is matched, then a non-string value is returned.
    *****/
    stringToValue(string) {
        let text = string.trim();

        switch (text) {
            case 'null':
                return null;

            case 'undefined':
                return undefined;

            case 'true':
                return true;

            case 'false':
                return false;
        }

        if (parseInt(text).toString() == text) {
            return parseInt(text);
        }

        try {
            if (BigInt(text).toString() == text) {
                return BigInt(text);
            }
        }
        catch (e) {}

        try {
            if (text.match(/^[0-9]+n$/)) {
                return BigInt(text.substring(0, text.length-1));
            }
        }
        catch (e) {}

        try {
            let obj  = fromJson(string);
        }
        catch (e) {}

        try {
            let obj;
            eval('obj = ' + text);
        }
        catch (e) {}
    
        return text;
    }
    
    /*****
    *****/
    urlDecodeBase64() {
        // TODO ******************************************************************************
    }
    
    /*****
    *****/
    urlEncodeBase64() {
        // TODO ******************************************************************************
    }
});