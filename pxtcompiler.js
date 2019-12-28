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
var pxt;
(function (pxt) {
    var SimpleHost = /** @class */ (function () {
        function SimpleHost(packageFiles) {
            this.packageFiles = packageFiles;
        }
        SimpleHost.prototype.resolve = function (module, filename) {
            return "";
        };
        SimpleHost.prototype.readFile = function (module, filename) {
            if (module.id == "this") {
                return this.packageFiles[filename];
            }
            else if (pxt.appTarget.bundledpkgs[module.id]) {
                return pxt.appTarget.bundledpkgs[module.id][filename];
            }
            else {
                console.log("file missing: " + module.id + " / " + filename);
                return null;
            }
        };
        SimpleHost.prototype.writeFile = function (module, filename, contents) {
            if (module.id == "this" && filename == pxt.CONFIG_NAME)
                this.packageFiles[pxt.CONFIG_NAME] = contents;
            else
                console.log("write file? " + module.id + " / " + filename);
        };
        SimpleHost.prototype.getHexInfoAsync = function (extInfo) {
            //console.log(`getHexInfoAsync(${extInfo})`);
            return Promise.resolve({ hex: ["SKIP"] });
        };
        SimpleHost.prototype.cacheStoreAsync = function (id, val) {
            //console.log(`cacheStoreAsync(${id}, ${val})`)
            return Promise.resolve();
        };
        SimpleHost.prototype.cacheGetAsync = function (id) {
            //console.log(`cacheGetAsync(${id})`)
            return Promise.resolve("");
        };
        SimpleHost.prototype.downloadPackageAsync = function (pkg) {
            //console.log(`downloadPackageAsync(${pkg.id})`)
            return Promise.resolve();
        };
        SimpleHost.prototype.resolveVersionAsync = function (pkg) {
            //console.log(`resolveVersionAsync(${pkg.id})`)
            return Promise.resolve("*");
        };
        return SimpleHost;
    }());
    pxt.SimpleHost = SimpleHost;
    function prepPythonOptions(opts) {
        // this is suboptimal, but we need apisInfo for the python converter
        if (opts.target.preferredEditor == pxt.PYTHON_PROJECT_NAME) {
            var opts2 = pxt.U.clone(opts);
            opts2.ast = true;
            opts2.target.preferredEditor = pxt.JAVASCRIPT_PROJECT_NAME;
            //opts2.noEmit = true
            // remove previously converted .ts files, so they don't end up in apisinfo
            for (var _i = 0, _a = opts2.sourceFiles; _i < _a.length; _i++) {
                var f = _a[_i];
                if (pxt.U.endsWith(f, ".py"))
                    opts2.fileSystem[f.slice(0, -3) + ".ts"] = " ";
            }
            var res = pxtc.compile(opts2);
            opts.apisInfo = pxtc.getApiInfo(res.ast, opts2.jres);
        }
    }
    pxt.prepPythonOptions = prepPythonOptions;
    function simpleCompileAsync(files, optionsOrNative) {
        var options = typeof optionsOrNative == "boolean" ? { native: optionsOrNative }
            : optionsOrNative || {};
        var host = new SimpleHost(files);
        var mainPkg = new pxt.MainPackage(host);
        return mainPkg.loadAsync()
            .then(function () {
            var target = mainPkg.getTargetOptions();
            if (target.hasHex)
                target.isNative = options.native;
            return mainPkg.getCompileOptionsAsync(target);
        })
            .then(function (opts) {
            patchTS(mainPkg.targetVersion(), opts);
            prepPythonOptions(opts);
            return pxtc.compile(opts);
        })
            .then(function (r) {
            if (!r.success)
                r.errors = r.diagnostics.map(ts.pxtc.getDiagnosticString).join("") || "Unknown error.";
            return r;
        });
    }
    pxt.simpleCompileAsync = simpleCompileAsync;
    function patchTS(version, opts) {
        if (!version)
            return;
        pxt.debug("applying TS patches relative to " + version);
        for (var _i = 0, _a = Object.keys(opts.fileSystem); _i < _a.length; _i++) {
            var fn = _a[_i];
            if (fn.indexOf("/") == -1 && pxt.U.endsWith(fn, ".ts")) {
                var ts_1 = opts.fileSystem[fn];
                var ts2 = pxt.patching.patchJavaScript(version, ts_1);
                if (ts_1 != ts2) {
                    pxt.debug("applying TS patch to " + fn);
                    opts.fileSystem[fn] = ts2;
                }
            }
        }
    }
    pxt.patchTS = patchTS;
    function setupSimpleCompile() {
        if (typeof global != "undefined" && !global.btoa) {
            global.btoa = function (str) { return Buffer.from(str, "binary").toString("base64"); };
            global.atob = function (str) { return Buffer.from(str, "base64").toString("binary"); };
        }
        if (typeof pxtTargetBundle != "undefined") {
            pxt.debug("setup app bundle");
            pxt.setAppTarget(pxtTargetBundle);
        }
        pxt.debug("simple setup done");
    }
    pxt.setupSimpleCompile = setupSimpleCompile;
})(pxt || (pxt = {}));
/// <reference path='../built/pxtlib.d.ts' />
var pxt;
(function (pxt) {
    function simshim(prog, pathParse) {
        var SK = ts.SyntaxKind;
        var checker = prog.getTypeChecker();
        var mainWr = pxt.cpp.nsWriter("declare namespace");
        var currNs = "";
        var currMod;
        for (var _i = 0, _a = prog.getSourceFiles(); _i < _a.length; _i++) {
            var src = _a[_i];
            if (pathParse) {
                var pp = pathParse(src.fileName);
                pxt.debug("SimShim[1]: " + pp.dir);
                if (!pxt.U.endsWith(pp.dir, "/sim") && !pxt.U.startsWith(src.fileName, "sim/"))
                    continue;
            }
            else if (!pxt.U.startsWith(src.fileName, "sim/"))
                continue;
            pxt.debug("SimShim[2]: " + src.fileName);
            for (var _b = 0, _c = src.statements; _b < _c.length; _b++) {
                var stmt = _c[_b];
                var mod = stmt;
                if (stmt.kind == SK.ModuleDeclaration && mod.name.text == "pxsim") {
                    currMod = mod;
                    doStmt(mod.body);
                }
            }
        }
        var res = {};
        res[pxt.appTarget.corepkg] = mainWr.finish();
        return res;
        function typeOf(node) {
            var r;
            if (ts.isExpression(node))
                r = checker.getContextualType(node);
            if (!r)
                r = checker.getTypeAtLocation(node);
            return r;
        }
        /*
        let doSymbol = (sym: ts.Symbol) => {
            if (sym.getFlags() & ts.SymbolFlags.HasExports) {
                typechecker.getExportsOfModule(sym).forEach(doSymbol)
            }
            decls[pxtc.getFullName(typechecker, sym)] = sym
        }
        */
        function emitModuleDeclaration(mod) {
            var prevNs = currNs;
            if (currNs)
                currNs += ".";
            currNs += mod.name.text;
            doStmt(mod.body);
            currNs = prevNs;
        }
        function mapType(tp) {
            var fn = checker.typeToString(tp, currMod, ts.TypeFormatFlags.UseFullyQualifiedType);
            fn = fn.replace(/^pxsim\./, "");
            switch (fn) {
                case "RefAction": return "() => void";
                case "RefBuffer": return "Buffer";
                default:
                    return fn;
            }
        }
        function promiseElementType(tp) {
            if (pxtc.isObjectType(tp) && (tp.objectFlags & ts.ObjectFlags.Reference) && tp.symbol.name == "Promise") {
                return tp.typeArguments[0];
            }
            return null;
        }
        function emitClassDeclaration(cl) {
            var cmts = getExportComments(cl);
            if (!cmts)
                return;
            mainWr.setNs(currNs);
            mainWr.write(cmts);
            var prevNs = currNs;
            if (currNs)
                currNs += ".";
            currNs += cl.name.text;
            var decl = prevNs ? "" : "declare";
            var ext = "";
            if (cl.heritageClauses)
                for (var _i = 0, _a = cl.heritageClauses; _i < _a.length; _i++) {
                    var h = _a[_i];
                    if (h.token == SK.ExtendsKeyword) {
                        ext = " extends " + mapType(typeOf(h.types[0]));
                    }
                }
            mainWr.write(decl + " class " + cl.name.text + ext + " {");
            mainWr.incrIndent();
            var _loop_1 = function (mem) {
                switch (mem.kind) {
                    case SK.MethodDeclaration:
                        emitFunctionDeclaration(mem);
                        break;
                    case SK.PropertyDeclaration:
                        emitPropertyDeclaration(mem);
                        break;
                    case SK.Constructor:
                        emitConstructorDeclaration(mem);
                        break;
                    case SK.GetAccessor:
                        var hasSetter = cl.members.some(function (m) { return m.kind == SK.SetAccessor && m.name.getText() == mem.name.getText(); });
                        emitFunctionDeclaration(mem, hasSetter);
                        break;
                    default:
                        break;
                }
            };
            for (var _b = 0, _c = cl.members; _b < _c.length; _b++) {
                var mem = _c[_b];
                _loop_1(mem);
            }
            currNs = prevNs;
            mainWr.decrIndent();
            mainWr.write("}");
        }
        function getExportComments(n) {
            var cmts = pxtc.getComments(n);
            if (!/^\s*\/\/%/m.test(cmts))
                return null;
            return cmts;
        }
        function emitPropertyDeclaration(fn) {
            var cmts = getExportComments(fn);
            if (!cmts)
                return;
            var nm = fn.name.getText();
            var attrs = "//% shim=." + nm;
            var tp = checker.getTypeAtLocation(fn);
            mainWr.write(cmts);
            mainWr.write(attrs);
            mainWr.write("public " + nm + ": " + mapType(tp) + ";");
            mainWr.write("");
        }
        function emitConstructorDeclaration(fn) {
            var cmts = getExportComments(fn);
            if (!cmts)
                return;
            var tp = checker.getTypeAtLocation(fn);
            var args = fn.parameters.map(function (p) { return p.name.getText() + ": " + mapType(typeOf(p)); });
            mainWr.write(cmts);
            mainWr.write("//% shim=\"new " + currNs + "\"");
            mainWr.write("constructor(" + args.join(", ") + ");");
            mainWr.write("");
        }
        function emitFunctionDeclaration(fn, hasSetter) {
            if (hasSetter === void 0) { hasSetter = false; }
            var cmts = getExportComments(fn);
            if (!cmts)
                return;
            var fnname = fn.name.getText();
            var isMethod = fn.kind == SK.MethodDeclaration || fn.kind == SK.GetAccessor || fn.kind == SK.SetAccessor;
            var attrs = "//% shim=" + (isMethod ? "." + fnname : currNs + "::" + fnname);
            var sig = checker.getSignatureFromDeclaration(fn);
            var rettp = checker.getReturnTypeOfSignature(sig);
            var asyncName = /Async$/.test(fnname);
            var prom = promiseElementType(rettp);
            if (prom) {
                attrs += " promise";
                rettp = prom;
                if (!asyncName)
                    pxt.U.userError(currNs + "::" + fnname + " should be called " + fnname + "Async");
            }
            else if (asyncName) {
                pxt.U.userError(currNs + "::" + fnname + " doesn't return a promise");
            }
            pxt.debug("emitFun: " + fnname);
            var args = fn.parameters.map(function (p) {
                return "" + p.name.getText() + (p.questionToken ? "?" : "") + ": " + mapType(typeOf(p));
            });
            var localname = fnname.replace(/Async$/, "");
            var defkw = isMethod ? "public" : "function";
            var allArgs = "(" + args.join(", ") + ")";
            if (fn.kind == SK.GetAccessor) {
                defkw = hasSetter ? "public" : "readonly";
                allArgs = "";
                attrs += " property";
            }
            if (!isMethod)
                mainWr.setNs(currNs);
            mainWr.write(cmts);
            mainWr.write(attrs);
            mainWr.write(defkw + " " + localname + allArgs + ": " + mapType(rettp) + ";");
            mainWr.write("");
        }
        function doStmt(stmt) {
            switch (stmt.kind) {
                case SK.ModuleDeclaration:
                    return emitModuleDeclaration(stmt);
                case SK.ModuleBlock:
                    return stmt.statements.forEach(doStmt);
                case SK.FunctionDeclaration:
                    return emitFunctionDeclaration(stmt);
                case SK.ClassDeclaration:
                    return emitClassDeclaration(stmt);
            }
            //console.log("SKIP", pxtc.stringKind(stmt))
            //let mod = stmt as ts.ModuleDeclaration
            //if (mod.name) console.log(mod.name.text)
            /*
            if (mod.name) {
                let sym = typechecker.getSymbolAtLocation(mod.name)
                if (sym) doSymbol(sym)
            }
            */
        }
    }
    pxt.simshim = simshim;
})(pxt || (pxt = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        /**
         * Traverses the AST and injects information about function calls into the expression
         * nodes. The decompiler consumes this information later
         *
         * @param program The TypeScript Program representing the code to compile
         * @param entryPoint The name of the source file to annotate the AST of
         * @param compileTarget The compilation of the target
         */
        function annotate(program, entryPoint, compileTarget) {
            var oldTarget = pxtc.target;
            pxtc.target = compileTarget;
            var src = program.getSourceFiles().filter(function (f) { return f.fileName === entryPoint; })[0];
            var checker = program.getTypeChecker();
            recurse(src);
            pxtc.target = oldTarget;
            function recurse(parent) {
                ts.forEachChild(parent, function (child) {
                    switch (child.kind) {
                        case ts.SyntaxKind.CallExpression:
                            mkCallInfo(child, child.arguments.slice(0), null, getDecl(child.expression));
                            break;
                        case ts.SyntaxKind.PropertyAccessExpression:
                            mkCallInfo(child, []);
                            break;
                        case ts.SyntaxKind.TaggedTemplateExpression:
                            mkCallInfo(child, [child.template], true, getDecl(child.tag));
                            break;
                        case ts.SyntaxKind.BinaryExpression:
                            annotateBinaryExpression(child);
                            break;
                        case ts.SyntaxKind.Identifier:
                            var decl = getDecl(child);
                            if (decl && decl.getSourceFile().fileName !== "main.ts" && decl.kind == ts.SyntaxKind.VariableDeclaration) {
                                pxtc.pxtInfo(child).flags |= 4 /* IsGlobalIdentifier */;
                            }
                            break;
                    }
                    recurse(child);
                });
            }
            function annotateBinaryExpression(node) {
                var trg = node.left;
                var expr = node.right;
                var lt = typeOf(node.left);
                var rt = typeOf(node.right);
                if (node.operatorToken.kind == pxtc.SK.PlusToken || node.operatorToken.kind == pxtc.SK.PlusEqualsToken) {
                    if (pxtc.isStringType(lt) || (pxtc.isStringType(rt) && node.operatorToken.kind == pxtc.SK.PlusToken)) {
                        pxtc.pxtInfo(node).exprInfo = {
                            leftType: checker.typeToString(lt),
                            rightType: checker.typeToString(rt)
                        };
                    }
                }
                switch (node.operatorToken.kind) {
                    case ts.SyntaxKind.EqualsToken:
                    case ts.SyntaxKind.PlusEqualsToken:
                    case ts.SyntaxKind.MinusEqualsToken:
                        if (trg.kind == pxtc.SK.PropertyAccessExpression) {
                            // Getter/Setter
                            var decl = getDecl(trg);
                            if (decl && decl.kind == pxtc.SK.GetAccessor) {
                                decl = ts.getDeclarationOfKind(decl.symbol, pxtc.SK.SetAccessor);
                                mkCallInfo(trg, [expr], false, decl);
                            }
                            else if (decl && (decl.kind == pxtc.SK.PropertySignature || decl.kind == pxtc.SK.PropertyAssignment || (pxtc.target && pxtc.target.switches.slowFields))) {
                                mkCallInfo(trg, [expr]);
                            }
                        }
                        break;
                }
            }
            function mkCallInfo(node, args, isExpression, d) {
                if (isExpression === void 0) { isExpression = false; }
                if (d === void 0) { d = null; }
                var hasRet = isExpression || !(typeOf(node).flags & ts.TypeFlags.Void);
                var decl = d || getDecl(node);
                if (node.expression && decl) {
                    var isMethod = false;
                    switch (decl.kind) {
                        // we treat properties via calls
                        // so we say they are "methods"
                        case pxtc.SK.PropertySignature:
                        case pxtc.SK.PropertyAssignment:
                        case pxtc.SK.PropertyDeclaration:
                            if (!pxtc.isStatic(decl)) {
                                isMethod = true;
                            }
                            break;
                        case pxtc.SK.Parameter:
                            if (pxtc.isCtorField(decl)) {
                                isMethod = true;
                            }
                            break;
                        // TOTO case: case SK.ShorthandPropertyAssignment
                        // these are the real methods
                        case pxtc.SK.GetAccessor:
                        case pxtc.SK.SetAccessor:
                        case pxtc.SK.MethodDeclaration:
                        case pxtc.SK.MethodSignature:
                            isMethod = true;
                            break;
                        default:
                            break;
                    }
                    if (isMethod) {
                        var expr = node.expression;
                        // Add the "this" parameter to the call info
                        if (expr.kind === pxtc.SK.PropertyAccessExpression) {
                            // If the node is a property access, the right hand side is just
                            // the function name so grab the left instead
                            args.unshift(expr.expression);
                        }
                        else {
                            args.unshift(node.expression);
                        }
                    }
                }
                var callInfo = {
                    decl: decl,
                    qName: decl ? pxtc.getNodeFullName(checker, decl) : "?",
                    args: args,
                    isExpression: hasRet
                };
                pxtc.pxtInfo(node).callInfo = callInfo;
            }
            function getDecl(node) {
                if (!node)
                    return null;
                var sym = checker.getSymbolAtLocation(node);
                var decl;
                if (sym) {
                    decl = sym.valueDeclaration;
                    if (!decl && sym.declarations) {
                        var decl0 = sym.declarations[0];
                        if (decl0 && decl0.kind == ts.SyntaxKind.ImportEqualsDeclaration) {
                            sym = checker.getSymbolAtLocation(decl0.moduleReference);
                            if (sym)
                                decl = sym.valueDeclaration;
                        }
                    }
                }
                if (!decl && node.kind == pxtc.SK.PropertyAccessExpression) {
                    var namedNode = node;
                    decl = {
                        kind: pxtc.SK.PropertySignature,
                        symbol: { isBogusSymbol: true, name: namedNode.name.getText() },
                        name: namedNode.name,
                    };
                    pxtc.pxtInfo(decl).flags |= 2 /* IsBogusFunction */;
                }
                return decl;
            }
            function typeOf(node) {
                var r;
                var info = pxtc.pxtInfo(node);
                if (info.typeCache)
                    return info.typeCache;
                if (ts.isExpression(node))
                    r = checker.getContextualType(node);
                if (!r) {
                    r = checker.getTypeAtLocation(node);
                }
                if (!r)
                    return r;
                if (ts.isStringLiteral(node))
                    return r; // skip checkType() - type is any for literal fragments
                return pxtc.checkType(r);
            }
        }
        pxtc.annotate = annotate;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        function asmStringLiteral(s) {
            var r = "\"";
            for (var i = 0; i < s.length; ++i) {
                // TODO generate warning when seeing high character ?
                var c = s.charCodeAt(i) & 0xff;
                var cc = String.fromCharCode(c);
                if (cc == "\\" || cc == "\"")
                    r += "\\" + cc;
                else if (cc == "\n")
                    r += "\\n";
                else if (c <= 0xf)
                    r += "\\x0" + c.toString(16);
                else if (c < 32 || c > 127)
                    r += "\\x" + c.toString(16);
                else
                    r += cc;
            }
            return r + "\"";
        }
        pxtc.asmStringLiteral = asmStringLiteral;
        // this class defines the interface between the IR
        // and a particular assembler (Thumb, AVR). Thus,
        // the registers mentioned below are VIRTUAL registers
        // required by the IR-machine, rather than PHYSICAL registers
        // at the assembly level.
        // that said, the assumptions below about registers are based on
        // ARM, so a mapping will be needed for other processors
        // Assumptions:
        // - registers can hold a pointer (data or code)
        // - special registers include: sp
        // - fixed registers are r0, r1, r2, r3, r5, r6 
        //   - r0 is the current value (from expression evaluation)
        //   - registers for runtime calls (r0, r1,r2,r3)
        //   - r5 is for captured locals in lambda
        //   - r6 for global{}
        //   - r4 and r7 are used as temporary
        //   - C code assumes the following are calee saved: r4-r7, r8-r11
        //   - r12 is intra-procedure scratch and can be treated like r0-r3
        //   - r13 is sp, r14 is lr, r15 is pc
        // - for calls to user functions, all arguments passed on stack
        var AssemblerSnippets = /** @class */ (function () {
            function AssemblerSnippets() {
            }
            AssemblerSnippets.prototype.nop = function () { return "TBD(nop)"; };
            AssemblerSnippets.prototype.reg_gets_imm = function (reg, imm) { return "TBD(reg_gets_imm)"; };
            // Registers are stored on the stack in numerical order 
            AssemblerSnippets.prototype.proc_setup = function (numlocals, main) { return "TBD(proc_setup)"; };
            AssemblerSnippets.prototype.push_fixed = function (reg) { return "TBD(push_fixed)"; };
            AssemblerSnippets.prototype.push_local = function (reg) { return "TBD(push_local)"; };
            AssemblerSnippets.prototype.push_locals = function (n) { return "TBD(push_locals)"; };
            AssemblerSnippets.prototype.pop_fixed = function (reg) { return "TBD(pop_fixed)"; };
            AssemblerSnippets.prototype.pop_locals = function (n) { return "TBD(pop_locals)"; };
            AssemblerSnippets.prototype.proc_return = function () { return "TBD(proc_return)"; };
            AssemblerSnippets.prototype.debugger_stmt = function (lbl) { return ""; };
            AssemblerSnippets.prototype.debugger_bkpt = function (lbl) { return ""; };
            AssemblerSnippets.prototype.debugger_proc = function (lbl) { return ""; };
            AssemblerSnippets.prototype.unconditional_branch = function (lbl) { return "TBD(unconditional_branch)"; };
            AssemblerSnippets.prototype.beq = function (lbl) { return "TBD(beq)"; };
            AssemblerSnippets.prototype.bne = function (lbl) { return "TBD(bne)"; };
            AssemblerSnippets.prototype.cmp = function (reg1, reg) { return "TBD(cmp)"; };
            AssemblerSnippets.prototype.cmp_zero = function (reg1) { return "TBD(cmp_zero)"; };
            AssemblerSnippets.prototype.arithmetic = function () { return ""; };
            // load_reg_src_off is load/store indirect
            // word? - does offset represent an index that must be multiplied by word size?
            // inf?  - control over size of referenced data
            // str?  - true=Store/false=Load
            // src - can range over
            AssemblerSnippets.prototype.load_reg_src_off = function (reg, src, off, word, store, inf) {
                return "TBD(load_reg_src_off)";
            };
            AssemblerSnippets.prototype.rt_call = function (name, r0, r1) { return "TBD(rt_call)"; };
            AssemblerSnippets.prototype.call_lbl = function (lbl, saveStack) { return "TBD(call_lbl)"; };
            AssemblerSnippets.prototype.call_reg = function (reg) { return "TBD(call_reg)"; };
            AssemblerSnippets.prototype.vcall = function (mapMethod, isSet, vtableShift) {
                return "TBD(vcall)";
            };
            AssemblerSnippets.prototype.prologue_vtable = function (arg_index, vtableShift) {
                return "TBD(prologue_vtable";
            };
            AssemblerSnippets.prototype.helper_prologue = function () { return "TBD(lambda_prologue)"; };
            AssemblerSnippets.prototype.helper_epilogue = function () { return "TBD(lambda_epilogue)"; };
            AssemblerSnippets.prototype.pop_clean = function (pops) { return "TBD"; };
            AssemblerSnippets.prototype.load_ptr_full = function (lbl, reg) { return "TBD(load_ptr_full)"; };
            AssemblerSnippets.prototype.emit_int = function (v, reg) { return "TBD(emit_int)"; };
            AssemblerSnippets.prototype.obj_header = function (vt) {
                return ".word " + vt;
            };
            AssemblerSnippets.prototype.string_literal = function (lbl, strLit) {
                var SKIP_INCR = 16;
                var vt = "pxt::string_inline_ascii_vt";
                var utfLit = pxtc.target.utf8 ? pxtc.U.toUTF8(strLit, true) : strLit;
                if (utfLit !== strLit) {
                    if (strLit.length > SKIP_INCR) {
                        vt = "pxt::string_skiplist16_vt";
                        var skipList = [];
                        var off = 0;
                        for (var i = 0; i + SKIP_INCR <= strLit.length; i += SKIP_INCR) {
                            off += pxtc.U.toUTF8(strLit.slice(i, i + SKIP_INCR), true).length;
                            skipList.push(off);
                        }
                        return "\n.balign 4\n" + lbl + ": " + this.obj_header(vt) + "\n        .short " + utfLit.length + ", " + strLit.length + "\n        .word " + lbl + "data\n" + lbl + "data:\n        .short " + skipList.map(function (s) { return s.toString(); }).join(", ") + "\n        .string " + asmStringLiteral(utfLit) + "\n";
                    }
                    else {
                        vt = "pxt::string_inline_utf8_vt";
                    }
                }
                return "\n.balign 4\n" + lbl + ": " + this.obj_header(vt) + "\n        .short " + utfLit.length + "\n        .string " + asmStringLiteral(utfLit) + "\n";
            };
            AssemblerSnippets.prototype.hex_literal = function (lbl, data) {
                return "\n.balign 4\n" + lbl + ": " + this.obj_header("pxt::buffer_vt") + "\n" + hexLiteralAsm(data) + "\n";
            };
            AssemblerSnippets.prototype.method_call = function (procid, topExpr) {
                return "";
            };
            return AssemblerSnippets;
        }());
        pxtc.AssemblerSnippets = AssemblerSnippets;
        function hexLiteralAsm(data, suff) {
            if (suff === void 0) { suff = ""; }
            return "\n                .word " + (data.length >> 1) + suff + "\n                .hex " + data + (data.length % 4 == 0 ? "" : "00") + "\n        ";
        }
        pxtc.hexLiteralAsm = hexLiteralAsm;
        // helper for emit_int
        function numBytes(n) {
            var v = 0;
            for (var q = n; q > 0; q >>>= 8) {
                v++;
            }
            return v || 1;
        }
        pxtc.numBytes = numBytes;
        var ProctoAssembler = /** @class */ (function () {
            function ProctoAssembler(t, bin, proc) {
                var _this = this;
                this.resText = "";
                this.exprStack = [];
                this.calls = [];
                this.proc = null;
                this.baseStackSize = 0; // real stack size is this + exprStack.length
                this.labelledHelpers = {};
                this.write = function (s) { _this.resText += pxtc.asmline(s); };
                this.t = t; // TODO in future, figure out if we follow the "Snippets" architecture
                this.bin = bin;
                this.proc = proc;
                if (this.proc)
                    this.work();
            }
            ProctoAssembler.prototype.emitHelpers = function () {
                this.emitLambdaTrampoline();
                this.emitArrayMethods();
                this.emitFieldMethods();
            };
            ProctoAssembler.prototype.redirectOutput = function (f) {
                var prevWrite = this.write;
                var res = "";
                this.write = function (s) { return res += pxtc.asmline(s); };
                try {
                    f();
                }
                finally {
                    this.write = prevWrite;
                }
                return res;
            };
            ProctoAssembler.prototype.stackSize = function () {
                return this.baseStackSize + this.exprStack.length;
            };
            ProctoAssembler.prototype.stackAlignmentNeeded = function (offset) {
                if (offset === void 0) { offset = 0; }
                if (!pxtc.target.stackAlign)
                    return 0;
                var npush = pxtc.target.stackAlign - ((this.stackSize() + offset) & (pxtc.target.stackAlign - 1));
                if (npush == pxtc.target.stackAlign)
                    return 0;
                else
                    return npush;
            };
            ProctoAssembler.prototype.getAssembly = function () {
                return this.resText;
            };
            ProctoAssembler.prototype.work = function () {
                var _this = this;
                this.write("\n;\n; Function " + this.proc.getFullName() + "\n;\n");
                this.emitLambdaWrapper(this.proc.isRoot);
                var baseLabel = this.proc.label();
                var bkptLabel = baseLabel + "_bkpt";
                var locLabel = baseLabel + "_locals";
                var endLabel = baseLabel + "_end";
                this.write(".section code");
                this.write(baseLabel + ":");
                if (this.proc.classInfo && this.proc.info.thisParameter
                    && !pxtc.target.switches.skipClassCheck
                    && !pxtc.target.switches.noThisCheckOpt) {
                    this.write("mov r7, lr");
                    this.write("ldr r0, [sp, #0]");
                    this.emitInstanceOf(this.proc.classInfo, "validate");
                    this.write("mov lr, r7");
                }
                this.write("\n" + baseLabel + "_nochk:\n    @stackmark func\n    @stackmark args\n");
                // create a new function for later use by hex file generation
                this.proc.fillDebugInfo = function (th) {
                    var labels = th.getLabels();
                    _this.proc.debugInfo = {
                        locals: (_this.proc.seqNo == 1 ? _this.bin.globals : _this.proc.locals).map(function (l) { return l.getDebugInfo(); }),
                        args: _this.proc.args.map(function (l) { return l.getDebugInfo(); }),
                        name: _this.proc.getName(),
                        codeStartLoc: pxtc.U.lookup(labels, locLabel),
                        codeEndLoc: pxtc.U.lookup(labels, endLabel),
                        bkptLoc: pxtc.U.lookup(labels, bkptLabel),
                        localsMark: pxtc.U.lookup(th.stackAtLabel, locLabel),
                        idx: _this.proc.seqNo,
                        calls: _this.calls
                    };
                    for (var _i = 0, _a = _this.calls; _i < _a.length; _i++) {
                        var ci = _a[_i];
                        ci.addr = pxtc.U.lookup(labels, ci.callLabel);
                        ci.stack = pxtc.U.lookup(th.stackAtLabel, ci.callLabel);
                        ci.callLabel = undefined; // don't waste space
                    }
                    for (var i = 0; i < _this.proc.body.length; ++i) {
                        var bi = _this.proc.body[i].breakpointInfo;
                        if (bi) {
                            var off = pxtc.U.lookup(th.stackAtLabel, "__brkp_" + bi.id);
                            if (off !== _this.proc.debugInfo.localsMark) {
                                console.log(bi);
                                console.log(th.stackAtLabel);
                                pxtc.U.oops("offset doesn't match: " + off + " != " + _this.proc.debugInfo.localsMark);
                            }
                        }
                    }
                };
                if (this.bin.options.breakpoints) {
                    this.write(this.t.debugger_proc(bkptLabel));
                }
                this.baseStackSize = 1; // push {lr}
                var numlocals = this.proc.locals.length;
                this.write("push {lr}");
                this.write(".locals:\n");
                if (this.proc.perfCounterNo) {
                    this.write(this.t.emit_int(this.proc.perfCounterNo, "r0"));
                    this.write("bl pxt::startPerfCounter");
                }
                this.write(this.t.proc_setup(numlocals));
                this.baseStackSize += numlocals;
                this.write("@stackmark locals");
                this.write(locLabel + ":");
                for (var i = 0; i < this.proc.body.length; ++i) {
                    var s = this.proc.body[i];
                    // console.log("STMT", s.toString())
                    switch (s.stmtKind) {
                        case pxtc.ir.SK.Expr:
                            this.emitExpr(s.expr);
                            break;
                        case pxtc.ir.SK.StackEmpty:
                            if (this.exprStack.length > 0) {
                                for (var _i = 0, _a = this.proc.body.slice(i - 4, i + 1); _i < _a.length; _i++) {
                                    var stmt = _a[_i];
                                    console.log("PREVSTMT " + stmt.toString().trim());
                                }
                                for (var _b = 0, _c = this.exprStack; _b < _c.length; _b++) {
                                    var e = _c[_b];
                                    console.log("EXPRSTACK " + e.currUses + "/" + e.totalUses + " E: " + e.toString());
                                }
                                pxtc.oops("stack should be empty");
                            }
                            this.write("@stackempty locals");
                            break;
                        case pxtc.ir.SK.Jmp:
                            this.emitJmp(s);
                            break;
                        case pxtc.ir.SK.Label:
                            this.write(s.lblName + ":");
                            this.validateJmpStack(s);
                            break;
                        case pxtc.ir.SK.Breakpoint:
                            if (this.bin.options.breakpoints) {
                                var lbl = "__brkp_" + s.breakpointInfo.id;
                                if (s.breakpointInfo.isDebuggerStmt) {
                                    this.write(this.t.debugger_stmt(lbl));
                                }
                                else {
                                    this.write(this.t.debugger_bkpt(lbl));
                                }
                            }
                            break;
                        default: pxtc.oops();
                    }
                }
                pxtc.assert(0 <= numlocals && numlocals < 127);
                if (numlocals > 0)
                    this.write(this.t.pop_locals(numlocals));
                if (this.proc.perfCounterNo) {
                    this.write("mov r4, r0");
                    this.write(this.t.emit_int(this.proc.perfCounterNo, "r0"));
                    this.write("bl pxt::stopPerfCounter");
                    this.write("mov r0, r4");
                }
                this.write(endLabel + ":");
                this.write(this.t.proc_return());
                this.write("@stackempty func");
                this.write("@stackempty args");
                this.write("; endfun");
            };
            ProctoAssembler.prototype.mkLbl = function (root) {
                var l = root + this.bin.lblNo++;
                if (l[0] != "_")
                    l = "." + l;
                return l;
            };
            ProctoAssembler.prototype.dumpStack = function () {
                var r = "[";
                for (var _i = 0, _a = this.exprStack; _i < _a.length; _i++) {
                    var s = _a[_i];
                    r += s.sharingInfo() + ": " + s.toString() + "; ";
                }
                r += "]";
                return r;
            };
            ProctoAssembler.prototype.terminate = function (expr) {
                pxtc.assert(expr.exprKind == pxtc.ir.EK.SharedRef);
                var arg = expr.args[0];
                // console.log("TERM", arg.sharingInfo(), arg.toString(), this.dumpStack())
                pxtc.U.assert(arg.currUses != arg.totalUses);
                // we should have the terminated expression on top
                pxtc.U.assert(this.exprStack[0] === arg, "term at top");
                // we pretend it's popped and simulate what clearStack would do
                var numEntries = 1;
                while (numEntries < this.exprStack.length) {
                    var ee = this.exprStack[numEntries];
                    if (ee.currUses != ee.totalUses)
                        break;
                    numEntries++;
                }
                // in this branch we just remove all that stuff off the stack
                this.write("@dummystack " + numEntries);
                this.write(this.t.pop_locals(numEntries));
                return numEntries;
            };
            ProctoAssembler.prototype.validateJmpStack = function (lbl, off) {
                if (off === void 0) { off = 0; }
                // console.log("Validate:", off, lbl.lblName, this.dumpStack())
                var currSize = this.exprStack.length - off;
                if (lbl.lblStackSize == null) {
                    lbl.lblStackSize = currSize;
                }
                else {
                    if (lbl.lblStackSize != currSize) {
                        console.log(lbl.lblStackSize, currSize);
                        console.log(this.dumpStack());
                        pxtc.U.oops("stack misaligned at: " + lbl.lblName);
                    }
                }
            };
            ProctoAssembler.prototype.emitJmp = function (jmp) {
                var termOff = 0;
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        this.emitExpr(jmp.expr);
                    if (jmp.terminateExpr)
                        termOff = this.terminate(jmp.terminateExpr);
                    this.write(this.t.unconditional_branch(jmp.lblName) + " ; with expression");
                }
                else {
                    var lbl = this.mkLbl("jmpz");
                    this.emitExpr(jmp.expr);
                    // TODO: remove ARM-specific code
                    if (jmp.expr.exprKind == pxtc.ir.EK.RuntimeCall &&
                        (jmp.expr.data === "thumb::subs" || pxtc.U.startsWith(jmp.expr.data, "_cmp_"))) {
                        // no cmp required
                    }
                    else {
                        this.write(this.t.cmp_zero("r0"));
                    }
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        this.write(this.t.beq(lbl)); // this is to *skip* the following 'b' instruction; beq itself has a very short range
                    }
                    else {
                        // IfZero
                        this.write(this.t.bne(lbl));
                    }
                    if (jmp.terminateExpr)
                        termOff = this.terminate(jmp.terminateExpr);
                    this.write(this.t.unconditional_branch(jmp.lblName));
                    this.write(lbl + ":");
                }
                this.validateJmpStack(jmp.lbl, termOff);
            };
            ProctoAssembler.prototype.clearStack = function (fast) {
                if (fast === void 0) { fast = false; }
                var numEntries = 0;
                while (this.exprStack.length > 0 && this.exprStack[0].currUses == this.exprStack[0].totalUses) {
                    numEntries++;
                    this.exprStack.shift();
                }
                if (numEntries)
                    this.write(this.t.pop_locals(numEntries));
                if (!fast) {
                    var toClear = this.exprStack.filter(function (e) { return e.currUses == e.totalUses && e.irCurrUses != -1; });
                    if (toClear.length > 0) {
                        this.write(this.t.reg_gets_imm("r1", 0));
                        for (var _i = 0, toClear_1 = toClear; _i < toClear_1.length; _i++) {
                            var a = toClear_1[_i];
                            a.irCurrUses = -1;
                            this.write(this.loadFromExprStack("r1", a, 0, true));
                        }
                    }
                }
            };
            ProctoAssembler.prototype.emitExprInto = function (e, reg) {
                switch (e.exprKind) {
                    case pxtc.ir.EK.NumberLiteral:
                        if (typeof e.data == "number")
                            this.write(this.t.emit_int(e.data, reg));
                        else
                            pxtc.oops();
                        break;
                    case pxtc.ir.EK.PointerLiteral:
                        this.write(this.t.load_ptr_full(e.data, reg));
                        break;
                    case pxtc.ir.EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx = this.exprStack.indexOf(arg);
                        pxtc.U.assert(idx >= 0);
                        if (idx == 0 && arg.totalUses == arg.currUses) {
                            this.write(this.t.pop_fixed([reg]) + (" ; tmpref @" + this.exprStack.length));
                            this.exprStack.shift();
                            this.clearStack();
                        }
                        else {
                            var idx0 = idx.toString() + ":" + this.exprStack.length;
                            this.write(this.t.load_reg_src_off(reg, "sp", idx0, true) + (" ; tmpref @" + (this.exprStack.length - idx)));
                        }
                        break;
                    case pxtc.ir.EK.CellRef:
                        var cell = e.data;
                        if (cell.isGlobal()) {
                            var inf = this.bitSizeInfo(cell.bitSize);
                            var off = "#" + cell.index;
                            if (inf.needsSignExt || cell.index >= inf.immLimit) {
                                this.write(this.t.emit_int(cell.index, reg));
                                off = reg;
                            }
                            this.write(this.t.load_reg_src_off("r7", "r6", "#0"));
                            this.write(this.t.load_reg_src_off(reg, "r7", off, false, false, inf));
                        }
                        else {
                            var _a = this.cellref(cell), src = _a[0], imm = _a[1], idx_1 = _a[2];
                            this.write(this.t.load_reg_src_off(reg, src, imm, idx_1));
                        }
                        break;
                    default: pxtc.oops();
                }
            };
            ProctoAssembler.prototype.bitSizeInfo = function (b) {
                var inf = {
                    size: pxtc.sizeOfBitSize(b),
                    immLimit: 128
                };
                if (inf.size == 1) {
                    inf.immLimit = 32;
                }
                else if (inf.size == 2) {
                    inf.immLimit = 64;
                }
                if (b == 1 /* Int8 */ || b == 3 /* Int16 */) {
                    inf.needsSignExt = true;
                }
                return inf;
            };
            // result in R0
            ProctoAssembler.prototype.emitExpr = function (e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                var _this = this;
                switch (e.exprKind) {
                    case pxtc.ir.EK.JmpValue:
                        this.write("; jmp value (already in r0)");
                        break;
                    case pxtc.ir.EK.Nop:
                        // this is there because we need different addresses for breakpoints
                        this.write(this.t.nop());
                        break;
                    case pxtc.ir.EK.FieldAccess:
                        this.emitExpr(e.args[0]);
                        return this.emitFieldAccess(e);
                    case pxtc.ir.EK.Store:
                        return this.emitStore(e.args[0], e.args[1]);
                    case pxtc.ir.EK.RuntimeCall:
                        return this.emitRtCall(e);
                    case pxtc.ir.EK.ProcCall:
                        return this.emitProcCall(e);
                    case pxtc.ir.EK.SharedDef:
                        return this.emitSharedDef(e);
                    case pxtc.ir.EK.Sequence:
                        e.args.forEach(function (e) { return _this.emitExpr(e); });
                        return this.clearStack();
                    case pxtc.ir.EK.InstanceOf:
                        this.emitExpr(e.args[0]);
                        return this.emitInstanceOf(e.data, e.jsInfo);
                    default:
                        return this.emitExprInto(e, "r0");
                }
            };
            ProctoAssembler.prototype.emitFieldAccess = function (e, store) {
                if (store === void 0) { store = false; }
                var info = e.data;
                var pref = store ? "st" : "ld";
                var lbl = pref + "fld_" + info.classInfo.id + "_" + info.name;
                if (info.needsCheck && !pxtc.target.switches.skipClassCheck) {
                    this.emitInstanceOf(info.classInfo, "validate");
                    lbl += "_chk";
                }
                var off = info.idx * 4 + 4;
                var xoff = "#" + off;
                if (off > 124) {
                    this.write(this.t.emit_int(off, "r3"));
                    xoff = "r3";
                }
                if (store)
                    this.write("str r1, [r0, " + xoff + "]");
                else
                    this.write("ldr r0, [r0, " + xoff + "]");
                return;
            };
            ProctoAssembler.prototype.emitClassCall = function (procid) {
                var _this = this;
                var effIdx = procid.virtualIndex + pxtc.firstMethodOffset();
                this.write(this.t.emit_int(effIdx * 4, "r1"));
                var info = procid.classInfo;
                var suff = "";
                if (procid.isThis)
                    suff += "_this";
                this.emitLabelledHelper("classCall_" + info.id + suff, function () {
                    _this.write("ldr r0, [sp, #0] ; ld-this");
                    _this.loadVTable();
                    if (!pxtc.target.switches.skipClassCheck && !procid.isThis)
                        _this.checkSubtype(info);
                    _this.write("ldr r1, [r3, r1] ; ld-method");
                    _this.write("bx r1 ; keep lr from caller");
                    _this.write(".fail:");
                    _this.write(_this.t.callCPP("pxt::failedCast"));
                });
            };
            ProctoAssembler.prototype.ifaceCallCore = function (numargs, getset, noObjlit) {
                if (noObjlit === void 0) { noObjlit = false; }
                this.write("\n                ldr r2, [r3, #12] ; load mult\n                movs r7, r2\n                beq .objlit ; built-in types have mult=0\n                muls r7, r1\n                lsrs r7, r2\n                lsls r7, r7, #1 ; r7 - hash offset\n                ldr r3, [r3, #4] ; iface table\n                adds r3, r3, r7\n                ; r0-this, r1-method idx, r2-free, r3-hash entry, r4-num args, r7-free\n                ");
                for (var i = 0; i < pxtc.vtLookups; ++i) {
                    if (i > 0)
                        this.write("    adds r3, #2");
                    this.write("\n                ldrh r2, [r3, #0] ; r2-offset of descriptor\n                ldrh r7, [r2, r3] ; r7-method idx\n                cmp r7, r1\n                beq .hit\n                ");
                }
                if (getset == "get") {
                    this.write("movs r0, #0 ; undefined");
                    this.write("bx lr");
                }
                else
                    this.write("b .fail2");
                this.write("\n            .hit:\n                adds r3, r3, r2 ; r3-descriptor\n                ldr r2, [r3, #4]\n                lsls r7, r2, #31\n                beq .field\n            ");
                if (getset == "set") {
                    this.write("\n                    ; check for next descriptor\n                    ldrh r7, [r3, #8]\n                    cmp r7, r1\n                    bne .fail2 ; no setter!\n                    ldr r2, [r3, #12]\n                ");
                }
                this.write(this.t.emit_int(numargs, "r4"));
                this.write("bx r2");
                if (!noObjlit) {
                    this.write("\n                .objlit:\n                    ldrh r2, [r3, #8]\n                    cmp r2, #" + pxt.BuiltInType.RefMap + "\n                    bne .fail\n                    mov r4, lr\n                ");
                    if (getset == "set") {
                        this.write("ldr r2, [sp, #4] ; ld-val");
                    }
                    this.write(this.t.callCPP(getset == "set" ? "pxtrt::mapSet" : "pxtrt::mapGet"));
                    if (getset) {
                        this.write("bx r4");
                    }
                    else {
                        this.write("mov lr, r4");
                        this.write("b .moveArgs");
                    }
                }
                this.write(".field:");
                if (getset == "set") {
                    this.write("\n                        ldr r3, [sp, #4] ; ld-val\n                        str r3, [r0, r2] ; store field\n                        bx lr\n                    ");
                }
                else if (getset == "get") {
                    this.write("\n                        ldr r0, [r0, r2] ; load field\n                        bx lr\n                    ");
                }
                else {
                    this.write("\n                        ldr r0, [r0, r2] ; load field\n                    ");
                }
                if (!getset) {
                    this.write(".moveArgs:");
                    for (var i = 0; i < numargs; ++i) {
                        if (i == numargs - 1)
                            // we keep the actual lambda value on the stack, so it gets decremented
                            this.write("movs r1, r0");
                        else
                            this.write("ldr r1, [sp, #4*" + (i + 1) + "]");
                        this.write("str r1, [sp, #4*" + i + "]");
                    }
                    // one argument consumed
                    this.lambdaCall(numargs - 1);
                }
                if (noObjlit)
                    this.write(".objlit:");
                this.write("\n            .fail:\n                " + this.t.callCPP("pxt::failedCast") + "\n            .fail2:\n                " + this.t.callCPP("pxt::missingProperty") + "\n            ");
            };
            ProctoAssembler.prototype.emitIfaceCall = function (procid, numargs, getset) {
                var _this = this;
                if (getset === void 0) { getset = ""; }
                pxtc.U.assert(procid.ifaceIndex > 0);
                this.write(this.t.emit_int(procid.ifaceIndex, "r1"));
                this.emitLabelledHelper("ifacecall" + numargs + "_" + getset, function () {
                    _this.write("ldr r0, [sp, #0] ; ld-this");
                    _this.loadVTable();
                    _this.ifaceCallCore(numargs, getset);
                });
            };
            // vtable in r3; clobber r2
            ProctoAssembler.prototype.checkSubtype = function (info, failLbl, r2) {
                if (failLbl === void 0) { failLbl = ".fail"; }
                if (r2 === void 0) { r2 = "r2"; }
                if (!info.classNo) {
                    this.write("b " + failLbl + " ; always fails; class never instantiated");
                    return;
                }
                this.write("ldrh " + r2 + ", [r3, #8]");
                this.write("cmp " + r2 + ", #" + info.classNo);
                if (info.classNo == info.lastSubtypeNo) {
                    this.write("bne " + failLbl); // different class
                }
                else {
                    this.write("blt " + failLbl);
                    this.write("cmp " + r2 + ", #" + info.lastSubtypeNo);
                    this.write("bgt " + failLbl);
                }
            };
            // keep r0, keep r1, clobber r2, vtable in r3
            ProctoAssembler.prototype.loadVTable = function (r2, taglbl, nulllbl) {
                if (r2 === void 0) { r2 = "r2"; }
                if (taglbl === void 0) { taglbl = ".fail"; }
                if (nulllbl === void 0) { nulllbl = ".fail"; }
                this.write("lsls " + r2 + ", r0, #30");
                this.write("bne " + taglbl); // tagged
                this.write("cmp r0, #0");
                this.write("beq " + nulllbl); // null
                this.write("ldr r3, [r0, #0]");
                this.write("; vtable in R3");
            };
            ProctoAssembler.prototype.emitInstanceOf = function (info, tp) {
                var _this = this;
                var lbl = "inst_" + info.id + "_" + tp;
                this.emitLabelledHelper(lbl, function () {
                    if (tp == "validateNullable")
                        _this.loadVTable("r2", ".tagged", ".undefined");
                    else
                        _this.loadVTable("r2", ".fail", ".fail");
                    _this.checkSubtype(info);
                    if (tp == "bool") {
                        _this.write("movs r0, #" + pxtc.taggedTrue);
                        _this.write("bx lr");
                        _this.write(".fail:");
                        _this.write("movs r0, #" + pxtc.taggedFalse);
                        _this.write("bx lr");
                    }
                    else if (tp == "validate") {
                        _this.write("bx lr");
                        _this.write(".fail:");
                        _this.write(_this.t.callCPP("pxt::failedCast"));
                    }
                    else if (tp == "validateNullable") {
                        _this.write(".undefined:");
                        _this.write("bx lr");
                        _this.write(".tagged:");
                        _this.write("cmp r0, #" + pxtc.taggedNull + " ; check for null");
                        _this.write("bne .fail");
                        _this.write("movs r0, #0");
                        _this.write("bx lr");
                        _this.write(".fail:");
                        _this.write(_this.t.callCPP("pxt::failedCast"));
                    }
                    else {
                        pxtc.U.oops();
                    }
                });
            };
            ProctoAssembler.prototype.emitSharedDef = function (e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                if (arg.totalUses == 1)
                    return this.emitExpr(arg);
                else {
                    this.emitExpr(arg);
                    this.exprStack.unshift(arg);
                    this.write(this.t.push_local("r0") + "; tmpstore @" + this.exprStack.length);
                }
            };
            ProctoAssembler.prototype.clearArgs = function (nonRefs, refs) {
                var numArgs = nonRefs.length + refs.length;
                var allArgs = nonRefs.concat(refs);
                for (var _i = 0, allArgs_1 = allArgs; _i < allArgs_1.length; _i++) {
                    var r = allArgs_1[_i];
                    if (r.currUses != 0 || r.totalUses != 1) {
                        console.log(r.toString());
                        console.log(allArgs.map(function (a) { return a.toString(); }));
                        pxtc.U.oops("wrong uses: " + r.currUses + " " + r.totalUses);
                    }
                    r.currUses = 1;
                }
                this.clearStack();
            };
            ProctoAssembler.prototype.builtInClassNo = function (typeNo) {
                return { id: "builtin" + typeNo, classNo: typeNo, lastSubtypeNo: typeNo };
            };
            ProctoAssembler.prototype.emitBeginTry = function (topExpr) {
                // this.write(`adr r0, ${topExpr.args[0].data}`)
                this.emitExprInto(topExpr.args[0], "r0");
                this.write("bl _pxt_save_exception_state");
            };
            ProctoAssembler.prototype.emitRtCall = function (topExpr, genCall) {
                var _this = this;
                if (genCall === void 0) { genCall = null; }
                var name = topExpr.data;
                if (name == "pxt::beginTry") {
                    return this.emitBeginTry(topExpr);
                }
                var maskInfo = topExpr.mask || { refMask: 0 };
                var convs = maskInfo.conversions || [];
                var allArgs = topExpr.args.map(function (a, i) { return ({
                    idx: i,
                    expr: a,
                    isSimple: a.isLiteral(),
                    isRef: (maskInfo.refMask & (1 << i)) != 0,
                    conv: convs.find(function (c) { return c.argIdx == i; })
                }); });
                pxtc.U.assert(allArgs.length <= 4);
                var seenUpdate = false;
                for (var _i = 0, _a = pxtc.U.reversed(allArgs); _i < _a.length; _i++) {
                    var a = _a[_i];
                    if (a.expr.isPure()) {
                        if (!a.isSimple && !a.isRef)
                            if (!seenUpdate || a.expr.isStateless())
                                a.isSimple = true;
                    }
                    else {
                        seenUpdate = true;
                    }
                }
                for (var _b = 0, allArgs_2 = allArgs; _b < allArgs_2.length; _b++) {
                    var a = allArgs_2[_b];
                    // we might want conversion from literal numbers to strings for example
                    if (a.conv)
                        a.isSimple = false;
                }
                var complexArgs = allArgs.filter(function (a) { return !a.isSimple; });
                if (complexArgs.every(function (c) { return c.expr.isPure() && !c.isRef && !c.conv; })) {
                    for (var _c = 0, complexArgs_1 = complexArgs; _c < complexArgs_1.length; _c++) {
                        var c = complexArgs_1[_c];
                        c.isSimple = true;
                    }
                    complexArgs = [];
                }
                var c0 = complexArgs[0];
                var clearStack = true;
                if (complexArgs.length == 1 && !c0.conv && !c0.isRef) {
                    this.emitExpr(c0.expr);
                    if (c0.idx != 0)
                        this.write(this.t.mov("r" + c0.idx, "r0"));
                    clearStack = false;
                }
                else {
                    for (var _d = 0, complexArgs_2 = complexArgs; _d < complexArgs_2.length; _d++) {
                        var a = complexArgs_2[_d];
                        this.pushArg(a.expr);
                    }
                    this.alignExprStack(0);
                    var convArgs_1 = complexArgs.filter(function (a) { return !!a.conv; });
                    if (convArgs_1.length) {
                        var conv = this.redirectOutput(function () {
                            var off = 0;
                            if (!pxtc.target.switches.inlineConversions) {
                                if (_this.t.stackAligned())
                                    off += 2;
                                else
                                    off += 1;
                            }
                            for (var _i = 0, convArgs_2 = convArgs_1; _i < convArgs_2.length; _i++) {
                                var a = convArgs_2[_i];
                                if (pxtc.isThumb() && a.conv.method == "pxt::toInt") {
                                    // SPEED 2.5%
                                    _this.write(_this.loadFromExprStack("r0", a.expr, off));
                                    _this.write("asrs r0, r0, #1");
                                    var idx = pxtc.target.switches.inlineConversions ? a.expr.getId() : off;
                                    _this.write("bcs .isint" + idx);
                                    _this.write("lsls r0, r0, #1");
                                    _this.alignedCall(a.conv.method, "", off);
                                    _this.write(".isint" + idx + ":");
                                    _this.write(_this.t.push_fixed(["r0"]));
                                }
                                else {
                                    _this.write(_this.loadFromExprStack("r0", a.expr, off));
                                    if (a.conv.refTag) {
                                        if (!pxtc.target.switches.skipClassCheck)
                                            _this.emitInstanceOf(_this.builtInClassNo(a.conv.refTag), a.conv.refTagNullable ? "validateNullable" : "validate");
                                    }
                                    else {
                                        _this.alignedCall(a.conv.method, "", off);
                                        if (a.conv.returnsRef)
                                            // replace the entry on the stack with the return value,
                                            // as the original was already decr'ed, but the result
                                            // has yet to be
                                            _this.write(_this.loadFromExprStack("r0", a.expr, off, true));
                                    }
                                    _this.write(_this.t.push_fixed(["r0"]));
                                }
                                off++;
                            }
                            for (var _a = 0, _b = pxtc.U.reversed(convArgs_1); _a < _b.length; _a++) {
                                var a = _b[_a];
                                off--;
                                _this.write(_this.t.pop_fixed(["r" + a.idx]));
                            }
                            for (var _c = 0, complexArgs_3 = complexArgs; _c < complexArgs_3.length; _c++) {
                                var a = complexArgs_3[_c];
                                if (!a.conv)
                                    _this.write(_this.loadFromExprStack("r" + a.idx, a.expr, off));
                            }
                        });
                        if (pxtc.target.switches.inlineConversions)
                            this.write(conv);
                        else
                            this.emitHelper(this.t.helper_prologue() + conv + this.t.helper_epilogue(), "conv");
                    }
                    else {
                        // not really worth a helper; some of this will be peep-holed away
                        for (var _e = 0, complexArgs_4 = complexArgs; _e < complexArgs_4.length; _e++) {
                            var a = complexArgs_4[_e];
                            this.write(this.loadFromExprStack("r" + a.idx, a.expr));
                        }
                    }
                }
                for (var _f = 0, allArgs_3 = allArgs; _f < allArgs_3.length; _f++) {
                    var a = allArgs_3[_f];
                    if (a.isSimple)
                        this.emitExprInto(a.expr, "r" + a.idx);
                }
                if (genCall) {
                    genCall();
                }
                else {
                    if (name != "langsupp::ignore")
                        this.alignedCall(name, "", 0, true);
                }
                if (clearStack) {
                    this.clearArgs(complexArgs.filter(function (a) { return !a.isRef; }).map(function (a) { return a.expr; }), complexArgs.filter(function (a) { return a.isRef; }).map(function (a) { return a.expr; }));
                }
            };
            ProctoAssembler.prototype.alignedCall = function (name, cmt, off, saveStack) {
                if (cmt === void 0) { cmt = ""; }
                if (off === void 0) { off = 0; }
                if (saveStack === void 0) { saveStack = false; }
                if (pxtc.U.startsWith(name, "_cmp_") || pxtc.U.startsWith(name, "_pxt_"))
                    saveStack = false;
                this.write(this.t.call_lbl(name, saveStack, this.stackAlignmentNeeded(off)) + cmt);
            };
            ProctoAssembler.prototype.emitLabelledHelper = function (lbl, generate) {
                if (!this.labelledHelpers[lbl]) {
                    var outp = this.redirectOutput(generate);
                    this.emitHelper(outp, lbl);
                    this.labelledHelpers[lbl] = this.bin.codeHelpers[outp];
                }
                else {
                    this.write(this.t.call_lbl(this.labelledHelpers[lbl]));
                }
            };
            ProctoAssembler.prototype.emitHelper = function (asm, baseName) {
                if (baseName === void 0) { baseName = "hlp"; }
                if (!this.bin.codeHelpers[asm]) {
                    var len = Object.keys(this.bin.codeHelpers).length;
                    this.bin.codeHelpers[asm] = "_" + baseName + "_" + len;
                }
                this.write(this.t.call_lbl(this.bin.codeHelpers[asm]));
            };
            ProctoAssembler.prototype.pushToExprStack = function (a) {
                a.totalUses = 1;
                a.currUses = 0;
                this.exprStack.unshift(a);
            };
            ProctoAssembler.prototype.pushArg = function (a) {
                this.clearStack(true);
                var bot = this.exprStack.length;
                this.emitExpr(a);
                this.clearStack(true);
                this.write(this.t.push_local("r0") + " ; proc-arg");
                this.pushToExprStack(a);
            };
            ProctoAssembler.prototype.loadFromExprStack = function (r, a, off, store) {
                if (off === void 0) { off = 0; }
                if (store === void 0) { store = false; }
                var idx = this.exprStack.indexOf(a);
                pxtc.assert(idx >= 0);
                return this.t.load_reg_src_off(r, "sp", (idx + off).toString(), true, store) + " ; estack\n";
            };
            ProctoAssembler.prototype.pushDummy = function () {
                var dummy = pxtc.ir.numlit(0);
                dummy.totalUses = 1;
                dummy.currUses = 1;
                this.exprStack.unshift(dummy);
            };
            ProctoAssembler.prototype.alignExprStack = function (numargs) {
                var interAlign = this.stackAlignmentNeeded(numargs);
                if (interAlign) {
                    for (var i = 0; i < interAlign; ++i) {
                        // r5 should be safe to push on gc stack
                        this.write("push {r5} ; align");
                        this.pushDummy();
                    }
                }
            };
            ProctoAssembler.prototype.emitFieldMethods = function () {
                for (var _i = 0, _a = ["get", "set"]; _i < _a.length; _i++) {
                    var op = _a[_i];
                    this.write("\n                .section code\n                _pxt_map_" + op + ":\n                ");
                    this.loadVTable("r4");
                    this.checkSubtype(this.builtInClassNo(pxt.BuiltInType.RefMap), ".notmap", "r4");
                    this.write(this.t.callCPPPush(op == "set" ? "pxtrt::mapSetByString" : "pxtrt::mapGetByString"));
                    this.write(".notmap:");
                    var numargs = op == "set" ? 2 : 1;
                    var hasAlign = false;
                    this.write("mov r4, r3 ; save VT");
                    if (op == "set") {
                        if (pxtc.target.stackAlign) {
                            hasAlign = true;
                            this.write("push {lr} ; align");
                        }
                        this.write("\n                            push {r0, r2, lr}\n                            mov r0, r1\n                        ");
                    }
                    else {
                        this.write("\n                            push {r0, lr}\n                            mov r0, r1\n                        ");
                    }
                    this.write("\n                    bl pxtrt::lookupMapKey\n                    mov r1, r0 ; put key index in r1\n                    ldr r0, [sp, #0] ; restore obj pointer\n                    mov r3, r4 ; restore vt\n                    bl .dowork\n                ");
                    this.write(this.t.pop_locals(numargs + (hasAlign ? 1 : 0)));
                    this.write("pop {pc}");
                    this.write(".dowork:");
                    this.ifaceCallCore(numargs, op, true);
                }
            };
            ProctoAssembler.prototype.emitArrayMethod = function (op, isBuffer) {
                this.write("\n            .section code\n            _pxt_" + (isBuffer ? "buffer" : "array") + "_" + op + ":\n            ");
                this.loadVTable("r4");
                var classNo = this.builtInClassNo(!isBuffer ?
                    pxt.BuiltInType.RefCollection : pxt.BuiltInType.BoxedBuffer);
                if (!pxtc.target.switches.skipClassCheck)
                    this.checkSubtype(classNo, ".fail", "r4");
                // on linux we use 32 bits for array size
                var ldrSize = pxtc.target.stackAlign || isBuffer ? "ldr" : "ldrh";
                this.write("\n                asrs r1, r1, #1\n                bcc .notint\n                " + ldrSize + " r4, [r0, #" + (isBuffer ? 4 : 8) + "]\n                cmp r1, r4\n                bhs .oob\n            ");
                var off = "r1";
                if (isBuffer) {
                    off = "#8";
                    this.write("\n                    adds r4, r0, r1\n                ");
                }
                else {
                    this.write("\n                    lsls r1, r1, #2\n                    ldr r4, [r0, #4]\n                ");
                }
                var suff = isBuffer ? "b" : "";
                var conv = isBuffer && op == "get" ? "lsls r0, r0, #1\nadds r0, #1" : "";
                if (op == "set") {
                    this.write("\n                        str" + suff + " r2, [r4, " + off + "]\n                        bx lr\n                    ");
                }
                else {
                    this.write("\n                        ldr" + suff + " r0, [r4, " + off + "]\n                        " + conv + "\n                        bx lr\n                    ");
                }
                this.write("\n            .notint:\n                lsls r1, r1, #1\n                " + this.t.pushLR() + "\n                push {r0, r2}\n                mov r0, r1\n                " + this.t.callCPP("pxt::toInt") + "\n                mov r1, r0\n                pop {r0, r2}\n            .doop:\n                " + this.t.callCPP("Array_::" + op + "At") + "\n                " + conv + "\n                " + this.t.popPC() + "\n\n            .fail:\n                bl pxt::failedCast\n            ");
                if (op == "get") {
                    this.write("\n                    .oob:\n                        movs r0, #" + (isBuffer ? 1 : 0) + " ; 0 or undefined\n                        bx lr\n                ");
                }
                else {
                    this.write("\n                    .oob:\n                        " + this.t.pushLR() + "\n                        b .doop\n                ");
                }
            };
            ProctoAssembler.prototype.emitArrayMethods = function () {
                for (var _i = 0, _a = ["get", "set"]; _i < _a.length; _i++) {
                    var op = _a[_i];
                    this.emitArrayMethod(op, true);
                    this.emitArrayMethod(op, false);
                }
            };
            ProctoAssembler.prototype.emitLambdaTrampoline = function () {
                var r3 = pxtc.target.stackAlign ? "r3," : "";
                this.write("\n            .section code\n            _pxt_lambda_trampoline:\n                push {" + r3 + " r4, r5, r6, r7, lr}\n                mov r4, r8\n                mov r5, r9\n                mov r6, r10\n                mov r7, r11\n                push {r4, r5, r6, r7} ; save high registers\n                mov r4, r1\n                mov r5, r2\n                mov r6, r3\n                mov r7, r0\n                ");
                // TODO should inline this?
                this.emitInstanceOf(this.builtInClassNo(pxt.BuiltInType.RefAction), "validate");
                this.write("\n                mov r0, sp\n                push {r4, r5, r6, r7} ; push args and the lambda\n                mov r1, sp\n                bl pxt::pushThreadContext\n                mov r6, r0          ; save ctx or globals\n                mov r5, r7          ; save lambda for closure\n                ldr r0, [r5, #8]    ; ld fnptr\n                movs r4, #3         ; 3 args\n                blx r0              ; execute the actual lambda\n                mov r7, r0          ; save result\n                @dummystack 4\n                add sp, #4*4        ; remove arguments and lambda\n                mov r0, r6   ; or pop the thread context\n                bl pxt::popThreadContext\n                mov r0, r7 ; restore result\n                pop {r4, r5, r6, r7} ; restore high registers\n                mov r8, r4\n                mov r9, r5\n                mov r10, r6\n                mov r11, r7\n                pop {" + r3 + " r4, r5, r6, r7, pc}");
                this.write("\n            .section code\n            ; r0 - try frame\n            ; r1 - handler PC\n            _pxt_save_exception_state:\n                push {r0, lr}\n                " + this.t.callCPP("pxt::beginTry") + "\n                pop {r1, r4}\n                str r1, [r0, #1*4] ; PC\n                mov r1, sp\n                str r1, [r0, #2*4] ; SP\n                str r5, [r0, #3*4] ; lambda ptr\n                bx r4\n                ");
                this.write("\n            .section code\n            ; r0 - try frame\n            ; r1 - thread context\n            _pxt_restore_exception_state:\n                mov r6, r1\n                ldr r1, [r0, #2*4] ; SP\n                mov sp, r1\n                ldr r5, [r0, #3*4] ; lambda ptr\n                ldr r1, [r0, #1*4] ; PC\n                movs r0, #1\n                orrs r1, r0\n                bx r1\n                ");
                this.write("\n            .section code\n            _pxt_stringConv:\n            ");
                this.loadVTable();
                this.checkSubtype(this.builtInClassNo(pxt.BuiltInType.BoxedString), ".notstring");
                this.write("\n                bx lr\n\n            .notstring: ; no string, but vtable in r3\n                ldr r7, [r3, #4*" + (pxtc.firstMethodOffset() - 1) + "]\n                cmp r7, #0\n                beq .fail\n                push {r0, lr}\n                movs r4, #1\n                blx r7\n                str r0, [sp, #0]\n                b .numops\n\n            .fail: ; not an object or no toString\n                push {r0, lr}\n            .numops:\n                " + this.t.callCPP("numops::toString") + "\n                pop {r1}\n                pop {pc}\n            ");
            };
            ProctoAssembler.prototype.emitProcCall = function (topExpr) {
                var _this = this;
                var complexArgs = [];
                var theOne = null;
                var theOneReg = "";
                var procid = topExpr.data;
                if (procid.proc && procid.proc.inlineBody)
                    return this.emitExpr(procid.proc.inlineSelf(topExpr.args));
                var isLambda = procid.virtualIndex == -1;
                var seenUpdate = false;
                for (var _i = 0, _a = pxtc.U.reversed(topExpr.args); _i < _a.length; _i++) {
                    var c = _a[_i];
                    if (c.isPure()) {
                        if (!seenUpdate || c.isStateless())
                            continue;
                    }
                    else {
                        seenUpdate = true;
                    }
                    complexArgs.push(c);
                }
                complexArgs.reverse();
                if (complexArgs.length <= 1) {
                    // in case there is at most one complex argument, we don't need to re-push anything
                    var a0 = complexArgs[0];
                    if (a0) {
                        theOne = a0;
                        this.clearStack(true);
                        this.emitExpr(a0);
                        if (a0 == topExpr.args[topExpr.args.length - 1])
                            theOneReg = "r0";
                        else {
                            theOneReg = "r3";
                            this.write(this.t.mov("r3", "r0"));
                        }
                    }
                    complexArgs = [];
                }
                else {
                    for (var _b = 0, complexArgs_5 = complexArgs; _b < complexArgs_5.length; _b++) {
                        var a = complexArgs_5[_b];
                        this.pushArg(a);
                    }
                }
                this.alignExprStack(topExpr.args.length);
                // available registers; r7 can be used in loading globals, don't use it
                var regList = ["r1", "r2", "r3", "r4"];
                var regExprs = [];
                if (complexArgs.length) {
                    var maxDepth = -1;
                    for (var _c = 0, complexArgs_6 = complexArgs; _c < complexArgs_6.length; _c++) {
                        var c = complexArgs_6[_c];
                        maxDepth = Math.max(this.exprStack.indexOf(c), maxDepth);
                    }
                    maxDepth++;
                    // we have 6 registers to play with
                    if (maxDepth <= regList.length) {
                        regList = regList.slice(0, maxDepth);
                        this.write(this.t.pop_fixed(regList));
                        regExprs = this.exprStack.splice(0, maxDepth);
                        // now push anything that isn't an argument
                        var pushList = [];
                        for (var i = maxDepth - 1; i >= 0; --i) {
                            if (complexArgs.indexOf(regExprs[i]) < 0) {
                                pushList.push(regList[i]);
                                this.exprStack.unshift(regExprs[i]);
                            }
                        }
                        if (pushList.length)
                            this.write(this.t.push_fixed(pushList));
                    }
                    else {
                        regList = null;
                        this.write(this.t.reg_gets_imm("r7", 0));
                    }
                }
                var argsToPush = pxtc.U.reversed(topExpr.args);
                // for lambda, move the first argument (lambda object) to the end
                if (isLambda)
                    argsToPush.unshift(argsToPush.pop());
                for (var _d = 0, argsToPush_1 = argsToPush; _d < argsToPush_1.length; _d++) {
                    var a = argsToPush_1[_d];
                    if (complexArgs.indexOf(a) >= 0) {
                        if (regList) {
                            this.write(this.t.push_fixed([regList[regExprs.indexOf(a)]]));
                        }
                        else {
                            this.write(this.loadFromExprStack("r0", a));
                            this.write(this.t.push_local("r0") + " ; re-push");
                            this.write(this.loadFromExprStack("r7", a, 1, true));
                            var idx = this.exprStack.indexOf(a);
                            var theNull = pxtc.ir.numlit(0);
                            theNull.currUses = 1;
                            theNull.totalUses = 1;
                            this.exprStack[idx] = theNull;
                        }
                        this.exprStack.unshift(a);
                    }
                    else if (a === theOne) {
                        this.write(this.t.push_local(theOneReg) + " ; the one arg");
                        this.pushToExprStack(a);
                    }
                    else {
                        this.pushArg(a);
                    }
                }
                var lbl = this.mkLbl("_proccall");
                var argsToClear = topExpr.args.slice();
                var procIdx = -1;
                if (isLambda) {
                    var numargs_1 = topExpr.args.length - 1;
                    this.write(this.loadFromExprStack("r0", topExpr.args[0]));
                    this.emitLabelledHelper("lambda_call" + numargs_1, function () {
                        _this.lambdaCall(numargs_1);
                        _this.write(".fail:");
                        _this.write(_this.t.callCPP("pxt::failedCast"));
                    });
                }
                else if (procid.virtualIndex != null || procid.ifaceIndex != null) {
                    var custom = this.t.method_call(procid, topExpr);
                    if (custom) {
                        this.write(custom);
                    }
                    else if (procid.mapMethod) {
                        var isSet = /Set/.test(procid.mapMethod);
                        pxtc.assert(isSet == (topExpr.args.length == 2));
                        pxtc.assert(!isSet == (topExpr.args.length == 1));
                        this.emitIfaceCall(procid, topExpr.args.length, isSet ? "set" : "get");
                    }
                    else if (procid.ifaceIndex != null) {
                        this.emitIfaceCall(procid, topExpr.args.length);
                    }
                    else {
                        this.emitClassCall(procid);
                    }
                    this.write(lbl + ":");
                }
                else {
                    var proc = procid.proc;
                    procIdx = proc.seqNo;
                    this.write(this.t.call_lbl(proc.label() + (procid.isThis ? "_nochk" : "")));
                    this.write(lbl + ":");
                }
                this.calls.push({
                    procIndex: procIdx,
                    stack: 0,
                    addr: 0,
                    callLabel: lbl,
                });
                // note that we have to treat all arguments as refs,
                // because the procedure might have overriden them and we need to unref them
                // this doesn't apply to the lambda expression itself though
                if (isLambda && topExpr.args[0].isStateless()) {
                    this.clearArgs([topExpr.args[0]], topExpr.args.slice(1));
                }
                else {
                    this.clearArgs([], topExpr.args);
                }
            };
            ProctoAssembler.prototype.lambdaCall = function (numargs) {
                this.write("; lambda call");
                this.loadVTable();
                if (!pxtc.target.switches.skipClassCheck)
                    this.checkSubtype(this.builtInClassNo(pxt.BuiltInType.RefAction));
                // the conditional branch below saves stack space for functions that do not require closure
                this.write("\n                movs r4, #" + numargs + "\n                ldrh r1, [r0, #4]\n                cmp r1, #0\n                bne .pushR5\n                ldr r1, [r0, #8]\n                bx r1 ; keep lr from the caller\n            .pushR5:\n                sub sp, #8\n            ");
                // move arguments two steps up
                for (var i = 0; i < numargs; ++i) {
                    this.write("ldr r1, [sp, #4*" + (i + 2) + "]");
                    this.write("str r1, [sp, #4*" + i + "]");
                }
                this.write("\n                str r5, [sp, #4*" + numargs + "]\n                mov r1, lr\n                str r1, [sp, #4*" + (numargs + 1) + "]\n                mov r5, r0\n                ldr r7, [r5, #8]\n                blx r7\n                ldr r4, [sp, #4*" + (numargs + 1) + "]\n                ldr r5, [sp, #4*" + numargs + "]\n            ");
                // move arguments back where they were
                for (var i = 0; i < numargs; ++i) {
                    this.write("ldr r1, [sp, #4*" + i + "]");
                    this.write("str r1, [sp, #4*" + (i + 2) + "]");
                }
                this.write("\n                add sp, #8\n                bx r4\n            ");
                this.write("; end lambda call");
            };
            ProctoAssembler.prototype.emitStore = function (trg, src) {
                var _this = this;
                switch (trg.exprKind) {
                    case pxtc.ir.EK.CellRef:
                        var cell = trg.data;
                        this.emitExpr(src);
                        if (cell.isGlobal()) {
                            var inf = this.bitSizeInfo(cell.bitSize);
                            var off = "#" + cell.index;
                            if (cell.index >= inf.immLimit) {
                                this.write(this.t.emit_int(cell.index, "r1"));
                                off = "r1";
                            }
                            this.write(this.t.load_reg_src_off("r7", "r6", "#0"));
                            this.write(this.t.load_reg_src_off("r0", "r7", off, false, true, inf));
                        }
                        else {
                            var _a = this.cellref(cell), reg = _a[0], imm = _a[1], off = _a[2];
                            this.write(this.t.load_reg_src_off("r0", reg, imm, off, true));
                        }
                        break;
                    case pxtc.ir.EK.FieldAccess:
                        this.emitRtCall(pxtc.ir.rtcall("dummy", [trg.args[0], src]), function () { return _this.emitFieldAccess(trg, true); });
                        break;
                    default: pxtc.oops();
                }
            };
            ProctoAssembler.prototype.cellref = function (cell) {
                if (cell.isGlobal()) {
                    throw pxtc.oops();
                }
                else if (cell.iscap) {
                    var idx = cell.index + 3;
                    pxtc.assert(0 <= idx && idx < 32);
                    return ["r5", idx.toString(), true];
                }
                else if (cell.isarg) {
                    var idx = cell.index;
                    return ["sp", "args@" + idx.toString() + ":" + this.baseStackSize, false];
                }
                else {
                    return ["sp", "locals@" + cell.index, false];
                }
            };
            ProctoAssembler.prototype.emitLambdaWrapper = function (isMain) {
                var _this = this;
                this.write("");
                this.write(".section code");
                this.write(".balign 4");
                if (isMain)
                    this.proc.info.usedAsValue = true;
                if (!this.proc.info.usedAsValue && !this.proc.info.usedAsIface)
                    return;
                // TODO can use InlineRefAction_vtable or something to limit the size of the thing
                if (this.proc.info.usedAsValue) {
                    this.write(this.proc.label() + "_Lit:");
                    this.write(this.t.obj_header("pxt::RefAction_vtable"));
                    this.write(".short 0, 0 ; no captured vars");
                    this.write(".word " + this.proc.label() + "_args@fn");
                }
                this.write(this.proc.label() + "_args:");
                var numargs = this.proc.args.length;
                if (numargs == 0)
                    return;
                this.write("cmp r4, #" + numargs);
                this.write("bge " + this.proc.label() + "_nochk");
                var needsAlign = this.stackAlignmentNeeded(numargs + 1);
                var numpush = needsAlign ? numargs + 2 : numargs + 1;
                this.write("push {lr}");
                this.emitLabelledHelper("expand_args_" + numargs, function () {
                    _this.write("movs r0, #0");
                    _this.write("movs r1, #0");
                    if (needsAlign)
                        _this.write("push {r0}");
                    for (var i = numargs; i > 0; i--) {
                        if (i != numargs) {
                            _this.write("cmp r4, #" + i);
                            _this.write("blt .zero" + i);
                            _this.write("ldr r0, [sp, #" + (numpush - 1) + "*4]");
                            _this.write("str r1, [sp, #" + (numpush - 1) + "*4] ; clear existing");
                            _this.write(".zero" + i + ":");
                        }
                        _this.write("push {r0}");
                    }
                    _this.write("bx lr");
                });
                this.write("bl " + this.proc.label() + "_nochk");
                var stackSize = numargs + (needsAlign ? 1 : 0);
                this.write("@dummystack " + stackSize);
                this.write("add sp, #4*" + stackSize);
                this.write("pop {pc}");
            };
            ProctoAssembler.prototype.emitCallRaw = function (name) {
                var inf = pxtc.hex.lookupFunc(name);
                pxtc.assert(!!inf, "unimplemented raw function: " + name);
                this.alignedCall(name);
            };
            return ProctoAssembler;
        }());
        pxtc.ProctoAssembler = ProctoAssembler;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var jsOpMap = {
            "numops::adds": "+",
            "numops::subs": "-",
            "numops::div": "/",
            "numops::mod": "%",
            "numops::muls": "*",
            "numops::ands": "&",
            "numops::orrs": "|",
            "numops::eors": "^",
            "numops::bnot": "~",
            "numops::lsls": "<<",
            "numops::asrs": ">>",
            "numops::lsrs": ">>>",
            "numops::le": "<=",
            "numops::lt": "<",
            "numops::lt_bool": "<",
            "numops::ge": ">=",
            "numops::gt": ">",
            "numops::eq": "==",
            "pxt::eq_bool": "==",
            "pxt::eqq_bool": "===",
            "numops::eqq": "===",
            "numops::neqq": "!==",
            "numops::neq": "!=",
        };
        var shortNsCalls = {
            "pxsim.Boolean_": "",
            "pxsim.pxtcore": "",
            "pxsim.String_": "",
            "pxsim.ImageMethods": "",
            "pxsim.Array_": "",
            "pxsim.pxtrt": "",
            "pxsim.numops": "",
        };
        var shortCalls = {
            "pxsim.Array_.getAt": "",
            "pxsim.Array_.length": "",
            "pxsim.Array_.mk": "",
            "pxsim.Array_.push": "",
            "pxsim.Boolean_.bang": "",
            "pxsim.String_.concat": "",
            "pxsim.String_.stringConv": "",
            "pxsim.numops.toBool": "",
            "pxsim.numops.toBoolDecr": "",
            "pxsim.pxtcore.mkAction": "",
            "pxsim.pxtcore.mkClassInstance": "",
            "pxsim.pxtrt.ldlocRef": "",
            "pxsim.pxtrt.mapGetByString": "",
            "pxsim.pxtrt.stclo": "",
            "pxsim.pxtrt.stlocRef": "",
        };
        function shortCallsPrefix(m) {
            var r = "";
            for (var _i = 0, _a = Object.keys(m); _i < _a.length; _i++) {
                var k = _a[_i];
                var kk = k.replace(/\./g, "_");
                m[k] = kk;
                r += "const " + kk + " = " + k + ";\n";
            }
            return r;
        }
        function isBuiltinSimOp(name) {
            return !!pxtc.U.lookup(jsOpMap, name.replace(/\./g, "::"));
        }
        pxtc.isBuiltinSimOp = isBuiltinSimOp;
        function shimToJs(shimName) {
            shimName = shimName.replace(/::/g, ".");
            if (shimName.slice(0, 4) == "pxt.")
                shimName = "pxtcore." + shimName.slice(4);
            var r = "pxsim." + shimName;
            if (shortCalls.hasOwnProperty(r))
                return shortCalls[r];
            var idx = r.lastIndexOf(".");
            if (idx > 0) {
                var pref = r.slice(0, idx);
                if (shortNsCalls.hasOwnProperty(pref))
                    return shortNsCalls[pref] + r.slice(idx);
            }
            return r;
        }
        pxtc.shimToJs = shimToJs;
        function vtableToJs(info) {
            pxtc.U.assert(info.classNo !== undefined);
            pxtc.U.assert(info.lastSubtypeNo !== undefined);
            var s = "const " + info.id + "_VT = mkVTable({\n" +
                ("  name: " + JSON.stringify(pxtc.getName(info.decl)) + ",\n") +
                ("  numFields: " + info.allfields.length + ",\n") +
                ("  classNo: " + info.classNo + ",\n") +
                ("  lastSubtypeNo: " + info.lastSubtypeNo + ",\n") +
                "  methods: {\n";
            for (var _i = 0, _a = info.vtable; _i < _a.length; _i++) {
                var m = _a[_i];
                s += "    \"" + m.getName() + "\": " + m.label() + ",\n";
            }
            s += "  },\n";
            s += "  iface: {\n";
            for (var _b = 0, _c = info.itable; _b < _c.length; _b++) {
                var m = _c[_b];
                s += "    \"" + m.name + "\": " + (m.proc ? m.proc.label() : "null") + ",\n";
                if (m.setProc)
                    s += "    \"set/" + m.name + "\": " + m.setProc.label() + ",\n";
                else if (!m.proc)
                    s += "    \"set/" + m.name + "\": null,\n";
            }
            s += "  },\n";
            if (info.toStringMethod)
                s += "  toStringMethod: " + info.toStringMethod.label() + ",\n";
            s += "});\n";
            return s;
        }
        var evalIfaceFields = [
            "runtime",
            "oops",
            "doNothing",
            "pxsim",
            "globals",
            "maybeYield",
            "setupDebugger",
            "isBreakFrame",
            "breakpoint",
            "trace",
            "checkStack",
            "leave",
            "checkResumeConsumed",
            "setupResume",
            "setupLambda",
            "checkSubtype",
            "failedCast",
            "buildResume",
            "mkVTable"
        ];
        function jsEmit(bin) {
            var jssource = "(function (ectx) {\n'use strict';\n";
            for (var _i = 0, evalIfaceFields_1 = evalIfaceFields; _i < evalIfaceFields_1.length; _i++) {
                var n = evalIfaceFields_1[_i];
                jssource += "const " + n + " = ectx." + n + ";\n";
            }
            jssource += "const __this = runtime;\n";
            jssource += "const pxtrt = pxsim.pxtrt;\n";
            jssource += "let yieldSteps = 1;\n";
            jssource += "ectx.setupYield(function() { yieldSteps = 100; })\n";
            jssource += "pxsim.setTitle(" + JSON.stringify(bin.getTitle()) + ");\n";
            var cfg = {};
            var cfgKey = {};
            for (var _a = 0, _b = bin.res.configData || []; _a < _b.length; _a++) {
                var ce = _b[_a];
                cfg[ce.key + ""] = ce.value;
                cfgKey[ce.name] = ce.key;
            }
            jssource += "pxsim.setConfigData(" +
                JSON.stringify(cfg, null, 1) + ", " +
                JSON.stringify(cfgKey, null, 1) + ");\n";
            jssource += "pxtrt.mapKeyNames = " + JSON.stringify(bin.ifaceMembers, null, 1) + ";\n";
            var perfCounters = bin.setPerfCounters(["SysScreen"]);
            jssource += "__this.setupPerfCounters(" + JSON.stringify(perfCounters, null, 1) + ");\n";
            jssource += shortCallsPrefix(shortCalls);
            jssource += shortCallsPrefix(shortNsCalls);
            var cachedLen = 0;
            var newLen = 0;
            bin.procs.forEach(function (p) {
                var curr;
                if (p.cachedJS) {
                    curr = p.cachedJS;
                    cachedLen += curr.length;
                }
                else {
                    curr = irToJS(bin, p);
                    newLen += curr.length;
                }
                jssource += "\n" + curr + "\n";
            });
            jssource += pxtc.U.values(bin.codeHelpers).join("\n") + "\n";
            bin.usedClassInfos.forEach(function (info) {
                jssource += vtableToJs(info);
            });
            if (bin.res.breakpoints)
                jssource += "\nconst breakpoints = setupDebugger(" + bin.res.breakpoints.length + ", [" + bin.globals.filter(function (c) { return c.isUserVariable; }).map(function (c) { return "\"" + c.uniqueName() + "\""; }).join(",") + "])\n";
            jssource += "\nreturn " + (bin.procs[0] ? bin.procs[0].label() : "null") + "\n})\n";
            var total = jssource.length;
            var perc = function (n) { return ((100 * n) / total).toFixed(2) + "%"; };
            var sizes = "// total=" + jssource.length + " new=" + perc(newLen) + " cached=" + perc(cachedLen) + " other=" + perc(total - newLen - cachedLen) + "\n";
            bin.writeFile(pxtc.BINARY_JS, sizes + jssource);
        }
        pxtc.jsEmit = jsEmit;
        function irToJS(bin, proc) {
            if (proc.cachedJS)
                return proc.cachedJS;
            var resText = "";
            var writeRaw = function (s) { resText += s + "\n"; };
            var write = function (s) { resText += "    " + s + "\n"; };
            var EK = pxtc.ir.EK;
            var exprStack = [];
            var maxStack = 0;
            var localsCache = {};
            var hexlits = "";
            writeRaw("\nfunction " + proc.label() + "(s) {\nlet r0 = s.r0, step = s.pc;\ns.pc = -1;\n");
            if (proc.perfCounterNo) {
                writeRaw("if (step == 0) __this.startPerfCounter(" + proc.perfCounterNo + ");\n");
            }
            writeRaw("\nwhile (true) {\nif (yieldSteps-- < 0 && maybeYield(s, step, r0)) return null;\nswitch (step) {\n  case 0:\n");
            proc.locals.forEach(function (l) {
                write(locref(l) + " = undefined;");
            });
            if (proc.args.length) {
                write("if (s.lambdaArgs) {");
                proc.args.forEach(function (l, i) {
                    write("  " + locref(l) + " = (s.lambdaArgs[" + i + "]);");
                });
                write("  s.lambdaArgs = null;");
                write("}");
            }
            if (proc.classInfo && proc.info.thisParameter) {
                write("r0 = s.arg0;");
                emitInstanceOf(proc.classInfo, "validate");
            }
            var lblIdx = 0;
            var asyncContinuations = [];
            for (var _i = 0, _a = proc.body; _i < _a.length; _i++) {
                var s = _a[_i];
                if (s.stmtKind == pxtc.ir.SK.Label && s.lblNumUses > 0)
                    s.lblId = ++lblIdx;
            }
            var idx = 0;
            for (var _b = 0, _c = proc.body; _b < _c.length; _b++) {
                var s = _c[_b];
                switch (s.stmtKind) {
                    case pxtc.ir.SK.Expr:
                        emitExpr(s.expr);
                        break;
                    case pxtc.ir.SK.StackEmpty:
                        stackEmpty();
                        break;
                    case pxtc.ir.SK.Jmp:
                        var isJmpNext = false;
                        for (var ii = idx + 1; ii < proc.body.length; ++ii) {
                            if (proc.body[ii].stmtKind != pxtc.ir.SK.Label)
                                break;
                            if (s.lbl == proc.body[ii]) {
                                isJmpNext = true;
                                break;
                            }
                        }
                        emitJmp(s, isJmpNext);
                        break;
                    case pxtc.ir.SK.Label:
                        if (s.lblNumUses > 0)
                            writeRaw("  case " + s.lblId + ":");
                        break;
                    case pxtc.ir.SK.Breakpoint:
                        emitBreakpoint(s);
                        break;
                    default: pxtc.oops();
                }
                idx++;
            }
            stackEmpty();
            if (proc.perfCounterNo) {
                writeRaw("__this.stopPerfCounter(" + proc.perfCounterNo + ");\n");
            }
            write("return leave(s, r0)");
            writeRaw("  default: oops()");
            writeRaw("} } }");
            var info = pxtc.nodeLocationInfo(proc.action);
            info.functionName = proc.getName();
            info.argumentNames = proc.args && proc.args.map(function (a) { return a.getName(); });
            writeRaw(proc.label() + ".info = " + JSON.stringify(info));
            if (proc.isRoot)
                writeRaw(proc.label() + ".continuations = [ " + asyncContinuations.join(",") + " ]");
            writeRaw(fnctor(proc.label() + "_mk", proc.label(), maxStack, Object.keys(localsCache)));
            writeRaw(hexlits);
            proc.cachedJS = resText;
            return resText;
            // pre-create stack frame for this procedure with all the fields we need, so the
            // Hidden Class in the JIT is initalized optimally
            function fnctor(id, procname, numTmps, locals) {
                var r = "";
                r += "\nfunction " + id + "(s) {\n    checkStack(s.depth);\n    return {\n        parent: s, fn: " + procname + ", depth: s.depth + 1,\n        pc: 0, retval: undefined, r0: undefined, overwrittenPC: false, lambdaArgs: null,\n";
                for (var i = 0; i < numTmps; ++i)
                    r += "  tmp_" + i + ": undefined,\n";
                // this includes parameters
                for (var _i = 0, locals_1 = locals; _i < locals_1.length; _i++) {
                    var l = locals_1[_i];
                    r += "  " + l + ": undefined,\n";
                }
                r += "} }\n";
                return r;
            }
            function emitBreakpoint(s) {
                var id = s.breakpointInfo.id;
                var lbl;
                write("s.lastBrkId = " + id + ";");
                if (bin.options.trace) {
                    lbl = ++lblIdx;
                    write("return trace(" + id + ", s, " + lbl + ", " + proc.label() + ".info);");
                }
                else {
                    if (!bin.options.breakpoints)
                        return;
                    lbl = ++lblIdx;
                    var brkCall = "return breakpoint(s, " + lbl + ", " + id + ", r0);";
                    if (s.breakpointInfo.isDebuggerStmt)
                        write(brkCall);
                    else
                        write("if ((breakpoints[0] && isBreakFrame(s)) || breakpoints[" + id + "]) " + brkCall);
                }
                writeRaw("  case " + lbl + ":");
            }
            function locref(cell) {
                if (cell.isGlobal())
                    return "globals." + cell.uniqueName();
                else if (cell.iscap)
                    return "s.caps[" + cell.index + "]";
                var un = cell.uniqueName();
                localsCache[un] = true;
                return "s." + un;
            }
            function emitJmp(jmp, isJmpNext) {
                if (jmp.lbl.lblNumUses == pxtc.ir.lblNumUsesJmpNext || isJmpNext) {
                    pxtc.assert(jmp.jmpMode == pxtc.ir.JmpMode.Always);
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    // no actual jump needed
                    return;
                }
                pxtc.assert(jmp.lbl.lblNumUses > 0);
                var trg = "{ step = " + jmp.lbl.lblId + "; continue; }";
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    write(trg);
                }
                else {
                    emitExpr(jmp.expr);
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        write("if (r0) " + trg);
                    }
                    else {
                        write("if (!r0) " + trg);
                    }
                }
            }
            function canEmitInto(e) {
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                    case EK.PointerLiteral:
                    case EK.SharedRef:
                    case EK.CellRef:
                        return true;
                    default:
                        return false;
                }
            }
            function emitExprPossiblyInto(e) {
                if (canEmitInto(e))
                    return emitExprInto(e);
                emitExpr(e);
                return "r0";
            }
            function emitExprInto(e) {
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                        if (e.data === true)
                            return "true";
                        else if (e.data === false)
                            return "false";
                        else if (e.data === null)
                            return "null";
                        else if (e.data === undefined)
                            return "undefined";
                        else if (typeof e.data == "number")
                            return e.data + "";
                        else
                            throw pxtc.oops("invalid data: " + typeof e.data);
                    case EK.PointerLiteral:
                        if (e.ptrlabel()) {
                            return e.ptrlabel().lblId + "";
                        }
                        else if (e.hexlit()) {
                            hexlits += "const " + e.data + " = pxsim.BufferMethods.createBufferFromHex(\"" + e.hexlit() + "\")\n";
                            return e.data;
                        }
                        else if (typeof e.jsInfo == "string") {
                            return e.jsInfo;
                        }
                        else {
                            pxtc.U.oops();
                        }
                    case EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx_2 = exprStack.indexOf(arg);
                        pxtc.U.assert(idx_2 >= 0);
                        return "s.tmp_" + idx_2;
                    case EK.CellRef:
                        var cell = e.data;
                        return locref(cell);
                    default: throw pxtc.oops();
                }
            }
            // result in R0
            function emitExpr(e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                switch (e.exprKind) {
                    case EK.JmpValue:
                        write("// jmp value (already in r0)");
                        break;
                    case EK.Nop:
                        write("// nop");
                        break;
                    case EK.FieldAccess:
                        var info_1 = e.data;
                        var shimName = info_1.shimName;
                        var obj = emitExprPossiblyInto(e.args[0]);
                        if (shimName) {
                            write("r0 = " + obj + shimName + ";");
                            return;
                        }
                        write("r0 = " + obj + ".fields[\"" + info_1.name + "\"];");
                        return;
                    case EK.Store:
                        return emitStore(e.args[0], e.args[1]);
                    case EK.RuntimeCall:
                        return emitRtCall(e);
                    case EK.ProcCall:
                        return emitProcCall(e);
                    case EK.SharedDef:
                        return emitSharedDef(e);
                    case EK.Sequence:
                        return e.args.forEach(emitExpr);
                    case EK.InstanceOf:
                        emitExpr(e.args[0]);
                        emitInstanceOf(e.data, e.jsInfo);
                        return;
                    default:
                        write("r0 = " + emitExprInto(e) + ";");
                }
            }
            function checkSubtype(info, r0) {
                if (r0 === void 0) { r0 = "r0"; }
                var vt = info.id + "_VT";
                return "checkSubtype(" + r0 + ", " + vt + ")";
            }
            function emitInstanceOf(info, tp, r0) {
                if (r0 === void 0) { r0 = "r0"; }
                if (tp == "bool")
                    write("r0 = " + checkSubtype(info) + ";");
                else if (tp == "validate") {
                    write("if (!" + checkSubtype(info, r0) + ") failedCast(" + r0 + ");");
                }
                else {
                    pxtc.U.oops();
                }
            }
            function emitSharedDef(e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                if (arg.totalUses == 1)
                    return emitExpr(arg);
                else {
                    var idx_3 = exprStack.length;
                    exprStack.push(arg);
                    var val = emitExprPossiblyInto(arg);
                    if (val != "r0")
                        val = "r0 = " + val;
                    write("s.tmp_" + idx_3 + " = " + val + ";");
                }
            }
            function emitRtCall(topExpr) {
                var info = pxtc.ir.flattenArgs(topExpr.args);
                info.precomp.forEach(emitExpr);
                var name = topExpr.data;
                var args = info.flattened.map(emitExprInto);
                if (name == "langsupp::ignore")
                    return;
                var text = "";
                if (name[0] == ".")
                    text = "" + args[0] + name + "(" + args.slice(1).join(", ") + ")";
                else if (name[0] == "=")
                    text = "(" + args[0] + ")" + name.slice(1) + " = (" + args[1] + ")";
                else if (pxtc.U.startsWith(name, "new "))
                    text = "new " + shimToJs(name.slice(4)) + "(" + args.join(", ") + ")";
                else if (pxtc.U.lookup(jsOpMap, name))
                    text = args.length == 2 ? "(" + args[0] + " " + pxtc.U.lookup(jsOpMap, name) + " " + args[1] + ")" : "(" + pxtc.U.lookup(jsOpMap, name) + " " + args[0] + ")";
                else
                    text = shimToJs(name) + "(" + args.join(", ") + ")";
                if (topExpr.callingConvention == 0 /* Plain */) {
                    write("r0 = " + text + ";");
                }
                else {
                    var loc = ++lblIdx;
                    asyncContinuations.push(loc);
                    if (name == "String_::stringConv") {
                        write("if ((" + args[0] + ") && (" + args[0] + ").vtable) {");
                    }
                    if (topExpr.callingConvention == 2 /* Promise */) {
                        write("(function(cb) { " + text + ".done(cb) })(buildResume(s, " + loc + "));");
                    }
                    else {
                        write("setupResume(s, " + loc + ");");
                        write(text + ";");
                    }
                    write("checkResumeConsumed();");
                    write("return;");
                    if (name == "String_::stringConv")
                        write("} else { s.retval = (" + args[0] + ") + \"\"; }");
                    writeRaw("  case " + loc + ":");
                    write("r0 = s.retval;");
                }
            }
            function emitProcCall(topExpr) {
                var procid = topExpr.data;
                var callproc = procid.proc;
                if (callproc && callproc.inlineBody)
                    return emitExpr(callproc.inlineSelf(topExpr.args));
                var frameExpr = pxtc.ir.rtcall("<frame>", []);
                frameExpr.totalUses = 1;
                frameExpr.currUses = 0;
                var frameIdx = exprStack.length;
                exprStack.push(frameExpr);
                var frameRef = "s.tmp_" + frameIdx;
                var lblId = ++lblIdx;
                var isLambda = procid.virtualIndex == -1;
                if (callproc)
                    write(frameRef + " = " + callproc.label() + "_mk(s);");
                else {
                    var id_1 = "generic";
                    if (procid.ifaceIndex != null)
                        id_1 = "if_" + bin.ifaceMembers[procid.ifaceIndex];
                    else if (isLambda)
                        id_1 = "lambda";
                    else if (procid.virtualIndex != null)
                        id_1 = procid.classInfo.id + "_v" + procid.virtualIndex;
                    else
                        pxtc.U.oops();
                    var argLen_1 = topExpr.args.length;
                    id_1 += "_" + argLen_1 + "_mk";
                    bin.recordHelper(proc.usingCtx, id_1, function () {
                        var locals = pxtc.U.range(argLen_1).map(function (i) { return "arg" + i; });
                        return fnctor(id_1, "null", 5, locals);
                    });
                    write(frameRef + " = " + id_1 + "(s);");
                }
                //console.log("PROCCALL", topExpr.toString())
                topExpr.args.forEach(function (a, i) {
                    var arg = "arg" + i;
                    if (isLambda) {
                        if (i == 0)
                            arg = "argL";
                        else
                            arg = "arg" + (i - 1);
                    }
                    write(frameRef + "." + arg + " = " + emitExprPossiblyInto(a) + ";");
                });
                var callIt = "s.pc = " + lblId + "; return " + frameRef + ";";
                if (procid.ifaceIndex != null) {
                    pxtc.U.assert(callproc == null);
                    var isSet = false;
                    var ifaceFieldName = bin.ifaceMembers[procid.ifaceIndex];
                    pxtc.U.assert(!!ifaceFieldName);
                    if (procid.mapMethod) {
                        write("if (!" + frameRef + ".arg0.vtable.iface) {");
                        var args = topExpr.args.map(function (a, i) { return frameRef + ".arg" + i; });
                        args.splice(1, 0, JSON.stringify(ifaceFieldName));
                        write("  s.retval = " + shimToJs(procid.mapMethod) + "ByString(" + args.join(", ") + ");");
                        write("} else {");
                        if (/Set/.test(procid.mapMethod))
                            isSet = true;
                    }
                    write(frameRef + ".fn = " + frameRef + ".arg0.vtable.iface[\"" + (isSet ? "set/" : "") + ifaceFieldName + "\"];");
                    var fld = frameRef + ".arg0.fields[\"" + ifaceFieldName + "\"]";
                    if (isSet) {
                        write("if (" + frameRef + ".fn === null) { " + fld + " = " + frameRef + ".arg1; }");
                        write("else if (" + frameRef + ".fn === undefined) { failedCast(" + frameRef + ".arg0) }");
                    }
                    else {
                        write("if (" + frameRef + ".fn == null) { s.retval = " + fld + "; }");
                    }
                    write("else { " + callIt + " }");
                    if (procid.mapMethod) {
                        write("}");
                    }
                    callIt = "";
                }
                else if (procid.virtualIndex == -1) {
                    // lambda call
                    pxtc.U.assert(callproc == null);
                    write("setupLambda(" + frameRef + ", " + frameRef + ".argL);");
                }
                else if (procid.virtualIndex != null) {
                    pxtc.U.assert(callproc == null);
                    pxtc.assert(procid.virtualIndex >= 0);
                    emitInstanceOf(procid.classInfo, "validate", frameRef + ".arg0");
                    var meth = procid.classInfo.vtable[procid.virtualIndex];
                    write(frameRef + ".fn = " + frameRef + ".arg0.vtable.methods." + meth.getName() + ";");
                }
                else {
                    pxtc.U.assert(callproc != null);
                }
                if (callIt)
                    write(callIt);
                writeRaw("  case " + lblId + ":");
                write("r0 = s.retval;");
                frameExpr.currUses = 1;
            }
            function bitSizeConverter(b) {
                switch (b) {
                    case 0 /* None */: return "";
                    case 1 /* Int8 */: return "pxtrt.toInt8";
                    case 3 /* Int16 */: return "pxtrt.toInt16";
                    case 5 /* Int32 */: return "pxtrt.toInt32";
                    case 2 /* UInt8 */: return "pxtrt.toUInt8";
                    case 4 /* UInt16 */: return "pxtrt.toUInt16";
                    case 6 /* UInt32 */: return "pxtrt.toUInt32";
                    default: throw pxtc.oops();
                }
            }
            function emitStore(trg, src) {
                switch (trg.exprKind) {
                    case EK.CellRef:
                        var cell = trg.data;
                        var src2 = emitExprPossiblyInto(src);
                        write(locref(cell) + " = " + bitSizeConverter(cell.bitSize) + "(" + src2 + ");");
                        break;
                    case EK.FieldAccess:
                        var info_2 = trg.data;
                        var shimName = info_2.shimName;
                        if (!shimName)
                            shimName = ".fields[\"" + info_2.name + "\"]";
                        emitExpr(pxtc.ir.rtcall("=" + shimName, [trg.args[0], src]));
                        break;
                    default: pxtc.oops();
                }
            }
            function stackEmpty() {
                for (var _i = 0, exprStack_1 = exprStack; _i < exprStack_1.length; _i++) {
                    var e = exprStack_1[_i];
                    if (e.totalUses !== e.currUses)
                        pxtc.oops();
                }
                maxStack = Math.max(exprStack.length, maxStack);
                exprStack = [];
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
// Make sure backbase.ts is loaded before us, otherwise 'extends AssemblerSnippets' fails at runtime
/// <reference path="backbase.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.thumbCmpMap = {
            "numops::lt": "_cmp_lt",
            "numops::gt": "_cmp_gt",
            "numops::le": "_cmp_le",
            "numops::ge": "_cmp_ge",
            "numops::eq": "_cmp_eq",
            "numops::eqq": "_cmp_eqq",
            "numops::neq": "_cmp_neq",
            "numops::neqq": "_cmp_neqq",
        };
        var inlineArithmetic = {
            "numops::adds": "_numops_adds",
            "numops::subs": "_numops_subs",
            "numops::orrs": "_numops_orrs",
            "numops::eors": "_numops_eors",
            "numops::ands": "_numops_ands",
            "numops::lsls": "_numops_lsls",
            "numops::asrs": "_numops_asrs",
            "numops::lsrs": "_numops_lsrs",
            "pxt::toInt": "_numops_toInt",
            "pxt::fromInt": "_numops_fromInt",
        };
        // snippets for ARM Thumb assembly
        var ThumbSnippets = /** @class */ (function (_super) {
            __extends(ThumbSnippets, _super);
            function ThumbSnippets() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            ThumbSnippets.prototype.stackAligned = function () {
                return pxtc.target.stackAlign && pxtc.target.stackAlign > 1;
            };
            ThumbSnippets.prototype.pushLR = function () {
                // r5 should contain GC-able value
                if (this.stackAligned())
                    return "push {lr, r5}  ; r5 for align";
                else
                    return "push {lr}";
            };
            ThumbSnippets.prototype.popPC = function () {
                if (this.stackAligned())
                    return "pop {pc, r5}  ; r5 for align";
                else
                    return "pop {pc}";
            };
            ThumbSnippets.prototype.nop = function () { return "nop"; };
            ThumbSnippets.prototype.mov = function (trg, dst) {
                return "mov " + trg + ", " + dst;
            };
            ThumbSnippets.prototype.helper_ret = function () {
                return "bx r4";
            };
            ThumbSnippets.prototype.reg_gets_imm = function (reg, imm) {
                return "movs " + reg + ", #" + imm;
            };
            ThumbSnippets.prototype.push_fixed = function (regs) { return "push {" + regs.join(", ") + "}"; };
            ThumbSnippets.prototype.pop_fixed = function (regs) { return "pop {" + regs.join(", ") + "}"; };
            ThumbSnippets.prototype.proc_setup = function (numlocals, main) {
                var r = "";
                if (numlocals > 0) {
                    r += "    movs r0, #0\n";
                    for (var i = 0; i < numlocals; ++i)
                        r += "    push {r0} ;loc\n";
                }
                return r;
            };
            ThumbSnippets.prototype.proc_return = function () { return "pop {pc}"; };
            ThumbSnippets.prototype.debugger_stmt = function (lbl) {
                if (pxtc.target.gc)
                    pxtc.oops();
                return "\n    @stackempty locals\n    ldr r0, [r6, #0] ; debugger\n    subs r0, r0, #4  ; debugger\n" + lbl + ":\n    ldr r0, [r0, #0] ; debugger\n";
            };
            ThumbSnippets.prototype.debugger_bkpt = function (lbl) {
                if (pxtc.target.gc)
                    pxtc.oops();
                return "\n    @stackempty locals\n    ldr r0, [r6, #0] ; brk\n" + lbl + ":\n    ldr r0, [r0, #0] ; brk\n";
            };
            ThumbSnippets.prototype.debugger_proc = function (lbl) {
                if (pxtc.target.gc)
                    pxtc.oops();
                return "\n    ldr r0, [r6, #0]  ; brk-entry\n    ldr r0, [r0, #4]  ; brk-entry\n" + lbl + ":";
            };
            ThumbSnippets.prototype.push_local = function (reg) { return "push {" + reg + "}"; };
            ThumbSnippets.prototype.push_locals = function (n) { return "sub sp, #4*" + n + " ; push locals " + n + " (align)"; };
            ThumbSnippets.prototype.pop_locals = function (n) { return "add sp, #4*" + n + " ; pop locals " + n; };
            ThumbSnippets.prototype.unconditional_branch = function (lbl) { return "bb " + lbl; };
            ThumbSnippets.prototype.beq = function (lbl) { return "beq " + lbl; };
            ThumbSnippets.prototype.bne = function (lbl) { return "bne " + lbl; };
            ThumbSnippets.prototype.cmp = function (reg1, reg2) { return "cmp " + reg1 + ", " + reg2; };
            ThumbSnippets.prototype.cmp_zero = function (reg1) { return "cmp " + reg1 + ", #0"; };
            ThumbSnippets.prototype.load_reg_src_off = function (reg, src, off, word, store, inf) {
                off = off.replace(/:\d+$/, "");
                if (word) {
                    off = "#4*" + off;
                }
                var str = "str";
                var ldr = "ldr";
                if (inf) {
                    if (inf.immLimit == 32)
                        str = "strb";
                    else if (inf.immLimit == 64)
                        str = "strh";
                    if (inf.needsSignExt)
                        ldr = str.replace("str", "ldrs");
                    else
                        ldr = str.replace("str", "ldr");
                }
                if (store)
                    return str + " " + reg + ", [" + src + ", " + off + "]";
                else
                    return ldr + " " + reg + ", [" + src + ", " + off + "]";
            };
            ThumbSnippets.prototype.rt_call = function (name, r0, r1) {
                return name + " " + r0 + ", " + r1;
            };
            ThumbSnippets.prototype.alignedCall = function (lbl, stackAlign) {
                if (stackAlign)
                    return this.push_locals(stackAlign) + "\nbl " + lbl + "\n" + this.pop_locals(stackAlign);
                else
                    return "bl " + lbl;
            };
            ThumbSnippets.prototype.call_lbl = function (lbl, saveStack, stackAlign) {
                var o = pxtc.U.lookup(inlineArithmetic, lbl);
                if (o) {
                    lbl = o;
                    saveStack = false;
                }
                if (!saveStack && lbl.indexOf("::") > 0)
                    saveStack = true;
                if (saveStack)
                    return this.callCPP(lbl, stackAlign);
                else
                    return this.alignedCall(lbl, stackAlign);
            };
            ThumbSnippets.prototype.call_reg = function (reg) {
                return "blx " + reg;
            };
            // NOTE: 43 (in cmp instruction below) is magic number to distinguish
            // NOTE: Map from RefRecord
            ThumbSnippets.prototype.vcall = function (mapMethod, isSet, vtableShift) {
                return "\n    ldr r0, [sp, #0] ; ld-this\n    ldrh r3, [r0, #2] ; ld-vtable\n    lsls r3, r3, #" + vtableShift + "\n    ldr r3, [r3, #4] ; iface table\n    cmp r3, #43\n    beq .objlit\n.nonlit:\n    lsls r1, " + (isSet ? "r2" : "r1") + ", #2\n    ldr r0, [r3, r1] ; ld-method\n    bx r0\n.objlit:\n    " + (isSet ? "ldr r2, [sp, #4]" : "") + "\n    movs r3, #0 ; clear args on stack, so the outside decr() doesn't touch them\n    str r3, [sp, #0]\n    " + (isSet ? "str r3, [sp, #4]" : "") + "\n    " + this.pushLR() + "\n    " + this.callCPP(mapMethod) + "\n    " + this.popPC() + "\n";
            };
            ThumbSnippets.prototype.prologue_vtable = function (arg_top_index, vtableShift) {
                return "\n    ldr r0, [sp, #4*" + arg_top_index + "]  ; ld-this\n    ldrh r0, [r0, #2] ; ld-vtable\n    lsls r0, r0, #" + vtableShift + "\n    ";
            };
            ThumbSnippets.prototype.helper_prologue = function () {
                return "\n    @stackmark args\n    " + this.pushLR() + "\n";
            };
            ThumbSnippets.prototype.helper_epilogue = function () {
                return "\n    " + this.popPC() + "\n    @stackempty args\n";
            };
            ThumbSnippets.prototype.load_ptr_full = function (lbl, reg) {
                pxtc.assert(!!lbl);
                return "\n    ldlit " + reg + ", " + lbl + "\n";
            };
            ThumbSnippets.prototype.load_vtable = function (trg, src) {
                return "ldr " + trg + ", [" + src + ", #0]";
            };
            ThumbSnippets.prototype.lambda_init = function () {
                return "\n    mov r5, r0\n    mov r4, lr\n    bl pxtrt::getGlobalsPtr\n    mov r6, r0\n    bx r4\n";
            };
            ThumbSnippets.prototype.saveThreadStack = function () {
                return "mov r7, sp\n    str r7, [r6, #4]\n";
            };
            ThumbSnippets.prototype.restoreThreadStack = function () {
                if (pxtc.target.gc && pxtc.target.switches.gcDebug)
                    return "movs r7, #0\n    str r7, [r6, #4]\n";
                else
                    return "";
            };
            ThumbSnippets.prototype.callCPPPush = function (lbl) {
                return this.pushLR() + "\n" + this.callCPP(lbl) + "\n" + this.popPC() + "\n";
            };
            ThumbSnippets.prototype.callCPP = function (lbl, stackAlign) {
                return this.saveThreadStack() + this.alignedCall(lbl, stackAlign) + "\n" + this.restoreThreadStack();
            };
            ThumbSnippets.prototype.inline_decr = function (idx) {
                // TODO optimize sequences of pops without decr into sub on sp
                return "\n    lsls r1, r0, #30\n    bne .tag" + idx + "\n    bl _pxt_decr\n.tag" + idx + ":\n";
            };
            ThumbSnippets.prototype.arithmetic = function () {
                var _this = this;
                var r = "";
                var boxedOp = function (op) {
                    var r = ".boxed:\n";
                    r += "\n                    " + _this.pushLR() + "\n                    push {r0, r1}\n                    " + _this.saveThreadStack() + "\n                    " + op + "\n                    " + _this.restoreThreadStack() + "\n                    add sp, #8\n                    " + _this.popPC() + "\n                ";
                    return r;
                };
                var checkInts = function (op) {
                    r += "\n_numops_" + op + ":\n    @scope _numops_" + op + "\n    lsls r2, r0, #31\n    beq .boxed\n    lsls r2, r1, #31\n    beq .boxed\n";
                };
                var finishOp = function (op) {
                    r += "    blx lr\n";
                    r += boxedOp("bl numops::" + op);
                };
                for (var _i = 0, _a = ["adds", "subs"]; _i < _a.length; _i++) {
                    var op = _a[_i];
                    checkInts(op);
                    r += "\n    subs r2, r1, #1\n    " + op + " r2, r0, r2\n    bvs .boxed\n    movs r0, r2\n";
                    finishOp(op);
                }
                for (var _b = 0, _c = ["ands", "orrs", "eors"]; _b < _c.length; _b++) {
                    var op = _c[_b];
                    checkInts(op);
                    r += "    " + op + " r0, r1\n";
                    if (op == "eors")
                        r += "    adds r0, r0, #1\n";
                    finishOp(op);
                }
                for (var _d = 0, _e = ["lsls", "lsrs", "asrs"]; _d < _e.length; _d++) {
                    var op = _e[_d];
                    checkInts(op);
                    r += "\n    ; r3 := (r1 >> 1) & 0x1f\n    lsls r3, r1, #26\n    lsrs r3, r3, #27\n";
                    if (op == "asrs")
                        r += "\n    asrs r0, r3\n    movs r2, #1\n    orrs r0, r2\n";
                    else {
                        if (op == "lsrs")
                            r += "\n    asrs r2, r0, #1\n    lsrs r2, r3\n    lsrs r3, r2, #30\n    bne .boxed\n";
                        else
                            r += "\n    asrs r2, r0, #1\n    lsls r2, r3\n    lsrs r3, r2, #30\n    beq .ok\n    cmp r3, #3\n    bne .boxed\n.ok:\n";
                        r += "\n    lsls r0, r2, #1\n    adds r0, r0, #1\n";
                    }
                    finishOp(op);
                }
                r += "\n@scope _numops_toInt\n_numops_toInt:\n    asrs r0, r0, #1\n    bcc .over\n    blx lr\n.over:\n    lsls r0, r0, #1\n    " + this.callCPPPush("pxt::toInt") + "\n\n_numops_fromInt:\n    lsls r2, r0, #1\n    asrs r1, r2, #1\n    cmp r0, r1\n    bne .over2\n    adds r0, r2, #1\n    blx lr\n.over2:\n    " + this.callCPPPush("pxt::fromInt") + "\n";
                for (var _f = 0, _g = Object.keys(pxtc.thumbCmpMap); _f < _g.length; _f++) {
                    var op = _g[_f];
                    op = op.replace(/.*::/, "");
                    // this make sure to set the Z flag correctly
                    r += "\n.section code\n_cmp_" + op + ":\n    lsls r2, r0, #31\n    beq .boxed\n    lsls r2, r1, #31\n    beq .boxed\n    subs r0, r1\n    b" + op.replace("qq", "q").replace("neq", "ne") + " .true\n.false:\n    movs r0, #0\n    bx lr\n.true:\n    movs r0, #1\n    bx lr\n";
                    // the cmp isn't really needed, given how toBoolDecr() is compiled,
                    // but better not rely on it
                    // Also, cmp isn't needed when ref-counting (it ends with movs r0, r4)
                    r += boxedOp("\n                        bl numops::" + op + "\n                        bl numops::toBoolDecr\n                        cmp r0, #0");
                }
                return r;
            };
            ThumbSnippets.prototype.emit_int = function (v, reg) {
                var movWritten = false;
                function writeMov(v) {
                    pxtc.assert(0 <= v && v <= 255);
                    var result = "";
                    if (movWritten) {
                        if (v)
                            result = "adds " + reg + ", #" + v + "\n";
                    }
                    else
                        result = "movs " + reg + ", #" + v + "\n";
                    movWritten = true;
                    return result;
                }
                function shift(v) {
                    if (v === void 0) { v = 8; }
                    return "lsls " + reg + ", " + reg + ", #" + v + "\n";
                }
                pxtc.assert(v != null);
                var n = Math.floor(v);
                var isNeg = false;
                if (n < 0) {
                    isNeg = true;
                    n = -n;
                }
                // compute number of lower-order 0s and shift that amount
                var numShift = 0;
                if (n > 0xff) {
                    var shifted = n;
                    while ((shifted & 1) == 0) {
                        shifted >>>= 1;
                        numShift++;
                    }
                    if (pxtc.numBytes(shifted) < pxtc.numBytes(n)) {
                        n = shifted;
                    }
                    else {
                        numShift = 0;
                    }
                }
                var result = "";
                switch (pxtc.numBytes(n)) {
                    case 4:
                        result += writeMov((n >>> 24) & 0xff);
                        result += shift();
                    case 3:
                        result += writeMov((n >>> 16) & 0xff);
                        result += shift();
                    case 2:
                        result += writeMov((n >>> 8) & 0xff);
                        result += shift();
                    case 1:
                        result += writeMov(n & 0xff);
                        break;
                    default:
                        pxtc.oops();
                }
                if (numShift)
                    result += shift(numShift);
                if (isNeg) {
                    result += "negs " + reg + ", " + reg + "\n";
                }
                if (result.split("\n").length > 3 + 1) {
                    // more than 3 instructions? replace with LDR at PC-relative address
                    return "ldlit " + reg + ", " + Math.floor(v) + "\n";
                }
                return result;
            };
            return ThumbSnippets;
        }(pxtc.AssemblerSnippets));
        pxtc.ThumbSnippets = ThumbSnippets;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var vmSpecOpcodes = {
            "pxtrt::mapSetGeneric": "mapset",
            "pxtrt::mapGetGeneric": "mapget",
        };
        var vmCallMap = {};
        function shimToVM(shimName) {
            return shimName;
        }
        function qs(s) {
            return JSON.stringify(s);
        }
        function vtableToVM(info, opts, bin) {
            /*
            uint16_t numbytes;
            ValType objectType;
            uint8_t magic;
            uint32_t padding;
            PVoid *ifaceTable;
            BuiltInType classNo;
            uint16_t reserved;
            uint32_t ifaceHashMult;
            uint32_t padding;
            PVoid methods[2 or 4];
            */
            var ifaceInfo = pxtc.computeHashMultiplier(info.itable.map(function (e) { return e.idx; }));
            //if (info.itable.length == 0)
            //    ifaceInfo.mult = 0
            var mapping = pxtc.U.toArray(ifaceInfo.mapping);
            while (mapping.length & 3)
                mapping.push(0);
            var s = "\n" + info.id + "_VT_start:\n        .short " + (info.allfields.length * 8 + 8) + "  ; size in bytes\n        .byte " + pxt.ValTypeObject + ", " + pxt.VTABLE_MAGIC + " ; magic\n        .short " + mapping.length + " ; entries in iface hashmap\n        .short " + (info.lastSubtypeNo || info.classNo) + " ; last sub class-id\n        .short " + info.classNo + " ; class-id\n        .short 0 ; reserved\n        .word " + ifaceInfo.mult + " ; hash-mult\n        .word 0,0, 0,0, 0,0, 0,0 ; space for 4 (VM_NUM_CPP_METHODS) native methods\n";
            s += "\n        .balign 4\n" + info.id + "_IfaceVT:\n";
            var descSize = 1;
            var zeroOffset = mapping.length >> 2;
            var descs = "";
            var offset = zeroOffset;
            var offsets = {};
            for (var _i = 0, _a = info.itable; _i < _a.length; _i++) {
                var e = _a[_i];
                offsets[e.idx + ""] = offset;
                descs += "  .short " + e.idx + ", " + e.info + " ; " + e.name + "\n";
                descs += "  .word " + (e.proc ? e.proc.vtLabel() + "@fn" : e.info) + "\n";
                offset += descSize;
                if (e.setProc) {
                    descs += "  .short " + e.idx + ", 0 ; set " + e.name + "\n";
                    descs += "  .word " + e.setProc.vtLabel() + "@fn\n";
                    offset += descSize;
                }
            }
            descs += "  .word 0, 0 ; the end\n";
            offset += descSize;
            for (var i = 0; i < mapping.length; ++i) {
                bin.itEntries++;
                if (mapping[i])
                    bin.itFullEntries++;
            }
            s += "  .short " + pxtc.U.toArray(mapping).map(function (e, i) { return offsets[e + ""] || zeroOffset; }).join(", ") + "\n";
            s += descs;
            s += "\n";
            return s;
        }
        // keep in sync with vm.h
        var SectionType;
        (function (SectionType) {
            SectionType[SectionType["Invalid"] = 0] = "Invalid";
            // singular sections
            SectionType[SectionType["InfoHeader"] = 1] = "InfoHeader";
            SectionType[SectionType["OpCodeMap"] = 2] = "OpCodeMap";
            SectionType[SectionType["NumberLiterals"] = 3] = "NumberLiterals";
            SectionType[SectionType["ConfigData"] = 4] = "ConfigData";
            SectionType[SectionType["IfaceMemberNames"] = 5] = "IfaceMemberNames";
            // repetitive sections
            SectionType[SectionType["Function"] = 32] = "Function";
            SectionType[SectionType["Literal"] = 33] = "Literal";
            SectionType[SectionType["VTable"] = 34] = "VTable";
        })(SectionType || (SectionType = {}));
        // this also handles dates after 2106-02-07 (larger than 2^32 seconds since the beginning of time)
        function encodeTime(d) {
            var t = d.getTime() / 1000;
            return (t >>> 0) + ", " + ((t / 0x100000000) | 0);
        }
        /* tslint:disable:no-trailing-whitespace */
        function vmEmit(bin, opts) {
            var vmsource = "; VM start\n" + pxtc.hex.hexPrelude() + "\n";
            var ctx = {
                dblText: [],
                dbls: {},
                opcodeMap: {},
                opcodes: pxtc.vm.opcodes.map(function (o) { return "pxt::op_" + o.replace(/ .*/, ""); }),
            };
            ctx.opcodes.unshift(null);
            while (ctx.opcodes.length < 128)
                ctx.opcodes.push(null);
            var address = 0;
            function section(name, tp, body, aliases, aux) {
                if (aux === void 0) { aux = 0; }
                vmsource += "\n; --- " + name + "\n.section code\n    .set " + name + " = " + address + "\n";
                if (aliases) {
                    for (var _i = 0, aliases_1 = aliases; _i < aliases_1.length; _i++) {
                        var alias = aliases_1[_i];
                        vmsource += "    .set " + alias + " = " + address + "\n";
                    }
                }
                vmsource += "\n_start_" + name + ":\n    .byte " + tp + ", 0x00\n    .short " + aux + "\n    .word _end_" + name + "-_start_" + name + "\n";
                vmsource += body();
                vmsource += "\n.balign 8\n_end_" + name + ":\n";
                address++;
            }
            var now = new Date();
            var encodedName = pxtc.U.toUTF8(opts.name, true);
            if (encodedName.length > 100)
                encodedName = encodedName.slice(0, 100);
            var encodedLength = encodedName.length + 1;
            if (encodedLength & 1)
                encodedLength++;
            var paddingSize = 128 - encodedLength;
            section("_info", SectionType.InfoHeader, function () { return "\n                ; magic - \\0 added by assembler\n                .string \"\\nPXT64\\n\"\n                .hex 5471fe2b5e213768 ; magic\n                .hex " + pxtc.hex.hexTemplateHash() + " ; hex template hash\n                .hex 0000000000000000 ; @SRCHASH@\n                .word " + bin.globalsWords + "   ; num. globals\n                .word " + bin.nonPtrGlobals + " ; non-ptr globals\n                .word 0, 0 ; last usage time\n                .word " + encodeTime(now) + " ; installation time\n                .word " + encodeTime(now) + " ; publication time - TODO\n                .space 64 ; reserved\n                .string " + JSON.stringify(encodedName) + "\n                .space " + paddingSize + " ; pad to 128 bytes\n"; });
            bin.procs.forEach(function (p) {
                section(p.label(), SectionType.Function, function () { return irToVM(ctx, bin, p); }, [p.label() + "_Lit"]);
            });
            vmsource += "_code_end:\n\n";
            vmsource += "_helpers_end:\n\n";
            bin.usedClassInfos.forEach(function (info) {
                section(info.id + "_VT", SectionType.VTable, function () { return vtableToVM(info, opts, bin); });
            });
            var idx = 0;
            section("ifaceMemberNames", SectionType.IfaceMemberNames, function () {
                return "    .word " + bin.ifaceMembers.length + ", 0 ; num. entries\n" + bin.ifaceMembers.map(function (d) {
                    return "    .word " + bin.emitString(d) + ", 0  ; " + idx++ + " ." + d;
                }).join("\n");
            });
            vmsource += "_vtables_end:\n\n";
            pxtc.U.iterMap(bin.hexlits, function (k, v) {
                section(v, SectionType.Literal, function () {
                    return pxtc.hexLiteralAsm(k);
                }, [], pxt.BuiltInType.BoxedBuffer);
            });
            // ifaceMembers are already sorted alphabetically
            // here we make sure that the pointers to them are also sorted alphabetically
            // by emitting them in order and before everything else
            var keys = pxtc.U.unique(bin.ifaceMembers.concat(Object.keys(bin.strings)), function (s) { return s; });
            keys.forEach(function (k) {
                var ku = pxtc.U.toUTF8(k, true);
                section(bin.strings[k], SectionType.Literal, function () {
                    return ".word " + ku.length + "\n.string " + JSON.stringify(ku);
                }, [], pxt.BuiltInType.BoxedString);
            });
            section("numberLiterals", SectionType.NumberLiterals, function () { return ctx.dblText.join("\n"); });
            var cfg = bin.res.configData || [];
            section("configData", SectionType.ConfigData, function () { return cfg.map(function (d) {
                return "    .word " + d.key + ", " + d.value + "  ; " + d.name + "=" + d.value;
            }).join("\n")
                + "\n    .word 0, 0"; });
            var s = ctx.opcodes.map(function (s) { return s == null ? "" : s; }).join("\x00") + "\x00";
            var opcm = "";
            while (s) {
                var pref = s.slice(0, 64);
                s = s.slice(64);
                if (pref.length & 1)
                    pref += "\x00";
                opcm += ".hex " + pxtc.U.toHex(pxtc.U.stringToUint8Array(pref)) + "\n";
            }
            section("opcodeMap", SectionType.OpCodeMap, function () { return opcm; });
            vmsource += "_literals_end:\n";
            vmsource += "\n; The end.\n";
            bin.writeFile(pxtc.BINARY_ASM, vmsource);
            var res = pxtc.assemble(opts.target, bin, vmsource);
            if (res.src)
                bin.writeFile(pxtc.BINARY_ASM, res.src);
            if (pxt.options.debug) {
                var pc_1 = res.thumbFile.peepCounts;
                var keys_1 = Object.keys(pc_1);
                keys_1.sort(function (a, b) { return pc_1[b] - pc_1[a]; });
                for (var _i = 0, _a = keys_1.slice(0, 50); _i < _a.length; _i++) {
                    var k = _a[_i];
                    console.log(k + "  " + pc_1[k]);
                }
            }
            if (res.buf) {
                var binstring = "";
                for (var _b = 0, _c = res.buf; _b < _c.length; _b++) {
                    var v = _c[_b];
                    binstring += String.fromCharCode(v & 0xff, v >> 8);
                }
                var myhex = ts.pxtc.encodeBase64(binstring);
                bin.writeFile(pxt.outputName(pxtc.target), myhex);
            }
        }
        pxtc.vmEmit = vmEmit;
        function irToVM(ctx, bin, proc) {
            var resText = "";
            var writeRaw = function (s) { resText += s + "\n"; };
            var write = function (s) { resText += "    " + s + "\n"; };
            var EK = pxtc.ir.EK;
            var alltmps = [];
            var currTmps = [];
            var final = false;
            var numLoc = 0;
            var argDepth = 0;
            var immMax = (1 << 23) - 1;
            emitAll();
            resText = "";
            for (var _i = 0, alltmps_1 = alltmps; _i < alltmps_1.length; _i++) {
                var t = alltmps_1[_i];
                t.currUses = 0;
            }
            final = true;
            pxtc.U.assert(argDepth == 0);
            emitAll();
            return resText;
            function emitAll() {
                writeRaw(";\n; Proc: " + proc.getFullName() + "\n;");
                write(".section code");
                if (bin.procs[0] == proc) {
                    writeRaw("; main");
                }
                write(".short 0, " + proc.args.length + " ; #args");
                write(".short " + proc.captured.length + ", 0 ; #cap");
                write(".word 0, 0"); // space for fn pointer (64 bit)
                numLoc = proc.locals.length + currTmps.length;
                write("pushmany " + numLoc + " ; incl. " + currTmps.length + " tmps");
                for (var _i = 0, _a = proc.body; _i < _a.length; _i++) {
                    var s = _a[_i];
                    switch (s.stmtKind) {
                        case pxtc.ir.SK.Expr:
                            emitExpr(s.expr);
                            break;
                        case pxtc.ir.SK.StackEmpty:
                            clearStack();
                            for (var _b = 0, currTmps_1 = currTmps; _b < currTmps_1.length; _b++) {
                                var e = currTmps_1[_b];
                                if (e) {
                                    pxtc.oops("uses: " + e.currUses + "/" + e.totalUses + " " + e.toString());
                                }
                            }
                            break;
                        case pxtc.ir.SK.Jmp:
                            emitJmp(s);
                            break;
                        case pxtc.ir.SK.Label:
                            writeRaw(s.lblName + ":");
                            break;
                        case pxtc.ir.SK.Breakpoint:
                            break;
                        default: pxtc.oops();
                    }
                }
                write("ret " + proc.args.length + ", " + numLoc);
            }
            function emitJmp(jmp) {
                var trg = jmp.lbl.lblName;
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    write("jmp " + trg);
                }
                else {
                    emitExpr(jmp.expr);
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        write("jmpnz " + trg);
                    }
                    else if (jmp.jmpMode == pxtc.ir.JmpMode.IfZero) {
                        write("jmpz " + trg);
                    }
                    else {
                        pxtc.oops();
                    }
                }
            }
            function cellref(cell) {
                if (cell.isGlobal()) {
                    pxtc.U.assert((cell.index & 3) == 0);
                    return ("glb " + (cell.index >> 2) + (" ; " + cell.getName()));
                }
                else if (cell.iscap)
                    return ("cap " + cell.index + (" ; " + cell.getName()));
                else if (cell.isarg) {
                    var idx = proc.args.length - cell.index - 1;
                    pxtc.assert(idx >= 0, "arg#" + idx);
                    return ("loc " + (argDepth + numLoc + 2 + idx) + " ; " + cell.getName());
                }
                else {
                    var idx = cell.index + currTmps.length;
                    //console.log(proc.locals.length, currTmps.length, cell.index)
                    pxtc.assert(!final || idx < numLoc, "cell#" + idx);
                    pxtc.assert(idx >= 0, "cell#" + idx);
                    return ("loc " + (argDepth + idx));
                }
            }
            function callRT(name) {
                var inf = pxtc.hex.lookupFunc(name);
                if (!inf)
                    pxtc.U.oops("missing function: " + name);
                var id = ctx.opcodeMap[inf.name];
                if (id == null) {
                    id = ctx.opcodes.length;
                    ctx.opcodes.push(inf.name);
                    ctx.opcodeMap[inf.name] = id;
                    inf.value = id;
                }
                write("callrt " + name);
            }
            function emitInstanceOf(info, tp) {
                if (tp == "bool") {
                    write("checkinst " + info.id + "_VT");
                }
                else if (tp == "validate") {
                    pxtc.U.oops();
                }
                else {
                    pxtc.U.oops();
                }
            }
            function emitExprInto(e) {
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                        var tagged = pxtc.taggedSpecial(e.data);
                        if (tagged != null)
                            write("ldspecial " + tagged + " ; " + e.data);
                        else {
                            var n = e.data;
                            var n0 = 0, n1 = 0;
                            if ((n | 0) == n) {
                                if (Math.abs(n) <= immMax) {
                                    if (n < 0)
                                        write("ldintneg " + -n);
                                    else
                                        write("ldint " + n);
                                    return;
                                }
                                else {
                                    n0 = ((n << 1) | 1) >>> 0;
                                    n1 = n < 0 ? 1 : 0;
                                }
                            }
                            else {
                                var a = new Float64Array(1);
                                a[0] = n;
                                var u = new Uint32Array(a.buffer);
                                u[1] += 0x10000;
                                n0 = u[0];
                                n1 = u[1];
                            }
                            var key = n0 + "," + n1;
                            var id = pxtc.U.lookup(ctx.dbls, key);
                            if (id == null) {
                                id = ctx.dblText.length;
                                ctx.dblText.push(".word " + n0 + ", " + n1 + "  ; " + id + ": " + e.data);
                                ctx.dbls[key] = id;
                            }
                            write("ldnumber " + id + " ; " + e.data);
                        }
                        return;
                    case EK.PointerLiteral:
                        write("ldlit " + e.data);
                        return;
                    case EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx = currTmps.indexOf(arg);
                        if (idx < 0) {
                            console.log(currTmps, arg);
                            pxtc.assert(false);
                        }
                        write("ldloc " + (idx + argDepth) + (arg.currUses == arg.totalUses ? " ; LAST" : ""));
                        clearStack();
                        return;
                    case EK.CellRef:
                        write("ld" + cellref(e.data));
                        var cell = e.data;
                        if (cell.isGlobal()) {
                            // TODO
                            if (cell.bitSize == 1 /* Int8 */) {
                                write("sgnext");
                            }
                            else if (cell.bitSize == 2 /* UInt8 */) {
                                write("clrhi");
                            }
                        }
                        return;
                    case EK.InstanceOf:
                        emitExpr(e.args[0]);
                        emitInstanceOf(e.data, e.jsInfo);
                        break;
                    default: throw pxtc.oops("kind: " + e.exprKind);
                }
            }
            // result in R0
            function emitExpr(e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                switch (e.exprKind) {
                    case EK.JmpValue:
                        write("; jmp value (already in r0)");
                        break;
                    case EK.Nop:
                        write("; nop");
                        break;
                    case EK.FieldAccess:
                        var info = e.data;
                        emitExpr(e.args[0]);
                        write("ldfld " + info.idx + ", " + info.classInfo.id + "_VT");
                        break;
                    case EK.Store:
                        return emitStore(e.args[0], e.args[1]);
                    case EK.RuntimeCall:
                        return emitRtCall(e);
                    case EK.ProcCall:
                        return emitProcCall(e);
                    case EK.SharedDef:
                        return emitSharedDef(e);
                    case EK.Sequence:
                        return e.args.forEach(emitExpr);
                    default:
                        return emitExprInto(e);
                }
            }
            function emitSharedDef(e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                alltmps.push(arg);
                if (arg.totalUses == 1)
                    return emitExpr(arg);
                else {
                    emitExpr(arg);
                    var idx = -1;
                    for (var i = 0; i < currTmps.length; ++i)
                        if (currTmps[i] == null) {
                            idx = i;
                            break;
                        }
                    if (idx < 0) {
                        if (final) {
                            console.log(arg, currTmps);
                            pxtc.assert(false, "missed tmp");
                        }
                        idx = currTmps.length;
                        currTmps.push(arg);
                    }
                    else {
                        currTmps[idx] = arg;
                    }
                    write("stloc " + (idx + argDepth));
                }
            }
            function push() {
                write("push");
                argDepth++;
            }
            function emitRtCall(topExpr) {
                var name = topExpr.data;
                if (name == "pxt::beginTry") {
                    write("try " + topExpr.args[0].data);
                    return;
                }
                name = pxtc.U.lookup(vmCallMap, name) || name;
                clearStack();
                var spec = pxtc.U.lookup(vmSpecOpcodes, name);
                var args = topExpr.args;
                var numPush = 0;
                if (name == "pxt::mkClassInstance") {
                    write("newobj " + args[0].data);
                    return;
                }
                for (var i = 0; i < args.length; ++i) {
                    emitExpr(args[i]);
                    if (i < args.length - 1) {
                        push();
                        numPush++;
                    }
                }
                //let inf = hex.lookupFunc(name)
                if (name == "langsupp::ignore") {
                    if (numPush)
                        write("popmany " + numPush + " ; ignore");
                }
                else if (spec) {
                    write(spec);
                }
                else {
                    callRT(name);
                }
                argDepth -= numPush;
            }
            function clearStack() {
                for (var i = 0; i < currTmps.length; ++i) {
                    var e = currTmps[i];
                    if (e && e.currUses == e.totalUses) {
                        if (!final)
                            alltmps.push(e);
                        currTmps[i] = null;
                    }
                }
            }
            function emitProcCall(topExpr) {
                var calledProcId = topExpr.data;
                var calledProc = calledProcId.proc;
                if (calledProc && calledProc.inlineBody)
                    return emitExpr(calledProc.inlineSelf(topExpr.args));
                var numPush = 0;
                var args = topExpr.args.slice();
                var lambdaArg = calledProcId.virtualIndex == -1 ? args.shift() : null;
                for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
                    var e = args_1[_i];
                    emitExpr(e);
                    push();
                    numPush++;
                }
                var nargs = args.length;
                if (lambdaArg) {
                    emitExpr(lambdaArg);
                    write("callind " + nargs);
                }
                else if (calledProcId.ifaceIndex != null) {
                    var idx = calledProcId.ifaceIndex + " ; ." + bin.ifaceMembers[calledProcId.ifaceIndex];
                    if (/Set/.test(calledProcId.mapMethod)) {
                        write("callset " + idx);
                        pxtc.U.assert(nargs == 2);
                    }
                    else if (/Get/.test(calledProcId.mapMethod)) {
                        write("callget " + idx);
                        pxtc.U.assert(nargs == 1);
                    }
                    else
                        write("calliface " + nargs + ", " + idx);
                }
                else if (calledProcId.virtualIndex != null) {
                    pxtc.U.oops();
                }
                else {
                    write("callproc " + calledProc.label());
                }
                argDepth -= numPush;
            }
            function emitStore(trg, src) {
                switch (trg.exprKind) {
                    case EK.CellRef:
                        emitExpr(src);
                        var cell = trg.data;
                        var instr = "st" + cellref(cell);
                        if (cell.isGlobal() &&
                            (cell.bitSize == 1 /* Int8 */ || cell.bitSize == 2 /* UInt8 */)) {
                            instr = instr.replace("stglb", "stglb1");
                        }
                        write(instr);
                        break;
                    case EK.FieldAccess:
                        var info = trg.data;
                        emitExpr(trg.args[0]);
                        push();
                        emitExpr(src);
                        write("stfld " + info.idx + ", " + info.classInfo.id + "_VT");
                        argDepth--;
                        break;
                    default: pxtc.oops();
                }
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var decompiler;
        (function (decompiler) {
            var DecompileParamKeys;
            (function (DecompileParamKeys) {
                // Field editor should decompile literal expressions in addition to
                // call expressions
                DecompileParamKeys["DecompileLiterals"] = "decompileLiterals";
                // Tagged template name expected by a field editor for a parameter
                // (i.e. for tagged templates with blockIdentity set)
                DecompileParamKeys["TaggedTemplate"] = "taggedTemplate";
                // Allow for arguments for which fixed instances exist to be decompiled
                // even if the expression is not a direct reference to a fixed instance
                DecompileParamKeys["DecompileIndirectFixedInstances"] = "decompileIndirectFixedInstances";
            })(DecompileParamKeys = decompiler.DecompileParamKeys || (decompiler.DecompileParamKeys = {}));
            decompiler.FILE_TOO_LARGE_CODE = 9266;
            decompiler.DECOMPILER_ERROR = 9267;
            var SK = ts.SyntaxKind;
            /**
             * Max number of blocks before we bail out of decompilation
             */
            var MAX_BLOCKS = 1500;
            var lowerCaseAlphabetStartCode = 97;
            var lowerCaseAlphabetEndCode = 122;
            // Bounds for decompilation of workspace comments
            var minCommentWidth = 160;
            var minCommentHeight = 120;
            var maxCommentWidth = 480;
            var maxCommentHeight = 360;
            var validStringRegex = /^[^\f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/;
            var arrayTypeRegex = /^(?:Array<(.+)>)|(?:(.+)\[\])$/;
            var numberType = "math_number";
            var minmaxNumberType = "math_number_minmax";
            var integerNumberType = "math_integer";
            var wholeNumberType = "math_whole_number";
            var stringType = "text";
            var booleanType = "logic_boolean";
            var ops = {
                "+": { type: "math_arithmetic", op: "ADD" },
                "-": { type: "math_arithmetic", op: "MINUS" },
                "/": { type: "math_arithmetic", op: "DIVIDE" },
                "*": { type: "math_arithmetic", op: "MULTIPLY" },
                "**": { type: "math_arithmetic", op: "POWER" },
                "%": { type: "math_modulo", leftName: "DIVIDEND", rightName: "DIVISOR" },
                "<": { type: "logic_compare", op: "LT" },
                "<=": { type: "logic_compare", op: "LTE" },
                ">": { type: "logic_compare", op: "GT" },
                ">=": { type: "logic_compare", op: "GTE" },
                "==": { type: "logic_compare", op: "EQ" },
                "===": { type: "logic_compare", op: "EQ" },
                "!=": { type: "logic_compare", op: "NEQ" },
                "!==": { type: "logic_compare", op: "NEQ" },
                "&&": { type: "logic_operation", op: "AND" },
                "||": { type: "logic_operation", op: "OR" },
            };
            /*
             * Matches a single line comment and extracts the text.
             * Breakdown:
             *     ^\s*     - matches leading whitespace
             *      \/\/s*  - matches double slash
             *      (.*)    - matches rest of the comment
             */
            var singleLineCommentRegex = /^\s*\/\/\s*(.*)$/;
            /*
             * Matches one line of a multi-line comment and extracts the text.
             * Breakdown:
             *      ^\s*                                        - matches leading whitespace
             *      (?:\/\*\*?)                                 - matches beginning of a multi-line comment (/* or /**)
             *      (?:\*)                                      - matches a single asterisk that might begin a line in the body of the comment
             *      (?:(?:(?:\/\*\*?)|(?:\*))(?!\/))            - combines the previous two regexes but does not match either if followed by a slash
             *      ^\s*(?:(?:(?:\/\*\*?)|(?:\*))(?!\/))?\s*    - matches all possible beginnings of a multi-line comment line (/*, /**, *, or just whitespace)
             *      (.*?)                                       - matches the text of the comment line
             *      (?:\*?\*\/)?$                               - matches the end of the multiline comment (one or two asterisks and a slash) or the end of a line within the comment
             */
            var multiLineCommentRegex = /^\s*(?:(?:(?:\/\*\*?)|(?:\*))(?!\/))?\s*(.*?)(?:\*?\*\/)?$/;
            var RenameMap = /** @class */ (function () {
                function RenameMap(renames) {
                    this.renames = renames;
                    this.renames.sort(function (a, b) { return a.span.start - b.span.start; });
                }
                RenameMap.prototype.getRenamesInSpan = function (start, end) {
                    var res = [];
                    for (var _i = 0, _a = this.renames; _i < _a.length; _i++) {
                        var rename = _a[_i];
                        if (rename.span.start > end) {
                            break;
                        }
                        else if (rename.span.start >= start) {
                            res.push(rename);
                        }
                    }
                    return res;
                };
                RenameMap.prototype.getRenameForPosition = function (position) {
                    for (var _i = 0, _a = this.renames; _i < _a.length; _i++) {
                        var rename = _a[_i];
                        if (rename.span.start > position) {
                            return undefined;
                        }
                        else if (rename.span.start === position) {
                            return rename;
                        }
                    }
                    return undefined;
                };
                return RenameMap;
            }());
            decompiler.RenameMap = RenameMap;
            /**
             * Uses the language service to ensure that there are no duplicate variable
             * names in the given file. All variables in Blockly are global, so this is
             * necessary to prevent local variables from colliding.
             */
            function buildRenameMap(p, s, takenNames) {
                if (takenNames === void 0) { takenNames = {}; }
                var service = ts.createLanguageService(new pxtc.LSHost(p));
                var allRenames = [];
                var names = collectNameCollisions();
                return [new RenameMap(allRenames), names];
                function collectNameCollisions() {
                    checkChildren(s);
                    function checkChildren(n) {
                        ts.forEachChild(n, function (child) {
                            if (child.kind === SK.VariableDeclaration && child.name.kind === SK.Identifier) {
                                var name_1 = child.name.getText();
                                if (takenNames[name_1]) {
                                    var newName_1 = getNewName(name_1, takenNames);
                                    var renames = service.findRenameLocations(s.fileName, child.name.pos + 1, false, false);
                                    if (renames) {
                                        renames.forEach(function (r) {
                                            allRenames.push({
                                                name: newName_1,
                                                diff: newName_1.length - name_1.length,
                                                span: r.textSpan
                                            });
                                        });
                                    }
                                }
                                else {
                                    takenNames[name_1] = true;
                                }
                            }
                            checkChildren(child);
                        });
                    }
                    return takenNames;
                }
            }
            decompiler.buildRenameMap = buildRenameMap;
            function getNewName(name, takenNames) {
                // If the variable is a single lower case letter, try and rename it to a different letter (i.e. i -> j)
                if (name.length === 1) {
                    var charCode = name.charCodeAt(0);
                    if (charCode >= lowerCaseAlphabetStartCode && charCode <= lowerCaseAlphabetEndCode) {
                        var offset = charCode - lowerCaseAlphabetStartCode;
                        for (var i = 1; i < 26; i++) {
                            var newChar = String.fromCharCode(lowerCaseAlphabetStartCode + ((offset + i) % 26));
                            if (!takenNames[newChar]) {
                                takenNames[newChar] = true;
                                return newChar;
                            }
                        }
                    }
                }
                // For all other names, add a number to the end. Start at 2 because it probably makes more sense for kids
                for (var i = 2;; i++) {
                    var toTest = name + i;
                    if (!takenNames[toTest]) {
                        takenNames[toTest] = true;
                        return toTest;
                    }
                }
            }
            decompiler.getNewName = getNewName;
            var ReferenceType;
            (function (ReferenceType) {
                // Variable is never referenced
                ReferenceType[ReferenceType["None"] = 0] = "None";
                // Variable is only referenced in "non-grey" blocks
                ReferenceType[ReferenceType["InBlocksOnly"] = 1] = "InBlocksOnly";
                // Variable is referenced at least once inside "grey" blocks
                ReferenceType[ReferenceType["InTextBlocks"] = 2] = "InTextBlocks";
            })(ReferenceType || (ReferenceType = {}));
            function decompileToBlocks(blocksInfo, file, options, renameMap) {
                var emittedBlocks = 0;
                var stmts = file.statements;
                var result = {
                    blocksInfo: blocksInfo,
                    outfiles: {}, diagnostics: [], success: true, times: {}
                };
                var env = {
                    blocks: blocksInfo,
                    declaredFunctions: {},
                    declaredEnums: {},
                    declaredKinds: {},
                    functionParamIds: {},
                    attrs: attrs,
                    compInfo: compInfo,
                    localReporters: [],
                    opts: options || {}
                };
                var fileText = file.getFullText();
                var output = "";
                var enumMembers = [];
                var varUsages = {};
                var workspaceComments = [];
                var autoDeclarations = [];
                var getCommentRef = (function () { var currentCommentId = 0; return function () { return "" + currentCommentId++; }; })();
                var checkTopNode = function (topLevelNode) {
                    if (topLevelNode.kind === SK.FunctionDeclaration && !checkStatement(topLevelNode, env, false, true)) {
                        env.declaredFunctions[getVariableName(topLevelNode.name)] = topLevelNode;
                    }
                    else if (topLevelNode.kind === SK.EnumDeclaration && !checkStatement(topLevelNode, env, false, true)) {
                        var enumName_1 = topLevelNode.name.text;
                        env.declaredEnums[enumName_1] = true;
                        getEnumMembers(topLevelNode).forEach(function (_a) {
                            var name = _a[0], value = _a[1];
                            // We add the value to the front of the name because it needs to be maintained
                            // across compilation/decompilation just in case the code relies on the actual value.
                            // It's safe to do because enum members can't start with numbers.
                            enumMembers.push({
                                name: value + name,
                                type: enumName_1
                            });
                        });
                    }
                    else if (ts.isModuleDeclaration(topLevelNode) && !checkStatement(topLevelNode, env, false, true)) {
                        var kindName = topLevelNode.name.text;
                        var exported = getKindExports(topLevelNode);
                        if (env.declaredKinds[kindName]) {
                            (_a = env.declaredKinds[kindName].declaredNames).push.apply(_a, exported);
                        }
                    }
                    else if (topLevelNode.kind === SK.Block) {
                        ts.forEachChild(topLevelNode, checkTopNode);
                    }
                    var _a;
                };
                Object.keys(blocksInfo.kindsByName).forEach(function (k) {
                    var kindInfo = blocksInfo.kindsByName[k];
                    env.declaredKinds[k] = { kindInfo: kindInfo, declaredNames: [] };
                });
                ts.forEachChild(file, checkTopNode);
                // Generate fresh param IDs for all user-declared functions, needed when decompiling
                // function definition and calls. IDs don't need to be crypto secure.
                var genId = function () { return (Math.PI * Math.random()).toString(36).slice(2); };
                Object.keys(env.declaredFunctions).forEach(function (funcName) {
                    env.functionParamIds[funcName] = {};
                    env.declaredFunctions[funcName].parameters.forEach(function (p) {
                        env.functionParamIds[funcName][p.name.getText()] = genId() + genId();
                    });
                });
                Object.keys(env.declaredKinds).forEach(function (kindName) {
                    var kindType = "KIND_" + kindName;
                    env.declaredKinds[kindName].declaredNames.forEach(function (kindMember) { return enumMembers.push({
                        name: kindMember,
                        type: kindType
                    }); });
                });
                if (enumMembers.length) {
                    write("<variables>");
                    enumMembers.forEach(function (e) {
                        write("<variable type=\"" + pxtc.U.htmlEscape(e.type) + "\">" + pxtc.U.htmlEscape(e.name) + "</variable>");
                    });
                    write("</variables>");
                }
                var n;
                try {
                    n = codeBlock(stmts, undefined, true, undefined, !options.snippetMode);
                }
                catch (e) {
                    if (e.programTooLarge) {
                        result.success = false;
                        result.diagnostics = pxtc.patchUpDiagnostics([{
                                file: file,
                                start: file.getFullStart(),
                                length: file.getFullWidth(),
                                messageText: e.message,
                                category: ts.DiagnosticCategory.Error,
                                code: decompiler.FILE_TOO_LARGE_CODE
                            }]);
                    }
                    else {
                        // don't throw
                        pxt.reportException(e);
                        result.success = false;
                        result.diagnostics = pxtc.patchUpDiagnostics([{
                                file: file,
                                start: file.getFullStart(),
                                length: file.getFullWidth(),
                                messageText: e.message,
                                category: ts.DiagnosticCategory.Error,
                                code: decompiler.DECOMPILER_ERROR
                            }]);
                        return result;
                    }
                }
                if (n) {
                    emitStatementNode(n);
                }
                else if (!options.snippetMode && !stmts.length) {
                    write("<block type=\"" + ts.pxtc.ON_START_TYPE + "\"></block>");
                }
                workspaceComments.forEach(function (c) {
                    emitWorkspaceComment(c);
                });
                result.outfiles[file.fileName.replace(/(\.blocks)?\.\w*$/i, '') + '.blocks'] = "<xml xmlns=\"http://www.w3.org/1999/xhtml\">\n" + output + "</xml>";
                return result;
                function write(s, suffix) {
                    if (suffix === void 0) { suffix = "\n"; }
                    output += s + suffix;
                }
                function error(n, msg) {
                    var messageText = msg || "Language feature \"" + n.getFullText().trim() + "\"\" not supported in blocks";
                    var diags = pxtc.patchUpDiagnostics([{
                            file: file,
                            start: n.getFullStart(),
                            length: n.getFullWidth(),
                            messageText: messageText,
                            category: ts.DiagnosticCategory.Error,
                            code: 1001
                        }]);
                    pxt.debug("decompilation error: " + messageText);
                    pxtc.U.pushRange(result.diagnostics, diags);
                    result.success = false;
                }
                function attrs(callInfo) {
                    var blockInfo = blocksInfo.apis.byQName[callInfo.qName];
                    if (blockInfo) {
                        var attributes = blockInfo.attributes;
                        // Check to make sure this block wasn't filtered out (bannedCategories)
                        if (!attributes.blockId || blocksInfo.blocksById[attributes.blockId] || attributes.blockId === pxtc.PAUSE_UNTIL_TYPE) {
                            return blockInfo.attributes;
                        }
                    }
                    return {
                        paramDefl: {},
                        callingConvention: 0 /* Plain */
                    };
                }
                function compInfo(callInfo) {
                    var blockInfo = blocksInfo.apis.byQName[callInfo.qName];
                    if (blockInfo) {
                        return pxt.blocks.compileInfo(blockInfo);
                    }
                    return undefined;
                }
                function countBlock() {
                    emittedBlocks++;
                    if (emittedBlocks > MAX_BLOCKS) {
                        var e = new Error(pxtc.Util.lf("Could not decompile because the script is too large"));
                        e.programTooLarge = true;
                        throw e;
                    }
                }
                function mkStmt(type) {
                    return {
                        kind: "statement",
                        type: type
                    };
                }
                function mkExpr(type) {
                    return {
                        kind: "expr",
                        type: type
                    };
                }
                function mkValue(name, value, shadowType, shadowMutation) {
                    if ((!shadowType || shadowType === numberType) && shadowMutation && shadowMutation['min'] && shadowMutation['max']) {
                        // Convert a number to a number with a slider (math_number_minmax) if min and max shadow options are defined
                        shadowType = minmaxNumberType;
                    }
                    return { kind: "value", name: name, value: value, shadowType: shadowType, shadowMutation: shadowMutation };
                }
                function isEventExpression(expr) {
                    if (expr.expression.kind == SK.CallExpression) {
                        var call = expr.expression;
                        var callInfo = pxtc.pxtInfo(call).callInfo;
                        if (!callInfo) {
                            error(expr);
                            return false;
                        }
                        var attributes = attrs(callInfo);
                        return attributes.blockId && !attributes.handlerStatement && !callInfo.isExpression && hasStatementInput(callInfo, attributes);
                    }
                    return false;
                }
                function emitStatementNode(n) {
                    if (!n) {
                        return;
                    }
                    openBlockTag(n.type);
                    emitBlockNodeCore(n);
                    if (n.data !== undefined) {
                        write("<data>" + pxtc.U.htmlEscape(n.data) + "</data>");
                    }
                    if (n.handlers) {
                        n.handlers.forEach(emitHandler);
                    }
                    if (n.next) {
                        write("<next>");
                        emitStatementNode(n.next);
                        write("</next>");
                    }
                    if (n.comment !== undefined) {
                        write("<comment pinned=\"false\">" + pxtc.U.htmlEscape(n.comment) + "</comment>");
                    }
                    closeBlockTag();
                }
                function emitMutation(mMap, mChildren) {
                    write("<mutation ", "");
                    Object.keys(mMap).forEach(function (key) {
                        if (mMap[key] !== undefined) {
                            write(key + "=\"" + mMap[key] + "\" ", "");
                        }
                    });
                    if (mChildren) {
                        write(">");
                        mChildren.forEach(function (c) {
                            write("<" + c.nodeName + " ", "");
                            Object.keys(c.attributes).forEach(function (attrName) {
                                write(attrName + "=\"" + c.attributes[attrName] + "\" ", "");
                            });
                            write("/>");
                        });
                        write("</mutation>");
                    }
                    else {
                        write("/>");
                    }
                }
                function emitBlockNodeCore(n) {
                    if (n.mutation) {
                        emitMutation(n.mutation, n.mutationChildren);
                    }
                    if (n.fields) {
                        n.fields.forEach(emitFieldNode);
                    }
                    if (n.inputs) {
                        n.inputs.forEach(emitValueNode);
                    }
                }
                function emitValueNode(n) {
                    write("<value name=\"" + n.name + "\">");
                    var emitShadowOnly = false;
                    if (n.value.kind === "expr") {
                        var value = n.value;
                        if (value.type === numberType && n.shadowType === minmaxNumberType) {
                            value.type = minmaxNumberType;
                            value.fields[0].name = 'SLIDER';
                            value.mutation = n.shadowMutation;
                        }
                        emitShadowOnly = value.type === n.shadowType;
                        if (!emitShadowOnly) {
                            switch (value.type) {
                                case "math_number":
                                case "math_number_minmax":
                                case "math_integer":
                                case "math_whole_number":
                                case "logic_boolean":
                                case "text":
                                    emitShadowOnly = !n.shadowType;
                                    break;
                            }
                        }
                    }
                    if (emitShadowOnly) {
                        emitOutputNode(n.value, true);
                    }
                    else {
                        // Emit a shadow block to appear if the given input is removed
                        if (n.shadowType !== undefined) {
                            switch (n.shadowType) {
                                case numberType:
                                case integerNumberType:
                                case wholeNumberType:
                                    write("<shadow type=\"" + n.shadowType + "\"><field name=\"NUM\">0</field></shadow>");
                                    break;
                                case minmaxNumberType:
                                    write("<shadow type=\"" + minmaxNumberType + "\">");
                                    if (n.shadowMutation) {
                                        emitMutation(n.shadowMutation);
                                    }
                                    write("<field name=\"SLIDER\">0</field></shadow>");
                                    break;
                                case booleanType:
                                    write("<shadow type=\"" + booleanType + "\"><field name=\"BOOL\">TRUE</field></shadow>");
                                    break;
                                case stringType:
                                    write("<shadow type=\"" + stringType + "\"><field name=\"TEXT\"></field></shadow>");
                                    break;
                                default:
                                    write("<shadow type=\"" + n.shadowType + "\"/>");
                            }
                        }
                        emitOutputNode(n.value);
                    }
                    write("</value>");
                }
                function emitFieldNode(n) {
                    write("<field name=\"" + pxtc.U.htmlEscape(n.name) + "\">" + pxtc.U.htmlEscape(n.value.toString()) + "</field>");
                }
                function emitHandler(h) {
                    write("<statement name=\"" + pxtc.U.htmlEscape(h.name) + "\">");
                    emitStatementNode(h.statement);
                    write("</statement>");
                }
                function emitOutputNode(n, shadow) {
                    if (shadow === void 0) { shadow = false; }
                    if (n.kind === "text") {
                        var node = n;
                        write(node.value);
                    }
                    else {
                        var node = n;
                        var isShadow = shadow || node.isShadow;
                        var tag = isShadow ? "shadow" : "block";
                        if (!isShadow) {
                            countBlock();
                        }
                        write("<" + tag + " type=\"" + pxtc.U.htmlEscape(node.type) + "\">");
                        emitBlockNodeCore(node);
                        write("</" + tag + ">");
                    }
                }
                function openBlockTag(type) {
                    countBlock();
                    write("<block type=\"" + pxtc.U.htmlEscape(type) + "\">");
                }
                function closeBlockTag() {
                    write("</block>");
                }
                function emitWorkspaceComment(comment) {
                    var maxLineLength = 0;
                    var lines = comment.text.split("\n");
                    lines.forEach(function (line) { return maxLineLength = Math.max(maxLineLength, line.length); });
                    // These are just approximations but they are the best we can do outside the DOM
                    var width = Math.max(Math.min(maxLineLength * 10, maxCommentWidth), minCommentWidth);
                    var height = Math.max(Math.min(lines.length * 40, maxCommentHeight), minCommentHeight);
                    write("<comment h=\"" + height + "\" w=\"" + width + "\" data=\"" + pxtc.U.htmlEscape(comment.refId) + "\">");
                    write(pxtc.U.htmlEscape(comment.text));
                    write("</comment>");
                }
                function getOutputBlock(n) {
                    if (checkExpression(n, env)) {
                        return getTypeScriptExpressionBlock(n);
                    }
                    else {
                        switch (n.kind) {
                            case SK.ExpressionStatement:
                                return getOutputBlock(n.expression);
                            case SK.ParenthesizedExpression:
                                return getOutputBlock(n.expression);
                            case SK.Identifier:
                                return getIdentifier(n);
                            case SK.StringLiteral:
                            case SK.FirstTemplateToken:
                            case SK.NoSubstitutionTemplateLiteral:
                                return getStringLiteral(n.text);
                            case SK.NumericLiteral:
                                return getNumericLiteral(n.text);
                            case SK.TrueKeyword:
                                return getBooleanLiteral(true);
                            case SK.FalseKeyword:
                                return getBooleanLiteral(false);
                            case SK.BinaryExpression:
                                return getBinaryExpression(n);
                            case SK.PrefixUnaryExpression:
                                return getPrefixUnaryExpression(n);
                            case SK.PropertyAccessExpression:
                                return getPropertyAccessExpression(n);
                            case SK.ArrayLiteralExpression:
                                return getArrayLiteralExpression(n);
                            case SK.ElementAccessExpression:
                                return getElementAccessExpression(n);
                            case SK.TaggedTemplateExpression:
                                return getTaggedTemplateExpression(n);
                            case SK.CallExpression:
                                return getStatementBlock(n, undefined, undefined, true);
                            default:
                                error(n, pxtc.Util.lf("Unsupported syntax kind for output expression block: {0}", SK[n.kind]));
                                break;
                        }
                        return undefined;
                    }
                }
                function applyRenamesInRange(text, start, end) {
                    if (renameMap) {
                        var renames = renameMap.getRenamesInSpan(start, end);
                        if (renames.length) {
                            var offset_1 = 0;
                            renames.forEach(function (rename) {
                                var sIndex = rename.span.start + offset_1 - start;
                                var eIndex = sIndex + rename.span.length;
                                offset_1 += rename.diff;
                                text = text.slice(0, sIndex) + rename.name + text.slice(eIndex);
                            });
                        }
                    }
                    return text;
                }
                function getTypeScriptExpressionBlock(n) {
                    var text = applyRenamesInRange(n.getFullText(), n.getFullStart(), n.getEnd()).trim();
                    trackVariableUsagesInText(n);
                    return getFieldBlock(pxtc.TS_OUTPUT_TYPE, "EXPRESSION", text);
                }
                function getBinaryExpression(n) {
                    var op = n.operatorToken.getText();
                    var npp = ops[op];
                    // Could be string concatenation
                    if (isTextJoin(n)) {
                        return getTextJoin(n);
                    }
                    var leftName = npp.leftName || "A";
                    var rightName = npp.rightName || "B";
                    var leftValue;
                    var rightValue;
                    if (op === "&&" || op === "||") {
                        leftValue = getConditionalInput(leftName, n.left);
                        rightValue = getConditionalInput(rightName, n.right);
                    }
                    else {
                        leftValue = getValue(leftName, n.left, numberType);
                        rightValue = getValue(rightName, n.right, numberType);
                    }
                    var result = mkExpr(npp.type);
                    result.fields = [];
                    if (npp.op) {
                        result.fields.push(getField("OP", npp.op));
                    }
                    result.inputs = [leftValue, rightValue];
                    return result;
                }
                function isTextJoin(n) {
                    if (n.kind === SK.BinaryExpression) {
                        var b = n;
                        if (b.operatorToken.getText() === "+" || b.operatorToken.kind == SK.PlusEqualsToken) {
                            var info = pxtc.pxtInfo(n).exprInfo;
                            return !!info;
                        }
                    }
                    return false;
                }
                function collectTextJoinArgs(n, result) {
                    if (isTextJoin(n)) {
                        collectTextJoinArgs(n.left, result);
                        collectTextJoinArgs(n.right, result);
                    }
                    else {
                        result.push(n);
                    }
                }
                function getTextJoin(n) {
                    var args = [];
                    collectTextJoinArgs(n, args);
                    var result = mkExpr("text_join");
                    result.mutation = {
                        "items": args.length.toString()
                    };
                    result.inputs = [];
                    for (var i = 0; i < args.length; i++) {
                        result.inputs.push(getValue("ADD" + i, args[i], stringType));
                    }
                    return result;
                }
                function getValue(name, contents, shadowType, shadowMutation) {
                    var value;
                    if (typeof contents === "number") {
                        value = getNumericLiteral(contents.toString());
                    }
                    else if (typeof contents === "boolean") {
                        value = getBooleanLiteral(contents);
                    }
                    else if (typeof contents === "string") {
                        value = getStringLiteral(contents);
                    }
                    else {
                        value = getOutputBlock(contents);
                    }
                    if (value.kind == "expr" && value.type == "math_number") {
                        var actualValue = value.fields[0].value;
                        if (shadowType == "math_integer" && actualValue % 1 === 0)
                            value.type = "math_integer";
                        if (shadowType == "math_whole_number" && actualValue % 1 === 0 && actualValue > 0)
                            value.type = "math_whole_number";
                    }
                    return mkValue(name, value, shadowType, shadowMutation);
                }
                function getIdentifier(identifier) {
                    var name = getVariableName(identifier);
                    var oldName = identifier.text;
                    var localReporterArg = null;
                    env.localReporters.some(function (scope) {
                        for (var i = 0; i < scope.length; ++i) {
                            if (scope[i].name === oldName) {
                                localReporterArg = scope[i];
                                return true;
                            }
                        }
                        return false;
                    });
                    if (localReporterArg) {
                        return getDraggableReporterBlock(name, localReporterArg.type, false);
                    }
                    else {
                        trackVariableUsage(name, ReferenceType.InBlocksOnly);
                        return getFieldBlock("variables_get", "VAR", name);
                    }
                }
                function getNumericLiteral(value) {
                    return getFieldBlock("math_number", "NUM", value);
                }
                function getStringLiteral(value) {
                    return getFieldBlock("text", "TEXT", value);
                }
                function getBooleanLiteral(value) {
                    return getFieldBlock("logic_boolean", "BOOL", value ? "TRUE" : "FALSE");
                }
                function getFieldBlock(type, fieldName, value, isShadow) {
                    var r = mkExpr(type);
                    r.fields = [getField(fieldName, value)];
                    r.isShadow = isShadow;
                    return r;
                }
                function getDraggableVariableBlock(valueName, varName) {
                    return mkValue(valueName, getFieldBlock("variables_get_reporter", "VAR", varName, true), "variables_get_reporter");
                }
                function mkDraggableReporterValue(valueName, varName, varType) {
                    var reporterType = pxt.blocks.reporterTypeForArgType(varType);
                    var reporterShadowBlock = getDraggableReporterBlock(varName, varType, true);
                    return mkValue(valueName, reporterShadowBlock, reporterType);
                }
                function getDraggableReporterBlock(varName, varType, shadow) {
                    var reporterType = pxt.blocks.reporterTypeForArgType(varType);
                    var reporterShadowBlock = getFieldBlock(reporterType, "VALUE", varName, shadow);
                    if (reporterType === "argument_reporter_custom") {
                        reporterShadowBlock.mutation = { typename: varType };
                    }
                    return reporterShadowBlock;
                }
                function getField(name, value) {
                    return {
                        kind: "field",
                        name: name,
                        value: value,
                    };
                }
                // TODO: Add a real negation block
                function negateNumericNode(node) {
                    var r = mkExpr("math_arithmetic");
                    r.inputs = [
                        getValue("A", 0, numberType),
                        getValue("B", node, numberType)
                    ];
                    r.fields = [getField("OP", "MINUS")];
                    return r;
                }
                function getPrefixUnaryExpression(node) {
                    switch (node.operator) {
                        case SK.ExclamationToken:
                            var r = mkExpr("logic_negate");
                            r.inputs = [getConditionalInput("BOOL", node.operand)];
                            return r;
                        case SK.PlusToken:
                            return getOutputBlock(node.operand);
                        case SK.MinusToken:
                            if (node.operand.kind == SK.NumericLiteral) {
                                return getNumericLiteral("-" + node.operand.text);
                            }
                            else {
                                return negateNumericNode(node.operand);
                            }
                        default:
                            error(node);
                            break;
                    }
                    return undefined;
                }
                function getPropertyAccessExpression(n, asField, blockId) {
                    if (asField === void 0) { asField = false; }
                    var callInfo = pxtc.pxtInfo(n).callInfo;
                    if (!callInfo) {
                        error(n);
                        return undefined;
                    }
                    if (n.expression.kind === SK.Identifier) {
                        var enumName = n.expression.text;
                        if (env.declaredEnums[enumName]) {
                            var enumInfo = blocksInfo.enumsByName[enumName];
                            if (enumInfo && enumInfo.blockId) {
                                return getFieldBlock(enumInfo.blockId, "MEMBER", n.name.text);
                            }
                        }
                        else if (env.declaredKinds[enumName]) {
                            var info_3 = env.declaredKinds[enumName];
                            return getFieldBlock(info_3.kindInfo.blockId, "MEMBER", n.name.text);
                        }
                    }
                    var attributes = attrs(callInfo);
                    blockId = attributes.blockId || blockId;
                    if (attributes.blockCombine)
                        return getPropertyGetBlock(n);
                    if (attributes.blockId === "lists_length" || attributes.blockId === "text_length") {
                        var r_1 = mkExpr(pxtc.U.htmlEscape(attributes.blockId));
                        r_1.inputs = [getValue("VALUE", n.expression)];
                        return r_1;
                    }
                    var value = pxtc.U.htmlEscape(attributes.blockId || callInfo.qName);
                    var parent = getParent(n)[0];
                    var parentCallInfo = parent && pxtc.pxtInfo(parent).callInfo;
                    if (asField || !(blockId || attributes.blockIdentity) || parentCallInfo && parentCallInfo.qName === attributes.blockIdentity) {
                        return {
                            kind: "text",
                            value: value
                        };
                    }
                    if (attributes.enumval && parentCallInfo && attributes.useEnumVal) {
                        value = attributes.enumval;
                    }
                    var info = env.compInfo(callInfo);
                    if (blockId && info.thisParameter) {
                        var r_2 = mkExpr(blockId);
                        r_2.inputs = [getValue(pxtc.U.htmlEscape(info.thisParameter.definitionName), n.expression, info.thisParameter.shadowBlockId)];
                        return r_2;
                    }
                    var idfn = attributes.blockIdentity ? blocksInfo.apis.byQName[attributes.blockIdentity] : blocksInfo.blocksById[blockId];
                    var f = /%([a-zA-Z0-9_]+)/.exec(idfn.attributes.block);
                    var r = mkExpr(pxtc.U.htmlEscape(idfn.attributes.blockId));
                    r.fields = [{
                            kind: "field",
                            name: pxtc.U.htmlEscape(f[1]),
                            value: value
                        }];
                    return r;
                }
                function getArrayLiteralExpression(n) {
                    var r = mkExpr("lists_create_with");
                    r.inputs = n.elements.map(function (e, i) { return getValue("ADD" + i, e); });
                    r.mutation = {
                        "items": n.elements.length.toString()
                    };
                    return r;
                }
                function getElementAccessExpression(n) {
                    var r = mkExpr("lists_index_get");
                    r.inputs = [getValue("LIST", n.expression), getValue("INDEX", n.argumentExpression, numberType)];
                    return r;
                }
                function getTaggedTemplateExpression(t) {
                    var callInfo = pxtc.pxtInfo(t).callInfo;
                    var api;
                    var paramInfo = getParentParameterInfo(t);
                    if (paramInfo && paramInfo.shadowBlockId) {
                        var shadow = env.blocks.blocksById[paramInfo.shadowBlockId];
                        if (shadow && shadow.attributes.shim === "TD_ID") {
                            api = shadow;
                        }
                    }
                    if (!api) {
                        api = env.blocks.apis.byQName[attrs(callInfo).blockIdentity];
                    }
                    var comp = pxt.blocks.compileInfo(api);
                    var r = mkExpr(api.attributes.blockId);
                    var text = t.template.text;
                    // This will always be a field and not a value because we only allow no-substitution templates
                    r.fields = [getField(comp.parameters[0].actualName, text)];
                    return r;
                }
                function getParentParameterInfo(n) {
                    if (n.parent && n.parent.kind === SK.CallExpression) {
                        var call = n.parent;
                        var info = pxtc.pxtInfo(call).callInfo;
                        var index = call.arguments.indexOf(n);
                        if (info && index !== -1) {
                            var blockInfo = blocksInfo.apis.byQName[info.qName];
                            if (blockInfo) {
                                var comp = pxt.blocks.compileInfo(blockInfo);
                                return comp && comp.parameters[index];
                            }
                        }
                    }
                    return undefined;
                }
                function getStatementBlock(n, next, parent, asExpression, topLevel) {
                    if (asExpression === void 0) { asExpression = false; }
                    if (topLevel === void 0) { topLevel = false; }
                    var node = n;
                    var stmt;
                    var skipComments = false;
                    var err = checkStatement(node, env, asExpression, topLevel);
                    if (err) {
                        stmt = getTypeScriptStatementBlock(node, undefined, err);
                    }
                    else {
                        switch (node.kind) {
                            case SK.Block:
                                return codeBlock(node.statements, next, topLevel);
                            case SK.ExpressionStatement:
                                return getStatementBlock(node.expression, next, parent || node, asExpression, topLevel);
                            case SK.VariableStatement:
                                stmt = codeBlock(node.declarationList.declarations, undefined, false, parent || node);
                                if (!stmt)
                                    return getNext();
                                // Comments are already gathered by the call to code block
                                skipComments = true;
                                break;
                            case SK.FunctionExpression:
                            case SK.ArrowFunction:
                                return getArrowFunctionStatement(node, next);
                            case SK.BinaryExpression:
                                stmt = getBinaryExpressionStatement(node);
                                break;
                            case SK.PostfixUnaryExpression:
                            case SK.PrefixUnaryExpression:
                                stmt = getIncrementStatement(node);
                                break;
                            case SK.VariableDeclaration:
                                var decl = node;
                                if (isAutoDeclaration(decl)) {
                                    // Don't emit null or automatic initializers;
                                    // They are implicit within the blocks. But do track them in case they
                                    // never get used in the blocks (and thus won't be emitted again)
                                    trackAutoDeclaration(decl);
                                    getComments(parent || node);
                                    return getNext();
                                }
                                stmt = getVariableDeclarationStatement(node);
                                break;
                            case SK.WhileStatement:
                                stmt = getWhileStatement(node);
                                break;
                            case SK.IfStatement:
                                stmt = getIfStatement(node);
                                break;
                            case SK.ForStatement:
                                stmt = getForStatement(node);
                                break;
                            case SK.ForOfStatement:
                                stmt = getForOfStatement(node);
                                break;
                            case SK.FunctionDeclaration:
                                stmt = getFunctionDeclaration(node);
                                break;
                            case SK.CallExpression:
                                stmt = getCallStatement(node, asExpression);
                                break;
                            case SK.DebuggerStatement:
                                stmt = getDebuggerStatementBlock(node);
                                break;
                            case SK.BreakStatement:
                                stmt = getBreakStatementBlock(node);
                                break;
                            case SK.ContinueStatement:
                                stmt = getContinueStatementBlock(node);
                                break;
                            case SK.EmptyStatement:
                                stmt = undefined; // don't generate blocks for empty statements
                                break;
                            case SK.EnumDeclaration:
                            case SK.ModuleDeclaration:
                                // If the enum declaration made it past the checker then it is emitted elsewhere
                                return getNext();
                            default:
                                if (next) {
                                    error(node, pxtc.Util.lf("Unsupported statement in block: {0}", SK[node.kind]));
                                }
                                else {
                                    error(node, pxtc.Util.lf("Statement kind unsupported in blocks: {0}", SK[node.kind]));
                                }
                                return undefined;
                        }
                    }
                    if (stmt) {
                        var end = stmt;
                        while (end.next) {
                            end = end.next;
                        }
                        end.next = getNext();
                        if (end.next) {
                            end.next.prev = end;
                        }
                    }
                    if (!skipComments) {
                        getComments(parent || node);
                    }
                    return stmt;
                    function getNext() {
                        if (next && next.length) {
                            return getStatementBlock(next.shift(), next, undefined, false, topLevel);
                        }
                        return undefined;
                    }
                    function getComments(commented) {
                        var commentRanges = ts.getLeadingCommentRangesOfNode(commented, file);
                        if (commentRanges) {
                            var wsCommentRefs = [];
                            var commentText = getCommentText(commentRanges, node, wsCommentRefs);
                            if (stmt) {
                                if (wsCommentRefs.length) {
                                    stmt.data = wsCommentRefs.join(";");
                                }
                                if (commentText && stmt) {
                                    stmt.comment = commentText;
                                }
                                else {
                                    // ERROR TODO
                                }
                            }
                        }
                    }
                }
                function getTypeScriptStatementBlock(node, prefix, err) {
                    if (options.errorOnGreyBlocks)
                        error(node);
                    var r = mkStmt(pxtc.TS_STATEMENT_TYPE);
                    r.mutation = {};
                    trackVariableUsagesInText(node);
                    var text = node.getText();
                    var start = node.getStart();
                    var end = node.getEnd();
                    text = applyRenamesInRange(text, start, end);
                    if (prefix) {
                        text = prefix + text;
                    }
                    var declaredVariables = [];
                    if (node.kind === SK.VariableStatement) {
                        for (var _i = 0, _a = node.declarationList.declarations; _i < _a.length; _i++) {
                            var declaration = _a[_i];
                            declaredVariables.push(getVariableName(declaration.name));
                        }
                    }
                    else if (node.kind === SK.VariableDeclaration) {
                        declaredVariables.push(getVariableName(node.name));
                    }
                    if (declaredVariables.length) {
                        r.mutation["declaredvars"] = declaredVariables.join(",");
                    }
                    var parts = text.split("\n");
                    r.mutation["numlines"] = parts.length.toString();
                    if (err && options.includeGreyBlockMessages) {
                        r.mutation["error"] = pxtc.U.htmlEscape(err);
                    }
                    parts.forEach(function (p, i) {
                        r.mutation["line" + i] = pxtc.U.htmlEscape(p);
                    });
                    return r;
                }
                function getContinueStatementBlock(node) {
                    var r = mkStmt(pxtc.TS_CONTINUE_TYPE);
                    return r;
                }
                function getBreakStatementBlock(node) {
                    var r = mkStmt(pxtc.TS_BREAK_TYPE);
                    return r;
                }
                function getDebuggerStatementBlock(node) {
                    var r = mkStmt(pxtc.TS_DEBUGGER_TYPE);
                    return r;
                }
                function getImageLiteralStatement(node, info) {
                    var arg = node.arguments[0];
                    if (arg.kind != SK.StringLiteral && arg.kind != SK.NoSubstitutionTemplateLiteral) {
                        error(node);
                        return undefined;
                    }
                    var attributes = attrs(info);
                    var res = mkStmt(attributes.blockId);
                    res.fields = [];
                    var leds = (arg.text || '').replace(/\s+/g, '');
                    var nc = attributes.imageLiteral * 5;
                    if (nc * 5 != leds.length) {
                        error(node, pxtc.Util.lf("Invalid image pattern"));
                        return undefined;
                    }
                    var ledString = '';
                    for (var r = 0; r < 5; ++r) {
                        for (var c = 0; c < nc; ++c) {
                            ledString += /[#*1]/.test(leds[r * nc + c]) ? '#' : '.';
                        }
                        ledString += '\n';
                    }
                    res.fields.push(getField("LEDS", "`" + ledString + "`"));
                    return res;
                }
                function getBinaryExpressionStatement(n) {
                    var name = n.left.text;
                    switch (n.operatorToken.kind) {
                        case SK.EqualsToken:
                            if (n.left.kind === SK.Identifier) {
                                return getVariableSetOrChangeBlock(n.left, n.right);
                            }
                            else if (n.left.kind == SK.PropertyAccessExpression) {
                                return getPropertySetBlock(n.left, n.right, "@set@");
                            }
                            else {
                                return getArraySetBlock(n.left, n.right);
                            }
                        case SK.PlusEqualsToken:
                            if (isTextJoin(n)) {
                                var r_3 = mkStmt("variables_set");
                                var renamed = getVariableName(n.left);
                                trackVariableUsage(renamed, ReferenceType.InBlocksOnly);
                                r_3.inputs = [mkValue("VALUE", getTextJoin(n), numberType)];
                                r_3.fields = [getField("VAR", renamed)];
                                return r_3;
                            }
                            if (n.left.kind == SK.PropertyAccessExpression)
                                return getPropertySetBlock(n.left, n.right, "@change@");
                            else
                                return getVariableSetOrChangeBlock(n.left, n.right, true);
                        case SK.MinusEqualsToken:
                            var r = mkStmt("variables_change");
                            r.inputs = [mkValue("VALUE", negateNumericNode(n.right), numberType)];
                            r.fields = [getField("VAR", getVariableName(n.left))];
                            return r;
                        default:
                            error(n, pxtc.Util.lf("Unsupported operator token in statement {0}", SK[n.operatorToken.kind]));
                            return undefined;
                    }
                }
                function getWhileStatement(n) {
                    var r = mkStmt("device_while");
                    r.inputs = [getConditionalInput("COND", n.expression)];
                    r.handlers = [{ name: "DO", statement: getStatementBlock(n.statement) }];
                    return r;
                }
                function getIfStatement(n) {
                    var flatif = flattenIfStatement(n);
                    var r = mkStmt("controls_if");
                    r.mutation = {
                        "elseif": (flatif.ifStatements.length - 1).toString(),
                        "else": flatif.elseStatement ? "1" : "0"
                    };
                    r.inputs = [];
                    r.handlers = [];
                    flatif.ifStatements.forEach(function (stmt, i) {
                        r.inputs.push(getConditionalInput("IF" + i, stmt.expression));
                        r.handlers.push({ name: "DO" + i, statement: getStatementBlock(stmt.thenStatement) });
                    });
                    if (flatif.elseStatement) {
                        r.handlers.push({ name: "ELSE", statement: getStatementBlock(flatif.elseStatement) });
                    }
                    return r;
                }
                function getConditionalInput(name, expr) {
                    var err = checkConditionalExpression(expr);
                    if (err) {
                        var tsExpr = getTypeScriptExpressionBlock(expr);
                        return mkValue(name, tsExpr, booleanType);
                    }
                    else {
                        return getValue(name, expr, booleanType);
                    }
                }
                function checkConditionalExpression(expr) {
                    var unwrappedExpr = unwrapNode(expr);
                    switch (unwrappedExpr.kind) {
                        case SK.TrueKeyword:
                        case SK.FalseKeyword:
                        case SK.Identifier:
                            return undefined;
                        case SK.BinaryExpression:
                            return checkBooleanBinaryExpression(unwrappedExpr);
                        case SK.CallExpression:
                            return checkBooleanCallExpression(unwrappedExpr);
                        case SK.PrefixUnaryExpression:
                            if (unwrappedExpr.operator === SK.ExclamationToken) {
                                return undefined;
                            } // else fall through
                        default:
                            return pxtc.Util.lf("Conditions must evaluate to booleans or identifiers");
                    }
                    function checkBooleanBinaryExpression(n) {
                        switch (n.operatorToken.kind) {
                            case SK.EqualsEqualsToken:
                            case SK.EqualsEqualsEqualsToken:
                            case SK.ExclamationEqualsToken:
                            case SK.ExclamationEqualsEqualsToken:
                            case SK.LessThanToken:
                            case SK.LessThanEqualsToken:
                            case SK.GreaterThanToken:
                            case SK.GreaterThanEqualsToken:
                            case SK.AmpersandAmpersandToken:
                            case SK.BarBarToken:
                                return undefined;
                            default:
                                return pxtc.Util.lf("Binary expressions in conditionals must evaluate to booleans");
                        }
                    }
                    function checkBooleanCallExpression(n) {
                        var callInfo = pxtc.pxtInfo(n.expression).callInfo;
                        if (callInfo) {
                            var api = env.blocks.apis.byQName[callInfo.qName];
                            if (api && api.retType == "boolean") {
                                return undefined;
                            }
                        }
                        return pxtc.Util.lf("Only functions that return booleans are allowed as conditions");
                    }
                }
                function getForStatement(n) {
                    var initializer = n.initializer;
                    var indexVar = initializer.declarations[0].name.text;
                    var condition = n.condition;
                    var renamed = getVariableName(initializer.declarations[0].name);
                    var r;
                    if (condition.operatorToken.kind === SK.LessThanToken && !checkForVariableUsages(n.statement)) {
                        r = mkStmt("controls_repeat_ext");
                        r.fields = [];
                        r.inputs = [getValue("TIMES", condition.right, wholeNumberType)];
                        r.handlers = [];
                    }
                    else {
                        r = mkStmt("pxt_controls_for");
                        r.fields = [];
                        r.inputs = [];
                        r.handlers = [];
                        r.inputs = [getDraggableVariableBlock("VAR", renamed)];
                        if (condition.operatorToken.kind === SK.LessThanToken) {
                            var unwrappedRightSide = unwrapNode(condition.right);
                            if (unwrappedRightSide.kind === SK.NumericLiteral) {
                                var decrementedValue = parseFloat(unwrappedRightSide.text) - 1;
                                var valueField = getNumericLiteral(decrementedValue + "");
                                r.inputs.push(mkValue("TO", valueField, wholeNumberType));
                            }
                            else {
                                var ex = mkExpr("math_arithmetic");
                                ex.fields = [getField("OP", "MINUS")];
                                ex.inputs = [
                                    getValue("A", unwrappedRightSide, numberType),
                                    getValue("B", 1, numberType)
                                ];
                                r.inputs.push(mkValue("TO", ex, wholeNumberType));
                            }
                        }
                        else if (condition.operatorToken.kind === SK.LessThanEqualsToken) {
                            r.inputs.push(getValue("TO", condition.right, wholeNumberType));
                        }
                    }
                    r.handlers.push({ name: "DO", statement: getStatementBlock(n.statement) });
                    return r;
                    function checkForVariableUsages(node) {
                        if (node.kind === SK.Identifier && getVariableName(node) === renamed) {
                            return true;
                        }
                        return ts.forEachChild(node, checkForVariableUsages);
                    }
                }
                function getForOfStatement(n) {
                    var initializer = n.initializer;
                    var renamed = getVariableName(initializer.declarations[0].name);
                    var r = mkStmt("pxt_controls_for_of");
                    r.inputs = [getValue("LIST", n.expression), getDraggableVariableBlock("VAR", renamed)];
                    r.handlers = [{ name: "DO", statement: getStatementBlock(n.statement) }];
                    return r;
                }
                function getVariableSetOrChangeBlock(name, value, changed, overrideName) {
                    if (changed === void 0) { changed = false; }
                    if (overrideName === void 0) { overrideName = false; }
                    var renamed = getVariableName(name);
                    trackVariableUsage(renamed, ReferenceType.InBlocksOnly);
                    // We always do a number shadow even if the variable is not of type number
                    var r = mkStmt(changed ? "variables_change" : "variables_set");
                    r.inputs = [getValue("VALUE", value, numberType)];
                    r.fields = [getField("VAR", renamed)];
                    return r;
                }
                function getArraySetBlock(left, right) {
                    var r = mkStmt("lists_index_set");
                    r.inputs = [
                        getValue("LIST", left.expression),
                        getValue("INDEX", left.argumentExpression, numberType),
                        getValue("VALUE", right)
                    ];
                    return r;
                }
                function getPropertySetBlock(left, right, tp) {
                    return getPropertyBlock(left, right, tp);
                }
                function getPropertyGetBlock(left) {
                    return getPropertyBlock(left, null, "@get@");
                }
                function getPropertyBlock(left, right, tp) {
                    var info = pxtc.pxtInfo(left).callInfo;
                    var sym = env.blocks.apis.byQName[info ? info.qName : ""];
                    if (!sym || !sym.attributes.blockCombine) {
                        error(left);
                        return undefined;
                    }
                    var qName = sym.namespace + "." + sym.retType + "." + tp;
                    var setter = env.blocks.blocks.find(function (b) { return b.qName == qName; });
                    var r = right ? mkStmt(setter.attributes.blockId) : mkExpr(setter.attributes.blockId);
                    var pp = setter.attributes._def.parameters;
                    var fieldValue = info.qName;
                    if (setter.combinedProperties) {
                        // getters/setters have annotations at the end of their names so look them up
                        setter.combinedProperties.forEach(function (pName) {
                            if (pName.indexOf(info.qName) === 0 && pName.charAt(info.qName.length) === "@") {
                                fieldValue = pName;
                            }
                        });
                    }
                    r.inputs = [getValue(pp[0].name, left.expression)];
                    r.fields = [getField(pp[1].name, fieldValue)];
                    if (right)
                        r.inputs.push(getValue(pp[2].name, right));
                    return r;
                }
                function getVariableDeclarationStatement(n) {
                    if (addVariableDeclaration(n)) {
                        return getVariableSetOrChangeBlock(n.name, n.initializer);
                    }
                    return undefined;
                }
                function getIncrementStatement(node) {
                    var isPlusPlus = node.operator === SK.PlusPlusToken;
                    if (!isPlusPlus && node.operator !== SK.MinusMinusToken) {
                        error(node);
                        return undefined;
                    }
                    return getVariableSetOrChangeBlock(node.operand, isPlusPlus ? 1 : -1, true);
                }
                function getFunctionDeclaration(n) {
                    var name = getVariableName(n.name);
                    env.localReporters.push(n.parameters.map(function (p) {
                        return {
                            name: p.name.getText(),
                            type: p.type.getText()
                        };
                    }));
                    var statements = getStatementBlock(n.body);
                    env.localReporters.pop();
                    var r;
                    r = mkStmt("function_definition");
                    r.mutation = {
                        name: name
                    };
                    if (n.parameters) {
                        r.mutationChildren = [];
                        n.parameters.forEach(function (p) {
                            var paramName = p.name.getText();
                            r.mutationChildren.push({
                                nodeName: "arg",
                                attributes: {
                                    name: paramName,
                                    type: p.type.getText(),
                                    id: env.functionParamIds[name][paramName]
                                }
                            });
                        });
                    }
                    r.handlers = [{ name: "STACK", statement: statements }];
                    return r;
                }
                function getCallStatement(node, asExpression) {
                    var info = pxtc.pxtInfo(node).callInfo;
                    var attributes = attrs(info);
                    if (info.qName == "Math.pow") {
                        var r_4 = mkExpr("math_arithmetic");
                        r_4.inputs = [
                            mkValue("A", getOutputBlock(node.arguments[0]), numberType),
                            mkValue("B", getOutputBlock(node.arguments[1]), numberType)
                        ];
                        r_4.fields = [getField("OP", "POWER")];
                        return r_4;
                    }
                    else if (pxt.Util.startsWith(info.qName, "Math.")) {
                        var op = info.qName.substring(5);
                        if (isSupportedMathFunction(op)) {
                            var r_5;
                            if (isRoundingFunction(op)) {
                                r_5 = mkExpr("math_js_round");
                            }
                            else {
                                r_5 = mkExpr("math_js_op");
                                var opType = void 0;
                                if (isUnaryMathFunction(op))
                                    opType = "unary";
                                else if (isInfixMathFunction(op))
                                    opType = "infix";
                                else
                                    opType = "binary";
                                r_5.mutation = { "op-type": opType };
                            }
                            r_5.inputs = info.args.map(function (arg, index) { return mkValue("ARG" + index, getOutputBlock(arg), "math_number"); });
                            r_5.fields = [getField("OP", op)];
                            return r_5;
                        }
                    }
                    if (attributes.blockId === pxtc.PAUSE_UNTIL_TYPE) {
                        var r_6 = mkStmt(pxtc.PAUSE_UNTIL_TYPE);
                        var lambda = node.arguments[0];
                        var condition = void 0;
                        if (lambda.body.kind === SK.Block) {
                            // We already checked to make sure the body is a single return statement
                            condition = lambda.body.statements[0].expression;
                        }
                        else {
                            condition = lambda.body;
                        }
                        r_6.inputs = [mkValue("PREDICATE", getOutputBlock(condition), "logic_boolean")];
                        return r_6;
                    }
                    if (!attributes.blockId || !attributes.block) {
                        var builtin = pxt.blocks.builtinFunctionInfo[info.qName];
                        if (!builtin) {
                            var name_2 = getVariableName(node.expression);
                            if (env.declaredFunctions[name_2]) {
                                var r_7;
                                r_7 = mkStmt("function_call");
                                if (info.args.length) {
                                    r_7.mutationChildren = [];
                                    r_7.inputs = [];
                                    env.declaredFunctions[name_2].parameters.forEach(function (p, i) {
                                        var paramName = p.name.getText();
                                        var argId = env.functionParamIds[name_2][paramName];
                                        r_7.mutationChildren.push({
                                            nodeName: "arg",
                                            attributes: {
                                                name: paramName,
                                                type: p.type.getText(),
                                                id: argId
                                            }
                                        });
                                        var argBlock = getOutputBlock(info.args[i]);
                                        var value = mkValue(argId, argBlock);
                                        r_7.inputs.push(value);
                                    });
                                }
                                r_7.mutation = { name: name_2 };
                                return r_7;
                            }
                            else {
                                return getTypeScriptStatementBlock(node);
                            }
                        }
                        attributes.blockId = builtin.blockId;
                    }
                    if (attributes.imageLiteral) {
                        return getImageLiteralStatement(node, info);
                    }
                    if (ts.isFunctionLike(info.decl)) {
                        // const decl = info.decl as FunctionLikeDeclaration;
                        // if (decl.parameters && decl.parameters.length === 1 && ts.isRestParameter(decl.parameters[0])) {
                        //     openCallExpressionBlockWithRestParameter(node, info);
                        //     return;
                        // }
                    }
                    var args = paramList(info, env.blocks);
                    var api = env.blocks.apis.byQName[info.qName];
                    var comp = pxt.blocks.compileInfo(api);
                    var r = {
                        kind: asExpression ? "expr" : "statement",
                        type: attributes.blockId
                    };
                    var addInput = function (v) { return (r.inputs || (r.inputs = [])).push(v); };
                    var addField = function (f) { return (r.fields || (r.fields = [])).push(f); };
                    if (info.qName == "Math.max") {
                        addField({
                            kind: "field",
                            name: "op",
                            value: "max"
                        });
                    }
                    var optionalCount = 0;
                    args.forEach(function (arg, i) {
                        var e = arg.value;
                        var shadowMutation;
                        var param = arg.param;
                        var paramInfo = arg.info;
                        var paramComp = comp.parameters[comp.thisParameter ? i - 1 : i];
                        var paramRange = paramComp && paramComp.range;
                        if (paramRange) {
                            var min = paramRange['min'];
                            var max = paramRange['max'];
                            shadowMutation = { 'min': min.toString(), 'max': max.toString() };
                        }
                        if (i === 0 && attributes.defaultInstance) {
                            if (e.getText() === attributes.defaultInstance) {
                                return;
                            }
                            else {
                                r.mutation = { "showing": "true" };
                            }
                        }
                        if (attributes.mutatePropertyEnum && i === info.args.length - 2) {
                            // Implicit in the blocks
                            return;
                        }
                        if (param && param.isOptional) {
                            ++optionalCount;
                        }
                        var shadowBlockInfo;
                        if (param && param.shadowBlockId) {
                            shadowBlockInfo = blocksInfo.blocksById[param.shadowBlockId];
                        }
                        if (e.kind === SK.CallExpression) {
                            // Many enums have shim wrappers that need to be unwrapped if used
                            // in a parameter that is of an enum type. By default, enum parameters
                            // are dropdown fields (not value inputs) so we want to decompile the
                            // inner enum value as a field and not the shim block as a value
                            var shimCall = pxtc.pxtInfo(e).callInfo;
                            var shimAttrs = shimCall && attrs(shimCall);
                            if (shimAttrs && shimAttrs.shim === "TD_ID" && paramInfo.isEnum) {
                                e = unwrapNode(shimCall.args[0]);
                            }
                        }
                        switch (e.kind) {
                            case SK.FunctionExpression:
                            case SK.ArrowFunction:
                                var m = getDestructuringMutation(e);
                                var mustPopLocalScope = false;
                                if (m) {
                                    r.mutation = m;
                                }
                                else {
                                    var arrow = e;
                                    var sym = blocksInfo.blocksById[attributes.blockId];
                                    var paramDesc_1 = sym.parameters[comp.thisParameter ? i - 1 : i];
                                    var addDraggableInput_1 = function (arg, varName) {
                                        if (attributes.draggableParameters === "reporter") {
                                            addInput(mkDraggableReporterValue("HANDLER_DRAG_PARAM_" + arg.name, varName, arg.type));
                                        }
                                        else {
                                            addInput(getDraggableVariableBlock("HANDLER_DRAG_PARAM_" + arg.name, varName));
                                        }
                                    };
                                    if (arrow.parameters.length) {
                                        if (attributes.optionalVariableArgs) {
                                            r.mutation = {
                                                "numargs": arrow.parameters.length.toString()
                                            };
                                            arrow.parameters.forEach(function (parameter, i) {
                                                r.mutation["arg" + i] = parameter.name.text;
                                            });
                                        }
                                        else {
                                            arrow.parameters.forEach(function (parameter, i) {
                                                var arg = paramDesc_1.handlerParameters[i];
                                                if (attributes.draggableParameters) {
                                                    addDraggableInput_1(arg, parameter.name.text);
                                                }
                                                else {
                                                    addField(getField("HANDLER_" + arg.name, parameter.name.text));
                                                }
                                            });
                                        }
                                    }
                                    if (attributes.draggableParameters) {
                                        if (arrow.parameters.length < paramDesc_1.handlerParameters.length) {
                                            for (var i_1 = arrow.parameters.length; i_1 < paramDesc_1.handlerParameters.length; i_1++) {
                                                var arg_1 = paramDesc_1.handlerParameters[i_1];
                                                addDraggableInput_1(arg_1, arg_1.name);
                                            }
                                        }
                                        if (attributes.draggableParameters === "reporter") {
                                            // Push the parameter descriptions onto the local scope stack
                                            // so the getStatementBlock() below knows that these parameters
                                            // should be decompiled as reporters instead of variables.
                                            env.localReporters.push(paramDesc_1.handlerParameters);
                                            mustPopLocalScope = true;
                                        }
                                    }
                                }
                                (r.handlers || (r.handlers = [])).push({ name: "HANDLER", statement: getStatementBlock(e) });
                                if (mustPopLocalScope) {
                                    env.localReporters.pop();
                                }
                                break;
                            case SK.PropertyAccessExpression:
                                var callInfo = pxtc.pxtInfo(e).callInfo;
                                var aName = pxtc.U.htmlEscape(param.definitionName);
                                var argAttrs = attrs(callInfo);
                                if (shadowBlockInfo && shadowBlockInfo.attributes.shim === "TD_ID") {
                                    addInput(mkValue(aName, getPropertyAccessExpression(e, false, param.shadowBlockId), param.shadowBlockId, shadowMutation));
                                }
                                else if (paramInfo && paramInfo.isEnum || callInfo && (argAttrs.fixedInstance || argAttrs.blockIdentity === info.qName)) {
                                    addField(getField(aName, getPropertyAccessExpression(e, true).value));
                                }
                                else {
                                    addInput(getValue(aName, e, param.shadowBlockId, shadowMutation));
                                }
                                break;
                            case SK.BinaryExpression:
                                if (param && param.shadowOptions && param.shadowOptions.toString) {
                                    var be = e;
                                    if (be.operatorToken.kind === SK.PlusToken && isEmptyStringNode(be.left)) {
                                        addInput(getValue(pxtc.U.htmlEscape(param.definitionName), be.right, param.shadowBlockId || "text"));
                                        break;
                                    }
                                }
                                addInput(getValue(pxtc.U.htmlEscape(param.definitionName), e, param.shadowBlockId, shadowMutation));
                                break;
                            default:
                                var v = void 0;
                                var vName = pxtc.U.htmlEscape(param.definitionName);
                                var defaultV = true;
                                if (info.qName == "Math.random") {
                                    v = mkValue(vName, getMathRandomArgumentExpresion(e), numberType, shadowMutation);
                                    defaultV = false;
                                }
                                else if (isLiteralNode(e)) {
                                    // Remove quotes on strings
                                    var fieldText = param.fieldEditor == 'text' ? e.text : e.getText();
                                    var isFieldBlock = param.shadowBlockId && !isLiteralBlockType(param.shadowBlockId);
                                    if (decompileLiterals(param) && param.fieldOptions['onParentBlock']) {
                                        addField(getField(vName, fieldText));
                                        return;
                                    }
                                    else if (isFieldBlock) {
                                        var field = fieldBlockInfo(param.shadowBlockId);
                                        if (field && decompileLiterals(field)) {
                                            var fieldBlock = getFieldBlock(param.shadowBlockId, field.definitionName, fieldText, true);
                                            if (param.shadowOptions) {
                                                fieldBlock.mutation = { "customfield": pxtc.Util.htmlEscape(JSON.stringify(param.shadowOptions)) };
                                            }
                                            v = mkValue(vName, fieldBlock, param.shadowBlockId, shadowMutation);
                                            defaultV = false;
                                        }
                                    }
                                }
                                else if (e.kind === SK.TaggedTemplateExpression && param.fieldOptions && param.fieldOptions[DecompileParamKeys.TaggedTemplate]) {
                                    addField(getField(vName, pxtc.Util.htmlEscape(e.getText())));
                                    return;
                                }
                                if (defaultV) {
                                    v = getValue(vName, e, param.shadowBlockId, shadowMutation);
                                }
                                addInput(v);
                                break;
                        }
                    });
                    if (optionalCount) {
                        if (!r.mutation)
                            r.mutation = {};
                        r.mutation["_expanded"] = optionalCount.toString();
                    }
                    return r;
                }
                function fieldBlockInfo(blockId) {
                    if (blocksInfo.blocksById[blockId]) {
                        var comp = pxt.blocks.compileInfo(blocksInfo.blocksById[blockId]);
                        if (!comp.thisParameter && comp.parameters.length === 1) {
                            return comp.parameters[0];
                        }
                    }
                    return undefined;
                }
                function decompileLiterals(param) {
                    return param && param.fieldOptions && param.fieldOptions[DecompileParamKeys.DecompileLiterals];
                }
                // function openCallExpressionBlockWithRestParameter(call: ts.CallExpression, info: pxtc.CallInfo) {
                //     openBlockTag(info.attrs.blockId);
                //     write(`<mutation count="${info.args.length}" />`)
                //     info.args.forEach((expression, index) => {
                //         emitValue("value_input_" + index, expression, numberType);
                //     });
                // }
                function getDestructuringMutation(callback) {
                    var bindings = getObjectBindingProperties(callback);
                    if (bindings) {
                        return {
                            "callbackproperties": bindings[0].join(","),
                            "renamemap": pxtc.Util.htmlEscape(JSON.stringify(bindings[1]))
                        };
                    }
                    return undefined;
                }
                function getMathRandomArgumentExpresion(e) {
                    switch (e.kind) {
                        case SK.NumericLiteral:
                            var n_1 = e;
                            return getNumericLiteral((parseInt(n_1.text) - 1).toString());
                        case SK.BinaryExpression:
                            var op = e;
                            if (op.operatorToken.kind == SK.PlusToken && op.right.text == "1") {
                                return getOutputBlock(op.left);
                            }
                        default:
                            //This will definitely lead to an error, but the above are the only two cases generated by blocks
                            return getOutputBlock(e);
                    }
                }
                function getArrowFunctionStatement(n, next) {
                    return getStatementBlock(n.body, next);
                }
                function flattenIfStatement(n) {
                    var r = {
                        ifStatements: [{
                                expression: n.expression,
                                thenStatement: n.thenStatement
                            }],
                        elseStatement: n.elseStatement
                    };
                    if (n.elseStatement && n.elseStatement.kind == SK.IfStatement) {
                        var flat = flattenIfStatement(n.elseStatement);
                        r.ifStatements = r.ifStatements.concat(flat.ifStatements);
                        r.elseStatement = flat.elseStatement;
                    }
                    return r;
                }
                function codeBlock(statements, next, topLevel, parent, emitOnStart) {
                    if (topLevel === void 0) { topLevel = false; }
                    if (emitOnStart === void 0) { emitOnStart = false; }
                    var eventStatements = [];
                    var blockStatements = next || [];
                    // Go over the statements in reverse so that we can insert the nodes into the existing list if there is one
                    for (var i = statements.length - 1; i >= 0; i--) {
                        var statement = statements[i];
                        if ((statement.kind === SK.FunctionDeclaration ||
                            (statement.kind == SK.ExpressionStatement && isEventExpression(statement))) &&
                            !checkStatement(statement, env, false, topLevel)) {
                            eventStatements.unshift(statement);
                        }
                        else {
                            blockStatements.unshift(statement);
                        }
                    }
                    eventStatements.map(function (n) { return getStatementBlock(n, undefined, undefined, false, topLevel); }).forEach(emitStatementNode);
                    if (blockStatements.length) {
                        // wrap statement in "on start" if top level
                        var stmt = getStatementBlock(blockStatements.shift(), blockStatements, parent, false, topLevel);
                        if (emitOnStart) {
                            // Preserve any variable edeclarations that were never used
                            var current_1 = stmt;
                            autoDeclarations.forEach(function (_a) {
                                var name = _a[0], node = _a[1];
                                if (varUsages[name] === ReferenceType.InBlocksOnly) {
                                    return;
                                }
                                var e = node.initializer;
                                var v;
                                if (varUsages[name] === ReferenceType.InTextBlocks) {
                                    // If a variable is referenced inside a "grey" block, we need
                                    // to be conservative because our type inference might not work
                                    // on the round trip
                                    v = getTypeScriptStatementBlock(node, "let ");
                                }
                                else {
                                    v = getVariableSetOrChangeBlock(node.name, node.initializer, false, true);
                                }
                                v.next = current_1;
                                current_1 = v;
                            });
                            if (current_1) {
                                var r = mkStmt(ts.pxtc.ON_START_TYPE);
                                r.handlers = [{
                                        name: "HANDLER",
                                        statement: current_1
                                    }];
                                return r;
                            }
                            else {
                                maybeEmitEmptyOnStart();
                            }
                        }
                        return stmt;
                    }
                    else if (emitOnStart) {
                        maybeEmitEmptyOnStart();
                    }
                    return undefined;
                }
                function maybeEmitEmptyOnStart() {
                    if (options.alwaysEmitOnStart) {
                        countBlock();
                        write("<block type=\"" + ts.pxtc.ON_START_TYPE + "\"></block>");
                    }
                }
                function trackVariableUsage(name, type) {
                    if (varUsages[name] !== ReferenceType.InTextBlocks) {
                        varUsages[name] = type;
                    }
                }
                function trackVariableUsagesInText(node) {
                    ts.forEachChild(node, function (n) {
                        if (n.kind === SK.Identifier) {
                            trackVariableUsage(getVariableName(n), ReferenceType.InTextBlocks);
                        }
                        trackVariableUsagesInText(n);
                    });
                }
                /**
                 * Takes a series of comment ranges and converts them into string suitable for a
                 * comment block in blockly. All comments above a statement will be included,
                 * regardless of single vs multi line and whitespace. Paragraphs are delineated
                 * by empty lines between comments (a commented empty line, not an empty line
                 * between two separate comment blocks)
                 */
                function getCommentText(commentRanges, node, workspaceRefs) {
                    var text = "";
                    var currentLine = "";
                    var isTopLevel = isTopLevelComment(node);
                    for (var _i = 0, commentRanges_1 = commentRanges; _i < commentRanges_1.length; _i++) {
                        var commentRange = commentRanges_1[_i];
                        var commentText = fileText.substr(commentRange.pos, commentRange.end - commentRange.pos);
                        if (commentText) {
                            // Strip windows line endings because they break the regex we use to extract content
                            commentText = commentText.replace(/\r\n/g, "\n");
                        }
                        if (commentRange.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
                            appendMatch(commentText, 1, 3, singleLineCommentRegex);
                        }
                        else if (commentRange.kind === ts.SyntaxKind.MultiLineCommentTrivia && isTopLevel) {
                            var lines = commentText.split("\n");
                            for (var i = 0; i < lines.length; i++) {
                                appendMatch(lines[i], i, lines.length, multiLineCommentRegex);
                            }
                            if (currentLine)
                                text += currentLine;
                            var ref = getCommentRef();
                            if (workspaceRefs) {
                                workspaceRefs.push(ref);
                            }
                            workspaceComments.push({ text: text, refId: ref });
                            text = '';
                            currentLine = '';
                        }
                        else {
                            var lines = commentText.split("\n");
                            for (var i = 0; i < lines.length; i++) {
                                appendMatch(lines[i], i, lines.length, multiLineCommentRegex);
                            }
                        }
                    }
                    text += currentLine;
                    return text.trim();
                    function isTopLevelComment(n) {
                        var parent = getParent(n)[0];
                        if (!parent || parent.kind == SK.SourceFile)
                            return true;
                        // Expression statement
                        if (parent.kind == SK.ExpressionStatement)
                            return isTopLevelComment(parent);
                        // Variable statement
                        if (parent.kind == SK.VariableDeclarationList)
                            return isTopLevelComment(parent.parent);
                        return false;
                    }
                    function appendMatch(line, lineno, lineslen, regex) {
                        var match = regex.exec(line);
                        if (match) {
                            var matched = match[1].trim();
                            if (matched === pxtc.ON_START_COMMENT || matched === pxtc.HANDLER_COMMENT) {
                                return;
                            }
                            if (matched) {
                                currentLine += currentLine ? " " + matched : matched;
                            }
                            else {
                                if (lineno && lineno < lineslen - 1) {
                                    text += currentLine + "\n";
                                    currentLine = "";
                                }
                            }
                        }
                    }
                }
                function trackAutoDeclaration(n) {
                    autoDeclarations.push([getVariableName(n.name), n]);
                }
                function addVariableDeclaration(node) {
                    if (node.name.kind !== SK.Identifier) {
                        error(node, pxtc.Util.lf("Variable declarations may not use binding patterns"));
                        return false;
                    }
                    else if (!node.initializer) {
                        error(node, pxtc.Util.lf("Variable declarations must have an initializer"));
                        return false;
                    }
                    return true;
                }
                function getVariableName(name) {
                    if (renameMap) {
                        var rename = renameMap.getRenameForPosition(name.getStart());
                        if (rename) {
                            return rename.name;
                        }
                    }
                    return name.text;
                }
            }
            decompiler.decompileToBlocks = decompileToBlocks;
            function checkStatement(node, env, asExpression, topLevel) {
                if (asExpression === void 0) { asExpression = false; }
                if (topLevel === void 0) { topLevel = false; }
                switch (node.kind) {
                    case SK.WhileStatement:
                    case SK.IfStatement:
                    case SK.Block:
                        return undefined;
                    case SK.ExpressionStatement:
                        return checkStatement(node.expression, env, asExpression, topLevel);
                    case SK.VariableStatement:
                        return checkVariableStatement(node, env);
                    case SK.CallExpression:
                        return checkCall(node, env, asExpression, topLevel);
                    case SK.VariableDeclaration:
                        return checkVariableDeclaration(node, env);
                    case SK.PostfixUnaryExpression:
                    case SK.PrefixUnaryExpression:
                        return checkIncrementorExpression(node);
                    case SK.FunctionExpression:
                    case SK.ArrowFunction:
                        return checkArrowFunction(node, env);
                    case SK.BinaryExpression:
                        return checkBinaryExpression(node, env);
                    case SK.ForStatement:
                        return checkForStatement(node);
                    case SK.ForOfStatement:
                        return checkForOfStatement(node);
                    case SK.FunctionDeclaration:
                        return checkFunctionDeclaration(node, topLevel);
                    case SK.EnumDeclaration:
                        return checkEnumDeclaration(node, topLevel);
                    case SK.ModuleDeclaration:
                        return checkNamespaceDeclaration(node);
                    case SK.BreakStatement:
                    case SK.ContinueStatement:
                    case SK.DebuggerStatement:
                    case SK.EmptyStatement:
                        return undefined;
                }
                return pxtc.Util.lf("Unsupported statement in block: {0}", SK[node.kind]);
                function checkForStatement(n) {
                    if (!n.initializer || !n.incrementor || !n.condition) {
                        return pxtc.Util.lf("for loops must have an initializer, incrementor, and condition");
                    }
                    if (n.initializer.kind !== SK.VariableDeclarationList) {
                        return pxtc.Util.lf("only variable declarations are permitted in for loop initializers");
                    }
                    var initializer = n.initializer;
                    if (!initializer.declarations) {
                        return pxtc.Util.lf("for loop with out-of-scope variables not supported");
                    }
                    if (initializer.declarations.length != 1) {
                        return pxtc.Util.lf("for loop with multiple variables not supported");
                    }
                    var assignment = initializer.declarations[0];
                    if (assignment.initializer.kind !== SK.NumericLiteral || assignment.initializer.text !== "0") {
                        return pxtc.Util.lf("for loop initializers must be initialized to 0");
                    }
                    var indexVar = assignment.name.text;
                    if (!incrementorIsValid(indexVar)) {
                        return pxtc.Util.lf("for loop incrementors may only increment the variable declared in the initializer");
                    }
                    if (n.condition.kind !== SK.BinaryExpression) {
                        return pxtc.Util.lf("for loop conditionals must be binary comparison operations");
                    }
                    var condition = n.condition;
                    if (condition.left.kind !== SK.Identifier || condition.left.text !== indexVar) {
                        return pxtc.Util.lf("left side of for loop conditional must be the variable declared in the initializer");
                    }
                    if (condition.operatorToken.kind !== SK.LessThanToken && condition.operatorToken.kind !== SK.LessThanEqualsToken) {
                        return pxtc.Util.lf("for loop conditional operator must be either < or <=");
                    }
                    return undefined;
                    function incrementorIsValid(varName) {
                        if (n.incrementor.kind === SK.PostfixUnaryExpression || n.incrementor.kind === SK.PrefixUnaryExpression) {
                            var incrementor = n.incrementor;
                            if (incrementor.operator === SK.PlusPlusToken && incrementor.operand.kind === SK.Identifier) {
                                return incrementor.operand.text === varName;
                            }
                        }
                        return false;
                    }
                }
                function checkForOfStatement(n) {
                    if (n.initializer.kind !== SK.VariableDeclarationList) {
                        return pxtc.Util.lf("only variable declarations are permitted in for of loop initializers");
                    }
                    // VariableDeclarationList in ForOfStatements are guranteed to have one declaration
                    return undefined;
                }
                function checkBinaryExpression(n, env) {
                    if (n.left.kind === SK.ElementAccessExpression) {
                        if (n.operatorToken.kind !== SK.EqualsToken) {
                            return pxtc.Util.lf("Element access expressions may only be assigned to using the equals operator");
                        }
                    }
                    else if (n.left.kind === SK.PropertyAccessExpression) {
                        if (n.operatorToken.kind !== SK.EqualsToken &&
                            n.operatorToken.kind !== SK.PlusEqualsToken) {
                            return pxtc.Util.lf("Property access expressions may only be assigned to using the = and += operators");
                        }
                        else {
                            return checkExpression(n.left, env);
                        }
                    }
                    else if (n.left.kind === SK.Identifier) {
                        switch (n.operatorToken.kind) {
                            case SK.EqualsToken:
                                return checkExpression(n.right, env);
                            case SK.PlusEqualsToken:
                            case SK.MinusEqualsToken:
                                return undefined;
                            default:
                                return pxtc.Util.lf("Unsupported operator token in statement {0}", SK[n.operatorToken.kind]);
                        }
                    }
                    else {
                        return pxtc.Util.lf("This expression cannot be assigned to");
                    }
                    return undefined;
                }
                function checkArrowFunction(n, env) {
                    var fail = false;
                    if (n.parameters.length) {
                        var parent_1 = getParent(n)[0];
                        if (parent_1 && pxtc.pxtInfo(parent_1).callInfo) {
                            var callInfo = pxtc.pxtInfo(parent_1).callInfo;
                            if (env.attrs(callInfo).mutate === "objectdestructuring") {
                                fail = n.parameters[0].name.kind !== SK.ObjectBindingPattern;
                            }
                            else {
                                fail = n.parameters.some(function (param) { return param.name.kind !== SK.Identifier; });
                            }
                        }
                    }
                    if (fail) {
                        return pxtc.Util.lf("Unsupported parameters in error function");
                    }
                    return undefined;
                }
                function checkIncrementorExpression(n) {
                    if (n.operand.kind != SK.Identifier) {
                        return pxtc.Util.lf("-- and ++ may only be used on an identifier");
                    }
                    if (n.operator !== SK.PlusPlusToken && n.operator !== SK.MinusMinusToken) {
                        return pxtc.Util.lf("Only ++ and -- supported as prefix or postfix unary operators in a statement");
                    }
                    return undefined;
                }
                function checkVariableDeclaration(n, env) {
                    var check;
                    if (n.name.kind !== SK.Identifier) {
                        check = pxtc.Util.lf("Variable declarations may not use binding patterns");
                    }
                    else if (!n.initializer) {
                        check = pxtc.Util.lf("Variable declarations must have an initializer");
                    }
                    else if (!isAutoDeclaration(n)) {
                        check = checkExpression(n.initializer, env);
                    }
                    return check;
                }
                function checkVariableStatement(n, env) {
                    for (var _i = 0, _a = n.declarationList.declarations; _i < _a.length; _i++) {
                        var declaration = _a[_i];
                        var res = checkVariableDeclaration(declaration, env);
                        if (res) {
                            return res;
                        }
                    }
                    return undefined;
                }
                function checkCall(n, env, asExpression, topLevel) {
                    if (asExpression === void 0) { asExpression = false; }
                    if (topLevel === void 0) { topLevel = false; }
                    var info = pxtc.pxtInfo(n).callInfo;
                    if (!info) {
                        return pxtc.Util.lf("Function call not supported in the blocks");
                    }
                    var attributes = env.attrs(info);
                    if (!asExpression) {
                        if (info.isExpression) {
                            return pxtc.Util.lf("No output expressions as statements");
                        }
                    }
                    else if (info.qName == "Math.pow") {
                        return undefined;
                    }
                    else if (pxt.Util.startsWith(info.qName, "Math.")) {
                        var op = info.qName.substring(5);
                        if (isSupportedMathFunction(op)) {
                            return undefined;
                        }
                    }
                    if (attributes.blockId === pxtc.PAUSE_UNTIL_TYPE) {
                        var predicate = n.arguments[0];
                        if (n.arguments.length === 1 && checkPredicate(predicate)) {
                            return undefined;
                        }
                        return pxtc.Util.lf("Predicates must be inline expressions that return a value");
                    }
                    var hasCallback = hasStatementInput(info, attributes);
                    if (hasCallback && !attributes.handlerStatement && !topLevel) {
                        return pxtc.Util.lf("Events must be top level");
                    }
                    if (!attributes.blockId || !attributes.block) {
                        var builtin = pxt.blocks.builtinFunctionInfo[info.qName];
                        if (!builtin) {
                            if (n.expression.kind === SK.Identifier) {
                                var funcName = n.expression.text;
                                if (!env.declaredFunctions[funcName]) {
                                    return pxtc.Util.lf("Call statements must have a valid declared function");
                                }
                                else if (env.declaredFunctions[funcName].parameters.length !== info.args.length) {
                                    return pxtc.Util.lf("Function calls in blocks must have the same number of arguments as the function definition");
                                }
                                else {
                                    return undefined;
                                }
                            }
                            return pxtc.Util.lf("Function call not supported in the blocks");
                        }
                        attributes.blockId = builtin.blockId;
                    }
                    var args = paramList(info, env.blocks);
                    var api = env.blocks.apis.byQName[info.qName];
                    var comp = pxt.blocks.compileInfo(api);
                    var totalDecompilableArgs = comp.parameters.length + (comp.thisParameter ? 1 : 0);
                    if (attributes.imageLiteral) {
                        // Image literals do not show up in the block string, so it won't be in comp
                        if (info.args.length - totalDecompilableArgs > 1) {
                            return pxtc.Util.lf("Function call has more arguments than are supported by its block");
                        }
                        var arg = n.arguments[0];
                        if (arg.kind != SK.StringLiteral && arg.kind != SK.NoSubstitutionTemplateLiteral) {
                            return pxtc.Util.lf("Only string literals supported for image literals");
                        }
                        var leds = (arg.text || '').replace(/\s+/g, '');
                        var nc = attributes.imageLiteral * 5;
                        if (nc * 5 != leds.length) {
                            return pxtc.Util.lf("Invalid image pattern");
                        }
                        return undefined;
                    }
                    var argumentDifference = info.args.length - totalDecompilableArgs;
                    if (argumentDifference > 0 && !checkForDestructuringMutation()) {
                        var diff = argumentDifference;
                        // Callbacks and default instance parameters do not appear in the block
                        // definition string so they won't show up in the above count
                        if (hasCallback)
                            diff--;
                        if (attributes.defaultInstance)
                            diff--;
                        if (diff > 0) {
                            return pxtc.Util.lf("Function call has more arguments than are supported by its block");
                        }
                    }
                    if (comp.parameters.length || hasCallback) {
                        var fail_1;
                        var instance_1 = attributes.defaultInstance || !!comp.thisParameter;
                        args.forEach(function (arg, i) {
                            if (fail_1 || instance_1 && i === 0) {
                                return;
                            }
                            if (instance_1)
                                i--;
                            fail_1 = checkArgument(arg);
                        });
                        if (fail_1) {
                            return fail_1;
                        }
                    }
                    if (api) {
                        var ns = env.blocks.apis.byQName[api.namespace];
                        if (ns && ns.attributes.fixedInstances && !ns.attributes.decompileIndirectFixedInstances && info.args.length) {
                            var callInfo = pxtc.pxtInfo(info.args[0]).callInfo;
                            if (!callInfo || !env.attrs(callInfo).fixedInstance) {
                                return pxtc.Util.lf("Fixed instance APIs can only be called directly from the fixed instance");
                            }
                        }
                    }
                    return undefined;
                    function checkForDestructuringMutation() {
                        // If the mutatePropertyEnum is set, the array literal and the destructured
                        // properties must have matching names
                        if (attributes.mutatePropertyEnum && argumentDifference === 2 && info.args.length >= 2) {
                            var arrayArg = info.args[info.args.length - 2];
                            var callbackArg = info.args[info.args.length - 1];
                            if (arrayArg.kind === SK.ArrayLiteralExpression && isFunctionExpression(callbackArg)) {
                                var propNames_1 = [];
                                // Make sure that all elements in the array literal are enum values
                                var allLiterals = !arrayArg.elements.some(function (e) {
                                    if (e.kind === SK.PropertyAccessExpression && e.expression.kind === SK.Identifier) {
                                        propNames_1.push(e.name.text);
                                        return e.expression.text !== attributes.mutatePropertyEnum;
                                    }
                                    return true;
                                });
                                if (allLiterals) {
                                    // Also need to check that the array literal's values and the destructured values match
                                    var bindings = getObjectBindingProperties(callbackArg);
                                    if (bindings) {
                                        var names_1 = bindings[0];
                                        return names_1.length === propNames_1.length && !propNames_1.some(function (p) { return names_1.indexOf(p) === -1; });
                                    }
                                }
                            }
                        }
                        return false;
                    }
                    function checkPredicate(p) {
                        if (p.kind !== SK.FunctionExpression && p.kind !== SK.ArrowFunction) {
                            return false;
                        }
                        var predicate = p;
                        if (isOutputExpression(predicate.body)) {
                            return true;
                        }
                        var body = predicate.body;
                        if (body.statements.length === 1) {
                            var stmt = unwrapNode(body.statements[0]);
                            if (stmt.kind === SK.ReturnStatement) {
                                return true;
                            }
                        }
                        return false;
                    }
                    function checkArgument(arg) {
                        var e = unwrapNode(arg.value);
                        var paramInfo = arg.info;
                        var param = arg.param;
                        if (paramInfo.isEnum) {
                            if (checkEnumArgument(e)) {
                                return undefined;
                            }
                            else if (e.kind === SK.CallExpression) {
                                var callInfo = pxtc.pxtInfo(e).callInfo;
                                var attributes_1 = env.attrs(callInfo);
                                if (callInfo && attributes_1.shim === "TD_ID" && callInfo.args && callInfo.args.length === 1) {
                                    var arg_2 = unwrapNode(callInfo.args[0]);
                                    if (checkEnumArgument(arg_2)) {
                                        return undefined;
                                    }
                                }
                            }
                            return pxtc.Util.lf("Enum arguments may only be literal property access expressions");
                        }
                        else if (isLiteralNode(e) && (param.fieldEditor || param.shadowBlockId)) {
                            var dl = !!(param.fieldOptions && param.fieldOptions[DecompileParamKeys.DecompileLiterals]);
                            if (!dl && param.shadowBlockId) {
                                var shadowInfo = env.blocks.blocksById[param.shadowBlockId];
                                if (shadowInfo && shadowInfo.parameters && shadowInfo.parameters.length) {
                                    var name_3 = shadowInfo.parameters[0].name;
                                    if (shadowInfo.attributes.paramFieldEditorOptions && shadowInfo.attributes.paramFieldEditorOptions[name_3]) {
                                        dl = !!(shadowInfo.attributes.paramFieldEditorOptions[name_3][DecompileParamKeys.DecompileLiterals]);
                                    }
                                    else {
                                        dl = true;
                                    }
                                }
                                else {
                                    dl = true;
                                }
                            }
                            if (!dl) {
                                return pxtc.Util.lf("Field editor does not support literal arguments");
                            }
                        }
                        else if (e.kind === SK.TaggedTemplateExpression && param.fieldEditor) {
                            var tagName = param.fieldOptions && param.fieldOptions[DecompileParamKeys.TaggedTemplate];
                            if (!tagName) {
                                return pxtc.Util.lf("Tagged templates only supported in custom fields with param.fieldOptions.taggedTemplate set");
                            }
                            var tag = unwrapNode(e.tag);
                            if (tag.kind !== SK.Identifier) {
                                return pxtc.Util.lf("Tagged template literals must use an identifier as the tag");
                            }
                            var tagText = tag.getText();
                            if (tagText.trim() != tagName.trim()) {
                                return pxtc.Util.lf("Function only supports template literals with tag '{0}'", tagName);
                            }
                            var template = e.template;
                            if (template.kind !== SK.NoSubstitutionTemplateLiteral) {
                                return pxtc.Util.lf("Tagged template literals cannot have substitutions");
                            }
                        }
                        else if (e.kind === SK.ArrowFunction) {
                            var ar = e;
                            if (ar.parameters.length) {
                                if (attributes.mutate === "objectdestructuring") {
                                    var param_1 = unwrapNode(ar.parameters[0]);
                                    if (param_1.kind === SK.Parameter && param_1.name.kind !== SK.ObjectBindingPattern) {
                                        return pxtc.Util.lf("Object destructuring mutation callbacks can only have destructuring patters as arguments");
                                    }
                                }
                                else {
                                    for (var _i = 0, _a = ar.parameters; _i < _a.length; _i++) {
                                        var param_2 = _a[_i];
                                        if (param_2.name.kind !== SK.Identifier) {
                                            return pxtc.Util.lf("Only identifiers allowed as function arguments");
                                        }
                                    }
                                }
                            }
                        }
                        else if (env.blocks.apis.byQName[paramInfo.type]) {
                            var typeInfo = env.blocks.apis.byQName[paramInfo.type];
                            if (typeInfo.attributes.fixedInstances) {
                                if (decompileFixedInst(param)) {
                                    return undefined;
                                }
                                else if (param.shadowBlockId) {
                                    var shadowSym = env.blocks.blocksById[param.shadowBlockId];
                                    if (shadowSym) {
                                        var shadowInfo = pxt.blocks.compileInfo(shadowSym);
                                        if (shadowInfo.parameters && decompileFixedInst(shadowInfo.parameters[0])) {
                                            return undefined;
                                        }
                                    }
                                }
                                var callInfo = pxtc.pxtInfo(e).callInfo;
                                if (callInfo && env.attrs(callInfo).fixedInstance) {
                                    return undefined;
                                }
                                return pxtc.Util.lf("Arguments of a fixed instance type must be a reference to a fixed instance declaration");
                            }
                        }
                        return undefined;
                        function checkEnumArgument(enumArg) {
                            if (enumArg.kind === SK.PropertyAccessExpression) {
                                var enumName = enumArg.expression;
                                if (enumName.kind === SK.Identifier && enumName.text === paramInfo.type) {
                                    return true;
                                }
                            }
                            return false;
                        }
                    }
                }
                function checkFunctionDeclaration(n, topLevel) {
                    if (!topLevel) {
                        return pxtc.Util.lf("Function declarations must be top level");
                    }
                    if (n.parameters.length > 0) {
                        if (env.opts.allowedArgumentTypes) {
                            for (var _i = 0, _a = n.parameters; _i < _a.length; _i++) {
                                var param = _a[_i];
                                if (param.initializer || param.questionToken) {
                                    return pxtc.Util.lf("Function parameters cannot be optional");
                                }
                                var type = param.type ? param.type.getText() : undefined;
                                if (!type) {
                                    return pxtc.Util.lf("Function parameters must declare a type");
                                }
                                if (env.opts.allowedArgumentTypes.indexOf(normalizeType(type)) === -1) {
                                    return pxtc.Util.lf("Only types that can be added in blocks can be used for function arguments");
                                }
                            }
                        }
                    }
                    var fail = false;
                    ts.forEachReturnStatement(n.body, function (stmt) {
                        if (stmt.expression) {
                            fail = true;
                        }
                    });
                    if (fail) {
                        return pxtc.Util.lf("Function with return value not supported in blocks");
                    }
                    return undefined;
                }
                function checkEnumDeclaration(n, topLevel) {
                    if (!topLevel)
                        return pxtc.Util.lf("Enum declarations must be top level");
                    var name = n.name.text;
                    var info = env.blocks.enumsByName[name];
                    if (!info)
                        return pxtc.Util.lf("Enum declarations in user code must have a block");
                    var fail = false;
                    // Initializers can either be a numeric literal or of the form a << b
                    n.members.forEach(function (member) {
                        if (member.name.kind !== SK.Identifier)
                            fail = true;
                        if (fail)
                            return;
                        if (member.initializer) {
                            if (member.initializer.kind === SK.NumericLiteral) {
                                return;
                            }
                            else if (member.initializer.kind === SK.BinaryExpression) {
                                var ex = member.initializer;
                                if (ex.operatorToken.kind === SK.LessThanLessThanToken) {
                                    if (ex.left.kind === SK.NumericLiteral && ex.right.kind === SK.NumericLiteral) {
                                        if (ex.left.text == "1") {
                                            return;
                                        }
                                    }
                                }
                            }
                            fail = true;
                        }
                    });
                    if (fail) {
                        return pxtc.Util.lf("Invalid initializer for enum member");
                    }
                    return undefined;
                }
                function checkNamespaceDeclaration(n) {
                    if (!ts.isModuleBlock(n.body)) {
                        return pxtc.Util.lf("Namespaces cannot be nested.");
                    }
                    var kindInfo = env.blocks.kindsByName[n.name.text];
                    if (!kindInfo) {
                        return pxtc.Util.lf("Only namespaces with 'kind' blocks can be decompiled");
                    }
                    var fail = pxtc.Util.lf("Namespaces may only contain valid 'kind' exports");
                    // Each statement must be of the form `export const kind = kindNamespace.create()`
                    for (var _i = 0, _a = n.body.statements; _i < _a.length; _i++) {
                        var statement = _a[_i];
                        // There isn't really a way to persist comments, so to be safe just bail out
                        if (isCommented(statement))
                            return fail;
                        if (ts.isVariableStatement(statement) && statement.declarationList.declarations) {
                            var isSingleDeclaration = statement.declarationList.declarations.length === 1;
                            var isExport = statement.modifiers && statement.modifiers.length === 1 && statement.modifiers[0].kind === SK.ExportKeyword;
                            var isConst_1 = statement.declarationList.flags & ts.NodeFlags.Const;
                            if (isSingleDeclaration && isExport && isConst_1) {
                                var declaration = statement.declarationList.declarations[0];
                                if (!declaration.initializer || !ts.isCallExpression(declaration.initializer) || !ts.isIdentifier(declaration.name)) {
                                    return fail;
                                }
                                var call = declaration.initializer;
                                if (call.arguments.length) {
                                    return fail;
                                }
                                // The namespace is emitted from the blocks, but it's optional when decompiling
                                if (ts.isPropertyAccessExpression(call.expression) && ts.isIdentifier(call.expression.expression)) {
                                    if (call.expression.expression.text !== kindInfo.name || call.expression.name.text !== kindInfo.createFunctionName)
                                        return fail;
                                }
                                else if (ts.isIdentifier(call.expression)) {
                                    if (call.expression.text !== kindInfo.createFunctionName)
                                        return fail;
                                }
                                else {
                                    return fail;
                                }
                            }
                            else {
                                return fail;
                            }
                        }
                        else {
                            return fail;
                        }
                    }
                    return undefined;
                }
            }
            function isEmptyStringNode(node) {
                if (node.kind === SK.StringLiteral || node.kind === SK.NoSubstitutionTemplateLiteral) {
                    return node.text === "";
                }
                return false;
            }
            function isAutoDeclaration(decl) {
                if (decl.initializer) {
                    if (decl.initializer.kind === ts.SyntaxKind.NullKeyword || decl.initializer.kind === ts.SyntaxKind.FalseKeyword || isDefaultArray(decl.initializer)) {
                        return true;
                    }
                    else if (ts.isStringOrNumericLiteral(decl.initializer)) {
                        var text = decl.initializer.getText();
                        return text === "0" || isEmptyString(text);
                    }
                    else {
                        var callInfo = pxtc.pxtInfo(decl.initializer).callInfo;
                        if (callInfo && callInfo.isAutoCreate)
                            return true;
                    }
                }
                return false;
            }
            function isDefaultArray(e) {
                return e.kind === SK.ArrayLiteralExpression && e.elements.length === 0;
            }
            function getCallInfo(checker, node, apiInfo) {
                var symb = checker.getSymbolAtLocation(node);
                if (symb) {
                    var qName = checker.getFullyQualifiedName(symb);
                    if (qName) {
                        return apiInfo.byQName[qName];
                    }
                }
                return undefined;
            }
            function getObjectBindingProperties(callback) {
                if (callback.parameters.length === 1 && callback.parameters[0].name.kind === SK.ObjectBindingPattern) {
                    var elements = callback.parameters[0].name.elements;
                    var renames_1 = {};
                    var properties = elements.map(function (e) {
                        if (checkName(e.propertyName) && checkName(e.name)) {
                            var name_4 = e.name.text;
                            if (e.propertyName) {
                                var propName = e.propertyName.text;
                                renames_1[propName] = name_4;
                                return propName;
                            }
                            return name_4;
                        }
                        else {
                            return "";
                        }
                    });
                    return [properties, renames_1];
                }
                return undefined;
                function checkName(name) {
                    if (name && name.kind !== SK.Identifier) {
                        // error(name, Util.lf("Only identifiers may be used for variable names in object destructuring patterns"));
                        return false;
                    }
                    return true;
                }
            }
            function checkExpression(n, env) {
                switch (n.kind) {
                    case SK.NumericLiteral:
                    case SK.TrueKeyword:
                    case SK.FalseKeyword:
                    case SK.ExpressionStatement:
                    case SK.ArrayLiteralExpression:
                    case SK.ElementAccessExpression:
                        return undefined;
                    case SK.ParenthesizedExpression:
                        return checkExpression(n.expression, env);
                    case SK.StringLiteral:
                    case SK.FirstTemplateToken:
                    case SK.NoSubstitutionTemplateLiteral:
                        return checkStringLiteral(n);
                    case SK.Identifier:
                        if (isUndefined(n)) {
                            return pxtc.Util.lf("Undefined is not supported in blocks");
                        }
                        else if (isDeclaredElsewhere(n)) {
                            return pxtc.Util.lf("Variable is declared in another file");
                        }
                        else {
                            return undefined;
                        }
                    case SK.BinaryExpression:
                        var op1 = n.operatorToken.getText();
                        return ops[op1] ? undefined : pxtc.Util.lf("Could not find operator {0}", op1);
                    case SK.PrefixUnaryExpression:
                        var op2 = n.operator;
                        return op2 === SK.MinusToken || op2 === SK.PlusToken || op2 === SK.ExclamationToken ?
                            undefined : pxtc.Util.lf("Unsupported prefix unary operator{0}", op2);
                    case SK.PropertyAccessExpression:
                        return checkPropertyAccessExpression(n, env);
                    case SK.CallExpression:
                        return checkStatement(n, env, true, undefined);
                    case SK.TaggedTemplateExpression:
                        return checkTaggedTemplateExpression(n, env);
                }
                return pxtc.Util.lf("Unsupported syntax kind for output expression block: {0}", SK[n.kind]);
                function checkStringLiteral(n) {
                    var literal = n.text;
                    return validStringRegex.test(literal) ? undefined : pxtc.Util.lf("Only whitespace character allowed in string literals is space");
                }
                function checkPropertyAccessExpression(n, env) {
                    var callInfo = pxtc.pxtInfo(n).callInfo;
                    if (callInfo) {
                        var attributes = env.attrs(callInfo);
                        var blockInfo = env.compInfo(callInfo);
                        if (attributes.blockIdentity || attributes.blockId === "lists_length" || attributes.blockId === "text_length") {
                            return undefined;
                        }
                        else if (callInfo.decl.kind === SK.EnumMember) {
                            // Check to see if this an enum with a block
                            if (n.expression.kind === SK.Identifier) {
                                var enumName = n.expression.text;
                                if (env.declaredEnums[enumName])
                                    return undefined;
                            }
                            // Otherwise make sure this is in a dropdown on the block
                            var _a = getParent(n), parent_2 = _a[0], child_1 = _a[1];
                            var fail_2 = true;
                            if (parent_2) {
                                var parentInfo = pxtc.pxtInfo(parent_2).callInfo;
                                if (parentInfo && parentInfo.args) {
                                    var api_1 = env.blocks.apis.byQName[parentInfo.qName];
                                    var instance_2 = api_1.kind == 1 /* Method */ || api_1.kind == 2 /* Property */;
                                    if (api_1) {
                                        parentInfo.args.forEach(function (arg, i) {
                                            if (arg === child_1) {
                                                var paramInfo = api_1.parameters[instance_2 ? i - 1 : i];
                                                if (paramInfo.isEnum) {
                                                    fail_2 = false;
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                            if (fail_2) {
                                return pxtc.Util.lf("Enum value without a corresponding block");
                            }
                            else {
                                return undefined;
                            }
                        }
                        else if (attributes.fixedInstance && n.parent) {
                            // Check if this is a fixedInstance with a method being called on it
                            if (n.parent.parent && n.parent.kind === SK.PropertyAccessExpression && n.parent.parent.kind === SK.CallExpression) {
                                var call = n.parent.parent;
                                if (call.expression === n.parent) {
                                    return undefined;
                                }
                            }
                            else if (n.parent.kind === SK.CallExpression && n.parent.expression !== n) {
                                return undefined;
                            }
                        }
                        else if (attributes.blockCombine || (attributes.blockId && blockInfo && blockInfo.thisParameter)) {
                            // block combine and getters/setters
                            return checkExpression(n.expression, env);
                        }
                        else if (ts.isIdentifier(n.expression) && env.declaredKinds[n.expression.text]) {
                            var propName = n.name.text;
                            var kind = env.declaredKinds[n.expression.text];
                            if (kind && (kind.kindInfo.initialMembers.indexOf(propName) !== -1 || kind.declaredNames.indexOf(propName) !== -1)) {
                                return undefined;
                            }
                        }
                    }
                    return pxtc.Util.lf("No call info found");
                }
            }
            function checkTaggedTemplateExpression(t, env) {
                var callInfo = pxtc.pxtInfo(t).callInfo;
                if (!callInfo) {
                    return pxtc.Util.lf("Invalid tagged template");
                }
                var attributes = env.attrs(callInfo);
                if (!attributes.blockIdentity) {
                    return pxtc.Util.lf("Tagged template does not have blockIdentity set");
                }
                var api = env.blocks.apis.byQName[attributes.blockIdentity];
                if (!api) {
                    return pxtc.Util.lf("Could not find blockIdentity for tagged template");
                }
                var comp = pxt.blocks.compileInfo(api);
                if (comp.parameters.length !== 1) {
                    return pxtc.Util.lf("Tagged template functions must have 1 argument");
                }
                // The compiler will have already caught any invalid tags or templates
                return undefined;
            }
            function getParent(node) {
                if (!node.parent) {
                    return [undefined, node];
                }
                else if (node.parent.kind === SK.ParenthesizedExpression) {
                    return getParent(node.parent);
                }
                else {
                    return [node.parent, node];
                }
            }
            function unwrapNode(node) {
                while (node.kind === SK.ParenthesizedExpression) {
                    node = node.expression;
                }
                return node;
            }
            function isEmptyString(a) {
                return a === "\"\"" || a === "''" || a === "``";
            }
            function isUndefined(node) {
                return node && node.kind === SK.Identifier && node.text === "undefined";
            }
            function isDeclaredElsewhere(node) {
                return !!(pxtc.pxtInfo(node).flags & 4 /* IsGlobalIdentifier */);
            }
            function hasStatementInput(info, attributes) {
                if (attributes.blockId === pxtc.PAUSE_UNTIL_TYPE)
                    return false;
                var parameters = info.decl.parameters;
                return info.args.some(function (arg, index) { return arg && isFunctionExpression(arg); });
            }
            function isLiteralNode(node) {
                if (!node) {
                    return false;
                }
                switch (node.kind) {
                    case SK.ParenthesizedExpression:
                        return isLiteralNode(node.expression);
                    case SK.NumericLiteral:
                    case SK.StringLiteral:
                    case SK.NoSubstitutionTemplateLiteral:
                    case SK.TrueKeyword:
                    case SK.FalseKeyword:
                        return true;
                    case SK.PrefixUnaryExpression:
                        var expression = node;
                        return (expression.operator === SK.PlusToken || expression.operator === SK.MinusToken) && isLiteralNode(expression.operand);
                    default:
                        return false;
                }
            }
            function isFunctionExpression(node) {
                return node.kind === SK.ArrowFunction || node.kind === SK.FunctionExpression;
            }
            function paramList(info, blocksInfo) {
                var res = [];
                var sym = blocksInfo.apis.byQName[info.qName];
                if (sym) {
                    var attributes = blocksInfo.apis.byQName[info.qName].attributes;
                    var comp = pxt.blocks.compileInfo(sym);
                    var builtin = pxt.blocks.builtinFunctionInfo[info.qName];
                    var offset = attributes.imageLiteral ? 1 : 0;
                    if (comp.thisParameter) {
                        res.push({
                            value: unwrapNode(info.args[0]),
                            info: null,
                            param: comp.thisParameter
                        });
                    }
                    else if (attributes.defaultInstance) {
                        res.push({
                            value: unwrapNode(info.args[0]),
                            info: sym.parameters[0],
                            param: { definitionName: "__instance__", actualName: "this" }
                        });
                    }
                    var hasThisArgInSymbol = !!(comp.thisParameter || attributes.defaultInstance);
                    if (hasThisArgInSymbol) {
                        offset++;
                    }
                    for (var i = offset; i < info.args.length; i++) {
                        res.push({
                            value: unwrapNode(info.args[i]),
                            info: sym.parameters[hasThisArgInSymbol ? i - 1 : i],
                            param: comp.parameters[i - offset]
                        });
                    }
                }
                return res;
            }
            // This assumes the enum already passed checkEnumDeclaration
            function getEnumMembers(n) {
                var res = [];
                n.members.forEach(function (member) {
                    pxtc.U.assert(member.name.kind === SK.Identifier);
                    var name = member.name.text;
                    var value;
                    if (member.initializer) {
                        if (member.initializer.kind === SK.NumericLiteral) {
                            value = parseInt(member.initializer.text);
                        }
                        else {
                            var ex = member.initializer;
                            pxtc.U.assert(ex.left.kind === SK.NumericLiteral);
                            pxtc.U.assert(ex.left.text === "1");
                            pxtc.U.assert(ex.operatorToken.kind === SK.LessThanLessThanToken);
                            pxtc.U.assert(ex.right.kind === SK.NumericLiteral);
                            var shift = parseInt(ex.right.text);
                            value = 1 << shift;
                        }
                    }
                    else if (res.length === 0) {
                        value = 0;
                    }
                    else {
                        value = res[res.length - 1][1] + 1;
                    }
                    res.push([name, value]);
                });
                return res;
            }
            function getKindExports(n) {
                return n.body.statements.map(function (s) { return s.declarationList.declarations[0].name.text; });
            }
            function isOutputExpression(expr) {
                switch (expr.kind) {
                    case SK.BinaryExpression:
                        var tk = expr.operatorToken.kind;
                        return tk != SK.PlusEqualsToken && tk != SK.MinusEqualsToken && tk != SK.EqualsToken;
                    case SK.PrefixUnaryExpression: {
                        var op = expr.operator;
                        return op != SK.PlusPlusToken && op != SK.MinusMinusToken;
                    }
                    case SK.PostfixUnaryExpression: {
                        var op = expr.operator;
                        return op != SK.PlusPlusToken && op != SK.MinusMinusToken;
                    }
                    case SK.CallExpression:
                        var callInfo = pxtc.pxtInfo(expr).callInfo;
                        pxtc.assert(!!callInfo);
                        return callInfo.isExpression;
                    case SK.ParenthesizedExpression:
                    case SK.NumericLiteral:
                    case SK.StringLiteral:
                    case SK.NoSubstitutionTemplateLiteral:
                    case SK.TrueKeyword:
                    case SK.FalseKeyword:
                    case SK.NullKeyword:
                    case SK.TaggedTemplateExpression:
                        return true;
                    default: return false;
                }
            }
            function isLiteralBlockType(type) {
                switch (type) {
                    case numberType:
                    case minmaxNumberType:
                    case integerNumberType:
                    case wholeNumberType:
                    case stringType:
                    case booleanType:
                        return true;
                    default:
                        return false;
                }
            }
            function decompileFixedInst(param) {
                return param && param.fieldOptions && param.fieldOptions[DecompileParamKeys.DecompileIndirectFixedInstances];
            }
            function isSupportedMathFunction(op) {
                return isUnaryMathFunction(op) || isInfixMathFunction(op) || isRoundingFunction(op) ||
                    pxt.blocks.MATH_FUNCTIONS.binary.indexOf(op) !== -1;
            }
            function isUnaryMathFunction(op) {
                return pxt.blocks.MATH_FUNCTIONS.unary.indexOf(op) !== -1;
            }
            function isInfixMathFunction(op) {
                return pxt.blocks.MATH_FUNCTIONS.infix.indexOf(op) !== -1;
            }
            function isRoundingFunction(op) {
                return pxt.blocks.ROUNDING_FUNCTIONS.indexOf(op) !== -1;
            }
            function normalizeType(type) {
                var match = arrayTypeRegex.exec(type);
                if (match) {
                    return (match[1] || match[2]) + "[]";
                }
                return type;
            }
            function isCommented(node) {
                var ranges = ts.getLeadingCommentRangesOfNode(node, node.getSourceFile());
                return !!(ranges && ranges.length);
            }
        })(decompiler = pxtc.decompiler || (pxtc.decompiler = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/* Docs:
 *
 * Thumb 16-bit Instruction Set Quick Reference Card
 *   http://infocenter.arm.com/help/topic/com.arm.doc.qrc0006e/QRC0006_UAL16.pdf
 *
 * ARMv6-M Architecture Reference Manual (bit encoding of instructions)
 *   http://ecee.colorado.edu/ecen3000/labs/lab3/files/DDI0419C_arm_architecture_v6m_reference_manual.pdf
 *
 * The ARM-THUMB Procedure Call Standard
 *   http://www.cs.cornell.edu/courses/cs414/2001fa/armcallconvention.pdf
 *
 * Cortex-M0 Technical Reference Manual: 3.3. Instruction set summary (cycle counts)
 *   http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.ddi0432c/CHDCICDF.html  // M0
 *   http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.ddi0484c/CHDCICDF.html  // M0+
 */
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var thumb;
        (function (thumb) {
            var thumbRegs = {
                "r0": 0,
                "r1": 1,
                "r2": 2,
                "r3": 3,
                "r4": 4,
                "r5": 5,
                "r6": 6,
                "r7": 7,
                "r8": 8,
                "r9": 9,
                "r10": 10,
                "r11": 10,
                "r12": 12,
                "sp": 13,
                "r13": 13,
                "lr": 14,
                "r14": 14,
                "pc": 15,
                "r15": 15,
            };
            var ThumbProcessor = /** @class */ (function (_super) {
                __extends(ThumbProcessor, _super);
                function ThumbProcessor() {
                    var _this = _super.call(this) || this;
                    // Registers
                    // $r0 - bits 2:1:0
                    // $r1 - bits 5:4:3
                    // $r2 - bits 7:2:1:0
                    // $r3 - bits 6:5:4:3
                    // $r4 - bits 8:7:6
                    // $r5 - bits 10:9:8
                    _this.addEnc("$r0", "R0-7", function (v) { return _this.inrange(7, v, v); });
                    _this.addEnc("$r1", "R0-7", function (v) { return _this.inrange(7, v, v << 3); });
                    _this.addEnc("$r2", "R0-15", function (v) { return _this.inrange(15, v, (v & 7) | ((v & 8) << 4)); });
                    _this.addEnc("$r3", "R0-15", function (v) { return _this.inrange(15, v, v << 3); });
                    _this.addEnc("$r4", "R0-7", function (v) { return _this.inrange(7, v, v << 6); });
                    _this.addEnc("$r5", "R0-7", function (v) { return _this.inrange(7, v, v << 8); });
                    // this for setting both $r0 and $r1 (two argument adds and subs)
                    _this.addEnc("$r01", "R0-7", function (v) { return _this.inrange(7, v, (v | v << 3)); });
                    // Immdiates:
                    // $i0 - bits 7-0
                    // $i1 - bits 7-0 * 4
                    // $i2 - bits 6-0 * 4
                    // $i3 - bits 8-6
                    // $i4 - bits 10-6
                    // $i5 - bits 10-6 * 4
                    // $i6 - bits 10-6, 0 is 32
                    // $i7 - bits 10-6 * 2
                    _this.addEnc("$i0", "#0-255", function (v) { return _this.inrange(255, v, v); });
                    _this.addEnc("$i1", "#0-1020", function (v) { return _this.inrange(255, v / 4, v >> 2); });
                    _this.addEnc("$i2", "#0-510", function (v) { return _this.inrange(127, v / 4, v >> 2); });
                    _this.addEnc("$i3", "#0-7", function (v) { return _this.inrange(7, v, v << 6); });
                    _this.addEnc("$i4", "#0-31", function (v) { return _this.inrange(31, v, v << 6); });
                    _this.addEnc("$i5", "#0-124", function (v) { return _this.inrange(31, v / 4, (v >> 2) << 6); });
                    _this.addEnc("$i6", "#1-32", function (v) { return v == 0 ? null : v == 32 ? 0 : _this.inrange(31, v, v << 6); });
                    _this.addEnc("$i7", "#0-62", function (v) { return _this.inrange(31, v / 2, (v >> 1) << 6); });
                    _this.addEnc("$i32", "#0-2^32", function (v) { return 1; });
                    _this.addEnc("$rl0", "{R0-7,...}", function (v) { return _this.inrange(255, v, v); });
                    _this.addEnc("$rl1", "{LR,R0-7,...}", function (v) { return (v & 0x4000) ? _this.inrange(255, (v & ~0x4000), 0x100 | (v & 0xff)) : _this.inrange(255, v, v); });
                    _this.addEnc("$rl2", "{PC,R0-7,...}", function (v) { return (v & 0x8000) ? _this.inrange(255, (v & ~0x8000), 0x100 | (v & 0xff)) : _this.inrange(255, v, v); });
                    _this.addEnc("$la", "LABEL", function (v) { return _this.inrange(255, v / 4, v >> 2); }).isWordAligned = true;
                    _this.addEnc("$lb", "LABEL", function (v) { return _this.inrangeSigned(127, v / 2, v >> 1); });
                    _this.addEnc("$lb11", "LABEL", function (v) { return _this.inrangeSigned(1023, v / 2, v >> 1); });
                    //this.addInst("nop",                   0xbf00, 0xffff);  // we use mov r8,r8 as gcc
                    _this.addInst("adcs  $r0, $r1", 0x4140, 0xffc0);
                    _this.addInst("add   $r2, $r3", 0x4400, 0xff00);
                    _this.addInst("add   $r5, pc, $i1", 0xa000, 0xf800);
                    _this.addInst("add   $r5, sp, $i1", 0xa800, 0xf800);
                    _this.addInst("add   sp, $i2", 0xb000, 0xff80).canBeShared = true;
                    _this.addInst("adds  $r0, $r1, $i3", 0x1c00, 0xfe00);
                    _this.addInst("adds  $r0, $r1, $r4", 0x1800, 0xfe00);
                    _this.addInst("adds  $r01, $r4", 0x1800, 0xfe00);
                    _this.addInst("adds  $r5, $i0", 0x3000, 0xf800);
                    _this.addInst("adr   $r5, $la", 0xa000, 0xf800);
                    _this.addInst("ands  $r0, $r1", 0x4000, 0xffc0);
                    _this.addInst("asrs  $r0, $r1", 0x4100, 0xffc0);
                    _this.addInst("asrs  $r0, $r1, $i6", 0x1000, 0xf800);
                    _this.addInst("bics  $r0, $r1", 0x4380, 0xffc0);
                    _this.addInst("bkpt  $i0", 0xbe00, 0xff00);
                    _this.addInst("blx   $r3", 0x4780, 0xff87);
                    _this.addInst("bx    $r3", 0x4700, 0xff80);
                    _this.addInst("cmn   $r0, $r1", 0x42c0, 0xffc0);
                    _this.addInst("cmp   $r0, $r1", 0x4280, 0xffc0);
                    _this.addInst("cmp   $r2, $r3", 0x4500, 0xff00);
                    _this.addInst("cmp   $r5, $i0", 0x2800, 0xf800);
                    _this.addInst("eors  $r0, $r1", 0x4040, 0xffc0);
                    _this.addInst("ldmia $r5!, $rl0", 0xc800, 0xf800);
                    _this.addInst("ldmia $r5, $rl0", 0xc800, 0xf800);
                    _this.addInst("ldr   $r0, [$r1, $i5]", 0x6800, 0xf800); // this is used for debugger breakpoint - cannot be shared
                    _this.addInst("ldr   $r0, [$r1, $r4]", 0x5800, 0xfe00);
                    _this.addInst("ldr   $r5, [pc, $i1]", 0x4800, 0xf800);
                    _this.addInst("ldr   $r5, $la", 0x4800, 0xf800);
                    _this.addInst("ldr   $r5, [sp, $i1]", 0x9800, 0xf800).canBeShared = true;
                    _this.addInst("ldr   $r5, [sp]", 0x9800, 0xf800).canBeShared = true;
                    _this.addInst("ldrb  $r0, [$r1, $i4]", 0x7800, 0xf800);
                    _this.addInst("ldrb  $r0, [$r1, $r4]", 0x5c00, 0xfe00);
                    _this.addInst("ldrh  $r0, [$r1, $i7]", 0x8800, 0xf800);
                    _this.addInst("ldrh  $r0, [$r1, $r4]", 0x5a00, 0xfe00);
                    _this.addInst("ldrsb $r0, [$r1, $r4]", 0x5600, 0xfe00);
                    _this.addInst("ldrsh $r0, [$r1, $r4]", 0x5e00, 0xfe00);
                    _this.addInst("lsls  $r0, $r1", 0x4080, 0xffc0);
                    _this.addInst("lsls  $r0, $r1, $i4", 0x0000, 0xf800);
                    _this.addInst("lsrs  $r0, $r1", 0x40c0, 0xffc0);
                    _this.addInst("lsrs  $r0, $r1, $i6", 0x0800, 0xf800);
                    //this.addInst("mov   $r0, $r1", 0x4600, 0xffc0);
                    _this.addInst("mov   $r2, $r3", 0x4600, 0xff00);
                    _this.addInst("movs  $r0, $r1", 0x0000, 0xffc0);
                    _this.addInst("movs  $r5, $i0", 0x2000, 0xf800);
                    _this.addInst("muls  $r0, $r1", 0x4340, 0xffc0);
                    _this.addInst("mvns  $r0, $r1", 0x43c0, 0xffc0);
                    _this.addInst("negs  $r0, $r1", 0x4240, 0xffc0);
                    _this.addInst("nop", 0x46c0, 0xffff); // mov r8, r8
                    _this.addInst("orrs  $r0, $r1", 0x4300, 0xffc0);
                    _this.addInst("pop   $rl2", 0xbc00, 0xfe00);
                    _this.addInst("push  $rl1", 0xb400, 0xfe00);
                    _this.addInst("rev   $r0, $r1", 0xba00, 0xffc0);
                    _this.addInst("rev16 $r0, $r1", 0xba40, 0xffc0);
                    _this.addInst("revsh $r0, $r1", 0xbac0, 0xffc0);
                    _this.addInst("rors  $r0, $r1", 0x41c0, 0xffc0);
                    _this.addInst("sbcs  $r0, $r1", 0x4180, 0xffc0);
                    _this.addInst("sev", 0xbf40, 0xffff);
                    _this.addInst("stm   $r5!, $rl0", 0xc000, 0xf800);
                    _this.addInst("stmia $r5!, $rl0", 0xc000, 0xf800); // alias for stm
                    _this.addInst("stmea $r5!, $rl0", 0xc000, 0xf800); // alias for stm
                    _this.addInst("str   $r0, [$r1, $i5]", 0x6000, 0xf800).canBeShared = true;
                    _this.addInst("str   $r0, [$r1]", 0x6000, 0xf800).canBeShared = true;
                    _this.addInst("str   $r0, [$r1, $r4]", 0x5000, 0xfe00);
                    _this.addInst("str   $r5, [sp, $i1]", 0x9000, 0xf800).canBeShared = true;
                    _this.addInst("str   $r5, [sp]", 0x9000, 0xf800).canBeShared = true;
                    _this.addInst("strb  $r0, [$r1, $i4]", 0x7000, 0xf800);
                    _this.addInst("strb  $r0, [$r1, $r4]", 0x5400, 0xfe00);
                    _this.addInst("strh  $r0, [$r1, $i7]", 0x8000, 0xf800);
                    _this.addInst("strh  $r0, [$r1, $r4]", 0x5200, 0xfe00);
                    _this.addInst("sub   sp, $i2", 0xb080, 0xff80);
                    _this.addInst("subs  $r0, $r1, $i3", 0x1e00, 0xfe00);
                    _this.addInst("subs  $r0, $r1, $r4", 0x1a00, 0xfe00);
                    _this.addInst("subs  $r01, $r4", 0x1a00, 0xfe00);
                    _this.addInst("subs  $r5, $i0", 0x3800, 0xf800);
                    _this.addInst("svc   $i0", 0xdf00, 0xff00);
                    _this.addInst("sxtb  $r0, $r1", 0xb240, 0xffc0);
                    _this.addInst("sxth  $r0, $r1", 0xb200, 0xffc0);
                    _this.addInst("tst   $r0, $r1", 0x4200, 0xffc0);
                    _this.addInst("udf   $i0", 0xde00, 0xff00);
                    _this.addInst("uxtb  $r0, $r1", 0xb2c0, 0xffc0);
                    _this.addInst("uxth  $r0, $r1", 0xb280, 0xffc0);
                    _this.addInst("wfe", 0xbf20, 0xffff);
                    _this.addInst("wfi", 0xbf30, 0xffff);
                    _this.addInst("yield", 0xbf10, 0xffff);
                    _this.addInst("cpsid i", 0xb672, 0xffff);
                    _this.addInst("cpsie i", 0xb662, 0xffff);
                    _this.addInst("beq   $lb", 0xd000, 0xff00);
                    _this.addInst("bne   $lb", 0xd100, 0xff00);
                    _this.addInst("bcs   $lb", 0xd200, 0xff00);
                    _this.addInst("bcc   $lb", 0xd300, 0xff00);
                    _this.addInst("bmi   $lb", 0xd400, 0xff00);
                    _this.addInst("bpl   $lb", 0xd500, 0xff00);
                    _this.addInst("bvs   $lb", 0xd600, 0xff00);
                    _this.addInst("bvc   $lb", 0xd700, 0xff00);
                    _this.addInst("bhi   $lb", 0xd800, 0xff00);
                    _this.addInst("bls   $lb", 0xd900, 0xff00);
                    _this.addInst("bge   $lb", 0xda00, 0xff00);
                    _this.addInst("blt   $lb", 0xdb00, 0xff00);
                    _this.addInst("bgt   $lb", 0xdc00, 0xff00);
                    _this.addInst("ble   $lb", 0xdd00, 0xff00);
                    _this.addInst("bhs   $lb", 0xd200, 0xff00); // cs
                    _this.addInst("blo   $lb", 0xd300, 0xff00); // cc
                    _this.addInst("b     $lb11", 0xe000, 0xf800);
                    _this.addInst("bal   $lb11", 0xe000, 0xf800);
                    // handled specially - 32 bit instruction
                    _this.addInst("bl    $lb", 0xf000, 0xf800, true);
                    // this is normally emitted as 'b' but will be emitted as 'bl' if needed
                    _this.addInst("bb    $lb", 0xe000, 0xf800, true);
                    // this will emit as PC-relative LDR or ADDS
                    _this.addInst("ldlit   $r5, $i32", 0x4800, 0xf800);
                    return _this;
                }
                ThumbProcessor.prototype.toFnPtr = function (v, baseOff, lbl) {
                    if (pxtc.target.runtimeIsARM && /::/.test(lbl))
                        return (v + baseOff) & ~1;
                    return (v + baseOff) | 1;
                };
                ThumbProcessor.prototype.wordSize = function () {
                    return 4;
                };
                ThumbProcessor.prototype.is32bit = function (i) {
                    return i.name == "bl" || i.name == "bb";
                };
                ThumbProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    // Thumb addresses have last bit set, but we are ourselves always
                    // in Thumb state, so to go to ARM state, we signal that with that last bit
                    v ^= 1;
                    v -= f.baseOffset;
                    return v;
                };
                ThumbProcessor.prototype.emit32 = function (v0, v, actual) {
                    var isBLX = v % 2 ? true : false;
                    if (isBLX) {
                        v = (v + 1) & ~3;
                    }
                    var off = v >> 1;
                    pxtc.assert(off != null);
                    // Range is +-4M (i.e., 2M instructions)
                    if ((off | 0) != off ||
                        !(-2 * 1024 * 1024 < off && off < 2 * 1024 * 1024))
                        return pxtc.assembler.emitErr("jump out of range", actual);
                    // note that off is already in instructions, not bytes
                    var imm11 = off & 0x7ff;
                    var imm10 = (off >> 11) & 0x3ff;
                    return {
                        opcode: (off & 0xf0000000) ? (0xf400 | imm10) : (0xf000 | imm10),
                        opcode2: isBLX ? (0xe800 | imm11) : (0xf800 | imm11),
                        stack: 0,
                        numArgs: [v],
                        labelName: actual
                    };
                };
                ThumbProcessor.prototype.expandLdlit = function (f) {
                    var nextGoodSpot;
                    var needsJumpOver = false;
                    var outlines = [];
                    var values = {};
                    var seq = 1;
                    for (var i = 0; i < f.lines.length; ++i) {
                        var line = f.lines[i];
                        outlines.push(line);
                        if (line.type == "instruction" && line.instruction && line.instruction.name == "ldlit") {
                            if (!nextGoodSpot) {
                                var limit = line.location + 900; // leave some space - real limit is 1020
                                var j = i + 1;
                                for (; j < f.lines.length; ++j) {
                                    if (f.lines[j].location > limit)
                                        break;
                                    var op = f.lines[j].getOp();
                                    if (op == "b" || op == "bb" || (op == "pop" && f.lines[j].words[2] == "pc"))
                                        nextGoodSpot = f.lines[j];
                                }
                                if (nextGoodSpot) {
                                    needsJumpOver = false;
                                }
                                else {
                                    needsJumpOver = true;
                                    while (--j > i) {
                                        if (f.lines[j].type == "instruction") {
                                            nextGoodSpot = f.lines[j];
                                            break;
                                        }
                                    }
                                }
                            }
                            var reg = line.words[1];
                            // make sure the key in values[] below doesn't look like integer
                            // we rely on Object.keys() returning stuff in insertion order, and integers mess with it
                            // see https://www.ecma-international.org/ecma-262/6.0/#sec-ordinary-object-internal-methods-and-internal-slots-ownpropertykeys
                            // or possibly https://www.stefanjudis.com/today-i-learned/property-order-is-predictable-in-javascript-objects-since-es2015/
                            var v = "#" + line.words[3];
                            var lbl = pxtc.U.lookup(values, v);
                            if (!lbl) {
                                lbl = "_ldlit_" + ++seq;
                                values[v] = lbl;
                            }
                            line.update("ldr " + reg + ", " + lbl);
                        }
                        if (line === nextGoodSpot) {
                            nextGoodSpot = null;
                            var txtLines = [];
                            var jmplbl = "_jmpwords_" + ++seq;
                            if (needsJumpOver)
                                txtLines.push("bb " + jmplbl);
                            txtLines.push(".balign 4");
                            for (var _i = 0, _a = Object.keys(values); _i < _a.length; _i++) {
                                var v = _a[_i];
                                var lbl = values[v];
                                txtLines.push(lbl + ": .word " + v.slice(1));
                            }
                            if (needsJumpOver)
                                txtLines.push(jmplbl + ":");
                            for (var _b = 0, txtLines_1 = txtLines; _b < txtLines_1.length; _b++) {
                                var t = txtLines_1[_b];
                                f.buildLine(t, outlines);
                                var ll = outlines[outlines.length - 1];
                                ll.scope = line.scope;
                                ll.lineNo = line.lineNo;
                            }
                            values = {};
                        }
                    }
                    f.lines = outlines;
                };
                ThumbProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    var l = f.lookupLabel(s);
                    if (l == null)
                        return null;
                    var pc = f.location() + 4;
                    if (wordAligned)
                        pc = pc & 0xfffffffc;
                    return l - pc;
                };
                ThumbProcessor.prototype.isPop = function (opcode) {
                    return opcode == 0xbc00;
                };
                ThumbProcessor.prototype.isPush = function (opcode) {
                    return opcode == 0xb400;
                };
                ThumbProcessor.prototype.isAddSP = function (opcode) {
                    return opcode == 0xb000;
                };
                ThumbProcessor.prototype.isSubSP = function (opcode) {
                    return opcode == 0xb080;
                };
                ThumbProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    var lb11 = this.encoders["$lb11"];
                    var lb = this.encoders["$lb"];
                    // +/-8 bytes is because the code size can slightly change due to .balign directives
                    // inserted by literal generation code; see https://github.com/Microsoft/pxt-adafruit/issues/514
                    // Most likely 4 would be enough, but we play it safe
                    function fits(enc, ln) {
                        return (enc.encode(ln.numArgs[0] + 8) != null &&
                            enc.encode(ln.numArgs[0] - 8) != null &&
                            enc.encode(ln.numArgs[0]) != null);
                    }
                    var lnop = ln.getOp();
                    var isSkipBranch = false;
                    if (lnop == "bne" || lnop == "beq") {
                        if (lnNext.getOp() == "b" && ln.numArgs[0] == 0)
                            isSkipBranch = true;
                        if (lnNext.getOp() == "bb" && ln.numArgs[0] == 2)
                            isSkipBranch = true;
                    }
                    if (lnop == "bb" && fits(lb11, ln)) {
                        // RULE: bb .somewhere -> b .somewhere (if fits)
                        ln.update("b " + ln.words[1]);
                    }
                    else if (lnop == "b" && ln.numArgs[0] == -2) {
                        // RULE: b .somewhere; .somewhere: -> .somewhere:
                        ln.update("");
                    }
                    else if (lnop == "bne" && isSkipBranch && fits(lb, lnNext)) {
                        // RULE: bne .next; b .somewhere; .next: -> beq .somewhere
                        ln.update("beq " + lnNext.words[1]);
                        lnNext.update("");
                    }
                    else if (lnop == "beq" && isSkipBranch && fits(lb, lnNext)) {
                        // RULE: beq .next; b .somewhere; .next: -> bne .somewhere
                        ln.update("bne " + lnNext.words[1]);
                        lnNext.update("");
                    }
                    else if (lnop == "push" && ln.numArgs[0] == 0x4000 && lnNext.getOp() == "push" && !(lnNext.numArgs[0] & 0x4000)) {
                        // RULE: push {lr}; push {X, ...} -> push {lr, X, ...}
                        ln.update(lnNext.text.replace("{", "{lr, "));
                        lnNext.update("");
                    }
                    else if (lnop == "pop" && lnNext.getOp() == "pop" && lnNext.numArgs[0] == 0x8000) {
                        // RULE: pop {X, ...}; pop {pc} -> push {X, ..., pc}
                        ln.update(ln.text.replace("}", ", pc}"));
                        lnNext.update("");
                    }
                    else if (lnop == "push" && lnNext.getOp() == "pop" && ln.numArgs[0] == lnNext.numArgs[0]) {
                        // RULE: push {X}; pop {X} -> nothing
                        pxtc.assert(ln.numArgs[0] > 0);
                        ln.update("");
                        lnNext.update("");
                    }
                    else if (lnop == "push" && lnNext.getOp() == "pop" &&
                        ln.words.length == 4 &&
                        lnNext.words.length == 4) {
                        // RULE: push {rX}; pop {rY} -> mov rY, rX
                        pxtc.assert(ln.words[1] == "{");
                        ln.update("mov " + lnNext.words[2] + ", " + ln.words[2]);
                        lnNext.update("");
                    }
                    else if (lnNext2 && ln.getOpExt() == "movs $r5, $i0" && lnNext.getOpExt() == "mov $r0, $r1" &&
                        ln.numArgs[0] == lnNext.numArgs[1] &&
                        clobbersReg(lnNext2, ln.numArgs[0])) {
                        // RULE: movs rX, #V; mov rY, rX; clobber rX -> movs rY, #V
                        ln.update("movs r" + lnNext.numArgs[0] + ", #" + ln.numArgs[1]);
                        lnNext.update("");
                    }
                    else if (lnop == "pop" && singleReg(ln) >= 0 && lnNext.getOp() == "push" &&
                        singleReg(ln) == singleReg(lnNext)) {
                        // RULE: pop {rX}; push {rX} -> ldr rX, [sp, #0]
                        ln.update("ldr r" + singleReg(ln) + ", [sp, #0]");
                        lnNext.update("");
                    }
                    else if (lnop == "push" && lnNext.getOpExt() == "ldr $r5, [sp, $i1]" &&
                        singleReg(ln) == lnNext.numArgs[0] && lnNext.numArgs[1] == 0) {
                        // RULE: push {rX}; ldr rX, [sp, #0] -> push {rX}
                        lnNext.update("");
                    }
                    else if (lnNext2 && lnop == "push" && singleReg(ln) >= 0 && preservesReg(lnNext, singleReg(ln)) &&
                        lnNext2.getOp() == "pop" && singleReg(ln) == singleReg(lnNext2)) {
                        // RULE: push {rX}; movs rY, #V; pop {rX} -> movs rY, #V (when X != Y)
                        ln.update("");
                        lnNext2.update("");
                    }
                };
                ThumbProcessor.prototype.registerNo = function (actual) {
                    if (!actual)
                        return null;
                    actual = actual.toLowerCase();
                    var r = thumbRegs[actual];
                    if (r === undefined)
                        return null;
                    return r;
                };
                ThumbProcessor.prototype.testAssembler = function () {
                    pxtc.assembler.expectError(this, "lsl r0, r0, #8");
                    pxtc.assembler.expectError(this, "push {pc,lr}");
                    pxtc.assembler.expectError(this, "push {r17}");
                    pxtc.assembler.expectError(this, "mov r0, r1 foo");
                    pxtc.assembler.expectError(this, "movs r14, #100");
                    pxtc.assembler.expectError(this, "push {r0");
                    pxtc.assembler.expectError(this, "push lr,r0}");
                    pxtc.assembler.expectError(this, "pop {lr,r0}");
                    pxtc.assembler.expectError(this, "b #+11");
                    pxtc.assembler.expectError(this, "b #+102400");
                    pxtc.assembler.expectError(this, "bne undefined_label");
                    pxtc.assembler.expectError(this, ".foobar");
                    pxtc.assembler.expect(this, "0200      lsls    r0, r0, #8\n" +
                        "b500      push    {lr}\n" +
                        "2064      movs    r0, #100        ; 0x64\n" +
                        "b401      push    {r0}\n" +
                        "bc08      pop     {r3}\n" +
                        "b501      push    {r0, lr}\n" +
                        "bd20      pop {r5, pc}\n" +
                        "bc01      pop {r0}\n" +
                        "4770      bx      lr\n" +
                        "0000      .balign 4\n" +
                        "e6c0      .word   -72000\n" +
                        "fffe\n");
                    pxtc.assembler.expect(this, "4291      cmp     r1, r2\n" +
                        "d100      bne     l6\n" +
                        "e000      b       l8\n" +
                        "1840  l6: adds    r0, r0, r1\n" +
                        "4718  l8: bx      r3\n");
                    pxtc.assembler.expect(this, "          @stackmark base\n" +
                        "b403      push    {r0, r1}\n" +
                        "          @stackmark locals\n" +
                        "9801      ldr     r0, [sp, locals@1]\n" +
                        "b401      push    {r0}\n" +
                        "9802      ldr     r0, [sp, locals@1]\n" +
                        "bc01      pop     {r0}\n" +
                        "          @stackempty locals\n" +
                        "9901      ldr     r1, [sp, locals@1]\n" +
                        "9102      str     r1, [sp, base@0]\n" +
                        "          @stackempty locals\n" +
                        "b002      add     sp, #8\n" +
                        "          @stackempty base\n");
                    pxtc.assembler.expect(this, "b090      sub sp, #4*16\n" +
                        "b010      add sp, #4*16\n");
                    pxtc.assembler.expect(this, "6261      .string \"abc\"\n" +
                        "0063      \n");
                    pxtc.assembler.expect(this, "6261      .string \"abcde\"\n" +
                        "6463      \n" +
                        "0065      \n");
                    pxtc.assembler.expect(this, "3042      adds r0, 0x42\n" +
                        "1c0d      adds r5, r1, #0\n" +
                        "d100      bne #0\n" +
                        "2800      cmp r0, #0\n" +
                        "6b28      ldr r0, [r5, #48]\n" +
                        "0200      lsls r0, r0, #8\n" +
                        "2063      movs r0, 0x63\n" +
                        "4240      negs r0, r0\n" +
                        "46c0      nop\n" +
                        "b500      push {lr}\n" +
                        "b401      push {r0}\n" +
                        "b402      push {r1}\n" +
                        "b404      push {r2}\n" +
                        "b408      push {r3}\n" +
                        "b520      push {r5, lr}\n" +
                        "bd00      pop {pc}\n" +
                        "bc01      pop {r0}\n" +
                        "bc02      pop {r1}\n" +
                        "bc04      pop {r2}\n" +
                        "bc08      pop {r3}\n" +
                        "bd20      pop {r5, pc}\n" +
                        "9003      str r0, [sp, #4*3]\n");
                };
                return ThumbProcessor;
            }(pxtc.assembler.AbstractProcessor));
            thumb.ThumbProcessor = ThumbProcessor;
            // if true then instruction doesn't write r<n> and doesn't read/write memory
            function preservesReg(ln, n) {
                if (ln.getOpExt() == "movs $r5, $i0" && ln.numArgs[0] != n)
                    return true;
                return false;
            }
            function clobbersReg(ln, n) {
                // TODO add some more
                if (ln.getOp() == "pop" && ln.numArgs[0] & (1 << n))
                    return true;
                return false;
            }
            function singleReg(ln) {
                pxtc.assert(ln.getOp() == "push" || ln.getOp() == "pop");
                var k = 0;
                var ret = -1;
                var v = ln.numArgs[0];
                while (v > 0) {
                    if (v & 1) {
                        if (ret == -1)
                            ret = k;
                        else
                            ret = -2;
                    }
                    v >>= 1;
                    k++;
                }
                if (ret >= 0)
                    return ret;
                else
                    return -1;
            }
        })(thumb = pxtc.thumb || (pxtc.thumb = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
// TODO remove decr() on variable init
// TODO figure out why undefined initializer generates code
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var ir;
        (function (ir) {
            var U = pxtc.Util;
            var assert = U.assert;
            var EK;
            (function (EK) {
                EK[EK["None"] = 0] = "None";
                EK[EK["NumberLiteral"] = 1] = "NumberLiteral";
                EK[EK["PointerLiteral"] = 2] = "PointerLiteral";
                EK[EK["RuntimeCall"] = 3] = "RuntimeCall";
                EK[EK["ProcCall"] = 4] = "ProcCall";
                EK[EK["SharedRef"] = 5] = "SharedRef";
                EK[EK["SharedDef"] = 6] = "SharedDef";
                EK[EK["FieldAccess"] = 7] = "FieldAccess";
                EK[EK["Store"] = 8] = "Store";
                EK[EK["CellRef"] = 9] = "CellRef";
                EK[EK["Sequence"] = 10] = "Sequence";
                EK[EK["JmpValue"] = 11] = "JmpValue";
                EK[EK["Nop"] = 12] = "Nop";
                EK[EK["InstanceOf"] = 13] = "InstanceOf";
            })(EK = ir.EK || (ir.EK = {}));
            var currExprId = 0;
            var Node = /** @class */ (function () {
                function Node() {
                }
                Node.prototype.isExpr = function () { return false; };
                Node.prototype.isStmt = function () { return false; };
                Node.prototype.getId = function () {
                    if (!this._id)
                        this._id = ++currExprId;
                    return this._id;
                };
                return Node;
            }());
            ir.Node = Node;
            var Expr = /** @class */ (function (_super) {
                __extends(Expr, _super);
                function Expr(exprKind, args, data) {
                    var _this = _super.call(this) || this;
                    _this.exprKind = exprKind;
                    _this.args = args;
                    _this.data = data;
                    _this.callingConvention = 0 /* Plain */;
                    return _this;
                }
                Expr.clone = function (e) {
                    var copy = new Expr(e.exprKind, e.args ? e.args.slice(0) : null, e.data);
                    if (e.jsInfo)
                        copy.jsInfo = e.jsInfo;
                    if (e.totalUses) {
                        copy.totalUses = e.totalUses;
                        copy.currUses = e.currUses;
                    }
                    copy.callingConvention = e.callingConvention;
                    copy.mask = e.mask;
                    copy.isStringLiteral = e.isStringLiteral;
                    return copy;
                };
                Expr.prototype.ptrlabel = function () {
                    if (this.jsInfo instanceof Stmt)
                        return this.jsInfo;
                    return null;
                };
                Expr.prototype.hexlit = function () {
                    var anyJs = this.jsInfo;
                    if (anyJs.hexlit)
                        return anyJs.hexlit;
                    return null;
                };
                Expr.prototype.isExpr = function () { return true; };
                Expr.prototype.isPure = function () {
                    return this.isStateless() || this.exprKind == EK.CellRef;
                };
                Expr.prototype.isLiteral = function () {
                    switch (this.exprKind) {
                        case EK.NumberLiteral:
                        case EK.PointerLiteral:
                            return true;
                        default: return false;
                    }
                };
                Expr.prototype.isStateless = function () {
                    switch (this.exprKind) {
                        case EK.NumberLiteral:
                        case EK.PointerLiteral:
                        case EK.SharedRef:
                            return true;
                        default: return false;
                    }
                };
                Expr.prototype.sharingInfo = function () {
                    var arg0 = this;
                    var id = this.getId();
                    if (this.exprKind == EK.SharedRef || this.exprKind == EK.SharedDef) {
                        arg0 = this.args[0];
                        if (!arg0)
                            arg0 = { currUses: "", totalUses: "" };
                        else
                            id = arg0.getId();
                    }
                    return arg0.currUses + "/" + arg0.totalUses + " #" + id;
                };
                Expr.prototype.toString = function () {
                    return nodeToString(this);
                };
                Expr.prototype.canUpdateCells = function () {
                    switch (this.exprKind) {
                        case EK.NumberLiteral:
                        case EK.PointerLiteral:
                        case EK.CellRef:
                        case EK.JmpValue:
                        case EK.SharedRef:
                        case EK.Nop:
                            return false;
                        case EK.SharedDef:
                        case EK.FieldAccess:
                        case EK.InstanceOf:
                            return this.args[0].canUpdateCells();
                        case EK.RuntimeCall:
                        case EK.ProcCall:
                        case EK.Sequence:
                            return true;
                        case EK.Store:
                            return true;
                        default: throw pxtc.oops();
                    }
                };
                return Expr;
            }(Node));
            ir.Expr = Expr;
            var SK;
            (function (SK) {
                SK[SK["None"] = 0] = "None";
                SK[SK["Expr"] = 1] = "Expr";
                SK[SK["Label"] = 2] = "Label";
                SK[SK["Jmp"] = 3] = "Jmp";
                SK[SK["StackEmpty"] = 4] = "StackEmpty";
                SK[SK["Breakpoint"] = 5] = "Breakpoint";
            })(SK = ir.SK || (ir.SK = {}));
            var JmpMode;
            (function (JmpMode) {
                JmpMode[JmpMode["Always"] = 1] = "Always";
                JmpMode[JmpMode["IfZero"] = 2] = "IfZero";
                JmpMode[JmpMode["IfNotZero"] = 3] = "IfNotZero";
            })(JmpMode = ir.JmpMode || (ir.JmpMode = {}));
            ir.lblNumUsesJmpNext = -101;
            var Stmt = /** @class */ (function (_super) {
                __extends(Stmt, _super);
                function Stmt(stmtKind, expr) {
                    var _this = _super.call(this) || this;
                    _this.stmtKind = stmtKind;
                    _this.expr = expr;
                    return _this;
                }
                Stmt.prototype.isStmt = function () { return true; };
                Stmt.prototype.toString = function () {
                    return nodeToString(this);
                };
                return Stmt;
            }(Node));
            ir.Stmt = Stmt;
            function nodeToString(n) {
                return str(n);
                function str(n) {
                    if (n.isExpr()) {
                        var e = n;
                        var a0 = e.args ? e.args[0] : null;
                        switch (e.exprKind) {
                            case EK.NumberLiteral:
                                return e.data + "";
                            case EK.PointerLiteral:
                                return e.data + "";
                            case EK.CellRef:
                                return e.data.toString();
                            case EK.JmpValue:
                                return "JMPVALUE";
                            case EK.Nop:
                                return "NOP";
                            case EK.SharedRef:
                                return "SHARED_REF(#" + a0.getId() + ")";
                            case EK.SharedDef:
                                return "SHARED_DEF(#" + a0.getId() + ": " + str(a0) + ")";
                            case EK.FieldAccess:
                                return str(a0) + "." + e.data.name;
                            case EK.RuntimeCall:
                                return e.data + "(" + e.args.map(str).join(", ") + ")";
                            case EK.ProcCall:
                                var procid = e.data;
                                var name_5 = "";
                                if (procid.ifaceIndex != null)
                                    name_5 = "IFACE@" + procid.ifaceIndex;
                                else if (procid.virtualIndex != null)
                                    name_5 = "VTABLE@" + procid.virtualIndex;
                                else
                                    name_5 = pxtc.getDeclName(procid.proc.action);
                                return name_5 + "(" + e.args.map(str).join(", ") + ")";
                            case EK.Sequence:
                                return "(" + e.args.map(str).join("; ") + ")";
                            case EK.InstanceOf:
                                return "(" + str(e.args[0]) + " instanceof " + e.data.id + ")";
                            case EK.Store:
                                return "{ " + str(e.args[0]) + " := " + str(e.args[1]) + " }";
                            default: throw pxtc.oops();
                        }
                    }
                    else {
                        var stmt_1 = n;
                        var inner = stmt_1.expr ? str(stmt_1.expr) : "{null}";
                        switch (stmt_1.stmtKind) {
                            case ir.SK.Expr:
                                return "    " + inner + "\n";
                            case ir.SK.Jmp:
                                var fin = "goto " + stmt_1.lblName + "\n";
                                switch (stmt_1.jmpMode) {
                                    case JmpMode.Always:
                                        if (stmt_1.expr)
                                            return "    { JMPVALUE := " + inner + " } " + fin;
                                        else
                                            return "    " + fin;
                                    case JmpMode.IfZero:
                                        return "    if (! " + inner + ") " + fin;
                                    case JmpMode.IfNotZero:
                                        return "    if (" + inner + ") " + fin;
                                    default: throw pxtc.oops();
                                }
                            case ir.SK.StackEmpty:
                                return "    ;\n";
                            case ir.SK.Breakpoint:
                                return "    // brk " + (stmt_1.breakpointInfo.id) + "\n";
                            case ir.SK.Label:
                                return stmt_1.lblName + ":\n";
                            default: throw pxtc.oops();
                        }
                    }
                }
            }
            var Cell = /** @class */ (function () {
                function Cell(index, def, info) {
                    this.index = index;
                    this.def = def;
                    this.info = info;
                    this.isarg = false;
                    this.iscap = false;
                    this._isLocal = false;
                    this._isGlobal = false;
                    this._debugType = "?";
                    this.isUserVariable = false;
                    this.bitSize = 0 /* None */;
                    if (def) {
                        if (!pxtc.isInPxtModules(def)) {
                            this.isUserVariable = true;
                        }
                        if (info) {
                            pxtc.setCellProps(this);
                        }
                    }
                }
                Cell.prototype.getName = function () {
                    return pxtc.getDeclName(this.def);
                };
                Cell.prototype.getDebugInfo = function () {
                    return {
                        name: this.getName(),
                        type: this._debugType,
                        index: this.index,
                    };
                };
                Cell.prototype.toString = function () {
                    var n = "";
                    if (this.def)
                        n += this.getName() || "?";
                    if (this.isarg)
                        n = "ARG " + n;
                    //if (this.isByRefLocal()) n = "BYREF " + n
                    return "[" + n + "]";
                };
                Cell.prototype.uniqueName = function () {
                    if (this.isarg)
                        return "arg" + this.index; // have to keep names stable for inheritance
                    return this.getName().replace(/[^\w]/g, "_") + "___" + pxtc.getNodeId(this.def);
                };
                Cell.prototype.isLocal = function () { return this._isLocal; };
                Cell.prototype.isGlobal = function () { return this._isGlobal; };
                Cell.prototype.loadCore = function () {
                    return op(EK.CellRef, null, this);
                };
                Cell.prototype.load = function () {
                    var r = this.loadCore();
                    if (pxtc.target.isNative && this.bitSize != 0 /* None */) {
                        if (this.bitSize == 6 /* UInt32 */)
                            return rtcall("pxt::fromUInt", [r]);
                        return rtcall("pxt::fromInt", [r]);
                    }
                    if (this.isByRefLocal())
                        return rtcall("pxtrt::ldlocRef", [r]);
                    return r;
                };
                Cell.prototype.isByRefLocal = function () {
                    return this.isLocal() && this.info.captured && this.info.written;
                };
                Cell.prototype.storeDirect = function (src) {
                    return op(EK.Store, [this.loadCore(), src]);
                };
                Cell.prototype.storeByRef = function (src) {
                    if (this.isByRefLocal()) {
                        return rtcall("pxtrt::stlocRef", [this.loadCore(), src]);
                    }
                    else {
                        if (pxtc.target.isNative && this.bitSize != 0 /* None */) {
                            var cnv = this.bitSize == 6 /* UInt32 */ ? "pxt::toUInt" : "pxt::toInt";
                            return this.storeDirect(rtcall(cnv, [src], 1));
                        }
                        return this.storeDirect(src);
                    }
                };
                Object.defineProperty(Cell.prototype, "isTemporary", {
                    get: function () {
                        return false;
                    },
                    enumerable: true,
                    configurable: true
                });
                return Cell;
            }());
            ir.Cell = Cell;
            //Cells that represent variables that are generated by the compiler as temporaries
            //The user cannot access these cells from JS or blocks
            var UnnamedCell = /** @class */ (function (_super) {
                __extends(UnnamedCell, _super);
                function UnnamedCell(index, owningProc) {
                    var _this = _super.call(this, index, null, null) || this;
                    _this.index = index;
                    _this.owningProc = owningProc;
                    _this.uid = UnnamedCell.unnamedCellCounter++;
                    return _this;
                }
                UnnamedCell.prototype.getName = function () {
                    return "unnamed" + this.uid;
                };
                UnnamedCell.prototype.uniqueName = function () {
                    return this.getName() + "___U" + this.index;
                };
                UnnamedCell.prototype.isByRefLocal = function () {
                    return false;
                };
                Object.defineProperty(UnnamedCell.prototype, "isTemporary", {
                    get: function () {
                        return true;
                    },
                    enumerable: true,
                    configurable: true
                });
                UnnamedCell.unnamedCellCounter = 0;
                return UnnamedCell;
            }(Cell));
            ir.UnnamedCell = UnnamedCell;
            // estimated cost in bytes of Thumb code to execute given expression
            function inlineWeight(e) {
                var cantInline = 1000000;
                var inner = function () {
                    if (!e.args)
                        return 0;
                    var inner = 0;
                    for (var _i = 0, _a = e.args; _i < _a.length; _i++) {
                        var ee = _a[_i];
                        inner += inlineWeight(ee);
                    }
                    if (e.mask && e.mask.conversions)
                        inner += e.mask.conversions.length * 4;
                    return inner;
                };
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                        return 2;
                    case EK.PointerLiteral:
                        return 2 + 4;
                    case EK.RuntimeCall:
                        return inner() + 2 + 2 + 4;
                    case EK.CellRef:
                        return 2;
                    case EK.FieldAccess:
                        return inner() + (e.data.needsCheck ? 4 : 0) + 2;
                    case EK.ProcCall:
                    case EK.SharedRef:
                    case EK.SharedDef:
                    case EK.Store:
                    case EK.Sequence:
                    case EK.JmpValue:
                    case EK.Nop:
                    case EK.InstanceOf:
                        return cantInline;
                    /* maybe in future
                    case EK.ProcCall:
                        return inner() + 2 * e.args.length + 4 + 2
                    case EK.SharedRef:
                        return 2
                    case EK.SharedDef:
                        return inner() + 2
                    case EK.Store:
                        return inner()
                    case EK.Sequence:
                        return inner()
                    case EK.JmpValue:
                        return 0
                    case EK.Nop:
                        return 0
                    case EK.InstanceOf:
                        return inner() + 8
                        */
                    default:
                        throw U.oops();
                }
            }
            function inlineSubst(e) {
                e = Expr.clone(e);
                switch (e.exprKind) {
                    case EK.PointerLiteral:
                    case EK.NumberLiteral:
                        return e;
                    case EK.RuntimeCall:
                        for (var i = 0; i < e.args.length; ++i)
                            e.args[i] = inlineSubst(e.args[i]);
                        return e;
                    case EK.CellRef:
                        var cell = e.data;
                        if (cell.repl) {
                            cell.replUses++;
                            return cell.repl;
                        }
                        return e;
                    case EK.FieldAccess:
                        e.args[0] = inlineSubst(e.args[0]);
                        return e;
                    default:
                        throw U.oops();
                }
            }
            var Procedure = /** @class */ (function (_super) {
                __extends(Procedure, _super);
                function Procedure() {
                    var _this = _super !== null && _super.apply(this, arguments) || this;
                    _this.numArgs = 0;
                    _this.info = null;
                    _this.seqNo = -1;
                    _this.isRoot = false;
                    _this.locals = [];
                    _this.captured = [];
                    _this.args = [];
                    _this.parent = null;
                    _this.debugInfo = null;
                    _this.fillDebugInfo = null;
                    _this.classInfo = null;
                    _this.perfCounterName = null;
                    _this.perfCounterNo = 0;
                    _this.body = [];
                    _this.lblNo = 0;
                    _this.action = null;
                    _this.cachedJS = null;
                    _this.usingCtx = null;
                    return _this;
                }
                Procedure.prototype.reset = function () {
                    this.body = [];
                    this.lblNo = 0;
                    this.locals = [];
                    this.captured = [];
                    this.args = [];
                };
                Procedure.prototype.vtLabel = function () {
                    return this.label() + (pxtc.isStackMachine() ? "" : "_args");
                };
                Procedure.prototype.label = function () {
                    return pxtc.getFunctionLabel(this.action);
                };
                Procedure.prototype.toString = function () {
                    return "\nPROC " + pxtc.getDeclName(this.action) + "\n" + this.body.map(function (s) { return s.toString(); }).join("") + "\n";
                };
                Procedure.prototype.emit = function (stmt) {
                    this.body.push(stmt);
                };
                Procedure.prototype.emitExpr = function (expr) {
                    this.emit(stmt(SK.Expr, expr));
                };
                Procedure.prototype.mkLabel = function (name) {
                    var lbl = stmt(SK.Label, null);
                    lbl.lblName = "." + name + "_" + this.lblNo++ + "_" + this.seqNo;
                    lbl.lbl = lbl;
                    return lbl;
                };
                Procedure.prototype.emitLbl = function (lbl) {
                    this.emit(lbl);
                };
                Procedure.prototype.emitLblDirect = function (lblName) {
                    var lbl = stmt(SK.Label, null);
                    lbl.lblName = lblName;
                    lbl.lbl = lbl;
                    this.emit(lbl);
                };
                Procedure.prototype.getFullName = function () {
                    var name = this.getName();
                    if (this.action) {
                        var info = ts.pxtc.nodeLocationInfo(this.action);
                        name += " " + info.fileName.replace("pxt_modules/", "") + ":" + (info.line + 1);
                    }
                    return name;
                };
                Procedure.prototype.getName = function () {
                    var text = this.action && this.action.name ? this.action.name.text : null;
                    return text || "inline";
                };
                Procedure.prototype.mkLocal = function (def, info) {
                    var l = new Cell(this.locals.length, def, info);
                    this.locals.push(l);
                    return l;
                };
                Procedure.prototype.mkLocalUnnamed = function () {
                    var uc = new UnnamedCell(this.locals.length, this);
                    this.locals.push(uc);
                    return uc;
                };
                Procedure.prototype.localIndex = function (l, noargs) {
                    if (noargs === void 0) { noargs = false; }
                    return this.captured.filter(function (n) { return n.def == l; })[0] ||
                        this.locals.filter(function (n) { return n.def == l; })[0] ||
                        (noargs ? null : this.args.filter(function (n) { return n.def == l; })[0]);
                };
                Procedure.prototype.stackEmpty = function () {
                    this.emit(stmt(SK.StackEmpty, null));
                };
                Procedure.prototype.emitJmpZ = function (trg, expr) {
                    this.emitJmp(trg, expr, JmpMode.IfZero);
                };
                Procedure.prototype.emitJmp = function (trg, expr, mode, terminate) {
                    if (mode === void 0) { mode = JmpMode.Always; }
                    if (terminate === void 0) { terminate = null; }
                    var jmp = stmt(SK.Jmp, expr);
                    jmp.jmpMode = mode;
                    if (terminate && terminate.exprKind == EK.NumberLiteral)
                        terminate = null;
                    jmp.terminateExpr = terminate;
                    if (typeof trg == "string")
                        jmp.lblName = trg;
                    else {
                        jmp.lbl = trg;
                        jmp.lblName = jmp.lbl.lblName;
                    }
                    this.emit(jmp);
                };
                Procedure.prototype.inlineSelf = function (args) {
                    var _a = flattenArgs(args), precomp = _a.precomp, flattened = _a.flattened;
                    U.assert(flattened.length == this.args.length);
                    this.args.map(function (a, i) {
                        a.repl = flattened[i];
                        a.replUses = 0;
                    });
                    var r = inlineSubst(this.inlineBody);
                    this.args.forEach(function (a, i) {
                        if (a.repl.exprKind == EK.SharedRef) {
                            a.repl.args[0].totalUses += a.replUses - 1;
                        }
                        a.repl = null;
                        a.replUses = 0;
                    });
                    if (precomp.length) {
                        precomp.push(r);
                        return op(EK.Sequence, precomp);
                    }
                    else {
                        return r;
                    }
                };
                Procedure.prototype.resolve = function () {
                    var iterargs = function (e, f) {
                        if (e.args)
                            for (var i = 0; i < e.args.length; ++i)
                                e.args[i] = f(e.args[i]);
                    };
                    // after this, totalUses holds the negation of the actual usage count
                    // also the first SharedRef is replaced with SharedDef
                    var refdef = function (e) {
                        switch (e.exprKind) {
                            case EK.SharedDef: throw U.oops();
                            case EK.SharedRef:
                                var arg = e.args[0];
                                if (!arg.totalUses) {
                                    arg.totalUses = -1;
                                    arg.currUses = 0;
                                    arg.irCurrUses = 0;
                                    var e2 = Expr.clone(e);
                                    e2.exprKind = EK.SharedDef;
                                    e2.args[0] = refdef(e2.args[0]);
                                    return e2;
                                }
                                else {
                                    arg.totalUses--;
                                    return e;
                                }
                        }
                        iterargs(e, refdef);
                        return e;
                    };
                    var opt = function (e) {
                        if (e.exprKind == EK.SharedRef)
                            return e;
                        iterargs(e, opt);
                        switch (e.exprKind) {
                            case EK.Sequence:
                                e.args = e.args.filter(function (a, i) {
                                    if (i != e.args.length - 1 && a.isPure()) {
                                        // in the second opt() phase, we already have computed the total usage counts
                                        // if we drop some expressions, these need to be updated
                                        if (a.exprKind == EK.SharedRef && a.args[0].totalUses > 0)
                                            a.args[0].totalUses--;
                                        return false;
                                    }
                                    return true;
                                });
                                break;
                        }
                        return e;
                    };
                    var cntuses = function (e) {
                        switch (e.exprKind) {
                            case EK.SharedDef:
                                var arg = e.args[0];
                                //console.log(arg)
                                U.assert(arg.totalUses < 0, "arg.totalUses < 0");
                                U.assert(arg.currUses === 0, "arg.currUses === 0");
                                // if there is just one usage, strip the SharedDef
                                if (arg.totalUses == -1)
                                    return cntuses(arg);
                                else
                                    // now, we start counting for real
                                    arg.totalUses = 1;
                                break;
                            case EK.SharedRef:
                                U.assert(e.args[0].totalUses > 0, "e.args[0].totalUses > 0");
                                e.args[0].totalUses++;
                                return e;
                            case EK.PointerLiteral:
                                var pl = e.ptrlabel();
                                if (pl) {
                                    if (!pl.lblNumUses)
                                        pl.lblNumUses = 0;
                                    pl.lblNumUses++;
                                }
                                break;
                        }
                        iterargs(e, cntuses);
                        return e;
                    };
                    var sharedincr = function (e) {
                        //console.log("OUTSH", e.toString())
                        switch (e.exprKind) {
                            case EK.SharedDef:
                                iterargs(e, sharedincr);
                            case EK.SharedRef:
                                var arg = e.args[0];
                                U.assert(arg.totalUses > 0, "arg.totalUses > 0");
                                if (arg.totalUses == 1) {
                                    U.assert(e.exprKind == EK.SharedDef);
                                    return arg;
                                }
                                arg.irCurrUses++;
                                return e;
                            default:
                                iterargs(e, sharedincr);
                                return e;
                        }
                    };
                    this.body = this.body.filter(function (s) {
                        if (s.expr) {
                            //console.log("OPT", s.expr.toString())
                            s.expr = opt(refdef(s.expr));
                            //console.log("INTO", s.expr.toString())
                            if (s.stmtKind == ir.SK.Expr && s.expr.isPure())
                                return false;
                        }
                        return true;
                    });
                    var lbls = U.toDictionary(this.body.filter(function (s) { return s.stmtKind == ir.SK.Label; }), function (s) { return s.lblName; });
                    for (var i = 0; i < this.body.length; ++i)
                        this.body[i].stmtNo = i;
                    for (var _i = 0, _a = this.body; _i < _a.length; _i++) {
                        var s = _a[_i];
                        if (s.expr) {
                            //console.log("CNT", s.expr.toString())
                            s.expr = cntuses(s.expr);
                        }
                        switch (s.stmtKind) {
                            case ir.SK.Expr:
                                break;
                            case ir.SK.Jmp:
                                s.lbl = U.lookup(lbls, s.lblName);
                                if (!s.lbl)
                                    pxtc.oops("missing label: " + s.lblName);
                                if (!s.lbl.lblNumUses)
                                    s.lbl.lblNumUses = 1;
                                else
                                    s.lbl.lblNumUses++;
                                break;
                            case ir.SK.StackEmpty:
                            case ir.SK.Label:
                            case ir.SK.Breakpoint:
                                break;
                            default: pxtc.oops();
                        }
                    }
                    var allBrkp = [];
                    var prev = null;
                    var canInline = pxtc.target.debugMode ? false : true;
                    var inlineBody = null;
                    for (var _b = 0, _c = this.body; _b < _c.length; _b++) {
                        var s = _c[_b];
                        if (s.expr) {
                            s.expr = opt(sharedincr(s.expr));
                        }
                        // mark Jump-to-next-instruction
                        if (prev && prev.lbl == s &&
                            prev.stmtKind == ir.SK.Jmp &&
                            s.stmtKind == ir.SK.Label &&
                            prev.jmpMode == ir.JmpMode.Always &&
                            s.lblNumUses == 1) {
                            s.lblNumUses = ir.lblNumUsesJmpNext;
                        }
                        prev = s;
                        if (s.stmtKind == ir.SK.Breakpoint) {
                            allBrkp[s.breakpointInfo.id] = s.breakpointInfo;
                        }
                        else if (canInline) {
                            if (s.stmtKind == ir.SK.Jmp) {
                                if (s.expr) {
                                    if (inlineBody)
                                        canInline = false;
                                    else
                                        inlineBody = s.expr;
                                }
                            }
                            else if (s.stmtKind == ir.SK.StackEmpty) {
                                // OK
                            }
                            else if (s.stmtKind == ir.SK.Label) {
                                if (s.lblNumUses != ir.lblNumUsesJmpNext)
                                    canInline = false;
                            }
                            else {
                                canInline = false;
                            }
                        }
                    }
                    if (canInline && inlineBody) {
                        var bodyCost = inlineWeight(inlineBody);
                        var callCost = 4 * this.args.length + 4 + 2;
                        var inlineBonus = pxtc.target.isNative ? 4 : 30;
                        if (bodyCost <= callCost + inlineBonus) {
                            this.inlineBody = inlineBody;
                            //pxt.log("INLINE: " + inlineWeight(inlineBody) + "/" + callCost + " - " + this.toString())
                        }
                    }
                    if (pxt.options.debug)
                        pxt.debug(this.toString());
                    var debugSucc = false;
                    if (debugSucc) {
                        var s = "BRKP: " + this.getName() + ":\n";
                        for (var i = 0; i < allBrkp.length; ++i) {
                            var b = allBrkp[i];
                            if (!b)
                                continue;
                            s += b.line + 1 + ": ";
                            var n = allBrkp[i + 1];
                            s += "\n";
                        }
                        console.log(s);
                    }
                };
                return Procedure;
            }(Node));
            ir.Procedure = Procedure;
            function iterExpr(e, f) {
                f(e);
                if (e.args)
                    for (var _i = 0, _a = e.args; _i < _a.length; _i++) {
                        var a = _a[_i];
                        iterExpr(a, f);
                    }
            }
            ir.iterExpr = iterExpr;
            function stmt(kind, expr) {
                return new Stmt(kind, expr);
            }
            ir.stmt = stmt;
            function op(kind, args, data) {
                return new Expr(kind, args, data);
            }
            ir.op = op;
            function numlit(v) {
                return op(EK.NumberLiteral, null, v);
            }
            ir.numlit = numlit;
            function shared(expr) {
                switch (expr.exprKind) {
                    case EK.SharedRef:
                        expr = expr.args[0];
                        break;
                    //case EK.PointerLiteral:
                    case EK.NumberLiteral:
                        return expr;
                }
                var r = op(EK.SharedRef, [expr]);
                return r;
            }
            ir.shared = shared;
            function ptrlit(lbl, jsInfo) {
                var r = op(EK.PointerLiteral, null, lbl);
                r.jsInfo = jsInfo;
                return r;
            }
            ir.ptrlit = ptrlit;
            function rtcall(name, args, mask) {
                if (mask === void 0) { mask = 0; }
                var r = op(EK.RuntimeCall, args, name);
                if (mask)
                    r.mask = { refMask: mask };
                return r;
            }
            ir.rtcall = rtcall;
            function rtcallMask(name, mask, callingConv, args) {
                if (U.startsWith(name, "@nomask@")) {
                    name = name.slice(8);
                    mask = 0;
                }
                var r = rtcall(name, args, mask);
                r.callingConvention = callingConv;
                return r;
            }
            ir.rtcallMask = rtcallMask;
            function flattenArgs(args, reorder) {
                if (reorder === void 0) { reorder = false; }
                var didStateUpdate = reorder ? args.some(function (a) { return a.canUpdateCells(); }) : false;
                var complexArgs = [];
                for (var _i = 0, _a = U.reversed(args); _i < _a.length; _i++) {
                    var a = _a[_i];
                    if (a.isStateless())
                        continue;
                    if (a.exprKind == EK.CellRef && !didStateUpdate)
                        continue;
                    if (a.canUpdateCells())
                        didStateUpdate = true;
                    complexArgs.push(a);
                }
                complexArgs.reverse();
                if (pxtc.isStackMachine())
                    complexArgs = [];
                var precomp = [];
                var flattened = args.map(function (a) {
                    var idx = complexArgs.indexOf(a);
                    if (idx >= 0) {
                        var sharedRef = a;
                        var sharedDef = a;
                        if (a.exprKind == EK.SharedDef) {
                            a.args[0].totalUses++;
                            sharedRef = ir.op(EK.SharedRef, [a.args[0]]);
                        }
                        else {
                            sharedRef = ir.op(EK.SharedRef, [a]);
                            sharedDef = ir.op(EK.SharedDef, [a]);
                            a.totalUses = 2;
                            a.currUses = 0;
                        }
                        precomp.push(sharedDef);
                        return sharedRef;
                    }
                    else
                        return a;
                });
                return { precomp: precomp, flattened: flattened };
            }
            ir.flattenArgs = flattenArgs;
        })(ir = pxtc.ir || (pxtc.ir = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../../localtypings/pxtarget.d.ts"/>
/// <reference path="../../localtypings/pxtpackage.d.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var PxtNode = /** @class */ (function () {
            function PxtNode(wave, id) {
                this.wave = wave;
                this.id = id;
                this.flags = 0 /* None */;
                this.resetAll();
            }
            PxtNode.prototype.refresh = function () {
                // clear IsUsed flag
                this.flags &= ~8 /* IsUsed */;
                // this happens for top-level function expression - we just re-emit them
                if (this.proc && !this.usedActions && !getEnclosingFunction(this.proc.action))
                    this.resetEmit();
                else if (this.proc && !this.proc.cachedJS)
                    this.resetEmit();
                else if (this.usedNodes)
                    this.flags |= 32 /* FromPreviousCompile */;
                if (this.classInfo)
                    this.classInfo.reset();
            };
            PxtNode.prototype.resetEmit = function () {
                // clear IsUsed flag
                this.flags &= ~(8 /* IsUsed */ | 32 /* FromPreviousCompile */);
                if (this.proc && this.proc.classInfo && this.proc.classInfo.ctor == this.proc)
                    this.proc.classInfo.ctor = null;
                this.functionInfo = null;
                this.variableInfo = null;
                this.classInfo = null;
                this.callInfo = null;
                this.proc = null;
                this.cell = null;
                this.exprInfo = null;
                this.usedNodes = null;
                this.usedActions = null;
            };
            PxtNode.prototype.resetTSC = function () {
                // clear all flags except for InPxtModules
                this.flags &= 16 /* InPxtModules */;
                this.typeCache = null;
                this.symbolCache = null;
                this.commentAttrs = null;
                this.valueOverride = null;
                this.declCache = undefined;
                this.fullName = null;
                this.constantFolded = undefined;
            };
            PxtNode.prototype.resetAll = function () {
                this.resetTSC();
                this.resetEmit();
            };
            return PxtNode;
        }());
        pxtc.PxtNode = PxtNode;
        var HasLiteralType;
        (function (HasLiteralType) {
            HasLiteralType[HasLiteralType["Enum"] = 0] = "Enum";
            HasLiteralType[HasLiteralType["Number"] = 1] = "Number";
            HasLiteralType[HasLiteralType["String"] = 2] = "String";
            HasLiteralType[HasLiteralType["Boolean"] = 3] = "Boolean";
            HasLiteralType[HasLiteralType["Unsupported"] = 4] = "Unsupported";
        })(HasLiteralType || (HasLiteralType = {}));
        // in tagged mode,
        // * the lowest bit set means 31 bit signed integer
        // * the lowest bit clear, and second lowest set means special constant
        // "undefined" is represented by 0
        function taggedSpecialValue(n) { return (n << 2) | 2; }
        pxtc.taggedUndefined = 0;
        pxtc.taggedNull = taggedSpecialValue(1);
        pxtc.taggedFalse = taggedSpecialValue(2);
        pxtc.taggedNaN = taggedSpecialValue(3);
        pxtc.taggedTrue = taggedSpecialValue(16);
        function fitsTaggedInt(vn) {
            if (pxtc.target.switches.boxDebug)
                return false;
            return (vn | 0) == vn && -1073741824 <= vn && vn <= 1073741823;
        }
        pxtc.thumbArithmeticInstr = {
            "adds": true,
            "subs": true,
            "muls": true,
            "ands": true,
            "orrs": true,
            "eors": true,
            "lsls": true,
            "asrs": true,
            "lsrs": true,
        };
        pxtc.numberArithmeticInstr = {
            "div": true,
            "mod": true,
            "le": true,
            "lt": true,
            "ge": true,
            "gt": true,
            "eq": true,
            "neq": true,
        };
        var thumbFuns = {
            "Array_::getAt": {
                name: "_pxt_array_get",
                argsFmt: ["T", "T", "T"],
                value: 0
            },
            "Array_::setAt": {
                name: "_pxt_array_set",
                argsFmt: ["T", "T", "T", "T"],
                value: 0
            },
            "BufferMethods::getByte": {
                name: "_pxt_buffer_get",
                argsFmt: ["T", "T", "T"],
                value: 0
            },
            "BufferMethods::setByte": {
                name: "_pxt_buffer_set",
                argsFmt: ["T", "T", "T", "I"],
                value: 0
            },
            "pxtrt::mapGetGeneric": {
                name: "_pxt_map_get",
                argsFmt: ["T", "T", "S"],
                value: 0
            },
            "pxtrt::mapSetGeneric": {
                name: "_pxt_map_set",
                argsFmt: ["T", "T", "S", "T"],
                value: 0
            },
        };
        var EK = pxtc.ir.EK;
        pxtc.SK = ts.SyntaxKind;
        pxtc.numReservedGlobals = 1;
        var lastNodeId = 0;
        var currNodeWave = 1;
        function isInPxtModules(node) {
            if (node.pxt)
                return !!(node.pxt.flags & 16 /* InPxtModules */);
            var src = ts.getSourceFileOfNode(node);
            return src ? pxtc.isPxtModulesFilename(src.fileName) : false;
        }
        pxtc.isInPxtModules = isInPxtModules;
        function pxtInfo(n) {
            if (!n.pxt) {
                var info = new PxtNode(currNodeWave, ++lastNodeId);
                if (isInPxtModules(n))
                    info.flags |= 16 /* InPxtModules */;
                n.pxt = info;
                return info;
            }
            else {
                var info = n.pxt;
                if (info.wave != currNodeWave) {
                    info.wave = currNodeWave;
                    if (!pxtc.compileOptions || !pxtc.compileOptions.skipPxtModulesTSC)
                        info.resetAll();
                    else {
                        if (info.flags & 16 /* InPxtModules */) {
                            if (pxtc.compileOptions.skipPxtModulesEmit)
                                info.refresh();
                            else
                                info.resetEmit();
                        }
                        else
                            info.resetAll();
                    }
                }
                return info;
            }
        }
        pxtc.pxtInfo = pxtInfo;
        function getNodeId(n) {
            return pxtInfo(n).id;
        }
        pxtc.getNodeId = getNodeId;
        function stringKind(n) {
            if (!n)
                return "<null>";
            return ts.SyntaxKind[n.kind];
        }
        pxtc.stringKind = stringKind;
        function inspect(n) {
            console.log(stringKind(n));
        }
        // next free error 9280
        function userError(code, msg, secondary) {
            if (secondary === void 0) { secondary = false; }
            var e = new Error(msg);
            e.ksEmitterUserError = true;
            e.ksErrorCode = code;
            if (secondary && inCatchErrors) {
                if (!lastSecondaryError) {
                    lastSecondaryError = msg;
                    lastSecondaryErrorCode = code;
                }
                return e;
            }
            throw e;
        }
        function isStackMachine() {
            return pxtc.target.isNative && pxtc.target.nativeType == pxtc.NATIVE_TYPE_VM;
        }
        pxtc.isStackMachine = isStackMachine;
        function needsNumberConversions() {
            return pxtc.target.isNative && pxtc.target.nativeType != pxtc.NATIVE_TYPE_VM;
        }
        pxtc.needsNumberConversions = needsNumberConversions;
        function isThumb() {
            return pxtc.target.isNative && (pxtc.target.nativeType == pxtc.NATIVE_TYPE_THUMB);
        }
        pxtc.isThumb = isThumb;
        function isThisType(type) {
            // Internal TS field
            return type.isThisType;
        }
        function isSyntheticThis(def) {
            if (def.isThisParameter)
                return true;
            else
                return false;
        }
        // everything in numops:: operates on and returns tagged ints
        // everything else (except as indicated with CommentAttrs), operates and returns regular ints
        function fromInt(e) {
            if (!needsNumberConversions())
                return e;
            return pxtc.ir.rtcall("pxt::fromInt", [e]);
        }
        function fromBool(e) {
            if (!needsNumberConversions())
                return e;
            return pxtc.ir.rtcall("pxt::fromBool", [e]);
        }
        function fromFloat(e) {
            if (!needsNumberConversions())
                return e;
            return pxtc.ir.rtcall("pxt::fromFloat", [e]);
        }
        function fromDouble(e) {
            if (!needsNumberConversions())
                return e;
            return pxtc.ir.rtcall("pxt::fromDouble", [e]);
        }
        function getBitSize(decl) {
            if (!decl || !decl.type)
                return 0 /* None */;
            if (!(isNumberType(typeOf(decl))))
                return 0 /* None */;
            if (decl.type.kind != pxtc.SK.TypeReference)
                return 0 /* None */;
            switch (decl.type.typeName.getText()) {
                case "int8": return 1 /* Int8 */;
                case "int16": return 3 /* Int16 */;
                case "int32": return 5 /* Int32 */;
                case "uint8": return 2 /* UInt8 */;
                case "uint16": return 4 /* UInt16 */;
                case "uint32": return 6 /* UInt32 */;
                default: return 0 /* None */;
            }
        }
        function sizeOfBitSize(b) {
            switch (b) {
                case 0 /* None */: return pxtc.target.shortPointers ? 2 : 4;
                case 1 /* Int8 */: return 1;
                case 3 /* Int16 */: return 2;
                case 5 /* Int32 */: return 4;
                case 2 /* UInt8 */: return 1;
                case 4 /* UInt16 */: return 2;
                case 6 /* UInt32 */: return 4;
                default: throw pxtc.oops();
            }
        }
        pxtc.sizeOfBitSize = sizeOfBitSize;
        function isBitSizeSigned(b) {
            switch (b) {
                case 1 /* Int8 */:
                case 3 /* Int16 */:
                case 5 /* Int32 */:
                    return true;
                case 2 /* UInt8 */:
                case 4 /* UInt16 */:
                case 6 /* UInt32 */:
                    return false;
                default: throw pxtc.oops();
            }
        }
        pxtc.isBitSizeSigned = isBitSizeSigned;
        function setCellProps(l) {
            l._isLocal = isLocalVar(l.def) || isParameter(l.def);
            l._isGlobal = isGlobalVar(l.def);
            if (!isSyntheticThis(l.def)) {
                var tp = typeOf(l.def);
                if (tp.flags & ts.TypeFlags.Void) {
                    pxtc.oops("void-typed variable, " + l.toString());
                }
                l.bitSize = getBitSize(l.def);
                if (l.bitSize != 0 /* None */) {
                    l._debugType = (isBitSizeSigned(l.bitSize) ? "int" : "uint") + (8 * sizeOfBitSize(l.bitSize));
                }
                else if (isStringType(tp)) {
                    l._debugType = "string";
                }
                else if (tp.flags & ts.TypeFlags.NumberLike) {
                    l._debugType = "number";
                }
            }
            if (l.isLocal() && l.bitSize != 0 /* None */) {
                l.bitSize = 0 /* None */;
                userError(9256, lf("bit sizes are not supported for locals and parameters"));
            }
        }
        pxtc.setCellProps = setCellProps;
        function isStringLiteral(node) {
            switch (node.kind) {
                case pxtc.SK.TemplateHead:
                case pxtc.SK.TemplateMiddle:
                case pxtc.SK.TemplateTail:
                case pxtc.SK.StringLiteral:
                case pxtc.SK.NoSubstitutionTemplateLiteral:
                    return true;
                default: return false;
            }
        }
        function isEmptyStringLiteral(e) {
            return isStringLiteral(e) && e.text == "";
        }
        function isStatic(node) {
            return node.modifiers && node.modifiers.some(function (m) { return m.kind == pxtc.SK.StaticKeyword; });
        }
        pxtc.isStatic = isStatic;
        function isReadOnly(node) {
            return node.modifiers && node.modifiers.some(function (m) { return m.kind == pxtc.SK.ReadonlyKeyword; });
        }
        pxtc.isReadOnly = isReadOnly;
        function getExplicitDefault(attrs, name) {
            if (!attrs.explicitDefaults)
                return null;
            if (attrs.explicitDefaults.indexOf(name) < 0)
                return null;
            return attrs.paramDefl[name];
        }
        pxtc.getExplicitDefault = getExplicitDefault;
        function classFunctionPref(node) {
            if (!node)
                return null;
            switch (node.kind) {
                case pxtc.SK.MethodDeclaration: return "";
                case pxtc.SK.Constructor: return "new/";
                case pxtc.SK.GetAccessor: return "get/";
                case pxtc.SK.SetAccessor: return "set/";
                default:
                    return null;
            }
        }
        function classFunctionKey(node) {
            return classFunctionPref(node) + getName(node);
        }
        function isClassFunction(node) {
            return classFunctionPref(node) != null;
        }
        function getEnclosingMethod(node) {
            if (!node)
                return null;
            if (isClassFunction(node))
                return node;
            return getEnclosingMethod(node.parent);
        }
        function getEnclosingFunction(node0) {
            var node = node0;
            var hadLoop = false;
            while (true) {
                node = node.parent;
                if (!node)
                    userError(9229, lf("cannot determine parent of {0}", stringKind(node0)));
                switch (node.kind) {
                    case pxtc.SK.MethodDeclaration:
                    case pxtc.SK.Constructor:
                    case pxtc.SK.GetAccessor:
                    case pxtc.SK.SetAccessor:
                    case pxtc.SK.FunctionDeclaration:
                    case pxtc.SK.ArrowFunction:
                    case pxtc.SK.FunctionExpression:
                        return node;
                    case pxtc.SK.WhileStatement:
                    case pxtc.SK.DoStatement:
                    case pxtc.SK.ForInStatement:
                    case pxtc.SK.ForOfStatement:
                    case pxtc.SK.ForStatement:
                        hadLoop = true;
                        break;
                    case pxtc.SK.SourceFile:
                        // don't treat variables declared inside of top-level loops as global
                        if (hadLoop)
                            return _rootFunction;
                        return null;
                }
            }
        }
        function isObjectType(t) {
            return "objectFlags" in t;
        }
        pxtc.isObjectType = isObjectType;
        function isVar(d) {
            if (!d)
                return false;
            if (d.kind == pxtc.SK.VariableDeclaration)
                return true;
            if (d.kind == pxtc.SK.BindingElement)
                return isVar(d.parent.parent);
            return false;
        }
        function isGlobalVar(d) {
            if (!d)
                return false;
            return (isVar(d) && !getEnclosingFunction(d)) ||
                (d.kind == pxtc.SK.PropertyDeclaration && isStatic(d));
        }
        function isLocalVar(d) {
            return isVar(d) && !isGlobalVar(d);
        }
        function isParameter(d) {
            if (!d)
                return false;
            if (d.kind == pxtc.SK.Parameter)
                return true;
            if (d.kind == pxtc.SK.BindingElement)
                return isParameter(d.parent.parent);
            return false;
        }
        function isTopLevelFunctionDecl(decl) {
            return (decl.kind == pxtc.SK.FunctionDeclaration && !getEnclosingFunction(decl)) ||
                isClassFunction(decl);
        }
        function getRefTagToValidate(tp) {
            switch (tp) {
                case "_Buffer": return pxt.BuiltInType.BoxedBuffer;
                case "_Image": return pxtc.target.imageRefTag || pxt.BuiltInType.RefImage;
                case "_Action": return pxt.BuiltInType.RefAction;
                case "_RefCollection": return pxt.BuiltInType.RefCollection;
                default:
                    return null;
            }
        }
        var ClassInfo = /** @class */ (function () {
            function ClassInfo(id, decl) {
                this.id = id;
                this.decl = decl;
                this.baseClassInfo = null;
                this.allfields = [];
                // indexed by getName(node)
                this.methods = {};
                this.attrs = parseComments(decl);
                this.reset();
            }
            ClassInfo.prototype.reset = function () {
                this.vtable = null;
                this.itable = null;
            };
            Object.defineProperty(ClassInfo.prototype, "isUsed", {
                get: function () {
                    return !!(pxtInfo(this.decl).flags & 8 /* IsUsed */);
                },
                enumerable: true,
                configurable: true
            });
            ClassInfo.prototype.allMethods = function () {
                var r = [];
                for (var _i = 0, _a = Object.keys(this.methods); _i < _a.length; _i++) {
                    var k = _a[_i];
                    for (var _b = 0, _c = this.methods[k]; _b < _c.length; _b++) {
                        var m = _c[_b];
                        r.push(m);
                    }
                }
                return r;
            };
            ClassInfo.prototype.usedMethods = function () {
                var r = [];
                for (var _i = 0, _a = Object.keys(this.methods); _i < _a.length; _i++) {
                    var k = _a[_i];
                    for (var _b = 0, _c = this.methods[k]; _b < _c.length; _b++) {
                        var m = _c[_b];
                        var info = pxtInfo(m);
                        if (info.flags & 8 /* IsUsed */)
                            r.push(m);
                    }
                }
                return r;
            };
            return ClassInfo;
        }());
        pxtc.ClassInfo = ClassInfo;
        var lf = pxtc.assembler.lf;
        var checker;
        var _rootFunction;
        var lastSecondaryError;
        var lastSecondaryErrorCode = 0;
        var inCatchErrors = 0;
        function getNodeFullName(checker, node) {
            var pinfo = pxtInfo(node);
            if (pinfo.fullName == null)
                pinfo.fullName = pxtc.getFullName(checker, node.symbol);
            return pinfo.fullName;
        }
        pxtc.getNodeFullName = getNodeFullName;
        function getComments(node) {
            if (node.kind == pxtc.SK.VariableDeclaration)
                node = node.parent.parent; // we need variable stmt
            var cmtCore = function (node) {
                var src = ts.getSourceFileOfNode(node);
                if (!src)
                    return "";
                var doc = ts.getLeadingCommentRangesOfNode(node, src);
                if (!doc)
                    return "";
                var cmt = doc.map(function (r) { return src.text.slice(r.pos, r.end); }).join("\n");
                return cmt;
            };
            if (node.symbol && node.symbol.declarations && node.symbol.declarations.length > 1) {
                return node.symbol.declarations.map(cmtCore).join("\n");
            }
            else {
                return cmtCore(node);
            }
        }
        pxtc.getComments = getComments;
        function parseCommentsOnSymbol(symbol) {
            var cmts = "";
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var decl = _a[_i];
                cmts += getComments(decl);
            }
            return pxtc.parseCommentString(cmts);
        }
        pxtc.parseCommentsOnSymbol = parseCommentsOnSymbol;
        function parseComments(node) {
            var pinfo = node ? pxtInfo(node) : null;
            if (!pinfo || pinfo.flags & 2 /* IsBogusFunction */)
                return pxtc.parseCommentString("");
            if (pinfo.commentAttrs)
                return pinfo.commentAttrs;
            var res = pxtc.parseCommentString(getComments(node));
            res._name = getName(node);
            pinfo.commentAttrs = res;
            return res;
        }
        pxtc.parseComments = parseComments;
        function getName(node) {
            if (!node.name || node.name.kind != pxtc.SK.Identifier)
                return "???";
            return node.name.text;
        }
        pxtc.getName = getName;
        function genericRoot(t) {
            if (isObjectType(t) && t.objectFlags & ts.ObjectFlags.Reference) {
                var r = t;
                if (r.typeArguments && r.typeArguments.length)
                    return r.target;
            }
            return null;
        }
        function isArrayType(t) {
            if (!isObjectType(t)) {
                return false;
            }
            return (t.objectFlags & ts.ObjectFlags.Reference) && t.symbol && t.symbol.name == "Array";
        }
        function isInterfaceType(t) {
            if (!isObjectType(t)) {
                return false;
            }
            return !!(t.objectFlags & ts.ObjectFlags.Interface) || !!(t.objectFlags & ts.ObjectFlags.Anonymous);
        }
        function isClassType(t) {
            if (isThisType(t)) {
                return true;
            }
            if (!isObjectType(t)) {
                return false;
            }
            // check if we like the class?
            return !!((t.objectFlags & ts.ObjectFlags.Class) || (t.symbol && (t.symbol.flags & ts.SymbolFlags.Class)));
        }
        function isObjectLiteral(t) {
            return t.symbol && (t.symbol.flags & (ts.SymbolFlags.ObjectLiteral | ts.SymbolFlags.TypeLiteral)) !== 0;
        }
        function isStructureType(t) {
            return (isFunctionType(t) == null) && (isClassType(t) || isInterfaceType(t) || isObjectLiteral(t));
        }
        function castableToStructureType(t) {
            return isStructureType(t) || (t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Any));
        }
        function isPossiblyGenericClassType(t) {
            var g = genericRoot(t);
            if (g)
                return isClassType(g);
            return isClassType(t);
        }
        function arrayElementType(t, idx) {
            if (idx === void 0) { idx = -1; }
            if (isArrayType(t))
                return checkType(t.typeArguments[0]);
            return checker.getIndexTypeOfType(t, ts.IndexKind.Number);
        }
        function isFunctionType(t) {
            // if an object type represents a function (via 1 signature) then it
            // can't have any other properties or constructor signatures
            if (t.getApparentProperties().length > 0 || t.getConstructSignatures().length > 0)
                return null;
            var sigs = checker.getSignaturesOfType(t, ts.SignatureKind.Call);
            if (sigs && sigs.length == 1)
                return sigs[0];
            // TODO: error message for overloaded function signatures?
            return null;
        }
        function isGenericType(t) {
            var g = genericRoot(t);
            return !!(g && g.typeParameters && g.typeParameters.length);
        }
        function checkType(t) {
            // we currently don't enforce any restrictions on type system
            return t;
        }
        pxtc.checkType = checkType;
        function taggedSpecial(v) {
            if (v === null)
                return pxtc.taggedNull;
            else if (v === undefined)
                return pxtc.taggedUndefined;
            else if (v === false)
                return pxtc.taggedFalse;
            else if (v === true)
                return pxtc.taggedTrue;
            else if (isNaN(v))
                return pxtc.taggedNaN;
            else
                return null;
        }
        pxtc.taggedSpecial = taggedSpecial;
        function typeOf(node) {
            var r;
            var info = pxtInfo(node);
            if (info.typeCache)
                return info.typeCache;
            if (ts.isExpression(node))
                r = checker.getContextualType(node);
            if (!r) {
                try {
                    r = checker.getTypeAtLocation(node);
                }
                catch (e) {
                    userError(9203, lf("Unknown type for expression"));
                }
            }
            if (!r)
                return r;
            // save for future use; this cuts around 10% of emit() time
            info.typeCache = r;
            return checkType(r);
        }
        function checkUnionOfLiterals(t) {
            if (!(t.flags & ts.TypeFlags.Union)) {
                return HasLiteralType.Unsupported;
            }
            var u = t;
            var allGood = true;
            var constituentType;
            u.types.forEach(function (tp) {
                if (constituentType === undefined) {
                    if (tp.flags & ts.TypeFlags.NumberLike)
                        constituentType = HasLiteralType.Number;
                    else if (tp.flags & ts.TypeFlags.BooleanLike)
                        constituentType = HasLiteralType.Boolean;
                    else if (tp.flags & ts.TypeFlags.StringLike)
                        constituentType = HasLiteralType.String;
                    else if (tp.flags & ts.TypeFlags.EnumLike)
                        constituentType = HasLiteralType.Enum;
                }
                else {
                    switch (constituentType) {
                        case HasLiteralType.Number:
                            allGood = allGood && !!(tp.flags & ts.TypeFlags.NumberLike);
                            break;
                        case HasLiteralType.Boolean:
                            allGood = allGood && !!(tp.flags & ts.TypeFlags.BooleanLike);
                            break;
                        case HasLiteralType.String:
                            allGood = allGood && !!(tp.flags & ts.TypeFlags.StringLike);
                            break;
                        case HasLiteralType.Enum:
                            allGood = allGood && !!(tp.flags & ts.TypeFlags.EnumLike);
                            break;
                    }
                }
            });
            return allGood ? constituentType : HasLiteralType.Unsupported;
        }
        function isUnionOfLiterals(t) {
            return checkUnionOfLiterals(t) !== HasLiteralType.Unsupported;
        }
        // does src inherit from tgt via heritage clauses?
        function inheritsFrom(src, tgt) {
            if (src == tgt)
                return true;
            if (src.heritageClauses)
                for (var _i = 0, _a = src.heritageClauses; _i < _a.length; _i++) {
                    var h = _a[_i];
                    switch (h.token) {
                        case pxtc.SK.ExtendsKeyword:
                            var tp = typeOf(h.types[0]);
                            if (isClassType(tp)) {
                                var parent_3 = tp.symbol.valueDeclaration;
                                return inheritsFrom(parent_3, tgt);
                            }
                    }
                }
            return false;
        }
        function checkInterfaceDeclaration(bin, decl) {
            var check = function (d) {
                if (d && d.kind == pxtc.SK.ClassDeclaration)
                    userError(9261, lf("Interface with same name as a class not supported"));
            };
            check(decl.symbol.valueDeclaration);
            if (decl.symbol.declarations)
                decl.symbol.declarations.forEach(check);
            if (decl.heritageClauses)
                for (var _i = 0, _a = decl.heritageClauses; _i < _a.length; _i++) {
                    var h = _a[_i];
                    switch (h.token) {
                        case pxtc.SK.ExtendsKeyword:
                            var tp = typeOf(h.types[0]);
                            if (isClassType(tp)) {
                                userError(9262, lf("Extending a class by an interface not supported."));
                            }
                    }
                }
        }
        function typeCheckSubtoSup(sub, sup) {
            // we leave this function for now, in case we want to enforce some checks in future
        }
        function isGenericFunction(fun) {
            return getTypeParameters(fun).length > 0;
        }
        function getTypeParameters(fun) {
            // TODO add check for methods of generic classes
            if (fun.typeParameters && fun.typeParameters.length)
                return fun.typeParameters;
            if (isClassFunction(fun) || fun.kind == pxtc.SK.MethodSignature) {
                if (fun.parent.kind == pxtc.SK.ClassDeclaration || fun.parent.kind == pxtc.SK.InterfaceDeclaration) {
                    return fun.parent.typeParameters || [];
                }
            }
            return [];
        }
        function funcHasReturn(fun) {
            var sig = checker.getSignatureFromDeclaration(fun);
            var rettp = checker.getReturnTypeOfSignature(sig);
            return !(rettp.flags & ts.TypeFlags.Void);
        }
        function isNamedDeclaration(node) {
            return !!(node && node.name);
        }
        function parentPrefix(node) {
            if (!node)
                return "";
            switch (node.kind) {
                case pxtc.SK.ModuleBlock:
                    return parentPrefix(node.parent);
                case pxtc.SK.ClassDeclaration:
                case pxtc.SK.ModuleDeclaration:
                    return parentPrefix(node.parent) + node.name.text + ".";
                default:
                    return "";
            }
        }
        function getDeclName(node) {
            var text = isNamedDeclaration(node) ? node.name.text : null;
            if (!text)
                text = node.kind == pxtc.SK.Constructor ? "constructor" : "inline";
            return parentPrefix(node.parent) + text;
        }
        pxtc.getDeclName = getDeclName;
        function safeName(node) {
            var text = getDeclName(node);
            return text.replace(/[^\w]+/g, "_");
        }
        function getFunctionLabel(node) {
            return safeName(node) + "__P" + getNodeId(node);
        }
        pxtc.getFunctionLabel = getFunctionLabel;
        var FunctionAddInfo = /** @class */ (function () {
            function FunctionAddInfo(decl) {
                this.decl = decl;
                this.capturedVars = [];
            }
            Object.defineProperty(FunctionAddInfo.prototype, "isUsed", {
                get: function () {
                    return !!(pxtInfo(this.decl).flags & 8 /* IsUsed */);
                },
                enumerable: true,
                configurable: true
            });
            return FunctionAddInfo;
        }());
        pxtc.FunctionAddInfo = FunctionAddInfo;
        function compileBinary(program, opts, res, entryPoint) {
            pxtc.target = opts.target;
            pxtc.compileOptions = opts;
            pxtc.target.debugMode = !!opts.breakpoints;
            var diagnostics = ts.createDiagnosticCollection();
            checker = program.getTypeChecker();
            var startTime = pxtc.U.cpuUs();
            var usedWorkList = [];
            var irCachesToClear = [];
            var autoCreateFunctions = {}; // INCTODO
            var configEntries = {};
            var currJres = null;
            var currUsingContext = null;
            var needsUsingInfo = false;
            var pendingFunctionDefinitions = [];
            currNodeWave++;
            if (opts.target.isNative) {
                if (!opts.hexinfo) {
                    // we may have not been able to compile or download the hex file
                    return {
                        diagnostics: [{
                                file: program.getSourceFiles()[0],
                                start: 0,
                                length: 0,
                                category: pxtc.DiagnosticCategory.Error,
                                code: 9043,
                                messageText: lf("The hex file is not available, please connect to internet and try again.")
                            }],
                        emittedFiles: [],
                        emitSkipped: true
                    };
                }
                pxtc.hex.setupFor(opts.target, opts.extinfo || pxtc.emptyExtInfo(), opts.hexinfo);
                pxtc.hex.setupInlineAssembly(opts);
            }
            var bin = new Binary();
            var proc;
            bin.res = res;
            bin.options = opts;
            bin.target = opts.target;
            function reset() {
                bin.reset();
                proc = null;
                res.breakpoints = [{
                        id: 0,
                        isDebuggerStmt: false,
                        fileName: "bogus",
                        start: 0,
                        length: 0,
                        line: 0,
                        column: 0,
                    }];
            }
            if (opts.computeUsedSymbols) {
                res.usedSymbols = {};
                res.usedArguments = {};
            }
            var allStmts = [];
            if (!opts.forceEmit || res.diagnostics.length == 0) {
                var files = program.getSourceFiles();
                files.forEach(function (f) {
                    f.statements.forEach(function (s) {
                        allStmts.push(s);
                    });
                });
            }
            var mainSrcFile = program.getSourceFiles().filter(function (f) { return pxtc.Util.endsWith(f.fileName, entryPoint); })[0];
            var rootFunction = {
                kind: pxtc.SK.FunctionDeclaration,
                parameters: [],
                name: {
                    text: "<main>",
                    pos: 0,
                    end: 0
                },
                body: {
                    kind: pxtc.SK.Block,
                    statements: allStmts
                },
                parent: mainSrcFile,
                pos: 0,
                end: 0,
            };
            _rootFunction = rootFunction;
            var pinfo = pxtInfo(rootFunction);
            pinfo.flags |= 1 /* IsRootFunction */ | 2 /* IsBogusFunction */;
            markUsed(rootFunction);
            usedWorkList = [];
            reset();
            needsUsingInfo = true;
            emitTopLevel(rootFunction);
            for (;;) {
                flushWorkQueue();
                if (fixpointVTables())
                    break;
            }
            layOutGlobals();
            needsUsingInfo = false;
            emitVTables();
            var pass0 = pxtc.U.cpuUs();
            res.times["pass0"] = pass0 - startTime;
            if (diagnostics.getModificationCount() == 0) {
                reset();
                needsUsingInfo = false;
                bin.finalPass = true;
                emit(rootFunction);
                pxtc.U.assert(usedWorkList.length == 0);
                res.configData = [];
                for (var _i = 0, _a = Object.keys(configEntries); _i < _a.length; _i++) {
                    var k = _a[_i];
                    if (configEntries["!" + k])
                        continue;
                    res.configData.push({
                        name: k.replace(/^\!/, ""),
                        key: configEntries[k].key,
                        value: configEntries[k].value
                    });
                }
                res.configData.sort(function (a, b) { return a.key - b.key; });
                var pass1 = pxtc.U.cpuUs();
                res.times["pass1"] = pass1 - pass0;
                catchErrors(rootFunction, finalEmit);
                res.times["passFinal"] = pxtc.U.cpuUs() - pass1;
            }
            if (opts.ast) {
                var pre = pxtc.U.cpuUs();
                pxtc.annotate(program, entryPoint, pxtc.target);
                res.times["passAnnotate"] = pxtc.U.cpuUs() - pre;
            }
            // 12k for decent arcade game
            // res.times["numnodes"] = lastNodeId
            pxtc.compileOptions = null;
            return {
                diagnostics: diagnostics.getDiagnostics(),
                emittedFiles: undefined,
                emitSkipped: !!opts.noEmit
            };
            function diag(category, node, code, message, arg0, arg1, arg2) {
                diagnostics.add(ts.createDiagnosticForNode(node, {
                    code: code,
                    message: message,
                    key: message.replace(/^[a-zA-Z]+/g, "_"),
                    category: category,
                }, arg0, arg1, arg2));
            }
            function warning(node, code, msg, arg0, arg1, arg2) {
                diag(pxtc.DiagnosticCategory.Warning, node, code, msg, arg0, arg1, arg2);
            }
            function error(node, code, msg, arg0, arg1, arg2) {
                diag(pxtc.DiagnosticCategory.Error, node, code, msg, arg0, arg1, arg2);
            }
            function unhandled(n, info, code) {
                if (code === void 0) { code = 9202; }
                // if we hit this, and are in debugger, we probably want to look at the node
                debugger;
                // If we have info then we may as well present that instead
                if (info) {
                    return userError(code, info);
                }
                if (!n) {
                    userError(code, lf("Sorry, this language feature is not supported"));
                }
                var syntax = stringKind(n);
                var maybeSupportInFuture = false;
                var alternative = null;
                switch (n.kind) {
                    case ts.SyntaxKind.ForInStatement:
                        syntax = lf("for in loops");
                        break;
                    case ts.SyntaxKind.ForOfStatement:
                        syntax = lf("for of loops");
                        maybeSupportInFuture = true;
                        break;
                    case ts.SyntaxKind.PropertyAccessExpression:
                        syntax = lf("property access");
                        break;
                    case ts.SyntaxKind.DeleteExpression:
                        syntax = lf("delete");
                        break;
                    case ts.SyntaxKind.GetAccessor:
                        syntax = lf("get accessor method");
                        maybeSupportInFuture = true;
                        break;
                    case ts.SyntaxKind.SetAccessor:
                        syntax = lf("set accessor method");
                        maybeSupportInFuture = true;
                        break;
                    case ts.SyntaxKind.TaggedTemplateExpression:
                        syntax = lf("tagged templates");
                        break;
                    case ts.SyntaxKind.SpreadElement:
                        syntax = lf("spread");
                        break;
                    case ts.SyntaxKind.TryStatement:
                    case ts.SyntaxKind.CatchClause:
                    case ts.SyntaxKind.FinallyKeyword:
                    case ts.SyntaxKind.ThrowStatement:
                        syntax = lf("throwing and catching exceptions");
                        break;
                    case ts.SyntaxKind.ClassExpression:
                        syntax = lf("class expressions");
                        alternative = lf("declare a class as class C {} not let C = class {}");
                        break;
                    default:
                        break;
                }
                var msg = "";
                if (maybeSupportInFuture) {
                    msg = lf("{0} not currently supported", syntax);
                }
                else {
                    msg = lf("{0} not supported", ts.SyntaxKind[n.kind]);
                }
                if (alternative) {
                    msg += " - " + alternative;
                }
                return userError(code, msg);
            }
            function nodeKey(f) {
                return getNodeId(f) + "";
            }
            function getFunctionInfo(f) {
                var info = pxtInfo(f);
                if (!info.functionInfo)
                    info.functionInfo = new FunctionAddInfo(f);
                return info.functionInfo;
            }
            function getVarInfo(v) {
                var info = pxtInfo(v);
                if (!info.variableInfo) {
                    info.variableInfo = {};
                }
                return info.variableInfo;
            }
            function recordUse(v, written) {
                if (written === void 0) { written = false; }
                var info = getVarInfo(v);
                if (written)
                    info.written = true;
                var varParent = getEnclosingFunction(v);
                if (varParent == null || varParent == proc.action) {
                    // not captured
                }
                else {
                    var curr = proc.action;
                    while (curr && curr != varParent) {
                        var info2 = getFunctionInfo(curr);
                        if (info2.capturedVars.indexOf(v) < 0)
                            info2.capturedVars.push(v);
                        curr = getEnclosingFunction(curr);
                    }
                    info.captured = true;
                }
            }
            function recordAction(f) {
                var r = f(bin);
                if (needsUsingInfo)
                    bin.recordAction(currUsingContext, f);
                return r;
            }
            function getIfaceMemberId(name, markUsed) {
                if (markUsed === void 0) { markUsed = false; }
                return recordAction(function (bin) {
                    if (markUsed) {
                        if (!pxtc.U.lookup(bin.explicitlyUsedIfaceMembers, name)) {
                            pxtc.U.assert(!bin.finalPass);
                            bin.explicitlyUsedIfaceMembers[name] = true;
                        }
                    }
                    var v = pxtc.U.lookup(bin.ifaceMemberMap, name);
                    if (v != null)
                        return v;
                    pxtc.U.assert(!bin.finalPass);
                    // this gets renumbered before the final pass
                    v = bin.ifaceMemberMap[name] = -1;
                    bin.emitString(name);
                    return v;
                });
            }
            function finalEmit() {
                if (diagnostics.getModificationCount() || opts.noEmit)
                    return;
                bin.writeFile = function (fn, data) {
                    res.outfiles[fn] = data;
                };
                for (var _i = 0, _a = bin.procs; _i < _a.length; _i++) {
                    var proc_1 = _a[_i];
                    if (!proc_1.cachedJS || proc_1.inlineBody)
                        proc_1.resolve();
                }
                if (pxtc.target.isNative)
                    bin.procs = bin.procs.filter(function (p) { return p.inlineBody && !p.info.usedAsIface && !p.info.usedAsValue ? false : true; });
                if (opts.target.isNative) {
                    if (opts.extinfo.yotta)
                        bin.writeFile("yotta.json", JSON.stringify(opts.extinfo.yotta, null, 2));
                    if (opts.extinfo.platformio)
                        bin.writeFile("platformio.json", JSON.stringify(opts.extinfo.platformio, null, 2));
                    if (opts.target.nativeType == pxtc.NATIVE_TYPE_VM)
                        pxtc.vmEmit(bin, opts);
                    else
                        pxtc.processorEmit(bin, opts, res);
                }
                else {
                    pxtc.jsEmit(bin);
                }
            }
            function typeCheckVar(tp) {
                if (tp.flags & ts.TypeFlags.Void) {
                    userError(9203, lf("void-typed variables not supported"));
                }
            }
            function emitGlobal(decl) {
                var pinfo = pxtInfo(decl);
                typeCheckVar(typeOf(decl));
                if (!pinfo.cell)
                    pinfo.cell = new pxtc.ir.Cell(null, decl, getVarInfo(decl));
                if (bin.globals.indexOf(pinfo.cell) < 0)
                    bin.globals.push(pinfo.cell);
            }
            function lookupCell(decl) {
                if (isGlobalVar(decl)) {
                    markUsed(decl);
                    var pinfo_1 = pxtInfo(decl);
                    if (!pinfo_1.cell)
                        emitGlobal(decl);
                    return pinfo_1.cell;
                }
                else {
                    var res_1 = proc.localIndex(decl);
                    if (!res_1) {
                        if (bin.finalPass)
                            userError(9204, lf("cannot locate identifer"));
                        else {
                            res_1 = proc.mkLocal(decl, getVarInfo(decl));
                        }
                    }
                    return res_1;
                }
            }
            function getBaseClassInfo(node) {
                if (node.heritageClauses)
                    for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
                        var h = _a[_i];
                        switch (h.token) {
                            case pxtc.SK.ExtendsKeyword:
                                if (!h.types || h.types.length != 1)
                                    throw userError(9228, lf("invalid extends clause"));
                                var superType = typeOf(h.types[0]);
                                if (superType && isClassType(superType) && !isGenericType(superType)) {
                                    // check if user defined
                                    // let filename = getSourceFileOfNode(tp.symbol.valueDeclaration).fileName
                                    // if (program.getRootFileNames().indexOf(filename) == -1) {
                                    //    throw userError(9228, lf("cannot inherit from built-in type."))
                                    // }
                                    // need to redo subtype checking on members
                                    var subType = checker.getTypeAtLocation(node);
                                    typeCheckSubtoSup(subType, superType);
                                    return getClassInfo(superType);
                                }
                                else {
                                    throw userError(9228, lf("cannot inherit from this type"));
                                }
                            // ignore it - implementation of interfaces is implicit
                            case pxtc.SK.ImplementsKeyword:
                                break;
                            default:
                                throw userError(9228, lf("invalid heritage clause"));
                        }
                    }
                return null;
            }
            function isToString(m) {
                return m.kind == pxtc.SK.MethodDeclaration &&
                    m.parameters.length == 0 &&
                    getName(m) == "toString";
            }
            function fixpointVTables() {
                needsUsingInfo = false;
                var prevLen = bin.usedClassInfos.length;
                for (var _i = 0, _a = bin.usedClassInfos; _i < _a.length; _i++) {
                    var ci = _a[_i];
                    for (var _b = 0, _c = ci.allMethods(); _b < _c.length; _b++) {
                        var m = _c[_b];
                        var pinfo_2 = pxtInfo(m);
                        var info = getFunctionInfo(m);
                        if (pinfo_2.flags & 8 /* IsUsed */) {
                            // we need to mark the parent as used, otherwise vtable layout fails, see #3740
                            if (info.virtualParent)
                                markFunctionUsed(info.virtualParent.decl);
                        }
                        else if (info.virtualParent && info.virtualParent.isUsed) {
                            // if our parent method is used, and our vtable is used,
                            // we are also used
                            markFunctionUsed(m);
                        }
                        else if (isToString(m) || isIfaceMemberUsed(getName(m))) {
                            // if the name is used in interface context, also mark as used
                            markFunctionUsed(m);
                        }
                    }
                    var ctor = getCtor(ci.decl);
                    if (ctor) {
                        markFunctionUsed(ctor);
                    }
                }
                needsUsingInfo = true;
                if (usedWorkList.length == 0 && prevLen == bin.usedClassInfos.length)
                    return true;
                return false;
            }
            function getVTable(inf) {
                pxtc.assert(inf.isUsed, "inf.isUsed");
                if (inf.vtable)
                    return inf.vtable;
                var tbl = inf.baseClassInfo ? getVTable(inf.baseClassInfo).slice(0) : [];
                inf.derivedClasses = [];
                if (inf.baseClassInfo)
                    inf.baseClassInfo.derivedClasses.push(inf);
                for (var _i = 0, _a = inf.usedMethods(); _i < _a.length; _i++) {
                    var m = _a[_i];
                    bin.numMethods++;
                    var minf = getFunctionInfo(m);
                    var attrs = parseComments(m);
                    if (isToString(m) && !attrs.shim) {
                        inf.toStringMethod = lookupProc(m);
                        inf.toStringMethod.info.usedAsIface = true;
                    }
                    if (minf.virtualParent) {
                        bin.numVirtMethods++;
                        var key = classFunctionKey(m);
                        var done = false;
                        var proc_2 = lookupProc(m);
                        pxtc.U.assert(!!proc_2);
                        for (var i = 0; i < tbl.length; ++i) {
                            if (classFunctionKey(tbl[i].action) == key) {
                                tbl[i] = proc_2;
                                minf.virtualIndex = i;
                                done = true;
                            }
                        }
                        if (!done) {
                            minf.virtualIndex = tbl.length;
                            tbl.push(proc_2);
                        }
                    }
                }
                inf.vtable = tbl;
                inf.itable = [];
                for (var _b = 0, _c = inf.allfields; _b < _c.length; _b++) {
                    var fld = _c[_b];
                    var fname = getName(fld);
                    var finfo = fieldIndexCore(inf, fld, false);
                    inf.itable.push({
                        name: fname,
                        info: (finfo.idx + 1) * (isStackMachine() ? 1 : 4),
                        idx: getIfaceMemberId(fname),
                        proc: null
                    });
                }
                for (var curr = inf; curr; curr = curr.baseClassInfo) {
                    var _loop_2 = function (m) {
                        var n = getName(m);
                        var attrs = parseComments(m);
                        if (attrs.shim)
                            return "continue";
                        var proc_3 = lookupProc(m);
                        var ex = inf.itable.find(function (e) { return e.name == n; });
                        var isSet = m.kind == pxtc.SK.SetAccessor;
                        var isGet = m.kind == pxtc.SK.GetAccessor;
                        if (ex) {
                            if (isSet && !ex.setProc)
                                ex.setProc = proc_3;
                            else if (isGet && !ex.proc)
                                ex.proc = proc_3;
                        }
                        else {
                            inf.itable.push({
                                name: n,
                                info: 0,
                                idx: getIfaceMemberId(n),
                                proc: !isSet ? proc_3 : null,
                                setProc: isSet ? proc_3 : null
                            });
                        }
                        proc_3.info.usedAsIface = true;
                    };
                    for (var _d = 0, _e = curr.usedMethods(); _d < _e.length; _d++) {
                        var m = _e[_d];
                        _loop_2(m);
                    }
                }
                return inf.vtable;
            }
            // this code determines if we will need a vtable entry
            // by checking if we are overriding a method in a super class
            function computeVtableInfo(info) {
                for (var _i = 0, _a = info.allMethods(); _i < _a.length; _i++) {
                    var currMethod = _a[_i];
                    var baseMethod = null;
                    var key = classFunctionKey(currMethod);
                    var k = getName(currMethod);
                    for (var base = info.baseClassInfo; !!base; base = base.baseClassInfo) {
                        if (base.methods.hasOwnProperty(k))
                            for (var _b = 0, _c = base.methods[k]; _b < _c.length; _b++) {
                                var m2 = _c[_b];
                                if (classFunctionKey(m2) == key) {
                                    baseMethod = m2;
                                    // note thare's no 'break' here - we'll go to uppermost
                                    // matching method
                                }
                            }
                    }
                    if (baseMethod) {
                        var minf = getFunctionInfo(currMethod);
                        var pinf = getFunctionInfo(baseMethod);
                        // TODO we can probably drop this check
                        if (baseMethod.parameters.length != currMethod.parameters.length)
                            error(currMethod, 9255, lf("the overriding method is currently required to have the same number of arguments as the base one"));
                        // pinf is the transitive parent
                        minf.virtualParent = pinf;
                        if (!pinf.virtualParent) {
                            needsFullRecompileIfCached(pxtInfo(baseMethod));
                            pinf.virtualParent = pinf;
                        }
                        pxtc.assert(pinf.virtualParent == pinf, "pinf.virtualParent == pinf");
                    }
                }
            }
            function needsFullRecompileIfCached(pxtinfo) {
                if ((pxtinfo.flags & 32 /* FromPreviousCompile */) ||
                    (pxtinfo.flags & 16 /* InPxtModules */ &&
                        pxtc.compileOptions.skipPxtModulesEmit)) {
                    res.needsFullRecompile = true;
                    throw userError(9200, lf("full recompile required"));
                }
            }
            function getClassInfo(t, decl) {
                if (decl === void 0) { decl = null; }
                if (!decl)
                    decl = t.symbol.valueDeclaration;
                var pinfo = pxtInfo(decl);
                if (!pinfo.classInfo) {
                    var id = safeName(decl) + "__C" + getNodeId(decl);
                    var info_4 = new ClassInfo(id, decl);
                    pinfo.classInfo = info_4;
                    if (info_4.attrs.autoCreate)
                        autoCreateFunctions[info_4.attrs.autoCreate] = true;
                    // only do it after storing ours in case we run into cycles (which should be errors)
                    info_4.baseClassInfo = getBaseClassInfo(decl);
                    var prevFields = info_4.baseClassInfo
                        ? pxtc.U.toDictionary(info_4.baseClassInfo.allfields, function (f) { return getName(f); }) : {};
                    var prevMethod_1 = function (n, c) {
                        if (c === void 0) { c = info_4.baseClassInfo; }
                        if (!c)
                            return null;
                        return c.methods[n] || prevMethod_1(n, c.baseClassInfo);
                    };
                    for (var _i = 0, _a = decl.members; _i < _a.length; _i++) {
                        var mem = _a[_i];
                        if (mem.kind == pxtc.SK.PropertyDeclaration) {
                            var pdecl = mem;
                            if (!isStatic(pdecl))
                                info_4.allfields.push(pdecl);
                            var key = getName(pdecl);
                            if (prevMethod_1(key) || pxtc.U.lookup(prevFields, key))
                                error(pdecl, 9279, lf("redefinition of '{0}' as field", key));
                        }
                        else if (mem.kind == pxtc.SK.Constructor) {
                            for (var _b = 0, _c = mem.parameters; _b < _c.length; _b++) {
                                var p = _c[_b];
                                if (isCtorField(p))
                                    info_4.allfields.push(p);
                            }
                        }
                        else if (isClassFunction(mem)) {
                            var minf = getFunctionInfo(mem);
                            minf.parentClassInfo = info_4;
                            var key = getName(mem);
                            if (!info_4.methods.hasOwnProperty(key))
                                info_4.methods[key] = [];
                            info_4.methods[key].push(mem);
                            var pfield = pxtc.U.lookup(prevFields, key);
                            if (pfield) {
                                var pxtinfo = pxtInfo(pfield);
                                if (!(pxtinfo.flags & 64 /* IsOverridden */)) {
                                    pxtinfo.flags |= 64 /* IsOverridden */;
                                    if (pxtinfo.flags & 8 /* IsUsed */)
                                        getIfaceMemberId(key, true);
                                    needsFullRecompileIfCached(pxtinfo);
                                }
                                // error(mem, 9279, lf("redefinition of '{0}' (previously a field)", key))
                            }
                        }
                    }
                    if (info_4.baseClassInfo) {
                        info_4.allfields = info_4.baseClassInfo.allfields.concat(info_4.allfields);
                        computeVtableInfo(info_4);
                    }
                }
                return pinfo.classInfo;
            }
            function emitImageLiteral(s) {
                if (!s)
                    s = "0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n";
                var x = 0;
                var w = 0;
                var h = 0;
                var lit = "";
                var c = 0;
                s += "\n";
                for (var i = 0; i < s.length; ++i) {
                    switch (s[i]) {
                        case ".":
                        case "_":
                        case "0":
                            lit += "0,";
                            x++;
                            c++;
                            break;
                        case "#":
                        case "*":
                        case "1":
                            lit += "255,";
                            x++;
                            c++;
                            break;
                        case "\t":
                        case "\r":
                        case " ": break;
                        case "\n":
                            if (x) {
                                if (w == 0)
                                    w = x;
                                else if (x != w)
                                    userError(9205, lf("lines in image literal have to have the same width (got {0} and then {1} pixels)", w, x));
                                x = 0;
                                h++;
                            }
                            break;
                        default:
                            userError(9206, lf("Only 0 . _ (off) and 1 # * (on) are allowed in image literals"));
                    }
                }
                var lbl = "_img" + bin.lblNo++;
                // Pad with a 0 if we have an odd number of pixels
                if (c % 2 != 0)
                    lit += "0";
                // this is codal's format!
                bin.otherLiterals.push("\n.balign 4\n" + lbl + ": .short 0xffff\n        .short " + w + ", " + h + "\n        .byte " + lit + "\n");
                var jsLit = "new pxsim.Image(" + w + ", [" + lit + "])";
                return {
                    kind: pxtc.SK.NumericLiteral,
                    imageLiteral: lbl,
                    jsLit: jsLit
                };
            }
            function isGlobalConst(decl) {
                if (isGlobalVar(decl) && (decl.parent.flags & ts.NodeFlags.Const))
                    return true;
                return false;
            }
            function isSideEffectfulInitializer(init) {
                if (!init)
                    return false;
                if (isStringLiteral(init))
                    return false;
                switch (init.kind) {
                    case pxtc.SK.ArrayLiteralExpression:
                        return init.elements.some(isSideEffectfulInitializer);
                    default:
                        return constantFold(init) == null;
                }
            }
            function emitLocalLoad(decl) {
                var folded = constantFoldDecl(decl);
                if (folded)
                    return emitLit(folded.val);
                if (isGlobalVar(decl)) {
                    var attrs = parseComments(decl);
                    if (attrs.shim)
                        return emitShim(decl, decl, []);
                }
                var l = lookupCell(decl);
                recordUse(decl);
                var r = l.load();
                //console.log("LOADLOC", l.toString(), r.toString())
                return r;
            }
            function emitFunLiteral(f) {
                var attrs = parseComments(f);
                if (attrs.shim)
                    userError(9207, lf("built-in functions cannot be yet used as values; did you forget ()?"));
                var info = getFunctionInfo(f);
                markUsageOrder(info);
                if (info.location) {
                    return info.location.load();
                }
                else {
                    pxtc.assert(!bin.finalPass || info.capturedVars.length == 0, "!bin.finalPass || info.capturedVars.length == 0");
                    info.usedAsValue = true;
                    markFunctionUsed(f);
                    return emitFunLitCore(f);
                }
            }
            function markUsageOrder(info) {
                if (info.usedBeforeDecl === undefined)
                    info.usedBeforeDecl = true;
                else if (bin.finalPass && info.usedBeforeDecl && info.capturedVars.length) {
                    if (getEnclosingFunction(info.decl) && !info.alreadyEmitted)
                        userError(9278, lf("function referenced before all variables it uses are defined"));
                }
            }
            function emitIdentifier(node) {
                var decl = getDecl(node);
                var fold = constantFoldDecl(decl);
                if (fold)
                    return emitLit(fold.val);
                if (decl && (isVar(decl) || isParameter(decl))) {
                    return emitLocalLoad(decl);
                }
                else if (decl && decl.kind == pxtc.SK.FunctionDeclaration) {
                    return emitFunLiteral(decl);
                }
                else {
                    if (node.text == "undefined")
                        return emitLit(undefined);
                    else
                        throw unhandled(node, lf("Unknown or undeclared identifier"), 9235);
                }
            }
            function emitParameter(node) { }
            function emitAccessor(node) {
                emitFunctionDeclaration(node);
            }
            function emitThis(node) {
                var meth = getEnclosingMethod(node);
                if (!meth)
                    userError(9208, lf("'this' used outside of a method"));
                var inf = getFunctionInfo(meth);
                if (!inf.thisParameter) {
                    //console.log("get this param,", meth.kind, nodeKey(meth))
                    //console.log("GET", meth)
                    pxtc.oops("no this");
                }
                return emitLocalLoad(inf.thisParameter);
            }
            function emitSuper(node) { }
            function emitStringLiteral(str) {
                var r;
                if (str == "") {
                    r = pxtc.ir.rtcall("String_::mkEmpty", []);
                }
                else {
                    var lbl = emitAndMarkString(str);
                    r = pxtc.ir.ptrlit(lbl, JSON.stringify(str));
                }
                r.isStringLiteral = true;
                return r;
            }
            function emitLiteral(node) {
                if (node.kind == pxtc.SK.NumericLiteral) {
                    if (node.imageLiteral) {
                        return pxtc.ir.ptrlit(node.imageLiteral, node.jsLit);
                    }
                    else {
                        var parsed = parseFloat(node.text);
                        return emitLit(parsed);
                    }
                }
                else if (isStringLiteral(node)) {
                    return emitStringLiteral(node.text);
                }
                else {
                    throw pxtc.oops();
                }
            }
            function asString(e) {
                var isRef = isRefCountedExpr(e);
                var expr = emitExpr(e);
                if (pxtc.target.isNative || isStringLiteral(e))
                    return irToNode(expr, isRef);
                expr = pxtc.ir.rtcallMask("String_::stringConv", 1, 1 /* Async */, [expr]);
                return irToNode(expr, true);
            }
            function emitTemplateExpression(node) {
                var numconcat = 0;
                var concat = function (a, b) {
                    if (isEmptyStringLiteral(b))
                        return a;
                    numconcat++;
                    return rtcallMask("String_::concat", [irToNode(a, true), asString(b)], null);
                };
                var expr = pxtInfo(asString(node.head)).valueOverride;
                for (var _i = 0, _a = node.templateSpans; _i < _a.length; _i++) {
                    var span = _a[_i];
                    expr = concat(expr, span.expression);
                    expr = concat(expr, span.literal);
                }
                if (numconcat == 0) {
                    // make sure `${foo}` == foo.toString(), not just foo
                    return rtcallMask("String_::concat", [
                        irToNode(expr, true),
                        irToNode(pxtc.ir.rtcall("String_::mkEmpty", []), false)
                    ], null);
                }
                return expr;
            }
            function emitTemplateSpan(node) { }
            function emitJsxElement(node) { }
            function emitJsxSelfClosingElement(node) { }
            function emitJsxText(node) { }
            function emitJsxExpression(node) { }
            function emitQualifiedName(node) { }
            function emitObjectBindingPattern(node) { }
            function emitArrayBindingPattern(node) { }
            function emitArrayLiteral(node) {
                var eltT = arrayElementType(typeOf(node));
                var coll = pxtc.ir.shared(pxtc.ir.rtcall("Array_::mk", []));
                for (var _i = 0, _a = node.elements; _i < _a.length; _i++) {
                    var elt = _a[_i];
                    var mask = isRefCountedExpr(elt) ? 2 : 0;
                    proc.emitExpr(pxtc.ir.rtcall("Array_::push", [coll, emitExpr(elt)], mask));
                }
                return coll;
            }
            function emitObjectLiteral(node) {
                var expr = pxtc.ir.shared(pxtc.ir.rtcall("pxtrt::mkMap", []));
                node.properties.forEach(function (p) {
                    pxtc.assert(!p.questionToken); // should be disallowed by TS grammar checker
                    var keyName;
                    var init;
                    if (p.kind == pxtc.SK.ShorthandPropertyAssignment) {
                        var sp = p;
                        pxtc.assert(!sp.equalsToken && !sp.objectAssignmentInitializer); // disallowed by TS grammar checker
                        keyName = p.name.text;
                        var vsym = checker.getShorthandAssignmentValueSymbol(p);
                        var vname = vsym && vsym.valueDeclaration && vsym.valueDeclaration.name;
                        if (vname && vname.kind == pxtc.SK.Identifier)
                            init = emitIdentifier(vname);
                        else
                            throw unhandled(p); // not sure what happened
                    }
                    else if (p.name.kind == pxtc.SK.ComputedPropertyName) {
                        var keyExpr = p.name.expression;
                        // need to use rtcallMask, so keyExpr gets converted to string
                        proc.emitExpr(rtcallMask("pxtrt::mapSetByString", [
                            irToNode(expr, true),
                            keyExpr,
                            p.initializer
                        ], null));
                        return;
                    }
                    else {
                        keyName = p.name.kind == pxtc.SK.StringLiteral ?
                            p.name.text : p.name.getText();
                        init = emitExpr(p.initializer);
                    }
                    var fieldId = pxtc.target.isNative
                        ? pxtc.ir.numlit(getIfaceMemberId(keyName))
                        : pxtc.ir.ptrlit(null, JSON.stringify(keyName));
                    var args = [
                        expr,
                        fieldId,
                        init
                    ];
                    proc.emitExpr(pxtc.ir.rtcall(pxtc.target.isNative ? "pxtrt::mapSet" : "pxtrt::mapSetByString", args));
                });
                return expr;
            }
            function emitPropertyAssignment(node) {
                if (isStatic(node)) {
                    emitVariableDeclaration(node);
                    return;
                }
                if (node.initializer) {
                    var info = getClassInfo(typeOf(node.parent));
                    if (bin.finalPass && info.isUsed && !info.ctor)
                        userError(9209, lf("class field initializers currently require an explicit constructor"));
                }
                // do nothing
            }
            function emitShorthandPropertyAssignment(node) { }
            function emitComputedPropertyName(node) { }
            function emitPropertyAccess(node) {
                var decl = getDecl(node);
                var fold = constantFoldDecl(decl);
                if (fold)
                    return emitLit(fold.val);
                if (decl.kind == pxtc.SK.GetAccessor) {
                    return emitCallCore(node, node, [], null);
                }
                if (decl.kind == pxtc.SK.EnumMember) {
                    throw userError(9210, lf("Cannot compute enum value"));
                }
                else if (decl.kind == pxtc.SK.PropertySignature || decl.kind == pxtc.SK.PropertyAssignment) {
                    return emitCallCore(node, node, [], null, decl, node.expression);
                }
                else if (decl.kind == pxtc.SK.PropertyDeclaration || decl.kind == pxtc.SK.Parameter) {
                    if (isStatic(decl)) {
                        return emitLocalLoad(decl);
                    }
                    if (isSlowField(decl)) {
                        // treat as interface call
                        return emitCallCore(node, node, [], null, decl, node.expression);
                    }
                    else {
                        var idx = fieldIndex(node);
                        return pxtc.ir.op(EK.FieldAccess, [emitExpr(node.expression)], idx);
                    }
                }
                else if (isClassFunction(decl) || decl.kind == pxtc.SK.MethodSignature) {
                    throw userError(9211, lf("cannot use method as lambda; did you forget '()' ?"));
                }
                else if (decl.kind == pxtc.SK.FunctionDeclaration) {
                    return emitFunLiteral(decl);
                }
                else if (isVar(decl)) {
                    return emitLocalLoad(decl);
                }
                else {
                    throw unhandled(node, lf("Unknown property access for {0}", stringKind(decl)), 9237);
                }
            }
            function isSlowField(decl) {
                if (decl.kind == pxtc.SK.Parameter || decl.kind == pxtc.SK.PropertyDeclaration) {
                    var pinfo_3 = pxtInfo(decl);
                    return !!pxtc.target.switches.slowFields || !!(pinfo_3.flags & 64 /* IsOverridden */);
                }
                return false;
            }
            function emitIndexedAccess(node, assign) {
                if (assign === void 0) { assign = null; }
                var t = typeOf(node.expression);
                var attrs = {
                    callingConvention: 0 /* Plain */,
                    paramDefl: {},
                };
                var indexer = null;
                var stringOk = false;
                if (!assign && isStringType(t)) {
                    indexer = "String_::charAt";
                }
                else if (isArrayType(t)) {
                    indexer = assign ? "Array_::setAt" : "Array_::getAt";
                }
                else if (isInterfaceType(t)) {
                    attrs = parseCommentsOnSymbol(t.symbol);
                    indexer = assign ? attrs.indexerSet : attrs.indexerGet;
                }
                if (!indexer && (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.StructuredOrTypeVariable))) {
                    indexer = assign ? "pxtrt::mapSetGeneric" : "pxtrt::mapGetGeneric";
                    stringOk = true;
                }
                if (indexer) {
                    if (stringOk || isNumberLike(node.argumentExpression)) {
                        var args = [node.expression, node.argumentExpression];
                        return rtcallMask(indexer, args, attrs, assign ? [assign] : []);
                    }
                    else {
                        throw unhandled(node, lf("non-numeric indexer on {0}", indexer), 9238);
                    }
                }
                else {
                    throw unhandled(node, lf("unsupported indexer"), 9239);
                }
            }
            function isOnDemandGlobal(decl) {
                if (!isGlobalVar(decl))
                    return false;
                var v = decl;
                if (!isSideEffectfulInitializer(v.initializer))
                    return true;
                var attrs = parseComments(decl);
                if (attrs.whenUsed)
                    return true;
                return false;
            }
            function isOnDemandDecl(decl) {
                var res = isOnDemandGlobal(decl) || isTopLevelFunctionDecl(decl) || ts.isClassDeclaration(decl);
                if (pxtc.target.switches.noTreeShake)
                    return false;
                if (opts.testMode && res) {
                    if (!isInPxtModules(decl))
                        return false;
                }
                return res;
            }
            function shouldEmitNow(node) {
                if (!isOnDemandDecl(node))
                    return true;
                var info = pxtInfo(node);
                if (bin.finalPass)
                    return !!(info.flags & 8 /* IsUsed */);
                else
                    return info == currUsingContext;
            }
            function markUsed(decl) {
                if (!decl)
                    return;
                var pinfo = pxtInfo(decl);
                if (pinfo.classInfo) {
                    markVTableUsed(pinfo.classInfo);
                    return;
                }
                if (opts.computeUsedSymbols && decl.symbol)
                    res.usedSymbols[getNodeFullName(checker, decl)] = null;
                if (isStackMachine() && isClassFunction(decl))
                    getIfaceMemberId(getName(decl), true);
                recordUsage(decl);
                if (!(pinfo.flags & 8 /* IsUsed */)) {
                    pinfo.flags |= 8 /* IsUsed */;
                    if (isOnDemandDecl(decl))
                        usedWorkList.push(decl);
                }
            }
            function markFunctionUsed(decl) {
                markUsed(decl);
            }
            function emitAndMarkString(str) {
                return recordAction(function (bin) {
                    return bin.emitString(str);
                });
            }
            function recordUsage(decl) {
                if (!needsUsingInfo)
                    return;
                if (!currUsingContext) {
                    pxtc.U.oops("no using ctx for: " + getName(decl));
                }
                else {
                    currUsingContext.usedNodes[nodeKey(decl)] = decl;
                }
            }
            function getDeclCore(node) {
                if (!node)
                    return null;
                var pinfo = pxtInfo(node);
                if (pinfo.declCache !== undefined)
                    return pinfo.declCache;
                var sym = checker.getSymbolAtLocation(node);
                var decl;
                if (sym) {
                    decl = sym.valueDeclaration;
                    if (!decl && sym.declarations) {
                        var decl0 = sym.declarations[0];
                        if (decl0 && decl0.kind == ts.SyntaxKind.ImportEqualsDeclaration) {
                            sym = checker.getSymbolAtLocation(decl0.moduleReference);
                            if (sym)
                                decl = sym.valueDeclaration;
                        }
                    }
                }
                return decl;
            }
            function getDecl(node) {
                var decl = getDeclCore(node);
                markUsed(decl);
                if (!decl && node.kind == pxtc.SK.PropertyAccessExpression) {
                    var namedNode = node;
                    decl = {
                        kind: pxtc.SK.PropertySignature,
                        symbol: { isBogusSymbol: true, name: namedNode.name.getText() },
                        name: namedNode.name,
                    };
                    pxtInfo(decl).flags |= 2 /* IsBogusFunction */;
                }
                pinfo.declCache = decl || null;
                return decl;
            }
            function isRefCountedExpr(e) {
                // we generate a fake NULL expression for default arguments
                // we also generate a fake numeric literal for image literals
                if (e.kind == pxtc.SK.NullKeyword || e.kind == pxtc.SK.NumericLiteral)
                    return !!e.isRefOverride;
                // no point doing the incr/decr for these - they are statically allocated anyways (unless on AVR)
                if (isStringLiteral(e))
                    return false;
                return true;
            }
            function getMask(args) {
                pxtc.assert(args.length <= 8, "args.length <= 8");
                var m = 0;
                args.forEach(function (a, i) {
                    if (isRefCountedExpr(a))
                        m |= (1 << i);
                });
                return m;
            }
            function emitShim(decl, node, args) {
                var attrs = parseComments(decl);
                var hasRet = !(typeOf(node).flags & ts.TypeFlags.Void);
                var nm = attrs.shim;
                if (nm.indexOf('(') >= 0) {
                    var parse = /(.*)\((.*)\)$/.exec(nm);
                    if (parse) {
                        if (args.length)
                            pxtc.U.userError("no arguments expected");
                        var litargs = [];
                        var strargs = parse[2].replace(/\s/g, "");
                        if (strargs) {
                            for (var _i = 0, _a = parse[2].split(/,/); _i < _a.length; _i++) {
                                var a = _a[_i];
                                var v = parseInt(a);
                                if (isNaN(v)) {
                                    v = lookupDalConst(node, a);
                                    if (v == null)
                                        v = lookupConfigConst(node, a);
                                    if (v == null)
                                        pxtc.U.userError("invalid argument: " + a + " in " + nm);
                                }
                                litargs.push(pxtc.ir.numlit(v));
                            }
                            if (litargs.length > 4)
                                pxtc.U.userError("too many args");
                        }
                        nm = parse[1];
                        if (opts.target.isNative) {
                            pxtc.hex.validateShim(getDeclName(decl), nm, attrs, true, litargs.map(function (v) { return true; }));
                        }
                        return pxtc.ir.rtcallMask(nm, 0, attrs.callingConvention, litargs);
                    }
                }
                if (nm == "TD_NOOP") {
                    pxtc.assert(!hasRet, "!hasRet");
                    if (pxtc.target.switches.profile && attrs.shimArgument == "perfCounter") {
                        if (args[0] && args[0].kind == pxtc.SK.StringLiteral)
                            proc.perfCounterName = args[0].text;
                        if (!proc.perfCounterName)
                            proc.perfCounterName = proc.getFullName();
                    }
                    return emitLit(undefined);
                }
                if (nm == "TD_ID" || nm === "ENUM_GET") {
                    pxtc.assert(args.length == 1, "args.length == 1");
                    return emitExpr(args[0]);
                }
                if (opts.target.isNative) {
                    pxtc.hex.validateShim(getDeclName(decl), nm, attrs, hasRet, args.map(isNumberLike));
                }
                return rtcallMask(nm, args, attrs);
            }
            function isNumericLiteral(node) {
                switch (node.kind) {
                    case pxtc.SK.UndefinedKeyword:
                    case pxtc.SK.NullKeyword:
                    case pxtc.SK.TrueKeyword:
                    case pxtc.SK.FalseKeyword:
                    case pxtc.SK.NumericLiteral:
                        return true;
                    case pxtc.SK.PropertyAccessExpression:
                        var r = emitExpr(node);
                        return r.exprKind == EK.NumberLiteral;
                    default:
                        return false;
                }
            }
            function addDefaultParametersAndTypeCheck(sig, args, attrs) {
                if (!sig)
                    return;
                var parms = sig.getParameters();
                // remember the number of arguments passed explicitly
                var goodToGoLength = args.length;
                if (parms.length > args.length) {
                    parms.slice(args.length).forEach(function (p) {
                        if (p.valueDeclaration &&
                            p.valueDeclaration.kind == pxtc.SK.Parameter) {
                            var prm = p.valueDeclaration;
                            if (!prm.initializer) {
                                var defl = getExplicitDefault(attrs, getName(prm));
                                var expr = defl ? emitLit(parseInt(defl)) : null;
                                if (expr == null) {
                                    expr = emitLit(undefined);
                                }
                                args.push(irToNode(expr));
                            }
                            else {
                                if (!isNumericLiteral(prm.initializer)) {
                                    userError(9212, lf("only numbers, null, true and false supported as default arguments"));
                                }
                                args.push(prm.initializer);
                            }
                        }
                        else {
                            userError(9213, lf("unsupported default argument (shouldn't happen)"));
                        }
                    });
                }
                // type check for assignment of actual to formal,
                // TODO: checks for the rest needed
                for (var i = 0; i < goodToGoLength; i++) {
                    var p = parms[i];
                    // there may be more arguments than parameters
                    if (p && p.valueDeclaration && p.valueDeclaration.kind == pxtc.SK.Parameter)
                        typeCheckSubtoSup(args[i], p.valueDeclaration);
                }
                // TODO: this is micro:bit specific and should be lifted out
                if (attrs.imageLiteral) {
                    if (!isStringLiteral(args[0])) {
                        userError(9214, lf("Only image literals (string literals) supported here; {0}", stringKind(args[0])));
                    }
                    args[0] = emitImageLiteral(args[0].text);
                }
            }
            function emitCallExpression(node) {
                var sig = checker.getResolvedSignature(node);
                return emitCallCore(node, node.expression, node.arguments, sig);
            }
            function emitCallCore(node, funcExpr, callArgs, sig, decl, recv) {
                if (decl === void 0) { decl = null; }
                if (recv === void 0) { recv = null; }
                if (!decl)
                    decl = getDecl(funcExpr);
                var isMethod = false;
                var isProperty = false;
                if (decl) {
                    switch (decl.kind) {
                        // we treat properties via calls
                        // so we say they are "methods"
                        case pxtc.SK.PropertySignature:
                        case pxtc.SK.PropertyAssignment:
                        case pxtc.SK.PropertyDeclaration:
                            if (!isStatic(decl)) {
                                isMethod = true;
                                isProperty = true;
                            }
                            break;
                        case pxtc.SK.Parameter:
                            if (isCtorField(decl)) {
                                isMethod = true;
                                isProperty = true;
                            }
                            break;
                        // TOTO case: case SK.ShorthandPropertyAssignment
                        // these are the real methods
                        case pxtc.SK.GetAccessor:
                        case pxtc.SK.SetAccessor:
                            isMethod = true;
                            if (pxtc.target.switches.slowMethods)
                                isProperty = true;
                            break;
                        case pxtc.SK.MethodDeclaration:
                        case pxtc.SK.MethodSignature:
                            isMethod = true;
                            break;
                        case pxtc.SK.ModuleDeclaration:
                        case pxtc.SK.FunctionDeclaration:
                            // has special handling
                            break;
                        default:
                            decl = null; // no special handling
                            break;
                    }
                }
                var attrs = parseComments(decl);
                var args = callArgs.slice(0);
                if (isMethod && !recv && !isStatic(decl) && funcExpr.kind == pxtc.SK.PropertyAccessExpression)
                    recv = funcExpr.expression;
                if (res.usedArguments && attrs.trackArgs) {
                    var targs_1 = recv ? [recv].concat(args) : args;
                    var tracked = attrs.trackArgs.map(function (n) { return targs_1[n]; }).map(function (e) {
                        var d = getDecl(e);
                        if (d && (d.kind == pxtc.SK.EnumMember || d.kind == pxtc.SK.VariableDeclaration))
                            return getNodeFullName(checker, d);
                        else if (e && e.kind == pxtc.SK.StringLiteral)
                            return e.text;
                        else
                            return "*";
                    }).join(",");
                    var fn = getNodeFullName(checker, decl);
                    var lst = res.usedArguments[fn];
                    if (!lst) {
                        lst = res.usedArguments[fn] = [];
                    }
                    if (lst.indexOf(tracked) < 0)
                        lst.push(tracked);
                }
                function emitPlain() {
                    var r = mkProcCall(decl, args.map(function (x) { return emitExpr(x); }));
                    var pp = r.data;
                    if (args[0] && pp.proc && pp.proc.classInfo)
                        pp.isThis = args[0].kind == pxtc.SK.ThisKeyword;
                    return r;
                }
                addDefaultParametersAndTypeCheck(sig, args, attrs);
                // first we handle a set of direct cases, note that
                // we are not recursing on funcExpr here, but looking
                // at the associated decl
                if (decl && decl.kind == pxtc.SK.FunctionDeclaration) {
                    var info = getFunctionInfo(decl);
                    if (!info.location) {
                        if (attrs.shim && !hasShimDummy(decl)) {
                            return emitShim(decl, node, args);
                        }
                        markFunctionUsed(decl);
                        return emitPlain();
                    }
                }
                // special case call to super
                if (funcExpr.kind == pxtc.SK.SuperKeyword) {
                    var baseCtor = proc.classInfo.baseClassInfo.ctor;
                    pxtc.assert(!bin.finalPass || !!baseCtor, "!bin.finalPass || !!baseCtor");
                    var ctorArgs = args.map(function (x) { return emitExpr(x); });
                    ctorArgs.unshift(emitThis(funcExpr));
                    return mkProcCallCore(baseCtor, ctorArgs);
                }
                if (isMethod) {
                    var isSuper = false;
                    if (isStatic(decl)) {
                        // no additional arguments
                    }
                    else if (recv) {
                        if (recv.kind == pxtc.SK.SuperKeyword) {
                            isSuper = true;
                        }
                        args.unshift(recv);
                    }
                    else
                        unhandled(node, lf("strange method call"), 9241);
                    var info = getFunctionInfo(decl);
                    if (info.parentClassInfo)
                        markVTableUsed(info.parentClassInfo);
                    markFunctionUsed(decl);
                    var needsVCall = info.virtualParent && !isSuper;
                    var forceIfaceCall = !!isStackMachine() || !!pxtc.target.switches.slowMethods;
                    if (needsVCall && !forceIfaceCall) {
                        pxtc.U.assert(!bin.finalPass || info.virtualIndex != null, "!bin.finalPass || info.virtualIndex != null");
                        var r = mkMethodCall(info.parentClassInfo, info.virtualIndex, null, args.map(function (x) { return emitExpr(x); }));
                        if (args[0].kind == pxtc.SK.ThisKeyword)
                            r.data.isThis = true;
                        return r;
                    }
                    if (attrs.shim && !hasShimDummy(decl)) {
                        return emitShim(decl, node, args);
                    }
                    else if (attrs.helper) {
                        var syms = checker.getSymbolsInScope(node, ts.SymbolFlags.Module);
                        var helperStmt = void 0;
                        for (var _i = 0, syms_1 = syms; _i < syms_1.length; _i++) {
                            var sym = syms_1[_i];
                            if (sym.name == "helpers") {
                                for (var _a = 0, _b = sym.declarations || [sym.valueDeclaration]; _a < _b.length; _a++) {
                                    var d = _b[_a];
                                    if (d.kind == pxtc.SK.ModuleDeclaration) {
                                        for (var _c = 0, _d = d.body.statements; _c < _d.length; _c++) {
                                            var stmt = _d[_c];
                                            if (stmt.symbol.name == attrs.helper) {
                                                helperStmt = stmt;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (!helperStmt)
                            userError(9215, lf("helpers.{0} not found", attrs.helper));
                        if (helperStmt.kind != pxtc.SK.FunctionDeclaration)
                            userError(9216, lf("helpers.{0} isn't a function", attrs.helper));
                        decl = helperStmt;
                        var sig_1 = checker.getSignatureFromDeclaration(decl);
                        var tp = sig_1.getTypeParameters() || [];
                        markFunctionUsed(decl);
                        return emitPlain();
                    }
                    else if (isProperty) {
                        if (node == funcExpr) {
                            // in this special base case, we have property access recv.foo
                            // where recv is a map obejct
                            var name_6 = getName(decl);
                            var res_2 = mkMethodCall(null, null, getIfaceMemberId(name_6, true), args.map(function (x) { return emitExpr(x); }));
                            var pid = res_2.data;
                            if (args.length == 2) {
                                pid.mapMethod = "pxtrt::mapSet";
                            }
                            else {
                                pid.mapMethod = "pxtrt::mapGet";
                            }
                            return res_2;
                        }
                        else {
                            // in this case, recv.foo represents a function/lambda
                            // so the receiver is not needed, as we have already done
                            // the property lookup to get the lambda
                            args.shift();
                        }
                    }
                    else if (needsVCall || decl.kind == pxtc.SK.MethodSignature || (pxtc.target.switches.slowMethods && !isStatic(decl) && !isSuper)) {
                        var name_7 = getName(decl);
                        return mkMethodCall(null, null, getIfaceMemberId(name_7, true), args.map(function (x) { return emitExpr(x); }));
                    }
                    else {
                        return emitPlain();
                    }
                }
                if (decl && decl.kind == pxtc.SK.ModuleDeclaration) {
                    if (getName(decl) == "String")
                        userError(9219, lf("to convert X to string use: X + \"\""));
                    else
                        userError(9220, lf("namespaces cannot be called directly"));
                }
                // here's where we will recurse to generate funcExpr
                args.unshift(funcExpr);
                return mkMethodCall(null, -1, null, args.map(function (x) { return emitExpr(x); }));
            }
            function mkProcCallCore(proc, args) {
                pxtc.U.assert(!bin.finalPass || !!proc);
                var data = {
                    proc: proc,
                    virtualIndex: null,
                    ifaceIndex: null
                };
                return pxtc.ir.op(EK.ProcCall, args, data);
            }
            function mkMethodCall(ci, vidx, ifaceIdx, args) {
                var data = {
                    proc: null,
                    virtualIndex: vidx,
                    ifaceIndex: ifaceIdx,
                    classInfo: ci
                };
                return pxtc.ir.op(EK.ProcCall, args, data);
            }
            function lookupProc(decl) {
                return pxtInfo(decl).proc;
            }
            function mkProcCall(decl, args) {
                var proc = lookupProc(decl);
                if (decl.kind == pxtc.SK.FunctionDeclaration) {
                    var info = getFunctionInfo(decl);
                    markUsageOrder(info);
                }
                pxtc.assert(!!proc || !bin.finalPass, "!!proc || !bin.finalPass");
                return mkProcCallCore(proc, args);
            }
            function layOutGlobals() {
                var globals = bin.globals.slice(0);
                // stable-sort globals, with smallest first, because "strh/b" have
                // smaller immediate range than plain "str" (and same for "ldr")
                // All the pointers go at the end, for GC
                globals.forEach(function (g, i) { return g.index = i; });
                var sz = function (b) { return b == 0 /* None */ ? 10 : sizeOfBitSize(b); };
                globals.sort(function (a, b) {
                    return sz(a.bitSize) - sz(b.bitSize) ||
                        a.index - b.index;
                });
                var currOff = pxtc.numReservedGlobals * 4;
                var firstPointer = 0;
                for (var _i = 0, globals_1 = globals; _i < globals_1.length; _i++) {
                    var g = globals_1[_i];
                    var sz_1 = sizeOfBitSize(g.bitSize);
                    while (currOff & (sz_1 - 1))
                        currOff++; // align
                    if (!firstPointer && g.bitSize == 0 /* None */)
                        firstPointer = currOff;
                    g.index = currOff;
                    currOff += sz_1;
                }
                bin.globalsWords = (currOff + 3) >> 2;
                bin.nonPtrGlobals = firstPointer ? (firstPointer >> 2) : bin.globalsWords;
            }
            function emitVTables() {
                for (var _i = 0, _a = bin.usedClassInfos; _i < _a.length; _i++) {
                    var info = _a[_i];
                    getVTable(info); // gets cached
                }
                var keys = Object.keys(bin.ifaceMemberMap);
                keys.sort(pxtc.U.strcmp);
                keys.unshift(""); // make sure idx=0 is invalid
                bin.emitString("");
                bin.ifaceMembers = keys;
                bin.ifaceMemberMap = {};
                var idx = 0;
                for (var _b = 0, keys_2 = keys; _b < keys_2.length; _b++) {
                    var k = keys_2[_b];
                    bin.ifaceMemberMap[k] = idx++;
                }
                for (var _c = 0, _d = bin.usedClassInfos; _c < _d.length; _c++) {
                    var info = _d[_c];
                    for (var _e = 0, _f = info.itable; _e < _f.length; _e++) {
                        var e = _f[_e];
                        e.idx = getIfaceMemberId(e.name);
                    }
                }
                for (var _g = 0, _h = bin.usedClassInfos; _g < _h.length; _g++) {
                    var info = _h[_g];
                    info.lastSubtypeNo = undefined;
                    info.classNo = undefined;
                }
                var classNo = pxt.BuiltInType.User0;
                var numberClasses = function (i) {
                    pxtc.U.assert(!i.classNo);
                    i.classNo = classNo++;
                    for (var _i = 0, _a = i.derivedClasses; _i < _a.length; _i++) {
                        var subt = _a[_i];
                        if (subt.isUsed)
                            numberClasses(subt);
                    }
                    i.lastSubtypeNo = classNo - 1;
                };
                for (var _j = 0, _k = bin.usedClassInfos; _j < _k.length; _j++) {
                    var info = _k[_j];
                    var par = info;
                    while (par.baseClassInfo)
                        par = par.baseClassInfo;
                    if (!par.classNo)
                        numberClasses(par);
                }
            }
            function getCtor(decl) {
                return decl.members.filter(function (m) { return m.kind == pxtc.SK.Constructor; })[0];
            }
            function isIfaceMemberUsed(name) {
                return pxtc.U.lookup(bin.explicitlyUsedIfaceMembers, name) != null;
            }
            function markVTableUsed(info) {
                recordUsage(info.decl);
                if (info.isUsed)
                    return;
                var pinfo = pxtInfo(info.decl);
                pinfo.flags |= 8 /* IsUsed */;
                if (info.baseClassInfo)
                    markVTableUsed(info.baseClassInfo);
                bin.usedClassInfos.push(info);
            }
            function emitNewExpression(node) {
                var t = checker.getTypeAtLocation(node);
                if (t && isArrayType(t)) {
                    throw pxtc.oops();
                }
                else if (t && isPossiblyGenericClassType(t)) {
                    var classDecl = getDecl(node.expression);
                    if (classDecl.kind != pxtc.SK.ClassDeclaration) {
                        userError(9221, lf("new expression only supported on class types"));
                    }
                    var ctor = void 0;
                    var info = getClassInfo(typeOf(node), classDecl);
                    // find ctor to call in base chain
                    for (var parinfo = info; parinfo; parinfo = parinfo.baseClassInfo) {
                        ctor = getCtor(parinfo.decl);
                        if (ctor)
                            break;
                    }
                    markVTableUsed(info);
                    var lbl = info.id + "_VT";
                    var obj = pxtc.ir.rtcall("pxt::mkClassInstance", [pxtc.ir.ptrlit(lbl, lbl)]);
                    if (ctor) {
                        obj = sharedDef(obj);
                        markUsed(ctor);
                        // arguments undefined on .ctor with optional args
                        var args = (node.arguments || []).slice(0);
                        var ctorAttrs = parseComments(ctor);
                        // unused?
                        // let sig = checker.getResolvedSignature(node)
                        // TODO: can we have overloeads?
                        addDefaultParametersAndTypeCheck(checker.getResolvedSignature(node), args, ctorAttrs);
                        var compiled = args.map(function (x) { return emitExpr(x); });
                        if (ctorAttrs.shim) {
                            // TODO need to deal with refMask and tagged ints here
                            // we drop 'obj' variable
                            return pxtc.ir.rtcall(ctorAttrs.shim, compiled);
                        }
                        compiled.unshift(obj);
                        proc.emitExpr(mkProcCall(ctor, compiled));
                        return obj;
                    }
                    else {
                        if (node.arguments && node.arguments.length)
                            userError(9222, lf("constructor with arguments not found"));
                        return obj;
                    }
                }
                else {
                    throw unhandled(node, lf("unknown type for new"), 9243);
                }
            }
            /* Requires the following to be declared in global scope:
                //% shim=@hex
                function hex(lits: any, ...args: any[]): Buffer { return null }
            */
            function emitTaggedTemplateExpression(node) {
                function isHexDigit(c) {
                    return /^[0-9a-f]$/i.test(c);
                }
                function f4PreProcess(s) {
                    if (!Array.isArray(attrs.groups))
                        throw unhandled(node, lf("missing groups in @f4 literal"), 9272);
                    var matrix = [];
                    var line = [];
                    var tbl = {};
                    var maxLen = 0;
                    attrs.groups.forEach(function (str, n) {
                        for (var _i = 0, str_1 = str; _i < str_1.length; _i++) {
                            var c = str_1[_i];
                            tbl[c] = n;
                        }
                    });
                    s += "\n";
                    for (var i = 0; i < s.length; ++i) {
                        var c = s[i];
                        switch (c) {
                            case ' ':
                            case '\t':
                                break;
                            case '\n':
                                if (line.length > 0) {
                                    matrix.push(line);
                                    maxLen = Math.max(line.length, maxLen);
                                    line = [];
                                }
                                break;
                            default:
                                var v = pxtc.U.lookup(tbl, c);
                                if (v == null) {
                                    if (attrs.groups.length == 2)
                                        v = 1; // default anything non-zero to one
                                    else
                                        throw unhandled(node, lf("invalid character in image literal: '{0}'", v), 9273);
                                }
                                line.push(v);
                                break;
                        }
                    }
                    var bpp = 8;
                    if (attrs.groups.length <= 2) {
                        bpp = 1;
                    }
                    else if (attrs.groups.length <= 16) {
                        bpp = 4;
                    }
                    return pxtc.f4EncodeImg(maxLen, matrix.length, bpp, function (x, y) { return matrix[y][x] || 0; });
                }
                function parseHexLiteral(node, s) {
                    var thisJres = currJres;
                    if (s[0] == '_' && s[1] == '_' && opts.jres[s]) {
                        thisJres = opts.jres[s];
                        s = "";
                    }
                    if (s == "" && thisJres) {
                        var fontMatch = /font\/x-mkcd-b(\d+)/.exec(thisJres.mimeType);
                        if (fontMatch) {
                            if (!bin.finalPass) {
                                s = "aabbccdd";
                            }
                            else {
                                var chsz = parseInt(fontMatch[1]);
                                var data = atob(thisJres.data);
                                var mask = bin.usedChars;
                                var buf = "";
                                var incl = "";
                                for (var pos = 0; pos < data.length; pos += chsz) {
                                    var charcode = data.charCodeAt(pos) + (data.charCodeAt(pos + 1) << 8);
                                    if (charcode < 128 || (mask[charcode >> 5] & (1 << (charcode & 31)))) {
                                        buf += data.slice(pos, pos + chsz);
                                        incl += charcode + ", ";
                                    }
                                }
                                s = pxtc.U.toHex(pxtc.U.stringToUint8Array(buf));
                            }
                        }
                        else if (!thisJres.dataEncoding || thisJres.dataEncoding == "base64") {
                            s = pxtc.U.toHex(pxtc.U.stringToUint8Array(ts.pxtc.decodeBase64(thisJres.data)));
                        }
                        else if (thisJres.dataEncoding == "hex") {
                            s = thisJres.data;
                        }
                        else {
                            userError(9271, lf("invalid jres encoding '{0}' on '{1}'", thisJres.dataEncoding, thisJres.id));
                        }
                    }
                    if (/^e[14]/i.test(s) && node.parent && node.parent.kind == pxtc.SK.CallExpression &&
                        node.parent.expression.getText() == "image.ofBuffer") {
                        var m = /^e([14])(..)(..)..(.*)/i.exec(s);
                        s = "870" + m[1] + m[2] + "00" + m[3] + "000000" + m[4];
                    }
                    var res = "";
                    for (var i = 0; i < s.length; ++i) {
                        var c = s[i];
                        if (isHexDigit(c)) {
                            if (isHexDigit(s[i + 1])) {
                                res += c + s[i + 1];
                                i++;
                            }
                        }
                        else if (/^[\s\.]$/.test(c))
                            continue;
                        else
                            throw unhandled(node, lf("invalid character in hex literal '{0}'", c), 9265);
                    }
                    if (pxtc.target.isNative) {
                        var lbl = bin.emitHexLiteral(res.toLowerCase());
                        return pxtc.ir.ptrlit(lbl, lbl);
                    }
                    else {
                        var lbl = "_hex" + nodeKey(node);
                        return pxtc.ir.ptrlit(lbl, { hexlit: res.toLowerCase() });
                    }
                }
                var decl = getDecl(node.tag);
                if (!decl)
                    throw unhandled(node, lf("invalid tagged template"), 9265);
                var attrs = parseComments(decl);
                var res;
                var callInfo = {
                    decl: decl,
                    qName: decl ? getNodeFullName(checker, decl) : "?",
                    args: [node.template],
                    isExpression: true
                };
                pxtInfo(node).callInfo = callInfo;
                function handleHexLike(pp) {
                    if (node.template.kind != pxtc.SK.NoSubstitutionTemplateLiteral)
                        throw unhandled(node, lf("substitution not supported in hex literal", attrs.shim), 9265);
                    res = parseHexLiteral(node, pp(node.template.text));
                }
                switch (attrs.shim) {
                    case "@hex":
                        handleHexLike(function (s) { return s; });
                        break;
                    case "@f4":
                        handleHexLike(f4PreProcess);
                        break;
                    default:
                        throw unhandled(node, lf("invalid shim '{0}' on tagged template", attrs.shim), 9265);
                }
                if (attrs.helper) {
                    res = pxtc.ir.rtcall(attrs.helper, [res]);
                }
                return res;
            }
            function emitTypeAssertion(node) {
                typeCheckSubtoSup(node.expression, node);
                return emitExpr(node.expression);
            }
            function emitAsExpression(node) {
                typeCheckSubtoSup(node.expression, node);
                return emitExpr(node.expression);
            }
            function emitParenExpression(node) {
                return emitExpr(node.expression);
            }
            function getParameters(node) {
                var res = node.parameters.slice(0);
                if (!isStatic(node) && isClassFunction(node)) {
                    var info = getFunctionInfo(node);
                    if (!info.thisParameter) {
                        info.thisParameter = {
                            kind: pxtc.SK.Parameter,
                            name: { text: "this" },
                            isThisParameter: true,
                            parent: node
                        };
                    }
                    res.unshift(info.thisParameter);
                }
                return res;
            }
            function emitFunLitCore(node, raw) {
                if (raw === void 0) { raw = false; }
                var lbl = getFunctionLabel(node);
                return pxtc.ir.ptrlit(lbl + "_Lit", lbl);
            }
            function flushWorkQueue() {
                proc = lookupProc(rootFunction);
                // we emit everything that's left, but only at top level
                // to avoid unbounded stack
                while (usedWorkList.length > 0) {
                    var f = usedWorkList.pop();
                    emitTopLevel(f);
                }
            }
            function flushHoistedFunctionDefinitions() {
                var curr = pendingFunctionDefinitions;
                if (curr.length > 0) {
                    pendingFunctionDefinitions = [];
                    for (var _i = 0, curr_1 = curr; _i < curr_1.length; _i++) {
                        var node = curr_1[_i];
                        var prevProc = proc;
                        try {
                            emitFuncCore(node);
                        }
                        finally {
                            proc = prevProc;
                        }
                    }
                }
            }
            function markVariableDefinition(vi) {
                if (bin.finalPass && vi.functionsToDefine) {
                    pxtc.U.pushRange(pendingFunctionDefinitions, vi.functionsToDefine);
                }
            }
            function emitFuncCore(node) {
                var info = getFunctionInfo(node);
                var lit = null;
                if (bin.finalPass) {
                    if (info.alreadyEmitted) {
                        pxtc.U.assert(info.usedBeforeDecl);
                        return null;
                    }
                    info.alreadyEmitted = true;
                }
                var isExpression = node.kind == pxtc.SK.ArrowFunction || node.kind == pxtc.SK.FunctionExpression;
                var caps = info.capturedVars.slice(0);
                var locals = caps.map(function (v, i) {
                    var l = new pxtc.ir.Cell(i, v, getVarInfo(v));
                    l.iscap = true;
                    return l;
                });
                if (info.usedBeforeDecl === undefined)
                    info.usedBeforeDecl = false;
                // if no captured variables, then we can get away with a plain pointer to code
                if (caps.length > 0) {
                    pxtc.assert(getEnclosingFunction(node) != null, "getEnclosingFunction(node) != null)");
                    lit = pxtc.ir.shared(pxtc.ir.rtcall("pxt::mkAction", [pxtc.ir.numlit(caps.length), emitFunLitCore(node, true)]));
                    info.usedAsValue = true;
                    caps.forEach(function (l, i) {
                        var loc = proc.localIndex(l);
                        if (!loc)
                            userError(9223, lf("cannot find captured value: {0}", checker.symbolToString(l.symbol)));
                        var v = loc.loadCore();
                        proc.emitExpr(pxtc.ir.rtcall("pxtrt::stclo", [lit, pxtc.ir.numlit(i), v]));
                    });
                    if (node.kind == pxtc.SK.FunctionDeclaration) {
                        info.location = proc.mkLocal(node, getVarInfo(node));
                        proc.emitExpr(info.location.storeDirect(lit));
                        lit = null;
                    }
                }
                else {
                    if (isExpression) {
                        lit = emitFunLitCore(node);
                        info.usedAsValue = true;
                    }
                }
                pxtc.assert(!!lit == isExpression, "!!lit == isExpression");
                var existing = lookupProc(node);
                if (existing) {
                    proc = existing;
                    proc.reset();
                }
                else {
                    pxtc.assert(!bin.finalPass, "!bin.finalPass");
                    var pinfo_4 = pxtInfo(node);
                    var myProc_1 = new pxtc.ir.Procedure();
                    myProc_1.isRoot = !!(pinfo_4.flags & 1 /* IsRootFunction */);
                    myProc_1.action = node;
                    myProc_1.info = info;
                    pinfo_4.proc = myProc_1;
                    myProc_1.usingCtx = currUsingContext;
                    proc = myProc_1;
                    recordAction(function (bin) { return bin.addProc(myProc_1); });
                }
                proc.captured = locals;
                var initalizedFields = [];
                if (node.parent.kind == pxtc.SK.ClassDeclaration) {
                    var parClass = node.parent;
                    var classInfo = getClassInfo(null, parClass);
                    if (proc.classInfo)
                        pxtc.assert(proc.classInfo == classInfo, "proc.classInfo == classInfo");
                    else
                        proc.classInfo = classInfo;
                    if (node.kind == pxtc.SK.Constructor) {
                        if (classInfo.baseClassInfo) {
                            for (var _i = 0, _a = classInfo.baseClassInfo.decl.members; _i < _a.length; _i++) {
                                var m = _a[_i];
                                if (m.kind == pxtc.SK.Constructor)
                                    markFunctionUsed(m);
                            }
                        }
                        if (classInfo.ctor)
                            pxtc.assert(classInfo.ctor == proc, "classInfo.ctor == proc");
                        else
                            classInfo.ctor = proc;
                        for (var _b = 0, _c = classInfo.allfields; _b < _c.length; _b++) {
                            var f = _c[_b];
                            if (f.kind == pxtc.SK.PropertyDeclaration && !isStatic(f)) {
                                var fi = f;
                                if (fi.initializer)
                                    initalizedFields.push(fi);
                            }
                        }
                    }
                }
                var destructuredParameters = [];
                var fieldAssignmentParameters = [];
                proc.args = getParameters(node).map(function (p, i) {
                    if (p.name.kind === pxtc.SK.ObjectBindingPattern) {
                        destructuredParameters.push(p);
                    }
                    if (node.kind == pxtc.SK.Constructor && isCtorField(p)) {
                        fieldAssignmentParameters.push(p);
                    }
                    var l = new pxtc.ir.Cell(i, p, getVarInfo(p));
                    markVariableDefinition(l.info);
                    l.isarg = true;
                    return l;
                });
                proc.args.forEach(function (l) {
                    //console.log(l.toString(), l.info)
                    if (l.isByRefLocal()) {
                        // TODO add C++ support function to do this
                        var tmp = pxtc.ir.shared(pxtc.ir.rtcall("pxtrt::mklocRef", []));
                        proc.emitExpr(pxtc.ir.rtcall("pxtrt::stlocRef", [tmp, l.loadCore()], 1));
                        proc.emitExpr(l.storeDirect(tmp));
                    }
                });
                destructuredParameters.forEach(function (dp) { return emitVariableDeclaration(dp); });
                // for constructor(public foo:number) generate this.foo = foo;
                for (var _d = 0, fieldAssignmentParameters_1 = fieldAssignmentParameters; _d < fieldAssignmentParameters_1.length; _d++) {
                    var p = fieldAssignmentParameters_1[_d];
                    var idx = fieldIndexCore(proc.classInfo, getFieldInfo(proc.classInfo, getName(p)), false);
                    var trg2 = pxtc.ir.op(EK.FieldAccess, [emitLocalLoad(info.thisParameter)], idx);
                    proc.emitExpr(pxtc.ir.op(EK.Store, [trg2, emitLocalLoad(p)]));
                }
                for (var _e = 0, initalizedFields_1 = initalizedFields; _e < initalizedFields_1.length; _e++) {
                    var f = initalizedFields_1[_e];
                    var idx = fieldIndexCore(proc.classInfo, getFieldInfo(proc.classInfo, getName(f)), false);
                    var trg2 = pxtc.ir.op(EK.FieldAccess, [emitLocalLoad(info.thisParameter)], idx);
                    proc.emitExpr(pxtc.ir.op(EK.Store, [trg2, emitExpr(f.initializer)]));
                }
                flushHoistedFunctionDefinitions();
                if (node.body.kind == pxtc.SK.Block) {
                    emit(node.body);
                    if (funcHasReturn(proc.action)) {
                        var last = proc.body[proc.body.length - 1];
                        if (last && last.stmtKind == pxtc.ir.SK.Jmp && last.jmpMode == pxtc.ir.JmpMode.Always) {
                            // skip final 'return undefined' as there was 'return something' just above
                        }
                        else {
                            proc.emitJmp(getLabels(node).ret, emitLit(undefined), pxtc.ir.JmpMode.Always);
                        }
                    }
                }
                else {
                    var v = emitExpr(node.body);
                    proc.emitJmp(getLabels(node).ret, v, pxtc.ir.JmpMode.Always);
                }
                proc.emitLblDirect(getLabels(node).ret);
                proc.stackEmpty();
                var lbl = proc.mkLabel("final");
                if (funcHasReturn(proc.action)) {
                    // the jmp will take R0 with it as the return value
                    proc.emitJmp(lbl);
                }
                else {
                    proc.emitJmp(lbl, emitLit(undefined));
                }
                proc.emitLbl(lbl);
                if (info.capturedVars.length &&
                    info.usedBeforeDecl &&
                    node.kind == pxtc.SK.FunctionDeclaration && !bin.finalPass) {
                    info.capturedVars.sort(function (a, b) { return b.pos - a.pos; });
                    var vinfo = getVarInfo(info.capturedVars[0]);
                    if (!vinfo.functionsToDefine)
                        vinfo.functionsToDefine = [];
                    vinfo.functionsToDefine.push(node);
                }
                // nothing should be on work list in final pass - everything should be already marked as used
                pxtc.assert(!bin.finalPass || usedWorkList.length == 0, "!bin.finalPass || usedWorkList.length == 0");
                return lit;
            }
            function sharedDef(e) {
                var v = pxtc.ir.shared(e);
                // make sure we save it
                proc.emitExpr(v);
                return v;
            }
            function captureJmpValue() {
                return sharedDef(pxtc.ir.op(EK.JmpValue, []));
            }
            function hasShimDummy(node) {
                if (opts.target.isNative)
                    return false;
                var f = node;
                return f.body && (f.body.kind != pxtc.SK.Block || f.body.statements.length > 0);
            }
            function emitFunctionDeclaration(node) {
                if (!shouldEmitNow(node))
                    return undefined;
                if (pxtInfo(node).flags & 32 /* FromPreviousCompile */)
                    return undefined;
                var attrs = parseComments(node);
                if (attrs.shim != null) {
                    if (attrs.shim[0] == "@")
                        return undefined;
                    if (opts.target.isNative) {
                        pxtc.hex.validateShim(getDeclName(node), attrs.shim, attrs, funcHasReturn(node), getParameters(node).map(function (p) { return isNumberLikeType(typeOf(p)); }));
                    }
                    if (!hasShimDummy(node))
                        return undefined;
                }
                if (ts.isInAmbientContext(node))
                    return undefined;
                if (!node.body)
                    return undefined;
                var lit = null;
                var prevProc = proc;
                try {
                    lit = emitFuncCore(node);
                }
                finally {
                    proc = prevProc;
                }
                return lit;
            }
            function emitDeleteExpression(node) {
                var objExpr;
                var keyExpr;
                if (node.expression.kind == pxtc.SK.PropertyAccessExpression) {
                    var inner_1 = node.expression;
                    objExpr = inner_1.expression;
                    keyExpr = function () { return emitStringLiteral(inner_1.name.text); };
                }
                else if (node.expression.kind == pxtc.SK.ElementAccessExpression) {
                    var inner_2 = node.expression;
                    objExpr = inner_2.expression;
                    keyExpr = function () { return emitExpr(inner_2.argumentExpression); };
                }
                else {
                    throw userError(9276, lf("expression not supported as argument to 'delete'"));
                }
                // we know these would just fail at runtime
                var objExprType = typeOf(objExpr);
                if (isClassType(objExprType))
                    throw userError(9277, lf("'delete' not supported on class types"));
                if (isArrayType(objExprType))
                    throw userError(9277, lf("'delete' not supported on array"));
                var args = [
                    emitExpr(objExpr),
                    keyExpr()
                ];
                return rtcallMaskDirect("pxtrt::mapDeleteByString", args);
            }
            function emitTypeOfExpression(node) {
                return rtcallMask("pxt::typeOf", [node.expression], null);
            }
            function emitVoidExpression(node) { }
            function emitAwaitExpression(node) { }
            function emitPrefixUnaryExpression(node) {
                var folded = constantFold(node);
                if (folded)
                    return emitLit(folded.val);
                var tp = typeOf(node.operand);
                if (node.operator == pxtc.SK.ExclamationToken) {
                    return fromBool(pxtc.ir.rtcall("Boolean_::bang", [emitCondition(node.operand)]));
                }
                if (isNumberType(tp)) {
                    switch (node.operator) {
                        case pxtc.SK.PlusPlusToken:
                            return emitIncrement(node.operand, "numops::adds", false);
                        case pxtc.SK.MinusMinusToken:
                            return emitIncrement(node.operand, "numops::subs", false);
                        case pxtc.SK.MinusToken: {
                            var inner = emitExpr(node.operand);
                            var v = valueToInt(inner);
                            if (v != null)
                                return emitLit(-v);
                            return emitIntOp("numops::subs", emitLit(0), inner);
                        }
                        case pxtc.SK.PlusToken:
                            return emitExpr(node.operand); // no-op
                        case pxtc.SK.TildeToken: {
                            var inner = emitExpr(node.operand);
                            var v = valueToInt(inner);
                            if (v != null)
                                return emitLit(~v);
                            return rtcallMaskDirect(mapIntOpName("numops::bnot"), [inner]);
                        }
                        default:
                            break;
                    }
                }
                throw unhandled(node, lf("unsupported prefix unary operation"), 9245);
            }
            function doNothing() { }
            function needsCache(e) {
                var c = e;
                c.needsIRCache = true;
                irCachesToClear.push(c);
            }
            function prepForAssignment(trg, src) {
                if (src === void 0) { src = null; }
                var prev = irCachesToClear.length;
                if (trg.kind == pxtc.SK.PropertyAccessExpression || trg.kind == pxtc.SK.ElementAccessExpression) {
                    needsCache(trg.expression);
                }
                if (src)
                    needsCache(src);
                if (irCachesToClear.length == prev)
                    return doNothing;
                else
                    return function () {
                        for (var i = prev; i < irCachesToClear.length; ++i) {
                            irCachesToClear[i].cachedIR = null;
                            irCachesToClear[i].needsIRCache = false;
                        }
                        irCachesToClear.splice(prev, irCachesToClear.length - prev);
                    };
            }
            function irToNode(expr, isRef) {
                if (isRef === void 0) { isRef = false; }
                var r = {
                    kind: pxtc.SK.NullKeyword,
                    isRefOverride: isRef,
                };
                pxtInfo(r).valueOverride = expr;
                return r;
            }
            function emitIncrement(trg, meth, isPost, one) {
                if (one === void 0) { one = null; }
                var cleanup = prepForAssignment(trg);
                var oneExpr = one ? emitExpr(one) : emitLit(1);
                var prev = pxtc.ir.shared(emitExpr(trg));
                var result = pxtc.ir.shared(emitIntOp(meth, prev, oneExpr));
                emitStore(trg, irToNode(result, true));
                cleanup();
                return isPost ? prev : result;
            }
            function emitPostfixUnaryExpression(node) {
                var tp = typeOf(node.operand);
                if (isNumberType(tp)) {
                    switch (node.operator) {
                        case pxtc.SK.PlusPlusToken:
                            return emitIncrement(node.operand, "numops::adds", true);
                        case pxtc.SK.MinusMinusToken:
                            return emitIncrement(node.operand, "numops::subs", true);
                        default:
                            break;
                    }
                }
                throw unhandled(node, lf("unsupported postfix unary operation"), 9246);
            }
            function fieldIndexCore(info, fld, needsCheck) {
                if (needsCheck === void 0) { needsCheck = true; }
                if (isStatic(fld))
                    pxtc.U.oops("fieldIndex on static field: " + getName(fld));
                var attrs = parseComments(fld);
                var idx = info.allfields.indexOf(fld);
                if (idx < 0 && bin.finalPass)
                    pxtc.U.oops("missing field");
                return {
                    idx: idx,
                    name: getName(fld),
                    isRef: true,
                    shimName: attrs.shim,
                    classInfo: info,
                    needsCheck: needsCheck
                };
            }
            function fieldIndex(pacc) {
                var tp = typeOf(pacc.expression);
                if (isPossiblyGenericClassType(tp)) {
                    var info = getClassInfo(tp);
                    var noCheck = pacc.expression.kind == pxtc.SK.ThisKeyword;
                    if (pxtc.target.switches.noThisCheckOpt)
                        noCheck = false;
                    return fieldIndexCore(info, getFieldInfo(info, pacc.name.text), !noCheck);
                }
                else {
                    throw unhandled(pacc, lf("bad field access"), 9247);
                }
            }
            function getFieldInfo(info, fieldName) {
                var field = info.allfields.filter(function (f) { return f.name.text == fieldName; })[0];
                if (!field) {
                    userError(9224, lf("field {0} not found", fieldName));
                }
                return field;
            }
            function emitStore(trg, src, checkAssign) {
                if (checkAssign === void 0) { checkAssign = false; }
                if (checkAssign) {
                    typeCheckSubtoSup(src, trg);
                }
                var decl = getDecl(trg);
                var isGlobal = isGlobalVar(decl);
                if (trg.kind == pxtc.SK.Identifier || isGlobal) {
                    if (decl && (isGlobal || isVar(decl) || isParameter(decl))) {
                        var l = lookupCell(decl);
                        recordUse(decl, true);
                        proc.emitExpr(l.storeByRef(emitExpr(src)));
                    }
                    else {
                        unhandled(trg, lf("bad target identifier"), 9248);
                    }
                }
                else if (trg.kind == pxtc.SK.PropertyAccessExpression) {
                    var decl_1 = getDecl(trg);
                    if (decl_1 && decl_1.kind == pxtc.SK.GetAccessor) {
                        decl_1 = ts.getDeclarationOfKind(decl_1.symbol, pxtc.SK.SetAccessor);
                        if (!decl_1) {
                            unhandled(trg, lf("setter not available"), 9253);
                        }
                        proc.emitExpr(emitCallCore(trg, trg, [src], null, decl_1));
                    }
                    else if (decl_1 && (decl_1.kind == pxtc.SK.PropertySignature || decl_1.kind == pxtc.SK.PropertyAssignment || isSlowField(decl_1))) {
                        proc.emitExpr(emitCallCore(trg, trg, [src], null, decl_1));
                    }
                    else {
                        var trg2 = emitExpr(trg);
                        proc.emitExpr(pxtc.ir.op(EK.Store, [trg2, emitExpr(src)]));
                    }
                }
                else if (trg.kind == pxtc.SK.ElementAccessExpression) {
                    proc.emitExpr(emitIndexedAccess(trg, src));
                }
                else if (trg.kind == pxtc.SK.ArrayLiteralExpression) {
                    // special-case [a,b,c]=[1,2,3], or more commonly [a,b]=[b,a]
                    if (src.kind == pxtc.SK.ArrayLiteralExpression) {
                        // typechecker enforces that these two have the same length
                        var tmps_1 = src.elements.map(function (e) {
                            var ee = pxtc.ir.shared(emitExpr(e));
                            proc.emitExpr(ee);
                            return ee;
                        });
                        trg.elements.forEach(function (e, idx) {
                            emitStore(e, irToNode(tmps_1[idx]));
                        });
                    }
                    else {
                        // unfortunately, this uses completely different syntax tree nodes to the patters in const/let...
                        var bindingExpr_1 = pxtc.ir.shared(emitExpr(src));
                        trg.elements.forEach(function (e, idx) {
                            emitStore(e, irToNode(rtcallMaskDirect("Array_::getAt", [bindingExpr_1, pxtc.ir.numlit(idx)])));
                        });
                    }
                }
                else {
                    unhandled(trg, lf("bad assignment target"), 9249);
                }
            }
            function handleAssignment(node) {
                var src = node.right;
                if (node.parent.kind == pxtc.SK.ExpressionStatement)
                    src = null;
                var cleanup = prepForAssignment(node.left, src);
                emitStore(node.left, node.right, true);
                var res = src ? emitExpr(src) : emitLit(undefined);
                cleanup();
                return res;
            }
            function mapIntOpName(n) {
                if (isThumb()) {
                    switch (n) {
                        case "numops::adds":
                        case "numops::subs":
                        case "numops::eors":
                        case "numops::ands":
                        case "numops::orrs":
                            return "@nomask@" + n;
                    }
                }
                if (isStackMachine()) {
                    switch (n) {
                        case "pxt::switch_eq":
                            return "numops::eq";
                    }
                }
                return n;
            }
            function emitIntOp(op, left, right) {
                return rtcallMaskDirect(mapIntOpName(op), [left, right]);
            }
            function unaryOpConst(tok, aa) {
                if (!aa)
                    return null;
                var a = aa.val;
                switch (tok) {
                    case pxtc.SK.PlusToken: return { val: +a };
                    case pxtc.SK.MinusToken: return { val: -a };
                    case pxtc.SK.TildeToken: return { val: ~a };
                    case pxtc.SK.ExclamationToken: return { val: !a };
                    default:
                        return null;
                }
            }
            function binaryOpConst(tok, aa, bb) {
                if (!aa || !bb)
                    return null;
                var a = aa.val;
                var b = bb.val;
                switch (tok) {
                    case pxtc.SK.PlusToken: return { val: a + b };
                    case pxtc.SK.MinusToken: return { val: a - b };
                    case pxtc.SK.SlashToken: return { val: a / b };
                    case pxtc.SK.PercentToken: return { val: a % b };
                    case pxtc.SK.AsteriskToken: return { val: a * b };
                    case pxtc.SK.AsteriskAsteriskToken: return { val: Math.pow(a, b) };
                    case pxtc.SK.AmpersandToken: return { val: a & b };
                    case pxtc.SK.BarToken: return { val: a | b };
                    case pxtc.SK.CaretToken: return { val: a ^ b };
                    case pxtc.SK.LessThanLessThanToken: return { val: a << b };
                    case pxtc.SK.GreaterThanGreaterThanToken: return { val: a >> b };
                    case pxtc.SK.GreaterThanGreaterThanGreaterThanToken: return { val: a >>> b };
                    case pxtc.SK.LessThanEqualsToken: return { val: a <= b };
                    case pxtc.SK.LessThanToken: return { val: a < b };
                    case pxtc.SK.GreaterThanEqualsToken: return { val: a >= b };
                    case pxtc.SK.GreaterThanToken: return { val: a > b };
                    case pxtc.SK.EqualsEqualsToken: return { val: a == b };
                    case pxtc.SK.EqualsEqualsEqualsToken: return { val: a === b };
                    case pxtc.SK.ExclamationEqualsEqualsToken: return { val: a !== b };
                    case pxtc.SK.ExclamationEqualsToken: return { val: a != b };
                    case pxtc.SK.BarBarToken: return { val: a || b };
                    case pxtc.SK.AmpersandAmpersandToken: return { val: a && b };
                    default:
                        return null;
                }
            }
            function quickGetQualifiedName(expr) {
                if (expr.kind == pxtc.SK.Identifier) {
                    return expr.text;
                }
                else if (expr.kind == pxtc.SK.PropertyAccessExpression) {
                    var pa = expr;
                    var left = quickGetQualifiedName(pa.expression);
                    if (left)
                        return left + "." + pa.name.text;
                }
                return null;
            }
            function fun1Const(expr, aa) {
                if (!aa)
                    return null;
                var a = aa.val;
                switch (quickGetQualifiedName(expr)) {
                    case "Math.floor": return { val: Math.floor(a) };
                    case "Math.ceil": return { val: Math.ceil(a) };
                    case "Math.round": return { val: Math.round(a) };
                }
                return null;
            }
            function enumValue(decl) {
                var attrs = parseComments(decl);
                var ev = attrs.enumval;
                if (!ev) {
                    var val = checker.getConstantValue(decl);
                    if (val == null)
                        return null;
                    ev = val + "";
                }
                if (/^[+-]?\d+$/.test(ev))
                    return ev;
                if (/^0x[A-Fa-f\d]{2,8}$/.test(ev))
                    return ev;
                pxtc.U.userError("enumval only support number literals");
                return "0";
            }
            function emitFolded(f) {
                if (f)
                    return emitLit(f.val);
                return null;
            }
            function constantFoldDecl(decl) {
                if (!decl)
                    return null;
                var info = pxtInfo(decl);
                if (info.constantFolded)
                    return info.constantFolded;
                if (isVar(decl) && (decl.parent.flags & ts.NodeFlags.Const)) {
                    var vardecl = decl;
                    if (vardecl.initializer)
                        info.constantFolded = constantFold(vardecl.initializer);
                }
                else if (decl.kind == pxtc.SK.EnumMember) {
                    var en = decl;
                    var ev = enumValue(en);
                    if (ev == null) {
                        info.constantFolded = constantFold(en.initializer);
                    }
                    else {
                        var v = parseInt(ev);
                        if (!isNaN(v))
                            info.constantFolded = { val: v };
                    }
                }
                else if (decl.kind == pxtc.SK.PropertyDeclaration && isStatic(decl) && isReadOnly(decl)) {
                    var pd = decl;
                    info.constantFolded = constantFold(pd.initializer);
                }
                //if (info.constantFolded)
                //    console.log(getDeclName(decl), getSourceFileOfNode(decl).fileName, info.constantFolded.val)
                return info.constantFolded;
            }
            function constantFold(e) {
                var info = pxtInfo(e);
                if (info.constantFolded === undefined) {
                    info.constantFolded = null; // make sure we don't come back here recursively
                    var res_3 = constantFoldCore(e);
                    info.constantFolded = res_3;
                }
                return info.constantFolded;
            }
            function constantFoldCore(e) {
                if (!e)
                    return null;
                switch (e.kind) {
                    case pxtc.SK.PrefixUnaryExpression: {
                        var expr = e;
                        var inner = constantFold(expr.operand);
                        return unaryOpConst(expr.operator, inner);
                    }
                    case pxtc.SK.BinaryExpression: {
                        var expr = e;
                        var left = constantFold(expr.left);
                        if (!left)
                            return null;
                        var right = constantFold(expr.right);
                        if (!right)
                            return null;
                        return binaryOpConst(expr.operatorToken.kind, left, right);
                    }
                    case pxtc.SK.NumericLiteral: {
                        var expr = e;
                        var v = parseFloat(expr.text);
                        if (isNaN(v))
                            return null;
                        return { val: v };
                    }
                    case pxtc.SK.NullKeyword:
                        return { val: null };
                    case pxtc.SK.TrueKeyword:
                        return { val: true };
                    case pxtc.SK.FalseKeyword:
                        return { val: false };
                    case pxtc.SK.UndefinedKeyword:
                        return { val: undefined };
                    case pxtc.SK.CallExpression: {
                        var expr = e;
                        if (expr.arguments.length == 1)
                            return fun1Const(expr.expression, constantFold(expr.arguments[0]));
                        return null;
                    }
                    case pxtc.SK.PropertyAccessExpression:
                    case pxtc.SK.Identifier:
                        // regular getDecl() will mark symbols as used
                        // if we succeed, we will not use any symbols, so no rason to mark them
                        return constantFoldDecl(getDeclCore(e));
                    case pxtc.SK.AsExpression:
                        return constantFold(e.expression);
                    default:
                        return null;
                }
            }
            function emitAsInt(e) {
                var prev = pxtc.target.switches.boxDebug;
                var expr = null;
                if (prev) {
                    try {
                        pxtc.target.switches.boxDebug = false;
                        expr = emitExpr(e);
                    }
                    finally {
                        pxtc.target.switches.boxDebug = prev;
                    }
                }
                else {
                    expr = emitExpr(e);
                }
                var v = valueToInt(expr);
                if (v === undefined)
                    throw userError(9267, lf("a constant number-like expression is required here"));
                return v;
            }
            function lookupConfigConst(ctx, name) {
                var r = lookupConfigConstCore(ctx, name, "userconfig");
                if (r == null)
                    r = lookupConfigConstCore(ctx, name, "config");
                return r;
            }
            function lookupConfigConstCore(ctx, name, mod) {
                var syms = checker.getSymbolsInScope(ctx, ts.SymbolFlags.Module);
                var configMod = syms.filter(function (s) { return s.name == mod && !!s.valueDeclaration; })[0];
                if (!configMod)
                    return null;
                for (var _i = 0, _a = configMod.valueDeclaration.body.statements; _i < _a.length; _i++) {
                    var stmt = _a[_i];
                    if (stmt.kind == pxtc.SK.VariableStatement) {
                        var v = stmt;
                        for (var _b = 0, _c = v.declarationList.declarations; _b < _c.length; _b++) {
                            var d = _c[_b];
                            if (d.symbol.name == name) {
                                return emitAsInt(d.initializer);
                            }
                        }
                    }
                }
                return null;
            }
            function lookupDalConst(ctx, name) {
                var syms = checker.getSymbolsInScope(ctx, ts.SymbolFlags.Enum);
                var dalEnm = syms.filter(function (s) { return s.name == "DAL" && !!s.valueDeclaration; })[0];
                if (!dalEnm)
                    return null;
                var decl = dalEnm.valueDeclaration.members
                    .filter(function (s) { return s.symbol.name == name; })[0];
                if (decl)
                    return checker.getConstantValue(decl);
                return null;
            }
            function valueToInt(e) {
                if (e.exprKind == pxtc.ir.EK.NumberLiteral) {
                    var v = e.data;
                    if (opts.target.isNative && !isStackMachine()) {
                        if (v == pxtc.taggedNull || v == pxtc.taggedUndefined || v == pxtc.taggedFalse)
                            return 0;
                        if (v == pxtc.taggedTrue)
                            return 1;
                        if (typeof v == "number")
                            return v >> 1;
                    }
                    else {
                        if (typeof v == "number")
                            return v;
                    }
                }
                else if (e.exprKind == pxtc.ir.EK.RuntimeCall && e.args.length == 2) {
                    var v0 = valueToInt(e.args[0]);
                    var v1 = valueToInt(e.args[1]);
                    if (v0 === undefined || v1 === undefined)
                        return undefined;
                    switch (e.data) {
                        case "numops::orrs":
                            return v0 | v1;
                        case "numops::adds":
                            return v0 + v1;
                        default:
                            console.log(e);
                            return undefined;
                    }
                }
                return undefined;
            }
            function emitLit(v) {
                if (opts.target.isNative && !isStackMachine()) {
                    var numlit = taggedSpecial(v);
                    if (numlit != null)
                        return pxtc.ir.numlit(numlit);
                    else if (typeof v == "number") {
                        if (fitsTaggedInt(v)) {
                            return pxtc.ir.numlit((v << 1) | 1);
                        }
                        else {
                            var lbl = bin.emitDouble(v);
                            return pxtc.ir.ptrlit(lbl, JSON.stringify(v));
                        }
                    }
                    else {
                        throw pxtc.U.oops("bad literal: " + v);
                    }
                }
                else {
                    return pxtc.ir.numlit(v);
                }
            }
            function isNumberLike(e) {
                if (e.kind == pxtc.SK.NullKeyword) {
                    var vo = pxtInfo(e).valueOverride;
                    if (vo != null) {
                        if (vo.exprKind == EK.NumberLiteral) {
                            if (opts.target.isNative)
                                return !!(vo.data & 1);
                            return true;
                        }
                        else if (vo.exprKind == EK.RuntimeCall && vo.data == "pxt::ptrOfLiteral") {
                            if (vo.args[0].exprKind == EK.PointerLiteral &&
                                !isNaN(parseFloat(vo.args[0].jsInfo)))
                                return true;
                            return false;
                        }
                        else if (vo.exprKind == EK.PointerLiteral &&
                            !isNaN(parseFloat(vo.jsInfo))) {
                            return true;
                        }
                        else
                            return false;
                    }
                }
                if (e.kind == pxtc.SK.NumericLiteral)
                    return true;
                return isNumberLikeType(typeOf(e));
            }
            function rtcallMaskDirect(name, args) {
                return pxtc.ir.rtcallMask(name, (1 << args.length) - 1, 0 /* Plain */, args);
            }
            function rtcallMask(name, args, attrs, append) {
                if (append === void 0) { append = null; }
                var fmt = [];
                var inf = pxtc.hex.lookupFunc(name);
                if (isThumb()) {
                    var inf2 = pxtc.U.lookup(thumbFuns, name);
                    if (inf2) {
                        inf = inf2;
                        name = inf2.name;
                    }
                }
                if (inf)
                    fmt = inf.argsFmt;
                if (append)
                    args = args.concat(append);
                var mask = getMask(args);
                var convInfos = [];
                var args2 = args.map(function (a, i) {
                    var r = emitExpr(a);
                    if (!needsNumberConversions())
                        return r;
                    var f = fmt[i + 1];
                    var isNumber = isNumberLike(a);
                    if (!f && name.indexOf("::") < 0) {
                        // for assembly functions, make up the format string - pass numbers as ints and everything else as is
                        f = isNumber ? "I" : "_";
                    }
                    if (!f) {
                        throw pxtc.U.userError("not enough args for " + name);
                    }
                    else if (f[0] == "_" || f == "T" || f == "N") {
                        var t = getRefTagToValidate(f);
                        if (t) {
                            convInfos.push({
                                argIdx: i,
                                method: "_validate",
                                refTag: t,
                                refTagNullable: !!attrs.argsNullable
                            });
                        }
                        return r;
                    }
                    else if (f == "I") {
                        //toInt can handle non-number values as well
                        //if (!isNumber)
                        //    U.userError("argsFmt=...I... but argument not a number in " + name)
                        if (r.exprKind == EK.NumberLiteral && typeof r.data == "number") {
                            return pxtc.ir.numlit(r.data >> 1);
                        }
                        // mask &= ~(1 << i)
                        convInfos.push({
                            argIdx: i,
                            method: "pxt::toInt"
                        });
                        return r;
                    }
                    else if (f == "B") {
                        mask &= ~(1 << i);
                        return emitCondition(a, r);
                    }
                    else if (f == "S") {
                        if (!r.isStringLiteral) {
                            convInfos.push({
                                argIdx: i,
                                method: "_pxt_stringConv",
                                returnsRef: true
                            });
                            // set the mask - the result of conversion is a ref
                            mask |= (1 << i);
                        }
                        return r;
                    }
                    else if (f == "F" || f == "D") {
                        if (f == "D")
                            pxtc.U.oops("double arguments not yet supported"); // take two words
                        // TODO disable F on devices with FPU and hard ABI; or maybe altogether
                        // or else, think about using the VFP registers
                        if (!isNumber)
                            pxtc.U.userError("argsFmt=...F/D... but argument not a number in " + name);
                        // mask &= ~(1 << i)
                        convInfos.push({ argIdx: i, method: f == "D" ? "pxt::toDouble" : "pxt::toFloat" });
                        return r;
                    }
                    else {
                        throw pxtc.U.oops("invalid format specifier: " + f);
                    }
                });
                var r = pxtc.ir.rtcallMask(name, mask, attrs ? attrs.callingConvention : 0 /* Plain */, args2);
                if (!r.mask)
                    r.mask = { refMask: 0 };
                r.mask.conversions = convInfos;
                if (opts.target.isNative) {
                    var f0 = fmt[0];
                    if (f0 == "I")
                        r = fromInt(r);
                    else if (f0 == "B")
                        r = fromBool(r);
                    else if (f0 == "F")
                        r = fromFloat(r);
                    else if (f0 == "D") {
                        pxtc.U.oops("double returns not yet supported"); // take two words
                        r = fromDouble(r);
                    }
                }
                return r;
            }
            function emitInJmpValue(expr) {
                var lbl = proc.mkLabel("ldjmp");
                proc.emitJmp(lbl, expr, pxtc.ir.JmpMode.Always);
                proc.emitLbl(lbl);
            }
            function emitInstanceOfExpression(node) {
                var tp = typeOf(node.right);
                var classDecl = isPossiblyGenericClassType(tp) ? getDecl(node.right) : null;
                if (!classDecl || classDecl.kind != pxtc.SK.ClassDeclaration) {
                    userError(9275, lf("unsupported instanceof expression"));
                }
                var info = getClassInfo(tp, classDecl);
                markVTableUsed(info);
                var r = pxtc.ir.op(pxtc.ir.EK.InstanceOf, [emitExpr(node.left)], info);
                r.jsInfo = "bool";
                return r;
            }
            function emitLazyBinaryExpression(node) {
                var left = emitExpr(node.left);
                var isString = isStringType(typeOf(node.left));
                var lbl = proc.mkLabel("lazy");
                left = pxtc.ir.shared(left);
                var cond = pxtc.ir.rtcall("numops::toBool", [left]);
                var lblSkip = proc.mkLabel("lazySkip");
                var mode = node.operatorToken.kind == pxtc.SK.BarBarToken ? pxtc.ir.JmpMode.IfZero :
                    node.operatorToken.kind == pxtc.SK.AmpersandAmpersandToken ? pxtc.ir.JmpMode.IfNotZero :
                        pxtc.U.oops();
                proc.emitJmp(lblSkip, cond, mode);
                proc.emitJmp(lbl, left, pxtc.ir.JmpMode.Always, left);
                proc.emitLbl(lblSkip);
                proc.emitExpr(rtcallMaskDirect("langsupp::ignore", [left]));
                proc.emitJmp(lbl, emitExpr(node.right), pxtc.ir.JmpMode.Always);
                proc.emitLbl(lbl);
                return captureJmpValue();
            }
            function stripEquals(k) {
                switch (k) {
                    case pxtc.SK.PlusEqualsToken: return pxtc.SK.PlusToken;
                    case pxtc.SK.MinusEqualsToken: return pxtc.SK.MinusToken;
                    case pxtc.SK.AsteriskEqualsToken: return pxtc.SK.AsteriskToken;
                    case pxtc.SK.AsteriskAsteriskEqualsToken: return pxtc.SK.AsteriskAsteriskToken;
                    case pxtc.SK.SlashEqualsToken: return pxtc.SK.SlashToken;
                    case pxtc.SK.PercentEqualsToken: return pxtc.SK.PercentToken;
                    case pxtc.SK.LessThanLessThanEqualsToken: return pxtc.SK.LessThanLessThanToken;
                    case pxtc.SK.GreaterThanGreaterThanEqualsToken: return pxtc.SK.GreaterThanGreaterThanToken;
                    case pxtc.SK.GreaterThanGreaterThanGreaterThanEqualsToken: return pxtc.SK.GreaterThanGreaterThanGreaterThanToken;
                    case pxtc.SK.AmpersandEqualsToken: return pxtc.SK.AmpersandToken;
                    case pxtc.SK.BarEqualsToken: return pxtc.SK.BarToken;
                    case pxtc.SK.CaretEqualsToken: return pxtc.SK.CaretToken;
                    default: return pxtc.SK.Unknown;
                }
            }
            function emitBrk(node) {
                bin.numStmts++;
                if (!opts.breakpoints)
                    return;
                var src = ts.getSourceFileOfNode(node);
                if (opts.justMyCode && isInPxtModules(src))
                    return;
                var pos = node.pos;
                while (/^\s$/.exec(src.text[pos]))
                    pos++;
                var p = ts.getLineAndCharacterOfPosition(src, pos);
                var e = ts.getLineAndCharacterOfPosition(src, node.end);
                var brk = {
                    id: res.breakpoints.length,
                    isDebuggerStmt: node.kind == pxtc.SK.DebuggerStatement,
                    fileName: src.fileName,
                    start: pos,
                    length: node.end - pos,
                    line: p.line,
                    endLine: e.line,
                    column: p.character,
                    endColumn: e.character,
                };
                res.breakpoints.push(brk);
                var st = pxtc.ir.stmt(pxtc.ir.SK.Breakpoint, null);
                st.breakpointInfo = brk;
                proc.emit(st);
            }
            function simpleInstruction(node, k) {
                switch (k) {
                    case pxtc.SK.PlusToken: return "numops::adds";
                    case pxtc.SK.MinusToken: return "numops::subs";
                    // we could expose __aeabi_idiv directly...
                    case pxtc.SK.SlashToken: {
                        if (opts.warnDiv)
                            warning(node, 9274, "usage of / operator");
                        return "numops::div";
                    }
                    case pxtc.SK.PercentToken: return "numops::mod";
                    case pxtc.SK.AsteriskToken: return "numops::muls";
                    case pxtc.SK.AsteriskAsteriskToken: return "Math_::pow";
                    case pxtc.SK.AmpersandToken: return "numops::ands";
                    case pxtc.SK.BarToken: return "numops::orrs";
                    case pxtc.SK.CaretToken: return "numops::eors";
                    case pxtc.SK.LessThanLessThanToken: return "numops::lsls";
                    case pxtc.SK.GreaterThanGreaterThanToken: return "numops::asrs";
                    case pxtc.SK.GreaterThanGreaterThanGreaterThanToken: return "numops::lsrs";
                    case pxtc.SK.LessThanEqualsToken: return "numops::le";
                    case pxtc.SK.LessThanToken: return "numops::lt";
                    case pxtc.SK.GreaterThanEqualsToken: return "numops::ge";
                    case pxtc.SK.GreaterThanToken: return "numops::gt";
                    case pxtc.SK.EqualsEqualsToken: return "numops::eq";
                    case pxtc.SK.EqualsEqualsEqualsToken: return "numops::eqq";
                    case pxtc.SK.ExclamationEqualsEqualsToken: return "numops::neqq";
                    case pxtc.SK.ExclamationEqualsToken: return "numops::neq";
                    default: return null;
                }
            }
            function emitBinaryExpression(node) {
                if (node.operatorToken.kind == pxtc.SK.EqualsToken) {
                    return handleAssignment(node);
                }
                var folded = constantFold(node);
                if (folded)
                    return emitLit(folded.val);
                var lt = null;
                var rt = null;
                if (node.operatorToken.kind == pxtc.SK.PlusToken || node.operatorToken.kind == pxtc.SK.PlusEqualsToken) {
                    lt = typeOf(node.left);
                    rt = typeOf(node.right);
                    if (isStringType(lt) || (isStringType(rt) && node.operatorToken.kind == pxtc.SK.PlusToken)) {
                        pxtInfo(node).exprInfo = {
                            leftType: checker.typeToString(lt),
                            rightType: checker.typeToString(rt)
                        };
                    }
                }
                var shim = function (n) {
                    n = mapIntOpName(n);
                    var args = [node.left, node.right];
                    return pxtc.ir.rtcallMask(n, getMask(args), 0 /* Plain */, args.map(function (x) { return emitExpr(x); }));
                };
                if (node.operatorToken.kind == pxtc.SK.CommaToken) {
                    if (isNoopExpr(node.left))
                        return emitExpr(node.right);
                    else {
                        var v = emitIgnored(node.left);
                        return pxtc.ir.op(EK.Sequence, [v, emitExpr(node.right)]);
                    }
                }
                switch (node.operatorToken.kind) {
                    case pxtc.SK.BarBarToken:
                    case pxtc.SK.AmpersandAmpersandToken:
                        return emitLazyBinaryExpression(node);
                    case pxtc.SK.InstanceOfKeyword:
                        return emitInstanceOfExpression(node);
                }
                if (node.operatorToken.kind == pxtc.SK.PlusToken) {
                    if (isStringType(lt) || isStringType(rt)) {
                        return rtcallMask("String_::concat", [asString(node.left), asString(node.right)], null);
                    }
                }
                if (node.operatorToken.kind == pxtc.SK.PlusEqualsToken && isStringType(lt)) {
                    var cleanup = prepForAssignment(node.left);
                    var post = pxtc.ir.shared(rtcallMask("String_::concat", [asString(node.left), asString(node.right)], null));
                    emitStore(node.left, irToNode(post));
                    cleanup();
                    return post;
                }
                // fallback to numeric operation if none of the argument is string and some are numbers
                var noEq = stripEquals(node.operatorToken.kind);
                var shimName = simpleInstruction(node, noEq || node.operatorToken.kind);
                if (!shimName)
                    unhandled(node.operatorToken, lf("unsupported operator"), 9250);
                if (noEq)
                    return emitIncrement(node.left, shimName, false, node.right);
                return shim(shimName);
            }
            function emitConditionalExpression(node) {
                var els = proc.mkLabel("condexprz");
                var fin = proc.mkLabel("condexprfin");
                proc.emitJmp(els, emitCondition(node.condition), pxtc.ir.JmpMode.IfZero);
                proc.emitJmp(fin, emitExpr(node.whenTrue), pxtc.ir.JmpMode.Always);
                proc.emitLbl(els);
                proc.emitJmp(fin, emitExpr(node.whenFalse), pxtc.ir.JmpMode.Always);
                proc.emitLbl(fin);
                return captureJmpValue();
            }
            function emitSpreadElementExpression(node) { }
            function emitYieldExpression(node) { }
            function emitBlock(node) {
                node.statements.forEach(emit);
            }
            function checkForLetOrConst(declList) {
                if ((declList.flags & ts.NodeFlags.Let) || (declList.flags & ts.NodeFlags.Const)) {
                    return true;
                }
                throw userError(9260, lf("variable needs to be defined using 'let' instead of 'var'"));
            }
            function emitVariableStatement(node) {
                function addConfigEntry(ent) {
                    var entry = pxtc.U.lookup(configEntries, ent.name);
                    if (!entry) {
                        entry = ent;
                        configEntries[ent.name] = entry;
                    }
                    if (entry.value != ent.value)
                        throw userError(9269, lf("conflicting values for config.{0}", ent.name));
                }
                if (node.declarationList.flags & ts.NodeFlags.Const) {
                    var parname = node.parent && node.parent.kind == pxtc.SK.ModuleBlock ?
                        getName(node.parent.parent) : "?";
                    if (parname == "config" || parname == "userconfig")
                        for (var _i = 0, _a = node.declarationList.declarations; _i < _a.length; _i++) {
                            var decl = _a[_i];
                            var nm = getDeclName(decl);
                            if (!decl.initializer)
                                continue;
                            var val = emitAsInt(decl.initializer);
                            var key = lookupDalConst(node, "CFG_" + nm);
                            if (key == null || key == 0)
                                throw userError(9268, lf("can't find DAL.CFG_{0}", nm));
                            if (parname == "userconfig")
                                nm = "!" + nm;
                            addConfigEntry({ name: nm, key: key, value: val });
                        }
                }
                if (ts.isInAmbientContext(node))
                    return;
                checkForLetOrConst(node.declarationList);
                node.declarationList.declarations.forEach(emit);
            }
            function emitExpressionStatement(node) {
                emitExprAsStmt(node.expression);
            }
            function emitCondition(expr, inner) {
                if (inner === void 0) { inner = null; }
                if (!inner && isThumb() && expr.kind == pxtc.SK.BinaryExpression) {
                    var be = expr;
                    var mapped = pxtc.U.lookup(pxtc.thumbCmpMap, simpleInstruction(be, be.operatorToken.kind));
                    if (mapped) {
                        return pxtc.ir.rtcall(mapped, [emitExpr(be.left), emitExpr(be.right)]);
                    }
                }
                if (!inner)
                    inner = emitExpr(expr);
                if (isStackMachine())
                    return inner;
                return pxtc.ir.rtcall("numops::toBoolDecr", [inner]);
            }
            function emitIfStatement(node) {
                emitBrk(node);
                var elseLbl = proc.mkLabel("else");
                proc.emitJmpZ(elseLbl, emitCondition(node.expression));
                emit(node.thenStatement);
                var afterAll = proc.mkLabel("afterif");
                proc.emitJmp(afterAll);
                proc.emitLbl(elseLbl);
                if (node.elseStatement)
                    emit(node.elseStatement);
                proc.emitLbl(afterAll);
            }
            function getLabels(stmt) {
                var id = getNodeId(stmt);
                return {
                    fortop: ".fortop." + id,
                    cont: ".cont." + id,
                    brk: ".brk." + id,
                    ret: ".ret." + id
                };
            }
            function emitDoStatement(node) {
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.cont);
                emit(node.statement);
                emitBrk(node.expression);
                proc.emitJmpZ(l.brk, emitCondition(node.expression));
                proc.emitJmp(l.cont);
                proc.emitLblDirect(l.brk);
            }
            function emitWhileStatement(node) {
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.cont);
                emitBrk(node.expression);
                proc.emitJmpZ(l.brk, emitCondition(node.expression));
                emit(node.statement);
                proc.emitJmp(l.cont);
                proc.emitLblDirect(l.brk);
            }
            function isNoopExpr(node) {
                if (!node)
                    return true;
                switch (node.kind) {
                    case pxtc.SK.Identifier:
                    case pxtc.SK.StringLiteral:
                    case pxtc.SK.NumericLiteral:
                    case pxtc.SK.NullKeyword:
                        return true; // no-op
                }
                return false;
            }
            function emitIgnored(node) {
                var v = emitExpr(node);
                return v;
            }
            function emitExprAsStmt(node) {
                if (isNoopExpr(node))
                    return;
                emitBrk(node);
                var v = emitIgnored(node);
                proc.emitExpr(v);
                proc.stackEmpty();
            }
            function emitForStatement(node) {
                if (node.initializer && node.initializer.kind == pxtc.SK.VariableDeclarationList) {
                    checkForLetOrConst(node.initializer);
                    node.initializer.declarations.forEach(emit);
                }
                else {
                    emitExprAsStmt(node.initializer);
                }
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.fortop);
                if (node.condition) {
                    emitBrk(node.condition);
                    proc.emitJmpZ(l.brk, emitCondition(node.condition));
                }
                emit(node.statement);
                proc.emitLblDirect(l.cont);
                emitExprAsStmt(node.incrementor);
                proc.emitJmp(l.fortop);
                proc.emitLblDirect(l.brk);
            }
            function emitForOfStatement(node) {
                if (!(node.initializer && node.initializer.kind == pxtc.SK.VariableDeclarationList)) {
                    unhandled(node, "only a single variable may be used to iterate a collection");
                    return;
                }
                var declList = node.initializer;
                if (declList.declarations.length != 1) {
                    unhandled(node, "only a single variable may be used to iterate a collection");
                    return;
                }
                checkForLetOrConst(declList);
                //Typecheck the expression being iterated over
                var t = typeOf(node.expression);
                var indexer = "";
                var length = "";
                if (isStringType(t)) {
                    indexer = "String_::charAt";
                    length = "String_::length";
                }
                else if (isArrayType(t)) {
                    indexer = "Array_::getAt";
                    length = "Array_::length";
                }
                else {
                    unhandled(node.expression, "cannot use for...of with this expression");
                    return;
                }
                //As the iterator isn't declared in the usual fashion we must mark it as used, otherwise no cell will be allocated for it
                markUsed(declList.declarations[0]);
                var iterVar = emitVariableDeclaration(declList.declarations[0]); // c
                pxtc.U.assert(!!iterVar || !bin.finalPass);
                //Start with undefined
                if (iterVar) {
                    proc.emitExpr(iterVar.storeByRef(emitLit(undefined)));
                    recordUse(declList.declarations[0], true);
                }
                proc.stackEmpty();
                // Store the expression (it could be a string literal, for example) for the collection being iterated over
                // Note that it's alaways a ref-counted type
                var collectionVar = proc.mkLocalUnnamed(); // a
                proc.emitExpr(collectionVar.storeByRef(emitExpr(node.expression)));
                // Declaration of iterating variable
                var intVarIter = proc.mkLocalUnnamed(); // i
                proc.emitExpr(intVarIter.storeByRef(emitLit(0)));
                proc.stackEmpty();
                flushHoistedFunctionDefinitions();
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.fortop);
                // i < a.length()
                // we use loadCore() on collection variable so that it doesn't get incr()ed
                // we could have used load() and rtcallMask to be more regular
                var len = pxtc.ir.rtcall(length, [collectionVar.loadCore()]);
                var cmp = emitIntOp("numops::lt_bool", intVarIter.load(), fromInt(len));
                proc.emitJmpZ(l.brk, cmp);
                // TODO this should be changed to use standard indexer lookup and int handling
                var toInt = function (e) {
                    return needsNumberConversions() ? pxtc.ir.rtcall("pxt::toInt", [e]) : e;
                };
                // c = a[i]
                if (iterVar)
                    proc.emitExpr(iterVar.storeByRef(pxtc.ir.rtcall(indexer, [collectionVar.loadCore(), toInt(intVarIter.loadCore())])));
                emit(node.statement);
                proc.emitLblDirect(l.cont);
                // i = i + 1
                proc.emitExpr(intVarIter.storeByRef(emitIntOp("numops::adds", intVarIter.load(), emitLit(1))));
                proc.emitJmp(l.fortop);
                proc.emitLblDirect(l.brk);
                proc.emitExpr(collectionVar.storeByRef(emitLit(undefined))); // clear it, so it gets GCed
            }
            function emitForInOrForOfStatement(node) { }
            function emitBreakOrContinueStatement(node) {
                emitBrk(node);
                var label = node.label ? node.label.text : null;
                var isBreak = node.kind == pxtc.SK.BreakStatement;
                function findOuter(parent) {
                    if (!parent)
                        return null;
                    if (label && parent.kind == pxtc.SK.LabeledStatement &&
                        parent.label.text == label)
                        return parent.statement;
                    if (parent.kind == pxtc.SK.SwitchStatement && !label && isBreak)
                        return parent;
                    if (!label && ts.isIterationStatement(parent, false))
                        return parent;
                    return findOuter(parent.parent);
                }
                var stmt = findOuter(node);
                if (!stmt)
                    error(node, 9230, lf("cannot find outer loop"));
                else {
                    var l = getLabels(stmt);
                    if (node.kind == pxtc.SK.ContinueStatement) {
                        if (!ts.isIterationStatement(stmt, false))
                            error(node, 9231, lf("continue on non-loop"));
                        else
                            proc.emitJmp(l.cont);
                    }
                    else if (node.kind == pxtc.SK.BreakStatement) {
                        proc.emitJmp(l.brk);
                    }
                    else {
                        pxtc.oops();
                    }
                }
            }
            function emitReturnStatement(node) {
                emitBrk(node);
                var v = null;
                if (node.expression) {
                    v = emitExpr(node.expression);
                }
                else if (funcHasReturn(proc.action)) {
                    v = emitLit(undefined); // == return undefined
                }
                proc.emitJmp(getLabels(proc.action).ret, v, pxtc.ir.JmpMode.Always);
            }
            function emitWithStatement(node) { }
            function emitSwitchStatement(node) {
                emitBrk(node);
                var l = getLabels(node);
                var defaultLabel;
                var expr = pxtc.ir.shared(emitExpr(node.expression));
                var lbls = node.caseBlock.clauses.map(function (cl) {
                    var lbl = proc.mkLabel("switch");
                    if (cl.kind == pxtc.SK.CaseClause) {
                        var cc = cl;
                        var cmpExpr = emitExpr(cc.expression);
                        var mask = isRefCountedExpr(cc.expression) ? 1 : 0;
                        // we assume the value we're switching over will stay alive
                        // so, the mask only applies to the case expression if needed
                        // switch_eq() will decr(expr) if result is true
                        var cmpCall = pxtc.ir.rtcallMask(mapIntOpName("pxt::switch_eq"), mask, 0 /* Plain */, [cmpExpr, expr]);
                        proc.emitJmp(lbl, cmpCall, pxtc.ir.JmpMode.IfNotZero, expr);
                    }
                    else if (cl.kind == pxtc.SK.DefaultClause) {
                        // Save default label for emit at the end of the
                        // tests section. Default label doesn't have to come at the
                        // end in JS.
                        pxtc.assert(!defaultLabel, "!defaultLabel");
                        defaultLabel = lbl;
                    }
                    else {
                        pxtc.oops();
                    }
                    return lbl;
                });
                if (defaultLabel)
                    proc.emitJmp(defaultLabel, expr);
                else
                    proc.emitJmp(l.brk, expr);
                node.caseBlock.clauses.forEach(function (cl, i) {
                    proc.emitLbl(lbls[i]);
                    cl.statements.forEach(emit);
                });
                proc.emitLblDirect(l.brk);
            }
            function emitCaseOrDefaultClause(node) { }
            function emitLabeledStatement(node) {
                var l = getLabels(node.statement);
                emit(node.statement);
                proc.emitLblDirect(l.brk);
            }
            function emitThrowStatement(node) {
                emitBrk(node);
                proc.emitExpr(rtcallMaskDirect("pxt::throwValue", [emitExpr(node.expression)]));
            }
            function emitTryStatement(node) {
                var beginTry = function (lbl) {
                    return rtcallMaskDirect("pxt::beginTry", [pxtc.ir.ptrlit(lbl.lblName, lbl)]);
                };
                emitBrk(node);
                var lcatch = proc.mkLabel("catch");
                lcatch.lblName = "_catch_" + getNodeId(node);
                var lfinally = proc.mkLabel("finally");
                lfinally.lblName = "_finally_" + getNodeId(node);
                if (node.finallyBlock)
                    proc.emitExpr(beginTry(lfinally));
                if (node.catchClause)
                    proc.emitExpr(beginTry(lcatch));
                proc.stackEmpty();
                emitBlock(node.tryBlock);
                proc.stackEmpty();
                if (node.catchClause) {
                    var skip = proc.mkLabel("catchend");
                    proc.emitExpr(rtcallMaskDirect("pxt::endTry", []));
                    proc.emitJmp(skip);
                    proc.emitLbl(lcatch);
                    var decl = node.catchClause.variableDeclaration;
                    if (decl) {
                        emitVariableDeclaration(decl);
                        var loc = lookupCell(decl);
                        proc.emitExpr(loc.storeByRef(rtcallMaskDirect("pxt::getThrownValue", [])));
                    }
                    flushHoistedFunctionDefinitions();
                    emitBlock(node.catchClause.block);
                    proc.emitLbl(skip);
                }
                if (node.finallyBlock) {
                    proc.emitExpr(rtcallMaskDirect("pxt::endTry", []));
                    proc.emitLbl(lfinally);
                    emitBlock(node.finallyBlock);
                    proc.emitExpr(rtcallMaskDirect("pxt::endFinally", []));
                }
            }
            function emitCatchClause(node) { }
            function emitDebuggerStatement(node) {
                emitBrk(node);
            }
            function isLoop(node) {
                switch (node.kind) {
                    case pxtc.SK.WhileStatement:
                    case pxtc.SK.ForInStatement:
                    case pxtc.SK.ForOfStatement:
                    case pxtc.SK.ForStatement:
                    case pxtc.SK.DoStatement:
                        return true;
                    default:
                        return false;
                }
            }
            function inLoop(node) {
                while (node) {
                    if (isLoop(node))
                        return true;
                    node = node.parent;
                }
                return false;
            }
            function emitVarOrParam(node, bindingExpr, bindingType) {
                if (node.name.kind === pxtc.SK.ObjectBindingPattern || node.name.kind == pxtc.SK.ArrayBindingPattern) {
                    if (!bindingExpr) {
                        bindingExpr = node.initializer ? pxtc.ir.shared(emitExpr(node.initializer)) :
                            emitLocalLoad(node);
                        bindingType = node.initializer ? typeOf(node.initializer) : typeOf(node);
                    }
                    node.name.elements.forEach(function (e) { return emitVarOrParam(e, bindingExpr, bindingType); });
                    proc.stackEmpty(); // stack empty only after all assigned
                    return null;
                }
                if (!shouldEmitNow(node)) {
                    return null;
                }
                // skip emit of things, where access to them is emitted as literal
                if (constantFoldDecl(node))
                    return null;
                var loc;
                if (isGlobalVar(node)) {
                    emitGlobal(node);
                    loc = lookupCell(node);
                }
                else {
                    loc = proc.mkLocal(node, getVarInfo(node));
                }
                markVariableDefinition(loc.info);
                if (loc.isByRefLocal()) {
                    proc.emitExpr(loc.storeDirect(pxtc.ir.rtcall("pxtrt::mklocRef", [])));
                }
                typeCheckVar(typeOf(node));
                if (node.kind === pxtc.SK.BindingElement) {
                    emitBrk(node);
                    var _a = bindingElementAccessExpression(node, bindingExpr, bindingType), expr = _a[0], tp = _a[1];
                    proc.emitExpr(loc.storeByRef(expr));
                }
                else if (node.initializer) {
                    emitBrk(node);
                    if (isGlobalVar(node)) {
                        var attrs = parseComments(node);
                        var jrname = attrs.jres;
                        if (jrname) {
                            if (jrname == "true") {
                                jrname = getNodeFullName(checker, node);
                            }
                            var jr = pxtc.U.lookup(opts.jres || {}, jrname);
                            if (!jr)
                                userError(9270, lf("resource '{0}' not found in any .jres file", jrname));
                            else {
                                currJres = jr;
                            }
                        }
                    }
                    typeCheckSubtoSup(node.initializer, node);
                    proc.emitExpr(loc.storeByRef(emitExpr(node.initializer)));
                    currJres = null;
                    proc.stackEmpty();
                }
                else if (inLoop(node)) {
                    // the variable is declared in a loop - we need to clear it on each iteration
                    emitBrk(node);
                    proc.emitExpr(loc.storeByRef(emitLit(undefined)));
                    proc.stackEmpty();
                }
                return loc;
            }
            function emitVariableDeclaration(node) {
                return emitVarOrParam(node, null, null);
            }
            function emitFieldAccess(node, objRef, objType, fieldName) {
                var fieldSym = checker.getPropertyOfType(objType, fieldName);
                pxtc.U.assert(!!fieldSym, "field sym");
                var myType = checker.getTypeOfSymbolAtLocation(fieldSym, node);
                var res;
                if (isPossiblyGenericClassType(objType)) {
                    var info = getClassInfo(objType);
                    res = pxtc.ir.op(EK.FieldAccess, [objRef], fieldIndexCore(info, getFieldInfo(info, fieldName)));
                }
                else {
                    res = mkMethodCall(null, null, getIfaceMemberId(fieldName, true), [objRef]);
                    res.data.mapMethod = "pxtrt::mapGet";
                }
                return [res, myType];
            }
            function bindingElementAccessExpression(bindingElement, parentAccess, parentType) {
                var target = bindingElement.parent.parent;
                if (target.kind === pxtc.SK.BindingElement) {
                    var parent_4 = bindingElementAccessExpression(target, parentAccess, parentType);
                    parentAccess = parent_4[0];
                    parentType = parent_4[1];
                }
                if (bindingElement.parent.kind == pxtc.SK.ArrayBindingPattern) {
                    var idx = bindingElement.parent.elements.indexOf(bindingElement);
                    if (bindingElement.dotDotDotToken)
                        userError(9203, lf("spread operator not supported yet"));
                    var myType = arrayElementType(parentType, idx);
                    return [
                        rtcallMaskDirect("Array_::getAt", [parentAccess, pxtc.ir.numlit(idx)]),
                        myType
                    ];
                }
                else {
                    var propertyName = (bindingElement.propertyName || bindingElement.name);
                    return emitFieldAccess(bindingElement, parentAccess, parentType, propertyName.text);
                }
            }
            function emitClassDeclaration(node) {
                var info = getClassInfo(null, node);
                if (info.isUsed && bin.usedClassInfos.indexOf(info) < 0)
                    bin.usedClassInfos.push(info);
                node.members.forEach(emit);
            }
            function emitInterfaceDeclaration(node) {
                checkInterfaceDeclaration(bin, node);
                var attrs = parseComments(node);
                if (attrs.autoCreate)
                    autoCreateFunctions[attrs.autoCreate] = true;
            }
            function emitEnumDeclaration(node) {
                //No code needs to be generated, enum names are replaced by constant values in generated code
            }
            function emitEnumMember(node) { }
            function emitModuleDeclaration(node) {
                emit(node.body);
            }
            function emitImportDeclaration(node) { }
            function emitImportEqualsDeclaration(node) { }
            function emitExportDeclaration(node) { }
            function emitExportAssignment(node) { }
            function emitSourceFileNode(node) {
                node.statements.forEach(emit);
            }
            function catchErrors(node, f) {
                var prevErr = lastSecondaryError;
                inCatchErrors++;
                try {
                    lastSecondaryError = null;
                    var res_4 = f(node);
                    if (lastSecondaryError)
                        userError(lastSecondaryErrorCode, lastSecondaryError);
                    lastSecondaryError = prevErr;
                    inCatchErrors--;
                    return res_4;
                }
                catch (e) {
                    inCatchErrors--;
                    lastSecondaryError = null;
                    // if (!e.ksEmitterUserError)
                    var code = e.ksErrorCode || 9200;
                    error(node, code, e.message);
                    pxt.debug(e.stack);
                    return null;
                }
            }
            function emitExpr(node0, useCache) {
                if (useCache === void 0) { useCache = true; }
                var node = node0;
                if (useCache && node.cachedIR) {
                    return node.cachedIR;
                }
                var res = catchErrors(node, emitExprInner) || emitLit(undefined);
                if (useCache && node.needsIRCache) {
                    node.cachedIR = pxtc.ir.shared(res);
                    return node.cachedIR;
                }
                return res;
            }
            function emitExprInner(node) {
                var expr = emitExprCore(node);
                if (expr.isExpr())
                    return expr;
                throw new Error("expecting expression");
            }
            function emitTopLevel(node) {
                var pinfo = pxtInfo(node);
                if (pinfo.usedNodes) {
                    needsUsingInfo = false;
                    for (var _i = 0, _a = pxtc.U.values(pinfo.usedNodes); _i < _a.length; _i++) {
                        var node_1 = _a[_i];
                        markUsed(node_1);
                    }
                    for (var _b = 0, _c = pinfo.usedActions; _b < _c.length; _b++) {
                        var fn = _c[_b];
                        fn(bin);
                    }
                    needsUsingInfo = true;
                }
                else if (isGlobalVar(node) || ts.isClassDeclaration(node)) {
                    needsUsingInfo = false;
                    currUsingContext = pinfo;
                    currUsingContext.usedNodes = null;
                    currUsingContext.usedActions = null;
                    if (isGlobalVar(node) && !constantFoldDecl(node))
                        emitGlobal(node);
                    emit(node);
                    needsUsingInfo = true;
                }
                else {
                    currUsingContext = pinfo;
                    currUsingContext.usedNodes = {};
                    currUsingContext.usedActions = [];
                    emit(node);
                    currUsingContext = null;
                }
            }
            function emit(node) {
                catchErrors(node, emitNodeCore);
            }
            function emitNodeCore(node) {
                switch (node.kind) {
                    case pxtc.SK.SourceFile:
                        return emitSourceFileNode(node);
                    case pxtc.SK.InterfaceDeclaration:
                        return emitInterfaceDeclaration(node);
                    case pxtc.SK.VariableStatement:
                        return emitVariableStatement(node);
                    case pxtc.SK.ModuleDeclaration:
                        return emitModuleDeclaration(node);
                    case pxtc.SK.EnumDeclaration:
                        return emitEnumDeclaration(node);
                    //case SyntaxKind.MethodSignature:
                    case pxtc.SK.FunctionDeclaration:
                    case pxtc.SK.Constructor:
                    case pxtc.SK.MethodDeclaration:
                        emitFunctionDeclaration(node);
                        return;
                    case pxtc.SK.ExpressionStatement:
                        return emitExpressionStatement(node);
                    case pxtc.SK.Block:
                    case pxtc.SK.ModuleBlock:
                        return emitBlock(node);
                    case pxtc.SK.VariableDeclaration:
                        emitVariableDeclaration(node);
                        flushHoistedFunctionDefinitions();
                        return;
                    case pxtc.SK.IfStatement:
                        return emitIfStatement(node);
                    case pxtc.SK.WhileStatement:
                        return emitWhileStatement(node);
                    case pxtc.SK.DoStatement:
                        return emitDoStatement(node);
                    case pxtc.SK.ForStatement:
                        return emitForStatement(node);
                    case pxtc.SK.ForOfStatement:
                        return emitForOfStatement(node);
                    case pxtc.SK.ContinueStatement:
                    case pxtc.SK.BreakStatement:
                        return emitBreakOrContinueStatement(node);
                    case pxtc.SK.LabeledStatement:
                        return emitLabeledStatement(node);
                    case pxtc.SK.ReturnStatement:
                        return emitReturnStatement(node);
                    case pxtc.SK.ClassDeclaration:
                        return emitClassDeclaration(node);
                    case pxtc.SK.PropertyDeclaration:
                    case pxtc.SK.PropertyAssignment:
                        return emitPropertyAssignment(node);
                    case pxtc.SK.SwitchStatement:
                        return emitSwitchStatement(node);
                    case pxtc.SK.TypeAliasDeclaration:
                        // skip
                        return;
                    case ts.SyntaxKind.TryStatement:
                        return emitTryStatement(node);
                    case ts.SyntaxKind.ThrowStatement:
                        return emitThrowStatement(node);
                    case pxtc.SK.DebuggerStatement:
                        return emitDebuggerStatement(node);
                    case pxtc.SK.GetAccessor:
                    case pxtc.SK.SetAccessor:
                        return emitAccessor(node);
                    case pxtc.SK.ImportEqualsDeclaration:
                        // this doesn't do anything in compiled code
                        return emitImportEqualsDeclaration(node);
                    case pxtc.SK.EmptyStatement:
                        return;
                    case pxtc.SK.SemicolonClassElement:
                        return;
                    default:
                        unhandled(node);
                }
            }
            function emitExprCore(node) {
                switch (node.kind) {
                    case pxtc.SK.NullKeyword:
                        var v = pxtInfo(node).valueOverride;
                        if (v)
                            return v;
                        return emitLit(null);
                    case pxtc.SK.TrueKeyword:
                        return emitLit(true);
                    case pxtc.SK.FalseKeyword:
                        return emitLit(false);
                    case pxtc.SK.TemplateHead:
                    case pxtc.SK.TemplateMiddle:
                    case pxtc.SK.TemplateTail:
                    case pxtc.SK.NumericLiteral:
                    case pxtc.SK.StringLiteral:
                    case pxtc.SK.NoSubstitutionTemplateLiteral:
                        //case SyntaxKind.RegularExpressionLiteral:
                        return emitLiteral(node);
                    case pxtc.SK.TaggedTemplateExpression:
                        return emitTaggedTemplateExpression(node);
                    case pxtc.SK.PropertyAccessExpression:
                        return emitPropertyAccess(node);
                    case pxtc.SK.BinaryExpression:
                        return emitBinaryExpression(node);
                    case pxtc.SK.PrefixUnaryExpression:
                        return emitPrefixUnaryExpression(node);
                    case pxtc.SK.PostfixUnaryExpression:
                        return emitPostfixUnaryExpression(node);
                    case pxtc.SK.ElementAccessExpression:
                        return emitIndexedAccess(node);
                    case pxtc.SK.ParenthesizedExpression:
                        return emitParenExpression(node);
                    case pxtc.SK.TypeAssertionExpression:
                        return emitTypeAssertion(node);
                    case pxtc.SK.ArrayLiteralExpression:
                        return emitArrayLiteral(node);
                    case pxtc.SK.NewExpression:
                        return emitNewExpression(node);
                    case pxtc.SK.SuperKeyword:
                    case pxtc.SK.ThisKeyword:
                        return emitThis(node);
                    case pxtc.SK.CallExpression:
                        return emitCallExpression(node);
                    case pxtc.SK.FunctionExpression:
                    case pxtc.SK.ArrowFunction:
                        return emitFunctionDeclaration(node);
                    case pxtc.SK.Identifier:
                        return emitIdentifier(node);
                    case pxtc.SK.ConditionalExpression:
                        return emitConditionalExpression(node);
                    case pxtc.SK.AsExpression:
                        return emitAsExpression(node);
                    case pxtc.SK.TemplateExpression:
                        return emitTemplateExpression(node);
                    case pxtc.SK.ObjectLiteralExpression:
                        return emitObjectLiteral(node);
                    case pxtc.SK.TypeOfExpression:
                        return emitTypeOfExpression(node);
                    case ts.SyntaxKind.DeleteExpression:
                        return emitDeleteExpression(node);
                    default:
                        unhandled(node);
                        return null;
                }
            }
        }
        pxtc.compileBinary = compileBinary;
        function doubleToBits(v) {
            var a = new Float64Array(1);
            a[0] = v;
            return pxtc.U.toHex(new Uint8Array(a.buffer));
        }
        function floatToBits(v) {
            var a = new Float32Array(1);
            a[0] = v;
            return pxtc.U.toHex(new Uint8Array(a.buffer));
        }
        function checkPrimitiveType(t, flags, tp) {
            if (t.flags & flags) {
                return true;
            }
            return checkUnionOfLiterals(t) === tp;
        }
        function isStringType(t) {
            return checkPrimitiveType(t, ts.TypeFlags.String | ts.TypeFlags.StringLiteral, HasLiteralType.String);
        }
        pxtc.isStringType = isStringType;
        function isNumberType(t) {
            return checkPrimitiveType(t, ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral, HasLiteralType.Number);
        }
        function isBooleanType(t) {
            return checkPrimitiveType(t, ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral, HasLiteralType.Boolean);
        }
        function isEnumType(t) {
            return checkPrimitiveType(t, ts.TypeFlags.Enum | ts.TypeFlags.EnumLiteral, HasLiteralType.Enum);
        }
        function isNumericalType(t) {
            return isEnumType(t) || isNumberType(t);
        }
        var Binary = /** @class */ (function () {
            function Binary() {
                this.procs = [];
                this.globals = [];
                this.finalPass = false;
                this.writeFile = function (fn, cont) { };
                this.usedClassInfos = [];
                this.sourceHash = "";
                this.numStmts = 1;
                this.commSize = 0;
                this.itEntries = 0;
                this.itFullEntries = 0;
                this.numMethods = 0;
                this.numVirtMethods = 0;
                this.usedChars = new Uint32Array(0x10000 / 32);
                this.explicitlyUsedIfaceMembers = {};
                this.ifaceMemberMap = {};
                this.strings = {};
                this.hexlits = {};
                this.doubles = {};
                this.otherLiterals = [];
                this.codeHelpers = {};
                this.lblNo = 0;
            }
            Binary.prototype.reset = function () {
                this.lblNo = 0;
                this.otherLiterals = [];
                this.strings = {};
                this.hexlits = {};
                this.doubles = {};
                this.numStmts = 0;
            };
            Binary.prototype.getTitle = function () {
                var title = this.options.name || pxtc.U.lf("Untitled");
                if (title.length >= 90)
                    return title.slice(0, 87) + "...";
                else
                    return title;
            };
            Binary.prototype.addProc = function (proc) {
                pxtc.assert(!this.finalPass, "!this.finalPass");
                this.procs.push(proc);
                proc.seqNo = this.procs.length;
                //proc.binary = this
            };
            Binary.prototype.recordHelper = function (usingCtx, id, gen) {
                var act = function (bin) {
                    if (!bin.codeHelpers[id])
                        bin.codeHelpers[id] = gen(bin);
                };
                act(this);
                this.recordAction(usingCtx, act);
            };
            Binary.prototype.recordAction = function (usingCtx, f) {
                if (usingCtx) {
                    if (usingCtx.usedActions)
                        usingCtx.usedActions.push(f);
                }
                else
                    pxtc.U.oops("no using ctx!");
            };
            Binary.prototype.emitLabelled = function (v, hash, lblpref) {
                var r = pxtc.U.lookup(hash, v);
                if (r != null)
                    return r;
                var lbl = lblpref + this.lblNo++;
                hash[v] = lbl;
                return lbl;
            };
            Binary.prototype.emitDouble = function (v) {
                return this.emitLabelled(pxtc.target.switches.numFloat ? floatToBits(v) : doubleToBits(v), this.doubles, "_dbl");
            };
            Binary.prototype.emitString = function (s) {
                if (!this.finalPass)
                    for (var i = 0; i < s.length; ++i) {
                        var ch = s.charCodeAt(i);
                        if (ch >= 128)
                            this.usedChars[ch >> 5] |= 1 << (ch & 31);
                    }
                return this.emitLabelled(s, this.strings, "_str");
            };
            Binary.prototype.emitHexLiteral = function (s) {
                return this.emitLabelled(s, this.hexlits, "_hexlit");
            };
            Binary.prototype.setPerfCounters = function (systemPerfCounters) {
                if (!pxtc.target.switches.profile)
                    return [];
                var perfCounters = systemPerfCounters.slice();
                this.procs.forEach(function (p) {
                    if (p.perfCounterName) {
                        pxtc.U.assert(pxtc.target.switches.profile);
                        p.perfCounterNo = perfCounters.length;
                        perfCounters.push(p.perfCounterName);
                    }
                });
                return perfCounters;
            };
            return Binary;
        }());
        pxtc.Binary = Binary;
        function isCtorField(p) {
            if (!p.modifiers)
                return false;
            if (p.parent.kind != pxtc.SK.Constructor)
                return false;
            for (var _i = 0, _a = p.modifiers; _i < _a.length; _i++) {
                var m = _a[_i];
                if (m.kind == pxtc.SK.PrivateKeyword ||
                    m.kind == pxtc.SK.PublicKeyword ||
                    m.kind == pxtc.SK.ProtectedKeyword)
                    return true;
            }
            return false;
        }
        pxtc.isCtorField = isCtorField;
        function isNumberLikeType(type) {
            if (type.flags & ts.TypeFlags.Union) {
                return type.types.every(function (t) { return isNumberLikeType(t); });
            }
            else {
                return !!(type.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.EnumLike | ts.TypeFlags.BooleanLike));
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../../built/typescriptServices.d.ts"/>
/// <reference path="../../localtypings/pxtarget.d.ts"/>
// Enforce order:
/// <reference path="thumb.ts"/>
/// <reference path="ir.ts"/>
/// <reference path="emitter.ts"/>
/// <reference path="backthumb.ts"/>
/// <reference path="decompiler.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        function getTsCompilerOptions(opts) {
            var options = ts.getDefaultCompilerOptions();
            options.target = ts.ScriptTarget.ES5;
            options.module = ts.ModuleKind.None;
            options.noImplicitAny = true;
            options.noImplicitReturns = true;
            options.allowUnreachableCode = true;
            return options;
        }
        pxtc.getTsCompilerOptions = getTsCompilerOptions;
        function nodeLocationInfo(node) {
            var file = ts.getSourceFileOfNode(node);
            var nodeStart = node.getStart ? node.getStart() : node.pos;
            var _a = ts.getLineAndCharacterOfPosition(file, nodeStart), line = _a.line, character = _a.character;
            var _b = ts.getLineAndCharacterOfPosition(file, node.end), endLine = _b.line, endChar = _b.character;
            var r = {
                start: nodeStart,
                length: node.end - nodeStart,
                line: line,
                column: character,
                endLine: endLine,
                endColumn: endChar,
                fileName: file.fileName,
            };
            return r;
        }
        pxtc.nodeLocationInfo = nodeLocationInfo;
        function patchUpDiagnostics(diags, ignoreFileResolutionErorrs) {
            if (ignoreFileResolutionErorrs === void 0) { ignoreFileResolutionErorrs = false; }
            if (ignoreFileResolutionErorrs) {
                // Because we generate the program and the virtual file system, we can safely ignore
                // file resolution errors. They are generated by triple slash references that likely
                // have a different path format than the one our dumb file system expects. The files
                // are included, our compiler host just isn't smart enough to resolve them.
                diags = diags.filter(function (d) { return d.code !== 5012; });
            }
            var highPri = diags.filter(function (d) { return d.code == 1148; });
            if (highPri.length > 0)
                diags = highPri;
            return diags.map(function (d) {
                if (!d.file) {
                    var rr = {
                        code: d.code,
                        start: d.start,
                        length: d.length,
                        line: 0,
                        column: 0,
                        messageText: d.messageText,
                        category: d.category,
                        fileName: "?",
                    };
                    return rr;
                }
                var pos = ts.getLineAndCharacterOfPosition(d.file, d.start);
                var r = {
                    code: d.code,
                    start: d.start,
                    length: d.length,
                    line: pos.line,
                    column: pos.character,
                    messageText: d.messageText,
                    category: d.category,
                    fileName: d.file.fileName,
                };
                if (r.code == 1148)
                    r.messageText = pxtc.Util.lf("all symbols in top-level scope are always exported; please use a namespace if you want to export only some");
                return r;
            });
        }
        pxtc.patchUpDiagnostics = patchUpDiagnostics;
        function runConversions(opts) {
            var diags = [];
            for (var _i = 0, _a = pxt.conversionPasses; _i < _a.length; _i++) {
                var pass = _a[_i];
                pxtc.U.pushRange(diags, pass(opts));
            }
            return diags;
        }
        pxtc.runConversions = runConversions;
        function mkCompileResult() {
            return {
                outfiles: {},
                diagnostics: [],
                success: false,
                times: {},
            };
        }
        function storeGeneratedFiles(opts, res) {
            // save files first, in case we generated some .ts files that fail to compile
            for (var _i = 0, _a = opts.generatedFiles || []; _i < _a.length; _i++) {
                var f = _a[_i];
                res.outfiles[f] = opts.fileSystem[f];
            }
        }
        pxtc.storeGeneratedFiles = storeGeneratedFiles;
        function runConversionsAndStoreResults(opts, res) {
            var startTime = pxtc.U.cpuUs();
            if (!res)
                res = mkCompileResult();
            var convDiag = runConversions(opts);
            storeGeneratedFiles(opts, res);
            res.diagnostics = convDiag;
            if (!opts.sourceFiles)
                opts.sourceFiles = Object.keys(opts.fileSystem);
            // ensure that main.ts is last of TS files
            var idx = opts.sourceFiles.indexOf("main.ts");
            if (idx >= 0) {
                opts.sourceFiles.splice(idx, 1);
                opts.sourceFiles.push("main.ts");
            }
            res.times["conversions"] = pxtc.U.cpuUs() - startTime;
            return res;
        }
        pxtc.runConversionsAndStoreResults = runConversionsAndStoreResults;
        function timesToMs(res) {
            for (var _i = 0, _a = Object.keys(res.times); _i < _a.length; _i++) {
                var k = _a[_i];
                res.times[k] = Math.round(res.times[k]) / 1000;
            }
        }
        pxtc.timesToMs = timesToMs;
        function buildProgram(opts, res) {
            var fileText = {};
            for (var fileName in opts.fileSystem) {
                fileText[normalizePath(fileName)] = opts.fileSystem[fileName];
            }
            var setParentNodes = true;
            var options = getTsCompilerOptions(opts);
            var host = {
                getSourceFile: function (fn, v, err) {
                    fn = normalizePath(fn);
                    var text = "";
                    if (fileText.hasOwnProperty(fn)) {
                        text = fileText[fn];
                    }
                    else {
                        if (err)
                            err("File not found: " + fn);
                    }
                    if (text == null) {
                        err("File not found: " + fn);
                        text = "";
                    }
                    return ts.createSourceFile(fn, text, v, setParentNodes);
                },
                fileExists: function (fn) {
                    fn = normalizePath(fn);
                    return fileText.hasOwnProperty(fn);
                },
                getCanonicalFileName: function (fn) { return fn; },
                getDefaultLibFileName: function () { return "no-default-lib.d.ts"; },
                writeFile: function (fileName, data, writeByteOrderMark, onError) {
                    res.outfiles[fileName] = data;
                },
                getCurrentDirectory: function () { return "."; },
                useCaseSensitiveFileNames: function () { return true; },
                getNewLine: function () { return "\n"; },
                readFile: function (fn) {
                    fn = normalizePath(fn);
                    return fileText[fn] || "";
                },
                directoryExists: function (dn) { return true; },
                getDirectories: function () { return []; }
            };
            var tsFiles = opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".ts"); });
            return ts.createProgram(tsFiles, options, host);
        }
        function isPxtModulesFilename(filename) {
            return pxtc.U.startsWith(filename, "pxt_modules/");
        }
        pxtc.isPxtModulesFilename = isPxtModulesFilename;
        function compile(opts, service) {
            var startTime = pxtc.U.cpuUs();
            var res = mkCompileResult();
            var program;
            if (service) {
                storeGeneratedFiles(opts, res);
                program = service.getProgram();
            }
            else {
                runConversionsAndStoreResults(opts, res);
                if (res.diagnostics.length > 0)
                    return res;
                program = buildProgram(opts, res);
            }
            var entryPoint = opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".ts"); }).pop().replace(/.*\//, "");
            // First get and report any syntactic errors.
            res.diagnostics = patchUpDiagnostics(program.getSyntacticDiagnostics(), opts.ignoreFileResolutionErrors);
            if (res.diagnostics.length > 0) {
                if (opts.forceEmit) {
                    pxt.debug('syntactic errors, forcing emit');
                    pxtc.compileBinary(program, opts, res, entryPoint);
                }
                return res;
            }
            // If we didn't have any syntactic errors, then also try getting the global and
            // semantic errors.
            res.diagnostics = patchUpDiagnostics(program.getOptionsDiagnostics().concat(pxtc.Util.toArray(program.getGlobalDiagnostics())), opts.ignoreFileResolutionErrors);
            var semStart = pxtc.U.cpuUs();
            if (res.diagnostics.length == 0) {
                if (opts.skipPxtModulesTSC) {
                    var allDiag = program.getSourceFiles().map(function (f) {
                        return isPxtModulesFilename(f.fileName) ? [] : program.getSemanticDiagnostics(f);
                    });
                    res.diagnostics = patchUpDiagnostics(pxtc.U.concatArrayLike(allDiag), opts.ignoreFileResolutionErrors);
                }
                else {
                    res.diagnostics = patchUpDiagnostics(program.getSemanticDiagnostics(), opts.ignoreFileResolutionErrors);
                }
            }
            var emitStart = pxtc.U.cpuUs();
            res.times["typescript-syn"] = semStart - startTime;
            res.times["typescript-sem"] = emitStart - semStart;
            res.times["typescript"] = emitStart - startTime;
            if (opts.ast) {
                res.ast = program;
            }
            if (opts.ast || opts.forceEmit || res.diagnostics.length == 0) {
                var binOutput = pxtc.compileBinary(program, opts, res, entryPoint);
                res.times["compilebinary"] = pxtc.U.cpuUs() - emitStart;
                res.diagnostics = res.diagnostics.concat(patchUpDiagnostics(binOutput.diagnostics));
            }
            if (res.diagnostics.length == 0)
                res.success = true;
            for (var _i = 0, _a = opts.sourceFiles; _i < _a.length; _i++) {
                var f = _a[_i];
                if (pxtc.Util.startsWith(f, "built/"))
                    res.outfiles[f.slice(6)] = opts.fileSystem[f];
            }
            res.times["all"] = pxtc.U.cpuUs() - startTime;
            pxt.tickEvent("compile", res.times);
            return res;
        }
        pxtc.compile = compile;
        function decompile(program, opts, fileName, includeGreyBlockMessages) {
            if (includeGreyBlockMessages === void 0) { includeGreyBlockMessages = false; }
            var file = program.getSourceFile(fileName);
            pxtc.annotate(program, fileName, pxtc.target || (pxt.appTarget && pxt.appTarget.compile));
            var apis = pxtc.getApiInfo(program, opts.jres);
            var blocksInfo = pxtc.getBlocksInfo(apis, opts.bannedCategories);
            var decompileOpts = {
                snippetMode: false,
                alwaysEmitOnStart: opts.alwaysDecompileOnStart,
                includeGreyBlockMessages: includeGreyBlockMessages,
                allowedArgumentTypes: opts.allowedArgumentTypes || ["number", "boolean", "string"]
            };
            var _a = pxtc.decompiler.buildRenameMap(program, file), renameMap = _a[0], _ = _a[1];
            var bresp = pxtc.decompiler.decompileToBlocks(blocksInfo, file, decompileOpts, renameMap);
            return bresp;
        }
        pxtc.decompile = decompile;
        function getTSProgram(opts, old) {
            var outfiles = {};
            var fileText = {};
            for (var fileName in opts.fileSystem) {
                fileText[normalizePath(fileName)] = opts.fileSystem[fileName];
            }
            var setParentNodes = true;
            var options = getTsCompilerOptions(opts);
            var host = {
                getSourceFile: function (fn, v, err) {
                    fn = normalizePath(fn);
                    var text = "";
                    if (fileText.hasOwnProperty(fn)) {
                        text = fileText[fn];
                    }
                    else {
                        if (err)
                            err("File not found: " + fn);
                    }
                    if (text == null) {
                        err("File not found: " + fn);
                        text = "";
                    }
                    return ts.createSourceFile(fn, text, v, setParentNodes);
                },
                fileExists: function (fn) {
                    fn = normalizePath(fn);
                    return fileText.hasOwnProperty(fn);
                },
                getCanonicalFileName: function (fn) { return fn; },
                getDefaultLibFileName: function () { return "no-default-lib.d.ts"; },
                writeFile: function (fileName, data, writeByteOrderMark, onError) {
                    outfiles[fileName] = data;
                },
                getCurrentDirectory: function () { return "."; },
                useCaseSensitiveFileNames: function () { return true; },
                getNewLine: function () { return "\n"; },
                readFile: function (fn) {
                    fn = normalizePath(fn);
                    return fileText[fn] || "";
                },
                directoryExists: function (dn) { return true; },
                getDirectories: function () { return []; }
            };
            if (!opts.sourceFiles)
                opts.sourceFiles = Object.keys(opts.fileSystem);
            var tsFiles = opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".ts"); });
            // ensure that main.ts is last of TS files
            var tsFilesNoMain = tsFiles.filter(function (f) { return f != "main.ts"; });
            var hasMain = false;
            if (tsFiles.length > tsFilesNoMain.length) {
                tsFiles = tsFilesNoMain;
                tsFiles.push("main.ts");
                hasMain = true;
            }
            // TODO: ensure that main.ts is last???
            var program = ts.createProgram(tsFiles, options, host, old);
            pxtc.annotate(program, "main.ts", pxtc.target || (pxt.appTarget && pxt.appTarget.compile));
            return program;
        }
        pxtc.getTSProgram = getTSProgram;
        function normalizePath(path) {
            path = path.replace(/\\/g, "/");
            var parts = [];
            path.split("/").forEach(function (part) {
                if (part === ".." && parts.length) {
                    parts.pop();
                }
                else if (part !== ".") {
                    parts.push(part);
                }
            });
            return parts.join("/");
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxt;
(function (pxt) {
    var elf;
    (function (elf) {
        ;
        var progHeaderFields = [
            "type",
            "offset",
            "vaddr",
            "paddr",
            "filesz",
            "memsz",
            "flags",
            "align",
        ];
        ;
        var r32 = pxt.HF2.read32;
        var r16 = pxt.HF2.read16;
        var pageSize = 4096;
        function parse(buf) {
            if (r32(buf, 0) != 0x464c457f)
                pxt.U.userError("no magic");
            if (buf[4] != 1)
                pxt.U.userError("not 32 bit");
            if (buf[5] != 1)
                pxt.U.userError("not little endian");
            if (buf[6] != 1)
                pxt.U.userError("bad version");
            if (r16(buf, 0x10) != 2)
                pxt.U.userError("wrong object type");
            if (r16(buf, 0x12) != 0x28)
                pxt.U.userError("not ARM");
            var phoff = r32(buf, 0x1c);
            var shoff = r32(buf, 0x20);
            if (phoff == 0)
                pxt.U.userError("expecting program headers");
            var phentsize = r16(buf, 42);
            var phnum = r16(buf, 44);
            var progHeaders = pxt.U.range(phnum).map(function (no) {
                return readPH(phoff + no * phentsize);
            });
            var addFileOff = buf.length + 1;
            while (addFileOff & 0xf)
                addFileOff++;
            var mapEnd = 0;
            for (var _i = 0, progHeaders_1 = progHeaders; _i < progHeaders_1.length; _i++) {
                var s = progHeaders_1[_i];
                if (s.type == 1 /* LOAD */)
                    mapEnd = Math.max(mapEnd, s.vaddr + s.memsz);
            }
            var addMemOff = ((mapEnd + pageSize - 1) & ~(pageSize - 1)) + (addFileOff & (pageSize - 1));
            var phOffset = -1;
            for (var _a = 0, progHeaders_2 = progHeaders; _a < progHeaders_2.length; _a++) {
                var s = progHeaders_2[_a];
                if (s.type == 4 /* NOTE */) {
                    phOffset = s._filepos;
                }
            }
            return {
                imageMemStart: addMemOff,
                imageFileStart: addFileOff,
                phOffset: phOffset,
                template: buf
            };
            function readPH(off) {
                var r = {};
                var o0 = off;
                for (var _i = 0, progHeaderFields_1 = progHeaderFields; _i < progHeaderFields_1.length; _i++) {
                    var f = progHeaderFields_1[_i];
                    r[f] = r32(buf, off);
                    off += 4;
                }
                var rr = r;
                rr._filepos = o0;
                return rr;
            }
        }
        elf.parse = parse;
        function patch(info, program) {
            var resBuf = new Uint8Array(info.imageFileStart + program.length);
            resBuf.fill(0);
            pxt.U.memcpy(resBuf, 0, info.template);
            pxt.U.memcpy(resBuf, info.imageFileStart, program);
            var ph = {
                _filepos: info.phOffset,
                type: 1 /* LOAD */,
                offset: info.imageFileStart,
                vaddr: info.imageMemStart,
                paddr: info.imageMemStart,
                filesz: program.length,
                memsz: program.length,
                flags: 4 /* R */ | 1 /* X */,
                align: pageSize
            };
            savePH(resBuf, ph);
            return resBuf;
            function savePH(buf, ph) {
                var off = ph._filepos;
                for (var _i = 0, progHeaderFields_2 = progHeaderFields; _i < progHeaderFields_2.length; _i++) {
                    var f = progHeaderFields_2[_i];
                    pxt.HF2.write32(buf, off, ph[f] || 0);
                    off += 4;
                }
            }
        }
        elf.patch = patch;
    })(elf = pxt.elf || (pxt.elf = {}));
})(pxt || (pxt = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var TokenKind;
        (function (TokenKind) {
            TokenKind[TokenKind["None"] = 0] = "None";
            TokenKind[TokenKind["Whitespace"] = 1] = "Whitespace";
            TokenKind[TokenKind["Identifier"] = 2] = "Identifier";
            TokenKind[TokenKind["Keyword"] = 3] = "Keyword";
            TokenKind[TokenKind["Operator"] = 4] = "Operator";
            TokenKind[TokenKind["CommentLine"] = 5] = "CommentLine";
            TokenKind[TokenKind["CommentBlock"] = 6] = "CommentBlock";
            TokenKind[TokenKind["NewLine"] = 7] = "NewLine";
            TokenKind[TokenKind["Literal"] = 8] = "Literal";
            TokenKind[TokenKind["Tree"] = 9] = "Tree";
            TokenKind[TokenKind["Block"] = 10] = "Block";
            TokenKind[TokenKind["EOF"] = 11] = "EOF";
        })(TokenKind || (TokenKind = {}));
        var inputForMsg = "";
        function lookupKind(k) {
            for (var _i = 0, _a = Object.keys(ts.SyntaxKind); _i < _a.length; _i++) {
                var o = _a[_i];
                if (ts.SyntaxKind[o] === k)
                    return o;
            }
            return "?";
        }
        var SK = ts.SyntaxKind;
        function showMsg(t, msg) {
            var pos = t.pos;
            var ctx = inputForMsg.slice(pos - 20, pos) + "<*>" + inputForMsg.slice(pos, pos + 20);
            console.log(ctx.replace(/\n/g, "<NL>"), ": L ", t.lineNo, msg);
        }
        function infixOperatorPrecedence(kind) {
            switch (kind) {
                case SK.CommaToken:
                    return 2;
                case SK.EqualsToken:
                case SK.PlusEqualsToken:
                case SK.MinusEqualsToken:
                case SK.AsteriskEqualsToken:
                case SK.AsteriskAsteriskEqualsToken:
                case SK.SlashEqualsToken:
                case SK.PercentEqualsToken:
                case SK.LessThanLessThanEqualsToken:
                case SK.GreaterThanGreaterThanEqualsToken:
                case SK.GreaterThanGreaterThanGreaterThanEqualsToken:
                case SK.AmpersandEqualsToken:
                case SK.BarEqualsToken:
                case SK.CaretEqualsToken:
                    return 5;
                case SK.QuestionToken:
                case SK.ColonToken:
                    return 7; // ternary operator
                case SK.BarBarToken:
                    return 10;
                case SK.AmpersandAmpersandToken:
                    return 20;
                case SK.BarToken:
                    return 30;
                case SK.CaretToken:
                    return 40;
                case SK.AmpersandToken:
                    return 50;
                case SK.EqualsEqualsToken:
                case SK.ExclamationEqualsToken:
                case SK.EqualsEqualsEqualsToken:
                case SK.ExclamationEqualsEqualsToken:
                    return 60;
                case SK.LessThanToken:
                case SK.GreaterThanToken:
                case SK.LessThanEqualsToken:
                case SK.GreaterThanEqualsToken:
                case SK.InstanceOfKeyword:
                case SK.InKeyword:
                case SK.AsKeyword:
                    return 70;
                case SK.LessThanLessThanToken:
                case SK.GreaterThanGreaterThanToken:
                case SK.GreaterThanGreaterThanGreaterThanToken:
                    return 80;
                case SK.PlusToken:
                case SK.MinusToken:
                    return 90;
                case SK.AsteriskToken:
                case SK.SlashToken:
                case SK.PercentToken:
                    return 100;
                case SK.AsteriskAsteriskToken:
                    return 101;
                case SK.DotToken:
                    return 120;
                default:
                    return 0;
            }
        }
        function getTokKind(kind) {
            switch (kind) {
                case SK.EndOfFileToken:
                    return TokenKind.EOF;
                case SK.SingleLineCommentTrivia:
                    return TokenKind.CommentLine;
                case SK.MultiLineCommentTrivia:
                    return TokenKind.CommentBlock;
                case SK.NewLineTrivia:
                    return TokenKind.NewLine;
                case SK.WhitespaceTrivia:
                    return TokenKind.Whitespace;
                case SK.ShebangTrivia:
                case SK.ConflictMarkerTrivia:
                    return TokenKind.CommentBlock;
                case SK.NumericLiteral:
                case SK.StringLiteral:
                case SK.RegularExpressionLiteral:
                case SK.NoSubstitutionTemplateLiteral:
                case SK.TemplateHead:
                case SK.TemplateMiddle:
                case SK.TemplateTail:
                    return TokenKind.Literal;
                case SK.Identifier:
                    return TokenKind.Identifier;
                default:
                    if (kind < SK.Identifier)
                        return TokenKind.Operator;
                    return TokenKind.Keyword;
            }
        }
        var brokenRegExps = false;
        function tokenize(input) {
            inputForMsg = input;
            var scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, input, function (msg) {
                var pos = scanner.getTextPos();
                console.log("scanner error", pos, msg.message);
            });
            var tokens = [];
            var braceBalance = 0;
            var templateLevel = -1;
            while (true) {
                var kind = scanner.scan();
                if (kind == SK.CloseBraceToken && braceBalance == templateLevel) {
                    templateLevel = -1;
                    kind = scanner.reScanTemplateToken();
                }
                if (brokenRegExps && kind == SK.SlashToken || kind == SK.SlashEqualsToken) {
                    var tmp = scanner.reScanSlashToken();
                    if (tmp == SK.RegularExpressionLiteral)
                        kind = tmp;
                }
                if (kind == SK.GreaterThanToken) {
                    kind = scanner.reScanGreaterToken();
                }
                var tok = {
                    kind: getTokKind(kind),
                    synKind: kind,
                    lineNo: 0,
                    pos: scanner.getTokenPos(),
                    text: scanner.getTokenText(),
                };
                if (kind == SK.OpenBraceToken)
                    braceBalance++;
                if (kind == SK.CloseBraceToken) {
                    if (--braceBalance < 0)
                        braceBalance = -10000000;
                }
                tokens.push(tok);
                if (kind == SK.TemplateHead || kind == SK.TemplateMiddle) {
                    templateLevel = braceBalance;
                }
                if (tok.kind == TokenKind.EOF)
                    break;
            }
            // Util.assert(tokens.map(t => t.text).join("") == input)
            return { tokens: tokens, braceBalance: braceBalance };
        }
        function skipWhitespace(tokens, i) {
            while (tokens[i] && tokens[i].kind == TokenKind.Whitespace)
                i++;
            return i;
        }
        // We do not want empty lines in the source to get lost - they serve as a sort of comment dividing parts of code
        // We turn them into empty comments here
        function emptyLinesToComments(tokens, cursorPos) {
            var output = [];
            var atLineBeg = true;
            var lineNo = 1;
            for (var i = 0; i < tokens.length; ++i) {
                if (atLineBeg) {
                    var bkp = i;
                    i = skipWhitespace(tokens, i);
                    if (tokens[i].kind == TokenKind.NewLine) {
                        var isCursor = false;
                        if (cursorPos >= 0 && tokens[i].pos >= cursorPos) {
                            cursorPos = -1;
                            isCursor = true;
                        }
                        output.push({
                            text: "",
                            kind: TokenKind.CommentLine,
                            pos: tokens[i].pos,
                            lineNo: lineNo,
                            synKind: SK.SingleLineCommentTrivia,
                            isCursor: isCursor
                        });
                    }
                    else {
                        i = bkp;
                    }
                }
                output.push(tokens[i]);
                tokens[i].lineNo = lineNo;
                if (tokens[i].kind == TokenKind.NewLine) {
                    atLineBeg = true;
                    lineNo++;
                }
                else {
                    atLineBeg = false;
                }
                if (cursorPos >= 0 && tokens[i].pos >= cursorPos) {
                    cursorPos = -1;
                }
            }
            return output;
        }
        // Add Tree tokens where needed
        function matchBraces(tokens) {
            var braceStack = [];
            var braceTop = function () { return braceStack[braceStack.length - 1]; };
            braceStack.push({
                synKind: SK.EndOfFileToken,
                token: {
                    children: [],
                },
            });
            var pushClose = function (tok, synKind) {
                var token = tok;
                token.children = [];
                token.kind = TokenKind.Tree;
                braceStack.push({ synKind: synKind, token: token });
            };
            for (var i = 0; i < tokens.length; ++i) {
                var token = tokens[i];
                var top_1 = braceStack[braceStack.length - 1];
                top_1.token.children.push(token);
                switch (token.kind) {
                    case TokenKind.Operator:
                        switch (token.synKind) {
                            case SK.OpenBraceToken:
                            case SK.OpenParenToken:
                            case SK.OpenBracketToken:
                                pushClose(token, token.synKind + 1);
                                break;
                            case SK.CloseBraceToken:
                            case SK.CloseParenToken:
                            case SK.CloseBracketToken:
                                top_1.token.children.pop();
                                while (true) {
                                    top_1 = braceStack.pop();
                                    if (top_1.synKind == token.synKind) {
                                        top_1.token.endToken = token;
                                        break;
                                    }
                                    // don't go past brace with other closing parens
                                    if (braceStack.length == 0 || top_1.synKind == SK.CloseBraceToken) {
                                        braceStack.push(top_1);
                                        break;
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                        break;
                }
            }
            return braceStack[0].token.children;
        }
        function mkEOF() {
            return {
                kind: TokenKind.EOF,
                synKind: SK.EndOfFileToken,
                pos: 0,
                lineNo: 0,
                text: ""
            };
        }
        function mkSpace(t, s) {
            return {
                kind: TokenKind.Whitespace,
                synKind: SK.WhitespaceTrivia,
                pos: t.pos - s.length,
                lineNo: t.lineNo,
                text: s
            };
        }
        function mkNewLine(t) {
            return {
                kind: TokenKind.NewLine,
                synKind: SK.NewLineTrivia,
                pos: t.pos,
                lineNo: t.lineNo,
                text: "\n"
            };
        }
        function mkBlock(toks) {
            return {
                kind: TokenKind.Block,
                synKind: SK.OpenBraceToken,
                pos: toks[0].pos,
                lineNo: toks[0].lineNo,
                stmts: [{ tokens: toks }],
                text: "{",
                endToken: null
            };
        }
        function mkVirtualTree(toks) {
            return {
                kind: TokenKind.Tree,
                synKind: SK.WhitespaceTrivia,
                pos: toks[0].pos,
                lineNo: toks[0].lineNo,
                children: toks,
                endToken: null,
                text: ""
            };
        }
        function isExprEnd(t) {
            if (!t)
                return false;
            switch (t.synKind) {
                case SK.IfKeyword:
                case SK.ElseKeyword:
                case SK.LetKeyword:
                case SK.ConstKeyword:
                case SK.VarKeyword:
                case SK.DoKeyword:
                case SK.WhileKeyword:
                case SK.SwitchKeyword:
                case SK.CaseKeyword:
                case SK.DefaultKeyword:
                case SK.ForKeyword:
                case SK.ReturnKeyword:
                case SK.BreakKeyword:
                case SK.ContinueKeyword:
                case SK.TryKeyword:
                case SK.CatchKeyword:
                case SK.FinallyKeyword:
                case SK.DeleteKeyword:
                case SK.FunctionKeyword:
                case SK.ClassKeyword:
                case SK.YieldKeyword:
                case SK.DebuggerKeyword:
                    return true;
                default:
                    return false;
            }
        }
        function delimitStmts(tokens, inStmtCtx, ctxToken) {
            if (ctxToken === void 0) { ctxToken = null; }
            var res = [];
            var i = 0;
            var currCtxToken;
            var didBlock = false;
            tokens = tokens.concat([mkEOF()]);
            while (tokens[i].kind != TokenKind.EOF) {
                var stmtBeg = i;
                skipToStmtEnd();
                pxtc.Util.assert(i > stmtBeg, "Error at " + tokens[i].text);
                addStatement(tokens.slice(stmtBeg, i));
            }
            return res;
            function addStatement(tokens) {
                if (inStmtCtx)
                    tokens = trimWhitespace(tokens);
                if (tokens.length == 0)
                    return;
                tokens.forEach(delimitIn);
                tokens = injectBlocks(tokens);
                var merge = false;
                if (inStmtCtx && res.length > 0) {
                    var prev = res[res.length - 1];
                    var prevKind = prev.tokens[0].synKind;
                    var thisKind = tokens[0].synKind;
                    if ((prevKind == SK.IfKeyword && thisKind == SK.ElseKeyword) ||
                        (prevKind == SK.TryKeyword && thisKind == SK.CatchKeyword) ||
                        (prevKind == SK.TryKeyword && thisKind == SK.FinallyKeyword) ||
                        (prevKind == SK.CatchKeyword && thisKind == SK.FinallyKeyword)) {
                        tokens.unshift(mkSpace(tokens[0], " "));
                        pxtc.Util.pushRange(res[res.length - 1].tokens, tokens);
                        return;
                    }
                }
                res.push({
                    tokens: tokens
                });
            }
            function injectBlocks(tokens) {
                var output = [];
                var i = 0;
                while (i < tokens.length) {
                    if (tokens[i].blockSpanLength) {
                        var inner = tokens.slice(i, i + tokens[i].blockSpanLength);
                        var isVirtual = !!inner[0].blockSpanIsVirtual;
                        delete inner[0].blockSpanLength;
                        delete inner[0].blockSpanIsVirtual;
                        i += inner.length;
                        inner = injectBlocks(inner);
                        if (isVirtual) {
                            output.push(mkVirtualTree(inner));
                        }
                        else {
                            output.push(mkSpace(inner[0], " "));
                            output.push(mkBlock(trimWhitespace(inner)));
                        }
                    }
                    else {
                        output.push(tokens[i++]);
                    }
                }
                return output;
            }
            function delimitIn(t) {
                if (t.kind == TokenKind.Tree) {
                    var tree = t;
                    tree.children = pxtc.Util.concat(delimitStmts(tree.children, false, tree).map(function (s) { return s.tokens; }));
                }
            }
            function nextNonWs(stopOnNewLine) {
                if (stopOnNewLine === void 0) { stopOnNewLine = false; }
                while (true) {
                    i++;
                    switch (tokens[i].kind) {
                        case TokenKind.Whitespace:
                        case TokenKind.CommentBlock:
                        case TokenKind.CommentLine:
                            break;
                        case TokenKind.NewLine:
                            if (stopOnNewLine)
                                break;
                            break;
                        default:
                            return;
                    }
                }
            }
            function skipOptionalNewLine() {
                while (tokens[i].kind == TokenKind.Whitespace) {
                    i++;
                }
                if (tokens[i].kind == TokenKind.NewLine)
                    i++;
            }
            function skipUntilBlock() {
                while (true) {
                    i++;
                    switch (tokens[i].kind) {
                        case TokenKind.EOF:
                            return;
                        case TokenKind.Tree:
                            if (tokens[i].synKind == SK.OpenBraceToken) {
                                i--;
                                expectBlock();
                                return;
                            }
                            break;
                    }
                }
            }
            function handleBlock() {
                pxtc.Util.assert(tokens[i].synKind == SK.OpenBraceToken);
                var tree = tokens[i];
                pxtc.Util.assert(tree.kind == TokenKind.Tree);
                var blk = tokens[i];
                blk.stmts = delimitStmts(tree.children, true, currCtxToken);
                delete tree.children;
                blk.kind = TokenKind.Block;
                i++;
                didBlock = true;
            }
            function expectBlock() {
                var begIdx = i + 1;
                nextNonWs();
                if (tokens[i].synKind == SK.OpenBraceToken) {
                    handleBlock();
                    skipOptionalNewLine();
                }
                else {
                    skipToStmtEnd();
                    tokens[begIdx].blockSpanLength = i - begIdx;
                }
            }
            function skipToStmtEnd() {
                while (true) {
                    var t = tokens[i];
                    var bkp = i;
                    currCtxToken = t;
                    didBlock = false;
                    if (t.kind == TokenKind.EOF)
                        return;
                    if (inStmtCtx && t.synKind == SK.SemicolonToken) {
                        i++;
                        skipOptionalNewLine();
                        return;
                    }
                    if (t.synKind == SK.EqualsGreaterThanToken) {
                        nextNonWs();
                        if (tokens[i].synKind == SK.OpenBraceToken) {
                            handleBlock();
                            continue;
                        }
                        else {
                            var begIdx = i;
                            skipToStmtEnd();
                            var j = i;
                            while (tokens[j].kind == TokenKind.NewLine)
                                j--;
                            tokens[begIdx].blockSpanLength = j - begIdx;
                            tokens[begIdx].blockSpanIsVirtual = true;
                            return;
                        }
                    }
                    if (inStmtCtx && infixOperatorPrecedence(t.synKind)) {
                        var begIdx = i;
                        // an infix operator at the end of the line prevents the newline from ending the statement
                        nextNonWs();
                        if (isExprEnd(tokens[i])) {
                            // unless next line starts with something statement-like
                            i = begIdx;
                        }
                        else {
                            continue;
                        }
                    }
                    if (inStmtCtx && t.kind == TokenKind.NewLine) {
                        nextNonWs();
                        t = tokens[i];
                        // if we get a infix operator other than +/- after newline, it's a continuation
                        if (infixOperatorPrecedence(t.synKind) && t.synKind != SK.PlusToken && t.synKind != SK.MinusToken) {
                            continue;
                        }
                        else {
                            i = bkp + 1;
                            return;
                        }
                    }
                    if (t.synKind == SK.OpenBraceToken && ctxToken && ctxToken.synKind == SK.ClassKeyword) {
                        var jj = i - 1;
                        while (jj >= 0 && tokens[jj].kind == TokenKind.Whitespace)
                            jj--;
                        if (jj < 0 || tokens[jj].synKind != SK.EqualsToken) {
                            i--;
                            expectBlock(); // method body
                            return;
                        }
                    }
                    pxtc.Util.assert(bkp == i);
                    switch (t.synKind) {
                        case SK.ForKeyword:
                        case SK.WhileKeyword:
                        case SK.IfKeyword:
                        case SK.CatchKeyword:
                            nextNonWs();
                            if (tokens[i].synKind == SK.OpenParenToken) {
                                expectBlock();
                            }
                            else {
                                continue; // just continue until new line
                            }
                            return;
                        case SK.DoKeyword:
                            expectBlock();
                            i--;
                            nextNonWs();
                            if (tokens[i].synKind == SK.WhileKeyword) {
                                i++;
                                continue;
                            }
                            else {
                                return;
                            }
                        case SK.ElseKeyword:
                            nextNonWs();
                            if (tokens[i].synKind == SK.IfKeyword) {
                                continue; // 'else if' - keep scanning
                            }
                            else {
                                i = bkp;
                                expectBlock();
                                return;
                            }
                        case SK.TryKeyword:
                        case SK.FinallyKeyword:
                            expectBlock();
                            return;
                        case SK.ClassKeyword:
                        case SK.NamespaceKeyword:
                        case SK.ModuleKeyword:
                        case SK.InterfaceKeyword:
                        case SK.FunctionKeyword:
                            skipUntilBlock();
                            return;
                    }
                    pxtc.Util.assert(!didBlock, "forgot continue/return after expectBlock");
                    i++;
                }
            }
        }
        function isWhitespaceOrNewLine(tok) {
            return tok && (tok.kind == TokenKind.Whitespace || tok.kind == TokenKind.NewLine);
        }
        function removeIndent(tokens) {
            var output = [];
            var atLineBeg = false;
            for (var i = 0; i < tokens.length; ++i) {
                if (atLineBeg)
                    i = skipWhitespace(tokens, i);
                if (tokens[i]) {
                    output.push(tokens[i]);
                    atLineBeg = tokens[i].kind == TokenKind.NewLine;
                }
            }
            return output;
        }
        function trimWhitespace(toks) {
            toks = toks.slice(0);
            while (isWhitespaceOrNewLine(toks[0]))
                toks.shift();
            while (isWhitespaceOrNewLine(toks[toks.length - 1]))
                toks.pop();
            return toks;
        }
        function normalizeSpace(tokens) {
            var output = [];
            var i = 0;
            var lastNonTrivialToken = mkEOF();
            tokens = tokens.concat([mkEOF()]);
            while (i < tokens.length) {
                i = skipWhitespace(tokens, i);
                var token = tokens[i];
                if (token.kind == TokenKind.EOF)
                    break;
                var j = skipWhitespace(tokens, i + 1);
                if (token.kind == TokenKind.NewLine && tokens[j].synKind == SK.OpenBraceToken) {
                    i = j; // skip NL
                    continue;
                }
                var needsSpace = true;
                var last = output.length == 0 ? mkNewLine(token) : output[output.length - 1];
                switch (last.synKind) {
                    case SK.ExclamationToken:
                    case SK.TildeToken:
                    case SK.DotToken:
                        needsSpace = false;
                        break;
                    case SK.PlusToken:
                    case SK.MinusToken:
                    case SK.PlusPlusToken:
                    case SK.MinusMinusToken:
                        if (last.isPrefix)
                            needsSpace = false;
                        break;
                }
                switch (token.synKind) {
                    case SK.DotToken:
                    case SK.CommaToken:
                    case SK.NewLineTrivia:
                    case SK.ColonToken:
                    case SK.SemicolonToken:
                    case SK.OpenBracketToken:
                        needsSpace = false;
                        break;
                    case SK.PlusPlusToken:
                    case SK.MinusMinusToken:
                        if (last.kind == TokenKind.Tree || last.kind == TokenKind.Identifier || last.kind == TokenKind.Keyword)
                            needsSpace = false;
                    /* fall through */
                    case SK.PlusToken:
                    case SK.MinusToken:
                        if (lastNonTrivialToken.kind == TokenKind.EOF ||
                            infixOperatorPrecedence(lastNonTrivialToken.synKind) ||
                            lastNonTrivialToken.synKind == SK.SemicolonToken)
                            token.isPrefix = true;
                        break;
                    case SK.OpenParenToken:
                        if (last.kind == TokenKind.Identifier)
                            needsSpace = false;
                        if (last.kind == TokenKind.Keyword)
                            switch (last.synKind) {
                                case SK.IfKeyword:
                                case SK.ForKeyword:
                                case SK.WhileKeyword:
                                case SK.SwitchKeyword:
                                case SK.ReturnKeyword:
                                case SK.ThrowKeyword:
                                case SK.CatchKeyword:
                                    break;
                                default:
                                    needsSpace = false;
                            }
                        break;
                }
                if (last.kind == TokenKind.NewLine)
                    needsSpace = false;
                if (needsSpace)
                    output.push(mkSpace(token, " "));
                output.push(token);
                if (token.kind != TokenKind.NewLine)
                    lastNonTrivialToken = token;
                i++;
            }
            return output;
        }
        function finalFormat(ind, token) {
            if (token.synKind == SK.NoSubstitutionTemplateLiteral &&
                /^`[\s\.#01]*`$/.test(token.text)) {
                var lines = token.text.slice(1, token.text.length - 1).split("\n").map(function (l) { return l.replace(/\s/g, ""); }).filter(function (l) { return !!l; });
                if (lines.length < 4 || lines.length > 5)
                    return;
                var numFrames = Math.floor((Math.max.apply(Math, lines.map(function (l) { return l.length; })) + 2) / 5);
                if (numFrames <= 0)
                    numFrames = 1;
                var out = "`\n";
                for (var i = 0; i < 5; ++i) {
                    var l = lines[i] || "";
                    while (l.length < numFrames * 5)
                        l += ".";
                    l = l.replace(/0/g, ".");
                    l = l.replace(/1/g, "#");
                    l = l.replace(/...../g, function (m) { return "/" + m; });
                    out += ind + l.replace(/./g, function (m) { return " " + m; }).replace(/\//g, " ").slice(3) + "\n";
                }
                out += ind + "`";
                token.text = out;
            }
        }
        function toStr(v) {
            if (Array.isArray(v))
                return "[[ " + v.map(toStr).join("  ") + " ]]";
            if (typeof v.text == "string")
                return JSON.stringify(v.text);
            return v + "";
        }
        pxtc.toStr = toStr;
        function format(input, pos) {
            var r = tokenize(input);
            //if (r.braceBalance != 0) return null
            var topTokens = r.tokens;
            topTokens = emptyLinesToComments(topTokens, pos);
            topTokens = matchBraces(topTokens);
            var topStmts = delimitStmts(topTokens, true);
            var ind = "";
            var output = "";
            var outpos = -1;
            var indIncrLine = 0;
            topStmts.forEach(ppStmt);
            topStmts.forEach(function (s) { return s.tokens.forEach(findNonBlocks); });
            if (outpos == -1)
                outpos = output.length;
            return {
                formatted: output,
                pos: outpos
            };
            function findNonBlocks(t) {
                if (t.kind == TokenKind.Tree) {
                    var tree = t;
                    if (t.synKind == SK.OpenBraceToken) {
                        //showMsg(t, "left behind X")
                    }
                    tree.children.forEach(findNonBlocks);
                }
                else if (t.kind == TokenKind.Block) {
                    t.stmts.forEach(function (s) { return s.tokens.forEach(findNonBlocks); });
                }
            }
            function incrIndent(parToken, f) {
                if (indIncrLine == parToken.lineNo) {
                    f();
                }
                else {
                    indIncrLine = parToken.lineNo;
                    var prev = ind;
                    ind += "    ";
                    f();
                    ind = prev;
                }
            }
            function ppStmt(s) {
                var toks = removeIndent(s.tokens);
                if (toks.length == 1 && !toks[0].isCursor && toks[0].text == "") {
                    output += "\n";
                    return;
                }
                output += ind;
                incrIndent(toks[0], function () {
                    ppToks(toks);
                });
                if (output[output.length - 1] != "\n")
                    output += "\n";
            }
            function writeToken(t) {
                if (outpos == -1 && t.pos + t.text.length >= pos) {
                    outpos = output.length + (pos - t.pos);
                }
                output += t.text;
            }
            function ppToks(tokens) {
                tokens = normalizeSpace(tokens);
                var _loop_3 = function (i) {
                    var t = tokens[i];
                    finalFormat(ind, t);
                    writeToken(t);
                    switch (t.kind) {
                        case TokenKind.Tree:
                            var tree_1 = t;
                            incrIndent(t, function () {
                                ppToks(removeIndent(tree_1.children));
                            });
                            if (tree_1.endToken) {
                                writeToken(tree_1.endToken);
                            }
                            break;
                        case TokenKind.Block:
                            var blk = t;
                            if (blk.stmts.length == 0) {
                                output += " ";
                            }
                            else {
                                output += "\n";
                                blk.stmts.forEach(ppStmt);
                                output += ind.slice(4);
                            }
                            if (blk.endToken)
                                writeToken(blk.endToken);
                            else
                                output += "}";
                            break;
                        case TokenKind.NewLine:
                            if (tokens[i + 1] && tokens[i + 1].kind == TokenKind.CommentLine &&
                                tokens[i + 1].text == "" && !tokens[i + 1].isCursor)
                                break; // no indent for empty line
                            if (i == tokens.length - 1)
                                output += ind.slice(4);
                            else
                                output += ind;
                            break;
                        case TokenKind.Whitespace:
                            break;
                    }
                };
                for (var i = 0; i < tokens.length; ++i) {
                    _loop_3(i);
                }
            }
        }
        pxtc.format = format;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        // HEX file documentation at: https://en.wikipedia.org/wiki/Intel_HEX
        /* From above:
        This example shows a file that has four data records followed by an end-of-file record:
    
    :10010000214601360121470136007EFE09D2190140
    :100110002146017E17C20001FF5F16002148011928
    :10012000194E79234623965778239EDA3F01B2CAA7
    :100130003F0156702B5E712B722B732146013421C7
    :00000001FF
    
            A record (line of text) consists of six fields (parts) that appear in order from left to right:
            - Start code, one character, an ASCII colon ':'.
            - Byte count, two hex digits, indicating the number of bytes (hex digit pairs) in the data field.
              The maximum byte count is 255 (0xFF). 16 (0x10) and 32 (0x20) are commonly used byte counts.
            - Address, four hex digits, representing the 16-bit beginning memory address offset of the data.
              The physical address of the data is computed by adding this offset to a previously established
              base address, thus allowing memory addressing beyond the 64 kilobyte limit of 16-bit addresses.
              The base address, which defaults to zero, can be changed by various types of records.
              Base addresses and address offsets are always expressed as big endian values.
            - Record type (see record types below), two hex digits, 00 to 05, defining the meaning of the data field.
            - Data, a sequence of n bytes of data, represented by 2n hex digits. Some records omit this field (n equals zero).
              The meaning and interpretation of data bytes depends on the application.
            - Checksum, two hex digits, a computed value that can be used to verify the record has no errors.
    
        */
        // TODO should be internal
        var hex;
        (function (hex_1) {
            var funcInfo = {};
            var hex;
            var jmpStartAddr;
            var jmpStartIdx;
            var bytecodePaddingSize;
            var bytecodeStartAddr;
            var elfInfo;
            var bytecodeStartIdx;
            var asmLabels = {};
            hex_1.asmTotalSource = "";
            hex_1.defaultPageSize = 0x400;
            hex_1.commBase = 0;
            // utility function
            function swapBytes(str) {
                var r = "";
                var i = 0;
                for (; i < str.length; i += 2)
                    r = str[i] + str[i + 1] + r;
                pxtc.assert(i == str.length);
                return r;
            }
            function hexDump(bytes, startOffset) {
                if (startOffset === void 0) { startOffset = 0; }
                function toHex(n, len) {
                    if (len === void 0) { len = 8; }
                    var r = n.toString(16);
                    while (r.length < len)
                        r = "0" + r;
                    return r;
                }
                var r = "";
                for (var i = 0; i < bytes.length; i += 16) {
                    r += toHex(startOffset + i) + ": ";
                    var t = "";
                    for (var j = 0; j < 16; j++) {
                        if ((j & 3) == 0)
                            r += " ";
                        var v = bytes[i + j];
                        if (v == null) {
                            r += "   ";
                            continue;
                        }
                        r += toHex(v, 2) + " ";
                        if (32 <= v && v < 127)
                            t += String.fromCharCode(v);
                        else
                            t += ".";
                    }
                    r += " " + t + "\n";
                }
                return r;
            }
            hex_1.hexDump = hexDump;
            function setupInlineAssembly(opts) {
                asmLabels = {};
                var asmSources = opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".asm"); });
                hex_1.asmTotalSource = "";
                var asmIdx = 0;
                for (var _i = 0, asmSources_1 = asmSources; _i < asmSources_1.length; _i++) {
                    var f = asmSources_1[_i];
                    var src = opts.fileSystem[f];
                    src.replace(/^\s*(\w+):/mg, function (f, lbl) {
                        asmLabels[lbl] = true;
                        return "";
                    });
                    var code = ".section code\n" +
                        "@stackmark func\n" +
                        "@scope user" + asmIdx++ + "\n" +
                        src + "\n" +
                        "@stackempty func\n" +
                        "@scope\n";
                    hex_1.asmTotalSource += code;
                }
            }
            hex_1.setupInlineAssembly = setupInlineAssembly;
            function parseHexBytes(bytes) {
                bytes = bytes.replace(/^[\s:]/, "");
                if (!bytes)
                    return [];
                var outp = [];
                var bytes2 = bytes.replace(/([a-f0-9][a-f0-9])/ig, function (m) {
                    outp.push(parseInt(m, 16));
                    return "";
                });
                if (bytes2)
                    throw pxtc.oops("bad bytes " + bytes);
                return outp;
            }
            function parseHexRecord(bytes) {
                var b = parseHexBytes(bytes);
                return {
                    len: b[0],
                    addr: (b[1] << 8) | b[2],
                    type: b[3],
                };
            }
            // setup for a particular .hex template file (which corresponds to the C++ source in included packages and the board)
            function flashCodeAlign(opts) {
                return opts.flashCodeAlign || hex_1.defaultPageSize;
            }
            hex_1.flashCodeAlign = flashCodeAlign;
            // some hex files use '02' records instead of '04' record for addresses. go figure.
            function patchSegmentHex(hex) {
                for (var i = 0; i < hex.length; ++i) {
                    // :020000021000EC
                    if (hex[i][8] == '2') {
                        var m = /^:02....02(....)..$/.exec(hex[i]);
                        pxtc.U.assert(!!m);
                        var upaddr = parseInt(m[1], 16) * 16;
                        pxtc.U.assert((upaddr & 0xffff) == 0);
                        hex[i] = hexBytes([0x02, 0x00, 0x00, 0x04, 0x00, upaddr >> 16]);
                    }
                }
            }
            function encodeVTPtr(ptr, opts) {
                var vv = ptr >> opts.target.vtableShift;
                pxtc.assert(vv < 0xffff);
                pxtc.assert(vv << opts.target.vtableShift == ptr);
                return vv;
            }
            hex_1.encodeVTPtr = encodeVTPtr;
            function setupFor(opts, extInfo, hexinfo) {
                if (hex_1.isSetupFor(extInfo))
                    return;
                var funs = extInfo.functions;
                hex_1.commBase = extInfo.commBase || 0;
                hex_1.currentSetup = extInfo.sha;
                hex_1.currentHexInfo = hexinfo;
                hex = hexinfo.hex;
                if (pxtc.target.nativeType == pxtc.NATIVE_TYPE_VM) {
                    bytecodeStartIdx = -1;
                    bytecodeStartAddr = 0;
                    hex_1.bytecodeStartAddrPadded = 0;
                    bytecodePaddingSize = 0;
                    jmpStartAddr = -1;
                    jmpStartIdx = -1;
                    for (var _i = 0, funs_1 = funs; _i < funs_1.length; _i++) {
                        var f = funs_1[_i];
                        funcInfo[f.name] = f;
                        f.value = 0xffffff;
                    }
                    return;
                }
                patchSegmentHex(hex);
                if (hex.length <= 2) {
                    elfInfo = pxt.elf.parse(pxtc.U.fromHex(hex[0]));
                    bytecodeStartIdx = -1;
                    bytecodeStartAddr = elfInfo.imageMemStart;
                    hex_1.bytecodeStartAddrPadded = elfInfo.imageMemStart;
                    bytecodePaddingSize = 0;
                    var jmpIdx = hex[0].indexOf("0108010842424242010801083ed8e98d");
                    if (jmpIdx < 0)
                        pxtc.oops("no jmp table in elf");
                    jmpStartAddr = jmpIdx / 2;
                    jmpStartIdx = -1;
                    var ptrs = hex[0].slice(jmpIdx + 32, jmpIdx + 32 + funs.length * 8 + 16);
                    readPointers(ptrs);
                    checkFuns();
                    return;
                }
                var i = 0;
                var upperAddr = "0000";
                var lastAddr = 0;
                var lastIdx = 0;
                bytecodeStartAddr = 0;
                var hitEnd = function () {
                    if (!bytecodeStartAddr) {
                        var bytes = parseHexBytes(hex[lastIdx]);
                        var missing = (0x10 - ((lastAddr + bytes[0]) & 0xf)) & 0xf;
                        if (missing)
                            if (bytes[2] & 0xf) {
                                var next = lastAddr + bytes[0];
                                var newline = [missing, next >> 8, next & 0xff, 0x00];
                                for (var i_2 = 0; i_2 < missing; ++i_2)
                                    newline.push(0x00);
                                lastIdx++;
                                hex.splice(lastIdx, 0, hexBytes(newline));
                                bytecodeStartAddr = next + missing;
                            }
                            else {
                                if (bytes[0] != 0x10) {
                                    bytes.pop(); // checksum
                                    bytes[0] = 0x10;
                                    while (bytes.length < 20)
                                        bytes.push(0x00);
                                    hex[lastIdx] = hexBytes(bytes);
                                }
                                bytecodeStartAddr = lastAddr + 16;
                            }
                        else {
                            bytecodeStartAddr = lastAddr + bytes[0];
                        }
                        bytecodeStartIdx = lastIdx + 1;
                        var pageSize = flashCodeAlign(opts);
                        hex_1.bytecodeStartAddrPadded = (bytecodeStartAddr & ~(pageSize - 1)) + pageSize;
                        var paddingBytes = hex_1.bytecodeStartAddrPadded - bytecodeStartAddr;
                        pxtc.assert((paddingBytes & 0xf) == 0);
                        bytecodePaddingSize = paddingBytes;
                    }
                };
                for (; i < hex.length; ++i) {
                    var m = /:02000004(....)/.exec(hex[i]);
                    if (m) {
                        upperAddr = m[1];
                    }
                    m = /^:..(....)00/.exec(hex[i]);
                    if (m) {
                        var newAddr = parseInt(upperAddr + m[1], 16);
                        if (opts.flashUsableEnd && newAddr >= opts.flashUsableEnd)
                            hitEnd();
                        lastIdx = i;
                        lastAddr = newAddr;
                    }
                    if (/^:00000001/.test(hex[i]))
                        hitEnd();
                    // random magic number, which marks the beginning of the array of function pointers in the .hex file
                    // it is defined in pxt-microbit-core
                    m = /^:10....000108010842424242010801083ED8E98D/.exec(hex[i]);
                    if (m) {
                        jmpStartAddr = lastAddr;
                        jmpStartIdx = i;
                    }
                }
                if (!jmpStartAddr)
                    pxtc.oops("No hex start");
                if (!bytecodeStartAddr)
                    pxtc.oops("No hex end");
                funcInfo = {};
                for (var i_3 = jmpStartIdx + 1; i_3 < hex.length; ++i_3) {
                    var m = /^:..(....)00(.{4,})/.exec(hex[i_3]);
                    if (!m)
                        continue;
                    readPointers(m[2]);
                    if (funs.length == 0)
                        break;
                }
                checkFuns();
                return;
                function readPointers(s) {
                    var step = opts.shortPointers ? 4 : 8;
                    while (s.length >= step) {
                        var hexb = s.slice(0, step);
                        var value = parseInt(swapBytes(hexb), 16);
                        s = s.slice(step);
                        var inf = funs.shift();
                        if (!inf)
                            break;
                        funcInfo[inf.name] = inf;
                        if (!value) {
                            pxtc.U.oops("No value for " + inf.name + " / " + hexb);
                        }
                        if (inf.argsFmt.length == 0) {
                            value ^= 1;
                        }
                        else {
                            if (!opts.runtimeIsARM && opts.nativeType == pxtc.NATIVE_TYPE_THUMB && !(value & 1)) {
                                pxtc.U.oops("Non-thumb addr for " + inf.name + " / " + hexb);
                            }
                        }
                        inf.value = value;
                    }
                }
                function checkFuns() {
                    if (funs.length)
                        pxtc.oops("premature EOF in hex file; missing: " + funs.map(function (f) { return f.name; }).join(", "));
                }
            }
            hex_1.setupFor = setupFor;
            function validateShim(funname, shimName, attrs, hasRet, argIsNumber) {
                if (shimName == "TD_ID" || shimName == "TD_NOOP" || shimName == "ENUM_GET")
                    return;
                if (pxtc.U.lookup(asmLabels, shimName))
                    return;
                var nm = funname + "(...) (shim=" + shimName + ")";
                var inf = lookupFunc(shimName);
                if (inf) {
                    if (!hasRet) {
                        if (inf.argsFmt[0] != "V")
                            pxtc.U.userError("expecting procedure for " + nm);
                    }
                    else {
                        if (inf.argsFmt[0] == "V")
                            pxtc.U.userError("expecting function for " + nm);
                    }
                    for (var i = 0; i < argIsNumber.length; ++i) {
                        var spec = inf.argsFmt[i + 1];
                        if (!spec)
                            pxtc.U.userError("excessive parameters passed to " + nm);
                    }
                    if (argIsNumber.length != inf.argsFmt.length - 1)
                        pxtc.U.userError("not enough arguments for " + nm + " (got " + argIsNumber.length + "; fmt=" + inf.argsFmt.join(",") + ")");
                }
                else {
                    pxtc.U.userError("function not found: " + nm);
                }
            }
            hex_1.validateShim = validateShim;
            function lookupFunc(name) {
                return funcInfo[name];
            }
            hex_1.lookupFunc = lookupFunc;
            function lookupFunctionAddr(name) {
                if (name == "_pxt_comm_base")
                    return hex_1.commBase;
                var inf = lookupFunc(name);
                if (inf)
                    return inf.value;
                return null;
            }
            hex_1.lookupFunctionAddr = lookupFunctionAddr;
            function hexTemplateHash() {
                var sha = hex_1.currentSetup ? hex_1.currentSetup.slice(0, 16) : "";
                while (sha.length < 16)
                    sha += "0";
                return sha.toUpperCase();
            }
            hex_1.hexTemplateHash = hexTemplateHash;
            function hexPrelude() {
                return "    .startaddr 0x" + hex_1.bytecodeStartAddrPadded.toString(16) + "\n";
            }
            hex_1.hexPrelude = hexPrelude;
            function hexBytes(bytes) {
                var chk = 0;
                var r = ":";
                bytes.forEach(function (b) { return chk += b; });
                bytes.push((-chk) & 0xff);
                bytes.forEach(function (b) { return r += ("0" + b.toString(16)).slice(-2); });
                return r.toUpperCase();
            }
            // constant strings in the binary are 4-byte aligned, and marked
            // with "@PXT@:" at the beginning - this 6 byte string needs to be
            // replaced with proper reference count (0xfffe to indicate read-only
            // flash location), string virtual table, and the length of the string
            function patchString(bytes) {
                var stringVT = [0xfe, 0xff, 0x01, 0x00];
                pxtc.assert(stringVT.length == 4);
                // @PXT
                if (!(bytes[0] == 0x40 && bytes[1] == 0x50 && bytes[2] == 0x58 && bytes[3] == 0x54))
                    pxtc.oops();
                // @:
                if (bytes[5] == 0x3a) {
                    var isString = false;
                    var isBuffer = false;
                    if (bytes[4] == 0x40)
                        isString = true;
                    else if (bytes[4] == 0x23)
                        isBuffer = true;
                    else
                        return null;
                    var vt = lookupFunctionAddr(isString ? "pxt::string_inline_ascii_vt" : "pxt::buffer_vt");
                    var headerBytes = new Uint8Array(6);
                    if (!vt)
                        pxtc.oops("missing vt: " + isString);
                    vt ^= 1;
                    if (vt & 3)
                        pxtc.oops("Unaligned vt: " + vt);
                    pxt.HF2.write32(headerBytes, 0, vt);
                    var len = 0;
                    if (isString)
                        while (6 + len < bytes.length) {
                            if (bytes[6 + len] == 0)
                                break;
                            len++;
                        }
                    if (6 + len >= bytes.length)
                        pxtc.U.oops("constant string too long!");
                    pxt.HF2.write16(headerBytes, 4, len);
                    return headerBytes;
                    //console.log("patch file: @" + addr + ": " + U.toHex(patchV))
                }
                return null;
            }
            function applyPatches(f, binfile) {
                if (binfile === void 0) { binfile = null; }
                var patchAt = function (b, i, readMore) {
                    // @PXT
                    if (b[i] == 0x40 && b[i + 1] == 0x50 && b[i + 2] == 0x58 && b[i + 3] == 0x54) {
                        return patchString(readMore());
                    }
                    return null;
                };
                if (binfile) {
                    var _loop_4 = function (i) {
                        var patchV = patchAt(binfile, i, function () { return binfile.slice(i, i + 200); });
                        if (patchV)
                            pxtc.U.memcpy(binfile, i, patchV);
                    };
                    for (var i = 0; i < binfile.length - 8; i += 4) {
                        _loop_4(i);
                    }
                }
                else {
                    for (var bidx = 0; bidx < f.blocks.length; ++bidx) {
                        var b = f.blocks[bidx];
                        var upper = f.ptrs[bidx] << 8;
                        var _loop_5 = function (i) {
                            var addr = upper + i - 32;
                            var patchV = patchAt(b, i, function () { return pxtc.UF2.readBytesFromFile(f, addr, 200); });
                            if (patchV)
                                pxtc.UF2.writeBytes(f, addr, patchV);
                        };
                        for (var i = 32; i < 32 + 256; i += 4) {
                            _loop_5(i);
                        }
                    }
                }
            }
            function applyHexPatches(myhex) {
                var marker = "40505854"; // @PXT
                for (var i = 0; i < myhex.length; ++i) {
                    var idx = myhex[i].indexOf(marker);
                    if (idx > 0) {
                        var off = (idx - 9) >> 1;
                        var bytes = readHex(myhex, i, off, 200);
                        var patch = patchString(bytes);
                        if (patch)
                            writeHex(myhex, i, off, patch);
                    }
                }
            }
            function writeHex(myhex, lineNo, offsetInLine, patch) {
                var src = 0;
                while (src < patch.length) {
                    var parsedLine = parseHexBytes(myhex[lineNo]);
                    parsedLine.pop(); // pop the checksum
                    if (parsedLine[3] == 0x00) {
                        // if data
                        var pos = 4 + offsetInLine;
                        var len = parsedLine.length - pos;
                        for (var i = 0; i < len; ++i)
                            if (src < patch.length)
                                parsedLine[pos++] = patch[src++];
                        myhex[lineNo] = hexBytes(parsedLine);
                    }
                    lineNo++;
                    offsetInLine = 0;
                }
            }
            function readHex(myhex, lineNo, offsetInLine, len) {
                var outp = [];
                while (outp.length < len) {
                    var b = parseHexBytes(myhex[lineNo]);
                    b.pop(); // pop the checksum
                    if (b[3] == 0x00) {
                        // if data
                        var data = b.slice(4 + offsetInLine);
                        pxtc.U.pushRange(outp, data);
                    }
                    lineNo++;
                    offsetInLine = 0;
                }
                return outp;
            }
            function patchHex(bin, buf, shortForm, useuf2) {
                var myhex = hex.slice(0, bytecodeStartIdx);
                var sizeEntry = (buf.length * 2 + 7) >> 3;
                pxtc.assert(sizeEntry < 64000, "program too large, bytes: " + buf.length * 2);
                // store the size of the program (in 64 bit words)
                buf[17] = sizeEntry;
                // store commSize
                buf[20] = bin.commSize;
                var zeros = [];
                for (var i = 0; i < bytecodePaddingSize >> 1; ++i)
                    zeros.push(0);
                buf = zeros.concat(buf);
                var ptr = 0;
                function nextLine(buf, addr) {
                    var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0];
                    for (var j = 0; j < 8; ++j) {
                        bytes.push((buf[ptr] || 0) & 0xff);
                        bytes.push((buf[ptr] || 0) >>> 8);
                        ptr++;
                    }
                    return bytes;
                }
                // 0x4210 is the version number matching pxt-microbit-core
                var hd = [0x4210, 0, hex_1.bytecodeStartAddrPadded & 0xffff, hex_1.bytecodeStartAddrPadded >>> 16];
                var tmp = hexTemplateHash();
                for (var i = 0; i < 4; ++i)
                    hd.push(parseInt(swapBytes(tmp.slice(i * 4, i * 4 + 4)), 16));
                var uf2 = useuf2 ? pxtc.UF2.newBlockFile(pxtc.target.uf2Family) : null;
                if (elfInfo) {
                    var prog = new Uint8Array(buf.length * 2);
                    for (var i = 0; i < buf.length; ++i) {
                        pxt.HF2.write16(prog, i * 2, buf[i]);
                    }
                    var resbuf = pxt.elf.patch(elfInfo, prog);
                    for (var i = 0; i < hd.length; ++i)
                        pxt.HF2.write16(resbuf, i * 2 + jmpStartAddr, hd[i]);
                    applyPatches(null, resbuf);
                    if (uf2) {
                        var bn = bin.options.name || "pxt";
                        bn = bn.replace(/[^a-zA-Z0-9\-\.]+/g, "_");
                        uf2.filename = "Projects/" + bn + ".elf";
                        pxtc.UF2.writeBytes(uf2, 0, resbuf);
                        return [pxtc.UF2.serializeFile(uf2)];
                    }
                    return [pxtc.U.uint8ArrayToString(resbuf)];
                }
                if (uf2) {
                    pxtc.UF2.writeHex(uf2, myhex);
                    applyPatches(uf2);
                    pxtc.UF2.writeBytes(uf2, jmpStartAddr, nextLine(hd, jmpStartIdx).slice(4));
                    if (bin.checksumBlock) {
                        var bytes = [];
                        for (var _i = 0, _a = bin.checksumBlock; _i < _a.length; _i++) {
                            var w = _a[_i];
                            bytes.push(w & 0xff, w >> 8);
                        }
                        pxtc.UF2.writeBytes(uf2, bin.target.flashChecksumAddr, bytes);
                    }
                }
                else {
                    applyHexPatches(myhex);
                    myhex[jmpStartIdx] = hexBytes(nextLine(hd, jmpStartAddr));
                    if (bin.checksumBlock) {
                        pxtc.U.oops("checksum block in HEX not implemented yet");
                    }
                }
                ptr = 0;
                if (shortForm)
                    myhex = [];
                var addr = bytecodeStartAddr;
                var upper = (addr - 16) >> 16;
                while (ptr < buf.length) {
                    if (uf2) {
                        pxtc.UF2.writeBytes(uf2, addr, nextLine(buf, addr).slice(4));
                    }
                    else {
                        if ((addr >> 16) != upper) {
                            upper = addr >> 16;
                            myhex.push(hexBytes([0x02, 0x00, 0x00, 0x04, upper >> 8, upper & 0xff]));
                        }
                        myhex.push(hexBytes(nextLine(buf, addr)));
                    }
                    addr += 16;
                }
                if (!shortForm) {
                    var app = hex.slice(bytecodeStartIdx);
                    if (uf2)
                        pxtc.UF2.writeHex(uf2, app);
                    else
                        pxtc.Util.pushRange(myhex, app);
                }
                if (bin.packedSource) {
                    if (uf2) {
                        addr = (uf2.currPtr + 0x1000) & ~0xff;
                        var buf_1 = new Uint8Array(256);
                        for (var ptr_1 = 0; ptr_1 < bin.packedSource.length; ptr_1 += 256) {
                            for (var i = 0; i < 256; ++i)
                                buf_1[i] = bin.packedSource.charCodeAt(ptr_1 + i);
                            pxtc.UF2.writeBytes(uf2, addr, buf_1, pxtc.UF2.UF2_FLAG_NOFLASH);
                            addr += 256;
                        }
                    }
                    else {
                        upper = 0x2000;
                        addr = 0;
                        myhex.push(hexBytes([0x02, 0x00, 0x00, 0x04, upper >> 8, upper & 0xff]));
                        for (var i = 0; i < bin.packedSource.length; i += 16) {
                            var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0];
                            for (var j = 0; j < 16; ++j) {
                                bytes.push((bin.packedSource.charCodeAt(i + j) || 0) & 0xff);
                            }
                            myhex.push(hexBytes(bytes));
                            addr += 16;
                        }
                    }
                }
                if (uf2)
                    return [pxtc.UF2.serializeFile(uf2)];
                else
                    return myhex;
            }
            hex_1.patchHex = patchHex;
        })(hex = pxtc.hex || (pxtc.hex = {}));
        function asmline(s) {
            if (s.indexOf("\n") >= 0) {
                s = s.replace(/^\s*/mg, "")
                    .replace(/^(.*)$/mg, function (l, x) {
                    if ((x[0] == ";" && x[1] == " ") || /:\*$/.test(x))
                        return x;
                    else
                        return "    " + x;
                });
                return s + "\n";
            }
            else {
                if (!/(^[\s;])|(:$)/.test(s))
                    s = "    " + s;
                return s + "\n";
            }
        }
        pxtc.asmline = asmline;
        function emitStrings(snippets, bin) {
            // ifaceMembers are already sorted alphabetically
            // here we make sure that the pointers to them are also sorted alphabetically
            // by emitting them in order and before everything else
            var keys = pxtc.U.unique(bin.ifaceMembers.concat(Object.keys(bin.strings)), function (s) { return s; });
            for (var _i = 0, keys_3 = keys; _i < keys_3.length; _i++) {
                var s = keys_3[_i];
                bin.otherLiterals.push(snippets.string_literal(bin.strings[s], s));
            }
            for (var _a = 0, _b = Object.keys(bin.doubles); _a < _b.length; _a++) {
                var data = _b[_a];
                var lbl = bin.doubles[data];
                bin.otherLiterals.push("\n.balign 4\n" + lbl + ": " + snippets.obj_header("pxt::number_vt") + "\n        .hex " + data + "\n");
            }
            for (var _c = 0, _d = Object.keys(bin.hexlits); _c < _d.length; _c++) {
                var data = _d[_c];
                bin.otherLiterals.push(snippets.hex_literal(bin.hexlits[data], data));
                bin.otherLiterals.push();
            }
        }
        function firstMethodOffset() {
            // 4 words header
            // 4 or 2 mem mgmt methods
            // 1 toString
            return 4 + 4 + 1;
        }
        pxtc.firstMethodOffset = firstMethodOffset;
        var primes = [
            21078089, 22513679, 15655169, 18636881, 19658081, 21486649, 21919277, 20041213, 20548751,
            16180187, 18361627, 19338023, 19772677, 16506547, 23530697, 22998697, 21225203, 19815283,
            23679599, 19822889, 21136133, 19540043, 21837031, 18095489, 23924267, 23434627, 22582379,
            21584111, 22615171, 23403001, 19640683, 19998031, 18460439, 20105387, 17595791, 16482043,
            23199959, 18881641, 21578371, 22765747, 20170273, 16547639, 16434589, 21435019, 20226751,
            19506731, 21454393, 23224541, 23431973, 23745511,
        ];
        pxtc.vtLookups = 3;
        function computeHashMultiplier(nums) {
            var shift = 32;
            pxtc.U.assert(pxtc.U.unique(nums, function (v) { return "" + v; }).length == nums.length, "non unique");
            for (var sz = 2;; sz = sz << 1) {
                shift--;
                if (sz < nums.length)
                    continue;
                var minColl = -1;
                var minMult = -1;
                var minArr = void 0;
                for (var _i = 0, primes_1 = primes; _i < primes_1.length; _i++) {
                    var mult0 = primes_1[_i];
                    var mult = (mult0 << 8) | shift;
                    var arr = new Uint16Array(sz + pxtc.vtLookups + 1);
                    pxtc.U.assert((arr.length & 1) == 0);
                    var numColl = 0;
                    var vals = [];
                    for (var _a = 0, nums_1 = nums; _a < nums_1.length; _a++) {
                        var n = nums_1[_a];
                        pxtc.U.assert(n > 0);
                        var k = Math.imul(n, mult) >>> shift;
                        vals.push(k);
                        var found = false;
                        for (var l = 0; l < pxtc.vtLookups; l++) {
                            if (!arr[k + l]) {
                                found = true;
                                arr[k + l] = n;
                                break;
                            }
                            numColl++;
                        }
                        if (!found) {
                            numColl = -1;
                            break;
                        }
                    }
                    if (minColl == -1 || minColl > numColl) {
                        minColl = numColl;
                        minMult = mult;
                        minArr = arr;
                    }
                }
                if (minColl >= 0) {
                    return {
                        mult: minMult,
                        mapping: minArr,
                        size: sz
                    };
                }
            }
        }
        pxtc.computeHashMultiplier = computeHashMultiplier;
        function vtableToAsm(info, opts, bin) {
            /*
            uint16_t numbytes;
            ValType objectType;
            uint8_t magic;
            PVoid *ifaceTable;
            BuiltInType classNo;
            uint16_t reserved;
            uint32_t ifaceHashMult;
            PVoid methods[2 or 4];
            */
            var ifaceInfo = computeHashMultiplier(info.itable.map(function (e) { return e.idx; }));
            //if (info.itable.length == 0)
            //    ifaceInfo.mult = 0
            var ptrSz = pxtc.target.shortPointers ? ".short" : ".word";
            var s = "\n        .balign " + (1 << opts.target.vtableShift) + "\n" + info.id + "_VT:\n        .short " + (info.allfields.length * 4 + 4) + "  ; size in bytes\n        .byte " + pxt.ValTypeObject + ", " + pxt.VTABLE_MAGIC + " ; magic\n        " + ptrSz + " " + info.id + "_IfaceVT\n        .short " + info.classNo + " ; class-id\n        .short 0 ; reserved\n        .word " + ifaceInfo.mult + " ; hash-mult\n";
            var addPtr = function (n) {
                if (n != "0")
                    n += "@fn";
                s += "        " + ptrSz + " " + n + "\n";
            };
            addPtr("pxt::RefRecord_destroy");
            addPtr("pxt::RefRecord_print");
            addPtr("pxt::RefRecord_scan");
            addPtr("pxt::RefRecord_gcsize");
            var toStr = info.toStringMethod;
            addPtr(toStr ? toStr.vtLabel() : "0");
            for (var _i = 0, _a = info.vtable; _i < _a.length; _i++) {
                var m = _a[_i];
                addPtr(m.label() + "_nochk");
            }
            // See https://makecode.microbit.org/15593-01779-41046-40599 for Thumb binary search.
            s += "\n        .balign " + (pxtc.target.shortPointers ? 2 : 4) + "\n" + info.id + "_IfaceVT:\n";
            var descSize = 8;
            var zeroOffset = ifaceInfo.mapping.length * 2;
            var descs = "";
            var offset = zeroOffset;
            var offsets = {};
            for (var _b = 0, _c = info.itable; _b < _c.length; _b++) {
                var e = _c[_b];
                offsets[e.idx + ""] = offset;
                descs += "  .short " + e.idx + ", " + e.info + " ; " + e.name + "\n";
                descs += "  .word " + (e.proc ? e.proc.vtLabel() + "@fn" : e.info) + "\n";
                offset += descSize;
                if (e.setProc) {
                    descs += "  .short " + e.idx + ", 0 ; set " + e.name + "\n";
                    descs += "  .word " + e.setProc.vtLabel() + "@fn\n";
                    offset += descSize;
                }
            }
            descs += "  .word 0, 0 ; the end\n";
            offset += descSize;
            var map = ifaceInfo.mapping;
            for (var i = 0; i < map.length; ++i) {
                bin.itEntries++;
                if (map[i])
                    bin.itFullEntries++;
            }
            // offsets are relative to the position in the array
            s += "  .short " + pxtc.U.toArray(map).map(function (e, i) { return (offsets[e + ""] || zeroOffset) - (i * 2); }).join(", ") + "\n";
            s += descs;
            s += "\n";
            return s;
        }
        pxtc.vtableToAsm = vtableToAsm;
        var systemPerfCounters = [
            "GC"
        ];
        function serialize(bin, opts) {
            var asmsource = "; start\n" + hex.hexPrelude() + "\n    .hex 708E3B92C615A841C49866C975EE5197 ; magic number\n    .hex " + hex.hexTemplateHash() + " ; hex template hash\n    .hex 0000000000000000 ; @SRCHASH@\n    .short " + bin.globalsWords + "   ; num. globals\n    .short 0 ; patched with number of 64 bit words resulting from assembly\n    .word _pxt_config_data\n    .short 0 ; patched with comm section size\n    .short " + bin.nonPtrGlobals + " ; number of globals that are not pointers (they come first)\n    .word _pxt_iface_member_names\n    .word _pxt_lambda_trampoline@fn\n    .word _pxt_perf_counters\n    .word _pxt_restore_exception_state@fn\n    .word " + bin.emitString(bin.getTitle()) + " ; name\n";
            var snippets = null;
            snippets = new pxtc.ThumbSnippets();
            var perfCounters = bin.setPerfCounters(systemPerfCounters);
            bin.procs.forEach(function (p) {
                var p2a = new pxtc.ProctoAssembler(snippets, bin, p);
                asmsource += "\n" + p2a.getAssembly() + "\n";
            });
            var helpers = new pxtc.ProctoAssembler(snippets, bin, null);
            helpers.emitHelpers();
            asmsource += "\n" + helpers.getAssembly() + "\n";
            asmsource += hex.asmTotalSource; // user-supplied asm
            asmsource += "_code_end:\n\n";
            pxtc.U.iterMap(bin.codeHelpers, function (code, lbl) {
                asmsource += "    .section code\n" + lbl + ":\n" + code + "\n";
            });
            asmsource += snippets.arithmetic();
            asmsource += "_helpers_end:\n\n";
            bin.usedClassInfos.forEach(function (info) {
                asmsource += vtableToAsm(info, opts, bin);
            });
            asmsource += "\n.balign 4\n_pxt_iface_member_names:\n";
            asmsource += "    .word " + bin.ifaceMembers.length + "\n";
            var idx = 0;
            for (var _i = 0, _a = bin.ifaceMembers; _i < _a.length; _i++) {
                var d = _a[_i];
                var lbl = bin.emitString(d);
                asmsource += "    .word " + lbl + "  ; " + idx++ + " ." + d + "\n";
            }
            asmsource += "    .word 0\n";
            asmsource += "_vtables_end:\n\n";
            asmsource += "\n.balign 4\n_pxt_config_data:\n";
            var cfg = bin.res.configData || [];
            // asmsource += `    .word ${cfg.length}, 0 ; num. entries`
            for (var _b = 0, cfg_1 = cfg; _b < cfg_1.length; _b++) {
                var d = cfg_1[_b];
                asmsource += "    .word " + d.key + ", " + d.value + "  ; " + d.name + "=" + d.value + "\n";
            }
            asmsource += "    .word 0\n\n";
            emitStrings(snippets, bin);
            asmsource += bin.otherLiterals.join("");
            asmsource += "\n.balign 4\n.section code\n_pxt_perf_counters:\n";
            asmsource += "    .word " + perfCounters.length + "\n";
            var strs = "";
            for (var i = 0; i < perfCounters.length; ++i) {
                var lbl = ".perf" + i;
                asmsource += "    .word " + lbl + "\n";
                strs += lbl + ": .string " + JSON.stringify(perfCounters[i]) + "\n";
            }
            asmsource += strs;
            asmsource += "_literals_end:\n";
            return asmsource;
        }
        function patchSrcHash(bin, src) {
            var sha = pxtc.U.sha256(src);
            bin.sourceHash = sha;
            return src.replace(/\n.*@SRCHASH@\n/, "\n    .hex " + sha.slice(0, 16).toUpperCase() + " ; program hash\n");
        }
        function processorInlineAssemble(target, src) {
            var b = mkProcessorFile(target);
            b.disablePeepHole = true;
            b.emit(src);
            throwAssemblerErrors(b);
            var res = [];
            for (var i = 0; i < b.buf.length; i += 2) {
                res.push((((b.buf[i + 1] || 0) << 16) | b.buf[i]) >>> 0);
            }
            return res;
        }
        pxtc.processorInlineAssemble = processorInlineAssemble;
        function mkProcessorFile(target) {
            var b;
            if (target.nativeType == pxtc.NATIVE_TYPE_VM)
                b = new pxtc.assembler.VMFile(new pxtc.vm.VmProcessor(target));
            else
                b = new pxtc.assembler.File(new pxtc.thumb.ThumbProcessor());
            b.ei.testAssembler(); // just in case
            if (target.switches.noPeepHole)
                b.disablePeepHole = true;
            b.lookupExternalLabel = hex.lookupFunctionAddr;
            b.normalizeExternalLabel = function (s) {
                var inf = hex.lookupFunc(s);
                if (inf)
                    return inf.name;
                return s;
            };
            // b.throwOnError = true;
            return b;
        }
        function throwAssemblerErrors(b) {
            if (b.errors.length > 0) {
                var userErrors_1 = "";
                b.errors.forEach(function (e) {
                    var m = /^user(\d+)/.exec(e.scope);
                    if (m) {
                        // This generally shouldn't happen, but it may for certin kind of global
                        // errors - jump range and label redefinitions
                        var no = parseInt(m[1]); // TODO lookup assembly file name
                        userErrors_1 += pxtc.U.lf("At inline assembly:\n");
                        userErrors_1 += e.message;
                    }
                });
                if (userErrors_1) {
                    //TODO
                    console.log(pxtc.U.lf("errors in inline assembly"));
                    console.log(userErrors_1);
                    throw new Error(b.errors[0].message);
                }
                else {
                    throw new Error(b.errors[0].message);
                }
            }
        }
        var peepDbg = false;
        function assemble(target, bin, src) {
            var b = mkProcessorFile(target);
            b.emit(src);
            src = "; Interface tables: " + bin.itFullEntries + "/" + bin.itEntries + " (" + Math.round(100 * bin.itFullEntries / bin.itEntries) + "%)\n" +
                ("; Virtual methods: " + bin.numVirtMethods + " / " + bin.numMethods + "\n") +
                b.getSource(!peepDbg, bin.numStmts, target.flashEnd);
            throwAssemblerErrors(b);
            return {
                src: src,
                buf: b.buf,
                thumbFile: b
            };
        }
        pxtc.assemble = assemble;
        function addSource(blob) {
            var res = "";
            for (var i = 0; i < blob.length; ++i) {
                var v = blob.charCodeAt(i) & 0xff;
                if (v <= 0xf)
                    res += "0" + v.toString(16);
                else
                    res += v.toString(16);
            }
            return "\n    .balign 16\n_stored_program: .hex " + res + "\n";
        }
        function packSource(meta, binstring) {
            var metablob = pxtc.Util.toUTF8(meta);
            var totallen = metablob.length + binstring.length;
            var res = "\x41\x14\x0E\x2F\xB8\x2F\xA2\xBB";
            res += pxtc.U.uint8ArrayToString([
                metablob.length & 0xff, metablob.length >> 8,
                binstring.length & 0xff, binstring.length >> 8,
                0, 0, 0, 0
            ]);
            res += metablob;
            res += binstring;
            if (res.length % 2)
                res += "\x00";
            return res;
        }
        function processorEmit(bin, opts, cres) {
            var src = serialize(bin, opts);
            src = patchSrcHash(bin, src);
            var sourceAtTheEnd = false;
            if (opts.embedBlob) {
                bin.packedSource = packSource(opts.embedMeta, ts.pxtc.decodeBase64(opts.embedBlob));
                // TODO more dynamic check for source size
                if (!bin.target.noSourceInFlash && bin.packedSource.length < 40000) {
                    src += addSource(bin.packedSource);
                    bin.packedSource = null; // no need to append anymore
                }
            }
            var checksumWords = 8;
            var pageSize = hex.flashCodeAlign(opts.target);
            if (opts.target.flashChecksumAddr) {
                var k = 0;
                while (pageSize > (1 << k))
                    k++;
                var endMarker = parseInt(bin.sourceHash.slice(0, 8), 16);
                var progStart = hex.bytecodeStartAddrPadded / pageSize;
                endMarker = (endMarker & 0xffffff00) | k;
                var templBeg = 0;
                var templSize = progStart;
                // we exclude the checksum block from the template
                if (opts.target.flashChecksumAddr < hex.bytecodeStartAddrPadded) {
                    templBeg = Math.ceil((opts.target.flashChecksumAddr + 32) / pageSize);
                    templSize -= templBeg;
                }
                src += "\n    .balign 4\n__end_marker:\n    .word " + endMarker + "\n\n; ------- this will get removed from the final binary ------\n__flash_checksums:\n    .word 0x87eeb07c ; magic\n    .word __end_marker ; end marker position\n    .word " + endMarker + " ; end marker\n    ; template region\n    .short " + templBeg + ", " + templSize + "\n    .word 0x" + hex.hexTemplateHash().slice(0, 8) + "\n    ; user region\n    .short " + progStart + ", 0xffff\n    .word 0x" + bin.sourceHash.slice(0, 8) + "\n    .word 0x0 ; terminator\n";
            }
            bin.writeFile(pxtc.BINARY_ASM, src);
            var res = assemble(opts.target, bin, src);
            if (res.thumbFile.commPtr)
                bin.commSize = res.thumbFile.commPtr - hex.commBase;
            if (res.src)
                bin.writeFile(pxtc.BINARY_ASM, res.src);
            var cfg = cres.configData || [];
            // When BOOTLOADER_BOARD_ID is present in project, it means it's meant as configuration
            // for bootloader. Spit out config.c file in that case, so it can be included in bootloader.
            if (cfg.some(function (e) { return e.name == "BOOTLOADER_BOARD_ID"; })) {
                var c = "const uint32_t configData[] = {\n";
                c += "    0x1e9e10f1, 0x20227a79, // magic\n";
                c += "    " + cfg.length + ", 0, // num. entries; reserved\n";
                for (var _i = 0, cfg_2 = cfg; _i < cfg_2.length; _i++) {
                    var e = cfg_2[_i];
                    c += "    " + e.key + ", 0x" + e.value.toString(16) + ", // " + e.name + "\n";
                }
                c += "    0, 0\n};\n";
                bin.writeFile("config.c", c);
            }
            if (res.buf) {
                if (opts.target.flashChecksumAddr) {
                    var pos = res.thumbFile.lookupLabel("__flash_checksums") / 2;
                    pxtc.U.assert(pos == res.buf.length - checksumWords * 2);
                    var chk = res.buf.slice(res.buf.length - checksumWords * 2);
                    res.buf.splice(res.buf.length - checksumWords * 2, checksumWords * 2);
                    var len = Math.ceil(res.buf.length * 2 / pageSize);
                    chk[chk.length - 5] = len;
                    bin.checksumBlock = chk;
                }
                if (!pxt.isOutputText(pxtc.target)) {
                    var myhex = ts.pxtc.encodeBase64(hex.patchHex(bin, res.buf, false, !!pxtc.target.useUF2)[0]);
                    bin.writeFile(pxt.outputName(pxtc.target), myhex);
                }
                else {
                    var myhex = hex.patchHex(bin, res.buf, false, false).join("\r\n") + "\r\n";
                    bin.writeFile(pxt.outputName(pxtc.target), myhex);
                }
            }
            for (var _a = 0, _b = cres.breakpoints; _a < _b.length; _a++) {
                var bkpt = _b[_a];
                var lbl = pxtc.U.lookup(res.thumbFile.getLabels(), "__brkp_" + bkpt.id);
                if (lbl != null)
                    bkpt.binAddr = lbl;
            }
            for (var _c = 0, _d = bin.procs; _c < _d.length; _c++) {
                var proc = _d[_c];
                proc.fillDebugInfo(res.thumbFile);
            }
            cres.procDebugInfo = bin.procs.map(function (p) { return p.debugInfo; });
        }
        pxtc.processorEmit = processorEmit;
        pxtc.validateShim = hex.validateShim;
        function f4EncodeImg(w, h, bpp, getPix) {
            var header = [
                0x87, bpp,
                w & 0xff, w >> 8,
                h & 0xff, h >> 8,
                0, 0
            ];
            var r = header.map(hex2).join("");
            var ptr = 4;
            var curr = 0;
            var shift = 0;
            var pushBits = function (n) {
                curr |= n << shift;
                if (shift == 8 - bpp) {
                    r += hex2(curr);
                    ptr++;
                    curr = 0;
                    shift = 0;
                }
                else {
                    shift += bpp;
                }
            };
            for (var i = 0; i < w; ++i) {
                for (var j = 0; j < h; ++j)
                    pushBits(getPix(i, j));
                while (shift != 0)
                    pushBits(0);
                if (bpp > 1) {
                    while (ptr & 3)
                        pushBits(0);
                }
            }
            return r;
            function hex2(n) {
                return ("0" + n.toString(16)).slice(-2);
            }
        }
        pxtc.f4EncodeImg = f4EncodeImg;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var LSHost = /** @class */ (function () {
            function LSHost(p) {
                this.p = p;
            }
            LSHost.prototype.getCompilationSettings = function () {
                var opts = this.p.getCompilerOptions();
                opts.noLib = true;
                return opts;
            };
            LSHost.prototype.getNewLine = function () { return "\n"; };
            LSHost.prototype.getScriptFileNames = function () {
                return this.p.getSourceFiles().map(function (f) { return f.fileName; });
            };
            LSHost.prototype.getScriptVersion = function (fileName) {
                return "0";
            };
            LSHost.prototype.getScriptSnapshot = function (fileName) {
                var f = this.p.getSourceFile(fileName);
                return {
                    getLength: function () { return f.getFullText().length; },
                    getText: function () { return f.getFullText(); },
                    getChangeRange: function () { return undefined; }
                };
            };
            LSHost.prototype.getCurrentDirectory = function () { return "."; };
            LSHost.prototype.getDefaultLibFileName = function (options) { return ""; };
            LSHost.prototype.useCaseSensitiveFileNames = function () { return true; };
            return LSHost;
        }());
        pxtc.LSHost = LSHost;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var reportDiagnostic = reportDiagnosticSimply;
        function reportDiagnostics(diagnostics) {
            for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
                var diagnostic = diagnostics_1[_i];
                reportDiagnostic(diagnostic);
            }
        }
        function reportDiagnosticSimply(diagnostic) {
            var output = getDiagnosticString(diagnostic);
            ts.sys.write(output);
        }
        function getDiagnosticString(diagnostic) {
            var ksDiagnostic;
            if (isTsDiagnostic(diagnostic)) {
                // convert ts.Diagnostic to KsDiagnostic
                var tsDiag = diagnostic;
                var _a = ts.getLineAndCharacterOfPosition(tsDiag.file, tsDiag.start), line = _a.line, character = _a.character;
                var relativeFileName = tsDiag.file.fileName;
                ksDiagnostic = Object.assign({
                    fileName: relativeFileName,
                    line: line,
                    column: character
                }, tsDiag);
            }
            else {
                ksDiagnostic = Object.assign({
                    fileName: undefined,
                    line: undefined,
                    column: undefined
                }, diagnostic);
            }
            return getDiagnosticStringHelper(ksDiagnostic);
        }
        pxtc.getDiagnosticString = getDiagnosticString;
        function getDiagnosticStringHelper(diagnostic) {
            var output = "";
            if (diagnostic.fileName) {
                output += diagnostic.fileName + "(" + (diagnostic.line + 1) + "," + (diagnostic.column + 1) + "): ";
            }
            var nl = ts.sys ? ts.sys.newLine : "\n";
            var category = pxtc.DiagnosticCategory[diagnostic.category].toLowerCase();
            output += category + " TS" + diagnostic.code + ": " + pxtc.flattenDiagnosticMessageText(diagnostic.messageText, nl) + nl;
            return output;
        }
        function isTsDiagnostic(a) {
            return pxtc.DiagnosticCategory.file != undefined;
        }
        function plainTscCompileDir(dir) {
            var commandLine = ts.parseCommandLine([]);
            var configFileName = ts.findConfigFile(dir, ts.sys.fileExists);
            var configParseResult = parseConfigFile();
            var program = plainTscCompileFiles(configParseResult.fileNames, configParseResult.options);
            var diagnostics = getProgramDiagnostics(program);
            diagnostics.forEach(reportDiagnostic);
            return program;
            function parseConfigFile() {
                var cachedConfigFileText = ts.sys.readFile(configFileName);
                var result = ts.parseConfigFileTextToJson(configFileName, cachedConfigFileText);
                var configObject = result.config;
                if (!configObject) {
                    reportDiagnostics([result.error]);
                    ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                    return undefined;
                }
                var configParseResult = ts.parseJsonConfigFileContent(configObject, ts.sys, dir, commandLine.options, configFileName);
                if (configParseResult.errors.length > 0) {
                    reportDiagnostics(configParseResult.errors);
                    ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                    return undefined;
                }
                return configParseResult;
            }
        }
        pxtc.plainTscCompileDir = plainTscCompileDir;
        function plainTscCompileFiles(fileNames, compilerOpts) {
            var compilerHost = ts.createCompilerHost(compilerOpts);
            compilerHost.getDefaultLibFileName = function () { return "node_modules/typescript/lib/lib.d.ts"; };
            var prog = ts.createProgram(fileNames, compilerOpts, compilerHost);
            return prog;
            //const emitOutput = program.emit();
            //diagnostics = diagnostics.concat(emitOutput.diagnostics);
        }
        pxtc.plainTscCompileFiles = plainTscCompileFiles;
        function getProgramDiagnostics(program) {
            var diagnostics = program.getSyntacticDiagnostics();
            if (diagnostics.length === 0) {
                diagnostics = program.getOptionsDiagnostics().concat(pxtc.Util.toArray(program.getGlobalDiagnostics()));
                if (diagnostics.length === 0) {
                    diagnostics = program.getSemanticDiagnostics();
                }
            }
            return diagnostics;
        }
        pxtc.getProgramDiagnostics = getProgramDiagnostics;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.placeholderChar = "◊";
        pxtc.defaultImgLit = "\n. . . . .\n. . . . .\n. . # . .\n. . . . .\n. . . . .\n";
        pxtc.ts2PyFunNameMap = {
            "Math.trunc": { n: "int", t: ts.SyntaxKind.NumberKeyword },
            "Math.min": { n: "min", t: ts.SyntaxKind.NumberKeyword },
            "Math.max": { n: "max", t: ts.SyntaxKind.NumberKeyword },
            "Math.abs": { n: "abs", t: ts.SyntaxKind.NumberKeyword },
            "Math.randomRange": { n: "randint", t: ts.SyntaxKind.NumberKeyword },
            "console.log": { n: "print", t: ts.SyntaxKind.VoidKeyword },
            ".length": { n: "len", t: ts.SyntaxKind.NumberKeyword },
            ".toLowerCase()": { n: "string.lower", t: ts.SyntaxKind.StringKeyword },
            ".toUpperCase()": { n: "string.upper", t: ts.SyntaxKind.StringKeyword },
            ".charCodeAt(0)": { n: "ord", t: ts.SyntaxKind.NumberKeyword },
            "pins.createBuffer": { n: "bytearray", t: ts.SyntaxKind.Unknown },
            "pins.createBufferFromArray": { n: "bytes", t: ts.SyntaxKind.Unknown },
            "control.createBuffer": { n: "bytearray", t: ts.SyntaxKind.Unknown },
            "control.createBufferFromArray": { n: "bytes", t: ts.SyntaxKind.Unknown },
            "!!": { n: "bool", t: ts.SyntaxKind.BooleanKeyword },
            ".indexOf": { n: "Array.index", t: ts.SyntaxKind.NumberKeyword },
            "parseInt": { n: "int", t: ts.SyntaxKind.NumberKeyword }
        };
        function renderDefaultVal(apis, p, imgLit, cursorMarker) {
            if (p.initializer)
                return p.initializer;
            if (p.default)
                return p.default;
            if (p.type == "number")
                return "0";
            if (p.type == "boolean")
                return "false";
            else if (p.type == "string") {
                if (imgLit) {
                    imgLit = false;
                    return "`" + pxtc.defaultImgLit + cursorMarker + "`";
                }
                return "\"" + cursorMarker + "\"";
            }
            var si = apis ? pxtc.Util.lookup(apis.byQName, p.type) : undefined;
            if (si && si.kind == 6 /* Enum */) {
                var en = pxtc.Util.values(apis.byQName).filter(function (e) { return e.namespace == p.type; })[0];
                if (en)
                    return en.namespace + "." + en.name;
            }
            var m = /^\((.*)\) => (.*)$/.exec(p.type);
            if (m)
                return "(" + m[1] + ") => {\n    " + cursorMarker + "\n}";
            return pxtc.placeholderChar;
        }
        function renderCall(apiInfo, si) {
            return si.namespace + "." + si.name + renderParameters(apiInfo, si) + ";";
        }
        pxtc.renderCall = renderCall;
        function renderParameters(apis, si, cursorMarker) {
            if (cursorMarker === void 0) { cursorMarker = ''; }
            if (si.parameters) {
                var imgLit_1 = !!si.attributes.imageLiteral;
                return "(" + si.parameters
                    .filter(function (p) { return !p.initializer; })
                    .map(function (p) { return renderDefaultVal(apis, p, imgLit_1, cursorMarker); }).join(", ") + ")";
            }
            return '';
        }
        pxtc.renderParameters = renderParameters;
        function snakify(s) {
            var up = s.toUpperCase();
            var lo = s.toLowerCase();
            // if the name is all lowercase or all upper case don't do anything
            if (s == up || s == lo)
                return s;
            // if the name already has underscores (not as first character), leave it alone
            if (s.lastIndexOf("_") > 0)
                return s;
            var isUpper = function (i) { return s[i] != lo[i]; };
            var isLower = function (i) { return s[i] != up[i]; };
            //const isDigit = (i: number) => /\d/.test(s[i])
            var r = "";
            var i = 0;
            while (i < s.length) {
                var upperMode = isUpper(i);
                var j = i;
                while (j < s.length) {
                    if (upperMode && isLower(j)) {
                        // ABCd -> AB_Cd
                        if (j - i > 2) {
                            j--;
                            break;
                        }
                        else {
                            // ABdefQ -> ABdef_Q
                            upperMode = false;
                        }
                    }
                    // abcdE -> abcd_E
                    if (!upperMode && isUpper(j)) {
                        break;
                    }
                    j++;
                }
                if (r)
                    r += "_";
                r += s.slice(i, j);
                i = j;
            }
            return r;
        }
        pxtc.snakify = snakify;
        function emitType(s) {
            if (!s || !s.kind)
                return null;
            switch (s.kind) {
                case ts.SyntaxKind.StringKeyword:
                    return "str";
                case ts.SyntaxKind.NumberKeyword:
                    // Note, "real" python expects this to be "float" or "int", we're intentionally diverging here
                    return "number";
                case ts.SyntaxKind.BooleanKeyword:
                    return "bool";
                case ts.SyntaxKind.VoidKeyword:
                    return "None";
                case ts.SyntaxKind.FunctionType:
                    return emitFuncType(s);
                case ts.SyntaxKind.ArrayType: {
                    var t = s;
                    var elType = emitType(t.elementType);
                    return "List[" + elType + "]";
                }
                case ts.SyntaxKind.TypeReference: {
                    var t = s;
                    var nm = t.typeName && t.typeName.getText ? t.typeName.getText() : t.typeName;
                    return "" + nm;
                }
                default:
                    pxt.tickEvent("depython.todo", { kind: s.kind });
                    return "(TODO: Unknown TypeNode kind: " + s.kind + ")";
            }
            // // TODO translate type
            // return s.getText()
        }
        pxtc.emitType = emitType;
        function emitFuncType(s) {
            var returnType = emitType(s.type);
            var params = s.parameters
                .map(function (p) { return p.type; }) // python type syntax doesn't allow names
                .map(emitType);
            // "Real" python expects this to be "Callable[[arg1, arg2], ret]", we're intentionally changing to "(arg1, arg2) -> ret"
            return "(" + params.join(", ") + ") -> " + returnType;
        }
        function getSymbolKind(node) {
            switch (node.kind) {
                case pxtc.SK.MethodDeclaration:
                case pxtc.SK.MethodSignature:
                    return 1 /* Method */;
                case pxtc.SK.PropertyDeclaration:
                case pxtc.SK.PropertySignature:
                case pxtc.SK.GetAccessor:
                case pxtc.SK.SetAccessor:
                    return 2 /* Property */;
                case pxtc.SK.Constructor:
                case pxtc.SK.FunctionDeclaration:
                    return 3 /* Function */;
                case pxtc.SK.VariableDeclaration:
                    return 4 /* Variable */;
                case pxtc.SK.ModuleDeclaration:
                    return 5 /* Module */;
                case pxtc.SK.EnumDeclaration:
                    return 6 /* Enum */;
                case pxtc.SK.EnumMember:
                    return 7 /* EnumMember */;
                case pxtc.SK.ClassDeclaration:
                    return 8 /* Class */;
                case pxtc.SK.InterfaceDeclaration:
                    return 9 /* Interface */;
                default:
                    return 0 /* None */;
            }
        }
        function isExported(decl) {
            if (decl.modifiers && decl.modifiers.some(function (m) { return m.kind == pxtc.SK.PrivateKeyword || m.kind == pxtc.SK.ProtectedKeyword; }))
                return false;
            var symbol = decl.symbol;
            if (!symbol)
                return false;
            while (true) {
                var parSymbol = symbol.parent;
                if (parSymbol)
                    symbol = parSymbol;
                else
                    break;
            }
            var topDecl = symbol.valueDeclaration || symbol.declarations[0];
            if (topDecl.kind == pxtc.SK.VariableDeclaration)
                topDecl = topDecl.parent.parent;
            if (topDecl.parent && topDecl.parent.kind == pxtc.SK.SourceFile)
                return true;
            else
                return false;
        }
        function isReadonly(decl) {
            return decl.modifiers && decl.modifiers.some(function (m) { return m.kind == pxtc.SK.ReadonlyKeyword; });
        }
        function createSymbolInfo(typechecker, qName, stmt) {
            function typeOf(tn, n, stripParams) {
                if (stripParams === void 0) { stripParams = false; }
                var t = typechecker.getTypeAtLocation(n);
                if (!t)
                    return "None";
                if (stripParams) {
                    t = t.getCallSignatures()[0].getReturnType();
                }
                var readableName = typechecker.typeToString(t, undefined, ts.TypeFormatFlags.UseFullyQualifiedType);
                // TypeScript 2.0.0+ will assign constant variables numeric literal types which breaks the
                // type checking we do in the blocks
                // This can be a number literal '7' or a union type of them '0 | 1 | 2'
                if (/^\d/.test(readableName)) {
                    return "number";
                }
                if (readableName == "this") {
                    return getFullName(typechecker, t.symbol);
                }
                return readableName;
            }
            var kind = getSymbolKind(stmt);
            if (kind != 0 /* None */) {
                var decl = stmt;
                var attributes_2 = pxtc.parseComments(decl);
                if (attributes_2.weight < 0)
                    return null;
                var m = /^(.*)\.(.*)/.exec(qName);
                var hasParams = kind == 3 /* Function */ || kind == 1 /* Method */;
                var pkg = null;
                var src = ts.getSourceFileOfNode(stmt);
                if (src) {
                    var m_1 = /^pxt_modules\/([^\/]+)/.exec(src.fileName);
                    if (m_1)
                        pkg = m_1[1];
                }
                var extendsTypes = undefined;
                if (kind == 8 /* Class */ || kind == 9 /* Interface */) {
                    var cl = stmt;
                    extendsTypes = [];
                    if (cl.heritageClauses)
                        for (var _i = 0, _a = cl.heritageClauses; _i < _a.length; _i++) {
                            var h = _a[_i];
                            if (h.types) {
                                for (var _b = 0, _c = h.types; _b < _c.length; _b++) {
                                    var t = _c[_b];
                                    extendsTypes.push(typeOf(t, t));
                                }
                            }
                        }
                }
                if (kind == 6 /* Enum */ || kind === 7 /* EnumMember */) {
                    (extendsTypes || (extendsTypes = [])).push("Number");
                }
                var r = {
                    kind: kind,
                    qName: qName,
                    namespace: m ? m[1] : "",
                    name: m ? m[2] : qName,
                    fileName: stmt.getSourceFile().fileName,
                    attributes: attributes_2,
                    pkg: pkg,
                    extendsTypes: extendsTypes,
                    retType: stmt.kind == ts.SyntaxKind.Constructor ? "void" :
                        kind == 5 /* Module */ ? "" :
                            typeOf(decl.type, decl, hasParams),
                    parameters: !hasParams ? null : pxtc.Util.toArray(decl.parameters).map(function (p, i) {
                        var n = pxtc.getName(p);
                        var desc = attributes_2.paramHelp[n] || "";
                        var minVal = attributes_2.paramMin && attributes_2.paramMin[n];
                        var maxVal = attributes_2.paramMax && attributes_2.paramMax[n];
                        var m = /\beg\.?:\s*(.+)/.exec(desc);
                        var props;
                        var parameters;
                        if (p.type && p.type.kind === pxtc.SK.FunctionType) {
                            var callBackSignature = typechecker.getSignatureFromDeclaration(p.type);
                            var callbackParameters_1 = callBackSignature.getParameters();
                            if (attributes_2.mutate === "objectdestructuring") {
                                pxtc.assert(callbackParameters_1.length > 0);
                                props = typechecker.getTypeAtLocation(callbackParameters_1[0].valueDeclaration).getProperties().map(function (prop) {
                                    return { name: prop.getName(), type: typechecker.typeToString(typechecker.getTypeOfSymbolAtLocation(prop, callbackParameters_1[0].valueDeclaration)) };
                                });
                            }
                            else {
                                parameters = callbackParameters_1.map(function (sym, i) {
                                    return {
                                        name: sym.getName(),
                                        type: typechecker.typeToString(typechecker.getTypeOfSymbolAtLocation(sym, p))
                                    };
                                });
                            }
                        }
                        var options = {};
                        var paramType = typechecker.getTypeAtLocation(p);
                        var isEnum = paramType && !!(paramType.flags & (ts.TypeFlags.Enum | ts.TypeFlags.EnumLiteral));
                        if (attributes_2.block && attributes_2.paramShadowOptions) {
                            var argNames_1 = [];
                            attributes_2.block.replace(/%(\w+)/g, function (f, n) {
                                argNames_1.push(n);
                                return "";
                            });
                            if (attributes_2.paramShadowOptions[argNames_1[i]]) {
                                options['fieldEditorOptions'] = { value: attributes_2.paramShadowOptions[argNames_1[i]] };
                            }
                        }
                        if (minVal)
                            options['min'] = { value: minVal };
                        if (maxVal)
                            options['max'] = { value: maxVal };
                        return {
                            name: n,
                            description: desc,
                            type: typeOf(p.type, p),
                            pyTypeString: emitType(p.type),
                            initializer: p.initializer ? p.initializer.getText() :
                                pxtc.getExplicitDefault(attributes_2, n) ||
                                    (p.questionToken ? "undefined" : undefined),
                            default: attributes_2.paramDefl[n],
                            properties: props,
                            handlerParameters: parameters,
                            options: options,
                            isEnum: isEnum
                        };
                    }),
                    snippet: ts.isFunctionLike(stmt) ? null : undefined
                };
                switch (r.kind) {
                    case 7 /* EnumMember */:
                        r.pyName = snakify(r.name).toUpperCase();
                        break;
                    case 4 /* Variable */:
                    case 1 /* Method */:
                    case 2 /* Property */:
                    case 3 /* Function */:
                        r.pyName = snakify(r.name).toLowerCase();
                        break;
                    case 6 /* Enum */:
                    case 8 /* Class */:
                    case 9 /* Interface */:
                    case 5 /* Module */:
                    default:
                        r.pyName = r.name;
                        break;
                }
                if (stmt.kind === pxtc.SK.GetAccessor ||
                    ((stmt.kind === pxtc.SK.PropertyDeclaration || stmt.kind === pxtc.SK.PropertySignature) && isReadonly(stmt))) {
                    r.isReadOnly = true;
                }
                return r;
            }
            return null;
        }
        function genDocs(pkg, apiInfo, options) {
            if (options === void 0) { options = {}; }
            pxt.debug("generating docs for " + pkg);
            pxt.debug(JSON.stringify(Object.keys(apiInfo.byQName), null, 2));
            var files = {};
            var infos = pxtc.Util.values(apiInfo.byQName);
            var enumMembers = infos.filter(function (si) { return si.kind == 7 /* EnumMember */; })
                .sort(compareSymbols);
            var snippetStrings = {};
            var locStrings = {};
            var jsdocStrings = {};
            var writeLoc = function (si) {
                if (!options.locs || !si.qName) {
                    return;
                }
                if (/^__/.test(si.name))
                    return; // skip functions starting with __
                pxt.debug("loc: " + si.qName);
                // must match blockly loader
                if (si.kind != 7 /* EnumMember */) {
                    var ns = ts.pxtc.blocksCategory(si);
                    if (ns)
                        locStrings["{id:category}" + ns] = ns;
                }
                if (si.attributes.jsDoc)
                    jsdocStrings[si.qName] = si.attributes.jsDoc;
                if (si.attributes.block)
                    locStrings[si.qName + "|block"] = si.attributes.block;
                if (si.attributes.group)
                    locStrings["{id:group}" + si.attributes.group] = si.attributes.group;
                if (si.attributes.subcategory)
                    locStrings["{id:subcategory}" + si.attributes.subcategory] = si.attributes.subcategory;
                if (si.parameters)
                    si.parameters.filter(function (pi) { return !!pi.description; }).forEach(function (pi) {
                        jsdocStrings[si.qName + "|param|" + pi.name] = pi.description;
                    });
            };
            var mapLocs = function (m, name) {
                if (!options.locs)
                    return;
                var locs = {};
                Object.keys(m).sort().forEach(function (l) { return locs[l] = m[l]; });
                files[pkg + name + "-strings.json"] = JSON.stringify(locs, null, 2);
            };
            var _loop_6 = function (info) {
                var isNamespace = info.kind == 5 /* Module */;
                if (isNamespace) {
                    if (!infos.filter(function (si) { return si.namespace == info.name && !!si.attributes.jsDoc; })[0])
                        return "continue"; // nothing in namespace
                    if (!info.attributes.block)
                        info.attributes.block = info.name; // reusing this field to store localized namespace name
                }
                writeLoc(info);
            };
            for (var _i = 0, infos_1 = infos; _i < infos_1.length; _i++) {
                var info = infos_1[_i];
                _loop_6(info);
            }
            if (options.locs)
                enumMembers.forEach(function (em) {
                    if (em.attributes.block)
                        locStrings[em.qName + "|block"] = em.attributes.block;
                    if (em.attributes.jsDoc)
                        locStrings[em.qName] = em.attributes.jsDoc;
                });
            mapLocs(locStrings, "");
            mapLocs(jsdocStrings, "-jsdoc");
            // Localize pxtsnippets.json files
            if (options.pxtsnippet) {
                options.pxtsnippet.forEach(function (snippet) { return localizeSnippet(snippet, snippetStrings); });
                mapLocs(snippetStrings, "-snippet");
            }
            return files;
        }
        pxtc.genDocs = genDocs;
        function localizeSnippet(snippet, locs) {
            var localizableQuestionProperties = ['label', 'title', 'hint', 'errorMessage']; // TODO(jb) provide this elsewhere
            locs[snippet.label] = snippet.label;
            snippet.questions.forEach(function (question) {
                localizableQuestionProperties.forEach(function (prop) {
                    if (question[prop]) {
                        locs[question[prop]] = question[prop];
                    }
                });
            });
        }
        function hasBlock(sym) {
            return !!sym.attributes.block && !!sym.attributes.blockId;
        }
        pxtc.hasBlock = hasBlock;
        var symbolKindWeight;
        function compareSymbols(l, r) {
            var c = -(hasBlock(l) ? 1 : -1) + (hasBlock(r) ? 1 : -1);
            if (c)
                return c;
            if (!symbolKindWeight) {
                symbolKindWeight = {};
                symbolKindWeight[4 /* Variable */] = 100;
                symbolKindWeight[5 /* Module */] = 101;
                symbolKindWeight[3 /* Function */] = 99;
                symbolKindWeight[2 /* Property */] = 98;
                symbolKindWeight[1 /* Method */] = 97;
                symbolKindWeight[8 /* Class */] = 89;
                symbolKindWeight[6 /* Enum */] = 81;
                symbolKindWeight[7 /* EnumMember */] = 80;
            }
            // favor functions
            c = -(symbolKindWeight[l.kind] || 0) + (symbolKindWeight[r.kind] || 0);
            if (c)
                return c;
            c = -(l.attributes.weight || 50) + (r.attributes.weight || 50);
            if (c)
                return c;
            return pxtc.U.strcmp(l.name, r.name);
        }
        pxtc.compareSymbols = compareSymbols;
        function getApiInfo(program, jres, legacyOnly) {
            if (legacyOnly === void 0) { legacyOnly = false; }
            return internalGetApiInfo(program, jres, legacyOnly).apis;
        }
        pxtc.getApiInfo = getApiInfo;
        function internalGetApiInfo(program, jres, legacyOnly) {
            if (legacyOnly === void 0) { legacyOnly = false; }
            var res = {
                byQName: {},
                jres: jres
            };
            var qNameToNode = {};
            var typechecker = program.getTypeChecker();
            var collectDecls = function (stmt) {
                if (stmt.kind == pxtc.SK.VariableStatement) {
                    var vs = stmt;
                    vs.declarationList.declarations.forEach(collectDecls);
                    return;
                }
                if (isExported(stmt)) {
                    if (!stmt.symbol) {
                        console.warn("no symbol", stmt);
                        return;
                    }
                    var qName = getFullName(typechecker, stmt.symbol);
                    if (stmt.kind == pxtc.SK.SetAccessor)
                        qName += "@set"; // otherwise we get a clash with the getter
                    qNameToNode[qName] = stmt;
                    var si_1 = createSymbolInfo(typechecker, qName, stmt);
                    if (si_1) {
                        var existing = pxtc.U.lookup(res.byQName, qName);
                        if (existing) {
                            // we can have a function and an interface of the same name
                            if (existing.kind == 9 /* Interface */ && si_1.kind != 9 /* Interface */) {
                                // save existing entry
                                res.byQName[qName + "@type"] = existing;
                            }
                            else if (existing.kind != 9 /* Interface */ && si_1.kind == 9 /* Interface */) {
                                res.byQName[qName + "@type"] = si_1;
                                si_1 = existing;
                            }
                            else {
                                si_1.attributes = pxtc.parseCommentString(existing.attributes._source + "\n" +
                                    si_1.attributes._source);
                                if (existing.extendsTypes) {
                                    si_1.extendsTypes = si_1.extendsTypes || [];
                                    existing.extendsTypes.forEach(function (t) {
                                        if (si_1.extendsTypes.indexOf(t) === -1) {
                                            si_1.extendsTypes.push(t);
                                        }
                                    });
                                }
                            }
                        }
                        if (stmt.parent &&
                            (stmt.parent.kind == pxtc.SK.ClassDeclaration || stmt.parent.kind == pxtc.SK.InterfaceDeclaration) &&
                            !pxtc.isStatic(stmt))
                            si_1.isInstance = true;
                        res.byQName[qName] = si_1;
                    }
                }
                if (stmt.kind == pxtc.SK.ModuleDeclaration) {
                    var mod = stmt;
                    if (mod.body.kind == pxtc.SK.ModuleBlock) {
                        var blk = mod.body;
                        blk.statements.forEach(collectDecls);
                    }
                    else if (mod.body.kind == pxtc.SK.ModuleDeclaration) {
                        collectDecls(mod.body);
                    }
                }
                else if (stmt.kind == pxtc.SK.InterfaceDeclaration) {
                    var iface = stmt;
                    iface.members.forEach(collectDecls);
                }
                else if (stmt.kind == pxtc.SK.ClassDeclaration) {
                    var iface = stmt;
                    iface.members.forEach(collectDecls);
                }
                else if (stmt.kind == pxtc.SK.EnumDeclaration) {
                    var e = stmt;
                    e.members.forEach(collectDecls);
                }
            };
            for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
                var srcFile = _a[_i];
                srcFile.statements.forEach(collectDecls);
            }
            var toclose = [];
            // store qName in symbols
            for (var qName in res.byQName) {
                var si = res.byQName[qName];
                si.qName = qName;
                si.attributes._source = null;
                if (si.extendsTypes && si.extendsTypes.length)
                    toclose.push(si);
                var jrname = si.attributes.jres;
                if (jrname) {
                    if (jrname == "true")
                        jrname = qName;
                    var jr = pxtc.U.lookup(jres || {}, jrname);
                    if (jr && jr.icon && !si.attributes.iconURL) {
                        si.attributes.iconURL = jr.icon;
                    }
                    if (jr && jr.data && !si.attributes.jresURL) {
                        si.attributes.jresURL = "data:" + jr.mimeType + ";base64," + jr.data;
                    }
                }
                if (si.pyName) {
                    var override = pxtc.U.lookup(pxtc.ts2PyFunNameMap, si.qName);
                    if (override && override.n) {
                        si.pyQName = override.n;
                    }
                    else if (si.namespace) {
                        var par = res.byQName[si.namespace];
                        if (par) {
                            si.pyQName = par.pyQName + "." + si.pyName;
                        }
                        else {
                            // shouldn't happen
                            pxt.log("namespace missing: " + si.namespace);
                            si.pyQName = si.namespace + "." + si.pyName;
                        }
                    }
                    else {
                        si.pyQName = si.pyName;
                    }
                }
            }
            // transitive closure of inheritance
            var closed = {};
            var closeSi = function (si) {
                if (pxtc.U.lookup(closed, si.qName))
                    return;
                closed[si.qName] = true;
                var mine = {};
                mine[si.qName] = true;
                for (var _i = 0, _a = si.extendsTypes || []; _i < _a.length; _i++) {
                    var e = _a[_i];
                    mine[e] = true;
                    var psi = res.byQName[e];
                    if (psi) {
                        closeSi(psi);
                        for (var _b = 0, _c = psi.extendsTypes; _b < _c.length; _b++) {
                            var ee = _c[_b];
                            mine[ee] = true;
                        }
                    }
                }
                si.extendsTypes = Object.keys(mine);
            };
            toclose.forEach(closeSi);
            if (legacyOnly) {
                // conflicts with pins.map()
                delete res.byQName["Array.map"];
            }
            return {
                apis: res,
                decls: qNameToNode
            };
        }
        pxtc.internalGetApiInfo = internalGetApiInfo;
        function getFullName(typechecker, symbol) {
            if (symbol.isBogusSymbol)
                return symbol.name;
            return typechecker.getFullyQualifiedName(symbol);
        }
        pxtc.getFullName = getFullName;
        /*
        export function fillCompletionEntries(program: Program, symbols: Symbol[], r: CompletionInfo, apiInfo: ApisInfo, opts: CompileOptions) {
            const typechecker = program.getTypeChecker()
    
            for (let s of symbols) {
                let qName = getFullName(typechecker, s)
                const gsi = Util.lookup(apiInfo.byQName, qName);
    
                // filter out symbols starting with __
                if (gsi && /^__/.test(gsi.name))
                    continue;
    
                if (!r.isMemberCompletion && gsi)
                    continue; // global symbol
    
                if (Util.lookup(r.entries, qName))
                    continue;
    
                const decl = s.valueDeclaration || (s.declarations || [])[0]
                if (!decl) continue;
    
                const si = createSymbolInfo(typechecker, qName, decl)
                if (!si) continue;
    
                si.isContextual = true;
    
                r.entries[qName] = si;
            }
        }*/
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var service;
        (function (service_1) {
            var emptyOptions = {
                fileSystem: {},
                sourceFiles: [],
                target: { isNative: false, hasHex: false, switches: {} },
                hexinfo: null
            };
            var Host = /** @class */ (function () {
                function Host() {
                    this.opts = emptyOptions;
                    this.fileVersions = {};
                    this.projectVer = 0;
                    this.pxtModulesOK = null;
                    // resolveModuleNames?(moduleNames: string[], containingFile: string): ResolvedModule[];
                    // directoryExists?(directoryName: string): boolean;
                }
                Host.prototype.getProjectVersion = function () {
                    return this.projectVer + "";
                };
                Host.prototype.setFile = function (fn, cont) {
                    if (this.opts.fileSystem[fn] != cont) {
                        this.fileVersions[fn] = (this.fileVersions[fn] || 0) + 1;
                        this.opts.fileSystem[fn] = cont;
                        this.projectVer++;
                    }
                };
                Host.prototype.reset = function () {
                    this.setOpts(emptyOptions);
                    this.pxtModulesOK = null;
                };
                Host.prototype.setOpts = function (o) {
                    var _this = this;
                    pxtc.Util.iterMap(o.fileSystem, function (fn, v) {
                        if (_this.opts.fileSystem[fn] != v) {
                            _this.fileVersions[fn] = (_this.fileVersions[fn] || 0) + 1;
                        }
                    });
                    this.opts = o;
                    this.projectVer++;
                };
                Host.prototype.getCompilationSettings = function () {
                    return pxtc.getTsCompilerOptions(this.opts);
                };
                Host.prototype.getScriptFileNames = function () {
                    return this.opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".ts"); });
                };
                Host.prototype.getScriptVersion = function (fileName) {
                    return (this.fileVersions[fileName] || 0).toString();
                };
                Host.prototype.getScriptSnapshot = function (fileName) {
                    var f = this.opts.fileSystem[fileName];
                    if (f)
                        return ts.ScriptSnapshot.fromString(f);
                    else
                        return null;
                };
                Host.prototype.getNewLine = function () { return "\n"; };
                Host.prototype.getCurrentDirectory = function () { return "."; };
                Host.prototype.getDefaultLibFileName = function (options) { return "no-default-lib.d.ts"; };
                Host.prototype.log = function (s) { console.log("LOG", s); };
                Host.prototype.trace = function (s) { console.log("TRACE", s); };
                Host.prototype.error = function (s) { console.error("ERROR", s); };
                Host.prototype.useCaseSensitiveFileNames = function () { return true; };
                return Host;
            }());
            var service;
            var host;
            var lastApiInfo;
            var lastBlocksInfo;
            var lastLocBlocksInfo;
            var lastFuse;
            var lastProjectFuse;
            var builtinItems;
            var blockDefinitions;
            var tbSubset;
            function fileDiags(fn) {
                if (!/\.ts$/.test(fn))
                    return [];
                var d = service.getSyntacticDiagnostics(fn);
                if (!d || !d.length)
                    d = service.getSemanticDiagnostics(fn);
                if (!d)
                    d = [];
                return d;
            }
            var blocksInfoOp = function (apisInfoLocOverride, bannedCategories) {
                if (apisInfoLocOverride) {
                    if (!lastLocBlocksInfo) {
                        lastLocBlocksInfo = pxtc.getBlocksInfo(apisInfoLocOverride, bannedCategories);
                    }
                    return lastLocBlocksInfo;
                }
                else {
                    if (!lastBlocksInfo) {
                        lastBlocksInfo = pxtc.getBlocksInfo(lastApiInfo.apis, bannedCategories);
                    }
                    return lastBlocksInfo;
                }
            };
            function addApiInfo(opts) {
                if (!opts.apisInfo && opts.target.preferredEditor == pxt.PYTHON_PROJECT_NAME) {
                    if (!lastApiInfo)
                        lastApiInfo = pxtc.internalGetApiInfo(service.getProgram(), opts.jres);
                    opts.apisInfo = pxtc.U.clone(lastApiInfo.apis);
                }
            }
            var operations = {
                reset: function () {
                    service.cleanupSemanticCache();
                    lastApiInfo = null;
                    host.reset();
                },
                setOptions: function (v) {
                    host.setOpts(v.options);
                },
                syntaxInfo: function (v) {
                    var src = v.fileContent;
                    if (v.fileContent) {
                        host.setFile(v.fileName, v.fileContent);
                    }
                    var opts = pxtc.U.flatClone(host.opts);
                    opts.fileSystem[v.fileName] = src;
                    addApiInfo(opts);
                    opts.syntaxInfo = {
                        position: v.position,
                        type: v.infoType
                    };
                    pxt.py.py2ts(opts);
                    return opts.syntaxInfo;
                },
                getCompletions: function (v) {
                    var src = v.fileContent;
                    if (v.fileContent) {
                        host.setFile(v.fileName, v.fileContent);
                    }
                    var python = /\.py$/.test(v.fileName);
                    var dotIdx = -1;
                    var complPosition = -1;
                    for (var i = v.position - 1; i >= 0; --i) {
                        if (src[i] == ".") {
                            dotIdx = i;
                            break;
                        }
                        if (!/\w/.test(src[i]))
                            break;
                        if (complPosition == -1)
                            complPosition = i;
                    }
                    if (dotIdx == v.position - 1) {
                        // "foo.|" -> we add "_" as field name to minimize the risk of a parse error
                        src = src.slice(0, v.position) + "_" + src.slice(v.position);
                    }
                    else if (complPosition == -1) {
                        src = src.slice(0, v.position) + "_" + src.slice(v.position);
                        complPosition = v.position;
                    }
                    if (dotIdx != -1)
                        complPosition = dotIdx;
                    //console.log(v.fileContent.slice(v.position - 20, v.position) + "<X>" + v.fileContent.slice(v.position, v.position + 20))
                    var entries = {};
                    var r = {
                        entries: [],
                        isMemberCompletion: dotIdx != -1,
                        isNewIdentifierLocation: true,
                        isTypeLocation: false
                    };
                    var opts = pxtc.U.flatClone(host.opts);
                    opts.fileSystem[v.fileName] = src;
                    addApiInfo(opts);
                    opts.syntaxInfo = {
                        position: complPosition,
                        type: r.isMemberCompletion ? "memberCompletion" : "identifierCompletion"
                    };
                    pxt.py.py2ts(opts);
                    var symbols = opts.syntaxInfo.symbols || [];
                    for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
                        var si = symbols_1[_i];
                        if (/^__/.test(si.name) || // ignore members starting with __
                            /^__/.test(si.namespace) || // ignore namespaces starting with _-
                            si.attributes.hidden ||
                            si.attributes.deprecated)
                            continue; // ignore
                        entries[si.qName] = si;
                        var n = lastApiInfo.decls[si.qName];
                        if (ts.isFunctionLike(n)) {
                            if (python)
                                si.pySnippet = getSnippet(lastApiInfo.apis, v.runtime, si, n, python);
                            else
                                si.snippet = getSnippet(lastApiInfo.apis, v.runtime, si, n, python);
                        }
                    }
                    //fillCompletionEntries(program, data.symbols, r, lastApiInfo.apis, host.opts)
                    // sort entries
                    r.entries = pxt.Util.values(entries);
                    r.entries.sort(pxtc.compareSymbols);
                    return r;
                },
                compile: function (v) {
                    host.setOpts(v.options);
                    var res = runConversionsAndCompileUsingService();
                    pxtc.timesToMs(res);
                    return res;
                },
                decompile: function (v) {
                    host.setOpts(v.options);
                    return pxtc.decompile(service.getProgram(), v.options, v.fileName, false);
                },
                pydecompile: function (v) {
                    host.setOpts(v.options);
                    return pxt.py.decompileToPython(service.getProgram(), v.fileName);
                },
                assemble: function (v) {
                    return {
                        words: pxtc.processorInlineAssemble(host.opts.target, v.fileContent)
                    };
                },
                py2ts: function (v) {
                    addApiInfo(v.options);
                    return pxt.py.py2ts(v.options);
                },
                fileDiags: function (v) { return pxtc.patchUpDiagnostics(fileDiags(v.fileName)); },
                allDiags: function () {
                    // not comapatible with incremental compilation
                    // host.opts.noEmit = true
                    var res = runConversionsAndCompileUsingService();
                    pxtc.timesToMs(res);
                    if (host.opts.target.switches.time)
                        console.log("DIAG-TIME", res.times);
                    return res.diagnostics;
                },
                format: function (v) {
                    var formatOptions = v.format;
                    return pxtc.format(formatOptions.input, formatOptions.pos);
                },
                apiInfo: function () {
                    lastBlocksInfo = undefined;
                    lastFuse = undefined;
                    if (host.opts === emptyOptions) {
                        // Host was reset, don't load apis with empty options
                        return undefined;
                    }
                    lastApiInfo = pxtc.internalGetApiInfo(service.getProgram(), host.opts.jres);
                    return lastApiInfo.apis;
                },
                snippet: function (v) {
                    var o = v.snippet;
                    if (!lastApiInfo)
                        return undefined;
                    var fn = lastApiInfo.apis.byQName[o.qName];
                    var n = lastApiInfo.decls[o.qName];
                    if (!fn || !n || !ts.isFunctionLike(n))
                        return undefined;
                    return ts.pxtc.service.getSnippet(lastApiInfo.apis, v.runtime, fn, n, !!o.python);
                },
                blocksInfo: function (v) { return blocksInfoOp(v, v.blocks && v.blocks.bannedCategories); },
                apiSearch: function (v) {
                    var SEARCH_RESULT_COUNT = 7;
                    var search = v.search;
                    var blockInfo = blocksInfoOp(search.localizedApis, v.blocks && v.blocks.bannedCategories); // caches
                    if (search.localizedStrings) {
                        pxt.Util.setLocalizedStrings(search.localizedStrings);
                    }
                    // Computes the preferred tooltip or block text to use for search (used for blocks that have multiple tooltips or block texts)
                    var computeSearchProperty = function (tooltipOrBlock, preferredSearch, blockDef) {
                        if (!tooltipOrBlock) {
                            return undefined;
                        }
                        if (typeof tooltipOrBlock === "string") {
                            // There is only one tooltip or block text; use it
                            return tooltipOrBlock;
                        }
                        if (preferredSearch) {
                            // The block definition specifies a preferred tooltip / block text to use for search; use it
                            return tooltipOrBlock[preferredSearch];
                        }
                        // The block definition does not specify which tooltip or block text to use for search; join all values with a space
                        return Object.keys(tooltipOrBlock).map(function (k) { return tooltipOrBlock[k]; }).join(" ");
                    };
                    if (!builtinItems) {
                        builtinItems = [];
                        blockDefinitions = pxt.blocks.blockDefinitions();
                        var _loop_7 = function (id) {
                            var blockDef = blockDefinitions[id];
                            if (blockDef.operators) {
                                var _loop_8 = function (op) {
                                    var opValues = blockDef.operators[op];
                                    opValues.forEach(function (v) { return builtinItems.push({
                                        id: id,
                                        name: blockDef.name,
                                        jsdoc: typeof blockDef.tooltip === "string" ? blockDef.tooltip : blockDef.tooltip[v],
                                        block: v,
                                        field: [op, v],
                                        builtinBlock: true
                                    }); });
                                };
                                for (var op in blockDef.operators) {
                                    _loop_8(op);
                                }
                            }
                            else {
                                builtinItems.push({
                                    id: id,
                                    name: blockDef.name,
                                    jsdoc: computeSearchProperty(blockDef.tooltip, blockDef.tooltipSearch, blockDef),
                                    block: computeSearchProperty(blockDef.block, blockDef.blockTextSearch, blockDef),
                                    builtinBlock: true
                                });
                            }
                        };
                        for (var id in blockDefinitions) {
                            _loop_7(id);
                        }
                    }
                    var subset;
                    var fnweight = function (fn) {
                        var fnw = fn.attributes.weight || 50;
                        var nsInfo = blockInfo.apis.byQName[fn.namespace];
                        var nsw = nsInfo ? (nsInfo.attributes.weight || 50) : 50;
                        var ad = (nsInfo ? nsInfo.attributes.advanced : false) || fn.attributes.advanced;
                        var weight = (nsw * 1000 + fnw) * (ad ? 1 : 1e6);
                        return weight;
                    };
                    if (!lastFuse || search.subset) {
                        var weights_1 = {};
                        var builtinSearchSet = [];
                        if (search.subset) {
                            tbSubset = search.subset;
                            builtinSearchSet = builtinItems.filter(function (s) { return !!tbSubset[s.id]; });
                        }
                        if (tbSubset) {
                            subset = blockInfo.blocks.filter(function (s) { return !!tbSubset[s.attributes.blockId]; });
                        }
                        else {
                            subset = blockInfo.blocks;
                            builtinSearchSet = builtinItems;
                        }
                        var searchSet = subset.map(function (s) {
                            var mappedSi = {
                                id: s.attributes.blockId,
                                qName: s.qName,
                                name: s.name,
                                namespace: s.namespace,
                                block: s.attributes.block,
                                jsdoc: s.attributes.jsDoc,
                                localizedCategory: tbSubset && typeof tbSubset[s.attributes.blockId] === "string"
                                    ? tbSubset[s.attributes.blockId] : undefined
                            };
                            return mappedSi;
                        });
                        // filter out built-ins from the main search set as those
                        // should come from the built-in search set
                        var builtinBlockIds_1 = {};
                        builtinSearchSet.forEach(function (b) { return builtinBlockIds_1[b.id] = true; });
                        searchSet = searchSet.filter(function (b) { return !(b.id in builtinBlockIds_1); });
                        var mw_1 = 0;
                        subset.forEach(function (b) {
                            var w = weights_1[b.qName] = fnweight(b);
                            mw_1 = Math.max(mw_1, w);
                        });
                        searchSet = searchSet.concat(builtinSearchSet);
                        var fuseOptions = {
                            shouldSort: true,
                            threshold: 0.6,
                            location: 0,
                            distance: 100,
                            maxPatternLength: 16,
                            minMatchCharLength: 2,
                            findAllMatches: false,
                            caseSensitive: false,
                            keys: [
                                { name: 'name', weight: 0.3 },
                                { name: 'namespace', weight: 0.1 },
                                { name: 'localizedCategory', weight: 0.1 },
                                { name: 'block', weight: 0.4375 },
                                { name: 'jsdoc', weight: 0.0625 }
                            ],
                            sortFn: function (a, b) {
                                var wa = a.qName ? 1 - weights_1[a.item.qName] / mw_1 : 1;
                                var wb = b.qName ? 1 - weights_1[b.item.qName] / mw_1 : 1;
                                // allow 10% wiggle room for weights
                                return a.score * (1 + wa / 10) - b.score * (1 + wb / 10);
                            }
                        };
                        lastFuse = new Fuse(searchSet, fuseOptions);
                    }
                    var fns = lastFuse.search(search.term);
                    return fns.slice(0, SEARCH_RESULT_COUNT);
                },
                projectSearch: function (v) {
                    var search = v.projectSearch;
                    var searchSet = search.headers;
                    if (!lastProjectFuse) {
                        var fuseOptions = {
                            shouldSort: true,
                            threshold: 0.6,
                            location: 0,
                            distance: 100,
                            maxPatternLength: 16,
                            minMatchCharLength: 2,
                            findAllMatches: false,
                            caseSensitive: false,
                            keys: [
                                { name: 'name', weight: 0.3 }
                            ]
                        };
                        lastProjectFuse = new Fuse(searchSet, fuseOptions);
                    }
                    var fns = lastProjectFuse.search(search.term);
                    return fns;
                },
                projectSearchClear: function () {
                    lastProjectFuse = undefined;
                }
            };
            function runConversionsAndCompileUsingService() {
                addApiInfo(host.opts);
                var prevFS = pxtc.U.flatClone(host.opts.fileSystem);
                var res = pxtc.runConversionsAndStoreResults(host.opts);
                var newFS = host.opts.fileSystem;
                host.opts.fileSystem = prevFS;
                for (var _i = 0, _a = Object.keys(newFS); _i < _a.length; _i++) {
                    var k = _a[_i];
                    host.setFile(k, newFS[k]);
                } // update version numbers
                if (res.diagnostics.length == 0) {
                    host.opts.skipPxtModulesEmit = false;
                    host.opts.skipPxtModulesTSC = false;
                    var currKey = host.opts.target.isNative ? "native" : "js";
                    if (!host.opts.target.switches.noIncr && host.pxtModulesOK) {
                        host.opts.skipPxtModulesTSC = true;
                        if (host.opts.noEmit)
                            host.opts.skipPxtModulesEmit = true;
                        else if (host.opts.target.isNative)
                            host.opts.skipPxtModulesEmit = false;
                        else if (host.pxtModulesOK == "js" && (!host.opts.breakpoints || host.opts.justMyCode))
                            host.opts.skipPxtModulesEmit = true;
                    }
                    res = pxtc.compile(host.opts, service);
                    if (res.needsFullRecompile) {
                        pxt.log("trigering full recompile");
                        pxt.tickEvent("compile.fullrecompile");
                        host.opts.skipPxtModulesEmit = false;
                        res = pxtc.compile(host.opts, service);
                    }
                    if (res.diagnostics.every(function (d) { return !pxtc.isPxtModulesFilename(d.fileName); }))
                        host.pxtModulesOK = currKey;
                }
                return res;
            }
            function performOperation(op, arg) {
                init();
                var res = null;
                if (operations.hasOwnProperty(op)) {
                    try {
                        res = operations[op](arg) || {};
                    }
                    catch (e) {
                        res = {
                            errorMessage: e.stack
                        };
                    }
                }
                else {
                    res = {
                        errorMessage: "No such operation: " + op
                    };
                }
                return res;
            }
            service_1.performOperation = performOperation;
            function init() {
                if (!service) {
                    host = new Host();
                    service = ts.createLanguageService(host);
                }
            }
            var defaultImgLit = "`\n. . . . .\n. . . . .\n. . # . .\n. . . . .\n. . . . .\n`";
            function getSnippet(apis, runtimeOps, fn, n, python) {
                var PY_INDENT = pxt.py.INDENT;
                var findex = 0;
                var preStmt = "";
                var fnName = "";
                if (n.kind == pxtc.SK.Constructor) {
                    fnName = getSymbolName(n.symbol) || n.parent.name.getText();
                }
                else {
                    fnName = getSymbolName(n.symbol) || n.name.getText();
                }
                if (python)
                    fnName = pxtc.snakify(fnName).toLowerCase();
                var attrs = fn.attributes;
                var blocks = blocksInfoOp(apis, runtimeOps.bannedCategories).blocks;
                var blocksById = pxt.Util.toDictionary(blocks, function (t) { return t.attributes.blockId; });
                function getShadowSymbol(paramName) {
                    var shadowBlock = (attrs._shadowOverrides || {})[paramName];
                    if (!shadowBlock)
                        return null;
                    var sym = blocksById[shadowBlock];
                    if (!sym)
                        return null;
                    if (sym.attributes.shim === "TD_ID" && sym.parameters.length) {
                        var realName = sym.parameters[0].type;
                        var realSym = apis.byQName[realName];
                        sym = realSym || sym;
                    }
                    return sym;
                }
                var checker = service && service.getProgram().getTypeChecker();
                function getTsSymbolFromPxtSymbol(inSym, anchor) {
                    // TODO: handle non-enum types
                    var tsSymbols = checker.getSymbolsInScope(anchor, ts.SymbolFlags.Enum);
                    var tsSymbolMap = pxt.Util.toDictionary(tsSymbols, function (s) { return s.escapedName.toString(); });
                    return tsSymbolMap[inSym.qName] || null;
                }
                function getParameterDefault(param) {
                    var typeNode = param.type;
                    if (!typeNode)
                        return python ? "None" : "null";
                    var name = param.name.kind === pxtc.SK.Identifier ? param.name.text : undefined;
                    // check for explicit default in the attributes
                    if (attrs && attrs.paramDefl && attrs.paramDefl[name]) {
                        if (typeNode.kind == pxtc.SK.StringKeyword) {
                            var defaultName = attrs.paramDefl[name];
                            return typeNode.kind == pxtc.SK.StringKeyword && defaultName.indexOf("\"") != 0 ? "\"" + defaultName + "\"" : defaultName;
                        }
                        return attrs.paramDefl[name];
                    }
                    function getDefaultValueOfType(type) {
                        // TODO: generalize this to handle more types
                        if (type.symbol && type.symbol.flags & ts.SymbolFlags.Enum) {
                            return getDefaultEnumValue(type);
                        }
                        if (pxtc.isObjectType(type)) {
                            var typeSymbol = apis.byQName[checker.getFullyQualifiedName(type.symbol)];
                            var snip = typeSymbol && typeSymbol.attributes && (python ? typeSymbol.attributes.pySnippet : typeSymbol.attributes.snippet);
                            if (snip)
                                return snip;
                            if (type.objectFlags & ts.ObjectFlags.Anonymous) {
                                var sigs = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
                                if (sigs && sigs.length) {
                                    return getFunctionString(sigs[0]);
                                }
                                return emitFn(name);
                            }
                        }
                        if (type.flags & ts.TypeFlags.NumberLike) {
                            return "0";
                        }
                        return null;
                    }
                    // check if there's a shadow override defined
                    var shadowSymbol = getShadowSymbol(name);
                    if (shadowSymbol) {
                        var tsSymbol = getTsSymbolFromPxtSymbol(shadowSymbol, param);
                        var shadowType = checker.getTypeOfSymbolAtLocation(tsSymbol, param);
                        if (shadowType) {
                            var shadowDef = getDefaultValueOfType(shadowType);
                            if (shadowDef) {
                                return shadowDef;
                            }
                        }
                    }
                    // simple types we can determine defaults for
                    // TODO: move into getDefaultValueOfType
                    switch (typeNode.kind) {
                        case pxtc.SK.StringKeyword: return (name == "leds" ? defaultImgLit : "\"\"");
                        case pxtc.SK.NumberKeyword: return "0";
                        case pxtc.SK.BooleanKeyword: return python ? "False" : "false";
                        case pxtc.SK.ArrayType: return "[]";
                        case pxtc.SK.TypeReference:
                            // handled below
                            break;
                        case pxtc.SK.FunctionType:
                            var tn = typeNode;
                            var functionSignature = checker ? checker.getSignatureFromDeclaration(tn) : undefined;
                            if (functionSignature) {
                                return getFunctionString(functionSignature);
                            }
                            return emitFn(name);
                    }
                    // get default of type
                    var type = checker && checker.getTypeAtLocation(param);
                    if (type) {
                        var typeDef = getDefaultValueOfType(type);
                        if (typeDef)
                            return typeDef;
                    }
                    // lastly, null or none
                    return python ? "None" : "null";
                }
                var args = n.parameters ? n.parameters
                    .filter(function (param) { return !param.initializer && !param.questionToken; })
                    .map(getParameterDefault) : [];
                var snippetPrefix = (fn.attributes.blockNamespace || fn.namespace);
                var isInstance = false;
                var addNamespace = false;
                var namespaceToUse = "";
                var functionCount = 0;
                var element = fn;
                if (element.attributes.block) {
                    if (element.attributes.defaultInstance) {
                        snippetPrefix = element.attributes.defaultInstance;
                        if (python && snippetPrefix)
                            snippetPrefix = pxtc.snakify(snippetPrefix).toLowerCase();
                    }
                    else if (element.namespace) {
                        var nsInfo_1 = apis.byQName[element.namespace];
                        if (nsInfo_1.attributes.fixedInstances) {
                            var instances_1 = pxtc.Util.values(apis.byQName);
                            var getExtendsTypesFor_1 = function (name) {
                                return instances_1
                                    .filter(function (v) { return v.extendsTypes; })
                                    .filter(function (v) { return v.extendsTypes.reduce(function (x, y) { return x || y.indexOf(name) != -1; }, false); })
                                    .reduce(function (x, y) { return x.concat(y.extendsTypes); }, []);
                            };
                            // if blockNamespace exists, e.g., "pins", use it for snippet
                            // else use nsInfo.namespace, e.g., "motors"
                            namespaceToUse = element.attributes.blockNamespace || nsInfo_1.namespace || "";
                            // all fixed instances for this namespace
                            var fixedInstances = instances_1.filter(function (value) {
                                return value.kind === 4 /* Variable */ &&
                                    value.attributes.fixedInstance;
                            });
                            // first try to get fixed instances whose retType matches nsInfo.name
                            // e.g., DigitalPin
                            var exactInstances = fixedInstances.filter(function (value) {
                                return value.retType == nsInfo_1.qName;
                            })
                                .sort(function (v1, v2) { return v1.name.localeCompare(v2.name); });
                            if (exactInstances.length) {
                                snippetPrefix = "" + getName(exactInstances[0]);
                            }
                            else {
                                // second choice: use fixed instances whose retType extends type of nsInfo.name
                                // e.g., nsInfo.name == AnalogPin and instance retType == PwmPin
                                var extendedInstances = fixedInstances.filter(function (value) {
                                    return getExtendsTypesFor_1(nsInfo_1.qName).indexOf(value.retType) !== -1;
                                })
                                    .sort(function (v1, v2) { return v1.name.localeCompare(v2.name); });
                                if (extendedInstances.length) {
                                    snippetPrefix = "" + getName(extendedInstances[0]);
                                }
                            }
                            isInstance = true;
                            addNamespace = true;
                        }
                        else if (element.kind == 1 /* Method */ || element.kind == 2 /* Property */) {
                            var params = pxt.blocks.compileInfo(element);
                            if (params.thisParameter) {
                                snippetPrefix = params.thisParameter.defaultValue || params.thisParameter.definitionName;
                                if (python && snippetPrefix)
                                    snippetPrefix = pxtc.snakify(snippetPrefix).toLowerCase();
                            }
                            isInstance = true;
                        }
                        else if (nsInfo_1.kind === 8 /* Class */) {
                            return undefined;
                        }
                    }
                }
                var snippet = fnName + "(" + args.join(', ') + ")";
                var insertText = snippetPrefix ? snippetPrefix + "." + snippet : snippet;
                insertText = addNamespace ? firstWord(namespaceToUse) + "." + insertText : insertText;
                if (attrs && attrs.blockSetVariable)
                    insertText = "" + (python ? "" : "let ") + (python ? pxtc.snakify(attrs.blockSetVariable).toLowerCase() : attrs.blockSetVariable) + " = " + insertText;
                return preStmt + insertText;
                function getSymbolName(symbol) {
                    if (checker) {
                        var qName = pxtc.getFullName(checker, symbol);
                        var si = apis.byQName[qName];
                        if (si)
                            return getName(si);
                    }
                    return undefined;
                }
                function getName(si) {
                    return python ? si.pyName : si.name;
                }
                function firstWord(s) {
                    var i = s.indexOf('.');
                    return i < 0 ? s : s.substring(0, i);
                }
                function getFunctionString(functionSignature) {
                    var returnValue = "";
                    var returnType = checker.getReturnTypeOfSignature(functionSignature);
                    if (returnType.flags & ts.TypeFlags.NumberLike)
                        returnValue = "return 0";
                    else if (returnType.flags & ts.TypeFlags.StringLike)
                        returnValue = "return \"\"";
                    else if (returnType.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral))
                        returnValue = python ? "return False" : "return false";
                    if (python) {
                        var functionArgument = "(" + functionSignature.parameters.map(function (p) { return p.name; }).join(', ') + ")";
                        var n_2 = fnName || "fn";
                        if (functionCount++ > 0)
                            n_2 += functionCount;
                        n_2 = pxtc.snakify(n_2).toLowerCase();
                        preStmt += "def " + n_2 + functionArgument + ":\n" + PY_INDENT + (returnValue || "pass") + "\n";
                        return n_2;
                    }
                    else {
                        var functionArgument = "()";
                        var displayParts = ts.mapToDisplayParts(function (writer) {
                            checker.getSymbolDisplayBuilder().buildSignatureDisplay(functionSignature, writer);
                        });
                        var displayPartsStr = ts.displayPartsToString(displayParts);
                        functionArgument = displayPartsStr.substr(0, displayPartsStr.lastIndexOf(":"));
                        return "function " + functionArgument + " {\n    " + returnValue + "\n}";
                    }
                }
                function emitFn(n) {
                    if (python) {
                        if (n)
                            n = pxtc.snakify(n).toLowerCase();
                        preStmt += "def " + n + "():\n" + PY_INDENT + "pass\n";
                        return n;
                    }
                    else
                        return "function () {}";
                }
                function getDefaultEnumValue(t) {
                    // Note: AFAIK this is NOT guranteed to get the same default as you get in
                    // blocks. That being said, it should get the first declared value. Only way
                    // to guarantee an API has the same default in blocks and in TS is to actually
                    // set a default on the parameter in its comment attributes
                    if (checker && t.symbol && t.symbol.declarations && t.symbol.declarations.length) {
                        for (var i = 0; i < t.symbol.declarations.length; i++) {
                            var decl = t.symbol.declarations[i];
                            if (decl.kind === pxtc.SK.EnumDeclaration) {
                                var enumDeclaration = decl;
                                for (var j = 0; j < enumDeclaration.members.length; j++) {
                                    var member = enumDeclaration.members[i];
                                    if (member.name.kind === pxtc.SK.Identifier) {
                                        var fullName = checker.getFullyQualifiedName(checker.getSymbolAtLocation(member.name));
                                        var pxtSym = apis.byQName[fullName];
                                        if (pxtSym) {
                                            return python ? pxtSym.pyQName : pxtSym.qName;
                                        }
                                        else
                                            return fullName;
                                    }
                                }
                            }
                        }
                    }
                    return "0";
                }
            }
            service_1.getSnippet = getSnippet;
        })(service = pxtc.service || (pxtc.service = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var vm;
        (function (vm) {
            var emitErr = pxtc.assembler.emitErr;
            var badNameError = emitErr("opcode name doesn't match", "<name>");
            var VmInstruction = /** @class */ (function (_super) {
                __extends(VmInstruction, _super);
                function VmInstruction(ei, format, opcode) {
                    return _super.call(this, ei, format, opcode, opcode, false) || this;
                }
                VmInstruction.prototype.emit = function (ln) {
                    var tokens = ln.words;
                    if (tokens[0] != this.name)
                        return badNameError;
                    var opcode = this.opcode;
                    var j = 1;
                    var stack = 0;
                    var numArgs = [];
                    var labelName = null;
                    var opcode2 = null;
                    var i2 = null;
                    for (var i = 0; i < this.args.length; ++i) {
                        var formal = this.args[i];
                        var actual = tokens[j++];
                        if (formal[0] == "$") {
                            var enc = this.ei.encoders[formal];
                            var v = null;
                            if (enc.isImmediate || enc.isLabel) {
                                if (!actual)
                                    return emitErr("expecting number", actual);
                                actual = actual.replace(/^#/, "");
                                v = ln.bin.parseOneInt(actual);
                                if (v == null)
                                    return emitErr("expecting number", actual);
                            }
                            else {
                                pxtc.oops();
                            }
                            if (v == null)
                                return emitErr("didn't understand it", actual);
                            pxtc.U.assert(v >= 0);
                            if (v != 11111 && formal == "$lbl") {
                                v -= ln.bin.location() + 2;
                                v >>= 1;
                            }
                            numArgs.push(v);
                            v = enc.encode(v);
                            if (v == null)
                                return emitErr("argument out of range or mis-aligned", actual);
                            if (formal == "$i3") {
                                v = i2 | (v << 6);
                            }
                            else if (formal == "$i5") {
                                v = i2 | (v << 8);
                            }
                            if (formal == "$i2" || formal == "$i4") {
                                i2 = v;
                            }
                            else if (formal == "$rt") {
                                if (v != 11111 && v > 0x1000) {
                                    pxtc.U.oops("label: " + actual + " v=" + v);
                                }
                                opcode = v | 0x8000;
                                if (this.name == "callrt.p")
                                    opcode |= 0x2000;
                            }
                            else if (ln.isLong || v < 0 || v > 255) {
                                // keep it long for the final pass; otherwise labels may shift
                                ln.isLong = true;
                                if (formal == "$lbl")
                                    v -= 1; // account for bigger encoding in relative addresses
                                opcode = ((v >> 9) & 0xffff) | 0xc000;
                                opcode2 = (this.opcode + (v << 7)) & 0xffff;
                            }
                            else {
                                opcode = (this.opcode + (v << 7)) & 0xffff;
                            }
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
                    return {
                        stack: stack,
                        opcode: opcode,
                        opcode2: opcode2,
                        numArgs: numArgs,
                        labelName: ln.bin.normalizeExternalLabel(labelName)
                    };
                };
                return VmInstruction;
            }(pxtc.assembler.Instruction));
            vm.VmInstruction = VmInstruction;
            vm.withPush = {};
            vm.opcodes = [
                "stloc     $i1",
                "ldloc     $i1",
                "stfld     $i4, $i5",
                "ldfld     $i4, $i5",
                "newobj    $i1",
                "ldcap     $i1",
                "stglb     $i1",
                "ldglb     $i1",
                "ldint     $i1",
                "ldintneg  $i1",
                "ldspecial $i1",
                "ldnumber  $i1",
                "ldlit     $i1",
                "checkinst $i1",
                "mapget",
                "mapset",
                "ret       $i2, $i3",
                "popmany   $i1",
                "pushmany  $i1",
                "callind   $i1",
                "callproc  $i1",
                "calliface $i2, $i3",
                "callget   $i1",
                "callset   $i1",
                "jmp       $lbl",
                "jmpnz     $lbl",
                "jmpz      $lbl",
                "try       $lbl",
                "push",
                "pop",
            ];
            var VmProcessor = /** @class */ (function (_super) {
                __extends(VmProcessor, _super);
                function VmProcessor(target) {
                    var _this = _super.call(this) || this;
                    _this.addEnc("$i1", "#0-8388607", function (v) { return _this.inrange(8388607, v, v); });
                    _this.addEnc("$i2", "#0-31", function (v) { return _this.inrange(31, v, v); });
                    _this.addEnc("$i3", "#0-262143", function (v) { return _this.inrange(262143, v, v); });
                    _this.addEnc("$i4", "#0-255", function (v) { return _this.inrange(255, v, v); });
                    _this.addEnc("$i5", "#0-32767", function (v) { return _this.inrange(32767, v, v); });
                    _this.addEnc("$lbl", "LABEL", function (v) { return _this.inminmax(-4194304, 4194303, v, v); }).isLabel = true;
                    _this.addEnc("$rt", "SHIM", function (v) { return _this.inrange(8388607, v, v); }).isLabel = true;
                    var opId = 1;
                    var hasPush = true;
                    for (var _i = 0, _a = vm.opcodes.concat(["callrt $rt"]); _i < _a.length; _i++) {
                        var opcode = _a[_i];
                        var ins = new VmInstruction(_this, opcode, opId);
                        _this.instructions[ins.name] = [ins];
                        if (hasPush || ins.name == "callrt") {
                            vm.withPush[ins.name] = true;
                            ins = new VmInstruction(_this, opcode.replace(/\w+/, function (f) { return f + ".p"; }), opId | (1 << 6));
                            _this.instructions[ins.name] = [ins];
                        }
                        if (ins.name == "mapset.p")
                            hasPush = false;
                        opId++;
                    }
                    return _this;
                }
                VmProcessor.prototype.testAssembler = function () {
                };
                VmProcessor.prototype.postProcessRelAddress = function (f, v) {
                    return v;
                };
                VmProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    return v;
                };
                VmProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    // lookup absolute, relative, dependeing
                    var l = f.lookupLabel(s);
                    if (l == null)
                        return null;
                    if (i.is32bit)
                        // absolute address
                        return l;
                    // relative address
                    return l - (f.pc() + 2);
                };
                VmProcessor.prototype.toFnPtr = function (v, baseOff) {
                    return v;
                };
                VmProcessor.prototype.wordSize = function () {
                    return 8;
                };
                VmProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    var lnop = ln.getOp();
                    var lnop2 = "";
                    if (lnNext) {
                        lnop2 = lnNext.getOp();
                        var key = lnop + ";" + lnop2;
                        var pc = this.file.peepCounts;
                        pc[key] = (pc[key] || 0) + 1;
                    }
                    if (lnop == "stloc" && lnop2 == "ldloc" && ln.numArgs[0] == lnNext.numArgs[0]) {
                        if (/LAST/.test(lnNext.text))
                            ln.update("");
                        lnNext.update("");
                    }
                    else if (vm.withPush[lnop] && lnop2 == "push") {
                        ln.update(ln.text.replace(/\w+/, function (f) { return f + ".p"; }));
                        lnNext.update("");
                    }
                    /*
                    if (lnop == "jmp" && ln.numArgs[0] == this.file.baseOffset + lnNext.location) {
                        // RULE: jmp .somewhere; .somewhere: -> .somewhere:
                        ln.update("")
                    } else if (lnop == "push" && (
                        lnop2 == "callproc" || lnop2 == "ldconst" ||
                        lnop2 == "stringlit" || lnop2 == "ldtmp")) {
                        ln.update("")
                        lnNext.update("push_" + lnop2 + " " + lnNext.words[1])
                    } else if (lnop == "push" && (lnop2 == "ldzero" || lnop2 == "ldone")) {
                        ln.update("")
                        lnNext.update("push_" + lnop2)
                    } else if (lnop == "ldtmp" && (lnop2 == "incr" || lnop2 == "decr")) {
                        ln.update("ldtmp_" + lnop2 + " " + ln.words[1])
                        lnNext.update("")
                    }
                    */
                };
                return VmProcessor;
            }(pxtc.assembler.AbstractProcessor));
            vm.VmProcessor = VmProcessor;
        })(vm = pxtc.vm || (pxtc.vm = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
