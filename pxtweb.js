/// <reference path="../../localtypings/mscc.d.ts" />
/// <reference path="../../pxtwinrt/winrtrefs.d.ts"/>
var pxt;
(function (pxt) {
    var eventBufferSizeLimit = 20;
    var queues = [];
    var analyticsLoaded = false;
    var TelemetryQueue = /** @class */ (function () {
        function TelemetryQueue(log) {
            this.log = log;
            this.q = [];
            queues.push(this);
        }
        TelemetryQueue.prototype.track = function (a, b, c) {
            if (analyticsLoaded) {
                this.log(a, b, c);
            }
            else {
                this.q.push([a, b, c]);
                if (this.q.length > eventBufferSizeLimit)
                    this.q.shift();
            }
        };
        TelemetryQueue.prototype.flush = function () {
            while (this.q.length) {
                var _a = this.q.shift(), a = _a[0], b = _a[1], c = _a[2];
                this.log(a, b, c);
            }
        };
        return TelemetryQueue;
    }());
    var eventLogger;
    var exceptionLogger;
    function initAnalyticsAsync() {
        if (isNativeApp() || shouldHideCookieBanner()) {
            initializeAppInsightsInternal(true);
            return;
        }
        if (isSandboxMode()) {
            initializeAppInsightsInternal(false);
            return;
        }
        getCookieBannerAsync(document.domain, detectLocale(), function (bannerErr, info) {
            if (bannerErr || info.Error) {
                // Start app insights, just don't drop any cookies
                initializeAppInsightsInternal(false);
                return;
            }
            // Clear the cookies if the consent is too old, mscc won't do it automatically
            if (isConsentExpired(info.CookieName, info.MinimumConsentDate)) {
                var definitelyThePast = new Date(0).toUTCString();
                document.cookie = "ai_user=; expires=" + definitelyThePast;
                document.cookie = "ai_session=; expires=" + definitelyThePast;
                document.cookie = info.CookieName + "=0; expires=" + definitelyThePast;
            }
            var bannerDiv = document.getElementById("cookiebanner");
            if (!bannerDiv) {
                bannerDiv = document.createElement("div");
                document.body.insertBefore(bannerDiv, document.body.firstChild);
            }
            // The markup is trusted because it's from our backend, so it shouldn't need to be scrubbed
            /* tslint:disable:no-inner-html */
            bannerDiv.innerHTML = info.Markup;
            /* tslint:enable:no-inner-html */
            if (info.Css && info.Css.length) {
                info.Css.forEach(injectStylesheet);
            }
            all(info.Js || [], injectScriptAsync, function (msccError) {
                if (!msccError && typeof mscc !== "undefined") {
                    if (mscc.hasConsent()) {
                        initializeAppInsightsInternal(true);
                    }
                    else {
                        mscc.on("consent", function () { return initializeAppInsightsInternal(true); });
                    }
                }
            });
        });
    }
    pxt.initAnalyticsAsync = initAnalyticsAsync;
    function aiTrackEvent(id, data, measures) {
        if (!eventLogger) {
            eventLogger = new TelemetryQueue(function (a, b, c) { return window.appInsights.trackEvent(a, b, c); });
        }
        eventLogger.track(id, data, measures);
    }
    pxt.aiTrackEvent = aiTrackEvent;
    function aiTrackException(err, kind, props) {
        if (!exceptionLogger) {
            exceptionLogger = new TelemetryQueue(function (a, b, c) { return window.appInsights.trackException(a, b, c); });
        }
        exceptionLogger.track(err, kind, props);
    }
    pxt.aiTrackException = aiTrackException;
    function detectLocale() {
        // Intentionally ignoring the default locale in the target settings and the language cookie
        // Warning: app.tsx overwrites the hash after reading the language so this needs
        // to be called before that happens
        var mlang = /(live)?lang=([a-z]{2,}(-[A-Z]+)?)/i.exec(window.location.href);
        return mlang ? mlang[2] : (navigator.userLanguage || navigator.language);
    }
    function getCookieBannerAsync(domain, locale, cb) {
        httpGetAsync("https://makecode.com/api/mscc/" + domain + "/" + locale, function (err, resp) {
            if (err) {
                cb(err);
                return;
            }
            if (resp.status === 200) {
                try {
                    var info = JSON.parse(resp.body);
                    cb(undefined, info);
                    return;
                }
                catch (e) {
                    cb(new Error("Bad response from server: " + resp.body));
                    return;
                }
            }
            cb(new Error("didn't get 200 response: " + resp.status + " " + resp.body));
        });
    }
    function isConsentExpired(cookieName, minimumConsentDate) {
        var minDate = Date.parse(minimumConsentDate);
        if (!isNaN(minDate)) {
            if (document && document.cookie) {
                var cookies = document.cookie.split(";");
                for (var _i = 0, cookies_1 = cookies; _i < cookies_1.length; _i++) {
                    var cookie = cookies_1[_i];
                    cookie = cookie.trim();
                    if (cookie.indexOf("=") == cookieName.length && cookie.substr(0, cookieName.length) == cookieName) {
                        var value = parseInt(cookie.substr(cookieName.length + 1));
                        if (!isNaN(value)) {
                            // The cookie value is the consent date in seconds since the epoch
                            return value < Math.floor(minDate / 1e3);
                        }
                        return true;
                    }
                }
            }
        }
        return true;
    }
    function initializeAppInsightsInternal(includeCookie) {
        if (includeCookie === void 0) { includeCookie = false; }
        // loadAppInsights is defined in docfiles/tracking.html
        var loadAI = window.loadAppInsights;
        if (loadAI) {
            loadAI(includeCookie);
            analyticsLoaded = true;
            queues.forEach(function (a) { return a.flush(); });
        }
    }
    pxt.initializeAppInsightsInternal = initializeAppInsightsInternal;
    function httpGetAsync(url, cb) {
        try {
            var client_1;
            var resolved_1 = false;
            client_1 = new XMLHttpRequest();
            client_1.onreadystatechange = function () {
                if (resolved_1)
                    return; // Safari/iOS likes to call this thing more than once
                if (client_1.readyState == 4) {
                    resolved_1 = true;
                    var res = {
                        status: client_1.status,
                        body: client_1.responseText
                    };
                    cb(undefined, res);
                }
            };
            client_1.open("GET", url);
            client_1.send();
        }
        catch (e) {
            cb(e);
        }
    }
    function injectStylesheet(href) {
        if (document.head) {
            var link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("href", href);
            link.setAttribute("type", "text/css");
            document.head.appendChild(link);
        }
    }
    function injectScriptAsync(src, cb) {
        var resolved = false;
        if (document.body) {
            var script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            script.onload = function (ev) {
                if (!resolved) {
                    cb();
                    resolved = true;
                }
            };
            script.onerror = function (err) {
                if (!resolved) {
                    cb(err);
                    resolved = true;
                }
            };
            document.body.appendChild(script);
            script.setAttribute("src", src);
        }
        else {
            throw new Error("Bad call to injectScriptAsync");
        }
    }
    /**
     * Checks for winrt, pxt-electron and Code Connection
     */
    function isNativeApp() {
        var hasWindow = typeof window !== "undefined";
        var isUwp = typeof Windows !== "undefined";
        var isPxtElectron = hasWindow && !!window.pxtElectron;
        var isCC = hasWindow && !!window.ipcRenderer || /ipc=1/.test(location.hash) || /ipc=1/.test(location.search); // In WKWebview, ipcRenderer is injected later, so use the URL query
        return isUwp || isPxtElectron || isCC;
    }
    /**
     * Checks whether we should hide the cookie banner
     */
    function shouldHideCookieBanner() {
        //We don't want a cookie notification when embedded in editor controllers, we'll use the url to determine that
        var noCookieBanner = isIFrame() && /nocookiebanner=1/i.test(window.location.href);
        return noCookieBanner;
    }
    function isIFrame() {
        try {
            return window && window.self !== window.top;
        }
        catch (e) {
            return false;
        }
    }
    /**
     * checks for sandbox
     */
    function isSandboxMode() {
        //This is restricted set from pxt.shell.isSandBoxMode and specific to share page
        //We don't want cookie notification in the share page
        var sandbox = /sandbox=1|#sandbox|#sandboxproject/i.test(window.location.href);
        return sandbox;
    }
    // No promises, so here we are
    function all(values, func, cb) {
        var index = 0;
        var res = [];
        var doNext = function () {
            if (index >= values.length) {
                cb(undefined, res);
            }
            else {
                func(values[index++], function (err, val) {
                    if (err) {
                        cb(err);
                    }
                    else {
                        res.push(val);
                        doNext();
                    }
                });
            }
        };
        doNext();
    }
})(pxt || (pxt = {}));
