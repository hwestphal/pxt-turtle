/// <reference path='../built/pxtlib.d.ts' />
/// <reference path='../built/pxtcompiler.d.ts' />
var pxt;
(function (pxt) {
    var py;
    (function (py) {
        var VarModifier;
        (function (VarModifier) {
            VarModifier[VarModifier["NonLocal"] = 0] = "NonLocal";
            VarModifier[VarModifier["Global"] = 1] = "Global";
        })(VarModifier = py.VarModifier || (py.VarModifier = {}));
    })(py = pxt.py || (pxt.py = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var py;
    (function (py) {
        var B = pxt.blocks;
        // global state
        var externalApis; // slurped from libraries
        var internalApis; // defined in Python
        var ctx;
        var currIteration = 0;
        var typeId = 0;
        // this measures if we gained additional information about type state
        // we run conversion several times, until we have all information possible
        var numUnifies = 0;
        var autoImport = true;
        var currErrorCtx = "???";
        var verboseTypes = false;
        var lastAST;
        var lastFile;
        var diagnostics;
        var compileOptions;
        var syntaxInfo;
        var infoNode;
        var infoScope;
        function stmtTODO(v) {
            pxt.tickEvent("python.todo", { kind: v.kind });
            return B.mkStmt(B.mkText("TODO: " + v.kind));
        }
        function exprTODO(v) {
            pxt.tickEvent("python.todo", { kind: v.kind });
            return B.mkText(" {TODO: " + v.kind + "} ");
        }
        function docComment(cmt) {
            if (cmt.trim().split(/\n/).length <= 1)
                cmt = cmt.trim();
            else
                cmt = cmt + "\n";
            return B.mkStmt(B.mkText("/** " + cmt + " */"));
        }
        function defName(n, tp) {
            return {
                kind: "Name",
                id: n,
                isdef: true,
                ctx: "Store",
                tsType: tp
            };
        }
        var tpString = mkType({ primType: "string" });
        var tpNumber = mkType({ primType: "number" });
        var tpBoolean = mkType({ primType: "boolean" });
        var tpVoid = mkType({ primType: "void" });
        var tpAny = mkType({ primType: "any" });
        var tpBuffer;
        var builtInTypes = {
            "string": tpString,
            "number": tpNumber,
            "boolean": tpBoolean,
            "void": tpVoid,
            "any": tpAny,
        };
        function ts2PyType(syntaxKind) {
            switch (syntaxKind) {
                case ts.SyntaxKind.StringKeyword:
                    return tpString;
                case ts.SyntaxKind.NumberKeyword:
                    return tpNumber;
                case ts.SyntaxKind.BooleanKeyword:
                    return tpBoolean;
                case ts.SyntaxKind.VoidKeyword:
                    return tpVoid;
                case ts.SyntaxKind.AnyKeyword:
                    return tpAny;
                default:
                    return tpBuffer;
            }
        }
        function cleanSymbol(s) {
            var r = pxt.U.flatClone(s);
            delete r.pyAST;
            delete r.pyInstanceType;
            delete r.pyRetType;
            delete r.pySymbolType;
            delete r.moduleTypeMarker;
            delete r.declared;
            if (r.parameters)
                r.parameters = r.parameters.map(function (p) {
                    p = pxt.U.flatClone(p);
                    delete p.pyType;
                    return p;
                });
            return r;
        }
        function mapTsType(tp) {
            if (tp[0] == "(" && pxt.U.endsWith(tp, ")")) {
                return mapTsType(tp.slice(1, -1));
            }
            var arrowIdx = tp.indexOf(" => ");
            if (arrowIdx > 0) {
                var retTypeStr = tp.slice(arrowIdx + 4);
                if (retTypeStr.indexOf(")[]") == -1) {
                    var retType = mapTsType(retTypeStr);
                    var argsStr = tp.slice(1, arrowIdx - 1);
                    var argsWords = argsStr ? argsStr.split(/, /) : [];
                    var argTypes = argsWords.map(function (a) { return mapTsType(a.replace(/\w+\??: /, "")); });
                    return mkFunType(retType, argTypes);
                }
            }
            if (pxt.U.endsWith(tp, "[]")) {
                return mkArrayType(mapTsType(tp.slice(0, -2)));
            }
            if (tp === "_py.Array") {
                return mkArrayType(tpAny);
            }
            var t = pxt.U.lookup(builtInTypes, tp);
            if (t)
                return t;
            if (tp == "T" || tp == "U")
                return mkType({ primType: "'" + tp });
            var sym = lookupApi(tp + "@type") || lookupApi(tp);
            if (!sym) {
                error(null, 9501, pxt.U.lf("unknown type '{0}' near '{1}'", tp, currErrorCtx || "???"));
                return mkType({ primType: tp });
            }
            if (sym.kind == 7 /* EnumMember */)
                return tpNumber;
            // sym.pyInstanceType might not be initialized yet and we don't want to call symbolType() here to avoid infinite recursion
            if (sym.kind == 8 /* Class */ || sym.kind == 9 /* Interface */)
                return sym.pyInstanceType || mkType({ classType: sym });
            if (sym.kind == 6 /* Enum */)
                return tpNumber;
            error(null, 9502, pxt.U.lf("'{0}' is not a type near '{1}'", tp, currErrorCtx || "???"));
            return mkType({ primType: tp });
        }
        // img/hex literal
        function isTaggedTemplate(sym) {
            return sym.attributes.shim && sym.attributes.shim[0] == "@";
        }
        function symbolType(sym) {
            if (!sym.pySymbolType) {
                currErrorCtx = sym.pyQName;
                if (sym.parameters) {
                    if (isTaggedTemplate(sym)) {
                        sym.parameters = [{
                                "name": "literal",
                                "description": "",
                                "type": "string",
                                "options": {}
                            }];
                    }
                    for (var _i = 0, _a = sym.parameters; _i < _a.length; _i++) {
                        var p = _a[_i];
                        if (!p.pyType)
                            p.pyType = mapTsType(p.type);
                    }
                }
                var prevRetType = sym.pyRetType;
                if (isModule(sym)) {
                    sym.pyRetType = mkType({ moduleType: sym });
                }
                else {
                    if (sym.retType)
                        sym.pyRetType = mapTsType(sym.retType);
                    else if (sym.pyRetType) {
                        // nothing to do
                    }
                    else {
                        pxt.U.oops("no type for: " + sym.pyQName);
                        sym.pyRetType = mkType({});
                    }
                }
                if (prevRetType)
                    unify(sym.pyAST, prevRetType, sym.pyRetType);
                if (sym.kind == 3 /* Function */ || sym.kind == 1 /* Method */)
                    sym.pySymbolType = mkFunType(sym.pyRetType, sym.parameters.map(function (p) { return p.pyType; }));
                else
                    sym.pySymbolType = sym.pyRetType;
                if (sym.kind == 8 /* Class */ || sym.kind == 9 /* Interface */) {
                    sym.pyInstanceType = mkType({ classType: sym });
                }
                currErrorCtx = null;
            }
            return sym.pySymbolType;
        }
        function fillTypes(sym) {
            if (sym)
                symbolType(sym);
            return sym;
        }
        function lookupApi(name) {
            return pxt.U.lookup(internalApis, name) || pxt.U.lookup(externalApis, name);
        }
        function lookupGlobalSymbol(name) {
            if (!name)
                return null;
            return fillTypes(lookupApi(name));
        }
        function initApis(apisInfo, tsShadowFiles) {
            internalApis = {};
            externalApis = {};
            var tsShadowFilesSet = pxt.U.toDictionary(tsShadowFiles, function (t) { return t; });
            var _loop_1 = function (sym) {
                // if the symbol comes from a .ts file that matches one of the .py files we're compiling - skip these
                if (tsShadowFilesSet.hasOwnProperty(sym.fileName)) {
                    return "continue";
                }
                var sym2 = sym;
                if (sym2.extendsTypes)
                    sym2.extendsTypes = sym2.extendsTypes.filter(function (e) { return e != sym2.qName; });
                externalApis[sym2.pyQName] = sym2;
                externalApis[sym2.qName] = sym2;
            };
            for (var _i = 0, _a = pxt.U.values(apisInfo.byQName); _i < _a.length; _i++) {
                var sym = _a[_i];
                _loop_1(sym);
            }
            // TODO this is for testing mostly; we can do this lazily
            for (var _b = 0, _c = pxt.U.values(externalApis); _b < _c.length; _b++) {
                var sym = _c[_b];
                fillTypes(sym);
            }
            tpBuffer = mapTsType("Buffer");
        }
        function mkType(o) {
            if (o === void 0) { o = {}; }
            var r = pxt.U.flatClone(o);
            r.tid = ++typeId;
            return r;
        }
        function mkArrayType(eltTp) {
            return mkType({ primType: "@array", typeArgs: [eltTp] });
        }
        function mkFunType(retTp, argTypes) {
            return mkType({ primType: "@fn" + argTypes.length, typeArgs: [retTp].concat(argTypes) });
        }
        function instanceType(sym) {
            symbolType(sym);
            return sym.pyInstanceType;
        }
        function currentScope() {
            return ctx.currFun || ctx.currClass || ctx.currModule;
        }
        function topScope() {
            var current = currentScope();
            while (current && current.parent) {
                current = current.parent;
            }
            return current;
        }
        function isTopLevel() {
            return ctx.currModule.name == "main" && !ctx.currFun && !ctx.currClass;
        }
        function addImport(a, name, scope) {
            var sym = lookupGlobalSymbol(name);
            if (!sym)
                error(a, 9503, pxt.U.lf("No module named '{0}'", name));
            return sym;
        }
        function defvar(n, opts, scope) {
            if (!scope)
                scope = currentScope();
            var v = scope.vars[n];
            if (!v) {
                var pref = getFullName(scope);
                if (pref)
                    pref += ".";
                var qn = pref + n;
                if (isLocalScope(scope))
                    v = mkSymbol(4 /* Variable */, n);
                else
                    v = addSymbol(4 /* Variable */, qn);
                scope.vars[n] = v;
            }
            for (var _i = 0, _a = Object.keys(opts); _i < _a.length; _i++) {
                var k = _a[_i];
                v[k] = opts[k];
            }
            return v;
        }
        function find(t) {
            if (t.union) {
                t.union = find(t.union);
                return t.union;
            }
            return t;
        }
        // TODO cache it?
        function getFullName(n) {
            var s = n;
            var pref = "";
            if (s.parent && s.parent.kind !== "FunctionDef" && s.parent.kind !== "AsyncFunctionDef") {
                pref = getFullName(s.parent);
                if (!pref)
                    pref = "";
                else
                    pref += ".";
            }
            var nn = n;
            if (n.kind == "Module" && nn.name == "main")
                return "";
            if (nn.name)
                return pref + nn.name;
            else
                return pref + "?" + n.kind;
        }
        function applyTypeMap(s) {
            var over = pxt.U.lookup(typeMap, s);
            if (over)
                return over;
            for (var _i = 0, _a = pxt.U.values(ctx.currModule.vars); _i < _a.length; _i++) {
                var v = _a[_i];
                if (!v.isImport)
                    continue;
                if (v.expandsTo == s)
                    return v.pyName;
                if (v.isImport && pxt.U.startsWith(s, v.expandsTo + ".")) {
                    return v.pyName + s.slice(v.expandsTo.length);
                }
            }
            return s;
        }
        function t2s(t) {
            t = find(t);
            var suff = function (s) { return verboseTypes ? s : ""; };
            if (t.primType) {
                if (t.primType == "@array")
                    return t2s(t.typeArgs[0]) + "[]";
                if (pxt.U.startsWith(t.primType, "@fn"))
                    return "(" + t.typeArgs.slice(1).map(function (t) { return "_: " + t2s(t); }).join(", ") + ") => " + t2s(t.typeArgs[0]);
                return t.primType + suff("/P");
            }
            if (t.classType)
                return applyTypeMap(t.classType.pyQName) + suff("/C");
            else if (t.moduleType)
                return applyTypeMap(t.moduleType.pyQName) + suff("/M");
            else
                return "?" + t.tid;
        }
        function mkDiag(astNode, category, code, messageText) {
            if (!astNode)
                astNode = lastAST;
            if (!astNode || !ctx || !ctx.currModule) {
                return {
                    fileName: lastFile,
                    start: 0,
                    length: 0,
                    line: undefined,
                    column: undefined,
                    code: code,
                    category: category,
                    messageText: messageText,
                };
            }
            else {
                return {
                    fileName: lastFile,
                    start: astNode.startPos,
                    length: astNode.endPos - astNode.startPos,
                    line: undefined,
                    column: undefined,
                    code: code,
                    category: category,
                    messageText: messageText,
                };
            }
        }
        // next free error 9525; 9550-9599 reserved for parser
        function error(astNode, code, msg) {
            diagnostics.push(mkDiag(astNode, pxtc.DiagnosticCategory.Error, code, msg));
            //const pos = position(astNode ? astNode.startPos || 0 : 0, mod.source)
            //currErrs += U.lf("{0} near {1}{2}", msg, mod.tsFilename.replace(/\.ts/, ".py"), pos) + "\n"
        }
        function typeError(a, t0, t1) {
            error(a, 9500, pxt.U.lf("types not compatible: {0} and {1}", t2s(t0), t2s(t1)));
        }
        function typeCtor(t) {
            if (t.primType)
                return t.primType;
            else if (t.classType)
                return t.classType;
            else if (t.moduleType) {
                // a class SymbolInfo can be used as both classType and moduleType
                // but these are different constructors (one is instance, one is class itself)
                if (!t.moduleType.moduleTypeMarker)
                    t.moduleType.moduleTypeMarker = {};
                return t.moduleType.moduleTypeMarker;
            }
            return null;
        }
        function isFree(t) {
            return !typeCtor(find(t));
        }
        function canUnify(t0, t1) {
            t0 = find(t0);
            t1 = find(t1);
            if (t0 === t1)
                return true;
            var c0 = typeCtor(t0);
            var c1 = typeCtor(t1);
            if (!c0 || !c1)
                return true;
            if (c0 !== c1)
                return false;
            if (t0.typeArgs && t1.typeArgs) {
                for (var i = 0; i < Math.min(t0.typeArgs.length, t1.typeArgs.length); ++i)
                    if (!canUnify(t0.typeArgs[i], t1.typeArgs[i]))
                        return false;
            }
            return true;
        }
        function unifyClass(a, t, cd) {
            t = find(t);
            if (t.classType == cd)
                return;
            if (isFree(t)) {
                t.classType = cd;
                return;
            }
            unify(a, t, instanceType(cd));
        }
        function unifyTypeOf(e, t1) {
            unify(e, typeOf(e), t1);
        }
        function unify(a, t0, t1) {
            if (t0 === t1)
                return;
            t0 = find(t0);
            t1 = find(t1);
            if (t0 === t1)
                return;
            if (t0.primType === "any") {
                t0.union = t1;
                return;
            }
            var c0 = typeCtor(t0);
            var c1 = typeCtor(t1);
            if (c0 && c1) {
                if (c0 === c1) {
                    t0.union = t1; // no type-state change here - actual change would be in arguments only
                    if (t0.typeArgs && t1.typeArgs) {
                        for (var i = 0; i < Math.min(t0.typeArgs.length, t1.typeArgs.length); ++i)
                            unify(a, t0.typeArgs[i], t1.typeArgs[i]);
                    }
                    t0.union = t1;
                }
                else {
                    typeError(a, t0, t1);
                }
            }
            else if (c0 && !c1) {
                unify(a, t1, t0);
            }
            else {
                // the type state actually changes here
                numUnifies++;
                t0.union = t1;
                // detect late unifications
                // if (currIteration > 2) error(a, `unify ${t2s(t0)} ${t2s(t1)}`)
            }
        }
        function mkSymbol(kind, qname) {
            var m = /(.*)\.(.*)/.exec(qname);
            var name = m ? m[2] : qname;
            var ns = m ? m[1] : "";
            return {
                kind: kind,
                name: name,
                pyName: name,
                qName: qname,
                pyQName: qname,
                namespace: ns,
                attributes: {},
                pyRetType: mkType()
            };
        }
        function addSymbol(kind, qname) {
            var sym = internalApis[qname];
            if (sym) {
                sym.kind = kind;
                return sym;
            }
            sym = mkSymbol(kind, qname);
            internalApis[sym.pyQName] = sym;
            return sym;
        }
        function isLocalScope(scope) {
            while (scope) {
                if (scope.kind == "FunctionDef")
                    return true;
                scope = scope.parent;
            }
            return false;
        }
        function addSymbolFor(k, n, scope) {
            if (!n.symInfo) {
                var qn = getFullName(n);
                if (pxt.U.endsWith(qn, ".__init__"))
                    qn = qn.slice(0, -9) + ".__constructor";
                scope = scope || currentScope();
                if (isLocalScope(scope))
                    n.symInfo = mkSymbol(k, qn);
                else
                    n.symInfo = addSymbol(k, qn);
                var sym = n.symInfo;
                sym.pyAST = n;
                scope.vars[sym.pyName] = sym;
            }
            return n.symInfo;
        }
        // TODO optimize ?
        function listClassFields(cd) {
            var qn = cd.symInfo.qName;
            return pxt.U.values(internalApis).filter(function (e) { return e.namespace == qn && e.kind == 2 /* Property */; });
        }
        function getClassField(ct, n, checkOnly, skipBases) {
            if (checkOnly === void 0) { checkOnly = false; }
            if (skipBases === void 0) { skipBases = false; }
            var qid = ct.pyQName + "." + n;
            var f = lookupGlobalSymbol(qid);
            if (f)
                return f;
            if (!skipBases) {
                for (var _i = 0, _a = ct.extendsTypes || []; _i < _a.length; _i++) {
                    var b = _a[_i];
                    var sym = lookupGlobalSymbol(b);
                    if (sym) {
                        if (sym == ct)
                            pxt.U.userError("field lookup loop on: " + sym.qName + " / " + n);
                        f = getClassField(sym, n, true);
                        if (f)
                            return f;
                    }
                }
            }
            if (!checkOnly && ct.pyAST && ct.pyAST.kind == "ClassDef") {
                var sym = addSymbol(2 /* Property */, qid);
                sym.isInstance = true;
                return sym;
            }
            return null;
        }
        function getTypeField(recv, n, checkOnly) {
            if (checkOnly === void 0) { checkOnly = false; }
            var t = find(typeOf(recv));
            var ct = t.classType;
            if (!ct) {
                ct = resolvePrimType(t.primType);
            }
            if (ct) {
                var f = getClassField(ct, n, checkOnly);
                if (f) {
                    if (!f.isInstance)
                        error(null, 9504, pxt.U.lf("the field '{0}' of '{1}' is static", n, ct.pyQName));
                    if (isSuper(recv) ||
                        (isThis(recv) && f.namespace != ctx.currClass.symInfo.qName)) {
                        f.isProtected = true;
                    }
                }
                return f;
            }
            ct = t.moduleType;
            if (ct) {
                var f = getClassField(ct, n, checkOnly);
                if (f && f.isInstance)
                    error(null, 9505, pxt.U.lf("the field '{0}' of '{1}' is not static", n, ct.pyQName));
                return f;
            }
            return null;
        }
        function resolvePrimType(primType) {
            if (primType == "@array") {
                return lookupApi("_py.Array");
            }
            else if (primType == "string") {
                return lookupApi("_py.String");
            }
            return undefined;
        }
        function lookupVar(n) {
            var s = currentScope();
            var v = pxt.U.lookup(s.vars, n);
            if (v)
                return v;
            // while (s) {
            //     let v = U.lookup(s.vars, n)
            //     if (v) return v
            //     // go to parent, excluding class scopes
            //     do {
            //         s = s.parent
            //     } while (s && s.kind == "ClassDef")
            // }
            //if (autoImport && lookupGlobalSymbol(n)) {
            //    return addImport(currentScope(), n, ctx.currModule)
            //}
            return null;
        }
        function lookupSymbol(n) {
            if (!n)
                return null;
            var firstDot = n.indexOf(".");
            if (firstDot > 0) {
                var v = lookupVar(n.slice(0, firstDot));
                // expand name if needed
                if (v && v.pyQName != v.pyName)
                    n = v.pyQName + n.slice(firstDot);
            }
            else {
                var v = lookupVar(n);
                if (v)
                    return v;
            }
            return lookupGlobalSymbol(n);
        }
        function getClassDef(e) {
            var n = getName(e);
            var s = lookupSymbol(n);
            if (s && s.pyAST && s.pyAST.kind == "ClassDef")
                return s.pyAST;
            return null;
        }
        function typeOf(e) {
            if (e.tsType) {
                return find(e.tsType);
            }
            else {
                e.tsType = mkType();
                return e.tsType;
            }
        }
        function isOfType(e, name) {
            var t = typeOf(e);
            if (t.classType && t.classType.pyQName == name)
                return true;
            if (t2s(t) == name)
                return true;
            return false;
        }
        function resetCtx(m) {
            ctx = {
                currClass: null,
                currFun: null,
                currModule: m,
                blockDepth: 0
            };
            lastFile = m.tsFilename.replace(/\.ts$/, ".py");
        }
        function isModule(s) {
            if (!s)
                return false;
            switch (s.kind) {
                case 5 /* Module */:
                case 9 /* Interface */:
                case 8 /* Class */:
                case 6 /* Enum */:
                    return true;
                default:
                    return false;
            }
        }
        function scope(f) {
            var prevCtx = pxt.U.flatClone(ctx);
            var r;
            try {
                r = f();
            }
            finally {
                ctx = prevCtx;
            }
            return r;
        }
        function todoExpr(name, e) {
            if (!e)
                return B.mkText("");
            return B.mkGroup([B.mkText("/* TODO: " + name + " "), e, B.mkText(" */")]);
        }
        function todoComment(name, n) {
            if (n.length == 0)
                return B.mkText("");
            return B.mkGroup([B.mkText("/* TODO: " + name + " "), B.mkGroup(n), B.mkText(" */"), B.mkNewLine()]);
        }
        function doKeyword(k) {
            var t = expr(k.value);
            if (k.arg)
                return B.mkInfix(B.mkText(k.arg), "=", t);
            else
                return B.mkGroup([B.mkText("**"), t]);
        }
        function compileType(e) {
            if (!e)
                return mkType();
            var tpName = getName(e);
            if (tpName) {
                var sym = lookupApi(tpName + "@type") || lookupApi(tpName);
                if (sym) {
                    symbolType(sym);
                    if (sym.kind == 6 /* Enum */)
                        return tpNumber;
                    if (sym.pyInstanceType)
                        return sym.pyInstanceType;
                }
                error(e, 9506, pxt.U.lf("cannot find type '{0}'", tpName));
            }
            error(e, 9507, pxt.U.lf("invalid type syntax"));
            return mkType({});
        }
        function doArgs(n, isMethod) {
            var args = n.args;
            if (args.kwonlyargs.length)
                error(n, 9517, pxt.U.lf("keyword-only arguments not supported yet"));
            var nargs = args.args.slice();
            if (isMethod) {
                if (nargs[0].arg != "self")
                    error(n, 9518, pxt.U.lf("first argument of method has to be called 'self'"));
                nargs.shift();
            }
            else {
                if (nargs.some(function (a) { return a.arg == "self"; }))
                    error(n, 9519, pxt.U.lf("non-methods cannot have an argument called 'self'"));
            }
            if (!n.symInfo.parameters) {
                var didx_1 = args.defaults.length - nargs.length;
                n.symInfo.parameters = nargs.map(function (a) {
                    var tp = compileType(a.annotation);
                    var defl = "";
                    if (didx_1 >= 0) {
                        defl = B.flattenNode([expr(args.defaults[didx_1])]).output;
                        unify(a, tp, typeOf(args.defaults[didx_1]));
                    }
                    didx_1++;
                    return {
                        name: a.arg,
                        description: "",
                        type: "",
                        initializer: defl,
                        default: defl,
                        pyType: tp
                    };
                });
            }
            var lst = n.symInfo.parameters.map(function (p) {
                var v = defvar(p.name, { isParam: true });
                unify(n, symbolType(v), p.pyType);
                var res = [quote(p.name), typeAnnot(p.pyType)];
                if (p.default) {
                    res.push(B.mkText(" = " + p.default));
                }
                return B.mkGroup(res);
            });
            if (args.vararg)
                lst.push(B.mkText("TODO *" + args.vararg.arg));
            if (args.kwarg)
                lst.push(B.mkText("TODO **" + args.kwarg.arg));
            return B.H.mkParenthesizedExpression(B.mkCommaSep(lst));
        }
        function accessAnnot(f) {
            if (f.pyName[0] != "_")
                return B.mkText("");
            return f.isProtected ? B.mkText("protected ") : B.mkText("private ");
        }
        var numOps = {
            Sub: 1,
            Div: 1,
            Pow: 1,
            LShift: 1,
            RShift: 1,
            BitOr: 1,
            BitXor: 1,
            BitAnd: 1,
            FloorDiv: 1,
            Mult: 1,
        };
        var opMapping = {
            Add: "+",
            Sub: "-",
            Mult: "*",
            MatMult: "Math.matrixMult",
            Div: "/",
            Mod: "%",
            Pow: "**",
            LShift: "<<",
            RShift: ">>",
            BitOr: "|",
            BitXor: "^",
            BitAnd: "&",
            FloorDiv: "Math.idiv",
            And: "&&",
            Or: "||",
            Eq: "==",
            NotEq: "!=",
            Lt: "<",
            LtE: "<=",
            Gt: ">",
            GtE: ">=",
            Is: "===",
            IsNot: "!==",
            In: "py.In",
            NotIn: "py.NotIn",
        };
        var prefixOps = {
            Invert: "~",
            Not: "!",
            UAdd: "P+",
            USub: "P-",
        };
        var typeMap = {
            "adafruit_bus_device.i2c_device.I2CDevice": "pins.I2CDevice"
        };
        function stmts(ss) {
            ctx.blockDepth++;
            var res = B.mkBlock(ss.map(stmt));
            ctx.blockDepth--;
            return res;
        }
        function exprs0(ee) {
            ee = ee.filter(function (e) { return !!e; });
            return ee.map(expr);
        }
        function setupScope(n) {
            if (!n.vars) {
                n.vars = {};
                n.parent = currentScope();
                n.blockDepth = ctx.blockDepth;
            }
        }
        function typeAnnot(t) {
            var s = t2s(t);
            if (s[0] == "?") {
                // TODO:
                // example from minecraft doc snippet:
                // player.onChat("while",function(num1){while(num1<10){}})
                // -> py -> ts ->
                // player.onChat("while",function(num1:any;/**TODO:type**/){while(num1<10){;}})
                // work around using any:
                // return B.mkText(": any /** TODO: type **/")
                // but for now we can just omit the type and most of the type it'll be inferable
                return B.mkText("");
            }
            return B.mkText(": " + t2s(t));
        }
        function guardedScope(v, f) {
            try {
                return scope(f);
            }
            catch (e) {
                console.log(e);
                return B.mkStmt(todoComment("conversion failed for " + (v.name || v.kind), []));
            }
        }
        function shouldInlineFunction(si) {
            if (!si || !si.pyAST)
                return false;
            if (si.pyAST.kind != "FunctionDef")
                return false;
            var fn = si.pyAST;
            if (!fn.callers || fn.callers.length != 1)
                return false;
            if (fn.callers[0].inCalledPosition)
                return false;
            return true;
        }
        function emitFunctionDef(n, inline) {
            if (inline === void 0) { inline = false; }
            return guardedScope(n, function () {
                var isMethod = !!ctx.currClass && !ctx.currFun;
                var topLev = isTopLevel();
                var nested = !!ctx.currFun;
                setupScope(n);
                var existing = lookupSymbol(getFullName(n));
                var sym = addSymbolFor(isMethod ? 1 /* Method */ : 3 /* Function */, n);
                if (!inline) {
                    if (existing && existing.declared === currIteration) {
                        error(n, 9520, lf("Duplicate function declaration"));
                    }
                    sym.declared = currIteration;
                    if (shouldInlineFunction(sym)) {
                        return B.mkText("");
                    }
                }
                if (isMethod)
                    sym.isInstance = true;
                ctx.currFun = n;
                var prefix = "";
                var funname = n.name;
                var remainingDecorators = n.decorator_list.filter(function (d) {
                    if (getName(d) == "property") {
                        prefix = "get";
                        return false;
                    }
                    if (d.kind == "Attribute" && d.attr == "setter" &&
                        d.value.kind == "Name") {
                        funname = d.value.id;
                        prefix = "set";
                        return false;
                    }
                    return true;
                });
                var nodes = [
                    todoComment("decorators", remainingDecorators.map(expr))
                ];
                if (n.body.length >= 1 && n.body[0].kind == "Raise")
                    n.alwaysThrows = true;
                if (isMethod) {
                    if (n.name == "__init__") {
                        nodes.push(B.mkText("constructor"));
                        unifyClass(n, sym.pyRetType, ctx.currClass.symInfo);
                    }
                    else {
                        if (funname == "__get__" || funname == "__set__") {
                            var vv = n.vars["value"];
                            if (funname == "__set__" && vv) {
                                var cf = getClassField(ctx.currClass.symInfo, "__get__");
                                if (cf.pyAST && cf.pyAST.kind == "FunctionDef")
                                    unify(n, vv.pyRetType, cf.pyRetType);
                            }
                            funname = funname.replace(/_/g, "");
                        }
                        if (!prefix) {
                            prefix = funname[0] == "_" ? (sym.isProtected ? "protected" : "private") : "public";
                        }
                        nodes.push(B.mkText(prefix + " "), quote(funname));
                    }
                }
                else {
                    pxt.U.assert(!prefix);
                    if (n.name[0] == "_" || topLev || inline || nested)
                        nodes.push(B.mkText("function "), quote(funname));
                    else
                        nodes.push(B.mkText("export function "), quote(funname));
                }
                nodes.push(doArgs(n, isMethod), n.returns ? typeAnnot(compileType(n.returns)) : B.mkText(""));
                // make sure type is initialized
                symbolType(sym);
                var body = n.body.map(stmt);
                if (n.name == "__init__") {
                    for (var _i = 0, _a = listClassFields(ctx.currClass); _i < _a.length; _i++) {
                        var f = _a[_i];
                        var p = f.pyAST;
                        if (p && p.value) {
                            body.push(B.mkStmt(B.mkText("this." + quoteStr(f.pyName) + " = "), expr(p.value)));
                        }
                    }
                }
                var hoisted = collectHoistedDeclarations(n);
                nodes.push(B.mkBlock(hoisted.concat(body)));
                var ret = B.mkGroup(nodes);
                if (inline)
                    nodes[nodes.length - 1].noFinalNewline = true;
                else
                    ret = B.mkStmt(ret);
                return ret;
            });
        }
        var stmtMap = {
            FunctionDef: function (n) { return emitFunctionDef(n); },
            ClassDef: function (n) { return guardedScope(n, function () {
                setupScope(n);
                var sym = addSymbolFor(8 /* Class */, n);
                pxt.U.assert(!ctx.currClass);
                var topLev = isTopLevel();
                ctx.currClass = n;
                n.isNamespace = n.decorator_list.some(function (d) { return d.kind == "Name" && d.id == "namespace"; });
                var nodes = n.isNamespace ?
                    [B.mkText("namespace "), quote(n.name)]
                    : [
                        todoComment("keywords", n.keywords.map(doKeyword)),
                        todoComment("decorators", n.decorator_list.map(expr)),
                        B.mkText(topLev ? "class " : "export class "),
                        quote(n.name)
                    ];
                if (!n.isNamespace && n.bases.length > 0) {
                    if (getName(n.bases[0]) == "Enum") {
                        n.isEnum = true;
                    }
                    else {
                        nodes.push(B.mkText(" extends "));
                        nodes.push(B.mkCommaSep(n.bases.map(expr)));
                        var b = getClassDef(n.bases[0]);
                        if (b) {
                            n.baseClass = b;
                            sym.extendsTypes = [b.symInfo.pyQName];
                        }
                    }
                }
                var body = stmts(n.body);
                nodes.push(body);
                var fieldDefs = listClassFields(n)
                    .filter(function (f) { return f.kind == 2 /* Property */ && f.isInstance; })
                    .map(function (f) { return B.mkStmt(accessAnnot(f), quote(f.pyName), typeAnnot(f.pyRetType)); });
                body.children = fieldDefs.concat(body.children);
                return B.mkStmt(B.mkGroup(nodes));
            }); },
            Return: function (n) {
                if (n.value) {
                    var f = ctx.currFun;
                    if (f)
                        unifyTypeOf(n.value, f.symInfo.pyRetType);
                    return B.mkStmt(B.mkText("return "), expr(n.value));
                }
                else {
                    return B.mkStmt(B.mkText("return"));
                }
            },
            AugAssign: function (n) {
                var op = opMapping[n.op];
                if (op.length > 3)
                    return B.mkStmt(B.mkInfix(expr(n.target), "=", B.H.mkCall(op, [expr(n.target), expr(n.value)])));
                else
                    return B.mkStmt(expr(n.target), B.mkText(" " + op + "= "), expr(n.value));
            },
            Assign: function (n) {
                return convertAssign(n);
            },
            AnnAssign: function (n) {
                return convertAssign(n);
            },
            For: function (n) {
                pxt.U.assert(n.orelse.length == 0);
                if (isCallTo(n.iter, "range")) {
                    var r = n.iter;
                    var def = expr(n.target);
                    var ref = quote(getName(n.target));
                    unifyTypeOf(n.target, tpNumber);
                    var start = r.args.length == 1 ? B.mkText("0") : expr(r.args[0]);
                    var stop_1 = expr(r.args[r.args.length == 1 ? 0 : 1]);
                    return B.mkStmt(B.mkText("for ("), B.mkInfix(def, "=", start), B.mkText("; "), B.mkInfix(ref, "<", stop_1), B.mkText("; "), r.args.length >= 3 ?
                        B.mkInfix(ref, "+=", expr(r.args[2])) :
                        B.mkPostfix([ref], "++"), B.mkText(")"), stmts(n.body));
                }
                unifyTypeOf(n.iter, mkArrayType(typeOf(n.target)));
                return B.mkStmt(B.mkText("for ("), expr(n.target), B.mkText(" of "), expr(n.iter), B.mkText(")"), stmts(n.body));
            },
            While: function (n) {
                pxt.U.assert(n.orelse.length == 0);
                return B.mkStmt(B.mkText("while ("), expr(n.test), B.mkText(")"), stmts(n.body));
            },
            If: function (n) {
                var innerIf = function (n) {
                    var nodes = [
                        B.mkText("if ("),
                        expr(n.test),
                        B.mkText(")"),
                        stmts(n.body)
                    ];
                    if (n.orelse.length) {
                        nodes[nodes.length - 1].noFinalNewline = true;
                        if (n.orelse.length == 1 && n.orelse[0].kind == "If") {
                            // else if
                            nodes.push(B.mkText(" else "));
                            pxt.U.pushRange(nodes, innerIf(n.orelse[0]));
                        }
                        else {
                            nodes.push(B.mkText(" else"), stmts(n.orelse));
                        }
                    }
                    return nodes;
                };
                return B.mkStmt(B.mkGroup(innerIf(n)));
            },
            With: function (n) {
                if (n.items.length == 1 && isOfType(n.items[0].context_expr, "pins.I2CDevice")) {
                    var it = n.items[0];
                    var id = getName(it.optional_vars);
                    var res = [];
                    var devRef = expr(it.context_expr);
                    if (id) {
                        var v = defvar(id, { isLocal: true });
                        id = quoteStr(id);
                        res.push(B.mkStmt(B.mkText("const " + id + " = "), devRef));
                        unifyTypeOf(it.context_expr, v.pyRetType);
                        devRef = B.mkText(id);
                    }
                    res.push(B.mkStmt(B.mkInfix(devRef, ".", B.mkText("begin()"))));
                    pxt.U.pushRange(res, n.body.map(stmt));
                    res.push(B.mkStmt(B.mkInfix(devRef, ".", B.mkText("end()"))));
                    return B.mkGroup(res);
                }
                var cleanup = [];
                var stmts = n.items.map(function (it, idx) {
                    var varName = "with" + idx;
                    if (it.optional_vars) {
                        var id = getName(it.optional_vars);
                        pxt.U.assert(id != null);
                        defvar(id, { isLocal: true });
                        varName = quoteStr(id);
                    }
                    cleanup.push(B.mkStmt(B.mkText(varName + ".end()")));
                    return B.mkStmt(B.mkText("const " + varName + " = "), B.mkInfix(expr(it.context_expr), ".", B.mkText("begin()")));
                });
                pxt.U.pushRange(stmts, n.body.map(stmt));
                pxt.U.pushRange(stmts, cleanup);
                return B.mkBlock(stmts);
            },
            Raise: function (n) {
                var ex = n.exc || n.cause;
                if (!ex)
                    return B.mkStmt(B.mkText("throw"));
                var msg;
                if (ex && ex.kind == "Call") {
                    var cex = ex;
                    if (cex.args.length == 1) {
                        msg = expr(cex.args[0]);
                    }
                }
                // didn't find string - just compile and quote; and hope for the best
                if (!msg)
                    msg = B.mkGroup([B.mkText("`"), expr(ex), B.mkText("`")]);
                return B.mkStmt(B.H.mkCall("control.fail", [msg]));
            },
            Assert: function (n) { return B.mkStmt(B.H.mkCall("control.assert", exprs0([n.test, n.msg]))); },
            Import: function (n) {
                for (var _i = 0, _a = n.names; _i < _a.length; _i++) {
                    var nm = _a[_i];
                    if (nm.asname)
                        defvar(nm.asname, {
                            expandsTo: nm.name
                        });
                    addImport(n, nm.name);
                }
                return B.mkText("");
            },
            ImportFrom: function (n) {
                var res = [];
                for (var _i = 0, _a = n.names; _i < _a.length; _i++) {
                    var nn = _a[_i];
                    if (nn.name == "*")
                        defvar(n.module, {
                            isImportStar: true
                        });
                    else {
                        var fullname = n.module + "." + nn.name;
                        var sym = lookupGlobalSymbol(fullname);
                        var currname = nn.asname || nn.name;
                        if (isModule(sym)) {
                            defvar(currname, {
                                isImport: sym,
                                expandsTo: fullname
                            });
                            res.push(B.mkStmt(B.mkText("import " + quoteStr(currname) + " = " + fullname)));
                        }
                        else {
                            defvar(currname, {
                                expandsTo: fullname
                            });
                        }
                    }
                }
                return B.mkGroup(res);
            },
            ExprStmt: function (n) {
                return n.value.kind == "Str" ?
                    docComment(n.value.s) :
                    B.mkStmt(expr(n.value));
            },
            Pass: function (n) { return B.mkStmt(B.mkText("")); },
            Break: function (n) { return B.mkStmt(B.mkText("break")); },
            Continue: function (n) { return B.mkStmt(B.mkText("break")); },
            Delete: function (n) { return stmtTODO(n); },
            Try: function (n) {
                var r = [
                    B.mkText("try"),
                    stmts(n.body.concat(n.orelse)),
                ];
                for (var _i = 0, _a = n.handlers; _i < _a.length; _i++) {
                    var e = _a[_i];
                    r.push(B.mkText("catch ("), e.name ? quote(e.name) : B.mkText("_"));
                    // This isn't JS syntax, but PXT doesn't support try at all anyway
                    if (e.type)
                        r.push(B.mkText("/* instanceof "), expr(e.type), B.mkText(" */"));
                    r.push(B.mkText(")"), stmts(e.body));
                }
                if (n.finalbody.length)
                    r.push(B.mkText("finally"), stmts(n.finalbody));
                return B.mkStmt(B.mkGroup(r));
            },
            AsyncFunctionDef: function (n) { return stmtTODO(n); },
            AsyncFor: function (n) { return stmtTODO(n); },
            AsyncWith: function (n) { return stmtTODO(n); },
            Global: function (n) {
                var globalScope = topScope();
                var current = currentScope();
                for (var _i = 0, _a = n.names; _i < _a.length; _i++) {
                    var name_1 = _a[_i];
                    var existing = pxt.U.lookup(globalScope.vars, name_1);
                    if (!existing) {
                        error(n, 9521, pxt.U.lf("No binding found for global variable"));
                    }
                    var sym = defvar(name_1, { modifier: py.VarModifier.Global });
                    if (sym.firstRefPos < n.startPos) {
                        error(n, 9522, pxt.U.lf("Variable referenced before global declaration"));
                    }
                }
                return B.mkStmt(B.mkText(""));
            },
            Nonlocal: function (n) {
                var globalScope = topScope();
                var current = currentScope();
                for (var _i = 0, _a = n.names; _i < _a.length; _i++) {
                    var name_2 = _a[_i];
                    var declaringScope = findNonlocalDeclaration(name_2, current);
                    // Python nonlocal variables cannot refer to globals
                    if (!declaringScope || declaringScope === globalScope || declaringScope.vars[name_2].modifier === py.VarModifier.Global) {
                        error(n, 9523, pxt.U.lf("No binding found for nonlocal variable"));
                    }
                    var sym = defvar(name_2, { modifier: py.VarModifier.NonLocal });
                    if (sym.firstRefPos < n.startPos) {
                        error(n, 9524, pxt.U.lf("Variable referenced before nonlocal declaration"));
                    }
                }
                return B.mkStmt(B.mkText(""));
            }
        };
        function convertAssign(n) {
            var annotation;
            var value;
            var target;
            // TODO handle more than 1 target
            if (n.kind === "Assign") {
                if (n.targets.length != 1)
                    return stmtTODO(n);
                target = n.targets[0];
                value = n.value;
                annotation = null;
            }
            else if (n.kind === "AnnAssign") {
                target = n.target;
                value = n.value || null;
                annotation = n.annotation;
            }
            else {
                return n;
            }
            var pref = "";
            var isConstCall = value ? isCallTo(value, "const") : false;
            var nm = getName(target) || "";
            if (!isTopLevel() && !ctx.currClass && !ctx.currFun && nm[0] != "_")
                pref = "export ";
            if (nm && ctx.currClass && !ctx.currFun) {
                // class fields can't be const
                // hack: value in @namespace should always be const
                isConstCall = value && ctx.currClass.isNamespace;
                var fd = getClassField(ctx.currClass.symInfo, nm);
                // TODO: use or remove this code
                /*
                let src = expr(value)
                let attrTp = typeOf(value)
                let getter = getTypeField(value, "__get__", true)
                if (getter) {
                    unify(n, fd.pyRetType, getter.pyRetType)
                    let implNm = "_" + nm
                    let fdBack = getClassField(ctx.currClass.symInfo, implNm)
                    unify(n, fdBack.pyRetType, attrTp)
                    let setter = getTypeField(attrTp, "__set__", true)
                    let res = [
                        B.mkNewLine(),
                        B.mkStmt(B.mkText("private "), quote(implNm), typeAnnot(attrTp))
                    ]
                    if (!getter.fundef.alwaysThrows)
                        res.push(B.mkStmt(B.mkText(`get ${quoteStr(nm)}()`), typeAnnot(fd.type), B.mkBlock([
                            B.mkText(`return this.${quoteStr(implNm)}.get(this.i2c_device)`),
                            B.mkNewLine()
                        ])))
                    if (!setter.fundef.alwaysThrows)
                        res.push(B.mkStmt(B.mkText(`set ${quoteStr(nm)}(value`), typeAnnot(fd.type),
                            B.mkText(`) `), B.mkBlock([
                                B.mkText(`this.${quoteStr(implNm)}.set(this.i2c_device, value)`),
                                B.mkNewLine()
                            ])))
                    fdBack.initializer = value
                    fd.isGetSet = true
                    fdBack.isGetSet = true
                    return B.mkGroup(res)
                } else
                */
                if (currIteration == 0) {
                    return B.mkText("/* skip for now */");
                }
                unifyTypeOf(target, fd.pyRetType);
                fd.isInstance = false;
                pref = ctx.currClass.isNamespace ? "export " + (isConstCall ? "const" : "let") + " " : "static ";
            }
            if (value)
                unifyTypeOf(target, typeOf(value));
            if (isConstCall) {
                // first run would have "let" in it
                defvar(getName(target), {});
                if (!/^static /.test(pref) && !/const/.test(pref))
                    pref += "const ";
                return B.mkStmt(B.mkText(pref), B.mkInfix(expr(target), "=", expr(value)));
            }
            if (!pref && target.kind == "Tuple") {
                var tup = target;
                var targs = [B.mkText("let "), B.mkText("[")];
                var nonNames = tup.elts.filter(function (e) { return e.kind !== "Name"; });
                if (nonNames.length)
                    return stmtTODO(n);
                var tupNames = tup.elts
                    .map(function (e) { return e; })
                    .map(convertName);
                targs.push(B.mkCommaSep(tupNames));
                targs.push(B.mkText("]"));
                var res = B.mkStmt(B.mkInfix(B.mkGroup(targs), "=", expr(value)));
                return res;
            }
            if (target.kind === "Name") {
                var sym = currentScope().vars[nm];
                // Mark the assignment only if the variable is declared in this scope
                if (sym && sym.kind === 4 /* Variable */ && sym.modifier === undefined) {
                    if (sym.firstAssignPos === undefined || sym.firstAssignPos > target.startPos) {
                        sym.firstAssignPos = target.startPos;
                        sym.firstAssignDepth = ctx.blockDepth;
                    }
                }
            }
            return B.mkStmt(B.mkText(pref), B.mkInfix(expr(target), "=", expr(value)));
            function convertName(n) {
                // TODO resuse with Name expr
                markInfoNode(n, "identifierCompletion");
                typeOf(n);
                var v = lookupName(n);
                return possibleDef(n, /*excludeLet*/ true);
            }
        }
        function possibleDef(n, excludeLet) {
            if (excludeLet === void 0) { excludeLet = false; }
            var id = n.id;
            var curr = lookupSymbol(id);
            var local = currentScope().vars[id];
            if (n.isdef === undefined) {
                if (!curr || (curr.kind === 4 /* Variable */ && curr !== local)) {
                    if (ctx.currClass && !ctx.currFun) {
                        n.isdef = false; // field
                        curr = defvar(id, {});
                    }
                    else {
                        n.isdef = true;
                        curr = defvar(id, { isLocal: true });
                    }
                }
                else {
                    n.isdef = false;
                }
                n.symbolInfo = curr;
                unify(n, n.tsType, curr.pyRetType);
            }
            if (n.isdef && shouldHoist(curr, currentScope())) {
                n.isdef = false;
            }
            markUsage(curr, n);
            if (n.isdef && !excludeLet) {
                return B.mkGroup([B.mkText("let "), quote(id)]);
            }
            else
                return quote(id);
        }
        function quoteStr(id) {
            if (B.isReservedWord(id))
                return id + "_";
            else if (!id)
                return id;
            else
                return id;
            //return id.replace(/([a-z0-9])_([a-zA-Z0-9])/g, (f: string, x: string, y: string) => x + y.toUpperCase())
        }
        function getName(e) {
            if (e == null)
                return null;
            if (e.kind == "Name") {
                var s = e.id;
                var v = lookupVar(s);
                if (v && v.expandsTo)
                    return v.expandsTo;
                else
                    return s;
            }
            if (e.kind == "Attribute") {
                var pref = getName(e.value);
                if (pref)
                    return pref + "." + e.attr;
            }
            return null;
        }
        function quote(id) {
            if (id == "self")
                return B.mkText("this");
            return B.mkText(quoteStr(id));
        }
        function isCallTo(n, fn) {
            if (n.kind != "Call")
                return false;
            var c = n;
            return getName(c.func) == fn;
        }
        function binop(left, pyName, right) {
            var op = opMapping[pyName];
            pxt.U.assert(!!op);
            if (op.length > 3)
                return B.H.mkCall(op, [left, right]);
            else
                return B.mkInfix(left, op, right);
        }
        var funMapExtension = {
            "memoryview": { n: "", t: tpBuffer },
            "const": { n: "", t: tpNumber },
            "micropython.const": { n: "", t: tpNumber }
        };
        function getFunMap() {
            var funMap = {};
            Object.keys(pxtc.ts2PyFunNameMap).forEach(function (k) {
                var tsOverride = pxtc.ts2PyFunNameMap[k];
                if (tsOverride && tsOverride.n) {
                    var py2TsOverride = {
                        n: k,
                        t: ts2PyType(tsOverride.t),
                        scale: tsOverride.scale
                    };
                    funMap[tsOverride.n] = py2TsOverride;
                }
            });
            Object.keys(funMapExtension).forEach(function (k) {
                funMap[k] = funMapExtension[k];
            });
            return funMap;
        }
        var funMap = getFunMap();
        function isSuper(v) {
            return isCallTo(v, "super") && v.args.length == 0;
        }
        function isThis(v) {
            return v.kind == "Name" && v.id == "self";
        }
        function handleFmt(n) {
            if (n.op == "Mod" && n.left.kind == "Str" &&
                (n.right.kind == "Tuple" || n.right.kind == "List")) {
                var fmt = n.left.s;
                var elts_1 = n.right.elts;
                elts_1 = elts_1.slice();
                var res_1 = [B.mkText("`")];
                fmt.replace(/([^%]+)|(%[\d\.]*([a-zA-Z%]))/g, function (f, reg, f2, flet) {
                    if (reg)
                        res_1.push(B.mkText(reg.replace(/[`\\$]/g, function (f) { return "\\" + f; })));
                    else {
                        var ee = elts_1.shift();
                        var et = ee ? expr(ee) : B.mkText("???");
                        /* tslint:disable:no-invalid-template-strings */
                        res_1.push(B.mkText("${"), et, B.mkText("}"));
                        /* tslint:enable:no-invalid-template-strings */
                    }
                    return "";
                });
                res_1.push(B.mkText("`"));
                return B.mkGroup(res_1);
            }
            return null;
        }
        function forceBackticks(n) {
            if (n.type == B.NT.Prefix && n.op[0] == "\"") {
                return B.mkText(B.backtickLit(JSON.parse(n.op)));
            }
            return n;
        }
        function nodeInInfoRange(n) {
            return syntaxInfo && n.startPos <= syntaxInfo.position && syntaxInfo.position <= n.endPos;
        }
        function markInfoNode(n, tp) {
            if (currIteration > 100 && syntaxInfo &&
                infoNode == null && (syntaxInfo.type == tp || syntaxInfo.type == "symbol") &&
                nodeInInfoRange(n)) {
                infoNode = n;
                infoScope = currentScope();
            }
        }
        function addCaller(e, v) {
            if (v && v.pyAST && v.pyAST.kind == "FunctionDef") {
                var fn = v.pyAST;
                if (!fn.callers)
                    fn.callers = [];
                if (fn.callers.indexOf(e) < 0)
                    fn.callers.push(e);
            }
        }
        var exprMap = {
            BoolOp: function (n) {
                var r = expr(n.values[0]);
                for (var i = 1; i < n.values.length; ++i) {
                    r = binop(r, n.op, expr(n.values[i]));
                }
                return r;
            },
            BinOp: function (n) {
                var r = handleFmt(n);
                if (r)
                    return r;
                r = binop(expr(n.left), n.op, expr(n.right));
                if (numOps[n.op]) {
                    unifyTypeOf(n.left, tpNumber);
                    unifyTypeOf(n.right, tpNumber);
                    unify(n, n.tsType, tpNumber);
                }
                return r;
            },
            UnaryOp: function (n) {
                var op = prefixOps[n.op];
                pxt.U.assert(!!op);
                return B.mkInfix(null, op, expr(n.operand));
            },
            Lambda: function (n) { return exprTODO(n); },
            IfExp: function (n) {
                return B.mkInfix(B.mkInfix(expr(n.test), "?", expr(n.body)), ":", expr(n.orelse));
            },
            Dict: function (n) { return exprTODO(n); },
            Set: function (n) { return exprTODO(n); },
            ListComp: function (n) { return exprTODO(n); },
            SetComp: function (n) { return exprTODO(n); },
            DictComp: function (n) { return exprTODO(n); },
            GeneratorExp: function (n) {
                if (n.generators.length == 1 && n.generators[0].kind == "Comprehension") {
                    var comp_1 = n.generators[0];
                    if (comp_1.ifs.length == 0) {
                        return scope(function () {
                            var v = getName(comp_1.target);
                            defvar(v, { isParam: true }); // TODO this leaks the scope...
                            return B.mkInfix(expr(comp_1.iter), ".", B.H.mkCall("map", [
                                B.mkGroup([quote(v), B.mkText(" => "), expr(n.elt)])
                            ]));
                        });
                    }
                }
                return exprTODO(n);
            },
            Await: function (n) { return exprTODO(n); },
            Yield: function (n) { return exprTODO(n); },
            YieldFrom: function (n) { return exprTODO(n); },
            Compare: function (n) {
                if (n.ops.length == 1 && (n.ops[0] == "In" || n.ops[0] == "NotIn")) {
                    if (find(typeOf(n.comparators[0])) == tpString)
                        unifyTypeOf(n.left, tpString);
                    var idx = B.mkInfix(expr(n.comparators[0]), ".", B.H.mkCall("indexOf", [expr(n.left)]));
                    return B.mkInfix(idx, n.ops[0] == "In" ? ">=" : "<", B.mkText("0"));
                }
                var r = binop(expr(n.left), n.ops[0], expr(n.comparators[0]));
                for (var i = 1; i < n.ops.length; ++i) {
                    r = binop(r, "And", binop(expr(n.comparators[i - 1]), n.ops[i], expr(n.comparators[i])));
                }
                return r;
            },
            Call: function (n) {
                n.func.inCalledPosition = true;
                var nm = getName(n.func);
                var namedSymbol = lookupSymbol(nm);
                var isClass = namedSymbol && namedSymbol.kind == 8 /* Class */;
                var fun = namedSymbol;
                var recvTp;
                var recv;
                var methName;
                if (isClass) {
                    fun = lookupSymbol(namedSymbol.pyQName + ".__constructor");
                }
                else {
                    if (n.func.kind == "Attribute") {
                        var attr = n.func;
                        recv = attr.value;
                        recvTp = typeOf(recv);
                        if (recvTp.classType || recvTp.primType) {
                            methName = attr.attr;
                            fun = getTypeField(recv, methName, true);
                            if (fun)
                                methName = fun.name;
                        }
                    }
                }
                var orderedArgs = n.args.slice();
                if (nm == "super" && orderedArgs.length == 0) {
                    if (ctx.currClass && ctx.currClass.baseClass)
                        unifyClass(n, n.tsType, ctx.currClass.baseClass.symInfo);
                    return B.mkText("super");
                }
                if (!fun) {
                    var over = pxt.U.lookup(funMap, nm);
                    if (over)
                        methName = "";
                    if (methName) {
                        nm = t2s(recvTp) + "." + methName;
                        over = pxt.U.lookup(funMap, nm);
                        if (!over && typeCtor(find(recvTp)) == "@array") {
                            nm = "Array." + methName;
                            over = pxt.U.lookup(funMap, nm);
                        }
                    }
                    methName = "";
                    if (over) {
                        if (over.n[0] == "." && orderedArgs.length) {
                            recv = orderedArgs.shift();
                            recvTp = typeOf(recv);
                            methName = over.n.slice(1);
                            fun = getTypeField(recv, methName);
                            if (fun && fun.kind == 2 /* Property */)
                                return B.mkInfix(expr(recv), ".", B.mkText(methName));
                        }
                        else {
                            fun = lookupGlobalSymbol(over.n);
                        }
                    }
                }
                if (isCallTo(n, "str")) {
                    // Our standard method of toString in TypeScript is to concatenate with the empty string
                    return B.mkInfix(B.mkText("\"\""), "+", expr(n.args[0]));
                }
                if (!fun)
                    error(n, 9508, pxt.U.lf("can't find called function"));
                var formals = fun ? fun.parameters : null;
                var allargs = [];
                if (!formals) {
                    if (fun)
                        error(n, 9509, pxt.U.lf("calling non-function"));
                    allargs = orderedArgs.map(expr);
                }
                else {
                    if (orderedArgs.length > formals.length)
                        error(n, 9510, pxt.U.lf("too many arguments in call to '{0}'", fun.pyQName));
                    while (orderedArgs.length < formals.length)
                        orderedArgs.push(null);
                    orderedArgs = orderedArgs.slice(0, formals.length);
                    var _loop_2 = function (kw) {
                        var idx = formals.findIndex(function (f) { return f.name == kw.arg; });
                        if (idx < 0)
                            error(kw, 9511, pxt.U.lf("'{0}' doesn't have argument named '{1}'", fun.pyQName, kw.arg));
                        else if (orderedArgs[idx] != null)
                            error(kw, 9512, pxt.U.lf("argument '{0} already specified in call to '{1}'", kw.arg, fun.pyQName));
                        else
                            orderedArgs[idx] = kw.value;
                    };
                    for (var _i = 0, _a = n.keywords; _i < _a.length; _i++) {
                        var kw = _a[_i];
                        _loop_2(kw);
                    }
                    // skip optional args
                    for (var i = orderedArgs.length - 1; i >= 0; i--) {
                        if (formals[i].initializer == "undefined" && orderedArgs[i] == null)
                            orderedArgs.pop();
                        else
                            break;
                    }
                    for (var i = 0; i < orderedArgs.length; ++i) {
                        var arg = orderedArgs[i];
                        if (arg == null && !formals[i].initializer) {
                            error(n, 9513, pxt.U.lf("missing argument '{0}' in call to '{1}'", formals[i].name, fun.pyQName));
                            allargs.push(B.mkText("null"));
                        }
                        else if (arg) {
                            if (formals[i].pyType.primType !== "any") {
                                unifyTypeOf(arg, formals[i].pyType);
                            }
                            if (arg.kind == "Name" && shouldInlineFunction(arg.symbolInfo)) {
                                allargs.push(emitFunctionDef(arg.symbolInfo.pyAST, true));
                            }
                            else {
                                allargs.push(expr(arg));
                            }
                        }
                        else {
                            allargs.push(B.mkText(formals[i].initializer));
                        }
                    }
                }
                if (!infoNode && syntaxInfo && syntaxInfo.type == "signature" && nodeInInfoRange(n)) {
                    infoNode = n;
                    infoScope = currentScope();
                    syntaxInfo.auxResult = 0;
                    // foo, bar
                    for (var i = 0; i < orderedArgs.length; ++i) {
                        syntaxInfo.auxResult = i;
                        var arg = orderedArgs[i];
                        if (!arg) {
                            // if we can't parse this next argument, but the cursor is beyond the
                            // previous arguments, assume it's here
                            break;
                        }
                        if (arg.startPos <= syntaxInfo.position && syntaxInfo.position <= arg.endPos) {
                            break;
                        }
                    }
                }
                if (fun) {
                    unifyTypeOf(n, fun.pyRetType);
                    n.symbolInfo = fun;
                    if (fun.attributes.py2tsOverride) {
                        var override = parseTypeScriptOverride(fun.attributes.py2tsOverride);
                        if (override) {
                            return buildOverride(override, allargs, methName ? expr(recv) : null);
                        }
                    }
                    else if (fun.attributes.pyHelper) {
                        return B.mkGroup([
                            B.mkInfix(B.mkText("_py"), ".", B.mkText(fun.attributes.pyHelper)),
                            B.mkText("("),
                            B.mkCommaSep(recv ? [expr(recv)].concat(allargs) : allargs),
                            B.mkText(")")
                        ]);
                    }
                }
                var fn = methName ? B.mkInfix(expr(recv), ".", B.mkText(methName)) : expr(n.func);
                var nodes = [
                    fn,
                    B.mkText("("),
                    B.mkCommaSep(allargs),
                    B.mkText(")")
                ];
                if (fun && allargs.length == 1 && isTaggedTemplate(fun))
                    nodes = [fn, forceBackticks(allargs[0])];
                if (isClass) {
                    nodes[0] = B.mkText(applyTypeMap(namedSymbol.pyQName));
                    nodes.unshift(B.mkText("new "));
                }
                return B.mkGroup(nodes);
            },
            Num: function (n) {
                unify(n, n.tsType, tpNumber);
                return B.mkText(n.ns);
            },
            Str: function (n) {
                unify(n, n.tsType, tpString);
                return B.mkText(B.stringLit(n.s));
            },
            FormattedValue: function (n) { return exprTODO(n); },
            JoinedStr: function (n) { return exprTODO(n); },
            Bytes: function (n) {
                return B.mkText("hex`" + pxt.U.toHex(new Uint8Array(n.s)) + "`");
            },
            NameConstant: function (n) {
                if (n.value != null)
                    unify(n, n.tsType, tpBoolean);
                return B.mkText(JSON.stringify(n.value));
            },
            Ellipsis: function (n) { return exprTODO(n); },
            Constant: function (n) { return exprTODO(n); },
            Attribute: function (n) {
                var lhs = expr(n.value); // run it first, in case it wants to capture infoNode
                var part = typeOf(n.value);
                var fd = getTypeField(n.value, n.attr);
                var nm = n.attr;
                markInfoNode(n, "memberCompletion");
                if (fd) {
                    n.symbolInfo = fd;
                    addCaller(n, fd);
                    unify(n, n.tsType, fd.pyRetType);
                    nm = fd.name;
                }
                else if (part.moduleType) {
                    var sym = lookupGlobalSymbol(part.moduleType.pyQName + "." + n.attr);
                    if (sym) {
                        n.symbolInfo = sym;
                        addCaller(n, sym);
                        unifyTypeOf(n, symbolType(sym));
                        nm = sym.name;
                    }
                    else
                        error(n, 9514, pxt.U.lf("module '{0}' has no attribute '{1}'", part.moduleType.pyQName, n.attr));
                }
                else {
                    if (currIteration > 2)
                        error(n, 9515, pxt.U.lf("unknown object type; cannot lookup attribute '{0}'", n.attr));
                }
                return B.mkInfix(lhs, ".", B.mkText(quoteStr(nm)));
            },
            Subscript: function (n) {
                if (n.slice.kind == "Index") {
                    var idx = n.slice.value;
                    if (currIteration > 2 && isFree(typeOf(idx))) {
                        unifyTypeOf(idx, tpNumber);
                    }
                    return B.mkGroup([
                        expr(n.value),
                        B.mkText("["),
                        expr(idx),
                        B.mkText("]"),
                    ]);
                }
                else if (n.slice.kind == "Slice") {
                    var s = n.slice;
                    return B.mkInfix(expr(n.value), ".", B.H.mkCall("slice", [s.lower ? expr(s.lower) : B.mkText("0"),
                        s.upper ? expr(s.upper) : null].filter(function (x) { return !!x; })));
                }
                else {
                    return exprTODO(n);
                }
            },
            Starred: function (n) { return B.mkGroup([B.mkText("... "), expr(n.value)]); },
            Name: function (n) {
                markInfoNode(n, "identifierCompletion");
                // shortcut, but should work
                if (n.id == "self" && ctx.currClass) {
                    unifyClass(n, n.tsType, ctx.currClass.symInfo);
                    return B.mkText("this");
                }
                var v = lookupName(n);
                if (v && v.isImport) {
                    return quote(v.name); // it's import X = Y.Z.X, use X not Y.Z.X
                }
                markUsage(v, n);
                if (n.ctx.indexOf("Load") >= 0) {
                    return quote(v ? v.qName : getName(n));
                }
                else
                    return possibleDef(n);
            },
            List: mkArrayExpr,
            Tuple: mkArrayExpr,
        };
        function lookupName(n) {
            var v = lookupSymbol(n.id);
            if (!v) {
                // check if the symbol has an override py<->ts mapping
                var over = pxt.U.lookup(funMap, n.id);
                if (over) {
                    v = lookupSymbol(over.n);
                }
            }
            if (v) {
                n.symbolInfo = v;
                unify(n, n.tsType, symbolType(v));
                if (v.isImport)
                    return v;
                addCaller(n, v);
            }
            else if (currIteration > 0) {
                error(n, 9516, pxt.U.lf("name '{0}' is not defined", n.id));
            }
            return v;
        }
        function markUsage(s, location) {
            if (s) {
                if (s.modifier === py.VarModifier.Global) {
                    var declaringScope = topScope();
                    if (declaringScope && declaringScope.vars[s.name]) {
                        s = declaringScope.vars[s.name];
                    }
                }
                else if (s.modifier === py.VarModifier.NonLocal) {
                    var declaringScope = findNonlocalDeclaration(s.name, currentScope());
                    if (declaringScope) {
                        s = declaringScope.vars[s.name];
                    }
                }
                if (s.firstRefPos === undefined || s.firstRefPos > location.startPos) {
                    s.firstRefPos = location.startPos;
                }
            }
        }
        function mkArrayExpr(n) {
            unify(n, n.tsType, mkArrayType(n.elts[0] ? typeOf(n.elts[0]) : mkType()));
            return B.mkGroup([
                B.mkText("["),
                B.mkCommaSep(n.elts.map(expr)),
                B.mkText("]"),
            ]);
        }
        function expr(e) {
            lastAST = e;
            var f = exprMap[e.kind];
            if (!f) {
                pxt.U.oops(e.kind + " - unknown expr");
            }
            typeOf(e);
            return f(e);
        }
        function stmt(e) {
            lastAST = e;
            var f = stmtMap[e.kind];
            if (!f) {
                pxt.U.oops(e.kind + " - unknown stmt");
            }
            var cmts = (e._comments || []).map(function (c) { return c.value; });
            var r = f(e);
            if (cmts.length) {
                r = B.mkGroup(cmts.map(function (c) { return B.mkStmt(B.H.mkComment(c)); }).concat(r));
            }
            return r;
        }
        function isEmpty(b) {
            if (!b)
                return true;
            if (b.type == B.NT.Prefix && b.op == "")
                return b.children.every(isEmpty);
            if (b.type == B.NT.NewLine)
                return true;
            return false;
        }
        function declareVariable(s) {
            var name = quote(s.name);
            var type = t2s(symbolType(s));
            return B.mkStmt(B.mkGroup([B.mkText("let "), name, B.mkText(": " + type + ";")]));
        }
        function findNonlocalDeclaration(name, scope) {
            if (!scope)
                return null;
            var symbolInfo = scope.vars && scope.vars[name];
            if (symbolInfo && symbolInfo.modifier != py.VarModifier.NonLocal) {
                return scope;
            }
            else {
                return findNonlocalDeclaration(name, scope.parent);
            }
        }
        function collectHoistedDeclarations(scope) {
            var hoisted = [];
            var current;
            for (var _i = 0, _a = Object.keys(scope.vars); _i < _a.length; _i++) {
                var varName = _a[_i];
                current = scope.vars[varName];
                if (shouldHoist(current, scope)) {
                    hoisted.push(declareVariable(current));
                }
            }
            return hoisted;
        }
        function shouldHoist(sym, scope) {
            return sym.kind === 4 /* Variable */ && sym.modifier === undefined && (sym.firstRefPos < sym.firstAssignPos || sym.firstAssignDepth > scope.blockDepth);
        }
        // TODO look at scopes of let
        function toTS(mod) {
            pxt.U.assert(mod.kind == "Module");
            if (mod.tsBody)
                return null;
            resetCtx(mod);
            if (!mod.vars)
                mod.vars = {};
            var hoisted = collectHoistedDeclarations(mod);
            var res = hoisted.concat(mod.body.map(stmt));
            if (res.every(isEmpty))
                return null;
            else if (mod.name == "main")
                return res;
            return [
                B.mkText("namespace " + mod.name + " "),
                B.mkBlock(res)
            ];
        }
        function iterPy(e, f) {
            if (!e)
                return;
            f(e);
            pxt.U.iterMap(e, function (k, v) {
                if (!v || k == "parent")
                    return;
                if (v && v.kind)
                    iterPy(v, f);
                else if (Array.isArray(v))
                    v.forEach(function (x) { return iterPy(x, f); });
            });
        }
        function resetPass(iter) {
            currIteration = iter;
            diagnostics = [];
            numUnifies = 0;
            lastAST = null;
        }
        function py2ts(opts) {
            var modules = [];
            var generated = {};
            diagnostics = [];
            // find .ts files that are copies of / shadowed by the .py files
            var pyFiles = opts.sourceFiles.filter(function (fn) { return pxt.U.endsWith(fn, ".py"); });
            if (pyFiles.length == 0)
                return { generated: generated, diagnostics: diagnostics };
            var removeEnd = function (file, ext) { return file.substr(0, file.length - ext.length); };
            var pyFilesSet = pxt.U.toDictionary(pyFiles, function (p) { return removeEnd(p, ".py"); });
            var tsFiles = opts.sourceFiles
                .filter(function (fn) { return pxt.U.endsWith(fn, ".ts"); });
            var tsShadowFiles = tsFiles
                .filter(function (fn) { return removeEnd(fn, ".ts") in pyFilesSet; });
            lastFile = pyFiles[0]; // make sure there's some location info for errors from API init
            initApis(opts.apisInfo, tsShadowFiles);
            compileOptions = opts;
            syntaxInfo = null;
            if (!opts.generatedFiles)
                opts.generatedFiles = [];
            for (var _i = 0, pyFiles_1 = pyFiles; _i < pyFiles_1.length; _i++) {
                var fn = pyFiles_1[_i];
                var sn = fn;
                var modname = fn.replace(/\.py$/, "").replace(/.*\//, "");
                var src = opts.fileSystem[fn];
                try {
                    lastFile = fn;
                    var tokens = pxt.py.lex(src);
                    //console.log(pxt.py.tokensToString(tokens))
                    var res = pxt.py.parse(src, sn, tokens);
                    //console.log(pxt.py.dump(stmts))
                    pxt.U.pushRange(diagnostics, res.diagnostics);
                    modules.push({
                        kind: "Module",
                        body: res.stmts,
                        blockDepth: 0,
                        name: modname,
                        source: src,
                        tsFilename: sn.replace(/\.py$/, ".ts")
                    });
                }
                catch (e) {
                    // TODO
                    console.log("Parse error", e);
                }
            }
            var parseDiags = diagnostics;
            for (var i = 0; i < 5; ++i) {
                resetPass(i);
                for (var _a = 0, modules_1 = modules; _a < modules_1.length; _a++) {
                    var m = modules_1[_a];
                    try {
                        toTS(m);
                        // console.log(`after ${currIteration} - ${numUnifies}`)
                    }
                    catch (e) {
                        console.log("Conv pass error", e);
                    }
                }
                if (numUnifies == 0)
                    break;
            }
            resetPass(1000);
            infoNode = null;
            syntaxInfo = opts.syntaxInfo;
            for (var _b = 0, modules_2 = modules; _b < modules_2.length; _b++) {
                var m = modules_2[_b];
                try {
                    var nodes = toTS(m);
                    if (!nodes)
                        continue;
                    var res = B.flattenNode(nodes);
                    opts.sourceFiles.push(m.tsFilename);
                    opts.generatedFiles.push(m.tsFilename);
                    opts.fileSystem[m.tsFilename] = res.output;
                    generated[m.tsFilename] = res.output;
                }
                catch (e) {
                    console.log("Conv error", e);
                }
            }
            diagnostics = parseDiags.concat(diagnostics);
            var isGlobalSymbol = function (si) {
                switch (si.kind) {
                    case 6 /* Enum */:
                    case 7 /* EnumMember */:
                    case 4 /* Variable */:
                    case 3 /* Function */:
                    case 5 /* Module */:
                        return true;
                    case 2 /* Property */:
                    case 1 /* Method */:
                        return !si.isInstance;
                    default:
                        return false;
                }
            };
            if (syntaxInfo)
                syntaxInfo.symbols = [];
            if (syntaxInfo && infoNode) {
                var apis = pxt.U.values(externalApis).concat(pxt.U.values(internalApis));
                syntaxInfo.beginPos = infoNode.startPos;
                syntaxInfo.endPos = infoNode.endPos;
                if (syntaxInfo.type == "memberCompletion" && infoNode.kind == "Attribute") {
                    var attr = infoNode;
                    var tp = typeOf(attr.value);
                    if (tp.moduleType) {
                        for (var _c = 0, apis_1 = apis; _c < apis_1.length; _c++) {
                            var v = apis_1[_c];
                            if (!v.isInstance && v.namespace == tp.moduleType.qName) {
                                syntaxInfo.symbols.push(v);
                            }
                        }
                    }
                    else if (tp.classType || tp.primType) {
                        var ct = tp.classType || resolvePrimType(tp.primType);
                        if (ct) {
                            var types = ct.extendsTypes.concat(ct.qName);
                            for (var _d = 0, apis_2 = apis; _d < apis_2.length; _d++) {
                                var v = apis_2[_d];
                                if (v.isInstance && types.indexOf(v.namespace) >= 0) {
                                    syntaxInfo.symbols.push(v);
                                }
                            }
                        }
                    }
                }
                else if (syntaxInfo.type == "identifierCompletion") {
                    var existing_1 = [];
                    var addSym = function (v) {
                        if (isGlobalSymbol(v) && existing_1.indexOf(v) < 0)
                            syntaxInfo.symbols.push(v);
                    };
                    existing_1 = syntaxInfo.symbols.slice();
                    for (var s = infoScope; s; s = s.parent) {
                        if (s.vars)
                            pxt.U.values(s.vars).forEach(addSym);
                    }
                    apis.forEach(addSym);
                }
                else {
                    var sym = infoNode.symbolInfo;
                    if (sym)
                        syntaxInfo.symbols.push(sym);
                }
                syntaxInfo.symbols = syntaxInfo.symbols.map(cleanSymbol);
            }
            return {
                generated: generated,
                diagnostics: patchedDiags()
            };
            function patchedDiags() {
                for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
                    var d = diagnostics_1[_i];
                    py.patchPosition(d, opts.fileSystem[d.fileName]);
                }
                return diagnostics;
            }
        }
        py.py2ts = py2ts;
        function convert(opts) {
            if (opts.target.preferredEditor == pxt.PYTHON_PROJECT_NAME) {
                var r = py2ts(opts);
                return r.diagnostics;
            }
            return [];
        }
        py.convert = convert;
        pxt.conversionPasses.push(convert);
        /**
         * Override example syntax:
         *      indexOf()       (no arguments)
         *      indexOf($1, $0) (arguments in different order)
         *      indexOf($0?)    (optional argument)
         *      indexOf($0=0)   (default value; can be numbers, single quoted strings, false, true, null, undefined)
         */
        function parseTypeScriptOverride(src) {
            var regex = new RegExp(/([^\$]*\()?([^\$\(]*)\$(\d)(?:(?:(?:=(\d+|'[a-zA-Z0-9_]*'|false|true|null|undefined))|(\?)|))/, 'y');
            var parts = [];
            var match;
            var lastIndex = 0;
            do {
                lastIndex = regex.lastIndex;
                match = regex.exec(src);
                if (match) {
                    if (match[1]) {
                        parts.push({
                            kind: "text",
                            text: match[1]
                        });
                    }
                    parts.push({
                        kind: "arg",
                        prefix: match[2],
                        index: parseInt(match[3]),
                        default: match[4],
                        isOptional: !!match[5]
                    });
                }
            } while (match);
            if (lastIndex != undefined) {
                parts.push({
                    kind: "text",
                    text: src.substr(lastIndex)
                });
            }
            else {
                parts.push({
                    kind: "text",
                    text: src
                });
            }
            return {
                parts: parts
            };
        }
        function buildOverride(override, args, recv) {
            var result = [];
            for (var _i = 0, _a = override.parts; _i < _a.length; _i++) {
                var part = _a[_i];
                if (part.kind === "text") {
                    result.push(B.mkText(part.text));
                }
                else if (args[part.index] || part.default) {
                    if (part.prefix)
                        result.push(B.mkText(part.prefix));
                    if (args[part.index]) {
                        result.push(args[part.index]);
                    }
                    else {
                        result.push(B.mkText(part.default));
                    }
                }
                else if (part.isOptional) {
                    // do nothing
                }
                else {
                    return undefined;
                }
            }
            if (recv) {
                return B.mkInfix(recv, ".", B.mkGroup(result));
            }
            return B.mkGroup(result);
        }
    })(py = pxt.py || (pxt.py = {}));
})(pxt || (pxt = {}));
// Lexer spec: https://docs.python.org/3/reference/lexical_analysis.html
var pxt;
(function (pxt) {
    var py;
    (function (py) {
        var TokenType;
        (function (TokenType) {
            TokenType[TokenType["Id"] = 0] = "Id";
            TokenType[TokenType["Op"] = 1] = "Op";
            TokenType[TokenType["Keyword"] = 2] = "Keyword";
            TokenType[TokenType["Number"] = 3] = "Number";
            TokenType[TokenType["String"] = 4] = "String";
            TokenType[TokenType["NewLine"] = 5] = "NewLine";
            TokenType[TokenType["Comment"] = 6] = "Comment";
            TokenType[TokenType["Indent"] = 7] = "Indent";
            TokenType[TokenType["Dedent"] = 8] = "Dedent";
            TokenType[TokenType["EOF"] = 9] = "EOF";
            TokenType[TokenType["Error"] = 10] = "Error";
        })(TokenType = py.TokenType || (py.TokenType = {}));
        var keywords = {
            "False": true, "None": true, "True": true, "and": true, "as": true, "assert": true,
            "async": true, "await": true, "break": true, "class": true, "continue": true,
            "def": true, "del": true, "elif": true, "else": true, "except": true, "finally": true,
            "for": true, "from": true, "global": true, "if": true, "import": true, "in": true,
            "is": true, "lambda": true, "nonlocal": true, "not": true, "or": true, "pass": true,
            "raise": true, "return": true, "try": true, "while": true, "with": true, "yield": true,
        };
        var asciiParse = [];
        var allOps;
        var revOps;
        var eqOps = {
            "%": "Mod",
            "&": "BitAnd",
            "*": "Mult",
            "**": "Pow",
            "+": "Add",
            "-": "Sub",
            "/": "Div",
            "//": "FloorDiv",
            "<<": "LShift",
            ">>": "RShift",
            "@": "MatMult",
            "^": "BitXor",
            "|": "BitOr",
        };
        var nonEqOps = {
            "!": "Bang",
            "!=": "NotEq",
            "(": "LParen",
            ")": "RParen",
            ",": "Comma",
            "->": "Arrow",
            ".": "Dot",
            ":": "Colon",
            ";": "Semicolon",
            "<": "Lt",
            "<=": "LtE",
            "=": "Assign",
            "==": "Eq",
            ">": "Gt",
            ">=": "GtE",
            "[": "LSquare",
            "]": "RSquare",
            "{": "LBracket",
            "}": "RBracket",
            "~": "Invert",
        };
        var numBases = {
            "b": /^[_0-1]$/,
            "B": /^[_0-1]$/,
            "o": /^[_0-7]$/,
            "O": /^[_0-7]$/,
            "x": /^[_0-9a-fA-F]$/,
            "X": /^[_0-9a-fA-F]$/,
        };
        var numBasesRadix = {
            "b": 2,
            "B": 2,
            "o": 8,
            "O": 8,
            "x": 16,
            "X": 16,
        };
        // resettable lexer state
        var res;
        var source;
        var pos = 0, pos0 = 0;
        function position(startPos, source) {
            var lineno = 0;
            var lastnl = 0;
            for (var i = 0; i < startPos; ++i) {
                if (source.charCodeAt(i) == 10) {
                    lineno++;
                    lastnl = i;
                }
            }
            return { line: lineno, column: startPos - lastnl - 1 };
        }
        py.position = position;
        function patchPosition(d, src) {
            if (!d.start && !d.length) {
                d.start = 0;
                d.length = 0;
                d.line = 0;
                d.column = 0;
                return;
            }
            var p = position(d.start, src);
            d.line = p.line;
            d.column = p.column;
            if (d.length > 0) {
                p = position(d.start + d.length - 1, src);
                d.endLine = p.line;
                d.endColumn = p.column + 2; // not sure where the +2 is coming from, but it works out in monaco
            }
        }
        py.patchPosition = patchPosition;
        function tokenToString(t) {
            switch (t.type) {
                case TokenType.Id:
                    return "id(" + t.value + ")";
                case TokenType.Op:
                    return "'" + revOps[t.value] + "'";
                case TokenType.Keyword:
                    return t.value;
                case TokenType.Number:
                    return "num(" + t.value + ")";
                case TokenType.String:
                    return t.stringPrefix + JSON.stringify(t.value);
                case TokenType.NewLine:
                    return "<nl>";
                case TokenType.Comment:
                    return "/* " + t.value + " */";
                case TokenType.Indent:
                    return "indent" + t.value;
                case TokenType.Dedent:
                    return "dedent";
                case TokenType.Error:
                    return "[ERR: " + t.value + "]";
                case TokenType.EOF:
                    return "End of file";
                default:
                    return "???";
            }
        }
        py.tokenToString = tokenToString;
        function friendlyTokenToString(t, source) {
            var len = t.endPos - t.startPos;
            var s = "";
            if (len == 0) {
                s = tokenToString(t);
            }
            else if (len > 20) {
                s = "`" + source.slice(t.startPos, t.startPos + 20) + "`...";
            }
            else {
                s = "`" + source.slice(t.startPos, t.endPos) + "`";
            }
            s = s.replace(/\r/g, "")
                .replace(/\n/g, "\\n")
                .replace(/\t/g, "\\t");
            return s;
        }
        py.friendlyTokenToString = friendlyTokenToString;
        function tokensToString(ts) {
            var r = "";
            var lineLen = 0;
            for (var _i = 0, ts_1 = ts; _i < ts_1.length; _i++) {
                var t = ts_1[_i];
                var tmp = tokenToString(t);
                if (lineLen + tmp.length > 70) {
                    lineLen = 0;
                    r += "\n";
                }
                if (lineLen != 0)
                    r += " ";
                r += tmp;
                lineLen += tmp.length;
                if (t.type == TokenType.NewLine || t.type == TokenType.Comment) {
                    lineLen = 0;
                    r += "\n";
                }
            }
            return r;
        }
        py.tokensToString = tokensToString;
        function lex(_source) {
            if (asciiParse.length == 0)
                initAsciiParse();
            // these can't be local, since we capture lambdas from the first execution
            source = _source;
            res = [];
            pos = 0;
            pos0 = 0;
            checkIndent();
            while (pos < source.length) {
                pos0 = pos;
                var ch = source.charCodeAt(pos++);
                if (ch < 128) {
                    asciiParse[ch]();
                }
                else if (py.rx.isIdentifierStart(ch)) {
                    parseId();
                }
                else if (py.rx.isSpace(ch)) {
                    // skip
                }
                else if (py.rx.isNewline(ch)) {
                    singleNewline();
                }
                else {
                    invalidToken();
                }
            }
            pos0 = pos;
            singleNewline();
            addToken(TokenType.EOF, "");
            return res;
            function addToken(type, val, aux) {
                var t = {
                    type: type,
                    value: val,
                    startPos: pos0,
                    endPos: pos,
                    auxValue: aux
                };
                res.push(t);
                return t;
            }
            function addError(msg) {
                addToken(TokenType.Error, msg);
            }
            function parseId() {
                while (py.rx.isIdentifierChar(source.charCodeAt(pos)))
                    pos++;
                var id = source.slice(pos0, pos);
                var ch = source.charCodeAt(pos);
                if (keywords.hasOwnProperty(id))
                    addToken(TokenType.Keyword, id);
                else if (ch == 34 || ch == 39)
                    parseStringPref(id);
                else
                    addToken(TokenType.Id, id);
            }
            function singleOp(name) {
                addToken(TokenType.Op, name);
            }
            function multiOp(name) {
                var ch2 = source.slice(pos0, pos + 1);
                if (ch2.length == 2 && allOps.hasOwnProperty(ch2)) {
                    var ch3 = source.slice(pos0, pos + 2);
                    if (ch3.length == 3 && allOps.hasOwnProperty(ch3)) {
                        pos += 2;
                        name = allOps[ch3];
                    }
                    else {
                        pos++;
                        name = allOps[ch2];
                    }
                }
                singleOp(name);
            }
            function asciiEsc(code) {
                switch (code) {
                    case 97: return 7; // \a
                    case 98: return 8; // \b
                    case 102: return 12; // \f
                    case 110: return 10; // \n
                    case 114: return 13; // \r
                    case 116: return 9; // \t
                    case 118: return 11; // \v
                    default: return 0;
                }
            }
            function unicode(c) {
                return ("0000" + c.toString(16)).slice(-4);
            }
            function parseStringPref(pref) {
                var delim = source.charCodeAt(pos++);
                var tripleMode = false;
                if (source.charCodeAt(pos) == delim && source.charCodeAt(pos + 1) == delim) {
                    pos += 2;
                    tripleMode = true;
                }
                pref = pref.toLowerCase();
                var rawMode = pref.indexOf("r") >= 0;
                var value = "";
                var quoted = "";
                while (true) {
                    var ch = source.charCodeAt(pos++);
                    if (ch == delim) {
                        if (tripleMode) {
                            if (source.charCodeAt(pos) == delim &&
                                source.charCodeAt(pos + 1) == delim) {
                                pos += 2;
                                break;
                            }
                            else {
                                quoted += "\\" + String.fromCharCode(delim);
                                value += String.fromCharCode(delim);
                            }
                        }
                        else {
                            break;
                        }
                    }
                    else if (ch == 92) {
                        var ch2 = source.charCodeAt(pos++);
                        if (ch2 == 13 && source.charCodeAt(pos) == 10) {
                            ch2 = 10;
                            pos++;
                        }
                        if (ch2 == 34 || ch2 == 39 || ch2 == 92) {
                            if (rawMode) {
                                quoted += "\\";
                                value += "\\";
                            }
                            quoted += "\\" + String.fromCharCode(ch2);
                            value += String.fromCharCode(ch2);
                        }
                        else if (!rawMode && asciiEsc(ch2)) {
                            quoted += "\\" + String.fromCharCode(ch2);
                            value += String.fromCharCode(asciiEsc(ch2));
                        }
                        else if (py.rx.isNewline(ch2)) {
                            if (rawMode) {
                                value += "\\" + String.fromCharCode(ch2);
                                quoted += "\\\\";
                                if (ch2 == 10)
                                    quoted += "\\n";
                                else
                                    quoted += "\\u" + unicode(ch2);
                            }
                            else {
                                // skip
                            }
                        }
                        else if (!rawMode && ch2 == 48) {
                            // handle \0 as special case
                            quoted += "\\\\x00";
                            value += "\x00";
                        }
                        else if (!rawMode && (ch2 == 117 || ch2 == 120)) {
                            // We pass as is
                            // TODO add support for octal (\123)
                            var len = ch2 == 117 ? 4 : 2;
                            var num = source.slice(pos, pos + len);
                            pos += len;
                            var v = parseInt(num, 16);
                            if (isNaN(v))
                                addError(pxt.U.lf("invalid unicode or hex escape"));
                            quoted += "\\" + String.fromCharCode(ch2) + num;
                            value += String.fromCharCode(v);
                        }
                        else {
                            quoted += "\\\\" + String.fromCharCode(ch2);
                            value += "\\" + String.fromCharCode(ch2);
                        }
                    }
                    else if (isNaN(ch)) {
                        addError(pxt.U.lf("end of file in a string"));
                        break;
                    }
                    else {
                        if (py.rx.isNewline(ch)) {
                            if (!tripleMode) {
                                addError(pxt.U.lf("new line in a string"));
                                break;
                            }
                        }
                        value += String.fromCharCode(ch);
                        quoted += String.fromCharCode(ch);
                    }
                }
                var t = addToken(TokenType.String, value);
                t.quoted = quoted;
                t.stringPrefix = pref;
            }
            function parseString() {
                pos--;
                parseStringPref("");
            }
            function singleNewline() {
                addToken(TokenType.NewLine, "");
                checkIndent();
            }
            function checkIndent() {
                var ind = 0;
                while (true) {
                    var ch = source.charCodeAt(pos);
                    if (ch == 9) {
                        // addError(U.lf("TAB indentaion not supported"))
                        ind = (ind + 8) & ~7;
                        pos++;
                        continue;
                    }
                    if (ch != 32)
                        break;
                    ind++;
                    pos++;
                }
                addToken(TokenType.Indent, "" + ind);
            }
            function parseBackslash() {
                var ch2 = source.charCodeAt(pos);
                if (py.rx.isNewline(ch2)) {
                    pos++;
                    if (ch2 == 13 && source.charCodeAt(pos) == 10)
                        pos++;
                }
                else {
                    addError(pxt.U.lf("unexpected character after line continuation character"));
                }
            }
            function parseComment() {
                addToken(TokenType.NewLine, "");
                while (pos < source.length) {
                    if (py.rx.isNewline(source.charCodeAt(pos)))
                        break;
                    pos++;
                }
                addToken(TokenType.Comment, source.slice(pos0 + 1, pos));
                if (source.charCodeAt(pos) == 13 && source.charCodeAt(pos + 1) == 10)
                    pos++;
                pos++; // skip newline
                checkIndent();
            }
            function parseNumber() {
                var c1 = source[pos0];
                var num = "";
                // TypeScript supports 0x, 0o, 0b, as well as _ in numbers,
                // so we just pass them as is
                if (c1 == "0") {
                    var c2 = source[pos];
                    var rx_1 = numBases[c2];
                    if (rx_1) {
                        pos++;
                        while (true) {
                            var ch = source[pos];
                            if (!rx_1.test(ch))
                                break;
                            num += ch;
                            pos++;
                        }
                        if (num) {
                            var p_1 = parseInt(num, numBasesRadix[c2]);
                            if (isNaN(p_1))
                                addError(pxt.U.lf("invalid number"));
                            addToken(TokenType.Number, c1 + c2 + num, p_1);
                        }
                        else
                            addError(pxt.U.lf("expecting numbers to follow 0b, 0o, 0x"));
                        return;
                    }
                }
                // decimal, possibly float
                var seenDot = false;
                var seenE = false;
                var minusAllowed = false;
                pos = pos0;
                while (true) {
                    var ch = source.charCodeAt(pos);
                    if (minusAllowed && (ch == 43 || ch == 45)) {
                        // ok
                    }
                    else {
                        minusAllowed = false;
                        if (ch == 95 || isDigit(ch)) {
                            // OK
                        }
                        else if (!seenE && !seenDot && ch == 46) {
                            seenDot = true;
                        }
                        else if (!seenE && (ch == 69 || ch == 101)) {
                            seenE = true;
                            minusAllowed = true;
                        }
                        else {
                            break;
                        }
                    }
                    num += String.fromCharCode(ch);
                    pos++;
                }
                if (!seenDot && !seenE && c1 == "0" && num.length > 1 && !/^0+/.test(num))
                    addError(pxt.U.lf("unexpected leading zero"));
                var p = parseFloat(num);
                if (isNaN(p))
                    addError(pxt.U.lf("invalid number"));
                addToken(TokenType.Number, num, p);
            }
            function parseDot() {
                if (isDigit(source.charCodeAt(pos)))
                    parseNumber();
                else
                    addToken(TokenType.Op, "Dot");
            }
            function isDigit(ch) {
                return (48 <= ch && ch <= 57);
            }
            function invalidToken() {
                addError(pxt.U.lf("invalid token"));
            }
            function initAsciiParse() {
                var specialParse = {
                    "\"": parseString,
                    "'": parseString,
                    "#": parseComment,
                    "\\": parseBackslash,
                    ".": parseDot,
                };
                allOps = pxt.U.clone(nonEqOps);
                for (var _i = 0, _a = Object.keys(eqOps); _i < _a.length; _i++) {
                    var k = _a[_i];
                    allOps[k] = eqOps[k];
                    allOps[k + "="] = eqOps[k] + "Assign";
                }
                revOps = {};
                for (var _b = 0, _c = Object.keys(allOps); _b < _c.length; _b++) {
                    var k = _c[_b];
                    revOps[allOps[k]] = k;
                }
                var _loop_3 = function (i) {
                    if (py.rx.isIdentifierStart(i))
                        asciiParse[i] = parseId;
                    else {
                        var s = String.fromCharCode(i);
                        if (specialParse.hasOwnProperty(s)) {
                            asciiParse[i] = specialParse[s];
                        }
                        else if (allOps.hasOwnProperty(s)) {
                            var canBeLengthened = false;
                            var op_1 = allOps[s];
                            for (var _i = 0, _a = Object.keys(allOps); _i < _a.length; _i++) {
                                var kk = _a[_i];
                                if (kk != s && kk.startsWith(s)) {
                                    canBeLengthened = true;
                                }
                            }
                            if (canBeLengthened) {
                                asciiParse[i] = function () { return multiOp(op_1); };
                            }
                            else {
                                asciiParse[i] = function () { return singleOp(op_1); };
                            }
                        }
                        else if (py.rx.isSpace(i)) {
                            asciiParse[i] = function () { };
                        }
                        else if (i == 13) {
                            asciiParse[i] = function () {
                                if (source.charCodeAt(pos) == 10)
                                    pos++;
                                singleNewline();
                            };
                        }
                        else if (py.rx.isNewline(i)) {
                            asciiParse[i] = singleNewline;
                        }
                        else if (isDigit(i)) {
                            asciiParse[i] = parseNumber;
                        }
                        else {
                            asciiParse[i] = invalidToken;
                        }
                    }
                };
                for (var i = 0; i < 128; ++i) {
                    _loop_3(i);
                }
            }
        }
        py.lex = lex;
    })(py = pxt.py || (pxt.py = {}));
})(pxt || (pxt = {}));
// Grammar is here: https://docs.python.org/3/reference/grammar.html
var pxt;
(function (pxt) {
    var py;
    (function (py) {
        var inParens;
        var tokens;
        var source;
        var filename;
        var nextToken;
        var currComments;
        var indentStack;
        var prevToken;
        var diags;
        var traceParser = false;
        var traceLev = "";
        function fakeToken(tp, val) {
            return {
                type: tp,
                value: val,
                startPos: 0,
                endPos: 0
            };
        }
        function traceAST(tp, r) {
            if (traceParser) {
                pxt.log(traceLev + tp + ": " + r.kind);
            }
        }
        function peekToken() {
            return tokens[nextToken];
        }
        function skipTokens() {
            for (; tokens[nextToken]; nextToken++) {
                var t = tokens[nextToken];
                if (t.type == py.TokenType.Comment) {
                    currComments.push(t);
                    continue;
                }
                if (inParens >= 0 && t.type == py.TokenType.Op)
                    switch (t.value) {
                        case "LParen":
                        case "LSquare":
                        case "LBracket":
                            inParens++;
                            break;
                        case "RParen":
                        case "RSquare":
                        case "RBracket":
                            inParens--;
                            break;
                    }
                if (t.type == py.TokenType.Error) {
                    error(9551, t.value);
                    continue;
                }
                if (inParens > 0) {
                    if (t.type == py.TokenType.NewLine || t.type == py.TokenType.Indent)
                        continue;
                }
                else {
                    if (t.type == py.TokenType.Indent) {
                        if (tokens[nextToken + 1].type == py.TokenType.NewLine) {
                            nextToken++;
                            continue; // skip empty lines
                        }
                        var curr = parseInt(t.value);
                        var top_1 = indentStack[indentStack.length - 1];
                        if (curr == top_1)
                            continue;
                        else if (curr > top_1) {
                            indentStack.push(curr);
                            return;
                        }
                        else {
                            t.type = py.TokenType.Dedent;
                            var numPop = 0;
                            while (indentStack.length) {
                                var top_2 = indentStack[indentStack.length - 1];
                                if (top_2 > curr) {
                                    indentStack.pop();
                                    numPop++;
                                }
                                else {
                                    if (top_2 != curr)
                                        error(9552, pxt.U.lf("inconsitent indentation"));
                                    // in case there is more than one dedent, replicate current dedent token
                                    while (numPop > 1) {
                                        tokens.splice(nextToken, 0, t);
                                        numPop--;
                                    }
                                    return;
                                }
                            }
                        }
                    }
                }
                return;
            }
        }
        function shiftToken() {
            prevToken = peekToken();
            if (prevToken.type == py.TokenType.EOF)
                return;
            nextToken++;
            skipTokens();
            // console.log(`TOK: ${tokenToString(peekToken())}`)
        }
        // next error 9574 (limit 9599)
        function error(code, msg) {
            if (!msg)
                msg = pxt.U.lf("invalid syntax");
            if (!code)
                code = 9550;
            var tok = peekToken();
            var d = {
                code: code,
                category: pxtc.DiagnosticCategory.Error,
                messageText: pxt.U.lf("{0} near {1}", msg, py.friendlyTokenToString(tok, source)),
                fileName: filename,
                start: tok.startPos,
                length: tok.endPos ? tok.endPos - tok.startPos : 0,
                line: 0,
                column: 0
            };
            py.patchPosition(d, source);
            if (traceParser)
                pxt.log(traceLev + "TS" + code + " " + d.messageText + " at " + (d.line + 1) + "," + (d.column + 1));
            diags.push(d);
            if (code != 9572 && diags.length > 100)
                pxt.U.userError(pxt.U.lf("too many parse errors"));
        }
        function expect(tp, val) {
            var t = peekToken();
            if (t.type != tp || t.value != val) {
                error(9553, pxt.U.lf("expecting {0}", py.tokenToString(fakeToken(tp, val))));
                if (t.type == py.TokenType.NewLine)
                    return; // don't shift
            }
            shiftToken();
        }
        function expectNewline() {
            expect(py.TokenType.NewLine, "");
        }
        function expectKw(kw) {
            expect(py.TokenType.Keyword, kw);
        }
        function expectOp(op) {
            expect(py.TokenType.Op, op);
        }
        function currentKw() {
            var t = peekToken();
            if (t.type == py.TokenType.Keyword)
                return t.value;
            return "";
        }
        function currentOp() {
            var t = peekToken();
            if (t.type == py.TokenType.Op)
                return t.value;
            return "";
        }
        var compound_stmt_map = {
            "if": if_stmt,
            "while": while_stmt,
            "for": for_stmt,
            "try": try_stmt,
            "with": with_stmt,
            "def": funcdef,
            "class": classdef,
        };
        var small_stmt_map = {
            "del": del_stmt,
            "pass": pass_stmt,
            "break": break_stmt,
            "continue": continue_stmt,
            "return": return_stmt,
            "raise": raise_stmt,
            "global": global_stmt,
            "nonlocal": nonlocal_stmt,
            "import": import_name,
            "from": import_from,
            "assert": assert_stmt,
            "yield": yield_stmt,
        };
        function colon_suite() {
            expectOp("Colon");
            return suite();
        }
        function suite() {
            if (peekToken().type == py.TokenType.NewLine) {
                var prevTr = traceLev;
                if (traceParser) {
                    pxt.log(traceLev + "{");
                    traceLev += "  ";
                }
                shiftToken();
                var level = NaN;
                if (peekToken().type != py.TokenType.Indent) {
                    error(9554, pxt.U.lf("expecting indent"));
                }
                else {
                    level = parseInt(peekToken().value);
                }
                shiftToken();
                var r = stmt();
                for (;;) {
                    if (peekToken().type == py.TokenType.Dedent) {
                        var isFinal = (isNaN(level) || parseInt(peekToken().value) < level);
                        shiftToken();
                        if (isFinal)
                            break;
                    }
                    pxt.U.pushRange(r, stmt());
                }
                if (traceParser) {
                    traceLev = prevTr;
                    pxt.log(traceLev + "}");
                }
                return r;
            }
            else {
                return simple_stmt();
            }
        }
        function mkAST(kind, beg) {
            var t = beg || peekToken();
            return {
                startPos: t.startPos,
                endPos: t.endPos,
                kind: kind
            };
        }
        function finish(v) {
            v.endPos = prevToken.endPos;
            return v;
        }
        function orelse() {
            if (currentKw() == "else") {
                shiftToken();
                return colon_suite();
            }
            return [];
        }
        function while_stmt() {
            var r = mkAST("While");
            expectKw("while");
            r.test = test();
            r.body = colon_suite();
            r.orelse = orelse();
            return finish(r);
        }
        function if_stmt() {
            var r = mkAST("If");
            shiftToken();
            r.test = test();
            r.body = colon_suite();
            if (currentKw() == "elif") {
                r.orelse = [if_stmt()];
            }
            else {
                r.orelse = orelse();
            }
            return finish(r);
        }
        function for_stmt() {
            var r = mkAST("For");
            expectKw("for");
            r.target = exprlist();
            setStoreCtx(r.target);
            expectKw("in");
            r.iter = testlist();
            r.body = colon_suite();
            r.orelse = orelse();
            return finish(r);
        }
        function try_stmt() {
            var r = mkAST("Try");
            expectKw("try");
            r.body = colon_suite();
            r.handlers = [];
            var sawDefault = false;
            for (;;) {
                if (currentKw() == "except") {
                    var eh = mkAST("ExceptHandler");
                    r.handlers.push(eh);
                    shiftToken();
                    if (currentOp() != "Colon") {
                        if (sawDefault)
                            error();
                        eh.type = test();
                        if (currentKw() == "as") {
                            shiftToken();
                            eh.name = name();
                        }
                        else {
                            eh.name = null;
                        }
                    }
                    else {
                        sawDefault = true;
                        eh.type = null;
                        eh.name = null;
                    }
                    eh.body = colon_suite();
                }
                else {
                    break;
                }
            }
            r.orelse = orelse();
            if (r.handlers.length == 0 && r.orelse.length)
                error();
            if (currentKw() == "finally") {
                shiftToken();
                r.finalbody = colon_suite();
            }
            else {
                r.finalbody = [];
            }
            return finish(r);
        }
        function raise_stmt() {
            var r = mkAST("Raise");
            expectKw("raise");
            r.exc = null;
            r.cause = null;
            if (!atStmtEnd()) {
                r.exc = test();
                if (currentKw() == "from") {
                    shiftToken();
                    r.cause = test();
                }
            }
            return finish(r);
        }
        function with_item() {
            var r = mkAST("WithItem");
            r.context_expr = test();
            r.optional_vars = null;
            if (currentKw() == "as") {
                shiftToken();
                r.optional_vars = expr();
            }
            return finish(r);
        }
        function with_stmt() {
            var r = mkAST("With");
            expectKw("with");
            r.items = parseSepList(pxt.U.lf("with item"), with_item);
            r.body = colon_suite();
            return finish(r);
        }
        function funcdef() {
            var r = mkAST("FunctionDef");
            expectKw("def");
            r.name = name();
            expectOp("LParen");
            r.args = parse_arguments(true);
            expectOp("RParen");
            r.returns = null;
            if (currentOp() == "Arrow") {
                shiftToken();
                r.returns = test();
            }
            r.body = colon_suite();
            return finish(r);
        }
        function classdef() {
            var r = mkAST("ClassDef");
            expectKw("class");
            r.name = name();
            if (currentOp() == "LParen") {
                var rr = parseArgs();
                r.bases = rr.args;
                r.keywords = rr.keywords;
            }
            else {
                r.bases = [];
                r.keywords = [];
            }
            r.body = colon_suite();
            return finish(r);
        }
        function del_stmt() {
            var r = mkAST("Delete");
            expectKw("del");
            r.targets = parseList(pxt.U.lf("expression"), expr);
            return finish(r);
        }
        function wrap_expr_stmt(e) {
            var r = mkAST("ExprStmt");
            r.startPos = e.startPos;
            r.endPos = e.endPos;
            r.value = e;
            return r;
        }
        function yield_stmt() {
            var t0 = peekToken();
            shiftToken();
            if (currentKw() == "from") {
                var r_1 = mkAST("YieldFrom");
                r_1.value = test();
                return wrap_expr_stmt(finish(r_1));
            }
            var r = mkAST("Yield");
            if (!atStmtEnd())
                r.value = testlist();
            return wrap_expr_stmt(finish(r));
        }
        function pass_stmt() {
            var r = mkAST("Pass");
            expectKw("pass");
            return finish(r);
        }
        function atStmtEnd() {
            var t = peekToken();
            return t.type == py.TokenType.NewLine || (t.type == py.TokenType.Op && t.value == "Semicolon");
        }
        function break_stmt() {
            var r = mkAST("Break");
            shiftToken();
            return finish(r);
        }
        function continue_stmt() {
            var r = mkAST("Continue");
            shiftToken();
            return finish(r);
        }
        function return_stmt() {
            var r = mkAST("Return");
            shiftToken();
            if (!atStmtEnd()) {
                r.value = testlist();
            }
            else {
                r.value = null;
            }
            return finish(r);
        }
        function global_stmt() {
            var r = mkAST("Global");
            shiftToken();
            r.names = [];
            for (;;) {
                r.names.push(name());
                if (currentOp() == "Comma") {
                    shiftToken();
                }
                else {
                    break;
                }
            }
            return finish(r);
        }
        function nonlocal_stmt() {
            var r = global_stmt();
            r.kind = "Nonlocal";
            return r;
        }
        function dotted_name() {
            var s = "";
            for (;;) {
                s += name();
                if (currentOp() == "Dot") {
                    s += ".";
                    shiftToken();
                }
                else {
                    return s;
                }
            }
        }
        function dotted_as_name() {
            var r = mkAST("Alias");
            r.name = dotted_name();
            if (currentKw() == "as") {
                shiftToken();
                r.asname = name();
            }
            else {
                r.asname = null;
            }
            return finish(r);
        }
        function import_as_name() {
            var r = mkAST("Alias");
            r.name = name();
            if (currentKw() == "as") {
                shiftToken();
                r.asname = name();
            }
            else {
                r.asname = null;
            }
            return finish(r);
        }
        function dots() {
            var r = 0;
            for (;;) {
                if (currentOp() == "Dot") {
                    r += 1;
                    shiftToken();
                }
                else if (currentOp() == "Ellipsis") {
                    // not currently generated by lexer anyways
                    r += 3;
                    shiftToken();
                }
                else {
                    return r;
                }
            }
        }
        function import_name() {
            var r = mkAST("Import");
            shiftToken();
            r.names = parseSepList(pxt.U.lf("import name"), dotted_as_name);
            return finish(r);
        }
        function import_from() {
            var r = mkAST("ImportFrom");
            shiftToken();
            r.level = dots();
            if (peekToken().type == py.TokenType.Id)
                r.module = dotted_name();
            else
                r.module = null;
            if (!r.level && !r.module)
                error();
            expectKw("import");
            if (currentOp() == "Mult") {
                shiftToken();
                var star = mkAST("Alias");
                star.name = "*";
                r.names = [star];
            }
            else if (currentOp() == "LParen") {
                shiftToken();
                r.names = parseList(pxt.U.lf("import name"), import_as_name);
                expectOp("RParen");
            }
            else {
                r.names = parseList(pxt.U.lf("import name"), import_as_name);
            }
            return finish(r);
        }
        function assert_stmt() {
            var r = mkAST("Assert");
            shiftToken();
            r.test = test();
            if (currentOp() == "Comma") {
                shiftToken();
                r.msg = test();
            }
            else
                r.msg = null;
            return finish(r);
        }
        function tuple(t0, exprs) {
            var tupl = mkAST("Tuple", t0);
            tupl.elts = exprs;
            return finish(tupl);
        }
        function testlist_core(f) {
            var t0 = peekToken();
            var exprs = parseList(pxt.U.lf("expression"), f);
            var expr = exprs[0];
            if (exprs.length != 1)
                return tuple(t0, exprs);
            return expr;
        }
        function testlist_star_expr() { return testlist_core(star_or_test); }
        function testlist() { return testlist_core(test); }
        function exprlist() { return testlist_core(expr); }
        // somewhat approximate
        function setStoreCtx(e) {
            if (e.kind == "Tuple") {
                var t = e;
                t.elts.forEach(setStoreCtx);
            }
            else {
                e.ctx = "Store";
            }
        }
        function expr_stmt() {
            var t0 = peekToken();
            var expr = testlist_star_expr();
            var op = currentOp();
            if (op == "Assign") {
                var assign = mkAST("Assign");
                assign.targets = [expr];
                for (;;) {
                    shiftToken();
                    expr = testlist_star_expr();
                    op = currentOp();
                    if (op == "Assign") {
                        assign.targets.push(expr);
                    }
                    else {
                        assign.value = expr;
                        break;
                    }
                }
                assign.targets.forEach(setStoreCtx);
                return finish(assign);
            }
            if (op == "Colon") {
                var annAssign = mkAST("AnnAssign");
                annAssign.target = expr;
                shiftToken();
                annAssign.annotation = test();
                if (currentOp() == "Assign") {
                    shiftToken();
                    annAssign.value = test();
                }
                annAssign.simple = t0.type == py.TokenType.Id && expr.kind == "Name" ? 1 : 0;
                setStoreCtx(annAssign.target);
                return finish(annAssign);
            }
            if (pxt.U.endsWith(op, "Assign")) {
                var augAssign = mkAST("AugAssign");
                augAssign.target = expr;
                augAssign.op = op.replace("Assign", "");
                shiftToken();
                augAssign.value = testlist();
                setStoreCtx(augAssign.target);
                return finish(augAssign);
            }
            if (op == "Semicolon" || peekToken().type == py.TokenType.NewLine) {
                var exprStmt = mkAST("ExprStmt");
                exprStmt.value = expr;
                return finish(exprStmt);
            }
            error(9555, pxt.U.lf("unexpected token"));
            shiftToken();
            return null;
        }
        function small_stmt() {
            var fn = pxt.U.lookup(small_stmt_map, currentKw());
            if (fn)
                return fn();
            else
                return expr_stmt();
        }
        function simple_stmt() {
            var res = [small_stmt()];
            while (currentOp() == "Semicolon") {
                shiftToken();
                if (peekToken().type == py.TokenType.NewLine)
                    break;
                res.push(small_stmt());
            }
            expectNewline();
            return res.filter(function (s) { return !!s; });
        }
        function stmt() {
            if (peekToken().type == py.TokenType.Indent) {
                error(9573, pxt.U.lf("unexpected indent"));
                shiftToken();
            }
            var prevErr = diags.length;
            var decorators = [];
            while (currentOp() == "MatMult") {
                shiftToken();
                decorators.push(atom_expr());
                expectNewline();
            }
            var kw = currentKw();
            var fn = pxt.U.lookup(compound_stmt_map, currentKw());
            var rr = [];
            var comments = currComments;
            currComments = [];
            if (kw == "class" || kw == "def") {
                var r = fn();
                r.decorator_list = decorators;
                rr = [r];
            }
            else if (decorators.length) {
                error(9556, pxt.U.lf("decorators not allowed here"));
            }
            else if (fn)
                rr = [fn()];
            else
                rr = simple_stmt();
            if (comments.length && rr.length)
                rr[0]._comments = comments;
            // there were errors in this stmt; skip tokens until newline to resync
            var skp = [];
            if (diags.length > prevErr) {
                inParens = -1;
                while (prevToken.type != py.TokenType.Dedent && prevToken.type != py.TokenType.NewLine) {
                    shiftToken();
                    if (traceParser)
                        skp.push(py.tokenToString(peekToken()));
                    if (peekToken().type == py.TokenType.EOF)
                        break;
                }
                inParens = 0;
                if (traceParser)
                    pxt.log(traceLev + "skip: " + skp.join(", "));
            }
            if (traceParser)
                for (var _i = 0, rr_1 = rr; _i < rr_1.length; _i++) {
                    var r = rr_1[_i];
                    traceAST("stmt", r);
                }
            return rr;
        }
        function parse_arguments(allowTypes) {
            var r = mkAST("Arguments");
            r.args = [];
            r.defaults = [];
            r.kwonlyargs = [];
            r.kw_defaults = [];
            r.vararg = undefined;
            for (;;) {
                var o = currentOp();
                if (o == "Colon" || o == "RParen")
                    break;
                if (o == "Mult") {
                    if (r.vararg)
                        error(9557, pxt.U.lf("multiple *arg"));
                    shiftToken();
                    if (peekToken().type == py.TokenType.Id)
                        r.vararg = pdef();
                    else
                        r.vararg = null;
                }
                else if (o == "Pow") {
                    if (r.kwarg)
                        error(9558, pxt.U.lf("multiple **arg"));
                    shiftToken();
                    r.kwarg = pdef();
                }
                else {
                    if (r.kwarg)
                        error(9559, pxt.U.lf("arguments after **"));
                    var a = pdef();
                    var defl = null;
                    if (currentOp() == "Assign") {
                        shiftToken();
                        defl = test();
                    }
                    if (r.vararg !== undefined) {
                        r.kwonlyargs.push(a);
                        r.kw_defaults.push(defl);
                    }
                    else {
                        r.args.push(a);
                        if (defl)
                            r.defaults.push(defl);
                        else if (r.defaults.length)
                            error(9560, pxt.U.lf("non-default argument follows default argument"));
                    }
                }
                if (currentOp() == "Comma") {
                    shiftToken();
                }
                else {
                    break;
                }
            }
            if (!r.kwarg)
                r.kwarg = null;
            if (!r.vararg)
                r.vararg = null;
            return finish(r);
            function pdef() {
                var r = mkAST("Arg");
                r.arg = name();
                r.annotation = null;
                if (allowTypes) {
                    if (currentOp() == "Colon") {
                        shiftToken();
                        r.annotation = test();
                    }
                }
                return r;
            }
        }
        function lambdef(noCond) {
            var r = mkAST("Lambda");
            shiftToken();
            r.args = parse_arguments(false);
            expectOp("Colon");
            r.body = noCond ? test_nocond() : test();
            return finish(r);
        }
        function test() {
            if (currentKw() == "lambda")
                return lambdef();
            var t0 = peekToken();
            var t = or_test();
            if (currentKw() == "if") {
                var r = mkAST("IfExp", t0);
                r.body = t;
                expectKw("if");
                r.test = or_test();
                expectKw("else");
                r.orelse = test();
                return finish(r);
            }
            return t;
        }
        function bool_test(op, f) {
            var t0 = peekToken();
            var r = f();
            if (currentKw() == op) {
                var rr = mkAST("BoolOp", t0);
                rr.op = op == "or" ? "Or" : "And";
                rr.values = [r];
                while (currentKw() == op) {
                    expectKw(op);
                    rr.values.push(f());
                }
                return finish(rr);
            }
            return r;
        }
        function and_test() {
            return bool_test("and", not_test);
        }
        function or_test() {
            return bool_test("or", and_test);
        }
        function not_test() {
            if (currentKw() == "not") {
                var r = mkAST("UnaryOp");
                shiftToken();
                r.op = "Not";
                r.operand = not_test();
                return finish(r);
            }
            else
                return comparison();
        }
        var cmpOpMap = {
            'Lt': "Lt",
            'Gt': "Gt",
            'Eq': "Eq",
            'GtE': "GtE",
            'LtE': "LtE",
            'NotEq': "NotEq",
            'in': "In",
            'not': "NotIn",
            'is': "Is",
        };
        function getCmpOp() {
            return cmpOpMap[currentOp()] || cmpOpMap[currentKw()] || null;
        }
        function comparison() {
            var t0 = peekToken();
            var e = expr();
            if (!getCmpOp())
                return e;
            var r = mkAST("Compare", t0);
            r.left = e;
            r.comparators = [];
            r.ops = [];
            while (true) {
                var c = getCmpOp();
                if (!c)
                    break;
                shiftToken();
                if (c == "NotIn")
                    expectKw("in");
                else if (c == "Is") {
                    if (currentKw() == "not") {
                        shiftToken();
                        c = "IsNot";
                    }
                }
                r.ops.push(c);
                r.comparators.push(expr());
            }
            return finish(r);
        }
        var unOpMap = {
            'Invert': "Invert",
            'Sub': "USub",
            'Add': "UAdd",
        };
        function binOp(f, ops) {
            var t0 = peekToken();
            var e = f();
            for (;;) {
                var o = currentOp();
                if (o && ops.indexOf("," + o + ",") >= 0) {
                    var r = mkAST("BinOp", t0);
                    r.left = e;
                    r.op = o;
                    shiftToken();
                    r.right = f();
                    e = r;
                }
                else {
                    return e;
                }
            }
        }
        function term() { return binOp(factor, ",Mult,MatMult,Div,Mod,FloorDiv,"); }
        function arith_expr() { return binOp(term, ",Add,Sub,"); }
        function shift_expr() { return binOp(arith_expr, ",LShift,RShift,"); }
        function and_expr() { return binOp(shift_expr, ",BitAnd,"); }
        function xor_expr() { return binOp(and_expr, ",BitXor,"); }
        function expr() { return binOp(xor_expr, ",BitOr,"); }
        function subscript() {
            var t0 = peekToken();
            var lower = null;
            if (currentOp() != "Colon") {
                lower = test();
            }
            if (currentOp() == "Colon") {
                var r = mkAST("Slice", t0);
                r.lower = lower;
                shiftToken();
                var o = currentOp();
                if (o != "Colon" && o != "Comma" && o != "RSquare")
                    r.upper = test();
                else
                    r.upper = null;
                r.step = null;
                if (currentOp() == "Colon") {
                    shiftToken();
                    o = currentOp();
                    if (o != "Comma" && o != "RSquare")
                        r.step = test();
                }
                return finish(r);
            }
            else {
                var r = mkAST("Index");
                r.value = lower;
                return finish(r);
            }
        }
        function star_or_test() {
            if (currentOp() == "Mult") {
                var r = mkAST("Starred");
                r.value = expr();
                return finish(r);
            }
            else {
                return test();
            }
        }
        function test_nocond() {
            if (currentKw() == "lambda")
                return lambdef(true);
            else
                return or_test();
        }
        function comp_for() {
            var rr = [];
            for (;;) {
                var r = mkAST("Comprehension");
                r.is_async = 0;
                rr.push(r);
                expectKw("for");
                r.target = exprlist();
                setStoreCtx(r.target);
                expectKw("in");
                r.iter = or_test();
                r.ifs = [];
                for (;;) {
                    if (currentKw() == "if") {
                        shiftToken();
                        r.ifs.push(test_nocond());
                    }
                    else
                        break;
                }
                if (currentKw() != "for")
                    return rr;
            }
        }
        function argument() {
            var t0 = peekToken();
            if (currentOp() == "Mult") {
                var r = mkAST("Starred");
                shiftToken();
                r.value = test();
                return finish(r);
            }
            if (currentOp() == "Pow") {
                var r = mkAST("Keyword");
                shiftToken();
                r.arg = null;
                r.value = test();
                return finish(r);
            }
            var e = test();
            if (currentOp() == "Assign") {
                if (e.kind != "Name") {
                    error(9561, pxt.U.lf("invalid keyword argument; did you mean ==?"));
                }
                shiftToken();
                var r = mkAST("Keyword", t0);
                r.arg = e.id || "???";
                r.value = test();
                return finish(r);
            }
            else if (currentKw() == "for") {
                var r = mkAST("GeneratorExp", t0);
                r.elt = e;
                r.generators = comp_for();
                return finish(r);
            }
            else {
                return e;
            }
        }
        function dictorsetmaker() {
            var t0 = peekToken();
            shiftToken();
            if (currentOp() == "Pow") {
                shiftToken();
                return dict(null, expr());
            }
            else if (currentOp() == "RBracket") {
                var r = mkAST("Dict", t0);
                shiftToken();
                r.keys = [];
                r.values = [];
                return finish(r);
            }
            else {
                var e = star_or_test();
                if (e.kind != "Starred" && currentOp() == "Colon") {
                    shiftToken();
                    return dict(e, test());
                }
                else {
                    return set(e);
                }
            }
            function set(e) {
                if (currentKw() == "for") {
                    if (e.kind == "Starred")
                        error(9562, pxt.U.lf("iterable unpacking cannot be used in comprehension"));
                    var r_2 = mkAST("SetComp", t0);
                    r_2.elt = e;
                    r_2.generators = comp_for();
                    return finish(r_2);
                }
                var r = mkAST("Set", t0);
                r.elts = [e];
                if (currentOp() == "Comma") {
                    var rem = parseParenthesizedList("RBracket", pxt.U.lf("set element"), star_or_test);
                    r.elts = [e].concat(rem);
                }
                else {
                    expectOp("RBracket");
                }
                return finish(r);
            }
            function dictelt() {
                if (currentOp() == "Pow") {
                    shiftToken();
                    return [null, expr()];
                }
                else {
                    var e = test();
                    expectOp("Colon");
                    return [e, test()];
                }
            }
            function dict(key0, value0) {
                if (currentKw() == "for") {
                    if (!key0)
                        error(9563, pxt.U.lf("dict unpacking cannot be used in dict comprehension"));
                    var r_3 = mkAST("DictComp", t0);
                    r_3.key = key0;
                    r_3.value = value0;
                    r_3.generators = comp_for();
                    return finish(r_3);
                }
                var r = mkAST("Dict", t0);
                r.keys = [key0];
                r.values = [value0];
                if (currentOp() == "Comma") {
                    var rem = parseParenthesizedList("RBracket", pxt.U.lf("dict element"), dictelt);
                    for (var _i = 0, rem_1 = rem; _i < rem_1.length; _i++) {
                        var e = rem_1[_i];
                        r.keys.push(e[0]);
                        r.values.push(e[1]);
                    }
                }
                else {
                    expectOp("RBracket");
                }
                return finish(r);
            }
        }
        function shiftAndFake() {
            var r = mkAST("NameConstant");
            r.value = null;
            shiftToken();
            return finish(r);
        }
        function atom() {
            var t = peekToken();
            if (t.type == py.TokenType.Id) {
                var r = mkAST("Name");
                shiftToken();
                r.id = t.value;
                r.ctx = "Load";
                return finish(r);
            }
            else if (t.type == py.TokenType.Number) {
                var r = mkAST("Num");
                shiftToken();
                r.ns = t.value;
                r.n = t.auxValue;
                return finish(r);
            }
            else if (t.type == py.TokenType.String) {
                shiftToken();
                var s = t.value;
                while (peekToken().type == py.TokenType.String) {
                    s += peekToken().value;
                    shiftToken();
                }
                if (t.stringPrefix == "b") {
                    var r = mkAST("Bytes", t);
                    r.s = pxt.U.toArray(pxt.U.stringToUint8Array(s));
                    return finish(r);
                }
                else {
                    var r = mkAST("Str", t);
                    r.s = s;
                    return finish(r);
                }
            }
            else if (t.type == py.TokenType.Keyword) {
                if (t.value == "None" || t.value == "True" || t.value == "False") {
                    var r = mkAST("NameConstant");
                    shiftToken();
                    r.value = t.value == "True" ? true : t.value == "False" ? false : null;
                    return finish(r);
                }
                else {
                    error(9564, pxt.U.lf("expecting atom"));
                    return shiftAndFake();
                }
            }
            else if (t.type == py.TokenType.Op) {
                var o = t.value;
                if (o == "LParen") {
                    return parseParens("RParen", "Tuple", "GeneratorExp");
                }
                else if (o == "LSquare") {
                    return parseParens("RSquare", "List", "ListComp");
                }
                else if (o == "LBracket") {
                    return dictorsetmaker();
                }
                else {
                    error(9565, pxt.U.lf("unexpected operator"));
                    return shiftAndFake();
                }
            }
            else {
                error(9566, pxt.U.lf("unexpected token"));
                return shiftAndFake();
            }
        }
        function atListEnd() {
            var op = currentOp();
            if (op == "RParen" || op == "RSquare" || op == "RBracket" ||
                op == "Colon" || op == "Semicolon")
                return true;
            if (pxt.U.endsWith(op, "Assign"))
                return true;
            var kw = currentKw();
            if (kw == "in")
                return true;
            if (peekToken().type == py.TokenType.NewLine)
                return true;
            return false;
        }
        function parseList(category, f) {
            var r = [];
            if (atListEnd())
                return r;
            for (;;) {
                r.push(f());
                var hasComma = currentOp() == "Comma";
                if (hasComma)
                    shiftToken();
                // final comma is allowed, so no "else if" here
                if (atListEnd()) {
                    return r;
                }
                else {
                    if (!hasComma) {
                        error(9567, pxt.U.lf("expecting {0}", category));
                        return r;
                    }
                }
            }
        }
        function parseSepList(category, f) {
            var r = [];
            for (;;) {
                r.push(f());
                if (currentOp() == "Comma")
                    shiftToken();
                else
                    break;
            }
            return r;
        }
        function parseParenthesizedList(cl, category, f) {
            shiftToken();
            var r = [];
            if (currentOp() != cl)
                for (;;) {
                    r.push(f());
                    var hasComma = currentOp() == "Comma";
                    if (hasComma)
                        shiftToken();
                    // final comma is allowed, so no "else if" here
                    if (currentOp() == cl) {
                        break;
                    }
                    else {
                        if (!hasComma) {
                            error(9568, pxt.U.lf("expecting {0}", category));
                            break;
                        }
                    }
                }
            expectOp(cl);
            return r;
        }
        function parseParens(cl, tuple, comp) {
            var t0 = peekToken();
            shiftToken();
            if (currentOp() == cl) {
                shiftToken();
                var r = mkAST(tuple, t0);
                r.elts = [];
                return finish(r);
            }
            var e0 = star_or_test();
            if (currentKw() == "for") {
                var r = mkAST(comp, t0);
                r.elt = e0;
                r.generators = comp_for();
                expectOp(cl);
                return finish(r);
            }
            if (currentOp() == "Comma") {
                var r = mkAST(tuple, t0);
                shiftToken();
                r.elts = parseList(pxt.U.lf("expression"), star_or_test);
                r.elts.unshift(e0);
                expectOp(cl);
                return finish(r);
            }
            expectOp(cl);
            if (tuple == "List") {
                var r = mkAST(tuple, t0);
                r.elts = [e0];
                return finish(r);
            }
            return e0;
        }
        function name() {
            var t = peekToken();
            if (t.type != py.TokenType.Id)
                error(9569, pxt.U.lf("expecting identifier"));
            shiftToken();
            return t.value;
        }
        function parseArgs() {
            var args = parseParenthesizedList("RParen", pxt.U.lf("argument"), argument);
            var rargs = [];
            var rkeywords = [];
            for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
                var e = args_1[_i];
                if (e.kind == "Keyword")
                    rkeywords.push(e);
                else {
                    if (rkeywords.length)
                        error(9570, pxt.U.lf("positional argument follows keyword argument"));
                    rargs.push(e);
                }
            }
            return { args: rargs, keywords: rkeywords };
        }
        function trailer(t0, e) {
            var o = currentOp();
            if (o == "LParen") {
                var r = mkAST("Call", t0);
                r.func = e;
                var rr = parseArgs();
                r.args = rr.args;
                r.keywords = rr.keywords;
                return finish(r);
            }
            else if (o == "LSquare") {
                var t1 = peekToken();
                var r = mkAST("Subscript", t0);
                r.value = e;
                var sl = parseParenthesizedList("RSquare", pxt.U.lf("subscript"), subscript);
                if (sl.length == 0)
                    error(9571, pxt.U.lf("need non-empty index list"));
                else if (sl.length == 1)
                    r.slice = sl[0];
                else {
                    if (sl.every(function (s) { return s.kind == "Index"; })) {
                        var q = sl[0];
                        q.value = tuple(t1, sl.map(function (e) { return e.value; }));
                        r.slice = q;
                    }
                    else {
                        var extSl = mkAST("ExtSlice", t1);
                        extSl.dims = sl;
                        r.slice = finish(extSl);
                    }
                }
                return finish(r);
            }
            else if (o == "Dot") {
                var r = mkAST("Attribute", t0);
                r.value = e;
                shiftToken();
                r.attr = name();
                return finish(r);
            }
            else {
                return e;
            }
        }
        function atom_expr() {
            var t0 = peekToken();
            var e = atom();
            for (;;) {
                var ee = trailer(t0, e);
                if (ee === e)
                    return e;
                e = ee;
            }
        }
        function power() {
            var t0 = peekToken();
            var e = atom_expr();
            if (currentOp() == "Pow") {
                var r = mkAST("BinOp");
                shiftToken();
                r.left = e;
                r.op = "Pow";
                r.right = factor();
                return finish(r);
            }
            else {
                return e;
            }
        }
        function factor() {
            if (unOpMap[currentOp()]) {
                var r = mkAST("UnaryOp");
                r.op = unOpMap[currentOp()];
                shiftToken();
                r.operand = factor();
                return finish(r);
            }
            else {
                return power();
            }
        }
        var fieldOrder = {
            kind: 1, id: 2, n: 3, s: 4, func: 5, key: 6, elt: 7, elts: 8, keys: 9, left: 10,
            ops: 11, comparators: 12, names: 13, items: 14, test: 15, targets: 16, dims: 17,
            context_expr: 18, name: 19, bases: 20, type: 21, inClass: 22, target: 23,
            annotation: 24, simple: 25, op: 26, operand: 27, right: 28, values: 29, iter: 30,
            ifs: 31, is_async: 32, value: 33, slice: 34, attr: 35, generators: 36, args: 37,
            keywords: 38, body: 39, handlers: 40, orelse: 41, finalbody: 42, decorator_list: 43,
            kwonlyargs: 44, kw_defaults: 45, defaults: 46, arg: 47,
        };
        var fieldsIgnore = {
            lineno: 1,
            col_offset: 1,
            startPos: 1,
            endPos: 1,
            kind: 1,
        };
        var stmtFields = {
            body: 1,
            orelse: 1,
            finalbody: 1
        };
        var cmpIgnore = {
            _comments: 1,
            ctx: 1,
            ns: 1,
        };
        function dump(asts, cmp) {
            if (cmp === void 0) { cmp = false; }
            var rec = function (ind, v) {
                if (Array.isArray(v)) {
                    var s = "";
                    for (var i = 0; i < v.length; ++i) {
                        if (i > 0)
                            s += ", ";
                        s += rec(ind, v[i]);
                    }
                    return "[" + s + "]";
                }
                if (!v || !v.kind)
                    return JSON.stringify(v);
                var r = "";
                var keys = Object.keys(v);
                keys.sort(function (a, b) { return (fieldOrder[a] || 100) - (fieldOrder[b] || 100) || pxt.U.strcmp(a, b); });
                for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                    var k = keys_1[_i];
                    if (pxt.U.lookup(fieldsIgnore, k))
                        continue;
                    if (cmp && pxt.U.lookup(cmpIgnore, k))
                        continue;
                    if (r)
                        r += ", ";
                    r += k + "=";
                    if (Array.isArray(v[k]) && v[k].length && pxt.U.lookup(stmtFields, k)) {
                        r += "[\n";
                        var i2 = ind + "  ";
                        for (var _a = 0, _b = v[k]; _a < _b.length; _a++) {
                            var e = _b[_a];
                            r += i2 + rec(i2, e) + "\n";
                        }
                        r += ind + "]";
                    }
                    else if (k == "_comments") {
                        r += "[\n";
                        var i2 = ind + "  ";
                        for (var _c = 0, _d = v[k]; _c < _d.length; _c++) {
                            var e = _d[_c];
                            r += i2 + JSON.stringify(e.value) + "\n";
                        }
                        r += ind + "]";
                    }
                    else {
                        r += rec(ind, v[k]);
                    }
                }
                return v.kind + "(" + r + ")";
            };
            var r = "";
            for (var _i = 0, asts_1 = asts; _i < asts_1.length; _i++) {
                var e = asts_1[_i];
                r += rec("", e) + "\n";
            }
            return r;
        }
        py.dump = dump;
        function parse(_source, _filename, _tokens) {
            source = _source;
            filename = _filename;
            tokens = _tokens;
            inParens = 0;
            nextToken = 0;
            currComments = [];
            indentStack = [0];
            diags = [];
            var res = [];
            try {
                prevToken = tokens[0];
                skipTokens();
                if (peekToken().type != py.TokenType.EOF) {
                    res = stmt();
                    while (peekToken().type != py.TokenType.EOF)
                        pxt.U.pushRange(res, stmt());
                }
            }
            catch (e) {
                error(9572, pxt.U.lf("exception: {0}", e.message));
            }
            return {
                stmts: res,
                diagnostics: diags
            };
        }
        py.parse = parse;
    })(py = pxt.py || (pxt.py = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var py;
    (function (py) {
        function decompileToPython(program, filename) {
            var result = emptyResult();
            try {
                var output = tsToPy(program, filename);
                var outFilename = filename.replace(/(\.py)?\.\w*$/i, '') + '.py';
                result.outfiles[outFilename] = output;
            }
            catch (e) {
                if (e.pyDiagnostic)
                    result.diagnostics = [e.pyDiagnostic];
                else
                    pxt.reportException(e);
                result.success = false;
            }
            return result;
        }
        py.decompileToPython = decompileToPython;
        function emptyResult() {
            return {
                blocksInfo: null,
                outfiles: {},
                diagnostics: [],
                success: true,
                times: {}
            };
        }
        function throwError(node, code, messageText) {
            var diag = {
                fileName: node.getSourceFile().fileName,
                start: node.getStart(),
                length: node.getEnd() - node.getStart(),
                line: undefined,
                column: undefined,
                code: code,
                category: pxtc.DiagnosticCategory.Error,
                messageText: messageText,
            };
            var err = new Error(messageText);
            err.pyDiagnostic = diag;
            throw err;
        }
        ///
        /// UTILS
        ///
        py.INDENT = "    ";
        function indent(lvl) {
            return function (s) { return "" + py.INDENT.repeat(lvl) + s; };
        }
        var indent1 = indent(1);
        function tsToPy(prog, filename) {
            // state
            // TODO pass state explicitly
            var global = { vars: {} }; // TODO populate global scope
            var env = [global];
            // helpers
            var tc = prog.getTypeChecker();
            var lhost = new ts.pxtc.LSHost(prog);
            // let ls = ts.createLanguageService(lhost) // TODO
            var file = prog.getSourceFile(filename);
            var reservedWords = pxt.U.toSet(getReservedNmes(), function (s) { return s; });
            var _a = ts.pxtc.decompiler.buildRenameMap(prog, file, reservedWords), renameMap = _a[0], globalNames = _a[1];
            var allSymbols = pxtc.getApiInfo(prog);
            var symbols = pxt.U.mapMap(allSymbols.byQName, 
            // filter out symbols from the .ts corresponding to this file
            function (k, v) { return v.fileName == filename ? undefined : v; });
            // ts->py
            return emitFile(file);
            ///
            /// ENVIRONMENT
            ///
            // TODO: it's possible this parallel scope construction isn't necessary if we can get the info we need from the TS semantic info
            function pushScope() {
                var newScope = mkScope();
                env.unshift(newScope);
                return newScope;
                function mkScope() {
                    return { vars: {} };
                }
            }
            function popScope() {
                return env.shift();
            }
            function getReservedNmes() {
                var reservedNames = ['ArithmeticError', 'AssertionError', 'AttributeError',
                    'BaseException', 'BlockingIOError', 'BrokenPipeError', 'BufferError', 'BytesWarning',
                    'ChildProcessError', 'ConnectionAbortedError', 'ConnectionError',
                    'ConnectionRefusedError', 'ConnectionResetError', 'DeprecationWarning', 'EOFError',
                    'Ellipsis', 'EnvironmentError', 'Exception', 'False', 'FileExistsError',
                    'FileNotFoundError', 'FloatingPointError', 'FutureWarning', 'GeneratorExit', 'IOError',
                    'ImportError', 'ImportWarning', 'IndentationError', 'IndexError',
                    'InterruptedError', 'IsADirectoryError', 'KeyError', 'KeyboardInterrupt', 'LookupError',
                    'MemoryError', 'NameError', 'None', 'NotADirectoryError', 'NotImplemented',
                    'NotImplementedError', 'OSError', 'OverflowError', 'PendingDeprecationWarning',
                    'PermissionError', 'ProcessLookupError', 'RecursionError', 'ReferenceError',
                    'ResourceWarning', 'RuntimeError', 'RuntimeWarning', 'StopAsyncIteration',
                    'StopIteration', 'SyntaxError', 'SyntaxWarning', 'SystemError', 'SystemExit',
                    'TabError', 'TimeoutError', 'True', 'TypeError', 'UnboundLocalError',
                    'UnicodeDecodeError', 'UnicodeEncodeError', 'UnicodeError', 'UnicodeTranslateError',
                    'UnicodeWarning', 'UserWarning', 'ValueError', 'Warning', 'ZeroDivisionError', '_',
                    '__build_class__', '__debug__', '__doc__', '__import__', '__loader__', '__name__',
                    '__package__', '__spec__', 'abs', 'all', 'any', 'ascii', 'bin', 'bool',
                    'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex',
                    'copyright', 'credits', 'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval',
                    'exec', 'exit', 'filter', 'float', 'format', 'frozenset', 'getattr',
                    'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int',
                    'isinstance', 'issubclass', 'iter', 'len', 'license', 'list', 'locals', 'map',
                    'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow',
                    'print', 'property', 'quit', 'range', 'repr', 'reversed', 'round', 'set',
                    'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple',
                    'type', 'vars', 'zip'];
                return reservedNames;
            }
            function tryGetPyName(exp) {
                if (!exp.getSourceFile())
                    return null;
                var tsExp = exp.getText();
                var sym = symbols[tsExp];
                if (sym && sym.pyQName) {
                    return sym.pyQName;
                }
                return null;
            }
            function getName(name) {
                var pyName = tryGetPyName(name);
                if (pyName)
                    return pyName;
                if (!ts.isIdentifier(name)) {
                    return throwError(name, 3001, "Unsupported advanced name format: " + name.getText());
                }
                var outName = name.text;
                var hasSrc = name.getSourceFile();
                if (renameMap && hasSrc) {
                    var rename = renameMap.getRenameForPosition(name.getStart());
                    if (rename) {
                        outName = rename.name;
                    }
                }
                return outName;
            }
            function getNewGlobalName(nameHint) {
                // TODO right now this uses a global name set, but really there should be options to allow shadowing
                if (typeof nameHint !== "string")
                    nameHint = getName(nameHint);
                if (globalNames[nameHint]) {
                    return pxtc.decompiler.getNewName(nameHint, globalNames);
                }
                else {
                    globalNames[nameHint] = true;
                    return nameHint;
                }
            }
            // TODO decide on strategy for tracking variable scope(s)
            // function introVar(name: string, decl: ts.Node): string {
            //     let scope = env[0]
            //     let maxItr = 100
            //     let newName = name
            //     for (let i = 0; i < maxItr && newName in scope.vars; i++) {
            //         let matches = newName.match(/\d+$/);
            //         if (matches) {
            //             let num = parseInt(matches[0], 10)
            //             num++
            //             newName = newName.replace(/\d+$/, num.toString())
            //         } else {
            //             newName += 1
            //         }
            //     }
            //     if (newName in scope.vars)
            //         throw Error("Implementation error: unable to find an alternative variable name for: " + newName)
            //     if (newName !== name) {
            //         // do rename
            //         let locs = ls.findRenameLocations(filename, decl.pos + 1, false, false)
            //         for (let l of locs) {
            //             // ts.getNode
            //         }
            //     }
            //     scope.vars[newName] = decl
            //     return newName
            // }
            ///
            /// TYPE UTILS
            ///
            function hasTypeFlag(t, fs) {
                return (t.flags & fs) !== 0;
            }
            function isType(s, fs) {
                var type = tc.getTypeAtLocation(s);
                return hasTypeFlag(type, fs);
            }
            function isStringType(s) {
                return isType(s, ts.TypeFlags.StringLike);
            }
            function isNumberType(s) {
                return isType(s, ts.TypeFlags.NumberLike);
            }
            ///
            /// NEWLINES, COMMENTS, and WRAPPERS
            ///
            function emitFile(file) {
                // emit file
                var outLns = file.getChildren()
                    .map(emitNode)
                    .reduce(function (p, c) { return p.concat(c); }, [])
                    .join("\n");
                return outLns;
            }
            function emitNode(s) {
                switch (s.kind) {
                    case ts.SyntaxKind.SyntaxList:
                        return s._children
                            .map(emitNode)
                            .reduce(function (p, c) { return p.concat(c); }, []);
                    case ts.SyntaxKind.EndOfFileToken:
                    case ts.SyntaxKind.OpenBraceToken:
                    case ts.SyntaxKind.CloseBraceToken:
                        return [];
                    default:
                        return emitStmtWithNewlines(s);
                }
            }
            function emitStmtWithNewlines(s) {
                var out = [];
                if (s.getLeadingTriviaWidth() > 0) {
                    var leading = s.getFullText().slice(0, s.getLeadingTriviaWidth());
                    var lns = leading.split("\n");
                    var getTriviaLine = function (s) {
                        var trimmed = s.trim();
                        if (!trimmed)
                            return "blank";
                        if (!trimmed.startsWith("//"))
                            return "unknown";
                        var com = "#" + trimmed.slice(2, trimmed.length);
                        return ["comment", com];
                    };
                    var trivia = lns
                        .map(getTriviaLine)
                        .filter(function (s) { return s !== "unknown"; })
                        .map(function (s) { return s === "blank" ? "" : s[1]; });
                    if (trivia && !trivia[0])
                        trivia.shift();
                    if (trivia && !trivia[trivia.length - 1])
                        trivia.pop();
                    out = out.concat(trivia);
                }
                out = out.concat(emitStmt(s));
                return out;
            }
            ///
            /// STATEMENTS
            ///
            function emitStmt(s) {
                if (ts.isVariableStatement(s)) {
                    return emitVarStmt(s);
                }
                else if (ts.isClassDeclaration(s)) {
                    return emitClassStmt(s);
                }
                else if (ts.isEnumDeclaration(s)) {
                    return emitEnumStmt(s);
                }
                else if (ts.isExpressionStatement(s)) {
                    return emitExpStmt(s);
                }
                else if (ts.isFunctionDeclaration(s)) {
                    return emitFuncDecl(s);
                }
                else if (ts.isIfStatement(s)) {
                    return emitIf(s);
                }
                else if (ts.isForStatement(s)) {
                    return emitForStmt(s);
                }
                else if (ts.isForOfStatement(s)) {
                    return emitForOfStmt(s);
                }
                else if (ts.isWhileStatement(s)) {
                    return emitWhileStmt(s);
                }
                else if (ts.isReturnStatement(s)) {
                    return emitReturnStmt(s);
                }
                else if (ts.isBlock(s)) {
                    return emitBlock(s);
                }
                else if (ts.isTypeAliasDeclaration(s)) {
                    return emitTypeAliasDecl(s);
                }
                else if (ts.isEmptyStatement(s)) {
                    return [];
                }
                else if (ts.isModuleDeclaration(s)) {
                    return emitModuleDeclaration(s);
                }
                else {
                    return throwError(s, 3002, "Not implemented: " + ts.SyntaxKind[s.kind] + " (" + s.kind + ")");
                }
            }
            function emitModuleDeclaration(s) {
                var name = getName(s.name);
                var stmts = s.body && s.body.getChildren()
                    .map(emitNode)
                    .reduce(function (p, c) { return p.concat(c); }, [])
                    .map(function (n) { return indent1(n); });
                return ["@namespace", "class " + name + ":"].concat(stmts);
            }
            function emitTypeAliasDecl(s) {
                var typeStr = pxtc.emitType(s.type);
                var name = getName(s.name);
                return [name + " = " + typeStr];
            }
            function emitReturnStmt(s) {
                if (!s.expression)
                    return ['return'];
                var _a = emitExp(s.expression), exp = _a[0], expSup = _a[1];
                var stmt = "return " + exp;
                return expSup.concat([stmt]);
            }
            function emitWhileStmt(s) {
                var _a = emitExp(s.expression), cond = _a[0], condSup = _a[1];
                var body = emitBody(s.statement)
                    .map(indent1);
                var whileStmt = "while " + cond + ":";
                return condSup.concat([whileStmt]).concat(body);
            }
            function isNormalInteger(str) {
                var asInt = Math.floor(Number(str));
                return asInt !== Infinity && String(asInt) === str;
            }
            function getSimpleForRange(s) {
                var result = {
                    name: null,
                    fromIncl: null,
                    toExcl: null
                };
                // must be (let i = X; ...)
                if (!s.initializer)
                    return null;
                if (s.initializer.kind !== ts.SyntaxKind.VariableDeclarationList)
                    return null;
                var initDecls = s.initializer;
                if (initDecls.declarations.length !== 1) {
                    return null;
                }
                var decl = initDecls.declarations[0];
                result.name = getName(decl.name);
                if (!isConstExp(decl.initializer) || !isNumberType(decl.initializer)) {
                    // TODO allow variables?
                    // TODO restrict to numbers?
                    return null;
                }
                var _a = emitExp(decl.initializer), fromNum = _a[0], fromNumSup = _a[1];
                if (fromNumSup.length)
                    return null;
                result.fromIncl = fromNum;
                // TODO body must not mutate loop variable
                // must be (...; i < Y; ...)
                if (!s.condition)
                    return null;
                if (!ts.isBinaryExpression(s.condition))
                    return null;
                if (!ts.isIdentifier(s.condition.left))
                    return null;
                if (getName(s.condition.left) != result.name)
                    return null;
                // TODO restrict initializers to expressions that aren't modified by the loop
                // e.g. isConstExp(s.condition.right) but more semantic
                if (!isNumberType(s.condition.right)) {
                    return null;
                }
                var _b = emitExp(s.condition.right), toNum = _b[0], toNumSup = _b[1];
                if (toNumSup.length)
                    return null;
                result.toExcl = toNum;
                if (s.condition.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken) {
                    if (isNormalInteger(toNum))
                        result.toExcl = "" + (Number(toNum) + 1);
                    else
                        result.toExcl += " + 1";
                }
                else if (s.condition.operatorToken.kind !== ts.SyntaxKind.LessThanToken)
                    return null;
                // must be (...; i++)
                // TODO allow += 1
                if (!s.incrementor)
                    return null;
                if (!ts.isPostfixUnaryExpression(s.incrementor)
                    && !ts.isPrefixUnaryExpression(s.incrementor))
                    return null;
                if (s.incrementor.operator !== ts.SyntaxKind.PlusPlusToken)
                    return null;
                // must be X < Y
                if (!(result.fromIncl < result.toExcl))
                    return null;
                return result;
            }
            function emitBody(s) {
                var body = emitStmt(s)
                    .map(indent1);
                if (body.length < 1)
                    body = [indent1("pass")];
                return body;
            }
            function emitForOfStmt(s) {
                if (!ts.isVariableDeclarationList(s.initializer)) {
                    return throwError(s, 3003, "Unsupported expression in for..of initializer: " + s.initializer.getText());
                }
                var names = s.initializer.declarations
                    .map(function (d) { return getName(d.name); });
                if (names.length !== 1) {
                    return throwError(s, 3004, "Unsupported multiple declerations in for..of: " + s.initializer.getText()); // TODO
                }
                var name = names[0];
                var _a = emitExp(s.expression), exp = _a[0], expSup = _a[1];
                var out = expSup;
                out.push("for " + name + " in " + exp + ":");
                var body = emitBody(s.statement);
                out = out.concat(body);
                return out;
            }
            function emitForStmt(s) {
                var rangeItr = getSimpleForRange(s);
                if (rangeItr) {
                    // special case (aka "repeat z times" block):
                    // for (let x = y; x < z; x++)
                    // ->
                    // for x in range(y, z):
                    // TODO ensure x and z can't be mutated in the loop body
                    var name_3 = rangeItr.name, fromIncl = rangeItr.fromIncl, toExcl = rangeItr.toExcl;
                    var forStmt = fromIncl === "0"
                        ? "for " + name_3 + " in range(" + toExcl + "):"
                        : "for " + name_3 + " in range(" + fromIncl + ", " + toExcl + "):";
                    var body_1 = emitBody(s.statement);
                    return [forStmt].concat(body_1);
                }
                // general case:
                // for (<inits>; <cond>; <updates>)
                // ->
                // <inits>
                // while <cond>:
                //   # body
                //   <updates>
                var out = [];
                // initializer(s)
                if (s.initializer) {
                    if (ts.isVariableDeclarationList(s.initializer)) {
                        var decls = s.initializer.declarations
                            .map(emitVarDecl)
                            .reduce(function (p, c) { return p.concat(c); }, []);
                        out = out.concat(decls);
                    }
                    else {
                        var _a = emitExp(s.initializer), exp = _a[0], expSup = _a[1];
                        out = out.concat(expSup).concat([exp]);
                    }
                }
                // condition(s)
                var cond;
                if (s.condition) {
                    var _b = emitExp(s.condition), condStr = _b[0], condSup = _b[1];
                    out = out.concat(condSup);
                    cond = condStr;
                }
                else {
                    cond = "True";
                }
                var whileStmt = "while " + cond + ":";
                out.push(whileStmt);
                // body
                var body = emitStmt(s.statement)
                    .map(indent1);
                if (body.length === 0 && !s.incrementor)
                    body = [indent1("pass")];
                out = out.concat(body);
                // updater(s)
                if (s.incrementor) {
                    var unaryIncDec = tryEmitIncDecUnaryStmt(s.incrementor);
                    if (unaryIncDec) {
                        // special case: ++ or --
                        out = out.concat(unaryIncDec.map(indent1));
                    }
                    else {
                        // general case
                        var _c = emitExp(s.incrementor), inc = _c[0], incSup = _c[1];
                        out = out.concat(incSup)
                            .concat([indent1(inc)]);
                    }
                }
                return out;
            }
            function emitIf(s) {
                var _a = emitIfHelper(s), supportStmts = _a.supportStmts, ifStmt = _a.ifStmt, rest = _a.rest;
                return supportStmts.concat([ifStmt]).concat(rest);
            }
            function emitIfHelper(s) {
                var sup = [];
                var _a = emitExp(s.expression), cond = _a[0], condSup = _a[1];
                sup = sup.concat(condSup);
                var ifStmt = "if " + cond + ":";
                var ifRest = [];
                var th = emitBody(s.thenStatement);
                ifRest = ifRest.concat(th);
                if (s.elseStatement) {
                    if (ts.isIfStatement(s.elseStatement)) {
                        var _b = emitIfHelper(s.elseStatement), supportStmts = _b.supportStmts, ifStmt_1 = _b.ifStmt, rest = _b.rest;
                        var elif = "el" + ifStmt_1;
                        sup = sup.concat(supportStmts);
                        ifRest.push(elif);
                        ifRest = ifRest.concat(rest);
                    }
                    else {
                        ifRest.push("else:");
                        var el = emitBody(s.elseStatement);
                        ifRest = ifRest.concat(el);
                    }
                }
                return { supportStmts: sup, ifStmt: ifStmt, rest: ifRest };
            }
            function emitVarStmt(s) {
                var decls = s.declarationList.declarations;
                return decls
                    .map(emitVarDecl)
                    .reduce(function (p, c) { return p.concat(c); }, []);
            }
            function emitClassStmt(s) {
                var out = [];
                // TODO handle inheritence
                var isEnum = s.members.every(isEnumMem); // TODO hack?
                var name = getName(s.name);
                if (isEnum)
                    out.push("class " + name + "(Enum):");
                else
                    out.push("class " + name + ":");
                var mems = s.members
                    .map(emitClassMem)
                    .reduce(function (p, c) { return p.concat(c); }, [])
                    .filter(function (m) { return m; });
                if (mems.length) {
                    out = out.concat(mems.map(indent1));
                }
                return out;
            }
            function emitEnumStmt(s) {
                var out = [];
                out.push("class " + getName(s.name) + "(Enum):");
                var allInit = s.members
                    .every(function (m) { return !!m.initializer; });
                var noInit = !s.members
                    .every(function (m) { return !!m.initializer; });
                if (!allInit && !noInit) {
                    return throwError(s, 3005, "Unsupported enum decleration: has mixture of explicit and implicit initialization");
                }
                if (allInit) {
                    var memAndSup = s.members
                        .map(function (m) { return [m, emitExp(m.initializer)]; });
                    return throwError(s, 3006, "Unsupported: explicit enum initialization"); // TODO
                }
                var val = 0;
                for (var _i = 0, _a = s.members; _i < _a.length; _i++) {
                    var m = _a[_i];
                    out.push(indent1(getName(m.name) + " = " + val++));
                }
                return out;
            }
            function isEnumMem(s) {
                if (s.kind !== ts.SyntaxKind.PropertyDeclaration)
                    return false;
                var prop = s;
                if (!prop.modifiers || prop.modifiers.length !== 1)
                    return false;
                for (var _i = 0, _a = prop.modifiers; _i < _a.length; _i++) {
                    var mod = _a[_i];
                    if (mod.kind !== ts.SyntaxKind.StaticKeyword)
                        return false;
                }
                if (prop.initializer.kind !== ts.SyntaxKind.NumericLiteral)
                    return false;
                return true;
            }
            function emitClassMem(s) {
                switch (s.kind) {
                    case ts.SyntaxKind.PropertyDeclaration:
                        return emitPropDecl(s);
                    case ts.SyntaxKind.MethodDeclaration:
                        return emitFuncDecl(s);
                    case ts.SyntaxKind.Constructor:
                        return emitFuncDecl(s);
                    default:
                        return ["# unknown ClassElement " + s.kind];
                }
            }
            function emitPropDecl(s) {
                var nm = getName(s.name);
                if (s.initializer) {
                    var _a = emitExp(s.initializer), init = _a[0], initSup = _a[1];
                    return initSup.concat([nm + " = " + init]);
                }
                else {
                    // can't do declerations without initilization in python
                    return [];
                }
            }
            function isUnaryPlusPlusOrMinusMinus(e) {
                if (!ts.isPrefixUnaryExpression(e) &&
                    !ts.isPostfixUnaryExpression(e))
                    return false;
                if (e.operator !== ts.SyntaxKind.MinusMinusToken &&
                    e.operator !== ts.SyntaxKind.PlusPlusToken)
                    return false;
                return true;
            }
            function tryEmitIncDecUnaryStmt(e) {
                // special case ++ or -- as a statement
                if (!isUnaryPlusPlusOrMinusMinus(e))
                    return null;
                var _a = emitExp(e.operand), operand = _a[0], sup = _a[1];
                var incDec = e.operator === ts.SyntaxKind.MinusMinusToken ? " -= 1" : " += 1";
                var out = sup;
                out.push("" + operand + incDec);
                return out;
            }
            function emitExpStmt(s) {
                var unaryExp = tryEmitIncDecUnaryStmt(s.expression);
                if (unaryExp)
                    return unaryExp;
                var _a = emitExp(s.expression), exp = _a[0], expSup = _a[1];
                return expSup.concat(["" + exp]);
            }
            function emitBlock(s) {
                var stmts = s.getChildren()
                    .map(emitNode)
                    .reduce(function (p, c) { return p.concat(c); }, []);
                // TODO figuring out variable scoping..
                // let syms = tc.getSymbolsInScope(s, ts.SymbolFlags.Variable)
                // let symTxt = "#ts@ " + syms.map(s => s.name).join(", ")
                // stmts.unshift(symTxt)
                // stmts.unshift("# {") // TODO
                // let pyVars = "#py@ " + Object.keys(env[0].vars).join(", ")
                // stmts.push(pyVars)
                // stmts.push("# }")
                return stmts;
            }
            function emitFuncDecl(s, name, altParams, skipTypes) {
                if (name === void 0) { name = null; }
                // TODO determine captured variables, then determine global and nonlocal directives
                // TODO helper function for determining if an expression can be a python expression
                var paramList = [];
                if (s.kind === ts.SyntaxKind.MethodDeclaration ||
                    s.kind === ts.SyntaxKind.Constructor) {
                    paramList.push("self");
                }
                var paramDeclDefs = altParams ? mergeParamDecls(s.parameters, altParams) : s.parameters;
                var paramDecls = paramDeclDefs
                    .map(function (d) { return emitParamDecl(d, !skipTypes); });
                paramList = paramList.concat(paramDecls);
                var params = paramList.join(", ");
                var out = [];
                var fnName;
                if (s.kind === ts.SyntaxKind.Constructor) {
                    fnName = "__init__";
                }
                else {
                    fnName = name || getName(s.name);
                }
                out.push("def " + fnName + "(" + params + "):");
                pushScope(); // functions start a new scope in python
                var stmts = [];
                if (ts.isBlock(s.body))
                    stmts = emitBlock(s.body);
                else {
                    var _a = emitExp(s.body), exp = _a[0], sup = _a[1];
                    stmts = stmts.concat(sup);
                    stmts.push(exp);
                }
                if (stmts.length) {
                    out = out.concat(stmts.map(indent1));
                }
                else {
                    out.push(indent1("pass")); // cannot have an empty body
                }
                popScope();
                return out;
            }
            function emitParamDecl(s, inclTypesIfAvail) {
                if (inclTypesIfAvail === void 0) { inclTypesIfAvail = true; }
                var nm = s.altName || getName(s.name);
                var typePart = "";
                if (s.type && inclTypesIfAvail) {
                    var typ = pxtc.emitType(s.type);
                    typePart = ": " + typ;
                }
                var initPart = "";
                if (s.initializer) {
                    var _a = emitExp(s.initializer), initExp = _a[0], initSup = _a[1];
                    if (initSup.length) {
                        return throwError(s, 3007, "TODO: complex expression in parameter default value not supported. Expression: " + s.initializer.getText());
                    }
                    initPart = " = " + initExp;
                }
                return "" + nm + typePart + initPart;
            }
            function emitVarDecl(s) {
                var out = [];
                var varNm = getName(s.name);
                // out.push(`#let ${varNm}`) // TODO debug
                // varNm = introVar(varNm, s.name)
                if (s.initializer) {
                    // TODO
                    // let syms = tc.getSymbolsInScope(s, ts.SymbolFlags.Variable)
                    // let symTxt = "#@ " + syms.map(s => s.name).join(", ")
                    // out.push(symTxt)
                    var _a = emitExp(s.initializer), exp = _a[0], expSup = _a[1];
                    out = out.concat(expSup);
                    var declStmt = void 0;
                    if (s.type) {
                        var translatedType = pxtc.emitType(s.type);
                        declStmt = varNm + ": " + translatedType + " = " + exp;
                    }
                    else {
                        declStmt = varNm + " = " + exp;
                    }
                    out.push(declStmt);
                    return out;
                }
                else {
                    // can't do declerations without initilization in python
                }
                return out;
            }
            function asExpRes(str) {
                return [str, []];
            }
            function emitOp(s, node) {
                switch (s) {
                    case ts.SyntaxKind.BarBarToken:
                        return "or";
                    case ts.SyntaxKind.AmpersandAmpersandToken:
                        return "and";
                    case ts.SyntaxKind.ExclamationToken:
                        return "not";
                    case ts.SyntaxKind.LessThanToken:
                        return "<";
                    case ts.SyntaxKind.LessThanEqualsToken:
                        return "<=";
                    case ts.SyntaxKind.GreaterThanToken:
                        return ">";
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                        return ">=";
                    case ts.SyntaxKind.EqualsEqualsEqualsToken:
                    case ts.SyntaxKind.EqualsEqualsToken:
                        // TODO distinguish === from == ?
                        return "==";
                    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                    case ts.SyntaxKind.ExclamationEqualsToken:
                        // TODO distinguish !== from != ?
                        return "!=";
                    case ts.SyntaxKind.EqualsToken:
                        return "=";
                    case ts.SyntaxKind.PlusToken:
                        return "+";
                    case ts.SyntaxKind.MinusToken:
                        return "-";
                    case ts.SyntaxKind.AsteriskToken:
                        return "*";
                    case ts.SyntaxKind.PlusEqualsToken:
                        return "+=";
                    case ts.SyntaxKind.MinusEqualsToken:
                        return "-=";
                    case ts.SyntaxKind.PercentToken:
                        return "%";
                    case ts.SyntaxKind.SlashToken:
                        return "/";
                    case ts.SyntaxKind.PlusPlusToken:
                    case ts.SyntaxKind.MinusMinusToken:
                        // TODO handle "--" & "++" generally. Seperate prefix and postfix cases.
                        // This is tricky because it needs to return the value and the mutate after.
                        return throwError(node, 3008, "Unsupported ++ and -- in an expression (not a statement or for loop)");
                    case ts.SyntaxKind.AmpersandToken:
                        return "&";
                    case ts.SyntaxKind.CaretToken:
                        return "^";
                    case ts.SyntaxKind.LessThanLessThanToken:
                        return "<<";
                    case ts.SyntaxKind.GreaterThanGreaterThanToken:
                        return ">>";
                    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                        return throwError(node, 3009, "Unsupported operator: >>>");
                    case ts.SyntaxKind.AsteriskAsteriskToken:
                        return "**";
                    default:
                        pxt.tickEvent("depython.todo", { op: s });
                        return "# TODO unknown op: " + s;
                }
            }
            function emitBinExp(s) {
                // handle string concatenation
                // TODO handle implicit type conversions more generally
                var isLStr = isStringType(s.left);
                var isRStr = isStringType(s.right);
                var isStrConcat = s.operatorToken.kind === ts.SyntaxKind.PlusToken
                    && (isLStr || isRStr);
                var wrap = function (s) { return "str(" + s + ")"; };
                var _a = emitExp(s.left), left = _a[0], leftSup = _a[1];
                if (isStrConcat && !isLStr)
                    left = wrap(left);
                var op = emitOp(s.operatorToken.kind, s);
                var _b = emitExp(s.right), right = _b[0], rightSup = _b[1];
                if (isStrConcat && !isRStr)
                    right = wrap(right);
                var sup = leftSup.concat(rightSup);
                return [left + " " + op + " " + right, sup];
            }
            function emitDotExp(s) {
                // short-circuit if the dot expression is a well-known symbol
                var pyName = tryGetPyName(s);
                if (pyName)
                    return asExpRes(pyName);
                var _a = emitExp(s.expression), left = _a[0], leftSup = _a[1];
                var right = getName(s.name);
                // special: foo.length
                if (right === "length") {
                    // TODO confirm the type is correct!
                    return ["len(" + left + ")", leftSup];
                }
                return [left + "." + right, leftSup];
            }
            function getSimpleExpNameParts(s, skipNamespaces) {
                if (skipNamespaces === void 0) { skipNamespaces = false; }
                // TODO(dz): Impl skip namespaces properly. Right now we just skip the left-most part of a property access
                if (ts.isPropertyAccessExpression(s)) {
                    var nmPart = [getName(s.name)];
                    if (skipNamespaces && ts.isIdentifier(s.expression))
                        return nmPart;
                    return getSimpleExpNameParts(s.expression, skipNamespaces).concat(nmPart);
                }
                else if (ts.isIdentifier(s)) {
                    return [getName(s)];
                }
                else
                    return [];
            }
            function getNameHint(param, calleeExp, allParams, allArgs) {
                // get words from the callee
                var calleePart = "";
                if (calleeExp)
                    calleePart = getSimpleExpNameParts(calleeExp, /*skipNamespaces*/ true)
                        .map(pxtc.snakify)
                        .join("_");
                // get words from the previous parameter(s)/arg(s)
                var enumParamParts = [];
                if (allParams && allParams.length > 1 && allArgs && allArgs.length > 1) {
                    // special case: if there are enum parameters, use those as part of the hint
                    for (var i = 0; i < allParams.length && i < allArgs.length; i++) {
                        var arg = allArgs[i];
                        var argType = tc.getTypeAtLocation(arg);
                        if (hasTypeFlag(argType, ts.TypeFlags.EnumLike)) {
                            var argParts = getSimpleExpNameParts(arg, /*skipNamespaces*/ true)
                                .map(pxtc.snakify);
                            enumParamParts = enumParamParts.concat(argParts);
                        }
                    }
                }
                var otherParamsPart = enumParamParts.join("_");
                // get words from this parameter/arg as last resort
                var paramPart = "";
                if (!calleePart && !otherParamsPart)
                    paramPart = getName(param.name);
                // the full hint
                var hint = [calleePart, otherParamsPart, paramPart]
                    .filter(function (s) { return s; })
                    .map(pxtc.snakify)
                    .map(function (s) { return s.toLowerCase(); })
                    .join("_") || "my_callback";
                // sometimes the full hint is too long so shorten them using some heuristics
                // 1. remove duplicate words
                // e.g. controller_any_button_on_event_controller_button_event_pressed_callback
                //   -> controller_any_button_on_event_pressed_callback
                var allWords = hint.split("_");
                if (allWords.length > 4) {
                    allWords = dedupWords(allWords);
                }
                // 2. remove less-informative words
                var lessUsefulWords = pxt.U.toDictionary(["any", "on", "event"], function (s) { return s; });
                while (allWords.length > 2) {
                    var newWords = removeOne(allWords, lessUsefulWords);
                    if (newWords.length == allWords.length)
                        break;
                    allWords = newWords;
                }
                // 3. if there is only one word, add "on_" prefix
                if (allWords.length == 1)
                    allWords = ["on", allWords[0]];
                return allWords.join("_");
                function dedupWords(words) {
                    var usedWords = {};
                    var out = [];
                    for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
                        var w = words_1[_i];
                        if (w in usedWords)
                            continue;
                        usedWords[w] = true;
                        out.push(w);
                    }
                    return out;
                }
                function removeOne(words, exclude) {
                    var out = [];
                    var oneExcluded = false;
                    for (var _i = 0, words_2 = words; _i < words_2.length; _i++) {
                        var w = words_2[_i];
                        if (w in exclude && !oneExcluded) {
                            oneExcluded = true;
                            continue;
                        }
                        out.push(w);
                    }
                    return out;
                }
            }
            function emitArgExp(s, param, calleeExp, allParams, allArgs) {
                // special case: function arguments to higher-order functions
                // reason 1: if the argument is a function and the parameter it is being passed to is also a function type,
                // then we want to pass along the parameter's function parameters to emitFnExp so that the argument will fit the
                // parameter type. This is because TypeScript/Javascript allows passing a function with fewer parameters to an
                // argument that is a function with more parameters while Python does not.
                // Key example: callbacks
                // this code compiles in TS:
                //      function onEvent(callback: (a: number) => void) { ... }
                //      onEvent(function () { ... })
                // yet in python this is not allowed, we have to add more parameters to the anonymous declaration to match like this:
                //      onEvent(function (a: number) { ... })
                // see "callback_num_args.ts" test case for more details.
                // reason 2: we want to generate good names, which requires context about the function it is being passed to an other parameters
                if ((ts.isFunctionExpression(s) || ts.isArrowFunction(s)) && param) {
                    if (param.type && ts.isFunctionTypeNode(param.type)) {
                        // TODO(dz): uncomment to support reason #1 above. I've disabled this for now because it generates uglier
                        // code if we don't have support in py2ts to reverse this
                        // let altParams = param.type.parameters
                        var altParams = null;
                        var fnNameHint = getNameHint(param, calleeExp, allParams, allArgs);
                        return emitFnExp(s, fnNameHint, altParams, true);
                    }
                }
                return emitExp(s);
            }
            function emitCallExp(s) {
                // get callee parameter info
                var calleeType = tc.getTypeAtLocation(s.expression);
                var calleeTypeNode = tc.typeToTypeNode(calleeType);
                var calleeParameters = ts.createNodeArray([]);
                if (ts.isFunctionTypeNode(calleeTypeNode)) {
                    calleeParameters = calleeTypeNode.parameters;
                    if (calleeParameters.length < s.arguments.length) {
                        pxt.tickEvent("depython.todo", { kind: s.kind });
                        return throwError(s, 3010, "TODO: Unsupported call site where caller the arguments outnumber the callee parameters: " + s.getText());
                    }
                }
                // TODO inspect type info to rewrite things like console.log, Math.max, etc.
                var _a = emitExp(s.expression), fn = _a[0], fnSup = _a[1];
                var argExps = s.arguments
                    .map(function (a, i, allArgs) { return emitArgExp(a, calleeParameters[i], s.expression, calleeParameters, allArgs); });
                var sup = argExps
                    .map(function (_a) {
                    var _ = _a[0], aSup = _a[1];
                    return aSup;
                })
                    .reduce(function (p, c) { return p.concat(c); }, fnSup);
                if (fn.indexOf("_py.py_") === 0) {
                    // The format is _py.py_type_name, so remove the type
                    fn = fn.substr(7).split("_").filter(function (_, i) { return i !== 0; }).join("_");
                    var recv = argExps.shift()[0];
                    var args_2 = argExps
                        .map(function (_a) {
                        var a = _a[0], _ = _a[1];
                        return a;
                    })
                        .join(", ");
                    return [recv + "." + fn + "(" + args_2 + ")", sup];
                }
                var args = argExps
                    .map(function (_a) {
                    var a = _a[0], _ = _a[1];
                    return a;
                })
                    .join(", ");
                return [fn + "(" + args + ")", sup];
            }
            function mergeParamDecls(primary, alt) {
                // Note: possible name collisions between primary and alt parameters is handled by marking
                // alt parameters as "unused" so that we can generate them new names without renaming
                var decls = [];
                var paramNames = {};
                for (var i = 0; i < Math.max(primary.length, alt.length); i++) {
                    var p = void 0;
                    if (primary[i]) {
                        p = primary[i];
                        paramNames[getName(p.name)] = true;
                    }
                    else {
                        p = alt[i];
                        var name_4 = getName(p.name);
                        if (paramNames[name_4]) {
                            name_4 = pxtc.decompiler.getNewName(name_4, paramNames);
                            p = Object.assign({ altName: name_4 }, alt[i]);
                        }
                    }
                    decls.push(p);
                }
                return ts.createNodeArray(decls, false);
            }
            function emitFnExp(s, nameHint, altParams, skipType) {
                // if the anonymous function is simple enough, use a lambda
                if (!ts.isBlock(s.body)) {
                    // TODO we're speculatively emitting this expression. This speculation is only safe if emitExp is pure, which it's not quite today (e.g. getNewGlobalName)
                    var _a = emitExp(s.body), fnBody = _a[0], fnSup = _a[1];
                    if (fnSup.length === 0) {
                        var paramDefs = altParams ? mergeParamDecls(s.parameters, altParams) : s.parameters;
                        var paramList = paramDefs
                            .map(function (p) { return emitParamDecl(p, false); })
                            .join(", ");
                        var stmt = paramList.length
                            ? "lambda " + paramList + ": " + fnBody
                            : "lambda: " + fnBody;
                        return asExpRes(stmt);
                    }
                }
                // otherwise emit a standard "def myFunction(...)" declaration
                var fnName = s.name ? getName(s.name) : getNewGlobalName(nameHint || "my_function");
                var fnDef = emitFuncDecl(s, fnName, altParams, skipType);
                return [fnName, fnDef];
            }
            function getUnaryOpSpacing(s) {
                switch (s) {
                    case ts.SyntaxKind.ExclamationToken:// not
                        return " ";
                    case ts.SyntaxKind.PlusToken:
                    case ts.SyntaxKind.MinusToken:
                        return "";
                    default:
                        return " ";
                }
            }
            function emitPreUnaryExp(s) {
                var op = emitOp(s.operator, s);
                var _a = emitExp(s.operand), exp = _a[0], expSup = _a[1];
                // TODO handle order-of-operations ? parenthesis?
                var space = getUnaryOpSpacing(s.operator);
                var res = "" + op + space + exp;
                return [res, expSup];
            }
            function emitPostUnaryExp(s) {
                var op = emitOp(s.operator, s);
                var _a = emitExp(s.operand), exp = _a[0], expSup = _a[1];
                // TODO handle order-of-operations ? parenthesis?
                var space = getUnaryOpSpacing(s.operator);
                var res = "" + exp + space + op;
                return [res, expSup];
            }
            function emitArrayLitExp(s) {
                var els = s.elements
                    .map(emitExp);
                var sup = els
                    .map(function (_a) {
                    var _ = _a[0], sup = _a[1];
                    return sup;
                })
                    .reduce(function (p, c) { return p.concat(c); }, []);
                var inner = els
                    .map(function (_a) {
                    var e = _a[0], _ = _a[1];
                    return e;
                })
                    .join(", ");
                var exp = "[" + inner + "]";
                return [exp, sup];
            }
            function emitElAccessExp(s) {
                var _a = emitExp(s.expression), left = _a[0], leftSup = _a[1];
                var _b = emitExp(s.argumentExpression), arg = _b[0], argSup = _b[1];
                var sup = leftSup.concat(argSup);
                var exp = left + "[" + arg + "]";
                return [exp, sup];
            }
            function emitParenthesisExp(s) {
                var _a = emitExp(s.expression), inner = _a[0], innerSup = _a[1];
                return ["(" + inner + ")", innerSup];
            }
            function emitMultiLnStrLitExp(s) {
                if (ts.isNoSubstitutionTemplateLiteral(s))
                    return asExpRes("\"\"\"" + s.text + "\"\"\"");
                var _a = emitExp(s.tag), tag = _a[0], tagSup = _a[1];
                var _b = emitExp(s.template), temp = _b[0], tempSup = _b[1];
                var sup = tagSup.concat(tempSup);
                var exp = tag + "(" + temp + ")";
                return [exp, sup];
            }
            function emitIdentifierExp(s) {
                // TODO disallow keywords and built-ins?
                // TODO why isn't undefined showing up as a keyword?
                // let id = s.text;
                if (s.text == "undefined")
                    return asExpRes("None");
                var name = getName(s);
                return asExpRes(name);
            }
            function visitExp(s, fn) {
                var visitRecur = function (s) {
                    return visitExp(s, fn);
                };
                if (ts.isBinaryExpression(s)) {
                    return visitRecur(s.left) && visitRecur(s.right);
                }
                else if (ts.isPropertyAccessExpression(s)) {
                    return visitRecur(s.expression);
                }
                else if (ts.isPrefixUnaryExpression(s) || ts.isPostfixUnaryExpression(s)) {
                    return s.operator !== ts.SyntaxKind.PlusPlusToken
                        && s.operator !== ts.SyntaxKind.MinusMinusToken
                        && visitRecur(s.operand);
                }
                else if (ts.isParenthesizedExpression(s)) {
                    return visitRecur(s.expression);
                }
                else if (ts.isArrayLiteralExpression(s)) {
                    return s.elements
                        .map(visitRecur)
                        .reduce(function (p, c) { return p && c; }, true);
                }
                else if (ts.isElementAccessExpression(s)) {
                    return visitRecur(s.expression)
                        && (!s.argumentExpression || visitRecur(s.argumentExpression));
                }
                return fn(s);
            }
            function isConstExp(s) {
                var isConst = function (s) {
                    switch (s.kind) {
                        case ts.SyntaxKind.PropertyAccessExpression:
                        case ts.SyntaxKind.BinaryExpression:
                        case ts.SyntaxKind.ParenthesizedExpression:
                        case ts.SyntaxKind.ArrayLiteralExpression:
                        case ts.SyntaxKind.ElementAccessExpression:
                        case ts.SyntaxKind.TrueKeyword:
                        case ts.SyntaxKind.FalseKeyword:
                        case ts.SyntaxKind.NullKeyword:
                        case ts.SyntaxKind.UndefinedKeyword:
                        case ts.SyntaxKind.NumericLiteral:
                        case ts.SyntaxKind.StringLiteral:
                        case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                            return true;
                        case ts.SyntaxKind.CallExpression:
                        case ts.SyntaxKind.NewExpression:
                        case ts.SyntaxKind.FunctionExpression:
                        case ts.SyntaxKind.ArrowFunction:
                        case ts.SyntaxKind.Identifier:
                        case ts.SyntaxKind.ThisKeyword:
                            return false;
                        case ts.SyntaxKind.PrefixUnaryExpression:
                        case ts.SyntaxKind.PostfixUnaryExpression:
                            var e = s;
                            return e.operator !== ts.SyntaxKind.PlusPlusToken
                                && e.operator !== ts.SyntaxKind.MinusMinusToken;
                    }
                    return false;
                };
                return visitExp(s, isConst);
            }
            function emitCondExp(s) {
                var _a = emitExp(s.condition), cond = _a[0], condSup = _a[1];
                var _b = emitExp(s.whenTrue), tru = _b[0], truSup = _b[1];
                var _c = emitExp(s.whenFalse), fls = _c[0], flsSup = _c[1];
                var sup = condSup.concat(truSup).concat(flsSup);
                var exp = tru + " if " + cond + " else " + fls;
                return [exp, sup];
            }
            function emitExp(s) {
                switch (s.kind) {
                    case ts.SyntaxKind.BinaryExpression:
                        return emitBinExp(s);
                    case ts.SyntaxKind.PropertyAccessExpression:
                        return emitDotExp(s);
                    case ts.SyntaxKind.CallExpression:
                        return emitCallExp(s);
                    case ts.SyntaxKind.NewExpression:
                        return emitCallExp(s);
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.ArrowFunction:
                        return emitFnExp(s);
                    case ts.SyntaxKind.PrefixUnaryExpression:
                        return emitPreUnaryExp(s);
                    case ts.SyntaxKind.PostfixUnaryExpression:
                        return emitPostUnaryExp(s);
                    case ts.SyntaxKind.ParenthesizedExpression:
                        return emitParenthesisExp(s);
                    case ts.SyntaxKind.ArrayLiteralExpression:
                        return emitArrayLitExp(s);
                    case ts.SyntaxKind.ElementAccessExpression:
                        return emitElAccessExp(s);
                    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                    case ts.SyntaxKind.TaggedTemplateExpression:
                        return emitMultiLnStrLitExp(s);
                    case ts.SyntaxKind.TrueKeyword:
                        return asExpRes("True");
                    case ts.SyntaxKind.FalseKeyword:
                        return asExpRes("False");
                    case ts.SyntaxKind.ThisKeyword:
                        return asExpRes("self");
                    case ts.SyntaxKind.NullKeyword:
                    case ts.SyntaxKind.UndefinedKeyword:
                        return asExpRes("None");
                    case ts.SyntaxKind.Identifier:
                        return emitIdentifierExp(s);
                    case ts.SyntaxKind.NumericLiteral:
                    case ts.SyntaxKind.StringLiteral:
                        // TODO handle weird syntax?
                        return asExpRes(s.getText());
                    case ts.SyntaxKind.ConditionalExpression:
                        return emitCondExp(s);
                    default:
                        // TODO handle more expressions
                        return [s.getText(), ["# unknown expression:  " + s.kind]]; // uncomment for easier locating
                }
            }
        }
    })(py = pxt.py || (pxt.py = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var py;
    (function (py) {
        var rx;
        (function (rx) {
            var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
            function isIdentifierStart(code) {
                return ts.pxtc.isIdentifierStart(code, ts.pxtc.ScriptTarget.ES5);
            }
            rx.isIdentifierStart = isIdentifierStart;
            function isIdentifierChar(code) {
                return ts.pxtc.isIdentifierPart(code, ts.pxtc.ScriptTarget.ES5);
            }
            rx.isIdentifierChar = isIdentifierChar;
            function isSpace(ch) {
                if (ch === 32 || // ' '
                    ch === 9 || ch === 11 || ch === 12 || // TODO check this with CPython
                    ch === 160 || // '\xa0'
                    ch >= 0x1680 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
                    return true;
                }
                return false;
            }
            rx.isSpace = isSpace;
            function isNewline(ch) {
                if (ch === 10 || ch === 13)
                    return true;
                // Python ref doesn't really say LINE SEPARATOR and PARAGRAPH SEPARATOR
                // are line seperators, but how else should we treat them?
                if (ch === 0x2028 || ch === 0x2029)
                    return true;
                return false;
            }
            rx.isNewline = isNewline;
        })(rx = py.rx || (py.rx = {}));
    })(py = pxt.py || (pxt.py = {}));
})(pxt || (pxt = {}));
