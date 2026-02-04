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
 * An active library of MIME types.  This registered class provides a libary for
 * forward and reverse mapping of MIME type data between file extension and mime
 * code names.  The code name is something like text/html.  Some of them, like
 * .xlsx for instance, have disguistingly long MIME type codes.
*****/
define(class Mime {
    static byMimeCode = {};
    static byExtension = {};
  
    static _ = (() => {
        [
            { code: 'audio/aac',                                                                             type: 'binary', extensions: {aac:0} },
            { code: 'application/x-abiword',                                                                 type: 'binary', extensions: {abw:0} },
            { code: 'application/x-freearc',                                                                 type: 'binary', extensions: {arc:0} },
            { code: 'video/x-msvideo',                                                                       type: 'binary', extensions: {avi:0} },
            { code: 'application/vnd.amazon.ebook',                                                          type: 'binary', extensions: {azw:0} },
            { code: 'application/octet-stream',                                                              type: 'binary', extensions: {bin:0} },
            { code: 'image/bmp',                                                                             type: 'binary', extensions: {bmp:0} },
            { code: 'application/x-bzip',                                                                    type: 'binary', extensions: {bz:0} },
            { code: 'application/x-bzip2',                                                                   type: 'binary', extensions: {bz2:0} },
            { code: 'audio/x-cdf',                                                                           type: 'binary', extensions: {cda:0} },
            { code: 'application/x-csh',                                                                     type: 'string', extensions: {csh:0} },
            { code: 'text/css',                                                                              type: 'string', extensions: {css:0} },
            { code: 'text/csv',                                                                              type: 'string', extensions: {csv:0} },
            { code: 'application/msword',                                                                    type: 'binary', extensions: {doc:0} },
            { code: 'application/application/vnd.openxmlformats-officedocument.wordprocessingml.document',   type: 'binary', extensions: {docx:0} },
            { code: 'application/vnd.ms-fontobject',                                                         type: 'binary', extensions: {eot:0} },
            { code: 'application/epub+zip',                                                                  type: 'binary', extensions: {epub:0} },
            { code: 'application/gzip',                                                                      type: 'binary', extensions: {gz:0} },
            { code: 'image/gif',                                                                             type: 'binary', extensions: {gif:0} },
            { code: 'text/html',                                                                             type: 'string', extensions: {htm:0, html:0} },
            { code: 'image/vnd.microsoft.icon',                                                              type: 'binary', extensions: {ico:0} },
            { code: 'text/calendar',                                                                         type: 'string', extensions: {ics:0} },
            { code: 'application/java-archive',                                                              type: 'binary', extensions: {jar:0} },
            { code: 'image/jpeg',                                                                            type: 'binary', extensions: {jpg:0, jpeg:0} },
            { code: 'text/javascript',                                                                       type: 'string', extensions: {js:0} },
            { code: 'application/json',                                                                      type: 'string', extensions: {json:0} },
            { code: 'application/jso',                                                                       type: 'string', extensions: {jso:0} },
            { code: 'application/ld+json',                                                                   type: 'string', extensions: {jsonld:0} },
            { code: 'audio/midi',                                                                            type: 'binary', extensions: {mid:0, midi:0} },
            { code: 'text/javascript',                                                                       type: 'string', extensions: {mjs:0} },
            { code: 'audio/mpeg',                                                                            type: 'binary', extensions: {mp3:0} },
            { code: 'video/mp4',                                                                             type: 'binary', extensions: {mp4:0} },
            { code: 'video/mpeg',                                                                            type: 'binary', extensions: {mpeg:0} },
            { code: 'application/vnd.apple.installer+xml',                                                   type: 'binary', extensions: {mpkg:0} },
            { code: 'application/vnd.oasis.opendocument.presentation',                                       type: 'binary', extensions: {odp:0} },
            { code: 'application/vnd.oasis.opendocument.spreadsheet',                                        type: 'binary', extensions: {ods:0} },
            { code: 'application/vnd.oasis.opendocument.text',                                               type: 'binary', extensions: {odt:0} },
            { code: 'audio/ogg',                                                                             type: 'binary', extensions: {oga:0} },
            { code: 'video/ogg',                                                                             type: 'binary', extensions: {ogv:0} },
            { code: 'application/ogg',                                                                       type: 'binary', extensions: {ogx:0} },
            { code: 'audio/opus',                                                                            type: 'binary', extensions: {opus:0} },
            { code: 'font/ots',                                                                              type: 'binary', extensions: {otf:0} },
            { code: 'application/pdf',                                                                       type: 'binary', extensions: {pdf:0} },
            { code: 'image/png',                                                                             type: 'binary', extensions: {png:0} },
            { code: 'application/x-httpd-php',                                                               type: 'string', extensions: {php:0} },
            { code: 'application/vnd.ms-powerpoint',                                                         type: 'binary', extensions: {ppt:0} },
            { code: 'application/application/vnd.openxmlformats-officedocument.presentationml.presentation', type: 'binary', extensions: {pptx:0} },
            { code: 'application/vnd.rar',                                                                   type: 'binary', extensions: {rar:0} },
            { code: 'application/rtf',                                                                       type: 'binary', extensions: {rtf:0} },
            { code: 'application/x-sh',                                                                      type: 'string', extensions: {sh:0} },
            { code: 'image/svg+xml',                                                                         type: 'string', extensions: {svg:0} },
            { code: 'application/x-shockwave-flash',                                                         type: 'binary', extensions: {swf:0} },
            { code: 'application/x-tar',                                                                     type: 'binary', extensions: {tar:0} },
            { code: 'image/tiff',                                                                            type: 'binary', extensions: {tff:0, tiff:0} },
            { code: 'video/mp2t',                                                                            type: 'binary', extensions: {ts:0} },
            { code: 'font/ttf',                                                                              type: 'binary', extensions: {ttf:0} },
            { code: 'text/plain',                                                                            type: 'string', extensions: {txt:0} },
            { code: 'application/vnd.visio',                                                                 type: 'binary', extensions: {vsd:0} },
            { code: 'audio/wave',                                                                            type: 'binary', extensions: {wav:0} },
            { code: 'audio/webm',                                                                            type: 'binary', extensions: {weba:0} },
            { code: 'video/webm',                                                                            type: 'binary', extensions: {webm:0} },
            { code: 'image/webp',                                                                            type: 'binary', extensions: {webp:0} },
            { code: 'font/woff',                                                                             type: 'binary', extensions: {woff:0} },
            { code: 'font/woff2',                                                                            type: 'binary', extensions: {woff2:0} },
            { code: 'application/xhtml+xml',                                                                 type: 'string', extensions: {xhtml:0} },
            { code: 'application/vnd.ms-excel',                                                              type: 'binary', extensions: {xls:0} },
            { code: 'application/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         type: 'binary', extensions: {xlsx:0} },
            { code: 'application/xml',                                                                       type: 'string', extensions: {xml:0} },
            { code: 'application/vnd.mozilla.xul+xml',                                                       type: 'string', extensions: {xul:0} },
            { code: 'application/zip',                                                                       type: 'binary', extensions: {zip:0} },
            { code: 'video/3gpp',                                                                            type: 'binary', extensions: {'3gp':0} },
            { code: 'video/3gpp2',                                                                           type: 'binary', extensions: {'3g2':0} },
            { code: 'application/x-7z-compressed',                                                           type: 'binary', extensions: {'7z':0} },
            { code: 'multipart/form-data',                                                                   type: 'string', extensions: {} },
            { code: 'application/x-www-form-urlencoded',                                                     type: 'string', extensions: {} },
        ].forEach(mimeType => {
            Mime.byMimeCode[mimeType.code] = mimeType;
            
            Object.keys(mimeType.extensions).forEach(ext => {
                Mime.byExtension[ext] = mimeType;
                Mime.byExtension[`.${ext}`] = mimeType;
            });
        });
    })();

    constructor(text) {
        Object.assign(this, Mime.getMimeType(text));
    }

    getCode() {
        return this.code;
    }

    getExtensions() {
        return Object.keys(this.extensions);
    }

    static getMimeType(text) {
        let lower = text.toLowerCase();
        let match = lower.match(/^([a-z0-9/.+-_]+);/);
        lower = match ? match[1] : lower;

        if (lower in Mime.byMimeCode) {
            return Mime.byMimeCode[lower];
        }

        if (lower in Mime.byExtension) {
            return Mime.byExtension[lower];
        }

        if (lower.startsWith('.') && lower.substr(1) in Mime.byExtension) {
            return Mime.byExtension[lower.substr(1)];
        }

        return Mime.byMimeCode['application/octet-stream'];
    }

    getPrimaryExtension() {
        return Object.keys(this.extensions)[0];
    }

    getType() {
        return this.type;
    }

    is(mimeCode) {
        return mimeCode.trim().toLowerCase() == this.code;
    }

    static isSupported(code) {
        if (code.indexOf('.' == 0)) {
            return code in Mime.byExtension;
        }
        else {
            return code in Mime.byMimeCode;
        }
    }

    isBinary() {
        return this.type == 'binary';
    }

    isString() {
        return this.type == 'string';
    }
});
