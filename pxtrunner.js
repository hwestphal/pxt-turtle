var pxt;
(function (pxt) {
    var runner;
    (function (runner) {
        /**
         * Starts the simulator and injects it into the provided container.
         * the simulator will attempt to establish a websocket connection
         * to the debugger's user interface on port 3234.
         *
         * @param container The container to inject the simulator into
         */
        function startDebuggerAsync(container) {
            var debugRunner = new DebugRunner(container);
            debugRunner.start();
        }
        runner.startDebuggerAsync = startDebuggerAsync;
        /**
         * Runner for the debugger that handles communication with the user
         * interface. Also talks to the server for anything to do with
         * the filesystem (like reading code)
         */
        var DebugRunner = /** @class */ (function () {
            function DebugRunner(container) {
                this.container = container;
                this.pkgLoaded = false;
                this.intervalRunning = false;
            }
            DebugRunner.prototype.start = function () {
                var _this = this;
                this.initializeWebsocket();
                if (!this.intervalRunning) {
                    this.intervalRunning = true;
                    this.intervalId = setInterval(function () {
                        if (!_this.ws) {
                            try {
                                _this.initializeWebsocket();
                            }
                            catch (e) {
                                console.warn("Connection to server failed, retrying in " + DebugRunner.RETRY_MS + " ms");
                            }
                        }
                    }, DebugRunner.RETRY_MS);
                }
                this.session = new pxsim.SimDebugSession(this.container);
                this.session.start(this);
            };
            DebugRunner.prototype.initializeWebsocket = function () {
                var _this = this;
                if (!pxt.Cloud.isLocalHost() || !pxt.Cloud.localToken)
                    return;
                pxt.debug('initializing debug pipe');
                this.ws = new WebSocket('ws://localhost:3234/' + pxt.Cloud.localToken + '/simdebug');
                this.ws.onopen = function (ev) {
                    pxt.debug('debug: socket opened');
                };
                this.ws.onclose = function (ev) {
                    pxt.debug('debug: socket closed');
                    if (_this.closeListener) {
                        _this.closeListener();
                    }
                    _this.session.stopSimulator();
                    _this.ws = undefined;
                };
                this.ws.onerror = function (ev) {
                    pxt.debug('debug: socket closed due to error');
                    if (_this.errorListener) {
                        _this.errorListener(ev.type);
                    }
                    _this.session.stopSimulator();
                    _this.ws = undefined;
                };
                this.ws.onmessage = function (ev) {
                    var message;
                    try {
                        message = JSON.parse(ev.data);
                    }
                    catch (e) {
                        pxt.debug('debug: could not parse message');
                    }
                    if (message) {
                        // FIXME: ideally, we should just open two websockets instead of adding to the
                        // debug protocol. One for the debugger, one for meta-information and file
                        // system requests
                        if (message.type === 'runner') {
                            _this.handleRunnerMessage(message);
                        }
                        else {
                            // Intercept the launch configuration and notify the server-side debug runner
                            if (message.type === "request" && message.command === "launch") {
                                _this.sendRunnerMessage("configure", {
                                    projectDir: message.arguments.projectDir
                                });
                            }
                            _this.dataListener(message);
                        }
                    }
                };
            };
            DebugRunner.prototype.send = function (msg) {
                this.ws.send(msg);
            };
            DebugRunner.prototype.onData = function (cb) {
                this.dataListener = cb;
            };
            DebugRunner.prototype.onError = function (cb) {
                this.errorListener = cb;
            };
            DebugRunner.prototype.onClose = function (cb) {
                this.closeListener = cb;
            };
            DebugRunner.prototype.close = function () {
                if (this.session) {
                    this.session.stopSimulator(true);
                }
                if (this.intervalRunning) {
                    clearInterval(this.intervalId);
                    this.intervalId = undefined;
                }
                if (this.ws) {
                    this.ws.close();
                }
            };
            DebugRunner.prototype.handleRunnerMessage = function (msg) {
                switch (msg.subtype) {
                    case "ready":
                        this.sendRunnerMessage("ready");
                        break;
                    case "runcode":
                        this.runCode(msg);
                        break;
                }
            };
            DebugRunner.prototype.runCode = function (msg) {
                var breakpoints = [];
                // The breakpoints are in the format returned by the compiler
                // and need to be converted to the format used by the DebugProtocol
                msg.breakpoints.forEach(function (bp) {
                    breakpoints.push([bp.id, {
                            verified: true,
                            line: bp.line,
                            column: bp.column,
                            endLine: bp.endLine,
                            endColumn: bp.endColumn,
                            source: {
                                path: bp.fileName
                            }
                        }]);
                });
                this.session.runCode(msg.code, msg.usedParts, msg.usedArguments, new pxsim.BreakpointMap(breakpoints), pxt.appTarget.simulator.boardDefinition);
            };
            DebugRunner.prototype.sendRunnerMessage = function (subtype, msg) {
                if (msg === void 0) { msg = {}; }
                msg["subtype"] = subtype;
                msg["type"] = "runner";
                this.send(JSON.stringify(msg));
            };
            DebugRunner.RETRY_MS = 2500;
            return DebugRunner;
        }());
        runner.DebugRunner = DebugRunner;
    })(runner = pxt.runner || (pxt.runner = {}));
})(pxt || (pxt = {}));
/* tslint:disable:no-jquery-raw-elements TODO(tslint): get rid of jquery html() calls */
var pxt;
(function (pxt) {
    var runner;
    (function (runner) {
        function appendBlocks($parent, $svg) {
            $parent.append($('<div class="ui content blocks"/>').append($svg));
        }
        function appendJs($parent, $js, woptions) {
            $parent.append($('<div class="ui content js"/>').append($js));
            if (typeof hljs !== "undefined")
                $js.find('code.highlight').each(function (i, block) {
                    hljs.highlightBlock(block);
                });
        }
        function fillWithWidget(options, $container, $js, $svg, decompileResult, woptions) {
            if (woptions === void 0) { woptions = {}; }
            var cdn = pxt.webConfig.commitCdnUrl;
            var images = cdn + "images";
            var $h = $('<div class="ui bottom attached tabular icon small compact menu hideprint">'
                + ' <div class="right icon menu"></div></div>');
            var $c = $('<div class="ui top attached segment codewidget"></div>');
            var $menu = $h.find('.right.menu');
            var theme = pxt.appTarget.appTheme || {};
            if (woptions.showEdit && !theme.hideDocsEdit) {
                var $editBtn = $("<a class=\"item\" role=\"button\" tabindex=\"0\" aria-label=\"" + lf("edit") + "\"><i role=\"presentation\" aria-hidden=\"true\" class=\"edit icon\"></i></a>").click(function () {
                    decompileResult.package.compressToFileAsync(options.showJavaScript ? pxt.JAVASCRIPT_PROJECT_NAME : pxt.BLOCKS_PROJECT_NAME)
                        .done(function (buf) { return window.open(getEditUrl(options) + "/#project:" + ts.pxtc.encodeBase64(pxt.Util.uint8ArrayToString(buf)), 'pxt'); });
                });
                $menu.append($editBtn);
            }
            if (options.showJavaScript || !$svg) {
                // blocks
                $c.append($js);
                // js menu
                if ($svg) {
                    var $svgBtn = $("<a class=\"item blocks\" role=\"button\" tabindex=\"0\" aria-label=\"" + lf("Blocks") + "\"><i role=\"presentation\" aria-hidden=\"true\" class=\"puzzle icon\"></i></a>").click(function () {
                        if ($c.find('.blocks')[0])
                            $c.find('.blocks').remove();
                        else {
                            if ($js)
                                appendBlocks($js.parent(), $svg);
                            else
                                appendBlocks($c, $svg);
                        }
                    });
                    $menu.append($svgBtn);
                }
            }
            else {
                // blocks
                $c.append($svg);
                // js menu
                if (woptions.showJs) {
                    appendJs($c, $js, woptions);
                }
                else {
                    var $jsBtn = $("<a class=\"item js\" role=\"button\" tabindex=\"0\" aria-label=\"" + lf("JavaScript") + "\"><i role=\"presentation\" aria-hidden=\"true\" class=\"align left icon\"></i></a>").click(function () {
                        if ($c.find('.js')[0])
                            $c.find('.js').remove();
                        else {
                            if ($svg)
                                appendJs($svg.parent(), $js, woptions);
                            else
                                appendJs($c, $js, woptions);
                        }
                    });
                    $menu.append($jsBtn);
                }
            }
            // runner menu
            if (woptions.run && !theme.hideDocsSimulator) {
                var $runBtn = $("<a class=\"item\" role=\"button\" tabindex=\"0\" aria-label=\"" + lf("run") + "\"><i role=\"presentation\" aria-hidden=\"true\" class=\"play icon\"></i></a>").click(function () {
                    if ($c.find('.sim')[0])
                        $c.find('.sim').remove(); // remove previous simulators
                    else {
                        var padding = '81.97%';
                        if (pxt.appTarget.simulator)
                            padding = (100 / pxt.appTarget.simulator.aspectRatio) + '%';
                        var $embed = $("<div class=\"ui card sim\"><div class=\"ui content\"><div style=\"position:relative;height:0;padding-bottom:" + padding + ";overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + (getRunUrl(options) + "#nofooter=1&code=" + encodeURIComponent($js.text())) + "\" allowfullscreen=\"allowfullscreen\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\" frameborder=\"0\"></iframe></div></div></div>");
                        $c.append($embed);
                    }
                });
                $menu.append($runBtn);
            }
            if (woptions.hexname && woptions.hex) {
                var $hexBtn = $("<a class=\"item\" role=\"button\" tabindex=\"0\" aria-label=\"" + lf("download") + "\"><i role=\"presentation\" aria-hidden=\"true\" class=\"download icon\"></i></a>").click(function () {
                    pxt.BrowserUtils.browserDownloadBinText(woptions.hex, woptions.hexname, pxt.appTarget.compile.hexMimeType);
                });
                $menu.append($hexBtn);
            }
            var r = [$c];
            // don't add menu if empty
            if ($menu.children().length)
                r.push($h);
            // inject container
            $container.replaceWith(r);
            // download screenshots
            if (options.downloadScreenshots && woptions.hexname) {
                pxt.debug("Downloading screenshot for: " + woptions.hexname);
                var filename_1 = woptions.hexname.substr(0, woptions.hexname.lastIndexOf('.'));
                var fontSize = window.getComputedStyle($svg.get(0).getElementsByClassName("blocklyText").item(0)).getPropertyValue("font-size");
                var svgElement = $svg.get(0);
                var bbox = $svg.get(0).getBoundingClientRect();
                pxt.blocks.layout.svgToPngAsync(svgElement, 0, 0, bbox.width, bbox.height, 4)
                    .done(function (uri) {
                    if (uri)
                        pxt.BrowserUtils.browserDownloadDataUri(uri, (name || (pxt.appTarget.nickname || pxt.appTarget.id) + "-" + filename_1) + ".png");
                });
            }
        }
        var renderQueue = [];
        function consumeRenderQueueAsync() {
            var job = renderQueue.shift();
            if (!job)
                return Promise.resolve(); // done
            var el = job.el, options = job.options, render = job.render, cls = job.cls;
            return pxt.runner.decompileToBlocksAsync(el.text(), options)
                .then(function (r) {
                try {
                    render(el, r);
                }
                catch (e) {
                    console.error('error while rendering ' + el.html());
                    el.append($('<div/>').addClass("ui segment warning").text(e.message));
                }
                el.removeClass("lang-shadow");
                return consumeRenderQueueAsync();
            });
        }
        function renderNextSnippetAsync(cls, render, options) {
            if (!cls)
                return Promise.resolve();
            var $el = $("." + cls).first();
            if (!$el[0])
                return Promise.resolve();
            if (!options.emPixels)
                options.emPixels = 18;
            if (!options.layout)
                options.layout = pxt.blocks.BlockLayout.Align;
            options.splitSvg = true;
            renderQueue.push({ el: $el, source: $el.text(), options: options, render: render, cls: cls });
            $el.addClass("lang-shadow");
            $el.removeClass(cls);
            return renderNextSnippetAsync(cls, render, options);
        }
        function renderSnippetsAsync(options) {
            if (options.tutorial) {
                // don't render chrome for tutorials
                return renderNextSnippetAsync(options.snippetClass, function (c, r) {
                    var s = r.blocksSvg;
                    if (options.snippetReplaceParent)
                        c = c.parent();
                    var segment = $('<div class="ui segment codewidget"/>').append(s);
                    c.replaceWith(segment);
                }, { package: options.package, snippetMode: false, aspectRatio: options.blocksAspectRatio });
            }
            var snippetCount = 0;
            return renderNextSnippetAsync(options.snippetClass, function (c, r) {
                var s = r.compileBlocks && r.compileBlocks.success ? $(r.blocksSvg) : undefined;
                var js = $('<code class="lang-typescript highlight"/>').text(c.text().trim());
                if (options.snippetReplaceParent)
                    c = c.parent();
                var compiled = r.compileJS && r.compileJS.success;
                // TODO should this use pxt.outputName() and not pxtc.BINARY_HEX
                var hex = options.hex && compiled && r.compileJS.outfiles[pxtc.BINARY_HEX]
                    ? r.compileJS.outfiles[pxtc.BINARY_HEX] : undefined;
                var hexname = (pxt.appTarget.nickname || pxt.appTarget.id) + "-" + (options.hexName || '') + "-" + snippetCount++ + ".hex";
                fillWithWidget(options, c, js, s, r, {
                    showEdit: options.showEdit,
                    run: options.simulator && compiled,
                    hexname: hexname,
                    hex: hex,
                });
            }, { package: options.package, aspectRatio: options.blocksAspectRatio });
        }
        function decompileCallInfo(stmt) {
            if (!stmt || stmt.kind != ts.SyntaxKind.ExpressionStatement)
                return null;
            var estmt = stmt;
            if (!estmt.expression || estmt.expression.kind != ts.SyntaxKind.CallExpression)
                return null;
            var call = estmt.expression;
            var info = call.callInfo;
            return info;
        }
        function renderSignaturesAsync(options) {
            return renderNextSnippetAsync(options.signatureClass, function (c, r) {
                var cjs = r.compileJS;
                if (!cjs)
                    return;
                var file = r.compileJS.ast.getSourceFile("main.ts");
                var info = decompileCallInfo(file.statements[0]);
                if (!info || !r.apiInfo)
                    return;
                var symbolInfo = r.apiInfo.byQName[info.qName];
                if (!symbolInfo)
                    return;
                var block = Blockly.Blocks[symbolInfo.attributes.blockId];
                var xml = block && block.codeCard ? block.codeCard.blocksXml : undefined;
                var s = xml ? $(pxt.blocks.render(xml)) : r.compileBlocks && r.compileBlocks.success ? $(r.blocksSvg) : undefined;
                var sig = info.decl.getText().replace(/^export/, '');
                sig = sig.slice(0, sig.indexOf('{')).trim() + ';';
                var js = $('<code class="lang-typescript highlight"/>').text(sig);
                if (options.snippetReplaceParent)
                    c = c.parent();
                fillWithWidget(options, c, js, s, r, { showJs: true, hideGutter: true });
            }, { package: options.package, snippetMode: true, aspectRatio: options.blocksAspectRatio });
        }
        function renderBlocksAsync(options) {
            return renderNextSnippetAsync(options.blocksClass, function (c, r) {
                var s = r.blocksSvg;
                if (options.snippetReplaceParent)
                    c = c.parent();
                var segment = $('<div class="ui segment codewidget"/>').append(s);
                c.replaceWith(segment);
            }, { package: options.package, snippetMode: true, aspectRatio: options.blocksAspectRatio });
        }
        function renderBlocksXmlAsync(opts) {
            if (!opts.blocksXmlClass)
                return Promise.resolve();
            var cls = opts.blocksXmlClass;
            function renderNextXmlAsync(cls, render, options) {
                var $el = $("." + cls).first();
                if (!$el[0])
                    return Promise.resolve();
                if (!options.emPixels)
                    options.emPixels = 18;
                options.splitSvg = true;
                return pxt.runner.compileBlocksAsync($el.text(), options)
                    .then(function (r) {
                    try {
                        render($el, r);
                    }
                    catch (e) {
                        console.error('error while rendering ' + $el.html());
                        $el.append($('<div/>').addClass("ui segment warning").text(e.message));
                    }
                    $el.removeClass(cls);
                    return Promise.delay(1, renderNextXmlAsync(cls, render, options));
                });
            }
            return renderNextXmlAsync(cls, function (c, r) {
                var s = r.blocksSvg;
                if (opts.snippetReplaceParent)
                    c = c.parent();
                var segment = $('<div class="ui segment codewidget"/>').append(s);
                c.replaceWith(segment);
            }, { package: opts.package, snippetMode: true, aspectRatio: opts.blocksAspectRatio });
        }
        function renderNamespaces(options) {
            if (pxt.appTarget.id == "core")
                return Promise.resolve();
            return pxt.runner.decompileToBlocksAsync('', options)
                .then(function (r) {
                var res = {};
                var info = r.compileBlocks.blocksInfo;
                info.blocks.forEach(function (fn) {
                    var ns = (fn.attributes.blockNamespace || fn.namespace).split('.')[0];
                    if (!res[ns]) {
                        var nsn = info.apis.byQName[ns];
                        if (nsn && nsn.attributes.color)
                            res[ns] = nsn.attributes.color;
                    }
                });
                var nsStyleBuffer = '';
                Object.keys(res).forEach(function (ns) {
                    var color = res[ns] || '#dddddd';
                    nsStyleBuffer += "\n                        span.docs." + ns.toLowerCase() + " {\n                            background-color: " + color + " !important;\n                            border-color: " + pxt.toolbox.fadeColor(color, 0.1, false) + " !important;\n                        }\n                    ";
                });
                return nsStyleBuffer;
            })
                .then(function (nsStyleBuffer) {
                Object.keys(pxt.toolbox.blockColors).forEach(function (ns) {
                    var color = pxt.toolbox.blockColors[ns];
                    nsStyleBuffer += "\n                        span.docs." + ns.toLowerCase() + " {\n                            background-color: " + color + " !important;\n                            border-color: " + pxt.toolbox.fadeColor(color, 0.1, false) + " !important;\n                        }\n                    ";
                });
                return nsStyleBuffer;
            })
                .then(function (nsStyleBuffer) {
                // Inject css
                var nsStyle = document.createElement('style');
                nsStyle.id = "namespaceColors";
                nsStyle.type = 'text/css';
                var head = document.head || document.getElementsByTagName('head')[0];
                head.appendChild(nsStyle);
                nsStyle.appendChild(document.createTextNode(nsStyleBuffer));
            });
        }
        function renderInlineBlocksAsync(options) {
            options = pxt.Util.clone(options);
            options.emPixels = 18;
            options.snippetMode = true;
            var $els = $(":not(pre) > code");
            var i = 0;
            function renderNextAsync() {
                if (i >= $els.length)
                    return Promise.resolve();
                var $el = $($els[i++]);
                var text = $el.text();
                var mbtn = /^(\|+)([^\|]+)\|+$/.exec(text);
                if (mbtn) {
                    var mtxt = /^(([^\:\.]*?)[\:\.])?(.*)$/.exec(mbtn[2]);
                    var ns = mtxt[2] ? mtxt[2].trim().toLowerCase() : '';
                    var lev = mbtn[1].length == 1 ? "docs inlinebutton " + ns : "docs inlineblock " + ns;
                    var txt = mtxt[3].trim();
                    $el.replaceWith($("<span class=\"" + lev + "\"/>").text(pxt.U.rlf(txt)));
                    return renderNextAsync();
                }
                var m = /^\[([^\]]+)\]$/.exec(text);
                if (!m)
                    return renderNextAsync();
                var code = m[1];
                return pxt.runner.decompileToBlocksAsync(code, options)
                    .then(function (r) {
                    if (r.blocksSvg) {
                        var $newel = $('<span class="block"/>').append(r.blocksSvg);
                        var file = r.compileJS.ast.getSourceFile("main.ts");
                        var stmt = file.statements[0];
                        var info = decompileCallInfo(stmt);
                        if (info && r.apiInfo) {
                            var symbolInfo = r.apiInfo.byQName[info.qName];
                            if (symbolInfo && symbolInfo.attributes.help) {
                                $newel = $("<a class=\"ui link\"/>").attr("href", "/reference/" + symbolInfo.attributes.help).append($newel);
                            }
                        }
                        $el.replaceWith($newel);
                    }
                    return Promise.delay(1, renderNextAsync());
                });
            }
            return renderNextAsync();
        }
        function renderProjectAsync(options) {
            if (!options.projectClass)
                return Promise.resolve();
            function render() {
                var $el = $("." + options.projectClass).first();
                var e = $el[0];
                if (!e)
                    return Promise.resolve();
                $el.removeClass(options.projectClass);
                var id = pxt.Cloud.parseScriptId(e.innerText);
                if (id) {
                    if (options.snippetReplaceParent) {
                        e = e.parentElement;
                        // create a new div to host the rendered code
                        var d = document.createElement("div");
                        e.parentElement.insertBefore(d, e);
                        e.parentElement.removeChild(e);
                        e = d;
                    }
                    return pxt.runner.renderProjectAsync(e, id)
                        .then(function () { return render(); });
                }
                else
                    return render();
            }
            return render();
        }
        function renderLinksAsync(options, cls, replaceParent, ns) {
            return renderNextSnippetAsync(cls, function (c, r) {
                var cjs = r.compileJS;
                if (!cjs)
                    return;
                var file = r.compileJS.ast.getSourceFile("main.ts");
                var stmts = file.statements.slice(0);
                var ul = $('<div />').addClass('ui cards');
                ul.attr("role", "listbox");
                var addItem = function (card) {
                    if (!card)
                        return;
                    var mC = /^\/(v\d+)/.exec(card.url);
                    var mP = /^\/(v\d+)/.exec(window.location.pathname);
                    var inEditor = /#doc/i.test(window.location.href);
                    if (card.url && !mC && mP && !inEditor)
                        card.url = "/" + mP[1] + "/" + card.url;
                    ul.append(pxt.docs.codeCard.render(card, { hideHeader: true, shortName: true }));
                };
                stmts.forEach(function (stmt) {
                    var info = decompileCallInfo(stmt);
                    if (info && r.apiInfo && r.apiInfo.byQName[info.qName]) {
                        var attributes = r.apiInfo.byQName[info.qName].attributes;
                        var block = Blockly.Blocks[attributes.blockId];
                        if (ns) {
                            var ii = r.compileBlocks.blocksInfo.apis.byQName[info.qName];
                            var nsi = r.compileBlocks.blocksInfo.apis.byQName[ii.namespace];
                            addItem({
                                name: nsi.attributes.blockNamespace || nsi.name,
                                url: nsi.attributes.help || ("reference/" + (nsi.attributes.blockNamespace || nsi.name).toLowerCase()),
                                description: nsi.attributes.jsDoc,
                                blocksXml: block && block.codeCard
                                    ? block.codeCard.blocksXml
                                    : attributes.blockId
                                        ? "<xml xmlns=\"http://www.w3.org/1999/xhtml\"><block type=\"" + attributes.blockId + "\"></block></xml>"
                                        : undefined
                            });
                        }
                        else if (block) {
                            var card = pxt.U.clone(block.codeCard);
                            if (card) {
                                addItem(card);
                            }
                        }
                        else {
                            // no block available here
                            addItem({
                                name: info.qName,
                                description: attributes.jsDoc,
                                url: attributes.help || undefined
                            });
                        }
                    }
                    else
                        switch (stmt.kind) {
                            case ts.SyntaxKind.ExpressionStatement:
                                var es = stmt;
                                switch (es.expression.kind) {
                                    case ts.SyntaxKind.TrueKeyword:
                                    case ts.SyntaxKind.FalseKeyword:
                                        addItem({
                                            name: "Boolean",
                                            url: "blocks/logic/boolean",
                                            description: lf("True or false values"),
                                            blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></xml>'
                                        });
                                        break;
                                    default:
                                        pxt.debug("card expr kind: " + es.expression.kind);
                                        break;
                                }
                                break;
                            case ts.SyntaxKind.IfStatement:
                                addItem({
                                    name: ns ? "Logic" : "if",
                                    url: "blocks/logic" + (ns ? "" : "/if"),
                                    description: ns ? lf("Logic operators and constants") : lf("Conditional statement"),
                                    blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="controls_if"></block></xml>'
                                });
                                break;
                            case ts.SyntaxKind.WhileStatement:
                                addItem({
                                    name: ns ? "Loops" : "while",
                                    url: "blocks/loops" + (ns ? "" : "/while"),
                                    description: ns ? lf("Loops and repetition") : lf("Repeat code while a condition is true."),
                                    blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="device_while"></block></xml>'
                                });
                                break;
                            case ts.SyntaxKind.ForOfStatement:
                                addItem({
                                    name: ns ? "Loops" : "for of",
                                    url: "blocks/loops" + (ns ? "" : "/for-of"),
                                    description: ns ? lf("Loops and repetition") : lf("Repeat code for each item in a list."),
                                    blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="controls_for_of"></block></xml>'
                                });
                                break;
                            case ts.SyntaxKind.ForStatement:
                                var fs = stmt;
                                // look for the 'repeat' loop style signature in the condition expression, explicitly: (let i = 0; i < X; i++)
                                // for loops will have the '<=' conditional.
                                var forloop = true;
                                if (fs.condition.getChildCount() == 3) {
                                    forloop = !(fs.condition.getChildAt(0).getText() == "0" ||
                                        fs.condition.getChildAt(1).kind == ts.SyntaxKind.LessThanToken);
                                }
                                if (forloop) {
                                    addItem({
                                        name: ns ? "Loops" : "for",
                                        url: "blocks/loops" + (ns ? "" : "/for"),
                                        description: ns ? lf("Loops and repetition") : lf("Repeat code for a given number of times using an index."),
                                        blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="controls_simple_for"></block></xml>'
                                    });
                                }
                                else {
                                    addItem({
                                        name: ns ? "Loops" : "repeat",
                                        url: "blocks/loops" + (ns ? "" : "/repeat"),
                                        description: ns ? lf("Loops and repetition") : lf("Repeat code for a given number of times."),
                                        blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="controls_repeat_ext"></block></xml>'
                                    });
                                }
                                break;
                            case ts.SyntaxKind.VariableStatement:
                                addItem({
                                    name: ns ? "Variables" : "variable declaration",
                                    url: "blocks/variables" + (ns ? "" : "/assign"),
                                    description: ns ? lf("Variables") : lf("Assign a value to a named variable."),
                                    blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="variables_set"></block></xml>'
                                });
                                break;
                            default:
                                pxt.debug("card kind: " + stmt.kind);
                        }
                });
                if (replaceParent)
                    c = c.parent();
                c.replaceWith(ul);
            }, { package: options.package, aspectRatio: options.blocksAspectRatio });
        }
        function fillCodeCardAsync(c, cards, options) {
            if (!cards || cards.length == 0)
                return Promise.resolve();
            if (cards.length == 0) {
                var cc = pxt.docs.codeCard.render(cards[0], options);
                c.replaceWith(cc);
            }
            else {
                var cd_1 = document.createElement("div");
                cd_1.className = "ui cards";
                cd_1.setAttribute("role", "listbox");
                cards.forEach(function (card) {
                    // patch card url with version if necessary, we don't do this in the editor because that goes through the backend and passes the targetVersion then
                    var mC = /^\/(v\d+)/.exec(card.url);
                    var mP = /^\/(v\d+)/.exec(window.location.pathname);
                    var inEditor = /#doc/i.test(window.location.href);
                    if (card.url && !mC && mP && !inEditor)
                        card.url = "/" + mP[1] + card.url;
                    var cardEl = pxt.docs.codeCard.render(card, options);
                    cd_1.appendChild(cardEl);
                    // automitcally display package icon for approved packages
                    if (card.cardType == "package") {
                        var repoId_1 = pxt.github.parseRepoId((card.url || "").replace(/^\/pkg\//, ''));
                        if (repoId_1) {
                            pxt.packagesConfigAsync()
                                .then(function (pkgConfig) {
                                var status = pxt.github.repoStatus(repoId_1, pkgConfig);
                                switch (status) {
                                    case pxt.github.GitRepoStatus.Banned:
                                        cardEl.remove();
                                        break;
                                    case pxt.github.GitRepoStatus.Approved:
                                        // update card info
                                        card.imageUrl = pxt.github.mkRepoIconUrl(repoId_1);
                                        // inject
                                        cd_1.insertBefore(pxt.docs.codeCard.render(card, options), cardEl);
                                        cardEl.remove();
                                        break;
                                }
                            })
                                .catch(function (e) {
                                // swallow
                                pxt.debug("failed to load repo " + card.url);
                            });
                        }
                    }
                });
                c.replaceWith(cd_1);
            }
            return Promise.resolve();
        }
        function renderNextCodeCardAsync(cls, options) {
            if (!cls)
                return Promise.resolve();
            var $el = $("." + cls).first();
            if (!$el[0])
                return Promise.resolve();
            $el.removeClass(cls);
            var cards;
            try {
                var js = JSON.parse($el.text());
                if (!Array.isArray(js))
                    js = [js];
                cards = js;
            }
            catch (e) {
                console.error('error while rendering ' + $el.html());
                $el.append($('<div/>').addClass("ui segment warning").text(e.messageText));
            }
            if (options.snippetReplaceParent)
                $el = $el.parent();
            return fillCodeCardAsync($el, cards, { hideHeader: true })
                .then(function () { return Promise.delay(1, renderNextCodeCardAsync(cls, options)); });
        }
        function getRunUrl(options) {
            return options.pxtUrl ? options.pxtUrl + '/--run' : pxt.webConfig && pxt.webConfig.runUrl ? pxt.webConfig.runUrl : '/--run';
        }
        function getEditUrl(options) {
            var url = options.pxtUrl || pxt.appTarget.appTheme.homeUrl;
            return (url || "").replace(/\/$/, '');
        }
        function mergeConfig(options) {
            // additional config options
            if (!options.packageClass)
                return;
            $('.' + options.packageClass).each(function (i, c) {
                var $c = $(c);
                var name = $c.text().split('\n').map(function (s) { return s.replace(/\s*/g, ''); }).filter(function (s) { return !!s; }).join(',');
                options.package = options.package ? options.package + "," + name : name;
                if (options.snippetReplaceParent)
                    $c = $c.parent();
                $c.remove();
            });
            $('.lang-config').each(function (i, c) {
                var $c = $(c);
                if (options.snippetReplaceParent)
                    $c = $c.parent();
                $c.remove();
            });
        }
        function renderTypeScript(options) {
            var woptions = {
                showEdit: !!options.showEdit,
                run: !!options.simulator
            };
            function render(e, ignored) {
                if (typeof hljs !== "undefined") {
                    $(e).text($(e).text().replace(/^\s*\r?\n/, ''));
                    hljs.highlightBlock(e);
                }
                var opts = pxt.U.clone(woptions);
                if (ignored) {
                    opts.run = false;
                    opts.showEdit = false;
                }
                fillWithWidget(options, $(e).parent(), $(e), undefined, undefined, opts);
            }
            $('code.lang-typescript').each(function (i, e) {
                render(e, false);
                $(e).removeClass('lang-typescript');
            });
            $('code.lang-typescript-ignore').each(function (i, e) {
                $(e).removeClass('lang-typescript-ignore');
                $(e).addClass('lang-typescript');
                render(e, true);
                $(e).removeClass('lang-typescript');
            });
            $('code.lang-typescript-invalid').each(function (i, e) {
                $(e).removeClass('lang-typescript-invalid');
                $(e).addClass('lang-typescript');
                render(e, true);
                $(e).removeClass('lang-typescript');
                $(e).parent('div').addClass('invalid');
                $(e).parent('div').prepend($("<i>", { "class": "icon ban" }));
                $(e).addClass('invalid');
            });
            $('code.lang-typescript-valid').each(function (i, e) {
                $(e).removeClass('lang-typescript-valid');
                $(e).addClass('lang-typescript');
                render(e, true);
                $(e).removeClass('lang-typescript');
                $(e).parent('div').addClass('valid');
                $(e).parent('div').prepend($("<i>", { "class": "icon check" }));
                $(e).addClass('valid');
            });
        }
        function renderAsync(options) {
            if (!options)
                options = {};
            if (options.pxtUrl)
                options.pxtUrl = options.pxtUrl.replace(/\/$/, '');
            if (options.showEdit)
                options.showEdit = !pxt.BrowserUtils.isIFrame();
            mergeConfig(options);
            if (options.simulatorClass) {
                // simulators
                $('.' + options.simulatorClass).each(function (i, c) {
                    var $c = $(c);
                    var padding = '81.97%';
                    if (pxt.appTarget.simulator)
                        padding = (100 / pxt.appTarget.simulator.aspectRatio) + '%';
                    var $sim = $("<div class=\"ui centered card\"><div class=\"ui content\">\n                    <div style=\"position:relative;height:0;padding-bottom:" + padding + ";overflow:hidden;\">\n                    <iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" allowfullscreen=\"allowfullscreen\" frameborder=\"0\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\"></iframe>\n                    </div>\n                    </div></div>");
                    $sim.find("iframe").attr("src", getRunUrl(options) + "#nofooter=1&code=" + encodeURIComponent($c.text().trim()));
                    if (options.snippetReplaceParent)
                        $c = $c.parent();
                    $c.replaceWith($sim);
                });
            }
            renderQueue = [];
            renderTypeScript(options);
            return Promise.resolve()
                .then(function () { return renderNextCodeCardAsync(options.codeCardClass, options); })
                .then(function () { return renderNamespaces(options); })
                .then(function () { return renderInlineBlocksAsync(options); })
                .then(function () { return renderLinksAsync(options, options.linksClass, options.snippetReplaceParent, false); })
                .then(function () { return renderLinksAsync(options, options.namespacesClass, options.snippetReplaceParent, true); })
                .then(function () { return renderSignaturesAsync(options); })
                .then(function () { return renderSnippetsAsync(options); })
                .then(function () { return renderBlocksAsync(options); })
                .then(function () { return renderBlocksXmlAsync(options); })
                .then(function () { return renderProjectAsync(options); })
                .then(function () { return consumeRenderQueueAsync(); });
        }
        runner.renderAsync = renderAsync;
    })(runner = pxt.runner || (pxt.runner = {}));
})(pxt || (pxt = {}));
/* tslint:disable:no-inner-html TODO(tslint): get rid of jquery html() calls */
/// <reference path="../built/pxtlib.d.ts" />
/// <reference path="../built/pxteditor.d.ts" />
/// <reference path="../built/pxtcompiler.d.ts" />
/// <reference path="../built/pxtblocks.d.ts" />
/// <reference path="../built/pxtsim.d.ts" />
var pxt;
(function (pxt) {
    var runner;
    (function (runner) {
        var EditorPackage = /** @class */ (function () {
            function EditorPackage(ksPkg, topPkg) {
                this.ksPkg = ksPkg;
                this.topPkg = topPkg;
                this.files = {};
            }
            EditorPackage.prototype.getKsPkg = function () {
                return this.ksPkg;
            };
            EditorPackage.prototype.getPkgId = function () {
                return this.ksPkg ? this.ksPkg.id : this.id;
            };
            EditorPackage.prototype.isTopLevel = function () {
                return this.ksPkg && this.ksPkg.level == 0;
            };
            EditorPackage.prototype.setFiles = function (files) {
                this.files = files;
            };
            EditorPackage.prototype.getAllFiles = function () {
                return pxt.Util.mapMap(this.files, function (k, f) { return f; });
            };
            return EditorPackage;
        }());
        var Host = /** @class */ (function () {
            function Host() {
                this.githubPackageCache = {};
            }
            Host.prototype.readFile = function (module, filename) {
                var epkg = getEditorPkg(module);
                return pxt.U.lookup(epkg.files, filename);
            };
            Host.prototype.writeFile = function (module, filename, contents) {
                if (filename == pxt.CONFIG_NAME)
                    return; // ignore config writes
                throw pxt.Util.oops("trying to write " + module + " / " + filename);
            };
            Host.prototype.getHexInfoAsync = function (extInfo) {
                return pxt.hex.getHexInfoAsync(this, extInfo);
            };
            Host.prototype.cacheStoreAsync = function (id, val) {
                return Promise.resolve();
            };
            Host.prototype.cacheGetAsync = function (id) {
                return Promise.resolve(null);
            };
            Host.prototype.downloadPackageAsync = function (pkg) {
                var _this = this;
                var proto = pkg.verProtocol();
                var cached = undefined;
                // cache resolve github packages
                if (proto == "github")
                    cached = this.githubPackageCache[pkg._verspec];
                var epkg = getEditorPkg(pkg);
                return (cached ? Promise.resolve(cached) : pkg.commonDownloadAsync())
                    .then(function (resp) {
                    if (resp) {
                        if (proto == "github" && !cached)
                            _this.githubPackageCache[pkg._verspec] = pxt.Util.clone(resp);
                        epkg.setFiles(resp);
                        return Promise.resolve();
                    }
                    if (proto == "empty") {
                        epkg.setFiles(emptyPrjFiles());
                        return Promise.resolve();
                    }
                    else if (proto == "docs") {
                        var files = emptyPrjFiles();
                        var cfg_1 = JSON.parse(files[pxt.CONFIG_NAME]);
                        pkg.verArgument().split(',').forEach(function (d) {
                            var m = /^([a-zA-Z0-9_-]+)(=(.+))?$/.exec(d);
                            if (m)
                                cfg_1.dependencies[m[1]] = m[3] || "*";
                            else
                                console.warn("unknown package syntax " + d);
                        });
                        if (!cfg_1.yotta)
                            cfg_1.yotta = {};
                        cfg_1.yotta.ignoreConflicts = true;
                        files[pxt.CONFIG_NAME] = JSON.stringify(cfg_1, null, 4);
                        epkg.setFiles(files);
                        return Promise.resolve();
                    }
                    else {
                        return Promise.reject("Cannot download " + pkg.version() + "; unknown protocol");
                    }
                });
            };
            return Host;
        }());
        function getEditorPkg(p) {
            var r = p._editorPkg;
            if (r)
                return r;
            var top = null;
            if (p != runner.mainPkg)
                top = getEditorPkg(runner.mainPkg);
            var newOne = new EditorPackage(p, top);
            if (p == runner.mainPkg)
                newOne.topPkg = newOne;
            p._editorPkg = newOne;
            return newOne;
        }
        function emptyPrjFiles() {
            var p = pxt.appTarget.tsprj;
            var files = pxt.U.clone(p.files);
            files[pxt.CONFIG_NAME] = JSON.stringify(p.config, null, 4) + "\n";
            files["main.blocks"] = "";
            return files;
        }
        function patchSemantic() {
            if ($ && $.fn && $.fn.embed && $.fn.embed.settings && $.fn.embed.settings.sources && $.fn.embed.settings.sources.youtube) {
                $.fn.embed.settings.sources.youtube.url = '//www.youtube.com/embed/{id}?rel=0';
            }
        }
        function initInnerAsync() {
            pxt.setAppTarget(window.pxtTargetBundle);
            pxt.Util.assert(!!pxt.appTarget);
            var cookieValue = /PXT_LANG=(.*?)(?:;|$)/.exec(document.cookie);
            var mlang = /(live)?(force)?lang=([a-z]{2,}(-[A-Z]+)?)/i.exec(window.location.href);
            var lang = mlang ? mlang[3] : (cookieValue && cookieValue[1] || pxt.appTarget.appTheme.defaultLocale || navigator.userLanguage || navigator.language);
            var live = !pxt.appTarget.appTheme.disableLiveTranslations || (mlang && !!mlang[1]);
            var force = !!mlang && !!mlang[2];
            var versions = pxt.appTarget.versions;
            patchSemantic();
            var cfg = pxt.webConfig;
            return pxt.Util.updateLocalizationAsync(pxt.appTarget.id, cfg.commitCdnUrl, lang, versions ? versions.pxtCrowdinBranch : "", versions ? versions.targetCrowdinBranch : "", live, force)
                .then(function () {
                runner.mainPkg = new pxt.MainPackage(new Host());
            });
        }
        function initFooter(footer, shareId) {
            if (!footer)
                return;
            var theme = pxt.appTarget.appTheme;
            var body = $('body');
            var $footer = $(footer);
            var footera = $('<a/>').attr('href', theme.homeUrl)
                .attr('target', '_blank');
            $footer.append(footera);
            if (theme.organizationLogo)
                footera.append($('<img/>').attr('src', pxt.Util.toDataUri(theme.organizationLogo)));
            else
                footera.append(lf("powered by {0}", theme.title));
            body.mouseenter(function (ev) { return $footer.fadeOut(); });
            body.mouseleave(function (ev) { return $footer.fadeIn(); });
        }
        runner.initFooter = initFooter;
        function showError(msg) {
            console.error(msg);
        }
        runner.showError = showError;
        var previousMainPackage = undefined;
        function loadPackageAsync(id, code) {
            var verspec = id ? /\w+:\w+/.test(id) ? id : "pub:" + id : "empty:tsprj";
            var host;
            var downloadPackagePromise;
            var installPromise;
            if (previousMainPackage && previousMainPackage._verspec == verspec) {
                runner.mainPkg = previousMainPackage;
                host = runner.mainPkg.host();
                downloadPackagePromise = Promise.resolve();
                installPromise = Promise.resolve();
            }
            else {
                host = runner.mainPkg.host();
                runner.mainPkg = new pxt.MainPackage(host);
                runner.mainPkg._verspec = id ? /\w+:\w+/.test(id) ? id : "pub:" + id : "empty:tsprj";
                downloadPackagePromise = host.downloadPackageAsync(runner.mainPkg);
                installPromise = runner.mainPkg.installAllAsync();
                // cache previous package
                previousMainPackage = runner.mainPkg;
            }
            return downloadPackagePromise
                .then(function () { return host.readFile(runner.mainPkg, pxt.CONFIG_NAME); })
                .then(function (str) {
                if (!str)
                    return Promise.resolve();
                return installPromise.then(function () {
                    if (code) {
                        //Set the custom code if provided for docs.
                        var epkg = getEditorPkg(runner.mainPkg);
                        epkg.files["main.ts"] = code;
                        //set the custom doc name from the URL.
                        var cfg = JSON.parse(epkg.files[pxt.CONFIG_NAME]);
                        cfg.name = window.location.href.split('/').pop().split(/[?#]/)[0];
                        ;
                        epkg.files[pxt.CONFIG_NAME] = JSON.stringify(cfg, null, 4);
                        //Propgate the change to main package
                        runner.mainPkg.config.name = cfg.name;
                        if (runner.mainPkg.config.files.indexOf("main.blocks") == -1) {
                            runner.mainPkg.config.files.push("main.blocks");
                        }
                    }
                }).catch(function (e) {
                    showError(lf("Cannot load extension: {0}", e.message));
                });
            });
        }
        function getCompileOptionsAsync(hex) {
            var trg = runner.mainPkg.getTargetOptions();
            trg.isNative = !!hex;
            trg.hasHex = !!hex;
            return runner.mainPkg.getCompileOptionsAsync(trg);
        }
        function compileAsync(hex, updateOptions) {
            return getCompileOptionsAsync()
                .then(function (opts) {
                if (updateOptions)
                    updateOptions(opts);
                var resp = pxtc.compile(opts);
                if (resp.diagnostics && resp.diagnostics.length > 0) {
                    resp.diagnostics.forEach(function (diag) {
                        console.error(diag.messageText);
                    });
                }
                return resp;
            });
        }
        function generateHexFileAsync(options) {
            return loadPackageAsync(options.id)
                .then(function () { return compileAsync(true, function (opts) {
                if (options.code)
                    opts.fileSystem["main.ts"] = options.code;
            }); })
                .then(function (resp) {
                if (resp.diagnostics && resp.diagnostics.length > 0) {
                    console.error("Diagnostics", resp.diagnostics);
                }
                return resp.outfiles[pxtc.BINARY_HEX];
            });
        }
        runner.generateHexFileAsync = generateHexFileAsync;
        function simulateAsync(container, simOptions) {
            return loadPackageAsync(simOptions.id)
                .then(function () { return compileAsync(false, function (opts) {
                if (simOptions.code)
                    opts.fileSystem["main.ts"] = simOptions.code;
            }); })
                .then(function (resp) {
                if (resp.diagnostics && resp.diagnostics.length > 0) {
                    console.error("Diagnostics", resp.diagnostics);
                }
                var js = resp.outfiles[pxtc.BINARY_JS];
                if (js) {
                    var options_1 = {};
                    options_1.onSimulatorCommand = function (msg) {
                        if (msg.command === "restart") {
                            driver_1.run(js, runOptions_1);
                        }
                    };
                    var driver_1 = new pxsim.SimulatorDriver(container, options_1);
                    var fnArgs = resp.usedArguments;
                    var board = pxt.appTarget.simulator.boardDefinition;
                    var parts = pxtc.computeUsedParts(resp, true);
                    var runOptions_1 = {
                        boardDefinition: board,
                        parts: parts,
                        fnArgs: fnArgs,
                        cdnUrl: pxt.webConfig.commitCdnUrl,
                        localizedStrings: pxt.Util.getLocalizedStrings(),
                        highContrast: simOptions.highContrast,
                        light: simOptions.light
                    };
                    if (pxt.appTarget.simulator && !simOptions.fullScreen)
                        runOptions_1.aspectRatio = parts.length && pxt.appTarget.simulator.partsAspectRatio
                            ? pxt.appTarget.simulator.partsAspectRatio
                            : pxt.appTarget.simulator.aspectRatio;
                    driver_1.run(js, runOptions_1);
                }
            });
        }
        runner.simulateAsync = simulateAsync;
        var LanguageMode;
        (function (LanguageMode) {
            LanguageMode[LanguageMode["Blocks"] = 0] = "Blocks";
            LanguageMode[LanguageMode["TypeScript"] = 1] = "TypeScript";
        })(LanguageMode = runner.LanguageMode || (runner.LanguageMode = {}));
        runner.editorLanguageMode = LanguageMode.Blocks;
        runner.editorLocale = "en";
        function setEditorContextAsync(mode, locale) {
            runner.editorLanguageMode = mode;
            if (locale != runner.editorLocale) {
                var localeLiveRx = /^live-/;
                runner.editorLocale = locale;
                return pxt.Util.updateLocalizationAsync(pxt.appTarget.id, pxt.webConfig.commitCdnUrl, runner.editorLocale.replace(localeLiveRx, ''), pxt.appTarget.versions.pxtCrowdinBranch, pxt.appTarget.versions.targetCrowdinBranch, localeLiveRx.test(runner.editorLocale));
            }
            return Promise.resolve();
        }
        runner.setEditorContextAsync = setEditorContextAsync;
        function receiveDocMessage(e) {
            var m = e.data;
            if (!m)
                return;
            switch (m.type) {
                case "fileloaded":
                    var fm = m;
                    var name_1 = fm.name;
                    setEditorContextAsync(/\.ts$/i.test(name_1) ? LanguageMode.TypeScript : LanguageMode.Blocks, fm.locale).done();
                    break;
                case "popout":
                    var mp = /((\/v[0-9+])\/)?[^\/]*#(doc|md):([^&?:]+)/i.exec(window.location.href);
                    if (mp) {
                        var docsUrl = pxt.webConfig.docsUrl || '/--docs';
                        var verPrefix = mp[2] || '';
                        var url = mp[3] == "doc" ? (pxt.webConfig.isStatic ? "/docs" + mp[4] + ".html" : "" + mp[4]) : docsUrl + "?md=" + mp[4];
                        window.open(pxt.BrowserUtils.urlJoin(verPrefix, url), "_blank");
                        // notify parent iframe that we have completed the popout
                        if (window.parent)
                            window.parent.postMessage({
                                type: "popoutcomplete"
                            }, "*");
                    }
                    break;
                case "localtoken":
                    var dm = m;
                    if (dm && dm.localToken) {
                        pxt.Cloud.localToken = dm.localToken;
                        pendingLocalToken.forEach(function (p) { return p(); });
                        pendingLocalToken = [];
                    }
                    break;
            }
        }
        function initEditorExtensionsAsync() {
            var promise = Promise.resolve();
            if (pxt.appTarget.appTheme && pxt.appTarget.appTheme.extendFieldEditors) {
                var opts_1 = {};
                promise = promise
                    .then(function () { return pxt.BrowserUtils.loadBlocklyAsync(); })
                    .then(function () { return pxt.BrowserUtils.loadScriptAsync("fieldeditors.js"); })
                    .then(function () { return pxt.editor.initFieldExtensionsAsync(opts_1); })
                    .then(function (res) {
                    if (res.fieldEditors)
                        res.fieldEditors.forEach(function (fi) {
                            pxt.blocks.registerFieldEditor(fi.selector, fi.editor, fi.validator);
                        });
                });
            }
            return promise;
        }
        function startRenderServer() {
            pxt.tickEvent("renderer.ready");
            var jobQueue = [];
            var jobPromise = undefined;
            function consumeQueue() {
                if (jobPromise)
                    return; // other worker already in action
                var msg = jobQueue.shift();
                if (!msg)
                    return; // no more work
                var options = (msg.options || {});
                options.splitSvg = false; // don't split when requesting rendered images
                pxt.tickEvent("renderer.job");
                jobPromise = pxt.BrowserUtils.loadBlocklyAsync()
                    .then(function () { return runner.decompileToBlocksAsync(msg.code, msg.options); })
                    .then(function (result) {
                    var blocksSvg = result.blocksSvg;
                    return blocksSvg ? pxt.blocks.layout.blocklyToSvgAsync(blocksSvg, 0, 0, blocksSvg.viewBox.baseVal.width, blocksSvg.viewBox.baseVal.height) : undefined;
                }).then(function (res) {
                    window.parent.postMessage({
                        source: "makecode",
                        type: "renderblocks",
                        id: msg.id,
                        width: res ? res.width : undefined,
                        height: res ? res.height : undefined,
                        svg: res ? res.svg : undefined,
                        uri: res ? res.xml : undefined,
                        css: res ? res.css : undefined
                    }, "*");
                    jobPromise = undefined;
                    consumeQueue();
                });
            }
            initEditorExtensionsAsync()
                .done(function () {
                // notify parent that render engine is loaded
                window.addEventListener("message", function (ev) {
                    var msg = ev.data;
                    if (msg.type == "renderblocks") {
                        jobQueue.push(msg);
                        consumeQueue();
                    }
                }, false);
                window.parent.postMessage({
                    source: "makecode",
                    type: "renderready"
                }, "*");
            });
        }
        runner.startRenderServer = startRenderServer;
        function startDocsServer(loading, content, backButton) {
            pxt.tickEvent("docrenderer.ready");
            var history = [];
            if (backButton) {
                backButton.addEventListener("click", function () {
                    goBack();
                });
                pxsim.U.addClass(backButton, "disabled");
            }
            function render(doctype, src) {
                pxt.debug("rendering " + doctype);
                if (backButton)
                    $(backButton).hide();
                $(content).hide();
                $(loading).show();
                Promise.delay(100) // allow UI to update
                    .then(function () {
                    switch (doctype) {
                        case "print":
                            var data = window.localStorage["printjob"];
                            delete window.localStorage["printjob"];
                            return renderProjectFilesAsync(content, JSON.parse(data), undefined, true)
                                .then(function () { return pxsim.print(1000); });
                        case "project":
                            return renderProjectFilesAsync(content, JSON.parse(src))
                                .then(function () { return pxsim.print(1000); });
                        case "projectid":
                            return renderProjectAsync(content, JSON.parse(src))
                                .then(function () { return pxsim.print(1000); });
                        case "doc":
                            return renderDocAsync(content, src);
                        case "book":
                            return renderBookAsync(content, src);
                        default:
                            return renderMarkdownAsync(content, src);
                    }
                })
                    .catch(function (e) {
                    $(content).html("\n                    <img style=\"height:4em;\" src=\"" + pxt.appTarget.appTheme.docsLogo + "\" />\n                    <h1>" + lf("Oops") + "</h1>\n                    <h3>" + lf("We could not load the documentation, please check your internet connection.") + "</h3>\n                    <button class=\"ui button primary\" id=\"tryagain\">" + lf("Try Again") + "</button>");
                    $(content).find('#tryagain').click(function () {
                        render(doctype, src);
                    });
                    // notify parent iframe that docs weren't loaded
                    if (window.parent)
                        window.parent.postMessage({
                            type: "docfailed",
                            docType: doctype,
                            src: src
                        }, "*");
                }).finally(function () {
                    $(loading).hide();
                    if (backButton)
                        $(backButton).show();
                    $(content).show();
                })
                    .done(function () { });
            }
            function pushHistory() {
                if (!backButton)
                    return;
                history.push(window.location.hash);
                if (history.length > 10) {
                    history.shift();
                }
                if (history.length > 1) {
                    pxsim.U.removeClass(backButton, "disabled");
                }
            }
            function goBack() {
                if (!backButton)
                    return;
                if (history.length > 1) {
                    // Top is current page
                    history.pop();
                    window.location.hash = history.pop();
                }
                if (history.length <= 1) {
                    pxsim.U.addClass(backButton, "disabled");
                }
            }
            function renderHash() {
                var m = /^#(doc|md|tutorial|book|project|projectid|print):([^&?:]+)(:([^&?:]+):([^&?:]+))?/i.exec(window.location.hash);
                if (m) {
                    pushHistory();
                    // navigation occured
                    var p = m[4] ? setEditorContextAsync(/^blocks$/.test(m[4]) ? LanguageMode.Blocks : LanguageMode.TypeScript, m[5]) : Promise.resolve();
                    p.then(function () { return render(m[1], decodeURIComponent(m[2])); });
                }
            }
            var promise = initEditorExtensionsAsync();
            promise.done(function () {
                window.addEventListener("message", receiveDocMessage, false);
                window.addEventListener("hashchange", function () {
                    renderHash();
                }, false);
                parent.postMessage({ type: "sidedocready" }, "*");
                // delay load doc page to allow simulator to load first
                setTimeout(function () { return renderHash(); }, 1);
            });
        }
        runner.startDocsServer = startDocsServer;
        function renderProjectAsync(content, projectid) {
            return pxt.Cloud.privateGetTextAsync(projectid + "/text")
                .then(function (txt) { return JSON.parse(txt); })
                .then(function (files) { return renderProjectFilesAsync(content, files, projectid); });
        }
        runner.renderProjectAsync = renderProjectAsync;
        function renderProjectFilesAsync(content, files, projectid, escapeLinks) {
            if (projectid === void 0) { projectid = null; }
            if (escapeLinks === void 0) { escapeLinks = false; }
            var cfg = (JSON.parse(files[pxt.CONFIG_NAME]) || {});
            var md = "# " + cfg.name + " " + (cfg.version ? cfg.version : '') + "\n\n";
            var readme = "README.md";
            if (files[readme])
                md += files[readme].replace(/^#+/, "$0#") + '\n'; // bump all headers down 1
            cfg.files.filter(function (f) { return f != pxt.CONFIG_NAME && f != readme; })
                .filter(function (f) { return (runner.editorLanguageMode == LanguageMode.Blocks) == /\.blocks?$/.test(f); })
                .forEach(function (f) {
                if (!/^main\.(ts|blocks)$/.test(f))
                    md += "\n## " + f + "\n";
                if (/\.ts$/.test(f)) {
                    md += "```typescript\n" + files[f] + "\n```\n";
                }
                else if (/\.blocks?$/.test(f)) {
                    md += "```blocksxml\n" + files[f] + "\n```\n";
                }
                else {
                    md += "```" + f.substr(f.indexOf('.')) + "\n" + files[f] + "\n```\n";
                }
            });
            if (cfg && cfg.dependencies && pxt.Util.values(cfg.dependencies).some(function (v) { return v != '*'; })) {
                md += "\n## " + lf("Extensions") + "\n\n" + Object.keys(cfg.dependencies)
                    .filter(function (k) { return k != pxt.appTarget.corepkg; })
                    .map(function (k) { return "* " + k + ", " + cfg.dependencies[k]; })
                    .join('\n') + "\n\n```package\n" + Object.keys(cfg.dependencies).map(function (k) { return k + "=" + cfg.dependencies[k]; }).join('\n') + "\n```\n";
            }
            if (projectid) {
                var linkString = (pxt.appTarget.appTheme.shareUrl || "https://makecode.com/") + projectid;
                if (escapeLinks) {
                    // If printing the link will show up twice if it's an actual link
                    linkString = "`" + linkString + "`";
                }
                md += "\n" + linkString + "\n\n";
            }
            var options = {
                print: true
            };
            return renderMarkdownAsync(content, md, options);
        }
        runner.renderProjectFilesAsync = renderProjectFilesAsync;
        function renderDocAsync(content, docid) {
            docid = docid.replace(/^\//, "");
            return pxt.Cloud.markdownAsync(docid, runner.editorLocale, pxt.Util.localizeLive)
                .then(function (md) { return renderMarkdownAsync(content, md, { path: docid }); });
        }
        function renderBookAsync(content, summaryid) {
            summaryid = summaryid.replace(/^\//, "");
            pxt.tickEvent('book', { id: summaryid });
            pxt.log("rendering book from " + summaryid);
            // display loader
            var $loader = $("#loading").find(".loader");
            $loader.addClass("text").text(lf("Compiling your book (this may take a minute)"));
            // start the work
            var toc;
            return Promise.delay(100)
                .then(function () { return pxt.Cloud.markdownAsync(summaryid, runner.editorLocale, pxt.Util.localizeLive); })
                .then(function (summary) {
                toc = pxt.docs.buildTOC(summary);
                pxt.log("TOC: " + JSON.stringify(toc, null, 2));
                var tocsp = [];
                pxt.docs.visitTOC(toc, function (entry) {
                    if (!/^\//.test(entry.path) || /^\/pkg\//.test(entry.path))
                        return;
                    tocsp.push(pxt.Cloud.markdownAsync(entry.path, runner.editorLocale, pxt.Util.localizeLive)
                        .then(function (md) {
                        entry.markdown = md;
                    }, function (e) {
                        entry.markdown = "_" + entry.path + " failed to load._";
                    }));
                });
                return Promise.all(tocsp);
            })
                .then(function (pages) {
                var md = toc[0].name;
                pxt.docs.visitTOC(toc, function (entry) {
                    if (entry.markdown)
                        md += '\n\n' + entry.markdown;
                });
                return renderMarkdownAsync(content, md);
            });
        }
        var template = "\n<aside id=button class=box>\n   <a class=\"ui primary button\" href=\"@ARGS@\">@BODY@</a>\n</aside>\n\n<aside id=vimeo>\n<div class=\"ui two column stackable grid container\">\n<div class=\"column\">\n    <div class=\"ui embed mdvid\" data-source=\"vimeo\" data-id=\"@ARGS@\" data-placeholder=\"/thumbnail/1024/vimeo/@ARGS@\" data-icon=\"video play\">\n    </div>\n</div></div>\n</aside>\n\n<aside id=youtube>\n<div class=\"ui two column stackable grid container\">\n<div class=\"column\">\n    <div class=\"ui embed mdvid\" data-source=\"youtube\" data-id=\"@ARGS@\" data-placeholder=\"https://img.youtube.com/vi/@ARGS@/0.jpg\">\n    </div>\n</div></div>\n</aside>\n\n<aside id=section>\n    <!-- section @ARGS@ -->\n</aside>\n\n<aside id=hide class=box>\n    <div style='display:none'>\n        @BODY@\n    </div>\n</aside>\n\n<aside id=avatar class=box>\n    <div class='avatar @ARGS@'>\n        <div class='avatar-image'></div>\n        <div class='ui compact message'>\n            @BODY@\n        </div>\n    </div>\n</aside>\n\n<aside id=hint class=box>\n    <div class=\"ui icon green message\">\n        <div class=\"content\">\n            <div class=\"header\">Hint</div>\n            @BODY@\n        </div>\n    </div>\n</aside>\n\n<!-- wrapped around ordinary content -->\n<aside id=main-container class=box>\n    <div class=\"ui text\">\n        @BODY@\n    </div>\n</aside>\n\n<!-- used for 'column' box - they are collected and wrapped in 'column-container' -->\n<aside id=column class=aside>\n    <div class='column'>\n        @BODY@\n    </div>\n</aside>\n<aside id=column-container class=box>\n    <div class=\"ui three column stackable grid text\">\n        @BODY@\n    </div>\n</aside>\n@breadcrumb@\n@body@";
        function renderMarkdownAsync(content, md, options) {
            if (options === void 0) { options = {}; }
            var html = pxt.docs.renderMarkdown({
                template: template,
                markdown: md,
                theme: pxt.appTarget.appTheme
            });
            var blocksAspectRatio = options.blocksAspectRatio
                || window.innerHeight < window.innerWidth ? 1.62 : 1 / 1.62;
            $(content).html(html);
            $(content).find('a').attr('target', '_blank');
            var renderOptions = {
                blocksAspectRatio: blocksAspectRatio,
                snippetClass: 'lang-blocks',
                signatureClass: 'lang-sig',
                blocksClass: 'lang-block',
                blocksXmlClass: 'lang-blocksxml',
                simulatorClass: 'lang-sim',
                linksClass: 'lang-cards',
                namespacesClass: 'lang-namespaces',
                codeCardClass: 'lang-codecard',
                packageClass: 'lang-package',
                projectClass: 'lang-project',
                snippetReplaceParent: true,
                simulator: true,
                hex: true,
                tutorial: !!options.tutorial,
                showJavaScript: runner.editorLanguageMode == LanguageMode.TypeScript,
                hexName: pxt.appTarget.id
            };
            if (options.print) {
                renderOptions.showEdit = false;
                renderOptions.simulator = false;
            }
            return pxt.runner.renderAsync(renderOptions).then(function () {
                // patch a elements
                $(content).find('a[href^="/"]').removeAttr('target').each(function (i, a) {
                    $(a).attr('href', '#doc:' + $(a).attr('href').replace(/^\//, ''));
                });
                // enable embeds
                $(content).find('.ui.embed').embed();
            });
        }
        runner.renderMarkdownAsync = renderMarkdownAsync;
        function decompileToBlocksAsync(code, options) {
            // code may be undefined or empty!!!
            var packageid = options && options.packageId ? "pub:" + options.packageId :
                options && options.package ? "docs:" + options.package
                    : null;
            return loadPackageAsync(packageid, code)
                .then(function () { return getCompileOptionsAsync(pxt.appTarget.compile ? pxt.appTarget.compile.hasHex : false); })
                .then(function (opts) {
                // compile
                if (code)
                    opts.fileSystem["main.ts"] = code;
                opts.ast = true;
                var resp = pxtc.compile(opts);
                if (resp.diagnostics && resp.diagnostics.length > 0)
                    resp.diagnostics.forEach(function (diag) { return console.error(diag.messageText); });
                if (!resp.success)
                    return Promise.resolve({ package: runner.mainPkg, compileJS: resp });
                // decompile to blocks
                var apis = pxtc.getApiInfo(opts, resp.ast);
                return ts.pxtc.localizeApisAsync(apis, runner.mainPkg)
                    .then(function () {
                    var blocksInfo = pxtc.getBlocksInfo(apis);
                    pxt.blocks.initializeAndInject(blocksInfo);
                    var bresp = pxtc.decompiler.decompileToBlocks(blocksInfo, resp.ast.getSourceFile("main.ts"), { snippetMode: options && options.snippetMode });
                    if (bresp.diagnostics && bresp.diagnostics.length > 0)
                        bresp.diagnostics.forEach(function (diag) { return console.error(diag.messageText); });
                    if (!bresp.success)
                        return { package: runner.mainPkg, compileJS: resp, compileBlocks: bresp, apiInfo: apis };
                    pxt.debug(bresp.outfiles["main.blocks"]);
                    var blocksSvg = pxt.blocks.render(bresp.outfiles["main.blocks"], options);
                    return {
                        package: runner.mainPkg,
                        compileJS: resp,
                        compileBlocks: bresp,
                        apiInfo: apis,
                        blocksSvg: blocksSvg
                    };
                });
            });
        }
        runner.decompileToBlocksAsync = decompileToBlocksAsync;
        function compileBlocksAsync(code, options) {
            var packageid = options && options.packageId ? "pub:" + options.packageId :
                options && options.package ? "docs:" + options.package
                    : null;
            return loadPackageAsync(packageid, "")
                .then(function () { return getCompileOptionsAsync(pxt.appTarget.compile ? pxt.appTarget.compile.hasHex : false); })
                .then(function (opts) {
                opts.ast = true;
                var resp = pxtc.compile(opts);
                var apis = pxtc.getApiInfo(opts, resp.ast);
                return ts.pxtc.localizeApisAsync(apis, runner.mainPkg)
                    .then(function () {
                    var blocksInfo = pxtc.getBlocksInfo(apis);
                    pxt.blocks.initializeAndInject(blocksInfo);
                    return {
                        package: runner.mainPkg,
                        blocksSvg: pxt.blocks.render(code, options),
                        apiInfo: apis
                    };
                });
            });
        }
        runner.compileBlocksAsync = compileBlocksAsync;
        var pendingLocalToken = [];
        function waitForLocalTokenAsync() {
            if (pxt.Cloud.localToken) {
                return Promise.resolve();
            }
            return new Promise(function (resolve, reject) {
                pendingLocalToken.push(resolve);
            });
        }
        runner.initCallbacks = [];
        function init() {
            initInnerAsync()
                .done(function () {
                for (var i = 0; i < runner.initCallbacks.length; ++i) {
                    runner.initCallbacks[i]();
                }
            });
        }
        runner.init = init;
        function windowLoad() {
            var f = window.ksRunnerWhenLoaded;
            if (f)
                f();
        }
        windowLoad();
    })(runner = pxt.runner || (pxt.runner = {}));
})(pxt || (pxt = {}));
