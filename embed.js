(function() {
    if (window.ksRunnerInit) return;

    // This line gets patched up by the cloud
    var pxtConfig = {
    "relprefix": "/pxt-turtle/",
    "verprefix": "",
    "workerjs": "/pxt-turtle/worker.js",
    "monacoworkerjs": "/pxt-turtle/monacoworker.js",
    "pxtVersion": "3.22.22",
    "pxtRelId": "",
    "pxtCdnUrl": "/pxt-turtle/",
    "commitCdnUrl": "/pxt-turtle/",
    "blobCdnUrl": "/pxt-turtle/",
    "cdnUrl": "/pxt-turtle/",
    "targetVersion": "0.0.0",
    "targetRelId": "",
    "targetUrl": "",
    "targetId": "turtle",
    "simUrl": "/pxt-turtle/simulator.html",
    "partsUrl": "/pxt-turtle/siminstructions.html",
    "runUrl": "/pxt-turtle/run.html",
    "docsUrl": "/pxt-turtle/docs.html",
    "isStatic": true
};

    var scripts = [
        "/pxt-turtle/highlight.js/highlight.pack.js",
        "/pxt-turtle/bluebird.min.js",
        "/pxt-turtle/semantic.js",
        "/pxt-turtle/marked/marked.min.js",
        "/pxt-turtle/target.js",
        "/pxt-turtle/pxtembed.js"
    ]

    if (typeof jQuery == "undefined")
        scripts.unshift("/pxt-turtle/jquery.js")

    var pxtCallbacks = []

    window.ksRunnerReady = function(f) {
        if (pxtCallbacks == null) f()
        else pxtCallbacks.push(f)
    }

    window.ksRunnerWhenLoaded = function() {
        pxt.docs.requireHighlightJs = function() { return hljs; }
        pxt.setupWebConfig(pxtConfig || window.pxtWebConfig)
        pxt.runner.initCallbacks = pxtCallbacks
        pxtCallbacks.push(function() {
            pxtCallbacks = null
        })
        pxt.runner.init();
    }

    scripts.forEach(function(src) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    })

} ())
