var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
/// <reference path="../localtypings/mscc" />
var pxt;
(function (pxt) {
})(pxt || (pxt = {}));
(function (pxt) {
    var analytics;
    (function (analytics) {
        var defaultProps = {};
        var defaultMeasures = {};
        var enabled = false;
        function addDefaultProperties(props) {
            Object.keys(props).forEach(function (k) {
                if (typeof props[k] == "string") {
                    defaultProps[k] = props[k];
                }
                else {
                    defaultMeasures[k] = props[k];
                }
            });
        }
        analytics.addDefaultProperties = addDefaultProperties;
        function enable() {
            if (!pxt.aiTrackException || !pxt.aiTrackEvent || enabled)
                return;
            enabled = true;
            pxt.debug('setting up app insights');
            var te = pxt.tickEvent;
            pxt.tickEvent = function (id, data, opts) {
                if (te)
                    te(id, data, opts);
                if (opts && opts.interactiveConsent && typeof mscc !== "undefined" && !mscc.hasConsent()) {
                    mscc.setConsent();
                }
                if (!data)
                    pxt.aiTrackEvent(id);
                else {
                    var props_1 = defaultProps || {};
                    var measures_1 = defaultMeasures || {};
                    Object.keys(data).forEach(function (k) {
                        if (typeof data[k] == "string")
                            props_1[k] = data[k];
                        else if (typeof data[k] == "number")
                            measures_1[k] = data[k];
                        else
                            props_1[k] = JSON.stringify(data[k] || '');
                    });
                    pxt.aiTrackEvent(id, props_1, measures_1);
                }
            };
            var rexp = pxt.reportException;
            pxt.reportException = function (err, data) {
                if (rexp)
                    rexp(err, data);
                var props = {
                    target: pxt.appTarget.id,
                    version: pxt.appTarget.versions.target
                };
                if (data)
                    pxt.Util.jsonMergeFrom(props, data);
                pxt.aiTrackException(err, 'exception', props);
            };
            var re = pxt.reportError;
            pxt.reportError = function (cat, msg, data) {
                if (re)
                    re(cat, msg, data);
                try {
                    throw msg;
                }
                catch (err) {
                    var props = {
                        target: pxt.appTarget.id,
                        version: pxt.appTarget.versions.target,
                        category: cat,
                        message: msg
                    };
                    if (data)
                        pxt.Util.jsonMergeFrom(props, data);
                    pxt.aiTrackException(err, 'error', props);
                }
            };
        }
        analytics.enable = enable;
        function isCookieBannerVisible() {
            return typeof mscc !== "undefined" && !mscc.hasConsent();
        }
        analytics.isCookieBannerVisible = isCookieBannerVisible;
        function enableCookies() {
            if (isCookieBannerVisible()) {
                mscc.setConsent();
            }
        }
        analytics.enableCookies = enableCookies;
    })(analytics = pxt.analytics || (pxt.analytics = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var AudioContextManager;
    (function (AudioContextManager) {
        var _frequency = 0;
        var _context; // AudioContext
        var _vco; // OscillatorNode;
        var _gain;
        var _mute = false; //mute audio
        function context() {
            if (!_context)
                _context = freshContext();
            return _context;
        }
        function freshContext() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (window.AudioContext) {
                try {
                    // this call my crash.
                    // SyntaxError: audio resources unavailable for AudioContext construction
                    return new window.AudioContext();
                }
                catch (e) { }
            }
            return undefined;
        }
        function mute(mute) {
            if (!_context)
                return;
            _mute = mute;
            stop();
            if (mute && _vco) {
                _vco.disconnect();
                _gain.disconnect();
                _vco = undefined;
                _gain = undefined;
            }
        }
        AudioContextManager.mute = mute;
        function stop() {
            if (!_context)
                return;
            _gain.gain.setTargetAtTime(0, _context.currentTime, 0.015);
            _frequency = 0;
        }
        AudioContextManager.stop = stop;
        function frequency() {
            return _frequency;
        }
        AudioContextManager.frequency = frequency;
        function tone(frequency) {
            if (_mute)
                return;
            if (frequency <= 0)
                return;
            _frequency = frequency;
            var ctx = context();
            if (!ctx)
                return;
            try {
                if (!_vco) {
                    _vco = ctx.createOscillator();
                    _vco.type = 'triangle';
                    _gain = ctx.createGain();
                    _gain.connect(ctx.destination);
                    _vco.connect(_gain);
                    _vco.start(0);
                }
                _vco.frequency.value = frequency;
                _gain.gain.setTargetAtTime(1, _context.currentTime, 0.015);
            }
            catch (e) {
                _vco = undefined;
                return;
            }
        }
        AudioContextManager.tone = tone;
    })(AudioContextManager = pxt.AudioContextManager || (pxt.AudioContextManager = {}));
})(pxt || (pxt = {}));
// Needs to be in its own file to avoid a circular dependency: util.ts -> main.ts -> util.ts
var pxt;
(function (pxt) {
    /**
     * Track an event.
     */
    pxt.tickEvent = function (id) { };
})(pxt || (pxt = {}));
/// <reference path="./tickEvent.ts" />
/// <reference path="./apptarget.ts" />
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.__dummy = 42;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxtc = ts.pxtc;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var Util;
        (function (Util) {
            function assert(cond, msg) {
                if (msg === void 0) { msg = "Assertion failed"; }
                if (!cond) {
                    debugger;
                    throw new Error(msg);
                }
            }
            Util.assert = assert;
            function flatClone(obj) {
                if (obj == null)
                    return null;
                var r = {};
                Object.keys(obj).forEach(function (k) { r[k] = obj[k]; });
                return r;
            }
            Util.flatClone = flatClone;
            function clone(v) {
                if (v == null)
                    return null;
                return JSON.parse(JSON.stringify(v));
            }
            Util.clone = clone;
            function htmlEscape(_input) {
                if (!_input)
                    return _input; // null, undefined, empty string test
                return _input.replace(/([^\w .!?\-$])/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; });
            }
            Util.htmlEscape = htmlEscape;
            function jsStringQuote(s) {
                return s.replace(/[^\w .!?\-$]/g, function (c) {
                    var h = c.charCodeAt(0).toString(16);
                    return "\\u" + "0000".substr(0, 4 - h.length) + h;
                });
            }
            Util.jsStringQuote = jsStringQuote;
            function jsStringLiteral(s) {
                return "\"" + jsStringQuote(s) + "\"";
            }
            Util.jsStringLiteral = jsStringLiteral;
            // Localization functions. Please port any modifications over to pxtsim/localization.ts
            var _localizeLang = "en";
            var _localizeStrings = {};
            var _translationsCache = {};
            //let _didSetlocalizations = false;
            //let _didReportLocalizationsNotSet = false;
            Util.localizeLive = false;
            /**
             * Returns the current user language, prepended by "live-" if in live mode
             */
            function localeInfo() {
                return "" + (Util.localizeLive ? "live-" : "") + userLanguage();
            }
            Util.localeInfo = localeInfo;
            /**
             * Returns current user language iSO-code. Default is `en`.
             */
            function userLanguage() {
                return _localizeLang;
            }
            Util.userLanguage = userLanguage;
            function normalizeLanguageCode(code) {
                var langParts = /^(\w{2})-(\w{2}$)/i.exec(code);
                if (langParts && langParts[1] && langParts[2]) {
                    return [langParts[1].toLowerCase() + "-" + langParts[2].toUpperCase(), langParts[1].toLowerCase()];
                }
                else {
                    return [(code || "en").toLowerCase()];
                }
            }
            Util.normalizeLanguageCode = normalizeLanguageCode;
            function setUserLanguage(localizeLang) {
                _localizeLang = normalizeLanguageCode(localizeLang)[0];
            }
            Util.setUserLanguage = setUserLanguage;
            function isUserLanguageRtl() {
                return /^ar|dv|fa|ha|he|ks|ku|ps|ur|yi/i.test(_localizeLang);
            }
            Util.isUserLanguageRtl = isUserLanguageRtl;
            function _localize(s) {
                // Needs to be test in localhost / CLI
                /*if (!_didSetlocalizations && !_didReportLocalizationsNotSet) {
                    _didReportLocalizationsNotSet = true;
                    pxt.tickEvent("locale.localizationsnotset");
                    // pxt.reportError can't be used here because of order of file imports
                    // Just use console.error instead, and use an Error so stacktrace is reported
                    console.error(new Error("Attempted to translate a string before localizations were set"));
                }*/
                return _localizeStrings[s] || s;
            }
            Util._localize = _localize;
            function getLocalizedStrings() {
                return _localizeStrings;
            }
            Util.getLocalizedStrings = getLocalizedStrings;
            function setLocalizedStrings(strs) {
                //_didSetlocalizations = true;
                _localizeStrings = strs;
            }
            Util.setLocalizedStrings = setLocalizedStrings;
            function translationsCache() {
                return _translationsCache;
            }
            Util.translationsCache = translationsCache;
            function fmt_va(f, args) {
                if (args.length == 0)
                    return f;
                return f.replace(/\{([0-9]+)(\:[^\}]+)?\}/g, function (s, n, spec) {
                    var v = args[parseInt(n)];
                    var r = "";
                    var fmtMatch = /^:f(\d*)\.(\d+)/.exec(spec);
                    if (fmtMatch) {
                        var precision = parseInt(fmtMatch[2]);
                        var len = parseInt(fmtMatch[1]) || 0;
                        var fillChar = /^0/.test(fmtMatch[1]) ? "0" : " ";
                        var num = v.toFixed(precision);
                        if (len > 0 && precision > 0)
                            len += precision + 1;
                        if (len > 0) {
                            while (num.length < len) {
                                num = fillChar + num;
                            }
                        }
                        r = num;
                    }
                    else if (spec == ":x") {
                        r = "0x" + v.toString(16);
                    }
                    else if (v === undefined)
                        r = "(undef)";
                    else if (v === null)
                        r = "(null)";
                    else if (v.toString)
                        r = v.toString();
                    else
                        r = v + "";
                    if (spec == ":a") {
                        if (/^\s*[euioah]/.test(r.toLowerCase()))
                            r = "an " + r;
                        else if (/^\s*[bcdfgjklmnpqrstvwxz]/.test(r.toLowerCase()))
                            r = "a " + r;
                    }
                    else if (spec == ":s") {
                        if (v == 1)
                            r = "";
                        else
                            r = "s";
                    }
                    else if (spec == ":q") {
                        r = Util.htmlEscape(r);
                    }
                    else if (spec == ":jq") {
                        r = Util.jsStringQuote(r);
                    }
                    else if (spec == ":uri") {
                        r = encodeURIComponent(r).replace(/'/g, "%27").replace(/"/g, "%22");
                    }
                    else if (spec == ":url") {
                        r = encodeURI(r).replace(/'/g, "%27").replace(/"/g, "%22");
                    }
                    else if (spec == ":%") {
                        r = (v * 100).toFixed(1).toString() + '%';
                    }
                    return r;
                });
            }
            Util.fmt_va = fmt_va;
            function fmt(f) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return fmt_va(f, args);
            }
            Util.fmt = fmt;
            var locStats = {};
            function dumpLocStats() {
                var r = {};
                Object.keys(locStats).sort(function (a, b) { return locStats[b] - locStats[a]; })
                    .forEach(function (k) { return r[k] = k; });
                console.log('prioritized list of strings:');
                console.log(JSON.stringify(r, null, 2));
            }
            Util.dumpLocStats = dumpLocStats;
            var sForPlural = true;
            function lf_va(format, args) {
                if (!format)
                    return format;
                locStats[format] = (locStats[format] || 0) + 1;
                var lfmt = Util._localize(format);
                if (!sForPlural && lfmt != format && /\d:s\}/.test(lfmt)) {
                    lfmt = lfmt.replace(/\{\d+:s\}/g, "");
                }
                lfmt = lfmt.replace(/\{(id|loc):[^\}]+\}/g, '');
                return fmt_va(lfmt, args);
            }
            Util.lf_va = lf_va;
            function lf(format) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return lf_va(format, args);
            }
            Util.lf = lf;
            /**
             * Similar to lf but the string do not get extracted into the loc file.
             */
            function rlf(format) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return lf_va(format, args);
            }
            Util.rlf = rlf;
            function lookup(m, key) {
                if (m.hasOwnProperty(key))
                    return m[key];
                return null;
            }
            Util.lookup = lookup;
            function isoTime(time) {
                var d = new Date(time * 1000);
                return Util.fmt("{0}-{1:f02.0}-{2:f02.0} {3:f02.0}:{4:f02.0}:{5:f02.0}", d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
            }
            Util.isoTime = isoTime;
            function userError(msg) {
                var e = new Error(msg);
                e.isUserError = true;
                throw e;
            }
            Util.userError = userError;
            function isPyLangPref() {
                return localStorage.getItem("editorlangpref") == "py";
            }
            Util.isPyLangPref = isPyLangPref;
            function getEditorLanguagePref() {
                return localStorage.getItem("editorlangpref");
            }
            Util.getEditorLanguagePref = getEditorLanguagePref;
            function setEditorLanguagePref(lang) {
                localStorage.setItem("editorlangpref", lang);
            }
            Util.setEditorLanguagePref = setEditorLanguagePref;
            // small deep equals for primitives, objects, arrays. returns error message
            function deq(a, b) {
                if (a === b)
                    return null;
                if (!a || !b)
                    return "Null value";
                if (typeof a == 'object' && typeof b == 'object') {
                    if (Array.isArray(a)) {
                        if (!Array.isArray(b)) {
                            return "Expected array";
                        }
                        if (a.length != b.length) {
                            return "Expected array of length " + a.length + ", got " + b.length;
                        }
                        for (var i = 0; i < a.length; i++) {
                            if (deq(a[i], b[i]) != null) {
                                return "Expected array value " + a[i] + " got " + b[i];
                            }
                        }
                        return null;
                    }
                    var ak = Object.keys(a);
                    var bk = Object.keys(a);
                    if (ak.length != bk.length) {
                        return "Expected " + ak.length + " keys, got " + bk.length;
                    }
                    for (var i = 0; i < ak.length; i++) {
                        if (!Object.prototype.hasOwnProperty.call(b, ak[i])) {
                            return "Missing key " + ak[i];
                        }
                        else if (deq(a[ak[i]], b[ak[i]]) != null) {
                            return "Expected value of " + ak[i] + " to be " + a[ak[i]] + ", got " + b[ak[i]];
                        }
                    }
                    return null;
                }
                return "Unable to compare " + a + ", " + b;
            }
            Util.deq = deq;
        })(Util = pxtc.Util || (pxtc.Util = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var lf = ts.pxtc.Util.lf;
/// <reference path="tickEvent.ts" />
/// <reference path="apptarget.ts"/>
/// <reference path="commonutil.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        /**
         * atob replacement
         * @param s
         */
        pxtc.decodeBase64 = function (s) { return atob(s); };
        /**
         * bota replacement
         * @param s
         */
        pxtc.encodeBase64 = function (s) { return btoa(s); };
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var Util;
        (function (Util) {
            var CancellationToken = /** @class */ (function () {
                function CancellationToken() {
                    this.pending = false;
                    this.cancelled = false;
                }
                CancellationToken.prototype.startOperation = function () {
                    this.pending = true;
                };
                CancellationToken.prototype.isRunning = function () {
                    return this.pending;
                };
                CancellationToken.prototype.onProgress = function (progressHandler) {
                    this.progressHandler = progressHandler;
                };
                CancellationToken.prototype.reportProgress = function (completed, total) {
                    if (this.progressHandler) {
                        this.progressHandler(completed, total);
                    }
                };
                CancellationToken.prototype.cancel = function () {
                    this.cancelled = true;
                    this.pending = false;
                };
                CancellationToken.prototype.cancelAsync = function () {
                    var _this = this;
                    if (this.cancelled || !this.pending) {
                        this.cancelled = true;
                        this.pending = false;
                        return Promise.resolve();
                    }
                    this.cancelled = true;
                    this.deferred = new Promise(function (resolve) {
                        _this.resolve = resolve;
                    });
                    return this.deferred;
                };
                CancellationToken.prototype.isCancelled = function () {
                    return this.cancelled;
                };
                CancellationToken.prototype.throwIfCancelled = function () {
                    if (this.isCancelled())
                        throw new Error();
                };
                CancellationToken.prototype.resolveCancel = function () {
                    this.pending = false;
                    if (this.deferred) {
                        this.resolve();
                        this.deferred = undefined;
                        this.resolve = undefined;
                    }
                };
                return CancellationToken;
            }());
            Util.CancellationToken = CancellationToken;
            function codalHash16(s) {
                // same hashing as https://github.com/lancaster-university/codal-core/blob/c1fe7a4c619683a50d47cb0c19d15b8ff3bd16a1/source/drivers/PearsonHash.cpp#L26
                var hashTable = [
                    251, 175, 119, 215, 81, 14, 79, 191, 103, 49, 181, 143, 186, 157, 0,
                    232, 31, 32, 55, 60, 152, 58, 17, 237, 174, 70, 160, 144, 220, 90, 57,
                    223, 59, 3, 18, 140, 111, 166, 203, 196, 134, 243, 124, 95, 222, 179,
                    197, 65, 180, 48, 36, 15, 107, 46, 233, 130, 165, 30, 123, 161, 209, 23,
                    97, 16, 40, 91, 219, 61, 100, 10, 210, 109, 250, 127, 22, 138, 29, 108,
                    244, 67, 207, 9, 178, 204, 74, 98, 126, 249, 167, 116, 34, 77, 193,
                    200, 121, 5, 20, 113, 71, 35, 128, 13, 182, 94, 25, 226, 227, 199, 75,
                    27, 41, 245, 230, 224, 43, 225, 177, 26, 155, 150, 212, 142, 218, 115,
                    241, 73, 88, 105, 39, 114, 62, 255, 192, 201, 145, 214, 168, 158, 221,
                    148, 154, 122, 12, 84, 82, 163, 44, 139, 228, 236, 205, 242, 217, 11,
                    187, 146, 159, 64, 86, 239, 195, 42, 106, 198, 118, 112, 184, 172, 87,
                    2, 173, 117, 176, 229, 247, 253, 137, 185, 99, 164, 102, 147, 45, 66,
                    231, 52, 141, 211, 194, 206, 246, 238, 56, 110, 78, 248, 63, 240, 189,
                    93, 92, 51, 53, 183, 19, 171, 72, 50, 33, 104, 101, 69, 8, 252, 83, 120,
                    76, 135, 85, 54, 202, 125, 188, 213, 96, 235, 136, 208, 162, 129, 190,
                    132, 156, 38, 47, 1, 7, 254, 24, 4, 216, 131, 89, 21, 28, 133, 37, 153,
                    149, 80, 170, 68, 6, 169, 234, 151
                ];
                // REF: https://en.wikipedia.org/wiki/Pearson_hashing
                function eightBitHash(s) {
                    var hash = 0;
                    for (var i = 0; i < s.length; i++) {
                        var c = s[i];
                        hash = hashTable[hash ^ c];
                    }
                    return hash;
                }
                function hashN(s, byteCount) {
                    // this hash is used by enum.isHash. So any modification should be considered a breaking change.
                    var hash;
                    var buffer = new Uint8Array(s.length); // TODO unicode
                    for (var i = 0; i < s.length; ++i) {
                        var c = s.charCodeAt(i);
                        buffer[i] = c & 0xff;
                    }
                    var res = 0;
                    for (var i = 0; i < byteCount; ++i) {
                        hash = eightBitHash(buffer);
                        res |= hash << (8 * i);
                        buffer[0] = (buffer[0] + 1) % 255;
                    }
                    return res;
                }
                if (!s)
                    return 0;
                return hashN(s, 2);
            }
            Util.codalHash16 = codalHash16;
            function bufferSerial(buffers, data, source, maxBufLen) {
                if (data === void 0) { data = ""; }
                if (source === void 0) { source = "?"; }
                if (maxBufLen === void 0) { maxBufLen = 255; }
                for (var i = 0; i < data.length; ++i) {
                    var char = data[i];
                    buffers[source] = (buffers[source] || "") + char;
                    if (char === "\n" || buffers[source].length > maxBufLen) {
                        var buffer = buffers[source];
                        buffers[source] = "";
                        window.postMessage({
                            type: "serial",
                            id: source,
                            data: buffer
                        }, "*");
                    }
                }
            }
            Util.bufferSerial = bufferSerial;
            function blobReadAsDataURL(blob) {
                if (!blob)
                    return Promise.resolve(undefined);
                return new Promise(function (resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function () { return resolve(reader.result); };
                    reader.onerror = function (e) { return reject(e); };
                    reader.readAsDataURL(blob);
                });
            }
            Util.blobReadAsDataURL = blobReadAsDataURL;
            function fileReadAsBufferAsync(f) {
                if (!f)
                    return Promise.resolve(null);
                else {
                    return new Promise(function (resolve, reject) {
                        var reader = new FileReader();
                        reader.onerror = function (ev) { return resolve(null); };
                        reader.onload = function (ev) { return resolve(new Uint8Array(reader.result)); };
                        reader.readAsArrayBuffer(f);
                    });
                }
            }
            Util.fileReadAsBufferAsync = fileReadAsBufferAsync;
            function fileReadAsTextAsync(f) {
                if (!f)
                    return Promise.resolve(null);
                else {
                    return new Promise(function (resolve, reject) {
                        var reader = new FileReader();
                        reader.onerror = function (ev) { return resolve(null); };
                        reader.onload = function (ev) { return resolve(reader.result); };
                        reader.readAsText(f);
                    });
                }
            }
            Util.fileReadAsTextAsync = fileReadAsTextAsync;
            function repeatMap(n, fn) {
                n = n || 0;
                var r = [];
                for (var i = 0; i < n; ++i)
                    r.push(fn(i));
                return r;
            }
            Util.repeatMap = repeatMap;
            function listsEqual(a, b) {
                if (!a || !b || a.length !== b.length) {
                    return false;
                }
                for (var i = 0; i < a.length; i++) {
                    if (a[i] !== b[i]) {
                        return false;
                    }
                }
                return true;
            }
            Util.listsEqual = listsEqual;
            function oops(msg) {
                if (msg === void 0) { msg = "OOPS"; }
                debugger;
                throw new Error(msg);
            }
            Util.oops = oops;
            function reversed(arr) {
                arr = arr.slice(0);
                arr.reverse();
                return arr;
            }
            Util.reversed = reversed;
            function iterMap(m, f) {
                Object.keys(m).forEach(function (k) { return f(k, m[k]); });
            }
            Util.iterMap = iterMap;
            function mapMap(m, f) {
                var r = {};
                Object.keys(m).forEach(function (k) { return r[k] = f(k, m[k]); });
                return r;
            }
            Util.mapMap = mapMap;
            function mapStringMapAsync(m, f) {
                var r = {};
                return Promise.all(Object.keys(m).map(function (k) { return f(k, m[k]).then(function (v) { return r[k] = v; }); }))
                    .then(function () { return r; });
            }
            Util.mapStringMapAsync = mapStringMapAsync;
            function values(m) {
                return Object.keys(m || {}).map(function (k) { return m[k]; });
            }
            Util.values = values;
            function pushRange(trg, src) {
                for (var i = 0; i < src.length; ++i)
                    trg.push(src[i]);
            }
            Util.pushRange = pushRange;
            // TS gets lost in type inference when this is passed an array
            function concatArrayLike(arrays) {
                return concat(arrays);
            }
            Util.concatArrayLike = concatArrayLike;
            function concat(arrays) {
                var r = [];
                for (var i = 0; i < arrays.length; ++i) {
                    pushRange(r, arrays[i]);
                }
                return r;
            }
            Util.concat = concat;
            function isKV(v) {
                return !!v && typeof v === "object" && !Array.isArray(v);
            }
            function memcpy(trg, trgOff, src, srcOff, len) {
                if (srcOff === void 0)
                    srcOff = 0;
                if (len === void 0)
                    len = src.length - srcOff;
                for (var i = 0; i < len; ++i)
                    trg[trgOff + i] = src[srcOff + i];
            }
            Util.memcpy = memcpy;
            function uint8ArrayConcat(chunks) {
                var numbytes = 0;
                for (var _i = 0, chunks_1 = chunks; _i < chunks_1.length; _i++) {
                    var c = chunks_1[_i];
                    numbytes += c.length;
                }
                var r = new Uint8Array(numbytes);
                var ptr = 0;
                for (var _a = 0, chunks_2 = chunks; _a < chunks_2.length; _a++) {
                    var c = chunks_2[_a];
                    memcpy(r, ptr, c);
                    ptr += c.length;
                }
                return r;
            }
            Util.uint8ArrayConcat = uint8ArrayConcat;
            function jsonTryParse(s) {
                try {
                    return JSON.parse(s);
                }
                catch (e) {
                    return undefined;
                }
            }
            Util.jsonTryParse = jsonTryParse;
            function jsonMergeFrom(trg, src) {
                if (!src)
                    return;
                Object.keys(src).forEach(function (k) {
                    if (isKV(trg[k]) && isKV(src[k]))
                        jsonMergeFrom(trg[k], src[k]);
                    else
                        trg[k] = Util.clone(src[k]);
                });
            }
            Util.jsonMergeFrom = jsonMergeFrom;
            function jsonCopyFrom(trg, src) {
                var v = Util.clone(src);
                for (var _i = 0, _a = Object.keys(src); _i < _a.length; _i++) {
                    var k = _a[_i];
                    trg[k] = v[k];
                }
            }
            Util.jsonCopyFrom = jsonCopyFrom;
            // { a: { b: 1 }, c: 2} => { "a.b": 1, c: 2 }
            function jsonFlatten(v) {
                var res = {};
                var loop = function (pref, v) {
                    if (v !== null && typeof v == "object") {
                        Util.assert(!Array.isArray(v));
                        if (pref)
                            pref += ".";
                        for (var _i = 0, _a = Object.keys(v); _i < _a.length; _i++) {
                            var k = _a[_i];
                            loop(pref + k, v[k]);
                        }
                    }
                    else {
                        res[pref] = v;
                    }
                };
                loop("", v);
                return res;
            }
            Util.jsonFlatten = jsonFlatten;
            function jsonUnFlatten(v) {
                var res = {};
                for (var _i = 0, _a = Object.keys(v); _i < _a.length; _i++) {
                    var k = _a[_i];
                    var ptr = res;
                    var parts = k.split(".");
                    for (var i = 0; i < parts.length; ++i) {
                        var part = parts[i];
                        if (i == parts.length - 1)
                            ptr[part] = v[k];
                        else {
                            if (typeof ptr[part] != "object")
                                ptr[part] = {};
                            ptr = ptr[part];
                        }
                    }
                }
                return res;
            }
            Util.jsonUnFlatten = jsonUnFlatten;
            function strcmp(a, b) {
                if (a == b)
                    return 0;
                if (a < b)
                    return -1;
                else
                    return 1;
            }
            Util.strcmp = strcmp;
            function stringMapEq(a, b) {
                var ak = Object.keys(a);
                var bk = Object.keys(b);
                if (ak.length != bk.length)
                    return false;
                for (var _i = 0, ak_1 = ak; _i < ak_1.length; _i++) {
                    var k = ak_1[_i];
                    if (!b.hasOwnProperty(k))
                        return false;
                    if (a[k] !== b[k])
                        return false;
                }
                return true;
            }
            Util.stringMapEq = stringMapEq;
            function endsWith(str, suffix) {
                if (str.length < suffix.length)
                    return false;
                if (suffix.length == 0)
                    return true;
                return str.slice(-suffix.length) == suffix;
            }
            Util.endsWith = endsWith;
            function startsWith(str, prefix) {
                if (str.length < prefix.length)
                    return false;
                if (prefix.length == 0)
                    return true;
                return str.slice(0, prefix.length) == prefix;
            }
            Util.startsWith = startsWith;
            function contains(str, contains) {
                if (str.length < contains.length)
                    return false;
                if (contains.length == 0)
                    return true;
                return str.indexOf(contains) > -1;
            }
            Util.contains = contains;
            function replaceAll(str, old, new_) {
                if (!old)
                    return str;
                return str.split(old).join(new_);
            }
            Util.replaceAll = replaceAll;
            function sortObjectFields(o) {
                var keys = Object.keys(o);
                keys.sort(strcmp);
                var r = {};
                keys.forEach(function (k) { return r[k] = o[k]; });
                return r;
            }
            Util.sortObjectFields = sortObjectFields;
            function chopArray(arr, chunkSize) {
                var res = [];
                for (var i = 0; i < arr.length; i += chunkSize)
                    res.push(arr.slice(i, i + chunkSize));
                return res;
            }
            Util.chopArray = chopArray;
            function unique(arr, f) {
                var v = [];
                var r = {};
                arr.forEach(function (e) {
                    var k = f(e);
                    if (!r.hasOwnProperty(k)) {
                        r[k] = null;
                        v.push(e);
                    }
                });
                return v;
            }
            Util.unique = unique;
            function groupBy(arr, f) {
                var r = {};
                arr.forEach(function (e) {
                    var k = f(e);
                    if (!r.hasOwnProperty(k))
                        r[k] = [];
                    r[k].push(e);
                });
                return r;
            }
            Util.groupBy = groupBy;
            function toDictionary(arr, f) {
                var r = {};
                arr.forEach(function (e) { r[f(e)] = e; });
                return r;
            }
            Util.toDictionary = toDictionary;
            function toSet(arr, f) {
                var r = {};
                arr.forEach(function (e) { r[f(e)] = true; });
                return r;
            }
            Util.toSet = toSet;
            function toArray(a) {
                if (Array.isArray(a)) {
                    return a;
                }
                var r = [];
                if (!a)
                    return r;
                for (var i = 0; i < a.length; ++i)
                    r.push(a[i]);
                return r;
            }
            Util.toArray = toArray;
            function indexOfMatching(arr, f) {
                for (var i = 0; i < arr.length; ++i)
                    if (f(arr[i]))
                        return i;
                return -1;
            }
            Util.indexOfMatching = indexOfMatching;
            function nextTick(f) {
                Promise._async._schedule(f);
            }
            Util.nextTick = nextTick;
            function memoizeString(createNew) {
                return memoize(function (s) { return s; }, createNew);
            }
            Util.memoizeString = memoizeString;
            function memoize(getId, createNew) {
                var cache = {};
                return function (v) {
                    var id = getId(v);
                    if (cache.hasOwnProperty(id))
                        return cache[id];
                    return (cache[id] = createNew(v));
                };
            }
            Util.memoize = memoize;
            // Returns a function, that, as long as it continues to be invoked, will not
            // be triggered. The function will be called after it stops being called for
            // N milliseconds. If `immediate` is passed, trigger the function on the
            // leading edge, instead of the trailing.
            function debounce(func, wait, immediate) {
                var timeout;
                return function () {
                    var context = this;
                    var args = arguments;
                    var later = function () {
                        timeout = null;
                        if (!immediate)
                            func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow)
                        func.apply(context, args);
                    return timeout;
                };
            }
            Util.debounce = debounce;
            // Returns a function, that, as long as it continues to be invoked, will only
            // trigger every N milliseconds. If `immediate` is passed, trigger the
            // function on the leading edge, instead of the trailing.
            function throttle(func, wait, immediate) {
                var timeout;
                return function () {
                    var context = this;
                    var args = arguments;
                    var later = function () {
                        timeout = null;
                        if (!immediate)
                            func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    if (!timeout)
                        timeout = setTimeout(later, wait);
                    if (callNow)
                        func.apply(context, args);
                };
            }
            Util.throttle = throttle;
            function randomPermute(arr) {
                for (var i = 0; i < arr.length; ++i) {
                    var j = randomUint32() % arr.length;
                    var tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
            Util.randomPermute = randomPermute;
            function randomPick(arr) {
                if (arr.length == 0)
                    return null;
                return arr[randomUint32() % arr.length];
            }
            Util.randomPick = randomPick;
            function timeSince(time) {
                var now = Date.now();
                time *= 1000;
                var diff = (now - time) / 1000;
                if (isNaN(diff))
                    return "";
                if (diff < -30) {
                    diff = -diff;
                    if (diff < 60)
                        return Util.lf("in a few seconds");
                    if (diff < 2 * 60)
                        return Util.lf("in a minute");
                    if (diff < 60 * 60)
                        return Util.lf("in {0} minute{0:s}", Math.floor(diff / 60));
                    if (diff < 2 * 60 * 60)
                        return Util.lf("in an hour");
                    if (diff < 60 * 60 * 24)
                        return Util.lf("in {0} hour{0:s}", Math.floor(diff / 60 / 60));
                    if (diff < 60 * 60 * 24 * 30)
                        return Util.lf("in {0} day{0:s}", Math.floor(diff / 60 / 60 / 24));
                    if (diff < 60 * 60 * 24 * 365)
                        return Util.lf("in {0} month{0:s}", Math.floor(diff / 60 / 60 / 24 / 30));
                    return Util.lf("in {0} year{0:s}", Math.floor(diff / 60 / 60 / 24 / 365));
                }
                else {
                    if (diff < 0)
                        return Util.lf("now");
                    if (diff < 10)
                        return Util.lf("a few seconds ago");
                    if (diff < 60)
                        return Util.lf("{0} second{0:s} ago", Math.floor(diff));
                    if (diff < 2 * 60)
                        return Util.lf("a minute ago");
                    if (diff < 60 * 60)
                        return Util.lf("{0} minute{0:s} ago", Math.floor(diff / 60));
                    if (diff < 2 * 60 * 60)
                        return Util.lf("an hour ago");
                    if (diff < 60 * 60 * 24)
                        return Util.lf("{0} hour{0:s} ago", Math.floor(diff / 60 / 60));
                    if (diff < 60 * 60 * 24 * 30)
                        return Util.lf("{0} day{0:s} ago", Math.floor(diff / 60 / 60 / 24));
                    if (diff < 60 * 60 * 24 * 365)
                        return Util.lf("{0} month{0:s} ago", Math.floor(diff / 60 / 60 / 24 / 30));
                    return Util.lf("{0} year{0:s} ago", Math.floor(diff / 60 / 60 / 24 / 365));
                }
            }
            Util.timeSince = timeSince;
            function unicodeToChar(text) {
                var r = /\\u([\d\w]{4})/gi;
                return text.replace(r, function (match, grp) {
                    return String.fromCharCode(parseInt(grp, 16));
                });
            }
            Util.unicodeToChar = unicodeToChar;
            function escapeForRegex(str) {
                return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            }
            Util.escapeForRegex = escapeForRegex;
            function stripUrlProtocol(str) {
                return str.replace(/.*?:\/\//g, "");
            }
            Util.stripUrlProtocol = stripUrlProtocol;
            function normalizePath(path) {
                if (path) {
                    path = path.replace(/\\/g, "/");
                }
                return path;
            }
            Util.normalizePath = normalizePath;
            function pathJoin(a, b) {
                normalizePath(a);
                normalizePath(b);
                if (!a && !b)
                    return undefined;
                else if (!a)
                    return b;
                else if (!b)
                    return a;
                if (a.charAt(a.length - 1) !== "/") {
                    a += "/";
                }
                if (b.charAt(0) == "/") {
                    b = b.substring(1);
                }
                return a + b;
            }
            Util.pathJoin = pathJoin;
            // Reliable NodeJS detection is not possible, but the following check should be accurate enough for our needs
            Util.isNodeJS = typeof window === "undefined";
            function requestAsync(options) {
                return Util.httpRequestCoreAsync(options)
                    .then(function (resp) {
                    if ((resp.statusCode != 200 && resp.statusCode != 304) && !options.allowHttpErrors) {
                        var msg = Util.lf("Bad HTTP status code: {0} at {1}; message: {2}", resp.statusCode, options.url, (resp.text || "").slice(0, 500));
                        var err = new Error(msg);
                        err.statusCode = resp.statusCode;
                        return Promise.reject(err);
                    }
                    if (resp.text && /application\/json/.test(resp.headers["content-type"]))
                        resp.json = JSON.parse(resp.text);
                    return resp;
                });
            }
            Util.requestAsync = requestAsync;
            function httpGetTextAsync(url) {
                return requestAsync({ url: url }).then(function (resp) { return resp.text; });
            }
            Util.httpGetTextAsync = httpGetTextAsync;
            function httpGetJsonAsync(url) {
                return requestAsync({ url: url }).then(function (resp) { return resp.json; });
            }
            Util.httpGetJsonAsync = httpGetJsonAsync;
            function httpPostJsonAsync(url, data) {
                return requestAsync({ url: url, data: data || {} }).then(function (resp) { return resp.json; });
            }
            Util.httpPostJsonAsync = httpPostJsonAsync;
            // this will take lower 8 bits from each character
            function stringToUint8Array(input) {
                var len = input.length;
                var res = new Uint8Array(len);
                for (var i = 0; i < len; ++i)
                    res[i] = input.charCodeAt(i) & 0xff;
                return res;
            }
            Util.stringToUint8Array = stringToUint8Array;
            function uint8ArrayToString(input) {
                var len = input.length;
                var res = "";
                for (var i = 0; i < len; ++i)
                    res += String.fromCharCode(input[i]);
                return res;
            }
            Util.uint8ArrayToString = uint8ArrayToString;
            function fromUTF8(binstr) {
                if (!binstr)
                    return "";
                // escape function is deprecated
                var escaped = "";
                for (var i = 0; i < binstr.length; ++i) {
                    var k = binstr.charCodeAt(i) & 0xff;
                    if (k == 37 || k > 0x7f) {
                        escaped += "%" + k.toString(16);
                    }
                    else {
                        escaped += binstr.charAt(i);
                    }
                }
                // decodeURIComponent does the actual UTF8 decoding
                return decodeURIComponent(escaped);
            }
            Util.fromUTF8 = fromUTF8;
            function toUTF8(str, cesu8) {
                var res = "";
                if (!str)
                    return res;
                for (var i = 0; i < str.length; ++i) {
                    var code = str.charCodeAt(i);
                    if (code <= 0x7f)
                        res += str.charAt(i);
                    else if (code <= 0x7ff) {
                        res += String.fromCharCode(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
                    }
                    else {
                        if (!cesu8 && 0xd800 <= code && code <= 0xdbff) {
                            var next = str.charCodeAt(++i);
                            if (!isNaN(next))
                                code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                        }
                        if (code <= 0xffff)
                            res += String.fromCharCode(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                        else
                            res += String.fromCharCode(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                    }
                }
                return res;
            }
            Util.toUTF8 = toUTF8;
            function toHex(bytes) {
                var r = "";
                for (var i = 0; i < bytes.length; ++i)
                    r += ("0" + bytes[i].toString(16)).slice(-2);
                return r;
            }
            Util.toHex = toHex;
            function fromHex(hex) {
                var r = new Uint8Array(hex.length >> 1);
                for (var i = 0; i < hex.length; i += 2)
                    r[i >> 1] = parseInt(hex.slice(i, i + 2), 16);
                return r;
            }
            Util.fromHex = fromHex;
            var PromiseQueue = /** @class */ (function () {
                function PromiseQueue() {
                    this.promises = {};
                }
                PromiseQueue.prototype.enqueue = function (id, f) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var arr = _this.promises[id];
                        if (!arr) {
                            arr = _this.promises[id] = [];
                        }
                        arr.push(function () {
                            return f()
                                .finally(function () {
                                arr.shift();
                                if (arr.length == 0)
                                    delete _this.promises[id];
                                else
                                    arr[0]();
                            })
                                .then(resolve, reject);
                        });
                        if (arr.length == 1)
                            arr[0]();
                    });
                };
                return PromiseQueue;
            }());
            Util.PromiseQueue = PromiseQueue;
            var PromiseBuffer = /** @class */ (function () {
                function PromiseBuffer() {
                    this.waiting = [];
                    this.available = [];
                }
                PromiseBuffer.prototype.drain = function () {
                    for (var _i = 0, _a = this.waiting; _i < _a.length; _i++) {
                        var f = _a[_i];
                        f(new Error("Promise Buffer Reset"));
                    }
                    this.waiting = [];
                    this.available = [];
                };
                PromiseBuffer.prototype.pushError = function (v) {
                    this.push(v);
                };
                PromiseBuffer.prototype.push = function (v) {
                    var f = this.waiting.shift();
                    if (f)
                        f(v);
                    else
                        this.available.push(v);
                };
                PromiseBuffer.prototype.shiftAsync = function (timeout) {
                    var _this = this;
                    if (timeout === void 0) { timeout = 0; }
                    if (this.available.length > 0) {
                        var v = this.available.shift();
                        if (v instanceof Error)
                            return Promise.reject(v);
                        else
                            return Promise.resolve(v);
                    }
                    else
                        return new Promise(function (resolve, reject) {
                            var f = function (v) {
                                if (v instanceof Error)
                                    reject(v);
                                else
                                    resolve(v);
                            };
                            _this.waiting.push(f);
                            if (timeout > 0) {
                                Promise.delay(timeout)
                                    .then(function () {
                                    var idx = _this.waiting.indexOf(f);
                                    if (idx >= 0) {
                                        _this.waiting.splice(idx, 1);
                                        reject(new Error("Timeout"));
                                    }
                                });
                            }
                        });
                };
                return PromiseBuffer;
            }());
            Util.PromiseBuffer = PromiseBuffer;
            function now() {
                return Date.now();
            }
            Util.now = now;
            function nowSeconds() {
                return Math.round(now() / 1000);
            }
            Util.nowSeconds = nowSeconds;
            // node.js overrides this to use process.cpuUsage()
            Util.cpuUs = function () {
                // current time in microseconds
                var perf = typeof performance != "undefined" ?
                    performance.now.bind(performance) ||
                        performance.moznow.bind(performance) ||
                        performance.msNow.bind(performance) ||
                        performance.webkitNow.bind(performance) ||
                        performance.oNow.bind(performance) :
                    Date.now;
                Util.cpuUs = function () { return perf() * 1000; };
                return Util.cpuUs();
            };
            function getMime(filename) {
                var m = /\.([a-zA-Z0-9]+)$/.exec(filename);
                if (m)
                    switch (m[1].toLowerCase()) {
                        case "txt": return "text/plain";
                        case "html":
                        case "htm": return "text/html";
                        case "css": return "text/css";
                        case "js": return "application/javascript";
                        case "jpg":
                        case "jpeg": return "image/jpeg";
                        case "png": return "image/png";
                        case "ico": return "image/x-icon";
                        case "manifest": return "text/cache-manifest";
                        case "webmanifest": return "application/manifest+json";
                        case "json": return "application/json";
                        case "svg": return "image/svg+xml";
                        case "eot": return "application/vnd.ms-fontobject";
                        case "ttf": return "font/ttf";
                        case "woff": return "application/font-woff";
                        case "woff2": return "application/font-woff2";
                        case "md": return "text/markdown";
                        case "xml": return "application/xml";
                        case "m4a": return "audio/m4a";
                        case "mp3": return "audio/mp3";
                        default: return "application/octet-stream";
                    }
                else
                    return "application/octet-stream";
            }
            Util.getMime = getMime;
            function randomUint32() {
                var buf = new Uint8Array(4);
                Util.getRandomBuf(buf);
                return new Uint32Array(buf.buffer)[0];
            }
            Util.randomUint32 = randomUint32;
            function guidGen() {
                function f() { return (randomUint32() | 0x10000).toString(16).slice(-4); }
                return f() + f() + "-" + f() + "-4" + f().slice(-3) + "-" + f() + "-" + f() + f() + f();
            }
            Util.guidGen = guidGen;
            function downloadLiveTranslationsAsync(lang, filename, branch, etag) {
                // hitting the cloud
                function downloadFromCloudAsync(strings) {
                    pxt.debug("downloading translations for " + lang + " " + filename + " " + (branch || ""));
                    // https://pxt.io/api/translations?filename=strings.json&lang=pl&approved=true&branch=v0
                    var url = (pxt.BrowserUtils.isLocalHost() || pxt.webConfig.isStatic ? "https://makecode.com" : "") + "/api/translations?lang=" + encodeURIComponent(lang) + "&filename=" + encodeURIComponent(filename) + "&approved=true";
                    if (branch)
                        url += '&branch=' + encodeURIComponent(branch);
                    var headers = {};
                    if (etag)
                        headers["If-None-Match"] = etag;
                    return requestAsync({ url: url, headers: headers }).then(function (resp) {
                        // if 304, translation not changed, skipe
                        if (resp.statusCode == 304 || resp.statusCode == 200) {
                            // store etag and translations
                            etag = resp.headers["etag"] || "";
                            return pxt.BrowserUtils.translationDbAsync()
                                .then(function (db) { return db.setAsync(lang, filename, branch, etag, resp.json || strings); })
                                .then(function () { return resp.json || strings; });
                        }
                        return resp.json;
                    }, function (e) {
                        console.log("failed to load translations from " + url);
                        return undefined;
                    });
                }
                // check for cache
                return pxt.BrowserUtils.translationDbAsync()
                    .then(function (db) { return db.getAsync(lang, filename, branch); })
                    .then(function (entry) {
                    // if cached, return immediately
                    if (entry) {
                        etag = entry.etag;
                        // update expired entries
                        var dt = (Date.now() - entry.time) / 1000;
                        if (dt > 300)
                            downloadFromCloudAsync(entry.strings).done();
                        return entry.strings;
                    }
                    else
                        return downloadFromCloudAsync();
                });
            }
            Util.downloadLiveTranslationsAsync = downloadLiveTranslationsAsync;
            Util.pxtLangCookieId = "PXT_LANG";
            Util.langCookieExpirationDays = 30;
            Util.allLanguages = {
                "af": { englishName: "Afrikaans", localizedName: "Afrikaans" },
                "ar": { englishName: "Arabic", localizedName: "العربية" },
                "bg": { englishName: "Bulgarian", localizedName: "български" },
                "ca": { englishName: "Catalan", localizedName: "Català" },
                "cs": { englishName: "Czech", localizedName: "Čeština" },
                "da": { englishName: "Danish", localizedName: "Dansk" },
                "de": { englishName: "German", localizedName: "Deutsch" },
                "el": { englishName: "Greek", localizedName: "Ελληνικά" },
                "en": { englishName: "English", localizedName: "English" },
                "es-ES": { englishName: "Spanish (Spain)", localizedName: "Español (España)" },
                "es-MX": { englishName: "Spanish (Mexico)", localizedName: "Español (México)" },
                "fi": { englishName: "Finnish", localizedName: "Suomi" },
                "fr": { englishName: "French", localizedName: "Français" },
                "fr-CA": { englishName: "French (Canada)", localizedName: "Français (Canada)" },
                "he": { englishName: "Hebrew", localizedName: "עברית" },
                "hr": { englishName: "Croatian", localizedName: "Hrvatski" },
                "hu": { englishName: "Hungarian", localizedName: "Magyar" },
                "hy-AM": { englishName: "Armenian (Armenia)", localizedName: "Հայերէն (Հայաստան)" },
                "id": { englishName: "Indonesian", localizedName: "Bahasa Indonesia" },
                "is": { englishName: "Icelandic", localizedName: "Íslenska" },
                "it": { englishName: "Italian", localizedName: "Italiano" },
                "ja": { englishName: "Japanese", localizedName: "日本語" },
                "ko": { englishName: "Korean", localizedName: "한국어" },
                "lt": { englishName: "Lithuanian", localizedName: "Lietuvių" },
                "nl": { englishName: "Dutch", localizedName: "Nederlands" },
                "no": { englishName: "Norwegian", localizedName: "Norsk" },
                "pl": { englishName: "Polish", localizedName: "Polski" },
                "pt-BR": { englishName: "Portuguese (Brazil)", localizedName: "Português (Brasil)" },
                "pt-PT": { englishName: "Portuguese (Portugal)", localizedName: "Português (Portugal)" },
                "ro": { englishName: "Romanian", localizedName: "Română" },
                "ru": { englishName: "Russian", localizedName: "Русский" },
                "si-LK": { englishName: "Sinhala (Sri Lanka)", localizedName: "සිංහල (ශ්රී ලංකා)" },
                "sk": { englishName: "Slovak", localizedName: "Slovenčina" },
                "sl": { englishName: "Slovenian", localizedName: "Slovenski" },
                "sr": { englishName: "Serbian", localizedName: "Srpski" },
                "sv-SE": { englishName: "Swedish (Sweden)", localizedName: "Svenska (Sverige)" },
                "ta": { englishName: "Tamil", localizedName: "தமிழ்" },
                "tr": { englishName: "Turkish", localizedName: "Türkçe" },
                "uk": { englishName: "Ukrainian", localizedName: "Українська" },
                "vi": { englishName: "Vietnamese", localizedName: "Tiếng việt" },
                "zh-CN": { englishName: "Chinese (Simplified)", localizedName: "简体中文" },
                "zh-TW": { englishName: "Chinese (Traditional)", localizedName: "繁体中文" },
            };
            function isLocaleEnabled(code) {
                var _a = Util.normalizeLanguageCode(code), lang = _a[0], baseLang = _a[1];
                var appTheme = pxt.appTarget.appTheme;
                if (appTheme && appTheme.availableLocales) {
                    if (appTheme.availableLocales.indexOf(lang) > -1) {
                        return true;
                    }
                    //check for base language if we didn't find the full language. Example: nl for nl-NL
                    if (baseLang && appTheme.availableLocales.indexOf(baseLang) > -1) {
                        return true;
                    }
                }
                return false;
            }
            Util.isLocaleEnabled = isLocaleEnabled;
            function updateLocalizationAsync(targetId, baseUrl, code, pxtBranch, targetBranch, live, force) {
                code = Util.normalizeLanguageCode(code)[0];
                if (code === "en-US")
                    code = "en"; // special case for built-in language
                if (code === Util.userLanguage() || (!isLocaleEnabled(code) && !force)) {
                    pxt.debug("loc: " + code + " (using built-in)");
                    return Promise.resolve();
                }
                pxt.debug("loc: " + code);
                return downloadTranslationsAsync(targetId, baseUrl, code, pxtBranch, targetBranch, live, ts.pxtc.Util.TranslationsKind.Editor)
                    .then(function (translations) {
                    if (translations) {
                        Util.setUserLanguage(code);
                        Util.setLocalizedStrings(translations);
                        if (live) {
                            Util.localizeLive = true;
                        }
                    }
                    // Download api translations
                    return !live ? ts.pxtc.Util.downloadTranslationsAsync(targetId, baseUrl, code, pxtBranch, targetBranch, live, ts.pxtc.Util.TranslationsKind.Apis)
                        .then(function (trs) {
                        if (trs)
                            ts.pxtc.apiLocalizationStrings = trs;
                    }) : Promise.resolve();
                });
            }
            Util.updateLocalizationAsync = updateLocalizationAsync;
            var TranslationsKind;
            (function (TranslationsKind) {
                TranslationsKind[TranslationsKind["Editor"] = 0] = "Editor";
                TranslationsKind[TranslationsKind["Sim"] = 1] = "Sim";
                TranslationsKind[TranslationsKind["Apis"] = 2] = "Apis";
            })(TranslationsKind = Util.TranslationsKind || (Util.TranslationsKind = {}));
            function downloadTranslationsAsync(targetId, baseUrl, code, pxtBranch, targetBranch, live, translationKind) {
                translationKind = translationKind || TranslationsKind.Editor;
                code = Util.normalizeLanguageCode(code)[0];
                if (code === "en-US" || code === "en")
                    return Promise.resolve(undefined);
                var translationsCacheId = code + "/" + live + "/" + translationKind;
                if (Util.translationsCache()[translationsCacheId]) {
                    return Promise.resolve(Util.translationsCache()[translationsCacheId]);
                }
                var stringFiles;
                switch (translationKind) {
                    case TranslationsKind.Editor:
                        stringFiles = [
                            { branch: pxtBranch, staticName: "strings.json", path: "strings.json" },
                            { branch: targetBranch, staticName: "target-strings.json", path: targetId + "/target-strings.json" },
                        ];
                        break;
                    case TranslationsKind.Sim:
                        stringFiles = [{ branch: targetBranch, staticName: "sim-strings.json", path: targetId + "/sim-strings.json" }];
                        break;
                    case TranslationsKind.Apis:
                        stringFiles = [{ branch: targetBranch, staticName: "bundled-strings.json", path: targetId + "/bundled-strings.json" }];
                        break;
                }
                var translations;
                function mergeTranslations(tr) {
                    if (!tr)
                        return;
                    if (!translations) {
                        translations = {};
                    }
                    Object.keys(tr)
                        .filter(function (k) { return !!tr[k]; })
                        .forEach(function (k) { return translations[k] = tr[k]; });
                }
                if (live) {
                    var errorCount_1 = 0;
                    var pAll = Promise.mapSeries(stringFiles, function (file) { return downloadLiveTranslationsAsync(code, file.path, file.branch)
                        .then(mergeTranslations, function (e) {
                        console.log(e.message);
                        ++errorCount_1;
                    }); });
                    return pAll.then(function () {
                        // Cache translations unless there was an error for one of the files
                        if (errorCount_1) {
                            Util.translationsCache()[translationsCacheId] = translations;
                        }
                        if (errorCount_1 === stringFiles.length || !translations) {
                            // Retry with non-live translations by setting live to false
                            pxt.tickEvent("translations.livetranslationsfailed");
                            return downloadTranslationsAsync(targetId, baseUrl, code, pxtBranch, targetBranch, false, translationKind);
                        }
                        return Promise.resolve(translations);
                    });
                }
                else {
                    return Promise.all(stringFiles.map(function (p) {
                        return Util.httpGetJsonAsync(baseUrl + "locales/" + code + "/" + p.staticName)
                            .catch(function (e) { return undefined; });
                    })).then(function (resps) {
                        var tr = {};
                        resps.forEach(function (res) { return pxt.Util.jsonMergeFrom(tr, res); });
                        if (Object.keys(tr).length) {
                            translations = tr;
                            Util.translationsCache()[translationsCacheId] = translations;
                        }
                    }, function (e) {
                        console.error('failed to load localizations');
                    })
                        .then(function () { return translations; });
                }
            }
            Util.downloadTranslationsAsync = downloadTranslationsAsync;
            function capitalize(n) {
                return n ? (n[0].toLocaleUpperCase() + n.slice(1)) : n;
            }
            Util.capitalize = capitalize;
            function uncapitalize(n) {
                return (n || "").split(/(?=[A-Z])/g).join(" ").toLowerCase();
            }
            Util.uncapitalize = uncapitalize;
            function range(len) {
                var r = [];
                for (var i = 0; i < len; ++i)
                    r.push(i);
                return r;
            }
            Util.range = range;
            function multipartPostAsync(uri, data, filename, filecontents) {
                if (data === void 0) { data = {}; }
                if (filename === void 0) { filename = null; }
                if (filecontents === void 0) { filecontents = null; }
                var boundary = "--------------------------0461489f461126c5";
                var form = "";
                function add(name, val) {
                    form += boundary + "\r\n";
                    form += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
                    form += val + "\r\n";
                }
                function addF(name, val) {
                    var fn = name.split('/').reverse()[0];
                    form += boundary + "\r\n";
                    form += "Content-Disposition: form-data; name=\"files[" + name + "]\"; filename=\"" + fn + "\"\r\n";
                    form += "\r\n";
                    form += val + "\r\n";
                }
                Object.keys(data).forEach(function (k) { return add(k, data[k]); });
                if (filename)
                    addF(filename, filecontents);
                form += boundary + "--\r\n";
                var req = {
                    url: uri,
                    method: "POST",
                    headers: {
                        "Content-Type": "multipart/form-data; boundary=" + boundary.slice(2)
                    },
                    data: form
                };
                return Util.httpRequestCoreAsync(req);
            }
            Util.multipartPostAsync = multipartPostAsync;
            function toDataUri(data, mimetype) {
                // TODO does this only support trusted data?
                // weed out urls
                if (/^https?:/i.test(data))
                    return data;
                // already a data uri?
                if (/^data:/i.test(data))
                    return data;
                // infer mimetype
                if (!mimetype) {
                    if (/^<svg/i.test(data))
                        mimetype = "image/svg+xml";
                }
                // encode
                if (/xml|svg/.test(mimetype))
                    return "data:" + mimetype + "," + encodeURIComponent(data);
                else
                    return "data:" + (mimetype || "image/png") + ";base64," + pxtc.encodeBase64(toUTF8(data));
            }
            Util.toDataUri = toDataUri;
        })(Util = pxtc.Util || (pxtc.Util = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var BrowserImpl;
        (function (BrowserImpl) {
            pxtc.Util.httpRequestCoreAsync = httpRequestCoreAsync;
            pxtc.Util.sha256 = sha256string;
            pxtc.Util.getRandomBuf = function (buf) {
                if (window.crypto)
                    window.crypto.getRandomValues(buf);
                else {
                    for (var i = 0; i < buf.length; ++i)
                        buf[i] = Math.floor(Math.random() * 255);
                }
            };
            function httpRequestCoreAsync(options) {
                return new Promise(function (resolve, reject) {
                    var client;
                    var resolved = false;
                    var headers = pxtc.Util.clone(options.headers) || {};
                    client = new XMLHttpRequest();
                    if (options.responseArrayBuffer)
                        client.responseType = "arraybuffer";
                    client.onreadystatechange = function () {
                        if (resolved)
                            return; // Safari/iOS likes to call this thing more than once
                        if (client.readyState == 4) {
                            resolved = true;
                            var res_1 = {
                                statusCode: client.status,
                                headers: {},
                                buffer: client.responseBody || client.response,
                                text: options.responseArrayBuffer ? undefined : client.responseText,
                            };
                            var allHeaders = client.getAllResponseHeaders();
                            allHeaders.split(/\r?\n/).forEach(function (l) {
                                var m = /^\s*([^:]+): (.*)/.exec(l);
                                if (m)
                                    res_1.headers[m[1].toLowerCase()] = m[2];
                            });
                            resolve(res_1);
                        }
                    };
                    var data = options.data;
                    var method = options.method || (data == null ? "GET" : "POST");
                    var buf;
                    if (data == null) {
                        buf = null;
                    }
                    else if (data instanceof Uint8Array) {
                        buf = data;
                    }
                    else if (typeof data == "object") {
                        buf = JSON.stringify(data);
                        headers["content-type"] = "application/json; charset=utf8";
                    }
                    else if (typeof data == "string") {
                        buf = data;
                    }
                    else {
                        pxtc.Util.oops("bad data");
                    }
                    client.open(method, options.url);
                    Object.keys(headers).forEach(function (k) {
                        client.setRequestHeader(k, headers[k]);
                    });
                    if (buf == null)
                        client.send();
                    else
                        client.send(buf);
                });
            }
            var sha256_k = new Uint32Array([
                0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
                0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
                0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
                0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
                0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
                0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
                0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
                0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
            ]);
            function rotr(v, b) {
                return (v >>> b) | (v << (32 - b));
            }
            function sha256round(hs, w) {
                pxtc.Util.assert(hs.length == 8);
                pxtc.Util.assert(w.length == 64);
                for (var i = 16; i < 64; ++i) {
                    var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                    var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                }
                var a = hs[0];
                var b = hs[1];
                var c = hs[2];
                var d = hs[3];
                var e = hs[4];
                var f = hs[5];
                var g = hs[6];
                var h = hs[7];
                for (var i = 0; i < 64; ++i) {
                    var s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                    var ch = (e & f) ^ (~e & g);
                    var temp1 = (h + s1 + ch + sha256_k[i] + w[i]) | 0;
                    var s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                    var maj = (a & b) ^ (a & c) ^ (b & c);
                    var temp2 = (s0 + maj) | 0;
                    h = g;
                    g = f;
                    f = e;
                    e = (d + temp1) | 0;
                    d = c;
                    c = b;
                    b = a;
                    a = (temp1 + temp2) | 0;
                }
                hs[0] += a;
                hs[1] += b;
                hs[2] += c;
                hs[3] += d;
                hs[4] += e;
                hs[5] += f;
                hs[6] += g;
                hs[7] += h;
            }
            function sha256buffer(buf) {
                var h = new Uint32Array(8);
                h[0] = 0x6a09e667;
                h[1] = 0xbb67ae85;
                h[2] = 0x3c6ef372;
                h[3] = 0xa54ff53a;
                h[4] = 0x510e527f;
                h[5] = 0x9b05688c;
                h[6] = 0x1f83d9ab;
                h[7] = 0x5be0cd19;
                var work = new Uint32Array(64);
                var chunkLen = 16 * 4;
                function addBuf(buf) {
                    var end = buf.length - (chunkLen - 1);
                    for (var i = 0; i < end; i += chunkLen) {
                        for (var j = 0; j < 16; j++) {
                            var off = (j << 2) + i;
                            work[j] = (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
                        }
                        sha256round(h, work);
                    }
                }
                addBuf(buf);
                var padSize = 64 - (buf.length + 9) % 64;
                if (padSize == 64)
                    padSize = 0;
                var endPos = buf.length - (buf.length % chunkLen);
                var padBuf = new Uint8Array((buf.length - endPos) + 1 + padSize + 8);
                var dst = 0;
                while (endPos < buf.length)
                    padBuf[dst++] = buf[endPos++];
                padBuf[dst++] = 0x80;
                while (padSize-- > 0)
                    padBuf[dst++] = 0x00;
                var len = buf.length * 8;
                dst = padBuf.length;
                while (len > 0) {
                    padBuf[--dst] = len & 0xff;
                    len >>= 8;
                }
                addBuf(padBuf);
                var res = "";
                for (var i = 0; i < h.length; ++i)
                    res += ("000000000" + h[i].toString(16)).slice(-8);
                return res.toLowerCase();
            }
            BrowserImpl.sha256buffer = sha256buffer;
            function sha256string(s) {
                return sha256buffer(pxtc.Util.stringToUint8Array(pxtc.Util.toUTF8(s)));
            }
            BrowserImpl.sha256string = sha256string;
        })(BrowserImpl = pxtc.BrowserImpl || (pxtc.BrowserImpl = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../localtypings/pxtpackage.d.ts"/>
/// <reference path="../localtypings/pxtparts.d.ts"/>
/// <reference path="../localtypings/pxtarget.d.ts"/>
/// <reference path="../localtypings/projectheader.d.ts"/>
/// <reference path="util.ts"/>
/// <reference path="apptarget.ts"/>
/// <reference path="tickEvent.ts"/>
var pxt;
(function (pxt) {
    pxt.U = pxtc.Util;
    pxt.Util = pxtc.Util;
    pxt.conversionPasses = [];
    var savedAppTarget;
    var savedSwitches = {};
    function setAppTarget(trg) {
        pxt.appTarget = trg || {};
        patchAppTarget();
        savedAppTarget = pxt.U.clone(pxt.appTarget);
    }
    pxt.setAppTarget = setAppTarget;
    function savedAppTheme() {
        return savedAppTarget ? savedAppTarget.appTheme : undefined;
    }
    pxt.savedAppTheme = savedAppTheme;
    function setCompileSwitch(name, value) {
        savedSwitches[name] = value;
        if (pxt.appTarget) {
            pxt.U.jsonCopyFrom(pxt.appTarget.compile.switches, savedSwitches);
            pxt.U.jsonCopyFrom(savedAppTarget.compile.switches, savedSwitches);
        }
    }
    pxt.setCompileSwitch = setCompileSwitch;
    function setCompileSwitches(names) {
        if (!names)
            return;
        for (var _i = 0, _a = names.split(/[\s,;:]+/); _i < _a.length; _i++) {
            var s = _a[_i];
            if (s)
                setCompileSwitch(s, true);
        }
    }
    pxt.setCompileSwitches = setCompileSwitches;
    var _bundledcoresvgs;
    function bundledSvg(id) {
        if (!id)
            return undefined;
        var res = _bundledcoresvgs && _bundledcoresvgs[id];
        if (res)
            return res; // cache hit
        // find all core packages images
        if (!pxt.appTarget.simulator || !pxt.appTarget.simulator.dynamicBoardDefinition)
            return undefined;
        if (!_bundledcoresvgs)
            _bundledcoresvgs = {};
        var files = pxt.appTarget.bundledpkgs[id];
        if (!files)
            return undefined;
        // builtin packages are guaranteed to parse out
        var pxtjson = JSON.parse(files["pxt.json"]);
        if (pxtjson.core && files["board.json"]) {
            var boardjson = JSON.parse(files["board.json"]);
            if (boardjson && boardjson.visual && boardjson.visual.image) {
                var boardimg = boardjson.visual.image;
                if (/^pkg:\/\//.test(boardimg))
                    boardimg = files[boardimg.slice(6)];
                // this call gets expensive when having large number of boards
                _bundledcoresvgs[id] = "data:image/svg+xml;base64," + ts.pxtc.encodeBase64(pxt.Util.toUTF8(boardimg));
            }
        }
        return _bundledcoresvgs[id];
    }
    pxt.bundledSvg = bundledSvg;
    function patchAppTarget() {
        // patch-up the target
        var comp = pxt.appTarget.compile;
        if (!comp)
            comp = pxt.appTarget.compile = { isNative: false, hasHex: false, switches: {} };
        if (comp.hasHex) {
            if (!comp.nativeType)
                comp.nativeType = pxtc.NATIVE_TYPE_THUMB;
        }
        if (!comp.switches)
            comp.switches = {};
        pxt.U.jsonCopyFrom(comp.switches, savedSwitches);
        // JS ref counting currently not supported
        comp.jsRefCounting = false;
        if (!comp.vtableShift)
            comp.vtableShift = 2;
        if (!comp.useUF2 && !comp.useELF && comp.noSourceInFlash == undefined)
            comp.noSourceInFlash = true; // no point putting sources in hex to be flashed
        if (comp.utf8 === undefined)
            comp.utf8 = true;
        if (!pxt.appTarget.appTheme)
            pxt.appTarget.appTheme = {};
        if (!pxt.appTarget.appTheme.embedUrl)
            pxt.appTarget.appTheme.embedUrl = pxt.appTarget.appTheme.homeUrl;
        var cs = pxt.appTarget.compileService;
        if (cs) {
            if (cs.yottaTarget && !cs.yottaBinary)
                cs.yottaBinary = "pxt-microbit-app-combined.hex";
        }
        // patch logo locations
        var theme = pxt.appTarget.appTheme;
        if (theme) {
            Object.keys(theme)
                .filter(function (k) { return /(logo|hero)$/i.test(k) && /^@cdnUrl@/.test(theme[k]); })
                .forEach(function (k) { return theme[k] = pxt.BrowserUtils.patchCdn(theme[k]); });
        }
        // patching simulator images
        var sim = pxt.appTarget.simulator;
        if (sim
            && sim.boardDefinition
            && sim.boardDefinition.visual) {
            var boardDef = sim.boardDefinition.visual;
            if (boardDef.image) {
                boardDef.image = pxt.BrowserUtils.patchCdn(boardDef.image);
                if (boardDef.outlineImage)
                    boardDef.outlineImage = pxt.BrowserUtils.patchCdn(boardDef.outlineImage);
            }
        }
        // patch icons in bundled packages
        Object.keys(pxt.appTarget.bundledpkgs).forEach(function (pkgid) {
            var res = pxt.appTarget.bundledpkgs[pkgid];
            // path config before storing
            var config = JSON.parse(res[pxt.CONFIG_NAME]);
            if (config.icon)
                config.icon = pxt.BrowserUtils.patchCdn(config.icon);
            res[pxt.CONFIG_NAME] = JSON.stringify(config, null, 4);
        });
        // patch any pre-configured query url appTheme overrides
        if (pxt.appTarget.queryVariants && typeof window !== 'undefined') {
            var href_1 = window.location.href;
            Object.keys(pxt.appTarget.queryVariants).forEach(function (queryRegex) {
                var regex = new RegExp(queryRegex, "i");
                var match = regex.exec(href_1);
                if (match) {
                    // Apply any appTheme overrides
                    var v = pxt.appTarget.queryVariants[queryRegex];
                    if (v) {
                        pxt.U.jsonMergeFrom(pxt.appTarget, v);
                    }
                }
            });
        }
    }
    function reloadAppTargetVariant() {
        var curr = JSON.stringify(pxt.appTarget);
        pxt.appTarget = pxt.U.clone(savedAppTarget);
        if (pxt.appTargetVariant) {
            var v = pxt.appTarget.variants && pxt.appTarget.variants[pxt.appTargetVariant];
            if (v)
                pxt.U.jsonMergeFrom(pxt.appTarget, v);
            else
                pxt.U.userError(lf("Variant '{0}' not defined in pxtarget.json", pxt.appTargetVariant));
        }
        patchAppTarget();
        // check if apptarget changed
        if (pxt.onAppTargetChanged && curr != JSON.stringify(pxt.appTarget))
            pxt.onAppTargetChanged();
    }
    pxt.reloadAppTargetVariant = reloadAppTargetVariant;
    // this is set by compileServiceVariant in pxt.json
    function setAppTargetVariant(variant, force) {
        pxt.debug("app variant: " + variant);
        if (!force && (pxt.appTargetVariant === variant || (!pxt.appTargetVariant && !variant)))
            return;
        pxt.appTargetVariant = variant;
        reloadAppTargetVariant();
    }
    pxt.setAppTargetVariant = setAppTargetVariant;
    // This causes the `hw` package to be replaced with `hw---variant` upon package load
    // the pxt.json of hw---variant would generally specify compileServiceVariant
    // This is controlled by ?hw=variant or by configuration created by dragging `config.bin`
    // into editor.
    function setHwVariant(variant) {
        variant = variant.replace(/.*---/, "");
        if (/^[\w\-]+$/.test(variant))
            pxt.hwVariant = variant;
        else
            pxt.hwVariant = null;
    }
    pxt.setHwVariant = setHwVariant;
    function hasHwVariants() {
        return !!pxt.appTarget.variants
            && Object.keys(pxt.appTarget.bundledpkgs).some(function (pkg) { return /^hw---/.test(pkg); });
    }
    pxt.hasHwVariants = hasHwVariants;
    function getHwVariants() {
        if (!pxt.appTarget.variants)
            return [];
        var hws = Object.keys(pxt.appTarget.bundledpkgs).filter(function (pkg) { return /^hw---/.test(pkg); });
        return hws
            .map(function (pkg) { return JSON.parse(pxt.appTarget.bundledpkgs[pkg][pxt.CONFIG_NAME]); })
            .filter(function (cfg) {
            if (pxt.appTarget.appTheme.experimentalHw)
                return true;
            return !cfg.experimentalHw;
        });
    }
    pxt.getHwVariants = getHwVariants;
    pxt.options = {};
    // general error reported
    pxt.debug = typeof console !== "undefined" && !!console.debug
        ? function (msg) {
            if (pxt.options.debug)
                console.debug(msg);
        } : function () { };
    pxt.log = typeof console !== "undefined" && !!console.log
        ? function (msg) {
            console.log(msg);
        } : function () { };
    pxt.reportException = function (e, d) {
        if (console) {
            console.error(e);
            if (d) {
                try {
                    // log it as object, so native object inspector can be used
                    console.log(d);
                    //pxt.log(JSON.stringify(d, null, 2))
                }
                catch (e) { }
            }
        }
    };
    pxt.reportError = function (cat, msg, data) {
        if (console) {
            console.error(cat + ": " + msg);
            if (data) {
                try {
                    pxt.log(JSON.stringify(data, null, 2));
                }
                catch (e) { }
            }
        }
    };
    var activityEvents = {};
    var tickActivityDebounced = pxt.Util.debounce(function () {
        pxt.tickEvent("activity", activityEvents);
        activityEvents = {};
    }, 10000, false);
    /**
     * Ticks activity events. This event gets aggregated and eventually gets sent.
     */
    function tickActivity() {
        var ids = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ids[_i] = arguments[_i];
        }
        ids.filter(function (id) { return !!id; }).map(function (id) { return id.slice(0, 64); })
            .forEach(function (id) { return activityEvents[id] = (activityEvents[id] || 0) + 1; });
        tickActivityDebounced();
    }
    pxt.tickActivity = tickActivity;
    function localWebConfig() {
        var r = {
            relprefix: "/--",
            workerjs: "/worker.js",
            monacoworkerjs: "/monacoworker.js",
            gifworkerjs: "/gifjs/gif.worker.js",
            pxtVersion: "local",
            pxtRelId: "",
            pxtCdnUrl: "/cdn/",
            commitCdnUrl: "/cdn/",
            blobCdnUrl: "/blb/",
            cdnUrl: "/cdn/",
            targetUrl: "",
            targetVersion: "local",
            targetRelId: "",
            targetId: pxt.appTarget ? pxt.appTarget.id : "",
            simUrl: "/sim/simulator.html",
            partsUrl: "/sim/siminstructions.html"
        };
        return r;
    }
    pxt.localWebConfig = localWebConfig;
    function getOnlineCdnUrl() {
        if (!pxt.webConfig)
            return null;
        var m = /^(https:\/\/[^\/]+)/.exec(pxt.webConfig.commitCdnUrl);
        if (m)
            return m[1];
        else
            return null;
    }
    pxt.getOnlineCdnUrl = getOnlineCdnUrl;
    function setupWebConfig(cfg) {
        if (cfg)
            pxt.webConfig = cfg;
        else if (!pxt.webConfig)
            pxt.webConfig = localWebConfig();
    }
    pxt.setupWebConfig = setupWebConfig;
    function getEmbeddedScript(id) {
        return pxt.U.lookup(pxt.appTarget.bundledpkgs || {}, id);
    }
    pxt.getEmbeddedScript = getEmbeddedScript;
    var _targetConfigPromise = undefined;
    function targetConfigAsync() {
        if (!_targetConfigPromise)
            _targetConfigPromise = pxt.Cloud.downloadTargetConfigAsync()
                .then(function (js) { return js || {}; }, function (err) { return {}; });
        return _targetConfigPromise;
    }
    pxt.targetConfigAsync = targetConfigAsync;
    function packagesConfigAsync() {
        return targetConfigAsync().then(function (config) { return config ? config.packages : undefined; });
    }
    pxt.packagesConfigAsync = packagesConfigAsync;
    pxt.CONFIG_NAME = "pxt.json";
    pxt.SIMSTATE_JSON = ".simstate.json";
    pxt.SERIAL_EDITOR_FILE = "serial.txt";
    pxt.CLOUD_ID = "pxt/";
    pxt.BLOCKS_PROJECT_NAME = "blocksprj";
    pxt.JAVASCRIPT_PROJECT_NAME = "tsprj";
    pxt.PYTHON_PROJECT_NAME = "pyprj";
    function outputName(trg) {
        if (trg === void 0) { trg = null; }
        if (!trg)
            trg = pxt.appTarget.compile;
        if (trg.nativeType == ts.pxtc.NATIVE_TYPE_VM)
            return ts.pxtc.BINARY_PXT64;
        else if (trg.useUF2)
            return ts.pxtc.BINARY_UF2;
        else if (trg.useELF)
            return ts.pxtc.BINARY_ELF;
        else
            return ts.pxtc.BINARY_HEX;
    }
    pxt.outputName = outputName;
    function isOutputText(trg) {
        if (trg === void 0) { trg = null; }
        return outputName(trg) == ts.pxtc.BINARY_HEX;
    }
    pxt.isOutputText = isOutputText;
})(pxt || (pxt = {}));
/// <reference path="main.ts"/>
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var THIS_NAME = "this";
        // The JS Math functions supported in the blocks. The order of this array
        // determines the order of the dropdown in the math_js_op block
        blocks.MATH_FUNCTIONS = {
            unary: ["sqrt", "sin", "cos", "tan"],
            binary: ["atan2"],
            infix: ["idiv", "imul"]
        };
        // Like MATH_FUNCTIONS, but used only for rounding operations
        blocks.ROUNDING_FUNCTIONS = ["round", "ceil", "floor", "trunc"];
        // Information for blocks that compile to function calls but are defined by vanilla Blockly
        // and not dynamically by BlocklyLoader
        blocks.builtinFunctionInfo = {
            "Math.abs": { blockId: "math_op3", params: ["x"] },
            "Math.min": { blockId: "math_op2", params: ["x", "y"] },
            "Math.max": { blockId: "math_op2", params: ["x", "y"] }
        };
        function normalizeBlock(b, err) {
            if (err === void 0) { err = pxt.log; }
            if (!b)
                return b;
            // normalize and validate common errors
            // made while translating
            var nb = b.replace(/[^\\]%\s+/g, '%');
            if (nb != b) {
                err("block has extra spaces: " + b);
                return b;
            }
            // remove spaces around %foo = ==> %foo=
            b = nb;
            nb = b.replace(/(%\w+)\s*=\s*(\w+)/, '$1=$2');
            if (nb != b) {
                err("block has space between %name and = : " + b);
                b = nb;
            }
            // remove spaces before after pipe
            nb = nb.replace(/\s*\|\s*/g, '|');
            return nb;
        }
        blocks.normalizeBlock = normalizeBlock;
        function compileInfo(fn) {
            var res = {
                parameters: [],
                actualNameToParam: {},
                definitionNameToParam: {},
                handlerArgs: []
            };
            var instance = (fn.kind == 1 /* Method */ || fn.kind == 2 /* Property */) && !fn.attributes.defaultInstance;
            var hasBlockDef = !!fn.attributes._def;
            var defParameters = hasBlockDef ? fn.attributes._def.parameters.slice(0) : undefined;
            var optionalStart = hasBlockDef ? defParameters.length : (fn.parameters ? fn.parameters.length : 0);
            var bInfo = blocks.builtinFunctionInfo[fn.qName];
            if (hasBlockDef && fn.attributes._expandedDef) {
                defParameters.push.apply(defParameters, fn.attributes._expandedDef.parameters);
            }
            var refMap = {};
            var definitionsWithoutRefs = defParameters ? defParameters.filter(function (p) {
                if (p.ref) {
                    refMap[p.name] = p;
                    return false;
                }
                return true;
            }) : [];
            if (instance && hasBlockDef && defParameters.length) {
                var def = refMap[THIS_NAME] || defParameters[0];
                var defName = def.name;
                var isVar = !def.shadowBlockId || def.shadowBlockId === "variables_get";
                res.thisParameter = {
                    actualName: THIS_NAME,
                    definitionName: defName,
                    shadowBlockId: def.shadowBlockId,
                    type: fn.namespace,
                    defaultValue: isVar ? def.varName : undefined,
                    // Normally we pass ths actual parameter name, but the "this" parameter doesn't have one
                    fieldEditor: fieldEditor(defName, THIS_NAME),
                    fieldOptions: fieldOptions(defName, THIS_NAME),
                    shadowOptions: shadowOptions(defName, THIS_NAME),
                };
            }
            if (fn.parameters) {
                var defIndex_1 = (instance && !refMap[THIS_NAME]) ? 1 : 0;
                fn.parameters.forEach(function (p, i) {
                    var def;
                    if (refMap[p.name]) {
                        def = refMap[p.name];
                    }
                    else if (defIndex_1 < definitionsWithoutRefs.length) {
                        def = definitionsWithoutRefs[defIndex_1];
                        ++defIndex_1;
                    }
                    if (def || !hasBlockDef) {
                        var range = undefined;
                        if (p.options && p.options["min"] && p.options["max"]) {
                            range = { min: p.options["min"].value, max: p.options["max"].value };
                        }
                        var defName = def ? def.name : (bInfo ? bInfo.params[defIndex_1++] : p.name);
                        var isVarOrArray = def && (def.shadowBlockId === "variables_get" || def.shadowBlockId == "lists_create_with");
                        res.parameters.push({
                            actualName: p.name,
                            type: p.type,
                            defaultValue: isVarOrArray ? (def.varName || p.default) : p.default,
                            definitionName: defName,
                            shadowBlockId: def && def.shadowBlockId,
                            isOptional: defParameters ? defParameters.indexOf(def) >= optionalStart : false,
                            fieldEditor: fieldEditor(defName, p.name),
                            fieldOptions: fieldOptions(defName, p.name),
                            shadowOptions: shadowOptions(defName, p.name),
                            range: range
                        });
                    }
                    if (p.handlerParameters) {
                        p.handlerParameters.forEach(function (arg) {
                            res.handlerArgs.push({
                                name: arg.name,
                                type: arg.type,
                                inBlockDef: defParameters ? defParameters.some(function (def) { return def.ref && def.name === arg.name; }) : false
                            });
                        });
                    }
                });
            }
            res.parameters.forEach(function (p) {
                res.actualNameToParam[p.actualName] = p;
                res.definitionNameToParam[p.definitionName] = p;
            });
            return res;
            function fieldEditor(defName, actualName) {
                return fn.attributes.paramFieldEditor &&
                    (fn.attributes.paramFieldEditor[defName] || fn.attributes.paramFieldEditor[actualName]);
            }
            function fieldOptions(defName, actualName) {
                return fn.attributes.paramFieldEditorOptions &&
                    (fn.attributes.paramFieldEditorOptions[defName] || fn.attributes.paramFieldEditorOptions[actualName]);
            }
            function shadowOptions(defName, actualName) {
                return fn.attributes.paramShadowOptions &&
                    (fn.attributes.paramShadowOptions[defName] || fn.attributes.paramShadowOptions[actualName]);
            }
        }
        blocks.compileInfo = compileInfo;
        /**
         * Returns which Blockly block type to use for an argument reporter based
         * on the specified TypeScript type.
         * @param varType The variable's TypeScript type
         * @return The Blockly block type of the reporter to be used
         */
        function reporterTypeForArgType(varType) {
            var reporterType = "argument_reporter_custom";
            if (varType === "boolean" || varType === "number" || varType === "string") {
                reporterType = "argument_reporter_" + varType;
            }
            return reporterType;
        }
        blocks.reporterTypeForArgType = reporterTypeForArgType;
        function defaultIconForArgType(typeName) {
            if (typeName === void 0) { typeName = ""; }
            switch (typeName) {
                case "number":
                    return "calculator";
                case "string":
                    return "text width";
                case "boolean":
                    return "random";
                default:
                    return "align justify";
            }
        }
        blocks.defaultIconForArgType = defaultIconForArgType;
        function parseFields(b) {
            // normalize and validate common errors
            // made while translating
            return b.split('|').map(function (n, ni) {
                var m = /([^%]*)\s*%([a-zA-Z0-9_]+)/.exec(n);
                if (!m)
                    return { n: n, ni: ni };
                var pre = m[1];
                if (pre)
                    pre = pre.trim();
                var p = m[2];
                return { n: n, ni: ni, pre: pre, p: p };
            });
        }
        blocks.parseFields = parseFields;
        var _blockDefinitions;
        function blockDefinitions() {
            if (!_blockDefinitions)
                cacheBlockDefinitions();
            return _blockDefinitions;
        }
        blocks.blockDefinitions = blockDefinitions;
        function getBlockDefinition(blockId) {
            if (!_blockDefinitions)
                cacheBlockDefinitions();
            return _blockDefinitions[blockId];
        }
        blocks.getBlockDefinition = getBlockDefinition;
        // Resources for built-in and extra blocks
        function cacheBlockDefinitions() {
            _blockDefinitions = {
                'device_while': {
                    name: pxt.Util.lf("a loop that repeats while the condition is true"),
                    tooltip: pxt.Util.lf("Run the same sequence of actions while the condition is met."),
                    url: '/blocks/loops/while',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("while %1"),
                        appendField: pxt.Util.lf("{id:while}do")
                    }
                },
                'pxt_controls_for': {
                    name: pxt.Util.lf("a loop that repeats the number of times you say"),
                    tooltip: pxt.Util.lf("Have the variable '{0}' take on the values from 0 to the end number, counting by 1, and do the specified blocks."),
                    url: 'blocks/loops/for',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("for %1 from 0 to %2"),
                        variable: pxt.Util.lf("{id:var}index"),
                        appendField: pxt.Util.lf("{id:for}do")
                    }
                },
                'controls_simple_for': {
                    name: pxt.Util.lf("a loop that repeats the number of times you say"),
                    tooltip: pxt.Util.lf("Have the variable '{0}' take on the values from 0 to the end number, counting by 1, and do the specified blocks."),
                    url: 'blocks/loops/for',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("for %1 from 0 to %2"),
                        variable: pxt.Util.lf("{id:var}index"),
                        appendField: pxt.Util.lf("{id:for}do")
                    }
                },
                'pxt_controls_for_of': {
                    name: pxt.Util.lf("a loop that repeats for each value in an array"),
                    tooltip: pxt.Util.lf("Have the variable '{0}' take the value of each item in the array one by one, and do the specified blocks."),
                    url: 'blocks/loops/for-of',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("for element %1 of %2"),
                        variable: pxt.Util.lf("{id:var}value"),
                        appendField: pxt.Util.lf("{id:for_of}do")
                    }
                },
                'controls_for_of': {
                    name: pxt.Util.lf("a loop that repeats for each value in an array"),
                    tooltip: pxt.Util.lf("Have the variable '{0}' take the value of each item in the array one by one, and do the specified blocks."),
                    url: 'blocks/loops/for-of',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("for element %1 of %2"),
                        variable: pxt.Util.lf("{id:var}value"),
                        appendField: pxt.Util.lf("{id:for_of}do")
                    }
                },
                'math_op2': {
                    name: pxt.Util.lf("minimum or maximum of 2 numbers"),
                    tooltip: {
                        "min": pxt.Util.lf("smaller value of 2 numbers"),
                        "max": pxt.Util.lf("larger value of 2 numbers")
                    },
                    url: '/blocks/math',
                    operators: {
                        'op': ["min", "max"]
                    },
                    category: 'math'
                },
                'math_op3': {
                    name: pxt.Util.lf("absolute number"),
                    tooltip: pxt.Util.lf("absolute value of a number"),
                    url: '/reference/math',
                    category: 'math',
                    block: {
                        message0: pxt.Util.lf("absolute of %1")
                    }
                },
                'math_number': {
                    name: pxt.Util.lf("{id:block}number"),
                    url: '/blocks/math/random',
                    category: 'math',
                    tooltip: (pxt.appTarget && pxt.appTarget.compile) ?
                        pxt.Util.lf("a decimal number") : pxt.Util.lf("an integer number")
                },
                'math_integer': {
                    name: pxt.Util.lf("{id:block}number"),
                    url: '/blocks/math/random',
                    category: 'math',
                    tooltip: pxt.Util.lf("an integer number")
                },
                'math_whole_number': {
                    name: pxt.Util.lf("{id:block}number"),
                    url: '/blocks/math/random',
                    category: 'math',
                    tooltip: pxt.Util.lf("a whole number")
                },
                'math_number_minmax': {
                    name: pxt.Util.lf("{id:block}number"),
                    url: '/blocks/math/random',
                    category: 'math'
                },
                'math_arithmetic': {
                    name: pxt.Util.lf("arithmetic operation"),
                    url: '/blocks/math',
                    tooltip: {
                        ADD: pxt.Util.lf("Return the sum of the two numbers."),
                        MINUS: pxt.Util.lf("Return the difference of the two numbers."),
                        MULTIPLY: pxt.Util.lf("Return the product of the two numbers."),
                        DIVIDE: pxt.Util.lf("Return the quotient of the two numbers."),
                        POWER: pxt.Util.lf("Return the first number raised to the power of the second number."),
                    },
                    operators: {
                        'OP': ["ADD", "MINUS", "MULTIPLY", "DIVIDE", "POWER"]
                    },
                    category: 'math',
                    block: {
                        MATH_ADDITION_SYMBOL: pxt.Util.lf("{id:op}+"),
                        MATH_SUBTRACTION_SYMBOL: pxt.Util.lf("{id:op}-"),
                        MATH_MULTIPLICATION_SYMBOL: pxt.Util.lf("{id:op}×"),
                        MATH_DIVISION_SYMBOL: pxt.Util.lf("{id:op}÷"),
                        MATH_POWER_SYMBOL: pxt.Util.lf("{id:op}**")
                    }
                },
                'math_modulo': {
                    name: pxt.Util.lf("division remainder"),
                    tooltip: pxt.Util.lf("Return the remainder from dividing the two numbers."),
                    url: '/blocks/math',
                    category: 'math',
                    block: {
                        MATH_MODULO_TITLE: pxt.Util.lf("remainder of %1 ÷ %2")
                    }
                },
                'math_js_op': {
                    name: pxt.Util.lf("math function"),
                    tooltip: {
                        "sqrt": pxt.Util.lf("Returns the square root of the argument"),
                        "sin": pxt.Util.lf("Returns the sine of the argument"),
                        "cos": pxt.Util.lf("Returns the cosine of the argument"),
                        "tan": pxt.Util.lf("Returns the tangent of the argument"),
                        "atan2": pxt.Util.lf("Returns the arctangent of the quotient of the two arguments"),
                        "idiv": pxt.Util.lf("Returns the integer portion of the division operation on the two arguments"),
                        "imul": pxt.Util.lf("Returns the integer portion of the multiplication operation on the two arguments")
                    },
                    url: '/blocks/math',
                    operators: {
                        'OP': ["sqrt", "sin", "cos", "tan", "atan2", "idiv", "imul"]
                    },
                    category: 'math',
                    block: {
                        "sqrt": pxt.Util.lf("{id:op}square root"),
                        "sin": pxt.Util.lf("{id:op}sin"),
                        "cos": pxt.Util.lf("{id:op}cos"),
                        "tan": pxt.Util.lf("{id:op}tan"),
                        "atan2": pxt.Util.lf("{id:op}atan2"),
                        "idiv": pxt.Util.lf("{id:op}integer ÷"),
                        "imul": pxt.Util.lf("{id:op}integer ×"),
                    }
                },
                "math_js_round": {
                    name: pxt.Util.lf("rounding functions"),
                    tooltip: {
                        "round": pxt.Util.lf("Increases the argument to the next higher whole number if its fractional part is more than one half"),
                        "ceil": pxt.Util.lf("Increases the argument to the next higher whole number"),
                        "floor": pxt.Util.lf("Decreases the argument to the next lower whole number"),
                        "trunc": pxt.Util.lf("Removes the fractional part of the argument")
                    },
                    url: '/blocks/math',
                    operators: {
                        "OP": ["round", "ceil", "floor", "trunc"]
                    },
                    category: 'math',
                    block: {
                        "round": pxt.Util.lf("{id:op}round"),
                        "ceil": pxt.Util.lf("{id:op}ceiling"),
                        "floor": pxt.Util.lf("{id:op}floor"),
                        "trunc": pxt.Util.lf("{id:op}truncate"),
                    }
                },
                'variables_change': {
                    name: pxt.Util.lf("update the value of a number variable"),
                    tooltip: pxt.Util.lf("Changes the value of the variable by this amount"),
                    url: '/blocks/variables/change',
                    category: 'variables',
                    block: {
                        message0: pxt.Util.lf("change %1 by %2")
                    }
                },
                'controls_repeat_ext': {
                    name: pxt.Util.lf("a loop that repeats and increments an index"),
                    tooltip: pxt.Util.lf("Do some statements several times."),
                    url: '/blocks/loops/repeat',
                    category: 'loops',
                    block: {
                        CONTROLS_REPEAT_TITLE: pxt.Util.lf("repeat %1 times"),
                        CONTROLS_REPEAT_INPUT_DO: pxt.Util.lf("{id:repeat}do")
                    }
                },
                'variables_get': {
                    name: pxt.Util.lf("get the value of a variable"),
                    tooltip: pxt.Util.lf("Returns the value of this variable."),
                    url: '/blocks/variables',
                    category: 'variables',
                    block: {
                        VARIABLES_GET_CREATE_SET: pxt.Util.lf("Create 'set %1'")
                    }
                },
                'variables_get_reporter': {
                    name: pxt.Util.lf("get the value of a variable"),
                    tooltip: pxt.Util.lf("Returns the value of this variable."),
                    url: '/blocks/variables',
                    category: 'variables',
                    block: {
                        VARIABLES_GET_CREATE_SET: pxt.Util.lf("Create 'set %1'")
                    }
                },
                'variables_set': {
                    name: pxt.Util.lf("assign the value of a variable"),
                    tooltip: pxt.Util.lf("Sets this variable to be equal to the input."),
                    url: '/blocks/variables/assign',
                    category: 'variables',
                    block: {
                        VARIABLES_SET: pxt.Util.lf("set %1 to %2")
                    }
                },
                'controls_if': {
                    name: pxt.Util.lf("a conditional statement"),
                    tooltip: {
                        CONTROLS_IF_TOOLTIP_1: pxt.Util.lf("If a value is true, then do some statements."),
                        CONTROLS_IF_TOOLTIP_2: pxt.Util.lf("If a value is true, then do the first block of statements. Otherwise, do the second block of statements."),
                        CONTROLS_IF_TOOLTIP_3: pxt.Util.lf("If the first value is true, then do the first block of statements. Otherwise, if the second value is true, do the second block of statements."),
                        CONTROLS_IF_TOOLTIP_4: pxt.Util.lf("If the first value is true, then do the first block of statements. Otherwise, if the second value is true, do the second block of statements. If none of the values are true, do the last block of statements.")
                    },
                    tooltipSearch: "CONTROLS_IF_TOOLTIP_2",
                    url: '/blocks/logic/if',
                    category: 'logic',
                    block: {
                        CONTROLS_IF_MSG_IF: pxt.Util.lf("{id:logic}if"),
                        CONTROLS_IF_MSG_THEN: pxt.Util.lf("{id:logic}then"),
                        CONTROLS_IF_MSG_ELSE: pxt.Util.lf("{id:logic}else"),
                        CONTROLS_IF_MSG_ELSEIF: pxt.Util.lf("{id:logic}else if")
                    }
                },
                'lists_create_with': {
                    name: pxt.Util.lf("create an array"),
                    tooltip: pxt.Util.lf("Creates a new array."),
                    url: '/reference/arrays/create',
                    category: 'arrays',
                    blockTextSearch: "LISTS_CREATE_WITH_INPUT_WITH",
                    block: {
                        LISTS_CREATE_EMPTY_TITLE: pxt.Util.lf("empty array"),
                        LISTS_CREATE_WITH_INPUT_WITH: pxt.Util.lf("array of"),
                        LISTS_CREATE_WITH_CONTAINER_TITLE_ADD: pxt.Util.lf("array"),
                        LISTS_CREATE_WITH_ITEM_TITLE: pxt.Util.lf("value")
                    }
                },
                'lists_length': {
                    name: pxt.Util.lf("array length"),
                    tooltip: pxt.Util.lf("Returns the number of items in an array."),
                    url: '/reference/arrays/length',
                    category: 'arrays',
                    block: {
                        LISTS_LENGTH_TITLE: pxt.Util.lf("length of array %1")
                    }
                },
                'lists_index_get': {
                    name: pxt.Util.lf("get a value in an array"),
                    tooltip: pxt.Util.lf("Returns the value at the given index in an array."),
                    url: '/reference/arrays/get',
                    category: 'arrays',
                    block: {
                        message0: pxt.Util.lf("%1 get value at %2")
                    }
                },
                'lists_index_set': {
                    name: pxt.Util.lf("set a value in an array"),
                    tooltip: pxt.Util.lf("Sets the value at the given index in an array"),
                    url: '/reference/arrays/set',
                    category: 'arrays',
                    block: {
                        message0: pxt.Util.lf("%1 set value at %2 to %3")
                    }
                },
                'logic_compare': {
                    name: pxt.Util.lf("comparing two numbers"),
                    tooltip: {
                        LOGIC_COMPARE_TOOLTIP_EQ: pxt.Util.lf("Return true if both inputs equal each other."),
                        LOGIC_COMPARE_TOOLTIP_NEQ: pxt.Util.lf("Return true if both inputs are not equal to each other."),
                        LOGIC_COMPARE_TOOLTIP_LT: pxt.Util.lf("Return true if the first input is smaller than the second input."),
                        LOGIC_COMPARE_TOOLTIP_LTE: pxt.Util.lf("Return true if the first input is smaller than or equal to the second input."),
                        LOGIC_COMPARE_TOOLTIP_GT: pxt.Util.lf("Return true if the first input is greater than the second input."),
                        LOGIC_COMPARE_TOOLTIP_GTE: pxt.Util.lf("Return true if the first input is greater than or equal to the second input.")
                    },
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        search: "= ≠ < ≤ > ≥" // Only used for search; this string is not surfaced in the block's text
                    }
                },
                'logic_operation': {
                    name: pxt.Util.lf("boolean operation"),
                    tooltip: {
                        LOGIC_OPERATION_TOOLTIP_AND: pxt.Util.lf("Return true if both inputs are true."),
                        LOGIC_OPERATION_TOOLTIP_OR: pxt.Util.lf("Return true if at least one of the inputs is true.")
                    },
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        LOGIC_OPERATION_AND: pxt.Util.lf("{id:op}and"),
                        LOGIC_OPERATION_OR: pxt.Util.lf("{id:op}or")
                    }
                },
                'logic_negate': {
                    name: pxt.Util.lf("logical negation"),
                    tooltip: pxt.Util.lf("Returns true if the input is false. Returns false if the input is true."),
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        LOGIC_NEGATE_TITLE: pxt.Util.lf("not %1")
                    }
                },
                'logic_boolean': {
                    name: pxt.Util.lf("a `true` or `false` value"),
                    tooltip: pxt.Util.lf("Returns either true or false."),
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        LOGIC_BOOLEAN_TRUE: pxt.Util.lf("{id:boolean}true"),
                        LOGIC_BOOLEAN_FALSE: pxt.Util.lf("{id:boolean}false")
                    }
                },
                'text': {
                    name: pxt.Util.lf("a piece of text"),
                    tooltip: pxt.Util.lf("A letter, word, or line of text."),
                    url: 'types/string',
                    category: 'text',
                    block: {
                        search: pxt.Util.lf("a piece of text") // Only used for search; this string is not surfaced in the block's text
                    }
                },
                'text_length': {
                    name: pxt.Util.lf("number of characters in the string"),
                    tooltip: pxt.Util.lf("Returns the number of letters (including spaces) in the provided text."),
                    url: 'reference/text/length',
                    category: 'text',
                    block: {
                        TEXT_LENGTH_TITLE: pxt.Util.lf("length of %1")
                    }
                },
                'text_join': {
                    name: pxt.Util.lf("join items to create text"),
                    tooltip: pxt.Util.lf("Create a piece of text by joining together any number of items."),
                    url: 'reference/text/join',
                    category: 'text',
                    block: {
                        TEXT_JOIN_TITLE_CREATEWITH: pxt.Util.lf("join")
                    }
                },
                'procedures_defnoreturn': {
                    name: pxt.Util.lf("define the function"),
                    tooltip: pxt.Util.lf("Create a function."),
                    url: 'types/function/define',
                    category: 'functions',
                    block: {
                        PROCEDURES_DEFNORETURN_TITLE: pxt.Util.lf("function"),
                        PROCEDURE_ALREADY_EXISTS: pxt.Util.lf("A function named '%1' already exists.")
                    }
                },
                'procedures_callnoreturn': {
                    name: pxt.Util.lf("call the function"),
                    tooltip: pxt.Util.lf("Call the user-defined function."),
                    url: 'types/function/call',
                    category: 'functions',
                    block: {
                        PROCEDURES_CALLNORETURN_TITLE: pxt.Util.lf("call function")
                    }
                },
                'function_definition': {
                    name: pxt.Util.lf("define the function"),
                    tooltip: pxt.Util.lf("Create a function."),
                    url: 'types/function/define',
                    category: 'functions',
                    block: {
                        FUNCTIONS_EDIT_OPTION: pxt.Util.lf("Edit Function")
                    }
                },
                'function_call': {
                    name: pxt.Util.lf("call the function"),
                    tooltip: pxt.Util.lf("Call the user-defined function."),
                    url: 'types/function/call',
                    category: 'functions',
                    block: {
                        FUNCTIONS_CALL_TITLE: pxt.Util.lf("call")
                    }
                }
            };
            _blockDefinitions[pxtc.ON_START_TYPE] = {
                name: pxt.Util.lf("on start event"),
                tooltip: pxt.Util.lf("Run code when the program starts"),
                url: '/blocks/on-start',
                category: "loops",
                block: {
                    message0: pxt.Util.lf("on start %1 %2")
                }
            };
            _blockDefinitions[pxtc.PAUSE_UNTIL_TYPE] = {
                name: pxt.Util.lf("pause until"),
                tooltip: pxt.Util.lf("Pause execution of code until the given boolean expression is true"),
                url: '/blocks/pause-until',
                category: "loops",
                block: {
                    message0: pxt.Util.lf("pause until %1")
                }
            };
            _blockDefinitions[pxtc.TS_BREAK_TYPE] = {
                name: pxt.Util.lf("break"),
                tooltip: pxt.Util.lf("Break out of the current loop or switch"),
                url: '/blocks/loops/break',
                category: 'loops',
                block: {
                    message0: pxt.Util.lf("break")
                }
            };
            _blockDefinitions[pxtc.TS_CONTINUE_TYPE] = {
                name: pxt.Util.lf("continue"),
                tooltip: pxt.Util.lf("Skip current iteration and continues with the next iteration in the loop"),
                url: '/blocks/loops/continue',
                category: 'loops',
                block: {
                    message0: pxt.Util.lf("continue")
                }
            };
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var BrowserUtils;
    (function (BrowserUtils) {
        function isIFrame() {
            try {
                return window && window.self !== window.top;
            }
            catch (e) {
                return true;
            }
        }
        BrowserUtils.isIFrame = isIFrame;
        function hasNavigator() {
            return typeof navigator !== "undefined";
        }
        BrowserUtils.hasNavigator = hasNavigator;
        function isWindows() {
            return hasNavigator() && /(Win32|Win64|WOW64)/i.test(navigator.platform);
        }
        BrowserUtils.isWindows = isWindows;
        function isWindows10() {
            return hasNavigator() && /(Win32|Win64|WOW64)/i.test(navigator.platform) && /Windows NT 10/i.test(navigator.userAgent);
        }
        BrowserUtils.isWindows10 = isWindows10;
        function isMobile() {
            return hasNavigator() && /mobi/i.test(navigator.userAgent);
        }
        BrowserUtils.isMobile = isMobile;
        function isIOS() {
            return hasNavigator() && /iPad|iPhone|iPod/.test(navigator.userAgent);
        }
        BrowserUtils.isIOS = isIOS;
        //MacIntel on modern Macs
        function isMac() {
            return hasNavigator() && /Mac/i.test(navigator.platform);
        }
        BrowserUtils.isMac = isMac;
        //This is generally appears for Linux
        //Android *sometimes* returns this
        function isLinux() {
            return !!navigator && /Linux/i.test(navigator.platform);
        }
        BrowserUtils.isLinux = isLinux;
        // Detects if we are running on ARM (Raspberry pi)
        function isARM() {
            return hasNavigator() && /arm/i.test(navigator.platform);
        }
        BrowserUtils.isARM = isARM;
        // Detects if we are running inside the UWP runtime (Microsoft Edge)
        function isUwpEdge() {
            return typeof window !== "undefined" && !!window.Windows;
        }
        BrowserUtils.isUwpEdge = isUwpEdge;
        /*
        Notes on browser detection
    
        Actually:             Claims to be:
                              IE  MicrosoftEdge    Chrome  Safari  Firefox
                  IE          X                           X?
        Microsoft Edge                    X       X       X
                  Chrome                          X       X
                  Safari                                  X       X
                  Firefox                                         X
    
        I allow Opera to go about claiming to be Chrome because it might as well be
        */
        //Microsoft Edge lies about its user agent and claims to be Chrome, but Microsoft Edge/Version
        //is always at the end
        function isEdge() {
            return hasNavigator() && /Edge/i.test(navigator.userAgent);
        }
        BrowserUtils.isEdge = isEdge;
        //IE11 also lies about its user agent, but has Trident appear somewhere in
        //the user agent. Detecting the different between IE11 and Microsoft Edge isn't
        //super-important because the UI is similar enough
        function isIE() {
            return hasNavigator() && /Trident/i.test(navigator.userAgent);
        }
        BrowserUtils.isIE = isIE;
        //Microsoft Edge and IE11 lie about being Chrome
        function isChrome() {
            return !isEdge() && !isIE() && !!navigator && (/Chrome/i.test(navigator.userAgent) || /Chromium/i.test(navigator.userAgent));
        }
        BrowserUtils.isChrome = isChrome;
        //Chrome and Microsoft Edge lie about being Safari
        function isSafari() {
            //Could also check isMac but I don't want to risk excluding iOS
            //Checking for iPhone, iPod or iPad as well as Safari in order to detect home screen browsers on iOS
            return !isChrome() && !isEdge() && !!navigator && /(Macintosh|Safari|iPod|iPhone|iPad)/i.test(navigator.userAgent);
        }
        BrowserUtils.isSafari = isSafari;
        //Safari and WebKit lie about being Firefox
        function isFirefox() {
            return !isSafari() && !!navigator && (/Firefox/i.test(navigator.userAgent) || /Seamonkey/i.test(navigator.userAgent));
        }
        BrowserUtils.isFirefox = isFirefox;
        //These days Opera's core is based on Chromium so we shouldn't distinguish between them too much
        function isOpera() {
            return hasNavigator() && /Opera|OPR/i.test(navigator.userAgent);
        }
        BrowserUtils.isOpera = isOpera;
        //Midori *was* the default browser on Raspbian, however isn't any more
        function isMidori() {
            return hasNavigator() && /Midori/i.test(navigator.userAgent);
        }
        BrowserUtils.isMidori = isMidori;
        //Epiphany (code name for GNOME Web) is the default browser on Raspberry Pi
        //Epiphany also lies about being Chrome, Safari, and Chromium
        function isEpiphany() {
            return hasNavigator() && /Epiphany/i.test(navigator.userAgent);
        }
        BrowserUtils.isEpiphany = isEpiphany;
        function isTouchEnabled() {
            return typeof window !== "undefined" &&
                ('ontouchstart' in window // works on most browsers
                    || (navigator && navigator.maxTouchPoints > 0)); // works on IE10/11 and Surface);
        }
        BrowserUtils.isTouchEnabled = isTouchEnabled;
        function isPxtElectron() {
            return typeof window != "undefined" && !!window.pxtElectron;
        }
        BrowserUtils.isPxtElectron = isPxtElectron;
        function isIpcRenderer() {
            return typeof window != "undefined" && !!window.ipcRenderer;
        }
        BrowserUtils.isIpcRenderer = isIpcRenderer;
        function isElectron() {
            return isPxtElectron() || isIpcRenderer();
        }
        BrowserUtils.isElectron = isElectron;
        function isLocalHost() {
            try {
                return typeof window !== "undefined"
                    && /^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(window.location.href)
                    && !/nolocalhost=1/.test(window.location.href)
                    && !(pxt.webConfig && pxt.webConfig.isStatic);
            }
            catch (e) {
                return false;
            }
        }
        BrowserUtils.isLocalHost = isLocalHost;
        function isLocalHostDev() {
            return isLocalHost() && !isElectron();
        }
        BrowserUtils.isLocalHostDev = isLocalHostDev;
        function hasPointerEvents() {
            return typeof window != "undefined" && !!window.PointerEvent;
        }
        BrowserUtils.hasPointerEvents = hasPointerEvents;
        function hasSaveAs() {
            return isEdge() || isIE() || isFirefox();
        }
        BrowserUtils.hasSaveAs = hasSaveAs;
        function os() {
            if (isWindows())
                return "windows";
            else if (isMac())
                return "mac";
            else if (isLinux() && isARM())
                return "rpi";
            else if (isLinux())
                return "linux";
            else
                return "unknown";
        }
        BrowserUtils.os = os;
        function browser() {
            if (isEdge())
                return "edge";
            if (isEpiphany())
                return "epiphany";
            else if (isMidori())
                return "midori";
            else if (isOpera())
                return "opera";
            else if (isIE())
                return "ie";
            else if (isChrome())
                return "chrome";
            else if (isSafari())
                return "safari";
            else if (isFirefox())
                return "firefox";
            else
                return "unknown";
        }
        BrowserUtils.browser = browser;
        function browserVersion() {
            if (!hasNavigator())
                return null;
            //Unsurprisingly browsers also lie about this and include other browser versions...
            var matches = [];
            if (isOpera()) {
                matches = /(Opera|OPR)\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            if (isEpiphany()) {
                matches = /Epiphany\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isMidori()) {
                matches = /Midori\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isSafari()) {
                matches = /Version\/([0-9\.]+)/i.exec(navigator.userAgent);
                // pinned web sites and WKWebview for embedded browsers have a different user agent
                // Mozilla/5.0 (iPhone; CPU iPhone OS 10_2_1 like Mac OS X) AppleWebKit/602.4.6 (KHTML, like Gecko) Mobile/14D27
                // Mozilla/5.0 (iPad; CPU OS 10_3_3 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60
                // Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/605.1.15 (KHTML, like Gecko)
                if (!matches)
                    matches = /(Macintosh|iPod|iPhone|iPad); (CPU|Intel).*?OS (X )?(\d+)/i.exec(navigator.userAgent);
            }
            else if (isChrome()) {
                matches = /(Chrome|Chromium)\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isEdge()) {
                matches = /Edge\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isIE()) {
                matches = /(MSIE |rv:)([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else {
                matches = /(Firefox|Seamonkey)\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            if (!matches || matches.length == 0) {
                return null;
            }
            return matches[matches.length - 1];
        }
        BrowserUtils.browserVersion = browserVersion;
        var hasLoggedBrowser = false;
        function isBrowserSupported() {
            if (!navigator) {
                return true; //All browsers define this, but we can't make any predictions if it isn't defined, so assume the best
            }
            // allow bots in general
            if (/bot|crawler|spider|crawling/i.test(navigator.userAgent))
                return true;
            //Check target theme to see if this browser is supported
            if (pxt.appTarget.unsupportedBrowsers && pxt.appTarget.unsupportedBrowsers.some(function (b) { return b.id == browser(); })) {
                return false;
            }
            // testing browser versions
            var versionString = browserVersion();
            var v = parseInt(versionString || "0");
            var isRecentChrome = isChrome() && v >= 38;
            var isRecentFirefox = isFirefox() && v >= 31;
            var isRecentEdge = isEdge();
            var isRecentSafari = isSafari() && v >= 9;
            var isRecentOpera = (isOpera() && isChrome()) && v >= 21;
            var isRecentIE = isIE() && v >= 11;
            var isModernBrowser = isRecentChrome || isRecentFirefox || isRecentEdge || isRecentSafari || isRecentOpera || isRecentIE;
            //In the future this should check for the availability of features, such
            //as web workers
            var isSupported = isModernBrowser;
            var isUnsupportedRPI = isMidori() || (isLinux() && isARM() && isEpiphany());
            var isNotSupported = isUnsupportedRPI;
            isSupported = isSupported && !isNotSupported;
            //Bypass
            isSupported = isSupported || /anybrowser=(true|1)/.test(window.location.href);
            if (!hasLoggedBrowser) {
                pxt.log("Browser: " + browser() + " " + versionString + " on " + os());
                if (!isSupported) {
                    pxt.tickEvent("browser.unsupported", { useragent: navigator.userAgent });
                }
                hasLoggedBrowser = true;
            }
            return isSupported;
        }
        BrowserUtils.isBrowserSupported = isBrowserSupported;
        function devicePixelRatio() {
            if (typeof window === "undefined" || !window.screen)
                return 1;
            if (window.screen.systemXDPI !== undefined
                && window.screen.logicalXDPI !== undefined
                && window.screen.systemXDPI > window.screen.logicalXDPI) {
                return window.screen.systemXDPI / window.screen.logicalXDPI;
            }
            else if (window && window.devicePixelRatio !== undefined) {
                return window.devicePixelRatio;
            }
            return 1;
        }
        BrowserUtils.devicePixelRatio = devicePixelRatio;
        function browserDownloadBinText(text, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            return browserDownloadBase64(ts.pxtc.encodeBase64(text), name, contentType, userContextWindow, onError);
        }
        BrowserUtils.browserDownloadBinText = browserDownloadBinText;
        function browserDownloadText(text, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            return browserDownloadBase64(ts.pxtc.encodeBase64(pxt.Util.toUTF8(text)), name, contentType, userContextWindow, onError);
        }
        BrowserUtils.browserDownloadText = browserDownloadText;
        function isBrowserDownloadInSameWindow() {
            var windowOpen = isMobile() && isSafari() && !/downloadWindowOpen=0/i.test(window.location.href);
            return windowOpen;
        }
        BrowserUtils.isBrowserDownloadInSameWindow = isBrowserDownloadInSameWindow;
        // for browsers that strictly require that a download gets initiated within a user click
        function isBrowserDownloadWithinUserContext() {
            var versionString = browserVersion();
            var v = parseInt(versionString || "0");
            var r = (isMobile() && isSafari() && v >= 11) || /downloadUserContext=1/i.test(window.location.href);
            return r;
        }
        BrowserUtils.isBrowserDownloadWithinUserContext = isBrowserDownloadWithinUserContext;
        function browserDownloadDataUri(uri, name, userContextWindow) {
            var windowOpen = isBrowserDownloadInSameWindow();
            var versionString = browserVersion();
            var v = parseInt(versionString || "0");
            if (windowOpen) {
                if (userContextWindow)
                    userContextWindow.location.href = uri;
                else
                    window.open(uri, "_self");
            }
            else if (pxt.BrowserUtils.isSafari()
                && (v < 10 || (versionString.indexOf('10.0') == 0) || isMobile())) {
                // For Safari versions prior to 10.1 and all Mobile Safari versions
                // For mysterious reasons, the "link" trick closes the
                // PouchDB database
                var iframe = document.getElementById("downloader");
                if (!iframe) {
                    pxt.debug('injecting downloader iframe');
                    iframe = document.createElement("iframe");
                    iframe.id = "downloader";
                    iframe.style.position = "absolute";
                    iframe.style.right = "0";
                    iframe.style.bottom = "0";
                    iframe.style.zIndex = "-1";
                    iframe.style.width = "1px";
                    iframe.style.height = "1px";
                    document.body.appendChild(iframe);
                }
                iframe.src = uri;
            }
            else if (pxt.BrowserUtils.isEdge() || pxt.BrowserUtils.isIE()) {
                //Fix for edge
                var byteString = atob(uri.split(',')[1]);
                var ia = pxt.Util.stringToUint8Array(byteString);
                var blob = new Blob([ia], { type: "img/png" });
                window.navigator.msSaveOrOpenBlob(blob, name);
            }
            else {
                var link = window.document.createElement('a');
                if (typeof link.download == "string") {
                    link.href = uri;
                    link.download = name;
                    document.body.appendChild(link); // for FF
                    link.click();
                    document.body.removeChild(link);
                }
                else {
                    document.location.href = uri;
                }
            }
        }
        BrowserUtils.browserDownloadDataUri = browserDownloadDataUri;
        function browserDownloadUInt8Array(buf, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            return browserDownloadBase64(ts.pxtc.encodeBase64(pxt.Util.uint8ArrayToString(buf)), name, contentType, userContextWindow, onError);
        }
        BrowserUtils.browserDownloadUInt8Array = browserDownloadUInt8Array;
        function toDownloadDataUri(b64, contentType) {
            var protocol = "data";
            if (isMobile() && isSafari() && pxt.appTarget.appTheme.mobileSafariDownloadProtocol)
                protocol = pxt.appTarget.appTheme.mobileSafariDownloadProtocol;
            var m = /downloadProtocol=([a-z0-9:/?]+)/i.exec(window.location.href);
            if (m)
                protocol = m[1];
            var dataurl = protocol + ":" + contentType + ";base64," + b64;
            return dataurl;
        }
        BrowserUtils.toDownloadDataUri = toDownloadDataUri;
        function browserDownloadBase64(b64, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            pxt.debug('trigger download');
            var saveBlob = window.navigator.msSaveOrOpenBlob && !pxt.BrowserUtils.isMobile();
            var dataurl = toDownloadDataUri(b64, name);
            try {
                if (saveBlob) {
                    var b = new Blob([pxt.Util.stringToUint8Array(atob(b64))], { type: contentType });
                    var result = window.navigator.msSaveOrOpenBlob(b, name);
                }
                else
                    browserDownloadDataUri(dataurl, name, userContextWindow);
            }
            catch (e) {
                if (onError)
                    onError(e);
                pxt.debug("saving failed");
            }
            return dataurl;
        }
        BrowserUtils.browserDownloadBase64 = browserDownloadBase64;
        function loadImageAsync(data) {
            var img = document.createElement("img");
            return new Promise(function (resolve, reject) {
                img.onload = function () { return resolve(img); };
                img.onerror = function () { return resolve(undefined); };
                img.crossOrigin = "anonymous";
                img.src = data;
            });
        }
        BrowserUtils.loadImageAsync = loadImageAsync;
        function loadCanvasAsync(url) {
            return loadImageAsync(url)
                .then(function (img) {
                var canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                return canvas;
            });
        }
        BrowserUtils.loadCanvasAsync = loadCanvasAsync;
        function imageDataToPNG(img) {
            if (!img)
                return undefined;
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.putImageData(img, 0, 0);
            return canvas.toDataURL("image/png");
        }
        BrowserUtils.imageDataToPNG = imageDataToPNG;
        function resolveCdnUrl(path) {
            // don't expand full urls
            if (/^https?:\/\//i.test(path))
                return path;
            var monacoPaths = window.MonacoPaths || {};
            var blobPath = monacoPaths[path];
            // find compute blob url
            if (blobPath)
                return blobPath;
            // might have been exanded already
            if (pxt.U.startsWith(path, pxt.webConfig.commitCdnUrl))
                return path;
            // append CDN
            return pxt.webConfig.commitCdnUrl + path;
        }
        BrowserUtils.resolveCdnUrl = resolveCdnUrl;
        function loadStyleAsync(path, rtl) {
            if (rtl)
                path = "rtl" + path;
            var id = "style-" + path;
            if (document.getElementById(id))
                return Promise.resolve();
            var url = resolveCdnUrl(path);
            var links = pxt.Util.toArray(document.head.getElementsByTagName("link"));
            var link = links.filter(function (l) { return l.getAttribute("href") == url; })[0];
            if (link) {
                if (!link.id)
                    link.id = id;
                return Promise.resolve();
            }
            return new Promise(function (resolve, reject) {
                var el = document.createElement("link");
                el.href = url;
                el.rel = "stylesheet";
                el.type = "text/css";
                el.id = id;
                el.addEventListener('load', function () { return resolve(); });
                el.addEventListener('error', function (e) { return reject(e); });
                document.head.appendChild(el);
            });
        }
        BrowserUtils.loadStyleAsync = loadStyleAsync;
        var loadScriptPromises = {};
        function loadScriptAsync(path) {
            var url = resolveCdnUrl(path);
            var p = loadScriptPromises[url];
            if (!p) {
                p = loadScriptPromises[url] = new Promise(function (resolve, reject) {
                    pxt.debug("script: loading " + url);
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.addEventListener('load', function () { return resolve(); });
                    script.addEventListener('error', function (e) {
                        // might have had connection issue, allow to try later
                        delete loadScriptPromises[url];
                        reject(e);
                    });
                    script.src = url;
                    script.async = true;
                    document.body.appendChild(script);
                });
            }
            return p;
        }
        BrowserUtils.loadScriptAsync = loadScriptAsync;
        function loadAjaxAsync(url) {
            return new Promise(function (resolve, reject) {
                var httprequest = new XMLHttpRequest();
                httprequest.onreadystatechange = function () {
                    if (httprequest.readyState == XMLHttpRequest.DONE) {
                        if (httprequest.status == 200) {
                            resolve(httprequest.responseText);
                        }
                        else {
                            reject(httprequest.status);
                        }
                    }
                };
                httprequest.open("GET", url, true);
                httprequest.send();
            });
        }
        BrowserUtils.loadAjaxAsync = loadAjaxAsync;
        var loadBlocklyPromise;
        function loadBlocklyAsync() {
            if (!loadBlocklyPromise) {
                pxt.debug("blockly: delay load");
                var p = pxt.BrowserUtils.loadStyleAsync("blockly.css", ts.pxtc.Util.isUserLanguageRtl());
                // js not loaded yet?
                if (typeof Blockly === "undefined")
                    p = p.then(function () { return pxt.BrowserUtils.loadScriptAsync("pxtblockly.js"); });
                p = p.then(function () {
                    pxt.debug("blockly: loaded");
                });
                loadBlocklyPromise = p;
            }
            return loadBlocklyPromise;
        }
        BrowserUtils.loadBlocklyAsync = loadBlocklyAsync;
        function patchCdn(url) {
            if (!url)
                return url;
            var online = pxt.getOnlineCdnUrl();
            if (online)
                return url.replace("@cdnUrl@", online);
            else
                return url.replace(/@cdnUrl@\/(blob|commit)\/[a-f0-9]{40}\//, "./");
        }
        BrowserUtils.patchCdn = patchCdn;
        function initTheme() {
            var theme = pxt.appTarget.appTheme;
            if (theme) {
                if (theme.accentColor) {
                    var style = document.createElement('style');
                    style.type = 'text/css';
                    style.appendChild(document.createTextNode(".ui.accent { color: " + theme.accentColor + "; }\n                .ui.inverted.menu .accent.active.item, .ui.inverted.accent.menu  { background-color: " + theme.accentColor + "; }"));
                    document.getElementsByTagName('head')[0].appendChild(style);
                }
            }
            // RTL languages
            if (pxt.Util.isUserLanguageRtl()) {
                pxt.debug("rtl layout");
                pxt.BrowserUtils.addClass(document.body, "rtl");
                document.body.style.direction = "rtl";
                // replace semantic.css with rtlsemantic.css
                var links = pxt.Util.toArray(document.head.getElementsByTagName("link"));
                var semanticLink = links.filter(function (l) { return pxt.Util.endsWith(l.getAttribute("href"), "semantic.css"); })[0];
                if (semanticLink) {
                    var semanticHref = semanticLink.getAttribute("data-rtl");
                    if (semanticHref) {
                        pxt.debug("swapping to " + semanticHref);
                        semanticLink.setAttribute("href", semanticHref);
                    }
                }
                // replace blockly.css with rtlblockly.css if possible
                var blocklyLink = links.filter(function (l) { return pxt.Util.endsWith(l.getAttribute("href"), "blockly.css"); })[0];
                if (blocklyLink) {
                    var blocklyHref = blocklyLink.getAttribute("data-rtl");
                    if (blocklyHref) {
                        pxt.debug("swapping to " + blocklyHref);
                        blocklyLink.setAttribute("href", blocklyHref);
                        blocklyLink.removeAttribute("data-rtl");
                    }
                }
            }
        }
        BrowserUtils.initTheme = initTheme;
        /**
         * Utility method to change the hash.
         * Pass keepHistory to retain an entry of the change in the browser history.
         */
        function changeHash(hash, keepHistory) {
            if (hash.charAt(0) != '#')
                hash = '#' + hash;
            if (keepHistory) {
                window.location.hash = hash;
            }
            else {
                window.history.replaceState('', '', hash);
            }
        }
        BrowserUtils.changeHash = changeHash;
        /**
         * Simple utility method to join urls.
         */
        function urlJoin(urlPath1, urlPath2) {
            if (!urlPath1)
                return urlPath2;
            if (!urlPath2)
                return urlPath1;
            var normalizedUrl1 = (urlPath1.indexOf('/') == urlPath1.length - 1) ?
                urlPath1.substring(0, urlPath1.length - 1) : urlPath1;
            var normalizedUrl2 = (urlPath2.indexOf('/') == 0) ?
                urlPath2.substring(1) : urlPath2;
            return normalizedUrl1 + "/" + normalizedUrl2;
        }
        BrowserUtils.urlJoin = urlJoin;
        /**
         * Simple utility method to join multiple urls.
         */
        function joinURLs() {
            var parts = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                parts[_i] = arguments[_i];
            }
            var result;
            if (parts) {
                for (var i = 0; i < parts.length; i++) {
                    result = urlJoin(result, parts[i]);
                }
            }
            return result;
        }
        BrowserUtils.joinURLs = joinURLs;
        function storageEstimateAsync() {
            var nav = hasNavigator() && window.navigator;
            if (nav && nav.storage && nav.storage.estimate)
                return nav.storage.estimate();
            else
                return Promise.resolve({});
        }
        BrowserUtils.storageEstimateAsync = storageEstimateAsync;
        BrowserUtils.scheduleStorageCleanup = hasNavigator() && navigator.storage && navigator.storage.estimate // some browser don't support this
            ? ts.pxtc.Util.throttle(function () {
                var MIN_QUOTA = 1000000; // 1Mb
                var MAX_USAGE_RATIO = 0.9; // max 90%
                storageEstimateAsync()
                    .then(function (estimate) {
                    // quota > 50%
                    pxt.debug("storage estimate: " + ((estimate.usage / estimate.quota * 100) >> 0) + "%, " + ((estimate.usage / 1000000) >> 0) + "/" + ((estimate.quota / 1000000) >> 0) + "Mb");
                    if (estimate.quota
                        && estimate.usage
                        && estimate.quota > MIN_QUOTA
                        && (estimate.usage / estimate.quota) > MAX_USAGE_RATIO) {
                        pxt.log("quota usage exceeded, clearing translations");
                        pxt.tickEvent('storage.cleanup');
                        return clearTranslationDbAsync();
                    }
                    return Promise.resolve();
                })
                    .catch(function (e) {
                    pxt.reportException(e);
                });
            }, 10000, false)
            : function () { };
        function stressTranslationsAsync() {
            var md = "...";
            for (var i = 0; i < 16; ++i)
                md += md + Math.random();
            console.log("adding entry " + md.length * 2 + " bytes");
            return Promise.delay(1)
                .then(function () { return translationDbAsync(); })
                .then(function (db) { return db.setAsync("foobar", Math.random().toString(), "", null, undefined, md); })
                .then(function () { return pxt.BrowserUtils.storageEstimateAsync(); })
                .then(function (estimate) { return !estimate.quota || estimate.usage / estimate.quota < 0.8 ? stressTranslationsAsync() : Promise.resolve(); });
        }
        BrowserUtils.stressTranslationsAsync = stressTranslationsAsync;
        var MemTranslationDb = /** @class */ (function () {
            function MemTranslationDb() {
                this.translations = {};
            }
            MemTranslationDb.prototype.key = function (lang, filename, branch) {
                return lang + "|" + filename + "|" + (branch || "master");
            };
            MemTranslationDb.prototype.get = function (lang, filename, branch) {
                return this.translations[this.key(lang, filename, branch)];
            };
            MemTranslationDb.prototype.getAsync = function (lang, filename, branch) {
                return Promise.resolve(this.get(lang, filename, branch));
            };
            MemTranslationDb.prototype.set = function (lang, filename, branch, etag, strings, md) {
                this.translations[this.key(lang, filename, branch)] = {
                    etag: etag,
                    time: Date.now() + 24 * 60 * 60 * 1000,
                    strings: strings,
                    md: md
                };
            };
            MemTranslationDb.prototype.setAsync = function (lang, filename, branch, etag, strings, md) {
                this.set(lang, filename, branch, etag, strings);
                return Promise.resolve();
            };
            MemTranslationDb.prototype.clearAsync = function () {
                this.translations = {};
                return Promise.resolve();
            };
            return MemTranslationDb;
        }());
        var IDBWrapper = /** @class */ (function () {
            function IDBWrapper(name, version, upgradeHandler, quotaExceededHandler) {
                this.name = name;
                this.version = version;
                this.upgradeHandler = upgradeHandler;
                this.quotaExceededHandler = quotaExceededHandler;
            }
            IDBWrapper.prototype.throwIfNotOpened = function () {
                if (!this._db) {
                    throw new Error("Database not opened; call IDBWrapper.openAsync() first");
                }
            };
            IDBWrapper.prototype.errorHandler = function (err, op, reject) {
                console.error(new Error(this.name + " IDBWrapper error for " + op + ": " + err.message));
                reject(err);
                // special case for quota exceeded
                if (err.name == "QuotaExceededError") {
                    // oops, we ran out of space
                    pxt.log("storage quota exceeded...");
                    pxt.tickEvent('storage.quotaexceedederror');
                    if (this.quotaExceededHandler)
                        this.quotaExceededHandler();
                }
            };
            IDBWrapper.prototype.getObjectStore = function (name, mode) {
                if (mode === void 0) { mode = "readonly"; }
                this.throwIfNotOpened();
                var transaction = this._db.transaction([name], mode);
                return transaction.objectStore(name);
            };
            IDBWrapper.deleteDatabaseAsync = function (name) {
                return new Promise(function (resolve, reject) {
                    var idbFactory = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
                    var request = idbFactory.deleteDatabase(name);
                    request.onsuccess = function () { return resolve(); };
                    request.onerror = function () { return reject(request.error); };
                });
            };
            IDBWrapper.prototype.openAsync = function () {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var idbFactory = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
                    var request = idbFactory.open(_this.name, _this.version);
                    request.onsuccess = function () {
                        _this._db = request.result;
                        resolve();
                    };
                    request.onerror = function () { return _this.errorHandler(request.error, "open", reject); };
                    request.onupgradeneeded = function (ev) { return _this.upgradeHandler(ev, request); };
                });
            };
            IDBWrapper.prototype.getAsync = function (storeName, id) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var store = _this.getObjectStore(storeName);
                    var request = store.get(id);
                    request.onsuccess = function () { return resolve(request.result); };
                    request.onerror = function () { return _this.errorHandler(request.error, "get", reject); };
                });
            };
            IDBWrapper.prototype.getAllAsync = function (storeName) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var store = _this.getObjectStore(storeName);
                    var cursor = store.openCursor();
                    var data = [];
                    cursor.onsuccess = function () {
                        if (cursor.result) {
                            data.push(cursor.result.value);
                            cursor.result.continue();
                        }
                        else {
                            resolve(data);
                        }
                    };
                    cursor.onerror = function () { return _this.errorHandler(cursor.error, "getAll", reject); };
                });
            };
            IDBWrapper.prototype.setAsync = function (storeName, data) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var store = _this.getObjectStore(storeName, "readwrite");
                    var request;
                    if (typeof data.id !== "undefined" && data.id !== null) {
                        request = store.put(data);
                    }
                    else {
                        request = store.add(data);
                    }
                    request.onsuccess = function () { return resolve(); };
                    request.onerror = function () { return _this.errorHandler(request.error, "set", reject); };
                });
            };
            IDBWrapper.prototype.deleteAsync = function (storeName, id) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var store = _this.getObjectStore(storeName, "readwrite");
                    var request = store.delete(id);
                    request.onsuccess = function () { return resolve(); };
                    request.onerror = function () { return _this.errorHandler(request.error, "delete", reject); };
                });
            };
            IDBWrapper.prototype.deleteAllAsync = function (storeName) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var store = _this.getObjectStore(storeName, "readwrite");
                    var request = store.clear();
                    request.onsuccess = function () { return resolve(); };
                    request.onerror = function () { return _this.errorHandler(request.error, "deleteAll", reject); };
                });
            };
            return IDBWrapper;
        }());
        BrowserUtils.IDBWrapper = IDBWrapper;
        var IndexedDbTranslationDb = /** @class */ (function () {
            function IndexedDbTranslationDb(db) {
                this.db = db;
                this.mem = new MemTranslationDb();
            }
            IndexedDbTranslationDb.dbName = function () {
                return "__pxt_translations_" + (pxt.appTarget.id || "");
            };
            IndexedDbTranslationDb.createAsync = function () {
                function openAsync() {
                    var idbWrapper = new IDBWrapper(IndexedDbTranslationDb.dbName(), 2, function (ev, r) {
                        var db = r.result;
                        db.createObjectStore(IndexedDbTranslationDb.TABLE, { keyPath: IndexedDbTranslationDb.KEYPATH });
                    }, function () {
                        // quota exceeeded, nuke db
                        clearTranslationDbAsync().catch(function (e) { });
                    });
                    return idbWrapper.openAsync()
                        .then(function () { return new IndexedDbTranslationDb(idbWrapper); });
                }
                return openAsync()
                    .catch(function (e) {
                    console.log("db: failed to open database, try delete entire store...");
                    return IDBWrapper.deleteDatabaseAsync(IndexedDbTranslationDb.dbName())
                        .then(function () { return openAsync(); });
                });
            };
            IndexedDbTranslationDb.prototype.getAsync = function (lang, filename, branch) {
                var _this = this;
                lang = (lang || "en-US").toLowerCase(); // normalize locale
                var id = this.mem.key(lang, filename, branch);
                var r = this.mem.get(lang, filename, branch);
                if (r)
                    return Promise.resolve(r);
                return this.db.getAsync(IndexedDbTranslationDb.TABLE, id)
                    .then(function (res) {
                    if (res) {
                        // store in-memory so that we don't try to download again
                        _this.mem.set(lang, filename, branch, res.etag, res.strings);
                        return Promise.resolve(res);
                    }
                    return Promise.resolve(undefined);
                })
                    .catch(function (e) {
                    return Promise.resolve(undefined);
                });
            };
            IndexedDbTranslationDb.prototype.setAsync = function (lang, filename, branch, etag, strings, md) {
                var _this = this;
                lang = (lang || "en-US").toLowerCase(); // normalize locale
                var id = this.mem.key(lang, filename, branch);
                this.mem.set(lang, filename, branch, etag, strings, md);
                if (strings)
                    Object.keys(strings).filter(function (k) { return !strings[k]; }).forEach(function (k) { return delete strings[k]; });
                var entry = {
                    id: id,
                    etag: etag,
                    time: Date.now(),
                    strings: strings,
                    md: md
                };
                return this.db.setAsync(IndexedDbTranslationDb.TABLE, entry)
                    .finally(function () { return BrowserUtils.scheduleStorageCleanup(); }) // schedule a cleanpu
                    .catch(function (e) {
                    console.log("db: set failed (" + e.message + "), recycling...");
                    return _this.clearAsync();
                });
            };
            IndexedDbTranslationDb.prototype.clearAsync = function () {
                return this.db.deleteAllAsync(IndexedDbTranslationDb.TABLE)
                    .then(function () { return console.debug("db: all clean"); })
                    .catch(function (e) {
                    console.error('db: failed to delete all');
                });
            };
            IndexedDbTranslationDb.TABLE = "files";
            IndexedDbTranslationDb.KEYPATH = "id";
            return IndexedDbTranslationDb;
        }());
        // wired up in the app to store translations in pouchdb. MAY BE UNDEFINED!
        var _translationDbPromise;
        function translationDbAsync() {
            if (pxt.Util.isNodeJS)
                return Promise.resolve(new MemTranslationDb());
            // try indexed db
            if (!_translationDbPromise)
                _translationDbPromise = IndexedDbTranslationDb.createAsync()
                    .catch(function () { return new MemTranslationDb(); });
            return _translationDbPromise;
        }
        BrowserUtils.translationDbAsync = translationDbAsync;
        function clearTranslationDbAsync() {
            function deleteDbAsync() {
                var n = IndexedDbTranslationDb.dbName();
                return IDBWrapper.deleteDatabaseAsync(n)
                    .then(function () {
                    _translationDbPromise = undefined;
                })
                    .catch(function (e) {
                    pxt.log("db: failed to delete " + n);
                    _translationDbPromise = undefined;
                });
            }
            if (!_translationDbPromise)
                return deleteDbAsync();
            return _translationDbPromise
                .then(function (db) { return db.clearAsync(); })
                .catch(function (e) { return deleteDbAsync().done(); });
        }
        BrowserUtils.clearTranslationDbAsync = clearTranslationDbAsync;
        BrowserUtils.pointerEvents = (function () {
            if (hasPointerEvents()) {
                return {
                    up: "pointerup",
                    down: ["pointerdown"],
                    move: "pointermove",
                    enter: "pointerenter",
                    leave: "pointerleave"
                };
            }
            else if (isTouchEnabled()) {
                return {
                    up: "mouseup",
                    down: ["mousedown", "touchstart"],
                    move: "touchmove",
                    enter: "touchenter",
                    leave: "touchend"
                };
            }
            else {
                return {
                    up: "mouseup",
                    down: ["mousedown"],
                    move: "mousemove",
                    enter: "mouseenter",
                    leave: "mouseleave"
                };
            }
        })();
        function popupWindow(url, title, popUpWidth, popUpHeight) {
            try {
                var winLeft = window.screenLeft ? window.screenLeft : window.screenX;
                var winTop = window.screenTop ? window.screenTop : window.screenY;
                var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
                var left = ((width / 2) - (popUpWidth / 2)) + winLeft;
                var top_1 = ((height / 2) - (popUpHeight / 2)) + winTop;
                var popupWindow_1 = window.open(url, title, "width=" + popUpWidth + ", height=" + popUpHeight + ", top=" + top_1 + ", left=" + left);
                if (popupWindow_1.focus) {
                    popupWindow_1.focus();
                }
                return popupWindow_1;
            }
            catch (e) {
                // Error opening popup
                pxt.tickEvent('pxt.popupError', { url: url, msg: e.message });
                return null;
            }
        }
        BrowserUtils.popupWindow = popupWindow;
        // Keep these helpers unified with pxtsim/runtime.ts
        function containsClass(el, classes) {
            return classes
                .split(/\s+/)
                .every(function (cls) { return containsSingleClass(el, cls); });
            function containsSingleClass(el, cls) {
                if (el.classList) {
                    return el.classList.contains(cls);
                }
                else {
                    var classes_1 = (el.className + "").split(/\s+/);
                    return !(classes_1.indexOf(cls) < 0);
                }
            }
        }
        BrowserUtils.containsClass = containsClass;
        function addClass(el, classes) {
            classes
                .split(/\s+/)
                .forEach(function (cls) { return addSingleClass(el, cls); });
            function addSingleClass(el, cls) {
                if (el.classList) {
                    el.classList.add(cls);
                }
                else {
                    var classes_2 = (el.className + "").split(/\s+/);
                    if (classes_2.indexOf(cls) < 0) {
                        el.className.baseVal += " " + cls;
                    }
                }
            }
        }
        BrowserUtils.addClass = addClass;
        function removeClass(el, classes) {
            classes
                .split(/\s+/)
                .forEach(function (cls) { return removeSingleClass(el, cls); });
            function removeSingleClass(el, cls) {
                if (el.classList) {
                    el.classList.remove(cls);
                }
                else {
                    el.className.baseVal = (el.className + "")
                        .split(/\s+/)
                        .filter(function (c) { return c != cls; })
                        .join(" ");
                }
            }
        }
        BrowserUtils.removeClass = removeClass;
    })(BrowserUtils = pxt.BrowserUtils || (pxt.BrowserUtils = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var commands;
    (function (commands) {
        commands.deployCoreAsync = undefined;
        commands.deployFallbackAsync = undefined;
        commands.hasDeployFn = function () { return commands.deployCoreAsync || commands.deployFallbackAsync; };
        commands.deployAsync = function (r, d) {
            return (commands.deployCoreAsync || commands.deployFallbackAsync)(r, d);
        };
        commands.patchCompileResultAsync = undefined;
        commands.browserDownloadAsync = undefined;
        commands.saveOnlyAsync = undefined;
        commands.showUploadInstructionsAsync = undefined;
        commands.saveProjectAsync = undefined;
        commands.electronDeployAsync = undefined; // A pointer to the Electron deploy function, so that targets can access it in their extension.ts
        commands.webUsbPairDialogAsync = undefined;
        commands.onTutorialCompleted = undefined;
    })(commands = pxt.commands || (pxt.commands = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtarget.d.ts"/>
var pxt;
(function (pxt) {
    var lzmaPromise;
    function getLzmaAsync() {
        var lzmaPromise;
        if (!lzmaPromise) {
            if (pxt.U.isNodeJS)
                lzmaPromise = Promise.resolve(require("lzma"));
            else
                lzmaPromise = Promise.resolve(window.LZMA);
            lzmaPromise.then(function (res) {
                if (!res)
                    pxt.reportError('lzma', 'failed to load');
                return res;
            });
        }
        return lzmaPromise;
    }
    function lzmaDecompressAsync(buf) {
        return getLzmaAsync()
            .then(function (lzma) { return new Promise(function (resolve, reject) {
            try {
                lzma.decompress(buf, function (res, error) {
                    if (error)
                        pxt.debug("lzma decompression failed");
                    resolve(error ? undefined : res);
                });
            }
            catch (e) {
                if (e)
                    pxt.debug("lzma decompression failed");
                resolve(undefined);
            }
        }); });
    }
    pxt.lzmaDecompressAsync = lzmaDecompressAsync;
    function lzmaCompressAsync(text) {
        return getLzmaAsync()
            .then(function (lzma) { return new Promise(function (resolve, reject) {
            try {
                lzma.compress(text, 7, function (res, error) {
                    if (error)
                        pxt.reportException(error);
                    resolve(error ? undefined : new Uint8Array(res));
                });
            }
            catch (e) {
                pxt.reportException(e);
                resolve(undefined);
            }
        }); });
    }
    pxt.lzmaCompressAsync = lzmaCompressAsync;
})(pxt || (pxt = {}));
// preprocess C++ file to find functions exposed to pxt
(function (pxt) {
    var cpp;
    (function (cpp) {
        var U = pxtc.Util;
        var lf = U.lf;
        function parseExpr(e) {
            e = e.trim();
            e = e.replace(/^\(/, "");
            e = e.replace(/\)$/, "");
            e = e.trim();
            if (/^-/.test(e) && parseExpr(e.slice(1)) != null)
                return -parseExpr(e.slice(1));
            if (/^0x[0-9a-f]+$/i.exec(e))
                return parseInt(e.slice(2), 16);
            if (/^0b[01]+$/i.exec(e))
                return parseInt(e.slice(2), 2);
            if (/^0\d+$/i.exec(e))
                return parseInt(e, 8);
            if (/^\d+$/i.exec(e))
                return parseInt(e, 10);
            return null;
        }
        var vmKeepFunctions = {
            "pxt::mkAction": 1,
            "pxt::dumpPerfCounters": 1,
            "pxt::deepSleep": 1,
            "pxt::getConfig": 1,
            "pxtrt::mkMap": 1,
            "pxtrt::mapSet": 1,
            "pxtrt::stclo": 1,
            "pxtrt::mklocRef": 1,
            "pxtrt::stlocRef": 1,
            "pxtrt::ldlocRef": 1,
            "pxtrt::panic": 1,
        };
        function nsWriter(nskw) {
            if (nskw === void 0) { nskw = "namespace"; }
            var text = "";
            var currNs = "";
            var setNs = function (ns, over) {
                if (over === void 0) { over = ""; }
                if (currNs == ns)
                    return;
                if (currNs)
                    text += "}\n";
                if (ns)
                    text += over || (nskw + " " + ns + " {\n");
                currNs = ns;
            };
            var indent = "    ";
            return {
                setNs: setNs,
                clear: function () {
                    text = "";
                    currNs = "";
                },
                write: function (s) {
                    if (!s.trim())
                        text += "\n";
                    else {
                        s = s.trim()
                            .replace(/^\s*/mg, indent)
                            .replace(/^(\s*)\*/mg, function (f, s) { return s + " *"; });
                        text += s + "\n";
                    }
                },
                incrIndent: function () {
                    indent += "    ";
                },
                decrIndent: function () {
                    indent = indent.slice(4);
                },
                finish: function () {
                    setNs("");
                    return text;
                }
            };
        }
        cpp.nsWriter = nsWriter;
        function parseCppInt(v) {
            if (!v)
                return null;
            v = v.trim();
            var mm = /^\((.*)\)/.exec(v);
            if (mm)
                v = mm[1];
            if (/^-?(\d+|0[xX][0-9a-fA-F]+)$/.test(v))
                return parseInt(v);
            return null;
        }
        cpp.parseCppInt = parseCppInt;
        var prevExtInfo;
        var prevSnapshot;
        var PkgConflictError = /** @class */ (function (_super) {
            __extends(PkgConflictError, _super);
            function PkgConflictError(msg) {
                var _this = _super.call(this, msg) || this;
                _this.isUserError = true;
                _this.message = msg;
                return _this;
            }
            return PkgConflictError;
        }(Error));
        cpp.PkgConflictError = PkgConflictError;
        function getExtensionInfo(mainPkg) {
            var pkgSnapshot = {};
            var constsName = "dal.d.ts";
            var sourcePath = "/source/";
            var mainDeps = mainPkg.sortedDeps(true);
            for (var _i = 0, mainDeps_1 = mainDeps; _i < mainDeps_1.length; _i++) {
                var pkg = mainDeps_1[_i];
                pkg.addSnapshot(pkgSnapshot, [constsName, ".h", ".cpp"]);
            }
            if (prevSnapshot && U.stringMapEq(pkgSnapshot, prevSnapshot)) {
                pxt.debug("Using cached extinfo");
                return prevExtInfo;
            }
            pxt.debug("Generating new extinfo");
            var res = pxtc.emptyExtInfo();
            var compileService = pxt.appTarget.compileService;
            if (!compileService)
                compileService = {
                    gittag: "none",
                    serviceId: "nocompile"
                };
            compileService = U.clone(compileService);
            var compile = pxt.appTarget.compile;
            if (!compile)
                compile = {
                    isNative: false,
                    hasHex: false,
                    switches: {}
                };
            var isPlatformio = !!compileService.platformioIni;
            var isCodal = compileService.buildEngine == "codal" || compileService.buildEngine == "dockercodal";
            var isDockerMake = compileService.buildEngine == "dockermake" || compileService.buildEngine == "dockercross";
            var isYotta = !isPlatformio && !isCodal && !isDockerMake;
            var isVM = compile.nativeType == pxtc.NATIVE_TYPE_VM;
            if (isPlatformio)
                sourcePath = "/src/";
            else if (isCodal || isDockerMake)
                sourcePath = "/pxtapp/";
            var pxtConfig = "// Configuration defines\n";
            var pointersInc = "\nPXT_SHIMS_BEGIN\n";
            var pointerIncPre = "";
            var abiInc = "";
            var includesInc = "#include \"pxt.h\"\n";
            var thisErrors = "";
            var dTsNamespace = "";
            var err = function (s) { return thisErrors += "   " + fileName + "(" + lineNo + "): " + s + "\n"; };
            var lineNo = 0;
            var fileName = "";
            var protos = nsWriter("namespace");
            var shimsDTS = nsWriter("declare namespace");
            var enumsDTS = nsWriter("declare namespace");
            var allErrors = "";
            var knownEnums = {};
            var vmVisitedFunctions = {};
            var enumVals = {
                "true": "1",
                "false": "0",
                "null": "0",
                "NULL": "0",
            };
            // we sometimes append _ to C++ names to avoid name clashes
            function toJs(name) {
                return name.trim().replace(/[\_\*]$/, "");
            }
            var makefile = "";
            for (var _a = 0, mainDeps_2 = mainDeps; _a < mainDeps_2.length; _a++) {
                var pkg = mainDeps_2[_a];
                if (pkg.getFiles().indexOf(constsName) >= 0) {
                    var src = pkg.host().readFile(pkg, constsName);
                    pxt.Util.assert(!!src, constsName + " not found in " + pkg.id);
                    src.split(/\r?\n/).forEach(function (ln) {
                        var m = /^\s*(\w+) = (.*),/.exec(ln);
                        if (m) {
                            enumVals[m[1]] = m[2];
                        }
                    });
                }
                if (!makefile && pkg.getFiles().indexOf("Makefile") >= 0) {
                    makefile = pkg.host().readFile(pkg, "Makefile");
                }
            }
            var hash_if_options = ["0", "false", "PXT_UTF8"];
            var cpp_options = {};
            if (compile.switches.boxDebug)
                cpp_options["PXT_BOX_DEBUG"] = 1;
            if (compile.gc)
                cpp_options["PXT_GC"] = 1;
            if (compile.utf8)
                cpp_options["PXT_UTF8"] = 1;
            if (compile.switches.profile)
                cpp_options["PXT_PROFILE"] = 1;
            if (compile.switches.gcDebug)
                cpp_options["PXT_GC_DEBUG"] = 1;
            if (compile.switches.numFloat)
                cpp_options["PXT_USE_FLOAT"] = 1;
            if (compile.vtableShift)
                cpp_options["PXT_VTABLE_SHIFT"] = compile.vtableShift;
            if (compile.nativeType == pxtc.NATIVE_TYPE_VM)
                cpp_options["PXT_VM"] = 1;
            function stripComments(ln) {
                return ln.replace(/\/\/.*/, "").replace(/\/\*/, "");
            }
            var enumVal = 0;
            var inEnum = false;
            var currNs = "";
            var currDocComment = "";
            var currAttrs = "";
            var inDocComment = false;
            function handleComments(ln) {
                if (inEnum)
                    return true;
                if (/^\s*\/\*\*/.test(ln)) {
                    inDocComment = true;
                    currDocComment = ln + "\n";
                    if (/\*\//.test(ln))
                        inDocComment = false;
                    return true;
                }
                if (inDocComment) {
                    currDocComment += ln + "\n";
                    if (/\*\//.test(ln)) {
                        inDocComment = false;
                    }
                    return true;
                }
                if (/^\s*\/\/%/.test(ln)) {
                    currAttrs += ln + "\n";
                    return true;
                }
                return false;
            }
            function enterEnum(cpname, brace) {
                inEnum = true;
                enumVal = -1;
                enumsDTS.write("");
                enumsDTS.write("");
                if (currAttrs || currDocComment) {
                    enumsDTS.write(currDocComment);
                    enumsDTS.write(currAttrs);
                    currAttrs = "";
                    currDocComment = "";
                }
                enumsDTS.write("declare const enum " + toJs(cpname) + " " + brace);
                knownEnums[cpname] = true;
            }
            function processEnumLine(ln) {
                var lnNC = stripComments(ln);
                if (inEnum && lnNC.indexOf("}") >= 0) {
                    inEnum = false;
                    enumsDTS.write("}");
                }
                if (!inEnum)
                    return;
                // parse the enum case, with lots of optional stuff (?)
                var mm = /^\s*(\w+)\s*(=\s*(.*?))?,?\s*$/.exec(lnNC);
                if (mm) {
                    var nm = mm[1];
                    var v = mm[3];
                    var opt = "";
                    if (v) {
                        // user-supplied value
                        v = v.trim();
                        var curr = U.lookup(enumVals, v);
                        if (curr != null) {
                            opt = "  // " + v;
                            v = curr;
                        }
                        enumVal = parseCppInt(v);
                        if (enumVal == null)
                            err("cannot determine value of " + lnNC);
                    }
                    else {
                        // no user-supplied value
                        enumVal++;
                        v = enumVal + "";
                    }
                    enumsDTS.write("    " + toJs(nm) + " = " + v + "," + opt);
                }
                else {
                    enumsDTS.write(ln);
                }
            }
            function finishNamespace() {
                shimsDTS.setNs("");
                shimsDTS.write("");
                shimsDTS.write("");
                if (currAttrs || currDocComment) {
                    shimsDTS.write(currDocComment);
                    shimsDTS.write(currAttrs);
                    currAttrs = "";
                    currDocComment = "";
                }
            }
            function parseArg(parsedAttrs, s) {
                s = s.trim();
                var m = /(.*)=\s*(-?\w+)$/.exec(s);
                var defl = "";
                var qm = "";
                if (m) {
                    defl = m[2];
                    qm = "?";
                    s = m[1].trim();
                }
                m = /^(.*?)(\w+)$/.exec(s);
                if (!m) {
                    err("invalid argument: " + s);
                    return {
                        name: "???",
                        type: "int"
                    };
                }
                var argName = m[2];
                if (parsedAttrs.paramDefl[argName]) {
                    defl = parsedAttrs.paramDefl[argName];
                    qm = "?";
                }
                var numVal = defl ? U.lookup(enumVals, defl) : null;
                if (numVal != null)
                    defl = numVal;
                if (defl) {
                    if (parseCppInt(defl) == null)
                        err("Invalid default value (non-integer): " + defl);
                    currAttrs += " " + argName + ".defl=" + defl;
                }
                return {
                    name: argName + qm,
                    type: m[1]
                };
            }
            function parseCpp(src, isHeader) {
                currNs = "";
                currDocComment = "";
                currAttrs = "";
                inDocComment = false;
                var indexedInstanceAttrs;
                var indexedInstanceIdx = -1;
                // replace #if 0 .... #endif with newlines
                src = src.replace(/^(\s*#\s*if\s+(\w+)\s*$)([^]*?)(^\s*#\s*(elif|else|endif)\s*$)/mg, function (f, _if, arg, middle, _endif) {
                    return hash_if_options.indexOf(arg) >= 0 && !cpp_options[arg] ?
                        _if + middle.replace(/[^\n]/g, "") + _endif : f;
                });
                // special handling of C++ namespace that ends with Methods (e.g. FooMethods)
                // such a namespace will be converted into a TypeScript interface
                // this enables simple objects with methods to be defined. See, for example:
                // https://github.com/Microsoft/pxt-microbit/blob/master/libs/core/buffer.cpp
                // within that namespace, the first parameter of each function should have
                // the type Foo
                function interfaceName() {
                    var n = currNs.replace(/Methods$/, "");
                    if (n == currNs)
                        return null;
                    return n;
                }
                lineNo = 0;
                // the C++ types we can map to TypeScript
                function mapType(tp) {
                    switch (tp.replace(/\s+/g, "")) {
                        case "void": return "void";
                        // TODO: need int16_t
                        case "int32_t":
                        case "int":
                            return "int32";
                        case "uint32_t":
                        case "unsigned":
                            return "uint32";
                        case "TNumber":
                        case "float":
                        case "double":
                            return "number";
                        case "uint16_t": return "uint16";
                        case "int16_t":
                        case "short": return "int16";
                        case "uint8_t":
                        case "byte": return "uint8";
                        case "int8_t":
                        case "sbyte": return "int8";
                        case "bool":
                            if (compile.shortPointers)
                                err("use 'boolean' not 'bool' on 8 bit targets");
                            return "boolean";
                        case "StringData*": return "string";
                        case "String": return "string";
                        case "ImageLiteral_": return "string";
                        case "ImageLiteral": return "string";
                        case "Action": return "() => void";
                        case "TValue": return "any";
                        default:
                            return toJs(tp);
                    }
                }
                function mapRunTimeType(tp) {
                    tp = tp.replace(/\s+/g, "");
                    switch (tp) {
                        case "int32_t":
                        case "uint32_t":
                        case "unsigned":
                        case "uint16_t":
                        case "int16_t":
                        case "short":
                        case "uint8_t":
                        case "byte":
                        case "int8_t":
                        case "sbyte":
                        case "int":
                        case "ramint_t":
                            return "I";
                        case "void": return "V";
                        case "float": return "F";
                        case "TNumber": return "N";
                        case "TValue": return "T";
                        case "bool": return "B";
                        case "double": return "D";
                        case "ImageLiteral_":
                            return "T";
                        case "String":
                            return "S";
                        default:
                            if (U.lookup(knownEnums, tp))
                                return "I";
                            return "_" + tp.replace(/[\*_]+$/, "");
                    }
                }
                function generateVMWrapper(fi, argTypes) {
                    if (argTypes[0] == "FiberContext*")
                        return "::" + fi.name; // no wrapper
                    var wrap = "_wrp_" + fi.name.replace(/:/g, "_");
                    if (vmVisitedFunctions[fi.name])
                        return wrap;
                    vmVisitedFunctions[fi.name] = true;
                    /*
                    void call_getConfig(FiberContext *ctx) {
                        int a0 = toInt(ctx->sp[0]);
                        int a1 = toInt(ctx->r0); // last argument in r0
                        int r = getConfig(a0, a1);
                        ctx->r0 = fromInt(r);
                        ctx->sp += 1;
                    }
                    */
                    pointerIncPre += "\nvoid " + wrap + "(FiberContext *ctx) {\n";
                    var numArgs = argTypes.length;
                    var refs = [];
                    var needsStackSave = false;
                    var allConvs = "";
                    for (var i = 0; i < numArgs; ++i) {
                        var ind = fi.argsFmt[i + 1];
                        var tp = argTypes[i];
                        var conv = ind == "I" ? "toInt" :
                            ind == "B" ? "numops::toBool" :
                                "";
                        var inp = i == numArgs - 1 ? "ctx->r0" : "ctx->sp[" + (numArgs - i - 2) + "]";
                        var argPref = "";
                        switch (tp) {
                            case "TValue":
                            case "TNumber":
                                break;
                            case "Action":
                                conv = "asRefAction";
                                break;
                            case "String":
                                conv = "convertToString";
                                argPref = "ctx, ";
                                needsStackSave = true;
                                break;
                            default:
                                if (!conv)
                                    conv = "as" + tp.replace(/\*/g, "");
                                break;
                        }
                        allConvs += "  " + tp + " a" + i + " = (" + tp + ") " + conv + "(" + argPref + inp + ");\n";
                        refs.push("a" + i);
                    }
                    if (needsStackSave)
                        pointerIncPre += "  auto prevSP = ctx->sp;\n";
                    pointerIncPre += allConvs;
                    if (needsStackSave)
                        pointerIncPre += "  if (panicCode) { ctx->sp = prevSP; return; }\n";
                    var call = "::" + fi.name + "(" + refs.join(", ") + ")";
                    if (fi.argsFmt[0] == "V") {
                        pointerIncPre += "  " + call + ";\n";
                        pointerIncPre += "  ctx->r0 = NULL;\n";
                    }
                    else if (fi.argsFmt[0] == "I") {
                        pointerIncPre += "  ctx->r0 = fromInt(" + call + ");\n";
                    }
                    else if (fi.argsFmt[0] == "B") {
                        pointerIncPre += "  ctx->r0 = fromBool(" + call + ");\n";
                    }
                    else {
                        pointerIncPre += "  ctx->r0 = (TValue)" + call + ";\n";
                    }
                    if (needsStackSave)
                        pointerIncPre += "  ctx->sp = prevSP;\n";
                    if (numArgs > 1)
                        pointerIncPre += "  ctx->sp += " + (numArgs - 1) + ";\n";
                    pointerIncPre += "}\n";
                    return wrap;
                }
                inEnum = false;
                enumVal = 0;
                enumsDTS.setNs("");
                shimsDTS.setNs("");
                src.split(/\r?\n/).forEach(function (ln) {
                    ++lineNo;
                    // remove comments (NC = no comments)
                    var lnNC = stripComments(ln);
                    processEnumLine(ln);
                    // "enum class" and "enum struct" is C++ syntax to force scoping of
                    // enum members
                    var enM = /^\s*enum\s+(|class\s+|struct\s+)(\w+)\s*({|$)/.exec(lnNC);
                    if (enM) {
                        enterEnum(enM[2], enM[3]);
                        if (!isHeader) {
                            protos.setNs(currNs);
                            protos.write("enum " + enM[2] + " : int;");
                        }
                    }
                    if (handleComments(ln))
                        return;
                    if (/^typedef.*;\s*$/.test(ln)) {
                        protos.setNs(currNs);
                        protos.write(ln);
                    }
                    var m = /^\s*namespace\s+(\w+)/.exec(ln);
                    if (m) {
                        //if (currNs) err("more than one namespace declaration not supported")
                        currNs = m[1];
                        if (interfaceName()) {
                            finishNamespace();
                            var tpName = interfaceName();
                            shimsDTS.setNs(currNs, "declare interface " + tpName + " {");
                        }
                        else if (currAttrs || currDocComment) {
                            finishNamespace();
                            shimsDTS.setNs(toJs(currNs));
                            enumsDTS.setNs(toJs(currNs));
                        }
                        return;
                    }
                    m = /^PXT_ABI\((\w+)\)/.exec(ln);
                    if (m && !isVM) {
                        pointersInc += "PXT_FNPTR(::" + m[1] + "),\n";
                        abiInc += "extern \"C\" void " + m[1] + "();\n";
                        res.functions.push({
                            name: m[1],
                            argsFmt: [],
                            value: 0
                        });
                    }
                    m = /^#define\s+PXT_COMM_BASE\s+([0-9a-fx]+)/.exec(ln);
                    if (m)
                        res.commBase = parseInt(m[1]);
                    // function definition
                    m = /^\s*(\w+)([\*\&]*\s+[\*\&]*)(\w+)\s*\(([^\(\)]*)\)\s*(;\s*$|\{|$)/.exec(ln);
                    if (currAttrs && m) {
                        indexedInstanceAttrs = null;
                        var parsedAttrs_1 = pxtc.parseCommentString(currAttrs);
                        // top-level functions (outside of a namespace) are not permitted
                        if (!currNs)
                            err("missing namespace declaration");
                        var retTp = (m[1] + m[2]).replace(/\s+/g, "");
                        var funName = m[3];
                        var origArgs = m[4];
                        currAttrs = currAttrs.trim().replace(/ \w+\.defl=\w+/g, "");
                        var argsFmt_1 = [mapRunTimeType(retTp)];
                        var argTypes_1 = [];
                        var args = origArgs.split(/,/).filter(function (s) { return !!s; }).map(function (s) {
                            var r = parseArg(parsedAttrs_1, s);
                            argsFmt_1.push(mapRunTimeType(r.type));
                            argTypes_1.push(r.type.replace(/ /g, ""));
                            return r.name + ": " + mapType(r.type);
                        });
                        var fi = {
                            name: currNs + "::" + funName,
                            argsFmt: argsFmt_1,
                            value: null
                        };
                        //console.log(`${ln.trim()} : ${argsFmt}`)
                        if (currDocComment) {
                            shimsDTS.setNs(toJs(currNs));
                            shimsDTS.write("");
                            shimsDTS.write(currDocComment);
                            if (/ImageLiteral/.test(m[4]) && !/imageLiteral=/.test(currAttrs))
                                currAttrs += " imageLiteral=1";
                            currAttrs += " shim=" + fi.name;
                            shimsDTS.write(currAttrs);
                            funName = toJs(funName);
                            if (interfaceName()) {
                                var tp0 = (args[0] || "").replace(/^.*:\s*/, "").trim();
                                if (tp0.toLowerCase() != interfaceName().toLowerCase()) {
                                    err(lf("Invalid first argument; should be of type '{0}', but is '{1}'", interfaceName(), tp0));
                                }
                                args.shift();
                                if (args.length == 0 && /\bproperty\b/.test(currAttrs))
                                    shimsDTS.write(funName + ": " + mapType(retTp) + ";");
                                else
                                    shimsDTS.write(funName + "(" + args.join(", ") + "): " + mapType(retTp) + ";");
                            }
                            else {
                                shimsDTS.write("function " + funName + "(" + args.join(", ") + "): " + mapType(retTp) + ";");
                            }
                        }
                        currDocComment = "";
                        currAttrs = "";
                        if (!isHeader) {
                            protos.setNs(currNs);
                            protos.write(retTp + " " + funName + "(" + origArgs + ");");
                        }
                        res.functions.push(fi);
                        if (isYotta)
                            pointersInc += "(uint32_t)(void*)::" + fi.name + ",\n";
                        else if (isVM) {
                            if (U.startsWith(fi.name, "pxt::op_") ||
                                vmKeepFunctions[fi.name] ||
                                parsedAttrs_1.expose ||
                                (!U.startsWith(fi.name, "pxt::") && !U.startsWith(fi.name, "pxtrt::"))) {
                                var wrap = generateVMWrapper(fi, argTypes_1);
                                var nargs = fi.argsFmt.length - 1;
                                pointersInc += "{ \"" + fi.name + "\", (OpFun)" + wrap + ", " + nargs + " },\n";
                            }
                        }
                        else
                            pointersInc += "PXT_FNPTR(::" + fi.name + "),\n";
                        return;
                    }
                    m = /^\s*extern const (\w+) (\w+);/.exec(ln);
                    if (currAttrs && m) {
                        var fi = {
                            name: currNs + "::" + m[2],
                            argsFmt: [],
                            value: null
                        };
                        res.functions.push(fi);
                        if (!isVM)
                            pointersInc += "PXT_FNPTR(&::" + fi.name + "),\n";
                        currAttrs = "";
                        return;
                    }
                    m = /^\s*(\w+)\s+(\w+)\s*;/.exec(ln);
                    if (currAttrs && m) {
                        var parsedAttrs = pxtc.parseCommentString(currAttrs);
                        if (parsedAttrs.indexedInstanceNS) {
                            indexedInstanceAttrs = parsedAttrs;
                            shimsDTS.setNs(parsedAttrs.indexedInstanceNS);
                            indexedInstanceIdx = 0;
                        }
                        var tp = m[1];
                        var nm = m[2];
                        if (indexedInstanceAttrs) {
                            currAttrs = currAttrs.trim();
                            currAttrs += " fixedInstance shim=" + indexedInstanceAttrs.indexedInstanceShim + "(" + indexedInstanceIdx++ + ")";
                            shimsDTS.write("");
                            shimsDTS.write(currDocComment);
                            shimsDTS.write(currAttrs);
                            shimsDTS.write("const " + nm + ": " + mapType(tp) + ";");
                            currDocComment = "";
                            currAttrs = "";
                            return;
                        }
                    }
                    if (currAttrs && ln.trim()) {
                        err("declaration not understood: " + ln);
                        currAttrs = "";
                        currDocComment = "";
                        return;
                    }
                });
            }
            var currSettings = U.clone(compileService.yottaConfig || {});
            var optSettings = {};
            var settingSrc = {};
            function parseJson(pkg) {
                var j0 = pkg.config.platformio;
                if (j0 && j0.dependencies) {
                    U.jsonCopyFrom(res.platformio.dependencies, j0.dependencies);
                }
                if (res.npmDependencies && pkg.config.npmDependencies)
                    U.jsonCopyFrom(res.npmDependencies, pkg.config.npmDependencies);
                var json = pkg.config.yotta;
                if (!json)
                    return;
                // TODO check for conflicts
                if (json.dependencies) {
                    U.jsonCopyFrom(res.yotta.dependencies, json.dependencies);
                }
                if (json.config) {
                    var cfg = U.jsonFlatten(json.config);
                    for (var _i = 0, _a = Object.keys(cfg); _i < _a.length; _i++) {
                        var settingName = _a[_i];
                        var prev = U.lookup(settingSrc, settingName);
                        var settingValue = cfg[settingName];
                        if (!prev || prev.config.yotta.configIsJustDefaults) {
                            settingSrc[settingName] = pkg;
                            currSettings[settingName] = settingValue;
                        }
                        else if (currSettings[settingName] === settingValue) {
                            // OK
                        }
                        else if (!pkg.parent.config.yotta || !pkg.parent.config.yotta.ignoreConflicts) {
                            var err_1 = new PkgConflictError(lf("conflict on yotta setting {0} between extensions {1} and {2}", settingName, pkg.id, prev.id));
                            err_1.pkg0 = prev;
                            err_1.pkg1 = pkg;
                            err_1.settingName = settingName;
                            throw err_1;
                        }
                    }
                }
                if (json.optionalConfig) {
                    var cfg = U.jsonFlatten(json.optionalConfig);
                    for (var _b = 0, _c = Object.keys(cfg); _b < _c.length; _b++) {
                        var settingName = _c[_b];
                        var settingValue = cfg[settingName];
                        // last one wins
                        optSettings[settingName] = settingValue;
                    }
                }
            }
            // This is overridden on the build server, but we need it for command line build
            if (isYotta && compile.hasHex) {
                var cs = compileService;
                U.assert(!!cs.yottaCorePackage);
                U.assert(!!cs.githubCorePackage);
                U.assert(!!cs.gittag);
                var tagged = cs.githubCorePackage + "#" + compileService.gittag;
                res.yotta.dependencies[cs.yottaCorePackage] = tagged;
            }
            if (mainPkg) {
                var seenMain = false;
                for (var _b = 0, mainDeps_3 = mainDeps; _b < mainDeps_3.length; _b++) {
                    var pkg = mainDeps_3[_b];
                    thisErrors = "";
                    parseJson(pkg);
                    if (pkg == mainPkg) {
                        seenMain = true;
                        // we only want the main package in generated .d.ts
                        shimsDTS.clear();
                        enumsDTS.clear();
                    }
                    else {
                        U.assert(!seenMain);
                    }
                    var ext = ".cpp";
                    for (var _c = 0, _d = pkg.getFiles(); _c < _d.length; _c++) {
                        var fn = _d[_c];
                        var isHeader = U.endsWith(fn, ".h");
                        if (isHeader || U.endsWith(fn, ext)) {
                            var fullName = pkg.config.name + "/" + fn;
                            if ((pkg.config.name == "base" || /^core($|---)/.test(pkg.config.name)) && isHeader)
                                fullName = fn;
                            if (isHeader)
                                includesInc += "#include \"" + (isYotta ? sourcePath.slice(1) : "") + fullName + "\"\n";
                            var src = pkg.readFile(fn);
                            if (src == null)
                                U.userError(lf("C++ file {0} is missing in extension {1}.", fn, pkg.config.name));
                            fileName = fullName;
                            // parseCpp() will remove doc comments, to prevent excessive recompilation
                            pxt.debug("Parse C++: " + fullName);
                            parseCpp(src, isHeader);
                            res.extensionFiles[sourcePath + fullName] = src;
                            if (pkg.level == 0)
                                res.onlyPublic = false;
                            if (pkg.verProtocol() && pkg.verProtocol() != "pub" && pkg.verProtocol() != "embed")
                                res.onlyPublic = false;
                        }
                        if (U.endsWith(fn, ".c") || U.endsWith(fn, ".S") || U.endsWith(fn, ".s")) {
                            var src = pkg.readFile(fn);
                            res.extensionFiles[sourcePath + pkg.config.name + "/" + fn.replace(/\.S$/, ".s")] = src;
                        }
                    }
                    if (thisErrors) {
                        allErrors += lf("Extension {0}:\n", pkg.id) + thisErrors;
                    }
                }
            }
            if (allErrors)
                U.userError(allErrors);
            // merge optional settings
            U.jsonCopyFrom(optSettings, currSettings);
            U.iterMap(optSettings, function (k, v) {
                if (v === null) {
                    delete optSettings[k];
                }
            });
            var configJson = U.jsonUnFlatten(optSettings);
            if (isDockerMake) {
                var packageJson = {
                    name: "pxt-app",
                    private: true,
                    dependencies: res.npmDependencies,
                };
                res.generatedFiles["/package.json"] = JSON.stringify(packageJson, null, 4) + "\n";
            }
            else if (isCodal) {
                var cs = compileService;
                var cfg_1 = U.clone(cs.codalDefinitions) || {};
                var trg = cs.codalTarget;
                if (typeof trg == "string")
                    trg = trg + ".json";
                var codalJson = {
                    "target": trg,
                    "definitions": cfg_1,
                    "config": cfg_1,
                    "application": "pxtapp",
                    "output_folder": "build",
                    // include these, because we use hash of this file to see if anything changed
                    "pxt_gitrepo": cs.githubCorePackage,
                    "pxt_gittag": cs.gittag,
                };
                U.iterMap(U.jsonFlatten(configJson), function (k, v) {
                    k = k.replace(/^codal\./, "device.").toUpperCase().replace(/\./g, "_");
                    cfg_1[k] = v;
                });
                res.generatedFiles["/codal.json"] = JSON.stringify(codalJson, null, 4) + "\n";
                pxt.debug("codal.json: " + res.generatedFiles["/codal.json"]);
            }
            else if (isPlatformio) {
                var iniLines_1 = compileService.platformioIni.slice();
                // TODO merge configjson
                iniLines_1.push("lib_deps =");
                U.iterMap(res.platformio.dependencies, function (pkg, ver) {
                    var pkgSpec = /[@#\/]/.test(ver) ? ver : pkg + "@" + ver;
                    iniLines_1.push("  " + pkgSpec);
                });
                res.generatedFiles["/platformio.ini"] = iniLines_1.join("\n") + "\n";
            }
            else {
                res.yotta.config = configJson;
                var name_1 = "pxt-app";
                if (compileService.yottaBinary)
                    name_1 = compileService.yottaBinary.replace(/-combined/, "").replace(/\.hex$/, "");
                var moduleJson = {
                    "name": name_1,
                    "version": "0.0.0",
                    "description": "Auto-generated. Do not edit.",
                    "license": "n/a",
                    "dependencies": res.yotta.dependencies,
                    "targetDependencies": {},
                    "bin": "./source"
                };
                res.generatedFiles["/module.json"] = JSON.stringify(moduleJson, null, 4) + "\n";
                pxt.debug("module.json: " + res.generatedFiles["/module.json"]);
            }
            for (var _e = 0, _f = Object.keys(cpp_options); _e < _f.length; _e++) {
                var k = _f[_e];
                pxtConfig += "#define " + k + " " + cpp_options[k] + "\n";
            }
            if (compile.uf2Family)
                pxtConfig += "#define PXT_UF2_FAMILY " + compile.uf2Family + "\n";
            res.generatedFiles[sourcePath + "pointers.cpp"] = includesInc + protos.finish() + abiInc +
                pointerIncPre + pointersInc + "\nPXT_SHIMS_END\n";
            res.generatedFiles[sourcePath + "pxtconfig.h"] = pxtConfig;
            pxt.debug("pxtconfig.h: " + res.generatedFiles[sourcePath + "pxtconfig.h"]);
            if (isYotta) {
                res.generatedFiles["/config.json"] = JSON.stringify(configJson, null, 4) + "\n";
                pxt.debug("yotta config.json: " + res.generatedFiles["/config.json"]);
            }
            res.generatedFiles[sourcePath + "main.cpp"] = "\n#include \"pxt.h\"\n#ifdef PXT_MAIN\nPXT_MAIN\n#else\nint main() {\n    uBit.init();\n    pxt::start();\n    release_fiber();\n    return 0;   // your program will never reach this line.\n}\n#endif\n";
            if (makefile) {
                var allfiles_1 = Object.keys(res.extensionFiles).concat(Object.keys(res.generatedFiles));
                var inc_1 = "";
                var objs = [];
                var add = function (name, ext) {
                    var files = allfiles_1.filter(function (f) { return U.endsWith(f, ext); }).map(function (s) { return s.slice(1); });
                    inc_1 += name + " = " + files.join(" ") + "\n";
                };
                add("PXT_C", ".c");
                add("PXT_CPP", ".cpp");
                add("PXT_S", ".s");
                add("PXT_HEADERS", ".h");
                inc_1 += "PXT_SOURCES := $(PXT_C) $(PXT_S) $(PXT_CPP)\n";
                inc_1 += "PXT_OBJS := $(addprefix bld/, $(PXT_C:.c=.o) $(PXT_S:.s=.o) $(PXT_CPP:.cpp=.o))\n";
                res.generatedFiles["/Makefile"] = makefile;
                res.generatedFiles["/Makefile.inc"] = inc_1;
            }
            res.generatedFiles["/functions.json"] = JSON.stringify(res.functions, null, 1);
            var tmp = res.extensionFiles;
            U.jsonCopyFrom(tmp, res.generatedFiles);
            var creq = {
                config: compileService.serviceId,
                tag: compileService.gittag,
                replaceFiles: tmp,
                dependencies: (isYotta ? res.yotta.dependencies : null)
            };
            var data = JSON.stringify(creq);
            res.sha = U.sha256(data);
            res.skipCloudBuild = !!compileService.skipCloudBuild;
            res.compileData = ts.pxtc.encodeBase64(U.toUTF8(data));
            res.shimsDTS = shimsDTS.finish();
            res.enumsDTS = enumsDTS.finish();
            prevSnapshot = pkgSnapshot;
            prevExtInfo = res;
            return res;
        }
        cpp.getExtensionInfo = getExtensionInfo;
        function fromUTF8Bytes(binstr) {
            if (!binstr)
                return "";
            // escape function is deprecated
            var escaped = "";
            for (var i = 0; i < binstr.length; ++i) {
                var k = binstr[i] & 0xff;
                if (k == 37 || k > 0x7f) {
                    escaped += "%" + k.toString(16);
                }
                else {
                    escaped += String.fromCharCode(k);
                }
            }
            // decodeURIComponent does the actual UTF8 decoding
            return decodeURIComponent(escaped);
        }
        function swapBytes(str) {
            var r = "";
            var i = 0;
            for (; i < str.length; i += 2)
                r = str[i] + str[i + 1] + r;
            pxt.Util.assert(i == str.length);
            return r;
        }
        function extractSourceFromBin(bin) {
            var magic = [0x41, 0x14, 0x0E, 0x2F, 0xB8, 0x2F, 0xA2, 0xBB];
            outer: for (var p = 0; p < bin.length; p += 16) {
                if (bin[p] != magic[0])
                    continue;
                for (var i = 0; i < magic.length; ++i)
                    if (bin[p + i] != magic[i])
                        continue outer;
                var metaLen = bin[p + 8] | (bin[p + 9] << 8);
                var textLen = bin[p + 10] | (bin[p + 11] << 8) | (bin[p + 12] << 16) | (bin[p + 13] << 24);
                // TODO test in iOS Safari
                p += 16;
                var end = p + metaLen + textLen;
                if (end > bin.length)
                    continue;
                var bufmeta = bin.slice(p, p + metaLen);
                var buftext = bin.slice(p + metaLen, end);
                return {
                    meta: fromUTF8Bytes(bufmeta),
                    text: buftext
                };
            }
            return null;
        }
        function extractSource(hexfile) {
            if (!hexfile)
                return undefined;
            var metaLen = 0;
            var textLen = 0;
            var toGo = 0;
            var buf;
            var ptr = 0;
            hexfile.split(/\r?\n/).forEach(function (ln) {
                var m = /^:10....0041140E2FB82FA2BB(....)(....)(....)(....)(..)/.exec(ln);
                if (m) {
                    metaLen = parseInt(swapBytes(m[1]), 16);
                    textLen = parseInt(swapBytes(m[2]), 16);
                    toGo = metaLen + textLen;
                    buf = new Uint8Array(toGo);
                }
                else if (toGo > 0) {
                    m = /^:10....00(.*)(..)$/.exec(ln);
                    if (!m)
                        return;
                    var k = m[1];
                    while (toGo > 0 && k.length > 0) {
                        buf[ptr++] = parseInt(k[0] + k[1], 16);
                        k = k.slice(2);
                        toGo--;
                    }
                }
            });
            if (!buf || !(toGo == 0 && ptr == buf.length)) {
                return undefined;
            }
            var bufmeta = new Uint8Array(metaLen);
            var buftext = new Uint8Array(textLen);
            for (var i = 0; i < metaLen; ++i)
                bufmeta[i] = buf[i];
            for (var i = 0; i < textLen; ++i)
                buftext[i] = buf[metaLen + i];
            // iOS Safari doesn't seem to have slice() on Uint8Array
            return {
                meta: fromUTF8Bytes(bufmeta),
                text: buftext
            };
        }
        function unpackSourceFromHexFileAsync(file) {
            if (!file)
                return undefined;
            return pxt.Util.fileReadAsBufferAsync(file).then(function (data) {
                var a = new Uint8Array(data);
                return unpackSourceFromHexAsync(a);
            });
        }
        cpp.unpackSourceFromHexFileAsync = unpackSourceFromHexFileAsync;
        function unpackSourceFromHexAsync(dat) {
            function error(e) {
                pxt.debug(e);
                return Promise.reject(new Error(e));
            }
            var rawEmbed;
            // UF2?
            if (pxt.HF2.read32(dat, 0) == ts.pxtc.UF2.UF2_MAGIC_START0) {
                var bin = ts.pxtc.UF2.toBin(dat);
                if (bin)
                    rawEmbed = extractSourceFromBin(bin.buf);
            }
            // ELF?
            if (pxt.HF2.read32(dat, 0) == 0x464c457f) {
                rawEmbed = extractSourceFromBin(dat);
            }
            // HEX? (check for colon)
            if (dat[0] == 0x3a) {
                var str = fromUTF8Bytes(dat);
                rawEmbed = extractSource(str || "");
            }
            if (!rawEmbed || !rawEmbed.meta || !rawEmbed.text) {
                return error("This .hex file doesn't contain source.");
            }
            var hd = JSON.parse(rawEmbed.meta);
            if (!hd) {
                return error("This .hex file is not valid.");
            }
            else if (hd.compression == "LZMA") {
                return pxt.lzmaDecompressAsync(rawEmbed.text)
                    .then(function (res) {
                    if (!res)
                        return null;
                    var meta = res.slice(0, hd.headerSize || hd.metaSize || 0);
                    var text = res.slice(meta.length);
                    if (meta)
                        pxt.Util.jsonCopyFrom(hd, JSON.parse(meta));
                    return { meta: hd, source: text };
                });
            }
            else if (hd.compression) {
                return error("Compression type " + hd.compression + " not supported.");
            }
            else {
                return Promise.resolve({ source: fromUTF8Bytes(rawEmbed.text) });
            }
        }
        cpp.unpackSourceFromHexAsync = unpackSourceFromHexAsync;
    })(cpp = pxt.cpp || (pxt.cpp = {}));
})(pxt || (pxt = {}));
(function (pxt) {
    var hex;
    (function (hex_1) {
        var downloadCache = {};
        var cdnUrlPromise;
        hex_1.showLoading = function (msg) { };
        hex_1.hideLoading = function () { };
        function downloadHexInfoAsync(extInfo) {
            if (!downloadCache.hasOwnProperty(extInfo.sha))
                downloadCache[extInfo.sha] = downloadHexInfoCoreAsync(extInfo);
            return downloadCache[extInfo.sha];
        }
        function getCdnUrlAsync() {
            if (cdnUrlPromise)
                return cdnUrlPromise;
            else {
                var curr = pxt.getOnlineCdnUrl();
                if (curr)
                    return (cdnUrlPromise = Promise.resolve(curr));
                var forceLive = pxt.webConfig && pxt.webConfig.isStatic;
                return (cdnUrlPromise = pxt.Cloud.privateGetAsync("clientconfig", forceLive)
                    .then(function (r) { return r.primaryCdnUrl; }));
            }
        }
        function downloadHexInfoCoreAsync(extInfo) {
            var hexurl = "";
            hex_1.showLoading(pxt.U.lf("Compiling (this may take a minute)..."));
            return downloadHexInfoLocalAsync(extInfo)
                .then(function (hex) {
                if (hex) {
                    // Found the hex image in the local server cache, use that
                    return hex;
                }
                return getCdnUrlAsync()
                    .then(function (url) {
                    hexurl = url + "/compile/" + extInfo.sha;
                    return pxt.U.httpGetTextAsync(hexurl + ".hex");
                })
                    .then(function (r) { return r; }, function (e) {
                    return pxt.Cloud.privatePostAsync("compile/extension", { data: extInfo.compileData })
                        .then(function (ret) { return new Promise(function (resolve, reject) {
                        var tryGet = function () {
                            var url = ret.hex.replace(/\.hex/, ".json");
                            pxt.log("polling C++ build " + url);
                            return pxt.Util.httpGetJsonAsync(url)
                                .then(function (json) {
                                pxt.log("build log " + url.replace(/\.json$/, ".log"));
                                if (!json.success) {
                                    pxt.log("build failed");
                                    if (json.mbedresponse && json.mbedresponse.result && json.mbedresponse.result.exception)
                                        pxt.log(json.mbedresponse.result.exception);
                                    resolve(null);
                                }
                                else {
                                    pxt.log("fetching " + hexurl + ".hex");
                                    resolve(pxt.U.httpGetTextAsync(hexurl + ".hex"));
                                }
                            }, function (e) {
                                setTimeout(tryGet, 1000);
                                return null;
                            });
                        };
                        tryGet();
                    }); });
                })
                    .then(function (text) {
                    hex_1.hideLoading();
                    return {
                        hex: text && text.split(/\r?\n/)
                    };
                });
            }).finally(function () {
                hex_1.hideLoading();
            });
        }
        function downloadHexInfoLocalAsync(extInfo) {
            if (extInfo.skipCloudBuild)
                return Promise.resolve({ hex: ["SKIP"] });
            if (pxt.webConfig && pxt.webConfig.isStatic) {
                return pxt.Util.requestAsync({
                    url: pxt.webConfig.cdnUrl + "hexcache/" + extInfo.sha + ".hex"
                })
                    .then(function (resp) {
                    if (resp.text) {
                        var result = {
                            enums: [],
                            functions: [],
                            hex: resp.text.split(/\r?\n/)
                        };
                        return Promise.resolve(result);
                    }
                    pxt.log("Hex info not found in bundled hex cache");
                    return Promise.resolve();
                })
                    .catch(function (e) {
                    pxt.log("Error fetching hex info from bundled hex cache");
                    return Promise.resolve();
                });
            }
            if (!pxt.Cloud.localToken || !window || !pxt.BrowserUtils.isLocalHost()) {
                return Promise.resolve(undefined);
            }
            return apiAsync("compile/" + extInfo.sha)
                .then(function (json) {
                if (!json || json.notInOfflineCache || !json.hex) {
                    return Promise.resolve(undefined);
                }
                json.hex = json.hex.split(/\r?\n/);
                return json;
            })
                .catch(function (e) {
                return Promise.resolve(undefined);
            });
        }
        function apiAsync(path, data) {
            return pxt.Cloud.localRequestAsync(path, data).then(function (r) { return r.json; });
        }
        function storeWithLimitAsync(host, idxkey, newkey, newval, maxLen) {
            if (maxLen === void 0) { maxLen = 10; }
            return host.cacheStoreAsync(newkey, newval)
                .then(function () { return host.cacheGetAsync(idxkey); })
                .then(function (res) {
                var keys;
                try {
                    keys = JSON.parse(res || "[]");
                }
                catch (e) {
                    // cache entry is corrupted, clear cache so that it gets rebuilt
                    console.error('invalid cache entry, clearing entry');
                    keys = [];
                }
                keys = keys.filter(function (k) { return k != newkey; });
                keys.unshift(newkey);
                var todel = keys.slice(maxLen);
                keys = keys.slice(0, maxLen);
                return Promise.map(todel, function (e) { return host.cacheStoreAsync(e, null); })
                    .then(function () { return host.cacheStoreAsync(idxkey, JSON.stringify(keys)); });
            });
        }
        hex_1.storeWithLimitAsync = storeWithLimitAsync;
        function recordGetAsync(host, idxkey, newkey) {
            return host.cacheGetAsync(idxkey)
                .then(function (res) {
                var keys;
                try {
                    keys = JSON.parse(res || "[]");
                }
                catch (e) {
                    // cache entry is corrupted, clear cache so that it gets rebuilt
                    console.error('invalid cache entry, clearing entry');
                    return host.cacheStoreAsync(idxkey, "[]");
                }
                if (keys[0] != newkey) {
                    keys = keys.filter(function (k) { return k != newkey; });
                    keys.unshift(newkey);
                    return host.cacheStoreAsync(idxkey, JSON.stringify(keys));
                }
                else {
                    return null;
                }
            });
        }
        hex_1.recordGetAsync = recordGetAsync;
        function getHexInfoAsync(host, extInfo, cloudModule) {
            if (!extInfo.sha)
                return Promise.resolve(null);
            if (pxtc.hex.isSetupFor(extInfo))
                return Promise.resolve(pxtc.hex.currentHexInfo);
            pxt.debug("get hex info: " + extInfo.sha);
            var key = "hex-" + extInfo.sha;
            return host.cacheGetAsync(key)
                .then(function (res) {
                var cachedMeta;
                try {
                    cachedMeta = res ? JSON.parse(res) : null;
                }
                catch (e) {
                    // cache entry is corrupted, clear cache so that it gets rebuilt
                    console.log('invalid cache entry, clearing entry');
                    cachedMeta = null;
                }
                if (cachedMeta && cachedMeta.hex) {
                    pxt.debug("cache hit, size=" + res.length);
                    cachedMeta.hex = decompressHex(cachedMeta.hex);
                    return recordGetAsync(host, "hex-keys", key)
                        .then(function () { return cachedMeta; });
                }
                else {
                    return downloadHexInfoAsync(extInfo)
                        .then(function (meta) {
                        var origHex = meta.hex;
                        meta.hex = compressHex(meta.hex);
                        var store = JSON.stringify(meta);
                        meta.hex = origHex;
                        return storeWithLimitAsync(host, "hex-keys", key, store)
                            .then(function () { return meta; });
                    }).catch(function (e) {
                        pxt.reportException(e, { sha: extInfo.sha });
                        return Promise.resolve(null);
                    });
                }
            });
        }
        hex_1.getHexInfoAsync = getHexInfoAsync;
        function decompressHex(hex) {
            var outp = [];
            for (var i = 0; i < hex.length; i++) {
                var m = /^([@!])(....)$/.exec(hex[i]);
                if (!m) {
                    outp.push(hex[i]);
                    continue;
                }
                var addr = parseInt(m[2], 16);
                var nxt = hex[++i];
                var buf = "";
                if (m[1] == "@") {
                    buf = "";
                    var cnt = parseInt(nxt, 16);
                    while (cnt-- > 0) {
                        /* tslint:disable:no-octal-literal */
                        buf += "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
                        /* tslint:enable:no-octal-literal */
                    }
                }
                else {
                    buf = ts.pxtc.decodeBase64(nxt);
                }
                pxt.Util.assert(buf.length > 0);
                pxt.Util.assert(buf.length % 16 == 0);
                for (var j = 0; j < buf.length;) {
                    var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0];
                    addr += 16;
                    for (var k = 0; k < 16; ++k) {
                        bytes.push(buf.charCodeAt(j++));
                    }
                    var chk = 0;
                    for (var k = 0; k < bytes.length; ++k)
                        chk += bytes[k];
                    bytes.push((-chk) & 0xff);
                    var r = ":";
                    for (var k = 0; k < bytes.length; ++k) {
                        var b = bytes[k] & 0xff;
                        if (b <= 0xf)
                            r += "0";
                        r += b.toString(16);
                    }
                    outp.push(r.toUpperCase());
                }
            }
            return outp;
        }
        function compressHex(hex) {
            var outp = [];
            var j = 0;
            for (var i = 0; i < hex.length; i += j) {
                var addr = -1;
                var outln = "";
                j = 0;
                var zeroMode = false;
                while (j < 500) {
                    var m = /^:10(....)00(.{32})(..)$/.exec(hex[i + j]);
                    if (!m)
                        break;
                    var h = m[2];
                    var isZero = /^0+$/.test(h);
                    var newaddr = parseInt(m[1], 16);
                    if (addr == -1) {
                        zeroMode = isZero;
                        outp.push((zeroMode ? "@" : "!") + m[1]);
                        addr = newaddr - 16;
                    }
                    else {
                        if (isZero != zeroMode)
                            break;
                        if (addr + 16 != newaddr)
                            break;
                    }
                    if (!zeroMode)
                        outln += h;
                    addr = newaddr;
                    j++;
                }
                if (j == 0) {
                    outp.push(hex[i]);
                    j = 1;
                }
                else {
                    if (zeroMode) {
                        outp.push(j.toString(16));
                    }
                    else {
                        var bin = "";
                        for (var k = 0; k < outln.length; k += 2)
                            bin += String.fromCharCode(parseInt(outln.slice(k, k + 2), 16));
                        outp.push(ts.pxtc.encodeBase64(bin));
                    }
                }
            }
            return outp;
        }
    })(hex = pxt.hex || (pxt.hex = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var crowdin;
    (function (crowdin) {
        crowdin.KEY_VARIABLE = "CROWDIN_KEY";
        function apiUri(branch, prj, key, cmd, args) {
            pxt.Util.assert(!!prj && !!key && !!cmd);
            var apiRoot = "https://api.crowdin.com/api/project/" + prj + "/";
            var suff = "?key=" + key;
            if (branch) {
                if (!args)
                    args = {};
                args["branch"] = branch;
            }
            if (args)
                suff += "&" + Object.keys(args).map(function (k) { return k + "=" + encodeURIComponent(args[k]); }).join("&");
            return apiRoot + cmd + suff;
        }
        function downloadTranslationsAsync(branch, prj, key, filename, options) {
            if (options === void 0) { options = {}; }
            var q = { json: "true" };
            var infoUri = apiUri(branch, prj, key, "info", q);
            var r = {};
            filename = normalizeFileName(filename);
            return pxt.Util.httpGetTextAsync(infoUri).then(function (respText) {
                var info = JSON.parse(respText);
                if (!info)
                    throw new Error("info failed");
                var todo = info.languages.filter(function (l) { return l.code != "en"; });
                if (pxt.appTarget && pxt.appTarget.appTheme && pxt.appTarget.appTheme.availableLocales)
                    todo = todo.filter(function (l) { return pxt.appTarget.appTheme.availableLocales.indexOf(l.code) > -1; });
                pxt.log('languages: ' + todo.map(function (l) { return l.code; }).join(', '));
                var nextFile = function () {
                    var item = todo.pop();
                    if (!item)
                        return Promise.resolve();
                    var exportFileUri = apiUri(branch, prj, key, "export-file", {
                        file: filename,
                        language: item.code,
                        export_translated_only: options.translatedOnly ? "1" : "0",
                        export_approved_only: options.validatedOnly ? "1" : "0"
                    });
                    pxt.log("downloading " + item.name + " - " + item.code + " (" + todo.length + " more)");
                    return pxt.Util.httpGetTextAsync(exportFileUri).then(function (transationsText) {
                        try {
                            var translations = JSON.parse(transationsText);
                            if (translations)
                                r[item.code] = translations;
                        }
                        catch (e) {
                            pxt.log(exportFileUri + ' ' + e);
                        }
                        return nextFile();
                    }).delay(1000); // throttling otherwise crowdin fails
                };
                return nextFile();
            }).then(function () { return r; });
        }
        crowdin.downloadTranslationsAsync = downloadTranslationsAsync;
        function mkIncr(filename) {
            var cnt = 0;
            return function incr() {
                if (cnt++ > 10) {
                    throw new Error("Too many API calls for " + filename);
                }
            };
        }
        function createDirectoryAsync(branch, prj, key, name, incr) {
            name = normalizeFileName(name);
            pxt.debug("create directory " + (branch || "") + "/" + name);
            if (!incr)
                incr = mkIncr(name);
            return pxt.Util.multipartPostAsync(apiUri(branch, prj, key, "add-directory"), { json: "true", name: name })
                .then(function (resp) {
                pxt.debug("crowdin resp: " + resp.statusCode);
                // 400 returned by folder already exists
                if (resp.statusCode == 200 || resp.statusCode == 400)
                    return Promise.resolve();
                if (resp.statusCode == 500 && resp.text) {
                    var json = JSON.parse(resp.text);
                    if (json.error.code === 50) {
                        pxt.log('directory already exists');
                        return Promise.resolve();
                    }
                }
                var data = resp.json || JSON.parse(resp.text) || { error: {} };
                if (resp.statusCode == 404 && data.error.code == 17) {
                    pxt.log("parent directory missing for " + name);
                    var par = name.replace(/\/[^\/]+$/, "");
                    if (par != name) {
                        return createDirectoryAsync(branch, prj, key, par, incr)
                            .then(function () { return createDirectoryAsync(branch, prj, key, name, incr); }); // retry
                    }
                }
                throw new Error("cannot create directory " + (branch || "") + "/" + name + ": " + resp.statusCode + " " + JSON.stringify(data));
            });
        }
        crowdin.createDirectoryAsync = createDirectoryAsync;
        function normalizeFileName(filename) {
            return filename.replace(/\\/g, '/');
        }
        function uploadTranslationAsync(branch, prj, key, filename, data) {
            pxt.Util.assert(!!prj);
            pxt.Util.assert(!!key);
            filename = normalizeFileName(filename);
            var incr = mkIncr(filename);
            function startAsync() {
                return uploadAsync("update-file", { update_option: "update_as_unapproved" });
            }
            function uploadAsync(op, opts) {
                opts["type"] = "auto";
                opts["json"] = "";
                opts["escape_quotes"] = "0";
                incr();
                return pxt.Util.multipartPostAsync(apiUri(branch, prj, key, op), opts, filename, data)
                    .then(function (resp) { return handleResponseAsync(resp); });
            }
            function handleResponseAsync(resp) {
                var code = resp.statusCode;
                var data = JSON.parse(resp.text);
                pxt.debug("upload result: " + code);
                if (code == 404 && data.error.code == 8) {
                    pxt.log("create new translation file: " + filename);
                    return uploadAsync("add-file", {});
                }
                else if (code == 404 && data.error.code == 17) {
                    return createDirectoryAsync(branch, prj, key, filename.replace(/\/[^\/]+$/, ""), incr)
                        .then(function () { return startAsync(); });
                }
                else if (!data.success && data.error.code == 53) {
                    // file is being updated
                    return Promise.delay(5000) // wait 5s and try again
                        .then(function () { return uploadTranslationAsync(branch, prj, key, filename, data); });
                }
                else if (code == 200) {
                    return Promise.resolve();
                }
                else {
                    throw new Error("Error, upload translation: " + filename + ", " + code + ", " + JSON.stringify(data));
                }
            }
            return startAsync();
        }
        crowdin.uploadTranslationAsync = uploadTranslationAsync;
        function flatten(allFiles, node, parentDir, branch) {
            var n = node.name;
            var d = parentDir ? parentDir + "/" + n : n;
            node.fullName = d;
            node.branch = branch || "";
            switch (node.node_type) {
                case "file":
                    allFiles.push(node);
                    break;
                case "directory":
                    (node.files || []).forEach(function (f) { return flatten(allFiles, f, d, branch); });
                    break;
                case "branch":
                    (node.files || []).forEach(function (f) { return flatten(allFiles, f, parentDir, node.name); });
                    break;
            }
        }
        function filterAndFlattenFiles(files, crowdinPath) {
            var pxtCrowdinBranch = pxt.appTarget.versions.pxtCrowdinBranch || "";
            var targetCrowdinBranch = pxt.appTarget.versions.targetCrowdinBranch || "";
            var allFiles = [];
            // flatten the files
            files.forEach(function (f) { return flatten(allFiles, f, ""); });
            // top level files are for PXT, subolder are targets
            allFiles = allFiles.filter(function (f) {
                if (f.fullName.indexOf('/') < 0)
                    return f.branch == pxtCrowdinBranch; // pxt file
                else
                    return f.branch == targetCrowdinBranch;
            });
            // folder filter
            if (crowdinPath) {
                // filter out crowdin folder
                allFiles = allFiles.filter(function (f) { return f.fullName.indexOf(crowdinPath) == 0; });
            }
            // filter out non-target files
            if (pxt.appTarget.id != "core") {
                var id_1 = pxt.appTarget.id + '/';
                allFiles = allFiles.filter(function (f) {
                    return f.fullName.indexOf('/') < 0 // top level file
                        || f.fullName.substr(0, id_1.length) == id_1 // from the target folder
                        || f.fullName.indexOf('common-docs') >= 0; // common docs
                });
            }
            return allFiles;
        }
        function projectInfoAsync(prj, key) {
            var q = { json: "true" };
            var infoUri = apiUri("", prj, key, "info", q);
            return pxt.Util.httpGetTextAsync(infoUri).then(function (respText) {
                var info = JSON.parse(respText);
                return info;
            });
        }
        crowdin.projectInfoAsync = projectInfoAsync;
        /**
         * Scans files in crowdin and report files that are not on disk anymore
         */
        function listFilesAsync(prj, key, crowdinPath) {
            pxt.log("crowdin: listing files under " + crowdinPath);
            return projectInfoAsync(prj, key)
                .then(function (info) {
                if (!info)
                    throw new Error("info failed");
                var allFiles = filterAndFlattenFiles(info.files, crowdinPath);
                pxt.debug("crowdin: found " + allFiles.length + " under " + crowdinPath);
                return allFiles.map(function (f) {
                    return {
                        fullName: f.fullName,
                        branch: f.branch || ""
                    };
                });
            });
        }
        crowdin.listFilesAsync = listFilesAsync;
        function languageStatsAsync(prj, key, lang) {
            var uri = apiUri("", prj, key, "language-status", { language: lang, json: "true" });
            return pxt.Util.httpGetJsonAsync(uri)
                .then(function (info) {
                var allFiles = filterAndFlattenFiles(info.files);
                return allFiles;
            });
        }
        crowdin.languageStatsAsync = languageStatsAsync;
    })(crowdin = pxt.crowdin || (pxt.crowdin = {}));
})(pxt || (pxt = {}));
/// <reference path='../localtypings/pxtarget.d.ts' />
/// <reference path="commonutil.ts"/>
var pxt;
(function (pxt) {
    var docs;
    (function (docs) {
        var U = pxtc.Util;
        var markedInstance;
        var stdboxes = {};
        var stdmacros = {};
        var stdSetting = "<!-- @CMD@ @ARGS@ -->";
        var stdsettings = {
            "parent": stdSetting,
            "short": stdSetting,
            "description": "<!-- desc -->",
            "activities": "<!-- activities -->",
            "explicitHints": "<!-- hints -->",
            "flyoutOnly": "<!-- flyout -->",
            "hideIteration": "<!-- iter -->"
        };
        function replaceAll(replIn, x, y) {
            return replIn.split(x).join(y);
        }
        function htmlQuote(s) {
            s = replaceAll(s, "&", "&amp;");
            s = replaceAll(s, "<", "&lt;");
            s = replaceAll(s, ">", "&gt;");
            s = replaceAll(s, "\"", "&quot;");
            s = replaceAll(s, "\'", "&#39;");
            return s;
        }
        docs.htmlQuote = htmlQuote;
        // the input already should be HTML-quoted but we want to make sure, and also quote quotes
        function html2Quote(s) {
            if (!s)
                return s;
            return htmlQuote(s.replace(/\&([#a-z0-9A-Z]+);/g, function (f, ent) {
                switch (ent) {
                    case "amp": return "&";
                    case "lt": return "<";
                    case "gt": return ">";
                    case "quot": return "\"";
                    default:
                        if (ent[0] == "#")
                            return String.fromCharCode(parseInt(ent.slice(1)));
                        else
                            return f;
                }
            }));
        }
        docs.html2Quote = html2Quote;
        //The extra YouTube macros are in case there is a timestamp on the YouTube URL.
        //TODO: Add equivalent support for youtu.be links
        var links = [
            {
                rx: /^vimeo\.com\/(\d+)/i,
                cmd: "### @vimeo $1"
            },
            {
                rx: /^(www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]+(\#t=([0-9]+m[0-9]+s|[0-9]+m|[0-9]+s))?)/i,
                cmd: "### @youtube $2"
            }
        ];
        docs.requireMarked = function () {
            if (typeof marked !== "undefined")
                return marked;
            if (typeof require === "undefined")
                return undefined;
            return require("marked");
        };
        function parseHtmlAttrs(s) {
            var attrs = {};
            while (s.trim()) {
                var m = /\s*([^=\s]+)=("([^"]*)"|'([^']*)'|(\S*))/.exec(s);
                if (m) {
                    var v = m[3] || m[4] || m[5] || "";
                    attrs[m[1].toLowerCase()] = v;
                }
                else {
                    m = /^\s*(\S+)/.exec(s);
                    attrs[m[1]] = "true";
                }
                s = s.slice(m[0].length);
            }
            return attrs;
        }
        var error = function (s) {
            return "<div class='ui negative message'>" + htmlQuote(s) + "</div>";
        };
        function prepTemplate(d) {
            var boxes = U.clone(stdboxes);
            var macros = U.clone(stdmacros);
            var settings = U.clone(stdsettings);
            var menus = {};
            var toc = {};
            var params = d.params;
            var theme = d.theme;
            d.boxes = boxes;
            d.macros = macros;
            d.settings = settings;
            d.html = d.html.replace(/<aside\s+([^<>]+)>([^]*?)<\/aside>/g, function (full, attrsStr, body) {
                var attrs = parseHtmlAttrs(attrsStr);
                var name = attrs["data-name"] || attrs["id"];
                if (!name)
                    return error("id or data-name missing on macro");
                if (/box/.test(attrs["class"])) {
                    boxes[name] = body;
                }
                else if (/aside/.test(attrs["class"])) {
                    boxes[name] = "<!-- BEGIN-ASIDE " + name + " -->" + body + "<!-- END-ASIDE -->";
                }
                else if (/setting/.test(attrs["class"])) {
                    settings[name] = body;
                }
                else if (/menu/.test(attrs["class"])) {
                    menus[name] = body;
                }
                else if (/toc/.test(attrs["class"])) {
                    toc[name] = body;
                }
                else {
                    macros[name] = body;
                }
                return "<!-- macro " + name + " -->";
            });
            var recMenu = function (m, lev) {
                var templ = menus["item"];
                var mparams = {
                    NAME: m.name,
                };
                if (m.subitems) {
                    if (lev == 0)
                        templ = menus["top-dropdown"];
                    else
                        templ = menus["inner-dropdown"];
                    mparams["ITEMS"] = m.subitems.map(function (e) { return recMenu(e, lev + 1); }).join("\n");
                }
                else {
                    if (/^-+$/.test(m.name)) {
                        templ = menus["divider"];
                    }
                    if (m.path && !/^(https?:|\/)/.test(m.path))
                        return error("Invalid link: " + m.path);
                    mparams["LINK"] = m.path;
                }
                return injectHtml(templ, mparams, ["ITEMS"]);
            };
            var breadcrumb = [{
                    name: lf("Docs"),
                    href: "/docs"
                }];
            var TOC = d.TOC || theme.TOC || [];
            var tocPath = [];
            var isCurrentTOC = function (m) {
                for (var _i = 0, _a = m.subitems || []; _i < _a.length; _i++) {
                    var c = _a[_i];
                    if (isCurrentTOC(c)) {
                        tocPath.push(m);
                        return true;
                    }
                }
                if (d.filepath && d.filepath.indexOf(m.path) == 0) {
                    tocPath.push(m);
                    return true;
                }
                return false;
            };
            TOC.forEach(isCurrentTOC);
            var currentTocEntry;
            var recTOC = function (m, lev) {
                var templ = toc["item"];
                var mparams = {
                    NAME: m.name,
                };
                if (m.path && !/^(https?:|\/)/.test(m.path))
                    return error("Invalid link: " + m.path);
                if (/^\//.test(m.path) && d.versionPath)
                    m.path = "/" + d.versionPath + m.path;
                mparams["LINK"] = m.path;
                if (tocPath.indexOf(m) >= 0) {
                    mparams["ACTIVE"] = 'active';
                    mparams["EXPANDED"] = 'true';
                    currentTocEntry = m;
                    breadcrumb.push({
                        name: m.name,
                        href: m.path
                    });
                }
                else {
                    mparams["EXPANDED"] = 'false';
                }
                if (m.subitems && m.subitems.length > 0) {
                    if (lev == 0) {
                        if (m.name !== "") {
                            templ = toc["top-dropdown"];
                        }
                        else {
                            templ = toc["top-dropdown-noHeading"];
                        }
                    }
                    else if (lev == 1)
                        templ = toc["inner-dropdown"];
                    else
                        templ = toc["nested-dropdown"];
                    mparams["ITEMS"] = m.subitems.map(function (e) { return recTOC(e, lev + 1); }).join("\n");
                }
                else {
                    if (/^-+$/.test(m.name)) {
                        templ = toc["divider"];
                    }
                }
                return injectHtml(templ, mparams, ["ITEMS"]);
            };
            params["menu"] = (theme.docMenu || []).map(function (e) { return recMenu(e, 0); }).join("\n");
            params["TOC"] = TOC.map(function (e) { return recTOC(e, 0); }).join("\n");
            if (theme.appStoreID)
                params["appstoremeta"] = "<meta name=\"apple-itunes-app\" content=\"app-id=" + U.htmlEscape(theme.appStoreID) + "\"/>";
            var breadcrumbHtml = '';
            if (breadcrumb.length > 1) {
                breadcrumbHtml = "\n            <nav class=\"ui breadcrumb\" aria-label=\"" + lf("Breadcrumb") + "\">\n                " + breadcrumb.map(function (b, i) {
                    return "<a class=\"" + (i == breadcrumb.length - 1 ? "active" : "") + " section\"\n                        href=\"" + html2Quote(b.href) + "\" aria-current=\"" + (i == breadcrumb.length - 1 ? "page" : "") + "\">" + html2Quote(b.name) + "</a>";
                })
                    .join('<i class="right chevron icon divider"></i>') + "\n            </nav>";
            }
            params["breadcrumb"] = breadcrumbHtml;
            if (theme.boardName)
                params["boardname"] = html2Quote(theme.boardName);
            if (theme.boardNickname)
                params["boardnickname"] = html2Quote(theme.boardNickname);
            if (theme.driveDisplayName)
                params["drivename"] = html2Quote(theme.driveDisplayName);
            if (theme.homeUrl)
                params["homeurl"] = html2Quote(theme.homeUrl);
            params["targetid"] = theme.id || "???";
            params["targetname"] = theme.name || "Microsoft MakeCode";
            params["targetlogo"] = theme.docsLogo ? "<img aria-hidden=\"true\" role=\"presentation\" class=\"ui " + (theme.logoWide ? "small" : "mini") + " image\" src=\"" + theme.docsLogo + "\" />" : "";
            var ghURLs = d.ghEditURLs || [];
            if (ghURLs.length) {
                var ghText = "<p style=\"margin-top:1em\">\n";
                var linkLabel = lf("Edit this page on GitHub");
                for (var _i = 0, ghURLs_1 = ghURLs; _i < ghURLs_1.length; _i++) {
                    var u = ghURLs_1[_i];
                    ghText += "<a href=\"" + u + "\"><i class=\"write icon\"></i>" + linkLabel + "</a><br>\n";
                    linkLabel = lf("Edit template of this page on GitHub");
                }
                ghText += "</p>\n";
                params["github"] = ghText;
            }
            else {
                params["github"] = "";
            }
            // Add accessiblity menu
            var accMenuHtml = "\n            <a href=\"#maincontent\" class=\"ui item link\" tabindex=\"0\" role=\"menuitem\">" + lf("Skip to main content") + "</a>\n        ";
            params['accMenu'] = accMenuHtml;
            var printButtonTitleText = lf("Print this page");
            // Add print button
            var printBtnHtml = "\n            <button id=\"printbtn\" class=\"circular ui icon right floated button hideprint\" title=\"" + printButtonTitleText + "\" aria-label=\"" + printButtonTitleText + "\">\n                <i class=\"icon print\"></i>\n            </button>\n        ";
            params['printBtn'] = printBtnHtml;
            // Add sidebar toggle
            var sidebarToggleHtml = "\n            <a id=\"togglesidebar\" class=\"launch icon item\" tabindex=\"0\" title=\"Side menu\" aria-label=\"" + lf("Side menu") + "\" role=\"menu\" aria-expanded=\"false\">\n                <i class=\"content icon\"></i>\n            </a>\n        ";
            params['sidebarToggle'] = sidebarToggleHtml;
            // Add search bars
            var searchBarIds = ['tocsearch1', 'tocsearch2'];
            var searchBarsHtml = searchBarIds.map(function (searchBarId) {
                return "\n                <input type=\"search\" name=\"q\" placeholder=\"" + lf("Search...") + "\" aria-label=\"" + lf("Search Documentation") + "\">\n                <i onclick=\"document.getElementById('" + searchBarId + "').submit();\" tabindex=\"0\" class=\"search link icon\" aria-label=\"" + lf("Search") + "\" role=\"button\"></i>\n            ";
            });
            params["searchBar1"] = searchBarsHtml[0];
            params["searchBar2"] = searchBarsHtml[1];
            var style = '';
            if (theme.accentColor)
                style += "\n.ui.accent { color: " + theme.accentColor + "; }\n.ui.inverted.accent { background: " + theme.accentColor + "; }\n";
            params["targetstyle"] = style;
            params["tocclass"] = theme.lightToc ? "lighttoc" : "inverted";
            for (var _a = 0, _b = Object.keys(theme); _a < _b.length; _a++) {
                var k = _b[_a];
                var v = theme[k];
                if (params[k] === undefined && typeof v == "string")
                    params[k] = v;
            }
            d.finish = function () { return injectHtml(d.html, params, [
                "body",
                "menu",
                "accMenu",
                "TOC",
                "prev",
                "next",
                "printBtn",
                "breadcrumb",
                "targetlogo",
                "github",
                "JSON",
                "appstoremeta",
                "sidebarToggle",
                "searchBar1",
                "searchBar2"
            ]); };
            // Normalize any path URL with any version path in the current URL
            function normalizeUrl(href) {
                if (!href)
                    return href;
                var relative = href.indexOf('/') == 0;
                if (relative && d.versionPath)
                    href = "/" + d.versionPath + href;
                return href;
            }
        }
        docs.prepTemplate = prepTemplate;
        function setupRenderer(renderer) {
            renderer.image = function (href, title, text) {
                var out = '<img class="ui image" src="' + href + '" alt="' + text + '"';
                if (title) {
                    out += ' title="' + title + '"';
                }
                out += ' loading="lazy"';
                out += this.options.xhtml ? '/>' : '>';
                return out;
            };
            renderer.listitem = function (text) {
                var m = /^\s*\[( |x)\]/i.exec(text);
                if (m)
                    return "<li class=\"" + (m[1] == ' ' ? 'unchecked' : 'checked') + "\">" + text.slice(m[0].length) + '</li>\n';
                return '<li>' + text + '</li>\n';
            };
            renderer.heading = function (text, level, raw) {
                var m = /(.*)#([\w\-]+)\s*$/.exec(text);
                var id = "";
                if (m) {
                    text = m[1];
                    id = m[2];
                }
                else {
                    id = raw.toLowerCase().replace(/[^\w]+/g, '-');
                }
                // remove tutorial macros
                if (text)
                    text = text.replace(/@(fullscreen|unplugged)/g, '');
                return "<h" + level + " id=\"" + this.options.headerPrefix + id + "\">" + text + "</h" + level + ">";
            };
        }
        docs.setupRenderer = setupRenderer;
        function renderMarkdown(opts) {
            var hasPubInfo = true;
            if (!opts.pubinfo) {
                hasPubInfo = false;
                opts.pubinfo = {};
            }
            var pubinfo = opts.pubinfo;
            if (!opts.theme)
                opts.theme = {};
            delete opts.pubinfo["private"]; // just in case
            if (pubinfo["time"]) {
                var tm = parseInt(pubinfo["time"]);
                if (!pubinfo["timems"])
                    pubinfo["timems"] = 1000 * tm + "";
                if (!pubinfo["humantime"])
                    pubinfo["humantime"] = U.isoTime(tm);
            }
            if (pubinfo["name"]) {
                pubinfo["dirname"] = pubinfo["name"].replace(/[^A-Za-z0-9_]/g, "-");
                pubinfo["title"] = pubinfo["name"];
            }
            if (hasPubInfo) {
                pubinfo["JSON"] = JSON.stringify(pubinfo, null, 4).replace(/</g, "\\u003c");
            }
            var template = opts.template;
            template = template
                .replace(/<!--\s*@include\s+(\S+)\s*-->/g, function (full, fn) {
                var cont = (opts.theme.htmlDocIncludes || {})[fn] || "";
                return "<!-- include " + fn + " -->\n" + cont + "\n<!-- end include -->\n";
            });
            template = template
                .replace(/<!--\s*@(ifn?def)\s+(\w+)\s*-->([^]*?)<!--\s*@endif\s*-->/g, function (full, cond, sym, inner) {
                if ((cond == "ifdef" && pubinfo[sym]) || (cond == "ifndef" && !pubinfo[sym]))
                    return "<!-- " + cond + " " + sym + " -->" + inner + "<!-- endif -->";
                else
                    return "<!-- " + cond + " " + sym + " endif -->";
            });
            if (opts.locale)
                template = translate(template, opts.locale).text;
            var d = {
                html: template,
                theme: opts.theme,
                filepath: opts.filepath,
                versionPath: opts.versionPath,
                ghEditURLs: opts.ghEditURLs,
                params: pubinfo,
                TOC: opts.TOC
            };
            prepTemplate(d);
            if (!markedInstance) {
                markedInstance = docs.requireMarked();
            }
            // We have to re-create the renderer every time to avoid the link() function's closure capturing the opts
            var renderer = new markedInstance.Renderer();
            setupRenderer(renderer);
            var linkRenderer = renderer.link;
            renderer.link = function (href, title, text) {
                var relative = new RegExp('^[/#]').test(href);
                var target = !relative ? '_blank' : '';
                if (relative && d.versionPath)
                    href = "/" + d.versionPath + href;
                var html = linkRenderer.call(renderer, href, title, text);
                return html.replace(/^<a /, "<a " + (target ? "target=\"" + target + "\"" : '') + " rel=\"nofollow noopener\" ");
            };
            markedInstance.setOptions({
                renderer: renderer,
                gfm: true,
                tables: true,
                breaks: false,
                pedantic: false,
                sanitize: true,
                smartLists: true,
                smartypants: true
            });
            var markdown = opts.markdown;
            // append repo info if any
            if (opts.repo)
                markdown += "\n```package\n" + opts.repo.name.replace(/^pxt-/, '') + "=github:" + opts.repo.fullName + "#" + (opts.repo.tag || "master") + "\n```\n";
            //Uses the CmdLink definitions to replace links to YouTube and Vimeo (limited at the moment)
            markdown = markdown.replace(/^\s*https?:\/\/(\S+)\s*$/mg, function (f, lnk) {
                var _loop_1 = function (ent) {
                    var m = ent.rx.exec(lnk);
                    if (m) {
                        return { value: ent.cmd.replace(/\$(\d+)/g, function (f, k) {
                                return m[parseInt(k)] || "";
                            }) + "\n" };
                    }
                };
                for (var _i = 0, links_1 = links; _i < links_1.length; _i++) {
                    var ent = links_1[_i];
                    var state_1 = _loop_1(ent);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
                return f;
            });
            // replace pre-template in markdown
            markdown = markdown.replace(/@([a-z]+)@/ig, function (m, param) {
                var macro = pubinfo[param];
                if (!macro && opts.throwOnError)
                    U.userError("unknown macro " + param);
                return macro || 'unknown macro';
            });
            var html = markedInstance(markdown);
            // support for breaks which somehow don't work out of the box
            html = html.replace(/&lt;br\s*\/&gt;/ig, "<br/>");
            // github will render images if referenced as ![](/docs/static/foo.png)
            // we require /static/foo.png
            html = html.replace(/(<img [^>]* src=")\/docs\/static\/([^">]+)"/g, function (f, pref, addr) { return pref + '/static/' + addr + '"'; });
            var endBox = "";
            var boxSize = 0;
            function appendEndBox(size, box, html) {
                var r = html;
                if (size <= boxSize) {
                    r = endBox + r;
                    endBox = "";
                    boxSize = 0;
                }
                return r;
            }
            html = html.replace(/<h(\d)[^>]+>\s*([~@])?\s*(.*?)<\/h\d>/g, function (f, lvl, tp, body) {
                var m = /^(\w+)\s+(.*)/.exec(body);
                var cmd = m ? m[1] : body;
                var args = m ? m[2] : "";
                var rawArgs = args;
                args = html2Quote(args);
                cmd = html2Quote(cmd);
                lvl = parseInt(lvl);
                if (!tp) {
                    return appendEndBox(lvl, endBox, f);
                }
                else if (tp == "@") {
                    var expansion = U.lookup(d.settings, cmd);
                    if (expansion != null) {
                        pubinfo[cmd] = args;
                    }
                    else {
                        expansion = U.lookup(d.macros, cmd);
                        if (expansion == null) {
                            if (opts.throwOnError)
                                U.userError("Unknown command: @" + cmd);
                            return error("Unknown command: @" + cmd);
                        }
                    }
                    var ivars = {
                        ARGS: args,
                        CMD: cmd
                    };
                    return appendEndBox(lvl, endBox, injectHtml(expansion, ivars, ["ARGS", "CMD"]));
                }
                else {
                    if (!cmd) {
                        var r = endBox;
                        endBox = "";
                        return r;
                    }
                    var box = U.lookup(d.boxes, cmd);
                    if (box) {
                        var parts = box.split("@BODY@");
                        var r = appendEndBox(lvl, endBox, parts[0].replace("@ARGS@", args));
                        endBox = parts[1];
                        var attrs = box.match(/data-[^>\s]+/ig);
                        if (attrs && attrs.indexOf('data-inferred') >= 0) {
                            boxSize = lvl;
                        }
                        return r;
                    }
                    else {
                        if (opts.throwOnError)
                            U.userError("Unknown box: ~ " + cmd);
                        return error("Unknown box: ~ " + cmd);
                    }
                }
            });
            if (endBox)
                html = html + endBox;
            if (!pubinfo["title"]) {
                var titleM = /<h1[^<>]*>([^<>]+)<\/h1>/.exec(html);
                if (titleM)
                    pubinfo["title"] = html2Quote(titleM[1]);
            }
            if (!pubinfo["description"]) {
                var descM = /<p>([^]+?)<\/p>/.exec(html);
                if (descM)
                    pubinfo["description"] = html2Quote(descM[1]);
            }
            // try getting a better custom image for twitter
            var imgM = /<div class="ui embed mdvid"[^<>]+?data-placeholder="([^"]+)"[^>]*\/?>/i.exec(html)
                || /<img class="ui [^"]*image" src="([^"]+)"[^>]*\/?>/i.exec(html);
            if (imgM)
                pubinfo["cardLogo"] = html2Quote(imgM[1]);
            pubinfo["twitter"] = html2Quote(opts.theme.twitter || "@msmakecode");
            var registers = {};
            registers["main"] = ""; // first
            html = html.replace(/<!-- BEGIN-ASIDE (\S+) -->([^]*?)<!-- END-ASIDE -->/g, function (f, nam, cont) {
                var s = U.lookup(registers, nam);
                registers[nam] = (s || "") + cont;
                return "<!-- aside -->";
            });
            // fix up spourious newlines at the end of code blocks
            html = html.replace(/\n<\/code>/g, "</code>");
            registers["main"] = html;
            var injectBody = function (tmpl, body) {
                return injectHtml(d.boxes[tmpl] || "@BODY@", { BODY: body }, ["BODY"]);
            };
            html = "";
            for (var _i = 0, _a = Object.keys(registers); _i < _a.length; _i++) {
                var k = _a[_i];
                html += injectBody(k + "-container", registers[k]);
            }
            pubinfo["body"] = html;
            // don't mangle target name in title, it is already in the sitename
            pubinfo["name"] = pubinfo["title"] || "";
            for (var _b = 0, _c = Object.keys(opts.theme); _b < _c.length; _b++) {
                var k = _c[_b];
                var v = opts.theme[k];
                if (typeof v == "string")
                    pubinfo["theme_" + k] = v;
            }
            return d.finish();
        }
        docs.renderMarkdown = renderMarkdown;
        function injectHtml(template, vars, quoted) {
            if (quoted === void 0) { quoted = []; }
            if (!template)
                return '';
            return template.replace(/@(\w+)@/g, function (f, key) {
                var res = U.lookup(vars, key) || "";
                res += ""; // make sure it's a string
                if (quoted.indexOf(key) < 0) {
                    res = html2Quote(res);
                }
                return res;
            });
        }
        function embedUrl(rootUrl, tag, id, height) {
            var url = rootUrl + "#" + tag + ":" + id;
            var padding = '70%';
            return "<div style=\"position:relative;height:0;padding-bottom:" + padding + ";overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + url + "\" frameborder=\"0\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\"></iframe></div>";
        }
        docs.embedUrl = embedUrl;
        function runUrl(url, padding, id) {
            var embed = "<div style=\"position:relative;height:0;padding-bottom:" + padding + ";overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + url + "?id=" + encodeURIComponent(id) + "\" allowfullscreen=\"allowfullscreen\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\" frameborder=\"0\"></iframe></div>";
            return embed;
        }
        docs.runUrl = runUrl;
        function codeEmbedUrl(rootUrl, id, height) {
            var docurl = rootUrl + "---codeembed#pub:" + id;
            height = Math.ceil(height || 300);
            return "<div style=\"position:relative;height:calc(" + height + "px + 5em);width:100%;overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + docurl + "\" allowfullscreen=\"allowfullscreen\" frameborder=\"0\" sandbox=\"allow-scripts allow-same-origin\"></iframe></div>";
        }
        docs.codeEmbedUrl = codeEmbedUrl;
        var inlineTags = {
            b: 1,
            strong: 1,
            em: 1,
        };
        function translate(html, locale) {
            var missing = {};
            function translateOne(toTranslate) {
                var spm = /^(\s*)([^]*?)(\s*)$/.exec(toTranslate);
                var text = spm[2].replace(/\s+/g, " ");
                if (text == "" || /^((IE=edge,.*|width=device-width.*|(https?:\/\/|\/)[\w@\/\.]+|@[\-\w]+@|\{[^\{\}]+\}|[^a-zA-Z]*|(&nbsp;)+)\s*)+$/.test(text))
                    return null;
                var v = U.lookup(locale, text);
                if (v)
                    text = v;
                else
                    missing[text] = "";
                return spm[1] + text + spm[3];
            }
            html = html.replace(/<([\/\w]+)([^<>]*)>/g, function (full, tagname, args) {
                var key = tagname.replace(/^\//, "").toLowerCase();
                if (inlineTags[key] === 1)
                    return "&llt;" + tagname + args + "&ggt;";
                return full;
            });
            function ungt(s) {
                return s.replace(/&llt;/g, "<").replace(/&ggt;/g, ">");
            }
            html = "<start>" + html;
            html = html.replace(/(<([\/\w]+)([^<>]*)>)([^<>]+)/g, function (full, fullTag, tagname, args, str) {
                if (tagname == "script" || tagname == "style")
                    return ungt(full);
                var tr = translateOne(ungt(str));
                if (tr == null)
                    return ungt(full);
                return fullTag + tr;
            });
            html = html.replace(/(<[^<>]*)(content|placeholder|alt|title)="([^"]+)"/g, function (full, pref, attr, text) {
                var tr = translateOne(text);
                if (tr == null)
                    return full;
                return pref + attr + '="' + text.replace(/"/g, "''") + '"';
            });
            html = html.replace(/^<start>/g, "");
            return {
                text: html,
                missing: missing
            };
        }
        docs.translate = translate;
        function lookupSection(template, id) {
            if (template.id == id)
                return template;
            for (var _i = 0, _a = template.children; _i < _a.length; _i++) {
                var ch = _a[_i];
                var r = lookupSection(ch, id);
                if (r)
                    return r;
            }
            return null;
        }
        function splitMdSections(md, template) {
            var lineNo = 0;
            var openSections = [{
                    level: 0,
                    id: "",
                    title: "",
                    start: lineNo,
                    text: "",
                    children: []
                }];
            md = md.replace(/\r/g, "");
            var lines = md.split(/\n/);
            var skipThese = {};
            var _loop_2 = function (l) {
                var m = /^\s*(#+)\s*(.*?)(#(\S+)\s*)?$/.exec(l);
                var templSect = null;
                if (template && m) {
                    if (!m[4])
                        m = null;
                    else if (skipThese[m[4]])
                        m = null;
                    else {
                        templSect = lookupSection(template, m[4]);
                        var skip_1 = function (s) {
                            if (s.id)
                                skipThese[s.id] = true;
                            s.children.forEach(skip_1);
                        };
                        if (templSect)
                            skip_1(templSect);
                    }
                }
                if (m) {
                    var level = template ? 1 : m[1].length;
                    var s = {
                        level: level,
                        title: m[2].trim(),
                        id: m[4] || "",
                        start: lineNo,
                        text: "",
                        children: []
                    };
                    if (templSect) {
                        l = "";
                        for (var i = 0; i < templSect.level; ++i)
                            l += "#";
                        l += " ";
                        l += s.title || templSect.title;
                        l += " #" + s.id;
                    }
                    while (openSections[openSections.length - 1].level >= s.level)
                        openSections.pop();
                    var parent_1 = openSections[openSections.length - 1];
                    parent_1.children.push(s);
                    openSections.push(s);
                }
                openSections[openSections.length - 1].text += l + "\n";
                lineNo++;
            };
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var l = lines_1[_i];
                _loop_2(l);
            }
            return openSections[0];
        }
        function buildTOC(summaryMD) {
            if (!summaryMD)
                return null;
            var markedInstance = pxt.docs.requireMarked();
            var options = {
                renderer: new markedInstance.Renderer(),
                gfm: true,
                tables: false,
                breaks: false,
                pedantic: false,
                sanitize: false,
                smartLists: false,
                smartypants: false
            };
            var dummy = { name: 'dummy', subitems: [] };
            var currentStack = [];
            currentStack.push(dummy);
            var tokens = markedInstance.lexer(summaryMD, options);
            tokens.forEach(function (token) {
                switch (token.type) {
                    case "heading":
                        if (token.depth == 3) {
                            // heading
                        }
                        break;
                    case "list_start":
                        break;
                    case "list_item_start":
                    case "loose_item_start":
                        var newItem = {
                            name: '',
                            subitems: []
                        };
                        currentStack.push(newItem);
                        break;
                    case "text":
                        token.text.replace(/^\[(.*)\]\((.*)\)$/i, function (full, name, path) {
                            currentStack[currentStack.length - 1].name = name;
                            currentStack[currentStack.length - 1].path = path.replace('.md', '');
                        });
                        break;
                    case "list_item_end":
                    case "loose_item_end":
                        var docEntry = currentStack.pop();
                        currentStack[currentStack.length - 1].subitems.push(docEntry);
                        break;
                    case "list_end":
                        break;
                    default:
                }
            });
            var TOC = dummy.subitems;
            if (!TOC || TOC.length == 0)
                return null;
            return TOC;
        }
        docs.buildTOC = buildTOC;
        function visitTOC(toc, fn) {
            function visitEntry(entry) {
                fn(entry);
                if (entry.subitems)
                    entry.subitems.forEach(fn);
            }
            toc.forEach(visitEntry);
        }
        docs.visitTOC = visitTOC;
        var testedAugment = false;
        function augmentDocs(baseMd, childMd) {
            if (!testedAugment)
                testAugment();
            if (!childMd)
                return baseMd;
            var templ = splitMdSections(baseMd, null);
            var repl = splitMdSections(childMd, templ);
            var lookup = {};
            var used = {};
            for (var _i = 0, _a = repl.children; _i < _a.length; _i++) {
                var ch = _a[_i];
                U.assert(ch.children.length == 0);
                U.assert(!!ch.id);
                lookup[ch.id] = ch.text;
            }
            var replaceInTree = function (s) {
                if (s.id && lookup[s.id] !== undefined) {
                    used[s.id] = true;
                    s.text = lookup[s.id];
                    s.children = [];
                }
                s.children.forEach(replaceInTree);
            };
            replaceInTree(templ);
            var resMd = "";
            var flatten = function (s) {
                resMd += s.text;
                s.children.forEach(flatten);
            };
            flatten(templ);
            var leftover = "";
            var hd = repl.text
                .replace(/^\s*#+\s*@extends.*/mg, "")
                .replace(/^\s*\n/mg, "");
            if (hd.trim())
                leftover += hd.trim() + "\n";
            for (var _b = 0, _c = repl.children; _b < _c.length; _b++) {
                var s = _c[_b];
                if (!used[s.id])
                    leftover += s.text;
            }
            if (leftover) {
                resMd += "## Couldn't apply replacement logic to:\n" + leftover;
            }
            return resMd;
        }
        docs.augmentDocs = augmentDocs;
        function testAugment() {
            function test(a, b, c) {
                var r = augmentDocs(a, b).trim();
                c = c.trim();
                if (r != c) {
                    console.log("*** Template:\n" + a + "\n*** Input:\n" + b + "\n*** Expected:\n" + c + "\n*** Output:\n" + r);
                    throw new Error("augment docs test fail");
                }
            }
            testedAugment = true;
            var templ0 = "\n# T0\n## Examples #ex\n### Example 1\nTEx1\n### Example 2 #ex2\nTEx2\n### Example 3\nTEx3\n\n## See also #also\nTAlso\n";
            var inp0 = "\n# @extends\n# #ex2\nMy example\n## See Also These! #also\nMy links\n";
            var outp0 = "\n# T0\n## Examples #ex\n### Example 1\nTEx1\n### Example 2 #ex2\nMy example\n### Example 3\nTEx3\n\n## See Also These! #also\nMy links\n";
            var inp1 = "\n# @extends\n### #ex\nFoo\n#### Example 1\nEx1\n#### Example 2x #ex2\nEx2\n## See Also These! #also\nMy links\n";
            var outp1 = "\n# T0\n## Examples #ex\nFoo\n#### Example 1\nEx1\n#### Example 2x #ex2\nEx2\n## See Also These! #also\nMy links\n";
            test(templ0, "", templ0);
            test(templ0, " ", templ0);
            test(templ0, inp0, outp0);
            test(templ0, inp1, outp1);
        }
    })(docs = pxt.docs || (pxt.docs = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var gallery;
    (function (gallery) {
        function parsePackagesFromMarkdown(md) {
            var pm = /```package\s+((.|\s)+?)\s*```/i.exec(md);
            var dependencies = undefined;
            if (pm) {
                dependencies = {};
                pm[1].split('\n').map(function (s) { return s.replace(/\s*/g, ''); }).filter(function (s) { return !!s; })
                    .map(function (l) { return l.split('='); })
                    .forEach(function (kv) { return dependencies[kv[0]] = kv[1] || "*"; });
            }
            return dependencies;
        }
        gallery.parsePackagesFromMarkdown = parsePackagesFromMarkdown;
        function parseFeaturesFromMarkdown(md) {
            var pm = /```config\s+((.|\s)+?)\s*```/i.exec(md);
            var features = [];
            if (pm) {
                pm[1].split('\n').map(function (s) { return s.replace(/\s*/g, ''); }).filter(function (s) { return !!s; })
                    .map(function (l) { return l.split('='); })
                    .filter(function (kv) { return kv[0] == "feature" && !!kv[1]; })
                    .forEach(function (kv) { return features.push(kv[1]); });
            }
            return features.length ? features : undefined;
        }
        gallery.parseFeaturesFromMarkdown = parseFeaturesFromMarkdown;
        function parseExampleMarkdown(name, md) {
            if (!md)
                return undefined;
            var m = /```(blocks?|typescript)\s+((.|\s)+?)\s*```/i.exec(md);
            if (!m)
                return undefined;
            var dependencies = parsePackagesFromMarkdown(md);
            var src = m[2];
            var features = parseFeaturesFromMarkdown(md);
            return {
                name: name,
                filesOverride: {
                    "main.blocks": "<xml xmlns=\"http://www.w3.org/1999/xhtml\"></xml>",
                    "main.ts": src
                },
                dependencies: dependencies,
                features: features
            };
        }
        gallery.parseExampleMarkdown = parseExampleMarkdown;
        function parseGalleryMardown(md) {
            if (!md)
                return [];
            // second level titles are categories
            // ## foo bar
            // fenced code ```cards are sections of cards
            var galleries = [];
            var incard = false;
            var name = undefined;
            var cards = "";
            md.split(/\r?\n/).forEach(function (line) {
                // new category
                if (/^##/.test(line)) {
                    name = line.substr(2).trim();
                }
                else if (/^```codecard$/.test(line)) {
                    incard = true;
                }
                else if (/^```$/.test(line)) {
                    incard = false;
                    if (name && cards) {
                        try {
                            var cardsJSON = JSON.parse(cards);
                            if (cardsJSON && cardsJSON.length > 0)
                                galleries.push({ name: name, cards: cardsJSON });
                        }
                        catch (e) {
                            pxt.log('invalid card format in gallery');
                        }
                    }
                    cards = "";
                    name = undefined;
                }
                else if (incard)
                    cards += line + '\n';
            });
            return galleries;
        }
        gallery.parseGalleryMardown = parseGalleryMardown;
        function loadGalleryAsync(name) {
            return pxt.Cloud.markdownAsync(name, pxt.Util.userLanguage(), pxt.Util.localizeLive)
                .then(function (md) { return parseGalleryMardown(md); });
        }
        gallery.loadGalleryAsync = loadGalleryAsync;
        function loadExampleAsync(name, path) {
            return pxt.Cloud.markdownAsync(path, pxt.Util.userLanguage(), pxt.Util.localizeLive)
                .then(function (md) { return parseExampleMarkdown(name, md); });
        }
        gallery.loadExampleAsync = loadExampleAsync;
    })(gallery = pxt.gallery || (pxt.gallery = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    function hex2(n) {
        return ("0" + n.toString(16)).slice(-2);
    }
    function hex2str(h) {
        return pxt.U.uint8ArrayToString(pxt.U.fromHex(h));
    }
    function str2hex(h) {
        return pxt.U.toHex(pxt.U.stringToUint8Array(h));
    }
    var GDBServer = /** @class */ (function () {
        function GDBServer(io) {
            var _this = this;
            this.io = io;
            this.q = new pxt.U.PromiseQueue();
            this.dataBuf = "";
            this.numSent = 0;
            this.pktSize = 400;
            this.trace = false;
            this.bmpMode = true;
            this.targetInfo = "";
            this.onEvent = function (s) { };
            this.io.onData = function (b) { return _this.onData(b); };
        }
        GDBServer.prototype.onData = function (buf) {
            this.dataBuf += pxt.U.uint8ArrayToString(buf);
            while (this.dataBuf.length > 0) {
                var ch = this.dataBuf[0];
                if (ch == '+')
                    this.dataBuf = this.dataBuf.slice(1);
                else if (ch == '$' || ch == '%') {
                    var resp = this.decodeResp(this.dataBuf.slice(1));
                    if (resp != null) {
                        if (ch == '$') {
                            this.io.sendPacketAsync(this.buildCmd("+")).done();
                            if (this.onResponse)
                                this.onResponse(resp);
                            else {
                                // ignore unexpected responses right after connection
                                // they are likely left-over from a previous session
                                if (this.numSent > 0)
                                    this.io.error("unexpected response: " + resp);
                            }
                        }
                        else {
                            this.onEvent(resp);
                        }
                    }
                    else {
                        break;
                    }
                }
                else {
                    this.io.error("invalid character: " + ch);
                }
            }
        };
        GDBServer.prototype.buildCmd = function (cmd) {
            if (cmd == "+")
                return pxt.U.stringToUint8Array(cmd);
            var r = "";
            for (var i = 0; i < cmd.length; ++i) {
                var ch_1 = cmd.charAt(i);
                if (ch_1 == '}' || ch_1 == '#' || ch_1 == '$') {
                    r += '}';
                    r += String.fromCharCode(ch_1.charCodeAt(0) ^ 0x20);
                }
                else {
                    r += ch_1;
                }
            }
            var ch = 0;
            cmd = r;
            for (var i = 0; i < cmd.length; ++i) {
                ch = (ch + cmd.charCodeAt(i)) & 0xff;
            }
            r = "$" + cmd + "#" + hex2(ch);
            return pxt.U.stringToUint8Array(r);
        };
        GDBServer.prototype.decodeResp = function (resp) {
            var r = "";
            for (var i = 0; i < resp.length; ++i) {
                var ch = resp[i];
                if (ch == '}') {
                    ++i;
                    r += String.fromCharCode(resp.charCodeAt(i) ^ 0x20);
                }
                else if (ch == '*') {
                    ++i;
                    var rep = resp.charCodeAt(i) - 29;
                    var ch_2 = r.charAt(r.length - 1);
                    while (rep-- > 0)
                        r += ch_2;
                }
                else if (ch == '#') {
                    var checksum = resp.slice(i + 1, i + 3);
                    if (checksum.length == 2) {
                        // TODO validate checksum?
                        this.dataBuf = resp.slice(i + 3);
                        return r;
                    }
                    else {
                        // incomplete
                        return null;
                    }
                }
                else {
                    r += ch;
                }
            }
            return null;
        };
        GDBServer.prototype.sendCmdOKAsync = function (cmd) {
            return this.sendCmdAsync(cmd, function (r) { return r == "OK"; });
        };
        GDBServer.prototype.error = function (msg) {
            this.io.error(msg);
            this.io.disconnectAsync().done();
        };
        GDBServer.prototype.sendCmdAsync = function (cmd, respTest) {
            var _this = this;
            this.numSent++;
            var cmd2 = this.buildCmd(cmd);
            return this.q.enqueue("one", function () {
                return respTest === null ? _this.io.sendPacketAsync(cmd2).then(function () { return null; }) :
                    new Promise(function (resolve) {
                        _this.onResponse = function (v) {
                            _this.onResponse = null;
                            if (_this.trace)
                                pxt.log("GDB: '" + cmd + "' -> '" + v + "'");
                            if (respTest !== undefined && !respTest(v))
                                _this.error("Invalid GDB command response: '" + cmd + "' -> '" + v + "'");
                            resolve(v);
                        };
                        _this.io.sendPacketAsync(cmd2).done();
                    });
            });
        };
        GDBServer.prototype.sendRCmdAsync = function (cmd) {
            return this.sendMCmdAsync("qRcmd," + str2hex(cmd));
        };
        GDBServer.prototype.sendMCmdAsync = function (cmd) {
            var _this = this;
            this.numSent++;
            var cmd2 = this.buildCmd(cmd);
            var r = "";
            return this.q.enqueue("one", function () {
                return new Promise(function (resolve) {
                    _this.onResponse = function (v) {
                        if (v != "OK" && v[0] == "O")
                            r += hex2str(v.slice(1));
                        else {
                            if (v != "OK")
                                r += " - " + v;
                            _this.onResponse = null;
                            if (_this.trace)
                                pxt.log("Final GDB: '" + cmd + "' -> '" + r + "'");
                            resolve(r);
                        }
                    };
                    _this.io.sendPacketAsync(cmd2).done();
                });
            });
        };
        GDBServer.prototype.write32Async = function (addr, data) {
            var b = new Uint8Array(4);
            pxt.HF2.write32(b, 0, data);
            return this.writeMemAsync(addr, b);
        };
        GDBServer.prototype.writeMemAsync = function (addr, data) {
            var maxBytes = this.pktSize / 2 - 10;
            pxt.U.assert(data.length < maxBytes);
            return this.sendCmdOKAsync("M" + addr.toString(16) + "," +
                data.length.toString(16) + ":" + pxt.U.toHex(data))
                .then(function (r) {
                console.log(r);
            });
        };
        GDBServer.prototype.readMemAsync = function (addr, bytes) {
            var _this = this;
            var maxBytes = this.pktSize / 2 - 6;
            if (bytes > maxBytes) {
                var result_1 = new Uint8Array(bytes);
                var loop_1 = function (ptr) {
                    var len = Math.min(bytes - ptr, maxBytes);
                    if (len == 0)
                        return Promise.resolve(result_1);
                    return _this.readMemAsync(addr + ptr, len)
                        .then(function (part) {
                        pxt.U.memcpy(result_1, ptr, part);
                        return loop_1(ptr + len);
                    });
                };
                return loop_1(0);
            }
            return this.sendCmdAsync("m" + addr.toString(16) + "," + bytes.toString(16))
                .then(function (res) { return pxt.U.fromHex(res); });
        };
        GDBServer.prototype.initBMPAsync = function () {
            var _this = this;
            return Promise.resolve()
                .then(function () { return _this.sendRCmdAsync("swdp_scan"); })
                .then(function (r) {
                _this.targetInfo = r;
                return _this.sendCmdAsync("vAttach;1", function (r) { return r[0] == "T"; });
            })
                .then(function () { });
        };
        GDBServer.prototype.initAsync = function () {
            var _this = this;
            return Promise.delay(1000)
                .then(function () { return _this.sendCmdAsync("!"); }) // extended mode
                .then(function () { return _this.sendCmdAsync("qSupported"); })
                .then(function (res) {
                var features = {};
                res = ";" + res + ";";
                res = res
                    .replace(/;([^;]+)[=:]([^:;]+)/g, function (f, k, v) {
                    features[k] = v;
                    return ";";
                });
                _this.pktSize = parseInt(features["PacketSize"]) || 1024;
                pxt.log("GDB-server caps: " + JSON.stringify(features)
                    + " " + res.replace(/;+/g, ";"));
                if (_this.bmpMode)
                    return _this.initBMPAsync();
                else {
                    // continue
                    return _this.sendCmdAsync("c")
                        .then(function () { });
                }
                // return this.sendCmdAsync("?") // reason for stop
            });
        };
        return GDBServer;
    }());
    pxt.GDBServer = GDBServer;
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var github;
    (function (github) {
        github.token = null;
        github.forceProxy = false;
        function useProxy() {
            if (github.forceProxy)
                return true;
            if (pxt.U.isNodeJS)
                return false; // bypass proxy for CLI
            if (github.token)
                return false;
            if (pxt.appTarget && pxt.appTarget.cloud && pxt.appTarget.cloud.noGithubProxy)
                return false; // target requests no proxy
            return true;
        }
        github.useProxy = useProxy;
        var isPrivateRepoCache = {};
        function ghRequestAsync(opts) {
            if (github.token) {
                if (opts.url.indexOf('?') > 0)
                    opts.url += "&";
                else
                    opts.url += "?";
                opts.url += "access_token=" + github.token;
                opts.url += "&anti_cache=" + Math.random();
                // Token in headers doesn't work with CORS, especially for githubusercontent.com
                //if (!opts.headers) opts.headers = {}
                //opts.headers['Authorization'] = `token ${token}`
            }
            return pxt.U.requestAsync(opts);
        }
        function ghGetJsonAsync(url) {
            return ghRequestAsync({ url: url }).then(function (resp) { return resp.json; });
        }
        function ghGetTextAsync(url) {
            return ghRequestAsync({ url: url }).then(function (resp) { return resp.text; });
        }
        var MemoryGithubDb = /** @class */ (function () {
            function MemoryGithubDb() {
                this.configs = {};
                this.packages = {};
            }
            MemoryGithubDb.prototype.proxyLoadPackageAsync = function (repopath, tag) {
                var _this = this;
                // cache lookup
                var key = repopath + "/" + tag;
                var res = this.packages[key];
                if (res) {
                    pxt.debug("github cache " + repopath + "/" + tag + "/text");
                    return Promise.resolve(res);
                }
                // load and cache
                return pxt.U.httpGetJsonAsync(pxt.Cloud.apiRoot + "gh/" + repopath + "/" + tag + "/text")
                    .then(function (v) { return _this.packages[key] = { files: v }; });
            };
            MemoryGithubDb.prototype.loadConfigAsync = function (repopath, tag) {
                var _this = this;
                if (!tag)
                    tag = "master";
                // cache lookup
                var key = repopath + "/" + tag;
                var res = this.configs[key];
                if (res) {
                    pxt.debug("github cache " + repopath + "/" + tag + "/config");
                    return Promise.resolve(pxt.U.clone(res));
                }
                var cacheConfig = function (v) {
                    var cfg = JSON.parse(v);
                    _this.configs[key] = cfg;
                    return pxt.U.clone(cfg);
                };
                // download and cache
                if (useProxy()) {
                    // this is a bit wasteful, we just need pxt.json and download everything
                    return this.proxyLoadPackageAsync(repopath, tag)
                        .then(function (v) { return cacheConfig(v.files[pxt.CONFIG_NAME]); });
                }
                return downloadTextAsync(repopath, tag, pxt.CONFIG_NAME)
                    .then(function (cfg) { return cacheConfig(cfg); });
            };
            MemoryGithubDb.prototype.loadPackageAsync = function (repopath, tag) {
                var _this = this;
                if (!tag)
                    tag = "master";
                if (useProxy())
                    return this.proxyLoadPackageAsync(repopath, tag).then(function (v) { return pxt.U.clone(v); });
                return tagToShaAsync(repopath, tag)
                    .then(function (sha) {
                    // cache lookup
                    var key = repopath + "/" + sha;
                    var res = _this.packages[key];
                    if (res) {
                        pxt.debug("github cache " + repopath + "/" + tag + "/text");
                        return Promise.resolve(pxt.U.clone(res));
                    }
                    // load and cache
                    pxt.log("Downloading " + repopath + "/" + tag + " -> " + sha);
                    return downloadTextAsync(repopath, sha, pxt.CONFIG_NAME)
                        .then(function (pkg) {
                        var current = {
                            files: {}
                        };
                        current.files[pxt.CONFIG_NAME] = pkg;
                        var cfg = JSON.parse(pkg);
                        return Promise.map(pxt.allPkgFiles(cfg).slice(1), function (fn) { return downloadTextAsync(repopath, sha, fn)
                            .then(function (text) {
                            current.files[fn] = text;
                        }); })
                            .then(function () {
                            // cache!
                            _this.packages[key] = current;
                            return pxt.U.clone(current);
                        });
                    });
                });
            };
            return MemoryGithubDb;
        }());
        github.MemoryGithubDb = MemoryGithubDb;
        function fallbackDownloadTextAsync(repopath, commitid, filepath) {
            return ghRequestAsync({
                url: "https://api.github.com/repos/" + repopath + "/contents/" + filepath + "?ref=" + commitid
            }).then(function (resp) {
                var f = resp.json;
                isPrivateRepoCache[repopath] = true;
                // if they give us content, just return it
                if (f && f.encoding == "base64" && f.content != null)
                    return atob(f.content);
                // otherwise, go to download URL
                return pxt.U.httpGetTextAsync(f.download_url);
            });
        }
        function downloadTextAsync(repopath, commitid, filepath) {
            // raw.githubusercontent.com doesn't accept ?access_toke=... and has wrong CORS settings
            // for Authorization: header; so try anonymous access first, and otherwise fetch using API
            if (isPrivateRepoCache[repopath])
                return fallbackDownloadTextAsync(repopath, commitid, filepath);
            return pxt.U.requestAsync({
                url: "https://raw.githubusercontent.com/" + repopath + "/" + commitid + "/" + filepath,
                allowHttpErrors: true
            }).then(function (resp) {
                if (resp.statusCode == 200)
                    return resp.text;
                return fallbackDownloadTextAsync(repopath, commitid, filepath);
            });
        }
        github.downloadTextAsync = downloadTextAsync;
        // overriden by client
        github.db = new MemoryGithubDb();
        function getCommitAsync(repopath, sha) {
            return ghGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/commits/" + sha)
                .then(function (commit) { return ghGetJsonAsync(commit.tree.url + "?recursive=1")
                .then(function (tree) {
                commit.tree = tree;
                return commit;
            }); });
        }
        github.getCommitAsync = getCommitAsync;
        function ghPostAsync(path, data) {
            return ghRequestAsync({
                url: /^https:/.test(path) ? path : "https://api.github.com/repos/" + path,
                method: "POST",
                allowHttpErrors: true,
                data: data
            }).then(function (resp) {
                if (resp.statusCode == 200 || resp.statusCode == 202 || resp.statusCode == 201 || resp.statusCode == 204)
                    return resp.json;
                var e = new Error(lf("Cannot create object at github.com/{0}; code: {1}", path, resp.statusCode));
                e.statusCode = resp.statusCode;
                e.isUserError = true;
                if (resp.statusCode == 404)
                    e.needsWritePermission = true;
                throw e;
            });
        }
        function createObjectAsync(repopath, type, data) {
            return ghPostAsync(repopath + "/git/" + type + "s", data)
                .then(function (resp) { return resp.sha; });
        }
        github.createObjectAsync = createObjectAsync;
        function fastForwardAsync(repopath, branch, commitid) {
            return __awaiter(this, void 0, void 0, function () {
                var resp;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, ghRequestAsync({
                                url: "https://api.github.com/repos/" + repopath + "/git/refs/heads/" + branch,
                                method: "PATCH",
                                allowHttpErrors: true,
                                data: {
                                    sha: commitid,
                                    force: false
                                }
                            })];
                        case 1:
                            resp = _a.sent();
                            return [2 /*return*/, (resp.statusCode == 200)];
                    }
                });
            });
        }
        github.fastForwardAsync = fastForwardAsync;
        function putFileAsync(repopath, path, content) {
            return __awaiter(this, void 0, void 0, function () {
                var resp;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, ghRequestAsync({
                                url: "https://api.github.com/repos/" + repopath + "/contents/" + path,
                                method: "PUT",
                                allowHttpErrors: true,
                                data: {
                                    message: lf("Initialize empty repo"),
                                    content: btoa(pxt.U.toUTF8(content)),
                                    branch: "master"
                                }
                            })];
                        case 1:
                            resp = _a.sent();
                            if (resp.statusCode != 201)
                                pxt.U.userError("PUT file failed");
                            return [2 /*return*/];
                    }
                });
            });
        }
        github.putFileAsync = putFileAsync;
        function createTagAsync(repopath, tag, commitid) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, ghPostAsync(repopath + "/git/refs", {
                                ref: "refs/tags/" + tag,
                                sha: commitid
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        github.createTagAsync = createTagAsync;
        function createPRFromBranchAsync(repopath, baseBranch, headBranch, msg) {
            return __awaiter(this, void 0, void 0, function () {
                var res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, ghPostAsync(repopath + "/pulls", {
                                title: msg,
                                body: lf("Automatically created from MakeCode."),
                                head: headBranch,
                                base: baseBranch,
                                maintainer_can_modify: true
                            })];
                        case 1:
                            res = _a.sent();
                            return [2 /*return*/, res.html_url];
                    }
                });
            });
        }
        github.createPRFromBranchAsync = createPRFromBranchAsync;
        function mergeAsync(repopath, branch, commitid) {
            return ghRequestAsync({
                url: "https://api.github.com/repos/" + repopath + "/merges",
                method: "POST",
                allowHttpErrors: true,
                data: {
                    base: branch,
                    head: commitid
                }
            }).then(function (resp) {
                if (resp.statusCode == 201 || resp.statusCode == 204)
                    return resp.json.sha;
                if (resp.statusCode == 409) {
                    // conflict
                    return null;
                }
                throw pxt.U.userError(lf("Cannot merge in github.com/{1}; code: {2}", repopath, resp.statusCode));
            });
        }
        github.mergeAsync = mergeAsync;
        function getRefAsync(repopath, branch) {
            return ghGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/heads/" + branch)
                .then(resolveRefAsync);
        }
        github.getRefAsync = getRefAsync;
        function generateNextRefName(res, pref) {
            var n = 1;
            while (res.refs[pref + n])
                n++;
            return pref + n;
        }
        function getNewBranchNameAsync(repopath, pref) {
            if (pref === void 0) { pref = "patch-"; }
            return __awaiter(this, void 0, void 0, function () {
                var res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, listRefsExtAsync(repopath, "heads")];
                        case 1:
                            res = _a.sent();
                            return [2 /*return*/, generateNextRefName(res, pref)];
                    }
                });
            });
        }
        github.getNewBranchNameAsync = getNewBranchNameAsync;
        function createNewBranchAsync(repopath, branchName, commitid) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, ghPostAsync(repopath + "/git/refs", {
                                ref: "refs/heads/" + branchName,
                                sha: commitid
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, branchName];
                    }
                });
            });
        }
        github.createNewBranchAsync = createNewBranchAsync;
        function forkRepoAsync(repopath, commitid, pref) {
            if (pref === void 0) { pref = "pr-"; }
            return __awaiter(this, void 0, void 0, function () {
                var res, repoInfo, endTm, refs, err_2, branchName;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, ghPostAsync(repopath + "/forks", {})];
                        case 1:
                            res = _a.sent();
                            repoInfo = mkRepo(res, null);
                            endTm = Date.now() + 5 * 60 * 1000;
                            refs = null;
                            _a.label = 2;
                        case 2:
                            if (!(!refs && Date.now() < endTm)) return [3 /*break*/, 8];
                            return [4 /*yield*/, Promise.delay(1000)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, listRefsExtAsync(repoInfo.fullName, "heads")];
                        case 5:
                            refs = _a.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            err_2 = _a.sent();
                            return [3 /*break*/, 7];
                        case 7: return [3 /*break*/, 2];
                        case 8:
                            if (!refs)
                                throw new Error(lf("Timeout waiting for fork"));
                            branchName = generateNextRefName(refs, pref);
                            return [4 /*yield*/, createNewBranchAsync(repoInfo.fullName, branchName, commitid)];
                        case 9:
                            _a.sent();
                            return [2 /*return*/, repoInfo.fullName + "#" + branchName];
                    }
                });
            });
        }
        github.forkRepoAsync = forkRepoAsync;
        function listRefsAsync(repopath, namespace) {
            if (namespace === void 0) { namespace = "tags"; }
            return listRefsExtAsync(repopath, namespace)
                .then(function (res) { return Object.keys(res.refs); });
        }
        github.listRefsAsync = listRefsAsync;
        function listRefsExtAsync(repopath, namespace) {
            if (namespace === void 0) { namespace = "tags"; }
            var head = null;
            var fetch = !useProxy() ?
                ghGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/" + namespace + "/?per_page=100") :
                pxt.U.httpGetJsonAsync(pxt.Cloud.apiRoot + "gh/" + repopath + "/refs")
                    .then(function (r) {
                    var res = Object.keys(r.refs)
                        .filter(function (k) { return pxt.U.startsWith(k, "refs/" + namespace + "/"); })
                        .map(function (k) { return ({ ref: k, object: { sha: r.refs[k] } }); });
                    head = r.refs["HEAD"];
                    return res;
                });
            var clean = function (x) { return x.replace(/^refs\/[^\/]+\//, ""); };
            return fetch.then(function (resp) {
                resp.sort(function (a, b) { return pxt.semver.strcmp(clean(a.ref), clean(b.ref)); });
                var r = {};
                for (var _i = 0, resp_1 = resp; _i < resp_1.length; _i++) {
                    var obj = resp_1[_i];
                    r[clean(obj.ref)] = obj.object.sha;
                }
                return { refs: r, head: head };
            }, function (err) {
                if (err.statusCode == 404)
                    return { refs: {} };
                else
                    return Promise.reject(err);
            });
        }
        github.listRefsExtAsync = listRefsExtAsync;
        function resolveRefAsync(r) {
            if (r.object.type == "commit")
                return Promise.resolve(r.object.sha);
            else if (r.object.type == "tag")
                return ghGetJsonAsync(r.object.url)
                    .then(function (r) {
                    return r.object.type == "commit" ? r.object.sha :
                        Promise.reject(new Error("Bad type (2nd order) " + r.object.type));
                });
            else
                return Promise.reject(new Error("Bad type " + r.object.type));
        }
        function tagToShaAsync(repopath, tag) {
            if (/^[a-f0-9]{40}$/.test(tag))
                return Promise.resolve(tag);
            return ghGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/tags/" + tag)
                .then(resolveRefAsync, function (e) {
                return ghGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/heads/" + tag)
                    .then(resolveRefAsync);
            });
        }
        function pkgConfigAsync(repopath, tag) {
            if (tag === void 0) { tag = "master"; }
            return github.db.loadConfigAsync(repopath, tag);
        }
        github.pkgConfigAsync = pkgConfigAsync;
        function downloadPackageAsync(repoWithTag, config) {
            var p = parseRepoId(repoWithTag);
            if (!p) {
                pxt.log('Unknown github syntax');
                return Promise.resolve(undefined);
            }
            if (isRepoBanned(p, config)) {
                pxt.tickEvent("github.download.banned");
                pxt.log('Github repo is banned');
                return Promise.resolve(undefined);
            }
            return github.db.loadPackageAsync(p.fullName, p.tag);
        }
        github.downloadPackageAsync = downloadPackageAsync;
        var GitRepoStatus;
        (function (GitRepoStatus) {
            GitRepoStatus[GitRepoStatus["Unknown"] = 0] = "Unknown";
            GitRepoStatus[GitRepoStatus["Approved"] = 1] = "Approved";
            GitRepoStatus[GitRepoStatus["Banned"] = 2] = "Banned";
        })(GitRepoStatus = github.GitRepoStatus || (github.GitRepoStatus = {}));
        function listUserReposAsync() {
            return ghGetJsonAsync("https://api.github.com/user/repos?per_page=200&sort=updated&affiliation=owner,collaborator")
                .then(function (res) { return res.map(function (r) { return mkRepo(r, null); }); });
        }
        github.listUserReposAsync = listUserReposAsync;
        function createRepoAsync(name, description, priv) {
            return ghPostAsync("https://api.github.com/user/repos", {
                name: name,
                description: description,
                private: !!priv,
                has_issues: true,
                has_projects: false,
                has_wiki: false,
            }).then(function (v) { return mkRepo(v, null); });
        }
        github.createRepoAsync = createRepoAsync;
        function repoIconUrl(repo) {
            if (repo.status != GitRepoStatus.Approved)
                return undefined;
            return mkRepoIconUrl(repo);
        }
        github.repoIconUrl = repoIconUrl;
        function mkRepoIconUrl(repo) {
            return pxt.Cloud.apiRoot + ("gh/" + repo.fullName + "/icon");
        }
        github.mkRepoIconUrl = mkRepoIconUrl;
        function mkRepo(r, config, tag) {
            if (!r)
                return undefined;
            var rr = {
                owner: r.owner.login.toLowerCase(),
                fullName: r.full_name.toLowerCase(),
                name: r.name,
                description: r.description,
                defaultBranch: r.default_branch,
                tag: tag,
                updatedAt: Math.round(new Date(r.updated_at).getTime() / 1000),
                fork: r.fork,
                private: r.private,
            };
            rr.status = repoStatus(rr, config);
            return rr;
        }
        function repoStatus(rr, config) {
            return isRepoBanned(rr, config) ? GitRepoStatus.Banned
                : isRepoApproved(rr, config) ? GitRepoStatus.Approved
                    : GitRepoStatus.Unknown;
        }
        github.repoStatus = repoStatus;
        function isOrgBanned(repo, config) {
            if (!config)
                return false; // don't know
            if (!repo || !repo.owner)
                return true;
            if (config.bannedOrgs
                && config.bannedOrgs.some(function (org) { return org.toLowerCase() == repo.owner.toLowerCase(); }))
                return true;
            return false;
        }
        function isRepoBanned(repo, config) {
            if (isOrgBanned(repo, config))
                return true;
            if (!config)
                return false; // don't know
            if (!repo || !repo.fullName)
                return true;
            if (config.bannedRepos
                && config.bannedRepos.some(function (fn) { return fn.toLowerCase() == repo.fullName.toLowerCase(); }))
                return true;
            return false;
        }
        function isOrgApproved(repo, config) {
            if (!repo || !config)
                return false;
            if (repo.owner
                && config.approvedOrgs
                && config.approvedOrgs.some(function (org) { return org.toLowerCase() == repo.owner.toLowerCase(); }))
                return true;
            return false;
        }
        function isRepoApproved(repo, config) {
            if (isOrgApproved(repo, config))
                return true;
            if (!repo || !config)
                return false;
            if (repo.fullName
                && config.approvedRepos
                && config.approvedRepos.some(function (fn) { return fn.toLowerCase() == repo.fullName.toLowerCase(); }))
                return true;
            return false;
        }
        function repoAsync(id, config) {
            var rid = parseRepoId(id);
            var status = repoStatus(rid, config);
            if (status == GitRepoStatus.Banned)
                return Promise.resolve(undefined);
            if (!useProxy())
                return ghGetJsonAsync("https://api.github.com/repos/" + rid.fullName)
                    .then(function (r) { return mkRepo(r, config, rid.tag); });
            // always use proxy
            return pxt.Util.httpGetJsonAsync(pxt.Cloud.apiRoot + "gh/" + rid.fullName)
                .then(function (meta) {
                if (!meta)
                    return undefined;
                return {
                    github: true,
                    owner: rid.owner,
                    fullName: rid.fullName,
                    name: meta.name,
                    description: meta.description,
                    defaultBranch: "master",
                    tag: rid.tag,
                    status: status
                };
            }).catch(function (err) {
                pxt.reportException(err);
                return undefined;
            });
        }
        github.repoAsync = repoAsync;
        function searchAsync(query, config) {
            if (!config)
                return Promise.resolve([]);
            var repos = query.split('|').map(parseRepoUrl).filter(function (repo) { return !!repo; });
            if (repos.length > 0)
                return Promise.all(repos.map(function (id) { return repoAsync(id.path, config); }))
                    .then(function (rs) { return rs.filter(function (r) { return r && r.status != GitRepoStatus.Banned; }); }); // allow deep links to github repos
            var fetch = function () { return useProxy()
                ? pxt.U.httpGetJsonAsync(pxt.Cloud.apiRoot + "ghsearch/" + pxt.appTarget.id + "/" + (pxt.appTarget.platformid || pxt.appTarget.id) + "?q="
                    + encodeURIComponent(query))
                : ghGetJsonAsync("https://api.github.com/search/repositories?q="
                    + encodeURIComponent(query + (" in:name,description,readme \"for PXT/" + (pxt.appTarget.platformid || pxt.appTarget.id) + "\""))); };
            return fetch()
                .then(function (rs) {
                return rs.items.map(function (item) { return mkRepo(item, config); })
                    .filter(function (r) { return r.status == GitRepoStatus.Approved || (config.allowUnapproved && r.status == GitRepoStatus.Unknown); })
                    .filter(function (r) { return !pxt.appTarget.appTheme.githubUrl || "https://github.com/" + r.fullName != pxt.appTarget.appTheme.githubUrl.toLowerCase(); });
            })
                .catch(function (err) { return []; }); // offline
        }
        github.searchAsync = searchAsync;
        function parseRepoUrl(url) {
            if (!url)
                return undefined;
            var m = /^((https:\/\/)?github.com\/)?([^/]+\/[^/#]+)\/?(#(\w+))?$/i.exec(url.trim());
            if (!m)
                return undefined;
            var r = {
                repo: m ? m[3].toLowerCase() : null,
                tag: m ? m[5] : null
            };
            r.path = r.repo + (r.tag ? '#' + r.tag : '');
            return r;
        }
        github.parseRepoUrl = parseRepoUrl;
        // parse https://github.com/[company]/[project](/filepath)(#tag)
        function parseRepoId(repo) {
            if (!repo)
                return undefined;
            repo = repo.replace(/^github:/i, "");
            repo = repo.replace(/^https:\/\/github\.com\//i, "");
            repo = repo.replace(/\.git\b/i, "");
            var m = /([^#]+)(#(.*))?/.exec(repo);
            var nameAndFile = m ? m[1] : null;
            var tag = m ? m[3] : null;
            var owner;
            var project;
            var fullName;
            var fileName;
            if (m) {
                var parts = nameAndFile.split('/');
                owner = parts[0];
                project = parts[1];
                fullName = owner + "/" + project;
                if (parts.length > 2)
                    fileName = parts.slice(2).join('/');
            }
            else {
                fullName = repo.toLowerCase();
            }
            return {
                owner: owner,
                project: project,
                fullName: fullName,
                tag: tag,
                fileName: fileName
            };
        }
        github.parseRepoId = parseRepoId;
        function toGithubDependencyPath(id) {
            var r = "github:" + id.fullName;
            if (id.tag)
                r += "#" + id.tag;
            return r;
        }
        github.toGithubDependencyPath = toGithubDependencyPath;
        function isGithubId(id) {
            if (!id)
                return false;
            return id.slice(0, 7) == "github:";
        }
        github.isGithubId = isGithubId;
        function stringifyRepo(p) {
            return p ? "github:" + p.fullName.toLowerCase() + "#" + (p.tag || "master") : undefined;
        }
        github.stringifyRepo = stringifyRepo;
        function noramlizeRepoId(id) {
            var gid = parseRepoId(id);
            gid.tag = gid.tag || "master";
            return stringifyRepo(gid);
        }
        github.noramlizeRepoId = noramlizeRepoId;
        function latestVersionAsync(path, config) {
            var parsed = parseRepoId(path);
            if (!parsed)
                return Promise.resolve(null);
            return repoAsync(parsed.fullName, config)
                .then(function (scr) {
                if (!scr)
                    return undefined;
                return listRefsExtAsync(scr.fullName, "tags")
                    .then(function (refsRes) {
                    var tags = Object.keys(refsRes.refs);
                    // only look for semver tags
                    tags = pxt.semver.sortLatestTags(tags);
                    // check if the version has been frozen for this release
                    var targetVersion = pxt.appTarget.versions && pxt.semver.tryParse(pxt.appTarget.versions.target);
                    if (targetVersion && config.releases && config.releases["v" + targetVersion.major]) {
                        var release_1 = config.releases["v" + targetVersion.major]
                            .map(function (repo) { return pxt.github.parseRepoId(repo); })
                            .filter(function (repo) { return repo.fullName.toLowerCase() == parsed.fullName.toLowerCase(); })[0];
                        if (release_1) {
                            // this repo is frozen to a particular tag for this target
                            if (tags.some(function (t) { return t == release_1.tag; })) {
                                pxt.debug("approved release " + release_1.fullName + "#" + release_1.tag + " for v" + targetVersion.major);
                                return Promise.resolve(release_1.tag);
                            }
                            else {
                                // so the package was snapped to a particular tag but the tag does not exist anymore
                                pxt.reportError("packages", "approved release " + release_1.fullName + "#" + release_1.tag + " for v" + targetVersion.major + " not found anymore", { repo: scr.fullName });
                                // in this case, we keep going, we might be lucky and the current version of the package might still load
                            }
                        }
                    }
                    if (tags[0])
                        return Promise.resolve(tags[0]);
                    else
                        return refsRes.head || tagToShaAsync(scr.fullName, scr.defaultBranch);
                });
            });
        }
        github.latestVersionAsync = latestVersionAsync;
        github.GIT_JSON = ".git.json";
        function toLines(file) {
            return file ? file.split(/\r?\n/) : [];
        }
        // based on An O(ND) Difference Algorithm and Its Variations by EUGENE W. MYERS
        function diff(fileA, fileB, options) {
            if (options === void 0) { options = {}; }
            if (options.ignoreWhitespace) {
                fileA = fileA.replace(/[\r\n]+$/, "");
                fileB = fileB.replace(/[\r\n]+$/, "");
            }
            var a = toLines(fileA);
            var b = toLines(fileB);
            var MAX = Math.min(options.maxDiffSize || 1024, a.length + b.length);
            var ctor = a.length > 0xfff0 ? Uint32Array : Uint16Array;
            var idxmap = {};
            var curridx = 0;
            var aidx = mkidx(a), bidx = mkidx(b);
            function mkidx(strings) {
                var idxarr = new ctor(strings.length);
                var i = 0;
                for (var _i = 0, strings_1 = strings; _i < strings_1.length; _i++) {
                    var e = strings_1[_i];
                    if (options.ignoreWhitespace)
                        e = e.replace(/\s+/g, "");
                    if (idxmap.hasOwnProperty(e))
                        idxarr[i] = idxmap[e];
                    else {
                        ++curridx;
                        idxarr[i] = curridx;
                        idxmap[e] = curridx;
                    }
                    i++;
                }
                return idxarr;
            }
            var V = new ctor(2 * MAX + 1);
            var diffLen = -1;
            for (var D = 0; D <= MAX; D++) {
                if (computeFor(D, V) != null) {
                    diffLen = D;
                }
            }
            if (diffLen == -1)
                return null; // diffLen > MAX
            var trace = [];
            var endpoint = null;
            for (var D = 0; D <= diffLen; D++) {
                var V_1 = trace.length ? trace[trace.length - 1].slice(0) : new ctor(2 * diffLen + 1);
                trace.push(V_1);
                endpoint = computeFor(D, V_1);
                if (endpoint != null)
                    break;
            }
            var diff = [];
            var k = endpoint;
            for (var D = trace.length - 1; D >= 0; D--) {
                var V_2 = trace[D];
                var x = 0;
                var nextK = 0;
                if (k == -D || (k != D && V_2[MAX + k - 1] < V_2[MAX + k + 1])) {
                    nextK = k + 1;
                    x = V_2[MAX + nextK];
                }
                else {
                    nextK = k - 1;
                    x = V_2[MAX + nextK] + 1;
                }
                var y = x - k;
                var snakeLen = V_2[MAX + k] - x;
                for (var i = snakeLen - 1; i >= 0; --i)
                    diff.push("  " + a[x + i]);
                if (nextK == k - 1) {
                    diff.push("- " + a[x - 1]);
                }
                else {
                    if (y > 0)
                        diff.push("+ " + b[y - 1]);
                }
                k = nextK;
            }
            diff.reverse();
            if (options.context == Infinity)
                return diff;
            var aline = 1, bline = 1, idx = 0;
            var shortDiff = [];
            var context = options.context || 3;
            while (idx < diff.length) {
                var nextIdx = idx;
                while (nextIdx < diff.length && diff[nextIdx][0] == " ")
                    nextIdx++;
                if (nextIdx == diff.length)
                    break;
                var startIdx = nextIdx - context;
                var skip = startIdx - idx;
                if (skip > 0) {
                    aline += skip;
                    bline += skip;
                    idx = startIdx;
                }
                var hdPos = shortDiff.length;
                var aline0 = aline, bline0 = bline;
                shortDiff.push("@@"); // patched below
                var endIdx = idx;
                var numCtx = 0;
                while (endIdx < diff.length) {
                    if (diff[endIdx][0] == " ") {
                        numCtx++;
                        if (numCtx > context * 2 + 2) {
                            endIdx -= context + 2;
                            break;
                        }
                    }
                    else {
                        numCtx = 0;
                    }
                    endIdx++;
                }
                while (idx < endIdx) {
                    shortDiff.push(diff[idx]);
                    var c = diff[idx][0];
                    switch (c) {
                        case "-":
                            aline++;
                            break;
                        case "+":
                            bline++;
                            break;
                        case " ":
                            aline++;
                            bline++;
                            break;
                    }
                    idx++;
                }
                shortDiff[hdPos] = "@@ -" + aline0 + "," + (aline - aline0) + " +" + bline0 + "," + (bline - bline0) + " @@";
            }
            return shortDiff;
            function computeFor(D, V) {
                for (var k_1 = -D; k_1 <= D; k_1 += 2) {
                    var x = 0;
                    if (k_1 == -D || (k_1 != D && V[MAX + k_1 - 1] < V[MAX + k_1 + 1]))
                        x = V[MAX + k_1 + 1];
                    else
                        x = V[MAX + k_1 - 1] + 1;
                    var y = x - k_1;
                    while (x < aidx.length && y < bidx.length && aidx[x] == bidx[y]) {
                        x++;
                        y++;
                    }
                    V[MAX + k_1] = x;
                    if (x >= aidx.length && y >= bidx.length) {
                        return k_1;
                    }
                }
                return null;
            }
        }
        github.diff = diff;
        // based on "A Formal Investigation of Diff3" by Sanjeev Khanna, Keshav Kunal, and Benjamin C. Pierce
        function diff3(fileA, fileO, fileB, lblA, lblB) {
            // we're not showing these to users (yet anyways)
            if (!lblA)
                lblA = lf("Yours"); // ours/HEAD
            if (!lblB)
                lblB = lf("Incoming"); // theirs/upstream/origin
            var ma = computeMatch(fileA);
            var mb = computeMatch(fileB);
            var fa = toLines(fileA);
            var fb = toLines(fileB);
            var numConflicts = 0;
            var r = [];
            var la = 0, lb = 0;
            for (var i = 0; i < ma.length - 1;) {
                if (ma[i] == la && mb[i] == lb) {
                    r.push(fa[la]);
                    la++;
                    lb++;
                    i++;
                }
                else {
                    var aSame = true;
                    var bSame = true;
                    var j = i;
                    while (j < ma.length) {
                        if (ma[j] != la + j - i)
                            aSame = false;
                        if (mb[j] != lb + j - i)
                            bSame = false;
                        if (ma[j] != null && mb[j] != null)
                            break;
                        j++;
                    }
                    pxt.U.assert(j < ma.length);
                    if (aSame) {
                        while (lb < mb[j])
                            r.push(fb[lb++]);
                    }
                    else if (bSame) {
                        while (la < ma[j])
                            r.push(fa[la++]);
                    }
                    else if (fa.slice(la, ma[j]).join("\n") == fb.slice(lb, mb[j]).join("\n")) {
                        // false conflict - both are the same
                        while (la < ma[j])
                            r.push(fa[la++]);
                    }
                    else {
                        numConflicts++;
                        r.push("<<<<<<< " + lblA);
                        while (la < ma[j])
                            r.push(fa[la++]);
                        r.push("=======");
                        while (lb < mb[j])
                            r.push(fb[lb++]);
                        r.push(">>>>>>> " + lblB);
                    }
                    i = j;
                    la = ma[j];
                    lb = mb[j];
                }
            }
            return { merged: r.join("\n"), numConflicts: numConflicts };
            function computeMatch(fileA) {
                var da = pxt.github.diff(fileO, fileA, { context: Infinity });
                var ma = [];
                var aidx = 0;
                var oidx = 0;
                // console.log(da)
                for (var _i = 0, da_1 = da; _i < da_1.length; _i++) {
                    var l = da_1[_i];
                    if (l[0] == "+") {
                        aidx++;
                    }
                    else if (l[0] == "-") {
                        ma[oidx] = null;
                        oidx++;
                    }
                    else if (l[0] == " ") {
                        ma[oidx] = aidx;
                        aidx++;
                        oidx++;
                    }
                    else {
                        pxt.U.oops();
                    }
                }
                ma.push(aidx + 1); // terminator
                return ma;
            }
        }
        github.diff3 = diff3;
    })(github = pxt.github || (pxt.github = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    // keep all of these in sync with pxtbase.h
    pxt.REFCNT_FLASH = "0xfffe";
    pxt.VTABLE_MAGIC = 0xF9;
    pxt.ValTypeObject = 4;
    var BuiltInType;
    (function (BuiltInType) {
        BuiltInType[BuiltInType["BoxedString"] = 1] = "BoxedString";
        BuiltInType[BuiltInType["BoxedNumber"] = 2] = "BoxedNumber";
        BuiltInType[BuiltInType["BoxedBuffer"] = 3] = "BoxedBuffer";
        BuiltInType[BuiltInType["RefAction"] = 4] = "RefAction";
        BuiltInType[BuiltInType["RefImage"] = 5] = "RefImage";
        BuiltInType[BuiltInType["RefCollection"] = 6] = "RefCollection";
        BuiltInType[BuiltInType["RefRefLocal"] = 7] = "RefRefLocal";
        BuiltInType[BuiltInType["RefMap"] = 8] = "RefMap";
        BuiltInType[BuiltInType["RefMImage"] = 9] = "RefMImage";
        BuiltInType[BuiltInType["MMap"] = 10] = "MMap";
        BuiltInType[BuiltInType["User0"] = 16] = "User0";
    })(BuiltInType = pxt.BuiltInType || (pxt.BuiltInType = {}));
})(pxt || (pxt = {}));
(function (pxt) {
    var HF2;
    (function (HF2) {
        // see https://github.com/Microsoft/uf2/blob/master/hf2.md for full spec
        HF2.HF2_CMD_BININFO = 0x0001; // no arguments
        HF2.HF2_MODE_BOOTLOADER = 0x01;
        HF2.HF2_MODE_USERSPACE = 0x02;
        /*
        struct HF2_BININFO_Result {
            uint32_t mode;
            uint32_t flash_page_size;
            uint32_t flash_num_pages;
            uint32_t max_message_size;
        };
        */
        HF2.HF2_CMD_INFO = 0x0002;
        // no arguments
        // results is utf8 character array
        HF2.HF2_CMD_RESET_INTO_APP = 0x0003; // no arguments, no result
        HF2.HF2_CMD_RESET_INTO_BOOTLOADER = 0x0004; // no arguments, no result
        HF2.HF2_CMD_START_FLASH = 0x0005; // no arguments, no result
        HF2.HF2_CMD_WRITE_FLASH_PAGE = 0x0006;
        /*
        struct HF2_WRITE_FLASH_PAGE_Command {
            uint32_t target_addr;
            uint32_t data[flash_page_size];
        };
        */
        // no result
        HF2.HF2_CMD_CHKSUM_PAGES = 0x0007;
        /*
        struct HF2_CHKSUM_PAGES_Command {
            uint32_t target_addr;
            uint32_t num_pages;
        };
        struct HF2_CHKSUM_PAGES_Result {
            uint16_t chksums[num_pages];
        };
        */
        HF2.HF2_CMD_READ_WORDS = 0x0008;
        /*
        struct HF2_READ_WORDS_Command {
            uint32_t target_addr;
            uint32_t num_words;
        };
        struct HF2_READ_WORDS_Result {
            uint32_t words[num_words];
        };
        */
        HF2.HF2_CMD_WRITE_WORDS = 0x0009;
        /*
        struct HF2_WRITE_WORDS_Command {
            uint32_t target_addr;
            uint32_t num_words;
            uint32_t words[num_words];
        };
        */
        // no result
        HF2.HF2_CMD_DMESG = 0x0010;
        // no arguments
        // results is utf8 character array
        HF2.HF2_FLAG_SERIAL_OUT = 0x80;
        HF2.HF2_FLAG_SERIAL_ERR = 0xC0;
        HF2.HF2_FLAG_CMDPKT_LAST = 0x40;
        HF2.HF2_FLAG_CMDPKT_BODY = 0x00;
        HF2.HF2_FLAG_MASK = 0xC0;
        HF2.HF2_SIZE_MASK = 63;
        HF2.HF2_STATUS_OK = 0x00;
        HF2.HF2_STATUS_INVALID_CMD = 0x01;
        HF2.HF2_STATUS_EXEC_ERR = 0x02;
        HF2.HF2_STATUS_EVENT = 0x80;
        // the eventId is overlayed on the tag+status; the mask corresponds
        // to the HF2_STATUS_EVENT above
        HF2.HF2_EV_MASK = 0x800000;
        function write32(buf, pos, v) {
            buf[pos + 0] = (v >> 0) & 0xff;
            buf[pos + 1] = (v >> 8) & 0xff;
            buf[pos + 2] = (v >> 16) & 0xff;
            buf[pos + 3] = (v >> 24) & 0xff;
        }
        HF2.write32 = write32;
        function write16(buf, pos, v) {
            buf[pos + 0] = (v >> 0) & 0xff;
            buf[pos + 1] = (v >> 8) & 0xff;
        }
        HF2.write16 = write16;
        function read32(buf, pos) {
            return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0;
        }
        HF2.read32 = read32;
        function read16(buf, pos) {
            return buf[pos] | (buf[pos + 1] << 8);
        }
        HF2.read16 = read16;
        function encodeU32LE(words) {
            var r = new Uint8Array(words.length * 4);
            for (var i = 0; i < words.length; ++i)
                write32(r, i * 4, words[i]);
            return r;
        }
        HF2.encodeU32LE = encodeU32LE;
        function decodeU32LE(buf) {
            var res = [];
            for (var i = 0; i < buf.length; i += 4)
                res.push(read32(buf, i));
            return res;
        }
        HF2.decodeU32LE = decodeU32LE;
        var logEnabled = false;
        function enableLog() {
            logEnabled = true;
        }
        HF2.enableLog = enableLog;
        function log(msg) {
            if (logEnabled)
                pxt.log("HF2: " + msg);
            else
                pxt.debug("HF2: " + msg);
        }
        var Wrapper = /** @class */ (function () {
            function Wrapper(io) {
                var _this = this;
                this.io = io;
                this.cmdSeq = pxt.U.randomUint32();
                this.lock = new pxt.U.PromiseQueue();
                this.rawMode = false;
                this.maxMsgSize = 63; // when running in forwarding mode, we do not really know
                this.bootloaderMode = false;
                this.reconnectTries = 0;
                this.autoReconnect = false;
                this.msgs = new pxt.U.PromiseBuffer();
                this.eventHandlers = {};
                this.onSerial = function (buf, isStderr) { };
                var frames = [];
                io.onSerial = function (b, e) { return _this.onSerial(b, e); };
                io.onData = function (buf) {
                    var tp = buf[0] & HF2.HF2_FLAG_MASK;
                    var len = buf[0] & 63;
                    //console.log(`msg tp=${tp} len=${len}`)
                    var frame = new Uint8Array(len);
                    pxt.U.memcpy(frame, 0, buf, 1, len);
                    if (tp & HF2.HF2_FLAG_SERIAL_OUT) {
                        _this.onSerial(frame, tp == HF2.HF2_FLAG_SERIAL_ERR);
                        return;
                    }
                    frames.push(frame);
                    if (tp == HF2.HF2_FLAG_CMDPKT_BODY) {
                        return;
                    }
                    else {
                        pxt.U.assert(tp == HF2.HF2_FLAG_CMDPKT_LAST);
                        var total = 0;
                        for (var _i = 0, frames_1 = frames; _i < frames_1.length; _i++) {
                            var f = frames_1[_i];
                            total += f.length;
                        }
                        var r = new Uint8Array(total);
                        var ptr = 0;
                        for (var _a = 0, frames_2 = frames; _a < frames_2.length; _a++) {
                            var f = frames_2[_a];
                            pxt.U.memcpy(r, ptr, f);
                            ptr += f.length;
                        }
                        frames = [];
                        if (r[2] & HF2.HF2_STATUS_EVENT) {
                            // asynchronous event
                            io.onEvent(r);
                        }
                        else {
                            _this.msgs.push(r);
                        }
                    }
                };
                io.onEvent = function (buf) {
                    var evid = read32(buf, 0);
                    var f = pxt.U.lookup(_this.eventHandlers, evid + "");
                    if (f) {
                        f(buf.slice(4));
                    }
                    else {
                        log("unhandled event: " + evid.toString(16));
                    }
                };
                io.onError = function (err) {
                    log("recv error: " + err.message);
                    if (_this.autoReconnect) {
                        _this.autoReconnect = false;
                        _this.reconnectAsync()
                            .then(function () {
                            _this.autoReconnect = true;
                        }, function (err) {
                            log("reconnect error: " + err.message);
                        });
                    }
                    //this.msgs.pushError(err)
                };
            }
            Wrapper.prototype.resetState = function () {
                this.lock = new pxt.U.PromiseQueue();
                this.info = null;
                this.infoRaw = null;
                this.pageSize = null;
                this.flashSize = null;
                this.maxMsgSize = 63;
                this.bootloaderMode = false;
                this.msgs.drain();
            };
            Wrapper.prototype.onEvent = function (id, f) {
                pxt.U.assert(!!(id & HF2.HF2_EV_MASK));
                this.eventHandlers[id + ""] = f;
            };
            Wrapper.prototype.reconnectAsync = function (first) {
                var _this = this;
                if (first === void 0) { first = false; }
                this.resetState();
                if (first)
                    return this.initAsync();
                log("reconnect raw=" + this.rawMode);
                return this.io.reconnectAsync()
                    .then(function () { return _this.initAsync(); })
                    .catch(function (e) {
                    if (_this.reconnectTries < 5) {
                        _this.reconnectTries++;
                        log("error " + e.message + "; reconnecting attempt #" + _this.reconnectTries);
                        return Promise.delay(500)
                            .then(function () { return _this.reconnectAsync(); });
                    }
                    else {
                        throw e;
                    }
                });
            };
            Wrapper.prototype.disconnectAsync = function () {
                log("disconnect");
                return this.io.disconnectAsync();
            };
            Wrapper.prototype.error = function (m) {
                return this.io.error(m);
            };
            Wrapper.prototype.talkAsync = function (cmd, data) {
                var _this = this;
                if (this.io.talksAsync)
                    return this.io.talksAsync([{ cmd: cmd, data: data }])
                        .then(function (v) { return v[0]; });
                var len = 8;
                if (data)
                    len += data.length;
                var pkt = new Uint8Array(len);
                var seq = ++this.cmdSeq & 0xffff;
                write32(pkt, 0, cmd);
                write16(pkt, 4, seq);
                write16(pkt, 6, 0);
                if (data)
                    pxt.U.memcpy(pkt, 8, data, 0, data.length);
                var numSkipped = 0;
                var handleReturnAsync = function () {
                    return _this.msgs.shiftAsync(1000) // we wait up to a second
                        .then(function (res) {
                        if (read16(res, 0) != seq) {
                            if (numSkipped < 3) {
                                numSkipped++;
                                log("message out of sync, (" + seq + " vs " + read16(res, 0) + "); will re-try");
                                return handleReturnAsync();
                            }
                            _this.error("out of sync");
                        }
                        var info = "";
                        if (res[3])
                            info = "; info=" + res[3];
                        switch (res[2]) {
                            case HF2.HF2_STATUS_OK:
                                return res.slice(4);
                            case HF2.HF2_STATUS_INVALID_CMD:
                                _this.error("invalid command" + info);
                                break;
                            case HF2.HF2_STATUS_EXEC_ERR:
                                _this.error("execution error" + info);
                                break;
                            default:
                                _this.error("error " + res[2] + info);
                                break;
                        }
                        return null;
                    });
                };
                return this.sendMsgAsync(pkt)
                    .then(handleReturnAsync);
            };
            Wrapper.prototype.sendMsgAsync = function (buf) {
                return this.sendMsgCoreAsync(buf);
            };
            Wrapper.prototype.sendSerialAsync = function (buf, useStdErr) {
                if (useStdErr === void 0) { useStdErr = false; }
                if (this.io.sendSerialAsync)
                    return this.io.sendSerialAsync(buf, useStdErr);
                return this.sendMsgCoreAsync(buf, useStdErr ? 2 : 1);
            };
            Wrapper.prototype.sendMsgCoreAsync = function (buf, serial) {
                var _this = this;
                if (serial === void 0) { serial = 0; }
                // Util.assert(buf.length <= this.maxMsgSize)
                var frame = new Uint8Array(64);
                var loop = function (pos) {
                    var len = buf.length - pos;
                    if (len <= 0)
                        return Promise.resolve();
                    if (len > 63) {
                        len = 63;
                        frame[0] = HF2.HF2_FLAG_CMDPKT_BODY;
                    }
                    else {
                        frame[0] = HF2.HF2_FLAG_CMDPKT_LAST;
                    }
                    if (serial)
                        frame[0] = serial == 1 ? HF2.HF2_FLAG_SERIAL_OUT : HF2.HF2_FLAG_SERIAL_ERR;
                    frame[0] |= len;
                    for (var i = 0; i < len; ++i)
                        frame[i + 1] = buf[pos + i];
                    return _this.io.sendPacketAsync(frame)
                        .then(function () { return loop(pos + len); });
                };
                return this.lock.enqueue("out", function () { return loop(0); });
            };
            Wrapper.prototype.switchToBootloaderAsync = function () {
                var _this = this;
                if (this.bootloaderMode)
                    return Promise.resolve();
                log("Switching into bootloader mode");
                if (this.io.isSwitchingToBootloader) {
                    this.io.isSwitchingToBootloader();
                }
                return this.maybeReconnectAsync()
                    .then(function () { return _this.talkAsync(HF2.HF2_CMD_START_FLASH)
                    .then(function () { }, function (err) {
                    return _this.talkAsync(HF2.HF2_CMD_RESET_INTO_BOOTLOADER)
                        .then(function () { }, function (err) { })
                        .then(function () {
                        return _this.reconnectAsync()
                            .catch(function (err) {
                            if (err.type === "devicenotfound")
                                err.type = "repairbootloader";
                            throw err;
                        });
                    });
                }); })
                    .then(function () { return _this.initAsync(); })
                    .then(function () {
                    if (!_this.bootloaderMode)
                        _this.error("cannot switch into bootloader mode");
                });
            };
            Wrapper.prototype.reflashAsync = function (blocks) {
                var _this = this;
                log("reflash");
                return this.flashAsync(blocks)
                    .then(function () { return Promise.delay(100); })
                    .then(function () { return _this.reconnectAsync(); });
            };
            Wrapper.prototype.writeWordsAsync = function (addr, words) {
                pxt.U.assert(words.length <= 64); // just sanity check
                return this.talkAsync(HF2.HF2_CMD_WRITE_WORDS, encodeU32LE([addr, words.length].concat(words)))
                    .then(function () { });
            };
            Wrapper.prototype.readWordsAsync = function (addr, numwords) {
                var args = new Uint8Array(8);
                write32(args, 0, addr);
                write32(args, 4, numwords);
                pxt.U.assert(numwords <= 64); // just sanity check
                return this.talkAsync(HF2.HF2_CMD_READ_WORDS, args);
            };
            Wrapper.prototype.pingAsync = function () {
                if (this.rawMode)
                    return Promise.resolve();
                return this.talkAsync(HF2.HF2_CMD_BININFO)
                    .then(function (buf) { });
            };
            Wrapper.prototype.maybeReconnectAsync = function () {
                var _this = this;
                return this.pingAsync()
                    .catch(function (e) {
                    return _this.reconnectAsync()
                        .then(function () { return _this.pingAsync(); });
                });
            };
            Wrapper.prototype.flashAsync = function (blocks) {
                var _this = this;
                var start = Date.now();
                var fstart = 0;
                var loopAsync = function (pos) {
                    if (pos >= blocks.length)
                        return Promise.resolve();
                    var b = blocks[pos];
                    //U.assert(b.payloadSize == this.pageSize)
                    var buf = new Uint8Array(4 + b.payloadSize);
                    write32(buf, 0, b.targetAddr);
                    pxt.U.memcpy(buf, 4, b.data, 0, b.payloadSize);
                    return _this.talkAsync(HF2.HF2_CMD_WRITE_FLASH_PAGE, buf)
                        .then(function () { return loopAsync(pos + 1); });
                };
                return this.switchToBootloaderAsync()
                    .then(function () {
                    var size = blocks.length * 256;
                    log("Starting flash (" + Math.round(size / 1024) + "kB).");
                    fstart = Date.now();
                    // only try partial flash when page size is small
                    if (_this.pageSize > 16 * 1024)
                        return blocks;
                    return onlyChangedBlocksAsync(blocks, function (a, l) { return _this.readWordsAsync(a, l); });
                })
                    .then(function (res) {
                    if (res.length != blocks.length) {
                        blocks = res;
                        var size = blocks.length * 256;
                        log("Performing partial flash (" + Math.round(size / 1024) + "kB).");
                    }
                })
                    .then(function () { return loopAsync(0); })
                    .then(function () {
                    var n = Date.now();
                    var t0 = n - start;
                    var t1 = n - fstart;
                    log("Flashing done at " + Math.round(blocks.length * 256 / t1 * 1000 / 1024) + " kB/s in " + t0 + "ms (reset " + (t0 - t1) + "ms). Resetting.");
                })
                    .then(function () {
                    return _this.talkAsync(HF2.HF2_CMD_RESET_INTO_APP)
                        .catch(function (e) {
                        // error expected here - device is resetting
                    });
                })
                    .then(function () { });
            };
            Wrapper.prototype.initAsync = function () {
                var _this = this;
                if (this.rawMode)
                    return Promise.resolve();
                return Promise.resolve()
                    .then(function () { return _this.talkAsync(HF2.HF2_CMD_BININFO); })
                    .then(function (binfo) {
                    _this.bootloaderMode = binfo[0] == HF2.HF2_MODE_BOOTLOADER;
                    _this.pageSize = read32(binfo, 4);
                    _this.flashSize = read32(binfo, 8) * _this.pageSize;
                    _this.maxMsgSize = read32(binfo, 12);
                    _this.familyID = read32(binfo, 16);
                    log("Connected; msgSize " + _this.maxMsgSize + "B; flash " + _this.flashSize / 1024 + "kB; " + (_this.bootloaderMode ? "bootloader" : "application") + " mode; family=0x" + _this.familyID.toString(16));
                    return _this.talkAsync(HF2.HF2_CMD_INFO);
                })
                    .then(function (buf) {
                    _this.infoRaw = pxt.U.fromUTF8(pxt.U.uint8ArrayToString(buf));
                    pxt.debug("Info: " + _this.infoRaw);
                    var info = {};
                    ("Header: " + _this.infoRaw).replace(/^([\w\-]+):\s*([^\n\r]*)/mg, function (f, n, v) {
                        info[n.replace(/-/g, "")] = v;
                        return "";
                    });
                    _this.info = info;
                    var m = /v(\d\S+)(\s+(\S+))?/.exec(_this.info.Header);
                    if (m)
                        _this.info.Parsed = {
                            Version: m[1],
                            Features: m[3] || "",
                        };
                    else
                        _this.info.Parsed = {
                            Version: "?",
                            Features: "",
                        };
                    log("Board-ID: " + _this.info.BoardID + " v" + _this.info.Parsed.Version + " f" + _this.info.Parsed.Features);
                })
                    .then(function () {
                    _this.reconnectTries = 0;
                });
            };
            return Wrapper;
        }());
        HF2.Wrapper = Wrapper;
        function readChecksumBlockAsync(readWordsAsync) {
            if (!pxt.appTarget.compile.flashChecksumAddr)
                return Promise.resolve(null);
            return readWordsAsync(pxt.appTarget.compile.flashChecksumAddr, 12)
                .then(function (buf) {
                var blk = pxtc.hex.parseChecksumBlock(buf);
                if (!blk)
                    return null;
                return readWordsAsync(blk.endMarkerPos, 1)
                    .then(function (w) {
                    if (read32(w, 0) != blk.endMarker) {
                        pxt.log("end-marker mismatch");
                        return null;
                    }
                    return blk;
                });
            });
        }
        function onlyChangedBlocksAsync(blocks, readWordsAsync) {
            if (!pxt.appTarget.compile.flashChecksumAddr)
                return Promise.resolve(blocks);
            var blBuf = pxtc.UF2.readBytes(blocks, pxt.appTarget.compile.flashChecksumAddr, 12 * 4);
            var blChk = pxtc.hex.parseChecksumBlock(blBuf);
            if (!blChk)
                return Promise.resolve(blocks);
            return readChecksumBlockAsync(readWordsAsync)
                .then(function (devChk) {
                if (!devChk)
                    return blocks;
                var regionsOk = devChk.regions.filter(function (r) {
                    var hasMatching = blChk.regions.some(function (r2) {
                        return r.checksum == r2.checksum &&
                            r.length == r2.length &&
                            r.start == r2.start;
                    });
                    return hasMatching;
                });
                if (regionsOk.length == 0)
                    return blocks;
                log("skipping flash at: " +
                    regionsOk.map(function (r) {
                        return pxtc.assembler.tohex(r.start) + " (" + r.length / 1024 + "kB)";
                    })
                        .join(", "));
                var unchangedAddr = function (a) {
                    return regionsOk.some(function (r) { return r.start <= a && a < r.start + r.length; });
                };
                return blocks.filter(function (b) {
                    return !(unchangedAddr(b.targetAddr) &&
                        unchangedAddr(b.targetAddr + b.payloadSize - 1));
                });
            });
        }
        HF2.onlyChangedBlocksAsync = onlyChangedBlocksAsync;
    })(HF2 = pxt.HF2 || (pxt.HF2 = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var HWDBG;
    (function (HWDBG) {
        var U = pxt.Util;
        var H = pxt.HF2;
        var HF2_DBG_GET_GLOBAL_STATE = 0x53fc66e0;
        var HF2_DBG_RESUME = 0x27a55931;
        var HF2_DBG_RESTART = 0x1120bd93;
        var HF2_DBG_GET_STACK = 0x70901510;
        var HF2_EV_DBG_PAUSED = 0x3692f9fd;
        var r32 = H.read32;
        var isHalted = false;
        var lastCompileResult;
        var onHalted;
        var haltHandler;
        var cachedStaticState;
        var currBreakpoint;
        var callInfos;
        var lastFlash;
        var hid;
        function taggedSpecialValue(n) { return (n << 2) | 2; }
        HWDBG.taggedUndefined = 0;
        HWDBG.taggedNull = taggedSpecialValue(1);
        HWDBG.taggedFalse = taggedSpecialValue(2);
        HWDBG.taggedTrue = taggedSpecialValue(16);
        HWDBG.postMessage = function (msg) { return console.log(msg); };
        function clearAsync() {
            isHalted = false;
            lastCompileResult = null;
            cachedStaticState = null;
            return Promise.resolve();
        }
        function decodeValue(n) {
            if (n & 1)
                return n >> 1;
            if (n == 0)
                return undefined;
            if (n & 2) {
                if (n == HWDBG.taggedNull)
                    return null;
                if (n == HWDBG.taggedFalse)
                    return false;
                if (n == HWDBG.taggedTrue)
                    return true;
                return { tagged: n >> 2 };
            }
            return { ptr: n };
        }
        HWDBG.decodeValue = decodeValue;
        function readMemAsync(addr, numbytes) {
            U.assert(!(addr & 3));
            U.assert(addr >= 0);
            if (addr < 2 * 1024 * 1024) {
                // assume these sit in flash
                var res = new Uint8Array(numbytes);
                addr -= lastFlash.start;
                U.memcpy(res, 0, lastFlash.buf, addr, numbytes);
                return Promise.resolve(res);
            }
            var maxBytes = hid.maxMsgSize - 32;
            if (numbytes > maxBytes) {
                var promises = [];
                while (numbytes > 0) {
                    var n = Math.min(maxBytes, numbytes);
                    promises.push(readMemAsync(addr, n));
                    numbytes -= n;
                    addr += n;
                }
                return Promise.all(promises)
                    .then(U.uint8ArrayConcat);
            }
            else {
                return hid.readWordsAsync(addr, Math.ceil(numbytes / 4))
                    .then(function (rr) {
                    if (rr.length > numbytes)
                        return rr.slice(0, numbytes);
                    else
                        return rr;
                });
            }
        }
        function heapExpandAsync(v) {
            if (typeof v != "object" || !v)
                return Promise.resolve(v);
            if (typeof v.ptr == "number") {
                // there should be no unaligned pointers
                if (v.ptr & 3)
                    return Promise.resolve({ unalignedPtr: v.ptr });
                var tag_1 = 0;
                // 56 bytes of data fit in one HID packet (with 5 bytes of header and 3 bytes of padding)
                return readMemAsync(v.ptr, 56)
                    .then(function (buf) {
                    // TODO this is wrong, with the new vtable format
                    tag_1 = H.read16(buf, 2);
                    var neededLength = buf.length;
                    if (tag_1 == pxt.BuiltInType.BoxedString || tag_1 == pxt.BuiltInType.BoxedBuffer) {
                        neededLength = H.read16(buf, 4) + 6;
                    }
                    else if (tag_1 == pxt.BuiltInType.BoxedNumber) {
                        neededLength = 8 + 4;
                    }
                    else {
                        // TODO
                    }
                    if (neededLength > buf.length) {
                        return readMemAsync(v.ptr + buf.length, neededLength - buf.length)
                            .then(function (secondary) { return U.uint8ArrayConcat([buf, secondary]); });
                    }
                    else if (neededLength < buf.length) {
                        return buf.slice(0, neededLength);
                    }
                    else {
                        return buf;
                    }
                })
                    .then(function (buf) {
                    if (tag_1 == pxt.BuiltInType.BoxedString)
                        return U.uint8ArrayToString(buf.slice(6));
                    else if (tag_1 == pxt.BuiltInType.BoxedBuffer)
                        return { type: "buffer", data: buf.slice(6) };
                    else if (tag_1 == pxt.BuiltInType.BoxedNumber)
                        return new Float64Array(buf.buffer.slice(4))[0];
                    else
                        return {
                            type: "unknown",
                            tag: tag_1,
                            refcnt: H.read16(buf, 0),
                            data: buf.slice(4)
                        };
                });
            }
            else {
                return Promise.resolve(v);
            }
        }
        HWDBG.heapExpandAsync = heapExpandAsync;
        function heapExpandMapAsync(vars) {
            var promises = [];
            var _loop_3 = function (k) {
                promises.push(heapExpandAsync(vars[k])
                    .then(function (r) {
                    vars[k] = r;
                    //console.log("set", k, "to", r, "prev", vars[k], "NOW", vars)
                }));
            };
            for (var _i = 0, _a = Object.keys(vars); _i < _a.length; _i++) {
                var k = _a[_i];
                _loop_3(k);
            }
            return Promise.all(promises)
                .then(function () {
                //console.log("FIN", vars)
            });
        }
        HWDBG.heapExpandMapAsync = heapExpandMapAsync;
        function buildFrames(stack, msg) {
            var currAddr = currBreakpoint.binAddr;
            var sp = 0;
            var pi = lastCompileResult.procDebugInfo.filter(function (p) {
                return p.codeStartLoc <= currAddr && currAddr <= p.codeEndLoc;
            })[0];
            while (true) {
                if (!pi)
                    break; // ???
                if (pi == lastCompileResult.procDebugInfo[0])
                    break; // main
                var bp = findPrevBrkp(currAddr);
                var info = U.clone(bp);
                info.functionName = pi.name;
                info.argumentNames = pi.args && pi.args.map(function (a) { return a.name; });
                msg.stackframes.push({
                    locals: {},
                    funcInfo: info,
                    breakpointId: bp.id,
                });
                var frame = msg.stackframes[msg.stackframes.length - 1];
                var idx = 0;
                for (var _i = 0, _a = pi.locals; _i < _a.length; _i++) {
                    var l = _a[_i];
                    U.assert(l.index == idx++);
                    frame.locals[l.name] = decodeValue(stack[sp++]);
                }
                currAddr = stack[sp++] & 0x7ffffffe;
                var ci = callInfos[currAddr + ""];
                for (var _b = 0, _c = pi.args; _b < _c.length; _b++) {
                    var l = _c[_b];
                    frame.locals[l.name] = decodeValue(stack[sp + (pi.args.length - 1 - l.index)]);
                }
                if (!ci)
                    break;
                pi = ci.from;
                sp += ci.stack - pi.localsMark;
            }
        }
        function findPrevBrkp(addr) {
            var bb = lastCompileResult.breakpoints;
            var brkMatch = bb[0];
            var bestDelta = Infinity;
            for (var _i = 0, bb_1 = bb; _i < bb_1.length; _i++) {
                var b = bb_1[_i];
                var delta = addr - b.binAddr;
                // console.log(`${b.line+1}: addr=${b.binAddr} d=${delta}`)
                if (delta >= 0 && delta < bestDelta) {
                    bestDelta = delta;
                    brkMatch = b;
                }
            }
            return brkMatch;
        }
        function corePaused(buf) {
            if (isHalted)
                return Promise.resolve();
            isHalted = true;
            var msg;
            return getHwStateAsync()
                .then(function (st) {
                var w = H.decodeU32LE(buf);
                var pc = w[0];
                var globals = {};
                var _loop_4 = function (l) {
                    var gbuf = st.globals;
                    var readV = function () {
                        switch (l.type) {
                            case "uint32": return H.read32(gbuf, l.index);
                            case "int32": return H.read32(gbuf, l.index) | 0;
                            case "uint16": return H.read16(gbuf, l.index);
                            case "int16": return (H.read16(gbuf, l.index) << 16) >> 16;
                            case "uint8": return gbuf[l.index];
                            case "int8": return (gbuf[l.index] << 24) >> 24;
                            default: return null;
                        }
                    };
                    var v = readV();
                    if (v === null) {
                        U.assert((l.index & 3) == 0);
                        v = decodeValue(H.read32(gbuf, l.index));
                    }
                    globals[l.name] = v;
                };
                for (var _i = 0, _a = lastCompileResult.procDebugInfo[0].locals; _i < _a.length; _i++) {
                    var l = _a[_i];
                    _loop_4(l);
                }
                currBreakpoint = findPrevBrkp(pc);
                msg = {
                    type: 'debugger',
                    subtype: 'breakpoint',
                    breakpointId: currBreakpoint.id,
                    globals: globals,
                    stackframes: []
                };
                haltHandler();
                return hid.talkAsync(HF2_DBG_GET_STACK);
            })
                .then(function (stack) {
                buildFrames(H.decodeU32LE(stack), msg);
                var maps = [msg.globals].concat(msg.stackframes.map(function (s) { return s.locals; }));
                return Promise.map(maps, heapExpandMapAsync);
            })
                .then(function () { return HWDBG.postMessage(msg); });
        }
        function clearHalted() {
            isHalted = false;
            onHalted = new Promise(function (resolve, reject) {
                haltHandler = resolve;
            });
        }
        function startDebugAsync(compileRes, hidWr) {
            hid = hidWr;
            hid.onEvent(HF2_EV_DBG_PAUSED, corePaused);
            return clearAsync()
                .then(function () {
                lastCompileResult = compileRes;
                callInfos = {};
                var procLookup = [];
                for (var _i = 0, _a = compileRes.procDebugInfo; _i < _a.length; _i++) {
                    var pdi = _a[_i];
                    procLookup[pdi.idx] = pdi;
                }
                for (var _b = 0, _c = compileRes.procDebugInfo; _b < _c.length; _b++) {
                    var pdi = _c[_b];
                    //console.log(pdi)
                    for (var _d = 0, _e = pdi.calls; _d < _e.length; _d++) {
                        var ci = _e[_d];
                        callInfos[ci.addr + ""] = {
                            from: pdi,
                            to: procLookup[ci.procIndex],
                            stack: ci.stack
                        };
                    }
                }
            })
                .then(function () {
                var f = lastCompileResult.outfiles[pxtc.BINARY_UF2];
                var blockBuf = U.stringToUint8Array(atob(f));
                lastFlash = pxtc.UF2.toBin(blockBuf);
                var blocks = pxtc.UF2.parseFile(blockBuf);
                return hid.reflashAsync(blocks); // this will reset into app at the end
            })
                .then(function () { return hid.talkAsync(HF2_DBG_RESTART).catch(function (e) { }); })
                .then(function () { return Promise.delay(200); })
                .then(function () { return hid.reconnectAsync(); })
                .then(clearHalted)
                .then(waitForHaltAsync);
        }
        HWDBG.startDebugAsync = startDebugAsync;
        function handleMessage(msg) {
            console.log("HWDBGMSG", msg);
            if (msg.type != "debugger")
                return;
            var stepInto = false;
            switch (msg.subtype) {
                case 'stepinto':
                    stepInto = true;
                case 'stepover':
                    resumeAsync(stepInto);
                    break;
            }
        }
        HWDBG.handleMessage = handleMessage;
        function resumeAsync(into) {
            if (into === void 0) { into = false; }
            return Promise.resolve()
                .then(function () { return hid.talkAsync(HF2_DBG_RESUME, H.encodeU32LE([into ? 1 : 3])); })
                .then(clearHalted);
        }
        HWDBG.resumeAsync = resumeAsync;
        function waitForHaltAsync() {
            if (!onHalted)
                onHalted = Promise.resolve();
            return onHalted;
        }
        HWDBG.waitForHaltAsync = waitForHaltAsync;
        function getStaticStateAsync() {
            if (cachedStaticState)
                return Promise.resolve(cachedStaticState);
            return hid.talkAsync(HF2_DBG_GET_GLOBAL_STATE)
                .then(function (buf) { return (cachedStaticState = {
                numGlobals: r32(buf, 0),
                globalsPtr: r32(buf, 4)
            }); });
        }
        function getHwStateAsync() {
            return getStaticStateAsync()
                .then(function (st) { return hid.readWordsAsync(st.globalsPtr, st.numGlobals); })
                .then(function (buf) {
                var res = {
                    staticState: cachedStaticState,
                    globals: buf
                };
                return res;
            });
        }
        HWDBG.getHwStateAsync = getHwStateAsync;
    })(HWDBG = pxt.HWDBG || (pxt.HWDBG = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    // Converts encoded JRES images into PNG data uris
    // this keeps a bit of state for perf reasons
    var ImageConverter = /** @class */ (function () {
        function ImageConverter() {
        }
        ImageConverter.prototype.logTime = function () {
            if (this.start) {
                var d = Date.now() - this.start;
                pxt.debug("Icon creation: " + d + "ms");
            }
        };
        ImageConverter.prototype.convert = function (jresURL) {
            if (!this.start)
                this.start = Date.now();
            var data = atob(jresURL.slice(jresURL.indexOf(",") + 1));
            var magic = data.charCodeAt(0);
            var w = data.charCodeAt(1);
            var h = data.charCodeAt(2);
            if (magic === 0x87) {
                magic = 0xe0 | data.charCodeAt(1);
                w = data.charCodeAt(2) | (data.charCodeAt(3) << 8);
                h = data.charCodeAt(4) | (data.charCodeAt(5) << 8);
                data = data.slice(4);
            }
            if (magic != 0xe1 && magic != 0xe4)
                return null;
            function htmlColorToBytes(hexColor) {
                var v = parseInt(hexColor.replace(/#/, ""), 16);
                return [(v >> 0) & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, 0xff];
            }
            if (!this.palette) {
                var arrs = pxt.appTarget.runtime.palette.map(htmlColorToBytes);
                // Set the alpha for transparency at index 0
                arrs[0][3] = 0;
                this.palette = new Uint8Array(arrs.length * 4);
                for (var i = 0; i < arrs.length; ++i) {
                    this.palette[i * 4 + 0] = arrs[i][0];
                    this.palette[i * 4 + 1] = arrs[i][1];
                    this.palette[i * 4 + 2] = arrs[i][2];
                    this.palette[i * 4 + 3] = arrs[i][3];
                }
            }
            if (magic == 0xe1) {
                return this.genMonochrome(data, w, h);
            }
            var scaleFactor = ((pxt.BrowserUtils.isEdge() || pxt.BrowserUtils.isIE()) && w < 100 && h < 100) ? 3 : 1;
            return this.genColor(data, w, h, scaleFactor);
        };
        ImageConverter.prototype.genMonochrome = function (data, w, h) {
            var outByteW = (w + 3) & ~3;
            var bmpHeaderSize = 14 + 40 + this.palette.length;
            var bmpSize = bmpHeaderSize + outByteW * h;
            var bmp = new Uint8Array(bmpSize);
            bmp[0] = 66;
            bmp[1] = 77;
            pxt.HF2.write32(bmp, 2, bmpSize);
            pxt.HF2.write32(bmp, 10, bmpHeaderSize);
            pxt.HF2.write32(bmp, 14, 40); // size of this header
            pxt.HF2.write32(bmp, 18, w);
            pxt.HF2.write32(bmp, 22, -h); // not upside down
            pxt.HF2.write16(bmp, 26, 1); // 1 color plane
            pxt.HF2.write16(bmp, 28, 8); // 8bpp
            pxt.HF2.write32(bmp, 38, 2835); // 72dpi
            pxt.HF2.write32(bmp, 42, 2835);
            pxt.HF2.write32(bmp, 46, this.palette.length >> 2);
            bmp.set(this.palette, 54);
            var inP = 4;
            var outP = bmpHeaderSize;
            var mask = 0x01;
            var v = data.charCodeAt(inP++);
            for (var x = 0; x < w; ++x) {
                outP = bmpHeaderSize + x;
                for (var y = 0; y < h; ++y) {
                    bmp[outP] = (v & mask) ? 1 : 0;
                    outP += outByteW;
                    mask <<= 1;
                    if (mask == 0x100) {
                        mask = 0x01;
                        v = data.charCodeAt(inP++);
                    }
                }
            }
            return "data:image/bmp;base64," + btoa(pxt.U.uint8ArrayToString(bmp));
        };
        ImageConverter.prototype.genColor = function (data, width, height, intScale) {
            intScale = Math.max(1, intScale | 0);
            var w = width * intScale;
            var h = height * intScale;
            var outByteW = w << 2;
            var bmpHeaderSize = 138;
            var bmpSize = bmpHeaderSize + outByteW * h;
            var bmp = new Uint8Array(bmpSize);
            bmp[0] = 66;
            bmp[1] = 77;
            pxt.HF2.write32(bmp, 2, bmpSize);
            pxt.HF2.write32(bmp, 10, bmpHeaderSize);
            pxt.HF2.write32(bmp, 14, 124); // size of this header
            pxt.HF2.write32(bmp, 18, w);
            pxt.HF2.write32(bmp, 22, -h); // not upside down
            pxt.HF2.write16(bmp, 26, 1); // 1 color plane
            pxt.HF2.write16(bmp, 28, 32); // 32bpp
            pxt.HF2.write16(bmp, 30, 3); // magic?
            pxt.HF2.write32(bmp, 38, 2835); // 72dpi
            pxt.HF2.write32(bmp, 42, 2835);
            pxt.HF2.write32(bmp, 54, 0xff0000); // Red bitmask
            pxt.HF2.write32(bmp, 58, 0xff00); // Green bitmask
            pxt.HF2.write32(bmp, 62, 0xff); // Blue bitmask
            pxt.HF2.write32(bmp, 66, 0xff000000); // Alpha bitmask
            // Color space (sRGB)
            bmp[70] = 0x42; // B
            bmp[71] = 0x47; // G
            bmp[72] = 0x52; // R
            bmp[73] = 0x73; // s
            var inP = 4;
            var outP = bmpHeaderSize;
            for (var x = 0; x < w; x++) {
                var high = false;
                outP = bmpHeaderSize + (x << 2);
                var columnStart = inP;
                var v = data.charCodeAt(inP++);
                var colorStart = high ? (((v >> 4) & 0xf) << 2) : ((v & 0xf) << 2);
                for (var y = 0; y < h; y++) {
                    bmp[outP] = this.palette[colorStart];
                    bmp[outP + 1] = this.palette[colorStart + 1];
                    bmp[outP + 2] = this.palette[colorStart + 2];
                    bmp[outP + 3] = this.palette[colorStart + 3];
                    outP += outByteW;
                    if (y % intScale === intScale - 1) {
                        if (high) {
                            v = data.charCodeAt(inP++);
                        }
                        high = !high;
                        colorStart = high ? (((v >> 4) & 0xf) << 2) : ((v & 0xf) << 2);
                    }
                }
                if (x % intScale === intScale - 1) {
                    if (!(height % 2))
                        --inP;
                    while (inP & 3)
                        inP++;
                }
                else {
                    inP = columnStart;
                }
            }
            return "data:image/bmp;base64," + btoa(pxt.U.uint8ArrayToString(bmp));
        };
        return ImageConverter;
    }());
    pxt.ImageConverter = ImageConverter;
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    pxt.TS_CONFIG = "{\n    \"compilerOptions\": {\n        \"target\": \"es5\",\n        \"noImplicitAny\": true,\n        \"outDir\": \"built\",\n        \"rootDir\": \".\"\n    },\n    \"exclude\": [\"pxt_modules/**/*test.ts\"]\n}\n";
    var _defaultFiles = {
        "tsconfig.json": pxt.TS_CONFIG,
        "test.ts": "// tests go here; this will not be compiled when this package is used as a library\n",
        "Makefile": "all: deploy\n\nbuild:\n\tpxt build\n\ndeploy:\n\tpxt deploy\n\ntest:\n\tpxt test\n",
        "README.md": "# @NAME@\n\n@DESCRIPTION@\n\n## Usage\n\nThis repository contains a MakeCode extension. To use it in MakeCode,\n\n* open @HOMEURL@\n* click on **New Project**\n* click on **Extensions** under the gearwheel menu\n* search for the URL of this repository\n\n## Collaborators\n\nYou can invite users to become collaborators to this repository. This will allow multiple users to work on the same project at the same time.\n[Learn more...](https://help.github.com/en/articles/inviting-collaborators-to-a-personal-repository)\n\nTo edit this repository in MakeCode,\n\n* open @HOMEURL@\n* click on **Import** then click on **Import URL**\n* paste the repository URL and click import\n\n## Supported targets\n\n* for PXT/@TARGET@\n* for PXT/@PLATFORM@\n(The metadata above is needed for package search.)\n\n",
        ".gitignore": "built\nnode_modules\nyotta_modules\nyotta_targets\npxt_modules\n*.db\n*.tgz\n.header.json\n",
        ".vscode/settings.json": "{\n    \"editor.formatOnType\": true,\n    \"files.autoSave\": \"afterDelay\",\n    \"files.watcherExclude\": {\n        \"**/.git/objects/**\": true,\n        \"**/built/**\": true,\n        \"**/node_modules/**\": true,\n        \"**/yotta_modules/**\": true,\n        \"**/yotta_targets\": true,\n        \"**/pxt_modules/**\": true\n    },\n    \"files.associations\": {\n        \"*.blocks\": \"html\",\n        \"*.jres\": \"json\"\n    },\n    \"search.exclude\": {\n        \"**/built\": true,\n        \"**/node_modules\": true,\n        \"**/yotta_modules\": true,\n        \"**/yotta_targets\": true,\n        \"**/pxt_modules\": true\n    }\n}",
        ".github/workflows/makecode.yml": "name: MakeCode CI\n\non: [push]\n\njobs:\n  build:\n\n    runs-on: ubuntu-latest\n\n    strategy:\n      matrix:\n        node-version: [8.x]\n\n    steps:\n      - uses: actions/checkout@v1\n      - name: Use Node.js ${{ matrix.node-version }}\n        uses: actions/setup-node@v1\n        with:\n          node-version: ${{ matrix.node-version }}\n      - name: npm install, build, and test\n        run: |\n          npm install -g pxt\n          pxt target @TARGET@\n          pxt install\n          pxt build --cloud\n        env:\n          CI: true\n",
        ".travis.yml": "language: node_js\nnode_js:\n    - \"8.9.4\"\nscript:\n    - \"npm install -g pxt\"\n    - \"pxt target @TARGET@\"\n    - \"pxt install\"\n    - \"pxt build\"\nsudo: false\ncache:\n    directories:\n    - npm_modules\n    - pxt_modules",
        ".vscode/tasks.json": "\n// A task runner that calls the MakeCode (PXT) compiler\n{\n    \"version\": \"2.0.0\",\n    \"tasks\": [{\n        \"label\": \"pxt deploy\",\n        \"type\": \"shell\",\n        \"command\": \"pxt deploy --local\",\n        \"group\": \"build\",\n        \"problemMatcher\": [ \"$tsc\" ]\n    }, {\n        \"label\": \"pxt build\",\n        \"type\": \"shell\",\n        \"command\": \"pxt build --local\",\n        \"group\": \"build\",\n        \"problemMatcher\": [ \"$tsc\" ]\n    }, {\n        \"label\": \"pxt install\",\n        \"type\": \"shell\",\n        \"command\": \"pxt install\",\n        \"group\": \"build\",\n        \"problemMatcher\": [ \"$tsc\" ]\n    }, {\n        \"label\": \"pxt clean\",\n        \"type\": \"shell\",\n        \"command\": \"pxt clean\",\n        \"group\": \"test\",\n        \"problemMatcher\": [ \"$tsc\" ]\n    }, {\n        \"label\": \"pxt serial\",\n        \"type\": \"shell\",\n        \"command\": \"pxt serial\",\n        \"group\": \"test\",\n        \"problemMatcher\": [ \"$tsc\" ]\n    }]\n}\n"
    };
    function packageFiles(name) {
        var prj = pxt.appTarget.tsprj || pxt.appTarget.blocksprj;
        var config = pxt.U.clone(prj.config);
        // remove blocks file
        Object.keys(prj.files)
            .filter(function (f) { return /\.blocks$/.test(f); })
            .forEach(function (f) { return delete prj.files[f]; });
        config.files = config.files.filter(function (f) { return !/\.blocks$/.test(f); });
        config.name = name;
        // by default, projects are not public
        config.public = false;
        if (!config.version) {
            config.version = "0.0.0";
        }
        var files = {};
        for (var f in _defaultFiles)
            files[f] = _defaultFiles[f];
        for (var f in prj.files)
            if (f != "README.md")
                files[f] = prj.files[f];
        var pkgFiles = Object.keys(files).filter(function (s) {
            return /\.(md|ts|asm|cpp|h|py)$/.test(s);
        });
        var fieldsOrder = [
            "name",
            "version",
            "description",
            "license",
            "dependencies",
            "files",
            "testFiles",
            "testDependencies",
            "public",
            "targetVersions"
        ];
        config.files = pkgFiles.filter(function (s) { return !/test/.test(s); });
        config.testFiles = pkgFiles.filter(function (s) { return /test/.test(s); });
        var configMap = config;
        // make it look nice
        var newCfg = {};
        for (var _i = 0, fieldsOrder_1 = fieldsOrder; _i < fieldsOrder_1.length; _i++) {
            var f = fieldsOrder_1[_i];
            if (configMap.hasOwnProperty(f))
                newCfg[f] = configMap[f];
        }
        for (var _a = 0, _b = Object.keys(configMap); _a < _b.length; _a++) {
            var f = _b[_a];
            if (!newCfg.hasOwnProperty(f))
                newCfg[f] = configMap[f];
        }
        files[pxt.CONFIG_NAME] = JSON.stringify(newCfg, null, 4);
        return files;
    }
    pxt.packageFiles = packageFiles;
    function packageFilesFixup(files, removeSubdirs) {
        if (removeSubdirs === void 0) { removeSubdirs = false; }
        var configMap = JSON.parse(files[pxt.CONFIG_NAME]);
        configMap["platform"] = pxt.appTarget.platformid || pxt.appTarget.id;
        configMap["target"] = pxt.appTarget.id;
        configMap["docs"] = pxt.appTarget.appTheme.homeUrl || "./";
        configMap["homeurl"] = pxt.appTarget.appTheme.homeUrl || "???";
        if (removeSubdirs)
            for (var _i = 0, _a = Object.keys(files); _i < _a.length; _i++) {
                var k = _a[_i];
                if (k.indexOf("/") >= 0)
                    delete files[k];
            }
        pxt.U.iterMap(files, function (k, v) {
            v = v.replace(/@([A-Z]+)@/g, function (f, n) { return configMap[n.toLowerCase()] || ""; });
            files[k] = v;
        });
    }
    pxt.packageFilesFixup = packageFilesFixup;
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var NT;
        (function (NT) {
            NT[NT["Prefix"] = 0] = "Prefix";
            NT[NT["Postfix"] = 1] = "Postfix";
            NT[NT["Infix"] = 2] = "Infix";
            NT[NT["Block"] = 3] = "Block";
            NT[NT["NewLine"] = 4] = "NewLine";
        })(NT = blocks.NT || (blocks.NT = {}));
        var GlueMode;
        (function (GlueMode) {
            GlueMode[GlueMode["None"] = 0] = "None";
            GlueMode[GlueMode["WithSpace"] = 1] = "WithSpace";
            GlueMode[GlueMode["NoSpace"] = 2] = "NoSpace";
        })(GlueMode = blocks.GlueMode || (blocks.GlueMode = {}));
        var reservedWords = ["break", "case", "catch", "class", "const", "continue", "debugger",
            "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally",
            "for", "function", "if", "import", "in", "instanceof", "new", "null", "return",
            "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while",
            "with"];
        var placeholders = {};
        function backtickLit(s) {
            return "`" + s.replace(/[\\`${}]/g, function (f) { return "\\" + f; }) + "`";
        }
        blocks.backtickLit = backtickLit;
        function stringLit(s) {
            if (s.length > 20 && /\n/.test(s))
                return backtickLit(s);
            else
                return JSON.stringify(s);
        }
        blocks.stringLit = stringLit;
        function mkNode(tp, pref, children) {
            return {
                type: tp,
                op: pref,
                children: children
            };
        }
        blocks.mkNode = mkNode;
        function mkNewLine() {
            return mkNode(NT.NewLine, "", []);
        }
        blocks.mkNewLine = mkNewLine;
        function mkPrefix(pref, children) {
            return mkNode(NT.Prefix, pref, children);
        }
        blocks.mkPrefix = mkPrefix;
        function mkPostfix(children, post) {
            return mkNode(NT.Postfix, post, children);
        }
        blocks.mkPostfix = mkPostfix;
        function mkInfix(child0, op, child1) {
            return mkNode(NT.Infix, op, child0 == null ? [child1] : [child0, child1]);
        }
        blocks.mkInfix = mkInfix;
        function mkText(s) {
            return mkPrefix(s, []);
        }
        blocks.mkText = mkText;
        function mkBlock(nodes) {
            return mkNode(NT.Block, "", nodes);
        }
        blocks.mkBlock = mkBlock;
        function mkGroup(nodes) {
            return mkPrefix("", nodes);
        }
        blocks.mkGroup = mkGroup;
        function mkStmt() {
            var nodes = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                nodes[_i] = arguments[_i];
            }
            var last = nodes[nodes.length - 1];
            if (last && last.type == NT.Block) {
                // OK - no newline needed
            }
            else {
                nodes.push(mkNewLine());
            }
            return mkGroup(nodes);
        }
        blocks.mkStmt = mkStmt;
        function mkCommaSep(nodes, withNewlines) {
            if (withNewlines === void 0) { withNewlines = false; }
            var r = [];
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var n = nodes_1[_i];
                if (withNewlines) {
                    if (r.length > 0)
                        r.push(mkText(","));
                    r.push(mkNewLine());
                }
                else if (r.length > 0) {
                    r.push(mkText(", "));
                }
                r.push(n);
            }
            if (withNewlines)
                r.push(mkNewLine());
            return mkGroup(r);
        }
        blocks.mkCommaSep = mkCommaSep;
        // A series of utility functions for constructing various J* AST nodes.
        var Helpers;
        (function (Helpers) {
            function mkArrayLiteral(args) {
                return mkGroup([
                    mkText("["),
                    mkCommaSep(args, false),
                    mkText("]")
                ]);
            }
            Helpers.mkArrayLiteral = mkArrayLiteral;
            function mkNumberLiteral(x) {
                return mkText(x.toString());
            }
            Helpers.mkNumberLiteral = mkNumberLiteral;
            function mkBooleanLiteral(x) {
                return mkText(x ? "true" : "false");
            }
            Helpers.mkBooleanLiteral = mkBooleanLiteral;
            function mkStringLiteral(x) {
                return mkText(stringLit(x));
            }
            Helpers.mkStringLiteral = mkStringLiteral;
            function mkPropertyAccess(name, thisArg) {
                return mkGroup([
                    mkInfix(thisArg, ".", mkText(name)),
                ]);
            }
            Helpers.mkPropertyAccess = mkPropertyAccess;
            function mkCall(name, args, externalInputs, method) {
                if (externalInputs === void 0) { externalInputs = false; }
                if (method === void 0) { method = false; }
                if (method)
                    return mkGroup([
                        mkInfix(args[0], ".", mkText(name)),
                        mkText("("),
                        mkCommaSep(args.slice(1), externalInputs),
                        mkText(")")
                    ]);
                else
                    return mkGroup([
                        mkText(name),
                        mkText("("),
                        mkCommaSep(args, externalInputs),
                        mkText(")")
                    ]);
            }
            Helpers.mkCall = mkCall;
            // Call function [name] from the standard device library with arguments
            // [args].
            function stdCall(name, args, externalInputs) {
                return mkCall(name, args, externalInputs);
            }
            Helpers.stdCall = stdCall;
            // Call extension method [name] on the first argument
            function extensionCall(name, args, externalInputs) {
                return mkCall(name, args, externalInputs, true);
            }
            Helpers.extensionCall = extensionCall;
            // Call function [name] from the specified [namespace] in the micro:bit
            // library.
            function namespaceCall(namespace, name, args, externalInputs) {
                return mkCall(namespace + "." + name, args, externalInputs);
            }
            Helpers.namespaceCall = namespaceCall;
            function mathCall(name, args) {
                return namespaceCall("Math", name, args, false);
            }
            Helpers.mathCall = mathCall;
            function mkGlobalRef(name) {
                return mkText(name);
            }
            Helpers.mkGlobalRef = mkGlobalRef;
            function mkSimpleCall(p, args) {
                pxt.U.assert(args.length == 2);
                return mkInfix(args[0], p, args[1]);
            }
            Helpers.mkSimpleCall = mkSimpleCall;
            function mkWhile(condition, body) {
                return mkGroup([
                    mkText("while ("),
                    condition,
                    mkText(")"),
                    mkBlock(body)
                ]);
            }
            Helpers.mkWhile = mkWhile;
            function mkComment(text) {
                return mkText("// " + text);
            }
            Helpers.mkComment = mkComment;
            function mkMultiComment(text) {
                var group = [
                    mkText("/**"),
                    mkNewLine()
                ];
                text.split("\n").forEach(function (c, i, arr) {
                    if (c) {
                        group.push(mkText(" * " + c));
                        group.push(mkNewLine());
                        // Add an extra line so we can convert it back to new lines
                        if (i < arr.length - 1) {
                            group.push(mkText(" * "));
                            group.push(mkNewLine());
                        }
                    }
                });
                return mkGroup(group.concat([
                    mkText(" */"),
                    mkNewLine()
                ]));
            }
            Helpers.mkMultiComment = mkMultiComment;
            function mkAssign(x, e) {
                return mkSimpleCall("=", [x, e]);
            }
            Helpers.mkAssign = mkAssign;
            function mkParenthesizedExpression(expression) {
                return isParenthesized(flattenNode([expression]).output) ? expression : mkGroup([mkText("("), expression, mkText(")")]);
            }
            Helpers.mkParenthesizedExpression = mkParenthesizedExpression;
        })(Helpers = blocks.Helpers || (blocks.Helpers = {}));
        blocks.H = Helpers;
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
        var infixPriTable = {
            // 0 = comma/sequence
            // 1 = spread (...)
            // 2 = yield, yield*
            // 3 = assignment
            "=": 3,
            "+=": 3,
            "-=": 3,
            "?": 4,
            ":": 4,
            "||": 5,
            "&&": 6,
            "|": 7,
            "^": 8,
            "&": 9,
            // 10 = equality
            "==": 10,
            "!=": 10,
            "===": 10,
            "!==": 10,
            // 11 = comparison (excludes in, instanceof)
            "<": 11,
            ">": 11,
            "<=": 11,
            ">=": 11,
            // 12 = bitwise shift
            ">>": 12,
            ">>>": 12,
            "<<": 12,
            "+": 13,
            "-": 13,
            "*": 14,
            "/": 14,
            "%": 14,
            "**": 15,
            "!": 16,
            "~": 16,
            "P-": 16,
            "P+": 16,
            "++": 16,
            "--": 16,
            ".": 18,
        };
        function flattenNode(app) {
            var sourceMap = [];
            var sourceMapById = {};
            var output = "";
            var indent = "";
            var variables = [{}];
            function flatten(e0) {
                function rec(e, outPrio) {
                    if (e.type != NT.Infix) {
                        for (var _i = 0, _a = e.children; _i < _a.length; _i++) {
                            var c = _a[_i];
                            rec(c, -1);
                        }
                        return;
                    }
                    var r = [];
                    function pushOp(c) {
                        if (c[0] == "P")
                            c = c.slice(1);
                        r.push(mkText(c));
                    }
                    var infixPri = pxt.U.lookup(infixPriTable, e.op);
                    if (infixPri == null)
                        pxt.U.oops("bad infix op: " + e.op);
                    if (infixPri < outPrio)
                        pushOp("(");
                    if (e.children.length == 1) {
                        pushOp(e.op);
                        rec(e.children[0], infixPri);
                        r.push(e.children[0]);
                    }
                    else {
                        var bindLeft = infixPri != 3 && e.op != "**";
                        var letType = undefined;
                        rec(e.children[0], bindLeft ? infixPri : infixPri + 0.1);
                        r.push(e.children[0]);
                        if (letType && letType != "number") {
                            pushOp(": ");
                            pushOp(letType);
                        }
                        if (e.op == ".")
                            pushOp(".");
                        else
                            pushOp(" " + e.op + " ");
                        rec(e.children[1], !bindLeft ? infixPri : infixPri + 0.1);
                        r.push(e.children[1]);
                    }
                    if (infixPri < outPrio)
                        pushOp(")");
                    e.type = NT.Prefix;
                    e.op = "";
                    e.children = r;
                }
                rec(e0, -1);
            }
            var root = mkGroup(app);
            flatten(root);
            emit(root);
            // never return empty string - TS compiler service thinks it's an error
            if (!output)
                output += "\n";
            return { output: output, sourceMap: sourceMap };
            function emit(n) {
                if (n.glueToBlock) {
                    removeLastIndent();
                    if (n.glueToBlock == GlueMode.WithSpace) {
                        output += " ";
                    }
                }
                var start = getCurrentLine();
                switch (n.type) {
                    case NT.Infix:
                        pxt.U.oops("no infix should be left");
                        break;
                    case NT.NewLine:
                        output += "\n" + indent;
                        break;
                    case NT.Block:
                        block(n);
                        break;
                    case NT.Prefix:
                        if (n.canIndentInside)
                            output += n.op.replace(/\n/g, "\n" + indent + "    ");
                        else
                            output += n.op;
                        n.children.forEach(emit);
                        break;
                    case NT.Postfix:
                        n.children.forEach(emit);
                        if (n.canIndentInside)
                            output += n.op.replace(/\n/g, "\n" + indent + "    ");
                        else
                            output += n.op;
                        break;
                    default:
                        break;
                }
                var end = getCurrentLine();
                if (n.id) {
                    if (sourceMapById[n.id]) {
                        var node = sourceMapById[n.id];
                        node.start = Math.min(node.start, start);
                        node.end = Math.max(node.end, end);
                    }
                    else {
                        var interval = { id: n.id, start: start, end: end };
                        sourceMapById[n.id] = interval;
                        sourceMap.push(interval);
                    }
                }
            }
            function getCurrentLine() {
                var i = 0;
                output.replace(/\n/g, function (a) { i++; return a; });
                return i;
            }
            function write(s) {
                output += s.replace(/\n/g, "\n" + indent);
            }
            function removeLastIndent() {
                output = output.replace(/\n *$/, "");
            }
            function block(n) {
                var finalNl = n.noFinalNewline ? "" : "\n";
                if (n.children.length == 0) {
                    write(" {\n\t\n}" + finalNl);
                    return;
                }
                var vars = pxt.U.clone(variables[variables.length - 1] || {});
                variables.push(vars);
                indent += "    ";
                if (output[output.length - 1] != " ")
                    write(" ");
                write("{\n");
                for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                    var nn = _a[_i];
                    emit(nn);
                }
                indent = indent.slice(4);
                removeLastIndent();
                write("\n}" + finalNl);
                variables.pop();
            }
        }
        blocks.flattenNode = flattenNode;
        function isReservedWord(str) {
            return reservedWords.indexOf(str) !== -1;
        }
        blocks.isReservedWord = isReservedWord;
        function isParenthesized(fnOutput) {
            if (fnOutput[0] !== "(" || fnOutput[fnOutput.length - 1] !== ")") {
                return false;
            }
            var unclosedParentheses = 1;
            for (var i = 1; i < fnOutput.length; i++) {
                var c = fnOutput[i];
                if (c === "(") {
                    unclosedParentheses++;
                }
                else if (c === ")") {
                    unclosedParentheses--;
                    if (unclosedParentheses === 0) {
                        return i === fnOutput.length - 1;
                    }
                }
            }
            return false;
        }
        blocks.isParenthesized = isParenthesized;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtpackage.d.ts"/>
/// <reference path="../localtypings/pxtparts.d.ts"/>
/// <reference path="../localtypings/pxtarget.d.ts"/>
/// <reference path="util.ts"/>
var pxt;
(function (pxt) {
    var Package = /** @class */ (function () {
        function Package(id, _verspec, parent, addedBy) {
            this.id = id;
            this._verspec = _verspec;
            this.parent = parent;
            this.level = -1; // main package = 0, first children = 1, etc
            this.isLoaded = false;
            this.ignoreTests = false;
            this.cppOnly = false;
            if (addedBy) {
                this.level = addedBy.level + 1;
            }
            this.addedBy = [addedBy];
        }
        Package.getConfigAsync = function (pkgTargetVersion, id, fullVers) {
            return Promise.resolve().then(function () {
                if (pxt.github.isGithubId(fullVers)) {
                    var repoInfo_1 = pxt.github.parseRepoId(fullVers);
                    return pxt.packagesConfigAsync()
                        .then(function (config) { return pxt.github.repoAsync(repoInfo_1.fullName, config); }) // Make sure repo exists and is whitelisted
                        .then(function (gitRepo) { return gitRepo ? pxt.github.pkgConfigAsync(repoInfo_1.fullName, repoInfo_1.tag) : null; });
                }
                else {
                    // If it's not from GH, assume it's a bundled package
                    // TODO: Add logic for shared packages if we enable that
                    var updatedRef = pxt.patching.upgradePackageReference(pkgTargetVersion, id, fullVers);
                    var bundledPkg = pxt.appTarget.bundledpkgs[updatedRef];
                    return JSON.parse(bundledPkg[pxt.CONFIG_NAME]);
                }
            });
        };
        Package.corePackages = function () {
            var pkgs = pxt.appTarget.bundledpkgs;
            return Object.keys(pkgs).map(function (id) { return JSON.parse(pkgs[id][pxt.CONFIG_NAME]); })
                .filter(function (cfg) { return !!cfg; });
        };
        Package.prototype.invalid = function () {
            return /^invalid:/.test(this.version());
        };
        Package.prototype.version = function () {
            return this.resolvedVersion || this._verspec;
        };
        Package.prototype.verProtocol = function () {
            var spl = this.version().split(':');
            if (spl.length > 1)
                return spl[0];
            else
                return "";
        };
        Package.prototype.verArgument = function () {
            var p = this.verProtocol();
            if (p)
                return this.version().slice(p.length + 1);
            return this.version();
        };
        Package.prototype.targetVersion = function () {
            return (this.parent && this.parent != this)
                ? this.parent.targetVersion()
                : this.config.targetVersions
                    ? this.config.targetVersions.target
                    : undefined;
        };
        Package.prototype.commonDownloadAsync = function () {
            var _this = this;
            var proto = this.verProtocol();
            if (proto == "pub") {
                return pxt.Cloud.downloadScriptFilesAsync(this.verArgument());
            }
            else if (proto == "github") {
                return pxt.packagesConfigAsync()
                    .then(function (config) { return pxt.github.downloadPackageAsync(_this.verArgument(), config); })
                    .then(function (resp) { return resp.files; });
            }
            else if (proto == "embed") {
                var resp = pxt.getEmbeddedScript(this.verArgument());
                return Promise.resolve(resp);
            }
            else if (proto == "pkg") {
                // the package source is serialized in a file in the package itself
                var pkgFilesSrc = this.readFile(this.verArgument());
                var pkgFilesJson = ts.pxtc.Util.jsonTryParse(pkgFilesSrc);
                if (!pkgFilesJson)
                    pxt.log("unable to find " + this.verArgument());
                return Promise.resolve(pkgFilesJson);
            }
            else
                return Promise.resolve(null);
        };
        Package.prototype.host = function () { return this.parent._host; };
        Package.prototype.readFile = function (fn) {
            return this.host().readFile(this, fn);
        };
        Package.prototype.resolveDep = function (id) {
            if (this.parent.deps.hasOwnProperty(id))
                return this.parent.deps[id];
            return null;
        };
        Package.prototype.saveConfig = function () {
            var cfg = pxt.U.clone(this.config);
            delete cfg.additionalFilePaths;
            var text = JSON.stringify(cfg, null, 4);
            this.host().writeFile(this, pxt.CONFIG_NAME, text);
        };
        Package.prototype.setPreferredEditor = function (editor) {
            if (this.config.preferredEditor != editor) {
                this.config.preferredEditor = editor;
                this.saveConfig();
            }
        };
        Package.prototype.getPreferredEditor = function () {
            var editor = this.config.preferredEditor;
            if (!editor) {
                // older editors do not have this field set so we need to apply our
                // language resolution logic here
                // note that the preferredEditor field will be set automatically on the first save
                // 1. no main.blocks in project, open javascript
                var hasMainBlocks = this.getFiles().indexOf("main.blocks") >= 0;
                if (!hasMainBlocks)
                    return pxt.JAVASCRIPT_PROJECT_NAME;
                // 2. if main.blocks is empty and main.ts is non-empty
                //    open typescript
                // https://github.com/Microsoft/pxt/blob/master/webapp/src/app.tsx#L1032
                var mainBlocks = this.readFile("main.blocks");
                var mainTs = this.readFile("main.ts");
                if (!mainBlocks && mainTs)
                    return pxt.JAVASCRIPT_PROJECT_NAME;
                // 3. default ot blocks
                return pxt.BLOCKS_PROJECT_NAME;
            }
            return editor;
        };
        Package.prototype.parseJRes = function (allres) {
            if (allres === void 0) { allres = {}; }
            for (var _i = 0, _a = this.getFiles(); _i < _a.length; _i++) {
                var f = _a[_i];
                if (pxt.U.endsWith(f, ".jres")) {
                    var js = JSON.parse(this.readFile(f));
                    var base = js["*"] || {};
                    for (var _b = 0, _c = Object.keys(js); _b < _c.length; _b++) {
                        var k = _c[_b];
                        if (k == "*")
                            continue;
                        var v = js[k];
                        if (typeof v == "string") {
                            // short form
                            v = { data: v };
                        }
                        var ns = v.namespace || base.namespace || "";
                        if (ns)
                            ns += ".";
                        var id = v.id || ns + k;
                        var icon = v.icon;
                        var mimeType = v.mimeType || base.mimeType;
                        var dataEncoding = v.dataEncoding || base.dataEncoding || "base64";
                        if (!icon && dataEncoding == "base64" && (mimeType == "image/png" || mimeType == "image/jpeg")) {
                            icon = "data:" + mimeType + ";base64," + v.data;
                        }
                        allres[id] = {
                            id: id,
                            data: v.data,
                            dataEncoding: v.dataEncoding || base.dataEncoding || "base64",
                            icon: icon,
                            namespace: ns,
                            mimeType: mimeType
                        };
                    }
                }
            }
            return allres;
        };
        Package.prototype.resolveVersionAsync = function () {
            var v = this._verspec;
            if (pxt.getEmbeddedScript(this.id)) {
                this.resolvedVersion = v = "embed:" + this.id;
            }
            else if (!v || v == "*") {
                // don't hard crash, instead ignore dependency
                // U.userError(lf("version not specified for {0}", this.id))
                this.configureAsInvalidPackage(lf("version not specified for {0}", this.id));
                v = this._verspec;
            }
            return Promise.resolve(v);
        };
        Package.prototype.downloadAsync = function () {
            var _this = this;
            return this.resolveVersionAsync()
                .then(function (verNo) {
                if (_this.invalid()) {
                    pxt.debug("skip download of invalid package " + _this.id);
                    return undefined;
                }
                if (!/^embed:/.test(verNo) &&
                    _this.config && _this.config.installedVersion == verNo)
                    return undefined;
                pxt.debug('downloading ' + verNo);
                return _this.host().downloadPackageAsync(_this)
                    .then(function () {
                    _this.loadConfig();
                    pxt.debug("installed " + _this.id + " /" + verNo);
                });
            });
        };
        Package.prototype.loadConfig = function () {
            var confStr = this.readFile(pxt.CONFIG_NAME);
            if (!confStr)
                pxt.U.userError("extension " + this.id + " is missing " + pxt.CONFIG_NAME);
            this.parseConfig(confStr);
            if (this.level != 0)
                this.config.installedVersion = this.version();
            this.saveConfig();
        };
        Package.prototype.validateConfig = function () {
            if (!this.config.dependencies)
                pxt.U.userError("Missing dependencies in config of: " + this.id);
            if (!Array.isArray(this.config.files))
                pxt.U.userError("Missing files in config of: " + this.id);
            if (typeof this.config.name != "string" || !this.config.name ||
                (this.config.public && !/^[a-z][a-z0-9\-_]+$/i.test(this.config.name)))
                pxt.U.userError("Invalid extension name: " + this.config.name);
            if (this.config.targetVersions
                && this.config.targetVersions.target
                && pxt.semver.majorCmp(this.config.targetVersions.target, pxt.appTarget.versions.target) > 0)
                pxt.U.userError(lf("{0} requires target version {1} (you are running {2})", this.config.name, this.config.targetVersions.target, pxt.appTarget.versions.target));
        };
        Package.prototype.isPackageInUse = function (pkgId, ts) {
            if (ts === void 0) { ts = this.readFile("main.ts"); }
            // Build the RegExp that will determine whether the dependency is in use. Try to use upgrade rules,
            // otherwise fallback to the package's name
            var regex = null;
            var upgrades = pxt.patching.computePatches(this.targetVersion(), "missingPackage");
            if (upgrades) {
                upgrades.forEach(function (rule) {
                    Object.keys(rule.map).forEach(function (match) {
                        if (rule.map[match] === pkgId) {
                            regex = new RegExp(match, "g");
                        }
                    });
                });
            }
            if (!regex) {
                regex = new RegExp(pkgId + "\\.", "g");
            }
            return regex.test(ts);
        };
        Package.prototype.getMissingPackages = function (config, ts) {
            var upgrades = pxt.patching.computePatches(this.targetVersion(), "missingPackage");
            var missing = {};
            if (ts && upgrades)
                upgrades.forEach(function (rule) {
                    Object.keys(rule.map).forEach(function (match) {
                        var regex = new RegExp(match, 'g');
                        var pkg = rule.map[match];
                        ts.replace(regex, function (m) {
                            if (!config.dependencies[pkg]) {
                                missing[pkg] = "*";
                            }
                            return "";
                        });
                    });
                });
            return missing;
        };
        /**
         * For the given package config or ID, looks through all the currently installed packages to find conflicts in
         * Yotta settings and version spec
         */
        Package.prototype.findConflictsAsync = function (pkgOrId, version) {
            var _this = this;
            var conflicts = [];
            var pkgCfg;
            return Promise.resolve()
                .then(function () {
                // Get the package config if it's not already provided
                if (typeof pkgOrId === "string") {
                    return Package.getConfigAsync(_this.targetVersion(), pkgOrId, version);
                }
                else {
                    return Promise.resolve(pkgOrId);
                }
            })
                .then(function (cfg) {
                pkgCfg = cfg;
                // Iterate through all installed packages and check for conflicting settings
                if (pkgCfg) {
                    var yottaCfg_1 = pkgCfg.yotta ? pxt.U.jsonFlatten(pkgCfg.yotta.config) : null;
                    _this.parent.sortedDeps().forEach(function (depPkg) {
                        if (pkgCfg.core && depPkg.config.core &&
                            pkgCfg.name != depPkg.config.name) {
                            var conflict = new pxt.cpp.PkgConflictError(lf("conflict between core extensions {0} and {1}", pkgCfg.name, depPkg.id));
                            conflict.pkg0 = depPkg;
                            conflicts.push(conflict);
                            return;
                        }
                        var foundYottaConflict = false;
                        if (yottaCfg_1) {
                            var depConfig = depPkg.config || JSON.parse(depPkg.readFile(pxt.CONFIG_NAME));
                            var hasYottaSettings = !!depConfig && !!depConfig.yotta && !!depPkg.config.yotta.config;
                            if (hasYottaSettings) {
                                var depYottaCfg = pxt.U.jsonFlatten(depConfig.yotta.config);
                                for (var _i = 0, _a = Object.keys(yottaCfg_1); _i < _a.length; _i++) {
                                    var settingName = _a[_i];
                                    var depSetting = depYottaCfg[settingName];
                                    var isJustDefaults = pkgCfg.yotta.configIsJustDefaults || depConfig.yotta.configIsJustDefaults;
                                    if (depYottaCfg.hasOwnProperty(settingName) && depSetting !== yottaCfg_1[settingName] && !isJustDefaults && (!depPkg.parent.config.yotta || !depPkg.parent.config.yotta.ignoreConflicts)) {
                                        var conflict = new pxt.cpp.PkgConflictError(lf("conflict on yotta setting {0} between extensions {1} and {2}", settingName, pkgCfg.name, depPkg.id));
                                        conflict.pkg0 = depPkg;
                                        conflict.settingName = settingName;
                                        conflicts.push(conflict);
                                        foundYottaConflict = true;
                                    }
                                }
                            }
                        }
                        if (!foundYottaConflict && pkgCfg.name === depPkg.id && depPkg._verspec != version && !/^file:/.test(depPkg._verspec) && !/^file:/.test(version)) {
                            var conflict = new pxt.cpp.PkgConflictError(lf("version mismatch for extension {0} (installed: {1}, installing: {2})", depPkg, depPkg._verspec, version));
                            conflict.pkg0 = depPkg;
                            conflict.isVersionConflict = true;
                            conflicts.push(conflict);
                        }
                    });
                }
                // Also check for conflicts for all the specified package's dependencies (recursively)
                return Object.keys(pkgCfg.dependencies).reduce(function (soFar, pkgDep) {
                    return soFar
                        .then(function () { return _this.findConflictsAsync(pkgDep, pkgCfg.dependencies[pkgDep]); })
                        .then(function (childConflicts) { return conflicts.push.apply(conflicts, childConflicts); });
                }, Promise.resolve());
            })
                .then(function () {
                // For each conflicting package, we need to include their ancestor tree in the list of conflicts
                // For example, if package A depends on package B, and package B is in conflict with package C,
                // then package A is also technically in conflict with C
                var allAncestors = function (p) {
                    var ancestors = [];
                    p.addedBy.forEach(function (a) {
                        if (a.id !== _this.id) {
                            ancestors.push.apply(allAncestors(a));
                            ancestors.push(a);
                        }
                    });
                    return ancestors;
                };
                var additionalConflicts = [];
                conflicts.forEach(function (c) {
                    additionalConflicts.push.apply(additionalConflicts, allAncestors(c.pkg0).map(function (anc) {
                        var confl = new pxt.cpp.PkgConflictError(c.isVersionConflict ?
                            lf("a dependency of {0} has a version mismatch with extension {1} (installed: {1}, installing: {2})", anc.id, pkgCfg.name, c.pkg0._verspec, version) :
                            lf("conflict on yotta setting {0} between extensions {1} and {2}", c.settingName, pkgCfg.name, c.pkg0.id));
                        confl.pkg0 = anc;
                        return confl;
                    }));
                });
                conflicts.push.apply(conflicts, additionalConflicts);
                // Remove duplicate conflicts (happens if more than one package had the same ancestor)
                conflicts = conflicts.filter(function (c, index) {
                    for (var i = 0; i < index; ++i) {
                        if (c.pkg0.id === conflicts[i].pkg0.id) {
                            return false;
                        }
                    }
                    return true;
                });
                return conflicts;
            });
        };
        Package.prototype.configureAsInvalidPackage = function (reason) {
            pxt.log("invalid package " + this.id + ": " + reason);
            this._verspec = "invalid:" + this.id;
            this.config = {
                name: this.id,
                description: reason,
                dependencies: {},
                files: []
            };
        };
        Package.prototype.parseConfig = function (cfgSrc, targetVersion) {
            try {
                var cfg = JSON.parse(cfgSrc);
                this.config = cfg;
            }
            catch (e) {
                this.configureAsInvalidPackage(lf("Syntax error in pxt.json"));
            }
            var currentConfig = JSON.stringify(this.config);
            for (var dep in this.config.dependencies) {
                var value = pxt.patching.upgradePackageReference(this.targetVersion(), dep, this.config.dependencies[dep]);
                if (value != dep) {
                    delete this.config.dependencies[dep];
                    if (value) {
                        this.config.dependencies[value] = "*";
                    }
                }
            }
            if (targetVersion) {
                this.config.targetVersions = {
                    target: targetVersion
                };
            }
            if (JSON.stringify(this.config) != currentConfig) {
                this.saveConfig();
            }
            this.validateConfig();
        };
        Package.prototype.patchCorePackage = function () {
            var _this = this;
            pxt.Util.assert(pxt.appTarget.simulator && pxt.appTarget.simulator.dynamicBoardDefinition);
            pxt.Util.assert(this.level == 0);
            // find all core packages in target
            var corePackages = Object.keys(this.config.dependencies)
                .filter(function (dep) { return !!dep && (dep == pxt.BLOCKS_PROJECT_NAME || dep == pxt.JAVASCRIPT_PROJECT_NAME ||
                JSON.parse((pxt.appTarget.bundledpkgs[dep] || {})[pxt.CONFIG_NAME] || "{}").core); });
            // no core package? add the first one
            if (corePackages.length == 0) {
                var allCorePkgs = pxt.Package.corePackages();
                /* tslint:disable:no-unused-expression TODO(tslint): */
                if (allCorePkgs.length)
                    this.config.dependencies[allCorePkgs[0].name];
                /* tslint:enable:no-unused-expression */
            }
            else if (corePackages.length > 1) {
                // keep last package
                corePackages.pop();
                corePackages.forEach(function (dep) {
                    pxt.log("removing core package " + dep);
                    delete _this.config.dependencies[dep];
                });
            }
        };
        Package.prototype.dependencies = function (includeCpp) {
            if (includeCpp === void 0) { includeCpp = false; }
            if (!this.config)
                return {};
            var dependencies = pxt.Util.clone(this.config.dependencies || {});
            // add test dependencies if nedeed
            if (this.level == 0 && this.config.testDependencies) {
                pxt.Util.jsonMergeFrom(dependencies, this.config.testDependencies);
            }
            if (includeCpp && this.config.cppDependencies) {
                pxt.Util.jsonMergeFrom(dependencies, this.config.cppDependencies);
            }
            return dependencies;
        };
        Package.prototype.loadAsync = function (isInstall, targetVersion) {
            var _this = this;
            if (isInstall === void 0) { isInstall = false; }
            if (this.isLoaded)
                return Promise.resolve();
            var initPromise = Promise.resolve();
            if (this.level == 0)
                pxt.setAppTargetVariant(null);
            this.isLoaded = true;
            var str = this.readFile(pxt.CONFIG_NAME);
            if (str == null) {
                if (!isInstall)
                    pxt.U.userError("Package not installed: " + this.id + ", did you forget to run `pxt install`?");
            }
            else {
                initPromise = initPromise.then(function () { return _this.parseConfig(str); });
            }
            if (isInstall)
                initPromise = initPromise.then(function () { return _this.downloadAsync(); });
            if (pxt.appTarget.simulator && pxt.appTarget.simulator.dynamicBoardDefinition) {
                if (this.level == 0)
                    initPromise = initPromise.then(function () { return _this.patchCorePackage(); });
                initPromise = initPromise.then(function () {
                    if (_this.config.compileServiceVariant)
                        pxt.setAppTargetVariant(_this.config.compileServiceVariant);
                    if (_this.config.files.indexOf("board.json") < 0)
                        return;
                    var def = pxt.appTarget.simulator.boardDefinition = JSON.parse(_this.readFile("board.json"));
                    def.id = _this.config.name;
                    pxt.appTarget.appTheme.boardName = def.boardName || lf("board");
                    pxt.appTarget.appTheme.driveDisplayName = def.driveDisplayName || lf("DRIVE");
                    var expandPkg = function (v) {
                        var m = /^pkg:\/\/(.*)/.exec(v);
                        if (m) {
                            var fn = m[1];
                            var content = _this.readFile(fn);
                            return pxt.U.toDataUri(content, pxt.U.getMime(fn));
                        }
                        else {
                            return v;
                        }
                    };
                    var bd = pxt.appTarget.simulator.boardDefinition;
                    if (typeof bd.visual == "object") {
                        var vis = bd.visual;
                        vis.image = expandPkg(vis.image);
                        vis.outlineImage = expandPkg(vis.outlineImage);
                    }
                });
            }
            var loadDepsRecursive = function (deps, from, isCpp) {
                if (isCpp === void 0) { isCpp = false; }
                return pxt.U.mapStringMapAsync(deps || from.dependencies(isCpp), function (id, ver) {
                    if (id == "hw" && pxt.hwVariant)
                        id = "hw---" + pxt.hwVariant;
                    var mod = from.resolveDep(id);
                    ver = ver || "*";
                    if (mod) {
                        if (mod.invalid()) {
                            // failed to resolve dependency, ignore
                            mod.level = Math.min(mod.level, from.level + 1);
                            mod.addedBy.push(from);
                            return Promise.resolve();
                        }
                        if (mod._verspec != ver && !/^file:/.test(mod._verspec) && !/^file:/.test(ver))
                            pxt.U.userError("Version spec mismatch on " + id);
                        if (!isCpp) {
                            mod.level = Math.min(mod.level, from.level + 1);
                            mod.addedBy.push(from);
                        }
                        return Promise.resolve();
                    }
                    else {
                        var mod_1 = new Package(id, ver, from.parent, from);
                        if (isCpp)
                            mod_1.cppOnly = true;
                        from.parent.deps[id] = mod_1;
                        // we can have "core---nrf52" to be used instead of "core" in other packages
                        from.parent.deps[id.replace(/---.*/, "")] = mod_1;
                        return mod_1.loadAsync(isInstall);
                    }
                });
            };
            return initPromise
                .then(function () { return loadDepsRecursive(null, _this); })
                .then(function () {
                // get paletter config loading deps, so the more higher level packages take precedence
                if (_this.config.palette && pxt.appTarget.runtime)
                    pxt.appTarget.runtime.palette = pxt.U.clone(_this.config.palette);
                // get screen size loading deps, so the more higher level packages take precedence
                if (_this.config.screenSize && pxt.appTarget.runtime)
                    pxt.appTarget.runtime.screenSize = pxt.U.clone(_this.config.screenSize);
                if (_this.level === 0) {
                    // Check for missing packages. We need to add them 1 by 1 in case they conflict with eachother.
                    var mainTs = _this.readFile("main.ts");
                    if (!mainTs)
                        return Promise.resolve(null);
                    var missingPackages_1 = _this.getMissingPackages(_this.config, mainTs);
                    var didAddPackages_1 = false;
                    return Object.keys(missingPackages_1).reduce(function (addPackagesPromise, missing) {
                        return addPackagesPromise
                            .then(function () { return _this.findConflictsAsync(missing, missingPackages_1[missing]); })
                            .then(function (conflicts) {
                            if (conflicts.length) {
                                var conflictNames = conflicts.map(function (c) { return c.pkg0.id; }).join(", ");
                                var settingNames = conflicts.map(function (c) { return c.settingName; }).filter(function (s) { return !!s; }).join(", ");
                                pxt.log("skipping missing package " + missing + " because it conflicts with the following packages: " + conflictNames + " (conflicting settings: " + settingNames + ")");
                                return Promise.resolve(null);
                            }
                            else {
                                pxt.log("adding missing package " + missing);
                                didAddPackages_1 = true;
                                _this.config.dependencies[missing] = "*";
                                var addDependency = {};
                                addDependency[missing] = missingPackages_1[missing];
                                return loadDepsRecursive(addDependency, _this);
                            }
                        });
                    }, Promise.resolve(null))
                        .then(function () {
                        if (didAddPackages_1) {
                            _this.saveConfig();
                            _this.validateConfig();
                        }
                        return Promise.resolve(null);
                    });
                }
                return Promise.resolve(null);
            })
                .then(function () {
                if (_this.level != 0)
                    return Promise.resolve();
                return Promise.all(pxt.U.values(_this.parent.deps).map(function (pkg) {
                    return loadDepsRecursive(null, pkg, true);
                }));
            })
                .then(function () {
                pxt.debug("  installed " + _this.id);
            });
        };
        Package.prototype.getFiles = function () {
            if (this.level == 0 && !this.ignoreTests)
                return this.config.files.concat(this.config.testFiles || []);
            else
                return this.config.files.slice(0);
        };
        Package.prototype.addSnapshot = function (files, exts) {
            if (exts === void 0) { exts = [""]; }
            var _loop_5 = function (fn) {
                if (exts.some(function (e) { return pxt.U.endsWith(fn, e); })) {
                    files[this_1.id + "/" + fn] = this_1.readFile(fn);
                }
            };
            var this_1 = this;
            for (var _i = 0, _a = this.getFiles(); _i < _a.length; _i++) {
                var fn = _a[_i];
                _loop_5(fn);
            }
            files[this.id + "/" + pxt.CONFIG_NAME] = this.readFile(pxt.CONFIG_NAME);
        };
        /**
         * Returns localized strings qName -> translation
         */
        Package.prototype.packageLocalizationStringsAsync = function (lang) {
            var _this = this;
            var targetId = pxt.appTarget.id;
            var filenames = [this.id + "-jsdoc", this.id];
            var r = {};
            var theme = pxt.appTarget.appTheme || {};
            if (this.config.skipLocalization)
                return Promise.resolve(r);
            // live loc of bundled packages
            if (pxt.Util.localizeLive && this.id != "this" && pxt.appTarget.bundledpkgs[this.id]) {
                pxt.debug("loading live translations for " + this.id);
                var code_1 = pxt.Util.userLanguage();
                return Promise.all(filenames.map(function (fn) { return pxt.Util.downloadLiveTranslationsAsync(code_1, targetId + "/" + fn + "-strings.json", theme.crowdinBranch)
                    .then(function (tr) {
                    if (tr && Object.keys(tr).length) {
                        pxt.Util.jsonMergeFrom(r, tr);
                    }
                    else {
                        pxt.tickEvent("translations.livetranslationsfailed", { "filename": fn });
                        pxt.Util.jsonMergeFrom(r, _this.bundledStringsForFile(lang, fn));
                    }
                })
                    .catch(function (e) {
                    pxt.tickEvent("translations.livetranslationsfailed", { "filename": fn });
                    pxt.log("error while downloading " + targetId + "/" + fn + "-strings.json");
                    pxt.Util.jsonMergeFrom(r, _this.bundledStringsForFile(lang, fn));
                }); })).then(function () { return r; });
            }
            else {
                filenames.map(function (name) {
                    return _this.bundledStringsForFile(lang, name);
                }).filter(function (d) { return !!d; }).forEach(function (d) { return pxt.Util.jsonMergeFrom(r, d); });
                return Promise.resolve(r);
            }
        };
        Package.prototype.bundledStringsForFile = function (lang, filename) {
            var r = {};
            var files = this.config.files;
            var fn = "_locales/" + lang.toLowerCase() + "/" + filename + "-strings.json";
            if (files.indexOf(fn) > -1)
                r = JSON.parse(this.readFile(fn));
            if (lang.length > 2) {
                fn = "_locales/" + lang.substring(0, 2).toLowerCase() + "/" + filename + "-strings.json";
                if (files.indexOf(fn) > -1)
                    r = JSON.parse(this.readFile(fn));
            }
            return r;
        };
        return Package;
    }());
    pxt.Package = Package;
    var MainPackage = /** @class */ (function (_super) {
        __extends(MainPackage, _super);
        function MainPackage(_host) {
            var _this = _super.call(this, "this", "file:.", null, null) || this;
            _this._host = _host;
            _this.deps = {};
            _this.parent = _this;
            _this.addedBy = [_this];
            _this.level = 0;
            _this.deps[_this.id] = _this;
            return _this;
        }
        MainPackage.prototype.installAllAsync = function (targetVersion) {
            return this.loadAsync(true, targetVersion);
        };
        MainPackage.prototype.sortedDeps = function (includeCpp) {
            var _this = this;
            if (includeCpp === void 0) { includeCpp = false; }
            var visited = {};
            var ids = [];
            var weight = function (p) {
                return p.config ? Object.keys(p.config.cppDependencies || {}).length : 0;
            };
            var rec = function (p) {
                if (!p || pxt.U.lookup(visited, p.id))
                    return;
                visited[p.id] = true;
                var depNames = Object.keys(p.dependencies(includeCpp));
                var deps = depNames.map(function (id) { return _this.resolveDep(id); });
                // packages with more cppDependencies (core---* most likely) come first
                deps.sort(function (a, b) { return weight(b) - weight(a) || pxt.U.strcmp(a.id, b.id); });
                deps.forEach(rec);
                ids.push(p.id);
            };
            rec(this);
            return ids.map(function (id) { return _this.resolveDep(id); });
        };
        MainPackage.prototype.localizationStringsAsync = function (lang) {
            var loc = {};
            return Promise.all(pxt.Util.values(this.deps).map(function (dep) {
                return dep.packageLocalizationStringsAsync(lang)
                    .then(function (depLoc) {
                    if (depLoc)
                        Object.keys(depLoc).forEach(function (k) {
                            if (!loc[k])
                                loc[k] = depLoc[k];
                        });
                });
            }))
                .then(function () {
                // Subcategories and groups are translated in their respective package, but are not really APIs so
                // there's no way for the translation to be saved with a block. To work around this, we copy the
                // translations to the editor translations.
                var strings = pxt.U.getLocalizedStrings();
                Object.keys(loc).forEach(function (l) {
                    if (pxt.U.startsWith(l, "{id:subcategory}") || pxt.U.startsWith(l, "{id:group}")) {
                        if (!strings[l]) {
                            strings[l] = loc[l];
                        }
                    }
                });
                pxt.U.setLocalizedStrings(strings);
                return Promise.resolve(loc);
            });
        };
        MainPackage.prototype.getTargetOptions = function () {
            var res = pxt.U.clone(pxt.appTarget.compile);
            pxt.U.assert(!!res);
            return res;
        };
        MainPackage.prototype.getJRes = function () {
            if (!this._jres) {
                this._jres = {};
                for (var _i = 0, _a = this.sortedDeps(); _i < _a.length; _i++) {
                    var pkg = _a[_i];
                    pkg.parseJRes(this._jres);
                }
                var palBuf = (pxt.appTarget.runtime && pxt.appTarget.runtime.palette ? pxt.appTarget.runtime.palette : ["#000000", "#ffffff"])
                    .map(function (s) { return ("000000" + parseInt(s.replace(/#/, ""), 16).toString(16)).slice(-6); })
                    .join("");
                this._jres["__palette"] = {
                    id: "__palette",
                    data: palBuf,
                    dataEncoding: "hex",
                    mimeType: "application/x-palette"
                };
            }
            return this._jres;
        };
        MainPackage.prototype.resolveBannedCategories = function () {
            var _this = this;
            if (this._resolvedBannedCategories !== undefined)
                return this._resolvedBannedCategories; // cache hit
            var bannedCategories = [];
            if (pxt.appTarget && pxt.appTarget.runtime
                && pxt.appTarget.runtime.bannedCategories
                && pxt.appTarget.runtime.bannedCategories.length) {
                bannedCategories = pxt.appTarget.runtime.bannedCategories.slice();
                // scan for unbanned categories
                Object.keys(this.deps)
                    .map(function (dep) { return _this.deps[dep]; })
                    .filter(function (dep) { return !!dep; })
                    .map(function (pk) { return pxt.Util.jsonTryParse(pk.readFile(pxt.CONFIG_NAME)); })
                    .filter(function (config) { return config && config.requiredCategories; })
                    .forEach(function (config) { return config.requiredCategories.forEach(function (rc) {
                    var i = bannedCategories.indexOf(rc);
                    if (i > -1)
                        bannedCategories.splice(i, 1);
                }); });
                this._resolvedBannedCategories = bannedCategories;
            }
            this._resolvedBannedCategories = bannedCategories;
            if (!this._resolvedBannedCategories.length)
                this._resolvedBannedCategories = null;
            return this._resolvedBannedCategories;
        };
        MainPackage.prototype.getCompileOptionsAsync = function (target) {
            var _this = this;
            if (target === void 0) { target = this.getTargetOptions(); }
            var opts = {
                sourceFiles: [],
                fileSystem: {},
                target: target,
                hexinfo: { hex: [] },
                name: this.config ? this.config.name : ""
            };
            var generateFile = function (fn, cont) {
                if (_this.config.files.indexOf(fn) < 0)
                    pxt.U.userError(lf("please add '{0}' to \"files\" in {1}", fn, pxt.CONFIG_NAME));
                cont = "// Auto-generated. Do not edit.\n" + cont + "\n// Auto-generated. Do not edit. Really.\n";
                if (_this.host().readFile(_this, fn, true) !== cont) {
                    pxt.debug("updating " + fn + " (size=" + cont.length + ")...");
                    _this.host().writeFile(_this, fn, cont, true);
                }
            };
            return this.loadAsync()
                .then(function () {
                opts.bannedCategories = _this.resolveBannedCategories();
                opts.target.preferredEditor = _this.getPreferredEditor();
                pxt.debug("building: " + _this.sortedDeps().map(function (p) { return p.config.name; }).join(", "));
                var ext = pxt.cpp.getExtensionInfo(_this);
                if (ext.shimsDTS)
                    generateFile("shims.d.ts", ext.shimsDTS);
                if (ext.enumsDTS)
                    generateFile("enums.d.ts", ext.enumsDTS);
                return (target.isNative
                    ? _this.host().getHexInfoAsync(ext)
                    : Promise.resolve(null))
                    .then(function (inf) {
                    ext = pxt.U.flatClone(ext);
                    if (!target.keepCppFiles) {
                        delete ext.compileData;
                        delete ext.generatedFiles;
                        delete ext.extensionFiles;
                    }
                    opts.extinfo = ext;
                    opts.hexinfo = inf;
                });
            })
                .then(function () {
                return pxt.appTarget.compile.shortPointers || pxt.appTarget.compile.nativeType == "vm" ||
                    _this.config.binaryonly || !opts.target.isNative ? null
                    : _this.filesToBePublishedAsync(true);
            })
                .then(function (files) {
                if (files) {
                    var headerString_1 = JSON.stringify({
                        name: _this.config.name,
                        comment: _this.config.description,
                        status: "unpublished",
                        scriptId: _this.config.installedVersion,
                        cloudId: pxt.CLOUD_ID + pxt.appTarget.id,
                        editor: _this.getPreferredEditor(),
                        targetVersions: pxt.appTarget.versions
                    });
                    var programText_1 = JSON.stringify(files);
                    return pxt.lzmaCompressAsync(headerString_1 + programText_1)
                        .then(function (buf) {
                        if (buf) {
                            opts.embedMeta = JSON.stringify({
                                compression: "LZMA",
                                headerSize: headerString_1.length,
                                textSize: programText_1.length,
                                name: _this.config.name,
                                eURL: pxt.appTarget.appTheme.embedUrl,
                                eVER: pxt.appTarget.versions ? pxt.appTarget.versions.target : "",
                                pxtTarget: pxt.appTarget.id,
                            });
                            opts.embedBlob = ts.pxtc.encodeBase64(pxt.U.uint8ArrayToString(buf));
                        }
                    });
                }
                else {
                    return Promise.resolve();
                }
            })
                .then(function () {
                for (var _i = 0, _a = _this.sortedDeps(); _i < _a.length; _i++) {
                    var pkg = _a[_i];
                    for (var _b = 0, _c = pkg.getFiles(); _b < _c.length; _b++) {
                        var f = _c[_b];
                        if (/\.(ts|asm|py)$/.test(f)) {
                            var sn = f;
                            if (pkg.level > 0)
                                sn = "pxt_modules/" + pkg.id + "/" + f;
                            opts.sourceFiles.push(sn);
                            opts.fileSystem[sn] = pkg.readFile(f);
                        }
                    }
                }
                opts.jres = _this.getJRes();
                var functionOpts = pxt.appTarget.runtime && pxt.appTarget.runtime.functionsOptions;
                opts.allowedArgumentTypes = functionOpts && functionOpts.extraFunctionEditorTypes && functionOpts.extraFunctionEditorTypes.map(function (info) { return info.typeName; }).concat("number", "boolean", "string");
                return opts;
            });
        };
        MainPackage.prototype.filesToBePublishedAsync = function (allowPrivate) {
            var _this = this;
            if (allowPrivate === void 0) { allowPrivate = false; }
            var files = {};
            return this.loadAsync()
                .then(function () {
                if (!allowPrivate && !_this.config.public)
                    pxt.U.userError('Only packages with "public":true can be published');
                var cfg = pxt.U.clone(_this.config);
                delete cfg.installedVersion;
                delete cfg.additionalFilePath;
                delete cfg.additionalFilePaths;
                if (!cfg.targetVersions)
                    cfg.targetVersions = pxt.appTarget.versions;
                pxt.U.iterMap(cfg.dependencies, function (k, v) {
                    if (!v || /^file:/.test(v) || /^workspace:/.test(v)) {
                        v = "*";
                        try {
                            var d = _this.resolveDep(k);
                            var gitjson = JSON.parse(d.readFile(pxt.github.GIT_JSON) || "{}");
                            if (gitjson.repo) {
                                var parsed = pxt.github.parseRepoId(gitjson.repo);
                                parsed.tag = gitjson.commit.tag || gitjson.commit.sha;
                                v = pxt.github.stringifyRepo(parsed);
                            }
                        }
                        catch (e) { }
                        cfg.dependencies[k] = v;
                    }
                });
                files[pxt.CONFIG_NAME] = JSON.stringify(cfg, null, 4);
                for (var _i = 0, _a = _this.getFiles(); _i < _a.length; _i++) {
                    var f = _a[_i];
                    // already stored
                    if (f == pxt.CONFIG_NAME)
                        continue;
                    var str = _this.readFile(f);
                    if (str == null)
                        pxt.U.userError("referenced file missing: " + f);
                    files[f] = str;
                }
                return pxt.U.sortObjectFields(files);
            });
        };
        MainPackage.prototype.saveToJsonAsync = function () {
            var _this = this;
            return this.filesToBePublishedAsync(true)
                .then(function (files) {
                var project = {
                    meta: {
                        cloudId: pxt.CLOUD_ID + pxt.appTarget.id,
                        targetVersions: pxt.appTarget.versions,
                        editor: _this.getPreferredEditor(),
                        name: _this.config.name
                    },
                    source: JSON.stringify(files, null, 2)
                };
                return project;
            });
        };
        MainPackage.prototype.compressToFileAsync = function () {
            return this.saveToJsonAsync()
                .then(function (project) { return pxt.lzmaCompressAsync(JSON.stringify(project, null, 2)); });
        };
        MainPackage.prototype.computePartDefinitions = function (parts) {
            if (!parts || !parts.length)
                return {};
            var res = {};
            this.sortedDeps().forEach(function (d) {
                var pjson = d.readFile("pxtparts.json");
                if (pjson) {
                    try {
                        var p_1 = JSON.parse(pjson);
                        Object.keys(p_1).forEach(function (k) {
                            if (parts.indexOf(k) >= 0) {
                                var part = res[k] = p_1[k];
                                if (typeof part.visual.image === "string" && /\.svg$/i.test(part.visual.image)) {
                                    var f = d.readFile(part.visual.image);
                                    if (!f)
                                        pxt.reportError("parts", "invalid part definition", { "error": "missing visual " + part.visual.image });
                                    part.visual.image = "data:image/svg+xml," + encodeURIComponent(f);
                                }
                            }
                        });
                    }
                    catch (e) {
                        pxt.reportError("parts", "invalid pxtparts.json file");
                    }
                }
            });
            return res;
        };
        return MainPackage;
    }(Package));
    pxt.MainPackage = MainPackage;
    function allPkgFiles(cfg) {
        return [pxt.CONFIG_NAME].concat(cfg.files || []).concat(cfg.testFiles || []);
    }
    pxt.allPkgFiles = allPkgFiles;
    function isPkgBeta(cfg) {
        return cfg && /\bbeta\b/.test(cfg.description);
    }
    pxt.isPkgBeta = isPkgBeta;
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var patching;
    (function (patching) {
        function computePatches(version, kind) {
            var patches = pxt.appTarget.compile ? pxt.appTarget.compile.patches : undefined;
            if (!patches)
                return undefined;
            var v = pxt.semver.tryParse(version || "0.0.0") || pxt.semver.tryParse("0.0.0");
            var r = [];
            Object.keys(patches)
                .filter(function (rng) { return pxt.semver.inRange(rng, v); })
                .forEach(function (rng) { return r = r.concat(patches[rng]); });
            if (kind)
                r = r.filter(function (p) { return p.type == kind; });
            return r.length ? r : undefined;
        }
        patching.computePatches = computePatches;
        function upgradePackageReference(pkgTargetVersion, pkg, val) {
            if (val != "*")
                return pkg;
            var upgrades = pxt.patching.computePatches(pkgTargetVersion, "package");
            var newPackage = pkg;
            if (upgrades) {
                upgrades.forEach(function (rule) {
                    Object.keys(rule.map).forEach(function (match) {
                        if (newPackage == match) {
                            newPackage = rule.map[match];
                        }
                    });
                });
            }
            return newPackage;
        }
        patching.upgradePackageReference = upgradePackageReference;
        function patchJavaScript(pkgTargetVersion, fileContents) {
            var upgrades = pxt.patching.computePatches(pkgTargetVersion);
            var updatedContents = fileContents;
            if (upgrades) {
                upgrades.filter(function (u) { return u.type === "api"; }).forEach(function (rule) {
                    Object.keys(rule.map).forEach(function (match) {
                        var regex = new RegExp(match, 'g');
                        updatedContents = updatedContents.replace(regex, rule.map[match]);
                    });
                });
                upgrades.filter(function (u) { return u.type === "userenum"; }).forEach(function (rule) {
                    Object.keys(rule.map).forEach(function (enumName) {
                        var declRegex = new RegExp("enum\\s+" + enumName + "\\s*{", 'gm');
                        updatedContents = updatedContents.replace(declRegex, "enum " + rule.map[enumName] + " {");
                        var usageRegex = new RegExp("(^|[^_a-zA-Z0-9])" + enumName + "(\\s*\\.)", 'g');
                        updatedContents = updatedContents.replace(usageRegex, "$1" + rule.map[enumName] + "$2");
                    });
                });
            }
            return updatedContents;
        }
        patching.patchJavaScript = patchJavaScript;
    })(patching = pxt.patching || (pxt.patching = {}));
})(pxt || (pxt = {}));
// see http://semver.org/
var pxt;
(function (pxt) {
    var semver;
    (function (semver) {
        function cmp(a, b) {
            if (!a)
                if (!b)
                    return 0;
                else
                    return 1;
            else if (!b)
                return -1;
            else {
                var d = a.major - b.major || a.minor - b.minor || a.patch - b.patch;
                if (d)
                    return d;
                if (a.pre.length == 0 && b.pre.length > 0)
                    return 1;
                if (a.pre.length > 0 && b.pre.length == 0)
                    return -1;
                for (var i = 0; i < a.pre.length + 1; ++i) {
                    var aa = a.pre[i];
                    var bb = b.pre[i];
                    if (!aa)
                        if (!bb)
                            return 0;
                        else
                            return -1;
                    else if (!bb)
                        return 1;
                    else if (/^\d+$/.test(aa))
                        if (/^\d+$/.test(bb)) {
                            d = parseInt(aa) - parseInt(bb);
                            if (d)
                                return d;
                        }
                        else
                            return -1;
                    else if (/^\d+$/.test(bb))
                        return 1;
                    else {
                        d = pxt.U.strcmp(aa, bb);
                        if (d)
                            return d;
                    }
                }
                return 0;
            }
        }
        semver.cmp = cmp;
        function parse(v) {
            var r = tryParse(v);
            if (!r)
                pxt.U.userError(pxt.U.lf("'{0}' doesn't look like a semantic version number", v));
            return r;
        }
        semver.parse = parse;
        function tryParse(v) {
            if ("*" === v) {
                return {
                    major: Number.MAX_SAFE_INTEGER,
                    minor: Number.MAX_SAFE_INTEGER,
                    patch: Number.MAX_SAFE_INTEGER,
                    pre: [],
                    build: []
                };
            }
            if (/^v\d/i.test(v))
                v = v.slice(1);
            var m = /^(\d+)\.(\d+)\.(\d+)(-([0-9a-zA-Z\-\.]+))?(\+([0-9a-zA-Z\-\.]+))?$/.exec(v);
            if (m)
                return {
                    major: parseInt(m[1]),
                    minor: parseInt(m[2]),
                    patch: parseInt(m[3]),
                    pre: m[5] ? m[5].split(".") : [],
                    build: m[7] ? m[7].split(".") : []
                };
            return null;
        }
        semver.tryParse = tryParse;
        function normalize(v) {
            return stringify(parse(v));
        }
        semver.normalize = normalize;
        function stringify(v) {
            var r = v.major + "." + v.minor + "." + v.patch;
            if (v.pre.length)
                r += "-" + v.pre.join(".");
            if (v.build.length)
                r += "+" + v.build.join(".");
            return r;
        }
        semver.stringify = stringify;
        function majorCmp(a, b) {
            var aa = tryParse(a);
            var bb = tryParse(b);
            return aa.major - bb.major;
        }
        semver.majorCmp = majorCmp;
        function strcmp(a, b) {
            var aa = tryParse(a);
            var bb = tryParse(b);
            if (!aa && !bb)
                return pxt.U.strcmp(a, b);
            else
                return cmp(aa, bb);
        }
        semver.strcmp = strcmp;
        function inRange(rng, v) {
            var rngs = rng.split(' - ');
            if (rngs.length != 2)
                return false;
            var minInclusive = tryParse(rngs[0]);
            var maxExclusive = tryParse(rngs[1]);
            if (!minInclusive || !maxExclusive)
                return false;
            if (!v)
                return true;
            var lwr = cmp(minInclusive, v);
            var hr = cmp(v, maxExclusive);
            return lwr <= 0 && hr < 0;
        }
        semver.inRange = inRange;
        /**
         * Filters and sort tags from latest to oldest (semver wize)
         * @param tags
         */
        function sortLatestTags(tags) {
            var v = tags.filter(function (tag) { return !!semver.tryParse(tag); });
            v.sort(strcmp);
            v.reverse();
            return v;
        }
        semver.sortLatestTags = sortLatestTags;
        function test() {
            console.log("Test semver");
            var d = [
                "0.9.0",
                "1.0.0-0.3.7",
                "1.0.0-alpha", "1.0.0-alpha.1",
                "1.0.0-alpha.beta", "1.0.0-beta",
                "1.0.0-beta.2", "1.0.0-beta.11",
                "1.0.0-rc.1",
                "1.0.0-x.7.z.92",
                "1.0.0",
                "1.0.1",
                "1.9.0", "1.10.0", "1.11.0"
            ];
            for (var i = 0; i < d.length; ++i) {
                var p = parse(d[i]);
                console.log(d[i], p);
                pxt.U.assert(stringify(p) == d[i]);
                for (var j = 0; j < d.length; ++j) {
                    var x = cmp(p, parse(d[j]));
                    console.log(d[i], d[j], x);
                    if (i < j)
                        pxt.U.assert(x < 0);
                    else if (i > j)
                        pxt.U.assert(x > 0);
                    else
                        pxt.U.assert(x == 0);
                }
            }
            var v = tryParse("1.2.3");
            pxt.U.assert(inRange("0.1.2 - 2.2.3", v));
            pxt.U.assert(inRange("1.2.3 - 2.2.3", v));
            pxt.U.assert(!inRange("0.0.0 - 1.2.3", v));
            pxt.U.assert(!inRange("1.2.4 - 4.2.3", v));
            pxt.U.assert(!inRange("0.0.0 - 0.0.1", v));
        }
        semver.test = test;
    })(semver = pxt.semver || (pxt.semver = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtarget.d.ts"/>
/// <reference path="../localtypings/pxtpackage.d.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.assert = pxtc.Util.assert;
        pxtc.oops = pxtc.Util.oops;
        pxtc.U = pxtc.Util;
        pxtc.ON_START_TYPE = "pxt-on-start";
        pxtc.ON_START_COMMENT = "on start"; // TODO: Localize? (adding lf doesn't work because this is run before translations are downloaded)
        pxtc.HANDLER_COMMENT = "code goes here"; // TODO: Localize? (adding lf doesn't work because this is run before translations are downloaded)
        pxtc.TS_STATEMENT_TYPE = "typescript_statement";
        pxtc.TS_DEBUGGER_TYPE = "debugger_keyword";
        pxtc.TS_BREAK_TYPE = "break_keyword";
        pxtc.TS_CONTINUE_TYPE = "continue_keyword";
        pxtc.TS_OUTPUT_TYPE = "typescript_expression";
        pxtc.PAUSE_UNTIL_TYPE = "pxt_pause_until";
        pxtc.COLLAPSED_BLOCK = "pxt_collapsed_block";
        pxtc.BINARY_JS = "binary.js";
        pxtc.BINARY_ASM = "binary.asm";
        pxtc.BINARY_HEX = "binary.hex";
        pxtc.BINARY_UF2 = "binary.uf2";
        pxtc.BINARY_ELF = "binary.elf";
        pxtc.BINARY_PXT64 = "binary.pxt64";
        pxtc.NATIVE_TYPE_THUMB = "thumb";
        pxtc.NATIVE_TYPE_VM = "vm";
        function computeUsedParts(resp, ignoreBuiltin) {
            if (ignoreBuiltin === void 0) { ignoreBuiltin = false; }
            if (!resp.usedSymbols || !pxt.appTarget.simulator || !pxt.appTarget.simulator.parts)
                return [];
            var parts = [];
            Object.keys(resp.usedSymbols).forEach(function (symbol) {
                var info = resp.usedSymbols[symbol];
                if (info && info.attributes.parts) {
                    var partsRaw = info.attributes.parts;
                    if (partsRaw) {
                        var partsSplit = partsRaw.split(/[ ,]+/);
                        partsSplit.forEach(function (p) {
                            if (0 < p.length && parts.indexOf(p) < 0) {
                                parts.push(p);
                            }
                        });
                    }
                }
            });
            if (ignoreBuiltin) {
                var builtinParts_1 = pxt.appTarget.simulator.boardDefinition.onboardComponents;
                if (builtinParts_1)
                    parts = parts.filter(function (p) { return builtinParts_1.indexOf(p) < 0; });
            }
            //sort parts (so breadboarding layout is stable w.r.t. code ordering)
            parts.sort();
            parts = parts.reverse(); //not strictly necessary, but it's a little
            // nicer for demos to have "ledmatrix"
            // before "buttonpair"
            return parts;
        }
        pxtc.computeUsedParts = computeUsedParts;
        /**
         * Unlocalized category name for a symbol
         */
        function blocksCategory(si) {
            var n = !si ? undefined : (si.attributes.blockNamespace || si.namespace);
            return n ? pxtc.Util.capitalize(n.split('.')[0]) : undefined;
        }
        pxtc.blocksCategory = blocksCategory;
        function getBlocksInfo(info, categoryFilters) {
            var blocks = [];
            var combinedSet = {};
            var combinedGet = {};
            var combinedChange = {};
            var enumsByName = {};
            var kindsByName = {};
            function addCombined(rtp, s) {
                var isGet = rtp == "get";
                var isSet = rtp == "set";
                var isNumberType = s.retType == "number";
                var m = isGet ? combinedGet : (isSet ? combinedSet : combinedChange);
                var mkey = s.namespace + "." + s.retType;
                var ex = pxtc.U.lookup(m, mkey);
                if (!ex) {
                    var tp = "@" + rtp + "@";
                    var paramNameShadow = void 0, paramValueShadow = void 0;
                    if (s.attributes.blockCombineShadow) {
                        // allowable %blockCombineShadow strings:-
                        //   '{name shadow},' or '{value shadow}' or ',{value shadow}' or '{name shadow},{value shadow}'
                        var attribute = s.attributes.blockCombineShadow;
                        var match = attribute.match(/^([^,.]*),?([^,.]*)$/);
                        if (match && match.length == 3) {
                            paramNameShadow = match[1].trim();
                            paramValueShadow = match[2].trim();
                            if (paramValueShadow.length == 0 && !pxtc.Util.endsWith(attribute, ",")) {
                                paramValueShadow = paramNameShadow;
                                paramNameShadow = "";
                            }
                        }
                    }
                    var varName = s.attributes.blockSetVariable || s.namespace.toLocaleLowerCase();
                    var paramName = varName + "=" + (paramNameShadow || "");
                    var paramValue = "value=" + (paramValueShadow || "");
                    ex = m[mkey] = {
                        attributes: {
                            blockId: (isNumberType ? s.namespace : mkey) + "_blockCombine_" + rtp,
                            callingConvention: 0 /* Plain */,
                            group: s.attributes.group,
                            paramDefl: {},
                            jsDoc: isGet
                                ? pxtc.U.lf("Read value of a property on an object")
                                : pxtc.U.lf("Update value of property on an object")
                        },
                        name: tp,
                        namespace: s.namespace,
                        fileName: s.fileName,
                        qName: mkey + "." + tp,
                        pkg: s.pkg,
                        kind: 2 /* Property */,
                        parameters: [
                            {
                                name: "property",
                                description: isGet ?
                                    pxtc.U.lf("the name of the property to read") :
                                    pxtc.U.lf("the name of the property to change"),
                                isEnum: true,
                                type: "@combined@"
                            },
                            {
                                name: "value",
                                description: isSet ?
                                    pxtc.U.lf("the new value of the property") :
                                    pxtc.U.lf("the amount by which to change the property"),
                                type: s.retType,
                            }
                        ].slice(0, isGet ? 1 : 2),
                        retType: isGet ? s.retType : "void",
                        combinedProperties: []
                    };
                    ex.attributes.block =
                        isGet ? "%" + paramName + " %property" :
                            isSet ? "set %" + paramName + " %property to %" + paramValue :
                                "change %" + paramName + " %property by %" + paramValue;
                    updateBlockDef(ex.attributes);
                    blocks.push(ex);
                }
                ex.combinedProperties.push(s.qName);
            }
            for (var _i = 0, _a = pxtc.Util.values(info.byQName); _i < _a.length; _i++) {
                var s = _a[_i];
                if (s.attributes.shim === "ENUM_GET" && s.attributes.enumName && s.attributes.blockId) {
                    var didFail = false;
                    if (enumsByName[s.attributes.enumName]) {
                        console.warn("Enum block " + s.attributes.blockId + " trying to overwrite enum " + s.attributes.enumName);
                        didFail = true;
                    }
                    if (!s.attributes.enumMemberName) {
                        console.warn("Enum block " + s.attributes.blockId + " should specify enumMemberName");
                        didFail = true;
                    }
                    if (!s.attributes.enumPromptHint) {
                        console.warn("Enum block " + s.attributes.blockId + " should specify enumPromptHint");
                        didFail = true;
                    }
                    if (!s.attributes.enumInitialMembers || !s.attributes.enumInitialMembers.length) {
                        console.warn("Enum block " + s.attributes.blockId + " should specify enumInitialMembers");
                        didFail = true;
                    }
                    if (didFail) {
                        continue;
                    }
                    var firstValue = parseInt(s.attributes.enumStartValue);
                    enumsByName[s.attributes.enumName] = {
                        blockId: s.attributes.blockId,
                        name: s.attributes.enumName,
                        memberName: s.attributes.enumMemberName,
                        firstValue: isNaN(firstValue) ? undefined : firstValue,
                        isBitMask: s.attributes.enumIsBitMask,
                        isHash: s.attributes.enumIsHash,
                        initialMembers: s.attributes.enumInitialMembers,
                        promptHint: s.attributes.enumPromptHint
                    };
                }
                if (s.attributes.shim === "KIND_GET" && s.attributes.blockId) {
                    var kindNamespace = s.attributes.kindNamespace || s.attributes.blockNamespace || s.namespace;
                    if (kindsByName[kindNamespace]) {
                        console.warn("More than one block defined for kind " + kindNamespace);
                        continue;
                    }
                    var initialMembers = [];
                    if (info.byQName[kindNamespace]) {
                        for (var _b = 0, _c = pxtc.Util.values(info.byQName); _b < _c.length; _b++) {
                            var api = _c[_b];
                            if (api.namespace === kindNamespace && api.attributes.isKind) {
                                initialMembers.push(api.name);
                            }
                        }
                    }
                    kindsByName[kindNamespace] = {
                        blockId: s.attributes.blockId,
                        name: kindNamespace,
                        memberName: s.attributes.kindMemberName || kindNamespace,
                        initialMembers: initialMembers,
                        promptHint: s.attributes.enumPromptHint || pxtc.Util.lf("Create a new kind..."),
                        createFunctionName: s.attributes.kindCreateFunction || "create"
                    };
                }
                if (s.attributes.blockCombine) {
                    if (!/@set/.test(s.name)) {
                        addCombined("get", s);
                    }
                    if (!s.isReadOnly) {
                        if (s.retType == 'number') {
                            addCombined("change", s);
                        }
                        addCombined("set", s);
                    }
                }
                else if (!!s.attributes.block
                    && !s.attributes.fixedInstance
                    && s.kind != 7 /* EnumMember */
                    && s.kind != 5 /* Module */
                    && s.kind != 9 /* Interface */
                    && s.kind != 8 /* Class */) {
                    if (!s.attributes.blockId)
                        s.attributes.blockId = s.qName.replace(/\./g, "_");
                    if (s.attributes.block == "true") {
                        var b = pxtc.U.uncapitalize(s.name);
                        if (s.kind == 1 /* Method */ || s.kind == 2 /* Property */) {
                            b += " %" + s.namespace.toLowerCase();
                        }
                        for (var _d = 0, _e = s.parameters || []; _d < _e.length; _d++) {
                            var p = _e[_d];
                            b += " %" + p.name;
                        }
                        s.attributes.block = b;
                        updateBlockDef(s.attributes);
                    }
                    blocks.push(s);
                }
            }
            // derive common block properties from namespace
            for (var _f = 0, blocks_1 = blocks; _f < blocks_1.length; _f++) {
                var b = blocks_1[_f];
                var parent_2 = pxtc.U.lookup(info.byQName, b.namespace);
                if (!parent_2)
                    continue;
                var pattr = parent_2.attributes;
                var battr = b.attributes;
                for (var _g = 0, _h = ["blockNamespace", "color", "blockGap"]; _g < _h.length; _g++) {
                    var n = _h[_g];
                    if (battr[n] === undefined && pattr[n])
                        battr[n] = pattr[n];
                }
            }
            if (categoryFilters)
                filterCategories(categoryFilters);
            return {
                apis: info,
                blocks: blocks,
                blocksById: pxt.Util.toDictionary(blocks, function (b) { return b.attributes.blockId; }),
                enumsByName: enumsByName,
                kindsByName: kindsByName
            };
            function filterCategories(banned) {
                if (banned.length) {
                    blocks = blocks.filter(function (b) {
                        var ns = (b.attributes.blockNamespace || b.namespace).split('.')[0];
                        return banned.indexOf(ns) === -1;
                    });
                }
            }
        }
        pxtc.getBlocksInfo = getBlocksInfo;
        pxtc.apiLocalizationStrings = {};
        function localizeApisAsync(apis, mainPkg) {
            var lang = pxtc.Util.userLanguage();
            if (pxtc.Util.userLanguage() == "en")
                return Promise.resolve(apis);
            var errors = {};
            return mainPkg.localizationStringsAsync(lang)
                .then(function (loc) { return pxtc.Util.values(apis.byQName).forEach(function (fn) {
                if (pxtc.apiLocalizationStrings)
                    pxtc.Util.jsonMergeFrom(loc, pxtc.apiLocalizationStrings);
                var jsDoc = loc[fn.qName];
                if (jsDoc) {
                    fn.attributes.jsDoc = jsDoc;
                    if (fn.parameters)
                        fn.parameters.forEach(function (pi) { return pi.description = loc[fn.qName + "|param|" + pi.name] || pi.description; });
                }
                var nsDoc = loc['{id:category}' + pxtc.Util.capitalize(fn.qName)];
                var locBlock = loc[fn.qName + "|block"];
                if (!locBlock && fn.attributes.useLoc) {
                    var otherFn = apis.byQName[fn.attributes.useLoc];
                    if (otherFn) {
                        var otherTranslation = loc[otherFn.qName + "|block"];
                        var isSameBlockDef = fn.attributes.block === (otherFn.attributes._untranslatedBlock || otherFn.attributes.block);
                        if (isSameBlockDef && !!otherTranslation) {
                            locBlock = otherTranslation;
                        }
                    }
                }
                if (nsDoc) {
                    // Check for "friendly namespace"
                    if (fn.attributes.block) {
                        fn.attributes.block = locBlock || fn.attributes.block;
                    }
                    else {
                        fn.attributes.block = nsDoc;
                    }
                }
                else if (fn.attributes.block && locBlock) {
                    var ps = pxt.blocks.compileInfo(fn);
                    var oldBlock = fn.attributes.block;
                    fn.attributes.block = pxt.blocks.normalizeBlock(locBlock, function (err) { return errors[fn.attributes.blockId + "." + lang] = 1; });
                    fn.attributes._untranslatedBlock = oldBlock;
                    if (oldBlock != fn.attributes.block) {
                        var locps = pxt.blocks.compileInfo(fn);
                        if (JSON.stringify(ps) != JSON.stringify(locps)) {
                            pxt.log("block has non matching arguments: " + oldBlock + " vs " + fn.attributes.block);
                            fn.attributes.block = oldBlock;
                        }
                    }
                }
                updateBlockDef(fn.attributes);
            }); })
                .then(function () { return apis; })
                .finally(function () {
                if (Object.keys(errors).length)
                    pxt.reportError("loc.errors", "invalid translation", errors);
            });
        }
        pxtc.localizeApisAsync = localizeApisAsync;
        function emptyExtInfo() {
            var cs = pxt.appTarget.compileService;
            if (!cs)
                cs = {};
            var pio = !!cs.platformioIni;
            var docker = cs.buildEngine == "dockermake" || cs.buildEngine == "dockercross";
            var r = {
                functions: [],
                generatedFiles: {},
                extensionFiles: {},
                sha: "",
                compileData: "",
                shimsDTS: "",
                enumsDTS: "",
                onlyPublic: true
            };
            if (pio)
                r.platformio = { dependencies: {} };
            else if (docker)
                r.npmDependencies = {};
            else
                r.yotta = { config: {}, dependencies: {} };
            return r;
        }
        pxtc.emptyExtInfo = emptyExtInfo;
        var numberAttributes = ["weight", "imageLiteral", "topblockWeight"];
        var booleanAttributes = [
            "advanced",
            "handlerStatement",
            "afterOnStart",
            "optionalVariableArgs",
            "blockHidden",
            "constantShim",
            "blockCombine",
            "enumIsBitMask",
            "enumIsHash",
            "decompileIndirectFixedInstances",
            "topblock",
            "callInDebugger",
            "duplicateShadowOnDrag",
            "argsNullable"
        ];
        function parseCommentString(cmt) {
            var res = {
                paramDefl: {},
                callingConvention: 0 /* Plain */,
                _source: cmt
            };
            var didSomething = true;
            while (didSomething) {
                didSomething = false;
                cmt = cmt.replace(/\/\/%[ \t]*([\w\.]+)(=(("[^"\n]*")|'([^'\n]*)'|([^\s]*)))?/, function (f, n, d0, d1, v0, v1, v2) {
                    var v = v0 ? JSON.parse(v0) : (d0 ? (v0 || v1 || v2) : "true");
                    if (!v)
                        v = "";
                    if (pxtc.U.endsWith(n, ".defl")) {
                        if (v.indexOf(" ") > -1) {
                            res.paramDefl[n.slice(0, n.length - 5)] = "\"" + v + "\"";
                        }
                        else {
                            res.paramDefl[n.slice(0, n.length - 5)] = v;
                        }
                        if (!res.explicitDefaults)
                            res.explicitDefaults = [];
                        res.explicitDefaults.push(n.slice(0, n.length - 5));
                    }
                    else if (pxtc.U.endsWith(n, ".shadow")) {
                        if (!res._shadowOverrides)
                            res._shadowOverrides = {};
                        res._shadowOverrides[n.slice(0, n.length - 7)] = v;
                    }
                    else if (pxtc.U.endsWith(n, ".fieldEditor")) {
                        if (!res.paramFieldEditor)
                            res.paramFieldEditor = {};
                        res.paramFieldEditor[n.slice(0, n.length - 12)] = v;
                    }
                    else if (pxtc.U.contains(n, ".fieldOptions.")) {
                        if (!res.paramFieldEditorOptions)
                            res.paramFieldEditorOptions = {};
                        var field = n.slice(0, n.indexOf('.fieldOptions.'));
                        var key = n.slice(n.indexOf('.fieldOptions.') + 14, n.length);
                        if (!res.paramFieldEditorOptions[field])
                            res.paramFieldEditorOptions[field] = {};
                        res.paramFieldEditorOptions[field][key] = v;
                    }
                    else if (pxtc.U.contains(n, ".shadowOptions.")) {
                        if (!res.paramShadowOptions)
                            res.paramShadowOptions = {};
                        var field = n.slice(0, n.indexOf('.shadowOptions.'));
                        var key = n.slice(n.indexOf('.shadowOptions.') + 15, n.length);
                        if (!res.paramShadowOptions[field])
                            res.paramShadowOptions[field] = {};
                        res.paramShadowOptions[field][key] = v;
                    }
                    else if (pxtc.U.endsWith(n, ".min")) {
                        if (!res.paramMin)
                            res.paramMin = {};
                        res.paramMin[n.slice(0, n.length - 4)] = v;
                    }
                    else if (pxtc.U.endsWith(n, ".max")) {
                        if (!res.paramMax)
                            res.paramMax = {};
                        res.paramMax[n.slice(0, n.length - 4)] = v;
                    }
                    else {
                        res[n] = v;
                    }
                    didSomething = true;
                    return "//% ";
                });
            }
            for (var _i = 0, numberAttributes_1 = numberAttributes; _i < numberAttributes_1.length; _i++) {
                var n = numberAttributes_1[_i];
                if (typeof res[n] == "string")
                    res[n] = parseInt(res[n]);
            }
            for (var _a = 0, booleanAttributes_1 = booleanAttributes; _a < booleanAttributes_1.length; _a++) {
                var n = booleanAttributes_1[_a];
                if (typeof res[n] == "string")
                    res[n] = res[n] == 'true' || res[n] == '1' ? true : false;
            }
            if (res.trackArgs) {
                res.trackArgs = res.trackArgs.split(/[ ,]+/).map(function (s) { return parseInt(s) || 0; });
            }
            if (res.enumInitialMembers) {
                res.enumInitialMembers = res.enumInitialMembers.split(/[ ,]+/);
            }
            if (res.blockExternalInputs && !res.inlineInputMode) {
                res.inlineInputMode = "external";
            }
            res.paramHelp = {};
            res.jsDoc = "";
            cmt = cmt.replace(/\/\*\*([^]*?)\*\//g, function (full, doccmt) {
                doccmt = doccmt.replace(/\n\s*(\*\s*)?/g, "\n");
                doccmt = doccmt.replace(/^\s*@param\s+(\w+)\s+(.*)$/mg, function (full, name, desc) {
                    res.paramHelp[name] = desc;
                    if (!res.paramDefl[name]) {
                        // these don't add to res.explicitDefaults
                        var m = /\beg\.?:\s*(.+)/.exec(desc);
                        if (m && m[1]) {
                            var defaultValue = /(?:"([^"]*)")|(?:'([^']*)')|(?:([^\s,]+))/g.exec(m[1]);
                            if (defaultValue) {
                                var val = defaultValue[1] || defaultValue[2] || defaultValue[3];
                                if (!val)
                                    val = "";
                                // If there are spaces in the value, it means the value was surrounded with quotes, so add them back
                                if (val.indexOf(" ") > -1) {
                                    res.paramDefl[name] = "\"" + val + "\"";
                                }
                                else {
                                    res.paramDefl[name] = val;
                                }
                            }
                        }
                    }
                    return "";
                });
                res.jsDoc += doccmt;
                return "";
            });
            res.jsDoc = res.jsDoc.trim();
            if (res.async)
                res.callingConvention = 1 /* Async */;
            if (res.promise)
                res.callingConvention = 2 /* Promise */;
            if (res.jres)
                res.whenUsed = true;
            if (res.subcategories) {
                try {
                    res.subcategories = JSON.parse(res.subcategories);
                }
                catch (e) {
                    res.subcategories = undefined;
                }
            }
            if (res.groups) {
                try {
                    res.groups = JSON.parse(res.groups);
                }
                catch (e) {
                    res.groups = undefined;
                }
            }
            if (res.groupIcons) {
                try {
                    res.groupIcons = JSON.parse(res.groupIcons);
                }
                catch (e) {
                    res.groupIcons = undefined;
                }
            }
            if (res.groupHelp) {
                try {
                    res.groupHelp = JSON.parse(res.groupHelp);
                }
                catch (e) {
                    res.groupHelp = undefined;
                }
            }
            updateBlockDef(res);
            return res;
        }
        pxtc.parseCommentString = parseCommentString;
        function updateBlockDef(attrs) {
            if (attrs.block) {
                var parts = attrs.block.split("||");
                attrs._def = applyOverrides(parseBlockDefinition(parts[0]));
                if (!attrs._def)
                    pxt.debug("Unable to parse block def for id: " + attrs.blockId);
                if (parts[1])
                    attrs._expandedDef = applyOverrides(parseBlockDefinition(parts[1]));
                if (parts[1] && !attrs._expandedDef)
                    pxt.debug("Unable to parse expanded block def for id: " + attrs.blockId);
            }
            function applyOverrides(def) {
                if (attrs._shadowOverrides) {
                    def.parameters.forEach(function (p) {
                        var shadow = attrs._shadowOverrides[p.name];
                        if (shadow === "unset")
                            delete p.shadowBlockId;
                        else if (shadow != null)
                            p.shadowBlockId = shadow;
                    });
                }
                return def;
            }
        }
        pxtc.updateBlockDef = updateBlockDef;
        function parseBlockDefinition(def) {
            var tokens = [];
            var currentWord;
            var strIndex = 0;
            var _loop_6 = function () {
                var char = def[strIndex];
                var restoreIndex = strIndex;
                var newToken = void 0;
                switch (char) {
                    case "*":
                    case "_":
                        var tk = eatToken(function (c) { return c == char; });
                        var offset = char === "_" ? 2 : 0;
                        if (tk.length === 1)
                            newToken = { kind: 1 /* SingleAsterisk */ << offset, content: tk };
                        else if (tk.length === 2)
                            newToken = { kind: 2 /* DoubleAsterisk */ << offset, content: tk };
                        else if (tk.length === 3)
                            newToken = { kind: 3 /* TripleAsterisk */ << offset, content: tk };
                        else
                            strIndex = restoreIndex; // error: no more than three style marks
                        break;
                    case "`":
                        var image = eatEnclosure("`");
                        if (image === undefined) {
                            strIndex = restoreIndex; // error: not terminated
                            break;
                        }
                        newToken = { kind: 256 /* Image */, content: image };
                        break;
                    case "|":
                        newToken = { kind: 32 /* Pipe */ };
                        break;
                    case "\\":
                        if (strIndex < (def.length - 1))
                            newToken = { kind: 16 /* Escape */, content: def[1 + (strIndex++)] };
                        break;
                    case "[":
                        var contentText = eatEnclosure("]");
                        if (contentText !== undefined && def[strIndex++ + 1] === "(") {
                            var contentClass = eatEnclosure(")");
                            if (contentClass !== undefined) {
                                newToken = { kind: 512 /* TaggedText */, content: contentText, type: contentClass };
                                break;
                            }
                        }
                        strIndex = restoreIndex; // error: format should be [text](class)
                        break;
                    case "$":
                    case "%":
                        var param = eatToken(function (c) { return /[a-zA-Z0-9_=]/.test(c); }, true).split("=");
                        if (param.length > 2) {
                            strIndex = restoreIndex; // error: too many equals signs
                            break;
                        }
                        var varName = void 0;
                        if (def[strIndex + 1] === "(") {
                            var oldIndex = strIndex;
                            ++strIndex;
                            varName = eatEnclosure(")");
                            if (!varName)
                                strIndex = oldIndex;
                        }
                        newToken = { kind: (char === "$") ? 1024 /* ParamRef */ : 64 /* Parameter */, content: param[0], type: param[1], name: varName };
                        break;
                }
                if (newToken) {
                    if (currentWord)
                        tokens.push({ kind: 128 /* Word */, content: currentWord });
                    currentWord = undefined;
                    tokens.push(newToken);
                }
                else if (!currentWord) {
                    currentWord = char;
                }
                else {
                    currentWord += char;
                }
            };
            for (; strIndex < def.length; strIndex++) {
                _loop_6();
            }
            if (currentWord)
                tokens.push({ kind: 128 /* Word */, content: currentWord });
            var parts = [];
            var parameters = [];
            var stack = [];
            var open = 0;
            var currentLabel = "";
            var labelStack = [];
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i].kind;
                var top_2 = stack[stack.length - 1];
                if (token & 15 /* StyleMarks */) {
                    pushCurrentLabel(tokens[i].content);
                    if (token & open) {
                        if (top_2 & token) {
                            stack.pop();
                            open ^= token;
                            // Handle triple tokens
                            var remainder = (top_2 & open) | (token & open);
                            if (remainder) {
                                stack.push(remainder);
                            }
                        }
                        else {
                            // We encountered a mismatched mark, so clear previous styles
                            collapseLabels();
                        }
                    }
                    else {
                        open |= token;
                        stack.push(token);
                    }
                }
                else if (token & 144 /* Text */) {
                    currentLabel += tokens[i].content;
                }
                else if (token & 1120 /* Unstylable */) {
                    pushLabels();
                }
                /* tslint:disable:possible-timing-attack  (tslint thinks all variables named token are passwords...) */
                if (token == 64 /* Parameter */) {
                    var param = { kind: "param", name: tokens[i].content, shadowBlockId: tokens[i].type, ref: false };
                    if (tokens[i].name)
                        param.varName = tokens[i].name;
                    parts.push(param);
                    parameters.push(param);
                }
                else if (token == 1024 /* ParamRef */) {
                    var param = { kind: "param", name: tokens[i].content, shadowBlockId: tokens[i].type, ref: true };
                    if (tokens[i].name)
                        param.varName = tokens[i].name;
                    parts.push(param);
                    parameters.push(param);
                }
                else if (token == 256 /* Image */) {
                    pushCurrentLabel();
                    labelStack.push({ kind: "image", uri: tokens[i].content });
                }
                else if (token == 512 /* TaggedText */) {
                    pushCurrentLabel();
                    labelStack.push({ kind: "label", text: tokens[i].content, cssClass: tokens[i].type });
                }
                else if (token == 32 /* Pipe */) {
                    parts.push({ kind: "break" });
                }
                /* tslint:enable:possible-timing-attack */
            }
            pushLabels();
            return { parts: parts, parameters: parameters };
            function eatToken(pred, skipCurrent) {
                if (skipCurrent === void 0) { skipCurrent = false; }
                var current = "";
                if (skipCurrent)
                    strIndex++;
                while (strIndex < def.length && pred(def[strIndex])) {
                    current += def[strIndex];
                    ++strIndex;
                }
                if (current)
                    strIndex--;
                return current;
            }
            function eatEnclosure(endMark) {
                var content = eatToken(function (c) { return c !== endMark; }, true);
                if (def[strIndex + 1] !== endMark)
                    return undefined;
                ++strIndex;
                return content;
            }
            function collapseLabels() {
                var combined = "";
                var newStack = [];
                for (var _i = 0, labelStack_1 = labelStack; _i < labelStack_1.length; _i++) {
                    var item = labelStack_1[_i];
                    if (isBlockPart(item)) {
                        newStack.push({
                            content: combined,
                            styles: 0
                        });
                        newStack.push(item);
                        combined = "";
                    }
                    else {
                        combined += item.content;
                        if (item.endingToken) {
                            combined += item.endingToken;
                        }
                    }
                }
                labelStack = newStack;
                if (combined) {
                    labelStack.push({
                        content: combined,
                        styles: 0
                    });
                }
                // Clear the style state as well
                stack = [];
                open = 0;
            }
            function pushLabels() {
                pushCurrentLabel();
                if (open) {
                    collapseLabels();
                }
                while (labelStack.length) {
                    var label = labelStack.shift();
                    if (isBlockPart(label)) {
                        parts.push(label);
                    }
                    else {
                        if (!label.content)
                            continue;
                        var styles = [];
                        if (label.styles & 10 /* Bold */)
                            styles.push("bold");
                        if (label.styles & 5 /* Italics */)
                            styles.push("italics");
                        parts.push({ kind: "label", text: label.content, style: styles });
                    }
                }
            }
            function pushCurrentLabel(endingToken) {
                labelStack.push({
                    content: currentLabel,
                    styles: open,
                    endingToken: endingToken
                });
                currentLabel = "";
            }
        }
        pxtc.parseBlockDefinition = parseBlockDefinition;
        function isBlockPart(p) {
            return !!(p.kind);
        }
        // TODO should be internal
        var hex;
        (function (hex) {
            function isSetupFor(extInfo) {
                return hex.currentSetup == extInfo.sha;
            }
            hex.isSetupFor = isSetupFor;
            hex.currentSetup = null;
            function parseChecksumBlock(buf, pos) {
                if (pos === void 0) { pos = 0; }
                var magic = pxt.HF2.read32(buf, pos);
                if ((magic & 0x7fffffff) != 0x07eeb07c) {
                    pxt.log("no checksum block magic");
                    return null;
                }
                var endMarkerPos = pxt.HF2.read32(buf, pos + 4);
                var endMarker = pxt.HF2.read32(buf, pos + 8);
                if (endMarkerPos & 3) {
                    pxt.log("invalid end marker position");
                    return null;
                }
                var pageSize = 1 << (endMarker & 0xff);
                if (pageSize != pxt.appTarget.compile.flashCodeAlign) {
                    pxt.log("invalid page size: " + pageSize);
                    return null;
                }
                var blk = {
                    magic: magic,
                    endMarkerPos: endMarkerPos,
                    endMarker: endMarker,
                    regions: []
                };
                for (var i = pos + 12; i < buf.length - 7; i += 8) {
                    var r = {
                        start: pageSize * pxt.HF2.read16(buf, i),
                        length: pageSize * pxt.HF2.read16(buf, i + 2),
                        checksum: pxt.HF2.read32(buf, i + 4)
                    };
                    if (r.length && r.checksum) {
                        blk.regions.push(r);
                    }
                    else {
                        break;
                    }
                }
                //console.log(hexDump(buf), blk)
                return blk;
            }
            hex.parseChecksumBlock = parseChecksumBlock;
        })(hex = pxtc.hex || (pxtc.hex = {}));
        var UF2;
        (function (UF2) {
            UF2.UF2_MAGIC_START0 = 0x0A324655; // "UF2\n"
            UF2.UF2_MAGIC_START1 = 0x9E5D5157; // Randomly selected
            UF2.UF2_MAGIC_END = 0x0AB16F30; // Ditto
            UF2.UF2_FLAG_NONE = 0x00000000;
            UF2.UF2_FLAG_NOFLASH = 0x00000001;
            UF2.UF2_FLAG_FILE = 0x00001000;
            UF2.UF2_FLAG_FAMILY_ID_PRESENT = 0x00002000;
            function parseBlock(block) {
                var wordAt = function (k) {
                    return (block[k] + (block[k + 1] << 8) + (block[k + 2] << 16) + (block[k + 3] << 24)) >>> 0;
                };
                if (!block || block.length != 512 ||
                    wordAt(0) != UF2.UF2_MAGIC_START0 || wordAt(4) != UF2.UF2_MAGIC_START1 ||
                    wordAt(block.length - 4) != UF2.UF2_MAGIC_END)
                    return null;
                var flags = wordAt(8);
                var payloadSize = wordAt(16);
                if (payloadSize > 476)
                    payloadSize = 256;
                var filename = null;
                var familyId = 0;
                var fileSize = 0;
                if (flags & UF2.UF2_FLAG_FILE) {
                    var fnbuf = block.slice(32 + payloadSize);
                    var len = fnbuf.indexOf(0);
                    if (len >= 0) {
                        fnbuf = fnbuf.slice(0, len);
                    }
                    filename = pxtc.U.fromUTF8(pxtc.U.uint8ArrayToString(fnbuf));
                    fileSize = wordAt(28);
                }
                if (flags & UF2.UF2_FLAG_FAMILY_ID_PRESENT) {
                    familyId = wordAt(28);
                }
                return {
                    flags: flags,
                    targetAddr: wordAt(12),
                    payloadSize: payloadSize,
                    blockNo: wordAt(20),
                    numBlocks: wordAt(24),
                    fileSize: fileSize,
                    familyId: familyId,
                    data: block.slice(32, 32 + payloadSize),
                    filename: filename
                };
            }
            UF2.parseBlock = parseBlock;
            function parseFile(blocks) {
                var r = [];
                for (var i = 0; i < blocks.length; i += 512) {
                    var b = parseBlock(blocks.slice(i, i + 512));
                    if (b)
                        r.push(b);
                }
                return r;
            }
            UF2.parseFile = parseFile;
            function toBin(blocks, endAddr) {
                if (endAddr === void 0) { endAddr = undefined; }
                if (blocks.length < 512)
                    return null;
                var curraddr = -1;
                var appstartaddr = -1;
                var bufs = [];
                for (var i = 0; i < blocks.length; ++i) {
                    var ptr = i * 512;
                    var bl = parseBlock(blocks.slice(ptr, ptr + 512));
                    if (!bl)
                        continue;
                    if (endAddr && bl.targetAddr + 256 > endAddr)
                        break;
                    if (curraddr == -1) {
                        curraddr = bl.targetAddr;
                        appstartaddr = curraddr;
                    }
                    var padding = bl.targetAddr - curraddr;
                    if (padding < 0 || padding % 4 || padding > 1024 * 1024)
                        continue;
                    if (padding > 0)
                        bufs.push(new Uint8Array(padding));
                    bufs.push(blocks.slice(ptr + 32, ptr + 32 + bl.payloadSize));
                    curraddr = bl.targetAddr + bl.payloadSize;
                }
                var len = 0;
                for (var _i = 0, bufs_1 = bufs; _i < bufs_1.length; _i++) {
                    var b = bufs_1[_i];
                    len += b.length;
                }
                if (len == 0)
                    return null;
                var r = new Uint8Array(len);
                var dst = 0;
                for (var _a = 0, bufs_2 = bufs; _a < bufs_2.length; _a++) {
                    var b = bufs_2[_a];
                    for (var i = 0; i < b.length; ++i)
                        r[dst++] = b[i];
                }
                return {
                    buf: r,
                    start: appstartaddr,
                };
            }
            UF2.toBin = toBin;
            function hasAddr(b, a) {
                if (!b)
                    return false;
                return b.targetAddr <= a && a < b.targetAddr + b.payloadSize;
            }
            function readBytes(blocks, addr, length) {
                var res = new Uint8Array(length);
                var bl;
                for (var i = 0; i < length; ++i, ++addr) {
                    if (!hasAddr(bl, addr))
                        bl = blocks.filter(function (b) { return hasAddr(b, addr); })[0];
                    if (bl)
                        res[i] = bl.data[addr - bl.targetAddr];
                }
                return res;
            }
            UF2.readBytes = readBytes;
            function setWord(block, ptr, v) {
                block[ptr] = (v & 0xff);
                block[ptr + 1] = ((v >> 8) & 0xff);
                block[ptr + 2] = ((v >> 16) & 0xff);
                block[ptr + 3] = ((v >> 24) & 0xff);
            }
            function newBlockFile(familyId) {
                if (typeof familyId == "string")
                    familyId = parseInt(familyId);
                return {
                    currBlock: null,
                    currPtr: -1,
                    blocks: [],
                    ptrs: [],
                    filesize: 0,
                    familyId: familyId || 0
                };
            }
            UF2.newBlockFile = newBlockFile;
            function finalizeFile(f) {
                for (var i = 0; i < f.blocks.length; ++i) {
                    setWord(f.blocks[i], 20, i);
                    setWord(f.blocks[i], 24, f.blocks.length);
                    if (f.filename)
                        setWord(f.blocks[i], 28, f.filesize);
                }
            }
            UF2.finalizeFile = finalizeFile;
            function concatFiles(fs) {
                for (var _i = 0, fs_1 = fs; _i < fs_1.length; _i++) {
                    var f = fs_1[_i];
                    finalizeFile(f);
                    f.filename = null;
                }
                var r = newBlockFile();
                r.blocks = pxtc.U.concat(fs.map(function (f) { return f.blocks; }));
                for (var _a = 0, fs_2 = fs; _a < fs_2.length; _a++) {
                    var f = fs_2[_a];
                    f.blocks = [];
                }
                return r;
            }
            UF2.concatFiles = concatFiles;
            function serializeFile(f) {
                finalizeFile(f);
                var res = "";
                for (var _i = 0, _a = f.blocks; _i < _a.length; _i++) {
                    var b = _a[_i];
                    res += pxtc.Util.uint8ArrayToString(b);
                }
                return res;
            }
            UF2.serializeFile = serializeFile;
            function readBytesFromFile(f, addr, length) {
                //console.log(`read @${addr} len=${length}`)
                var needAddr = addr >> 8;
                var bl;
                if (needAddr == f.currPtr)
                    bl = f.currBlock;
                else {
                    for (var i = 0; i < f.ptrs.length; ++i) {
                        if (f.ptrs[i] == needAddr) {
                            bl = f.blocks[i];
                            break;
                        }
                    }
                    if (bl) {
                        f.currPtr = needAddr;
                        f.currBlock = bl;
                    }
                }
                if (!bl)
                    return null;
                var res = new Uint8Array(length);
                var toRead = Math.min(length, 256 - (addr & 0xff));
                pxtc.U.memcpy(res, 0, bl, (addr & 0xff) + 32, toRead);
                var leftOver = length - toRead;
                if (leftOver > 0) {
                    var le = readBytesFromFile(f, addr + toRead, leftOver);
                    pxtc.U.memcpy(res, toRead, le);
                }
                return res;
            }
            UF2.readBytesFromFile = readBytesFromFile;
            function writeBytes(f, addr, bytes, flags) {
                if (flags === void 0) { flags = 0; }
                var currBlock = f.currBlock;
                var needAddr = addr >> 8;
                // account for unaligned writes
                var thisChunk = 256 - (addr & 0xff);
                if (bytes.length > thisChunk) {
                    var b = new Uint8Array(bytes);
                    writeBytes(f, addr, b.slice(0, thisChunk));
                    while (thisChunk < bytes.length) {
                        var nextOff = Math.min(thisChunk + 256, bytes.length);
                        writeBytes(f, addr + thisChunk, b.slice(thisChunk, nextOff));
                        thisChunk = nextOff;
                    }
                    return;
                }
                if (needAddr != f.currPtr) {
                    var i = 0;
                    currBlock = null;
                    for (var i_1 = 0; i_1 < f.ptrs.length; ++i_1) {
                        if (f.ptrs[i_1] == needAddr) {
                            currBlock = f.blocks[i_1];
                            break;
                        }
                    }
                    if (!currBlock) {
                        currBlock = new Uint8Array(512);
                        if (f.filename)
                            flags |= UF2.UF2_FLAG_FILE;
                        else if (f.familyId)
                            flags |= UF2.UF2_FLAG_FAMILY_ID_PRESENT;
                        setWord(currBlock, 0, UF2.UF2_MAGIC_START0);
                        setWord(currBlock, 4, UF2.UF2_MAGIC_START1);
                        setWord(currBlock, 8, flags);
                        setWord(currBlock, 12, needAddr << 8);
                        setWord(currBlock, 16, 256);
                        setWord(currBlock, 20, f.blocks.length);
                        setWord(currBlock, 28, f.familyId);
                        setWord(currBlock, 512 - 4, UF2.UF2_MAGIC_END);
                        if (f.filename) {
                            pxtc.U.memcpy(currBlock, 32 + 256, pxtc.U.stringToUint8Array(pxtc.U.toUTF8(f.filename)));
                        }
                        f.blocks.push(currBlock);
                        f.ptrs.push(needAddr);
                    }
                    f.currPtr = needAddr;
                    f.currBlock = currBlock;
                }
                var p = (addr & 0xff) + 32;
                for (var i = 0; i < bytes.length; ++i)
                    currBlock[p + i] = bytes[i];
                f.filesize = Math.max(f.filesize, bytes.length + addr);
            }
            UF2.writeBytes = writeBytes;
            function writeHex(f, hex) {
                var upperAddr = "0000";
                for (var i = 0; i < hex.length; ++i) {
                    var m = /:02000004(....)/.exec(hex[i]);
                    if (m) {
                        upperAddr = m[1];
                    }
                    m = /^:..(....)00(.*)[0-9A-F][0-9A-F]$/.exec(hex[i]);
                    if (m) {
                        var newAddr = parseInt(upperAddr + m[1], 16);
                        var hh = m[2];
                        var arr = [];
                        for (var j = 0; j < hh.length; j += 2) {
                            arr.push(parseInt(hh[j] + hh[j + 1], 16));
                        }
                        writeBytes(f, newAddr, arr);
                    }
                }
            }
            UF2.writeHex = writeHex;
        })(UF2 = pxtc.UF2 || (pxtc.UF2 = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
// See https://github.com/Microsoft/TouchDevelop-backend/blob/master/docs/streams.md
var pxt;
(function (pxt) {
    var streams;
    (function (streams) {
        function createStreamAsync(target, name) {
            return pxt.Cloud.privatePostAsync("streams", { target: target, name: name || 'data' }).then(function (j) { return j; });
        }
        streams.createStreamAsync = createStreamAsync;
        function postPayloadAsync(stream, data) {
            pxt.Util.assert(!!stream.privatekey);
            return pxt.Cloud.privatePostAsync(stream.id + "/data?privatekey=" + stream.privatekey, data);
        }
        streams.postPayloadAsync = postPayloadAsync;
    })(streams = pxt.streams || (pxt.streams = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var svgUtil;
    (function (svgUtil) {
        var PatternUnits;
        (function (PatternUnits) {
            PatternUnits[PatternUnits["userSpaceOnUse"] = 0] = "userSpaceOnUse";
            PatternUnits[PatternUnits["objectBoundingBox"] = 1] = "objectBoundingBox";
        })(PatternUnits = svgUtil.PatternUnits || (svgUtil.PatternUnits = {}));
        var LengthUnit;
        (function (LengthUnit) {
            LengthUnit[LengthUnit["em"] = 0] = "em";
            LengthUnit[LengthUnit["ex"] = 1] = "ex";
            LengthUnit[LengthUnit["px"] = 2] = "px";
            LengthUnit[LengthUnit["in"] = 3] = "in";
            LengthUnit[LengthUnit["cm"] = 4] = "cm";
            LengthUnit[LengthUnit["mm"] = 5] = "mm";
            LengthUnit[LengthUnit["pt"] = 6] = "pt";
            LengthUnit[LengthUnit["pc"] = 7] = "pc";
            LengthUnit[LengthUnit["percent"] = 8] = "percent";
        })(LengthUnit = svgUtil.LengthUnit || (svgUtil.LengthUnit = {}));
        var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
        var BaseElement = /** @class */ (function () {
            function BaseElement(type) {
                this.el = elt(type);
            }
            BaseElement.prototype.attr = function (attributes) {
                var _this = this;
                Object.keys(attributes).forEach(function (at) {
                    _this.setAttribute(at, attributes[at]);
                });
                return this;
            };
            BaseElement.prototype.setAttribute = function (name, value) {
                this.el.setAttribute(name, value.toString());
                return this;
            };
            BaseElement.prototype.setAttributeNS = function (ns, name, value) {
                this.el.setAttributeNS(ns, name, value.toString());
                return this;
            };
            BaseElement.prototype.id = function (id) {
                return this.setAttribute("id", id);
            };
            BaseElement.prototype.setClass = function () {
                var classes = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    classes[_i] = arguments[_i];
                }
                return this.setAttribute("class", classes.join(" "));
            };
            BaseElement.prototype.appendClass = function (className) {
                pxt.BrowserUtils.addClass(this.el, className);
                return this;
            };
            BaseElement.prototype.removeClass = function (className) {
                pxt.BrowserUtils.removeClass(this.el, className);
            };
            BaseElement.prototype.title = function (text) {
                if (!this.titleElement) {
                    this.titleElement = elt("title");
                    // Title has to be the first child in the DOM
                    if (this.el.firstChild) {
                        this.el.insertBefore(this.titleElement, this.el.firstChild);
                    }
                    else {
                        this.el.appendChild(this.titleElement);
                    }
                }
                this.titleElement.textContent = text;
            };
            BaseElement.prototype.setVisible = function (visible) {
                return this.setAttribute("visibility", visible ? "visible" : "hidden");
            };
            return BaseElement;
        }());
        svgUtil.BaseElement = BaseElement;
        var DrawContext = /** @class */ (function (_super) {
            __extends(DrawContext, _super);
            function DrawContext() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            DrawContext.prototype.draw = function (type) {
                var el = drawable(type /*FIXME?*/);
                this.el.appendChild(el.el);
                return el;
            };
            DrawContext.prototype.element = function (type, cb) {
                cb(this.draw(type /*FIXME?*/));
                return this;
            };
            DrawContext.prototype.group = function () {
                var g = new Group();
                this.el.appendChild(g.el);
                return g;
            };
            DrawContext.prototype.appendChild = function (child) {
                this.el.appendChild(child.el);
            };
            DrawContext.prototype.onDown = function (handler) {
                svgUtil.events.down(this.el, handler);
                return this;
            };
            DrawContext.prototype.onUp = function (handler) {
                svgUtil.events.up(this.el, handler);
                return this;
            };
            DrawContext.prototype.onMove = function (handler) {
                svgUtil.events.move(this.el, handler);
                return this;
            };
            DrawContext.prototype.onEnter = function (handler) {
                svgUtil.events.enter(this.el, handler);
                return this;
            };
            DrawContext.prototype.onLeave = function (handler) {
                svgUtil.events.leave(this.el, handler);
                return this;
            };
            DrawContext.prototype.onClick = function (handler) {
                svgUtil.events.click(this.el, handler);
                return this;
            };
            return DrawContext;
        }(BaseElement));
        svgUtil.DrawContext = DrawContext;
        var SVG = /** @class */ (function (_super) {
            __extends(SVG, _super);
            function SVG(parent) {
                var _this = _super.call(this, "svg") || this;
                if (parent) {
                    parent.appendChild(_this.el);
                }
                return _this;
            }
            SVG.prototype.define = function (cb) {
                if (!this.defs) {
                    this.defs = new DefsElement(this.el);
                }
                cb(this.defs);
                return this;
            };
            return SVG;
        }(DrawContext));
        svgUtil.SVG = SVG;
        var Group = /** @class */ (function (_super) {
            __extends(Group, _super);
            function Group(parent) {
                var _this = _super.call(this, "g") || this;
                if (parent) {
                    parent.appendChild(_this.el);
                }
                return _this;
            }
            Group.prototype.translate = function (x, y) {
                this.left = x;
                this.top = y;
                return this.updateTransform();
            };
            Group.prototype.scale = function (factor) {
                this.scaleFactor = factor;
                return this.updateTransform();
            };
            Group.prototype.def = function () {
                return new DefsElement(this.el);
            };
            Group.prototype.style = function () {
                return new StyleElement(this.el);
            };
            Group.prototype.updateTransform = function () {
                var transform = "";
                if (this.left != undefined) {
                    transform += "translate(" + this.left + " " + this.top + ")";
                }
                if (this.scaleFactor != undefined) {
                    transform += " scale(" + this.scaleFactor + ")";
                }
                this.setAttribute("transform", transform);
                return this;
            };
            return Group;
        }(DrawContext));
        svgUtil.Group = Group;
        var Pattern = /** @class */ (function (_super) {
            __extends(Pattern, _super);
            function Pattern() {
                return _super.call(this, "pattern") || this;
            }
            Pattern.prototype.units = function (kind) {
                return this.setAttribute("patternUnits", kind === PatternUnits.objectBoundingBox ? "objectBoundingBox" : "userSpaceOnUse");
            };
            Pattern.prototype.contentUnits = function (kind) {
                return this.setAttribute("patternContentUnits", kind === PatternUnits.objectBoundingBox ? "objectBoundingBox" : "userSpaceOnUse");
            };
            Pattern.prototype.size = function (width, height) {
                this.setAttribute("width", width);
                this.setAttribute("height", height);
                return this;
            };
            return Pattern;
        }(DrawContext));
        svgUtil.Pattern = Pattern;
        var DefsElement = /** @class */ (function (_super) {
            __extends(DefsElement, _super);
            function DefsElement(parent) {
                var _this = _super.call(this, "defs") || this;
                parent.appendChild(_this.el);
                return _this;
            }
            DefsElement.prototype.create = function (type, id) {
                var el;
                switch (type) {
                    case "path":
                        el = new Path();
                        break;
                    case "pattern":
                        el = new Pattern();
                        break;
                    case "radialGradient":
                        el = new RadialGradient();
                        break;
                    case "linearGradient":
                        el = new LinearGradient();
                        break;
                    case "clipPath":
                        el = new ClipPath();
                        break;
                    default: el = new BaseElement(type);
                }
                el.id(id);
                this.el.appendChild(el.el);
                return el;
            };
            return DefsElement;
        }(BaseElement));
        svgUtil.DefsElement = DefsElement;
        var StyleElement = /** @class */ (function (_super) {
            __extends(StyleElement, _super);
            function StyleElement(parent) {
                var _this = _super.call(this, "style") || this;
                parent.appendChild(_this.el);
                return _this;
            }
            StyleElement.prototype.content = function (css) {
                this.el.textContent = css;
            };
            return StyleElement;
        }(BaseElement));
        svgUtil.StyleElement = StyleElement;
        var Drawable = /** @class */ (function (_super) {
            __extends(Drawable, _super);
            function Drawable() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            Drawable.prototype.at = function (x, y) {
                this.setAttribute("x", x);
                this.setAttribute("y", y);
                return this;
            };
            Drawable.prototype.moveTo = function (x, y) {
                return this.at(x, y);
            };
            Drawable.prototype.fill = function (color, opacity) {
                this.setAttribute("fill", color);
                if (opacity != undefined) {
                    this.opacity(opacity);
                }
                return this;
            };
            Drawable.prototype.opacity = function (opacity) {
                return this.setAttribute("fill-opacity", opacity);
            };
            Drawable.prototype.stroke = function (color, width) {
                this.setAttribute("stroke", color);
                if (width != undefined) {
                    this.strokeWidth(width);
                }
                return this;
            };
            Drawable.prototype.strokeWidth = function (width) {
                return this.setAttribute("stroke-width", width);
            };
            Drawable.prototype.strokeOpacity = function (opacity) {
                return this.setAttribute("stroke-opacity", opacity);
            };
            Drawable.prototype.clipPath = function (url) {
                return this.setAttribute("clip-path", url);
            };
            return Drawable;
        }(DrawContext));
        svgUtil.Drawable = Drawable;
        var Text = /** @class */ (function (_super) {
            __extends(Text, _super);
            function Text(text) {
                var _this = _super.call(this, "text") || this;
                if (text != undefined) {
                    _this.text(text);
                }
                return _this;
            }
            Text.prototype.text = function (text) {
                this.el.textContent = text;
                return this;
            };
            Text.prototype.fontFamily = function (family) {
                return this.setAttribute("font-family", family);
            };
            Text.prototype.fontSize = function (size, units) {
                return this.setAttribute("font-size", lengthWithUnits(size, units));
            };
            Text.prototype.offset = function (dx, dy, units) {
                if (dx !== 0) {
                    this.setAttribute("dx", lengthWithUnits(dx, units));
                }
                if (dy !== 0) {
                    this.setAttribute("dy", lengthWithUnits(dy, units));
                }
                return this;
            };
            Text.prototype.anchor = function (type) {
                return this.setAttribute("text-anchor", type);
            };
            return Text;
        }(Drawable));
        svgUtil.Text = Text;
        var Rect = /** @class */ (function (_super) {
            __extends(Rect, _super);
            function Rect() {
                return _super.call(this, "rect") || this;
            }
            ;
            Rect.prototype.width = function (width, unit) {
                if (unit === void 0) { unit = LengthUnit.px; }
                return this.setAttribute("width", lengthWithUnits(width, unit));
            };
            Rect.prototype.height = function (height, unit) {
                if (unit === void 0) { unit = LengthUnit.px; }
                return this.setAttribute("height", lengthWithUnits(height, unit));
            };
            Rect.prototype.corner = function (radius) {
                return this.corners(radius, radius);
            };
            Rect.prototype.corners = function (rx, ry) {
                this.setAttribute("rx", rx);
                this.setAttribute("ry", ry);
                return this;
            };
            Rect.prototype.size = function (width, height, unit) {
                if (unit === void 0) { unit = LengthUnit.px; }
                this.width(width, unit);
                this.height(height, unit);
                return this;
            };
            return Rect;
        }(Drawable));
        svgUtil.Rect = Rect;
        var Circle = /** @class */ (function (_super) {
            __extends(Circle, _super);
            function Circle() {
                return _super.call(this, "circle") || this;
            }
            Circle.prototype.at = function (cx, cy) {
                this.setAttribute("cx", cx);
                this.setAttribute("cy", cy);
                return this;
            };
            Circle.prototype.radius = function (r) {
                return this.setAttribute("r", r);
            };
            return Circle;
        }(Drawable));
        svgUtil.Circle = Circle;
        var Ellipse = /** @class */ (function (_super) {
            __extends(Ellipse, _super);
            function Ellipse() {
                return _super.call(this, "ellipse") || this;
            }
            Ellipse.prototype.at = function (cx, cy) {
                this.setAttribute("cx", cx);
                this.setAttribute("cy", cy);
                return this;
            };
            Ellipse.prototype.radius = function (rx, ry) {
                this.setAttribute("rx", rx);
                this.setAttribute("ry", ry);
                return this;
            };
            return Ellipse;
        }(Drawable));
        var Line = /** @class */ (function (_super) {
            __extends(Line, _super);
            function Line() {
                return _super.call(this, "line") || this;
            }
            Line.prototype.at = function (x1, y1, x2, y2) {
                this.from(x1, y1);
                if (x2 != undefined && y2 != undefined) {
                    this.to(x2, y2);
                }
                return this;
            };
            Line.prototype.from = function (x1, y1) {
                this.setAttribute("x1", x1);
                this.setAttribute("y1", y1);
                return this;
            };
            Line.prototype.to = function (x2, y2) {
                this.setAttribute("x2", x2);
                this.setAttribute("y2", y2);
                return this;
            };
            return Line;
        }(Drawable));
        svgUtil.Line = Line;
        var PolyElement = /** @class */ (function (_super) {
            __extends(PolyElement, _super);
            function PolyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            PolyElement.prototype.points = function (points) {
                return this.setAttribute("points", points);
            };
            PolyElement.prototype.with = function (points) {
                return this.points(points.map(function (_a) {
                    var x = _a.x, y = _a.y;
                    return x + " " + y;
                }).join(","));
            };
            return PolyElement;
        }(Drawable));
        svgUtil.PolyElement = PolyElement;
        var Polyline = /** @class */ (function (_super) {
            __extends(Polyline, _super);
            function Polyline() {
                return _super.call(this, "polyline") || this;
            }
            return Polyline;
        }(PolyElement));
        svgUtil.Polyline = Polyline;
        var Polygon = /** @class */ (function (_super) {
            __extends(Polygon, _super);
            function Polygon() {
                return _super.call(this, "polygon") || this;
            }
            return Polygon;
        }(PolyElement));
        svgUtil.Polygon = Polygon;
        var Path = /** @class */ (function (_super) {
            __extends(Path, _super);
            function Path() {
                var _this = _super.call(this, "path") || this;
                _this.d = new PathContext();
                return _this;
            }
            Path.prototype.update = function () {
                return this.setAttribute("d", this.d.toAttribute());
            };
            Path.prototype.path = function (cb) {
                cb(this.d);
                return this.update();
            };
            return Path;
        }(Drawable));
        svgUtil.Path = Path;
        var Image = /** @class */ (function (_super) {
            __extends(Image, _super);
            function Image() {
                return _super.call(this, "image") || this;
            }
            Image.prototype.src = function (url) {
                return this.setAttributeNS(XLINK_NAMESPACE, "href", url);
            };
            Image.prototype.width = function (width, unit) {
                if (unit === void 0) { unit = LengthUnit.px; }
                return this.setAttribute("width", lengthWithUnits(width, unit));
            };
            Image.prototype.height = function (height, unit) {
                if (unit === void 0) { unit = LengthUnit.px; }
                return this.setAttribute("height", lengthWithUnits(height, unit));
            };
            Image.prototype.size = function (width, height, unit) {
                if (unit === void 0) { unit = LengthUnit.px; }
                this.width(width, unit);
                this.height(height, unit);
                return this;
            };
            return Image;
        }(Drawable));
        svgUtil.Image = Image;
        var Gradient = /** @class */ (function (_super) {
            __extends(Gradient, _super);
            function Gradient() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            Gradient.prototype.units = function (kind) {
                return this.setAttribute("gradientUnits", kind === PatternUnits.objectBoundingBox ? "objectBoundingBox" : "userSpaceOnUse");
            };
            Gradient.prototype.stop = function (offset, color, opacity) {
                var s = elt("stop");
                s.setAttribute("offset", offset + "%");
                if (color != undefined) {
                    s.setAttribute("stop-color", color);
                }
                if (opacity != undefined) {
                    s.setAttribute("stop-opacity", opacity);
                }
                this.el.appendChild(s);
                return this;
            };
            return Gradient;
        }(BaseElement));
        svgUtil.Gradient = Gradient;
        var LinearGradient = /** @class */ (function (_super) {
            __extends(LinearGradient, _super);
            function LinearGradient() {
                return _super.call(this, "linearGradient") || this;
            }
            LinearGradient.prototype.start = function (x1, y1) {
                this.setAttribute("x1", x1);
                this.setAttribute("y1", y1);
                return this;
            };
            LinearGradient.prototype.end = function (x2, y2) {
                this.setAttribute("x2", x2);
                this.setAttribute("y2", y2);
                return this;
            };
            return LinearGradient;
        }(Gradient));
        svgUtil.LinearGradient = LinearGradient;
        var RadialGradient = /** @class */ (function (_super) {
            __extends(RadialGradient, _super);
            function RadialGradient() {
                return _super.call(this, "radialGradient") || this;
            }
            RadialGradient.prototype.center = function (cx, cy) {
                this.setAttribute("cx", cx);
                this.setAttribute("cy", cy);
                return this;
            };
            RadialGradient.prototype.focus = function (fx, fy, fr) {
                this.setAttribute("fx", fx);
                this.setAttribute("fy", fy);
                this.setAttribute("fr", fr);
                return this;
            };
            RadialGradient.prototype.radius = function (r) {
                return this.setAttribute("r", r);
            };
            return RadialGradient;
        }(Gradient));
        svgUtil.RadialGradient = RadialGradient;
        var ClipPath = /** @class */ (function (_super) {
            __extends(ClipPath, _super);
            function ClipPath() {
                return _super.call(this, "clipPath") || this;
            }
            ClipPath.prototype.clipPathUnits = function (objectBoundingBox) {
                if (objectBoundingBox) {
                    return this.setAttribute("clipPathUnits", "objectBoundingBox");
                }
                else {
                    return this.setAttribute("clipPathUnits", "userSpaceOnUse");
                }
            };
            return ClipPath;
        }(DrawContext));
        svgUtil.ClipPath = ClipPath;
        function elt(type) {
            var el = document.createElementNS("http://www.w3.org/2000/svg", type);
            return el;
        }
        function drawable(type) {
            switch (type) {
                case "text": return new Text();
                case "circle": return new Circle();
                case "rect": return new Rect();
                case "line": return new Line();
                case "polygon": return new Polygon();
                case "polyline": return new Polyline();
                case "path": return new Path();
                default: return new Drawable(type);
            }
        }
        var PathContext = /** @class */ (function () {
            function PathContext() {
                this.ops = [];
            }
            PathContext.prototype.clear = function () {
                this.ops = [];
            };
            PathContext.prototype.moveTo = function (x, y) {
                return this.op("M", x, y);
            };
            PathContext.prototype.moveBy = function (dx, dy) {
                return this.op("m", dx, dy);
            };
            PathContext.prototype.lineTo = function (x, y) {
                return this.op("L", x, y);
            };
            PathContext.prototype.lineBy = function (dx, dy) {
                return this.op("l", dx, dy);
            };
            PathContext.prototype.cCurveTo = function (c1x, c1y, c2x, c2y, x, y) {
                return this.op("C", c1x, c1y, c2x, c2y, x, y);
            };
            PathContext.prototype.cCurveBy = function (dc1x, dc1y, dc2x, dc2y, dx, dy) {
                return this.op("c", dc1x, dc1y, dc2x, dc2y, dx, dy);
            };
            PathContext.prototype.qCurveTo = function (cx, cy, x, y) {
                return this.op("Q", cx, cy, x, y);
            };
            PathContext.prototype.qCurveBy = function (dcx, dcy, dx, dy) {
                return this.op("q", dcx, dcy, dx, dy);
            };
            PathContext.prototype.sCurveTo = function (cx, cy, x, y) {
                return this.op("S", cx, cy, x, y);
            };
            PathContext.prototype.sCurveBy = function (dcx, dcy, dx, dy) {
                return this.op("s", dcx, dcy, dx, dy);
            };
            PathContext.prototype.tCurveTo = function (x, y) {
                return this.op("T", x, y);
            };
            PathContext.prototype.tCurveBy = function (dx, dy) {
                return this.op("t", dx, dy);
            };
            PathContext.prototype.arcTo = function (rx, ry, xRotate, large, sweepClockwise, x, y) {
                return this.op("A", rx, ry, xRotate, large ? 1 : 0, sweepClockwise ? 1 : 0, x, y);
            };
            PathContext.prototype.arcBy = function (rx, ry, xRotate, large, sweepClockwise, x, y) {
                return this.op("a", rx, ry, xRotate, large ? 1 : 0, sweepClockwise ? 1 : 0, x, y);
            };
            PathContext.prototype.close = function () {
                return this.op("z");
            };
            PathContext.prototype.toAttribute = function () {
                return this.ops.map(function (op) { return op.op + " " + op.args.join(" "); }).join(" ");
            };
            PathContext.prototype.op = function (op) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                this.ops.push({
                    op: op,
                    args: args
                });
                return this;
            };
            return PathContext;
        }());
        svgUtil.PathContext = PathContext;
        function lengthWithUnits(value, unit) {
            switch (unit) {
                case LengthUnit.em: return value + "em";
                case LengthUnit.ex: return value + "ex";
                case LengthUnit.px: return value + "px";
                case LengthUnit.in: return value + "in";
                case LengthUnit.cm: return value + "cm";
                case LengthUnit.mm: return value + "mm";
                case LengthUnit.pt: return value + "pt";
                case LengthUnit.pc: return value + "pc";
                case LengthUnit.percent: return value + "%";
                default: return value.toString();
            }
        }
    })(svgUtil = pxt.svgUtil || (pxt.svgUtil = {}));
})(pxt || (pxt = {}));
(function (pxt) {
    var svgUtil;
    (function (svgUtil) {
        var events;
        (function (events) {
            function isTouchEnabled() {
                return typeof window !== "undefined" &&
                    ('ontouchstart' in window // works on most browsers
                        || (navigator && navigator.maxTouchPoints > 0)); // works on IE10/11 and Surface);
            }
            events.isTouchEnabled = isTouchEnabled;
            function hasPointerEvents() {
                return typeof window != "undefined" && !!window.PointerEvent;
            }
            events.hasPointerEvents = hasPointerEvents;
            function down(el, handler) {
                if (hasPointerEvents()) {
                    el.addEventListener("pointerdown", handler);
                }
                else if (isTouchEnabled()) {
                    el.addEventListener("mousedown", handler);
                    el.addEventListener("touchstart", handler);
                }
                else {
                    el.addEventListener("mousedown", handler);
                }
            }
            events.down = down;
            function up(el, handler) {
                if (hasPointerEvents()) {
                    el.addEventListener("pointerup", handler);
                }
                else if (isTouchEnabled()) {
                    el.addEventListener("mouseup", handler);
                }
                else {
                    el.addEventListener("mouseup", handler);
                }
            }
            events.up = up;
            function enter(el, handler) {
                if (hasPointerEvents()) {
                    el.addEventListener("pointerover", function (e) {
                        handler(!!(e.buttons & 1));
                    });
                }
                else if (isTouchEnabled()) {
                    el.addEventListener("touchstart", function (e) {
                        handler(true);
                    });
                }
                else {
                    el.addEventListener("mouseover", function (e) {
                        handler(!!(e.buttons & 1));
                    });
                }
            }
            events.enter = enter;
            function leave(el, handler) {
                if (hasPointerEvents()) {
                    el.addEventListener("pointerleave", handler);
                }
                else if (isTouchEnabled()) {
                    el.addEventListener("touchend", handler);
                }
                else {
                    el.addEventListener("mouseleave", handler);
                }
            }
            events.leave = leave;
            function move(el, handler) {
                if (hasPointerEvents()) {
                    el.addEventListener("pointermove", handler);
                }
                else if (isTouchEnabled()) {
                    el.addEventListener("touchmove", handler);
                }
                else {
                    el.addEventListener("mousemove", handler);
                }
            }
            events.move = move;
            function click(el, handler) {
                el.addEventListener("click", handler);
            }
            events.click = click;
        })(events = svgUtil.events || (svgUtil.events = {}));
    })(svgUtil = pxt.svgUtil || (pxt.svgUtil = {}));
})(pxt || (pxt = {}));
(function (pxt) {
    var svgUtil;
    (function (svgUtil) {
        var helpers;
        (function (helpers) {
            var CenteredText = /** @class */ (function (_super) {
                __extends(CenteredText, _super);
                function CenteredText() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                CenteredText.prototype.at = function (cx, cy) {
                    this.cx = cx;
                    this.cy = cy;
                    this.rePosition();
                    return this;
                };
                CenteredText.prototype.text = function (text, fontSizePixels) {
                    if (fontSizePixels === void 0) { fontSizePixels = 12; }
                    _super.prototype.text.call(this, text);
                    this.fontSizePixels = fontSizePixels;
                    this.setAttribute("font-size", fontSizePixels + "px");
                    this.rePosition();
                    return this;
                };
                CenteredText.prototype.rePosition = function () {
                    if (this.cx == undefined || this.cy == undefined || this.fontSizePixels == undefined) {
                        return;
                    }
                    this.setAttribute("x", this.cx);
                    this.setAttribute("y", this.cy);
                    this.setAttribute("text-anchor", "middle");
                    this.setAttribute("alignment-baseline", "middle");
                };
                return CenteredText;
            }(svgUtil.Text));
            helpers.CenteredText = CenteredText;
        })(helpers = svgUtil.helpers || (svgUtil.helpers = {}));
    })(svgUtil = pxt.svgUtil || (pxt.svgUtil = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var toolbox;
    (function (toolbox) {
        toolbox.blockColors = {
            loops: '#107c10',
            logic: '#006970',
            math: '#712672',
            variables: '#A80000',
            functions: '#005a9e',
            text: '#996600',
            arrays: '#A94400',
            advanced: '#3c3c3c',
            addpackage: '#717171',
            search: '#000',
            debug: '#e03030',
            default: '#dddddd',
            topblocks: '#aa8f00',
            recipes: '#717171'
        };
        toolbox.blockIcons = {
            loops: '\uf01e',
            logic: '\uf074',
            math: '\uf1ec',
            variables: '\uf039',
            functions: '\uf109',
            text: '\uf035',
            arrays: '\uf0cb',
            advancedcollapsed: '\uf078',
            advancedexpanded: '\uf077',
            more: '\uf141',
            addpackage: '\uf055',
            search: '\uf002',
            debug: '\uf111',
            default: '\uf12e',
            topblocks: '\uf005',
            recipes: '\uf0eb'
        };
        var toolboxStyleBuffer = '';
        function appendToolboxIconCss(className, i) {
            if (toolboxStyleBuffer.indexOf(className) > -1)
                return;
            if (i.length === 1) {
                var icon = pxt.Util.unicodeToChar(i);
                toolboxStyleBuffer += "\n                .blocklyTreeIcon." + className + "::before {\n                    content: \"" + icon + "\";\n                }\n            ";
            }
            else {
                toolboxStyleBuffer += "\n                .blocklyTreeIcon." + className + " {\n                    background-image: url(\"" + pxt.Util.pathJoin(pxt.webConfig.commitCdnUrl, encodeURI(i)) + "\")!important;\n                    width: 30px;\n                    height: 100%;\n                    background-size: 20px !important;\n                    background-repeat: no-repeat !important;\n                    background-position: 50% 50% !important;\n                }\n            ";
            }
        }
        toolbox.appendToolboxIconCss = appendToolboxIconCss;
        function getNamespaceColor(ns) {
            ns = ns.toLowerCase();
            if (pxt.appTarget.appTheme.blockColors && pxt.appTarget.appTheme.blockColors[ns])
                return pxt.appTarget.appTheme.blockColors[ns];
            if (pxt.toolbox.blockColors[ns])
                return pxt.toolbox.blockColors[ns];
            return "";
        }
        toolbox.getNamespaceColor = getNamespaceColor;
        function getNamespaceIcon(ns) {
            ns = ns.toLowerCase();
            if (pxt.appTarget.appTheme.blockIcons && pxt.appTarget.appTheme.blockIcons[ns]) {
                return pxt.appTarget.appTheme.blockIcons[ns];
            }
            if (pxt.toolbox.blockIcons[ns]) {
                return pxt.toolbox.blockIcons[ns];
            }
            return "";
        }
        toolbox.getNamespaceIcon = getNamespaceIcon;
        function advancedTitle() { return pxt.Util.lf("{id:category}Advanced"); }
        toolbox.advancedTitle = advancedTitle;
        function addPackageTitle() { return pxt.Util.lf("{id:category}Extensions"); }
        toolbox.addPackageTitle = addPackageTitle;
        function recipesTitle() { return pxt.Util.lf("{id:category}Tutorials"); }
        toolbox.recipesTitle = recipesTitle;
        /**
         * Convert blockly hue to rgb
         */
        function convertColor(colour) {
            var hue = parseInt(colour);
            if (!isNaN(hue)) {
                return hueToRgb(hue);
            }
            return colour;
        }
        toolbox.convertColor = convertColor;
        function hueToRgb(hue) {
            var HSV_SATURATION = 0.45;
            var HSV_VALUE = 0.65 * 255;
            var rgbArray = hsvToRgb(hue, HSV_SATURATION, HSV_VALUE);
            return "#" + componentToHex(rgbArray[0]) + componentToHex(rgbArray[1]) + componentToHex(rgbArray[2]);
        }
        toolbox.hueToRgb = hueToRgb;
        /**
         * Converts an HSV triplet to an RGB array.  V is brightness because b is
         *   reserved for blue in RGB.
         * Closure's HSV to RGB function: https://github.com/google/closure-library/blob/master/closure/goog/color/color.js#L613
         */
        function hsvToRgb(h, s, brightness) {
            var red = 0;
            var green = 0;
            var blue = 0;
            if (s == 0) {
                red = brightness;
                green = brightness;
                blue = brightness;
            }
            else {
                var sextant = Math.floor(h / 60);
                var remainder = (h / 60) - sextant;
                var val1 = brightness * (1 - s);
                var val2 = brightness * (1 - (s * remainder));
                var val3 = brightness * (1 - (s * (1 - remainder)));
                switch (sextant) {
                    case 1:
                        red = val2;
                        green = brightness;
                        blue = val1;
                        break;
                    case 2:
                        red = val1;
                        green = brightness;
                        blue = val3;
                        break;
                    case 3:
                        red = val1;
                        green = val2;
                        blue = brightness;
                        break;
                    case 4:
                        red = val3;
                        green = val1;
                        blue = brightness;
                        break;
                    case 5:
                        red = brightness;
                        green = val1;
                        blue = val2;
                        break;
                    case 6:
                    case 0:
                        red = brightness;
                        green = val3;
                        blue = val1;
                        break;
                }
            }
            return [Math.floor(red), Math.floor(green), Math.floor(blue)];
        }
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        function fadeColor(hex, luminosity, lighten) {
            // #ABC => ABC
            hex = hex.replace(/[^0-9a-f]/gi, '');
            // ABC => AABBCC
            if (hex.length < 6)
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            // tweak
            var rgb = "#";
            for (var i = 0; i < 3; i++) {
                var c = parseInt(hex.substr(i * 2, 2), 16);
                c = Math.round(Math.min(Math.max(0, lighten ? c + (c * luminosity) : c - (c * luminosity)), 255));
                var cStr = c.toString(16);
                rgb += ("00" + cStr).substr(cStr.length);
            }
            return rgb;
        }
        toolbox.fadeColor = fadeColor;
    })(toolbox = pxt.toolbox || (pxt.toolbox = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var tutorial;
    (function (tutorial) {
        var _h2Regex = /^##[^#](.*)$([\s\S]*?)(?=^##[^#]|$(?![\r\n]))/gmi;
        var _h3Regex = /^###[^#](.*)$([\s\S]*?)(?=^###[^#]|$(?![\r\n]))/gmi;
        function parseTutorial(tutorialmd) {
            var metadata = parseTutorialMetadata(tutorialmd);
            var _a = parseTutorialMarkdown(tutorialmd, metadata), steps = _a.steps, activities = _a.activities;
            var title = parseTutorialTitle(tutorialmd);
            if (!steps)
                return undefined; // error parsing steps
            // collect code and infer editor
            var editor = undefined;
            var regex = /```(sim|block|blocks|filterblocks|spy|ghost|typescript|ts|js|javascript|template)?\s*\n([\s\S]*?)\n```/gmi;
            var code = '';
            var templateCode;
            // Concatenate all blocks in separate code blocks and decompile so we can detect what blocks are used (for the toolbox)
            tutorialmd
                .replace(/((?!.)\s)+/g, "\n")
                .replace(regex, function (m0, m1, m2) {
                switch (m1) {
                    case "block":
                    case "blocks":
                    case "filterblocks":
                        if (!checkTutorialEditor(pxt.BLOCKS_PROJECT_NAME))
                            return undefined;
                        break;
                    case "spy":
                        if (!checkTutorialEditor(pxt.PYTHON_PROJECT_NAME))
                            return undefined;
                        break;
                    case "typescript":
                    case "ts":
                    case "javascript":
                    case "js":
                        if (!checkTutorialEditor(pxt.JAVASCRIPT_PROJECT_NAME))
                            return undefined;
                        break;
                    case "template":
                        templateCode = m2;
                        break;
                }
                code += "\n { \n " + m2 + "\n } \n";
                return "";
            });
            return {
                editor: editor || pxt.BLOCKS_PROJECT_NAME,
                title: title,
                steps: steps,
                activities: activities,
                code: code,
                templateCode: templateCode,
                metadata: metadata
            };
            function checkTutorialEditor(expected) {
                if (editor && editor != expected) {
                    pxt.debug("tutorial ambiguous: contains snippets of different types");
                    return false;
                }
                else {
                    editor = expected;
                    return true;
                }
            }
        }
        tutorial.parseTutorial = parseTutorial;
        function parseTutorialTitle(tutorialmd) {
            var title = tutorialmd.match(/^#[^#](.*)$/mi);
            return title && title.length > 1 ? title[1] : null;
        }
        function parseTutorialMarkdown(tutorialmd, metadata) {
            tutorialmd = stripHiddenSnippets(tutorialmd);
            if (metadata && metadata.activities) {
                // tutorial with "## ACTIVITY", "### STEP" syntax
                return parseTutorialActivities(tutorialmd, metadata);
            }
            else {
                // tutorial with "## STEP" syntax
                var steps = parseTutorialSteps(tutorialmd, null, metadata);
                // old: "### STEP" syntax (no activity header guaranteed)
                if (!steps || steps.length <= 1)
                    steps = parseTutorialSteps(tutorialmd, _h3Regex, metadata);
                return { steps: steps, activities: null };
            }
        }
        function parseTutorialActivities(markdown, metadata) {
            var stepInfo = [];
            var activityInfo = [];
            markdown.replace(_h2Regex, function (match, name, activity) {
                var i = activityInfo.length;
                activityInfo.push({
                    name: name || lf("Activity {0}", i),
                    step: stepInfo.length
                });
                var steps = parseTutorialSteps(activity, _h3Regex, metadata);
                steps = steps.map(function (step) {
                    step.activity = i;
                    return step;
                });
                stepInfo = stepInfo.concat(steps);
                return "";
            });
            return { steps: stepInfo, activities: activityInfo };
        }
        function parseTutorialSteps(markdown, regex, metadata) {
            // use regex override if present
            var stepRegex = regex || _h2Regex;
            var stepInfo = [];
            markdown.replace(stepRegex, function (match, flags, step) {
                step = step.trim();
                var _a = parseTutorialHint(step, metadata && metadata.explicitHints), header = _a.header, hint = _a.hint;
                var info = {
                    fullscreen: /@(fullscreen|unplugged)/.test(flags),
                    unplugged: /@unplugged/.test(flags),
                    tutorialCompleted: /@tutorialCompleted/.test(flags),
                    contentMd: step,
                    headerContentMd: header,
                    hintContentMd: hint,
                    hasHint: hint && hint.length > 0
                };
                stepInfo.push(info);
                return "";
            });
            if (markdown.indexOf("# Not found") == 0) {
                pxt.debug("tutorial not found");
                return undefined;
            }
            return stepInfo;
        }
        function parseTutorialHint(step, explicitHints) {
            var header = step, hint;
            if (explicitHints) {
                // hint is explicitly set with hint syntax "#### ~ tutorialhint" and terminates at the next heading
                var hintTextRegex = /#+ ~ tutorialhint([\s\S]*)/i;
                header = step.replace(hintTextRegex, function (f, m) {
                    hint = m;
                    return "";
                });
            }
            else {
                // everything after the first ``` section OR the first image is treated as a "hint"
                var hintTextRegex = /(^[\s\S]*?\S)\s*((```|\!\[[\s\S]+?\]\(\S+?\))[\s\S]*)/mi;
                var hintText = step.match(hintTextRegex);
                if (hintText && hintText.length > 2) {
                    header = hintText[1].trim();
                    hint = hintText[2].trim();
                }
            }
            return { header: header, hint: hint };
        }
        /* Remove hidden snippets from text */
        function stripHiddenSnippets(str) {
            if (!str)
                return null;
            var hiddenSnippetRegex = /```(filterblocks|package|ghost|config|template)\s*\n([\s\S]*?)\n```/gmi;
            return str.replace(hiddenSnippetRegex, '').trim();
        }
        /*
            Parses metadata at the beginning of tutorial markown. Metadata is a key-value
            pair in the format: `### @KEY VALUE`
        */
        function parseTutorialMetadata(tutorialmd) {
            var metadataRegex = /### @(\S+) ([ \S]+)/gi;
            var m = {};
            tutorialmd.replace(metadataRegex, function (f, k, v) {
                try {
                    m[k] = JSON.parse(v);
                }
                catch (_a) {
                    m[k] = v;
                }
                return "";
            });
            return m;
        }
        function highlight(pre) {
            var text = pre.textContent;
            if (!/@highlight/.test(text))
                return;
            // collapse image python/js literales
            text = text.replace(/img\s*\(\s*"{3}(.|\n)*"{3}\s*\)/g, "\"\"\" \"\"\"");
            text = text.replace(/img\s*\(\s*`(.|\n)*`\s*\)/g, "img` `");
            // render lines
            pre.textContent = ""; // clear up and rebuild
            var lines = text.split('\n');
            for (var i = 0; i < lines.length; ++i) {
                var line = lines[i];
                if (/@highlight/.test(line)) {
                    // highlight next line
                    line = lines[++i];
                    if (line !== undefined) {
                        var span = document.createElement("span");
                        span.className = "highlight-line";
                        span.textContent = line;
                        pre.appendChild(span);
                    }
                }
                else {
                    pre.appendChild(document.createTextNode(line + '\n'));
                }
            }
        }
        tutorial.highlight = highlight;
    })(tutorial = pxt.tutorial || (pxt.tutorial = {}));
})(pxt || (pxt = {}));
/// <reference path='../built/typescriptServices.d.ts' />
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        function flattenDiagnosticMessageText(messageText, newLine) {
            if (typeof messageText === "string") {
                return messageText;
            }
            else {
                var diagnosticChain = messageText;
                var result = "";
                var indent = 0;
                while (diagnosticChain) {
                    if (indent) {
                        result += newLine;
                        for (var i = 0; i < indent; i++) {
                            result += "  ";
                        }
                    }
                    result += diagnosticChain.messageText;
                    indent++;
                    diagnosticChain = diagnosticChain.next;
                }
                return result;
            }
        }
        pxtc.flattenDiagnosticMessageText = flattenDiagnosticMessageText;
        var ScriptTarget;
        (function (ScriptTarget) {
            ScriptTarget[ScriptTarget["ES3"] = 0] = "ES3";
            ScriptTarget[ScriptTarget["ES5"] = 1] = "ES5";
            ScriptTarget[ScriptTarget["ES6"] = 2] = "ES6";
            ScriptTarget[ScriptTarget["ES2015"] = 2] = "ES2015";
            ScriptTarget[ScriptTarget["Latest"] = 2] = "Latest";
        })(ScriptTarget = pxtc.ScriptTarget || (pxtc.ScriptTarget = {}));
        function isIdentifierStart(ch, languageVersion) {
            return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ ||
                ch === 36 /* $ */ || ch === 95 /* _ */ ||
                ch > 127 /* maxAsciiCharacter */ && isUnicodeIdentifierStart(ch, languageVersion);
        }
        pxtc.isIdentifierStart = isIdentifierStart;
        function isIdentifierPart(ch, languageVersion) {
            return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ ||
                ch >= 48 /* _0 */ && ch <= 57 /* _9 */ || ch === 36 /* $ */ || ch === 95 /* _ */ ||
                ch > 127 /* maxAsciiCharacter */ && isUnicodeIdentifierPart(ch, languageVersion);
        }
        pxtc.isIdentifierPart = isIdentifierPart;
        pxtc.reservedWords = ["abstract", "any", "as", "break",
            "case", "catch", "class", "continue", "const", "constructor", "debugger",
            "declare", "default", "delete", "do", "else", "enum", "export", "extends",
            "false", "finally", "for", "from", "function", "get", "if", "implements",
            "import", "in", "instanceof", "interface", "is", "let", "module", "namespace",
            "new", "null", "package", "private", "protected", "public",
            "require", "global", "return", "set", "static", "super", "switch",
            "symbol", "this", "throw", "true", "try", "type", "typeof", "var", "void",
            "while", "with", "yield", "async", "await", "of",
            // PXT Specific
            "Math"];
        function escapeIdentifier(name) {
            if (!name)
                return '_';
            var n = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_$]/g, function (a) {
                return ts.pxtc.isIdentifierPart(a.charCodeAt(0), ts.pxtc.ScriptTarget.ES5) ? a : "";
            });
            if (!n || !ts.pxtc.isIdentifierStart(n.charCodeAt(0), ts.pxtc.ScriptTarget.ES5) || pxtc.reservedWords.indexOf(n) !== -1) {
                n = "_" + n;
            }
            return n;
        }
        pxtc.escapeIdentifier = escapeIdentifier;
        var unicodeES5IdentifierStart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 880, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1162, 1319, 1329, 1366, 1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1568, 1610, 1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775, 1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957, 1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069, 2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2208, 2208, 2210, 2220, 2308, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2417, 2423, 2425, 2431, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529, 2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929, 2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3133, 3133, 3160, 3161, 3168, 3169, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261, 3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3389, 3406, 3406, 3424, 3425, 3450, 3455, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3807, 3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138, 4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198, 4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4992, 5007, 5024, 5108, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900, 5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000, 6016, 6067, 6103, 6103, 6108, 6108, 6176, 6263, 6272, 6312, 6314, 6314, 6320, 6389, 6400, 6428, 6480, 6509, 6512, 6516, 6528, 6571, 6593, 6599, 6656, 6678, 6688, 6740, 6823, 6823, 6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7098, 7141, 7168, 7203, 7245, 7247, 7258, 7293, 7401, 7404, 7406, 7409, 7413, 7414, 7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11502, 11506, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11823, 11823, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438, 12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40908, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539, 42560, 42606, 42623, 42647, 42656, 42735, 42775, 42783, 42786, 42888, 42891, 42894, 42896, 42899, 42912, 42922, 43000, 43009, 43011, 43013, 43015, 43018, 43020, 43042, 43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259, 43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442, 43471, 43471, 43520, 43560, 43584, 43586, 43588, 43595, 43616, 43638, 43642, 43642, 43648, 43695, 43697, 43697, 43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714, 43739, 43741, 43744, 43754, 43762, 43764, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43968, 44002, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        var unicodeES5IdentifierPart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 768, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1155, 1159, 1162, 1319, 1329, 1366, 1369, 1369, 1377, 1415, 1425, 1469, 1471, 1471, 1473, 1474, 1476, 1477, 1479, 1479, 1488, 1514, 1520, 1522, 1552, 1562, 1568, 1641, 1646, 1747, 1749, 1756, 1759, 1768, 1770, 1788, 1791, 1791, 1808, 1866, 1869, 1969, 1984, 2037, 2042, 2042, 2048, 2093, 2112, 2139, 2208, 2208, 2210, 2220, 2276, 2302, 2304, 2403, 2406, 2415, 2417, 2423, 2425, 2431, 2433, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2500, 2503, 2504, 2507, 2510, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2561, 2563, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2641, 2641, 2649, 2652, 2654, 2654, 2662, 2677, 2689, 2691, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2787, 2790, 2799, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2876, 2884, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2915, 2918, 2927, 2929, 2929, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3024, 3024, 3031, 3031, 3046, 3055, 3073, 3075, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3133, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3160, 3161, 3168, 3171, 3174, 3183, 3202, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3260, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3299, 3302, 3311, 3313, 3314, 3330, 3331, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3396, 3398, 3400, 3402, 3406, 3415, 3415, 3424, 3427, 3430, 3439, 3450, 3455, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3769, 3771, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3807, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3948, 3953, 3972, 3974, 3991, 3993, 4028, 4038, 4038, 4096, 4169, 4176, 4253, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4957, 4959, 4992, 5007, 5024, 5108, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900, 5902, 5908, 5920, 5940, 5952, 5971, 5984, 5996, 5998, 6000, 6002, 6003, 6016, 6099, 6103, 6103, 6108, 6109, 6112, 6121, 6155, 6157, 6160, 6169, 6176, 6263, 6272, 6314, 6320, 6389, 6400, 6428, 6432, 6443, 6448, 6459, 6470, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6608, 6617, 6656, 6683, 6688, 6750, 6752, 6780, 6783, 6793, 6800, 6809, 6823, 6823, 6912, 6987, 6992, 7001, 7019, 7027, 7040, 7155, 7168, 7223, 7232, 7241, 7245, 7293, 7376, 7378, 7380, 7414, 7424, 7654, 7676, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8204, 8205, 8255, 8256, 8276, 8276, 8305, 8305, 8319, 8319, 8336, 8348, 8400, 8412, 8417, 8417, 8421, 8432, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11647, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11744, 11775, 11823, 11823, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12348, 12353, 12438, 12441, 12442, 12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40908, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42539, 42560, 42607, 42612, 42621, 42623, 42647, 42655, 42737, 42775, 42783, 42786, 42888, 42891, 42894, 42896, 42899, 42912, 42922, 43000, 43047, 43072, 43123, 43136, 43204, 43216, 43225, 43232, 43255, 43259, 43259, 43264, 43309, 43312, 43347, 43360, 43388, 43392, 43456, 43471, 43481, 43520, 43574, 43584, 43597, 43600, 43609, 43616, 43638, 43642, 43643, 43648, 43714, 43739, 43741, 43744, 43759, 43762, 43766, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43968, 44010, 44012, 44013, 44016, 44025, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65024, 65039, 65056, 65062, 65075, 65076, 65101, 65103, 65136, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        var unicodeES3IdentifierStart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 543, 546, 563, 592, 685, 688, 696, 699, 705, 720, 721, 736, 740, 750, 750, 890, 890, 902, 902, 904, 906, 908, 908, 910, 929, 931, 974, 976, 983, 986, 1011, 1024, 1153, 1164, 1220, 1223, 1224, 1227, 1228, 1232, 1269, 1272, 1273, 1329, 1366, 1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1569, 1594, 1600, 1610, 1649, 1747, 1749, 1749, 1765, 1766, 1786, 1788, 1808, 1808, 1810, 1836, 1920, 1957, 2309, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2524, 2525, 2527, 2529, 2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2699, 2701, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2784, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2870, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 2997, 2999, 3001, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3168, 3169, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3294, 3294, 3296, 3297, 3333, 3340, 3342, 3344, 3346, 3368, 3370, 3385, 3424, 3425, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3805, 3840, 3840, 3904, 3911, 3913, 3946, 3976, 3979, 4096, 4129, 4131, 4135, 4137, 4138, 4176, 4181, 4256, 4293, 4304, 4342, 4352, 4441, 4447, 4514, 4520, 4601, 4608, 4614, 4616, 4678, 4680, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4742, 4744, 4744, 4746, 4749, 4752, 4782, 4784, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4814, 4816, 4822, 4824, 4846, 4848, 4878, 4880, 4880, 4882, 4885, 4888, 4894, 4896, 4934, 4936, 4954, 5024, 5108, 5121, 5740, 5743, 5750, 5761, 5786, 5792, 5866, 6016, 6067, 6176, 6263, 6272, 6312, 7680, 7835, 7840, 7929, 7936, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8319, 8319, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8497, 8499, 8505, 8544, 8579, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12346, 12353, 12436, 12445, 12446, 12449, 12538, 12540, 12542, 12549, 12588, 12593, 12686, 12704, 12727, 13312, 19893, 19968, 40869, 40960, 42124, 44032, 55203, 63744, 64045, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65138, 65140, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        var unicodeES3IdentifierPart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 543, 546, 563, 592, 685, 688, 696, 699, 705, 720, 721, 736, 740, 750, 750, 768, 846, 864, 866, 890, 890, 902, 902, 904, 906, 908, 908, 910, 929, 931, 974, 976, 983, 986, 1011, 1024, 1153, 1155, 1158, 1164, 1220, 1223, 1224, 1227, 1228, 1232, 1269, 1272, 1273, 1329, 1366, 1369, 1369, 1377, 1415, 1425, 1441, 1443, 1465, 1467, 1469, 1471, 1471, 1473, 1474, 1476, 1476, 1488, 1514, 1520, 1522, 1569, 1594, 1600, 1621, 1632, 1641, 1648, 1747, 1749, 1756, 1759, 1768, 1770, 1773, 1776, 1788, 1808, 1836, 1840, 1866, 1920, 1968, 2305, 2307, 2309, 2361, 2364, 2381, 2384, 2388, 2392, 2403, 2406, 2415, 2433, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2492, 2494, 2500, 2503, 2504, 2507, 2509, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2562, 2562, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2649, 2652, 2654, 2654, 2662, 2676, 2689, 2691, 2693, 2699, 2701, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2784, 2790, 2799, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2870, 2873, 2876, 2883, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2913, 2918, 2927, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 2997, 2999, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3031, 3031, 3047, 3055, 3073, 3075, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3134, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3168, 3169, 3174, 3183, 3202, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3262, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3297, 3302, 3311, 3330, 3331, 3333, 3340, 3342, 3344, 3346, 3368, 3370, 3385, 3390, 3395, 3398, 3400, 3402, 3405, 3415, 3415, 3424, 3425, 3430, 3439, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3769, 3771, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3805, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3946, 3953, 3972, 3974, 3979, 3984, 3991, 3993, 4028, 4038, 4038, 4096, 4129, 4131, 4135, 4137, 4138, 4140, 4146, 4150, 4153, 4160, 4169, 4176, 4185, 4256, 4293, 4304, 4342, 4352, 4441, 4447, 4514, 4520, 4601, 4608, 4614, 4616, 4678, 4680, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4742, 4744, 4744, 4746, 4749, 4752, 4782, 4784, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4814, 4816, 4822, 4824, 4846, 4848, 4878, 4880, 4880, 4882, 4885, 4888, 4894, 4896, 4934, 4936, 4954, 4969, 4977, 5024, 5108, 5121, 5740, 5743, 5750, 5761, 5786, 5792, 5866, 6016, 6099, 6112, 6121, 6160, 6169, 6176, 6263, 6272, 6313, 7680, 7835, 7840, 7929, 7936, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8255, 8256, 8319, 8319, 8400, 8412, 8417, 8417, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8497, 8499, 8505, 8544, 8579, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12346, 12353, 12436, 12441, 12442, 12445, 12446, 12449, 12542, 12549, 12588, 12593, 12686, 12704, 12727, 13312, 19893, 19968, 40869, 40960, 42124, 44032, 55203, 63744, 64045, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65056, 65059, 65075, 65076, 65101, 65103, 65136, 65138, 65140, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65381, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        function isUnicodeIdentifierStart(code, languageVersion) {
            return languageVersion >= ScriptTarget.ES5 ?
                lookupInUnicodeMap(code, unicodeES5IdentifierStart) :
                lookupInUnicodeMap(code, unicodeES3IdentifierStart);
        }
        pxtc.isUnicodeIdentifierStart = isUnicodeIdentifierStart;
        function isUnicodeIdentifierPart(code, languageVersion) {
            return languageVersion >= ScriptTarget.ES5 ?
                lookupInUnicodeMap(code, unicodeES5IdentifierPart) :
                lookupInUnicodeMap(code, unicodeES3IdentifierPart);
        }
        function lookupInUnicodeMap(code, map) {
            // Bail out quickly if it couldn't possibly be in the map.
            if (code < map[0]) {
                return false;
            }
            // Perform binary search in one of the Unicode range maps
            var lo = 0;
            var hi = map.length;
            var mid;
            while (lo + 1 < hi) {
                mid = lo + (hi - lo) / 2;
                // mid has to be even to catch a range's beginning
                mid -= mid % 2;
                if (map[mid] <= code && code <= map[mid + 1]) {
                    return true;
                }
                if (code < map[mid]) {
                    hi = mid;
                }
                else {
                    lo = mid + 2;
                }
            }
            return false;
        }
        var DiagnosticCategory;
        (function (DiagnosticCategory) {
            DiagnosticCategory[DiagnosticCategory["Warning"] = 0] = "Warning";
            DiagnosticCategory[DiagnosticCategory["Error"] = 1] = "Error";
            DiagnosticCategory[DiagnosticCategory["Message"] = 2] = "Message";
        })(DiagnosticCategory = pxtc.DiagnosticCategory || (pxtc.DiagnosticCategory = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxt;
(function (pxt) {
    var webBluetooth;
    (function (webBluetooth) {
        function isAvailable() {
            return hasConsole() || hasPartialFlash();
        }
        webBluetooth.isAvailable = isAvailable;
        function hasConsole() {
            return !!navigator && !!navigator.bluetooth
                && ('TextDecoder' in window) // needed for reading data
                && pxt.appTarget.appTheme.bluetoothUartConsole
                && pxt.appTarget.appTheme.bluetoothUartFilters
                && pxt.appTarget.appTheme.bluetoothUartFilters.length > 0;
        }
        webBluetooth.hasConsole = hasConsole;
        function hasPartialFlash() {
            return !!navigator && !!navigator.bluetooth
                && !!pxt.appTarget.appTheme.bluetoothPartialFlashing;
        }
        webBluetooth.hasPartialFlash = hasPartialFlash;
        function isValidUUID(id) {
            // https://webbluetoothcg.github.io/web-bluetooth/#uuids
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
        }
        webBluetooth.isValidUUID = isValidUUID;
        var BLERemote = /** @class */ (function () {
            function BLERemote(id, aliveToken) {
                this.connectionTimeout = 20000; // 20 second default timeout
                this.connectPromise = undefined;
                this.id = id;
                this.aliveToken = aliveToken;
            }
            BLERemote.prototype.debug = function (msg) {
                pxt.debug(this.id + ": " + msg);
            };
            BLERemote.prototype.alivePromise = function (p) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    if (_this.aliveToken.isCancelled())
                        reject(new Error());
                    p.then(function (r) { return resolve(r); }, function (e) { return reject(e); });
                });
            };
            BLERemote.prototype.cancelConnect = function () {
                this.connectPromise = undefined;
            };
            BLERemote.prototype.createConnectPromise = function () {
                return Promise.resolve();
            };
            BLERemote.prototype.connectAsync = function () {
                var _this = this;
                if (!this.connectPromise)
                    this.connectPromise = this.alivePromise(this.createConnectPromise());
                return this.connectPromise
                    .timeout(this.connectionTimeout, "connection timeout")
                    .then(function () { return _this.aliveToken.throwIfCancelled(); })
                    .catch(function (e) {
                    // connection failed, clear promise to try again
                    _this.connectPromise = undefined;
                    throw e;
                });
            };
            BLERemote.prototype.disconnect = function () {
                this.cancelConnect();
            };
            BLERemote.prototype.kill = function () {
                this.disconnect();
                this.aliveToken.cancel();
            };
            return BLERemote;
        }());
        webBluetooth.BLERemote = BLERemote;
        var BLEService = /** @class */ (function (_super) {
            __extends(BLEService, _super);
            function BLEService(id, device, autoReconnect) {
                var _this = _super.call(this, id, device.aliveToken) || this;
                _this.device = device;
                _this.autoReconnect = autoReconnect;
                _this.autoReconnectDelay = 1000;
                _this.disconnectOnAutoReconnect = false;
                _this.reconnectPromise = undefined;
                _this.failedConnectionServicesVersion = -1;
                _this.handleDisconnected = _this.handleDisconnected.bind(_this);
                _this.device.device.addEventListener('gattserverdisconnected', _this.handleDisconnected);
                return _this;
            }
            BLEService.prototype.handleDisconnected = function (event) {
                var _this = this;
                if (this.aliveToken.isCancelled())
                    return;
                this.disconnect();
                // give a 1sec for device to reboot
                if (this.autoReconnect && !this.reconnectPromise)
                    this.reconnectPromise =
                        Promise.delay(this.autoReconnectDelay)
                            .then(function () { return _this.exponentialBackoffConnectAsync(8, 500); })
                            .finally(function () { return _this.reconnectPromise = undefined; });
            };
            /* Utils */
            // This function keeps calling "toTry" until promise resolves or has
            // retried "max" number of times. First retry has a delay of "delay" seconds.
            // "success" is called upon success.
            BLEService.prototype.exponentialBackoffConnectAsync = function (max, delay) {
                var _this = this;
                this.debug("retry connect");
                this.aliveToken.throwIfCancelled();
                return this.connectAsync()
                    .then(function () {
                    _this.aliveToken.throwIfCancelled();
                    _this.debug("reconnect success");
                    _this.reconnectPromise = undefined;
                })
                    .catch(function (e) {
                    _this.debug("reconnect error " + e.message);
                    _this.aliveToken.throwIfCancelled();
                    if (!_this.device.isPaired) {
                        _this.debug("give up, device unpaired");
                        _this.reconnectPromise = undefined;
                        return undefined;
                    }
                    if (!_this.autoReconnect) {
                        _this.debug("autoreconnect disabled");
                        _this.reconnectPromise = undefined;
                        return undefined;
                    }
                    if (max == 0) {
                        _this.debug("give up, max tries");
                        _this.reconnectPromise = undefined;
                        return undefined; // give up
                    }
                    // did we already try to reconnect with the current state of services?
                    if (_this.failedConnectionServicesVersion == _this.device.servicesVersion) {
                        _this.debug("services haven't changed, giving up");
                        _this.reconnectPromise = undefined;
                        return undefined;
                    }
                    _this.debug("retry connect " + delay + "ms... (" + max + " tries left)");
                    // record service version if connected
                    if (_this.device.connected)
                        _this.failedConnectionServicesVersion = _this.device.servicesVersion;
                    if (_this.disconnectOnAutoReconnect)
                        _this.device.disconnect();
                    return Promise.delay(delay)
                        .then(function () { return _this.exponentialBackoffConnectAsync(--max, delay * 1.8); });
                });
            };
            return BLEService;
        }(BLERemote));
        webBluetooth.BLEService = BLEService;
        var BLETXService = /** @class */ (function (_super) {
            __extends(BLETXService, _super);
            function BLETXService(id, device, serviceUUID, txCharacteristicUUID) {
                var _this = _super.call(this, id, device, true) || this;
                _this.device = device;
                _this.serviceUUID = serviceUUID;
                _this.txCharacteristicUUID = txCharacteristicUUID;
                _this.handleValueChanged = _this.handleValueChanged.bind(_this);
                return _this;
            }
            BLETXService.prototype.createConnectPromise = function () {
                var _this = this;
                this.debug("connecting");
                return this.device.connectAsync()
                    .then(function () { return _this.alivePromise(_this.device.gatt.getPrimaryService(_this.serviceUUID)); })
                    .then(function (service) {
                    _this.debug("service connected");
                    _this.service = service;
                    return _this.alivePromise(_this.service.getCharacteristic(_this.txCharacteristicUUID));
                }).then(function (txCharacteristic) {
                    _this.debug("tx characteristic connected");
                    _this.txCharacteristic = txCharacteristic;
                    _this.txCharacteristic.addEventListener('characteristicvaluechanged', _this.handleValueChanged);
                    return _this.txCharacteristic.startNotifications();
                }).then(function () {
                    pxt.tickEvent("webble.connected", { id: _this.id });
                });
            };
            BLETXService.prototype.handlePacket = function (data) {
            };
            BLETXService.prototype.handleValueChanged = function (event) {
                var dataView = event.target.value;
                this.handlePacket(dataView);
            };
            BLETXService.prototype.disconnect = function () {
                _super.prototype.disconnect.call(this);
                if (this.txCharacteristic && this.device && this.device.connected) {
                    try {
                        this.txCharacteristic.stopNotifications();
                        this.txCharacteristic.removeEventListener('characteristicvaluechanged', this.handleValueChanged);
                    }
                    catch (e) {
                        pxt.log(this.id + ": error " + e.message);
                    }
                }
                this.service = undefined;
                this.txCharacteristic = undefined;
            };
            return BLETXService;
        }(BLEService));
        webBluetooth.BLETXService = BLETXService;
        var HF2Service = /** @class */ (function (_super) {
            __extends(HF2Service, _super);
            function HF2Service(device) {
                var _this = _super.call(this, "hf2", device, HF2Service.SERVICE_UUID, HF2Service.CHARACTERISTIC_TX_UUID) || this;
                _this.device = device;
                return _this;
            }
            HF2Service.prototype.handlePacket = function (data) {
                var cmd = data.getUint8(0);
                switch (cmd & 0xc0) {
                    case HF2Service.BLEHF2_FLAG_SERIAL_OUT:
                    case HF2Service.BLEHF2_FLAG_SERIAL_ERR:
                        var n = Math.min(data.byteLength - 1, cmd & ~0xc0); // length in bytes
                        var text = "";
                        for (var i = 0; i < n; ++i)
                            text += String.fromCharCode(data.getUint8(i + 1));
                        if (text) {
                            window.postMessage({
                                type: "serial",
                                id: this.device.name || "hf2",
                                data: text
                            }, "*");
                        }
                        break;
                }
            };
            HF2Service.SERVICE_UUID = 'b112f5e6-2679-30da-a26e-0273b6043849';
            HF2Service.CHARACTERISTIC_TX_UUID = 'b112f5e6-2679-30da-a26e-0273b604384a';
            HF2Service.BLEHF2_FLAG_SERIAL_OUT = 0x80;
            HF2Service.BLEHF2_FLAG_SERIAL_ERR = 0xC0;
            return HF2Service;
        }(BLETXService));
        webBluetooth.HF2Service = HF2Service;
        var UARTService = /** @class */ (function (_super) {
            __extends(UARTService, _super);
            function UARTService(device) {
                var _this = _super.call(this, "uart", device, UARTService.SERVICE_UUID, UARTService.CHARACTERISTIC_TX_UUID) || this;
                _this.device = device;
                return _this;
            }
            UARTService.prototype.handlePacket = function (data) {
                var decoder = new window.TextDecoder();
                var text = decoder.decode(data);
                if (text) {
                    window.postMessage({
                        type: "serial",
                        id: this.device.name || "uart",
                        data: text
                    }, "*");
                }
            };
            // Nordic UART BLE service
            UARTService.SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // must be lower case!
            UARTService.CHARACTERISTIC_TX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
            return UARTService;
        }(BLETXService));
        webBluetooth.UARTService = UARTService;
        var PartialFlashingState;
        (function (PartialFlashingState) {
            PartialFlashingState[PartialFlashingState["Idle"] = 1] = "Idle";
            PartialFlashingState[PartialFlashingState["StatusRequested"] = 2] = "StatusRequested";
            PartialFlashingState[PartialFlashingState["PairingModeRequested"] = 4] = "PairingModeRequested";
            PartialFlashingState[PartialFlashingState["RegionDALRequested"] = 8] = "RegionDALRequested";
            PartialFlashingState[PartialFlashingState["RegionMakeCodeRequested"] = 16] = "RegionMakeCodeRequested";
            PartialFlashingState[PartialFlashingState["Flash"] = 32] = "Flash";
            PartialFlashingState[PartialFlashingState["EndOfTransmision"] = 64] = "EndOfTransmision";
            PartialFlashingState[PartialFlashingState["USBFlashRequired"] = 128] = "USBFlashRequired";
        })(PartialFlashingState || (PartialFlashingState = {}));
        // https://github.com/microbit-sam/microbit-docs/blob/master/docs/ble/partial-flashing-service.md
        var PartialFlashingService = /** @class */ (function (_super) {
            __extends(PartialFlashingService, _super);
            function PartialFlashingService(device) {
                var _this = _super.call(this, "partial flashing", device, false) || this;
                _this.device = device;
                _this.state = PartialFlashingState.Idle;
                _this.disconnectOnAutoReconnect = true;
                _this.handleCharacteristic = _this.handleCharacteristic.bind(_this);
                return _this;
            }
            PartialFlashingService.prototype.clearFlashData = function () {
                this.version = 0;
                this.mode = 0;
                this.regions = [];
                this.chunkDelay = PartialFlashingService.CHUNK_MIN_DELAY;
                this.hex = undefined;
                this.bin = undefined;
                this.magicOffset = undefined;
                this.dalHash = undefined;
                this.makeCodeHash = undefined;
                this.flashReject = undefined;
                this.flashResolve = undefined;
                this.flashOffset = undefined;
            };
            PartialFlashingService.prototype.createConnectPromise = function () {
                var _this = this;
                this.debug("connecting to partial flash service");
                return this.device.connectAsync()
                    .then(function () { return _this.alivePromise(_this.device.gatt.getPrimaryService(PartialFlashingService.SERVICE_UUID)); })
                    .then(function (service) {
                    _this.debug("connecting to characteristic");
                    return _this.alivePromise(service.getCharacteristic(PartialFlashingService.CHARACTERISTIC_UUID));
                }).then(function (characteristic) {
                    _this.debug("starting notifications");
                    _this.pfCharacteristic = characteristic;
                    _this.pfCharacteristic.startNotifications();
                    _this.pfCharacteristic.addEventListener('characteristicvaluechanged', _this.handleCharacteristic);
                    // looks like we asked the device to reconnect in pairing mode, 
                    // let's see if that worked out
                    if (_this.state == PartialFlashingState.PairingModeRequested) {
                        _this.debug("checking pairing mode");
                        _this.autoReconnect = false;
                        return _this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.STATUS]));
                    }
                    return Promise.resolve();
                });
            };
            PartialFlashingService.prototype.disconnect = function () {
                _super.prototype.disconnect.call(this);
                if (this.flashPacketToken)
                    this.flashPacketToken.cancel();
                if (this.pfCharacteristic && this.device.connected) {
                    try {
                        this.pfCharacteristic.stopNotifications();
                        this.pfCharacteristic.removeEventListener('characteristicvaluechanged', this.handleCharacteristic);
                    }
                    catch (e) {
                        pxt.log("ble: partial flash disconnect error " + e.message);
                    }
                }
                this.pfCharacteristic = undefined;
            };
            // finds block starting with MAGIC_BLOCK
            PartialFlashingService.prototype.findMarker = function (offset, marker) {
                if (!this.bin)
                    return -1;
                for (; offset + marker.length < this.bin.length; offset += 16) {
                    var match = true;
                    for (var j = 0; j < marker.length; ++j) {
                        if (marker[j] != this.bin[offset + j]) {
                            match = false;
                            break;
                        }
                    }
                    if (match)
                        return offset;
                }
                return -1;
            };
            PartialFlashingService.prototype.flashAsync = function (hex) {
                var _this = this;
                if (this.hex) {
                    this.debug("flashing already in progress");
                    return Promise.resolve();
                }
                this.device.pauseLog();
                return this.createFlashPromise(hex)
                    .finally(function () { return _this.device.resumeLogOnDisconnection(); });
            };
            PartialFlashingService.prototype.createFlashPromise = function (hex) {
                var _this = this;
                if (this.hex) {
                    this.debug("flashing already in progress");
                    return Promise.resolve();
                }
                this.clearFlashData();
                this.hex = hex;
                var uf2 = ts.pxtc.UF2.newBlockFile();
                ts.pxtc.UF2.writeHex(uf2, this.hex.split(/\r?\n/));
                var flashUsableEnd = pxt.appTarget.compile.flashUsableEnd;
                this.bin = ts.pxtc.UF2.toBin(pxt.U.stringToUint8Array(ts.pxtc.UF2.serializeFile(uf2)), flashUsableEnd).buf;
                this.debug("bin bytes " + this.bin.length);
                this.magicOffset = this.findMarker(0, PartialFlashingService.MAGIC_MARKER);
                this.debug("magic block " + this.magicOffset.toString(16));
                if (this.magicOffset < 0) {
                    this.debug("magic block not found, not a valid HEX file");
                    pxt.U.userError(lf("Invalid file"));
                }
                this.debug("bytes to flash " + (this.bin.length - this.magicOffset));
                // magic + 16bytes = hash
                var hashOffset = this.magicOffset + PartialFlashingService.MAGIC_MARKER.length;
                this.dalHash = pxt.Util.toHex(this.bin.slice(hashOffset, hashOffset + 8));
                this.makeCodeHash = pxt.Util.toHex(this.bin.slice(hashOffset + 8, hashOffset + 16));
                this.debug("DAL hash " + this.dalHash);
                this.debug("MakeCode hash " + this.makeCodeHash);
                return this.connectAsync()
                    .then(function () { return new Promise(function (resolve, reject) {
                    _this.flashResolve = resolve;
                    _this.flashReject = reject;
                    _this.debug("check service version");
                    _this.state = PartialFlashingState.StatusRequested;
                    return _this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.STATUS]));
                }); }).then(function () { }, function (e) {
                    pxt.log("pf: error " + e.message);
                    _this.clearFlashData();
                });
            };
            PartialFlashingService.prototype.checkStateTransition = function (cmd, acceptedStates) {
                if (!(this.state & acceptedStates)) {
                    this.debug("flash cmd " + cmd + " in state " + this.state.toString(16) + " ");
                    this.flashReject(new Error());
                    this.clearFlashData();
                    return false;
                }
                return true;
            };
            PartialFlashingService.prototype.handleCharacteristic = function (ev) {
                var _this = this;
                // check service is still alive
                if (this.aliveToken.isCancelled()) {
                    this.flashReject(new Error());
                    this.clearFlashData();
                }
                var dataView = event.target.value;
                var packet = new Uint8Array(dataView.buffer);
                var cmd = packet[0];
                //this.debug(`flash state ${this.state} - cmd ${cmd}`);
                if (this.state == PartialFlashingState.Idle)
                    return;
                switch (cmd) {
                    case PartialFlashingService.STATUS:
                        if (!this.checkStateTransition(cmd, PartialFlashingState.StatusRequested | PartialFlashingState.PairingModeRequested))
                            return;
                        this.version = packet[1];
                        this.mode = packet[2];
                        this.debug("flash service version " + this.version + " mode " + this.mode);
                        this.debug("reading DAL region");
                        this.state = PartialFlashingState.RegionDALRequested;
                        this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.REGION_INFO, PartialFlashingService.REGION_DAL]))
                            .then(function () { });
                        break;
                    case PartialFlashingService.REGION_INFO:
                        if (!this.checkStateTransition(cmd, PartialFlashingState.RegionDALRequested | PartialFlashingState.RegionMakeCodeRequested))
                            return;
                        var region = this.regions[packet[1]] = {
                            start: (packet[2] << 24) | (packet[3] << 16) | (packet[4] << 8) | packet[5],
                            end: (packet[6] << 24) | (packet[7] << 16) | (packet[8] << 8) | packet[9],
                            hash: pxt.Util.toHex(packet.slice(10))
                        };
                        this.debug("read region " + packet[1] + " start " + region.start.toString(16) + " end " + region.end.toString(16) + " hash " + region.hash);
                        if (packet[1] == PartialFlashingService.REGION_DAL) {
                            if (region.hash != this.dalHash) {
                                pxt.tickEvent("webble.flash.DALrequired");
                                this.debug("DAL hash does not match, partial flashing not possible");
                                this.state = PartialFlashingState.USBFlashRequired;
                                this.flashReject(new Error("USB flashing required"));
                                this.clearFlashData();
                                return;
                            }
                            this.debug("DAL hash match, reading makecode region");
                            this.state = PartialFlashingState.RegionMakeCodeRequested;
                            this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.REGION_INFO, PartialFlashingService.REGION_MAKECODE]))
                                .then(function () { });
                        }
                        else if (packet[1] == PartialFlashingService.REGION_MAKECODE) {
                            if (region.start != this.magicOffset) {
                                this.debug("magic offset and MakeCode region.start not matching");
                                pxt.U.userError(lf("Invalid file"));
                            }
                            if (region.hash == this.makeCodeHash) {
                                pxt.tickEvent("webble.flash.noop");
                                this.debug("MakeCode hash matches, same code!");
                                // always restart even to match USB drag and drop behavior
                                this.debug("restart application mode");
                                this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.RESET, PartialFlashingService.MODE_APPLICATION]))
                                    .then(function () {
                                    _this.state = PartialFlashingState.Idle;
                                    _this.flashResolve();
                                    _this.clearFlashData();
                                });
                            }
                            else {
                                // must be in pairing mode
                                if (this.mode != PartialFlashingService.MODE_PAIRING) {
                                    this.debug("application mode, reset into pairing mode");
                                    this.state = PartialFlashingState.PairingModeRequested;
                                    this.autoReconnect = true;
                                    this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.RESET, PartialFlashingService.MODE_PAIRING]))
                                        .then(function () { });
                                    return;
                                }
                                // ready to flash the data in 4 chunks
                                this.flashOffset = region.start;
                                this.flashPacketNumber = 0;
                                this.debug("starting to flash from address " + this.flashOffset.toString(16));
                                this.flashNextPacket();
                            }
                        }
                        break;
                    case PartialFlashingService.FLASH_DATA:
                        if (!this.checkStateTransition(cmd, PartialFlashingState.Flash))
                            return;
                        switch (packet[1]) {
                            case PartialFlashingService.PACKET_OUT_OF_ORDER:
                                this.debug("packet out of order");
                                this.flashPacketToken.cancel(); // cancel pending writes
                                this.flashPacketNumber += 4;
                                this.chunkDelay = Math.min(this.chunkDelay + 10, PartialFlashingService.CHUNK_MAX_DELAY);
                                this.flashNextPacket();
                                break;
                            case PartialFlashingService.PACKET_WRITTEN:
                                this.chunkDelay = Math.max(this.chunkDelay - 1, PartialFlashingService.CHUNK_MIN_DELAY);
                                // move cursor
                                this.flashOffset += 64;
                                this.flashPacketNumber += 4;
                                if (this.flashOffset >= this.bin.length) {
                                    this.debug('end transmission');
                                    this.state = PartialFlashingState.EndOfTransmision;
                                    this.pfCharacteristic.writeValue(new Uint8Array([PartialFlashingService.END_OF_TRANSMISSION]))
                                        .finally(function () {
                                        // we are done!
                                        if (_this.flashResolve)
                                            _this.flashResolve();
                                        _this.clearFlashData();
                                    });
                                }
                                else {
                                    this.flashNextPacket();
                                }
                                break;
                        }
                        break;
                    default:
                        this.debug("unknown message " + pxt.Util.toHex(packet));
                        this.disconnect();
                        break;
                }
            };
            // send 64bytes in 4 BLE packets
            PartialFlashingService.prototype.flashNextPacket = function () {
                var _this = this;
                this.state = PartialFlashingState.Flash;
                this.flashPacketToken = new pxt.Util.CancellationToken();
                this.flashPacketToken.startOperation();
                var hex = this.bin.slice(this.flashOffset, this.flashOffset + 64);
                this.debug("flashing " + this.flashOffset.toString(16) + " / " + this.bin.length.toString(16) + " " + (((this.flashOffset - this.magicOffset) / (this.bin.length - this.magicOffset) * 100) >> 0) + "%");
                // add delays or chrome crashes
                var chunk = new Uint8Array(20);
                Promise.delay(this.chunkDelay)
                    .then(function () {
                    _this.flashPacketToken.throwIfCancelled();
                    chunk[0] = PartialFlashingService.FLASH_DATA;
                    chunk[1] = (_this.flashOffset >> 8) & 0xff;
                    chunk[2] = (_this.flashOffset >> 0) & 0xff;
                    chunk[3] = _this.flashPacketNumber; // packet number
                    for (var i = 0; i < 16; i++)
                        chunk[4 + i] = hex[i];
                    //this.debug(`chunk 0 ${Util.toHex(chunk)}`)
                    return _this.pfCharacteristic.writeValue(chunk);
                }).delay(this.chunkDelay).then(function () {
                    _this.flashPacketToken.throwIfCancelled();
                    chunk[0] = PartialFlashingService.FLASH_DATA;
                    chunk[1] = (_this.flashOffset >> 24) & 0xff;
                    chunk[2] = (_this.flashOffset >> 16) & 0xff;
                    chunk[3] = _this.flashPacketNumber + 1; // packet number
                    for (var i = 0; i < 16; i++)
                        chunk[4 + i] = hex[16 + i] || 0;
                    //this.debug(`chunk 1 ${Util.toHex(chunk)}`)
                    return _this.pfCharacteristic.writeValue(chunk);
                }).delay(this.chunkDelay).then(function () {
                    _this.flashPacketToken.throwIfCancelled();
                    chunk[0] = PartialFlashingService.FLASH_DATA;
                    chunk[1] = 0;
                    chunk[2] = 0;
                    chunk[3] = _this.flashPacketNumber + 2; // packet number
                    for (var i = 0; i < 16; i++)
                        chunk[4 + i] = hex[32 + i] || 0;
                    //this.debug(`chunk 2 ${Util.toHex(chunk)}`)
                    return _this.pfCharacteristic.writeValue(chunk);
                }).delay(this.chunkDelay).then(function () {
                    _this.flashPacketToken.throwIfCancelled();
                    chunk[0] = PartialFlashingService.FLASH_DATA;
                    chunk[1] = 0;
                    chunk[2] = 0;
                    chunk[3] = _this.flashPacketNumber + 3; // packet number
                    for (var i = 0; i < 16; i++)
                        chunk[4 + i] = hex[48 + i] || 0;
                    //this.debug(`chunk 3 ${Util.toHex(chunk)}`)
                    return _this.pfCharacteristic.writeValue(chunk);
                }).then(function () {
                    // give 500ms (A LOT) to process packet or consider the protocol stuck
                    // and send a bogus package to trigger an out of order situations
                    var currentFlashOffset = _this.flashOffset;
                    var transferDaemonAsync = function () {
                        return Promise.delay(500)
                            .then(function () {
                            // are we stuck?
                            if (currentFlashOffset != _this.flashOffset // transfer ok
                                || _this.flashPacketToken.isCancelled() // transfer cancelled
                                || _this.aliveToken.isCancelled() // service is closed
                                || _this.state != PartialFlashingState.Flash // flash state changed
                            )
                                return Promise.resolve();
                            // we are definitely stuck
                            _this.debug("packet transfer deadlock, force restart");
                            chunk[0] = PartialFlashingService.FLASH_DATA;
                            chunk[1] = 0;
                            chunk[2] = 0;
                            chunk[3] = ~0; // bobus packet number
                            for (var i = 0; i < 16; i++)
                                chunk[4 + i] = 0;
                            return _this.pfCharacteristic.writeValue(chunk)
                                .then(function () { return transferDaemonAsync(); });
                        });
                    };
                    transferDaemonAsync()
                        .catch(function (e) {
                        // something went clearly wrong
                        if (_this.flashReject) {
                            _this.flashReject(new Error("failed packet transfer"));
                            _this.clearFlashData();
                        }
                    });
                }).catch(function () {
                    _this.flashPacketToken.resolveCancel();
                });
            };
            PartialFlashingService.SERVICE_UUID = 'e97dd91d-251d-470a-a062-fa1922dfa9a8';
            PartialFlashingService.CHARACTERISTIC_UUID = 'e97d3b10-251d-470a-a062-fa1922dfa9a8';
            PartialFlashingService.REGION_INFO = 0x00;
            PartialFlashingService.FLASH_DATA = 0x01;
            PartialFlashingService.PACKET_OUT_OF_ORDER = 0xAA;
            PartialFlashingService.PACKET_WRITTEN = 0xFF;
            PartialFlashingService.END_OF_TRANSMISSION = 0x02;
            PartialFlashingService.STATUS = 0xEE;
            PartialFlashingService.RESET = 0xFF;
            PartialFlashingService.MODE_PAIRING = 0;
            PartialFlashingService.MODE_APPLICATION = 0x01;
            PartialFlashingService.REGION_SOFTDEVICE = 0x00;
            PartialFlashingService.REGION_DAL = 0x01;
            PartialFlashingService.REGION_MAKECODE = 0x02;
            PartialFlashingService.MAGIC_MARKER = pxt.Util.fromHex('708E3B92C615A841C49866C975EE5197');
            PartialFlashingService.CHUNK_MIN_DELAY = 0;
            PartialFlashingService.CHUNK_MAX_DELAY = 75;
            return PartialFlashingService;
        }(BLEService));
        webBluetooth.PartialFlashingService = PartialFlashingService;
        var BLEDevice = /** @class */ (function (_super) {
            __extends(BLEDevice, _super);
            function BLEDevice(device) {
                var _this = _super.call(this, "ble", new pxt.Util.CancellationToken()) || this;
                _this.device = undefined;
                _this.services = [];
                _this.pendingResumeLogOnDisconnection = false;
                _this.servicesVersion = 0;
                _this.device = device;
                _this.handleDisconnected = _this.handleDisconnected.bind(_this);
                _this.handleServiceAdded = _this.handleServiceAdded.bind(_this);
                _this.handleServiceChanged = _this.handleServiceChanged.bind(_this);
                _this.handleServiceRemoved = _this.handleServiceRemoved.bind(_this);
                _this.device.addEventListener('gattserverdisconnected', _this.handleDisconnected);
                _this.device.addEventListener('serviceadded', _this.handleServiceAdded);
                _this.device.addEventListener('servicechanged', _this.handleServiceChanged);
                _this.device.addEventListener('serviceremoved', _this.handleServiceRemoved);
                if (hasConsole()) {
                    _this.services.push(_this.uartService = new UARTService(_this));
                    _this.services.push(_this.hf2Service = new HF2Service(_this));
                }
                if (hasPartialFlash())
                    _this.services.push(_this.partialFlashingService = new PartialFlashingService(_this));
                _this.aliveToken.startOperation();
                return _this;
            }
            BLEDevice.prototype.startServices = function () {
                this.services.filter(function (service) { return service.autoReconnect; })
                    .forEach(function (service) { return service.connectAsync().catch(function () { }); });
            };
            BLEDevice.prototype.pauseLog = function () {
                if (this.uartService) {
                    this.uartService.autoReconnect = false;
                    this.uartService.disconnect();
                }
                if (this.hf2Service) {
                    this.hf2Service.autoReconnect = false;
                    this.hf2Service.disconnect();
                }
            };
            BLEDevice.prototype.resumeLogOnDisconnection = function () {
                this.pendingResumeLogOnDisconnection = true;
            };
            BLEDevice.prototype.resumeLog = function () {
                if (this.uartService) {
                    this.uartService.autoReconnect = true;
                    this.uartService.connectAsync().catch(function () { });
                }
                if (this.hf2Service) {
                    this.hf2Service.autoReconnect = true;
                    this.hf2Service.connectAsync().catch(function () { });
                }
            };
            Object.defineProperty(BLEDevice.prototype, "isPaired", {
                get: function () {
                    return this === webBluetooth.bleDevice;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(BLEDevice.prototype, "name", {
                get: function () {
                    return this.device.name || "?";
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(BLEDevice.prototype, "connected", {
                get: function () {
                    return this.device && this.device.gatt && this.device.gatt.connected;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(BLEDevice.prototype, "gatt", {
                get: function () {
                    return this.device.gatt;
                },
                enumerable: true,
                configurable: true
            });
            BLEDevice.prototype.createConnectPromise = function () {
                var _this = this;
                this.debug("connecting gatt server");
                return this.alivePromise(this.device.gatt.connect()
                    .then(function () { return _this.debug("gatt server connected"); }));
            };
            BLEDevice.prototype.handleServiceAdded = function (event) {
                this.debug("service added");
                this.servicesVersion++;
            };
            BLEDevice.prototype.handleServiceRemoved = function (event) {
                this.debug("service removed");
                this.servicesVersion++;
            };
            BLEDevice.prototype.handleServiceChanged = function (event) {
                this.debug("service changed");
                this.servicesVersion++;
            };
            BLEDevice.prototype.handleDisconnected = function (event) {
                var _this = this;
                this.debug("disconnected");
                this.disconnect();
                if (this.pendingResumeLogOnDisconnection) {
                    this.pendingResumeLogOnDisconnection = false;
                    Promise.delay(500).then(function () { return _this.resumeLog(); });
                }
            };
            BLEDevice.prototype.disconnect = function () {
                _super.prototype.disconnect.call(this);
                this.services.forEach(function (service) { return service.disconnect(); });
                if (!this.connected)
                    return;
                this.debug("disconnect");
                try {
                    if (this.device.gatt && this.device.gatt.connected)
                        this.device.gatt.disconnect();
                }
                catch (e) {
                    this.debug("gatt disconnect error " + e.message);
                }
            };
            return BLEDevice;
        }(BLERemote));
        webBluetooth.BLEDevice = BLEDevice;
        webBluetooth.bleDevice = undefined;
        function connectAsync() {
            if (webBluetooth.bleDevice)
                return Promise.resolve();
            pxt.log("ble: requesting device");
            var optionalServices = [];
            if (hasConsole()) {
                optionalServices.push(UARTService.SERVICE_UUID);
                optionalServices.push(HF2Service.SERVICE_UUID);
            }
            if (hasPartialFlash())
                optionalServices.push(PartialFlashingService.SERVICE_UUID);
            return navigator.bluetooth.requestDevice({
                filters: pxt.appTarget.appTheme.bluetoothUartFilters,
                optionalServices: optionalServices
            }).then(function (device) {
                pxt.log("ble: received device " + device.name);
                webBluetooth.bleDevice = new BLEDevice(device);
                webBluetooth.bleDevice.startServices(); // some services have rety logic even if the first GATT connect fails
                return webBluetooth.bleDevice.connectAsync();
            });
        }
        function isPaired() {
            return !!webBluetooth.bleDevice;
        }
        webBluetooth.isPaired = isPaired;
        function pairAsync() {
            if (webBluetooth.bleDevice) {
                webBluetooth.bleDevice.kill();
                webBluetooth.bleDevice = undefined;
            }
            return connectAsync()
                .catch(function (e) {
                if (webBluetooth.bleDevice && webBluetooth.bleDevice.aliveToken)
                    webBluetooth.bleDevice.aliveToken.resolveCancel();
                pxt.log("ble: error " + e.message);
            });
        }
        webBluetooth.pairAsync = pairAsync;
        function flashAsync(resp, d) {
            if (d === void 0) { d = {}; }
            pxt.tickEvent("webble.flash");
            var hex = resp.outfiles[ts.pxtc.BINARY_HEX];
            return connectAsync()
                .then(function () { return webBluetooth.bleDevice.partialFlashingService.flashAsync(hex); })
                .then(function () { return pxt.tickEvent("webble.flash.success"); })
                .catch(function (e) {
                pxt.tickEvent("webble.fail.fail", { "message": e.message });
                throw e;
            });
        }
        webBluetooth.flashAsync = flashAsync;
    })(webBluetooth = pxt.webBluetooth || (pxt.webBluetooth = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var usb;
    (function (usb) {
        var USBError = /** @class */ (function (_super) {
            __extends(USBError, _super);
            function USBError(msg) {
                var _this = _super.call(this, msg) || this;
                _this.message = msg;
                return _this;
            }
            return USBError;
        }(Error));
        usb.USBError = USBError;
        var controlTransferGetReport = 0x01;
        var controlTransferSetReport = 0x09;
        var controlTransferOutReport = 0x200;
        var controlTransferInReport = 0x100;
        // this is for HF2
        usb.filters = [{
                classCode: 255,
                subclassCode: 42,
            }
        ];
        var isHF2 = true;
        function setFilters(f) {
            isHF2 = false;
            usb.filters = f;
        }
        usb.setFilters = setFilters;
        ;
        ;
        ;
        var HID = /** @class */ (function () {
            function HID(dev) {
                var _this = this;
                this.dev = dev;
                this.ready = false;
                this.readLoopStarted = false;
                this.onData = function (v) { };
                this.onError = function (e) { };
                this.onEvent = function (v) { };
                navigator.usb.addEventListener('disconnect', function (event) {
                    if (event.device == _this.dev) {
                        _this.log("Device disconnected");
                        _this.clearDev();
                    }
                });
            }
            HID.prototype.clearDev = function () {
                this.dev = null;
                this.epIn = null;
                this.epOut = null;
            };
            HID.prototype.error = function (msg) {
                throw new USBError(pxt.U.lf("USB error on device {0} ({1})", this.dev.productName, msg));
            };
            HID.prototype.log = function (msg) {
                msg = "WebUSB: " + msg;
                pxt.log(msg);
                //pxt.debug(msg)
            };
            HID.prototype.disconnectAsync = function () {
                var _this = this;
                if (!this.dev)
                    return Promise.resolve();
                this.ready = false;
                this.log("close device");
                return this.dev.close()
                    .catch(function (e) {
                    // just ignore errors closing, most likely device just disconnected
                })
                    .then(function () {
                    _this.clearDev();
                    return Promise.delay(500);
                });
            };
            HID.prototype.reconnectAsync = function () {
                var _this = this;
                this.log("reconnect");
                return this.disconnectAsync()
                    .then(getDeviceAsync)
                    .then(function (dev) {
                    _this.log("got device: " + dev.manufacturerName + " " + dev.productName);
                    _this.dev = dev;
                    return _this.initAsync();
                });
            };
            HID.prototype.sendPacketAsync = function (pkt) {
                var _this = this;
                if (!this.dev)
                    return Promise.reject(new Error("Disconnected"));
                pxt.Util.assert(pkt.length <= 64);
                if (!this.epOut) {
                    return this.dev.controlTransferOut({
                        requestType: "class",
                        recipient: "interface",
                        request: controlTransferSetReport,
                        value: controlTransferOutReport,
                        index: this.iface.interfaceNumber
                    }, pkt).then(function (res) {
                        if (res.status != "ok")
                            _this.error("USB CTRL OUT transfer failed");
                        else if (!isHF2)
                            _this.recvOne();
                    });
                }
                return this.dev.transferOut(this.epOut.endpointNumber, pkt)
                    .then(function (res) {
                    if (res.status != "ok")
                        _this.error("USB OUT transfer failed");
                });
            };
            HID.prototype.recvOne = function () {
                var _this = this;
                this.recvPacketAsync()
                    .then(function (buf) {
                    _this.onData(buf);
                }, function (err) {
                    _this.onError(err);
                });
            };
            HID.prototype.readLoop = function () {
                var _this = this;
                if (this.readLoopStarted)
                    return;
                this.readLoopStarted = true;
                this.log("start read loop");
                var loop = function () {
                    if (!_this.ready)
                        Promise.delay(300).then(loop);
                    else
                        _this.recvPacketAsync()
                            .then(function (buf) {
                            if (buf[0]) {
                                // we've got data; retry reading immedietly after processing it
                                _this.onData(buf);
                                loop();
                            }
                            else {
                                // throttle down if no data coming
                                Promise.delay(500).then(loop);
                            }
                        }, function (err) {
                            if (_this.dev)
                                _this.onError(err);
                            Promise.delay(300).then(loop);
                        });
                };
                loop();
            };
            HID.prototype.recvPacketAsync = function () {
                var _this = this;
                var final = function (res) {
                    if (res.status != "ok")
                        _this.error("USB IN transfer failed");
                    var arr = new Uint8Array(res.data.buffer);
                    if (arr.length == 0)
                        return _this.recvPacketAsync();
                    return arr;
                };
                if (!this.dev)
                    return Promise.reject(new Error("Disconnected"));
                if (!this.epIn) {
                    return this.dev.controlTransferIn({
                        requestType: "class",
                        recipient: "interface",
                        request: controlTransferGetReport,
                        value: controlTransferInReport,
                        index: this.iface.interfaceNumber
                    }, 64).then(final);
                }
                return this.dev.transferIn(this.epIn.endpointNumber, 64)
                    .then(final);
            };
            HID.prototype.initAsync = function () {
                var _this = this;
                if (!this.dev)
                    return Promise.reject(new Error("Disconnected"));
                var dev = this.dev;
                this.log("open device");
                return dev.open()
                    .then(function () {
                    _this.log("select configuration");
                    return dev.selectConfiguration(1);
                })
                    .then(function () {
                    var matchesFilters = function (iface) {
                        var a0 = iface.alternates[0];
                        for (var _i = 0, filters_1 = usb.filters; _i < filters_1.length; _i++) {
                            var f = filters_1[_i];
                            if (f.classCode == null || a0.interfaceClass === f.classCode) {
                                if (f.subclassCode == null || a0.interfaceSubclass === f.subclassCode) {
                                    if (f.protocolCode == null || a0.interfaceProtocol === f.protocolCode) {
                                        if (a0.endpoints.length == 0)
                                            return true;
                                        if (a0.endpoints.length == 2 &&
                                            a0.endpoints.every(function (e) { return e.packetSize == 64; }))
                                            return true;
                                    }
                                }
                            }
                        }
                        return false;
                    };
                    _this.log("got " + dev.configurations[0].interfaces.length + " interfaces");
                    var iface = dev.configurations[0].interfaces.filter(matchesFilters)[0];
                    if (!iface)
                        _this.error("cannot find supported USB interface");
                    _this.altIface = iface.alternates[0];
                    _this.iface = iface;
                    if (_this.altIface.endpoints.length) {
                        _this.epIn = _this.altIface.endpoints.filter(function (e) { return e.direction == "in"; })[0];
                        _this.epOut = _this.altIface.endpoints.filter(function (e) { return e.direction == "out"; })[0];
                        pxt.Util.assert(_this.epIn.packetSize == 64);
                        pxt.Util.assert(_this.epOut.packetSize == 64);
                    }
                    _this.log("claim interface");
                    return dev.claimInterface(iface.interfaceNumber);
                })
                    .then(function () {
                    _this.log("device ready");
                    _this.ready = true;
                    if (_this.epIn || isHF2)
                        _this.readLoop();
                });
            };
            return HID;
        }());
        function pairAsync() {
            return navigator.usb.requestDevice({
                filters: usb.filters
            }).then(function (dev) {
                // try connecting to it
                return mkPacketIOAsync();
            }).then(function (io) { return io.reconnectAsync(); });
        }
        usb.pairAsync = pairAsync;
        function isPairedAsync() {
            if (!usb.isEnabled)
                return Promise.resolve(false);
            return getDeviceAsync()
                .then(function (dev) {
                return true;
            })
                .catch(function () {
                return false;
            });
        }
        usb.isPairedAsync = isPairedAsync;
        function getDeviceAsync() {
            return navigator.usb.getDevices()
                .then(function (devs) {
                if (!devs || !devs.length) {
                    var err = new Error(pxt.U.lf("No USB device selected or connected; try pairing!"));
                    err.isUserError = true;
                    err.type = "devicenotfound";
                    throw err;
                }
                return devs[0];
            });
        }
        var getDevPromise;
        function mkPacketIOAsync() {
            if (!getDevPromise)
                getDevPromise = getDeviceAsync()
                    .then(function (dev) {
                    var h = new HID(dev);
                    return h.initAsync()
                        .then(function () { return h; });
                })
                    .catch(function (e) {
                    getDevPromise = null;
                    return Promise.reject(e);
                });
            return getDevPromise;
        }
        usb.mkPacketIOAsync = mkPacketIOAsync;
        usb.isEnabled = false;
        function setEnabled(v) {
            if (!isAvailable())
                v = false;
            usb.isEnabled = v;
        }
        usb.setEnabled = setEnabled;
        function isAvailable() {
            if (!!navigator.usb) {
                // Windows versions:
                // 5.1 - XP, 6.0 - Vista, 6.1 - Win7, 6.2 - Win8, 6.3 - Win8.1, 10.0 - Win10
                // If on Windows, and Windows is older 8.1, don't enable WebUSB,
                // as it requires signed INF files.
                var m = /Windows NT (\d+\.\d+)/.exec(navigator.userAgent);
                if (m && parseFloat(m[1]) < 6.3)
                    return false;
                return true;
            }
            return false;
        }
        usb.isAvailable = isAvailable;
    })(usb = pxt.usb || (pxt.usb = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var worker;
    (function (worker_1) {
        var U = pxt.Util;
        var workers = {};
        // Gets a cached worker for the given file
        function getWorker(workerFile) {
            var w = workers[workerFile];
            if (!w) {
                w = workers[workerFile] = makeWebWorker(workerFile);
            }
            return w;
        }
        worker_1.getWorker = getWorker;
        function wrap(send) {
            var pendingMsgs = {};
            var msgId = 0;
            var q = new U.PromiseQueue();
            var initPromise = new Promise(function (resolve, reject) {
                pendingMsgs["ready"] = resolve;
            });
            q.enqueue("main", function () { return initPromise; });
            var recvHandler = function (data) {
                if (pendingMsgs.hasOwnProperty(data.id)) {
                    var cb = pendingMsgs[data.id];
                    delete pendingMsgs[data.id];
                    cb(data.result);
                }
            };
            function opAsync(op, arg) {
                return q.enqueue("main", function () { return new Promise(function (resolve, reject) {
                    var id = "" + msgId++;
                    pendingMsgs[id] = function (v) {
                        if (!v) {
                            //pxt.reportError("worker", "no response")
                            reject(new Error("no response"));
                        }
                        else if (v.errorMessage) {
                            //pxt.reportError("worker", v.errorMessage)
                            reject(new Error(v.errorMessage));
                        }
                        else {
                            resolve(v);
                        }
                    };
                    send({ id: id, op: op, arg: arg });
                }); });
            }
            return { opAsync: opAsync, recvHandler: recvHandler };
        }
        worker_1.wrap = wrap;
        function makeWebWorker(workerFile) {
            var worker = new Worker(workerFile);
            var iface = wrap(function (v) { return worker.postMessage(v); });
            worker.onmessage = function (ev) {
                iface.recvHandler(ev.data);
            };
            return iface;
        }
        worker_1.makeWebWorker = makeWebWorker;
        function makeWebSocket(url, onOOB) {
            if (onOOB === void 0) { onOOB = null; }
            var ws = new WebSocket(url);
            var sendq = [];
            var iface = wrap(function (v) {
                var s = JSON.stringify(v);
                if (sendq)
                    sendq.push(s);
                else
                    ws.send(s);
            });
            ws.onmessage = function (ev) {
                var js = JSON.parse(ev.data);
                if (onOOB && js.id == null) {
                    onOOB(js);
                }
                else {
                    iface.recvHandler(js);
                }
            };
            ws.onopen = function (ev) {
                pxt.debug('socket opened');
                for (var _i = 0, sendq_1 = sendq; _i < sendq_1.length; _i++) {
                    var m = sendq_1[_i];
                    ws.send(m);
                }
                sendq = null;
            };
            ws.onclose = function (ev) {
                pxt.debug('socket closed');
            };
            ws.onerror = function (ev) {
                pxt.debug('socket errored');
            };
            return iface;
        }
        worker_1.makeWebSocket = makeWebSocket;
    })(worker = pxt.worker || (pxt.worker = {}));
})(pxt || (pxt = {}));
/* tslint:disable:no-conditional-assignment */
// TODO: add a macro facility to make 8-bit assembly easier?
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var assembler;
        (function (assembler) {
            assembler.debug = false;
            function lf(fmt) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return fmt.replace(/{(\d+)}/g, function (match, index) { return args[+index]; });
            }
            assembler.lf = lf;
            var badNameError = emitErr("opcode name doesn't match", "<name>");
            // An Instruction represents an instruction class with meta-variables
            // that should be substituted given an actually line (Line) of assembly
            // Thus, the Instruction helps us parse a sequence of tokens in a Line
            // as well as extract the relevant values to substitute for the meta-variables.
            // The Instruction also knows how to convert the particular instance into
            // machine code (EmitResult)
            var Instruction = /** @class */ (function () {
                function Instruction(ei, format, opcode, mask, is32bit) {
                    var _this = this;
                    this.opcode = opcode;
                    this.mask = mask;
                    this.is32bit = is32bit;
                    this.canBeShared = false;
                    pxtc.assert((opcode & mask) == opcode);
                    this.ei = ei;
                    this.code = format.replace(/\s+/g, " ");
                    this.friendlyFmt = format.replace(/\$\w+/g, function (m) {
                        if (_this.ei.encoders[m])
                            return _this.ei.encoders[m].pretty;
                        return m;
                    });
                    var words = tokenize(format);
                    this.name = words[0];
                    this.args = words.slice(1);
                }
                Instruction.prototype.emit = function (ln) {
                    var tokens = ln.words;
                    if (tokens[0] != this.name)
                        return badNameError;
                    var r = this.opcode;
                    var j = 1;
                    var stack = 0;
                    var numArgs = [];
                    var labelName = null;
                    var bit32_value = null;
                    var bit32_actual = null;
                    for (var i = 0; i < this.args.length; ++i) {
                        var formal = this.args[i];
                        var actual = tokens[j++];
                        if (formal[0] == "$") {
                            var enc = this.ei.encoders[formal];
                            var v = null;
                            if (enc.isRegister) {
                                v = this.ei.registerNo(actual);
                                if (v == null)
                                    return emitErr("expecting register name", actual);
                                if (this.ei.isPush(this.opcode))
                                    stack++;
                                else if (this.ei.isPop(this.opcode))
                                    stack--;
                            }
                            else if (enc.isImmediate) {
                                actual = actual.replace(/^#/, "");
                                v = ln.bin.parseOneInt(actual);
                                if (v == null) {
                                    return emitErr("expecting number", actual);
                                }
                                else {
                                    // explicit manipulation of stack pointer (SP)
                                    // ARM only
                                    if (this.ei.isAddSP(this.opcode))
                                        stack = -(v / this.ei.wordSize());
                                    else if (this.ei.isSubSP(this.opcode))
                                        stack = (v / this.ei.wordSize());
                                }
                            }
                            else if (enc.isRegList) {
                                // register lists are ARM-specific - this code not used in AVR 
                                if (actual != "{")
                                    return emitErr("expecting {", actual);
                                v = 0;
                                while (tokens[j] != "}") {
                                    actual = tokens[j++];
                                    if (!actual)
                                        return emitErr("expecting }", tokens[j - 2]);
                                    var no = this.ei.registerNo(actual);
                                    if (no == null)
                                        return emitErr("expecting register name", actual);
                                    if (v & (1 << no))
                                        return emitErr("duplicate register name", actual);
                                    v |= (1 << no);
                                    if (this.ei.isPush(this.opcode))
                                        stack++;
                                    else if (this.ei.isPop(this.opcode))
                                        stack--;
                                    if (tokens[j] == ",")
                                        j++;
                                }
                                actual = tokens[j++]; // skip close brace
                            }
                            else if (enc.isLabel) {
                                actual = actual.replace(/^#/, "");
                                if (/^[+-]?\d+$/.test(actual)) {
                                    v = parseInt(actual, 10);
                                    labelName = "rel" + v;
                                }
                                else if (/^0x[0-9a-fA-F]+$/.test(actual)) {
                                    v = parseInt(actual, 16);
                                    labelName = "abs" + v;
                                }
                                else {
                                    labelName = actual;
                                    v = this.ei.getAddressFromLabel(ln.bin, this, actual, enc.isWordAligned);
                                    if (v == null) {
                                        if (ln.bin.finalEmit)
                                            return emitErr("unknown label", actual);
                                        else
                                            // just need some value when we are 
                                            // doing some pass other than finalEmit
                                            v = 8; // needs to be divisible by 4 etc
                                    }
                                }
                                if (this.ei.is32bit(this)) {
                                    // console.log(actual + " " + v.toString())
                                    bit32_value = v;
                                    bit32_actual = actual;
                                    continue;
                                }
                            }
                            else {
                                pxtc.oops();
                            }
                            if (v == null)
                                return emitErr("didn't understand it", actual); // shouldn't happen
                            numArgs.push(v);
                            v = enc.encode(v);
                            // console.log("enc(v) = ",v)
                            if (v == null)
                                return emitErr("argument out of range or mis-aligned", actual);
                            pxtc.assert((r & v) == 0);
                            r |= v;
                        }
                        else if (formal == actual) {
                            // skip
                        }
                        else {
                            return emitErr("expecting " + formal, actual);
                        }
                    }
                    if (tokens[j])
                        return emitErr("trailing tokens", tokens[j]);
                    if (this.ei.is32bit(this)) {
                        return this.ei.emit32(r, bit32_value, ln.bin.normalizeExternalLabel(bit32_actual));
                    }
                    return {
                        stack: stack,
                        opcode: r,
                        numArgs: numArgs,
                        labelName: ln.bin.normalizeExternalLabel(labelName)
                    };
                };
                Instruction.prototype.toString = function () {
                    return this.friendlyFmt;
                };
                return Instruction;
            }());
            assembler.Instruction = Instruction;
            // represents a line of assembly from a file
            var Line = /** @class */ (function () {
                function Line(bin, text) {
                    this.bin = bin;
                    this.text = text;
                }
                Line.prototype.getOpExt = function () {
                    return this.instruction ? this.instruction.code : "";
                };
                Line.prototype.getOp = function () {
                    return this.instruction ? this.instruction.name : "";
                };
                Line.prototype.update = function (s) {
                    this.bin.peepOps++;
                    s = s.replace(/^\s*/, "");
                    if (!s)
                        this.bin.peepDel++;
                    if (s)
                        s += "      ";
                    s = "    " + s;
                    this.text = s + "; WAS: " + this.text.trim();
                    this.instruction = null;
                    this.numArgs = null;
                    this.words = tokenize(s) || [];
                    if (this.words.length == 0)
                        this.type = "empty";
                    else if (this.words[0][0] == "@")
                        this.type = "directive";
                };
                return Line;
            }());
            assembler.Line = Line;
            // File is the center of the action: parsing a file into a sequence of Lines
            // and also emitting the binary (buf)
            var File = /** @class */ (function () {
                function File(ei) {
                    this.baseOffset = 0;
                    this.checkStack = true;
                    this.inlineMode = false;
                    this.normalizeExternalLabel = function (n) { return n; };
                    this.currLineNo = 0;
                    this.scope = "";
                    this.scopeId = 0;
                    this.errors = [];
                    this.labels = {};
                    this.equs = {};
                    this.stackpointers = {};
                    this.stack = 0;
                    this.commPtr = 0;
                    this.peepOps = 0;
                    this.peepDel = 0;
                    this.peepCounts = {};
                    this.stats = "";
                    this.throwOnError = false;
                    this.disablePeepHole = false;
                    this.stackAtLabel = {};
                    this.currLine = new Line(this, "<start>");
                    this.currLine.lineNo = 0;
                    this.ei = ei;
                    this.ei.file = this;
                }
                File.prototype.emitShort = function (op) {
                    pxtc.assert(0 <= op && op <= 0xffff);
                    this.buf.push(op);
                };
                File.prototype.emitOpCode = function (op) {
                    this.emitShort(op);
                };
                File.prototype.location = function () {
                    // store one short (2 bytes) per buf location
                    return this.buf.length * 2;
                };
                File.prototype.pc = function () {
                    return this.location() + this.baseOffset;
                };
                // parsing of an "integer", well actually much more than 
                // just that
                File.prototype.parseOneInt = function (s) {
                    if (!s)
                        return null;
                    // fast path
                    if (/^\d+$/.test(s))
                        return parseInt(s, 10);
                    var minP = s.indexOf("-");
                    if (minP > 0)
                        return this.parseOneInt(s.slice(0, minP)) - this.parseOneInt(s.slice(minP + 1));
                    var mul = 1;
                    // recursive-descent parsing of multiplication
                    if (s.indexOf("*") >= 0) {
                        var m = null;
                        while (m = /^([^\*]*)\*(.*)$/.exec(s)) {
                            var tmp = this.parseOneInt(m[1]);
                            if (tmp == null)
                                return null;
                            mul *= tmp;
                            s = m[2];
                        }
                    }
                    if (s[0] == "-") {
                        mul *= -1;
                        s = s.slice(1);
                    }
                    else if (s[0] == "+") {
                        s = s.slice(1);
                    }
                    // decimal encoding; fast-ish path
                    if (/^\d+$/.test(s))
                        return mul * parseInt(s, 10);
                    // allow or'ing of 1 to least-signficant bit
                    if (pxtc.U.endsWith(s, "|1")) {
                        return this.parseOneInt(s.slice(0, s.length - 2)) | 1;
                    }
                    // allow subtracting 1 too
                    if (pxtc.U.endsWith(s, "-1")) {
                        return this.parseOneInt(s.slice(0, s.length - 2)) - 1;
                    }
                    // allow adding 1 too
                    if (pxtc.U.endsWith(s, "+1")) {
                        return this.parseOneInt(s.slice(0, s.length - 2)) + 1;
                    }
                    var shm = /(.*)>>(\d+)$/.exec(s);
                    if (shm) {
                        var left = this.parseOneInt(shm[1]);
                        var mask = this.baseOffset & ~0xffffff;
                        left &= ~mask;
                        return left >> parseInt(shm[2]);
                    }
                    var v = null;
                    // handle hexadecimal and binary encodings
                    if (s[0] == "0") {
                        if (s[1] == "x" || s[1] == "X") {
                            var m = /^0x([a-f0-9]+)$/i.exec(s);
                            if (m)
                                v = parseInt(m[1], 16);
                        }
                        else if (s[1] == "b" || s[1] == "B") {
                            var m = /^0b([01]+)$/i.exec(s);
                            if (m)
                                v = parseInt(m[1], 2);
                        }
                    }
                    // stack-specific processing
                    // more special characters to handle
                    if (s.indexOf("@") >= 0) {
                        var m = /^(\w+)@(-?\d+)$/.exec(s);
                        if (m) {
                            if (mul != 1)
                                this.directiveError(lf("multiplication not supported with saved stacks"));
                            if (this.stackpointers.hasOwnProperty(m[1])) {
                                // console.log(m[1] + ": " + this.stack + " " + this.stackpointers[m[1]] + " " + m[2])
                                v = this.ei.wordSize() * this.ei.computeStackOffset(m[1], this.stack - this.stackpointers[m[1]] + parseInt(m[2]));
                                // console.log(v)
                            }
                            else
                                this.directiveError(lf("saved stack not found"));
                        }
                        m = /^(.*)@(hi|lo|fn)$/.exec(s);
                        if (m && this.looksLikeLabel(m[1])) {
                            v = this.lookupLabel(m[1], true);
                            if (v != null) {
                                if (m[2] == "fn") {
                                    v = this.ei.toFnPtr(v, this.baseOffset, m[1]);
                                }
                                else {
                                    v >>= 1;
                                    if (0 <= v && v <= 0xffff) {
                                        if (m[2] == "hi")
                                            v = (v >> 8) & 0xff;
                                        else if (m[2] == "lo")
                                            v = v & 0xff;
                                        else
                                            pxtc.oops();
                                    }
                                    else {
                                        this.directiveError(lf("@hi/lo out of range"));
                                        v = null;
                                    }
                                }
                            }
                        }
                    }
                    if (v == null && this.looksLikeLabel(s)) {
                        v = this.lookupLabel(s, true);
                        if (v != null) {
                            if (this.ei.postProcessRelAddress(this, 1) == 1)
                                v += this.baseOffset;
                        }
                    }
                    if (v == null || isNaN(v))
                        return null;
                    return v * mul;
                };
                File.prototype.looksLikeLabel = function (name) {
                    if (/^(r\d|pc|sp|lr)$/i.test(name))
                        return false;
                    return /^[\.a-zA-Z_][\.:\w+]*$/.test(name);
                };
                File.prototype.scopedName = function (name) {
                    if (name[0] == "." && this.scope)
                        return this.scope + "$" + name;
                    else
                        return name;
                };
                File.prototype.lookupLabel = function (name, direct) {
                    if (direct === void 0) { direct = false; }
                    var v = null;
                    var scoped = this.scopedName(name);
                    if (this.labels.hasOwnProperty(scoped)) {
                        v = this.labels[scoped];
                        v = this.ei.postProcessRelAddress(this, v);
                    }
                    else if (this.lookupExternalLabel) {
                        v = this.lookupExternalLabel(name);
                        if (v != null) {
                            v = this.ei.postProcessAbsAddress(this, v);
                        }
                    }
                    if (v == null && this.equs.hasOwnProperty(scoped)) {
                        v = this.equs[scoped];
                        // no post-processing
                    }
                    if (v == null && direct) {
                        if (this.finalEmit) {
                            this.directiveError(lf("unknown label: {0}", name));
                        }
                        else
                            // use a number over 1 byte
                            v = 11111;
                    }
                    return v;
                };
                File.prototype.align = function (n) {
                    pxtc.assert(n == 2 || n == 4 || n == 8 || n == 16);
                    while (this.location() % n != 0)
                        this.emitOpCode(0);
                };
                File.prototype.pushError = function (msg, hints) {
                    if (hints === void 0) { hints = ""; }
                    var err = {
                        scope: this.scope,
                        message: lf("  -> Line {2} ('{1}'), error: {0}\n{3}", msg, this.currLine.text, this.currLine.lineNo, hints),
                        lineNo: this.currLine.lineNo,
                        line: this.currLine.text,
                        coremsg: msg,
                        hints: hints
                    };
                    this.errors.push(err);
                    if (this.throwOnError)
                        throw new Error(err.message);
                };
                File.prototype.directiveError = function (msg) {
                    this.pushError(msg);
                    // this.pushError(lf("directive error: {0}", msg))
                };
                File.prototype.emitString = function (l, utf16) {
                    if (utf16 === void 0) { utf16 = false; }
                    function byteAt(s, i) { return (s.charCodeAt(i) || 0) & 0xff; }
                    var m = /^\s*([\w\.]+\s*:\s*)?.\w+\s+(".*")\s*$/.exec(l);
                    var s;
                    if (!m || null == (s = parseString(m[2]))) {
                        this.directiveError(lf("expecting string"));
                    }
                    else {
                        this.align(2);
                        if (utf16) {
                            for (var i = 0; i < s.length; i++) {
                                this.emitShort(s.charCodeAt(i));
                            }
                        }
                        else {
                            // s.length + 1 to NUL terminate
                            for (var i = 0; i < s.length + 1; i += 2) {
                                this.emitShort((byteAt(s, i + 1) << 8) | byteAt(s, i));
                            }
                        }
                    }
                };
                File.prototype.parseNumber = function (words) {
                    var v = this.parseOneInt(words.shift());
                    if (v == null)
                        return null;
                    return v;
                };
                File.prototype.parseNumbers = function (words) {
                    words = words.slice(1);
                    var nums = [];
                    while (true) {
                        var n = this.parseNumber(words);
                        if (n == null) {
                            this.directiveError(lf("cannot parse number at '{0}'", words[0]));
                            break;
                        }
                        else
                            nums.push(n);
                        if (words[0] == ",") {
                            words.shift();
                            if (words[0] == null)
                                break;
                        }
                        else if (words[0] == null) {
                            break;
                        }
                        else {
                            this.directiveError(lf("expecting number, got '{0}'", words[0]));
                            break;
                        }
                    }
                    return nums;
                };
                File.prototype.emitSpace = function (words) {
                    var nums = this.parseNumbers(words);
                    if (nums.length == 1)
                        nums.push(0);
                    if (nums.length != 2)
                        this.directiveError(lf("expecting one or two numbers"));
                    else if (nums[0] % 2 != 0)
                        this.directiveError(lf("only even space supported"));
                    else {
                        var f = nums[1] & 0xff;
                        f = f | (f << 8);
                        for (var i = 0; i < nums[0]; i += 2)
                            this.emitShort(f);
                    }
                };
                File.prototype.emitBytes = function (words) {
                    var nums = this.parseNumbers(words);
                    if (nums.length % 2 != 0) {
                        this.directiveError(".bytes needs an even number of arguments");
                        nums.push(0);
                    }
                    for (var i = 0; i < nums.length; i += 2) {
                        var n0 = nums[i];
                        var n1 = nums[i + 1];
                        if (0 <= n0 && n1 <= 0xff &&
                            0 <= n1 && n0 <= 0xff)
                            this.emitShort((n0 & 0xff) | ((n1 & 0xff) << 8));
                        else
                            this.directiveError(lf("expecting uint8"));
                    }
                };
                File.prototype.emitHex = function (words) {
                    var _this = this;
                    words.slice(1).forEach(function (w) {
                        if (w == ",")
                            return;
                        // TODO: why 4 and not 2?
                        if (w.length % 4 != 0)
                            _this.directiveError(".hex needs an even number of bytes");
                        else if (!/^[a-f0-9]+$/i.test(w))
                            _this.directiveError(".hex needs a hex number");
                        else
                            for (var i = 0; i < w.length; i += 4) {
                                var n = parseInt(w.slice(i, i + 4), 16);
                                n = ((n & 0xff) << 8) | ((n >> 8) & 0xff);
                                _this.emitShort(n);
                            }
                    });
                };
                File.prototype.handleDirective = function (l) {
                    var _this = this;
                    var words = l.words;
                    var expectOne = function () {
                        if (words.length != 2)
                            _this.directiveError(lf("expecting one argument"));
                    };
                    var num0;
                    switch (words[0]) {
                        case ".ascii":
                        case ".asciz":
                        case ".string":
                            this.emitString(l.text);
                            break;
                        case ".utf16":
                            this.emitString(l.text, true);
                            break;
                        case ".align":
                            expectOne();
                            num0 = this.parseOneInt(words[1]);
                            if (num0 != null) {
                                if (num0 == 0)
                                    return;
                                if (num0 <= 4) {
                                    this.align(1 << num0);
                                }
                                else {
                                    this.directiveError(lf("expecting 1, 2, 3 or 4 (for 2, 4, 8, or 16 byte alignment)"));
                                }
                            }
                            else
                                this.directiveError(lf("expecting number"));
                            break;
                        case ".balign":
                            expectOne();
                            num0 = this.parseOneInt(words[1]);
                            if (num0 != null) {
                                if (num0 == 1)
                                    return;
                                if (num0 == 2 || num0 == 4 || num0 == 8 || num0 == 16) {
                                    this.align(num0);
                                }
                                else {
                                    this.directiveError(lf("expecting 2, 4, 8, or 16"));
                                }
                            }
                            else
                                this.directiveError(lf("expecting number"));
                            break;
                        case ".p2align":
                            expectOne();
                            num0 = this.parseOneInt(words[1]);
                            if (num0 != null) {
                                this.align(1 << num0);
                            }
                            else
                                this.directiveError(lf("expecting number"));
                            break;
                        case ".byte":
                            this.emitBytes(words);
                            break;
                        case ".hex":
                            this.emitHex(words);
                            break;
                        case ".hword":
                        case ".short":
                        case ".2bytes":
                            this.parseNumbers(words).forEach(function (n) {
                                // we allow negative numbers
                                if (-0x8000 <= n && n <= 0xffff)
                                    _this.emitShort(n & 0xffff);
                                else
                                    _this.directiveError(lf("expecting int16"));
                            });
                            break;
                        case ".word":
                        case ".4bytes":
                        case ".long":
                            // TODO: a word is machine-dependent (16-bit for AVR, 32-bit for ARM)
                            this.parseNumbers(words).forEach(function (n) {
                                // we allow negative numbers
                                if (-0x80000000 <= n && n <= 0xffffffff) {
                                    _this.emitShort(n & 0xffff);
                                    _this.emitShort((n >> 16) & 0xffff);
                                }
                                else {
                                    _this.directiveError(lf("expecting int32"));
                                }
                            });
                            break;
                        case ".skip":
                        case ".space":
                            this.emitSpace(words);
                            break;
                        case ".set":
                        case ".equ":
                            if (!/^\w+$/.test(words[1]))
                                this.directiveError(lf("expecting name"));
                            var nums = this.parseNumbers(words.slice(words[2] == "," || words[2] == "="
                                ? 2 : 1));
                            if (nums.length != 1)
                                this.directiveError(lf("expecting one value"));
                            if (this.equs[words[1]] !== undefined &&
                                this.equs[words[1]] != nums[0])
                                this.directiveError(lf("redefinition of {0}", words[1]));
                            this.equs[words[1]] = nums[0];
                            break;
                        case ".startaddr":
                            if (this.location())
                                this.directiveError(lf(".startaddr can be only be specified at the beginning of the file"));
                            expectOne();
                            this.baseOffset = this.parseOneInt(words[1]);
                            break;
                        // The usage for this is as follows:
                        // push {...}
                        // @stackmark locals   ; locals := sp
                        // ... some push/pops ...
                        // ldr r0, [sp, locals@3] ; load local number 3
                        // ... some push/pops ...
                        // @stackempty locals ; expect an empty stack here
                        case "@stackmark":
                            expectOne();
                            this.stackpointers[words[1]] = this.stack;
                            break;
                        case "@stackempty":
                            if (this.checkStack) {
                                if (this.stackpointers[words[1]] == null)
                                    this.directiveError(lf("no such saved stack"));
                                else if (this.stackpointers[words[1]] != this.stack)
                                    this.directiveError(lf("stack mismatch"));
                            }
                            break;
                        case "@scope":
                            this.scope = words[1] || "";
                            this.currLineNo = this.scope ? 0 : this.realCurrLineNo;
                            break;
                        case ".syntax":
                        case "@nostackcheck":
                            this.checkStack = false;
                            break;
                        case "@dummystack":
                            expectOne();
                            this.stack += this.parseOneInt(words[1]);
                            break;
                        case ".section":
                        case ".global":
                            this.stackpointers = {};
                            this.stack = 0;
                            this.scope = "$S" + this.scopeId++;
                            break;
                        case ".comm": {
                            words = words.filter(function (x) { return x != ","; });
                            words.shift();
                            var sz = this.parseOneInt(words[1]);
                            var align = 0;
                            if (words[2])
                                align = this.parseOneInt(words[2]);
                            else
                                align = 4; // not quite what AS does...
                            var val = this.lookupLabel(words[0]);
                            if (val == null) {
                                if (!this.commPtr) {
                                    this.commPtr = this.lookupExternalLabel("_pxt_comm_base") || 0;
                                    if (!this.commPtr)
                                        this.directiveError(lf("PXT_COMM_BASE not defined"));
                                }
                                while (this.commPtr & (align - 1))
                                    this.commPtr++;
                                this.labels[this.scopedName(words[0])] = this.commPtr - this.baseOffset;
                                this.commPtr += sz;
                            }
                            break;
                        }
                        case ".file":
                        case ".text":
                        case ".cpu":
                        case ".fpu":
                        case ".eabi_attribute":
                        case ".code":
                        case ".thumb_func":
                        case ".type":
                        case ".fnstart":
                        case ".save":
                        case ".size":
                        case ".fnend":
                        case ".pad":
                        case ".globl": // TODO might need this one
                        case ".local":
                            break;
                        case "@":
                            // @ sp needed
                            break;
                        default:
                            if (/^\.cfi_/.test(words[0])) {
                                // ignore
                            }
                            else {
                                this.directiveError(lf("unknown directive"));
                            }
                            break;
                    }
                };
                File.prototype.handleOneInstruction = function (ln, instr) {
                    var op = instr.emit(ln);
                    if (!op.error) {
                        this.stack += op.stack;
                        if (this.checkStack && this.stack < 0)
                            this.pushError(lf("stack underflow"));
                        ln.location = this.location();
                        ln.opcode = op.opcode;
                        ln.stack = op.stack;
                        this.emitOpCode(op.opcode);
                        if (op.opcode2 != null)
                            this.emitOpCode(op.opcode2);
                        if (op.opcode3 != null)
                            this.emitOpCode(op.opcode3);
                        ln.instruction = instr;
                        ln.numArgs = op.numArgs;
                        return true;
                    }
                    return false;
                };
                File.prototype.handleInstruction = function (ln) {
                    var _this = this;
                    if (ln.instruction) {
                        if (this.handleOneInstruction(ln, ln.instruction))
                            return;
                    }
                    var getIns = function (n) { return _this.ei.instructions.hasOwnProperty(n) ? _this.ei.instructions[n] : []; };
                    if (!ln.instruction) {
                        var ins = getIns(ln.words[0]);
                        for (var i = 0; i < ins.length; ++i) {
                            if (this.handleOneInstruction(ln, ins[i]))
                                return;
                        }
                    }
                    var w0 = ln.words[0].toLowerCase().replace(/s$/, "").replace(/[^a-z]/g, "");
                    var hints = "";
                    var possibilities = getIns(w0).concat(getIns(w0 + "s"));
                    if (possibilities.length > 0) {
                        possibilities.forEach(function (i) {
                            var err = i.emit(ln);
                            hints += lf("   Maybe: {0} ({1} at '{2}')\n", i.toString(), err.error, err.errorAt);
                        });
                    }
                    this.pushError(lf("assembly error"), hints);
                };
                File.prototype.buildLine = function (tx, lst) {
                    var _this = this;
                    var mkLine = function (tx) {
                        var l = new Line(_this, tx);
                        l.scope = _this.scope;
                        l.lineNo = _this.currLineNo;
                        lst.push(l);
                        return l;
                    };
                    var l = mkLine(tx);
                    var words = tokenize(l.text) || [];
                    l.words = words;
                    var w0 = words[0] || "";
                    if (w0.charAt(w0.length - 1) == ":") {
                        var m = /^([\.\w]+):$/.exec(words[0]);
                        if (m) {
                            l.type = "label";
                            l.text = m[1] + ":";
                            l.words = [m[1]];
                            if (words.length > 1) {
                                words.shift();
                                l = mkLine(tx.replace(/^[^:]*:/, ""));
                                l.words = words;
                                w0 = words[0] || "";
                            }
                            else {
                                return;
                            }
                        }
                    }
                    var c0 = w0.charAt(0);
                    if (c0 == "." || c0 == "@") {
                        l.type = "directive";
                        if (l.words[0] == "@scope")
                            this.handleDirective(l);
                    }
                    else {
                        if (l.words.length == 0)
                            l.type = "empty";
                        else
                            l.type = "instruction";
                    }
                };
                File.prototype.prepLines = function (text) {
                    var _this = this;
                    this.currLineNo = 0;
                    this.realCurrLineNo = 0;
                    this.lines = [];
                    text.split(/\r?\n/).forEach(function (tx) {
                        if (_this.errors.length > 10)
                            return;
                        _this.currLineNo++;
                        _this.realCurrLineNo++;
                        _this.buildLine(tx, _this.lines);
                    });
                };
                File.prototype.iterLines = function () {
                    var _this = this;
                    this.stack = 0;
                    this.buf = [];
                    this.scopeId = 0;
                    this.lines.forEach(function (l) {
                        if (_this.errors.length > 10)
                            return;
                        _this.currLine = l;
                        if (l.words.length == 0)
                            return;
                        if (l.type == "label") {
                            var lblname = _this.scopedName(l.words[0]);
                            _this.prevLabel = lblname;
                            if (_this.finalEmit) {
                                if (_this.equs[lblname] != null)
                                    _this.directiveError(lf(".equ redefined as label"));
                                var curr = _this.labels[lblname];
                                if (curr == null)
                                    pxtc.oops();
                                if (_this.errors.length == 0 && curr != _this.location()) {
                                    pxtc.oops("invalid location: " + _this.location() + " != " + curr + " at " + lblname);
                                }
                                pxtc.assert(_this.errors.length > 0 || curr == _this.location());
                                if (_this.reallyFinalEmit) {
                                    _this.stackAtLabel[lblname] = _this.stack;
                                }
                            }
                            else {
                                if (_this.labels.hasOwnProperty(lblname))
                                    _this.directiveError(lf("label redefinition"));
                                else if (_this.inlineMode && /^_/.test(lblname))
                                    _this.directiveError(lf("labels starting with '_' are reserved for the compiler"));
                                else {
                                    _this.labels[lblname] = _this.location();
                                }
                            }
                            l.location = _this.location();
                        }
                        else if (l.type == "directive") {
                            _this.handleDirective(l);
                        }
                        else if (l.type == "instruction") {
                            _this.handleInstruction(l);
                        }
                        else if (l.type == "empty") {
                            // nothing
                        }
                        else {
                            pxtc.oops();
                        }
                    });
                };
                File.prototype.getSource = function (clean, numStmts, flashSize) {
                    var _this = this;
                    if (numStmts === void 0) { numStmts = 1; }
                    if (flashSize === void 0) { flashSize = 0; }
                    var lenPrev = 0;
                    var size = function (lbl) {
                        var curr = _this.labels[lbl] || lenPrev;
                        var sz = curr - lenPrev;
                        lenPrev = curr;
                        return sz;
                    };
                    var lenTotal = this.buf ? this.location() : 0;
                    var lenCode = size("_code_end");
                    var lenHelpers = size("_helpers_end");
                    var lenVtables = size("_vtables_end");
                    var lenLiterals = size("_literals_end");
                    var lenAllCode = lenPrev;
                    var totalSize = (lenTotal + this.baseOffset) & 0xffffff;
                    if (flashSize && totalSize > flashSize)
                        pxtc.U.userError(lf("program too big by {0} bytes!", totalSize - flashSize));
                    flashSize = flashSize || 128 * 1024;
                    var totalInfo = lf("; total bytes: {0} ({1}% of {2}k flash with {3} free)", totalSize, (100 * totalSize / flashSize).toFixed(1), (flashSize / 1024).toFixed(1), flashSize - totalSize);
                    var res = 
                    // ARM-specific
                    lf("; generated code sizes (bytes): {0} (incl. {1} user, {2} helpers, {3} vtables, {4} lits); src size {5}\n", lenAllCode, lenCode, lenHelpers, lenVtables, lenLiterals, lenTotal - lenAllCode) +
                        lf("; assembly: {0} lines; density: {1} bytes/stmt; ({2} stmts)\n", this.lines.length, Math.round(100 * lenCode / numStmts) / 100, numStmts) +
                        totalInfo + "\n" +
                        this.stats + "\n\n";
                    var skipOne = false;
                    this.lines.forEach(function (ln, i) {
                        if (ln.words[0] == "_stored_program") {
                            res += "_stored_program: .string \"...\"\n";
                            skipOne = true;
                            return;
                        }
                        if (skipOne) {
                            skipOne = false;
                            return;
                        }
                        var text = ln.text;
                        if (clean) {
                            if (ln.words[0] == "@stackempty" &&
                                _this.lines[i - 1].text == ln.text)
                                return;
                            text = text.replace(/; WAS: .*/, "");
                            if (!text.trim())
                                return;
                        }
                        if (assembler.debug)
                            if (ln.type == "label" || ln.type == "instruction")
                                text += " \t; 0x" + (ln.location + _this.baseOffset).toString(16);
                        res += text + "\n";
                    });
                    return res;
                };
                File.prototype.peepHole = function () {
                    // TODO add: str X; ldr X -> str X ?
                    var mylines = this.lines.filter(function (l) { return l.type != "empty"; });
                    for (var i = 0; i < mylines.length; ++i) {
                        var ln = mylines[i];
                        if (/^user/.test(ln.scope))
                            continue;
                        var lnNext = mylines[i + 1];
                        if (!lnNext)
                            continue;
                        var lnNext2 = mylines[i + 2];
                        if (ln.type == "instruction") {
                            this.ei.peephole(ln, lnNext, lnNext2);
                        }
                    }
                };
                File.prototype.clearLabels = function () {
                    this.labels = {};
                    this.commPtr = 0;
                };
                File.prototype.peepPass = function (reallyFinal) {
                    if (this.disablePeepHole)
                        return;
                    this.peepOps = 0;
                    this.peepDel = 0;
                    this.peepCounts = {};
                    this.peepHole();
                    this.throwOnError = true;
                    this.finalEmit = false;
                    this.clearLabels();
                    this.iterLines();
                    pxtc.assert(!this.checkStack || this.stack == 0);
                    this.finalEmit = true;
                    this.reallyFinalEmit = reallyFinal || this.peepOps == 0;
                    this.iterLines();
                    this.stats += lf("; peep hole pass: {0} instructions removed and {1} updated\n", this.peepDel, this.peepOps - this.peepDel);
                };
                File.prototype.getLabels = function () {
                    var _this = this;
                    if (!this.userLabelsCache)
                        this.userLabelsCache = pxtc.U.mapMap(this.labels, function (k, v) { return v + _this.baseOffset; });
                    return this.userLabelsCache;
                };
                File.prototype.emit = function (text) {
                    pxtc.assert(this.buf == null);
                    this.prepLines(text);
                    if (this.errors.length > 0)
                        return;
                    this.clearLabels();
                    this.iterLines();
                    if (this.checkStack && this.stack != 0)
                        this.directiveError(lf("stack misaligned at the end of the file"));
                    if (this.errors.length > 0)
                        return;
                    this.ei.expandLdlit(this);
                    this.clearLabels();
                    this.iterLines();
                    this.finalEmit = true;
                    this.reallyFinalEmit = this.disablePeepHole;
                    this.iterLines();
                    if (this.errors.length > 0)
                        return;
                    var maxPasses = 5;
                    for (var i = 0; i < maxPasses; ++i) {
                        pxt.debug("Peephole OPT, pass " + i);
                        this.peepPass(i == maxPasses);
                        if (this.peepOps == 0)
                            break;
                    }
                };
                return File;
            }());
            assembler.File = File;
            var VMFile = /** @class */ (function (_super) {
                __extends(VMFile, _super);
                function VMFile(ei) {
                    return _super.call(this, ei) || this;
                }
                return VMFile;
            }(File));
            assembler.VMFile = VMFile;
            // an assembler provider must inherit from this
            // class and provide Encoders and Instructions
            var AbstractProcessor = /** @class */ (function () {
                function AbstractProcessor() {
                    var _this = this;
                    this.file = null;
                    this.addEnc = function (n, p, e) {
                        var ee = {
                            name: n,
                            pretty: p,
                            encode: e,
                            isRegister: /^\$r\d/.test(n),
                            isImmediate: /^\$i\d/.test(n),
                            isRegList: /^\$rl\d/.test(n),
                            isLabel: /^\$l[a-z]/.test(n),
                        };
                        _this.encoders[n] = ee;
                        return ee;
                    };
                    this.inrange = function (max, v, e) {
                        if (Math.floor(v) != v)
                            return null;
                        if (v < 0)
                            return null;
                        if (v > max)
                            return null;
                        return e;
                    };
                    this.inminmax = function (min, max, v, e) {
                        if (Math.floor(v) != v)
                            return null;
                        if (v < min)
                            return null;
                        if (v > max)
                            return null;
                        return e;
                    };
                    this.inseq = function (seq, v) {
                        var ind = seq.indexOf(v);
                        if (ind < 0)
                            return null;
                        return ind;
                    };
                    this.inrangeSigned = function (max, v, e) {
                        if (Math.floor(v) != v)
                            return null;
                        if (v < -(max + 1))
                            return null;
                        if (v > max)
                            return null;
                        var mask = (max << 1) | 1;
                        return e & mask;
                    };
                    this.addInst = function (name, code, mask, is32Bit) {
                        var ins = new Instruction(_this, name, code, mask, is32Bit);
                        if (!_this.instructions.hasOwnProperty(ins.name))
                            _this.instructions[ins.name] = [];
                        _this.instructions[ins.name].push(ins);
                        return ins;
                    };
                    this.encoders = {};
                    this.instructions = {};
                }
                AbstractProcessor.prototype.toFnPtr = function (v, baseOff, lbl) {
                    return v;
                };
                AbstractProcessor.prototype.wordSize = function () {
                    return -1;
                };
                AbstractProcessor.prototype.computeStackOffset = function (kind, offset) {
                    return offset;
                };
                AbstractProcessor.prototype.is32bit = function (i) {
                    return false;
                };
                AbstractProcessor.prototype.emit32 = function (v1, v2, actual) {
                    return null;
                };
                AbstractProcessor.prototype.postProcessRelAddress = function (f, v) {
                    return v;
                };
                AbstractProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    return v;
                };
                AbstractProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    return;
                };
                AbstractProcessor.prototype.registerNo = function (actual) {
                    return null;
                };
                AbstractProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    return null;
                };
                AbstractProcessor.prototype.isPop = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.isPush = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.isAddSP = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.isSubSP = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.testAssembler = function () {
                    pxtc.assert(false);
                };
                AbstractProcessor.prototype.expandLdlit = function (f) {
                };
                return AbstractProcessor;
            }());
            assembler.AbstractProcessor = AbstractProcessor;
            // utility functions
            function tokenize(line) {
                var words = [];
                var w = "";
                loop: for (var i = 0; i < line.length; ++i) {
                    switch (line[i]) {
                        case "[":
                        case "]":
                        case "!":
                        case "{":
                        case "}":
                        case ",":
                            if (w) {
                                words.push(w);
                                w = "";
                            }
                            words.push(line[i]);
                            break;
                        case " ":
                        case "\t":
                        case "\r":
                        case "\n":
                            if (w) {
                                words.push(w);
                                w = "";
                            }
                            break;
                        case ";":
                            // drop the trailing comment
                            break loop;
                        default:
                            w += line[i];
                            break;
                    }
                }
                if (w) {
                    words.push(w);
                    w = "";
                }
                if (!words[0])
                    return null;
                return words;
            }
            function parseString(s) {
                s = s.replace(/\\\\/g, "\\B") // don't get confused by double backslash
                    .replace(/\\(['\?])/g, function (f, q) { return q; }) // these are not valid in JSON yet valid in C
                    .replace(/\\[z0]/g, "\u0000") // \0 is valid in C 
                    .replace(/\\x([0-9a-f][0-9a-f])/gi, function (f, h) { return "\\u00" + h; })
                    .replace(/\\B/g, "\\\\"); // undo anti-confusion above
                try {
                    return JSON.parse(s);
                }
                catch (e) {
                    return null;
                }
            }
            function emitErr(msg, tok) {
                return {
                    stack: null,
                    opcode: null,
                    error: msg,
                    errorAt: tok
                };
            }
            assembler.emitErr = emitErr;
            function testOne(ei, op, code) {
                var b = new File(ei);
                b.checkStack = false;
                b.emit(op);
                pxtc.assert(b.buf[0] == code);
            }
            function expectError(ei, asm) {
                var b = new File(ei);
                b.emit(asm);
                if (b.errors.length == 0) {
                    pxtc.oops("ASMTEST: expecting error for: " + asm);
                }
                // console.log(b.errors[0].message)
            }
            assembler.expectError = expectError;
            function tohex(n) {
                if (n < 0 || n > 0xffff)
                    return ("0x" + n.toString(16)).toLowerCase();
                else
                    return ("0x" + ("000" + n.toString(16)).slice(-4)).toLowerCase();
            }
            assembler.tohex = tohex;
            function expect(ei, disasm) {
                var exp = [];
                var asm = disasm.replace(/^([0-9a-fA-F]{4,8})\s/gm, function (w, n) {
                    exp.push(parseInt(n.slice(0, 4), 16));
                    if (n.length == 8)
                        exp.push(parseInt(n.slice(4, 8), 16));
                    return "";
                });
                var b = new File(ei);
                b.throwOnError = true;
                b.disablePeepHole = true;
                b.emit(asm);
                if (b.errors.length > 0) {
                    console.debug(b.errors[0].message);
                    pxtc.oops("ASMTEST: not expecting errors");
                }
                if (b.buf.length != exp.length)
                    pxtc.oops("ASMTEST: wrong buf len");
                for (var i = 0; i < exp.length; ++i) {
                    if (b.buf[i] != exp[i])
                        pxtc.oops("ASMTEST: wrong buf content at " + i + " , exp:" + tohex(exp[i]) + ", got: " + tohex(b.buf[i]));
                }
            }
            assembler.expect = expect;
        })(assembler = pxtc.assembler || (pxtc.assembler = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../../localtypings/projectheader.d.ts"/>
var pxt;
(function (pxt) {
    var Cloud;
    (function (Cloud) {
        var Util = pxtc.Util;
        // hit /api/ to stay on same domain and avoid CORS
        Cloud.apiRoot = pxt.BrowserUtils.isLocalHost() || Util.isNodeJS ? "https://www.makecode.com/api/" : "/api/";
        Cloud.accessToken = "";
        Cloud.localToken = "";
        var _isOnline = true;
        Cloud.onOffline = function () { };
        function offlineError(url) {
            var e = new Error(Util.lf("Cannot access {0} while offline", url));
            e.isOffline = true;
            return Promise.delay(1000).then(function () { return Promise.reject(e); });
        }
        function hasAccessToken() {
            return !!Cloud.accessToken;
        }
        Cloud.hasAccessToken = hasAccessToken;
        function localRequestAsync(path, data) {
            return pxt.U.requestAsync({
                url: "/api/" + path,
                headers: { "Authorization": Cloud.localToken },
                method: data ? "POST" : "GET",
                data: data || undefined,
                allowHttpErrors: true
            });
        }
        Cloud.localRequestAsync = localRequestAsync;
        function privateRequestAsync(options) {
            options.url = pxt.webConfig && pxt.webConfig.isStatic && !options.forceLiveEndpoint ? pxt.webConfig.relprefix + options.url : Cloud.apiRoot + options.url;
            options.allowGzipPost = true;
            if (!Cloud.isOnline()) {
                return offlineError(options.url);
            }
            if (!options.headers)
                options.headers = {};
            if (pxt.BrowserUtils.isLocalHost()) {
                if (Cloud.localToken)
                    options.headers["Authorization"] = Cloud.localToken;
            }
            else if (Cloud.accessToken) {
                options.headers["x-td-access-token"] = Cloud.accessToken;
            }
            return Util.requestAsync(options)
                .catch(function (e) {
                if (e.statusCode == 0) {
                    if (_isOnline) {
                        _isOnline = false;
                        Cloud.onOffline();
                    }
                    return offlineError(options.url);
                }
                else {
                    return Promise.reject(e);
                }
            });
        }
        Cloud.privateRequestAsync = privateRequestAsync;
        function privateGetTextAsync(path, headers) {
            return privateRequestAsync({ url: path, headers: headers }).then(function (resp) { return resp.text; });
        }
        Cloud.privateGetTextAsync = privateGetTextAsync;
        function privateGetAsync(path, forceLiveEndpoint) {
            if (forceLiveEndpoint === void 0) { forceLiveEndpoint = false; }
            return privateRequestAsync({ url: path, forceLiveEndpoint: forceLiveEndpoint }).then(function (resp) { return resp.json; });
        }
        Cloud.privateGetAsync = privateGetAsync;
        function downloadTargetConfigAsync() {
            if (!Cloud.isOnline())
                return Promise.resolve(undefined);
            var targetVersion = pxt.appTarget.versions && pxt.appTarget.versions.target;
            var url = pxt.webConfig && pxt.webConfig.isStatic ? "targetconfig.json" : "config/" + pxt.appTarget.id + "/targetconfig" + (targetVersion ? "/v" + targetVersion : '');
            if (pxt.BrowserUtils.isLocalHost())
                return localRequestAsync(url).then(function (r) { return r ? r.json : undefined; });
            else
                return Cloud.privateGetAsync(url);
        }
        Cloud.downloadTargetConfigAsync = downloadTargetConfigAsync;
        function downloadScriptFilesAsync(id) {
            return privateRequestAsync({ url: id + "/text", forceLiveEndpoint: true }).then(function (resp) {
                return JSON.parse(resp.text);
            });
        }
        Cloud.downloadScriptFilesAsync = downloadScriptFilesAsync;
        // 1h check on markdown content if not on development server
        var MARKDOWN_EXPIRATION = pxt.BrowserUtils.isLocalHostDev() ? 1 : 1 * 60 * 60 * 1000;
        function markdownAsync(docid, locale, live) {
            var branch = "";
            return pxt.BrowserUtils.translationDbAsync()
                .then(function (db) { return db.getAsync(locale, docid, "")
                .then(function (entry) {
                if (entry && Date.now() - entry.time > MARKDOWN_EXPIRATION)
                    // background update,
                    downloadMarkdownAsync(docid, locale, live, entry.etag)
                        .then(function (r) { return db.setAsync(locale, docid, branch, r.etag, undefined, r.md || entry.md); })
                        .catch(function () { }) // swallow errors
                        .done();
                // return cached entry
                if (entry && entry.md)
                    return entry.md;
                else
                    return downloadMarkdownAsync(docid, locale, live)
                        .then(function (r) { return db.setAsync(locale, docid, branch, r.etag, undefined, r.md)
                        .then(function () { return r.md; }); })
                        .catch(function () { return ""; }); // no translation
            }); });
        }
        Cloud.markdownAsync = markdownAsync;
        function downloadMarkdownAsync(docid, locale, live, etag) {
            var packaged = pxt.webConfig && pxt.webConfig.isStatic;
            var targetVersion = pxt.appTarget.versions && pxt.appTarget.versions.target || '?';
            var url;
            if (packaged) {
                url = docid;
                var isUnderDocs = /\/?docs\//.test(url);
                var hasExt = /\.\w+$/.test(url);
                if (!isUnderDocs) {
                    url = "docs/" + url;
                }
                if (!hasExt) {
                    url = url + ".md";
                }
            }
            else {
                url = "md/" + pxt.appTarget.id + "/" + docid.replace(/^\//, "") + "?targetVersion=" + encodeURIComponent(targetVersion);
            }
            if (!packaged && locale != "en") {
                url += "&lang=" + encodeURIComponent(locale);
                if (live)
                    url += "&live=1";
            }
            if (pxt.BrowserUtils.isLocalHost() && !live)
                return localRequestAsync(url).then(function (resp) {
                    if (resp.statusCode == 404)
                        return privateRequestAsync({ url: url, method: "GET" })
                            .then(function (resp) { return { md: resp.text, etag: resp.headers["etag"] }; });
                    else
                        return { md: resp.text, etag: undefined };
                });
            else {
                var headers = etag ? { "If-None-Match": etag } : undefined;
                return privateRequestAsync({ url: url, method: "GET", headers: headers })
                    .then(function (resp) { return { md: resp.text, etag: resp.headers["etag"] }; });
            }
        }
        function privateDeleteAsync(path) {
            return privateRequestAsync({ url: path, method: "DELETE" }).then(function (resp) { return resp.json; });
        }
        Cloud.privateDeleteAsync = privateDeleteAsync;
        function privatePostAsync(path, data, forceLiveEndpoint) {
            if (forceLiveEndpoint === void 0) { forceLiveEndpoint = false; }
            return privateRequestAsync({ url: path, data: data || {}, forceLiveEndpoint: forceLiveEndpoint }).then(function (resp) { return resp.json; });
        }
        Cloud.privatePostAsync = privatePostAsync;
        function isLoggedIn() { return !!Cloud.accessToken; }
        Cloud.isLoggedIn = isLoggedIn;
        function isNavigatorOnline() {
            return navigator && navigator.onLine;
        }
        Cloud.isNavigatorOnline = isNavigatorOnline;
        function isOnline() {
            if (typeof navigator !== "undefined" && isNavigatorOnline()) {
                _isOnline = true;
            }
            return _isOnline;
        }
        Cloud.isOnline = isOnline;
        function getServiceUrl() {
            return Cloud.apiRoot.replace(/\/api\/$/, "");
        }
        Cloud.getServiceUrl = getServiceUrl;
        function getUserId() {
            var m = /^0(\w+)\./.exec(Cloud.accessToken);
            if (m)
                return m[1];
            return null;
        }
        Cloud.getUserId = getUserId;
        function parseScriptId(uri) {
            var target = pxt.appTarget;
            if (!uri || !target.appTheme || !target.cloud || !target.cloud.sharing)
                return undefined;
            var domains = ["makecode.com"];
            if (target.appTheme.embedUrl)
                domains.push(target.appTheme.embedUrl);
            if (target.appTheme.shareUrl)
                domains.push(target.appTheme.shareUrl);
            domains = Util.unique(domains, function (d) { return d; }).map(function (d) { return Util.escapeForRegex(Util.stripUrlProtocol(d).replace(/\/$/, '')).toLowerCase(); });
            var rx = "^((https://)?(?:" + domains.join('|') + ")/)?(api/oembed?url=.*%2F([^&]*)&.*?|([a-z0-9-_]+))$";
            var m = new RegExp(rx, 'i').exec(uri.trim());
            var scriptid = m && (!m[1] || domains.indexOf(Util.escapeForRegex(m[1].replace(/https:\/\//, '').replace(/\/$/, '')).toLowerCase()) >= 0) && (m[3] || m[4]) ? (m[3] ? m[3] : m[4]) : null;
            if (!scriptid)
                return undefined;
            if (scriptid[0] == "_" && scriptid.length == 13)
                return scriptid;
            if (scriptid.length == 23 && /^[0-9\-]+$/.test(scriptid))
                return scriptid;
            return undefined;
        }
        Cloud.parseScriptId = parseScriptId;
    })(Cloud = pxt.Cloud || (pxt.Cloud = {}));
})(pxt || (pxt = {}));
var pxtmelody;
(function (pxtmelody) {
    var MelodyArray = /** @class */ (function () {
        // constructor
        function MelodyArray(tempo) {
            this.numCols = 8;
            this.numRows = 8;
            // Whether or now the melody can contain more than one note at a single beat
            this.polyphonic = false;
            if (tempo)
                this.tempo = tempo;
            // set all elements to false
            this.resetMelody();
        }
        MelodyArray.prototype.setTempo = function (tempo) {
            this.tempo = tempo;
        };
        MelodyArray.prototype.getArray = function () {
            return this.melody;
        };
        MelodyArray.prototype.setArray = function (array) {
            this.melody = array;
        };
        MelodyArray.prototype.getColor = function (row) {
            // TODO
            return 0;
        };
        MelodyArray.prototype.getValue = function (row, col) {
            return this.melody[row][col];
        };
        MelodyArray.prototype.getWidth = function () {
            return this.numCols;
        };
        MelodyArray.prototype.getHeight = function () {
            return this.numRows;
        };
        MelodyArray.prototype.updateMelody = function (row, col) {
            var newValue = !this.melody[row][col];
            if (newValue && !this.polyphonic) {
                for (var r = 0; r < this.numRows; r++) {
                    this.melody[r][col] = false;
                }
            }
            this.melody[row][col] = newValue;
        };
        // function to turn into string
        MelodyArray.prototype.getStringRepresentation = function () {
            var stringMelody = "";
            var queues = new Array(this.numCols);
            var numMelodies = 0;
            // create queues of notes
            for (var i = 0; i < this.numRows; i++) {
                var noteCount = 0;
                queues[i] = [];
                for (var j = 0; j < this.numCols; j++) {
                    if (this.melody[j][i]) {
                        queues[i].push(rowToNote(j));
                        noteCount++;
                    }
                }
                if (noteCount > numMelodies) {
                    numMelodies = noteCount;
                }
            }
            // create strings of melodies
            if (numMelodies == 0)
                return "- - - - - - - - ";
            for (var j = 0; j < numMelodies; j++) {
                for (var i = 0; i < this.numCols; i++) {
                    if (queues[i] && queues[i].length > 0) {
                        stringMelody += queues[i].shift() + " ";
                    }
                    else {
                        stringMelody += "- "; // add rest if there is no selection for the note
                    }
                }
                //stringMelody += "."; // this will be used to split each melody
            }
            return stringMelody;
        };
        // turn string into boolean array
        MelodyArray.prototype.parseNotes = function (stringNotes) {
            // A melody is represented as a string of notes separated by spaces, with dashes representing rests
            // ex: a scale is represented as "C5 B A G F E D C"
            stringNotes = stringNotes.trim();
            var notes = stringNotes.split(" ");
            for (var i = 0; i < notes.length; i++) {
                for (var j = 0; j < this.numRows; j++) {
                    // reset everything to false
                    this.melody[j][i] = false;
                }
                if (notes[i] != "-") {
                    this.melody[noteToRow(notes[i])][i] = true;
                }
            }
        };
        MelodyArray.prototype.setPolyphonic = function (isPolyphonic) {
            this.polyphonic = isPolyphonic;
        };
        MelodyArray.prototype.isPolyphonic = function () {
            return this.polyphonic;
        };
        MelodyArray.prototype.resetMelody = function () {
            this.melody = new Array(this.numCols);
            for (var i = 0; i < this.numCols; i++) {
                this.melody[i] = new Array(this.numRows).fill(false);
            }
        };
        return MelodyArray;
    }());
    pxtmelody.MelodyArray = MelodyArray;
    function rowToNote(rowNum) {
        var note = "";
        switch (rowNum) {
            case 0:
                note = "C5";
                break;
            case 1:
                note = "B";
                break;
            case 2:
                note = "A";
                break;
            case 3:
                note = "G";
                break;
            case 4:
                note = "F";
                break;
            case 5:
                note = "E";
                break;
            case 6:
                note = "D";
                break;
            case 7:
                note = "C";
                break;
        }
        return note;
    }
    pxtmelody.rowToNote = rowToNote;
    function noteToRow(note) {
        var rowNum = -1;
        switch (note) {
            case "C5":
                rowNum = 0;
                break;
            case "B":
                rowNum = 1;
                break;
            case "A":
                rowNum = 2;
                break;
            case "G":
                rowNum = 3;
                break;
            case "F":
                rowNum = 4;
                break;
            case "E":
                rowNum = 5;
                break;
            case "D":
                rowNum = 6;
                break;
            case "C":
                rowNum = 7;
                break;
        }
        return rowNum;
    }
    pxtmelody.noteToRow = noteToRow;
    function getColorClass(row) {
        var colorClass = "melody-default";
        switch (row) {
            case 0:
                colorClass = "melody-red";
                break; // Middle C
            case 1:
                colorClass = "melody-orange";
                break; // Middle D
            case 2:
                colorClass = "melody-yellow";
                break; // Middle E
            case 3:
                colorClass = "melody-green";
                break; // Middle F
            case 4:
                colorClass = "melody-teal";
                break; // Middle G
            case 5:
                colorClass = "melody-blue";
                break; // Middle A
            case 6:
                colorClass = "melody-purple";
                break; // Middle B
            case 7:
                colorClass = "melody-violet";
                break; // Tenor C
        }
        return colorClass;
    }
    pxtmelody.getColorClass = getColorClass;
})(pxtmelody || (pxtmelody = {}));
var pxtmelody;
(function (pxtmelody) {
    var MelodyGallery = /** @class */ (function () {
        function MelodyGallery() {
            var _this = this;
            this.value = null;
            this.visible = false;
            this.timeouts = []; // keep track of timeout
            this.numSamples = pxtmelody.SampleMelodies.length;
            this.containerDiv = document.createElement("div");
            this.containerDiv.setAttribute("id", "melody-editor-gallery-outer");
            this.contentDiv = document.createElement("div");
            this.contentDiv.setAttribute("id", "melody-editor-gallery");
            this.itemBackgroundColor = "#DCDCDC";
            this.itemBorderColor = "white";
            this.initStyles();
            this.containerDiv.appendChild(this.contentDiv);
            this.containerDiv.style.display = "none";
            this.contentDiv.addEventListener("animationend", function () {
                if (!_this.visible) {
                    _this.containerDiv.style.display = "none";
                }
            });
            this.contentDiv.addEventListener('wheel', function (e) {
                e.stopPropagation();
            }, true);
        }
        MelodyGallery.prototype.getElement = function () {
            return this.containerDiv;
        };
        MelodyGallery.prototype.getValue = function () {
            return this.value;
        };
        MelodyGallery.prototype.show = function (notes) {
            this.pending = notes;
            this.containerDiv.style.display = "block";
            this.buildDom();
            this.visible = true;
            pxt.BrowserUtils.removeClass(this.contentDiv, "hidden-above");
            pxt.BrowserUtils.addClass(this.contentDiv, "shown");
        };
        MelodyGallery.prototype.hide = function () {
            this.visible = false;
            pxt.BrowserUtils.removeClass(this.contentDiv, "shown");
            pxt.BrowserUtils.addClass(this.contentDiv, "hidden-above");
            this.value = null;
            this.stopMelody();
        };
        MelodyGallery.prototype.clearDomReferences = function () {
            this.contentDiv = null;
            this.containerDiv = null;
        };
        MelodyGallery.prototype.layout = function (left, top, height) {
            this.containerDiv.style.left = left + "px";
            this.containerDiv.style.top = top + "px";
            this.containerDiv.style.height = height + "px";
        };
        MelodyGallery.prototype.buildDom = function () {
            while (this.contentDiv.firstChild)
                this.contentDiv.removeChild(this.contentDiv.firstChild);
            var buttonWidth = "255px";
            var buttonHeight = "45px";
            var samples = pxtmelody.SampleMelodies;
            this.buttons = [];
            for (var i = 0; i < samples.length; i++) {
                this.mkButton(samples[i], i, buttonWidth, buttonHeight);
            }
        };
        MelodyGallery.prototype.initStyles = function () {
            // Style injected directly because animations are mangled by the less compiler
            var style = document.createElement("style");
            style.textContent = "\n            #melody-editor-gallery {\n                margin-top: -100%;\n            }\n\n            #melody-editor-gallery.hidden-above {\n                margin-top: -100%;\n                animation: slide-up 0.2s 0s ease;\n            }\n\n            #melody-editor-gallery.shown {\n                margin-top: 0px;\n                animation: slide-down 0.2s 0s ease;\n            }\n\n            @keyframes slide-down {\n                0% {\n                    margin-top: -100%;\n                }\n                100% {\n                    margin-top: 0px;\n                }\n            }\n\n            @keyframes slide-up {\n                0% {\n                    margin-top: 0px;\n                }\n                100% {\n                    margin-top: -100%;\n                }\n            }\n            ";
            this.containerDiv.appendChild(style);
        };
        MelodyGallery.prototype.mkButton = function (sample, i, width, height) {
            var _this = this;
            var outer = mkElement("div", {
                className: "melody-gallery-button melody-editor-card",
                role: "menuitem",
                id: ":" + i
            });
            var icon = mkElement("i", {
                className: "music icon melody-icon"
            });
            var label = mkElement("div", {
                className: "melody-editor-text"
            });
            label.innerText = sample.name;
            var preview = this.createColorBlock(sample);
            var leftButton = mkElement("div", {
                className: "melody-editor-button left-button",
                role: "button",
                title: sample.name
            }, function () { return _this.handleSelection(sample); });
            leftButton.appendChild(icon);
            leftButton.appendChild(label);
            leftButton.appendChild(preview);
            outer.appendChild(leftButton);
            var rightButton = mkElement("div", {
                className: "melody-editor-button right-button",
                role: "button",
                title: lf("Preview {0}", sample.name)
            }, function () { return _this.togglePlay(sample, i); });
            var playIcon = mkElement("i", {
                className: "play icon"
            });
            this.buttons[i] = playIcon;
            rightButton.appendChild(playIcon);
            outer.appendChild(rightButton);
            this.contentDiv.appendChild(outer);
        };
        MelodyGallery.prototype.handleSelection = function (sample) {
            if (this.pending) {
                var notes = this.pending;
                this.pending = undefined;
                notes(sample.notes);
            }
        };
        MelodyGallery.prototype.playNote = function (note, colNumber, tempo) {
            var tone = 0;
            switch (note) {
                case "C5":
                    tone = 523;
                    break; // Tenor C
                case "B":
                    tone = 494;
                    break; // Middle B
                case "A":
                    tone = 440;
                    break; // Middle A
                case "G":
                    tone = 392;
                    break; // Middle G
                case "F":
                    tone = 349;
                    break; // Middle F
                case "E":
                    tone = 330;
                    break; // Middle E
                case "D":
                    tone = 294;
                    break; // Middle D
                case "C":
                    tone = 262;
                    break; // Middle C
            }
            // start note
            this.timeouts.push(setTimeout(function () {
                pxt.AudioContextManager.tone(tone);
            }, colNumber * this.getDuration(tempo)));
            // stop note
            this.timeouts.push(setTimeout(function () {
                pxt.AudioContextManager.stop();
            }, (colNumber + 1) * this.getDuration(tempo)));
        };
        // ms to hold note
        MelodyGallery.prototype.getDuration = function (tempo) {
            return 60000 / tempo;
        };
        MelodyGallery.prototype.previewMelody = function (sample) {
            // stop playing any other melody
            this.stopMelody();
            var notes = sample.notes.split(" ");
            for (var i = 0; i < notes.length; i++) {
                this.playNote(notes[i], i, sample.tempo);
            }
        };
        MelodyGallery.prototype.togglePlay = function (sample, i) {
            var button = this.buttons[i];
            if (pxt.BrowserUtils.containsClass(button, "play icon")) {
                // check for other stop icons and toggle back to play
                this.resetPlayIcons();
                pxt.BrowserUtils.removeClass(button, "play icon");
                pxt.BrowserUtils.addClass(button, "stop icon");
                this.previewMelody(sample);
                // make icon toggle back to play when the melody finishes
                this.timeouts.push(setTimeout(function () {
                    pxt.BrowserUtils.removeClass(button, "stop icon");
                    pxt.BrowserUtils.addClass(button, "play icon");
                }, (sample.notes.split(" ").length) * this.getDuration(sample.tempo)));
            }
            else {
                pxt.BrowserUtils.removeClass(button, "stop icon");
                pxt.BrowserUtils.addClass(button, "play icon");
                this.stopMelody();
            }
        };
        MelodyGallery.prototype.stopMelody = function () {
            while (this.timeouts.length)
                clearTimeout(this.timeouts.shift());
            pxt.AudioContextManager.stop();
        };
        MelodyGallery.prototype.resetPlayIcons = function () {
            for (var i = 0; i < this.numSamples; i++) {
                var button = this.buttons[i];
                if (pxt.BrowserUtils.containsClass(button, "stop icon")) {
                    pxt.BrowserUtils.removeClass(button, "stop icon");
                    pxt.BrowserUtils.addClass(button, "play icon");
                    break;
                }
            }
        };
        // create color representation of melody
        MelodyGallery.prototype.createColorBlock = function (sample) {
            var colorBlock = document.createElement("div");
            pxt.BrowserUtils.addClass(colorBlock, "melody-color-block");
            var notes = sample.notes.split(" ");
            for (var i = 0; i < notes.length; i++) {
                var className = pxtmelody.getColorClass(pxtmelody.noteToRow(notes[i]));
                var colorDiv = document.createElement("div");
                // create rounded effect on edge divs and fill in color
                if (i == 0) {
                    pxt.BrowserUtils.addClass(colorDiv, "left-edge sliver " + className);
                }
                else if (i == notes.length - 1) {
                    pxt.BrowserUtils.addClass(colorDiv, "right-edge sliver " + className);
                }
                else {
                    pxt.BrowserUtils.addClass(colorDiv, "sliver " + className);
                }
                colorBlock.appendChild(colorDiv);
            }
            return colorBlock;
        };
        return MelodyGallery;
    }());
    pxtmelody.MelodyGallery = MelodyGallery;
    function mkElement(tag, props, onClick) {
        var el = document.createElement(tag);
        return initElement(el, props, onClick);
    }
    function initElement(el, props, onClick) {
        if (props) {
            for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
                var key = _a[_i];
                if (key === "className")
                    el.setAttribute("class", props[key] + "");
                else
                    el.setAttribute(key, props[key] + "");
            }
        }
        if (onClick) {
            el.addEventListener("click", onClick);
        }
        return el;
    }
})(pxtmelody || (pxtmelody = {}));
var pxtmelody;
(function (pxtmelody) {
    var MelodyInfo = /** @class */ (function () {
        function MelodyInfo(name, notes, tempo) {
            this.name = name;
            this.notes = notes;
            this.tempo = tempo;
        }
        return MelodyInfo;
    }());
    pxtmelody.MelodyInfo = MelodyInfo;
    pxtmelody.SampleMelodies = [
        new MelodyInfo(lf("Scale"), "C5 B A G F E D C", 120),
        new MelodyInfo(lf("Reverse"), "C D E F G A B C5", 120),
        new MelodyInfo(lf("Mystery"), "E B C5 A B G A F", 120),
        new MelodyInfo(lf("Gilroy"), "A F E F D G E F", 120),
        new MelodyInfo(lf("Falling"), "C5 A B G A F G E", 120),
        new MelodyInfo(lf("Hopeful"), "G B A G C5 B A B", 120),
        new MelodyInfo(lf("Tokyo"), "B A G A G F A C5", 120),
        new MelodyInfo(lf("Paris"), "G F G A - F E D", 120),
        new MelodyInfo(lf("Rising"), "E D G F B A C5 B", 120),
        new MelodyInfo(lf("Sitka"), "C5 G B A F A C5 B", 120)
    ];
})(pxtmelody || (pxtmelody = {}));
var pxtsprite;
(function (pxtsprite) {
    // These are the characters used to output literals (but we support aliases for some of these)
    var hexChars = [".", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    /**
     * 16-color sprite
     */
    var Bitmap = /** @class */ (function () {
        function Bitmap(width, height, x0, y0) {
            if (x0 === void 0) { x0 = 0; }
            if (y0 === void 0) { y0 = 0; }
            this.width = width;
            this.height = height;
            this.x0 = x0;
            this.y0 = y0;
            this.buf = new Uint8Array(Math.ceil(width * height / 2));
        }
        Bitmap.prototype.set = function (col, row, value) {
            if (col < this.width && row < this.height && col >= 0 && row >= 0) {
                var index = this.coordToIndex(col, row);
                this.setCore(index, value);
            }
        };
        Bitmap.prototype.get = function (col, row) {
            if (col < this.width && row < this.height && col >= 0 && row >= 0) {
                var index = this.coordToIndex(col, row);
                return this.getCore(index);
            }
            return 0;
        };
        Bitmap.prototype.copy = function (col, row, width, height) {
            if (col === void 0) { col = 0; }
            if (row === void 0) { row = 0; }
            if (width === void 0) { width = this.width; }
            if (height === void 0) { height = this.height; }
            var sub = new Bitmap(width, height);
            sub.x0 = col;
            sub.y0 = row;
            for (var c = 0; c < width; c++) {
                for (var r = 0; r < height; r++) {
                    sub.set(c, r, this.get(col + c, row + r));
                }
            }
            return sub;
        };
        Bitmap.prototype.apply = function (change, transparent) {
            if (transparent === void 0) { transparent = false; }
            var current;
            for (var c = 0; c < change.width; c++) {
                for (var r = 0; r < change.height; r++) {
                    current = change.get(c, r);
                    if (!current && transparent)
                        continue;
                    this.set(change.x0 + c, change.y0 + r, current);
                }
            }
        };
        Bitmap.prototype.equals = function (other) {
            if (this.width === other.width && this.height === other.height && this.x0 === other.x0 && this.y0 === other.y0 && this.buf.length === other.buf.length) {
                for (var i = 0; i < this.buf.length; i++) {
                    if (this.buf[i] !== other.buf[i])
                        return false;
                }
                return true;
            }
            return false;
        };
        Bitmap.prototype.coordToIndex = function (col, row) {
            return col + row * this.width;
        };
        Bitmap.prototype.getCore = function (index) {
            var cell = Math.floor(index / 2);
            if (index % 2 === 0) {
                return this.buf[cell] & 0xf;
            }
            else {
                return (this.buf[cell] & 0xf0) >> 4;
            }
        };
        Bitmap.prototype.setCore = function (index, value) {
            var cell = Math.floor(index / 2);
            if (index % 2 === 0) {
                this.buf[cell] = (this.buf[cell] & 0xf0) | (value & 0xf);
            }
            else {
                this.buf[cell] = (this.buf[cell] & 0x0f) | ((value & 0xf) << 4);
            }
        };
        return Bitmap;
    }());
    pxtsprite.Bitmap = Bitmap;
    var Bitmask = /** @class */ (function () {
        function Bitmask(width, height) {
            this.width = width;
            this.height = height;
            this.mask = new Uint8Array(Math.ceil(width * height / 8));
        }
        Bitmask.prototype.set = function (col, row) {
            var cellIndex = col + this.width * row;
            var index = cellIndex >> 3;
            var offset = cellIndex & 7;
            this.mask[index] |= (1 << offset);
        };
        Bitmask.prototype.get = function (col, row) {
            var cellIndex = col + this.width * row;
            var index = cellIndex >> 3;
            var offset = cellIndex & 7;
            return (this.mask[index] >> offset) & 1;
        };
        return Bitmask;
    }());
    pxtsprite.Bitmask = Bitmask;
    function resizeBitmap(img, width, height) {
        var result = new Bitmap(width, height);
        result.apply(img);
        return result;
    }
    pxtsprite.resizeBitmap = resizeBitmap;
    function imageLiteralToBitmap(text, defaultPattern) {
        // Strip the tagged template string business and the whitespace. We don't have to exhaustively
        // replace encoded characters because the compiler will catch any disallowed characters and throw
        // an error before the decompilation happens. 96 is backtick and 9 is tab
        text = text.replace(/[ `]|(?:&#96;)|(?:&#9;)|(?:img)/g, "").trim();
        text = text.replace(/^["`\(\)]*/, '').replace(/["`\(\)]*$/, '');
        text = text.replace(/&#10;/g, "\n");
        if (!text && defaultPattern)
            text = defaultPattern;
        var rows = text.split("\n");
        // We support "ragged" sprites so not all rows will be the same length
        var sprite = [];
        var spriteWidth = 0;
        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var rowValues = [];
            for (var c = 0; c < row.length; c++) {
                // This list comes from libs/screen/targetOverrides.ts in pxt-arcade
                // Technically, this could change per target.
                switch (row[c]) {
                    case "0":
                    case ".":
                        rowValues.push(0);
                        break;
                    case "1":
                    case "#":
                        rowValues.push(1);
                        break;
                    case "2":
                    case "T":
                        rowValues.push(2);
                        break;
                    case "3":
                    case "t":
                        rowValues.push(3);
                        break;
                    case "4":
                    case "N":
                        rowValues.push(4);
                        break;
                    case "5":
                    case "n":
                        rowValues.push(5);
                        break;
                    case "6":
                    case "G":
                        rowValues.push(6);
                        break;
                    case "7":
                    case "g":
                        rowValues.push(7);
                        break;
                    case "8":
                        rowValues.push(8);
                        break;
                    case "9":
                        rowValues.push(9);
                        break;
                    case "a":
                    case "A":
                    case "R":
                        rowValues.push(10);
                        break;
                    case "b":
                    case "B":
                    case "P":
                        rowValues.push(11);
                        break;
                    case "c":
                    case "C":
                    case "p":
                        rowValues.push(12);
                        break;
                    case "d":
                    case "D":
                    case "O":
                        rowValues.push(13);
                        break;
                    case "e":
                    case "E":
                    case "Y":
                        rowValues.push(14);
                        break;
                    case "f":
                    case "F":
                    case "W":
                        rowValues.push(15);
                        break;
                }
            }
            if (rowValues.length) {
                sprite.push(rowValues);
                spriteWidth = Math.max(spriteWidth, rowValues.length);
            }
        }
        var spriteHeight = sprite.length;
        var result = new pxtsprite.Bitmap(spriteWidth, spriteHeight);
        for (var r = 0; r < spriteHeight; r++) {
            var row = sprite[r];
            for (var c = 0; c < spriteWidth; c++) {
                if (c < row.length) {
                    result.set(c, r, row[c]);
                }
                else {
                    result.set(c, r, 0);
                }
            }
        }
        return result;
    }
    pxtsprite.imageLiteralToBitmap = imageLiteralToBitmap;
    function bitmapToImageLiteral(bitmap, fileType) {
        var res = '';
        switch (fileType) {
            case "python" /* Python */:
                res = "img(\"\"\"";
                break;
            default:
                res = "img`";
                break;
        }
        if (bitmap) {
            for (var r = 0; r < bitmap.height; r++) {
                res += "\n";
                for (var c = 0; c < bitmap.width; c++) {
                    res += hexChars[bitmap.get(c, r)] + " ";
                }
            }
        }
        res += "\n";
        switch (fileType) {
            case "python" /* Python */:
                res += "\"\"\")";
                break;
            default:
                res += "`";
                break;
        }
        return res;
    }
    pxtsprite.bitmapToImageLiteral = bitmapToImageLiteral;
})(pxtsprite || (pxtsprite = {}));
var pxtsprite;
(function (pxtsprite) {
    var svg = pxt.svgUtil;
    var TOGGLE_WIDTH = 200;
    var TOGGLE_HEIGHT = 40;
    var TOGGLE_BORDER_WIDTH = 2;
    var TOGGLE_CORNER_RADIUS = 4;
    var BUTTON_CORNER_RADIUS = 2;
    var BUTTON_BORDER_WIDTH = 1;
    var BUTTON_BOTTOM_BORDER_WIDTH = 2;
    var Toggle = /** @class */ (function () {
        function Toggle(parent, props) {
            this.props = defaultColors(props);
            this.root = parent.group();
            this.buildDom();
            this.isLeft = true;
        }
        Toggle.prototype.buildDom = function () {
            var _this = this;
            // Our css minifier mangles animation names so they need to be injected manually
            this.root.style().content("\n            .toggle-left {\n                transform: translateX(0px);\n                animation: mvleft 0.2s 0s ease;\n            }\n\n            .toggle-right {\n                transform: translateX(100px);\n                animation: mvright 0.2s 0s ease;\n            }\n\n            @keyframes mvright {\n                0% {\n                    transform: translateX(0px);\n                }\n                100% {\n                    transform: translateX(100px);\n                }\n            }\n\n            @keyframes mvleft {\n                0% {\n                    transform: translateX(100px);\n                }\n                100% {\n                    transform: translateX(0px);\n                }\n            }\n            ");
            // The outer border has an inner-stroke so we need to clip out the outer part
            // because SVG's don't support "inner borders"
            var clip = this.root.def().create("clipPath", "sprite-editor-toggle-border")
                .clipPathUnits(true);
            clip.draw("rect")
                .at(0, 0)
                .corners(TOGGLE_CORNER_RADIUS / TOGGLE_WIDTH, TOGGLE_CORNER_RADIUS / TOGGLE_HEIGHT)
                .size(1, 1);
            // Draw the outer border
            this.root.draw("rect")
                .size(TOGGLE_WIDTH, TOGGLE_HEIGHT)
                .fill(this.props.baseColor)
                .stroke(this.props.borderColor, TOGGLE_BORDER_WIDTH * 2)
                .corners(TOGGLE_CORNER_RADIUS, TOGGLE_CORNER_RADIUS)
                .clipPath("url(#sprite-editor-toggle-border)");
            // Draw the background
            this.root.draw("rect")
                .at(TOGGLE_BORDER_WIDTH, TOGGLE_BORDER_WIDTH)
                .size(TOGGLE_WIDTH - TOGGLE_BORDER_WIDTH * 2, TOGGLE_HEIGHT - TOGGLE_BORDER_WIDTH * 2)
                .fill(this.props.backgroundColor)
                .corners(TOGGLE_CORNER_RADIUS, TOGGLE_CORNER_RADIUS);
            // Draw the switch
            this.switch = this.root.draw("rect")
                .at(TOGGLE_BORDER_WIDTH, TOGGLE_BORDER_WIDTH)
                .size((TOGGLE_WIDTH - TOGGLE_BORDER_WIDTH * 2) / 2, TOGGLE_HEIGHT - TOGGLE_BORDER_WIDTH * 2)
                .fill(this.props.switchColor)
                .corners(TOGGLE_CORNER_RADIUS, TOGGLE_CORNER_RADIUS);
            // Draw the left option
            this.leftElement = this.root.group();
            this.leftText = mkText(this.props.leftText)
                .appendClass("sprite-editor-text")
                .fill(this.props.selectedTextColor);
            this.leftElement.appendChild(this.leftText);
            // Draw the right option
            this.rightElement = this.root.group();
            this.rightText = mkText(this.props.rightText)
                .appendClass("sprite-editor-text")
                .fill(this.props.unselectedTextColor);
            this.rightElement.appendChild(this.rightText);
            this.root.onClick(function () { return _this.toggle(); });
        };
        Toggle.prototype.toggle = function (quiet) {
            if (quiet === void 0) { quiet = false; }
            if (this.isLeft) {
                this.switch.removeClass("toggle-left");
                this.switch.appendClass("toggle-right");
                this.leftText.fill(this.props.unselectedTextColor);
                this.rightText.fill(this.props.selectedTextColor);
            }
            else {
                this.switch.removeClass("toggle-right");
                this.switch.appendClass("toggle-left");
                this.leftText.fill(this.props.selectedTextColor);
                this.rightText.fill(this.props.unselectedTextColor);
            }
            this.isLeft = !this.isLeft;
            if (!quiet && this.changeHandler) {
                this.changeHandler(this.isLeft);
            }
        };
        Toggle.prototype.onStateChange = function (handler) {
            this.changeHandler = handler;
        };
        Toggle.prototype.layout = function () {
            var centerOffset = (TOGGLE_WIDTH - TOGGLE_BORDER_WIDTH * 2) / 4;
            this.leftText.moveTo(centerOffset + TOGGLE_BORDER_WIDTH, TOGGLE_HEIGHT / 2);
            this.rightText.moveTo(TOGGLE_WIDTH - TOGGLE_BORDER_WIDTH - centerOffset, TOGGLE_HEIGHT / 2);
        };
        Toggle.prototype.translate = function (x, y) {
            this.root.translate(x, y);
        };
        Toggle.prototype.height = function () {
            return TOGGLE_HEIGHT;
        };
        Toggle.prototype.width = function () {
            return TOGGLE_WIDTH;
        };
        return Toggle;
    }());
    pxtsprite.Toggle = Toggle;
    var Button = /** @class */ (function () {
        function Button(root, cx, cy) {
            var _this = this;
            this.root = root;
            this.cx = cx;
            this.cy = cy;
            this.root.onClick(function () { return _this.clickHandler && _this.clickHandler(); });
            this.root.appendClass("sprite-editor-button");
        }
        Button.prototype.getElement = function () {
            return this.root;
        };
        Button.prototype.addClass = function (className) {
            this.root.appendClass(className);
        };
        Button.prototype.removeClass = function (className) {
            this.root.removeClass(className);
        };
        Button.prototype.onClick = function (clickHandler) {
            this.clickHandler = clickHandler;
        };
        Button.prototype.translate = function (x, y) {
            this.root.translate(x, y);
        };
        Button.prototype.title = function (text) {
            this._title = text;
            this.setRootTitle();
        };
        Button.prototype.shortcut = function (text) {
            this._shortcut = text;
            this.setRootTitle();
        };
        Button.prototype.setRootTitle = function () {
            this.root.title(this._title + (this._shortcut ? " (" + this._shortcut + ")" : ""));
        };
        Button.prototype.setDisabled = function (disabled) {
            this.editClass("disabled", disabled);
        };
        Button.prototype.setSelected = function (selected) {
            this.editClass("selected", selected);
        };
        Button.prototype.layout = function () { };
        Button.prototype.editClass = function (className, add) {
            if (add) {
                this.root.appendClass(className);
            }
            else {
                this.root.removeClass(className);
            }
        };
        return Button;
    }());
    pxtsprite.Button = Button;
    var TextButton = /** @class */ (function (_super) {
        __extends(TextButton, _super);
        function TextButton(button, text, className) {
            var _this = _super.call(this, button.root, button.cx, button.cy) || this;
            _this.textEl = mkText(text)
                .appendClass(className);
            _this.textEl.moveTo(_this.cx, _this.cy);
            _this.root.appendChild(_this.textEl);
            return _this;
        }
        TextButton.prototype.setText = function (text) {
            this.textEl.text(text);
            this.textEl.moveTo(this.cx, this.cy);
        };
        TextButton.prototype.getComputedTextLength = function () {
            try {
                return this.textEl.el.getComputedTextLength();
            }
            catch (e) {
                // Internet Explorer and Microsoft Edge throw if the element
                // is not visible. The best we can do is approximate
                return this.textEl.el.textContent.length * 8;
            }
        };
        return TextButton;
    }(Button));
    pxtsprite.TextButton = TextButton;
    var StandaloneTextButton = /** @class */ (function (_super) {
        __extends(StandaloneTextButton, _super);
        function StandaloneTextButton(text, height) {
            var _this = _super.call(this, drawSingleButton(65, height), text, "sprite-editor-text") || this;
            _this.height = height;
            _this.padding = 30;
            _this.addClass("sprite-editor-label");
            return _this;
        }
        StandaloneTextButton.prototype.layout = function () {
            var newBG = drawSingleButton(this.width(), this.height);
            while (this.root.el.hasChildNodes()) {
                this.root.el.removeChild(this.root.el.firstChild);
            }
            while (newBG.root.el.hasChildNodes()) {
                var el = newBG.root.el.firstChild;
                newBG.root.el.removeChild(el);
                this.root.el.appendChild(el);
            }
            this.cx = newBG.cx;
            this.cy = newBG.cy;
            this.root.appendChild(this.textEl);
            this.textEl.moveTo(this.cx, this.cy);
        };
        StandaloneTextButton.prototype.width = function () {
            return this.getComputedTextLength() + this.padding * 2;
        };
        return StandaloneTextButton;
    }(TextButton));
    pxtsprite.StandaloneTextButton = StandaloneTextButton;
    var CursorButton = /** @class */ (function (_super) {
        __extends(CursorButton, _super);
        function CursorButton(root, cx, cy, width) {
            var _this = _super.call(this, root, cx, cy) || this;
            _this.root.draw("rect")
                .fill("white")
                .size(width, width)
                .at(Math.floor(_this.cx - width / 2), Math.floor(_this.cy - width / 2));
            return _this;
        }
        return CursorButton;
    }(Button));
    pxtsprite.CursorButton = CursorButton;
    function mkIconButton(icon, width, height) {
        if (height === void 0) { height = width + BUTTON_BOTTOM_BORDER_WIDTH - BUTTON_BORDER_WIDTH; }
        var g = drawSingleButton(width, height);
        return new TextButton(g, icon, "sprite-editor-icon");
    }
    pxtsprite.mkIconButton = mkIconButton;
    function mkXIconButton(icon, width, height) {
        if (height === void 0) { height = width + BUTTON_BOTTOM_BORDER_WIDTH - BUTTON_BORDER_WIDTH; }
        var g = drawSingleButton(width, height);
        return new TextButton(g, icon, "sprite-editor-xicon");
    }
    pxtsprite.mkXIconButton = mkXIconButton;
    function mkTextButton(text, width, height) {
        var g = drawSingleButton(width, height);
        var t = new TextButton(g, text, "sprite-editor-text");
        t.addClass("sprite-editor-label");
        return t;
    }
    pxtsprite.mkTextButton = mkTextButton;
    /**
     * Draws a button suitable for the left end of a button group.
     *
     * @param width The total width of the result (including border)
     * @param height The total height of the resul (including border and lip)
     * @param lip  The width of the bottom border
     * @param border The width of the outer border (except bottom)
     * @param r The corner radius
     */
    function drawLeftButton(width, height, lip, border, r) {
        var root = new svg.Group().appendClass("sprite-editor-button");
        var bg = root.draw("path")
            .appendClass("sprite-editor-button-bg");
        bg.d.moveTo(r, 0)
            .lineBy(width - r, 0)
            .lineBy(0, height)
            .lineBy(-(width - r), 0)
            .arcBy(r, r, 0, false, true, -r, -r)
            .lineBy(0, -(height - (r << 1)))
            .arcBy(r, r, 0, false, true, r, -r)
            .close();
        bg.update();
        var fg = root.draw("path")
            .appendClass("sprite-editor-button-fg");
        fg.d.moveTo(border + r, border)
            .lineBy(width - border - r, 0)
            .lineBy(0, height - lip - border)
            .lineBy(-(width - border - r), 0)
            .arcBy(r, r, 0, false, true, -r, -r)
            .lineBy(0, -(height - lip - border - (r << 1)))
            .arcBy(r, r, 0, false, true, r, -r)
            .close();
        fg.update();
        return {
            root: root,
            cx: border + (width - border) / 2,
            cy: border + (height - lip) / 2
        };
    }
    var CursorMultiButton = /** @class */ (function () {
        function CursorMultiButton(parent, width) {
            var _this = this;
            this.root = parent.group();
            var widths = [4, 7, 10];
            this.buttons = buttonGroup(65, 21, 3).map(function (b, i) { return new CursorButton(b.root, b.cx, b.cy, widths[i]); });
            this.buttons.forEach(function (button, index) {
                button.onClick(function () { return _this.handleClick(index); });
                button.title(sizeAdjective(index));
                _this.root.appendChild(button.getElement());
            });
        }
        CursorMultiButton.prototype.handleClick = function (index) {
            if (index === this.selected)
                return;
            if (this.selected != undefined) {
                this.buttons[this.selected].setSelected(false);
            }
            this.selected = index;
            if (this.selected != undefined) {
                this.buttons[this.selected].setSelected(true);
            }
            if (this.indexHandler)
                this.indexHandler(index);
        };
        CursorMultiButton.prototype.onSelected = function (cb) {
            this.indexHandler = cb;
        };
        return CursorMultiButton;
    }());
    pxtsprite.CursorMultiButton = CursorMultiButton;
    var UndoRedoGroup = /** @class */ (function () {
        function UndoRedoGroup(parent, host, width, height) {
            var _this = this;
            this.root = parent.group();
            this.host = host;
            var _a = buttonGroup(width, height, 2), undo = _a[0], redo = _a[1];
            this.undo = new TextButton(undo, "\uf118", "sprite-editor-xicon");
            this.undo.onClick(function () { return _this.host.undo(); });
            this.undo.title(lf("Undo"));
            this.root.appendChild(this.undo.getElement());
            this.redo = new TextButton(redo, "\uf111", "sprite-editor-xicon");
            this.redo.onClick(function () { return _this.host.redo(); });
            this.redo.title(lf("Redo"));
            this.root.appendChild(this.redo.getElement());
        }
        UndoRedoGroup.prototype.translate = function (x, y) {
            this.root.translate(x, y);
        };
        UndoRedoGroup.prototype.updateState = function (undo, redo) {
            this.undo.setDisabled(undo);
            this.redo.setDisabled(redo);
        };
        return UndoRedoGroup;
    }());
    pxtsprite.UndoRedoGroup = UndoRedoGroup;
    function defaultColors(props) {
        if (!props.baseColor)
            props.baseColor = "#e95153";
        if (!props.backgroundColor)
            props.backgroundColor = "rgba(52,73,94,.2)";
        if (!props.borderColor)
            props.borderColor = "rgba(52,73,94,.4)";
        if (!props.selectedTextColor)
            props.selectedTextColor = props.baseColor;
        if (!props.unselectedTextColor)
            props.unselectedTextColor = "hsla(0,0%,100%,.9)";
        if (!props.switchColor)
            props.switchColor = "#ffffff";
        return props;
    }
    function sizeAdjective(cursorIndex) {
        switch (cursorIndex) {
            case 0: return lf("Small Cursor");
            case 1: return lf("Medium Cursor");
            case 2: return lf("Large Cursor");
        }
        return undefined;
    }
    /**
 * Draws a button suitable for the interior of a button group.
 *
 * @param width The total width of the result (including border)
 * @param height The total height of the resul (including border and lip)
 * @param lip  The width of the bottom border
 * @param border The width of the outer border (except bottom)
 */
    function drawMidButton(width, height, lip, border) {
        var root = new svg.Group().appendClass("sprite-editor-button");
        var bg = root.draw("rect")
            .appendClass("sprite-editor-button-bg")
            .size(width, height);
        var fg = root.draw("rect")
            .appendClass("sprite-editor-button-fg")
            .size(width - border, height - lip - border)
            .at(border, border);
        return {
            root: root,
            cx: border + (width - border) / 2,
            cy: border + (height - lip) / 2
        };
    }
    /**
     * Draws a button suitable for the right end of a button group.
     *
     * @param width The total width of the result (including border)
     * @param height The total height of the resul (including border and lip)
     * @param lip  The width of the bottom border
     * @param border The width of the outer border (except bottom)
     * @param r The corner radius
     */
    function drawRightButton(width, height, lip, border, r) {
        var root = new svg.Group().appendClass("sprite-editor-button");
        var bg = root.draw("path")
            .appendClass("sprite-editor-button-bg");
        bg.d.moveTo(0, 0)
            .lineBy(width - r, 0)
            .arcBy(r, r, 0, false, true, r, r)
            .lineBy(0, height - (r << 1))
            .arcBy(r, r, 0, false, true, -r, r)
            .lineBy(-(width - r), 0)
            .lineBy(0, -height)
            .close();
        bg.update();
        var fg = root.draw("path")
            .appendClass("sprite-editor-button-fg");
        fg.d.moveTo(border, border)
            .lineBy(width - border - r, 0)
            .arcBy(r, r, 0, false, true, r, r)
            .lineBy(0, height - border - lip - (r << 1))
            .arcBy(r, r, 0, false, true, -r, r)
            .lineBy(-(width - border - r), 0)
            .lineBy(0, -(height - border - lip))
            .close();
        fg.update();
        var content = root.group().id("sprite-editor-button-content");
        content.translate(border + (width - (border << 1)) >> 1, (height - lip - border) >> 1);
        return {
            root: root,
            cx: width / 2,
            cy: border + (height - lip) / 2
        };
    }
    /**
     * Draws a standalone button.
     *
     * @param width The total width of the result (including border)
     * @param height The total height of the resul (including border and lip)
     * @param lip  The width of the bottom border
     * @param border The width of the outer border (except bottom)
     * @param r The corner radius
     */
    function drawSingleButton(width, height, lip, border, r) {
        if (lip === void 0) { lip = BUTTON_BOTTOM_BORDER_WIDTH; }
        if (border === void 0) { border = BUTTON_BORDER_WIDTH; }
        if (r === void 0) { r = BUTTON_CORNER_RADIUS; }
        var root = new svg.Group().appendClass("sprite-editor-button");
        root.draw("rect")
            .size(width, height)
            .corners(r, r)
            .appendClass("sprite-editor-button-bg");
        root.draw("rect")
            .at(border, border)
            .size(width - (border << 1), height - lip - border)
            .corners(r, r)
            .appendClass("sprite-editor-button-fg");
        return {
            root: root,
            cx: width / 2,
            cy: border + (height - lip) / 2
        };
    }
    function buttonGroup(width, height, segments, lip, border, r) {
        if (lip === void 0) { lip = BUTTON_BOTTOM_BORDER_WIDTH; }
        if (border === void 0) { border = BUTTON_BORDER_WIDTH; }
        if (r === void 0) { r = BUTTON_CORNER_RADIUS; }
        var available = width - (segments + 1) * border;
        var segmentWidth = Math.floor(available / segments);
        var result = [];
        for (var i = 0; i < segments; i++) {
            if (i === 0) {
                result.push(drawLeftButton(segmentWidth + border, height, lip, border, r));
            }
            else if (i === segments - 1) {
                var b = drawRightButton(segmentWidth + (border << 1), height, lip, border, r);
                b.root.translate((border + segmentWidth) * i, 0);
                result.push(b);
            }
            else {
                var b = drawMidButton(segmentWidth + border, height, lip, border);
                b.root.translate((border + segmentWidth) * i, 0);
                result.push(b);
            }
        }
        return result;
    }
    function mkText(text) {
        return new svg.Text(text)
            .anchor("middle")
            .setAttribute("dominant-baseline", "middle")
            .setAttribute("dy", (pxt.BrowserUtils.isIE() || pxt.BrowserUtils.isEdge()) ? "0.3em" : "0.1em");
    }
    pxtsprite.mkText = mkText;
})(pxtsprite || (pxtsprite = {}));
var pxtsprite;
(function (pxtsprite) {
    var alphaCellWidth = 5;
    var dropdownPaddding = 4;
    var lightModeBackground = "#dedede";
    var CanvasGrid = /** @class */ (function () {
        function CanvasGrid(palette, state, lightMode, scale) {
            if (lightMode === void 0) { lightMode = false; }
            var _this = this;
            this.palette = palette;
            this.state = state;
            this.lightMode = lightMode;
            this.cellWidth = 16;
            this.cellHeight = 16;
            this.upHandler = function (ev) {
                _this.endDrag();
                var _a = _this.clientEventToCell(ev), col = _a[0], row = _a[1];
                _this.gesture.handle(InputEvent.Up, col, row);
                ev.stopPropagation();
                ev.preventDefault();
            };
            this.leaveHandler = function (ev) {
                _this.endDrag();
                var _a = _this.clientEventToCell(ev), col = _a[0], row = _a[1];
                _this.gesture.handle(InputEvent.Leave, col, row);
                ev.stopPropagation();
                ev.preventDefault();
            };
            this.moveHandler = function (ev) {
                var _a = _this.clientEventToCell(ev), col = _a[0], row = _a[1];
                if (col >= 0 && row >= 0 && col < _this.image.width && row < _this.image.height) {
                    if (ev.buttons & 1) {
                        _this.gesture.handle(InputEvent.Down, col, row);
                    }
                    _this.gesture.handle(InputEvent.Move, col, row);
                }
                ev.stopPropagation();
                ev.preventDefault();
            };
            this.hoverHandler = function (ev) {
                var _a = _this.clientEventToCell(ev), col = _a[0], row = _a[1];
                if (col >= 0 && row >= 0 && col < _this.image.width && row < _this.image.height) {
                    _this.gesture.handle(InputEvent.Move, col, row);
                    _this.gesture.isHover = true;
                }
                else if (_this.gesture.isHover) {
                    _this.gesture.isHover = false;
                    _this.gesture.handle(InputEvent.Leave, -1, -1);
                }
            };
            this.scale = scale;
            this.paintLayer = document.createElement("canvas");
            this.paintLayer.setAttribute("class", "sprite-editor-canvas");
            this.overlayLayer = document.createElement("canvas");
            this.overlayLayer.setAttribute("class", "sprite-editor-canvas");
            if (!this.lightMode) {
                this.backgroundLayer = document.createElement("canvas");
                this.backgroundLayer.setAttribute("class", "sprite-editor-canvas");
                this.context = this.paintLayer.getContext("2d");
            }
            else {
                this.context = this.paintLayer.getContext("2d", { alpha: false });
                this.context.fillStyle = lightModeBackground;
                this.context.fill();
            }
            this.hideOverlay();
        }
        Object.defineProperty(CanvasGrid.prototype, "image", {
            get: function () {
                return this.state.image;
            },
            enumerable: true,
            configurable: true
        });
        CanvasGrid.prototype.setEyedropperMouse = function (on) {
            var eyedropperClass = "sprite-editor-eyedropper";
            var toApply = on ? pxt.BrowserUtils.addClass : pxt.BrowserUtils.removeClass;
            toApply(this.paintLayer, eyedropperClass);
            toApply(this.overlayLayer, eyedropperClass);
            if (!this.lightMode) {
                toApply(this.backgroundLayer, eyedropperClass);
            }
        };
        CanvasGrid.prototype.repaint = function () {
            this.clearContext(this.context);
            this.drawImage();
            if (this.state.floatingLayer)
                this.drawFloatingLayer();
            else
                this.hideOverlay();
        };
        CanvasGrid.prototype.applyEdit = function (edit, cursorCol, cursorRow, gestureEnd) {
            if (gestureEnd === void 0) { gestureEnd = false; }
            edit.doEdit(this.state);
            this.drawCursor(edit, cursorCol, cursorRow);
        };
        CanvasGrid.prototype.drawCursor = function (edit, col, row) {
            var _this = this;
            var cursor = edit.getCursor();
            if (cursor) {
                this.repaint();
                if (edit.showPreview) {
                    edit.drawCursor(col, row, function (c, r) {
                        _this.drawColor(c, r, edit.color);
                    });
                }
                this.context.strokeStyle = "#898989";
                this.context.strokeRect((col + cursor.offsetX) * this.cellWidth, (row + cursor.offsetY) * this.cellHeight, cursor.width * this.cellWidth, cursor.height * this.cellHeight);
            }
            else if (edit.isStarted) {
                this.repaint();
            }
        };
        CanvasGrid.prototype.bitmap = function () {
            return this.image;
        };
        CanvasGrid.prototype.outerWidth = function () {
            return this.paintLayer.getBoundingClientRect().width;
        };
        CanvasGrid.prototype.outerHeight = function () {
            return this.paintLayer.getBoundingClientRect().height;
        };
        CanvasGrid.prototype.writeColor = function (col, row, color) {
            this.image.set(col, row, color);
            this.drawColor(col, row, color);
        };
        CanvasGrid.prototype.drawColor = function (col, row, color, context, transparency) {
            if (context === void 0) { context = this.context; }
            if (transparency === void 0) { transparency = !this.lightMode; }
            var x = col * this.cellWidth;
            var y = row * this.cellHeight;
            if (color) {
                context.fillStyle = this.palette[color - 1];
                context.fillRect(x, y, this.cellWidth, this.cellHeight);
            }
            else if (!transparency) {
                context.fillStyle = lightModeBackground;
                context.fillRect(x, y, this.cellWidth, this.cellHeight);
            }
        };
        CanvasGrid.prototype.restore = function (state, repaint) {
            if (repaint === void 0) { repaint = false; }
            if (state.height != this.image.height || state.width != this.image.width) {
                this.state = state.copy();
                this.resizeGrid(state.width, state.width * state.height);
            }
            else {
                this.state = state.copy();
            }
            if (repaint) {
                this.repaint();
            }
        };
        CanvasGrid.prototype.showResizeOverlay = function () {
            var _this = this;
            if (this.lightMode)
                return;
            if (this.fadeAnimation) {
                this.fadeAnimation.kill();
            }
            this.showOverlay();
            this.stopSelectAnimation();
            var w = this.overlayLayer.width;
            var h = this.overlayLayer.height;
            var context = this.overlayLayer.getContext("2d");
            var toastWidth = 100;
            var toastHeight = 40;
            var toastLeft = w / 2 - toastWidth / 2;
            var toastTop = h / 2 - toastWidth / 4;
            this.fadeAnimation = new Fade(function (opacity, dead) {
                if (dead) {
                    _this.drawFloatingLayer();
                    return;
                }
                _this.clearContext(context);
                context.globalAlpha = opacity;
                context.fillStyle = "#898989";
                // After 32x32 the grid isn't easy to see anymore so skip it
                if (_this.image.width <= 32 && _this.image.height <= 32) {
                    for (var c = 1; c < _this.image.width; c++) {
                        context.fillRect(c * _this.cellWidth, 0, 1, h);
                    }
                    for (var r = 1; r < _this.image.height; r++) {
                        context.fillRect(0, r * _this.cellHeight, w, 1);
                    }
                }
                context.fillRect(toastLeft, toastTop, toastWidth, toastHeight);
                context.fillStyle = "#ffffff";
                context.font = "30px sans-serif";
                context.textBaseline = "middle";
                context.textAlign = "center";
                context.fillText(_this.image.width.toString(), toastLeft + toastWidth / 2 - 25, toastTop + toastHeight / 2);
                context.fillText("x", toastLeft + 50, toastTop + toastHeight / 2, 10);
                context.fillText(_this.image.height.toString(), toastLeft + toastWidth / 2 + 25, toastTop + toastHeight / 2);
            }, 750, 500);
        };
        CanvasGrid.prototype.showOverlay = function () {
            this.overlayLayer.style.visibility = "visible";
        };
        CanvasGrid.prototype.hideOverlay = function () {
            this.stopSelectAnimation();
            this.overlayLayer.style.visibility = "hidden";
            if (this.fadeAnimation) {
                this.fadeAnimation.kill();
            }
        };
        CanvasGrid.prototype.resizeGrid = function (rowLength, numCells) {
            this.repaint();
        };
        CanvasGrid.prototype.setCellDimensions = function (width, height) {
            this.cellWidth = width | 0;
            this.cellHeight = height | 0;
            var canvasWidth = this.cellWidth * this.image.width;
            var canvasHeight = this.cellHeight * this.image.height;
            this.paintLayer.width = canvasWidth;
            this.paintLayer.height = canvasHeight;
            this.overlayLayer.width = canvasWidth;
            this.overlayLayer.height = canvasHeight;
            if (!this.lightMode) {
                this.backgroundLayer.width = canvasWidth;
                this.backgroundLayer.height = canvasHeight;
            }
        };
        CanvasGrid.prototype.setGridDimensions = function (width, height, lockAspectRatio) {
            if (height === void 0) { height = width; }
            if (lockAspectRatio === void 0) { lockAspectRatio = true; }
            var maxCellWidth = width / this.image.width;
            var maxCellHeight = height / this.image.height;
            if (lockAspectRatio) {
                var aspectRatio = this.cellWidth / this.cellHeight;
                if (aspectRatio >= 1) {
                    var w = Math.min(maxCellWidth, maxCellHeight * aspectRatio);
                    this.setCellDimensions(w, w * aspectRatio);
                }
                else {
                    var h = Math.min(maxCellHeight, maxCellWidth / aspectRatio);
                    this.setCellDimensions(h / aspectRatio, h);
                }
            }
            else {
                this.setCellDimensions(maxCellWidth, maxCellHeight);
            }
        };
        CanvasGrid.prototype.down = function (handler) {
            this.initDragSurface();
            this.gesture.subscribe(GestureType.Down, handler);
        };
        CanvasGrid.prototype.up = function (handler) {
            this.initDragSurface();
            this.gesture.subscribe(GestureType.Up, handler);
        };
        CanvasGrid.prototype.drag = function (handler) {
            this.initDragSurface();
            this.gesture.subscribe(GestureType.Drag, handler);
        };
        CanvasGrid.prototype.move = function (handler) {
            this.initDragSurface();
            this.gesture.subscribe(GestureType.Move, handler);
        };
        CanvasGrid.prototype.leave = function (handler) {
            this.initDragSurface();
            this.gesture.subscribe(GestureType.Leave, handler);
        };
        CanvasGrid.prototype.updateBounds = function (top, left, width, height) {
            this.layoutCanvas(this.paintLayer, top, left, width, height);
            this.layoutCanvas(this.overlayLayer, top, left, width, height);
            if (!this.lightMode) {
                this.layoutCanvas(this.backgroundLayer, top, left, width, height);
            }
            this.drawImage();
            this.drawBackground();
        };
        CanvasGrid.prototype.render = function (parent) {
            if (!this.lightMode) {
                parent.appendChild(this.backgroundLayer);
            }
            parent.appendChild(this.paintLayer);
            parent.appendChild(this.overlayLayer);
        };
        CanvasGrid.prototype.removeMouseListeners = function () {
            this.stopSelectAnimation();
            if (this.fadeAnimation)
                this.fadeAnimation.kill();
            this.endDrag();
        };
        CanvasGrid.prototype.onEditStart = function (col, row, edit) {
            edit.start(col, row, this.state);
        };
        CanvasGrid.prototype.onEditEnd = function (col, row, edit) {
            edit.end(col, row, this.state);
            this.drawFloatingLayer();
        };
        CanvasGrid.prototype.drawImage = function (image, context, left, top, transparency) {
            if (image === void 0) { image = this.image; }
            if (context === void 0) { context = this.context; }
            if (left === void 0) { left = 0; }
            if (top === void 0) { top = 0; }
            if (transparency === void 0) { transparency = !this.lightMode; }
            for (var c = 0; c < image.width; c++) {
                for (var r = 0; r < image.height; r++) {
                    this.drawColor(left + c, top + r, image.get(c, r), context, transparency);
                }
            }
        };
        CanvasGrid.prototype.drawBackground = function () {
            if (this.lightMode)
                return;
            var context = this.backgroundLayer.getContext("2d", { alpha: false });
            var alphaCols = Math.ceil(this.paintLayer.width / alphaCellWidth);
            var alphaRows = Math.ceil(this.paintLayer.height / alphaCellWidth);
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, this.paintLayer.width, this.paintLayer.height);
            context.fillStyle = "#dedede";
            for (var ac = 0; ac < alphaCols; ac++) {
                for (var ar = 0; ar < alphaRows; ar++) {
                    if ((ac + ar) % 2) {
                        context.fillRect(ac * alphaCellWidth, ar * alphaCellWidth, alphaCellWidth, alphaCellWidth);
                    }
                }
            }
        };
        /**
         * This calls getBoundingClientRect() so don't call it in a loop!
         */
        CanvasGrid.prototype.clientEventToCell = function (ev) {
            var coord = clientCoord(ev);
            var bounds = this.paintLayer.getBoundingClientRect();
            var left = bounds.left + (window.scrollX !== null ? window.scrollX : window.pageXOffset);
            var top = bounds.top + (window.scrollY !== null ? window.scrollY : window.pageYOffset);
            this.mouseCol = Math.floor((((coord.clientX) - left) / this.cellWidth) / this.scale);
            this.mouseRow = Math.floor((((coord.clientY) - top) / this.cellHeight) / this.scale);
            return [
                this.mouseCol,
                this.mouseRow
            ];
        };
        CanvasGrid.prototype.drawFloatingLayer = function () {
            if (!this.state.floatingLayer) {
                return;
            }
            this.drawImage(this.state.floatingLayer, this.context, this.state.layerOffsetX, this.state.layerOffsetY, true);
            this.drawSelectionAnimation();
        };
        CanvasGrid.prototype.drawSelectionAnimation = function (dashOffset) {
            var _this = this;
            if (dashOffset === void 0) { dashOffset = 0; }
            if (!this.state.floatingLayer) {
                this.hideOverlay();
                return;
            }
            this.showOverlay();
            var context = this.overlayLayer.getContext("2d");
            this.clearContext(context);
            context.globalAlpha = 1;
            context.strokeStyle = "#303030";
            context.lineWidth = 2;
            context.setLineDash([5, 3]);
            context.lineDashOffset = dashOffset;
            context.strokeRect(this.state.layerOffsetX * this.cellWidth, this.state.layerOffsetY * this.cellHeight, this.state.floatingLayer.width * this.cellWidth, this.state.floatingLayer.height * this.cellHeight);
            if (!this.lightMode && !this.selectAnimation && (!this.fadeAnimation || this.fadeAnimation.dead)) {
                var drawLayer = function () {
                    dashOffset++;
                    requestAnimationFrame(function () { return _this.drawSelectionAnimation(dashOffset); });
                };
                this.selectAnimation = setInterval(drawLayer, 40);
            }
        };
        CanvasGrid.prototype.clearContext = function (context) {
            // Paint Layer has the same dimensions as all other contexts
            context.clearRect(0, 0, this.paintLayer.width, this.paintLayer.height);
        };
        CanvasGrid.prototype.initDragSurface = function () {
            if (!this.gesture) {
                this.gesture = new GestureState();
                this.bindEvents(this.paintLayer);
                this.bindEvents(this.overlayLayer);
                document.addEventListener(pxt.BrowserUtils.pointerEvents.move, this.hoverHandler);
            }
        };
        CanvasGrid.prototype.bindEvents = function (surface) {
            var _this = this;
            pxt.BrowserUtils.pointerEvents.down.forEach(function (evId) {
                surface.addEventListener(evId, function (ev) {
                    _this.startDrag();
                    var _a = _this.clientEventToCell(ev), col = _a[0], row = _a[1];
                    _this.gesture.handle(InputEvent.Down, col, row);
                });
            });
            // surface.addEventListener("click", (ev: MouseEvent) => {
            //     const [col, row] = this.clientEventToCell(ev);
            //     this.gesture.handle(InputEvent.Down, col, row);
            //     this.gesture.handle(InputEvent.Up, col, row);
            // });
        };
        CanvasGrid.prototype.startDrag = function () {
            document.removeEventListener(pxt.BrowserUtils.pointerEvents.move, this.hoverHandler);
            document.addEventListener(pxt.BrowserUtils.pointerEvents.move, this.moveHandler);
            document.addEventListener(pxt.BrowserUtils.pointerEvents.up, this.upHandler);
            if (pxt.BrowserUtils.isTouchEnabled() && !pxt.BrowserUtils.hasPointerEvents()) {
                document.addEventListener("touchend", this.upHandler);
                document.addEventListener("touchcancel", this.leaveHandler);
            }
            else {
                document.addEventListener(pxt.BrowserUtils.pointerEvents.leave, this.leaveHandler);
            }
        };
        CanvasGrid.prototype.endDrag = function () {
            document.addEventListener(pxt.BrowserUtils.pointerEvents.move, this.hoverHandler);
            document.removeEventListener(pxt.BrowserUtils.pointerEvents.move, this.moveHandler);
            document.removeEventListener(pxt.BrowserUtils.pointerEvents.up, this.upHandler);
            document.removeEventListener(pxt.BrowserUtils.pointerEvents.leave, this.leaveHandler);
            if (pxt.BrowserUtils.isTouchEnabled() && !pxt.BrowserUtils.hasPointerEvents()) {
                document.removeEventListener("touchend", this.upHandler);
                document.removeEventListener("touchcancel", this.leaveHandler);
            }
            else {
                document.removeEventListener(pxt.BrowserUtils.pointerEvents.leave, this.leaveHandler);
            }
        };
        CanvasGrid.prototype.layoutCanvas = function (canvas, top, left, width, height) {
            canvas.style.position = "absolute";
            if (this.image.width === this.image.height) {
                canvas.style.top = top + "px";
                canvas.style.left = left + "px";
            }
            else if (this.image.width > this.image.height) {
                canvas.style.top = (top + dropdownPaddding + (height - canvas.height) / 2) + "px";
                canvas.style.left = left + "px";
            }
            else {
                canvas.style.top = top + "px";
                canvas.style.left = (left + dropdownPaddding + (width - canvas.width) / 2) + "px";
            }
        };
        CanvasGrid.prototype.stopSelectAnimation = function () {
            if (this.selectAnimation) {
                clearInterval(this.selectAnimation);
                this.selectAnimation = undefined;
            }
        };
        return CanvasGrid;
    }());
    pxtsprite.CanvasGrid = CanvasGrid;
    var InputEvent;
    (function (InputEvent) {
        InputEvent[InputEvent["Up"] = 0] = "Up";
        InputEvent[InputEvent["Down"] = 1] = "Down";
        InputEvent[InputEvent["Move"] = 2] = "Move";
        InputEvent[InputEvent["Leave"] = 3] = "Leave";
    })(InputEvent || (InputEvent = {}));
    var GestureType;
    (function (GestureType) {
        GestureType[GestureType["Up"] = 0] = "Up";
        GestureType[GestureType["Down"] = 1] = "Down";
        GestureType[GestureType["Move"] = 2] = "Move";
        GestureType[GestureType["Drag"] = 3] = "Drag";
        GestureType[GestureType["Leave"] = 4] = "Leave";
    })(GestureType || (GestureType = {}));
    var GestureState = /** @class */ (function () {
        function GestureState() {
            this.isDown = false;
            this.isHover = false;
            this.handlers = {};
        }
        GestureState.prototype.handle = function (event, col, row) {
            switch (event) {
                case InputEvent.Up:
                    this.update(col, row);
                    this.isDown = false;
                    this.fire(GestureType.Up);
                    break;
                case InputEvent.Down:
                    if (!this.isDown) {
                        this.update(col, row);
                        this.isDown = true;
                        this.fire(GestureType.Down);
                    }
                    break;
                case InputEvent.Move:
                    if (col === this.lastCol && row === this.lastRow)
                        return;
                    this.update(col, row);
                    if (this.isDown) {
                        this.fire(GestureType.Drag);
                    }
                    else {
                        this.fire(GestureType.Move);
                    }
                    break;
                case InputEvent.Leave:
                    this.update(col, row);
                    this.isDown = false;
                    this.fire(GestureType.Leave);
                    break;
            }
        };
        GestureState.prototype.subscribe = function (type, handler) {
            this.handlers[type] = handler;
        };
        GestureState.prototype.update = function (col, row) {
            this.lastCol = col;
            this.lastRow = row;
        };
        GestureState.prototype.fire = function (type) {
            if (this.handlers[type]) {
                this.handlers[type](this.lastCol, this.lastRow);
            }
        };
        return GestureState;
    }());
    var Fade = /** @class */ (function () {
        function Fade(draw, delay, duration) {
            var _this = this;
            this.draw = draw;
            this.start = Date.now() + delay;
            this.end = this.start + duration;
            this.slope = 1 / duration;
            this.dead = false;
            draw(1, false);
            setTimeout(function () { return requestAnimationFrame(function () { return _this.frame(); }); }, delay);
        }
        Fade.prototype.frame = function () {
            var _this = this;
            if (this.dead)
                return;
            var now = Date.now();
            if (now < this.end) {
                var v = 1 - (this.slope * (now - this.start));
                this.draw(v, false);
                requestAnimationFrame(function () { return _this.frame(); });
            }
            else {
                this.kill();
                this.draw(0, true);
            }
        };
        Fade.prototype.kill = function () {
            this.dead = true;
        };
        return Fade;
    }());
    function clientCoord(ev) {
        if (ev.touches) {
            var te = ev;
            if (te.touches.length) {
                return te.touches[0];
            }
            return te.changedTouches[0];
        }
        return ev;
    }
})(pxtsprite || (pxtsprite = {}));
var pxtsprite;
(function (pxtsprite) {
    var CanvasState = /** @class */ (function () {
        function CanvasState(bitmap) {
            this.image = bitmap;
            this.layerOffsetX = 0;
            this.layerOffsetY = 0;
        }
        Object.defineProperty(CanvasState.prototype, "width", {
            get: function () {
                return this.image.width;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CanvasState.prototype, "height", {
            get: function () {
                return this.image.height;
            },
            enumerable: true,
            configurable: true
        });
        CanvasState.prototype.copy = function () {
            var res = new CanvasState();
            res.image = this.image.copy();
            if (this.floatingLayer) {
                res.floatingLayer = this.floatingLayer.copy();
                res.floatingLayer.x0 = this.layerOffsetX;
                res.floatingLayer.y0 = this.layerOffsetY;
            }
            res.layerOffsetX = this.layerOffsetX;
            res.layerOffsetY = this.layerOffsetY;
            return res;
        };
        CanvasState.prototype.equals = function (other) {
            if (!this.image.equals(other.image) || (this.floatingLayer && !other.floatingLayer) || (!this.floatingLayer && other.floatingLayer))
                return false;
            if (this.floatingLayer)
                return this.floatingLayer.equals(other.floatingLayer) && this.layerOffsetX === other.layerOffsetX && this.layerOffsetY === other.layerOffsetY;
            return true;
        };
        CanvasState.prototype.mergeFloatingLayer = function () {
            if (!this.floatingLayer)
                return;
            this.floatingLayer.x0 = this.layerOffsetX;
            this.floatingLayer.y0 = this.layerOffsetY;
            this.image.apply(this.floatingLayer, true);
            this.floatingLayer = undefined;
        };
        CanvasState.prototype.copyToLayer = function (left, top, width, height, cut) {
            if (cut === void 0) { cut = false; }
            if (width === 0 || height === 0)
                return;
            if (width < 0) {
                left += width;
                width = -width;
            }
            if (height < 0) {
                top += height;
                height = -height;
            }
            this.floatingLayer = this.image.copy(left, top, width, height);
            this.layerOffsetX = this.floatingLayer.x0;
            this.layerOffsetY = this.floatingLayer.y0;
            if (cut) {
                for (var c = 0; c < width; c++) {
                    for (var r = 0; r < height; r++) {
                        this.image.set(left + c, top + r, 0);
                    }
                }
            }
        };
        CanvasState.prototype.inFloatingLayer = function (col, row) {
            if (!this.floatingLayer)
                return false;
            col = col - this.layerOffsetX;
            row = row - this.layerOffsetY;
            return col >= 0 && col < this.floatingLayer.width && row >= 0 && row < this.floatingLayer.height;
        };
        return CanvasState;
    }());
    pxtsprite.CanvasState = CanvasState;
})(pxtsprite || (pxtsprite = {}));
var pxtsprite;
(function (pxtsprite) {
    var COLUMNS = 4;
    var Gallery = /** @class */ (function () {
        function Gallery(info) {
            var _this = this;
            this.visible = false;
            this.info = info;
            this.containerDiv = document.createElement("div");
            this.containerDiv.setAttribute("id", "sprite-editor-gallery-outer");
            this.contentDiv = document.createElement("div");
            this.contentDiv.setAttribute("id", "sprite-editor-gallery");
            this.itemBackgroundColor = "#ffffff";
            this.itemBorderColor = "#000000";
            this.initStyles();
            this.containerDiv.appendChild(this.contentDiv);
            this.containerDiv.style.display = "none";
            this.contentDiv.addEventListener("animationend", function () {
                if (!_this.visible) {
                    _this.containerDiv.style.display = "none";
                }
            });
            this.contentDiv.addEventListener('wheel', function (e) {
                e.stopPropagation();
            }, true);
        }
        Gallery.prototype.getElement = function () {
            return this.containerDiv;
        };
        Gallery.prototype.show = function (cb) {
            if (this.pending) {
                this.reject("Error: multiple calls");
            }
            this.pending = cb;
            this.containerDiv.style.display = "block";
            this.buildDom();
            this.visible = true;
            this.contentDiv.setAttribute("class", "shown");
        };
        Gallery.prototype.hide = function () {
            if (this.pending) {
                this.reject("cancelled");
            }
            this.visible = false;
            this.contentDiv.setAttribute("class", "hidden-above");
        };
        Gallery.prototype.layout = function (left, top, height) {
            this.containerDiv.style.left = left + "px";
            this.containerDiv.style.top = top + "px";
            this.containerDiv.style.height = height + "px";
        };
        Gallery.prototype.setFilter = function (filter) {
            var filterPieces = filter && filter.split(" ");
            this.galleryItems = this.applyFilter(this.getGalleryItems("Image"), filterPieces);
        };
        Gallery.prototype.applyFilter = function (target, tags) {
            tags = tags
                .filter(function (el) { return !!el; })
                .map(function (el) { return el.toLowerCase(); });
            var includeTags = tags
                .filter(function (tag) { return tag.indexOf("!") !== 0; });
            var excludeTags = tags
                .filter(function (tag) { return tag.indexOf("!") === 0 && tag.length > 1; })
                .map(function (tag) { return tag.substring(1); });
            return target.filter(function (el) { return checkInclude(el) && checkExclude(el); });
            function checkInclude(item) {
                return includeTags.every(function (filterTag) {
                    var optFilterTag = "?" + filterTag;
                    return item.tags.some(function (tag) {
                        return tag === filterTag || tag === optFilterTag;
                    });
                });
            }
            function checkExclude(item) {
                return excludeTags.every(function (filterTag) {
                    return !item.tags.some(function (tag) { return tag === filterTag; });
                });
            }
        };
        Gallery.prototype.buildDom = function () {
            var _this = this;
            while (this.contentDiv.firstChild)
                this.contentDiv.removeChild(this.contentDiv.firstChild);
            var totalWidth = this.containerDiv.clientWidth - 17;
            var buttonWidth = (Math.floor(totalWidth / COLUMNS) - 8) + "px";
            if (!this.galleryItems) {
                this.galleryItems = this.getGalleryItems("Image");
            }
            this.galleryItems.forEach(function (item, i) { return _this.mkButton(item.src, item.alt, item.qName, i, buttonWidth); });
        };
        Gallery.prototype.initStyles = function () {
            var style = document.createElement("style");
            style.textContent = "\n            #sprite-editor-gallery {\n                margin-top: -100%;\n            }\n\n            #sprite-editor-gallery.hidden-above {\n                margin-top: -100%;\n                animation: slide-up 0.2s 0s ease;\n            }\n\n            #sprite-editor-gallery.shown {\n                margin-top: 0px;\n                animation: slide-down 0.2s 0s ease;\n            }\n\n            @keyframes slide-down {\n                0% {\n                    margin-top: -100%;\n                }\n                100% {\n                    margin-top: 0px;\n                }\n            }\n\n            @keyframes slide-up {\n                0% {\n                    margin-top: 0px;\n                }\n                100% {\n                    margin-top: -100%;\n                }\n            }\n            ";
            this.containerDiv.appendChild(style);
        };
        Gallery.prototype.mkButton = function (src, alt, value, i, width) {
            var _this = this;
            var button = document.createElement('button');
            button.setAttribute('id', ':' + i); // For aria-activedescendant
            button.setAttribute('role', 'menuitem');
            button.setAttribute('class', 'sprite-gallery-button sprite-editor-card');
            button.title = alt;
            button.style.width = width;
            button.style.height = width;
            var backgroundColor = this.itemBackgroundColor;
            button.style.backgroundColor = backgroundColor;
            button.style.borderColor = this.itemBorderColor;
            var parentDiv = this.contentDiv;
            button.addEventListener("click", function () { return _this.handleSelection(value); });
            button.addEventListener(pxt.BrowserUtils.pointerEvents.move, function () {
                button.setAttribute('class', 'sprite-gallery-button sprite-gallery-button-hover sprite-editor-card');
                parentDiv.setAttribute('aria-activedescendant', button.id);
            });
            button.addEventListener(pxt.BrowserUtils.pointerEvents.leave, function () {
                button.setAttribute('class', 'sprite-gallery-button sprite-editor-card');
                parentDiv.removeAttribute('aria-activedescendant');
            });
            var buttonImg = document.createElement('img');
            buttonImg.src = src;
            button.setAttribute('data-value', value);
            buttonImg.setAttribute('data-value', value);
            button.appendChild(buttonImg);
            this.contentDiv.appendChild(button);
        };
        Gallery.prototype.resolve = function (bitmap) {
            if (this.pending) {
                var cb = this.pending;
                this.pending = undefined;
                cb(bitmap);
            }
        };
        Gallery.prototype.reject = function (reason) {
            if (this.pending) {
                var cb = this.pending;
                this.pending = undefined;
                cb(undefined, reason);
            }
        };
        Gallery.prototype.handleSelection = function (value) {
            this.resolve(this.getBitmap(value));
        };
        Gallery.prototype.getBitmap = function (qName) {
            var sym = this.info.apis.byQName[qName];
            var jresURL = sym.attributes.jresURL;
            var data = atob(jresURL.slice(jresURL.indexOf(",") + 1));
            var magic = data.charCodeAt(0);
            var w = data.charCodeAt(1);
            var h = data.charCodeAt(2);
            if (magic === 0x87) {
                magic = 0xe0 | data.charCodeAt(1);
                w = data.charCodeAt(2) | (data.charCodeAt(3) << 8);
                h = data.charCodeAt(4) | (data.charCodeAt(5) << 8);
                data = data.slice(4);
            }
            var out = new pxtsprite.Bitmap(w, h);
            var index = 4;
            if (magic === 0xe1) {
                // Monochrome
                var mask = 0x01;
                var v = data.charCodeAt(index++);
                for (var x = 0; x < w; ++x) {
                    for (var y = 0; y < h; ++y) {
                        out.set(x, y, (v & mask) ? 1 : 0);
                        mask <<= 1;
                        if (mask == 0x100) {
                            mask = 0x01;
                            v = data.charCodeAt(index++);
                        }
                    }
                }
            }
            else {
                // Color
                for (var x = 0; x < w; x++) {
                    for (var y = 0; y < h; y += 2) {
                        var v = data.charCodeAt(index++);
                        out.set(x, y, v & 0xf);
                        if (y != h - 1) {
                            out.set(x, y + 1, (v >> 4) & 0xf);
                        }
                    }
                    while (index & 3)
                        index++;
                }
            }
            return out;
        };
        Gallery.prototype.getGalleryItems = function (qName) {
            var syms = getFixedInstanceDropdownValues(this.info.apis, qName);
            generateIcons(syms);
            return syms.map(function (sym) {
                var splitTags = (sym.attributes.tags || "")
                    .toLowerCase()
                    .split(" ")
                    .filter(function (el) { return !!el; });
                return {
                    qName: sym.qName,
                    src: sym.attributes.iconURL,
                    alt: sym.qName,
                    tags: splitTags
                };
            });
        };
        return Gallery;
    }());
    pxtsprite.Gallery = Gallery;
    function getFixedInstanceDropdownValues(apis, qName) {
        return pxt.Util.values(apis.byQName).filter(function (sym) { return sym.kind === 4 /* Variable */
            && sym.attributes.fixedInstance
            && isSubtype(apis, sym.retType, qName); });
    }
    function isSubtype(apis, specific, general) {
        if (specific == general)
            return true;
        var inf = apis.byQName[specific];
        if (inf && inf.extendsTypes)
            return inf.extendsTypes.indexOf(general) >= 0;
        return false;
    }
    function generateIcons(instanceSymbols) {
        var imgConv = new pxt.ImageConverter();
        instanceSymbols.forEach(function (v) {
            if (v.attributes.jresURL && !v.attributes.iconURL && v.attributes.jresURL.indexOf("data:image/x-mkcd-f") == 0) {
                v.attributes.iconURL = imgConv.convert(v.attributes.jresURL);
            }
        });
    }
})(pxtsprite || (pxtsprite = {}));
/// <reference path="./buttons.ts" />
var pxtsprite;
(function (pxtsprite) {
    var svg = pxt.svgUtil;
    var SpriteHeader = /** @class */ (function () {
        function SpriteHeader(host) {
            var _this = this;
            this.host = host;
            this.div = document.createElement("div");
            this.div.setAttribute("id", "sprite-editor-header");
            this.root = new svg.SVG(this.div).id("sprite-editor-header-controls");
            this.toggle = new pxtsprite.Toggle(this.root, { leftText: "Editor", rightText: "Gallery", baseColor: "#4B7BEC" });
            this.toggle.onStateChange(function (isLeft) {
                if (isLeft) {
                    _this.host.hideGallery();
                }
                else {
                    _this.host.showGallery();
                }
            });
        }
        SpriteHeader.prototype.getElement = function () {
            return this.div;
        };
        SpriteHeader.prototype.layout = function () {
            this.toggle.layout();
            this.toggle.translate((pxtsprite.TOTAL_HEIGHT - this.toggle.width()) / 2, (pxtsprite.HEADER_HEIGHT - this.toggle.height()) / 2);
        };
        return SpriteHeader;
    }());
    pxtsprite.SpriteHeader = SpriteHeader;
})(pxtsprite || (pxtsprite = {}));
// <div role="button" class="closeIcon" tabindex="0">
// <i class="icon close remove circle " aria-hidden="true" role="presentation"></i>
// </div>
function makeCloseButton() {
    var i = document.createElement("i");
    i.className = "icon close remove circle sprite-focus-hover";
    i.setAttribute("role", "presentation");
    i.setAttribute("aria-hidden", "true");
    var d = document.createElement("div");
    d.className = "closeIcon";
    d.setAttribute("tabindex", "0");
    d.setAttribute("role", "button");
    d.appendChild(i);
    return d;
}
/// <reference path="./buttons.ts" />
var pxtsprite;
(function (pxtsprite) {
    var UNDO_REDO_WIDTH = 65;
    var SIZE_BUTTON_WIDTH = 65;
    var SIZE_CURSOR_MARGIN = 10;
    var ReporterBar = /** @class */ (function () {
        function ReporterBar(parent, host, height) {
            var _this = this;
            this.host = host;
            this.height = height;
            this.root = parent.group().id("sprite-editor-reporter-bar");
            this.undoRedo = new pxtsprite.UndoRedoGroup(this.root, host, UNDO_REDO_WIDTH, height);
            this.sizeButton = pxtsprite.mkTextButton("16x16", SIZE_BUTTON_WIDTH, height);
            this.sizeButton.onClick(function () { return _this.nextSize(); });
            this.sizeButton.title(lf("Change size"));
            this.root.appendChild(this.sizeButton.getElement());
            this.doneButton = new pxtsprite.StandaloneTextButton(lf("Done"), height);
            this.doneButton.addClass("sprite-editor-confirm-button");
            this.doneButton.onClick(function () { return _this.host.closeEditor(); });
            this.root.appendChild(this.doneButton.getElement());
            this.sizePresets = [
                [16, 16]
            ];
            this.cursorText = this.root.draw("text")
                .appendClass("sprite-editor-text")
                .appendClass("sprite-editor-label")
                .setAttribute("dominant-baseline", "middle")
                .setAttribute("dy", 2.5);
        }
        ReporterBar.prototype.updateDimensions = function (width, height) {
            this.sizeButton.setText(width + "x" + height);
        };
        ReporterBar.prototype.hideCursor = function () {
            this.cursorText.text("");
        };
        ReporterBar.prototype.updateCursor = function (col, row) {
            this.cursorText.text(col + "," + row);
        };
        ReporterBar.prototype.updateUndoRedo = function (undo, redo) {
            this.undoRedo.updateState(undo, redo);
        };
        ReporterBar.prototype.layout = function (top, left, width) {
            this.root.translate(left, top);
            this.doneButton.layout();
            var doneWidth = this.doneButton.width();
            this.undoRedo.translate(width - UNDO_REDO_WIDTH - SIZE_CURSOR_MARGIN - doneWidth, 0);
            this.doneButton.getElement().translate(width - doneWidth, 0);
            this.cursorText.moveTo(SIZE_BUTTON_WIDTH + SIZE_CURSOR_MARGIN, this.height / 2);
        };
        ReporterBar.prototype.setSizePresets = function (presets, currentWidth, currentHeight) {
            this.sizePresets = presets;
            this.sizeIndex = undefined;
            for (var i = 0; i < presets.length; i++) {
                var _a = presets[i], w = _a[0], h = _a[1];
                if (w === currentWidth && h === currentHeight) {
                    this.sizeIndex = i;
                    break;
                }
            }
            this.updateDimensions(currentWidth, currentHeight);
        };
        ReporterBar.prototype.nextSize = function () {
            if (this.sizeIndex == undefined) {
                this.sizeIndex = 0;
            }
            else {
                this.sizeIndex = (this.sizeIndex + 1) % this.sizePresets.length;
            }
            var _a = this.sizePresets[this.sizeIndex], w = _a[0], h = _a[1];
            this.host.resize(w, h);
        };
        return ReporterBar;
    }());
    pxtsprite.ReporterBar = ReporterBar;
})(pxtsprite || (pxtsprite = {}));
/// <reference path="./buttons.ts" />
var pxtsprite;
(function (pxtsprite) {
    var lf = pxt.Util.lf;
    var TOOLBAR_WIDTH = 65;
    var INNER_BUTTON_MARGIN = 3;
    var PALETTE_BORDER_WIDTH = 1;
    var BUTTON_GROUP_SPACING = 3;
    var SELECTED_BORDER_WIDTH = 2;
    var COLOR_PREVIEW_HEIGHT = 30;
    var COLOR_MARGIN = 7;
    var TOOL_BUTTON_WIDTH = (TOOLBAR_WIDTH - INNER_BUTTON_MARGIN) / 2;
    var PALLETTE_SWATCH_WIDTH = (TOOLBAR_WIDTH - PALETTE_BORDER_WIDTH * 3) / 2;
    var TOOL_BUTTON_TOP = TOOLBAR_WIDTH / 3 + BUTTON_GROUP_SPACING;
    var PALETTE_TOP = TOOL_BUTTON_TOP + TOOL_BUTTON_WIDTH * 3 + INNER_BUTTON_MARGIN + COLOR_MARGIN;
    var SideBar = /** @class */ (function () {
        function SideBar(palette, host, parent) {
            this.palette = palette;
            this.host = host;
            this.root = parent.group().id("sprite-editor-sidebar");
            this.initSizes();
            this.initTools();
            this.initPalette();
        }
        SideBar.prototype.setTool = function (tool) {
            this.host.setActiveTool(tool);
            if (this.selectedTool) {
                this.selectedTool.removeClass("selected");
            }
            this.selectedTool = this.getButtonForTool(tool);
            if (this.selectedTool) {
                this.selectedTool.addClass("selected");
            }
        };
        SideBar.prototype.setColor = function (color) {
            this.host.setActiveColor(color);
            if (this.selectedSwatch) {
                this.selectedSwatch.stroke("none");
            }
            this.selectedSwatch = this.colorSwatches[color];
            if (this.selectedSwatch) {
                // Border is multiplied by 2 and the excess is clipped away
                this.selectedSwatch.stroke("orange", SELECTED_BORDER_WIDTH * 2);
                this.colorPreview.fill(this.palette[color]);
            }
            // FIXME: Switch the tool to pencil
        };
        SideBar.prototype.setCursorSize = function (size) {
            this.host.setToolWidth(size);
        };
        SideBar.prototype.setWidth = function (width) {
            this.root.scale(width / TOOLBAR_WIDTH);
        };
        SideBar.prototype.translate = function (left, top) {
            this.root.translate(left, top);
        };
        SideBar.prototype.initSizes = function () {
            var _this = this;
            this.sizeGroup = this.root.group().id("sprite-editor-cursor-buttons");
            var buttonGroup = new pxtsprite.CursorMultiButton(this.sizeGroup, TOOLBAR_WIDTH);
            buttonGroup.onSelected(function (index) {
                _this.setCursorSize(1 + (index * 2));
            });
            // Sets the first button to show as selected
            buttonGroup.selected = 0;
            buttonGroup.buttons[0].setSelected(true);
        };
        SideBar.prototype.initTools = function () {
            this.buttonGroup = this.root.group()
                .id("sprite-editor-tools")
                .translate(0, TOOL_BUTTON_TOP);
            this.pencilTool = this.initButton(lf("Pencil"), "\uf040", pxtsprite.PaintTool.Normal);
            this.eraseTool = this.initButton(lf("Erase"), "\uf12d", pxtsprite.PaintTool.Erase);
            this.eraseTool.translate(1 + TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN, 0);
            this.fillTool = this.initButton(lf("Fill"), "\uf102", pxtsprite.PaintTool.Fill, true);
            this.fillTool.translate(0, TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN);
            this.rectangleTool = this.initButton(lf("Rectangle"), "\uf096", pxtsprite.PaintTool.Rectangle);
            this.rectangleTool.translate(1 + TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN, TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN);
            this.marqueeTool = this.initButton(lf("Marquee"), "\uf113", pxtsprite.PaintTool.Marquee, true);
            this.marqueeTool.translate(0, (TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN) << 1);
            this.setTool(pxtsprite.PaintTool.Normal);
        };
        SideBar.prototype.initPalette = function () {
            var _this = this;
            this.paletteGroup = this.root.group().id("sprite-editor-palette")
                .translate(0, PALETTE_TOP);
            // Draw the background/borders for the entire palette
            var bgHeight = COLOR_PREVIEW_HEIGHT + PALETTE_BORDER_WIDTH * 2;
            this.paletteGroup.draw("rect")
                .fill("#000000")
                .size(TOOLBAR_WIDTH, bgHeight);
            this.paletteGroup.draw("rect")
                .fill("#000000")
                .at(0, bgHeight + COLOR_MARGIN)
                .size(TOOLBAR_WIDTH, PALETTE_BORDER_WIDTH + (this.palette.length >> 1) * (PALLETTE_SWATCH_WIDTH + PALETTE_BORDER_WIDTH));
            // The highlighted swatch has an inner border. The only way to do that in SVG
            // is to set the stroke to double the border width and clip the excess away
            var clip = this.paletteGroup.def().create("clipPath", "sprite-editor-selected-color")
                .clipPathUnits(true);
            clip.draw("rect")
                .at(0, 0)
                .size(1, 1);
            // Draw a preview of the current color
            this.colorPreview = this.paletteGroup.draw("rect")
                .at(PALETTE_BORDER_WIDTH, PALETTE_BORDER_WIDTH)
                .size(TOOLBAR_WIDTH - PALETTE_BORDER_WIDTH * 2, COLOR_PREVIEW_HEIGHT);
            // Draw the swatches for each color
            this.colorSwatches = [];
            var _loop_7 = function (i) {
                var col = i % 2;
                var row = Math.floor(i / 2);
                var swatch = this_2.paletteGroup
                    .draw("rect")
                    .size(PALLETTE_SWATCH_WIDTH, PALLETTE_SWATCH_WIDTH)
                    .at(col ? PALETTE_BORDER_WIDTH * 2 + PALLETTE_SWATCH_WIDTH : PALETTE_BORDER_WIDTH, bgHeight + COLOR_MARGIN + PALETTE_BORDER_WIDTH + row * (PALETTE_BORDER_WIDTH + PALLETTE_SWATCH_WIDTH))
                    .fill(this_2.palette[i])
                    .clipPath("url(#sprite-editor-selected-color)")
                    .onClick(function () { return _this.setColor(i); });
                swatch.title("" + i);
                this_2.colorSwatches.push(swatch);
            };
            var this_2 = this;
            for (var i = 0; i < this.palette.length; i++) {
                _loop_7(i);
            }
            this.setColor(0);
        };
        SideBar.prototype.initButton = function (title, icon, tool, xicon) {
            var _this = this;
            if (xicon === void 0) { xicon = false; }
            var btn = xicon ? pxtsprite.mkXIconButton(icon, TOOL_BUTTON_WIDTH) : pxtsprite.mkIconButton(icon, TOOL_BUTTON_WIDTH);
            var shortcut = pxtsprite.getPaintToolShortcut(tool);
            if (shortcut)
                btn.shortcut(shortcut);
            btn.title(title);
            btn.onClick(function () {
                _this.host.setIconsToDefault();
                _this.setTool(tool);
            });
            this.buttonGroup.appendChild(btn.getElement());
            return btn;
        };
        SideBar.prototype.getButtonForTool = function (tool) {
            switch (tool) {
                case pxtsprite.PaintTool.Normal:
                case pxtsprite.PaintTool.Line: return this.pencilTool;
                case pxtsprite.PaintTool.Erase: return this.eraseTool;
                case pxtsprite.PaintTool.Fill: return this.fillTool;
                case pxtsprite.PaintTool.Rectangle:
                case pxtsprite.PaintTool.Circle: return this.rectangleTool;
                case pxtsprite.PaintTool.Marquee: return this.marqueeTool;
                default: return undefined;
            }
        };
        return SideBar;
    }());
    pxtsprite.SideBar = SideBar;
})(pxtsprite || (pxtsprite = {}));
/// <reference path="./bitmap.ts" />
var pxtsprite;
(function (pxtsprite) {
    var PaintTool;
    (function (PaintTool) {
        PaintTool[PaintTool["Normal"] = 0] = "Normal";
        PaintTool[PaintTool["Rectangle"] = 1] = "Rectangle";
        PaintTool[PaintTool["Outline"] = 2] = "Outline";
        PaintTool[PaintTool["Circle"] = 3] = "Circle";
        PaintTool[PaintTool["Fill"] = 4] = "Fill";
        PaintTool[PaintTool["Line"] = 5] = "Line";
        PaintTool[PaintTool["Erase"] = 6] = "Erase";
        PaintTool[PaintTool["Marquee"] = 7] = "Marquee";
    })(PaintTool = pxtsprite.PaintTool || (pxtsprite.PaintTool = {}));
    function getPaintToolShortcut(tool) {
        switch (tool) {
            case PaintTool.Normal:
                return "p";
            case PaintTool.Rectangle:
                return "r";
            case PaintTool.Circle:
                return "c";
            case PaintTool.Fill:
                return "b";
            case PaintTool.Line:
                return "l";
            case PaintTool.Erase:
                return "e";
            case PaintTool.Marquee:
                return "s";
            default:
                return undefined;
        }
    }
    pxtsprite.getPaintToolShortcut = getPaintToolShortcut;
    var Cursor = /** @class */ (function () {
        function Cursor(width, height) {
            this.width = width;
            this.height = height;
            this.offsetX = -(width >> 1);
            this.offsetY = -(height >> 1);
        }
        return Cursor;
    }());
    pxtsprite.Cursor = Cursor;
    var Edit = /** @class */ (function () {
        function Edit(canvasWidth, canvasHeight, color, toolWidth) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.color = color;
            this.toolWidth = toolWidth;
        }
        Edit.prototype.doEdit = function (state) {
            if (this.isStarted) {
                this.doEditCore(state);
            }
        };
        Edit.prototype.start = function (cursorCol, cursorRow, state) {
            this.isStarted = true;
            this.startCol = cursorCol;
            this.startRow = cursorRow;
            state.mergeFloatingLayer();
        };
        Edit.prototype.end = function (col, row, state) {
        };
        Edit.prototype.getCursor = function () {
            return new Cursor(this.toolWidth, this.toolWidth);
        };
        Edit.prototype.drawCursor = function (col, row, draw) {
            draw(col, row);
        };
        return Edit;
    }());
    pxtsprite.Edit = Edit;
    var SelectionEdit = /** @class */ (function (_super) {
        __extends(SelectionEdit, _super);
        function SelectionEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SelectionEdit.prototype.update = function (col, row) {
            this.endCol = col;
            this.endRow = row;
            if (!this.isDragged && !(col == this.startCol && row == this.startRow)) {
                this.isDragged = true;
            }
        };
        SelectionEdit.prototype.topLeft = function () {
            return {
                x: Math.min(this.startCol, this.endCol),
                y: Math.min(this.startRow, this.endRow)
            };
        };
        SelectionEdit.prototype.bottomRight = function () {
            return {
                x: Math.max(this.startCol, this.endCol),
                y: Math.max(this.startRow, this.endRow)
            };
        };
        return SelectionEdit;
    }(Edit));
    pxtsprite.SelectionEdit = SelectionEdit;
    /**
     * Regular old drawing tool
     */
    var PaintEdit = /** @class */ (function (_super) {
        __extends(PaintEdit, _super);
        function PaintEdit(canvasWidth, canvasHeight, color, toolWidth) {
            var _this = _super.call(this, canvasWidth, canvasHeight, color, toolWidth) || this;
            _this.showPreview = true;
            _this.mask = new pxtsprite.Bitmask(canvasWidth, canvasHeight);
            return _this;
        }
        PaintEdit.prototype.update = function (col, row) {
            // Interpolate (Draw a line) from startCol, startRow to col, row
            this.interpolate(this.startCol, this.startRow, col, row);
            this.startCol = col;
            this.startRow = row;
        };
        // https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
        PaintEdit.prototype.interpolate = function (x0, y0, x1, y1) {
            var _this = this;
            var dx = x1 - x0;
            var dy = y1 - y0;
            var draw = function (c, r) { return _this.mask.set(c, r); };
            if (dx === 0) {
                var startY = dy >= 0 ? y0 : y1;
                var endY = dy >= 0 ? y1 : y0;
                for (var y_1 = startY; y_1 <= endY; y_1++) {
                    this.drawCore(x0, y_1, draw);
                }
                return;
            }
            var xStep = dx > 0 ? 1 : -1;
            var yStep = dy > 0 ? 1 : -1;
            var dErr = Math.abs(dy / dx);
            var err = 0;
            var y = y0;
            for (var x = x0; xStep > 0 ? x <= x1 : x >= x1; x += xStep) {
                this.drawCore(x, y, draw);
                err += dErr;
                while (err >= 0.5) {
                    if (yStep > 0 ? y <= y1 : y >= y1) {
                        this.drawCore(x, y, draw);
                    }
                    y += yStep;
                    err -= 1;
                }
            }
        };
        PaintEdit.prototype.doEditCore = function (state) {
            for (var c = 0; c < state.width; c++) {
                for (var r = 0; r < state.height; r++) {
                    if (this.mask.get(c, r)) {
                        state.image.set(c, r, this.color);
                    }
                }
            }
        };
        PaintEdit.prototype.drawCursor = function (col, row, draw) {
            this.drawCore(col, row, draw);
        };
        PaintEdit.prototype.drawCore = function (col, row, setPixel) {
            col = col - Math.floor(this.toolWidth / 2);
            row = row - Math.floor(this.toolWidth / 2);
            for (var i = 0; i < this.toolWidth; i++) {
                for (var j = 0; j < this.toolWidth; j++) {
                    var c = col + i;
                    var r = row + j;
                    if (c >= 0 && c < this.canvasWidth && r >= 0 && r < this.canvasHeight) {
                        setPixel(col + i, row + j);
                    }
                }
            }
        };
        return PaintEdit;
    }(Edit));
    pxtsprite.PaintEdit = PaintEdit;
    /**
     * Tool for drawing filled rectangles
     */
    var RectangleEdit = /** @class */ (function (_super) {
        __extends(RectangleEdit, _super);
        function RectangleEdit() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.showPreview = true;
            return _this;
        }
        RectangleEdit.prototype.doEditCore = function (state) {
            var tl = this.topLeft();
            var br = this.bottomRight();
            for (var c = tl.x; c <= br.x; c++) {
                for (var r = tl.y; r <= br.y; r++) {
                    state.image.set(c, r, this.color);
                }
            }
        };
        return RectangleEdit;
    }(SelectionEdit));
    pxtsprite.RectangleEdit = RectangleEdit;
    /**
     * Tool for drawing empty rectangles
     */
    var OutlineEdit = /** @class */ (function (_super) {
        __extends(OutlineEdit, _super);
        function OutlineEdit() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.showPreview = true;
            return _this;
        }
        OutlineEdit.prototype.doEditCore = function (state) {
            var tl = this.topLeft();
            tl.x -= this.toolWidth >> 1;
            tl.y -= this.toolWidth >> 1;
            var br = this.bottomRight();
            br.x += this.toolWidth >> 1;
            br.y += this.toolWidth >> 1;
            for (var i = 0; i < this.toolWidth; i++) {
                this.drawRectangle(state, { x: tl.x + i, y: tl.y + i }, { x: br.x - i, y: br.y - i });
            }
        };
        OutlineEdit.prototype.drawRectangle = function (state, tl, br) {
            if (tl.x > br.x || tl.y > br.y)
                return;
            for (var c = tl.x; c <= br.x; c++) {
                state.image.set(c, tl.y, this.color);
                state.image.set(c, br.y, this.color);
            }
            for (var r = tl.y; r <= br.y; r++) {
                state.image.set(tl.x, r, this.color);
                state.image.set(br.x, r, this.color);
            }
        };
        OutlineEdit.prototype.drawCursor = function (col, row, draw) {
            this.drawCore(col, row, draw);
        };
        OutlineEdit.prototype.drawCore = function (col, row, setPixel) {
            col = col - Math.floor(this.toolWidth / 2);
            row = row - Math.floor(this.toolWidth / 2);
            for (var i = 0; i < this.toolWidth; i++) {
                for (var j = 0; j < this.toolWidth; j++) {
                    var c = col + i;
                    var r = row + j;
                    if (c >= 0 && c < this.canvasWidth && r >= 0 && r < this.canvasHeight) {
                        setPixel(col + i, row + j);
                    }
                }
            }
        };
        return OutlineEdit;
    }(SelectionEdit));
    pxtsprite.OutlineEdit = OutlineEdit;
    /**
     * Tool for drawing straight lines
     */
    var LineEdit = /** @class */ (function (_super) {
        __extends(LineEdit, _super);
        function LineEdit() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.showPreview = true;
            return _this;
        }
        LineEdit.prototype.doEditCore = function (state) {
            this.bresenham(this.startCol, this.startRow, this.endCol, this.endRow, state);
        };
        // https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
        LineEdit.prototype.bresenham = function (x0, y0, x1, y1, state) {
            var _this = this;
            var dx = x1 - x0;
            var dy = y1 - y0;
            var draw = function (c, r) { return state.image.set(c, r, _this.color); };
            if (dx === 0) {
                var startY = dy >= 0 ? y0 : y1;
                var endY = dy >= 0 ? y1 : y0;
                for (var y_2 = startY; y_2 <= endY; y_2++) {
                    this.drawCore(x0, y_2, draw);
                }
                return;
            }
            var xStep = dx > 0 ? 1 : -1;
            var yStep = dy > 0 ? 1 : -1;
            var dErr = Math.abs(dy / dx);
            var err = 0;
            var y = y0;
            for (var x = x0; xStep > 0 ? x <= x1 : x >= x1; x += xStep) {
                this.drawCore(x, y, draw);
                err += dErr;
                while (err >= 0.5) {
                    if (yStep > 0 ? y <= y1 : y >= y1) {
                        this.drawCore(x, y, draw);
                    }
                    y += yStep;
                    err -= 1;
                }
            }
        };
        LineEdit.prototype.drawCursor = function (col, row, draw) {
            this.drawCore(col, row, draw);
        };
        // This is surely not the most efficient approach for drawing thick lines...
        LineEdit.prototype.drawCore = function (col, row, draw) {
            col = col - Math.floor(this.toolWidth / 2);
            row = row - Math.floor(this.toolWidth / 2);
            for (var i = 0; i < this.toolWidth; i++) {
                for (var j = 0; j < this.toolWidth; j++) {
                    var c = col + i;
                    var r = row + j;
                    draw(c, r);
                }
            }
        };
        return LineEdit;
    }(SelectionEdit));
    pxtsprite.LineEdit = LineEdit;
    /**
     * Tool for circular outlines
     */
    var CircleEdit = /** @class */ (function (_super) {
        __extends(CircleEdit, _super);
        function CircleEdit() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.showPreview = true;
            return _this;
        }
        CircleEdit.prototype.doEditCore = function (state) {
            var tl = this.topLeft();
            var br = this.bottomRight();
            var dx = br.x - tl.x;
            var dy = br.y - tl.y;
            var radius = Math.floor(Math.hypot(dx, dy));
            var cx = this.startCol;
            var cy = this.startRow;
            this.midpoint(cx, cy, radius, state);
        };
        // https://en.wikipedia.org/wiki/Midpoint_circle_algorithm
        CircleEdit.prototype.midpoint = function (cx, cy, radius, state) {
            var x = radius - 1;
            var y = 0;
            var dx = 1;
            var dy = 1;
            var err = dx - (radius * 2);
            while (x >= y) {
                state.image.set(cx + x, cy + y, this.color);
                state.image.set(cx + x, cy - y, this.color);
                state.image.set(cx + y, cy + x, this.color);
                state.image.set(cx + y, cy - x, this.color);
                state.image.set(cx - y, cy + x, this.color);
                state.image.set(cx - y, cy - x, this.color);
                state.image.set(cx - x, cy + y, this.color);
                state.image.set(cx - x, cy - y, this.color);
                if (err <= 0) {
                    y++;
                    err += dy;
                    dy += 2;
                }
                if (err > 0) {
                    x--;
                    dx += 2;
                    err += dx - (radius * 2);
                }
            }
        };
        CircleEdit.prototype.getCursor = function () {
            return new Cursor(1, 1);
        };
        return CircleEdit;
    }(SelectionEdit));
    pxtsprite.CircleEdit = CircleEdit;
    var FillEdit = /** @class */ (function (_super) {
        __extends(FillEdit, _super);
        function FillEdit() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.showPreview = true;
            return _this;
        }
        FillEdit.prototype.start = function (col, row, state) {
            this.isStarted = true;
            this.col = col;
            this.row = row;
            state.mergeFloatingLayer();
        };
        FillEdit.prototype.update = function (col, row) {
            this.col = col;
            this.row = row;
        };
        FillEdit.prototype.doEditCore = function (state) {
            var replColor = state.image.get(this.col, this.row);
            if (replColor === this.color) {
                return;
            }
            var mask = new pxtsprite.Bitmask(state.width, state.height);
            mask.set(this.col, this.row);
            var q = [{ x: this.col, y: this.row }];
            while (q.length) {
                var curr = q.pop();
                if (state.image.get(curr.x, curr.y) === replColor) {
                    state.image.set(curr.x, curr.y, this.color);
                    tryPush(curr.x + 1, curr.y);
                    tryPush(curr.x - 1, curr.y);
                    tryPush(curr.x, curr.y + 1);
                    tryPush(curr.x, curr.y - 1);
                }
            }
            function tryPush(x, y) {
                if (x >= 0 && x < mask.width && y >= 0 && y < mask.height && !mask.get(x, y)) {
                    mask.set(x, y);
                    q.push({ x: x, y: y });
                }
            }
        };
        FillEdit.prototype.getCursor = function () {
            return new Cursor(1, 1);
        };
        return FillEdit;
    }(Edit));
    pxtsprite.FillEdit = FillEdit;
    var MarqueeEdit = /** @class */ (function (_super) {
        __extends(MarqueeEdit, _super);
        function MarqueeEdit() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.isMove = false;
            _this.showPreview = false;
            return _this;
        }
        MarqueeEdit.prototype.start = function (cursorCol, cursorRow, state) {
            this.isStarted = true;
            this.startCol = cursorCol;
            this.startRow = cursorRow;
            if (state.floatingLayer) {
                if (state.inFloatingLayer(cursorCol, cursorRow)) {
                    this.isMove = true;
                }
                else {
                    state.mergeFloatingLayer();
                }
            }
        };
        MarqueeEdit.prototype.end = function (cursorCol, cursorRow, state) {
            if (!this.isDragged && state.floatingLayer) {
                state.mergeFloatingLayer();
            }
        };
        MarqueeEdit.prototype.doEditCore = function (state) {
            var tl = this.topLeft();
            var br = this.bottomRight();
            if (this.isDragged) {
                if (this.isMove) {
                    state.layerOffsetX = state.floatingLayer.x0 + this.endCol - this.startCol;
                    state.layerOffsetY = state.floatingLayer.y0 + this.endRow - this.startRow;
                }
                else {
                    state.copyToLayer(tl.x, tl.y, br.x - tl.x + 1, br.y - tl.y + 1, true);
                }
            }
        };
        MarqueeEdit.prototype.getCursor = function () {
            return undefined;
        };
        return MarqueeEdit;
    }(SelectionEdit));
    pxtsprite.MarqueeEdit = MarqueeEdit;
})(pxtsprite || (pxtsprite = {}));
/// <reference path="./bitmap.ts" />
/// <reference path="./tools.ts" />
/// <reference path="./reporterBar.ts" />
/// <reference path="./sidebar.ts" />
/// <reference path="./gallery.ts" />
/// <reference path="./header.ts" />
var pxtsprite;
(function (pxtsprite) {
    var svg = pxt.svgUtil;
    var lf = pxt.Util.lf;
    pxtsprite.TOTAL_HEIGHT = 500;
    var PADDING = 10;
    var DROP_DOWN_PADDING = 4;
    // Height of toolbar (the buttons above the canvas)
    pxtsprite.HEADER_HEIGHT = 50;
    // Spacing between the toolbar and the canvas
    var HEADER_CANVAS_MARGIN = 10;
    // Height of the bar that displays editor size and info below the canvas
    var REPORTER_BAR_HEIGHT = 31;
    // Spacing between the canvas and reporter bar
    var REPORTER_BAR_CANVAS_MARGIN = 5;
    // Spacing between palette and paint surface
    var SIDEBAR_CANVAS_MARGIN = 10;
    var SIDEBAR_WIDTH = 65;
    // Total allowed height of paint surface
    var CANVAS_HEIGHT = pxtsprite.TOTAL_HEIGHT - pxtsprite.HEADER_HEIGHT - HEADER_CANVAS_MARGIN
        - REPORTER_BAR_HEIGHT - REPORTER_BAR_CANVAS_MARGIN - PADDING + DROP_DOWN_PADDING * 2;
    var WIDTH = PADDING + SIDEBAR_WIDTH + SIDEBAR_CANVAS_MARGIN + CANVAS_HEIGHT + PADDING - DROP_DOWN_PADDING * 2;
    var SpriteEditor = /** @class */ (function () {
        function SpriteEditor(bitmap, blocksInfo, lightMode, scale) {
            if (lightMode === void 0) { lightMode = false; }
            if (scale === void 0) { scale = 1; }
            var _this = this;
            this.lightMode = lightMode;
            this.scale = scale;
            this.activeTool = pxtsprite.PaintTool.Normal;
            this.toolWidth = 1;
            this.color = 1;
            this.cursorCol = 0;
            this.cursorRow = 0;
            this.undoStack = [];
            this.redoStack = [];
            this.columns = 16;
            this.rows = 16;
            this.shiftDown = false;
            this.altDown = false;
            this.mouseDown = false;
            this.keyDown = function (event) {
                if (event.keyCode == 16) {
                    _this.shiftDown = true;
                    _this.shiftAction();
                }
                if (event.keyCode === 18) {
                    _this.discardEdit();
                    _this.paintSurface.setEyedropperMouse(true);
                    _this.altDown = true;
                }
                if (_this.state.floatingLayer) {
                    var didSomething = true;
                    switch (event.keyCode) {
                        case 8: // backspace
                        case 46:// delete
                            event.preventDefault();
                            event.stopPropagation();
                            _this.state.floatingLayer = undefined;
                            break;
                        case 37:// Left arrow
                            _this.state.layerOffsetX--;
                            break;
                        case 38:// Up arrow
                            _this.state.layerOffsetY--;
                            break;
                        case 39:// Right arrow
                            _this.state.layerOffsetX++;
                            break;
                        case 40:// Down arrow
                            _this.state.layerOffsetY++;
                            break;
                        default:
                            didSomething = false;
                    }
                    if (didSomething) {
                        _this.updateEdit();
                        _this.pushState(true);
                        _this.paintSurface.restore(_this.state, true);
                    }
                }
                var tools = [
                    pxtsprite.PaintTool.Fill,
                    pxtsprite.PaintTool.Normal,
                    pxtsprite.PaintTool.Rectangle,
                    pxtsprite.PaintTool.Erase,
                    pxtsprite.PaintTool.Circle,
                    pxtsprite.PaintTool.Line,
                    pxtsprite.PaintTool.Marquee
                ];
                tools.forEach(function (tool) {
                    if (event.key === pxtsprite.getPaintToolShortcut(tool)) {
                        _this.setIconsToDefault();
                        _this.switchIconTo(tool);
                        _this.sidebar.setTool(tool);
                    }
                });
                var zeroKeyCode = 48;
                var nineKeyCode = 57;
                if (event.keyCode >= zeroKeyCode && event.keyCode <= nineKeyCode) {
                    var color = event.keyCode - zeroKeyCode;
                    if (_this.shiftDown) {
                        color += 9;
                    }
                    if (color <= _this.colors.length) {
                        _this.sidebar.setColor(color);
                    }
                }
            };
            this.keyUp = function (event) {
                // If not drawing a circle, switch back to Rectangle and Pencil
                if (event.keyCode === 16) {
                    _this.shiftDown = false;
                    _this.clearShiftAction();
                }
                else if (event.keyCode === 18) {
                    _this.altDown = false;
                    _this.paintSurface.setEyedropperMouse(false);
                    _this.updateEdit();
                }
            };
            this.undoRedoEvent = function (event) {
                var controlOrMeta = event.ctrlKey || event.metaKey; // ctrl on windows, meta on mac
                if (event.key === "Undo" || (controlOrMeta && event.key === "z")) {
                    _this.undo();
                    event.preventDefault();
                    event.stopPropagation();
                }
                else if (event.key === "Redo" || (controlOrMeta && event.key === "y")) {
                    _this.redo();
                    event.preventDefault();
                    event.stopPropagation();
                }
            };
            this.colors = pxt.appTarget.runtime.palette.slice(1);
            this.columns = bitmap.width;
            this.rows = bitmap.height;
            this.state = new pxtsprite.CanvasState(bitmap.copy());
            this.root = new svg.SVG();
            this.root.setClass("sprite-canvas-controls");
            this.group = this.root.group();
            this.createDefs();
            this.paintSurface = new pxtsprite.CanvasGrid(this.colors, this.state.copy(), this.lightMode, this.scale);
            this.paintSurface.drag(function (col, row) {
                _this.debug("gesture (" + pxtsprite.PaintTool[_this.activeTool] + ")");
                if (!_this.altDown) {
                    _this.setCell(col, row, _this.color, false);
                }
                _this.bottomBar.updateCursor(col, row);
            });
            this.paintSurface.up(function (col, row) {
                _this.debug("gesture end (" + pxtsprite.PaintTool[_this.activeTool] + ")");
                if (_this.altDown) {
                    var color = _this.state.image.get(col, row);
                    _this.sidebar.setColor(color);
                }
                else {
                    _this.paintSurface.onEditEnd(col, row, _this.edit);
                    if (_this.state.floatingLayer && !_this.paintSurface.state.floatingLayer) {
                        _this.pushState(true);
                        _this.state = _this.paintSurface.state.copy();
                        _this.rePaint();
                    }
                    _this.commit();
                    _this.shiftAction();
                }
                _this.mouseDown = false;
            });
            this.paintSurface.down(function (col, row) {
                if (!_this.altDown) {
                    _this.setCell(col, row, _this.color, false);
                }
                _this.mouseDown = true;
            });
            this.paintSurface.move(function (col, row) {
                _this.drawCursor(col, row);
                _this.shiftAction();
                _this.bottomBar.updateCursor(col, row);
            });
            this.paintSurface.leave(function () {
                if (_this.edit) {
                    _this.rePaint();
                    if (_this.edit.isStarted && !_this.shiftDown) {
                        _this.commit();
                    }
                }
                _this.bottomBar.hideCursor();
            });
            this.sidebar = new pxtsprite.SideBar(['url("#alpha-background")'].concat(this.colors), this, this.group);
            this.sidebar.setColor(this.colors.length >= 3 ? 3 : 1); // colors omits 0
            this.header = new pxtsprite.SpriteHeader(this);
            this.gallery = new pxtsprite.Gallery(blocksInfo);
            this.bottomBar = new pxtsprite.ReporterBar(this.group, this, REPORTER_BAR_HEIGHT);
            this.updateUndoRedo();
            // Sets canvas scale
            this.scale = scale;
        }
        SpriteEditor.prototype.setSidebarColor = function (color) {
            this.sidebar.setColor(color);
        };
        SpriteEditor.prototype.setCell = function (col, row, color, commit) {
            if (commit) {
                this.state.image.set(col, row, color);
                this.paintCell(col, row, color);
            }
            else if (this.edit) {
                if (!this.edit.isStarted) {
                    this.paintSurface.onEditStart(col, row, this.edit);
                    if (this.state.floatingLayer && !this.paintSurface.state.floatingLayer) {
                        this.pushState(true);
                        this.state = this.paintSurface.state.copy();
                    }
                }
                this.edit.update(col, row);
                this.cursorCol = col;
                this.cursorRow = row;
                this.paintEdit(this.edit, col, row);
            }
        };
        SpriteEditor.prototype.render = function (el) {
            el.appendChild(this.header.getElement());
            el.appendChild(this.gallery.getElement());
            this.paintSurface.render(el);
            el.appendChild(this.root.el);
            this.layout();
            this.root.attr({ "width": this.outerWidth() + "px", "height": this.outerHeight() + "px" });
            this.root.el.style.position = "absolute";
            this.root.el.style.top = "0px";
            this.root.el.style.left = "0px";
        };
        SpriteEditor.prototype.layout = function () {
            if (!this.root) {
                return;
            }
            this.paintSurface.setGridDimensions(CANVAS_HEIGHT);
            // The width of the palette + editor
            var paintAreaTop = pxtsprite.HEADER_HEIGHT + HEADER_CANVAS_MARGIN;
            var paintAreaLeft = PADDING + SIDEBAR_WIDTH + SIDEBAR_CANVAS_MARGIN;
            this.sidebar.translate(PADDING, paintAreaTop);
            this.paintSurface.updateBounds(paintAreaTop, paintAreaLeft, CANVAS_HEIGHT, CANVAS_HEIGHT);
            this.bottomBar.layout(paintAreaTop + CANVAS_HEIGHT + REPORTER_BAR_CANVAS_MARGIN, paintAreaLeft, CANVAS_HEIGHT);
            this.gallery.layout(0, pxtsprite.HEADER_HEIGHT, pxtsprite.TOTAL_HEIGHT - pxtsprite.HEADER_HEIGHT);
            this.header.layout();
        };
        SpriteEditor.prototype.rePaint = function () {
            this.paintSurface.repaint();
        };
        SpriteEditor.prototype.setActiveColor = function (color, setPalette) {
            if (setPalette === void 0) { setPalette = false; }
            if (setPalette) {
            }
            else if (this.color != color) {
                this.color = color;
                // If the user is erasing, go back to pencil
                if (this.activeTool === pxtsprite.PaintTool.Erase) {
                    this.sidebar.setTool(pxtsprite.PaintTool.Normal);
                }
                else {
                    this.updateEdit();
                }
            }
        };
        SpriteEditor.prototype.setActiveTool = function (tool) {
            if (this.activeTool != tool) {
                this.activeTool = tool;
                this.updateEdit();
            }
        };
        SpriteEditor.prototype.setToolWidth = function (width) {
            if (this.toolWidth != width) {
                this.toolWidth = width;
                this.updateEdit();
            }
        };
        SpriteEditor.prototype.initializeUndoRedo = function (undoStack, redoStack) {
            if (undoStack) {
                this.undoStack = undoStack;
            }
            if (redoStack) {
                this.redoStack = redoStack;
            }
            this.updateUndoRedo();
        };
        SpriteEditor.prototype.getUndoStack = function () {
            return this.undoStack.slice();
        };
        SpriteEditor.prototype.getRedoStack = function () {
            return this.redoStack.slice();
        };
        SpriteEditor.prototype.undo = function () {
            if (this.undoStack.length) {
                this.debug("undo");
                var todo = this.undoStack.pop();
                this.pushState(false);
                // The current state is at the top of the stack unless the user has pressed redo, so
                // we need to discard it
                if (todo.equals(this.state)) {
                    this.undo();
                    return;
                }
                this.restore(todo);
            }
            this.updateUndoRedo();
        };
        SpriteEditor.prototype.redo = function () {
            if (this.redoStack.length) {
                this.debug("redo");
                var todo = this.redoStack.pop();
                this.pushState(true);
                this.restore(todo);
            }
            this.updateUndoRedo();
        };
        SpriteEditor.prototype.resize = function (width, height) {
            if (!this.cachedState) {
                this.cachedState = this.state.copy();
                this.undoStack.push(this.cachedState);
                this.redoStack = [];
            }
            this.state.image = pxtsprite.resizeBitmap(this.cachedState.image, width, height);
            this.afterResize(true);
        };
        SpriteEditor.prototype.setSizePresets = function (presets) {
            this.bottomBar.setSizePresets(presets, this.columns, this.rows);
        };
        SpriteEditor.prototype.setGalleryFilter = function (filter) {
            this.gallery.setFilter(filter);
        };
        SpriteEditor.prototype.canvasWidth = function () {
            return this.columns;
        };
        SpriteEditor.prototype.canvasHeight = function () {
            return this.rows;
        };
        SpriteEditor.prototype.outerWidth = function () {
            return WIDTH;
        };
        SpriteEditor.prototype.outerHeight = function () {
            return pxtsprite.TOTAL_HEIGHT;
        };
        SpriteEditor.prototype.bitmap = function () {
            return this.state;
        };
        SpriteEditor.prototype.showGallery = function () {
            var _this = this;
            this.gallery.show(function (result, err) {
                if (err && err !== "cancelled") {
                    console.error(err);
                }
                else if (result) {
                    _this.redoStack = [];
                    _this.pushState(true);
                    _this.restore(new pxtsprite.CanvasState(result));
                    _this.hideGallery();
                    _this.header.toggle.toggle(true);
                }
            });
        };
        SpriteEditor.prototype.hideGallery = function () {
            this.gallery.hide();
        };
        SpriteEditor.prototype.closeEditor = function () {
            if (this.closeHandler) {
                var ch = this.closeHandler;
                this.closeHandler = undefined;
                ch();
            }
            if (this.state.floatingLayer) {
                this.state.mergeFloatingLayer();
                this.pushState(true);
            }
        };
        SpriteEditor.prototype.onClose = function (handler) {
            this.closeHandler = handler;
        };
        SpriteEditor.prototype.switchIconTo = function (tool) {
            var _this = this;
            if (this.activeTool === tool)
                return;
            var btn = this.sidebar.getButtonForTool(tool);
            switch (tool) {
                case pxtsprite.PaintTool.Rectangle:
                    updateIcon(btn, "\uf096", lf("Rectangle"));
                    break;
                case pxtsprite.PaintTool.Circle:
                    updateIcon(btn, "\uf10c", lf("Circle"));
                    break;
                case pxtsprite.PaintTool.Normal:
                    updateIcon(btn, "\uf040", lf("Pencil"));
                    break;
                case pxtsprite.PaintTool.Line:
                    updateIcon(btn, "\uf07e", lf("Line"));
                    break;
                default:// no alternate icon, do not change
                    return;
            }
            btn.onClick(function () {
                if (tool != pxtsprite.PaintTool.Circle && tool != pxtsprite.PaintTool.Line) {
                    _this.setIconsToDefault();
                    _this.sidebar.setTool(tool);
                }
            });
            function updateIcon(button, text, title) {
                var shortcut = pxtsprite.getPaintToolShortcut(tool);
                button.setText(text);
                button.title(title);
                button.shortcut(shortcut);
            }
        };
        SpriteEditor.prototype.setIconsToDefault = function () {
            this.switchIconTo(pxtsprite.PaintTool.Rectangle);
            this.switchIconTo(pxtsprite.PaintTool.Normal);
        };
        SpriteEditor.prototype.addKeyListeners = function () {
            document.addEventListener("keydown", this.keyDown);
            document.addEventListener("keyup", this.keyUp);
            document.addEventListener("keydown", this.undoRedoEvent, true);
        };
        SpriteEditor.prototype.removeKeyListeners = function () {
            document.removeEventListener("keydown", this.keyDown);
            document.removeEventListener("keyup", this.keyUp);
            document.removeEventListener("keydown", this.undoRedoEvent, true);
            this.paintSurface.removeMouseListeners();
        };
        SpriteEditor.prototype.afterResize = function (showOverlay) {
            this.columns = this.state.width;
            this.rows = this.state.height;
            this.paintSurface.restore(this.state, true);
            this.bottomBar.updateDimensions(this.columns, this.rows);
            this.layout();
            if (showOverlay)
                this.paintSurface.showResizeOverlay();
            // Canvas size changed and some edits rely on that (like paint)
            this.updateEdit();
        };
        SpriteEditor.prototype.drawCursor = function (col, row) {
            if (this.edit) {
                this.paintSurface.drawCursor(this.edit, col, row);
            }
        };
        SpriteEditor.prototype.paintEdit = function (edit, col, row, gestureEnd) {
            if (gestureEnd === void 0) { gestureEnd = false; }
            this.paintSurface.restore(this.state);
            this.paintSurface.applyEdit(edit, col, row, gestureEnd);
        };
        SpriteEditor.prototype.commit = function () {
            if (this.edit) {
                if (this.cachedState) {
                    this.cachedState = undefined;
                }
                this.pushState(true);
                this.paintEdit(this.edit, this.cursorCol, this.cursorRow, true);
                this.state = this.paintSurface.state.copy();
                this.updateEdit();
                this.redoStack = [];
            }
        };
        SpriteEditor.prototype.pushState = function (undo) {
            var stack = undo ? this.undoStack : this.redoStack;
            if (stack.length && this.state.equals(stack[stack.length - 1])) {
                // Don't push empty commits
                return;
            }
            stack.push(this.state.copy());
            this.updateUndoRedo();
        };
        SpriteEditor.prototype.discardEdit = function () {
            if (this.edit) {
                this.edit = undefined;
                this.rePaint();
            }
        };
        SpriteEditor.prototype.updateEdit = function () {
            if (!this.altDown) {
                this.edit = this.newEdit();
            }
        };
        SpriteEditor.prototype.restore = function (state) {
            if (state.width !== this.state.width || state.height !== this.state.height) {
                this.state = state;
                this.afterResize(false);
            }
            else {
                this.state = state.copy();
                this.paintSurface.restore(state, true);
            }
        };
        SpriteEditor.prototype.updateUndoRedo = function () {
            this.bottomBar.updateUndoRedo(this.undoStack.length === 0, this.redoStack.length === 0);
        };
        SpriteEditor.prototype.paintCell = function (col, row, color) {
            this.paintSurface.writeColor(col, row, color);
        };
        SpriteEditor.prototype.newEdit = function () {
            switch (this.activeTool) {
                case pxtsprite.PaintTool.Normal:
                    return new pxtsprite.PaintEdit(this.columns, this.rows, this.color, this.toolWidth);
                case pxtsprite.PaintTool.Rectangle:
                    return new pxtsprite.OutlineEdit(this.columns, this.rows, this.color, this.toolWidth);
                case pxtsprite.PaintTool.Outline:
                    return new pxtsprite.OutlineEdit(this.columns, this.rows, this.color, this.toolWidth);
                case pxtsprite.PaintTool.Line:
                    return new pxtsprite.LineEdit(this.columns, this.rows, this.color, this.toolWidth);
                case pxtsprite.PaintTool.Circle:
                    return new pxtsprite.CircleEdit(this.columns, this.rows, this.color, this.toolWidth);
                case pxtsprite.PaintTool.Erase:
                    return new pxtsprite.PaintEdit(this.columns, this.rows, 0, this.toolWidth);
                case pxtsprite.PaintTool.Fill:
                    return new pxtsprite.FillEdit(this.columns, this.rows, this.color, this.toolWidth);
                case pxtsprite.PaintTool.Marquee:
                    return new pxtsprite.MarqueeEdit(this.columns, this.rows, this.color, this.toolWidth);
            }
        };
        SpriteEditor.prototype.shiftAction = function () {
            if (!this.shiftDown || this.altDown)
                return;
            switch (this.activeTool) {
                case pxtsprite.PaintTool.Line:
                case pxtsprite.PaintTool.Rectangle:
                case pxtsprite.PaintTool.Circle:
                    this.setCell(this.paintSurface.mouseCol, this.paintSurface.mouseRow, this.color, false);
                    break;
            }
        };
        SpriteEditor.prototype.clearShiftAction = function () {
            if (this.mouseDown)
                return;
            switch (this.activeTool) {
                case pxtsprite.PaintTool.Line:
                case pxtsprite.PaintTool.Rectangle:
                case pxtsprite.PaintTool.Circle:
                    this.updateEdit();
                    this.paintSurface.restore(this.state, true);
                    break;
            }
        };
        SpriteEditor.prototype.debug = function (msg) {
            // if (this.debugText) {
            //     this.debugText.text("DEBUG: " + msg);
            // }
        };
        SpriteEditor.prototype.createDefs = function () {
            this.root.define(function (defs) {
                var p = defs.create("pattern", "alpha-background")
                    .size(10, 10)
                    .units(svg.PatternUnits.userSpaceOnUse);
                p.draw("rect")
                    .at(0, 0)
                    .size(10, 10)
                    .fill("white");
                p.draw("rect")
                    .at(0, 0)
                    .size(5, 5)
                    .fill("#dedede");
                p.draw("rect")
                    .at(5, 5)
                    .size(5, 5)
                    .fill("#dedede");
            });
        };
        return SpriteEditor;
    }());
    pxtsprite.SpriteEditor = SpriteEditor;
})(pxtsprite || (pxtsprite = {}));
