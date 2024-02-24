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
 * A wrapper object for managing HTTP cookies.  Cookies are not a big part of
 * the Radius framework, but they do have an important role.  This class ensures
 * that cookies are properly created, parsed, and other managed.  Cookies may
 * be created from scratch or from cookie string specifications.  That means a
 * cookie can serialie itself and recreate itself from its serialization.
*****/
register('', class Cookie {
    constructor(...args) {
        this.domain = null;
        this.expires = null;
        this.httpOnly = null;
        this.maxAge = null;
        this.path = null;
        this.sameSite = null;
        this.secure = null;
        
        if (args.length == 0) {
            this.name = 'name';
            this.value = 'value';
        }
        else if (typeof args[0] == 'string') {
            if (args.length == 1) {
                this.parse(args[0]);
            }
            else if (args.length == 2) {
                this.name = args[0];
                this.setValue(args[1]);
            }
            else {
                this.name = 'name';
                this.value = 'value';
            }
        }
        else if (typeof args[0] == 'object') {
            let settings = args[0];

            this.name = settings.name;
            this.setValue(settings.value);

            for (let key in settings) {
                if (key != 'name' && key != 'value') {
                    let setter = `set${key[0].toUpperCase()}${key.substring(1)}`;

                    if (typeof this[setter] == 'function') {
                        this[setter](settings[key]);
                    }
                }
            }
        }
    }

    clearDomain() {
        this.domain = null;
        return this;
    }

    clearExpires() {
        this.expires = null;
        return this;
    }

    clearHttpOnly() {
        this.httpOnly = null;
        return this;
    }

    clearMaxAge() {
        this.maxAge = null;
        return this;
    }

    clearPath() {
        this.path = null;
        return this;
    }

    clearSameSite() {
        this.sameSite = null;
        return this;
    }

    clearSecure() {
        this.secure = null;
        return this;
    }

    delete() {
        this.maxAge = null;
        this.expires = mkTime(0);
        return this;
    }

    getDomain() {
        return this.domain;
    }

    getExpires() {
        return this.expires;
    }

    getHttpOnly() {
        return this.httpOnly;
    }

    getMaxAge() {
        return this.maxAge;
    }

    getName() {
        return this.name;
    }

    getPath() {
        return this.path;
    }

    getSameSite() {
        return this.sameSite;
    }

    getSecure() {
        return this.secure;
    }

    getValue() {
        return this.value;
    }

    parse(spec) {
        let components = spec.split(';');

        for (let i = 0; i < components.length; i++) {
            let [ key, value ] = components[i].split('=');
            key = key.trim();
            value = value != undefined ? value.trim() : value;

            if (i == 0) {
                this.name = key;
                this.value = this.parseValue(value);
            }
            else {
                let setter = `set${key[0].toUpperCase()}${key.substring(1)}`;

                if (typeof this[setter] == 'function') {
                    this[setter](value);
                }
                else {
                    let pascalCase = TextUtils.toPascalCase(key.replaceAll('-', '_'));
                    setter = `set${pascalCase}`;

                    if (typeof this[setter] == 'function') {
                        this[setter](value);
                    }
                }
            }
        }
    }

    parseValue(raw) {
        try {
            if (raw.startsWith('jsx')) {
                if (TextUtils.isHexEncoded(raw.substring(3))) {
                    return fromJson(mkBuffer(raw.substring(3), 'hex').toString());
                }
            }
            else {
                if (TextUtils.isHexEncoded(raw)) {
                    return mkBuffer(raw, 'hex').toString();
                }
            }
        }
        catch (e) {}
        return raw;
    }

    setDomain(domain) {
        if (typeof domain == 'string') {
            this.domain = domain;
        }

        return this;
    }

    setExpires(expires) {
        if (expires instanceof Date) {
            this.expires = expires;
        }
        else if (typeof expires == 'string') {
            this.expires = mkTime(expires);
        }

        return this;
    }

    setHttpOnly() {
        this.httpOnly = true;
        return this;
    }

    setMaxAge(maxAge) {
        if (typeof maxAge == 'number') {
            this.maxAge = maxAge;
        }
        else if (typeof maxAge == 'string') {
            this.maxAge = parseInt(maxAge);
        }

        return this;
    }

    setName(name) {
        this.name = name.toString().trim();
        return this;
    }

    setPath(path) {
        if (typeof path == 'string') {
            this.path = path;
        }

        return this;
    }

    setSameSite(value) {
        switch (value) {
            case 'strict':
            case 'lax':
            case 'none':
                this.sameSite = value;
                break;
        }
        
        return this;
    }

    setSecure() {
        this.secure = true;
        return this;
    }

    setValue(value) {
        if (typeof value == 'object') {
            this.value = value;
        }
        else {
            this.value = value.toString();
        }
        
        return this;
    }

    toString() {
        let parts = [];

        if (typeof this.value == 'object') {
            var hex = `jsx${mkBuffer(toJson(this.value)).toString('hex')}`;
        }
        else {
            var hex = mkBuffer(this.value).toString('hex');
        }

        parts.push(`${this.name}=${hex}`);
        this.domain ? parts.push(`domain="${this.domain}"`) : null;
        this.path ? parts.push(`path=${this.path}`) : null;
        this.httpOnly ? parts.push('HttpOnly') : null;
        this.secure ? parts.push('secure') : null;
        this.sameSite ? parts.push(`samesite=${this.sameSite}`) : null;

        if (this.maxAge) {
            if (this.expires) {
                parts.push(`expires=${this.expires.toString()}`);
            }
            else {
                parts.push(`max-age=${this.maxAge}`);
            }
        }
        else if (this.expires) {
            parts.push(`expires=${this.expires.toString()}`);
        }

        return parts.join('; ');
    }
});