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
///<reference path='../localtypings/pxtblockly.d.ts'/>
/// <reference path="../built/pxtlib.d.ts" />
var iface;
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_1) {
        function workerOpAsync(op, arg) {
            return pxt.worker.getWorker(pxt.webConfig.workerjs).opAsync(op, arg);
        }
        blocks_1.workerOpAsync = workerOpAsync;
        var placeholders = {};
        var MAX_COMMENT_LINE_LENGTH = 50;
        ///////////////////////////////////////////////////////////////////////////////
        // Miscellaneous utility functions
        ///////////////////////////////////////////////////////////////////////////////
        // Mutate [a1] in place and append to it the elements from [a2].
        function append(a1, a2) {
            a1.push.apply(a1, a2);
        }
        // A few wrappers for basic Block operations that throw errors when compilation
        // is not possible. (The outer code catches these and highlights the relevant
        // block.)
        // Internal error (in our code). Compilation shouldn't proceed.
        function assert(x) {
            if (!x)
                throw new Error("Assertion failure");
        }
        function throwBlockError(msg, block) {
            var e = new Error(msg);
            e.block = block;
            throw e;
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Types
        //
        // We slap a very simple type system on top of Blockly. This is needed to ensure
        // we generate valid TouchDevelop code (otherwise compilation from TD to C++
        // would not work).
        ///////////////////////////////////////////////////////////////////////////////
        // There are several layers of abstraction for the type system.
        // - Block are annotated with a string return type, and a string type for their
        //   input blocks (see blocks-custom.js). We use that as the reference semantics
        //   for the blocks.
        // - In this "type system", we use the enum Type. Using an enum rules out more
        //   mistakes.
        // - When emitting code, we target the "TouchDevelop types".
        //
        // Type inference / checking is done as follows. First, we try to assign a type
        // to all variables. We do this by examining all variable assignments and
        // figuring out the type from the right-hand side. There's a fixpoint computation
        // (see [mkEnv]). Then, we propagate down the expected type when doing code
        // generation; when generating code for a variable dereference, if the expected
        // type doesn't match the inferred type, it's an error. If the type was
        // undetermined as of yet, the type of the variable becomes the expected type.
        var Point = /** @class */ (function () {
            function Point(link, type, parentType, childType) {
                this.link = link;
                this.type = type;
                this.parentType = parentType;
                this.childType = childType;
            }
            return Point;
        }());
        blocks_1.Point = Point;
        function find(p) {
            if (p.link)
                return find(p.link);
            return p;
        }
        function union(p1, p2) {
            var _p1 = find(p1);
            var _p2 = find(p2);
            assert(_p1.link == null && _p2.link == null);
            if (_p1 == _p2)
                return;
            if (_p1.childType && _p2.childType) {
                var ct = _p1.childType;
                _p1.childType = null;
                union(ct, _p2.childType);
            }
            else if (_p1.childType && !_p2.childType) {
                _p2.childType = _p1.childType;
            }
            if (_p1.parentType && _p2.parentType) {
                var pt = _p1.parentType;
                _p1.parentType = null;
                union(pt, _p2.parentType);
            }
            else if (_p1.parentType && !_p2.parentType) {
                _p2.parentType = _p1.parentType;
            }
            var t = unify(_p1.type, _p2.type);
            p1.link = _p2;
            _p1.link = _p2;
            p1.type = null;
            p2.type = t;
        }
        // Ground types.
        function mkPoint(t) {
            return new Point(null, t);
        }
        var pNumber = mkPoint("number");
        var pBoolean = mkPoint("boolean");
        var pString = mkPoint("string");
        var pUnit = mkPoint("void");
        function ground(t) {
            if (!t)
                return mkPoint(t);
            switch (t.toLowerCase()) {
                case "number": return pNumber;
                case "boolean": return pBoolean;
                case "string": return pString;
                case "void": return pUnit;
                default:
                    // Unification variable.
                    return mkPoint(t);
            }
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Type inference
        //
        // Expressions are now directly compiled as a tree. This requires knowing, for
        // each property ref, the right value for its [parent] property.
        ///////////////////////////////////////////////////////////////////////////////
        // Infers the expected type of an expression by looking at the untranslated
        // block and figuring out, from the look of it, what type of expression it
        // holds.
        function returnType(e, b) {
            assert(b != null);
            if (b.type == "placeholder" || b.type === pxtc.TS_OUTPUT_TYPE)
                return find(b.p);
            if (b.type == "variables_get")
                return find(lookup(e, escapeVarName(b.getField("VAR").getText(), e)).type);
            if (!b.outputConnection) {
                return ground(pUnit.type);
            }
            var check = b.outputConnection.check_ && b.outputConnection.check_.length ? b.outputConnection.check_[0] : "T";
            if (check === "Array") {
                if (b.outputConnection.check_.length > 1) {
                    // HACK: The real type is stored as the second check
                    return ground(b.outputConnection.check_[1]);
                }
                // The only block that hits this case should be lists_create_with, so we
                // can safely infer the type from the first input that has a return type
                var tp = void 0;
                if (b.inputList && b.inputList.length) {
                    for (var _i = 0, _a = b.inputList; _i < _a.length; _i++) {
                        var input = _a[_i];
                        if (input.connection && input.connection.targetBlock()) {
                            var t = find(returnType(e, input.connection.targetBlock()));
                            if (t) {
                                if (t.parentType) {
                                    return t.parentType;
                                }
                                tp = ground(t.type + "[]");
                                genericLink(tp, t);
                                break;
                            }
                        }
                    }
                }
                return tp || ground("Array");
            }
            else if (check === "T") {
                var func_1 = e.stdCallTable[b.type];
                var isArrayGet = b.type === "lists_index_get";
                if (isArrayGet || func_1 && func_1.comp.thisParameter) {
                    var parentInput = void 0;
                    if (isArrayGet) {
                        parentInput = b.inputList.filter(function (i) { return i.name === "LIST"; })[0];
                    }
                    else {
                        parentInput = b.inputList.filter(function (i) { return i.name === func_1.comp.thisParameter.definitionName; })[0];
                    }
                    if (parentInput.connection && parentInput.connection.targetBlock()) {
                        var parentType = returnType(e, parentInput.connection.targetBlock());
                        if (parentType.childType) {
                            return parentType.childType;
                        }
                        var p = isArrayType(parentType.type) ? mkPoint(parentType.type.substr(-2)) : mkPoint(null);
                        genericLink(parentType, p);
                        return p;
                    }
                }
                return mkPoint(null);
            }
            return ground(check);
        }
        // Basic type unification routine; easy, because there's no structural types.
        // FIXME: Generics are not supported
        function unify(t1, t2) {
            if (t1 == null || t1 === "Array" && isArrayType(t2))
                return t2;
            else if (t2 == null || t2 === "Array" && isArrayType(t1))
                return t1;
            else if (t1 == t2)
                return t1;
            else
                throw new Error("cannot mix " + t1 + " with " + t2);
        }
        function isArrayType(type) {
            return type && type.indexOf("[]") !== -1;
        }
        function mkPlaceholderBlock(e, parent, type) {
            // XXX define a proper placeholder block type
            return {
                type: "placeholder",
                p: mkPoint(type || null),
                workspace: e.workspace,
                parentBlock_: parent
            };
        }
        function attachPlaceholderIf(e, b, n, type) {
            // Ugly hack to keep track of the type we want there.
            var target = b.getInputTargetBlock(n);
            if (!target) {
                if (!placeholders[b.id]) {
                    placeholders[b.id] = {};
                }
                if (!placeholders[b.id][n]) {
                    placeholders[b.id][n] = mkPlaceholderBlock(e, b, type);
                }
            }
            else if (target.type === pxtc.TS_OUTPUT_TYPE && !(target.p)) {
                target.p = mkPoint(null);
            }
        }
        function getLoopVariableField(b) {
            return (b.type == "pxt_controls_for" || b.type == "pxt_controls_for_of") ?
                getInputTargetBlock(b, "VAR") : b;
        }
        function getInputTargetBlock(b, n) {
            var res = b.getInputTargetBlock(n);
            if (!res) {
                return placeholders[b.id] && placeholders[b.id][n];
            }
            else {
                return res;
            }
        }
        function removeAllPlaceholders() {
            placeholders = {};
        }
        // Unify the *return* type of the parameter [n] of block [b] with point [p].
        function unionParam(e, b, n, p) {
            attachPlaceholderIf(e, b, n);
            try {
                union(returnType(e, getInputTargetBlock(b, n)), p);
            }
            catch (e) {
                // TypeScript should catch this error and bubble it up
            }
        }
        function infer(e, w) {
            if (w)
                w.getAllBlocks().filter(function (b) { return !b.disabled; }).forEach(function (b) {
                    try {
                        switch (b.type) {
                            case "math_op2":
                                unionParam(e, b, "x", ground(pNumber.type));
                                unionParam(e, b, "y", ground(pNumber.type));
                                break;
                            case "math_op3":
                                unionParam(e, b, "x", ground(pNumber.type));
                                break;
                            case "math_arithmetic":
                            case "logic_compare":
                                switch (b.getFieldValue("OP")) {
                                    case "ADD":
                                    case "MINUS":
                                    case "MULTIPLY":
                                    case "DIVIDE":
                                    case "LT":
                                    case "LTE":
                                    case "GT":
                                    case "GTE":
                                    case "POWER":
                                        unionParam(e, b, "A", ground(pNumber.type));
                                        unionParam(e, b, "B", ground(pNumber.type));
                                        break;
                                    case "AND":
                                    case "OR":
                                        attachPlaceholderIf(e, b, "A", pBoolean.type);
                                        attachPlaceholderIf(e, b, "B", pBoolean.type);
                                        break;
                                    case "EQ":
                                    case "NEQ":
                                        attachPlaceholderIf(e, b, "A");
                                        attachPlaceholderIf(e, b, "B");
                                        var p1_1 = returnType(e, getInputTargetBlock(b, "A"));
                                        var p2 = returnType(e, getInputTargetBlock(b, "B"));
                                        try {
                                            union(p1_1, p2);
                                        }
                                        catch (e) {
                                            // TypeScript should catch this error and bubble it up
                                        }
                                        break;
                                }
                                break;
                            case "logic_operation":
                                attachPlaceholderIf(e, b, "A", pBoolean.type);
                                attachPlaceholderIf(e, b, "B", pBoolean.type);
                                break;
                            case "logic_negate":
                                attachPlaceholderIf(e, b, "BOOL", pBoolean.type);
                                break;
                            case "controls_if":
                                for (var i = 0; i <= b.elseifCount_; ++i)
                                    attachPlaceholderIf(e, b, "IF" + i, pBoolean.type);
                                break;
                            case "pxt_controls_for":
                            case "controls_simple_for":
                                unionParam(e, b, "TO", ground(pNumber.type));
                                break;
                            case "pxt_controls_for_of":
                            case "controls_for_of":
                                unionParam(e, b, "LIST", ground("Array"));
                                var listTp = returnType(e, getInputTargetBlock(b, "LIST"));
                                var elementTp = lookup(e, escapeVarName(getLoopVariableField(b).getField("VAR").getText(), e)).type;
                                genericLink(listTp, elementTp);
                                break;
                            case "variables_set":
                            case "variables_change":
                                var x = escapeVarName(b.getField("VAR").getText(), e);
                                var p1 = lookup(e, x).type;
                                attachPlaceholderIf(e, b, "VALUE");
                                var rhs = getInputTargetBlock(b, "VALUE");
                                if (rhs) {
                                    var tr = returnType(e, rhs);
                                    try {
                                        union(p1, tr);
                                    }
                                    catch (e) {
                                        // TypeScript should catch this error and bubble it up
                                    }
                                }
                                break;
                            case "controls_repeat_ext":
                                unionParam(e, b, "TIMES", ground(pNumber.type));
                                break;
                            case "device_while":
                                attachPlaceholderIf(e, b, "COND", pBoolean.type);
                                break;
                            case "lists_index_get":
                                unionParam(e, b, "LIST", ground("Array"));
                                unionParam(e, b, "INDEX", ground(pNumber.type));
                                var listType = returnType(e, getInputTargetBlock(b, "LIST"));
                                var ret = returnType(e, b);
                                genericLink(listType, ret);
                                break;
                            case "lists_index_set":
                                unionParam(e, b, "LIST", ground("Array"));
                                attachPlaceholderIf(e, b, "VALUE");
                                handleGenericType(b, "LIST");
                                unionParam(e, b, "INDEX", ground(pNumber.type));
                                break;
                            case pxtc.PAUSE_UNTIL_TYPE:
                                unionParam(e, b, "PREDICATE", pBoolean);
                                break;
                            default:
                                if (b.type in e.stdCallTable) {
                                    var call_1 = e.stdCallTable[b.type];
                                    if (call_1.attrs.shim === "ENUM_GET")
                                        return;
                                    visibleParams(call_1, countOptionals(b)).forEach(function (p, i) {
                                        var isInstance = call_1.isExtensionMethod && i === 0;
                                        if (p.definitionName && !b.getFieldValue(p.definitionName)) {
                                            var i_1 = b.inputList.filter(function (i) { return i.name == p.definitionName; })[0];
                                            if (i_1.connection && i_1.connection.check_) {
                                                if (isInstance && connectionCheck(i_1) === "Array") {
                                                    var gen = handleGenericType(b, p.definitionName);
                                                    if (gen) {
                                                        return;
                                                    }
                                                }
                                                // All of our injected blocks have single output checks, but the builtin
                                                // blockly ones like string.length and array.length might have multiple
                                                for (var j = 0; j < i_1.connection.check_.length; j++) {
                                                    try {
                                                        var t = i_1.connection.check_[j];
                                                        unionParam(e, b, p.definitionName, ground(t));
                                                        break;
                                                    }
                                                    catch (e) {
                                                        // Ignore type checking errors in the blocks...
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                        }
                    }
                    catch (err) {
                        var be = err.block || b;
                        be.setWarningText(err + "");
                        e.errors.push(be);
                    }
                });
            // Last pass: if some variable has no type (because it was never used or
            // assigned to), just unify it with int...
            e.bindings.forEach(function (b) {
                if (getConcreteType(b.type).type == null)
                    union(b.type, ground(pNumber.type));
            });
            function connectionCheck(i) {
                return i.name ? i.connection && i.connection.check_ && i.connection.check_.length ? i.connection.check_[0] : "T" : undefined;
            }
            function handleGenericType(b, name) {
                var genericArgs = b.inputList.filter(function (input) { return connectionCheck(input) === "T"; });
                if (genericArgs.length) {
                    var gen = getInputTargetBlock(b, genericArgs[0].name);
                    if (gen) {
                        var arg = returnType(e, gen);
                        var arrayType = arg.type ? ground(returnType(e, gen).type + "[]") : ground(null);
                        genericLink(arrayType, arg);
                        unionParam(e, b, name, arrayType);
                        return true;
                    }
                }
                return false;
            }
        }
        function genericLink(parent, child) {
            var p = find(parent);
            var c = find(child);
            if (p.childType) {
                union(p.childType, c);
            }
            else {
                p.childType = c;
            }
            if (c.parentType) {
                union(c.parentType, p);
            }
            else {
                c.parentType = p;
            }
        }
        function getConcreteType(point, found) {
            if (found === void 0) { found = []; }
            var t = find(point);
            if (found.indexOf(t) === -1) {
                found.push(t);
                if (!t.type || t.type === "Array") {
                    if (t.parentType) {
                        var parent_1 = getConcreteType(t.parentType, found);
                        if (parent_1.type && parent_1.type !== "Array") {
                            t.type = parent_1.type.substr(0, parent_1.type.length - 2);
                            return t;
                        }
                    }
                    if (t.childType) {
                        var child = getConcreteType(t.childType, found);
                        if (child.type) {
                            t.type = child.type + "[]";
                            return t;
                        }
                    }
                }
            }
            return t;
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Expressions
        //
        // Expressions are now directly compiled as a tree. This requires knowing, for
        // each property ref, the right value for its [parent] property.
        ///////////////////////////////////////////////////////////////////////////////
        function extractNumber(b) {
            var v = b.getFieldValue(b.type === "math_number_minmax" ? "SLIDER" : "NUM");
            var parsed = parseFloat(v);
            checkNumber(parsed, b);
            return parsed;
        }
        function checkNumber(n, b) {
            if (!isFinite(n) || isNaN(n)) {
                throwBlockError(lf("Number entered is either too large or too small"), b);
            }
        }
        function extractTsExpression(e, b, comments) {
            return blocks_1.mkText(b.getFieldValue("EXPRESSION").trim());
        }
        function compileNumber(e, b, comments) {
            return blocks_1.H.mkNumberLiteral(extractNumber(b));
        }
        var opToTok = {
            // POWER gets a special treatment because there's no operator for it in
            // TouchDevelop
            "ADD": "+",
            "MINUS": "-",
            "MULTIPLY": "*",
            "DIVIDE": "/",
            "LT": "<",
            "LTE": "<=",
            "GT": ">",
            "GTE": ">=",
            "AND": "&&",
            "OR": "||",
            "EQ": "==",
            "NEQ": "!=",
            "POWER": "**"
        };
        function compileArithmetic(e, b, comments) {
            var bOp = b.getFieldValue("OP");
            var left = getInputTargetBlock(b, "A");
            var right = getInputTargetBlock(b, "B");
            var args = [compileExpression(e, left, comments), compileExpression(e, right, comments)];
            var t = returnType(e, left).type;
            if (t == pString.type) {
                if (bOp == "EQ")
                    return blocks_1.H.mkSimpleCall("==", args);
                else if (bOp == "NEQ")
                    return blocks_1.H.mkSimpleCall("!=", args);
            }
            else if (t == pBoolean.type)
                return blocks_1.H.mkSimpleCall(opToTok[bOp], args);
            // Compilation of math operators.
            assert(bOp in opToTok);
            return blocks_1.H.mkSimpleCall(opToTok[bOp], args);
        }
        function compileModulo(e, b, comments) {
            var left = getInputTargetBlock(b, "DIVIDEND");
            var right = getInputTargetBlock(b, "DIVISOR");
            var args = [compileExpression(e, left, comments), compileExpression(e, right, comments)];
            return blocks_1.H.mkSimpleCall("%", args);
        }
        function compileMathOp2(e, b, comments) {
            var op = b.getFieldValue("op");
            var x = compileExpression(e, getInputTargetBlock(b, "x"), comments);
            var y = compileExpression(e, getInputTargetBlock(b, "y"), comments);
            return blocks_1.H.mathCall(op, [x, y]);
        }
        function compileMathOp3(e, b, comments) {
            var x = compileExpression(e, getInputTargetBlock(b, "x"), comments);
            return blocks_1.H.mathCall("abs", [x]);
        }
        function compileText(e, b, comments) {
            return blocks_1.H.mkStringLiteral(b.getFieldValue("TEXT"));
        }
        function compileTextJoin(e, b, comments) {
            var last;
            var i = 0;
            while (true) {
                var val = getInputTargetBlock(b, "ADD" + i);
                i++;
                if (!val) {
                    if (i < b.inputList.length) {
                        continue;
                    }
                    else {
                        break;
                    }
                }
                var compiled = compileExpression(e, val, comments);
                if (!last) {
                    if (val.type.indexOf("text") === 0) {
                        last = compiled;
                    }
                    else {
                        // If we don't start with a string, then the TS won't match
                        // the implied semantics of the blocks
                        last = blocks_1.H.mkSimpleCall("+", [blocks_1.H.mkStringLiteral(""), compiled]);
                    }
                }
                else {
                    last = blocks_1.H.mkSimpleCall("+", [last, compiled]);
                }
            }
            if (!last) {
                return blocks_1.H.mkStringLiteral("");
            }
            return last;
        }
        function compileBoolean(e, b, comments) {
            return blocks_1.H.mkBooleanLiteral(b.getFieldValue("BOOL") == "TRUE");
        }
        function compileNot(e, b, comments) {
            var expr = compileExpression(e, getInputTargetBlock(b, "BOOL"), comments);
            return blocks_1.mkPrefix("!", [blocks_1.H.mkParenthesizedExpression(expr)]);
        }
        function compileCreateList(e, b, comments) {
            // collect argument
            var args = b.inputList.map(function (input) { return input.connection && input.connection.targetBlock() ? compileExpression(e, input.connection.targetBlock(), comments) : undefined; })
                .filter(function (e) { return !!e; });
            return blocks_1.H.mkArrayLiteral(args);
        }
        function compileListGet(e, b, comments) {
            var listBlock = getInputTargetBlock(b, "LIST");
            var listExpr = compileExpression(e, listBlock, comments);
            var index = compileExpression(e, getInputTargetBlock(b, "INDEX"), comments);
            var res = blocks_1.mkGroup([listExpr, blocks_1.mkText("["), index, blocks_1.mkText("]")]);
            return res;
        }
        function compileListSet(e, b, comments) {
            var listBlock = getInputTargetBlock(b, "LIST");
            var listExpr = compileExpression(e, listBlock, comments);
            var index = compileExpression(e, getInputTargetBlock(b, "INDEX"), comments);
            var value = compileExpression(e, getInputTargetBlock(b, "VALUE"), comments);
            var res = blocks_1.mkGroup([listExpr, blocks_1.mkText("["), index, blocks_1.mkText("] = "), value]);
            return listBlock.type === "lists_create_with" ? prefixWithSemicolon(res) : res;
        }
        function compileMathJsOp(e, b, comments) {
            var op = b.getFieldValue("OP");
            var args = [compileExpression(e, getInputTargetBlock(b, "ARG0"), comments)];
            if (b.getInput("ARG1")) {
                args.push(compileExpression(e, getInputTargetBlock(b, "ARG1"), comments));
            }
            return blocks_1.H.mathCall(op, args);
        }
        function compileProcedure(e, b, comments) {
            var name = escapeVarName(b.getFieldValue("NAME"), e, true);
            var stmts = getInputTargetBlock(b, "STACK");
            return [
                blocks_1.mkText("function " + name + "() "),
                compileStatements(e, stmts)
            ];
        }
        function compileProcedureCall(e, b, comments) {
            var name = escapeVarName(b.getFieldValue("NAME"), e, true);
            return blocks_1.mkStmt(blocks_1.mkText(name + "()"));
        }
        function compileWorkspaceComment(c) {
            var content = c.getContent();
            return blocks_1.Helpers.mkMultiComment(content.trim());
        }
        function defaultValueForType(t) {
            if (t.type == null) {
                union(t, ground(pNumber.type));
                t = find(t);
            }
            if (isArrayType(t.type)) {
                return blocks_1.mkText("[]");
            }
            switch (t.type) {
                case "boolean":
                    return blocks_1.H.mkBooleanLiteral(false);
                case "number":
                    return blocks_1.H.mkNumberLiteral(0);
                case "string":
                    return blocks_1.H.mkStringLiteral("");
                default:
                    return blocks_1.mkText("null");
            }
        }
        // [t] is the expected type; we assume that we never null block children
        // (because placeholder blocks have been inserted by the type-checking phase
        // whenever a block was actually missing).
        function compileExpression(e, b, comments) {
            assert(b != null);
            e.stats[b.type] = (e.stats[b.type] || 0) + 1;
            maybeAddComment(b, comments);
            var expr;
            if (b.disabled || b.type == "placeholder") {
                var ret = find(returnType(e, b));
                if (ret.type === "Array") {
                    // FIXME: Can't use default type here because TS complains about
                    // the array having an implicit any type. However, forcing this
                    // to be a number array may cause type issues. Also, potential semicolon
                    // issues if we ever have a block where the array is not the first argument...
                    var isExpression = b.parentBlock_.type === "lists_index_get";
                    if (!isExpression) {
                        var call = e.stdCallTable[b.parentBlock_.type];
                        isExpression = call && call.isExpression;
                    }
                    var arrayNode = blocks_1.mkText("[0]");
                    expr = isExpression ? arrayNode : prefixWithSemicolon(arrayNode);
                }
                else {
                    expr = defaultValueForType(returnType(e, b));
                }
            }
            else
                switch (b.type) {
                    case "math_number":
                    case "math_integer":
                    case "math_whole_number":
                        expr = compileNumber(e, b, comments);
                        break;
                    case "math_number_minmax":
                        expr = compileNumber(e, b, comments);
                        break;
                    case "math_op2":
                        expr = compileMathOp2(e, b, comments);
                        break;
                    case "math_op3":
                        expr = compileMathOp3(e, b, comments);
                        break;
                    case "math_arithmetic":
                    case "logic_compare":
                    case "logic_operation":
                        expr = compileArithmetic(e, b, comments);
                        break;
                    case "math_modulo":
                        expr = compileModulo(e, b, comments);
                        break;
                    case "logic_boolean":
                        expr = compileBoolean(e, b, comments);
                        break;
                    case "logic_negate":
                        expr = compileNot(e, b, comments);
                        break;
                    case "variables_get":
                        expr = compileVariableGet(e, b);
                        break;
                    case "text":
                        expr = compileText(e, b, comments);
                        break;
                    case "text_join":
                        expr = compileTextJoin(e, b, comments);
                        break;
                    case "lists_create_with":
                        expr = compileCreateList(e, b, comments);
                        break;
                    case "lists_index_get":
                        expr = compileListGet(e, b, comments);
                        break;
                    case "lists_index_set":
                        expr = compileListSet(e, b, comments);
                        break;
                    case "math_js_op":
                    case "math_js_round":
                        expr = compileMathJsOp(e, b, comments);
                        break;
                    case pxtc.TS_OUTPUT_TYPE:
                        expr = extractTsExpression(e, b, comments);
                        break;
                    default:
                        var call = e.stdCallTable[b.type];
                        if (call) {
                            if (call.imageLiteral)
                                expr = compileImage(e, b, call.imageLiteral, call.namespace, call.f, visibleParams(call, countOptionals(b)).map(function (ar) { return compileArgument(e, b, ar, comments); }));
                            else
                                expr = compileStdCall(e, b, call, comments);
                        }
                        else {
                            pxt.reportError("blocks", "unable to compile expression", { "details": b.type });
                            expr = defaultValueForType(returnType(e, b));
                        }
                        break;
                }
            expr.id = b.id;
            return expr;
        }
        blocks_1.compileExpression = compileExpression;
        var VarUsage;
        (function (VarUsage) {
            VarUsage[VarUsage["Unknown"] = 0] = "Unknown";
            VarUsage[VarUsage["Read"] = 1] = "Read";
            VarUsage[VarUsage["Assign"] = 2] = "Assign";
        })(VarUsage = blocks_1.VarUsage || (blocks_1.VarUsage = {}));
        function isCompiledAsLocalVariable(b) {
            return b.declaredInLocalScope && !b.mustBeGlobal;
        }
        function extend(e, x, t) {
            assert(lookup(e, x) == null);
            return {
                workspace: e.workspace,
                bindings: [{ name: x, type: ground(t), declaredInLocalScope: 0 }].concat(e.bindings),
                stdCallTable: e.stdCallTable,
                errors: e.errors,
                renames: e.renames,
                stats: e.stats,
                enums: e.enums
            };
        }
        function lookup(e, n) {
            for (var i = 0; i < e.bindings.length; ++i)
                if (e.bindings[i].name == n)
                    return e.bindings[i];
            return null;
        }
        function fresh(e, s) {
            var i = 0;
            var unique = s;
            while (lookup(e, unique) != null)
                unique = s + i++;
            return unique;
        }
        function emptyEnv(w) {
            return {
                workspace: w,
                bindings: [],
                stdCallTable: {},
                errors: [],
                renames: {
                    oldToNew: {},
                    takenNames: {},
                    oldToNewFunctions: {}
                },
                stats: {},
                enums: []
            };
        }
        ;
        ///////////////////////////////////////////////////////////////////////////////
        // Statements
        ///////////////////////////////////////////////////////////////////////////////
        function compileControlsIf(e, b, comments) {
            var stmts = [];
            // Notice the <= (if there's no else-if, we still compile the primary if).
            for (var i = 0; i <= b.elseifCount_; ++i) {
                var cond = compileExpression(e, getInputTargetBlock(b, "IF" + i), comments);
                var thenBranch = compileStatements(e, getInputTargetBlock(b, "DO" + i));
                var startNode = blocks_1.mkText("if (");
                if (i > 0) {
                    startNode = blocks_1.mkText("else if (");
                    startNode.glueToBlock = blocks_1.GlueMode.WithSpace;
                }
                append(stmts, [
                    startNode,
                    cond,
                    blocks_1.mkText(")"),
                    thenBranch
                ]);
            }
            if (b.elseCount_) {
                var elseNode = blocks_1.mkText("else");
                elseNode.glueToBlock = blocks_1.GlueMode.WithSpace;
                append(stmts, [
                    elseNode,
                    compileStatements(e, getInputTargetBlock(b, "ELSE"))
                ]);
            }
            return stmts;
        }
        function compileControlsFor(e, b, comments) {
            var bVar = escapeVarName(getLoopVariableField(b).getField("VAR").getText(), e);
            var bTo = getInputTargetBlock(b, "TO");
            var bDo = getInputTargetBlock(b, "DO");
            var bBy = getInputTargetBlock(b, "BY");
            var bFrom = getInputTargetBlock(b, "FROM");
            var incOne = !bBy || (bBy.type.match(/^math_number/) && extractNumber(bBy) == 1);
            var binding = lookup(e, bVar);
            assert(binding.declaredInLocalScope > 0);
            return [
                blocks_1.mkText("for (let " + bVar + " = "),
                bFrom ? compileExpression(e, bFrom, comments) : blocks_1.mkText("0"),
                blocks_1.mkText("; "),
                blocks_1.mkInfix(blocks_1.mkText(bVar), "<=", compileExpression(e, bTo, comments)),
                blocks_1.mkText("; "),
                incOne ? blocks_1.mkText(bVar + "++") : blocks_1.mkInfix(blocks_1.mkText(bVar), "+=", compileExpression(e, bBy, comments)),
                blocks_1.mkText(")"),
                compileStatements(e, bDo)
            ];
        }
        function compileControlsRepeat(e, b, comments) {
            var bound = compileExpression(e, getInputTargetBlock(b, "TIMES"), comments);
            var body = compileStatements(e, getInputTargetBlock(b, "DO"));
            var valid = function (x) { return !lookup(e, x); };
            var name = "i";
            for (var i = 0; !valid(name); i++)
                name = "i" + i;
            return [
                blocks_1.mkText("for (let " + name + " = 0; "),
                blocks_1.mkInfix(blocks_1.mkText(name), "<", bound),
                blocks_1.mkText("; " + name + "++)"),
                body
            ];
        }
        function compileWhile(e, b, comments) {
            var cond = compileExpression(e, getInputTargetBlock(b, "COND"), comments);
            var body = compileStatements(e, getInputTargetBlock(b, "DO"));
            return [
                blocks_1.mkText("while ("),
                cond,
                blocks_1.mkText(")"),
                body
            ];
        }
        function compileControlsForOf(e, b, comments) {
            var bVar = escapeVarName(getLoopVariableField(b).getField("VAR").getText(), e);
            var bOf = getInputTargetBlock(b, "LIST");
            var bDo = getInputTargetBlock(b, "DO");
            var binding = lookup(e, bVar);
            assert(binding.declaredInLocalScope > 0);
            return [
                blocks_1.mkText("for (let " + bVar + " of "),
                compileExpression(e, bOf, comments),
                blocks_1.mkText(")"),
                compileStatements(e, bDo)
            ];
        }
        function compileForever(e, b) {
            var bBody = getInputTargetBlock(b, "HANDLER");
            var body = compileStatements(e, bBody);
            return mkCallWithCallback(e, "basic", "forever", [], body);
        }
        // convert to javascript friendly name
        function escapeVarName(name, e, isFunction) {
            if (isFunction === void 0) { isFunction = false; }
            if (!name)
                return '_';
            if (isFunction) {
                if (e.renames.oldToNewFunctions[name]) {
                    return e.renames.oldToNewFunctions[name];
                }
            }
            else if (e.renames.oldToNew[name]) {
                return e.renames.oldToNew[name];
            }
            var n = ts.pxtc.escapeIdentifier(name);
            if (e.renames.takenNames[n]) {
                var i = 2;
                while (e.renames.takenNames[n + i]) {
                    i++;
                }
                n += i;
            }
            if (isFunction) {
                e.renames.oldToNewFunctions[name] = n;
            }
            else {
                e.renames.oldToNew[name] = n;
            }
            e.renames.takenNames[n] = true;
            return n;
        }
        blocks_1.escapeVarName = escapeVarName;
        function compileVariableGet(e, b) {
            var name = escapeVarName(b.getField("VAR").getText(), e);
            var binding = lookup(e, name);
            if (!binding.assigned)
                binding.assigned = VarUsage.Read;
            assert(binding != null && binding.type != null);
            return blocks_1.mkText(name);
        }
        function compileSet(e, b, comments) {
            var bVar = escapeVarName(b.getField("VAR").getText(), e);
            var bExpr = getInputTargetBlock(b, "VALUE");
            var binding = lookup(e, bVar);
            var isDef = false;
            if (!binding.assigned)
                if (b.getSurroundParent()) {
                    // need to define this variable in the top-scope
                    binding.assigned = VarUsage.Read;
                }
                else {
                    binding.assigned = VarUsage.Assign;
                    isDef = true;
                }
            var expr = compileExpression(e, bExpr, comments);
            return blocks_1.mkStmt(blocks_1.mkText(isDef ? "let " : ""), blocks_1.mkText(bVar + " = "), expr);
        }
        function compileChange(e, b, comments) {
            var bVar = escapeVarName(b.getField("VAR").getText(), e);
            var bExpr = getInputTargetBlock(b, "VALUE");
            var binding = lookup(e, bVar);
            if (!binding.assigned)
                binding.assigned = VarUsage.Read;
            var expr = compileExpression(e, bExpr, comments);
            var ref = blocks_1.mkText(bVar);
            return blocks_1.mkStmt(blocks_1.mkInfix(ref, "+=", expr));
        }
        function eventArgs(call, b) {
            return visibleParams(call, countOptionals(b)).map(function (ar) { return ar.definitionName; }).filter(function (ar) { return !!ar; });
        }
        function compileCall(e, b, comments) {
            var call = e.stdCallTable[b.type];
            if (call.imageLiteral)
                return blocks_1.mkStmt(compileImage(e, b, call.imageLiteral, call.namespace, call.f, visibleParams(call, countOptionals(b)).map(function (ar) { return compileArgument(e, b, ar, comments); })));
            else if (call.hasHandler)
                return compileEvent(e, b, call, eventArgs(call, b), call.namespace, comments);
            else
                return blocks_1.mkStmt(compileStdCall(e, b, call, comments));
        }
        function compileArgument(e, b, p, comments, beginningOfStatement) {
            if (beginningOfStatement === void 0) { beginningOfStatement = false; }
            var f = b.getFieldValue(p.definitionName);
            if (f != null) {
                if (b.getField(p.definitionName) instanceof pxtblockly.FieldTextInput) {
                    return blocks_1.H.mkStringLiteral(f);
                }
                return blocks_1.mkText(f);
            }
            else {
                attachPlaceholderIf(e, b, p.definitionName);
                var target = getInputTargetBlock(b, p.definitionName);
                if (beginningOfStatement && target.type === "lists_create_with") {
                    // We have to be careful of array literals at the beginning of a statement
                    // because they can cause errors (i.e. they get parsed as an index). Add a
                    // semicolon to the previous statement just in case.
                    // FIXME: No need to do this if the previous statement was a code block
                    return prefixWithSemicolon(compileExpression(e, target, comments));
                }
                if (p.shadowOptions && p.shadowOptions.toString && returnType(e, target) !== pString) {
                    return blocks_1.H.mkSimpleCall("+", [blocks_1.H.mkStringLiteral(""), compileExpression(e, target, comments)]);
                }
                return compileExpression(e, target, comments);
            }
        }
        function compileStdCall(e, b, func, comments) {
            var args;
            if (isMutatingBlock(b) && b.mutation.getMutationType() === blocks_1.MutatorTypes.RestParameterMutator) {
                args = b.mutation.compileMutation(e, comments).children;
            }
            else if (func.attrs.shim === "ENUM_GET") {
                var enumName = func.attrs.enumName;
                var enumMember = b.getFieldValue("MEMBER").replace(/^\d+/, "");
                return blocks_1.H.mkPropertyAccess(enumMember, blocks_1.mkText(enumName));
            }
            else {
                args = visibleParams(func, countOptionals(b)).map(function (p, i) { return compileArgument(e, b, p, comments, func.isExtensionMethod && i === 0 && !func.isExpression); });
            }
            var externalInputs = !b.getInputsInline();
            if (func.isIdentity)
                return args[0];
            else if (func.property) {
                return blocks_1.H.mkPropertyAccess(func.f, args[0]);
            }
            else if (func.f == "@get@") {
                return blocks_1.H.mkPropertyAccess(args[1].op.replace(/.*\./, ""), args[0]);
            }
            else if (func.f == "@set@") {
                return blocks_1.H.mkAssign(blocks_1.H.mkPropertyAccess(args[1].op.replace(/.*\./, "").replace(/@set/, ""), args[0]), args[2]);
            }
            else if (func.f == "@change@") {
                return blocks_1.H.mkSimpleCall("+=", [blocks_1.H.mkPropertyAccess(args[1].op.replace(/.*\./, "").replace(/@set/, ""), args[0]), args[2]]);
            }
            else if (func.isExtensionMethod) {
                if (func.attrs.defaultInstance) {
                    var instance = void 0;
                    if (isMutatingBlock(b) && b.mutation.getMutationType() === blocks_1.MutatorTypes.DefaultInstanceMutator) {
                        instance = b.mutation.compileMutation(e, comments);
                    }
                    if (instance) {
                        args.unshift(instance);
                    }
                    else {
                        args.unshift(blocks_1.mkText(func.attrs.defaultInstance));
                    }
                }
                return blocks_1.H.extensionCall(func.f, args, externalInputs);
            }
            else if (func.namespace) {
                return blocks_1.H.namespaceCall(func.namespace, func.f, args, externalInputs);
            }
            else {
                return blocks_1.H.stdCall(func.f, args, externalInputs);
            }
        }
        function compileStdBlock(e, b, f, comments) {
            return blocks_1.mkStmt(compileStdCall(e, b, f, comments));
        }
        function mkCallWithCallback(e, n, f, args, body, argumentDeclaration, isExtension) {
            if (isExtension === void 0) { isExtension = false; }
            body.noFinalNewline = true;
            var callback;
            if (argumentDeclaration) {
                callback = blocks_1.mkGroup([argumentDeclaration, body]);
            }
            else {
                callback = blocks_1.mkGroup([blocks_1.mkText("function ()"), body]);
            }
            if (isExtension)
                return blocks_1.mkStmt(blocks_1.H.extensionCall(f, args.concat([callback]), false));
            else if (n)
                return blocks_1.mkStmt(blocks_1.H.namespaceCall(n, f, args.concat([callback]), false));
            else
                return blocks_1.mkStmt(blocks_1.H.mkCall(f, args.concat([callback]), false));
        }
        function compileArg(e, b, arg, comments) {
            // b.getFieldValue may be string, numbers
            var argb = getInputTargetBlock(b, arg);
            if (argb)
                return compileExpression(e, argb, comments);
            if (b.getField(arg) instanceof pxtblockly.FieldTextInput)
                return blocks_1.H.mkStringLiteral(b.getFieldValue(arg));
            return blocks_1.mkText(b.getFieldValue(arg));
        }
        function compileStartEvent(e, b) {
            var bBody = getInputTargetBlock(b, "HANDLER");
            var body = compileStatements(e, bBody);
            if (pxt.appTarget.compile && pxt.appTarget.compile.onStartText && body && body.children) {
                body.children.unshift(blocks_1.mkStmt(blocks_1.mkText("// " + pxtc.ON_START_COMMENT + "\n")));
            }
            return body;
        }
        function compileEvent(e, b, stdfun, args, ns, comments) {
            var compiledArgs = args.map(function (arg) { return compileArg(e, b, arg, comments); });
            var bBody = getInputTargetBlock(b, "HANDLER");
            var body = compileStatements(e, bBody);
            if (pxt.appTarget.compile && pxt.appTarget.compile.emptyEventHandlerComments && body.children.length === 0) {
                body.children.unshift(blocks_1.mkStmt(blocks_1.mkText("// " + pxtc.HANDLER_COMMENT)));
            }
            var argumentDeclaration;
            if (isMutatingBlock(b) && b.mutation.getMutationType() === blocks_1.MutatorTypes.ObjectDestructuringMutator) {
                argumentDeclaration = b.mutation.compileMutation(e, comments);
            }
            else if (stdfun.comp.handlerArgs.length) {
                var handlerArgs = getEscapedCBParameters(b, stdfun, e);
                argumentDeclaration = blocks_1.mkText("function (" + handlerArgs.join(", ") + ")");
            }
            return mkCallWithCallback(e, ns, stdfun.f, compiledArgs, body, argumentDeclaration, stdfun.isExtensionMethod);
        }
        function isMutatingBlock(b) {
            return !!b.mutation;
        }
        function compileImage(e, b, frames, n, f, args) {
            args = args === undefined ? [] : args;
            var state = "\n";
            var rows = 5;
            var columns = frames * 5;
            var leds = b.getFieldValue("LEDS");
            leds = leds.replace(/[ `\n]+/g, '');
            for (var i = 0; i < rows; ++i) {
                for (var j = 0; j < columns; ++j) {
                    if (j > 0)
                        state += ' ';
                    state += (leds[(i * columns) + j] === '#') ? "#" : ".";
                }
                state += '\n';
            }
            var lit = blocks_1.H.mkStringLiteral(state);
            lit.canIndentInside = true;
            return blocks_1.H.namespaceCall(n, f, [lit].concat(args), false);
        }
        function compileStatementBlock(e, b) {
            var r;
            var comments = [];
            e.stats[b.type] = (e.stats[b.type] || 0) + 1;
            maybeAddComment(b, comments);
            switch (b.type) {
                case 'controls_if':
                    r = compileControlsIf(e, b, comments);
                    break;
                case 'pxt_controls_for':
                case 'controls_for':
                case 'controls_simple_for':
                    r = compileControlsFor(e, b, comments);
                    break;
                case 'pxt_controls_for_of':
                case 'controls_for_of':
                    r = compileControlsForOf(e, b, comments);
                    break;
                case 'variables_set':
                    r = [compileSet(e, b, comments)];
                    break;
                case 'variables_change':
                    r = [compileChange(e, b, comments)];
                    break;
                case 'controls_repeat_ext':
                    r = compileControlsRepeat(e, b, comments);
                    break;
                case 'device_while':
                    r = compileWhile(e, b, comments);
                    break;
                case 'procedures_defnoreturn':
                    r = compileProcedure(e, b, comments);
                    break;
                case 'procedures_callnoreturn':
                    r = [compileProcedureCall(e, b, comments)];
                    break;
                case ts.pxtc.ON_START_TYPE:
                    r = compileStartEvent(e, b).children;
                    break;
                case pxtc.TS_STATEMENT_TYPE:
                    r = compileTypescriptBlock(e, b);
                    break;
                case pxtc.PAUSE_UNTIL_TYPE:
                    r = compilePauseUntilBlock(e, b, comments);
                    break;
                case pxtc.TS_DEBUGGER_TYPE:
                    r = compileDebuggeStatementBlock(e, b);
                    break;
                default:
                    var call = e.stdCallTable[b.type];
                    if (call)
                        r = [compileCall(e, b, comments)];
                    else
                        r = [blocks_1.mkStmt(compileExpression(e, b, comments))];
                    break;
            }
            var l = r[r.length - 1];
            if (l)
                l.id = b.id;
            if (comments.length) {
                addCommentNodes(comments, r);
            }
            r.forEach(function (l) {
                if (l.type === blocks_1.NT.Block || l.type === blocks_1.NT.Prefix && pxt.Util.startsWith(l.op, "//")) {
                    l.id = b.id;
                }
            });
            return r;
        }
        function compileStatements(e, b) {
            var stmts = [];
            while (b) {
                if (!b.disabled)
                    append(stmts, compileStatementBlock(e, b));
                b = b.getNextBlock();
            }
            return blocks_1.mkBlock(stmts);
        }
        function compileTypescriptBlock(e, b) {
            var res = [];
            var i = 0;
            while (true) {
                var value = b.getFieldValue("LINE" + i);
                i++;
                if (value !== null) {
                    res.push(blocks_1.mkText(value + "\n"));
                    var declaredVars = b.declaredVariables;
                    if (declaredVars) {
                        var varNames = declaredVars.split(",");
                        varNames.forEach(function (n) {
                            var existing = lookup(e, n);
                            if (existing) {
                                existing.assigned = VarUsage.Assign;
                                existing.mustBeGlobal = false;
                            }
                            else {
                                e.bindings.push({
                                    name: n,
                                    type: mkPoint(null),
                                    assigned: VarUsage.Assign,
                                    declaredInLocalScope: 1,
                                    mustBeGlobal: false
                                });
                            }
                        });
                    }
                }
                else {
                    break;
                }
            }
            return res;
        }
        function compileDebuggeStatementBlock(e, b) {
            if (b.getFieldValue("ON_OFF") == "1") {
                return [
                    blocks_1.mkText("debugger;\n")
                ];
            }
            return [];
        }
        function prefixWithSemicolon(n) {
            var emptyStatement = blocks_1.mkStmt(blocks_1.mkText(";"));
            emptyStatement.glueToBlock = blocks_1.GlueMode.NoSpace;
            return blocks_1.mkGroup([emptyStatement, n]);
        }
        function compilePauseUntilBlock(e, b, comments) {
            var options = pxt.appTarget.runtime && pxt.appTarget.runtime.pauseUntilBlock;
            pxt.Util.assert(!!options, "target has block enabled");
            var ns = options.namespace;
            var name = options.callName || "pauseUntil";
            var arg = compileArg(e, b, "PREDICATE", comments);
            var lambda = [blocks_1.mkGroup([blocks_1.mkText("() => "), arg])];
            if (ns) {
                return [blocks_1.mkStmt(blocks_1.H.namespaceCall(ns, name, lambda, false))];
            }
            else {
                return [blocks_1.mkStmt(blocks_1.H.mkCall(name, lambda, false, false))];
            }
        }
        // This function creates an empty environment where type inference has NOT yet
        // been performed.
        // - All variables have been assigned an initial [Point] in the union-find.
        // - Variables have been marked to indicate if they are compatible with the
        //   TouchDevelop for-loop model.
        function mkEnv(w, blockInfo, skipVariables) {
            // The to-be-returned environment.
            var e = emptyEnv(w);
            // append functions in stdcalltable
            if (blockInfo) {
                // Enums are not enclosed in namespaces, so add them to the taken names
                // to avoid collision
                Object.keys(blockInfo.apis.byQName).forEach(function (name) {
                    var info = blockInfo.apis.byQName[name];
                    if (info.kind === pxtc.SymbolKind.Enum) {
                        e.renames.takenNames[info.qName] = true;
                    }
                });
                if (blockInfo.enumsByName) {
                    Object.keys(blockInfo.enumsByName).forEach(function (k) { return e.enums.push(blockInfo.enumsByName[k]); });
                }
                blockInfo.blocks
                    .forEach(function (fn) {
                    if (e.stdCallTable[fn.attributes.blockId]) {
                        pxt.reportError("blocks", "function already defined", { "details": fn.attributes.blockId });
                        return;
                    }
                    e.renames.takenNames[fn.namespace] = true;
                    var comp = pxt.blocks.compileInfo(fn);
                    var instance = !!comp.thisParameter;
                    e.stdCallTable[fn.attributes.blockId] = {
                        namespace: fn.namespace,
                        f: fn.name,
                        comp: comp,
                        attrs: fn.attributes,
                        isExtensionMethod: instance,
                        isExpression: fn.retType && fn.retType !== "void",
                        imageLiteral: fn.attributes.imageLiteral,
                        hasHandler: !!comp.handlerArgs.length || fn.parameters && fn.parameters.some(function (p) { return (p.type == "() => void" || p.type == "Action" || !!p.properties); }),
                        property: !fn.parameters,
                        isIdentity: fn.attributes.shim == "TD_ID"
                    };
                });
            }
            if (skipVariables)
                return e;
            var loopBlocks = ["controls_for", "controls_simple_for", "controls_for_of", "pxt_controls_for", "pxt_controls_for_of"];
            var variableIsScoped = function (b, name) {
                if (!b)
                    return false;
                else if (loopBlocks.filter(function (l) { return l == b.type; }).length > 0
                    && escapeVarName(getLoopVariableField(b).getField("VAR").getText(), e) == name)
                    return true;
                else if (isMutatingBlock(b) && b.mutation.isDeclaredByMutation(name))
                    return true;
                var stdFunc = e.stdCallTable[b.type];
                if (stdFunc && stdFunc.comp.handlerArgs.length) {
                    var foundIt_1 = false;
                    var names = getEscapedCBParameters(b, stdFunc, e);
                    names.forEach(function (varName) {
                        if (foundIt_1)
                            return;
                        if (varName === name) {
                            foundIt_1 = true;
                        }
                    });
                    if (foundIt_1) {
                        return true;
                    }
                }
                return variableIsScoped(b.getSurroundParent(), name);
            };
            function trackLocalDeclaration(name, type) {
                // It's ok for two loops to share the same variable.
                if (lookup(e, name) == null)
                    e = extend(e, name, type);
                lookup(e, name).declaredInLocalScope++;
                // If multiple loops share the same
                // variable, that means there's potential race conditions in concurrent
                // code, so faithfully compile this as a global variable.
                if (lookup(e, name).declaredInLocalScope > 1)
                    lookup(e, name).mustBeGlobal = true;
            }
            // collect local variables.
            if (w)
                w.getAllBlocks().filter(function (b) { return !b.disabled; }).forEach(function (b) {
                    if (loopBlocks.filter(function (l) { return l == b.type; }).length > 0) {
                        var x = escapeVarName(getLoopVariableField(b).getField("VAR").getText(), e);
                        if (b.type == "controls_for_of") {
                            trackLocalDeclaration(x, null);
                        }
                        else {
                            trackLocalDeclaration(x, pNumber.type);
                        }
                    }
                    else if (isMutatingBlock(b)) {
                        var declarations_1 = b.mutation.getDeclaredVariables();
                        if (declarations_1) {
                            Object.keys(declarations_1).forEach(function (varName) {
                                trackLocalDeclaration(escapeVarName(varName, e), declarations_1[varName]);
                            });
                        }
                    }
                    var stdFunc = e.stdCallTable[b.type];
                    if (stdFunc && stdFunc.comp.handlerArgs.length) {
                        var names = getEscapedCBParameters(b, stdFunc, e);
                        names.forEach(function (varName, index) {
                            if (varName != null) {
                                trackLocalDeclaration(escapeVarName(varName, e), stdFunc.comp.handlerArgs[index].type);
                            }
                        });
                    }
                });
            // determine for-loop compatibility: for each get or
            // set block, 1) make sure that the variable is bound, then 2) mark the variable if needed.
            if (w)
                w.getAllBlocks().filter(function (b) { return !b.disabled; }).forEach(function (b) {
                    if (b.type == "variables_get" || b.type == "variables_set" || b.type == "variables_change") {
                        var x = escapeVarName(b.getField("VAR").getText(), e);
                        if (lookup(e, x) == null)
                            e = extend(e, x, null);
                        var binding = lookup(e, x);
                        if (binding.declaredInLocalScope && !variableIsScoped(b, x))
                            // loop index is read outside the loop.
                            binding.mustBeGlobal = true;
                    }
                });
            return e;
        }
        blocks_1.mkEnv = mkEnv;
        function compileBlockAsync(b, blockInfo) {
            var w = b.workspace;
            var e = mkEnv(w, blockInfo);
            infer(e, w);
            var compiled = compileStatementBlock(e, b);
            removeAllPlaceholders();
            return tdASTtoTS(e, compiled);
        }
        blocks_1.compileBlockAsync = compileBlockAsync;
        function eventWeight(b, e) {
            if (b.type === ts.pxtc.ON_START_TYPE) {
                return 0;
            }
            var api = e.stdCallTable[b.type];
            if (api && api.attrs.afterOnStart) {
                return 1;
            }
            else {
                return -1;
            }
        }
        function compileWorkspace(e, w, blockInfo) {
            try {
                infer(e, w);
                var stmtsMain_1 = [];
                // all compiled top level blocks are events
                var topblocks = w.getTopBlocks(true).sort(function (a, b) {
                    return eventWeight(a, e) - eventWeight(b, e);
                });
                updateDisabledBlocks(e, w.getAllBlocks(), topblocks);
                // compile workspace comments, add them to the top
                var topComments = w.getTopComments(true);
                var commentMap_1 = groupWorkspaceComments(topblocks, topComments);
                commentMap_1.orphans.forEach(function (comment) { return append(stmtsMain_1, compileWorkspaceComment(comment).children); });
                topblocks.forEach(function (b) {
                    if (commentMap_1.idToComments[b.id]) {
                        commentMap_1.idToComments[b.id].forEach(function (comment) {
                            append(stmtsMain_1, compileWorkspaceComment(comment).children);
                        });
                    }
                    if (b.type == ts.pxtc.ON_START_TYPE)
                        append(stmtsMain_1, compileStartEvent(e, b).children);
                    else {
                        var compiled = compileStatements(e, b);
                        if (compiled.type == blocks_1.NT.Block)
                            append(stmtsMain_1, compiled.children);
                        else
                            stmtsMain_1.push(compiled);
                    }
                });
                var stmtsEnums_1 = [];
                e.enums.forEach(function (info) {
                    var models = w.getVariablesOfType(info.name);
                    if (models && models.length) {
                        var members = models.map(function (m) {
                            var match = /^(\d+)([^0-9].*)$/.exec(m.name);
                            if (match) {
                                return [match[2], parseInt(match[1])];
                            }
                            else {
                                // Someone has been messing with the XML...
                                return [m.name, -1];
                            }
                        });
                        members.sort(function (a, b) { return a[1] - b[1]; });
                        var nodes_1 = [];
                        var lastValue_1 = -1;
                        members.forEach(function (_a, index) {
                            var name = _a[0], value = _a[1];
                            var newNode;
                            if (info.isBitMask) {
                                var shift = Math.log2(value);
                                if (shift >= 0 && Math.floor(shift) === shift) {
                                    newNode = blocks_1.H.mkAssign(blocks_1.mkText(name), blocks_1.H.mkSimpleCall("<<", [blocks_1.H.mkNumberLiteral(1), blocks_1.H.mkNumberLiteral(shift)]));
                                }
                            }
                            if (!newNode) {
                                if (value === lastValue_1 + 1) {
                                    newNode = blocks_1.mkText(name);
                                }
                                else {
                                    newNode = blocks_1.H.mkAssign(blocks_1.mkText(name), blocks_1.H.mkNumberLiteral(value));
                                }
                            }
                            nodes_1.push(newNode);
                            lastValue_1 = value;
                        });
                        var declarations = blocks_1.mkCommaSep(nodes_1, true);
                        declarations.glueToBlock = blocks_1.GlueMode.NoSpace;
                        stmtsEnums_1.push(blocks_1.mkGroup([
                            blocks_1.mkText("enum " + info.name),
                            blocks_1.mkBlock([declarations])
                        ]));
                    }
                });
                // All variables in this script are compiled as locals within main unless loop or previsouly assigned
                var stmtsVariables = e.bindings.filter(function (b) { return !isCompiledAsLocalVariable(b) && b.assigned != VarUsage.Assign; })
                    .map(function (b) {
                    var t = getConcreteType(b.type);
                    var defl;
                    if (t.type === "Array") {
                        defl = blocks_1.mkText("[]");
                    }
                    else {
                        defl = defaultValueForType(t);
                    }
                    var tp = "";
                    if (defl.op == "null" || defl.op == "[]") {
                        var tpname = t.type;
                        // If the type is "Array" or null[] it means that we failed to narrow the type of array.
                        // Best we can do is just default to number[]
                        if (tpname === "Array" || tpname === "null[]") {
                            tpname = "number[]";
                        }
                        var tpinfo = blockInfo.apis.byQName[tpname];
                        if (tpinfo && tpinfo.attributes.autoCreate)
                            defl = blocks_1.mkText(tpinfo.attributes.autoCreate + "()");
                        else
                            tp = ": " + tpname;
                    }
                    return blocks_1.mkStmt(blocks_1.mkText("let " + b.name + tp + " = "), defl);
                });
                return stmtsEnums_1.concat(stmtsVariables.concat(stmtsMain_1));
            }
            catch (err) {
                var be = err.block;
                if (be) {
                    be.setWarningText(err + "");
                    e.errors.push(be);
                }
                else {
                    throw err;
                }
            }
            finally {
                removeAllPlaceholders();
            }
            return []; // unreachable
        }
        function callKey(e, b) {
            if (b.type == ts.pxtc.ON_START_TYPE)
                return JSON.stringify({ name: ts.pxtc.ON_START_TYPE });
            var call = e.stdCallTable[b.type];
            if (call) {
                // detect if same event is registered already
                var compiledArgs = eventArgs(call, b).map(function (arg) { return compileArg(e, b, arg, []); });
                var key = JSON.stringify({ name: call.f, ns: call.namespace, compiledArgs: compiledArgs })
                    .replace(/"id"\s*:\s*"[^"]+"/g, ''); // remove blockly ids
                return key;
            }
            return undefined;
        }
        blocks_1.callKey = callKey;
        function updateDisabledBlocks(e, allBlocks, topBlocks) {
            // unset disabled
            allBlocks.forEach(function (b) { return b.setDisabled(false); });
            // update top blocks
            var events = {};
            function flagDuplicate(key, block) {
                var otherEvent = events[key];
                if (otherEvent) {
                    // another block is already registered
                    block.setDisabled(true);
                }
                else {
                    block.setDisabled(false);
                    events[key] = block;
                }
            }
            topBlocks.forEach(function (b) {
                var call = e.stdCallTable[b.type];
                // multiple calls allowed
                if (b.type == ts.pxtc.ON_START_TYPE)
                    flagDuplicate(ts.pxtc.ON_START_TYPE, b);
                else if (b.type === "procedures_defnoreturn" || call && call.attrs.blockAllowMultiple && !call.attrs.handlerStatement)
                    return;
                else if (call && call.hasHandler && !call.attrs.handlerStatement) {
                    // compute key that identifies event call
                    // detect if same event is registered already
                    var key = call.attrs.blockHandlerKey || callKey(e, b);
                    flagDuplicate(key, b);
                }
                else {
                    // all non-events are disabled
                    var t = b;
                    while (t) {
                        t.setDisabled(true);
                        t = t.getNextBlock();
                    }
                }
            });
        }
        function findBlockId(sourceMap, loc) {
            if (!loc)
                return undefined;
            var bestChunk;
            var bestChunkLength;
            for (var i = 0; i < sourceMap.length; ++i) {
                var chunk = sourceMap[i];
                if (chunk.start <= loc.start && chunk.end > loc.start + loc.length && (!bestChunk || bestChunkLength > chunk.end - chunk.start)) {
                    bestChunk = chunk;
                    bestChunkLength = chunk.end - chunk.start;
                }
            }
            if (bestChunk) {
                return bestChunk.id;
            }
            return undefined;
        }
        blocks_1.findBlockId = findBlockId;
        function compileAsync(b, blockInfo) {
            var e = mkEnv(b, blockInfo);
            var nodes = compileWorkspace(e, b, blockInfo);
            var result = tdASTtoTS(e, nodes);
            return result;
        }
        blocks_1.compileAsync = compileAsync;
        function tdASTtoTS(env, app) {
            var res = blocks_1.flattenNode(app);
            // Note: the result of format is not used!
            return workerOpAsync("format", { format: { input: res.output, pos: 1 } }).then(function () {
                return {
                    source: res.output,
                    sourceMap: res.sourceMap,
                    stats: env.stats
                };
            });
        }
        function maybeAddComment(b, comments) {
            if (b.comment) {
                if ((typeof b.comment) === "string") {
                    comments.push(b.comment);
                }
                else {
                    comments.push(b.comment.getText());
                }
            }
        }
        function addCommentNodes(comments, r) {
            var commentNodes = [];
            var paragraphs = [];
            for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
                var comment = comments_1[_i];
                for (var _a = 0, _b = comment.split("\n"); _a < _b.length; _a++) {
                    var paragraph = _b[_a];
                    paragraphs.push(paragraph);
                }
            }
            for (var i = 0; i < paragraphs.length; i++) {
                // Wrap paragraph lines
                var words = paragraphs[i].split(/\s/);
                var currentLine = void 0;
                for (var _c = 0, words_1 = words; _c < words_1.length; _c++) {
                    var word = words_1[_c];
                    if (!currentLine) {
                        currentLine = word;
                    }
                    else if (currentLine.length + word.length > MAX_COMMENT_LINE_LENGTH) {
                        commentNodes.push(blocks_1.mkText("// " + currentLine));
                        commentNodes.push(blocks_1.mkNewLine());
                        currentLine = word;
                    }
                    else {
                        currentLine += " " + word;
                    }
                }
                if (currentLine) {
                    commentNodes.push(blocks_1.mkText("// " + currentLine));
                    commentNodes.push(blocks_1.mkNewLine());
                }
                // The decompiler expects an empty comment line between paragraphs
                if (i !== paragraphs.length - 1) {
                    commentNodes.push(blocks_1.mkText("//"));
                    commentNodes.push(blocks_1.mkNewLine());
                }
            }
            for (var _d = 0, _e = commentNodes.reverse(); _d < _e.length; _d++) {
                var commentNode = _e[_d];
                r.unshift(commentNode);
            }
        }
        function endsWith(text, suffix) {
            if (text.length < suffix.length) {
                return false;
            }
            return text.substr(text.length - suffix.length) === suffix;
        }
        function countOptionals(b) {
            if (b.mutationToDom) {
                var el = b.mutationToDom();
                if (el.hasAttribute("_expanded")) {
                    var val = parseInt(el.getAttribute("_expanded"));
                    return isNaN(val) ? 0 : Math.max(val, 0);
                }
            }
            return 0;
        }
        function visibleParams(_a, optionalCount) {
            var comp = _a.comp;
            var res = [];
            if (comp.thisParameter) {
                res.push(comp.thisParameter);
            }
            comp.parameters.forEach(function (p) {
                if (p.isOptional && optionalCount > 0) {
                    res.push(p);
                    --optionalCount;
                }
                else if (!p.isOptional) {
                    res.push(p);
                }
            });
            return res;
        }
        function getEscapedCBParameters(b, stdfun, e) {
            var handlerArgs = [];
            if (stdfun.attrs.draggableParameters) {
                for (var i = 0; i < stdfun.comp.handlerArgs.length; i++) {
                    var arg = stdfun.comp.handlerArgs[i];
                    var varBlock = getInputTargetBlock(b, "HANDLER_DRAG_PARAM_" + arg.name);
                    var varName = varBlock && varBlock.getField("VAR").getText();
                    if (varName !== null) {
                        handlerArgs.push(escapeVarName(varName, e));
                    }
                    else {
                        break;
                    }
                }
            }
            else {
                for (var i = 0; i < stdfun.comp.handlerArgs.length; i++) {
                    var arg = stdfun.comp.handlerArgs[i];
                    var varField = b.getField("HANDLER_" + arg.name);
                    var varName = varField && varField.getText();
                    if (varName !== null) {
                        handlerArgs.push(escapeVarName(varName, e));
                    }
                    else {
                        break;
                    }
                }
            }
            return handlerArgs;
        }
        function groupWorkspaceComments(blocks, comments) {
            if (!blocks.length || blocks.some(function (b) { return !b.rendered; })) {
                return {
                    orphans: comments,
                    idToComments: {}
                };
            }
            var blockBounds = blocks.map(function (block) {
                var bounds = block.getBoundingRectangle();
                var size = block.getHeightWidth();
                return {
                    id: block.id,
                    x: bounds.topLeft.x,
                    y: bounds.topLeft.y,
                    width: size.width,
                    height: size.height
                };
            });
            var map = {
                orphans: [],
                idToComments: {}
            };
            var radius = 20;
            for (var _i = 0, comments_2 = comments; _i < comments_2.length; _i++) {
                var comment = comments_2[_i];
                var bounds = comment.getBoundingRectangle();
                var size = comment.getHeightWidth();
                var x = bounds.topLeft.x;
                var y = bounds.topLeft.y;
                var parent_2 = void 0;
                for (var _a = 0, blockBounds_1 = blockBounds; _a < blockBounds_1.length; _a++) {
                    var rect = blockBounds_1[_a];
                    if (doesIntersect(x, y, size.width, size.height, rect)) {
                        parent_2 = rect;
                    }
                    else if (!parent_2 && doesIntersect(x - radius, y - radius, size.width + radius * 2, size.height + radius * 2, rect)) {
                        parent_2 = rect;
                    }
                }
                if (parent_2) {
                    if (!map.idToComments[parent_2.id]) {
                        map.idToComments[parent_2.id] = [];
                    }
                    map.idToComments[parent_2.id].push(comment);
                }
                else {
                    map.orphans.push(comment);
                }
            }
            return map;
        }
        function doesIntersect(x, y, width, height, other) {
            var xOverlap = between(x, other.x, other.x + other.width) || between(other.x, x, x + width);
            var yOverlap = between(y, other.y, other.y + other.height) || between(other.y, y, y + height);
            return xOverlap && yOverlap;
            function between(val, lower, upper) {
                return val >= lower && val <= upper;
            }
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var registeredFieldEditors = {};
        function initFieldEditors() {
            // Initialize PXT custom editors
            var noteValidator = function (text) {
                if (text === null) {
                    return null;
                }
                text = String(text);
                var n = parseFloat(text || '0');
                if (isNaN(n) || n < 0) {
                    // Invalid number.
                    return null;
                }
                // Get the value in range.
                return String(Math.round(Number(text)));
            };
            registerFieldEditor('text', pxtblockly.FieldTextInput);
            registerFieldEditor('note', pxtblockly.FieldNote, noteValidator);
            registerFieldEditor('gridpicker', pxtblockly.FieldGridPicker);
            registerFieldEditor('textdropdown', pxtblockly.FieldTextDropdown);
            registerFieldEditor('numberdropdown', pxtblockly.FieldNumberDropdown);
            registerFieldEditor('imagedropdown', pxtblockly.FieldImageDropdown);
            registerFieldEditor('colorwheel', pxtblockly.FieldColorWheel);
            registerFieldEditor('toggle', pxtblockly.FieldToggle);
            registerFieldEditor('toggleonoff', pxtblockly.FieldToggleOnOff);
            registerFieldEditor('toggleyesno', pxtblockly.FieldToggleYesNo);
            registerFieldEditor('toggleupdown', pxtblockly.FieldToggleUpDown);
            registerFieldEditor('toggledownup', pxtblockly.FieldToggleDownUp);
            registerFieldEditor('togglehighlow', pxtblockly.FieldToggleHighLow);
            registerFieldEditor('colornumber', pxtblockly.FieldColorNumber);
            registerFieldEditor('images', pxtblockly.FieldImages);
            registerFieldEditor('sprite', pxtblockly.FieldSpriteEditor);
            registerFieldEditor('speed', pxtblockly.FieldSpeed);
            registerFieldEditor('turnratio', pxtblockly.FieldTurnRatio);
            registerFieldEditor('protractor', pxtblockly.FieldProtractor);
        }
        blocks.initFieldEditors = initFieldEditors;
        function registerFieldEditor(selector, field, validator) {
            if (registeredFieldEditors[selector] == undefined) {
                registeredFieldEditors[selector] = {
                    field: field,
                    validator: validator
                };
            }
        }
        blocks.registerFieldEditor = registerFieldEditor;
        function createFieldEditor(selector, text, params) {
            if (registeredFieldEditors[selector] == undefined) {
                console.error("Field editor " + selector + " not registered");
                return null;
            }
            if (!params) {
                params = {};
            }
            pxt.Util.assert(params.lightMode == undefined, "lightMode is a reserved parameter for custom fields");
            params.lightMode = pxt.options.light;
            var customField = registeredFieldEditors[selector];
            var instance = new customField.field(text, params, customField.validator);
            return instance;
        }
        blocks.createFieldEditor = createFieldEditor;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
///<reference path='../localtypings/pxtblockly.d.ts'/>
/// <reference path="../built/pxtlib.d.ts" />
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_2) {
        function saveWorkspaceXml(ws) {
            var xml = Blockly.Xml.workspaceToDom(ws, true);
            var text = Blockly.Xml.domToPrettyText(xml);
            return text;
        }
        blocks_2.saveWorkspaceXml = saveWorkspaceXml;
        function getDirectChildren(parent, tag) {
            var res = [];
            for (var i = 0; i < parent.childNodes.length; i++) {
                var n = parent.childNodes.item(i);
                if (n.tagName === tag) {
                    res.push(n);
                }
            }
            return res;
        }
        blocks_2.getDirectChildren = getDirectChildren;
        function getBlocksWithType(parent, type) {
            return getChildrenWithAttr(parent, "block", "type", type);
        }
        blocks_2.getBlocksWithType = getBlocksWithType;
        function getChildrenWithAttr(parent, tag, attr, value) {
            return pxt.Util.toArray(parent.getElementsByTagName(tag)).filter(function (b) { return b.getAttribute(attr) === value; });
        }
        blocks_2.getChildrenWithAttr = getChildrenWithAttr;
        function getFirstChildWithAttr(parent, tag, attr, value) {
            var res = getChildrenWithAttr(parent, tag, attr, value);
            return res.length ? res[0] : undefined;
        }
        blocks_2.getFirstChildWithAttr = getFirstChildWithAttr;
        /**
         * Loads the xml into a off-screen workspace (not suitable for size computations)
         */
        function loadWorkspaceXml(xml, skipReport) {
            if (skipReport === void 0) { skipReport = false; }
            var workspace = new Blockly.Workspace();
            try {
                var dom = Blockly.Xml.textToDom(xml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                return workspace;
            }
            catch (e) {
                if (!skipReport)
                    pxt.reportException(e);
                return null;
            }
        }
        blocks_2.loadWorkspaceXml = loadWorkspaceXml;
        function patchFloatingBlocks(dom, info) {
            var onstarts = getBlocksWithType(dom, ts.pxtc.ON_START_TYPE);
            var onstart = onstarts.length ? onstarts[0] : undefined;
            if (onstart) {
                onstart.removeAttribute("deletable");
                return;
            }
            var newnodes = [];
            var blocks = info.blocksById;
            // walk top level blocks
            var node = dom.firstElementChild;
            var insertNode = undefined;
            while (node) {
                var nextNode = node.nextElementSibling;
                // does this block is disable or have s nested statement block?
                var nodeType = node.getAttribute("type");
                if (!node.getAttribute("disabled") && !node.getElementsByTagName("statement").length
                    && (pxt.blocks.buildinBlockStatements[nodeType] ||
                        (blocks[nodeType] && blocks[nodeType].retType == "void" && !blocks_2.hasArrowFunction(blocks[nodeType])))) {
                    // old block, needs to be wrapped in onstart
                    if (!insertNode) {
                        insertNode = dom.ownerDocument.createElement("statement");
                        insertNode.setAttribute("name", "HANDLER");
                        if (!onstart) {
                            onstart = dom.ownerDocument.createElement("block");
                            onstart.setAttribute("type", ts.pxtc.ON_START_TYPE);
                            newnodes.push(onstart);
                        }
                        onstart.appendChild(insertNode);
                        insertNode.appendChild(node);
                        node.removeAttribute("x");
                        node.removeAttribute("y");
                        insertNode = node;
                    }
                    else {
                        // event, add nested statement
                        var next = dom.ownerDocument.createElement("next");
                        next.appendChild(node);
                        insertNode.appendChild(next);
                        node.removeAttribute("x");
                        node.removeAttribute("y");
                        insertNode = node;
                    }
                }
                node = nextNode;
            }
            newnodes.forEach(function (n) { return dom.appendChild(n); });
        }
        function importXml(pkgTargetVersion, xml, info, skipReport) {
            if (skipReport === void 0) { skipReport = false; }
            try {
                var parser = new DOMParser();
                var doc_1 = parser.parseFromString(xml, "application/xml");
                var upgrades = pxt.patching.computePatches(pkgTargetVersion);
                if (upgrades) {
                    // patch block types
                    upgrades.filter(function (up) { return up.type == "blockId"; })
                        .forEach(function (up) { return Object.keys(up.map).forEach(function (type) {
                        getBlocksWithType(doc_1, type)
                            .forEach(function (blockNode) {
                            blockNode.setAttribute("type", up.map[type]);
                            pxt.debug("patched block " + type + " -> " + up.map[type]);
                        });
                    }); });
                    // patch block value
                    upgrades.filter(function (up) { return up.type == "blockValue"; })
                        .forEach(function (up) { return Object.keys(up.map).forEach(function (k) {
                        var m = k.split('.');
                        var type = m[0];
                        var name = m[1];
                        getBlocksWithType(doc_1, type)
                            .reduce(function (prev, current) { return prev.concat(getDirectChildren(current, "value")); }, [])
                            .forEach(function (blockNode) {
                            blockNode.setAttribute("name", up.map[k]);
                            pxt.debug("patched block value " + k + " -> " + up.map[k]);
                        });
                    }); });
                }
                // build upgrade map
                var enums_1 = {};
                Object.keys(info.apis.byQName).forEach(function (k) {
                    var api = info.apis.byQName[k];
                    if (api.kind == pxtc.SymbolKind.EnumMember)
                        enums_1[api.namespace + '.' + (api.attributes.blockImportId || api.attributes.block || api.attributes.blockId || api.name)]
                            = api.namespace + '.' + api.name;
                });
                // walk through blocks and patch enums
                var blocks_3 = doc_1.getElementsByTagName("block");
                for (var i = 0; i < blocks_3.length; ++i)
                    patchBlock(info, enums_1, blocks_3[i]);
                // patch floating blocks
                patchFloatingBlocks(doc_1.documentElement, info);
                // apply extension patches
                if (pxt.blocks.extensionBlocklyPatch)
                    pxt.blocks.extensionBlocklyPatch(pkgTargetVersion, doc_1.documentElement);
                // serialize and return
                return new XMLSerializer().serializeToString(doc_1);
            }
            catch (e) {
                if (!skipReport)
                    pxt.reportException(e);
                return xml;
            }
        }
        blocks_2.importXml = importXml;
        function patchBlock(info, enums, block) {
            var type = block.getAttribute("type");
            var b = Blockly.Blocks[type];
            var symbol = blocks_2.blockSymbol(type);
            if (!symbol || !b)
                return;
            var comp = blocks_2.compileInfo(symbol);
            symbol.parameters.forEach(function (p, i) {
                var ptype = info.apis.byQName[p.type];
                if (ptype && ptype.kind == pxtc.SymbolKind.Enum) {
                    var field = getFirstChildWithAttr(block, "field", "name", comp.actualNameToParam[p.name].definitionName);
                    if (field) {
                        var en = enums[ptype.name + '.' + field.textContent];
                        if (en)
                            field.textContent = en;
                    }
                    /*
    <block type="device_button_event" x="92" y="77">
        <field name="NAME">Button.AB</field>
      </block>
                      */
                }
            });
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_4) {
        var layout;
        (function (layout) {
            function patchBlocksFromOldWorkspace(blockInfo, oldWs, newXml) {
                var newWs = pxt.blocks.loadWorkspaceXml(newXml, true);
                // position blocks
                alignBlocks(blockInfo, oldWs, newWs);
                // inject disabled blocks
                return injectDisabledBlocks(oldWs, newWs);
            }
            layout.patchBlocksFromOldWorkspace = patchBlocksFromOldWorkspace;
            function injectDisabledBlocks(oldWs, newWs) {
                var oldDom = Blockly.Xml.workspaceToDom(oldWs, true);
                var newDom = Blockly.Xml.workspaceToDom(newWs, true);
                pxt.Util.toArray(oldDom.childNodes)
                    .filter(function (n) { return n.nodeType == Node.ELEMENT_NODE && n.localName == "block" && n.getAttribute("disabled") == "true"; })
                    .forEach(function (n) { return newDom.appendChild(newDom.ownerDocument.importNode(n, true)); });
                var updatedXml = Blockly.Xml.domToText(newDom);
                return updatedXml;
            }
            function alignBlocks(blockInfo, oldWs, newWs) {
                var env;
                var newBlocks; // support for multiple events with similar name
                oldWs.getTopBlocks(false).filter(function (ob) { return !ob.disabled; })
                    .forEach(function (ob) {
                    var otp = ob.xy_;
                    if (otp && otp.x != 0 && otp.y != 0) {
                        if (!env) {
                            env = pxt.blocks.mkEnv(oldWs, blockInfo, true);
                            newBlocks = {};
                            newWs.getTopBlocks(false).forEach(function (b) {
                                var nkey = pxt.blocks.callKey(env, b);
                                var nbs = newBlocks[nkey] || [];
                                nbs.push(b);
                                newBlocks[nkey] = nbs;
                            });
                        }
                        var oldKey = pxt.blocks.callKey(env, ob);
                        var newBlock = (newBlocks[oldKey] || []).shift();
                        if (newBlock)
                            newBlock.xy_ = otp.clone();
                    }
                });
            }
            /**
             * Splits a blockly SVG AFTER a vertical layout. This function relies on the ordering
             * of blocks / comments to get as getTopBlock(true)/getTopComment(true)
             */
            function splitSvg(svg, ws, emPixels) {
                if (emPixels === void 0) { emPixels = 18; }
                var comments = ws.getTopComments(true);
                var blocks = ws.getTopBlocks(true);
                // don't split for a single block
                if (comments.length + blocks.length < 2)
                    return svg;
                var div = document.createElement("div");
                div.className = "blocks-svg-list";
                function extract(parentClass, otherClass, blocki, size, translate) {
                    var svgclone = svg.cloneNode(true);
                    // collect all blocks
                    var parentSvg = svgclone.querySelector("g.blocklyWorkspace > g." + parentClass);
                    var otherSvg = svgclone.querySelector("g.blocklyWorkspace > g." + otherClass);
                    var blocksSvg = pxt.Util.toArray(parentSvg.querySelectorAll("g.blocklyWorkspace > g." + parentClass + " > g"));
                    var blockSvg = blocksSvg.splice(blocki, 1)[0];
                    // remove all but the block we care about
                    blocksSvg.filter(function (g) { return g != blockSvg; })
                        .forEach(function (g) {
                        g.parentNode.removeChild(g);
                    });
                    // clear transform, remove other group
                    parentSvg.removeAttribute("transform");
                    otherSvg.parentNode.removeChild(otherSvg);
                    // patch size
                    blockSvg.setAttribute("transform", "translate(" + translate.x + ", " + translate.y + ")");
                    var width = (size.width / emPixels) + "em";
                    var height = (size.height / emPixels) + "em";
                    svgclone.setAttribute("viewBox", "0 0 " + size.width + " " + size.height);
                    svgclone.style.width = width;
                    svgclone.style.height = height;
                    svgclone.setAttribute("width", width);
                    svgclone.setAttribute("height", height);
                    div.appendChild(svgclone);
                }
                comments.forEach(function (comment, commenti) { return extract('blocklyBubbleCanvas', 'blocklyBlockCanvas', commenti, comment.getHeightWidth(), { x: 0, y: 0 }); });
                blocks.forEach(function (block, blocki) {
                    var size = block.getHeightWidth();
                    var translate = { x: 0, y: 0 };
                    if (block.getStartHat()) {
                        size.height += emPixels;
                        translate.y += emPixels;
                    }
                    extract('blocklyBlockCanvas', 'blocklyBubbleCanvas', blocki, size, translate);
                });
                return div;
            }
            layout.splitSvg = splitSvg;
            function verticalAlign(ws, emPixels) {
                var y = 0;
                var comments = ws.getTopComments(true);
                comments.forEach(function (comment) {
                    comment.moveBy(0, y);
                    y += comment.getHeightWidth().height;
                    y += emPixels; //buffer
                });
                var blocks = ws.getTopBlocks(true);
                blocks.forEach(function (block, bi) {
                    // TODO: REMOVE THIS WHEN FIXED IN PXT-BLOCKLY
                    if (block.getStartHat())
                        y += emPixels; // hat height
                    block.moveBy(0, y);
                    y += block.getHeightWidth().height;
                    y += emPixels; //buffer
                });
            }
            layout.verticalAlign = verticalAlign;
            ;
            function flow(ws, opts) {
                if (opts) {
                    if (opts.useViewWidth) {
                        var metrics = ws.getMetrics();
                        // Only use the width if in portrait, otherwise the blocks are too spread out
                        if (metrics.viewHeight > metrics.viewWidth) {
                            flowBlocks(ws.getTopComments(true), ws.getTopBlocks(true), undefined, metrics.viewWidth);
                            return;
                        }
                    }
                    flowBlocks(ws.getTopComments(true), ws.getTopBlocks(true), opts.ratio);
                }
                else {
                    flowBlocks(ws.getTopComments(true), ws.getTopBlocks(true));
                }
            }
            layout.flow = flow;
            function screenshotEnabled() {
                return !pxt.BrowserUtils.isIE()
                    && !pxt.BrowserUtils.isUwpEdge(); // TODO figure out why screenshots are not working in UWP; disable for now
            }
            layout.screenshotEnabled = screenshotEnabled;
            function screenshotAsync(ws) {
                return toPngAsync(ws);
            }
            layout.screenshotAsync = screenshotAsync;
            function toPngAsync(ws) {
                return toSvgAsync(ws)
                    .then(function (sg) {
                    if (!sg)
                        return Promise.resolve(undefined);
                    return toPngAsyncInternal(sg.width, sg.height, 4, sg.xml);
                });
            }
            layout.toPngAsync = toPngAsync;
            function svgToPngAsync(svg, x, y, width, height, pixelDensity) {
                return blocklyToSvgAsync(svg, x, y, width, height)
                    .then(function (sg) {
                    if (!sg)
                        return Promise.resolve(undefined);
                    return toPngAsyncInternal(sg.width, sg.height, pixelDensity, sg.xml);
                });
            }
            layout.svgToPngAsync = svgToPngAsync;
            var MAX_SCREENSHOT_SIZE = 1e6; // max 1Mb
            function toPngAsyncInternal(width, height, pixelDensity, data) {
                return new Promise(function (resolve, reject) {
                    var cvs = document.createElement("canvas");
                    var ctx = cvs.getContext("2d");
                    var img = new Image;
                    cvs.width = width * pixelDensity;
                    cvs.height = height * pixelDensity;
                    img.onload = function () {
                        ctx.drawImage(img, 0, 0, width, height, 0, 0, cvs.width, cvs.height);
                        var canvasdata = cvs.toDataURL("image/png");
                        // if the generated image is too big, shrink image
                        while (canvasdata.length > MAX_SCREENSHOT_SIZE) {
                            cvs.width = (cvs.width / 2) >> 0;
                            cvs.height = (cvs.height / 2) >> 0;
                            pxt.log("screenshot size " + canvasdata.length + "b, shrinking to " + cvs.width + "x" + cvs.height);
                            ctx.drawImage(img, 0, 0, width, height, 0, 0, cvs.width, cvs.height);
                            canvasdata = cvs.toDataURL("image/png");
                        }
                        resolve(canvasdata);
                    };
                    img.onerror = function (ev) {
                        pxt.reportError("blocks", "blocks screenshot failed");
                        resolve(undefined);
                    };
                    img.src = data;
                });
            }
            var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
            function toSvgAsync(ws) {
                if (!ws)
                    return Promise.resolve(undefined);
                var bbox = document.getElementsByClassName("blocklyBlockCanvas")[0].getBBox();
                var sg = ws.svgBlockCanvas_.cloneNode(true);
                return blocklyToSvgAsync(sg, bbox.x, bbox.y, bbox.width, bbox.height);
            }
            layout.toSvgAsync = toSvgAsync;
            function serializeNode(sg) {
                return serializeSvgString(new XMLSerializer().serializeToString(sg));
            }
            layout.serializeNode = serializeNode;
            function serializeSvgString(xmlString) {
                return xmlString
                    .replace(new RegExp('&nbsp;', 'g'), '&#160;'); // Replace &nbsp; with &#160; as a workaround for having nbsp missing from SVG xml
            }
            layout.serializeSvgString = serializeSvgString;
            function blocklyToSvgAsync(sg, x, y, width, height) {
                if (!sg.childNodes[0])
                    return Promise.resolve(undefined);
                sg.removeAttribute("width");
                sg.removeAttribute("height");
                sg.removeAttribute("transform");
                var xmlString = serializeNode(sg)
                    .replace(/^\s*<svg[^>]+>/i, '')
                    .replace(/<\/svg>\s*$/i, ''); // strip out svg tag
                var svgXml = "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"" + XLINK_NAMESPACE + "\" width=\"" + width + "\" height=\"" + height + "\" viewBox=\"" + x + " " + y + " " + width + " " + height + "\">" + xmlString + "</svg>";
                var xsg = new DOMParser().parseFromString(svgXml, "image/svg+xml");
                var cssLink = xsg.createElementNS("http://www.w3.org/1999/xhtml", "style");
                var isRtl = pxt.Util.isUserLanguageRtl();
                var customCssHref = document.getElementById("style-" + (isRtl ? 'rtl' : '') + "blockly.css").href;
                return pxt.BrowserUtils.loadAjaxAsync(customCssHref)
                    .then(function (customCss) {
                    var blocklySvg = pxt.Util.toArray(document.head.querySelectorAll("style"))
                        .filter(function (el) { return /\.blocklySvg/.test(el.innerText); })[0];
                    // CSS may contain <, > which need to be stored in CDATA section
                    var cssString = (blocklySvg ? blocklySvg.innerText : "") + '\n\n' + customCss + '\n\n';
                    cssLink.appendChild(xsg.createCDATASection(cssString));
                    xsg.documentElement.insertBefore(cssLink, xsg.documentElement.firstElementChild);
                    return expandImagesAsync(xsg)
                        .then(function () { return convertIconsToPngAsync(xsg); })
                        .then(function () {
                        return {
                            width: width,
                            height: height,
                            svg: serializeNode(xsg).replace('<style xmlns="http://www.w3.org/1999/xhtml">', '<style>'),
                            xml: documentToSvg(xsg),
                            css: cssString
                        };
                    });
                });
            }
            layout.blocklyToSvgAsync = blocklyToSvgAsync;
            function documentToSvg(xsg) {
                var xml = new XMLSerializer().serializeToString(xsg);
                var data = "data:image/svg+xml;base64," + ts.pxtc.encodeBase64(unescape(encodeURIComponent(xml)));
                return data;
            }
            layout.documentToSvg = documentToSvg;
            var imageXLinkCache;
            function expandImagesAsync(xsg) {
                if (!imageXLinkCache)
                    imageXLinkCache = {};
                var images = xsg.getElementsByTagName("image");
                var p = pxt.Util.toArray(images)
                    .filter(function (image) { return !/^data:/.test(image.getAttributeNS(XLINK_NAMESPACE, "href")); })
                    .map(function (image) {
                    var href = image.getAttributeNS(XLINK_NAMESPACE, "href");
                    var dataUri = imageXLinkCache[href];
                    return (dataUri ? Promise.resolve(imageXLinkCache[href])
                        : pxt.BrowserUtils.loadImageAsync(image.getAttributeNS(XLINK_NAMESPACE, "href"))
                            .then(function (img) {
                            var cvs = document.createElement("canvas");
                            var ctx = cvs.getContext("2d");
                            cvs.width = img.width;
                            cvs.height = img.height;
                            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, cvs.width, cvs.height);
                            imageXLinkCache[href] = dataUri = cvs.toDataURL("image/png");
                            return dataUri;
                        }).catch(function (e) {
                            // ignore load error
                            pxt.debug("svg render: failed to load " + href);
                        }))
                        .then(function (href) { image.setAttributeNS(XLINK_NAMESPACE, "href", href); });
                });
                return Promise.all(p).then(function () { });
            }
            var imageIconCache;
            function convertIconsToPngAsync(xsg) {
                if (!imageIconCache)
                    imageIconCache = {};
                if (!pxt.BrowserUtils.isEdge())
                    return Promise.resolve();
                var images = xsg.getElementsByTagName("image");
                var p = pxt.Util.toArray(images)
                    .filter(function (image) { return /^data:image\/svg\+xml/.test(image.getAttributeNS(XLINK_NAMESPACE, "href")); })
                    .map(function (image) {
                    var svgUri = image.getAttributeNS(XLINK_NAMESPACE, "href");
                    var width = parseInt(image.getAttribute("width").replace(/[^0-9]/g, ""));
                    var height = parseInt(image.getAttribute("height").replace(/[^0-9]/g, ""));
                    var pngUri = imageIconCache[svgUri];
                    return (pngUri ? Promise.resolve(pngUri)
                        : toPngAsyncInternal(width, height, 4, svgUri))
                        .then(function (href) {
                        imageIconCache[svgUri] = href;
                        image.setAttributeNS(XLINK_NAMESPACE, "href", href);
                    });
                });
                return Promise.all(p).then(function () { });
            }
            function flowBlocks(comments, blocks, ratio, maxWidth) {
                if (ratio === void 0) { ratio = 1.62; }
                // Margin between blocks and their comments
                var innerGroupMargin = 13;
                // Margin between groups of blocks and comments
                var outerGroupMargin = 45;
                // Workspace margins
                var marginx = 20;
                var marginy = 20;
                var groups = [];
                var commentMap = {};
                comments.forEach(function (comment) {
                    var ref = comment.data;
                    if (ref != undefined) {
                        commentMap[ref] = comment;
                    }
                    else {
                        groups.push(formattable(comment));
                    }
                });
                var onStart;
                blocks.forEach(function (block) {
                    var commentRefs = block.data;
                    if (commentRefs) {
                        var refs = commentRefs.split(";");
                        var children = [];
                        for (var i = 0; i < refs.length; i++) {
                            var comment = commentMap[refs[i]];
                            if (comment) {
                                children.push(formattable(comment));
                                delete commentMap[refs[i]];
                            }
                        }
                        if (children.length) {
                            groups.push({ value: block, width: -1, height: -1, children: children });
                            return;
                        }
                    }
                    var f = formattable(block);
                    if (block.type === pxtc.ON_START_TYPE) {
                        onStart = f;
                    }
                    else {
                        groups.push(f);
                    }
                });
                if (onStart) {
                    groups.unshift(onStart);
                }
                // Collect the comments that were not linked to a top-level block
                // and puth them in on start (if it exists)
                Object.keys(commentMap).sort(function (a, b) {
                    // These are strings of integers (eg "0", "17", etc.) with no duplicates
                    if (a.length === b.length) {
                        return a > b ? -1 : 1;
                    }
                    else {
                        return a.length > b.length ? -1 : 1;
                    }
                }).forEach(function (key) {
                    if (commentMap[key]) {
                        if (onStart) {
                            if (!onStart.children) {
                                onStart.children = [];
                            }
                            onStart.children.push(formattable(commentMap[key]));
                        }
                        else {
                            // Stick the comments in the front so that they show up in the top left
                            groups.unshift(formattable(commentMap[key]));
                        }
                    }
                });
                var surfaceArea = 0;
                for (var i = 0; i < groups.length; i++) {
                    var group = groups[i];
                    if (group.children) {
                        var valueDimensions = group.value.getHeightWidth();
                        group.x = 0;
                        group.y = 0;
                        var x = valueDimensions.width + innerGroupMargin;
                        var y = 0;
                        // Lay comments out to the right of the parent node
                        for (var j = 0; j < group.children.length; j++) {
                            var child = group.children[j];
                            child.x = x;
                            child.y = y;
                            y += child.height + innerGroupMargin;
                            group.width = Math.max(group.width, x + child.width);
                        }
                        group.height = Math.max(y - innerGroupMargin, valueDimensions.height);
                    }
                    surfaceArea += (group.height + innerGroupMargin) * (group.width + innerGroupMargin);
                }
                var maxx;
                if (maxWidth > marginx) {
                    maxx = maxWidth - marginx;
                }
                else {
                    maxx = Math.sqrt(surfaceArea) * ratio;
                }
                var insertx = marginx;
                var inserty = marginy;
                var rowBottom = 0;
                for (var i = 0; i < groups.length; i++) {
                    var group = groups[i];
                    if (group.children) {
                        moveFormattable(group, insertx + group.x, inserty + group.y);
                        for (var j = 0; j < group.children.length; j++) {
                            var child = group.children[j];
                            moveFormattable(child, insertx + child.x, inserty + child.y);
                        }
                    }
                    else {
                        moveFormattable(group, insertx, inserty);
                    }
                    insertx += group.width + outerGroupMargin;
                    rowBottom = Math.max(rowBottom, inserty + group.height + outerGroupMargin);
                    if (insertx > maxx) {
                        insertx = marginx;
                        inserty = rowBottom;
                    }
                }
                function moveFormattable(f, x, y) {
                    var bounds = f.value.getBoundingRectangle();
                    f.value.moveBy(x - bounds.topLeft.x, y - bounds.topLeft.y);
                }
            }
            function formattable(entity) {
                var hw = entity.getHeightWidth();
                return { value: entity, height: hw.height, width: hw.width };
            }
        })(layout = blocks_4.layout || (blocks_4.layout = {}));
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/blockly.d.ts" />
/// <reference path="../built/pxtlib.d.ts" />
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var typeDefaults = {
            "string": {
                field: "TEXT",
                block: "text",
                defaultValue: ""
            },
            "number": {
                field: "NUM",
                block: "math_number",
                defaultValue: "0"
            },
            "boolean": {
                field: "BOOL",
                block: "logic_boolean",
                defaultValue: "false"
            },
            "Array": {
                field: "VAR",
                block: "variables_get",
                defaultValue: "list"
            }
        };
        // this keeps a bit of state for perf reasons
        var ImageConverter = /** @class */ (function () {
            function ImageConverter() {
            }
            ImageConverter.prototype.logTime = function () {
                if (this.start) {
                    var d = Date.now() - this.start;
                    pxt.debug("Icon cration: " + d + "ms");
                }
            };
            ImageConverter.prototype.convert = function (jresURL) {
                if (!this.start)
                    this.start = Date.now();
                var data = atob(jresURL.slice(jresURL.indexOf(",") + 1));
                var magic = data.charCodeAt(0);
                var w = data.charCodeAt(1);
                var h = data.charCodeAt(2);
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
        // Add numbers before input names to prevent clashes with the ones added by BlocklyLoader
        blocks.optionalDummyInputPrefix = "0_optional_dummy";
        blocks.optionalInputWithFieldPrefix = "0_optional_field";
        // Matches arrays and tuple types
        var arrayTypeRegex = /^(?:Array<.+>)|(?:.+\[\])|(?:\[.+\])$/;
        function isArrayType(type) {
            return arrayTypeRegex.test(type);
        }
        blocks.isArrayType = isArrayType;
        // list of built-in blocks, should be touched.
        var _builtinBlocks;
        function builtinBlocks() {
            if (!_builtinBlocks) {
                _builtinBlocks = {};
                Object.keys(Blockly.Blocks)
                    .forEach(function (k) { return _builtinBlocks[k] = { block: Blockly.Blocks[k] }; });
            }
            return _builtinBlocks;
        }
        blocks.builtinBlocks = builtinBlocks;
        blocks.buildinBlockStatements = {
            "controls_if": true,
            "controls_for": true,
            "pxt_controls_for": true,
            "controls_simple_for": true,
            "controls_repeat_ext": true,
            "pxt_controls_for_of": true,
            "controls_for_of": true,
            "variables_set": true,
            "variables_change": true,
            "device_while": true
        };
        var cachedBlocks = {};
        function blockSymbol(type) {
            var b = cachedBlocks[type];
            return b ? b.fn : undefined;
        }
        blocks.blockSymbol = blockSymbol;
        function createShadowValue(info, p, shadowId, defaultV) {
            defaultV = defaultV || p.defaultValue;
            shadowId = shadowId || p.shadowBlockId;
            var defaultValue;
            if (defaultV && defaultV.slice(0, 1) == "\"")
                defaultValue = JSON.parse(defaultV);
            else {
                defaultValue = defaultV;
            }
            if (p.type == "number" && shadowId == "value") {
                var field = document.createElement("field");
                field.setAttribute("name", p.definitionName);
                field.appendChild(document.createTextNode("0"));
                return field;
            }
            var isVariable = shadowId == "variables_get";
            var value = document.createElement("value");
            value.setAttribute("name", p.definitionName);
            var shadow = document.createElement(isVariable ? "block" : "shadow");
            value.appendChild(shadow);
            var typeInfo = typeDefaults[p.type];
            shadow.setAttribute("type", shadowId || typeInfo && typeInfo.block || p.type);
            shadow.setAttribute("colour", Blockly.Colours.textField);
            if (typeInfo && (!shadowId || typeInfo.block === shadowId || shadowId === "math_number_minmax")) {
                var field = document.createElement("field");
                shadow.appendChild(field);
                var fieldName = void 0;
                switch (shadowId) {
                    case "variables_get":
                        fieldName = "VAR";
                        break;
                    case "math_number_minmax":
                        fieldName = "SLIDER";
                        break;
                    default:
                        fieldName = typeInfo.field;
                        break;
                }
                field.setAttribute("name", fieldName);
                var value_1;
                if (p.type == "boolean") {
                    value_1 = document.createTextNode((defaultValue || typeInfo.defaultValue).toUpperCase());
                }
                else {
                    value_1 = document.createTextNode(defaultValue || typeInfo.defaultValue);
                }
                field.appendChild(value_1);
            }
            else if (defaultValue) {
                var field = document.createElement("field");
                field.textContent = defaultValue;
                if (isVariable) {
                    field.setAttribute("name", "VAR");
                    shadow.appendChild(field);
                }
                else if (shadowId) {
                    var shadowInfo = info.blocksById[shadowId];
                    if (shadowInfo && shadowInfo.attributes._def && shadowInfo.attributes._def.parameters.length) {
                        var shadowParam = shadowInfo.attributes._def.parameters[0];
                        field.setAttribute("name", shadowParam.name);
                        shadow.appendChild(field);
                    }
                }
                else {
                    field.setAttribute("name", p.definitionName);
                    shadow.appendChild(field);
                }
            }
            return value;
        }
        function createFlyoutHeadingLabel(name, color, icon, iconClass) {
            var headingLabel = createFlyoutLabel(name, color, icon, iconClass);
            headingLabel.setAttribute('web-class', 'blocklyFlyoutHeading');
            return headingLabel;
        }
        blocks.createFlyoutHeadingLabel = createFlyoutHeadingLabel;
        function createFlyoutGroupLabel(name, icon, labelLineWidth) {
            var groupLabel = createFlyoutLabel(name, undefined, icon);
            groupLabel.setAttribute('web-class', 'blocklyFlyoutGroup');
            groupLabel.setAttribute('web-line', '1.5');
            if (labelLineWidth)
                groupLabel.setAttribute('web-line-width', labelLineWidth);
            return groupLabel;
        }
        blocks.createFlyoutGroupLabel = createFlyoutGroupLabel;
        function createFlyoutLabel(name, color, icon, iconClass) {
            // Add the Heading label
            var headingLabel = goog.dom.createDom('label');
            headingLabel.setAttribute('text', name);
            if (color) {
                headingLabel.setAttribute('web-icon-color', color);
            }
            if (icon) {
                if (icon.length === 1) {
                    headingLabel.setAttribute('web-icon', icon);
                    if (iconClass)
                        headingLabel.setAttribute('web-icon-class', iconClass);
                }
                else {
                    headingLabel.setAttribute('web-icon-class', "blocklyFlyoutIcon" + name);
                }
            }
            return headingLabel;
        }
        function createFlyoutButton(callbackkey, label) {
            var button = goog.dom.createDom('button');
            button.setAttribute('text', label);
            button.setAttribute('callbackkey', callbackkey);
            return button;
        }
        blocks.createFlyoutButton = createFlyoutButton;
        function createToolboxBlock(info, fn, comp) {
            //
            // toolbox update
            //
            var block = document.createElement("block");
            block.setAttribute("type", fn.attributes.blockId);
            if (fn.attributes.blockGap)
                block.setAttribute("gap", fn.attributes.blockGap);
            else if (pxt.appTarget.appTheme && pxt.appTarget.appTheme.defaultBlockGap)
                block.setAttribute("gap", pxt.appTarget.appTheme.defaultBlockGap.toString());
            if (comp.thisParameter) {
                var t = comp.thisParameter;
                block.appendChild(createShadowValue(info, t, t.shadowBlockId || "variables_get", t.defaultValue || t.definitionName));
            }
            if (fn.parameters) {
                comp.parameters.filter(function (pr) { return !pr.isOptional &&
                    (/^(string|number|boolean)$/.test(pr.type) || pr.shadowBlockId || pr.defaultValue); })
                    .forEach(function (pr) {
                    var shadowValue;
                    var container;
                    if (pr.range) {
                        shadowValue = createShadowValue(info, pr, "math_number_minmax");
                        container = document.createElement('mutation');
                        container.setAttribute('min', pr.range.min.toString());
                        container.setAttribute('max', pr.range.max.toString());
                        container.setAttribute('label', pr.actualName.charAt(0).toUpperCase() + pr.actualName.slice(1));
                        if (pr.fieldOptions) {
                            if (pr.fieldOptions['step'])
                                container.setAttribute('step', pr.fieldOptions['step']);
                            if (pr.fieldOptions['color'])
                                container.setAttribute('color', pr.fieldOptions['color']);
                            if (pr.fieldOptions['precision'])
                                container.setAttribute('precision', pr.fieldOptions['precision']);
                        }
                    }
                    else {
                        shadowValue = createShadowValue(info, pr);
                    }
                    if (pr.fieldOptions) {
                        if (!container)
                            container = document.createElement('mutation');
                        container.setAttribute("customfield", JSON.stringify(pr.fieldOptions));
                    }
                    if (shadowValue && container)
                        shadowValue.firstChild.appendChild(container);
                    block.appendChild(shadowValue);
                });
                if (fn.attributes.draggableParameters) {
                    comp.handlerArgs.forEach(function (arg) {
                        // <value name="HANDLER_DRAG_PARAM_arg">
                        // <shadow type="variables_get_reporter">
                        //     <field name="VAR">defaultName</field>
                        // </shadow>
                        // </value>
                        var value = document.createElement("value");
                        value.setAttribute("name", "HANDLER_DRAG_PARAM_" + arg.name);
                        var shadow = document.createElement("shadow");
                        shadow.setAttribute("type", "variables_get_reporter");
                        var field = document.createElement("field");
                        field.setAttribute("name", "VAR");
                        field.textContent = pxt.Util.htmlEscape(arg.name);
                        shadow.appendChild(field);
                        value.appendChild(shadow);
                        block.appendChild(value);
                    });
                }
                else {
                    comp.handlerArgs.forEach(function (arg) {
                        var field = document.createElement("field");
                        field.setAttribute("name", "HANDLER_" + arg.name);
                        field.textContent = arg.name;
                        block.appendChild(field);
                    });
                }
            }
            return block;
        }
        blocks.createToolboxBlock = createToolboxBlock;
        function createCategoryElement(name, nameid, weight, colour, iconClass) {
            var result = document.createElement("category");
            result.setAttribute("name", name);
            result.setAttribute("nameid", nameid.toLowerCase());
            result.setAttribute("weight", weight.toString());
            if (colour) {
                result.setAttribute("colour", colour);
            }
            if (iconClass) {
                result.setAttribute("iconclass", iconClass);
                result.setAttribute("expandedclass", iconClass);
            }
            return result;
        }
        function injectBlocks(blockInfo) {
            // inject Blockly with all block definitions
            return blockInfo.blocks
                .map(function (fn) {
                if (fn.attributes.blockBuiltin) {
                    pxt.Util.assert(!!builtinBlocks()[fn.attributes.blockId]);
                    builtinBlocks()[fn.attributes.blockId].symbol = fn;
                }
                else {
                    var comp = blocks.compileInfo(fn);
                    var block = createToolboxBlock(blockInfo, fn, comp);
                    injectBlockDefinition(blockInfo, fn, comp, block);
                }
                return fn;
            });
        }
        blocks.injectBlocks = injectBlocks;
        function injectBlockDefinition(info, fn, comp, blockXml) {
            var id = fn.attributes.blockId;
            if (builtinBlocks()[id]) {
                pxt.reportError("blocks", 'trying to override builtin block', { "details": id });
                return false;
            }
            var hash = JSON.stringify(fn);
            /* tslint:disable:possible-timing-attack (not a security critical codepath) */
            if (cachedBlocks[id] && cachedBlocks[id].hash == hash) {
                return true;
            }
            /* tslint:enable:possible-timing-attack */
            if (Blockly.Blocks[fn.attributes.blockId]) {
                console.error("duplicate block definition: " + id);
                return false;
            }
            var cachedBlock = {
                hash: hash,
                fn: fn,
                block: {
                    codeCard: mkCard(fn, blockXml),
                    init: function () { initBlock(this, info, fn, comp); }
                }
            };
            cachedBlocks[id] = cachedBlock;
            Blockly.Blocks[id] = cachedBlock.block;
            return true;
        }
        function newLabel(part) {
            if (part.kind === "image") {
                return iconToFieldImage(part.uri);
            }
            var txt = removeOuterSpace(part.text);
            if (!txt) {
                return undefined;
            }
            if (part.cssClass) {
                return new Blockly.FieldLabel(txt, part.cssClass);
            }
            else if (part.style.length) {
                return new pxtblockly.FieldStyledLabel(txt, {
                    bold: part.style.indexOf("bold") !== -1,
                    italics: part.style.indexOf("italics") !== -1,
                    blocksInfo: undefined
                });
            }
            else {
                return new Blockly.FieldLabel(txt, undefined);
            }
        }
        function cleanOuterHTML(el) {
            // remove IE11 junk
            return el.outerHTML.replace(/^<\?[^>]*>/, '');
        }
        function mkCard(fn, blockXml) {
            return {
                name: fn.namespace + '.' + fn.name,
                shortName: fn.name,
                description: fn.attributes.jsDoc,
                url: fn.attributes.help ? 'reference/' + fn.attributes.help.replace(/^\//, '') : undefined,
                blocksXml: "<xml xmlns=\"http://www.w3.org/1999/xhtml\">" + cleanOuterHTML(blockXml) + "</xml>",
            };
        }
        function isSubtype(apis, specific, general) {
            if (specific == general)
                return true;
            var inf = apis.byQName[specific];
            if (inf && inf.extendsTypes)
                return inf.extendsTypes.indexOf(general) >= 0;
            return false;
        }
        function initBlock(block, info, fn, comp) {
            var ns = (fn.attributes.blockNamespace || fn.namespace).split('.')[0];
            var instance = fn.kind == pxtc.SymbolKind.Method || fn.kind == pxtc.SymbolKind.Property;
            var nsinfo = info.apis.byQName[ns];
            var color = 
            // blockNamespace overrides color on block
            (fn.attributes.blockNamespace && nsinfo && nsinfo.attributes.color)
                || fn.attributes.color
                || (nsinfo && nsinfo.attributes.color)
                || pxt.toolbox.getNamespaceColor(ns)
                || 255;
            if (fn.attributes.help)
                block.setHelpUrl("/reference/" + fn.attributes.help.replace(/^\//, ''));
            else if (fn.pkg && !pxt.appTarget.bundledpkgs[fn.pkg]) {
                var anchor = fn.qName.toLowerCase().split('.');
                if (anchor[0] == fn.pkg)
                    anchor.shift();
                block.setHelpUrl("/pkg/" + fn.pkg + "#" + encodeURIComponent(anchor.join('-')));
            }
            block.setColour(color, fn.attributes.colorSecondary, fn.attributes.colorTertiary);
            var blockShape = Blockly.OUTPUT_SHAPE_ROUND;
            if (fn.retType == "boolean")
                blockShape = Blockly.OUTPUT_SHAPE_HEXAGONAL;
            block.setOutputShape(blockShape);
            if (fn.attributes.undeletable)
                block.setDeletable(false);
            buildBlockFromDef(fn.attributes._def);
            var hasHandler = false;
            if (fn.attributes.mutate) {
                blocks.addMutation(block, fn, fn.attributes.mutate);
            }
            else if (fn.attributes.defaultInstance) {
                blocks.addMutation(block, fn, blocks.MutatorTypes.DefaultInstanceMutator);
            }
            else if (fn.attributes._expandedDef && fn.attributes.expandableArgumentMode !== "disabled") {
                var shouldToggle = fn.attributes.expandableArgumentMode === "toggle";
                blocks.initExpandableBlock(block, fn.attributes._expandedDef, comp, shouldToggle, function () { return buildBlockFromDef(fn.attributes._expandedDef, true); });
            }
            else if (comp.handlerArgs.length) {
                /**
                 * We support three modes for handler parameters: variable dropdowns,
                 * expandable variable dropdowns with +/- buttons (used for chat commands),
                 * and as draggable variable blocks
                 */
                hasHandler = true;
                if (fn.attributes.optionalVariableArgs) {
                    blocks.initVariableArgsBlock(block, comp.handlerArgs);
                }
                else if (fn.attributes.draggableParameters) {
                    comp.handlerArgs.filter(function (a) { return !a.inBlockDef; }).forEach(function (arg) {
                        var i = block.appendValueInput("HANDLER_DRAG_PARAM_" + arg.name);
                        i.setCheck("Variable");
                    });
                }
                else {
                    var i_2 = block.appendDummyInput();
                    comp.handlerArgs.filter(function (a) { return !a.inBlockDef; }).forEach(function (arg) {
                        i_2.appendField(new Blockly.FieldVariable(arg.name), "HANDLER_" + arg.name);
                    });
                }
            }
            // Add mutation to save and restore custom field settings
            blocks.appendMutation(block, {
                mutationToDom: function (el) {
                    block.inputList.forEach(function (input) {
                        input.fieldRow.forEach(function (fieldRow) {
                            if (fieldRow.isFieldCustom_ && fieldRow.saveOptions) {
                                var getOptions = fieldRow.saveOptions();
                                el.setAttribute("customfield", JSON.stringify(getOptions));
                            }
                        });
                    });
                    return el;
                },
                domToMutation: function (saved) {
                    block.inputList.forEach(function (input) {
                        input.fieldRow.forEach(function (fieldRow) {
                            if (fieldRow.isFieldCustom_ && fieldRow.restoreOptions) {
                                var options_1 = JSON.parse(saved.getAttribute("customfield"));
                                fieldRow.restoreOptions(options_1);
                            }
                        });
                    });
                }
            });
            if (fn.attributes.imageLiteral) {
                var ri = block.appendDummyInput();
                ri.appendField(new pxtblockly.FieldMatrix("", { columns: fn.attributes.imageLiteral * 5 }), "LEDS");
            }
            if (fn.attributes.inlineInputMode === "external") {
                block.setInputsInline(false);
            }
            else if (fn.attributes.inlineInputMode === "inline") {
                block.setInputsInline(true);
            }
            else {
                block.setInputsInline(!fn.parameters || (fn.parameters.length < 4 && !fn.attributes.imageLiteral));
            }
            var body = fn.parameters ? fn.parameters.filter(function (pr) { return pr.type == "() => void" || pr.type == "Action"; })[0] : undefined;
            if (body || hasHandler) {
                block.appendStatementInput("HANDLER")
                    .setCheck("null");
                block.setInputsInline(true);
            }
            switch (fn.retType) {
                case "number":
                    block.setOutput(true, "Number");
                    break;
                case "string":
                    block.setOutput(true, "String");
                    break;
                case "boolean":
                    block.setOutput(true, "Boolean");
                    break;
                case "void": break; // do nothing
                //TODO
                default:
                    if (fn.retType !== "T") {
                        var opt_check = isArrayType(fn.retType) ? ["Array"] : [];
                        var si_r = info.apis.byQName[fn.retType];
                        if (si_r && si_r.extendsTypes && 0 < si_r.extendsTypes.length) {
                            opt_check.push.apply(opt_check, si_r.extendsTypes);
                        }
                        else {
                            opt_check.push(fn.retType);
                        }
                        block.setOutput(true, opt_check);
                    }
                    else {
                        block.setOutput(true);
                    }
            }
            // hook up/down if return value is void
            var hasHandlers = hasArrowFunction(fn);
            block.setPreviousStatement(!(hasHandlers && !fn.attributes.handlerStatement) && fn.retType == "void");
            block.setNextStatement(!(hasHandlers && !fn.attributes.handlerStatement) && fn.retType == "void");
            block.setTooltip(fn.attributes.jsDoc);
            function buildBlockFromDef(def, expanded) {
                if (expanded === void 0) { expanded = false; }
                var anonIndex = 0;
                var firstParam = !expanded && !!comp.thisParameter;
                var inputs = splitInputs(def);
                var imgConv = new ImageConverter();
                if (fn.attributes.shim === "ENUM_GET") {
                    if (comp.parameters.length > 1 || comp.thisParameter) {
                        console.warn("Enum blocks may only have 1 parameter but " + fn.attributes.blockId + " has " + comp.parameters.length);
                        return;
                    }
                }
                inputs.forEach(function (inputParts) {
                    var fields = [];
                    var inputName;
                    var inputCheck;
                    var hasParameter = false;
                    inputParts.forEach(function (part) {
                        if (part.kind !== "param") {
                            var f = newLabel(part);
                            if (f) {
                                fields.push({ field: f });
                            }
                        }
                        else if (fn.attributes.shim === "ENUM_GET") {
                            pxt.U.assert(!!fn.attributes.enumName, "Trying to create an ENUM_GET block without a valid enum name");
                            fields.push({
                                name: "MEMBER",
                                field: new pxtblockly.FieldUserEnum(info.enumsByName[fn.attributes.enumName])
                            });
                            return;
                        }
                        else {
                            // find argument
                            var pr_1 = getParameterFromDef(part, comp, firstParam);
                            firstParam = false;
                            if (!pr_1) {
                                console.error("block " + fn.attributes.blockId + ": unkown parameter " + part.name + (part.ref ? " (" + part.ref + ")" : ""));
                                return;
                            }
                            if (isHandlerArg(pr_1)) {
                                inputName = "HANDLER_DRAG_PARAM_" + pr_1.name;
                                inputCheck = "Variable";
                                return;
                            }
                            var typeInfo = pxt.U.lookup(info.apis.byQName, pr_1.type);
                            hasParameter = true;
                            var defName = pr_1.definitionName;
                            var actName = pr_1.actualName;
                            var isEnum = typeInfo && typeInfo.kind == pxtc.SymbolKind.Enum;
                            var isFixed = typeInfo && !!typeInfo.attributes.fixedInstances && !pr_1.shadowBlockId;
                            var isConstantShim = !!fn.attributes.constantShim;
                            var isCombined = pr_1.type == "@combined@";
                            var customField = pr_1.fieldEditor;
                            var fieldLabel = defName.charAt(0).toUpperCase() + defName.slice(1);
                            var fieldType = pr_1.type;
                            if (isEnum || isFixed || isConstantShim || isCombined) {
                                var syms = void 0;
                                if (isEnum) {
                                    syms = getEnumDropdownValues(info.apis, pr_1.type);
                                }
                                else if (isFixed) {
                                    syms = getFixedInstanceDropdownValues(info.apis, typeInfo.qName);
                                }
                                else if (isCombined) {
                                    syms = fn.combinedProperties.map(function (p) { return pxt.U.lookup(info.apis.byQName, p); });
                                }
                                else {
                                    syms = getConstantDropdownValues(info.apis, fn.qName);
                                }
                                if (syms.length == 0) {
                                    console.error("no instances of " + typeInfo.qName + " found");
                                }
                                var dd = syms.map(function (v) {
                                    var k = v.attributes.block || v.attributes.blockId || v.name;
                                    var comb = v.attributes.blockCombine;
                                    if (v.attributes.jresURL && !v.attributes.iconURL && pxt.U.startsWith(v.attributes.jresURL, "data:image/x-mkcd-f")) {
                                        v.attributes.iconURL = imgConv.convert(v.attributes.jresURL);
                                    }
                                    if (!!comb)
                                        k = k.replace(/@set/, "");
                                    return [
                                        v.attributes.iconURL || v.attributes.blockImage ? {
                                            src: v.attributes.iconURL || pxt.Util.pathJoin(pxt.webConfig.commitCdnUrl, "blocks/" + v.namespace.toLowerCase() + "/" + v.name.toLowerCase() + ".png"),
                                            alt: k,
                                            width: 36,
                                            height: 36,
                                            value: v.name
                                        } : k,
                                        v.namespace + "." + v.name
                                    ];
                                });
                                // if a value is provided, move it first
                                if (pr_1.defaultValue) {
                                    var shadowValueIndex_1 = -1;
                                    dd.some(function (v, i) {
                                        if (v[1] === pr_1.defaultValue) {
                                            shadowValueIndex_1 = i;
                                            return true;
                                        }
                                        return false;
                                    });
                                    if (shadowValueIndex_1 > -1) {
                                        var shadowValue = dd.splice(shadowValueIndex_1, 1)[0];
                                        dd.unshift(shadowValue);
                                    }
                                }
                                if (customField) {
                                    var defl = fn.attributes.paramDefl[actName] || "";
                                    var options_2 = {
                                        data: dd,
                                        colour: color,
                                        label: fieldLabel,
                                        type: fieldType,
                                        blocksInfo: info
                                    };
                                    pxt.Util.jsonMergeFrom(options_2, fn.attributes.paramFieldEditorOptions && fn.attributes.paramFieldEditorOptions[actName] || {});
                                    fields.push(namedField(blocks.createFieldEditor(customField, defl, options_2), defName));
                                }
                                else
                                    fields.push(namedField(new Blockly.FieldDropdown(dd), defName));
                            }
                            else if (customField) {
                                var defl = fn.attributes.paramDefl[pr_1.actualName] || "";
                                var options_3 = {
                                    colour: color,
                                    label: fieldLabel,
                                    type: fieldType,
                                    blocksInfo: info
                                };
                                pxt.Util.jsonMergeFrom(options_3, fn.attributes.paramFieldEditorOptions && fn.attributes.paramFieldEditorOptions[pr_1.actualName] || {});
                                fields.push(namedField(blocks.createFieldEditor(customField, defl, options_3), pr_1.definitionName));
                            }
                            else {
                                inputName = defName;
                                if (instance && part.name === "this") {
                                    inputCheck = pr_1.type;
                                }
                                else if (pr_1.type == "number") {
                                    if (pr_1.shadowBlockId && pr_1.shadowBlockId == "value") {
                                        inputName = undefined;
                                        fields.push(namedField(new Blockly.FieldTextInput("0", Blockly.FieldTextInput.numberValidator), defName));
                                    }
                                    else {
                                        inputCheck = "Number";
                                    }
                                }
                                else if (pr_1.type == "boolean") {
                                    inputCheck = "Boolean";
                                }
                                else if (pr_1.type == "string") {
                                    if (pr_1.shadowOptions && pr_1.shadowOptions.toString) {
                                        inputCheck = undefined;
                                    }
                                    else {
                                        inputCheck = "String";
                                    }
                                }
                                else {
                                    inputCheck = pr_1.type == "T" ? undefined : (isArrayType(pr_1.type) ? ["Array", pr_1.type] : pr_1.type);
                                }
                            }
                        }
                    });
                    var input;
                    if (inputName) {
                        input = block.appendValueInput(inputName);
                        input.setAlign(Blockly.ALIGN_LEFT);
                    }
                    else if (expanded) {
                        var prefix = hasParameter ? blocks.optionalInputWithFieldPrefix : blocks.optionalDummyInputPrefix;
                        input = block.appendDummyInput(prefix + (anonIndex++));
                    }
                    else {
                        input = block.appendDummyInput();
                    }
                    if (inputCheck) {
                        input.setCheck(inputCheck);
                    }
                    fields.forEach(function (f) { return input.appendField(f.field, f.name); });
                });
                imgConv.logTime();
            }
        }
        function getParameterFromDef(part, comp, isThis) {
            if (isThis === void 0) { isThis = false; }
            if (part.ref) {
                var result = (part.name === "this") ? comp.thisParameter : comp.actualNameToParam[part.name];
                if (!result) {
                    var ha_1;
                    comp.handlerArgs.forEach(function (arg) {
                        if (arg.name === part.name)
                            ha_1 = arg;
                    });
                    if (ha_1)
                        return ha_1;
                }
                return result;
            }
            else {
                return isThis ? comp.thisParameter : comp.definitionNameToParam[part.name];
            }
        }
        function isHandlerArg(arg) {
            return !arg.definitionName;
        }
        function hasArrowFunction(fn) {
            var r = fn.parameters
                ? fn.parameters.filter(function (pr) { return pr.type === "Action" || /^\([^\)]*\)\s*=>/.test(pr.type); })[0]
                : undefined;
            return !!r;
        }
        blocks.hasArrowFunction = hasArrowFunction;
        function cleanBlocks() {
            pxt.debug('removing all custom blocks');
            for (var b in cachedBlocks)
                removeBlock(cachedBlocks[b].fn);
        }
        blocks.cleanBlocks = cleanBlocks;
        /**
         * Used by pxtrunner to initialize blocks in the docs
         */
        function initializeAndInject(blockInfo) {
            init();
            injectBlocks(blockInfo);
        }
        blocks.initializeAndInject = initializeAndInject;
        /**
         * Used by main app to initialize blockly blocks.
         * Blocks are injected separately by called injectBlocks
         */
        function initialize(blockInfo) {
            init();
            initTooltip(blockInfo);
            initJresIcons(blockInfo);
        }
        blocks.initialize = initialize;
        var blocklyInitialized = false;
        function init() {
            if (blocklyInitialized)
                return;
            blocklyInitialized = true;
            goog.provide('Blockly.Blocks.device');
            goog.require('Blockly.Blocks');
            Blockly.FieldCheckbox.CHECK_CHAR = '■';
            Blockly.BlockSvg.START_HAT = !!pxt.appTarget.appTheme.blockHats;
            blocks.initFieldEditors();
            initContextMenu();
            initOnStart();
            initMath();
            initVariables();
            initFunctions();
            initLists();
            initLoops();
            initLogic();
            initText();
            initDrag();
            initDebugger();
            initComments();
        }
        function setBuiltinHelpInfo(block, id) {
            var info = pxt.blocks.getBlockDefinition(id);
            setHelpResources(block, id, info.name, info.tooltip, info.url, pxt.toolbox.getNamespaceColor(info.category));
        }
        function installBuiltinHelpInfo(id) {
            var info = pxt.blocks.getBlockDefinition(id);
            installHelpResources(id, info.name, info.tooltip, info.url, pxt.toolbox.getNamespaceColor(info.category));
        }
        function setHelpResources(block, id, name, tooltip, url, colour, colourSecondary, colourTertiary, undeletable) {
            if (tooltip && (typeof tooltip === "string" || typeof tooltip === "function"))
                block.setTooltip(tooltip);
            if (url)
                block.setHelpUrl(url);
            if (colour)
                block.setColour(colour, colourSecondary, colourTertiary);
            if (undeletable)
                block.setDeletable(false);
            var tb = document.getElementById('blocklyToolboxDefinition');
            var xml = tb ? blocks.getFirstChildWithAttr(tb, "block", "type", id) : undefined;
            block.codeCard = {
                header: name,
                name: name,
                software: 1,
                description: goog.isFunction(tooltip) ? tooltip(block) : tooltip,
                blocksXml: xml ? ("<xml xmlns=\"http://www.w3.org/1999/xhtml\">" + (cleanOuterHTML(xml) || "<block type=\"" + id + "\"></block>") + "</xml>") : undefined,
                url: url
            };
        }
        function installHelpResources(id, name, tooltip, url, colour, colourSecondary, colourTertiary) {
            var block = Blockly.Blocks[id];
            var old = block.init;
            if (!old)
                return;
            block.init = function () {
                old.call(this);
                var block = this;
                setHelpResources(this, id, name, tooltip, url, colour, colourSecondary, colourTertiary);
            };
        }
        blocks.installHelpResources = installHelpResources;
        function initLists() {
            var msg = Blockly.Msg;
            // lists_create_with
            var listsCreateWithId = "lists_create_with";
            var listsCreateWithDef = pxt.blocks.getBlockDefinition(listsCreateWithId);
            msg.LISTS_CREATE_EMPTY_TITLE = listsCreateWithDef.block["LISTS_CREATE_EMPTY_TITLE"];
            msg.LISTS_CREATE_WITH_INPUT_WITH = listsCreateWithDef.block["LISTS_CREATE_WITH_INPUT_WITH"];
            msg.LISTS_CREATE_WITH_CONTAINER_TITLE_ADD = listsCreateWithDef.block["LISTS_CREATE_WITH_CONTAINER_TITLE_ADD"];
            msg.LISTS_CREATE_WITH_ITEM_TITLE = listsCreateWithDef.block["LISTS_CREATE_WITH_ITEM_TITLE"];
            installBuiltinHelpInfo(listsCreateWithId);
            // lists_length
            var listsLengthId = "lists_length";
            var listsLengthDef = pxt.blocks.getBlockDefinition(listsLengthId);
            msg.LISTS_LENGTH_TITLE = listsLengthDef.block["LISTS_LENGTH_TITLE"];
            // We have to override this block definition because the builtin block
            // allows both Strings and Arrays in its input check and that confuses
            // our Blockly compiler
            var block = Blockly.Blocks[listsLengthId];
            block.init = function () {
                this.jsonInit({
                    "message0": msg.LISTS_LENGTH_TITLE,
                    "args0": [
                        {
                            "type": "input_value",
                            "name": "VALUE",
                            "check": ['Array']
                        }
                    ],
                    "output": 'Number',
                    "outputShape": Blockly.OUTPUT_SHAPE_ROUND
                });
            };
            installBuiltinHelpInfo(listsLengthId);
        }
        function initLoops() {
            var msg = Blockly.Msg;
            // controls_repeat_ext
            var controlsRepeatExtId = "controls_repeat_ext";
            var controlsRepeatExtDef = pxt.blocks.getBlockDefinition(controlsRepeatExtId);
            msg.CONTROLS_REPEAT_TITLE = controlsRepeatExtDef.block["CONTROLS_REPEAT_TITLE"];
            msg.CONTROLS_REPEAT_INPUT_DO = controlsRepeatExtDef.block["CONTROLS_REPEAT_INPUT_DO"];
            installBuiltinHelpInfo(controlsRepeatExtId);
            // device_while
            var deviceWhileId = "device_while";
            var deviceWhileDef = pxt.blocks.getBlockDefinition(deviceWhileId);
            Blockly.Blocks[deviceWhileId] = {
                init: function () {
                    this.jsonInit({
                        "message0": deviceWhileDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "COND",
                                "check": "Boolean"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.getNamespaceColor('loops')
                    });
                    this.appendStatementInput("DO")
                        .appendField(deviceWhileDef.block["appendField"]);
                    setBuiltinHelpInfo(this, deviceWhileId);
                }
            };
            // pxt_controls_for
            var pxtControlsForId = "pxt_controls_for";
            var pxtControlsForDef = pxt.blocks.getBlockDefinition(pxtControlsForId);
            Blockly.Blocks[pxtControlsForId] = {
                /**
                 * Block for 'for' loop.
                 * @this Blockly.Block
                 */
                init: function () {
                    this.jsonInit({
                        "message0": pxtControlsForDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "VAR",
                                "variable": pxtControlsForDef.block["variable"],
                                "check": "Variable"
                            },
                            {
                                "type": "input_value",
                                "name": "TO",
                                "check": "Number"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.getNamespaceColor('loops'),
                        "inputsInline": true
                    });
                    this.appendStatementInput('DO')
                        .appendField(pxtControlsForDef.block["appendField"]);
                    var thisBlock = this;
                    setHelpResources(this, pxtControlsForId, pxtControlsForDef.name, function () {
                        return pxt.U.rlf(pxtControlsForDef.tooltip, thisBlock.getInputTargetBlock('VAR') ? thisBlock.getInputTargetBlock('VAR').getField('VAR').getText() : '');
                    }, pxtControlsForDef.url, String(pxt.toolbox.getNamespaceColor('loops')));
                },
                /**
                 * Return all variables referenced by this block.
                 * @return {!Array.<string>} List of variable names.
                 * @this Blockly.Block
                 */
                getVars: function () {
                    return [this.getField('VAR').getText()];
                },
                /**
                 * Notification that a variable is renaming.
                 * If the name matches one of this block's variables, rename it.
                 * @param {string} oldName Previous name of variable.
                 * @param {string} newName Renamed variable.
                 * @this Blockly.Block
                 */
                renameVar: function (oldName, newName) {
                    var varField = this.getField('VAR');
                    if (Blockly.Names.equals(oldName, varField.getText())) {
                        varField.setText(newName);
                    }
                },
                /**
                 * Add menu option to create getter block for loop variable.
                 * @param {!Array} options List of menu options to add to.
                 * @this Blockly.Block
                 */
                customContextMenu: function (options) {
                    if (!this.isCollapsed()) {
                        var option = { enabled: true };
                        option.text = lf("Create 'get {0}'", name);
                        var xmlField = goog.dom.createDom('field', null, name);
                        xmlField.setAttribute('name', 'VAR');
                        var xmlBlock = goog.dom.createDom('block', null, xmlField);
                        xmlBlock.setAttribute('type', 'variables_get');
                        option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
                        options.push(option);
                    }
                }
            };
            // controls_simple_for
            var controlsSimpleForId = "controls_simple_for";
            var controlsSimpleForDef = pxt.blocks.getBlockDefinition(controlsSimpleForId);
            Blockly.Blocks[controlsSimpleForId] = {
                /**
                 * Block for 'for' loop.
                 * @this Blockly.Block
                 */
                init: function () {
                    this.jsonInit({
                        "message0": controlsSimpleForDef.block["message0"],
                        "args0": [
                            {
                                "type": "field_variable",
                                "name": "VAR",
                                "variable": controlsSimpleForDef.block["variable"]
                                // Please note that most multilingual characters
                                // cannot be used as variable name at this point.
                                // Translate or decide the default variable name
                                // with care.
                            },
                            {
                                "type": "input_value",
                                "name": "TO",
                                "check": "Number"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.getNamespaceColor('loops'),
                        "inputsInline": true
                    });
                    this.appendStatementInput('DO')
                        .appendField(controlsSimpleForDef.block["appendField"]);
                    var thisBlock = this;
                    setHelpResources(this, controlsSimpleForId, controlsSimpleForDef.name, function () {
                        return pxt.U.rlf(controlsSimpleForDef.tooltip, thisBlock.getField('VAR').getText());
                    }, controlsSimpleForDef.url, String(pxt.toolbox.getNamespaceColor('loops')));
                },
                /**
                 * Return all variables referenced by this block.
                 * @return {!Array.<string>} List of variable names.
                 * @this Blockly.Block
                 */
                getVars: function () {
                    return [this.getField('VAR').getText()];
                },
                /**
                 * Notification that a variable is renaming.
                 * If the name matches one of this block's variables, rename it.
                 * @param {string} oldName Previous name of variable.
                 * @param {string} newName Renamed variable.
                 * @this Blockly.Block
                 */
                renameVar: function (oldName, newName) {
                    var varField = this.getField('VAR');
                    if (Blockly.Names.equals(oldName, varField.getText())) {
                        varField.setText(newName);
                    }
                },
                /**
                 * Add menu option to create getter block for loop variable.
                 * @param {!Array} options List of menu options to add to.
                 * @this Blockly.Block
                 */
                customContextMenu: function (options) {
                    if (!this.isCollapsed()) {
                        var option = { enabled: true };
                        var name_1 = this.getField('VAR').getText();
                        option.text = lf("Create 'get {0}'", name_1);
                        var xmlField = goog.dom.createDom('field', null, name_1);
                        xmlField.setAttribute('name', 'VAR');
                        var xmlBlock = goog.dom.createDom('block', null, xmlField);
                        xmlBlock.setAttribute('type', 'variables_get');
                        option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
                        options.push(option);
                    }
                }
            };
        }
        blocks.onShowContextMenu = undefined;
        /**
         * The following patch to blockly is to add the Trash icon on top of the toolbox,
         * the trash icon should only show when a user drags a block that is already in the workspace.
         */
        function initDrag() {
            var calculateDistance = function (elemBounds, mouseX) {
                return Math.abs(mouseX - (elemBounds.left + (elemBounds.width / 2)));
            };
            /**
             * Execute a step of block dragging, based on the given event.  Update the
             * display accordingly.
             * @param {!Event} e The most recent move event.
             * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
             *     moved from the position at the start of the drag, in pixel units.
             * @package
             */
            var blockDrag = Blockly.BlockDragger.prototype.dragBlock;
            Blockly.BlockDragger.prototype.dragBlock = function (e, currentDragDeltaXY) {
                var blocklyToolboxDiv = document.getElementsByClassName('blocklyToolboxDiv')[0];
                var blocklyTreeRoot = document.getElementsByClassName('blocklyTreeRoot')[0];
                var trashIcon = document.getElementById("blocklyTrashIcon");
                if (blocklyTreeRoot && trashIcon) {
                    var distance = calculateDistance(blocklyTreeRoot.getBoundingClientRect(), e.clientX);
                    if (distance < 200) {
                        var opacity = distance / 200;
                        trashIcon.style.opacity = "" + (1 - opacity);
                        trashIcon.style.display = 'block';
                        blocklyTreeRoot.style.opacity = "" + opacity;
                        if (distance < 50) {
                            blocklyToolboxDiv.classList.add('blocklyToolboxDeleting');
                        }
                    }
                    else {
                        trashIcon.style.display = 'none';
                        blocklyTreeRoot.style.opacity = '1';
                        blocklyToolboxDiv.classList.remove('blocklyToolboxDeleting');
                    }
                }
                return blockDrag.call(this, e, currentDragDeltaXY);
            };
            /**
             * Finish dragging the workspace and put everything back where it belongs.
             * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
             *     moved from the position at the start of the drag, in pixel coordinates.
             * @package
             */
            var blockEndDrag = Blockly.BlockDragger.prototype.endBlockDrag;
            Blockly.BlockDragger.prototype.endBlockDrag = function (e, currentDragDeltaXY) {
                blockEndDrag.call(this, e, currentDragDeltaXY);
                var blocklyToolboxDiv = document.getElementsByClassName('blocklyToolboxDiv')[0];
                var blocklyTreeRoot = document.getElementsByClassName('blocklyTreeRoot')[0];
                var trashIcon = document.getElementById("blocklyTrashIcon");
                if (trashIcon && blocklyTreeRoot) {
                    trashIcon.style.display = 'none';
                    blocklyTreeRoot.style.opacity = '1';
                    blocklyToolboxDiv.classList.remove('blocklyToolboxDeleting');
                }
            };
        }
        function initContextMenu() {
            // Translate the context menu for blocks.
            var msg = Blockly.Msg;
            msg.DUPLICATE_BLOCK = lf("{id:block}Duplicate");
            msg.REMOVE_COMMENT = lf("Remove Comment");
            msg.ADD_COMMENT = lf("Add Comment");
            msg.EXTERNAL_INPUTS = lf("External Inputs");
            msg.INLINE_INPUTS = lf("Inline Inputs");
            msg.EXPAND_BLOCK = lf("Expand Block");
            msg.COLLAPSE_BLOCK = lf("Collapse Block");
            msg.ENABLE_BLOCK = lf("Enable Block");
            msg.DISABLE_BLOCK = lf("Disable Block");
            msg.DELETE_BLOCK = lf("Delete Block");
            msg.DELETE_X_BLOCKS = lf("Delete Blocks");
            msg.DELETE_ALL_BLOCKS = lf("Delete All Blocks");
            msg.HELP = lf("Help");
            // inject hook to handle openings docs
            Blockly.BlockSvg.prototype.showHelp_ = function () {
                var url = goog.isFunction(this.helpUrl) ? this.helpUrl() : this.helpUrl;
                if (url)
                    (pxt.blocks.openHelpUrl || window.open)(url);
            };
            /**
             * Show the context menu for the workspace.
             * @param {!Event} e Mouse event.
             * @private
             */
            Blockly.WorkspaceSvg.prototype.showContextMenu_ = function (e) {
                var _this = this;
                if (this.options.readOnly || this.isFlyout) {
                    return;
                }
                var menuOptions = [];
                var topBlocks = this.getTopBlocks(true);
                var eventGroup = Blockly.utils.genUid();
                var ws = this;
                // Option to add a workspace comment.
                if (this.options.comments && !pxt.BrowserUtils.isIE()) {
                    menuOptions.push(Blockly.ContextMenu.workspaceCommentOption(ws, e));
                }
                // Add a little animation to collapsing and expanding.
                var DELAY = 10;
                if (this.options.collapse) {
                    var hasCollapsedBlocks = false;
                    var hasExpandedBlocks = false;
                    for (var i = 0; i < topBlocks.length; i++) {
                        var block = topBlocks[i];
                        while (block) {
                            if (block.isCollapsed()) {
                                hasCollapsedBlocks = true;
                            }
                            else {
                                hasExpandedBlocks = true;
                            }
                            block = block.getNextBlock();
                        }
                    }
                    /**
                     * Option to collapse or expand top blocks.
                     * @param {boolean} shouldCollapse Whether a block should collapse.
                     * @private
                     */
                    var toggleOption_1 = function (shouldCollapse) {
                        var ms = 0;
                        for (var i = 0; i < topBlocks.length; i++) {
                            var block = topBlocks[i];
                            while (block) {
                                setTimeout(block.setCollapsed.bind(block, shouldCollapse), ms);
                                block = block.getNextBlock();
                                ms += DELAY;
                            }
                        }
                    };
                    // Option to collapse top blocks.
                    var collapseOption = { enabled: hasExpandedBlocks };
                    collapseOption.text = lf("Collapse Block");
                    collapseOption.callback = function () {
                        pxt.tickEvent("blocks.context.collapse");
                        toggleOption_1(true);
                    };
                    menuOptions.push(collapseOption);
                    // Option to expand top blocks.
                    var expandOption = { enabled: hasCollapsedBlocks };
                    expandOption.text = lf("Expand Block");
                    expandOption.callback = function () {
                        pxt.tickEvent("blocks.context.expand");
                        toggleOption_1(false);
                    };
                    menuOptions.push(expandOption);
                }
                // Option to delete all blocks.
                // Count the number of blocks that are deletable.
                var deleteList = Blockly.WorkspaceSvg.buildDeleteList_(topBlocks);
                var deleteCount = 0;
                for (var i = 0; i < deleteList.length; i++) {
                    if (!deleteList[i].isShadow()) {
                        deleteCount++;
                    }
                }
                function deleteNext() {
                    Blockly.Events.setGroup(eventGroup);
                    var block = deleteList.shift();
                    if (block) {
                        if (block.workspace) {
                            block.dispose(false, true);
                            setTimeout(deleteNext, DELAY);
                        }
                        else {
                            deleteNext();
                        }
                    }
                    Blockly.Events.setGroup(false);
                }
                var deleteOption = {
                    text: deleteCount == 1 ? msg.DELETE_BLOCK : msg.DELETE_ALL_BLOCKS,
                    enabled: deleteCount > 0,
                    callback: function () {
                        pxt.tickEvent("blocks.context.delete", undefined, { interactiveConsent: true });
                        if (deleteCount < 2) {
                            deleteNext();
                        }
                        else {
                            Blockly.confirm(lf("Delete all {0} blocks?", deleteCount), function (ok) {
                                if (ok) {
                                    deleteNext();
                                }
                            });
                        }
                    }
                };
                menuOptions.push(deleteOption);
                var formatCodeOption = {
                    text: lf("Format Code"),
                    enabled: true,
                    callback: function () {
                        pxt.tickEvent("blocks.context.format", undefined, { interactiveConsent: true });
                        pxt.blocks.layout.flow(_this, { useViewWidth: true });
                    }
                };
                menuOptions.push(formatCodeOption);
                if (pxt.blocks.layout.screenshotEnabled()) {
                    var screenshotOption = {
                        text: lf("Download Screenshot"),
                        enabled: topBlocks.length > 0,
                        callback: function () {
                            pxt.tickEvent("blocks.context.screenshot", undefined, { interactiveConsent: true });
                            pxt.blocks.layout.screenshotAsync(_this)
                                .done(function (uri) {
                                if (pxt.BrowserUtils.isSafari())
                                    uri = uri.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
                                pxt.BrowserUtils.browserDownloadDataUri(uri, (pxt.appTarget.nickname || pxt.appTarget.id) + "-" + lf("screenshot") + ".png");
                            });
                        }
                    };
                    menuOptions.push(screenshotOption);
                }
                // custom options...
                if (blocks.onShowContextMenu)
                    blocks.onShowContextMenu(this, menuOptions);
                Blockly.ContextMenu.show(e, menuOptions, this.RTL);
            };
            // We override Blockly's category mouse event handler so that only one
            // category can be expanded at a time. Also prevent categories from toggling
            // once openend.
            Blockly.Toolbox.TreeNode.prototype.onClick_ = function (a) {
                // Expand icon.
                var that = this;
                if (!that.isSelected()) {
                    // Collapse the currently selected node and its parent nodes
                    collapseSubcategories(that.getTree().getSelectedItem(), that);
                }
                if (that.hasChildren() && that.isUserCollapsible_) {
                    if (that.isSelected()) {
                        collapseSubcategories(that.getTree().getSelectedItem(), that);
                        that.getTree().setSelectedItem(null);
                    }
                    else {
                        that.setExpanded(true);
                        that.select();
                    }
                }
                else if (that.isSelected()) {
                    that.getTree().setSelectedItem(null);
                }
                else {
                    that.select();
                }
                that.updateRow();
            };
            // We also must override this handler to handle the case where no category is selected (e.g. clicking outside the toolbox)
            var oldSetSelectedItem = Blockly.Toolbox.TreeControl.prototype.setSelectedItem;
            var editor = this;
            Blockly.Toolbox.TreeControl.prototype.setSelectedItem = function (a) {
                var that = this;
                var toolbox = that.toolbox_;
                if (a == that.selectedItem_ || a == toolbox.tree_) {
                    return;
                }
                var oldSelectedItem = that.selectedItem_;
                oldSetSelectedItem.call(that, a);
                if (a === null) {
                    collapseSubcategories(oldSelectedItem);
                }
            };
            // Get rid of bumping behavior
            Blockly.Constants.Logic.LOGIC_COMPARE_ONCHANGE_MIXIN.onchange = function () { };
        }
        function initOnStart() {
            // on_start
            var onStartDef = pxt.blocks.getBlockDefinition(ts.pxtc.ON_START_TYPE);
            Blockly.Blocks[ts.pxtc.ON_START_TYPE] = {
                init: function () {
                    this.jsonInit({
                        "message0": onStartDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_dummy"
                            },
                            {
                                "type": "input_statement",
                                "name": "HANDLER"
                            }
                        ],
                        "colour": (pxt.appTarget.runtime ? pxt.appTarget.runtime.onStartColor : '') || pxt.toolbox.getNamespaceColor('loops')
                    });
                    setHelpResources(this, ts.pxtc.ON_START_TYPE, onStartDef.name, onStartDef.tooltip, onStartDef.url, String((pxt.appTarget.runtime ? pxt.appTarget.runtime.onStartColor : '') || pxt.toolbox.getNamespaceColor('loops')), undefined, undefined, pxt.appTarget.runtime ? pxt.appTarget.runtime.onStartUnDeletable : false);
                }
            };
            Blockly.Blocks[pxtc.TS_STATEMENT_TYPE] = {
                init: function () {
                    var _this = this;
                    var that = this;
                    that.setColour("#717171");
                    that.setPreviousStatement(true);
                    that.setNextStatement(true);
                    that.setInputsInline(false);
                    this.domToMutation = function (element) {
                        var n = parseInt(element.getAttribute("numlines"));
                        _this.declaredVariables = element.getAttribute("declaredvars");
                        for (var i = 0; i < n; i++) {
                            var line = element.getAttribute("line" + i);
                            that.appendDummyInput().appendField(line, "LINE" + i);
                        }
                    };
                    this.mutationToDom = function () {
                        var mutation = document.createElement("mutation");
                        var i = 0;
                        while (true) {
                            var val = that.getFieldValue("LINE" + i);
                            if (val === null) {
                                break;
                            }
                            mutation.setAttribute("line" + i, val);
                            i++;
                        }
                        mutation.setAttribute("numlines", i.toString());
                        if (_this.declaredVariables) {
                            mutation.setAttribute("declaredvars", _this.declaredVariables);
                        }
                        return mutation;
                    };
                    that.setEditable(false);
                    setHelpResources(this, pxtc.TS_STATEMENT_TYPE, lf("JavaScript statement"), lf("A JavaScript statement that could not be converted to blocks"), '/blocks/javascript-blocks', '#717171');
                }
            };
            Blockly.Blocks[pxtc.TS_OUTPUT_TYPE] = {
                init: function () {
                    var that = this;
                    that.setColour("#717171");
                    that.setPreviousStatement(false);
                    that.setNextStatement(false);
                    that.setOutput(true);
                    that.setEditable(false);
                    that.appendDummyInput().appendField(new pxtblockly.FieldTsExpression(""), "EXPRESSION");
                    setHelpResources(that, pxtc.TS_OUTPUT_TYPE, lf("JavaScript expression"), lf("A JavaScript expression that could not be converted to blocks"), '/blocks/javascript-blocks', "#717171");
                }
            };
            if (pxt.appTarget.runtime && pxt.appTarget.runtime.pauseUntilBlock) {
                var blockOptions_1 = pxt.appTarget.runtime.pauseUntilBlock;
                var blockDef_1 = pxt.blocks.getBlockDefinition(ts.pxtc.PAUSE_UNTIL_TYPE);
                Blockly.Blocks[pxtc.PAUSE_UNTIL_TYPE] = {
                    init: function () {
                        var color = blockOptions_1.color || pxt.toolbox.getNamespaceColor('loops');
                        this.jsonInit({
                            "message0": blockDef_1.block["message0"],
                            "args0": [
                                {
                                    "type": "input_value",
                                    "name": "PREDICATE",
                                    "check": "Boolean"
                                }
                            ],
                            "inputsInline": true,
                            "previousStatement": null,
                            "nextStatement": null,
                            "colour": color
                        });
                        setHelpResources(this, ts.pxtc.PAUSE_UNTIL_TYPE, blockDef_1.name, blockDef_1.tooltip, blockDef_1.url, color, undefined /*colourSecondary*/, undefined /*colourTertiary*/, false /*undeletable*/);
                    }
                };
            }
            // pxt_controls_for_of
            var pxtControlsForOfId = "pxt_controls_for_of";
            var pxtControlsForOfDef = pxt.blocks.getBlockDefinition(pxtControlsForOfId);
            Blockly.Blocks[pxtControlsForOfId] = {
                init: function () {
                    this.jsonInit({
                        "message0": pxtControlsForOfDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "VAR",
                                "variable": pxtControlsForOfDef.block["variable"],
                                "check": "Variable"
                            },
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.blockColors['loops'],
                        "inputsInline": true
                    });
                    this.appendStatementInput('DO')
                        .appendField(pxtControlsForOfDef.block["appendField"]);
                    var thisBlock = this;
                    setHelpResources(this, pxtControlsForOfId, pxtControlsForOfDef.name, function () {
                        return pxt.U.rlf(pxtControlsForOfDef.tooltip, thisBlock.getInputTargetBlock('VAR') ? thisBlock.getInputTargetBlock('VAR').getField('VAR').getText() : '');
                    }, pxtControlsForOfDef.url, String(pxt.toolbox.getNamespaceColor('loops')));
                }
            };
            // controls_for_of
            var controlsForOfId = "controls_for_of";
            var controlsForOfDef = pxt.blocks.getBlockDefinition(controlsForOfId);
            Blockly.Blocks[controlsForOfId] = {
                init: function () {
                    this.jsonInit({
                        "message0": controlsForOfDef.block["message0"],
                        "args0": [
                            {
                                "type": "field_variable",
                                "name": "VAR",
                                "variable": controlsForOfDef.block["variable"]
                                // Please note that most multilingual characters
                                // cannot be used as variable name at this point.
                                // Translate or decide the default variable name
                                // with care.
                            },
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.blockColors['loops'],
                        "inputsInline": true
                    });
                    this.appendStatementInput('DO')
                        .appendField(controlsForOfDef.block["appendField"]);
                    var thisBlock = this;
                    setHelpResources(this, controlsForOfId, controlsForOfDef.name, function () {
                        return pxt.U.rlf(controlsForOfDef.tooltip, thisBlock.getField('VAR').getText());
                    }, controlsForOfDef.url, String(pxt.toolbox.getNamespaceColor('loops')));
                }
            };
            // lists_index_get
            var listsIndexGetId = "lists_index_get";
            var listsIndexGetDef = pxt.blocks.getBlockDefinition(listsIndexGetId);
            Blockly.Blocks["lists_index_get"] = {
                init: function () {
                    this.jsonInit({
                        "message0": listsIndexGetDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            },
                            {
                                "type": "input_value",
                                "name": "INDEX",
                                "check": "Number"
                            }
                        ],
                        "colour": pxt.toolbox.blockColors['arrays'],
                        "outputShape": Blockly.OUTPUT_SHAPE_ROUND,
                        "inputsInline": true
                    });
                    this.setPreviousStatement(false);
                    this.setNextStatement(false);
                    this.setOutput(true);
                    setBuiltinHelpInfo(this, listsIndexGetId);
                }
            };
            // lists_index_set
            var listsIndexSetId = "lists_index_set";
            var listsIndexSetDef = pxt.blocks.getBlockDefinition(listsIndexSetId);
            Blockly.Blocks[listsIndexSetId] = {
                init: function () {
                    this.jsonInit({
                        "message0": listsIndexSetDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            },
                            {
                                "type": "input_value",
                                "name": "INDEX",
                                "check": "Number"
                            },
                            {
                                "type": "input_value",
                                "name": "VALUE",
                                "check": null
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.blockColors['arrays'],
                        "inputsInline": true
                    });
                    setBuiltinHelpInfo(this, listsIndexSetId);
                }
            };
        }
        function initMath() {
            // math_op2
            var mathOp2Id = "math_op2";
            var mathOp2Def = pxt.blocks.getBlockDefinition(mathOp2Id);
            var mathOp2Tooltips = mathOp2Def.tooltip;
            Blockly.Blocks[mathOp2Id] = {
                init: function () {
                    this.jsonInit({
                        "message0": lf("%1 of %2 and %3"),
                        "args0": [
                            {
                                "type": "field_dropdown",
                                "name": "op",
                                "options": [
                                    [lf("{id:op}min"), "min"],
                                    [lf("{id:op}max"), "max"]
                                ]
                            },
                            {
                                "type": "input_value",
                                "name": "x",
                                "check": "Number"
                            },
                            {
                                "type": "input_value",
                                "name": "y",
                                "check": "Number"
                            }
                        ],
                        "inputsInline": true,
                        "output": "Number",
                        "outputShape": Blockly.OUTPUT_SHAPE_ROUND,
                        "colour": pxt.toolbox.getNamespaceColor('math')
                    });
                    var thisBlock = this;
                    setHelpResources(this, mathOp2Id, mathOp2Def.name, function (block) {
                        return mathOp2Tooltips[block.getFieldValue('op')];
                    }, mathOp2Def.url, pxt.toolbox.getNamespaceColor(mathOp2Def.category));
                }
            };
            // math_op3
            var mathOp3Id = "math_op3";
            var mathOp3Def = pxt.blocks.getBlockDefinition(mathOp3Id);
            Blockly.Blocks[mathOp3Id] = {
                init: function () {
                    this.jsonInit({
                        "message0": mathOp3Def.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "x",
                                "check": "Number"
                            }
                        ],
                        "inputsInline": true,
                        "output": "Number",
                        "outputShape": Blockly.OUTPUT_SHAPE_ROUND,
                        "colour": pxt.toolbox.getNamespaceColor('math')
                    });
                    setBuiltinHelpInfo(this, mathOp3Id);
                }
            };
            // builtin math_number, math_integer, math_whole_number, math_number_minmax
            //XXX Integer validation needed.
            var numberBlocks = ['math_number', 'math_integer', 'math_whole_number', 'math_number_minmax'];
            numberBlocks.forEach(function (num_id) {
                var mInfo = pxt.blocks.getBlockDefinition(num_id);
                installHelpResources(num_id, mInfo.name, mInfo.tooltip, mInfo.url, Blockly.Colours.textField, Blockly.Colours.textField, Blockly.Colours.textField);
            });
            // builtin math_arithmetic
            var msg = Blockly.Msg;
            var mathArithmeticId = "math_arithmetic";
            var mathArithmeticDef = pxt.blocks.getBlockDefinition(mathArithmeticId);
            var mathArithmeticTooltips = mathArithmeticDef.tooltip;
            msg.MATH_ADDITION_SYMBOL = mathArithmeticDef.block["MATH_ADDITION_SYMBOL"];
            msg.MATH_SUBTRACTION_SYMBOL = mathArithmeticDef.block["MATH_SUBTRACTION_SYMBOL"];
            msg.MATH_MULTIPLICATION_SYMBOL = mathArithmeticDef.block["MATH_MULTIPLICATION_SYMBOL"];
            msg.MATH_DIVISION_SYMBOL = mathArithmeticDef.block["MATH_DIVISION_SYMBOL"];
            msg.MATH_POWER_SYMBOL = mathArithmeticDef.block["MATH_POWER_SYMBOL"];
            installHelpResources(mathArithmeticId, mathArithmeticDef.name, function (block) {
                return mathArithmeticTooltips[block.getFieldValue('OP')];
            }, mathArithmeticDef.url, pxt.toolbox.getNamespaceColor(mathArithmeticDef.category));
            // builtin math_modulo
            var mathModuloId = "math_modulo";
            var mathModuloDef = pxt.blocks.getBlockDefinition(mathModuloId);
            msg.MATH_MODULO_TITLE = mathModuloDef.block["MATH_MODULO_TITLE"];
            installBuiltinHelpInfo(mathModuloId);
            blocks.initMathOpBlock();
            blocks.initMathRoundBlock();
        }
        function initVariables() {
            // We only give types to "special" variables like enum members and we don't
            // want those showing up in the variable dropdown so filter the variables
            // that show up to only ones that have an empty type
            Blockly.FieldVariable.prototype.getVariableTypes_ = function () { return [""]; };
            var varname = lf("{id:var}item");
            Blockly.Variables.flyoutCategory = function (workspace) {
                var xmlList = [];
                if (!pxt.appTarget.appTheme.hideFlyoutHeadings) {
                    // Add the Heading label
                    var headingLabel = createFlyoutHeadingLabel(lf("Variables"), pxt.toolbox.getNamespaceColor('variables'), pxt.toolbox.getNamespaceIcon('variables'));
                    xmlList.push(headingLabel);
                }
                var button = goog.dom.createDom('button');
                button.setAttribute('text', lf("Make a Variable..."));
                button.setAttribute('callbackkey', 'CREATE_VARIABLE');
                workspace.registerButtonCallback('CREATE_VARIABLE', function (button) {
                    Blockly.Variables.createVariable(button.getTargetWorkspace());
                });
                xmlList.push(button);
                var blockList = Blockly.Variables.flyoutCategoryBlocks(workspace);
                xmlList = xmlList.concat(blockList);
                return xmlList;
            };
            Blockly.Variables.flyoutCategoryBlocks = function (workspace) {
                var variableModelList = workspace.getVariablesOfType('');
                var xmlList = [];
                if (variableModelList.length > 0) {
                    var mostRecentVariable = variableModelList[variableModelList.length - 1];
                    variableModelList.sort(Blockly.VariableModel.compareByName);
                    // variables getters first
                    for (var i = 0; i < variableModelList.length; i++) {
                        var variable = variableModelList[i];
                        if (Blockly.Blocks['variables_get']) {
                            var blockText = '<xml>' +
                                '<block type="variables_get" gap="8">' +
                                Blockly.Variables.generateVariableFieldXmlString(variable) +
                                '</block>' +
                                '</xml>';
                            var block = Blockly.Xml.textToDom(blockText).firstChild;
                            xmlList.push(block);
                        }
                    }
                    xmlList[xmlList.length - 1].setAttribute('gap', '24');
                    if (Blockly.Blocks['variables_set']) {
                        var gap = Blockly.Blocks['variables_change'] ? 8 : 24;
                        var blockText = '<xml>' +
                            '<block type="variables_set" gap="' + gap + '">' +
                            Blockly.Variables.generateVariableFieldXmlString(mostRecentVariable) +
                            '</block>' +
                            '</xml>';
                        var block = Blockly.Xml.textToDom(blockText).firstChild;
                        {
                            var value = goog.dom.createDom('value');
                            value.setAttribute('name', 'VALUE');
                            var shadow = goog.dom.createDom('shadow');
                            shadow.setAttribute("type", "math_number");
                            value.appendChild(shadow);
                            var field = goog.dom.createDom('field');
                            field.setAttribute('name', 'NUM');
                            field.appendChild(document.createTextNode("0"));
                            shadow.appendChild(field);
                            block.appendChild(value);
                        }
                        xmlList.push(block);
                    }
                    if (Blockly.Blocks['variables_change']) {
                        var gap = Blockly.Blocks['variables_get'] ? 20 : 8;
                        var blockText = '<xml>' +
                            '<block type="variables_change" gap="' + gap + '">' +
                            Blockly.Variables.generateVariableFieldXmlString(mostRecentVariable) +
                            '<value name="DELTA">' +
                            '<shadow type="math_number">' +
                            '<field name="NUM">1</field>' +
                            '</shadow>' +
                            '</value>' +
                            '</block>' +
                            '</xml>';
                        var block = Blockly.Xml.textToDom(blockText).firstChild;
                        {
                            var value = goog.dom.createDom('value');
                            value.setAttribute('name', 'VALUE');
                            var shadow = goog.dom.createDom('shadow');
                            shadow.setAttribute("type", "math_number");
                            value.appendChild(shadow);
                            var field = goog.dom.createDom('field');
                            field.setAttribute('name', 'NUM');
                            field.appendChild(document.createTextNode("1"));
                            shadow.appendChild(field);
                            block.appendChild(value);
                        }
                        xmlList.push(block);
                    }
                }
                return xmlList;
            };
            // builtin variables_get
            var msg = Blockly.Msg;
            var variablesGetId = "variables_get";
            var variablesGetDef = pxt.blocks.getBlockDefinition(variablesGetId);
            msg.VARIABLES_GET_CREATE_SET = variablesGetDef.block["VARIABLES_GET_CREATE_SET"];
            installBuiltinHelpInfo(variablesGetId);
            var variablesReporterGetId = "variables_get_reporter";
            installBuiltinHelpInfo(variablesReporterGetId);
            // Dropdown menu of variables_get
            msg.RENAME_VARIABLE = lf("Rename variable...");
            msg.DELETE_VARIABLE = lf("Delete the \"%1\" variable");
            msg.DELETE_VARIABLE_CONFIRMATION = lf("Delete %1 uses of the \"%2\" variable?");
            // builtin variables_set
            var variablesSetId = "variables_set";
            var variablesSetDef = pxt.blocks.getBlockDefinition(variablesSetId);
            msg.VARIABLES_SET = variablesSetDef.block["VARIABLES_SET"];
            msg.VARIABLES_DEFAULT_NAME = varname;
            msg.VARIABLES_SET_CREATE_GET = lf("Create 'get %1'");
            installBuiltinHelpInfo(variablesSetId);
            // pxt variables_change
            var variablesChangeId = "variables_change";
            var variablesChangeDef = pxt.blocks.getBlockDefinition(variablesChangeId);
            Blockly.Blocks[variablesChangeId] = {
                init: function () {
                    this.jsonInit({
                        "message0": variablesChangeDef.block["message0"],
                        "args0": [
                            {
                                "type": "field_variable",
                                "name": "VAR",
                                "variable": varname
                            },
                            {
                                "type": "input_value",
                                "name": "VALUE",
                                "check": "Number"
                            }
                        ],
                        "inputsInline": true,
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": pxt.toolbox.getNamespaceColor('variables')
                    });
                    setBuiltinHelpInfo(this, variablesChangeId);
                }
            };
            // New variable dialog
            msg.NEW_VARIABLE_TITLE = lf("New variable name:");
        }
        function initFunctions() {
            var msg = Blockly.Msg;
            // builtin procedures_defnoreturn
            var proceduresDefId = "procedures_defnoreturn";
            var proceduresDef = pxt.blocks.getBlockDefinition(proceduresDefId);
            msg.PROCEDURES_DEFNORETURN_TITLE = proceduresDef.block["PROCEDURES_DEFNORETURN_TITLE"];
            msg.PROCEDURE_ALREADY_EXISTS = proceduresDef.block["PROCEDURE_ALREADY_EXISTS"];
            Blockly.Blocks['procedures_defnoreturn'].init = function () {
                var nameField = new Blockly.FieldTextInput('', Blockly.Procedures.rename);
                //nameField.setSpellcheck(false); //TODO
                this.appendDummyInput()
                    .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE)
                    .appendField(nameField, 'NAME')
                    .appendField('', 'PARAMS');
                this.setColour(pxt.toolbox.getNamespaceColor('functions'));
                this.arguments_ = [];
                this.argumentVarModels_ = [];
                this.setStartHat(true);
                this.setStatements_(true);
                this.statementConnection_ = null;
            };
            installBuiltinHelpInfo(proceduresDefId);
            // builtin procedures_defnoreturn
            var proceduresCallId = "procedures_callnoreturn";
            var proceduresCallDef = pxt.blocks.getBlockDefinition(proceduresCallId);
            msg.PROCEDURES_CALLRETURN_TOOLTIP = proceduresDef.tooltip;
            Blockly.Blocks['procedures_callnoreturn'] = {
                init: function () {
                    var nameField = new pxtblockly.FieldProcedure('');
                    nameField.setSourceBlock(this);
                    this.appendDummyInput('TOPROW')
                        .appendField(proceduresCallDef.block['PROCEDURES_CALLNORETURN_TITLE'])
                        .appendField(nameField, 'NAME');
                    this.setPreviousStatement(true);
                    this.setNextStatement(true);
                    this.setColour(pxt.toolbox.getNamespaceColor('functions'));
                    this.arguments_ = [];
                    this.quarkConnections_ = {};
                    this.quarkIds_ = null;
                },
                /**
                 * Returns the name of the procedure this block calls.
                 * @return {string} Procedure name.
                 * @this Blockly.Block
                 */
                getProcedureCall: function () {
                    // The NAME field is guaranteed to exist, null will never be returned.
                    return /** @type {string} */ (this.getFieldValue('NAME'));
                },
                /**
                 * Notification that a procedure is renaming.
                 * If the name matches this block's procedure, rename it.
                 * @param {string} oldName Previous name of procedure.
                 * @param {string} newName Renamed procedure.
                 * @this Blockly.Block
                 */
                renameProcedure: function (oldName, newName) {
                    if (Blockly.Names.equals(oldName, this.getProcedureCall())) {
                        this.setFieldValue(newName, 'NAME');
                    }
                },
                /**
                 * Procedure calls cannot exist without the corresponding procedure
                 * definition.  Enforce this link whenever an event is fired.
                 * @param {!Blockly.Events.Abstract} event Change event.
                 * @this Blockly.Block
                 */
                onchange: function (event) {
                    if (!this.workspace || this.workspace.isFlyout || this.isInsertionMarker()) {
                        // Block is deleted or is in a flyout or insertion marker.
                        return;
                    }
                    if (event.type == Blockly.Events.CREATE &&
                        event.ids.indexOf(this.id) != -1) {
                        // Look for the case where a procedure call was created (usually through
                        // paste) and there is no matching definition.  In this case, create
                        // an empty definition block with the correct signature.
                        var name_2 = this.getProcedureCall();
                        var def = Blockly.Procedures.getDefinition(name_2, this.workspace);
                        if (def && (def.type != this.defType_ ||
                            JSON.stringify(def.arguments_) != JSON.stringify(this.arguments_))) {
                            // The signatures don't match.
                            def = null;
                        }
                        if (!def) {
                            Blockly.Events.setGroup(event.group);
                            /**
                             * Create matching definition block.
                             * <xml>
                             *   <block type="procedures_defreturn" x="10" y="20">
                             *     <field name="NAME">test</field>
                             *   </block>
                             * </xml>
                             */
                            var xml = goog.dom.createDom('xml');
                            var block = goog.dom.createDom('block');
                            block.setAttribute('type', this.defType_);
                            var xy = this.getRelativeToSurfaceXY();
                            var x = xy.x + Blockly.SNAP_RADIUS * (this.RTL ? -1 : 1);
                            var y = xy.y + Blockly.SNAP_RADIUS * 2;
                            block.setAttribute('x', x);
                            block.setAttribute('y', y);
                            var field = goog.dom.createDom('field');
                            field.setAttribute('name', 'NAME');
                            field.appendChild(document.createTextNode(this.getProcedureCall()));
                            block.appendChild(field);
                            xml.appendChild(block);
                            Blockly.Xml.domToWorkspace(xml, this.workspace);
                            Blockly.Events.setGroup(false);
                        }
                    }
                    else if (event.type == Blockly.Events.DELETE) {
                        // Look for the case where a procedure definition has been deleted,
                        // leaving this block (a procedure call) orphaned.  In this case, delete
                        // the orphan.
                        var name_3 = this.getProcedureCall();
                        var def = Blockly.Procedures.getDefinition(name_3, this.workspace);
                        if (!def) {
                            Blockly.Events.setGroup(event.group);
                            this.dispose(true, false);
                            Blockly.Events.setGroup(false);
                        }
                    }
                },
                mutationToDom: function () {
                    var mutationElement = document.createElement("mutation");
                    mutationElement.setAttribute("name", this.getProcedureCall());
                    return mutationElement;
                },
                domToMutation: function (element) {
                    var name = element.getAttribute("name");
                    this.renameProcedure(this.getProcedureCall(), name);
                },
                /**
                 * Add menu option to find the definition block for this call.
                 * @param {!Array} options List of menu options to add to.
                 * @this Blockly.Block
                 */
                customContextMenu: function (options) {
                    var option = { enabled: true };
                    option.text = Blockly.Msg.PROCEDURES_HIGHLIGHT_DEF;
                    var name = this.getProcedureCall();
                    var workspace = this.workspace;
                    option.callback = function () {
                        var def = Blockly.Procedures.getDefinition(name, workspace);
                        if (def)
                            def.select();
                    };
                    options.push(option);
                },
                defType_: 'procedures_defnoreturn'
            };
            installBuiltinHelpInfo(proceduresCallId);
            Blockly.Procedures.flyoutCategory = function (workspace) {
                var xmlList = [];
                if (!pxt.appTarget.appTheme.hideFlyoutHeadings) {
                    // Add the Heading label
                    var headingLabel = createFlyoutHeadingLabel(lf("Functions"), pxt.toolbox.getNamespaceColor('functions'), pxt.toolbox.getNamespaceIcon('functions'), 'blocklyFlyoutIconfunctions');
                    xmlList.push(headingLabel);
                }
                var newFunction = lf("Make a Function...");
                var newFunctionTitle = lf("New function name:");
                // Add the "Make a function" button
                var button = goog.dom.createDom('button');
                button.setAttribute('text', newFunction);
                button.setAttribute('callbackkey', 'CREATE_FUNCTION');
                var createFunction = function (name) {
                    /**
                     * Create matching definition block.
                     * <xml>
                     *   <block type="procedures_defreturn" x="10" y="20">
                     *     <field name="NAME">test</field>
                     *   </block>
                     * </xml>
                     */
                    var topBlock = workspace.getTopBlocks(true)[0];
                    var x = 10, y = 10;
                    if (topBlock) {
                        var xy = topBlock.getRelativeToSurfaceXY();
                        x = xy.x + Blockly.SNAP_RADIUS * (topBlock.RTL ? -1 : 1);
                        y = xy.y + Blockly.SNAP_RADIUS * 2;
                    }
                    var xml = goog.dom.createDom('xml');
                    var block = goog.dom.createDom('block');
                    block.setAttribute('type', 'procedures_defnoreturn');
                    block.setAttribute('x', String(x));
                    block.setAttribute('y', String(y));
                    var field = goog.dom.createDom('field');
                    field.setAttribute('name', 'NAME');
                    field.appendChild(document.createTextNode(name));
                    block.appendChild(field);
                    xml.appendChild(block);
                    var newBlockIds = Blockly.Xml.domToWorkspace(xml, workspace);
                    // Close flyout and highlight block
                    Blockly.hideChaff();
                    var newBlock = workspace.getBlockById(newBlockIds[0]);
                    newBlock.select();
                    // Center on the new block so we know where it is
                    workspace.centerOnBlock(newBlock.id);
                };
                workspace.registerButtonCallback('CREATE_FUNCTION', function (button) {
                    var promptAndCheckWithAlert = function (defaultName) {
                        Blockly.prompt(newFunctionTitle, defaultName, function (newFunc) {
                            // Merge runs of whitespace.  Strip leading and trailing whitespace.
                            // Beyond this, all names are legal.
                            if (newFunc) {
                                newFunc = newFunc.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');
                                if (newFunc == newFunction) {
                                    // Ok, not ALL names are legal...
                                    newFunc = null;
                                }
                            }
                            if (newFunc) {
                                if (workspace.getVariable(newFunc)) {
                                    Blockly.alert(Blockly.Msg.VARIABLE_ALREADY_EXISTS.replace('%1', newFunc.toLowerCase()), function () {
                                        promptAndCheckWithAlert(newFunc); // Recurse
                                    });
                                }
                                else if (!Blockly.Procedures.isLegalName_(newFunc, workspace)) {
                                    Blockly.alert(Blockly.Msg.PROCEDURE_ALREADY_EXISTS.replace('%1', newFunc.toLowerCase()), function () {
                                        promptAndCheckWithAlert(newFunc); // Recurse
                                    });
                                }
                                else {
                                    createFunction(newFunc);
                                }
                            }
                        });
                    };
                    promptAndCheckWithAlert('doSomething');
                });
                xmlList.push(button);
                function populateProcedures(procedureList, templateName) {
                    for (var i = 0; i < procedureList.length; i++) {
                        var name_4 = procedureList[i][0];
                        var args = procedureList[i][1];
                        // <block type="procedures_callnoreturn" gap="16">
                        //   <field name="NAME">name</field>
                        // </block>
                        var block = goog.dom.createDom('block');
                        block.setAttribute('type', templateName);
                        block.setAttribute('gap', '16');
                        block.setAttribute('colour', pxt.toolbox.getNamespaceColor('functions'));
                        var field = goog.dom.createDom('field', null, name_4);
                        field.setAttribute('name', 'NAME');
                        block.appendChild(field);
                        xmlList.push(block);
                    }
                }
                var tuple = Blockly.Procedures.allProcedures(workspace);
                populateProcedures(tuple[0], 'procedures_callnoreturn');
                return xmlList;
            };
        }
        function initLogic() {
            var msg = Blockly.Msg;
            // builtin controls_if
            var controlsIfId = "controls_if";
            var controlsIfDef = pxt.blocks.getBlockDefinition(controlsIfId);
            var controlsIfTooltips = controlsIfDef.tooltip;
            msg.CONTROLS_IF_MSG_IF = controlsIfDef.block["CONTROLS_IF_MSG_IF"];
            msg.CONTROLS_IF_MSG_THEN = controlsIfDef.block["CONTROLS_IF_MSG_THEN"];
            msg.CONTROLS_IF_MSG_ELSE = controlsIfDef.block["CONTROLS_IF_MSG_ELSE"];
            msg.CONTROLS_IF_MSG_ELSEIF = controlsIfDef.block["CONTROLS_IF_MSG_ELSEIF"];
            msg.CONTROLS_IF_TOOLTIP_1 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_1"];
            msg.CONTROLS_IF_TOOLTIP_2 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_2"];
            msg.CONTROLS_IF_TOOLTIP_3 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_3"];
            msg.CONTROLS_IF_TOOLTIP_4 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_4"];
            installBuiltinHelpInfo(controlsIfId);
            // builtin logic_compare
            var logicCompareId = "logic_compare";
            var logicCompareDef = pxt.blocks.getBlockDefinition(logicCompareId);
            var logicCompareTooltips = logicCompareDef.tooltip;
            msg.LOGIC_COMPARE_TOOLTIP_EQ = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_EQ"];
            msg.LOGIC_COMPARE_TOOLTIP_NEQ = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_NEQ"];
            msg.LOGIC_COMPARE_TOOLTIP_LT = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_LT"];
            msg.LOGIC_COMPARE_TOOLTIP_LTE = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_LTE"];
            msg.LOGIC_COMPARE_TOOLTIP_GT = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_GT"];
            msg.LOGIC_COMPARE_TOOLTIP_GTE = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_GTE"];
            installBuiltinHelpInfo(logicCompareId);
            // builtin logic_operation
            var logicOperationId = "logic_operation";
            var logicOperationDef = pxt.blocks.getBlockDefinition(logicOperationId);
            var logicOperationTooltips = logicOperationDef.tooltip;
            msg.LOGIC_OPERATION_AND = logicOperationDef.block["LOGIC_OPERATION_AND"];
            msg.LOGIC_OPERATION_OR = logicOperationDef.block["LOGIC_OPERATION_OR"];
            msg.LOGIC_OPERATION_TOOLTIP_AND = logicOperationTooltips["LOGIC_OPERATION_TOOLTIP_AND"];
            msg.LOGIC_OPERATION_TOOLTIP_OR = logicOperationTooltips["LOGIC_OPERATION_TOOLTIP_OR"];
            installBuiltinHelpInfo(logicOperationId);
            // builtin logic_negate
            var logicNegateId = "logic_negate";
            var logicNegateDef = pxt.blocks.getBlockDefinition(logicNegateId);
            msg.LOGIC_NEGATE_TITLE = logicNegateDef.block["LOGIC_NEGATE_TITLE"];
            installBuiltinHelpInfo(logicNegateId);
            // builtin logic_boolean
            var logicBooleanId = "logic_boolean";
            var logicBooleanDef = pxt.blocks.getBlockDefinition(logicBooleanId);
            msg.LOGIC_BOOLEAN_TRUE = logicBooleanDef.block["LOGIC_BOOLEAN_TRUE"];
            msg.LOGIC_BOOLEAN_FALSE = logicBooleanDef.block["LOGIC_BOOLEAN_FALSE"];
            installBuiltinHelpInfo(logicBooleanId);
        }
        function initText() {
            // builtin text
            var textInfo = pxt.blocks.getBlockDefinition('text');
            installHelpResources('text', textInfo.name, textInfo.tooltip, textInfo.url, Blockly.Colours.textField, Blockly.Colours.textField, Blockly.Colours.textField);
            // builtin text_length
            var msg = Blockly.Msg;
            var textLengthId = "text_length";
            var textLengthDef = pxt.blocks.getBlockDefinition(textLengthId);
            msg.TEXT_LENGTH_TITLE = textLengthDef.block["TEXT_LENGTH_TITLE"];
            // We have to override this block definition because the builtin block
            // allows both Strings and Arrays in its input check and that confuses
            // our Blockly compiler
            var block = Blockly.Blocks[textLengthId];
            block.init = function () {
                this.jsonInit({
                    "message0": msg.TEXT_LENGTH_TITLE,
                    "args0": [
                        {
                            "type": "input_value",
                            "name": "VALUE",
                            "check": ['String']
                        }
                    ],
                    "output": 'Number',
                    "outputShape": Blockly.OUTPUT_SHAPE_ROUND
                });
            };
            installBuiltinHelpInfo(textLengthId);
            // builtin text_join
            var textJoinId = "text_join";
            var textJoinDef = pxt.blocks.getBlockDefinition(textJoinId);
            msg.TEXT_JOIN_TITLE_CREATEWITH = textJoinDef.block["TEXT_JOIN_TITLE_CREATEWITH"];
            installBuiltinHelpInfo(textJoinId);
        }
        function initDebugger() {
            Blockly.Blocks[pxtc.TS_DEBUGGER_TYPE] = {
                init: function () {
                    var that = this;
                    that.setColour(pxt.toolbox.getNamespaceColor('debug'));
                    that.setPreviousStatement(true);
                    that.setNextStatement(true);
                    that.setInputsInline(false);
                    that.appendDummyInput('ON_OFF')
                        .appendField(new Blockly.FieldLabel(lf("breakpoint"), undefined), "DEBUGGER")
                        .appendField(new pxtblockly.FieldBreakpoint("1", { 'type': 'number' }), "ON_OFF");
                    setHelpResources(this, pxtc.TS_DEBUGGER_TYPE, lf("Debugger statement"), lf("A debugger statement invokes any available debugging functionality"), '/javascript/debugger', pxt.toolbox.getNamespaceColor('debug'));
                }
            };
        }
        function initComments() {
            Blockly.Msg.WORKSPACE_COMMENT_DEFAULT_TEXT = '';
        }
        function initTooltip(blockInfo) {
            var renderTip = function (el) {
                if (el.disabled)
                    return lf("This block is disabled and will not run. Attach this block to an event to enable it.");
                var tip = el.tooltip;
                while (goog.isFunction(tip)) {
                    tip = tip(el);
                }
                return tip;
            };
            // TODO: update this when pulling new blockly
            /**
             * Create the tooltip and show it.
             * @private
             */
            Blockly.Tooltip.show_ = function () {
                Blockly.Tooltip.poisonedElement_ = Blockly.Tooltip.element_;
                if (!Blockly.Tooltip.DIV) {
                    return;
                }
                // Erase all existing text.
                goog.dom.removeChildren(/** @type {!Element} */ (Blockly.Tooltip.DIV));
                // Get the new text.
                var card = Blockly.Tooltip.element_.codeCard;
                function render() {
                    var rtl = Blockly.Tooltip.element_.RTL;
                    var windowSize = goog.dom.getViewportSize();
                    // Display the tooltip.
                    Blockly.Tooltip.DIV.style.direction = rtl ? 'rtl' : 'ltr';
                    Blockly.Tooltip.DIV.style.display = 'block';
                    Blockly.Tooltip.visible = true;
                    // Move the tooltip to just below the cursor.
                    var anchorX = Blockly.Tooltip.lastX_;
                    if (rtl) {
                        anchorX -= Blockly.Tooltip.OFFSET_X + Blockly.Tooltip.DIV.offsetWidth;
                    }
                    else {
                        anchorX += Blockly.Tooltip.OFFSET_X;
                    }
                    var anchorY = Blockly.Tooltip.lastY_ + Blockly.Tooltip.OFFSET_Y;
                    if (anchorY + Blockly.Tooltip.DIV.offsetHeight >
                        windowSize.height + window.scrollY) {
                        // Falling off the bottom of the screen; shift the tooltip up.
                        anchorY -= Blockly.Tooltip.DIV.offsetHeight + 2 * Blockly.Tooltip.OFFSET_Y;
                    }
                    if (rtl) {
                        // Prevent falling off left edge in RTL mode.
                        anchorX = Math.max(Blockly.Tooltip.MARGINS - window.scrollX, anchorX);
                    }
                    else {
                        if (anchorX + Blockly.Tooltip.DIV.offsetWidth >
                            windowSize.width + window.scrollX - 2 * Blockly.Tooltip.MARGINS) {
                            // Falling off the right edge of the screen;
                            // clamp the tooltip on the edge.
                            anchorX = windowSize.width - Blockly.Tooltip.DIV.offsetWidth -
                                2 * Blockly.Tooltip.MARGINS;
                        }
                    }
                    Blockly.Tooltip.DIV.style.top = anchorY + 'px';
                    Blockly.Tooltip.DIV.style.left = anchorX + 'px';
                }
                if (card) {
                    var cardEl = pxt.docs.codeCard.render({
                        header: renderTip(Blockly.Tooltip.element_)
                    });
                    Blockly.Tooltip.DIV.appendChild(cardEl);
                    render();
                }
                else {
                    var tip = renderTip(Blockly.Tooltip.element_);
                    tip = Blockly.utils.wrap(tip, Blockly.Tooltip.LIMIT);
                    // Create new text, line by line.
                    var lines = tip.split('\n');
                    for (var i = 0; i < lines.length; i++) {
                        var div = document.createElement('div');
                        div.appendChild(document.createTextNode(lines[i]));
                        Blockly.Tooltip.DIV.appendChild(div);
                    }
                    render();
                }
            };
        }
        function removeBlock(fn) {
            delete Blockly.Blocks[fn.attributes.blockId];
            delete cachedBlocks[fn.attributes.blockId];
        }
        function categoryElement(tb, nameid) {
            return tb ? blocks.getFirstChildWithAttr(tb, "category", "nameid", nameid.toLowerCase()) : undefined;
        }
        function collapseSubcategories(cat, child) {
            while (cat) {
                if (cat.isUserCollapsible_ && cat.getTree() && cat != child && (!child || !isChild(child, cat))) {
                    cat.setExpanded(false);
                    cat.updateRow();
                }
                cat = cat.getParent();
            }
        }
        function isChild(child, parent) {
            var myParent = child.getParent();
            if (myParent) {
                return myParent === parent || isChild(myParent, parent);
            }
            return false;
        }
        /**
         * <block type="pxt_wait_until">
         *     <value name="PREDICATE">
         *          <shadow type="logic_boolean">
         *              <field name="BOOL">TRUE</field>
         *          </shadow>
         *     </value>
         * </block>
         */
        function mkPredicateBlock(type) {
            var block = document.createElement("block");
            block.setAttribute("type", type);
            var value = document.createElement("value");
            value.setAttribute("name", "PREDICATE");
            block.appendChild(value);
            var shadow = mkFieldBlock("logic_boolean", "BOOL", "TRUE", true);
            value.appendChild(shadow);
            return block;
        }
        blocks.mkPredicateBlock = mkPredicateBlock;
        function mkFieldBlock(type, fieldName, fieldValue, isShadow) {
            var fieldBlock = document.createElement(isShadow ? "shadow" : "block");
            fieldBlock.setAttribute("type", pxt.Util.htmlEscape(type));
            var field = document.createElement("field");
            field.setAttribute("name", pxt.Util.htmlEscape(fieldName));
            field.textContent = pxt.Util.htmlEscape(fieldValue);
            fieldBlock.appendChild(field);
            return fieldBlock;
        }
        blocks.mkFieldBlock = mkFieldBlock;
        var jresIconCache = {};
        function iconToFieldImage(id) {
            var url = jresIconCache[id];
            if (!url) {
                pxt.log("missing jres icon " + id);
                return undefined;
            }
            return new Blockly.FieldImage(url, 40, 40, pxt.Util.isUserLanguageRtl(), '');
        }
        function initJresIcons(blockInfo) {
            jresIconCache = {}; // clear previous cache
            var jres = blockInfo.apis.jres;
            if (!jres)
                return;
            Object.keys(jres).forEach(function (jresId) {
                var jresObject = jres[jresId];
                if (jresObject && jresObject.icon)
                    jresIconCache[jresId] = jresObject.icon;
            });
        }
        function splitInputs(def) {
            var res = [];
            var current = [];
            def.parts.forEach(function (part) {
                switch (part.kind) {
                    case "break":
                        newInput();
                        break;
                    case "param":
                        current.push(part);
                        newInput();
                        break;
                    case "image":
                    case "label":
                        current.push(part);
                        break;
                }
            });
            newInput();
            return res;
            function newInput() {
                if (current.length) {
                    res.push(current);
                    current = [];
                }
            }
        }
        function namedField(field, name) {
            return { field: field, name: name };
        }
        function getEnumDropdownValues(apis, enumName) {
            return pxt.Util.values(apis.byQName).filter(function (sym) { return sym.namespace === enumName; });
        }
        function getFixedInstanceDropdownValues(apis, qName) {
            return pxt.Util.values(apis.byQName).filter(function (sym) { return sym.kind === pxtc.SymbolKind.Variable
                && sym.attributes.fixedInstance
                && isSubtype(apis, sym.retType, qName); });
        }
        blocks.getFixedInstanceDropdownValues = getFixedInstanceDropdownValues;
        function generateIcons(instanceSymbols) {
            var imgConv = new ImageConverter();
            instanceSymbols.forEach(function (v) {
                if (v.attributes.jresURL && !v.attributes.iconURL && pxt.U.startsWith(v.attributes.jresURL, "data:image/x-mkcd-f")) {
                    v.attributes.iconURL = imgConv.convert(v.attributes.jresURL);
                }
            });
        }
        blocks.generateIcons = generateIcons;
        function getConstantDropdownValues(apis, qName) {
            return pxt.Util.values(apis.byQName).filter(function (sym) { return sym.attributes.blockIdentity === qName; });
        }
        // Trims off a single space from beginning and end (if present)
        function removeOuterSpace(str) {
            if (str === " ") {
                return "";
            }
            else if (str.length > 1) {
                var startSpace = str.charAt(0) == " ";
                var endSpace = str.charAt(str.length - 1) == " ";
                if (startSpace || endSpace) {
                    return str.substring(startSpace ? 1 : 0, endSpace ? str.length - 1 : str.length);
                }
            }
            return str;
        }
        /**
         * Blockly variable fields can't be set directly; you either have to use the
         * variable ID or set the value of the model and not the field
         */
        function setVarFieldValue(block, fieldName, newName) {
            var varField = block.getField(fieldName);
            // Check for an existing model with this name; otherwise we'll create
            // a second variable with the same name and it will show up twice in the UI
            var vars = block.workspace.getAllVariables();
            var foundIt = false;
            if (vars && vars.length) {
                for (var v = 0; v < vars.length; v++) {
                    var model = vars[v];
                    if (model.name === newName) {
                        varField.setValue(model.getId());
                        foundIt = true;
                    }
                }
            }
            if (!foundIt) {
                varField.initModel();
                varField.getVariable().name = newName;
            }
        }
        blocks.setVarFieldValue = setVarFieldValue;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var MutatorTypes;
        (function (MutatorTypes) {
            MutatorTypes.ObjectDestructuringMutator = "objectdestructuring";
            MutatorTypes.RestParameterMutator = "restparameter";
            MutatorTypes.DefaultInstanceMutator = "defaultinstance";
        })(MutatorTypes = blocks.MutatorTypes || (blocks.MutatorTypes = {}));
        function addMutation(b, info, mutationType) {
            var m;
            switch (mutationType) {
                case MutatorTypes.ObjectDestructuringMutator:
                    if (!info.parameters || info.parameters.length < 1) {
                        console.error("Destructuring mutations require at least one parameter");
                    }
                    else {
                        var found = false;
                        for (var _i = 0, _a = info.parameters; _i < _a.length; _i++) {
                            var param = _a[_i];
                            if (param.type.indexOf("=>") !== -1) {
                                if (!param.properties || param.properties.length === 0) {
                                    console.error("Destructuring mutations only supported for functions with an event parameter that has multiple properties");
                                    return;
                                }
                                found = true;
                            }
                        }
                        if (!found) {
                            console.error("Destructuring mutations must have an event parameter");
                            return;
                        }
                    }
                    m = new DestructuringMutator(b, info);
                    break;
                case MutatorTypes.RestParameterMutator:
                    m = new ArrayMutator(b, info);
                    break;
                case MutatorTypes.DefaultInstanceMutator:
                    m = new DefaultInstanceMutator(b, info);
                    break;
                default:
                    console.warn("Ignoring unknown mutation type: " + mutationType);
                    return;
            }
            b.mutationToDom = m.mutationToDom.bind(m);
            b.domToMutation = m.domToMutation.bind(m);
            b.compose = m.compose.bind(m);
            b.decompose = m.decompose.bind(m);
            b.mutation = m;
        }
        blocks.addMutation = addMutation;
        function mutateToolboxBlock(block, mutationType, mutation) {
            var mutationElement = document.createElement("mutation");
            switch (mutationType) {
                case MutatorTypes.ObjectDestructuringMutator:
                    mutationElement.setAttribute(DestructuringMutator.propertiesAttributeName, mutation);
                    break;
                case MutatorTypes.RestParameterMutator:
                    mutationElement.setAttribute(ArrayMutator.countAttributeName, mutation);
                    break;
                case MutatorTypes.DefaultInstanceMutator:
                    mutationElement.setAttribute(DefaultInstanceMutator.attributeName, mutation);
                default:
                    console.warn("Ignoring unknown mutation type: " + mutationType);
                    return;
            }
            block.appendChild(mutationElement);
        }
        blocks.mutateToolboxBlock = mutateToolboxBlock;
        var MutatorHelper = /** @class */ (function () {
            function MutatorHelper(b, info) {
                this.info = info;
                this.block = b;
                this.topBlockType = this.block.type + "_mutator";
                var subBlocks = this.getSubBlockNames();
                this.initializeMutatorTopBlock();
                this.initializeMutatorSubBlocks(subBlocks);
                var mutatorToolboxTypes = subBlocks.map(function (s) { return s.type; });
                this.block.setMutator(new Blockly.Mutator(mutatorToolboxTypes));
            }
            // Should be set to modify a block after a mutator dialog is updated
            MutatorHelper.prototype.compose = function (topBlock) {
                var allBlocks = topBlock.getDescendants().map(function (subBlock) {
                    return {
                        type: subBlock.type,
                        name: subBlock.inputList[0].name
                    };
                });
                // Toss the top block
                allBlocks.shift();
                this.updateBlock(allBlocks);
            };
            // Should be set to initialize the workspace inside a mutator dialog and return the top block
            MutatorHelper.prototype.decompose = function (workspace) {
                // Initialize flyout workspace's top block and add sub-blocks based on visible parameters
                var topBlock = workspace.newBlock(this.topBlockType);
                topBlock.initSvg();
                var _loop_1 = function (input) {
                    if (input.name === MutatorHelper.mutatorStatmentInput) {
                        var currentConnection_1 = input.connection;
                        this_1.getVisibleBlockTypes().forEach(function (sub) {
                            var subBlock = workspace.newBlock(sub);
                            subBlock.initSvg();
                            currentConnection_1.connect(subBlock.previousConnection);
                            currentConnection_1 = subBlock.nextConnection;
                        });
                        return "break";
                    }
                };
                var this_1 = this;
                for (var _i = 0, _a = topBlock.inputList; _i < _a.length; _i++) {
                    var input = _a[_i];
                    var state_1 = _loop_1(input);
                    if (state_1 === "break")
                        break;
                }
                return topBlock;
            };
            MutatorHelper.prototype.compileMutation = function (e, comments) {
                return undefined;
            };
            MutatorHelper.prototype.getDeclaredVariables = function () {
                return undefined;
            };
            MutatorHelper.prototype.isDeclaredByMutation = function (varName) {
                return false;
            };
            MutatorHelper.prototype.initializeMutatorSubBlock = function (sub, parameter, colour) {
                sub.appendDummyInput(parameter)
                    .appendField(parameter);
                sub.setColour(colour);
                sub.setNextStatement(true);
                sub.setPreviousStatement(true);
            };
            MutatorHelper.prototype.initializeMutatorTopBlock = function () {
                var topBlockTitle = this.info.attributes.mutateText;
                var colour = this.block.getColour();
                Blockly.Blocks[this.topBlockType] = Blockly.Blocks[this.topBlockType] || {
                    init: function () {
                        var top = this;
                        top.appendDummyInput()
                            .appendField(topBlockTitle);
                        top.setColour(colour);
                        top.appendStatementInput(MutatorHelper.mutatorStatmentInput);
                    }
                };
            };
            MutatorHelper.prototype.initializeMutatorSubBlocks = function (subBlocks) {
                var colour = this.block.getColour();
                var initializer = this.initializeMutatorSubBlock.bind(this);
                subBlocks.forEach(function (blockName) {
                    Blockly.Blocks[blockName.type] = Blockly.Blocks[blockName.type] || {
                        init: function () { initializer(this, blockName.name, colour); }
                    };
                });
            };
            MutatorHelper.mutatorStatmentInput = "PROPERTIES";
            MutatorHelper.mutatedVariableInputName = "properties";
            return MutatorHelper;
        }());
        var DestructuringMutator = /** @class */ (function (_super) {
            __extends(DestructuringMutator, _super);
            function DestructuringMutator(b, info) {
                var _this = _super.call(this, b, info) || this;
                _this.currentlyVisible = [];
                _this.parameterRenames = {};
                _this.prefix = _this.info.attributes.mutatePrefix;
                _this.block.appendDummyInput(MutatorHelper.mutatedVariableInputName);
                _this.block.appendStatementInput("HANDLER")
                    .setCheck("null");
                return _this;
            }
            DestructuringMutator.prototype.getMutationType = function () {
                return MutatorTypes.ObjectDestructuringMutator;
            };
            DestructuringMutator.prototype.compileMutation = function (e, comments) {
                var _this = this;
                if (!this.info.attributes.mutatePropertyEnum && !this.parameters.length) {
                    return undefined;
                }
                var declarationString = this.parameters.map(function (param) {
                    var varField = _this.block.getField(param);
                    var declaredName = varField && varField.getText();
                    var escapedParam = blocks.escapeVarName(param, e);
                    if (declaredName !== param) {
                        _this.parameterRenames[param] = declaredName;
                        return param + ": " + blocks.escapeVarName(declaredName, e);
                    }
                    return escapedParam;
                }).join(", ");
                var functionString = "function ({ " + declarationString + " })";
                if (this.info.attributes.mutatePropertyEnum) {
                    return blocks.mkText(" [" + this.parameters.map(function (p) { return _this.info.attributes.mutatePropertyEnum + "." + p; }).join(", ") + "]," + functionString);
                }
                else {
                    return blocks.mkText(functionString);
                }
            };
            DestructuringMutator.prototype.getDeclaredVariables = function () {
                var _this = this;
                var result = {};
                this.parameters.forEach(function (param) {
                    result[_this.getVarFieldValue(param)] = _this.parameterTypes[param];
                });
                return result;
            };
            DestructuringMutator.prototype.isDeclaredByMutation = function (varName) {
                var _this = this;
                return this.parameters.some(function (param) { return _this.getVarFieldValue(param) === varName; });
            };
            DestructuringMutator.prototype.mutationToDom = function () {
                var _this = this;
                // Save the parameters that are currently visible to the DOM along with their names
                var mutation = document.createElement("mutation");
                var attr = this.parameters.map(function (param) {
                    var varName = _this.getVarFieldValue(param);
                    if (varName !== param) {
                        _this.parameterRenames[param] = pxt.Util.htmlEscape(varName);
                    }
                    return pxt.Util.htmlEscape(param);
                }).join(",");
                mutation.setAttribute(DestructuringMutator.propertiesAttributeName, attr);
                for (var parameter in this.parameterRenames) {
                    if (parameter === this.parameterRenames[parameter]) {
                        delete this.parameterRenames[parameter];
                    }
                }
                mutation.setAttribute(DestructuringMutator.renameAttributeName, JSON.stringify(this.parameterRenames));
                return mutation;
            };
            DestructuringMutator.prototype.domToMutation = function (xmlElement) {
                var _this = this;
                // Restore visible parameters based on saved DOM
                var savedParameters = xmlElement.getAttribute(DestructuringMutator.propertiesAttributeName);
                if (savedParameters) {
                    var split = savedParameters.split(",");
                    var properties_1 = [];
                    if (this.paramIndex === undefined) {
                        this.paramIndex = this.getParameterIndex();
                    }
                    split.forEach(function (saved) {
                        // Parse the old way of storing renames to maintain backwards compatibility
                        var parts = saved.split(":");
                        if (_this.info.parameters[_this.paramIndex].properties.some(function (p) { return p.name === parts[0]; })) {
                            properties_1.push({
                                property: parts[0],
                                newName: parts[1]
                            });
                        }
                    });
                    this.parameterRenames = undefined;
                    if (xmlElement.hasAttribute(DestructuringMutator.renameAttributeName)) {
                        try {
                            this.parameterRenames = JSON.parse(xmlElement.getAttribute(DestructuringMutator.renameAttributeName));
                        }
                        catch (e) {
                            console.warn("Ignoring invalid rename map in saved block mutation");
                        }
                    }
                    this.parameterRenames = this.parameterRenames || {};
                    // Create the fields for each property with default variable names
                    this.parameters = [];
                    properties_1.forEach(function (prop) {
                        _this.parameters.push(prop.property);
                        if (prop.newName && prop.newName !== prop.property) {
                            _this.parameterRenames[prop.property] = prop.newName;
                        }
                    });
                    this.updateVisibleProperties();
                    // Override any names that the user has changed
                    properties_1.filter(function (p) { return !!p.newName; }).forEach(function (p) { return _this.setVarFieldValue(p.property, p.newName); });
                }
            };
            DestructuringMutator.prototype.getVarFieldValue = function (fieldName) {
                var varField = this.block.getField(fieldName);
                return varField && varField.getText();
            };
            DestructuringMutator.prototype.setVarFieldValue = function (fieldName, newValue) {
                var varField = this.block.getField(fieldName);
                if (this.block.getField(fieldName)) {
                    blocks.setVarFieldValue(this.block, fieldName, newValue);
                }
            };
            DestructuringMutator.prototype.updateBlock = function (subBlocks) {
                var _this = this;
                this.parameters = [];
                // Ignore duplicate blocks
                subBlocks.forEach(function (p) {
                    if (_this.parameters.indexOf(p.name) === -1) {
                        _this.parameters.push(p.name);
                    }
                });
                this.updateVisibleProperties();
            };
            DestructuringMutator.prototype.getSubBlockNames = function () {
                var _this = this;
                this.parameters = [];
                this.parameterTypes = {};
                if (this.paramIndex === undefined) {
                    this.paramIndex = this.getParameterIndex();
                }
                return this.info.parameters[this.paramIndex].properties.map(function (property) {
                    // Used when compiling the destructured arguments
                    _this.parameterTypes[property.name] = property.type;
                    return {
                        type: _this.propertyId(property.name),
                        name: property.name
                    };
                });
            };
            DestructuringMutator.prototype.getVisibleBlockTypes = function () {
                var _this = this;
                return this.currentlyVisible.map(function (p) { return _this.propertyId(p); });
            };
            DestructuringMutator.prototype.updateVisibleProperties = function () {
                var _this = this;
                if (pxt.Util.listsEqual(this.currentlyVisible, this.parameters)) {
                    return;
                }
                var dummyInput = this.block.inputList.filter(function (i) { return i.name === MutatorHelper.mutatedVariableInputName; })[0];
                if (this.prefix && this.currentlyVisible.length === 0) {
                    dummyInput.appendField(this.prefix, DestructuringMutator.prefixLabel);
                }
                this.currentlyVisible.forEach(function (param) {
                    if (_this.parameters.indexOf(param) === -1) {
                        var name_5 = _this.getVarFieldValue(param);
                        // Persist renames
                        if (name_5 !== param) {
                            _this.parameterRenames[param] = name_5;
                        }
                        dummyInput.removeField(param);
                    }
                });
                this.parameters.forEach(function (param) {
                    if (_this.currentlyVisible.indexOf(param) === -1) {
                        var fieldValue = _this.parameterRenames[param] || param;
                        dummyInput.appendField(new Blockly.FieldVariable(fieldValue), param);
                    }
                });
                if (this.prefix && this.parameters.length === 0) {
                    dummyInput.removeField(DestructuringMutator.prefixLabel);
                }
                this.currentlyVisible = this.parameters;
            };
            DestructuringMutator.prototype.propertyId = function (property) {
                return this.block.type + "_" + property;
            };
            DestructuringMutator.prototype.getParameterIndex = function () {
                for (var i = 0; i < this.info.parameters.length; i++) {
                    if (this.info.parameters[i].type.indexOf("=>") !== -1) {
                        return i;
                    }
                }
                return undefined;
            };
            DestructuringMutator.propertiesAttributeName = "callbackproperties";
            DestructuringMutator.renameAttributeName = "renamemap";
            // Avoid clashes by starting labels with a number
            DestructuringMutator.prefixLabel = "0prefix_label_";
            return DestructuringMutator;
        }(MutatorHelper));
        var ArrayMutator = /** @class */ (function (_super) {
            __extends(ArrayMutator, _super);
            function ArrayMutator() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.count = 0;
                return _this;
            }
            ArrayMutator.prototype.getMutationType = function () {
                return MutatorTypes.RestParameterMutator;
            };
            ArrayMutator.prototype.compileMutation = function (e, comments) {
                var values = [];
                this.forEachInput(function (block) { return values.push(blocks.compileExpression(e, block, comments)); });
                return blocks.mkGroup(values);
            };
            ArrayMutator.prototype.mutationToDom = function () {
                var mutation = document.createElement("mutation");
                mutation.setAttribute(ArrayMutator.countAttributeName, this.count.toString());
                return mutation;
            };
            ArrayMutator.prototype.domToMutation = function (xmlElement) {
                var attribute = xmlElement.getAttribute(ArrayMutator.countAttributeName);
                if (attribute) {
                    try {
                        this.count = parseInt(attribute);
                    }
                    catch (e) {
                        return;
                    }
                    for (var i = 0; i < this.count; i++) {
                        this.addNumberField(false, i);
                    }
                }
            };
            ArrayMutator.prototype.updateBlock = function (subBlocks) {
                if (subBlocks) {
                    var diff = Math.abs(this.count - subBlocks.length);
                    if (this.count < subBlocks.length) {
                        for (var i = 0; i < diff; i++)
                            this.addNumberField(true, this.count);
                    }
                    else if (this.count > subBlocks.length) {
                        for (var i = 0; i < diff; i++)
                            this.removeNumberField();
                    }
                }
            };
            ArrayMutator.prototype.getSubBlockNames = function () {
                return [{
                        name: "Value",
                        type: ArrayMutator.entryTypeName
                    }];
            };
            ArrayMutator.prototype.getVisibleBlockTypes = function () {
                var result = [];
                this.forEachInput(function () { return result.push(ArrayMutator.entryTypeName); });
                return result;
            };
            ArrayMutator.prototype.addNumberField = function (isNewField, index) {
                var input = this.block.appendValueInput(ArrayMutator.valueInputPrefix + index).setCheck("Number");
                if (isNewField) {
                    var valueBlock = this.block.workspace.newBlock("math_number");
                    valueBlock.initSvg();
                    valueBlock.setShadow(true);
                    input.connection.connect(valueBlock.outputConnection);
                    this.block.workspace.render();
                    this.count++;
                }
            };
            ArrayMutator.prototype.removeNumberField = function () {
                if (this.count > 0) {
                    this.block.removeInput(ArrayMutator.valueInputPrefix + (this.count - 1));
                }
                this.count--;
            };
            ArrayMutator.prototype.forEachInput = function (cb) {
                for (var i = 0; i < this.count; i++) {
                    cb(this.block.getInputTargetBlock(ArrayMutator.valueInputPrefix + i), i);
                }
            };
            ArrayMutator.countAttributeName = "count";
            ArrayMutator.entryTypeName = "entry";
            ArrayMutator.valueInputPrefix = "value_input_";
            return ArrayMutator;
        }(MutatorHelper));
        var DefaultInstanceMutator = /** @class */ (function (_super) {
            __extends(DefaultInstanceMutator, _super);
            function DefaultInstanceMutator() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.showing = false;
                return _this;
            }
            DefaultInstanceMutator.prototype.getMutationType = function () {
                return MutatorTypes.DefaultInstanceMutator;
            };
            DefaultInstanceMutator.prototype.compileMutation = function (e, comments) {
                if (this.showing) {
                    var target = this.block.getInputTargetBlock(DefaultInstanceMutator.instanceInputName);
                    if (target) {
                        return blocks.compileExpression(e, target, comments);
                    }
                }
                return undefined;
            };
            DefaultInstanceMutator.prototype.mutationToDom = function () {
                var mutation = document.createElement("mutation");
                mutation.setAttribute(DefaultInstanceMutator.attributeName, this.showing ? "true" : "false");
                return mutation;
            };
            DefaultInstanceMutator.prototype.domToMutation = function (xmlElement) {
                var attribute = xmlElement.getAttribute(DefaultInstanceMutator.attributeName);
                if (attribute) {
                    this.updateShape(attribute === "true");
                }
                else {
                    this.updateShape(false);
                }
            };
            DefaultInstanceMutator.prototype.updateBlock = function (subBlocks) {
                this.updateShape(!!(subBlocks && subBlocks.length));
            };
            DefaultInstanceMutator.prototype.getSubBlockNames = function () {
                return [{
                        name: "Instance",
                        type: DefaultInstanceMutator.instanceSubBlockType
                    }];
            };
            DefaultInstanceMutator.prototype.getVisibleBlockTypes = function () {
                var result = [];
                if (this.showing) {
                    result.push(DefaultInstanceMutator.instanceSubBlockType);
                }
                return result;
            };
            DefaultInstanceMutator.prototype.updateShape = function (show) {
                if (this.showing !== show) {
                    if (show && !this.block.getInputTargetBlock(DefaultInstanceMutator.instanceInputName)) {
                        this.block.appendValueInput(DefaultInstanceMutator.instanceInputName);
                    }
                    else {
                        this.block.removeInput(DefaultInstanceMutator.instanceInputName);
                    }
                    this.showing = show;
                }
            };
            DefaultInstanceMutator.attributeName = "showing";
            DefaultInstanceMutator.instanceInputName = "__instance__";
            DefaultInstanceMutator.instanceSubBlockType = "instance";
            return DefaultInstanceMutator;
        }(MutatorHelper));
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtblockly.d.ts" />
/// <reference path="../built/pxtlib.d.ts" />
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_5) {
        var workspace;
        var blocklyDiv;
        var BlockLayout;
        (function (BlockLayout) {
            BlockLayout[BlockLayout["Align"] = 1] = "Align";
            // Shuffle deprecated
            BlockLayout[BlockLayout["Clean"] = 3] = "Clean";
            BlockLayout[BlockLayout["Flow"] = 4] = "Flow";
        })(BlockLayout = blocks_5.BlockLayout || (blocks_5.BlockLayout = {}));
        function render(blocksXml, options) {
            if (options === void 0) { options = { emPixels: 18, layout: BlockLayout.Align }; }
            if (!workspace) {
                blocklyDiv = document.createElement("div");
                blocklyDiv.style.position = "absolute";
                blocklyDiv.style.top = "0";
                blocklyDiv.style.left = "0";
                blocklyDiv.style.width = "1px";
                blocklyDiv.style.height = "1px";
                document.body.appendChild(blocklyDiv);
                workspace = Blockly.inject(blocklyDiv, {
                    scrollbars: false,
                    readOnly: true,
                    sound: false,
                    media: pxt.webConfig.commitCdnUrl + "blockly/media/",
                    rtl: pxt.Util.isUserLanguageRtl()
                });
            }
            workspace.clear();
            try {
                var text = blocksXml || "<xml xmlns=\"http://www.w3.org/1999/xhtml\"></xml>";
                var xml = Blockly.Xml.textToDom(text);
                Blockly.Events.disable();
                Blockly.Xml.domToWorkspace(xml, workspace);
                Blockly.Events.enable();
                var layout_1 = options.splitSvg ? BlockLayout.Align : options.layout;
                switch (layout_1) {
                    case BlockLayout.Align:
                        pxt.blocks.layout.verticalAlign(workspace, options.emPixels || 18);
                        break;
                    case BlockLayout.Flow:
                        pxt.blocks.layout.flow(workspace, { ratio: options.aspectRatio, useViewWidth: options.useViewWidth });
                        break;
                    case BlockLayout.Clean:
                        if (workspace.cleanUp_)
                            workspace.cleanUp_();
                        break;
                }
                var metrics_1 = workspace.getMetrics();
                var svg = blocklyDiv.querySelectorAll('svg')[0].cloneNode(true);
                Blockly.utils.removeClass(svg, "blocklySvg");
                Blockly.utils.addClass(svg, "blocklyPreview");
                pxt.U.toArray(svg.querySelectorAll('.blocklyBlockCanvas,.blocklyBubbleCanvas'))
                    .forEach(function (el) { return el.setAttribute('transform', "translate(" + -metrics_1.contentLeft + ", " + -metrics_1.contentTop + ") scale(1)"); });
                var blocklyMainBackground = svg.querySelectorAll('.blocklyMainBackground')[0];
                blocklyMainBackground.parentNode.removeChild(blocklyMainBackground);
                svg.setAttribute('viewBox', "0 0 " + metrics_1.contentWidth + " " + metrics_1.contentHeight);
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                if (options.emPixels) {
                    svg.style.width = (metrics_1.contentWidth / options.emPixels) + 'em';
                    svg.style.height = (metrics_1.contentHeight / options.emPixels) + 'em';
                }
                return options.splitSvg
                    ? pxt.blocks.layout.splitSvg(svg, workspace, options.emPixels)
                    : svg;
            }
            catch (e) {
                pxt.reportException(e);
                // We re-use the workspace across renders, catch any errors so we know to 
                // create a new workspace if there was an error
                if (workspace)
                    workspace.dispose();
                workspace = undefined;
                return undefined;
            }
        }
        blocks_5.render = render;
        function blocksMetrics(ws) {
            var blocks = ws.getTopBlocks(false);
            if (!blocks.length)
                return { width: 0, height: 0 };
            var m = undefined;
            blocks.forEach(function (b) {
                var r = b.getBoundingRectangle();
                if (!m)
                    m = { l: r.topLeft.x, r: r.bottomRight.x, t: r.topLeft.y, b: r.bottomRight.y };
                else {
                    m.l = Math.min(m.l, r.topLeft.x);
                    m.r = Math.max(m.r, r.bottomRight.y);
                    m.t = Math.min(m.t, r.topLeft.y);
                    m.b = Math.min(m.b, r.bottomRight.y);
                }
            });
            return {
                width: m.r - m.l,
                height: m.b - m.t
            };
        }
        blocks_5.blocksMetrics = blocksMetrics;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var docs;
    (function (docs) {
        var codeCard;
        (function (codeCard) {
            var repeat = pxt.Util.repeatMap;
            function render(card, options) {
                if (options === void 0) { options = {}; }
                var repeat = pxt.Util.repeatMap;
                var color = card.color || "";
                if (!color) {
                    if (card.hardware && !card.software)
                        color = 'black';
                    else if (card.software && !card.hardware)
                        color = 'teal';
                }
                var url = card.url ? /^[^:]+:\/\//.test(card.url) ? card.url : ('/' + card.url.replace(/^\.?\/?/, ''))
                    : undefined;
                var link = !!url;
                var div = function (parent, cls, tag, text) {
                    if (tag === void 0) { tag = "div"; }
                    if (text === void 0) { text = ''; }
                    var d = document.createElement(tag);
                    if (cls)
                        d.className = cls;
                    if (parent)
                        parent.appendChild(d);
                    if (text)
                        d.appendChild(document.createTextNode(text + ''));
                    return d;
                };
                var a = function (parent, href, text, cls) {
                    var d = document.createElement('a');
                    d.className = cls;
                    d.href = href;
                    d.appendChild(document.createTextNode(text));
                    d.target = '_blank';
                    parent.appendChild(d);
                    return d;
                };
                var r = div(null, 'ui card ' + (card.color || '') + (link ? ' link' : ''), link ? "a" : "div");
                r.setAttribute("role", "option");
                r.setAttribute("aria-selected", "true");
                if (url)
                    r.href = url;
                if (!options.hideHeader && (card.header || card.blocks || card.javascript || card.hardware || card.software || card.any)) {
                    var h = div(r, "ui content " + (card.responsive ? " tall desktop only" : ""));
                    var hr_1 = div(h, "right floated meta");
                    if (card.any)
                        div(hr_1, "ui grey circular label tiny", "i", card.any > 0 ? card.any : "");
                    repeat(card.blocks, function (k) { return div(hr_1, "puzzle orange icon", "i"); });
                    repeat(card.javascript, function (k) { return div(hr_1, "align left blue icon", "i"); });
                    repeat(card.hardware, function (k) { return div(hr_1, "certificate black icon", "i"); });
                    repeat(card.software, function (k) { return div(hr_1, "square teal icon", "i"); });
                    if (card.header)
                        div(h, 'description', 'span', card.header);
                }
                var name = (options.shortName ? card.shortName : '') || card.name;
                var img = div(r, "ui image" + (card.responsive ? " tall landscape only" : ""));
                if (card.label) {
                    var lbl = document.createElement("label");
                    lbl.className = "ui " + (card.labelClass ? card.labelClass : "orange right ribbon") + " label";
                    lbl.textContent = card.label;
                    img.appendChild(lbl);
                }
                if (card.blocksXml) {
                    var svg = pxt.blocks.render(card.blocksXml);
                    if (!svg) {
                        console.error("failed to render blocks");
                        pxt.debug(card.blocksXml);
                    }
                    else {
                        var holder = div(img, '');
                        holder.setAttribute('style', 'width:100%; min-height:10em');
                        holder.appendChild(svg);
                    }
                }
                if (card.typeScript) {
                    var pre = document.createElement("pre");
                    pre.appendChild(document.createTextNode(card.typeScript));
                    img.appendChild(pre);
                }
                if (card.imageUrl) {
                    var imageWrapper_1 = document.createElement("div");
                    imageWrapper_1.className = "ui imagewrapper";
                    var image = document.createElement("img");
                    image.className = "ui cardimage";
                    image.src = card.imageUrl;
                    image.alt = name;
                    image.onerror = function () {
                        // failed to load, remove
                        imageWrapper_1.remove();
                    };
                    image.setAttribute("role", "presentation");
                    imageWrapper_1.appendChild(image);
                    img.appendChild(imageWrapper_1);
                }
                if (card.youTubeId) {
                    var screenshot = document.createElement("img");
                    screenshot.className = "ui image";
                    screenshot.src = "https://img.youtube.com/vi/" + card.youTubeId + "/0.jpg";
                    img.appendChild(screenshot);
                }
                if (card.cardType == "file") {
                    var file = div(r, "ui fileimage");
                    img.appendChild(file);
                }
                if (name || card.description) {
                    var ct = div(r, "ui content");
                    if (name) {
                        r.setAttribute("aria-label", name);
                        if (url && !link)
                            a(ct, url, name, 'header');
                        else
                            div(ct, 'header', 'div', name);
                    }
                    if (card.description) {
                        var descr = div(ct, 'ui description');
                        descr.appendChild(document.createTextNode(card.description.split('.')[0] + '.'));
                    }
                }
                if (card.time) {
                    var meta = div(r, "meta");
                    if (card.time) {
                        var m = div(meta, "date", "span");
                        m.appendChild(document.createTextNode(pxt.Util.timeSince(card.time)));
                    }
                }
                if (card.extracontent) {
                    var extracontent = div(r, "extra content", "div");
                    extracontent.appendChild(document.createTextNode(card.extracontent));
                }
                return r;
            }
            codeCard.render = render;
        })(codeCard = docs.codeCard || (docs.codeCard = {}));
    })(docs = pxt.docs || (pxt.docs = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        function appendMutation(block, mutation) {
            var b = block;
            var oldMTD = b.mutationToDom;
            var oldDTM = b.domToMutation;
            b.mutationToDom = function () {
                var el = oldMTD ? oldMTD() : document.createElement("mutation");
                return mutation.mutationToDom(el);
            };
            b.domToMutation = function (saved) {
                if (oldDTM) {
                    oldDTM(saved);
                }
                mutation.domToMutation(saved);
            };
        }
        blocks.appendMutation = appendMutation;
        function initVariableArgsBlock(b, handlerArgs) {
            var currentlyVisible = 0;
            var actuallyVisible = 0;
            var i = b.appendDummyInput();
            var updateShape = function () {
                if (currentlyVisible === actuallyVisible) {
                    return;
                }
                if (currentlyVisible > actuallyVisible) {
                    var diff = currentlyVisible - actuallyVisible;
                    for (var j = 0; j < diff; j++) {
                        var arg = handlerArgs[actuallyVisible + j];
                        i.insertFieldAt(i.fieldRow.length - 1, new Blockly.FieldVariable(arg.name), "HANDLER_" + arg.name);
                    }
                }
                else {
                    var diff = actuallyVisible - currentlyVisible;
                    for (var j = 0; j < diff; j++) {
                        var arg = handlerArgs[actuallyVisible - j - 1];
                        i.removeField("HANDLER_" + arg.name);
                    }
                }
                if (currentlyVisible >= handlerArgs.length) {
                    i.removeField("_HANDLER_ADD");
                }
                else if (actuallyVisible >= handlerArgs.length) {
                    addPlusButton();
                }
                actuallyVisible = currentlyVisible;
            };
            Blockly.Extensions.apply('inline-svgs', b, false);
            addPlusButton();
            appendMutation(b, {
                mutationToDom: function (el) {
                    el.setAttribute("numArgs", currentlyVisible.toString());
                    for (var j = 0; j < currentlyVisible; j++) {
                        var varField = b.getField("HANDLER_" + handlerArgs[j].name);
                        var varName = varField && varField.getText();
                        el.setAttribute("arg" + j, varName);
                    }
                    return el;
                },
                domToMutation: function (saved) {
                    var numArgs = parseInt(saved.getAttribute("numargs"));
                    currentlyVisible = Math.min(isNaN(numArgs) ? 0 : numArgs, handlerArgs.length);
                    updateShape();
                    for (var j = 0; j < currentlyVisible; j++) {
                        var varName = saved.getAttribute("arg" + j);
                        var fieldName = "HANDLER_" + handlerArgs[j].name;
                        if (b.getField(fieldName)) {
                            blocks.setVarFieldValue(b, fieldName, varName);
                        }
                    }
                }
            });
            function addPlusButton() {
                i.appendField(new Blockly.FieldImage(b.ADD_IMAGE_DATAURI, 24, 24, false, lf("Add argument"), function () {
                    currentlyVisible = Math.min(currentlyVisible + 1, handlerArgs.length);
                    updateShape();
                }), "_HANDLER_ADD");
            }
        }
        blocks.initVariableArgsBlock = initVariableArgsBlock;
        function initExpandableBlock(b, def, comp, toggle, addInputs) {
            // Add numbers before input names to prevent clashes with the ones added
            // by BlocklyLoader. The number makes it an invalid JS identifier
            var buttonAddName = "0_add_button";
            var buttonRemName = "0_rem_button";
            var attributeName = "_expanded";
            var inputsAttributeName = "_input_init";
            var optionNames = def.parameters.map(function (p) { return p.name; });
            var totalOptions = def.parameters.length;
            var buttonDelta = toggle ? totalOptions : 1;
            // These two variables are the "state" of the mutation
            var visibleOptions = 0;
            var inputsInitialized = false;
            var addShown = false;
            var remShown = false;
            Blockly.Extensions.apply('inline-svgs', b, false);
            var onFirstRender = function () {
                if (b.rendered && !b.workspace.isDragging()) {
                    updateShape(0, undefined, true);
                    updateButtons();
                    // We don't need anything once the dom is initialized, so clean up
                    b.workspace.removeChangeListener(onFirstRender);
                }
            };
            // Blockly only lets you hide an input once it is rendered, so we can't
            // hide the inputs in init() or domToMutation(). This will get called
            // whenever a change is made to the workspace (including after the first
            // block render) and then remove itself
            b.workspace.addChangeListener(onFirstRender);
            appendMutation(b, {
                mutationToDom: function (el) {
                    // The reason we store the inputsInitialized variable separately from visibleOptions
                    // is because it's possible for the block to get into a state where all inputs are
                    // initialized but they aren't visible (i.e. the user hit the - button). Blockly
                    // gets upset if a block has a different number of inputs when it is saved and restored.
                    el.setAttribute(attributeName, visibleOptions.toString());
                    el.setAttribute(inputsAttributeName, inputsInitialized.toString());
                    return el;
                },
                domToMutation: function (saved) {
                    if (saved.hasAttribute(inputsAttributeName) && saved.getAttribute(inputsAttributeName) == "true" && !inputsInitialized) {
                        initOptionalInputs();
                    }
                    if (saved.hasAttribute(attributeName)) {
                        var val = parseInt(saved.getAttribute(attributeName));
                        if (!isNaN(val)) {
                            if (inputsInitialized) {
                                visibleOptions = addDelta(val);
                            }
                            else {
                                updateShape(val, true);
                            }
                            return;
                        }
                    }
                }
            });
            // Set skipRender to true if the block is still initializing. Otherwise
            // the inputs will render before their shadow blocks are created and
            // leave behind annoying artifacts
            function updateShape(delta, skipRender, force) {
                if (skipRender === void 0) { skipRender = false; }
                if (force === void 0) { force = false; }
                var newValue = addDelta(delta);
                if (!force && !skipRender && newValue === visibleOptions)
                    return;
                visibleOptions = newValue;
                if (!inputsInitialized && visibleOptions > 0) {
                    initOptionalInputs();
                    if (!b.rendered) {
                        return;
                    }
                }
                var optIndex = 0;
                for (var i = 0; i < b.inputList.length; i++) {
                    var input = b.inputList[i];
                    if (pxt.Util.startsWith(input.name, blocks.optionalDummyInputPrefix)) {
                        // The behavior for dummy inputs (i.e. labels) is that whenever a parameter is revealed,
                        // all earlier labels are made visible as well. If the parameter is the last one in the
                        // block then all labels are made visible
                        setInputVisible(input, optIndex < visibleOptions || visibleOptions === totalOptions);
                    }
                    else if (pxt.Util.startsWith(input.name, blocks.optionalInputWithFieldPrefix) || optionNames.indexOf(input.name) !== -1) {
                        var visible = optIndex < visibleOptions;
                        setInputVisible(input, visible);
                        if (visible && input.connection && !input.connection.isConnected() && !b.isInsertionMarker()) {
                            // FIXME: Could probably be smarter here, right now this does not respect
                            // any options passed to the child block. Need to factor that out of BlocklyLoader
                            var param = comp.definitionNameToParam[def.parameters[optIndex].name];
                            var shadowId = param.shadowBlockId || shadowBlockForType(param.type);
                            if (shadowId) {
                                var nb = b.workspace.newBlock(shadowId);
                                nb.setShadow(true);
                                // Because this function is sometimes called before the block is
                                // rendered, we need to guard these calls to initSvg and render
                                if (nb.initSvg)
                                    nb.initSvg();
                                input.connection.connect(nb.outputConnection);
                                if (nb.render)
                                    nb.render();
                            }
                        }
                        ++optIndex;
                    }
                }
                updateButtons();
                if (!skipRender)
                    b.render();
            }
            function addButton(name, uri, alt, delta) {
                b.appendDummyInput(name)
                    .appendField(new Blockly.FieldImage(uri, 24, 24, false, alt, function () { return updateShape(delta); }));
            }
            function updateButtons() {
                var showAdd = visibleOptions !== totalOptions;
                var showRemove = visibleOptions !== 0;
                if (!showAdd) {
                    addShown = false;
                    b.removeInput(buttonAddName, true);
                }
                if (!showRemove) {
                    remShown = false;
                    b.removeInput(buttonRemName, true);
                }
                if (showRemove && !remShown) {
                    if (addShown) {
                        b.removeInput(buttonAddName, true);
                        addMinusButton();
                        addPlusButton();
                    }
                    else {
                        addMinusButton();
                    }
                }
                if (showAdd && !addShown) {
                    addPlusButton();
                }
            }
            function addPlusButton() {
                addShown = true;
                addButton(buttonAddName, b.ADD_IMAGE_DATAURI, lf("Reveal optional arguments"), buttonDelta);
            }
            function addMinusButton() {
                remShown = true;
                addButton(buttonRemName, b.REMOVE_IMAGE_DATAURI, lf("Hide optional arguments"), -1 * buttonDelta);
            }
            function initOptionalInputs() {
                inputsInitialized = true;
                addInputs();
                updateButtons();
            }
            function addDelta(delta) {
                return Math.min(Math.max(visibleOptions + delta, 0), totalOptions);
            }
            function setInputVisible(input, visible) {
                // If the block isn't rendered, Blockly will crash
                if (b.rendered) {
                    input.setVisible(visible);
                }
            }
        }
        blocks.initExpandableBlock = initExpandableBlock;
        function shadowBlockForType(type) {
            switch (type) {
                case "number": return "math_number";
                case "boolean": return "logic_boolean";
                case "string": return "text";
            }
            if (blocks.isArrayType(type)) {
                return "lists_create_with";
            }
            return undefined;
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var allOperations = pxt.blocks.MATH_FUNCTIONS.unary.concat(pxt.blocks.MATH_FUNCTIONS.binary).concat(pxt.blocks.MATH_FUNCTIONS.infix);
        function initMathOpBlock() {
            var mathOpId = "math_js_op";
            var mathOpDef = pxt.blocks.getBlockDefinition(mathOpId);
            Blockly.Blocks[mathOpId] = {
                init: function () {
                    var b = this;
                    b.setPreviousStatement(false);
                    b.setNextStatement(false);
                    b.setOutput(true, "Number");
                    b.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
                    b.setInputsInline(true);
                    var ddi = b.appendDummyInput("op_dropdown");
                    ddi.appendField(new Blockly.FieldDropdown(allOperations.map(function (op) { return [mathOpDef.block[op], op]; }), function (op) { return onOperatorSelect(b, op); }), "OP");
                    addArgInput(b, false);
                    // Because the shape of inputs changes, we need a mutation. Technically the op tells us
                    // how many inputs we should have but we can't read its value at init time
                    blocks.appendMutation(b, {
                        mutationToDom: function (mutation) {
                            var infix;
                            for (var i = 0; i < b.inputList.length; i++) {
                                var input = b.inputList[i];
                                if (input.name === "op_dropdown") {
                                    infix = false;
                                    break;
                                }
                                else if (input.name === "ARG0") {
                                    infix = true;
                                    break;
                                }
                            }
                            mutation.setAttribute("op-type", (b.getInput("ARG1") ? (infix ? "infix" : "binary") : "unary").toString());
                            return mutation;
                        },
                        domToMutation: function (saved) {
                            if (saved.hasAttribute("op-type")) {
                                var type = saved.getAttribute("op-type");
                                if (type != "unary") {
                                    addArgInput(b, true);
                                }
                                changeInputOrder(b, type === "infix");
                            }
                        }
                    });
                }
            };
            blocks.installHelpResources(mathOpId, mathOpDef.name, function (block) {
                return mathOpDef.tooltip[block.getFieldValue("OP")];
            }, mathOpDef.url, pxt.toolbox.getNamespaceColor(mathOpDef.category));
            function onOperatorSelect(b, op) {
                if (isUnaryOp(op)) {
                    b.removeInput("ARG1", true);
                }
                else if (!b.getInput("ARG1")) {
                    addArgInput(b, true);
                }
                changeInputOrder(b, isInfixOp(op));
            }
            function addArgInput(b, second) {
                var i = b.appendValueInput("ARG" + (second ? 1 : 0));
                i.setCheck("Number");
                if (second) {
                    i.connection.setShadowDom(numberShadowDom());
                    i.connection.respawnShadow_();
                }
            }
            function changeInputOrder(b, infix) {
                var hasTwoArgs = !!b.getInput("ARG1");
                if (infix) {
                    if (hasTwoArgs) {
                        b.moveInputBefore("op_dropdown", "ARG1");
                    }
                    b.moveInputBefore("ARG0", "op_dropdown");
                }
                else {
                    if (hasTwoArgs) {
                        b.moveInputBefore("ARG0", "ARG1");
                    }
                    b.moveInputBefore("op_dropdown", "ARG0");
                }
            }
        }
        blocks.initMathOpBlock = initMathOpBlock;
        function isUnaryOp(op) {
            return pxt.blocks.MATH_FUNCTIONS.unary.indexOf(op) !== -1;
        }
        function isInfixOp(op) {
            return pxt.blocks.MATH_FUNCTIONS.infix.indexOf(op) !== -1;
        }
        var cachedDom;
        function numberShadowDom() {
            // <shadow type="math_number"><field name="NUM">0</field></shadow>
            if (!cachedDom) {
                cachedDom = document.createElement("shadow");
                cachedDom.setAttribute("type", "math_number");
                var field = document.createElement("field");
                field.setAttribute("name", "NUM");
                field.textContent = "0";
                cachedDom.appendChild(field);
            }
            return cachedDom;
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var allOperations = pxt.blocks.ROUNDING_FUNCTIONS;
        function initMathRoundBlock() {
            var mathRoundId = "math_js_round";
            var mathRoundDef = pxt.blocks.getBlockDefinition(mathRoundId);
            Blockly.Blocks[mathRoundId] = {
                init: function () {
                    var b = this;
                    b.setPreviousStatement(false);
                    b.setNextStatement(false);
                    b.setOutput(true, "Number");
                    b.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
                    b.setInputsInline(true);
                    var ddi = b.appendDummyInput("round_dropdown");
                    ddi.appendField(new Blockly.FieldDropdown(allOperations.map(function (op) { return [mathRoundDef.block[op], op]; }), function (op) { return onOperatorSelect(b, op); }), "OP");
                    addArgInput(b);
                }
            };
            blocks.installHelpResources(mathRoundId, mathRoundDef.name, function (block) {
                return mathRoundDef.tooltip[block.getFieldValue("OP")];
            }, mathRoundDef.url, pxt.toolbox.getNamespaceColor(mathRoundDef.category));
            function onOperatorSelect(b, op) {
                // No-op
            }
            function addArgInput(b) {
                var i = b.appendValueInput("ARG0");
                i.setCheck("Number");
            }
        }
        blocks.initMathRoundBlock = initMathRoundBlock;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="../../built/pxtsim.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldBreakpoint = /** @class */ (function (_super) {
        __extends(FieldBreakpoint, _super);
        function FieldBreakpoint(state, params, opt_validator) {
            var _this = _super.call(this, state, opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.CURSOR = 'pointer';
            _this.params = params;
            _this.setValue(state);
            _this.addArgType('toggle');
            _this.type_ = params.type;
            return _this;
        }
        FieldBreakpoint.prototype.init = function () {
            if (this.fieldGroup_) {
                // Field has already been initialized once.
                return;
            }
            // Build the DOM.
            this.fieldGroup_ = Blockly.utils.createSvgElement('g', {}, null);
            if (!this.visible_) {
                this.fieldGroup_.style.display = 'none';
            }
            // Add an attribute to cassify the type of field.
            if (this.getArgTypes() !== null) {
                if (this.sourceBlock_.isShadow()) {
                    this.sourceBlock_.svgGroup_.setAttribute('data-argument-type', this.getArgTypes());
                }
                else {
                    // Fields without a shadow wrapper, like square dropdowns.
                    this.fieldGroup_.setAttribute('data-argument-type', this.getArgTypes());
                }
            }
            // Adjust X to be flipped for RTL. Position is relative to horizontal start of source block.
            var size = this.getSize();
            this.checkElement_ = Blockly.utils.createSvgElement('g', {
                'class': "blocklyToggle " + (this.state_ ? 'blocklyToggleOnBreakpoint' : 'blocklyToggleOffBreakpoint'),
                'transform': "translate(8, " + size.height / 2 + ")",
            }, this.fieldGroup_);
            this.toggleThumb_ = Blockly.utils.createSvgElement('polygon', {
                'class': 'blocklyToggleRect',
                'points': '50,5 100,5 125,30 125,80 100,105 50,105 25,80 25,30'
            }, this.checkElement_);
            var fieldX = (this.sourceBlock_.RTL) ? -size.width / 2 : size.width / 2;
            /** @type {!Element} */
            this.textElement_ = Blockly.utils.createSvgElement('text', {
                'class': 'blocklyText',
                'x': fieldX,
                'dy': '0.6ex',
                'y': size.height / 2
            }, this.fieldGroup_);
            this.updateEditable();
            this.sourceBlock_.getSvgRoot().appendChild(this.fieldGroup_);
            this.switchToggle(this.state_);
            this.setValue(this.getValue());
            // Force a render.
            this.render_();
            this.size_.width = 0;
            this.mouseDownWrapper_ =
                Blockly.bindEventWithChecks_(this.getClickTarget_(), 'mousedown', this, this.onMouseDown_);
        };
        FieldBreakpoint.prototype.updateWidth = function () {
            this.size_.width = 30;
            this.arrowWidth_ = 0;
        };
        /**
         * Return 'TRUE' if the toggle is ON, 'FALSE' otherwise.
         * @return {string} Current state.
         */
        FieldBreakpoint.prototype.getValue = function () {
            return this.toVal(this.state_);
        };
        ;
        /**
         * Set the checkbox to be checked if newBool is 'TRUE' or true,
         * unchecks otherwise.
         * @param {string|boolean} newBool New state.
         */
        FieldBreakpoint.prototype.setValue = function (newBool) {
            var newState = this.fromVal(newBool);
            if (this.state_ !== newState) {
                if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
                    Blockly.Events.fire(new Blockly.Events.BlockChange(this.sourceBlock_, 'field', this.name, this.state_, newState));
                }
                this.state_ = newState;
                this.switchToggle(this.state_);
            }
        };
        FieldBreakpoint.prototype.switchToggle = function (newState) {
            if (this.checkElement_) {
                this.updateWidth();
                if (newState) {
                    pxtblockly.svg.addClass(this.checkElement_, 'blocklyToggleOnBreakpoint');
                    pxtblockly.svg.removeClass(this.checkElement_, 'blocklyToggleOffBreakpoint');
                }
                else {
                    pxtblockly.svg.removeClass(this.checkElement_, 'blocklyToggleOnBreakpoint');
                    pxtblockly.svg.addClass(this.checkElement_, 'blocklyToggleOffBreakpoint');
                }
                this.checkElement_.setAttribute('transform', "translate(-7, -1) scale(0.3)");
            }
        };
        FieldBreakpoint.prototype.updateTextNode_ = function () {
            _super.prototype.updateTextNode_.call(this);
            if (this.textElement_)
                pxtblockly.svg.addClass(this.textElement_, 'blocklyToggleText');
        };
        FieldBreakpoint.prototype.render_ = function () {
            if (this.visible_ && this.textElement_) {
                // Replace the text.
                goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
                this.updateWidth();
            }
        };
        /**
         * Toggle the state of the toggle.
         * @private
         */
        FieldBreakpoint.prototype.showEditor_ = function () {
            var newState = !this.state_;
            /*
            if (this.sourceBlock_) {
              // Call any validation function, and allow it to override.
              newState = this.callValidator(newState);
            }*/
            if (newState !== null) {
                this.setValue(this.toVal(newState));
            }
        };
        FieldBreakpoint.prototype.toVal = function (newState) {
            if (this.type_ == "number")
                return String(newState ? '1' : '0');
            else
                return String(newState ? 'true' : 'false');
        };
        FieldBreakpoint.prototype.fromVal = function (val) {
            if (typeof val == "string") {
                if (val == "1" || val.toUpperCase() == "TRUE")
                    return true;
                return false;
            }
            return !!val;
        };
        return FieldBreakpoint;
    }(Blockly.FieldNumber));
    pxtblockly.FieldBreakpoint = FieldBreakpoint;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldColorWheel = /** @class */ (function (_super) {
        __extends(FieldColorWheel, _super);
        /**
         * Class for a color wheel field.
         * @param {number|string} value The initial content of the field.
         * @param {Function=} opt_validator An optional function that is called
         *     to validate any constraints on what the user entered.  Takes the new
         *     text as an argument and returns either the accepted text, a replacement
         *     text, or null to abort the change.
         * @extends {Blockly.FieldNumber}
         * @constructor
         */
        function FieldColorWheel(value_, params, opt_validator) {
            var _this = _super.call(this, String(value_), '0', '255', null, '10', 'Color', opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.params = params;
            if (_this.params['min'])
                _this.min_ = parseFloat(_this.params['min']);
            if (_this.params['max'])
                _this.max_ = parseFloat(_this.params['max']);
            if (_this.params['label'])
                _this.labelText_ = _this.params['label'];
            if (_this.params['channel'])
                _this.channel_ = _this.params['channel'];
            return _this;
        }
        /**
         * Set the gradient CSS properties for the given node and channel
         * @param {Node} node - The DOM node the gradient will be set on.
         * @private
         */
        FieldColorWheel.prototype.setBackground_ = function (node) {
            var gradient = this.createColourStops_().join(',');
            goog.style.setStyle(node, 'background', '-moz-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', '-webkit-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', '-o-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', '-ms-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', 'linear-gradient(left, ' + gradient + ')');
            if (this.params['sliderWidth'])
                goog.style.setStyle(node, 'width', this.params['sliderWidth'] + "px");
        };
        ;
        FieldColorWheel.prototype.setReadout_ = function (readout, value) {
            var hexValue = this.colorWheel(parseInt(value), this.channel_);
            // <span class="blocklyColorReadout" style="background-color: ${hexValue};"></span>
            var readoutSpan = document.createElement('span');
            readoutSpan.className = "blocklyColorReadout";
            readoutSpan.style.backgroundColor = "" + hexValue;
            pxsim.U.clear(readout);
            readout.appendChild(readoutSpan);
        };
        FieldColorWheel.prototype.createColourStops_ = function () {
            var stops = [];
            for (var n = 0; n <= 255; n += 20) {
                stops.push(this.colorWheel(n, this.channel_));
            }
            return stops;
        };
        ;
        FieldColorWheel.prototype.colorWheel = function (wheelPos, channel) {
            if (channel == "hsvfast") {
                return this.hsvFast(wheelPos, 255, 255);
            }
            else {
                wheelPos = 255 - wheelPos;
                if (wheelPos < 85) {
                    return this.hex(wheelPos * 3, 255, 255 - wheelPos * 3);
                }
                if (wheelPos < 170) {
                    wheelPos -= 85;
                    return this.hex(255, 255 - wheelPos * 3, wheelPos * 3);
                }
                wheelPos -= 170;
                return this.hex(255 - wheelPos * 3, wheelPos * 3, 255);
            }
        };
        FieldColorWheel.prototype.hsvFast = function (hue, sat, val) {
            var h = (hue % 255) >> 0;
            if (h < 0)
                h += 255;
            // scale down to 0..192
            h = (h * 192 / 255) >> 0;
            //reference: based on FastLED's hsv2rgb rainbow algorithm [https://github.com/FastLED/FastLED](MIT)
            var invsat = 255 - sat;
            var brightness_floor = ((val * invsat) / 255) >> 0;
            var color_amplitude = val - brightness_floor;
            var section = (h / 0x40) >> 0; // [0..2]
            var offset = (h % 0x40) >> 0; // [0..63]
            var rampup = offset;
            var rampdown = (0x40 - 1) - offset;
            var rampup_amp_adj = ((rampup * color_amplitude) / (255 / 4)) >> 0;
            var rampdown_amp_adj = ((rampdown * color_amplitude) / (255 / 4)) >> 0;
            var rampup_adj_with_floor = (rampup_amp_adj + brightness_floor);
            var rampdown_adj_with_floor = (rampdown_amp_adj + brightness_floor);
            var r;
            var g;
            var b;
            if (section) {
                if (section == 1) {
                    // section 1: 0x40..0x7F
                    r = brightness_floor;
                    g = rampdown_adj_with_floor;
                    b = rampup_adj_with_floor;
                }
                else {
                    // section 2; 0x80..0xBF
                    r = rampup_adj_with_floor;
                    g = brightness_floor;
                    b = rampdown_adj_with_floor;
                }
            }
            else {
                // section 0: 0x00..0x3F
                r = rampdown_adj_with_floor;
                g = rampup_adj_with_floor;
                b = brightness_floor;
            }
            return this.hex(r, g, b);
        };
        FieldColorWheel.prototype.hex = function (red, green, blue) {
            return "#" + this.componentToHex(red & 0xFF) + this.componentToHex(green & 0xFF) + this.componentToHex(blue & 0xFF);
        };
        FieldColorWheel.prototype.componentToHex = function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        };
        return FieldColorWheel;
    }(Blockly.FieldSlider));
    pxtblockly.FieldColorWheel = FieldColorWheel;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldColorNumber = /** @class */ (function (_super) {
        __extends(FieldColorNumber, _super);
        function FieldColorNumber(text, params, opt_validator) {
            var _this = _super.call(this, text, opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.valueMode_ = "rgb";
            if (params.colours)
                _this.setColours(JSON.parse(params.colours));
            else if (pxt.appTarget.runtime && pxt.appTarget.runtime.palette) {
                var p = pxt.Util.clone(pxt.appTarget.runtime.palette);
                p[0] = "#dedede";
                _this.setColours(p);
            }
            if (params.columns)
                _this.setColumns(parseInt(params.columns));
            if (params.className)
                _this.className_ = params.className;
            if (params.valueMode)
                _this.valueMode_ = params.valueMode;
            return _this;
        }
        /**
         * Return the current colour.
         * @param {boolean} opt_asHex optional field if the returned value should be a hex
         * @return {string} Current colour in '#rrggbb' format.
         */
        FieldColorNumber.prototype.getValue = function (opt_asHex) {
            if (opt_asHex)
                return this.colour_;
            switch (this.valueMode_) {
                case "hex":
                    return "\"" + this.colour_ + "\"";
                case "rgb":
                    if (this.colour_.indexOf('#') > -1) {
                        return "0x" + this.colour_.replace(/^#/, '');
                    }
                    else {
                        return this.colour_;
                    }
                case "index":
                    return this.getColours_().indexOf(this.colour_).toString();
            }
            return this.colour_;
        };
        /**
         * Set the colour.
         * @param {string} colour The new colour in '#rrggbb' format.
         */
        FieldColorNumber.prototype.setValue = function (colour) {
            if (colour.indexOf('0x') > -1) {
                colour = "#" + colour.substr(2);
            }
            else if (this.valueMode_ === "index") {
                var allColors = this.getColours_();
                if (allColors.indexOf(colour) === -1) {
                    // Might be the index and not the color
                    var i = parseInt(colour);
                    if (!isNaN(i) && i >= 0 && i < allColors.length) {
                        colour = allColors[i];
                    }
                    else {
                        colour = allColors[0];
                    }
                }
            }
            if (this.sourceBlock_ && Blockly.Events.isEnabled() &&
                this.colour_ != colour) {
                Blockly.Events.fire(new Blockly.Events.BlockChange(this.sourceBlock_, 'field', this.name, this.colour_, colour));
            }
            this.colour_ = colour;
            if (this.sourceBlock_) {
                this.sourceBlock_.setColour(colour, colour, colour);
            }
        };
        FieldColorNumber.prototype.showEditor_ = function () {
            _super.prototype.showEditor_.call(this);
            if (this.className_ && this.colorPicker_)
                Blockly.utils.addClass((this.colorPicker_.getElement()), this.className_);
        };
        FieldColorNumber.prototype.getColours_ = function () {
            return this.colours_;
        };
        return FieldColorNumber;
    }(Blockly.FieldColour));
    pxtblockly.FieldColorNumber = FieldColorNumber;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldGridPicker = /** @class */ (function (_super) {
        __extends(FieldGridPicker, _super);
        function FieldGridPicker(text, options, validator) {
            var _this = _super.call(this, options.data) || this;
            _this.isFieldCustom_ = true;
            /**
             * Callback for when a button is clicked inside the drop-down.
             * Should be bound to the FieldIconMenu.
             * @param {Event} e DOM event for the click/touch
             * @private
             */
            _this.buttonClick_ = function (e) {
                var value = e.target.getAttribute('data-value');
                if (value !== null) {
                    this.setValue(value);
                    // Close the picker
                    if (this.closeModal_) {
                        this.close();
                        this.closeModal_ = false;
                    }
                }
            };
            _this.buttonClickAndClose_ = function (e) {
                this.closeModal_ = true;
                this.buttonClick_(e);
            };
            _this.columns_ = parseInt(options.columns) || 4;
            _this.maxRows_ = parseInt(options.maxRows) || 0;
            _this.width_ = parseInt(options.width) || 200;
            _this.backgroundColour_ = pxtblockly.parseColour(options.colour);
            _this.borderColour_ = pxt.toolbox.fadeColor(_this.backgroundColour_, 0.4, false);
            var tooltipCfg = {
                xOffset: parseInt(options.tooltipsXOffset) || 15,
                yOffset: parseInt(options.tooltipsYOffset) || -10
            };
            _this.tooltipConfig_ = tooltipCfg;
            _this.hasSearchBar_ = !!options.hasSearchBar || false;
            _this.hideRect_ = !!options.hideRect || false;
            return _this;
        }
        /**
         * When disposing the grid picker, make sure the tooltips are disposed too.
         * @public
         */
        FieldGridPicker.prototype.dispose = function () {
            _super.prototype.dispose.call(this);
            this.disposeTooltip();
            this.disposeIntersectionObserver();
        };
        FieldGridPicker.prototype.createTooltip_ = function () {
            if (this.tooltip_)
                return;
            // Create tooltip
            this.tooltip_ = document.createElement('div');
            this.tooltip_.className = 'goog-tooltip blocklyGridPickerTooltip';
            this.tooltip_.style.position = 'absolute';
            this.tooltip_.style.display = 'none';
            this.tooltip_.style.visibility = 'hidden';
            document.body.appendChild(this.tooltip_);
        };
        /**
         * Create blocklyGridPickerRows and add them to table container
         * @param options
         * @param tableContainer
         */
        FieldGridPicker.prototype.populateTableContainer = function (options, tableContainer, scrollContainer) {
            pxsim.U.removeChildren(tableContainer);
            if (options.length == 0) {
                this.firstItem_ = undefined;
            }
            for (var i = 0; i < options.length / this.columns_; i++) {
                var row = this.populateRow(i, options, tableContainer);
                tableContainer.appendChild(row);
            }
        };
        /**
         * Populate a single row and add it to table container
         * @param row
         * @param options
         * @param tableContainer
         */
        FieldGridPicker.prototype.populateRow = function (row, options, tableContainer) {
            var _this = this;
            var columns = this.columns_;
            var rowContent = document.createElement('div');
            rowContent.className = 'blocklyGridPickerRow';
            var _loop_2 = function (i) {
                var content = options[i][0]; // Human-readable text or image.
                var value = options[i][1]; // Language-neutral value.
                var menuItem = document.createElement('div');
                menuItem.className = 'goog-menuitem goog-option';
                menuItem.setAttribute('id', ':' + i); // For aria-activedescendant
                menuItem.setAttribute('role', 'menuitem');
                menuItem.style.userSelect = 'none';
                menuItem.title = content['alt'] || content;
                menuItem.setAttribute('data-value', value);
                var menuItemContent = document.createElement('div');
                menuItemContent.setAttribute('class', 'goog-menuitem-content');
                menuItemContent.title = content['alt'] || content;
                menuItemContent.setAttribute('data-value', value);
                var hasImages = typeof content == 'object';
                // Set colour
                var backgroundColour = this_2.backgroundColour_;
                if (value == this_2.getValue()) {
                    // This option is selected
                    menuItem.setAttribute('aria-selected', 'true');
                    Blockly.utils.addClass(menuItem, 'goog-option-selected');
                    backgroundColour = this_2.sourceBlock_.getColourTertiary();
                    // Save so we can scroll to it later
                    this_2.selectedItemDom = menuItem;
                    if (hasImages && !this_2.shouldShowTooltips()) {
                        this_2.updateSelectedBar_(content, value);
                    }
                }
                menuItem.style.backgroundColor = backgroundColour;
                menuItem.style.borderColor = this_2.borderColour_;
                if (hasImages) {
                    // An image, not text.
                    var buttonImg = new Image(content['width'], content['height']);
                    buttonImg.setAttribute('draggable', 'false');
                    if (!('IntersectionObserver' in window)) {
                        // No intersection observer support, set the image url immediately
                        buttonImg.src = content['src'];
                    }
                    else {
                        buttonImg.src = FieldGridPicker.DEFAULT_IMG;
                        buttonImg.setAttribute('data-src', content['src']);
                        this_2.observer.observe(buttonImg);
                    }
                    buttonImg.alt = content['alt'] || '';
                    buttonImg.setAttribute('data-value', value);
                    menuItemContent.appendChild(buttonImg);
                }
                else {
                    // text
                    menuItemContent.textContent = content;
                }
                if (this_2.shouldShowTooltips()) {
                    Blockly.bindEvent_(menuItem, 'click', this_2, this_2.buttonClickAndClose_);
                    // Setup hover tooltips
                    var xOffset_1 = (this_2.sourceBlock_.RTL ? -this_2.tooltipConfig_.xOffset : this_2.tooltipConfig_.xOffset);
                    var yOffset_1 = this_2.tooltipConfig_.yOffset;
                    Blockly.bindEvent_(menuItem, 'mousemove', this_2, function (e) {
                        if (hasImages) {
                            _this.tooltip_.style.top = e.clientY + yOffset_1 + "px";
                            _this.tooltip_.style.left = e.clientX + xOffset_1 + "px";
                            // Set tooltip text
                            var touchTarget = document.elementFromPoint(e.clientX, e.clientY);
                            var title = touchTarget.title || touchTarget.alt;
                            _this.tooltip_.textContent = title;
                            // Show the tooltip
                            _this.tooltip_.style.visibility = title ? 'visible' : 'hidden';
                            _this.tooltip_.style.display = title ? '' : 'none';
                        }
                        Blockly.utils.addClass(menuItem, 'goog-menuitem-highlight');
                        tableContainer.setAttribute('aria-activedescendant', menuItem.id);
                    });
                    Blockly.bindEvent_(menuItem, 'mouseout', this_2, function (e) {
                        if (hasImages) {
                            // Hide the tooltip
                            _this.tooltip_.style.visibility = 'hidden';
                            _this.tooltip_.style.display = 'none';
                        }
                        Blockly.utils.removeClass(menuItem, 'goog-menuitem-highlight');
                        tableContainer.removeAttribute('aria-activedescendant');
                    });
                }
                else {
                    if (hasImages) {
                        // Show the selected bar
                        this_2.selectedBar_.style.display = '';
                        // Show the selected item (in the selected bar)
                        Blockly.bindEvent_(menuItem, 'click', this_2, function (e) {
                            if (_this.closeModal_) {
                                _this.buttonClick_(e);
                            }
                            else {
                                // Clear all current hovers.
                                var currentHovers = tableContainer.getElementsByClassName('goog-menuitem-highlight');
                                for (var i_3 = 0; i_3 < currentHovers.length; i_3++) {
                                    Blockly.utils.removeClass(currentHovers[i_3], 'goog-menuitem-highlight');
                                }
                                // Set hover on current item
                                Blockly.utils.addClass(menuItem, 'goog-menuitem-highlight');
                                _this.updateSelectedBar_(content, value);
                            }
                        });
                    }
                    else {
                        Blockly.bindEvent_(menuItem, 'click', this_2, this_2.buttonClickAndClose_);
                        Blockly.bindEvent_(menuItem, 'mouseup', this_2, this_2.buttonClickAndClose_);
                    }
                }
                menuItem.appendChild(menuItemContent);
                rowContent.appendChild(menuItem);
                if (i == 0) {
                    this_2.firstItem_ = menuItem;
                }
            };
            var this_2 = this;
            for (var i = (columns * row); i < Math.min((columns * row) + columns, options.length); i++) {
                _loop_2(i);
            }
            return rowContent;
        };
        /**
         * Whether or not to show a box around the dropdown menu.
         * @return {boolean} True if we should show a box (rect) around the dropdown menu. Otherwise false.
         * @private
         */
        FieldGridPicker.prototype.shouldShowRect_ = function () {
            return !this.hideRect_ ? !this.sourceBlock_.isShadow() : false;
        };
        /**
         * Set the language-neutral value for this dropdown menu.
         * We have to override this from field.js because the grid picker needs to redraw the selected item's image.
         * @param {string} newValue New value to set.
         */
        FieldGridPicker.prototype.setValue = function (newValue) {
            if (newValue === null || newValue === this.value_) {
                return; // No change if null.
            }
            if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
                Blockly.Events.fire(new Blockly.Events.BlockChange(this.sourceBlock_, 'field', this.name, this.value_, newValue));
            }
            this.value_ = newValue;
            // Look up and display the human-readable text.
            var options = this.getOptions();
            for (var i = 0; i < options.length; i++) {
                // Options are tuples of human-readable text and language-neutral values.
                if (options[i][1] == newValue) {
                    var content = options[i][0];
                    if (typeof content == 'object') {
                        this.imageJson_ = content;
                        this.setText(content.alt); // Use setText() because it handles displaying image selection
                    }
                    else {
                        this.imageJson_ = null;
                        this.setText(content); // Use setText() because it handles displaying image selection
                    }
                    return;
                }
            }
            // Value not found.  Add it, maybe it will become valid once set
            // (like variable names).
            this.setText(newValue); // Use setText() because it handles displaying image selection
        };
        ;
        /**
         * Closes the gridpicker.
         */
        FieldGridPicker.prototype.close = function () {
            this.disposeTooltip();
            Blockly.WidgetDiv.hideIfOwner(this);
            Blockly.Events.setGroup(false);
        };
        /**
         * Getter method
         */
        FieldGridPicker.prototype.getFirstItem = function () {
            return this.firstItem_;
        };
        /**
         * Highlight first item in menu, de-select and de-highlight all others
         */
        FieldGridPicker.prototype.highlightFirstItem = function (tableContainerDom) {
            var menuItemsDom = tableContainerDom.childNodes;
            if (menuItemsDom.length && menuItemsDom[0].childNodes) {
                for (var row = 0; row < menuItemsDom.length; ++row) {
                    var rowLength = menuItemsDom[row].childNodes.length;
                    for (var col = 0; col < rowLength; ++col) {
                        var menuItem = menuItemsDom[row].childNodes[col];
                        menuItem.classList.remove("goog-menuitem-highlight");
                        menuItem.classList.remove("goog-option-selected");
                    }
                }
                var firstItem = menuItemsDom[0].childNodes[0];
                firstItem.className += " goog-menuitem-highlight";
            }
        };
        /**
         * Scroll menu to item that equals current value of gridpicker
         */
        FieldGridPicker.prototype.highlightAndScrollSelected = function (tableContainerDom, scrollContainerDom) {
            if (!this.selectedItemDom)
                return;
            goog.style.scrollIntoContainerView(this.selectedItemDom, scrollContainerDom, true);
        };
        /**
         * Create a dropdown menu under the text.
         * @private
         */
        FieldGridPicker.prototype.showEditor_ = function () {
            var _this = this;
            Blockly.WidgetDiv.show(this, this.sourceBlock_.RTL, function () {
                _this.onClose_();
            });
            this.setupIntersectionObserver_();
            this.createTooltip_();
            var tableContainer = document.createElement("div");
            this.positionMenu_(tableContainer);
        };
        FieldGridPicker.prototype.positionMenu_ = function (tableContainer) {
            // Record viewport dimensions before adding the dropdown.
            var viewportBBox = Blockly.utils.getViewportBBox();
            var anchorBBox = this.getAnchorDimensions_();
            var _a = this.createWidget_(tableContainer), paddingContainer = _a.paddingContainer, scrollContainer = _a.scrollContainer;
            var containerSize = {
                width: paddingContainer.offsetWidth,
                height: paddingContainer.offsetHeight
            }; //goog.style.getSize(paddingContainer);
            // Set width
            var windowSize = goog.dom.getViewportSize();
            if (this.width_ > windowSize.width) {
                this.width_ = windowSize.width;
            }
            tableContainer.style.width = this.width_ + 'px';
            var addedHeight = 0;
            if (this.hasSearchBar_)
                addedHeight += 50; // Account for search bar
            if (this.selectedBar_)
                addedHeight += 50; // Account for the selected bar
            // Set height
            if (this.maxRows_) {
                // Calculate height
                var firstRowDom = tableContainer.children[0];
                var rowHeight = firstRowDom.offsetHeight;
                // Compute maxHeight using maxRows + 0.3 to partially show next row, to hint at scrolling
                var maxHeight = rowHeight * (this.maxRows_ + 0.3);
                if (windowSize.height < (maxHeight + addedHeight)) {
                    maxHeight = windowSize.height - addedHeight;
                }
                if (containerSize.height > maxHeight) {
                    scrollContainer.style.overflowY = "auto";
                    goog.style.setHeight(scrollContainer, maxHeight);
                    containerSize.height = maxHeight;
                }
            }
            containerSize.height += addedHeight;
            if (this.sourceBlock_.RTL) {
                Blockly.utils.uiMenu.adjustBBoxesForRTL(viewportBBox, anchorBBox, containerSize);
            }
            // Position the menu.
            Blockly.WidgetDiv.positionWithAnchor(viewportBBox, anchorBBox, containerSize, this.sourceBlock_.RTL);
            //            (<any>scrollContainer).focus();
            this.highlightAndScrollSelected(tableContainer, scrollContainer);
        };
        ;
        FieldGridPicker.prototype.shouldShowTooltips = function () {
            return !pxt.BrowserUtils.isMobile();
        };
        FieldGridPicker.prototype.getAnchorDimensions_ = function () {
            var boundingBox = this.getScaledBBox_();
            if (this.sourceBlock_.RTL) {
                boundingBox.right += Blockly.FieldDropdown.CHECKMARK_OVERHANG;
            }
            else {
                boundingBox.left -= Blockly.FieldDropdown.CHECKMARK_OVERHANG;
            }
            return boundingBox;
        };
        ;
        FieldGridPicker.prototype.createWidget_ = function (tableContainer) {
            var div = Blockly.WidgetDiv.DIV;
            var options = this.getOptions();
            // Container for the menu rows
            tableContainer.setAttribute("role", "menu");
            tableContainer.setAttribute("aria-haspopup", "true");
            // Container used to limit the height of the tableContainer, because the tableContainer uses
            // display: table, which ignores height and maxHeight
            var scrollContainer = document.createElement("div");
            // Needed to correctly style borders and padding around the scrollContainer, because the padding around the
            // scrollContainer is part of the scrollable area and will not be correctly shown at the top and bottom
            // when scrolling
            var paddingContainer = document.createElement("div");
            paddingContainer.style.border = "solid 1px " + this.borderColour_;
            tableContainer.style.backgroundColor = this.backgroundColour_;
            scrollContainer.style.backgroundColor = this.backgroundColour_;
            paddingContainer.style.backgroundColor = this.backgroundColour_;
            tableContainer.className = 'blocklyGridPickerMenu';
            scrollContainer.className = 'blocklyGridPickerScroller';
            paddingContainer.className = 'blocklyGridPickerPadder';
            paddingContainer.appendChild(scrollContainer);
            scrollContainer.appendChild(tableContainer);
            div.appendChild(paddingContainer);
            // Search bar
            if (this.hasSearchBar_) {
                var searchBar = this.createSearchBar_(tableContainer, scrollContainer, options);
                paddingContainer.insertBefore(searchBar, paddingContainer.childNodes[0]);
            }
            // Selected bar
            if (!this.shouldShowTooltips()) {
                this.selectedBar_ = this.createSelectedBar_();
                paddingContainer.appendChild(this.selectedBar_);
            }
            // Render elements
            this.populateTableContainer(options, tableContainer, scrollContainer);
            return { paddingContainer: paddingContainer, scrollContainer: scrollContainer };
        };
        FieldGridPicker.prototype.createSearchBar_ = function (tableContainer, scrollContainer, options) {
            var _this = this;
            var searchBarDiv = document.createElement("div");
            searchBarDiv.setAttribute("class", "ui fluid icon input");
            var searchIcon = document.createElement("i");
            searchIcon.setAttribute("class", "search icon");
            var searchBar = document.createElement("input");
            searchBar.setAttribute("type", "search");
            searchBar.setAttribute("id", "search-bar");
            searchBar.setAttribute("class", "blocklyGridPickerSearchBar");
            searchBar.setAttribute("placeholder", pxt.Util.lf("Search"));
            searchBar.addEventListener("click", function () {
                searchBar.focus();
                searchBar.setSelectionRange(0, searchBar.value.length);
            });
            // Search on key change
            searchBar.addEventListener("keyup", pxt.Util.debounce(function () {
                var text = searchBar.value;
                var re = new RegExp(text, "i");
                var filteredOptions = options.filter(function (block) {
                    var alt = block[0].alt; // Human-readable text or image.
                    var value = block[1]; // Language-neutral value.
                    return alt ? re.test(alt) : re.test(value);
                });
                _this.populateTableContainer.bind(_this)(filteredOptions, tableContainer, scrollContainer);
                if (text) {
                    _this.highlightFirstItem(tableContainer);
                }
                else {
                    _this.highlightAndScrollSelected(tableContainer, scrollContainer);
                }
                // Hide the tooltip
                _this.tooltip_.style.visibility = 'hidden';
                _this.tooltip_.style.display = 'none';
            }, 300, false));
            // Select the first item if the enter key is pressed
            searchBar.addEventListener("keyup", function (e) {
                var code = e.which;
                if (code == 13) {
                    // Select the first item in the list
                    var firstRow = tableContainer.childNodes[0];
                    if (firstRow) {
                        var firstItem = firstRow.childNodes[0];
                        if (firstItem) {
                            _this.closeModal_ = true;
                            firstItem.click();
                        }
                    }
                }
            });
            searchBarDiv.appendChild(searchBar);
            searchBarDiv.appendChild(searchIcon);
            return searchBarDiv;
        };
        FieldGridPicker.prototype.createSelectedBar_ = function () {
            var _this = this;
            var selectedBar = document.createElement("div");
            selectedBar.setAttribute("class", "blocklyGridPickerSelectedBar");
            selectedBar.style.display = 'none';
            var selectedWrapper = document.createElement("div");
            var selectedImgWrapper = document.createElement("div");
            selectedImgWrapper.className = 'blocklyGridPickerSelectedImage';
            selectedWrapper.appendChild(selectedImgWrapper);
            this.selectedImg_ = document.createElement("img");
            this.selectedImg_.setAttribute('width', '30px');
            this.selectedImg_.setAttribute('height', '30px');
            this.selectedImg_.setAttribute('draggable', 'false');
            this.selectedImg_.style.display = 'none';
            this.selectedImg_.src = FieldGridPicker.DEFAULT_IMG;
            selectedImgWrapper.appendChild(this.selectedImg_);
            this.selectedBarText_ = document.createElement("span");
            this.selectedBarText_.className = 'blocklyGridPickerTooltip';
            selectedWrapper.appendChild(this.selectedBarText_);
            var buttonsWrapper = document.createElement("div");
            var buttonsDiv = document.createElement("div");
            buttonsDiv.className = 'ui buttons mini';
            buttonsWrapper.appendChild(buttonsDiv);
            var selectButton = document.createElement("button");
            selectButton.className = "ui button icon green";
            var selectButtonIcon = document.createElement("i");
            selectButtonIcon.className = 'icon check';
            selectButton.appendChild(selectButtonIcon);
            Blockly.bindEvent_(selectButton, 'click', this, function () {
                _this.setValue(_this.selectedBarValue_);
                _this.close();
            });
            var cancelButton = document.createElement("button");
            cancelButton.className = "ui button icon red";
            var cancelButtonIcon = document.createElement("i");
            cancelButtonIcon.className = 'icon cancel';
            cancelButton.appendChild(cancelButtonIcon);
            Blockly.bindEvent_(cancelButton, 'click', this, function () {
                _this.close();
            });
            buttonsDiv.appendChild(selectButton);
            buttonsDiv.appendChild(cancelButton);
            selectedBar.appendChild(selectedWrapper);
            selectedBar.appendChild(buttonsWrapper);
            return selectedBar;
        };
        FieldGridPicker.prototype.updateSelectedBar_ = function (content, value) {
            if (content['src']) {
                this.selectedImg_.src = content['src'];
                this.selectedImg_.style.display = '';
            }
            this.selectedImg_.alt = content['alt'] || content;
            this.selectedBarText_.textContent = content['alt'] || content;
            this.selectedBarValue_ = value;
        };
        FieldGridPicker.prototype.setupIntersectionObserver_ = function () {
            var _this = this;
            if (!('IntersectionObserver' in window))
                return;
            this.disposeIntersectionObserver();
            // setup intersection observer for the image
            var preloadImage = function (el) {
                var lazyImageUrl = el.getAttribute('data-src');
                if (lazyImageUrl) {
                    el.src = lazyImageUrl;
                    el.removeAttribute('data-src');
                }
            };
            var config = {
                // If the image gets within 50px in the Y axis, start the download.
                rootMargin: '20px 0px',
                threshold: 0.01
            };
            var onIntersection = function (entries) {
                entries.forEach(function (entry) {
                    // Are we in viewport?
                    if (entry.intersectionRatio > 0) {
                        // Stop watching and load the image
                        _this.observer.unobserve(entry.target);
                        preloadImage(entry.target);
                    }
                });
            };
            this.observer = new IntersectionObserver(onIntersection, config);
        };
        FieldGridPicker.prototype.disposeIntersectionObserver = function () {
            if (this.observer) {
                this.observer = null;
            }
        };
        /**
         * Disposes the tooltip DOM.
         * @private
         */
        FieldGridPicker.prototype.disposeTooltip = function () {
            if (this.tooltip_) {
                pxsim.U.remove(this.tooltip_);
                this.tooltip_ = null;
            }
        };
        FieldGridPicker.prototype.onClose_ = function () {
            this.disposeTooltip();
        };
        /**
         * Sets the text in this field.  Trigger a rerender of the source block.
         * @param {?string} text New text.
         */
        FieldGridPicker.prototype.setText = function (text) {
            if (text === null || text === this.text_) {
                // No change if null.
                return;
            }
            this.text_ = text;
            this.updateTextNode_();
            if (this.imageJson_ && this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyHidden');
                this.imageElement_.parentNode.appendChild(this.arrow_);
            }
            else if (this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyDropdownText');
                this.textElement_.parentNode.appendChild(this.arrow_);
            }
            if (this.sourceBlock_ && this.sourceBlock_.rendered) {
                this.sourceBlock_.render();
                this.sourceBlock_.bumpNeighbours_();
            }
        };
        ;
        /**
         * Updates the width of the field. This calls getCachedWidth which won't cache
         * the approximated width on IE/Microsoft Edge when `getComputedTextLength` fails. Once
         * it eventually does succeed, the result will be cached.
         **/
        FieldGridPicker.prototype.updateWidth = function () {
            var width;
            if (this.imageJson_) {
                width = this.imageJson_.width + 5;
                this.arrowY_ = this.imageJson_.height / 2;
            }
            else {
                // Calculate width of field
                width = Blockly.Field.getCachedWidth(this.textElement_);
            }
            // Add padding to left and right of text.
            if (this.EDITABLE) {
                width += Blockly.BlockSvg.EDITABLE_FIELD_PADDING;
            }
            // Adjust width for drop-down arrows.
            this.arrowWidth_ = 0;
            if (this.positionArrow) {
                this.arrowWidth_ = this.positionArrow(width);
                width += this.arrowWidth_;
            }
            // Add padding to any drawn box.
            if (this.box_) {
                width += 2 * Blockly.BlockSvg.BOX_FIELD_PADDING;
            }
            // Set width of the field.
            this.size_.width = width;
        };
        ;
        /**
         * Update the text node of this field to display the current text.
         * @private
         */
        FieldGridPicker.prototype.updateTextNode_ = function () {
            if (!this.textElement_ && !this.imageElement_) {
                // Not rendered yet.
                return;
            }
            var text = this.text_;
            if (text.length > this.maxDisplayLength) {
                // Truncate displayed string and add an ellipsis ('...').
                text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
                // Add special class for sizing font when truncated
                this.textElement_.setAttribute('class', 'blocklyText blocklyTextTruncated');
            }
            else {
                this.textElement_.setAttribute('class', 'blocklyText');
            }
            // Empty the text element.
            goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
            goog.dom.removeNode(this.imageElement_);
            this.imageElement_ = null;
            if (this.imageJson_) {
                // Image option is selected.
                this.imageElement_ = Blockly.utils.createSvgElement('image', {
                    'y': 5, 'x': 8, 'height': this.imageJson_.height + 'px',
                    'width': this.imageJson_.width + 'px', cursor: 'pointer'
                });
                this.imageElement_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', this.imageJson_.src);
                this.size_.height = Number(this.imageJson_.height) + 10;
                if (this.sourceBlock_.RTL)
                    this.imageElement_.setAttribute('transform', 'translate(' + this.arrowWidth_ + ', 0)');
                this.textElement_.parentNode.appendChild(this.imageElement_);
            }
            else {
                // Replace whitespace with non-breaking spaces so the text doesn't collapse.
                text = text.replace(/\s/g, Blockly.Field.NBSP);
                if (this.sourceBlock_.RTL && text) {
                    // The SVG is LTR, force text to be RTL.
                    text += '\u200F';
                }
                if (!text) {
                    // Prevent the field from disappearing if empty.
                    text = Blockly.Field.NBSP;
                }
                var textNode = document.createTextNode(text);
                this.textElement_.appendChild(textNode);
            }
            // Cached width is obsolete.  Clear it.
            this.size_.width = 0;
        };
        ;
        FieldGridPicker.DEFAULT_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        return FieldGridPicker;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldGridPicker = FieldGridPicker;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldImageDropdown = /** @class */ (function (_super) {
        __extends(FieldImageDropdown, _super);
        function FieldImageDropdown(text, options, validator) {
            var _this = _super.call(this, options.data) || this;
            _this.isFieldCustom_ = true;
            /**
             * Callback for when a button is clicked inside the drop-down.
             * Should be bound to the FieldIconMenu.
             * @param {Event} e DOM event for the click/touch
             * @private
             */
            _this.buttonClick_ = function (e) {
                var value = e.target.getAttribute('data-value');
                if (!value)
                    return;
                this.setValue(value);
                this.setText(value);
                Blockly.DropDownDiv.hide();
            };
            _this.columns_ = parseInt(options.columns);
            _this.maxRows_ = parseInt(options.maxRows) || 0;
            _this.width_ = parseInt(options.width) || 300;
            _this.backgroundColour_ = pxtblockly.parseColour(options.colour);
            _this.borderColour_ = pxt.toolbox.fadeColor(_this.backgroundColour_, 0.4, false);
            return _this;
        }
        /**
         * Create a dropdown menu under the text.
         * @private
         */
        FieldImageDropdown.prototype.showEditor_ = function () {
            // If there is an existing drop-down we own, this is a request to hide the drop-down.
            if (Blockly.DropDownDiv.hideIfOwner(this)) {
                return;
            }
            // If there is an existing drop-down someone else owns, hide it immediately and clear it.
            Blockly.DropDownDiv.hideWithoutAnimation();
            Blockly.DropDownDiv.clearContent();
            // Populate the drop-down with the icons for this field.
            var dropdownDiv = Blockly.DropDownDiv.getContentDiv();
            var contentDiv = document.createElement('div');
            // Accessibility properties
            contentDiv.setAttribute('role', 'menu');
            contentDiv.setAttribute('aria-haspopup', 'true');
            var options = this.getOptions();
            var maxButtonHeight = 0;
            for (var i = 0; i < options.length; i++) {
                var content = options[i][0]; // Human-readable text or image.
                var value = options[i][1]; // Language-neutral value.
                // Icons with the type property placeholder take up space but don't have any functionality
                // Use for special-case layouts
                if (content.type == 'placeholder') {
                    var placeholder = document.createElement('span');
                    placeholder.setAttribute('class', 'blocklyDropDownPlaceholder');
                    placeholder.style.width = content.width + 'px';
                    placeholder.style.height = content.height + 'px';
                    contentDiv.appendChild(placeholder);
                    continue;
                }
                var button = document.createElement('button');
                button.setAttribute('id', ':' + i); // For aria-activedescendant
                button.setAttribute('role', 'menuitem');
                button.setAttribute('class', 'blocklyDropDownButton');
                button.title = content.alt;
                var buttonSize = content.height;
                if (this.columns_) {
                    buttonSize = ((this.width_ / this.columns_) - 8);
                    button.style.width = buttonSize + 'px';
                    button.style.height = buttonSize + 'px';
                }
                else {
                    button.style.width = content.width + 'px';
                    button.style.height = content.height + 'px';
                }
                if (buttonSize > maxButtonHeight) {
                    maxButtonHeight = buttonSize;
                }
                var backgroundColor = this.backgroundColour_;
                if (value == this.getValue()) {
                    // This icon is selected, show it in a different colour
                    backgroundColor = this.sourceBlock_.getColourTertiary();
                    button.setAttribute('aria-selected', 'true');
                }
                button.style.backgroundColor = backgroundColor;
                button.style.borderColor = this.borderColour_;
                Blockly.bindEvent_(button, 'click', this, this.buttonClick_);
                Blockly.bindEvent_(button, 'mouseover', button, function () {
                    this.setAttribute('class', 'blocklyDropDownButton blocklyDropDownButtonHover');
                    contentDiv.setAttribute('aria-activedescendant', this.id);
                });
                Blockly.bindEvent_(button, 'mouseout', button, function () {
                    this.setAttribute('class', 'blocklyDropDownButton');
                    contentDiv.removeAttribute('aria-activedescendant');
                });
                var buttonImg = document.createElement('img');
                buttonImg.src = content.src;
                //buttonImg.alt = icon.alt;
                // Upon click/touch, we will be able to get the clicked element as e.target
                // Store a data attribute on all possible click targets so we can match it to the icon.
                button.setAttribute('data-value', value);
                buttonImg.setAttribute('data-value', value);
                button.appendChild(buttonImg);
                contentDiv.appendChild(button);
            }
            contentDiv.style.width = this.width_ + 'px';
            dropdownDiv.appendChild(contentDiv);
            if (this.maxRows_) {
                // Limit the number of rows shown, but add a partial next row to indicate scrolling
                dropdownDiv.style.maxHeight = (this.maxRows_ + 0.4) * (maxButtonHeight + 8) + 'px';
            }
            if (pxt.BrowserUtils.isFirefox()) {
                // This is to compensate for the scrollbar that overlays content in Firefox. It
                // gets removed in onHide_()
                Blockly.DropDownDiv.getContentDiv().style.paddingRight = "20px";
            }
            Blockly.DropDownDiv.setColour(this.backgroundColour_, this.borderColour_);
            var scale = this.sourceBlock_.workspace.scale;
            // Offset for icon-type horizontal blocks.
            var secondaryYOffset = (-(Blockly.BlockSvg.MIN_BLOCK_Y * scale) - (Blockly.BlockSvg.FIELD_Y_OFFSET * scale));
            Blockly.DropDownDiv.showPositionedByBlock(this, this.sourceBlock_, this.onHide_.bind(this), secondaryYOffset);
            if (this.sourceBlock_.isShadow()) {
                this.savedPrimary_ = this.sourceBlock_.getColour();
                this.sourceBlock_.setColour(this.sourceBlock_.getColourTertiary(), this.sourceBlock_.getColourSecondary(), this.sourceBlock_.getColourTertiary());
            }
            else if (this.box_) {
                this.box_.setAttribute('fill', this.sourceBlock_.getColourTertiary());
            }
        };
        /**
         * Callback for when the drop-down is hidden.
         */
        FieldImageDropdown.prototype.onHide_ = function () {
            Blockly.DropDownDiv.content_.removeAttribute('role');
            Blockly.DropDownDiv.content_.removeAttribute('aria-haspopup');
            Blockly.DropDownDiv.content_.removeAttribute('aria-activedescendant');
            Blockly.DropDownDiv.getContentDiv().style.width = '';
            Blockly.DropDownDiv.getContentDiv().style.paddingRight = '';
            if (this.sourceBlock_) {
                if (this.sourceBlock_.isShadow()) {
                    this.sourceBlock_.setColour(this.savedPrimary_, this.sourceBlock_.getColourSecondary(), this.sourceBlock_.getColourTertiary());
                }
                else if (this.box_) {
                    this.box_.setAttribute('fill', this.sourceBlock_.getColour());
                }
            }
        };
        ;
        /**
         * Sets the text in this field.  Trigger a rerender of the source block.
         * @param {?string} text New text.
         */
        FieldImageDropdown.prototype.setText = function (text) {
            if (text === null || text === this.text_) {
                // No change if null.
                return;
            }
            this.text_ = text;
            this.updateTextNode_();
            if (this.imageJson_ && this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyHidden');
                this.imageElement_.parentNode.appendChild(this.arrow_);
            }
            else if (this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyDropdownText');
                this.textElement_.parentNode.appendChild(this.arrow_);
            }
            if (this.sourceBlock_ && this.sourceBlock_.rendered) {
                this.sourceBlock_.render();
                this.sourceBlock_.bumpNeighbours_();
            }
        };
        ;
        /**
         * Updates the width of the field. This calls getCachedWidth which won't cache
         * the approximated width on IE/Microsoft Edge when `getComputedTextLength` fails. Once
         * it eventually does succeed, the result will be cached.
         **/
        FieldImageDropdown.prototype.updateWidth = function () {
            // Calculate width of field
            var width = this.imageJson_.width + 5;
            // Add padding to left and right of text.
            if (this.EDITABLE) {
                width += Blockly.BlockSvg.EDITABLE_FIELD_PADDING;
            }
            this.arrowY_ = this.imageJson_.height / 2;
            // Adjust width for drop-down arrows.
            this.arrowWidth_ = 0;
            if (this.positionArrow) {
                this.arrowWidth_ = this.positionArrow(width);
                width += this.arrowWidth_;
            }
            // Add padding to any drawn box.
            if (this.box_) {
                width += 2 * Blockly.BlockSvg.BOX_FIELD_PADDING;
            }
            // Set width of the field.
            this.size_.width = width;
        };
        ;
        /**
         * Update the text node of this field to display the current text.
         * @private
         */
        FieldImageDropdown.prototype.updateTextNode_ = function () {
            if (!this.textElement_ && !this.imageElement_) {
                // Not rendered yet.
                return;
            }
            var text = this.text_;
            if (text.length > this.maxDisplayLength) {
                // Truncate displayed string and add an ellipsis ('...').
                text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
                // Add special class for sizing font when truncated
                this.textElement_.setAttribute('class', 'blocklyText blocklyTextTruncated');
            }
            else {
                this.textElement_.setAttribute('class', 'blocklyText');
            }
            // Empty the text element.
            goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
            goog.dom.removeNode(this.imageElement_);
            this.imageElement_ = null;
            if (this.imageJson_) {
                // Image option is selected.
                this.imageElement_ = Blockly.utils.createSvgElement('image', {
                    'y': 5, 'x': 8, 'height': this.imageJson_.height + 'px',
                    'width': this.imageJson_.width + 'px'
                });
                this.imageElement_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', this.imageJson_.src);
                this.size_.height = Number(this.imageJson_.height) + 10;
                this.textElement_.parentNode.appendChild(this.imageElement_);
            }
            else {
                // Replace whitespace with non-breaking spaces so the text doesn't collapse.
                text = text.replace(/\s/g, Blockly.Field.NBSP);
                if (this.sourceBlock_.RTL && text) {
                    // The SVG is LTR, force text to be RTL.
                    text += '\u200F';
                }
                if (!text) {
                    // Prevent the field from disappearing if empty.
                    text = Blockly.Field.NBSP;
                }
                var textNode = document.createTextNode(text);
                this.textElement_.appendChild(textNode);
            }
            // Cached width is obsolete.  Clear it.
            this.size_.width = 0;
        };
        ;
        return FieldImageDropdown;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldImageDropdown = FieldImageDropdown;
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
    var FieldImages = /** @class */ (function (_super) {
        __extends(FieldImages, _super);
        function FieldImages(text, options, validator) {
            var _this = _super.call(this, text, options, validator) || this;
            _this.isFieldCustom_ = true;
            _this.shouldSort_ = options.sort;
            _this.addLabel_ = !!options.addLabel;
            return _this;
        }
        /**
         * Create a dropdown menu under the text.
         * @private
         */
        FieldImages.prototype.showEditor_ = function () {
            // If there is an existing drop-down we own, this is a request to hide the drop-down.
            if (Blockly.DropDownDiv.hideIfOwner(this)) {
                return;
            }
            // If there is an existing drop-down someone else owns, hide it immediately and clear it.
            Blockly.DropDownDiv.hideWithoutAnimation();
            Blockly.DropDownDiv.clearContent();
            // Populate the drop-down with the icons for this field.
            var dropdownDiv = Blockly.DropDownDiv.getContentDiv();
            var contentDiv = document.createElement('div');
            // Accessibility properties
            contentDiv.setAttribute('role', 'menu');
            contentDiv.setAttribute('aria-haspopup', 'true');
            var options = this.getOptions();
            if (this.shouldSort_)
                options.sort();
            for (var i = 0; i < options.length; i++) {
                var content = options[i][0]; // Human-readable text or image.
                var value = options[i][1]; // Language-neutral value.
                // Icons with the type property placeholder take up space but don't have any functionality
                // Use for special-case layouts
                if (content.type == 'placeholder') {
                    var placeholder = document.createElement('span');
                    placeholder.setAttribute('class', 'blocklyDropDownPlaceholder');
                    placeholder.style.width = content.width + 'px';
                    placeholder.style.height = content.height + 'px';
                    contentDiv.appendChild(placeholder);
                    continue;
                }
                var button = document.createElement('button');
                button.setAttribute('id', ':' + i); // For aria-activedescendant
                button.setAttribute('role', 'menuitem');
                button.setAttribute('class', 'blocklyDropDownButton');
                button.title = content.alt;
                if (this.columns_) {
                    button.style.width = ((this.width_ / this.columns_) - 8) + 'px';
                    //button.style.height = ((this.width_ / this.columns_) - 8) + 'px';
                }
                else {
                    button.style.width = content.width + 'px';
                    button.style.height = content.height + 'px';
                }
                var backgroundColor = this.sourceBlock_.getColour();
                if (value == this.getValue()) {
                    // This icon is selected, show it in a different colour
                    backgroundColor = this.sourceBlock_.getColourTertiary();
                    button.setAttribute('aria-selected', 'true');
                }
                button.style.backgroundColor = backgroundColor;
                button.style.borderColor = this.sourceBlock_.getColourTertiary();
                Blockly.bindEvent_(button, 'click', this, this.buttonClick_);
                Blockly.bindEvent_(button, 'mouseover', button, function () {
                    this.setAttribute('class', 'blocklyDropDownButton blocklyDropDownButtonHover');
                    contentDiv.setAttribute('aria-activedescendant', this.id);
                });
                Blockly.bindEvent_(button, 'mouseout', button, function () {
                    this.setAttribute('class', 'blocklyDropDownButton');
                    contentDiv.removeAttribute('aria-activedescendant');
                });
                var buttonImg = document.createElement('img');
                buttonImg.src = content.src;
                //buttonImg.alt = icon.alt;
                // Upon click/touch, we will be able to get the clicked element as e.target
                // Store a data attribute on all possible click targets so we can match it to the icon.
                button.setAttribute('data-value', value);
                buttonImg.setAttribute('data-value', value);
                button.appendChild(buttonImg);
                if (this.addLabel_) {
                    var buttonText = this.createTextNode_(content.alt);
                    buttonText.setAttribute('data-value', value);
                    button.appendChild(buttonText);
                }
                contentDiv.appendChild(button);
            }
            contentDiv.style.width = this.width_ + 'px';
            dropdownDiv.appendChild(contentDiv);
            Blockly.DropDownDiv.setColour(this.sourceBlock_.getColour(), this.sourceBlock_.getColourTertiary());
            // Calculate positioning based on the field position.
            var scale = this.sourceBlock_.workspace.scale;
            var bBox = { width: this.size_.width, height: this.size_.height };
            bBox.width *= scale;
            bBox.height *= scale;
            var position = this.fieldGroup_.getBoundingClientRect();
            var primaryX = position.left + bBox.width / 2;
            var primaryY = position.top + bBox.height;
            var secondaryX = primaryX;
            var secondaryY = position.top;
            // Set bounds to workspace; show the drop-down.
            Blockly.DropDownDiv.setBoundsElement(this.sourceBlock_.workspace.getParentSvg().parentNode);
            Blockly.DropDownDiv.show(this, primaryX, primaryY, secondaryX, secondaryY, this.onHide_.bind(this));
            // Update colour to look selected.
            if (this.sourceBlock_.isShadow()) {
                this.savedPrimary_ = this.sourceBlock_.getColour();
                this.sourceBlock_.setColour(this.sourceBlock_.getColourTertiary(), this.sourceBlock_.getColourSecondary(), this.sourceBlock_.getColourTertiary());
            }
            else if (this.box_) {
                this.box_.setAttribute('fill', this.sourceBlock_.getColourTertiary());
            }
        };
        FieldImages.prototype.createTextNode_ = function (text) {
            var textSpan = document.createElement('span');
            textSpan.setAttribute('class', 'blocklyDropdownTextLabel');
            textSpan.textContent = text;
            return textSpan;
        };
        return FieldImages;
    }(pxtblockly.FieldImageDropdown));
    pxtblockly.FieldImages = FieldImages;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../built/pxtsim.d.ts"/>
var rowRegex = /^.*[\.#].*$/;
var LabelMode;
(function (LabelMode) {
    LabelMode[LabelMode["None"] = 0] = "None";
    LabelMode[LabelMode["Number"] = 1] = "Number";
    LabelMode[LabelMode["Letter"] = 2] = "Letter";
})(LabelMode || (LabelMode = {}));
var pxtblockly;
(function (pxtblockly) {
    var FieldMatrix = /** @class */ (function (_super) {
        __extends(FieldMatrix, _super);
        function FieldMatrix(text, params, validator) {
            var _this = _super.call(this, text, validator) || this;
            _this.isFieldCustom_ = true;
            _this.onColor = "#FFFFFF";
            // The number of columns
            _this.matrixWidth = 5;
            // The number of rows
            _this.matrixHeight = 5;
            _this.yAxisLabel = LabelMode.None;
            _this.xAxisLabel = LabelMode.None;
            _this.cellState = [];
            _this.cells = [];
            _this.dontHandleMouseEvent_ = function (ev) {
                ev.stopPropagation();
                ev.preventDefault();
            };
            _this.clearLedDragHandler = function (ev) {
                pxsim.pointerEvents.down.forEach(function (evid) { return _this.sourceBlock_.getSvgRoot().removeEventListener(evid, _this.dontHandleMouseEvent_); });
                _this.sourceBlock_.getSvgRoot().removeEventListener(pxsim.pointerEvents.move, _this.dontHandleMouseEvent_);
                document.removeEventListener(pxsim.pointerEvents.up, _this.clearLedDragHandler);
                document.removeEventListener(pxsim.pointerEvents.leave, _this.clearLedDragHandler);
                Blockly.Touch.clearTouchIdentifier();
                _this.elt.removeEventListener(pxsim.pointerEvents.move, _this.handleRootMouseMoveListener);
                ev.stopPropagation();
                ev.preventDefault();
            };
            _this.toggleRect = function (x, y) {
                _this.cellState[x][y] = _this.currentDragState_;
                _this.updateValue();
            };
            _this.handleRootMouseMoveListener = function (ev) {
                var clientX;
                var clientY;
                if (ev.changedTouches && ev.changedTouches.length == 1) {
                    // Handle touch events
                    clientX = ev.changedTouches[0].clientX;
                    clientY = ev.changedTouches[0].clientY;
                }
                else {
                    // All other events (pointer + mouse)
                    clientX = ev.clientX;
                    clientY = ev.clientY;
                }
                var target = document.elementFromPoint(clientX, clientY);
                if (!target)
                    return;
                var x = target.getAttribute('data-x');
                var y = target.getAttribute('data-y');
                if (x != null && y != null) {
                    _this.toggleRect(parseInt(x), parseInt(y));
                }
            };
            _this.params = params;
            if (_this.params.rows !== undefined) {
                var val = parseInt(_this.params.rows);
                if (!isNaN(val)) {
                    _this.matrixHeight = val;
                }
            }
            if (_this.params.columns !== undefined) {
                var val = parseInt(_this.params.columns);
                if (!isNaN(val)) {
                    _this.matrixWidth = val;
                }
            }
            if (_this.params.onColor !== undefined) {
                _this.onColor = _this.params.onColor;
            }
            if (_this.params.offColor !== undefined) {
                _this.offColor = _this.params.offColor;
            }
            return _this;
        }
        /**
         * Show the inline free-text editor on top of the text.
         * @private
         */
        FieldMatrix.prototype.showEditor_ = function () {
            // Intentionally left empty
        };
        FieldMatrix.prototype.initMatrix = function () {
            this.elt = pxsim.svg.parseString("<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"field-matrix\" />");
            // Initialize the matrix that holds the state
            for (var i = 0; i < this.matrixWidth; i++) {
                this.cellState.push([]);
                this.cells.push([]);
                for (var j = 0; j < this.matrixHeight; j++) {
                    this.cellState[i].push(false);
                }
            }
            this.restoreStateFromString();
            // Create the cells of the matrix that is displayed
            for (var i = 0; i < this.matrixWidth; i++) {
                for (var j = 0; j < this.matrixHeight; j++) {
                    this.createCell(i, j);
                }
            }
            this.updateValue();
            if (this.xAxisLabel !== LabelMode.None) {
                var y = this.matrixHeight * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_VERTICAL_MARGIN) + FieldMatrix.CELL_VERTICAL_MARGIN * 2 + FieldMatrix.BOTTOM_MARGIN;
                var xAxis = pxsim.svg.child(this.elt, "g", { transform: "translate(" + 0 + " " + y + ")" });
                for (var i = 0; i < this.matrixWidth; i++) {
                    var x = this.getYAxisWidth() + i * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_HORIZONTAL_MARGIN) + FieldMatrix.CELL_WIDTH / 2 + FieldMatrix.CELL_HORIZONTAL_MARGIN / 2;
                    var lbl = pxsim.svg.child(xAxis, "text", { x: x, class: "blocklyText" });
                    lbl.textContent = this.getLabel(i, this.xAxisLabel);
                }
            }
            if (this.yAxisLabel !== LabelMode.None) {
                var yAxis = pxsim.svg.child(this.elt, "g", {});
                for (var i = 0; i < this.matrixHeight; i++) {
                    var y = i * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_VERTICAL_MARGIN) + FieldMatrix.CELL_WIDTH / 2 + FieldMatrix.CELL_VERTICAL_MARGIN * 2;
                    var lbl = pxsim.svg.child(yAxis, "text", { x: 0, y: y, class: "blocklyText" });
                    lbl.textContent = this.getLabel(i, this.yAxisLabel);
                }
            }
            this.fieldGroup_.appendChild(this.elt);
        };
        FieldMatrix.prototype.getLabel = function (index, mode) {
            switch (mode) {
                case LabelMode.Letter:
                    return String.fromCharCode(index + /*char code for A*/ 65);
                default:
                    return (index + 1).toString();
            }
        };
        FieldMatrix.prototype.createCell = function (x, y) {
            var _this = this;
            var tx = x * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_HORIZONTAL_MARGIN) + FieldMatrix.CELL_HORIZONTAL_MARGIN + this.getYAxisWidth();
            var ty = y * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_VERTICAL_MARGIN) + FieldMatrix.CELL_VERTICAL_MARGIN;
            var cellG = pxsim.svg.child(this.elt, "g", { transform: "translate(" + tx + " " + ty + ")" });
            var cellRect = pxsim.svg.child(cellG, "rect", {
                'class': "blocklyLed" + (this.cellState[x][y] ? 'On' : 'Off'),
                'cursor': 'pointer',
                width: FieldMatrix.CELL_WIDTH, height: FieldMatrix.CELL_WIDTH,
                fill: this.getColor(x, y),
                'data-x': x,
                'data-y': y,
                rx: FieldMatrix.CELL_CORNER_RADIUS
            });
            this.cells[x][y] = cellRect;
            if (this.sourceBlock_.workspace.isFlyout)
                return;
            pxsim.pointerEvents.down.forEach(function (evid) { return cellRect.addEventListener(evid, function (ev) {
                _this.currentDragState_ = !_this.cellState[x][y];
                // select and hide chaff
                Blockly.hideChaff();
                _this.sourceBlock_.select();
                _this.toggleRect(x, y);
                pxsim.pointerEvents.down.forEach(function (evid) { return _this.sourceBlock_.getSvgRoot().addEventListener(evid, _this.dontHandleMouseEvent_); });
                _this.sourceBlock_.getSvgRoot().addEventListener(pxsim.pointerEvents.move, _this.dontHandleMouseEvent_);
                document.addEventListener(pxsim.pointerEvents.up, _this.clearLedDragHandler);
                document.addEventListener(pxsim.pointerEvents.leave, _this.clearLedDragHandler);
                // Begin listening on the canvas and toggle any matches
                _this.elt.addEventListener(pxsim.pointerEvents.move, _this.handleRootMouseMoveListener);
                ev.stopPropagation();
                ev.preventDefault();
            }, false); });
        };
        FieldMatrix.prototype.getColor = function (x, y) {
            return this.cellState[x][y] ? this.onColor : (this.offColor || FieldMatrix.DEFAULT_OFF_COLOR);
        };
        FieldMatrix.prototype.getOpacity = function (x, y) {
            return this.cellState[x][y] ? '1.0' : '0.2';
        };
        FieldMatrix.prototype.updateCell = function (x, y) {
            var cellRect = this.cells[x][y];
            cellRect.setAttribute("fill", this.getColor(x, y));
            cellRect.setAttribute("fill-opacity", this.getOpacity(x, y));
            cellRect.setAttribute('class', "blocklyLed" + (this.cellState[x][y] ? 'On' : 'Off'));
        };
        FieldMatrix.prototype.setValue = function (newValue, restoreState) {
            if (restoreState === void 0) { restoreState = true; }
            _super.prototype.setValue.call(this, newValue);
            if (this.elt) {
                if (restoreState)
                    this.restoreStateFromString();
                for (var x = 0; x < this.matrixWidth; x++) {
                    for (var y = 0; y < this.matrixHeight; y++) {
                        this.updateCell(x, y);
                    }
                }
            }
        };
        FieldMatrix.prototype.render_ = function () {
            if (!this.visible_) {
                this.size_.width = 0;
                return;
            }
            if (!this.elt) {
                this.initMatrix();
            }
            // The height and width must be set by the render function
            this.size_.height = Number(this.matrixHeight) * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_VERTICAL_MARGIN) + FieldMatrix.CELL_VERTICAL_MARGIN * 2 + FieldMatrix.BOTTOM_MARGIN + this.getXAxisHeight();
            this.size_.width = Number(this.matrixWidth) * (FieldMatrix.CELL_WIDTH + FieldMatrix.CELL_HORIZONTAL_MARGIN) + this.getYAxisWidth();
        };
        // The return value of this function is inserted in the code
        FieldMatrix.prototype.getValue = function () {
            // getText() returns the value that is set by calls to setValue()
            var text = removeQuotes(this.getText());
            return "`\n" + FieldMatrix.TAB + text + "\n" + FieldMatrix.TAB + "`";
        };
        // Restores the block state from the text value of the field
        FieldMatrix.prototype.restoreStateFromString = function () {
            var r = this.getText();
            if (r) {
                var rows = r.split("\n").filter(function (r) { return rowRegex.test(r); });
                for (var y = 0; y < rows.length && y < this.matrixHeight; y++) {
                    var x = 0;
                    var row = rows[y];
                    for (var j = 0; j < row.length && x < this.matrixWidth; j++) {
                        if (isNegativeCharacter(row[j])) {
                            this.cellState[x][y] = false;
                            x++;
                        }
                        else if (isPositiveCharacter(row[j])) {
                            this.cellState[x][y] = true;
                            x++;
                        }
                    }
                }
            }
        };
        // Composes the state into a string an updates the field's state
        FieldMatrix.prototype.updateValue = function () {
            var res = "";
            for (var y = 0; y < this.matrixHeight; y++) {
                for (var x = 0; x < this.matrixWidth; x++) {
                    res += (this.cellState[x][y] ? "#" : ".") + " ";
                }
                res += "\n" + FieldMatrix.TAB;
            }
            // Blockly stores the state of the field as a string
            this.setValue(res, false);
        };
        FieldMatrix.prototype.getYAxisWidth = function () {
            return this.yAxisLabel === LabelMode.None ? 0 : FieldMatrix.Y_AXIS_WIDTH;
        };
        FieldMatrix.prototype.getXAxisHeight = function () {
            return this.xAxisLabel === LabelMode.None ? 0 : FieldMatrix.X_AXIS_HEIGHT;
        };
        FieldMatrix.CELL_WIDTH = 25;
        FieldMatrix.CELL_HORIZONTAL_MARGIN = 7;
        FieldMatrix.CELL_VERTICAL_MARGIN = 5;
        FieldMatrix.CELL_CORNER_RADIUS = 5;
        FieldMatrix.BOTTOM_MARGIN = 9;
        FieldMatrix.Y_AXIS_WIDTH = 9;
        FieldMatrix.X_AXIS_HEIGHT = 10;
        FieldMatrix.TAB = "        ";
        FieldMatrix.DEFAULT_OFF_COLOR = "#000000";
        return FieldMatrix;
    }(Blockly.Field));
    pxtblockly.FieldMatrix = FieldMatrix;
    function isPositiveCharacter(c) {
        return c === "#" || c === "*" || c === "1";
    }
    function isNegativeCharacter(c) {
        return c === "." || c === "_" || c === "0";
    }
    var allQuotes = ["'", '"', "`"];
    function removeQuotes(str) {
        str = str.trim();
        var start = str.charAt(0);
        if (start === str.charAt(str.length - 1) && allQuotes.indexOf(start) !== -1) {
            return str.substr(1, str.length - 2).trim();
        }
        return str;
    }
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var Note;
    (function (Note) {
        Note[Note["C"] = 262] = "C";
        Note[Note["CSharp"] = 277] = "CSharp";
        Note[Note["D"] = 294] = "D";
        Note[Note["Eb"] = 311] = "Eb";
        Note[Note["E"] = 330] = "E";
        Note[Note["F"] = 349] = "F";
        Note[Note["FSharp"] = 370] = "FSharp";
        Note[Note["G"] = 392] = "G";
        Note[Note["GSharp"] = 415] = "GSharp";
        Note[Note["A"] = 440] = "A";
        Note[Note["Bb"] = 466] = "Bb";
        Note[Note["B"] = 494] = "B";
        Note[Note["C3"] = 131] = "C3";
        Note[Note["CSharp3"] = 139] = "CSharp3";
        Note[Note["D3"] = 147] = "D3";
        Note[Note["Eb3"] = 156] = "Eb3";
        Note[Note["E3"] = 165] = "E3";
        Note[Note["F3"] = 175] = "F3";
        Note[Note["FSharp3"] = 185] = "FSharp3";
        Note[Note["G3"] = 196] = "G3";
        Note[Note["GSharp3"] = 208] = "GSharp3";
        Note[Note["A3"] = 220] = "A3";
        Note[Note["Bb3"] = 233] = "Bb3";
        Note[Note["B3"] = 247] = "B3";
        Note[Note["C4"] = 262] = "C4";
        Note[Note["CSharp4"] = 277] = "CSharp4";
        Note[Note["D4"] = 294] = "D4";
        Note[Note["Eb4"] = 311] = "Eb4";
        Note[Note["E4"] = 330] = "E4";
        Note[Note["F4"] = 349] = "F4";
        Note[Note["FSharp4"] = 370] = "FSharp4";
        Note[Note["G4"] = 392] = "G4";
        Note[Note["GSharp4"] = 415] = "GSharp4";
        Note[Note["A4"] = 440] = "A4";
        Note[Note["Bb4"] = 466] = "Bb4";
        Note[Note["B4"] = 494] = "B4";
        Note[Note["C5"] = 523] = "C5";
        Note[Note["CSharp5"] = 555] = "CSharp5";
        Note[Note["D5"] = 587] = "D5";
        Note[Note["Eb5"] = 622] = "Eb5";
        Note[Note["E5"] = 659] = "E5";
        Note[Note["F5"] = 698] = "F5";
        Note[Note["FSharp5"] = 740] = "FSharp5";
        Note[Note["G5"] = 784] = "G5";
        Note[Note["GSharp5"] = 831] = "GSharp5";
        Note[Note["A5"] = 880] = "A5";
        Note[Note["Bb5"] = 932] = "Bb5";
        Note[Note["B5"] = 988] = "B5";
        Note[Note["C6"] = 1047] = "C6";
        Note[Note["CSharp6"] = 1109] = "CSharp6";
        Note[Note["D6"] = 1175] = "D6";
        Note[Note["Eb6"] = 1245] = "Eb6";
        Note[Note["E6"] = 1319] = "E6";
        Note[Note["F6"] = 1397] = "F6";
        Note[Note["FSharp6"] = 1480] = "FSharp6";
        Note[Note["G6"] = 1568] = "G6";
        Note[Note["GSharp6"] = 1568] = "GSharp6";
        Note[Note["A6"] = 1760] = "A6";
        Note[Note["Bb6"] = 1865] = "Bb6";
        Note[Note["B6"] = 1976] = "B6";
        Note[Note["C7"] = 2093] = "C7";
    })(Note || (Note = {}));
    var Notes = {
        28: { name: "C", prefixedName: "Low C", freq: 131 },
        29: { name: "C#", prefixedName: "Low C#", freq: 139 },
        30: { name: "D", prefixedName: "Low D", freq: 147 },
        31: { name: "D#", prefixedName: "Low D#", freq: 156 },
        32: { name: "E", prefixedName: "Low E", freq: 165 },
        33: { name: "F", prefixedName: "Low F", freq: 175 },
        34: { name: "F#", prefixedName: "Low F#", freq: 185 },
        35: { name: "G", prefixedName: "Low G", freq: 196 },
        36: { name: "G#", prefixedName: "Low G#", freq: 208 },
        37: { name: "A", prefixedName: "Low A", freq: 220 },
        38: { name: "A#", prefixedName: "Low A#", freq: 233 },
        39: { name: "B", prefixedName: "Low B", freq: 247 },
        40: { name: "C", prefixedName: "Middle C", freq: 262 },
        41: { name: "C#", prefixedName: "Middle C#", freq: 277 },
        42: { name: "D", prefixedName: "Middle D", freq: 294 },
        43: { name: "D#", prefixedName: "Middle D#", freq: 311 },
        44: { name: "E", prefixedName: "Middle E", freq: 330 },
        45: { name: "F", prefixedName: "Middle F", freq: 349 },
        46: { name: "F#", prefixedName: "Middle F#", freq: 370 },
        47: { name: "G", prefixedName: "Middle G", freq: 392 },
        48: { name: "G#", prefixedName: "Middle G#", freq: 415 },
        49: { name: "A", prefixedName: "Middle A", freq: 440 },
        50: { name: "A#", prefixedName: "Middle A#", freq: 466 },
        51: { name: "B", prefixedName: "Middle B", freq: 494 },
        52: { name: "C", prefixedName: "Tenor C", altPrefixedName: "High C", freq: 523 },
        53: { name: "C#", prefixedName: "Tenor C#", altPrefixedName: "High C#", freq: 554 },
        54: { name: "D", prefixedName: "Tenor D", altPrefixedName: "High D", freq: 587 },
        55: { name: "D#", prefixedName: "Tenor D#", altPrefixedName: "High D#", freq: 622 },
        56: { name: "E", prefixedName: "Tenor E", altPrefixedName: "High E", freq: 659 },
        57: { name: "F", prefixedName: "Tenor F", altPrefixedName: "High F", freq: 698 },
        58: { name: "F#", prefixedName: "Tenor F#", altPrefixedName: "High F#", freq: 740 },
        59: { name: "G", prefixedName: "Tenor G", altPrefixedName: "High G", freq: 784 },
        60: { name: "G#", prefixedName: "Tenor G#", altPrefixedName: "High G#", freq: 831 },
        61: { name: "A", prefixedName: "Tenor A", altPrefixedName: "High A", freq: 880 },
        62: { name: "A#", prefixedName: "Tenor A#", altPrefixedName: "High A#", freq: 932 },
        63: { name: "B", prefixedName: "Tenor B", altPrefixedName: "High B", freq: 988 },
        64: { name: "C", prefixedName: "High C", freq: 1046 },
        65: { name: "C#", prefixedName: "High C#", freq: 1109 },
        66: { name: "D", prefixedName: "High D", freq: 1175 },
        67: { name: "D#", prefixedName: "High D#", freq: 1245 },
        68: { name: "E", prefixedName: "High E", freq: 1319 },
        69: { name: "F", prefixedName: "High F", freq: 1397 },
        70: { name: "F#", prefixedName: "High F#", freq: 1478 },
        71: { name: "G", prefixedName: "High G", freq: 1568 },
        72: { name: "G#", prefixedName: "High G#", freq: 1661 },
        73: { name: "A", prefixedName: "High A", freq: 1760 },
        74: { name: "A#", prefixedName: "High A#", freq: 1865 },
        75: { name: "B", prefixedName: "High B", freq: 1976 }
    };
    var regex = /^Note\.(.+)$/;
    //  Class for a note input field.
    var FieldNote = /** @class */ (function (_super) {
        __extends(FieldNote, _super);
        function FieldNote(text, params, validator) {
            var _this = _super.call(this, text) || this;
            _this.isFieldCustom_ = true;
            /**
             * default number of piano keys
             * @type {number}
             * @private
             */
            _this.nKeys_ = 36;
            _this.minNote_ = 28;
            _this.maxNote_ = 63;
            /**
             * Absolute error for note frequency identification (Hz)
             * @type {number}
             */
            _this.eps = 2;
            /**
             * array of notes frequency
             * @type {Array.<number>}
             * @private
             */
            _this.noteFreq_ = [];
            /**
             * array of notes names
             * @type {Array.<string>}
             * @private
             */
            _this.noteName_ = [];
            FieldNote.superClass_.constructor.call(_this, text, validator);
            _this.note_ = text;
            if (params.editorColour) {
                _this.colour_ = pxtblockly.parseColour(params.editorColour);
                _this.colourBorder_ = goog.color.rgbArrayToHex(goog.color.darken(goog.color.hexToRgb(_this.colour_), 0.2));
            }
            var minNote = parseInt(params.minNote) || _this.minNote_;
            var maxNote = parseInt(params.maxNote) || _this.maxNote_;
            if (minNote >= 28 && maxNote <= 76 && maxNote > minNote) {
                _this.minNote_ = minNote;
                _this.maxNote_ = maxNote;
                _this.nKeys_ = _this.maxNote_ - _this.minNote_ + 1;
            }
            return _this;
        }
        /**
         * Ensure that only a non negative number may be entered.
         * @param {string} text The user's text.
         * @return {?string} A string representing a valid positive number, or null if invalid.
         */
        FieldNote.prototype.classValidator = function (text) {
            if (text === null) {
                return null;
            }
            text = String(text);
            var n = parseFloat(text || "0");
            if (isNaN(n) || n < 0) {
                // Invalid number.
                return null;
            }
            // Get the value in range.
            return String(n);
        };
        /**
         * Install this field on a block.
         */
        FieldNote.prototype.init = function () {
            FieldNote.superClass_.init.call(this);
            this.noteFreq_.length = 0;
            this.noteName_.length = 0;
            var thisField = this;
            //  Create arrays of name/frequency of the notes
            createNotesArray();
            this.setValue(this.callValidator(this.getValue()));
            /**
             * create Array of notes name and frequencies
             * @private
             */
            function createNotesArray() {
                for (var i = thisField.minNote_; i <= thisField.maxNote_; i++) {
                    var name_6 = Notes[i].prefixedName;
                    // special case: one octave
                    if (thisField.nKeys_ < 13) {
                        name_6 = Notes[i].name;
                    }
                    else if (thisField.minNote_ >= 28 && thisField.maxNote_ <= 63) {
                        name_6 = Notes[i].altPrefixedName || name_6;
                    }
                    thisField.noteName_.push(name_6);
                    thisField.noteFreq_.push(Notes[i].freq);
                }
                // Do not remove this comment.
                // lf("C")
                // lf("C#")
                // lf("D")
                // lf("D#")
                // lf("E")
                // lf("F")
                // lf("F#")
                // lf("G")
                // lf("G#")
                // lf("A")
                // lf("A#")
                // lf("B")
                // lf("Deep C")
                // lf("Deep C#")
                // lf("Deep D")
                // lf("Deep D#")
                // lf("Deep E")
                // lf("Deep F")
                // lf("Deep F#")
                // lf("Deep G")
                // lf("Deep G#")
                // lf("Deep A")
                // lf("Deep A#")
                // lf("Deep B")
                // lf("Low C")
                // lf("Low C#")
                // lf("Low D")
                // lf("Low D#")
                // lf("Low E")
                // lf("Low F")
                // lf("Low F#")
                // lf("Low G")
                // lf("Low G#")
                // lf("Low A")
                // lf("Low A#")
                // lf("Low B")
                // lf("Middle C")
                // lf("Middle C#")
                // lf("Middle D")
                // lf("Middle D#")
                // lf("Middle E")
                // lf("Middle F")
                // lf("Middle F#")
                // lf("Middle G")
                // lf("Middle G#")
                // lf("Middle A")
                // lf("Middle A#")
                // lf("Middle B")
                // lf("Tenor C")
                // lf("Tenor C#")
                // lf("Tenor D")
                // lf("Tenor D#")
                // lf("Tenor E")
                // lf("Tenor F")
                // lf("Tenor F#")
                // lf("Tenor G")
                // lf("Tenor G#")
                // lf("Tenor A")
                // lf("Tenor A#")
                // lf("Tenor B")
                // lf("High C")
                // lf("High C#")
                // lf("High D")
                // lf("High D#")
                // lf("High E")
                // lf("High F")
                // lf("High F#")
                // lf("High G")
                // lf("High G#")
                // lf("High A")
                // lf("High A#")
                // lf("High B")
            }
        };
        /**
         * Return the current note frequency.
         * @return {string} Current note in string format.
         */
        FieldNote.prototype.getValue = function () {
            return this.note_;
        };
        /**
         * Set the note.
         * @param {string} note The new note in string format.
         */
        FieldNote.prototype.setValue = function (note) {
            // accommodate note strings like "Note.GSharp5" as well as numbers
            var match = regex.exec(note);
            var noteName = (match && match.length > 1) ? match[1] : null;
            note = Note[noteName] ? Note[noteName] : String(parseFloat(note || "0"));
            if (isNaN(Number(note)) || Number(note) < 0)
                return;
            if (this.sourceBlock_ && Blockly.Events.isEnabled() &&
                this.note_ != note) {
                Blockly.Events.fire(new Blockly.Events.Change(this.sourceBlock_, "field", this.name, String(this.note_), String(note)));
            }
            this.note_ = this.callValidator(note);
            this.setText(this.getNoteName_());
        };
        /**
         * Get the text from this field.  Used when the block is collapsed.
         * @return {string} Current text.
         */
        FieldNote.prototype.getText = function () {
            if (Math.floor(Number(this.note_)) == Number(this.note_))
                return Number(this.note_).toFixed(0);
            return Number(this.note_).toFixed(2);
        };
        /**
         * Set the text in this field and NOT fire a change event.
         * @param {*} newText New text.
         */
        FieldNote.prototype.setText = function (newText) {
            if (newText === null) {
                // No change if null.
                return;
            }
            newText = String(newText);
            if (!isNaN(Number(newText)))
                newText = this.getNoteName_();
            if (newText === this.text_) {
                // No change.
                return;
            }
            Blockly.Field.prototype.setText.call(this, newText);
        };
        /**
        * get the note name to be displayed in the field
        * @return {string} note name
        * @private
        */
        FieldNote.prototype.getNoteName_ = function () {
            var note = this.getValue();
            var text = note.toString();
            for (var i = 0; i < this.nKeys_; i++) {
                if (Math.abs(this.noteFreq_[i] - Number(note)) < this.eps)
                    return this.noteName_[i];
            }
            if (!isNaN(Number(note)))
                text += " Hz";
            return text;
        };
        /**
         * Set a custom number of keys for this field.
         * @param {number} nkeys Number of keys for this block,
         *     or 26 to use default.
         * @return {!Blockly.FieldNote} Returns itself (for method chaining).
         */
        FieldNote.prototype.setNumberOfKeys = function (size) {
            this.nKeys_ = size;
            return this;
        };
        FieldNote.prototype.onHtmlInputChange_ = function (e) {
            _super.prototype.onHtmlInputChange_.call(this, e);
            Blockly.DropDownDiv.hideWithoutAnimation();
        };
        /**
         * Create a piano under the note field.
         */
        FieldNote.prototype.showEditor_ = function (opt_quietInput) {
            this.updateColor();
            // If there is an existing drop-down someone else owns, hide it immediately and clear it.
            Blockly.DropDownDiv.hideWithoutAnimation();
            Blockly.DropDownDiv.clearContent();
            var contentDiv = Blockly.DropDownDiv.getContentDiv();
            //  change Note name to number frequency
            Blockly.FieldNumber.prototype.setText.call(this, this.getText());
            FieldNote.superClass_.showEditor_.call(this, true);
            var pianoWidth;
            var pianoHeight;
            var keyWidth = 22;
            var keyHeight = 90;
            var labelHeight = 24;
            var prevNextHeight = 20;
            var whiteKeyCounter = 0;
            var selectedKeyColor = "yellowgreen";
            var soundingKeys = 0;
            var thisField = this;
            //  Record windowSize and scrollOffset before adding the piano.
            var windowSize = goog.dom.getViewportSize();
            var pagination = false;
            var mobile = false;
            var editorWidth = windowSize.width;
            var piano = [];
            //  initializate
            pianoWidth = keyWidth * (this.nKeys_ - (this.nKeys_ / 12 * 5));
            pianoHeight = keyHeight + labelHeight;
            //  Create the piano using Closure (CustomButton).
            for (var i = 0; i < this.nKeys_; i++) {
                piano.push(new goog.ui.CustomButton());
            }
            if (editorWidth < pianoWidth) {
                pagination = true;
                pianoWidth = 7 * keyWidth;
                pianoHeight = keyHeight + labelHeight + prevNextHeight;
            }
            //  Check if Mobile, pagination -> true
            var quietInput = opt_quietInput || false;
            if (!quietInput && (goog.userAgent.MOBILE || goog.userAgent.ANDROID)) {
                pagination = true;
                mobile = true;
                keyWidth = keyWidth * 2;
                keyHeight = keyHeight * 2;
                pianoWidth = 7 * keyWidth;
                labelHeight = labelHeight * 1.2;
                prevNextHeight = prevNextHeight * 2;
                pianoHeight = keyHeight + labelHeight + prevNextHeight;
            }
            //  create piano div
            var pianoDiv = goog.dom.createDom("div", {});
            pianoDiv.className = "blocklyPianoDiv";
            contentDiv.appendChild(pianoDiv);
            var scrollOffset = goog.style.getViewportPageOffset(document);
            var xy = this.getAbsoluteXY_();
            var borderBBox = this.getScaledBBox_();
            var leftPosition = 0; //-(<HTMLElement>document.getElementsByClassName("blocklyDropdownDiv")[0]).offsetLeft;   //+ ((windowSize.width - this.pianoWidth_) / 2);
            var topPosition = 0; //(keyHeight + labelHeight + prevNextHeight);
            //  save all changes in the same group of events
            Blockly.Events.setGroup(true);
            //  render piano keys
            var octaveCounter = 0;
            var currentSelectedKey = null;
            var previousColor;
            for (var i = 0; i < this.nKeys_; i++) {
                if (i > 0 && i % 12 == 0)
                    octaveCounter++;
                var key = piano[i];
                //  What color is i key
                var bgColor = (isWhite(i)) ? "white" : "black";
                var width = getKeyWidth(i);
                var height = getKeyHeight(i);
                var position_1 = getPosition(i);
                //  modify original position in pagination
                if (pagination && i >= 12)
                    position_1 -= 7 * octaveCounter * keyWidth;
                var style = getKeyStyle(bgColor, width, height, position_1 + leftPosition, topPosition, isWhite(i) ? 1000 : 1001, isWhite(i) ? this.colour_ : "black", mobile);
                key.setContent(style);
                key.setId(this.noteName_[i]);
                key.render(pianoDiv);
                var script = key.getContent();
                script.setAttribute("tag", this.noteFreq_[i].toString());
                //  highlight current selected key
                if (Math.abs(this.noteFreq_[i] - Number(this.getValue())) < this.eps) {
                    previousColor = script.style.backgroundColor;
                    script.style.backgroundColor = selectedKeyColor;
                    currentSelectedKey = key;
                }
                //  Listener when a new key is selected
                if (!mobile) {
                    goog.events.listen(key.getElement(), goog.events.EventType.MOUSEDOWN, soundKey, false, key);
                }
                else {
                    /**  Listener when a new key is selected in MOBILE
                     *   It is necessary to use TOUCHSTART event to allow passive event listeners
                     *   to avoid preventDefault() call that blocks listener
                     */
                    goog.events.listen(key.getElement(), goog.events.EventType.TOUCHSTART, soundKey, false, key);
                }
                //  Listener when the mouse is over a key
                goog.events.listen(key.getElement(), goog.events.EventType.MOUSEOVER, function () {
                    var script = showNoteLabel.getContent();
                    script.textContent = this.getId();
                }, false, key);
                //  increment white key counter
                if (isWhite(i))
                    whiteKeyCounter++;
                // set octaves different from first octave invisible
                if (pagination && i > 11)
                    key.setVisible(false);
            }
            //  render note label
            var showNoteLabel = new goog.ui.CustomButton();
            var showNoteStyle = getShowNoteStyle(topPosition, leftPosition, mobile);
            showNoteLabel.setContent(showNoteStyle);
            showNoteLabel.render(pianoDiv);
            var scriptLabel = showNoteLabel.getContent();
            scriptLabel.textContent = "-";
            // create next and previous CustomButtons for pagination
            var prevButton = new goog.ui.CustomButton();
            var nextButton = new goog.ui.CustomButton();
            var prevButtonStyle = getNextPrevStyle(topPosition, leftPosition, true, mobile);
            var nextButtonStyle = getNextPrevStyle(topPosition, leftPosition, false, mobile);
            if (pagination) {
                scriptLabel.textContent = "Octave #1";
                //  render previous button
                var script = void 0;
                prevButton.setContent(prevButtonStyle);
                prevButton.render(pianoDiv);
                script = prevButton.getContent();
                //  left arrow - previous button
                script.textContent = "<";
                //  render next button
                nextButton.setContent(nextButtonStyle);
                nextButton.render(pianoDiv);
                script = nextButton.getContent();
                //  right arrow - next button
                script.textContent = ">";
                var Npages_1 = this.nKeys_ / 12;
                var currentPage_1 = 0;
                goog.events.listen(prevButton.getElement(), goog.events.EventType.MOUSEDOWN, function () {
                    if (currentPage_1 == 0) {
                        scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                        return;
                    }
                    var curFirstKey = currentPage_1 * 12;
                    var newFirstKey = currentPage_1 * 12 - 12;
                    //  hide current octave
                    for (var i = 0; i < 12; i++)
                        piano[i + curFirstKey].setVisible(false);
                    //  show new octave
                    for (var i = 0; i < 12; i++)
                        piano[i + newFirstKey].setVisible(true);
                    currentPage_1--;
                    scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                }, false, prevButton);
                goog.events.listen(nextButton.getElement(), goog.events.EventType.MOUSEDOWN, function () {
                    if (currentPage_1 == Npages_1 - 1) {
                        scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                        return;
                    }
                    var curFirstKey = currentPage_1 * 12;
                    var newFirstKey = currentPage_1 * 12 + 12;
                    //  hide current octave
                    for (var i = 0; i < 12; i++)
                        piano[i + curFirstKey].setVisible(false);
                    //  show new octave
                    for (var i = 0; i < 12; i++)
                        piano[i + newFirstKey].setVisible(true);
                    currentPage_1++;
                    scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                }, false, nextButton);
            }
            // create the key sound
            function soundKey() {
                var cnt = ++soundingKeys;
                var freq = this.getContent().getAttribute("tag");
                var script;
                if (currentSelectedKey != null) {
                    script = currentSelectedKey.getContent();
                    script.style.backgroundColor = previousColor;
                }
                script = this.getContent();
                if (currentSelectedKey !== this) {
                    previousColor = script.style.backgroundColor;
                    thisField.setValue(thisField.callValidator(freq));
                    thisField.setText(thisField.callValidator(freq));
                }
                currentSelectedKey = this;
                script.style.backgroundColor = selectedKeyColor;
                Blockly.FieldTextInput.htmlInput_.value = thisField.getText();
                pxtblockly.AudioContextManager.tone(freq);
                setTimeout(function () {
                    // compare current sound counter with listener sound counter (avoid async problems)
                    if (soundingKeys == cnt)
                        pxtblockly.AudioContextManager.stop();
                }, 300);
                FieldNote.superClass_.dispose.call(this);
            }
            /** get width of blockly editor space
             * @return {number} width of the blockly editor workspace
             * @private
             */
            function getEditorWidth() {
                var windowSize = goog.dom.getViewportSize();
                return windowSize.width;
            }
            /** get height of blockly editor space
             * @return {number} Height of the blockly editor workspace
             * @private
             */
            function getEditorHeight() {
                var editorHeight = document.getElementById("blocklyDiv").offsetHeight;
                return editorHeight;
            }
            /**
             * create a DOM to assing a style to the button (piano Key)
             * @param {string} bgColor color of the key background
             * @param {number} width width of the key
             * @param {number} heigth heigth of the key
             * @param {number} leftPosition horizontal position of the key
             * @param {number} topPosition vertical position of the key
             * @param {number} z_index z-index of the key
             * @param {string} keyBorderColour border color of the key
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getKeyStyle(bgColor, width, height, leftPosition, topPosition, z_index, keyBorderColour, isMobile) {
                var div = goog.dom.createDom("div", {
                    "style": "background-color: " + bgColor
                        + "; width: " + width
                        + "px; height: " + height
                        + "px; left: " + leftPosition
                        + "px; top: " + topPosition
                        + "px; z-index: " + z_index
                        + ";   border-color: " + keyBorderColour
                        + ";"
                });
                div.className = "blocklyNote";
                return div;
            }
            /**
             * create a DOM to assing a style to the note label
             * @param {number} topPosition vertical position of the label
             * @param {number} leftPosition horizontal position of the label
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getShowNoteStyle(topPosition, leftPosition, isMobile) {
                topPosition += keyHeight;
                if (isMobile)
                    topPosition += prevNextHeight;
                var div = goog.dom.createDom("div", {
                    "style": "top: " + topPosition
                        + "px; left: " + leftPosition
                        + "px; background-color: " + thisField.colour_
                        + "; width: " + pianoWidth
                        + "px; border-color: " + thisField.colour_
                        + ";" + (isMobile ? " font-size: " + (labelHeight - 10) + "px; height: " + labelHeight + "px;" : "")
                });
                div.className = "blocklyNoteLabel";
                return div;
            }
            /**
             * create a DOM to assing a style to the previous and next buttons
             * @param {number} topPosition vertical position of the label
             * @param {number} leftPosition horizontal position of the label
             * @param {boolean} isPrev true if is previous button, false otherwise
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getNextPrevStyle(topPosition, leftPosition, isPrev, isMobile) {
                //  x position of the prev/next button
                var xPosition = (isPrev ? 0 : (pianoWidth / 2)) + leftPosition;
                //  y position of the prev/next button
                var yPosition = (keyHeight + labelHeight + topPosition);
                if (isMobile)
                    yPosition = keyHeight + topPosition;
                var div = goog.dom.createDom("div", {
                    "style": "top: " + yPosition
                        + "px; left: " + xPosition
                        + "px; "
                        + ";" + (isMobile ? "height: " + prevNextHeight + "px; font-size:" + (prevNextHeight - 10) + "px;" : "")
                        + "width: " + Math.ceil(pianoWidth / 2) + "px;"
                        + "background-color: " + thisField.colour_
                        + ";" + (isPrev ? "border-left-color: " : "border-right-color: ") + thisField.colour_
                        + ";" + (!isMobile ? "border-bottom-color: " + thisField.colour_ : "")
                        + ";"
                });
                div.className = "blocklyNotePrevNext";
                return div;
            }
            /**
             * @param {number} idx index of the key
             * @return {boolean} true if key_idx is white
             * @private
             */
            function isWhite(idx) {
                var octavePosition = idx % 12;
                if (octavePosition == 1 || octavePosition == 3 || octavePosition == 6 ||
                    octavePosition == 8 || octavePosition == 10)
                    return false;
                return true;
            }
            /**
             * get width of the piano key
             * @param {number} idx index of the key
             * @return {number} width of the key
             * @private
             */
            function getKeyWidth(idx) {
                if (isWhite(idx))
                    return keyWidth;
                return keyWidth / 2;
            }
            /**
             * get height of the piano key
             * @param {number} idx index of the key
             * @return {number} height of the key
             * @private
             */
            function getKeyHeight(idx) {
                if (isWhite(idx))
                    return keyHeight;
                return keyHeight / 2;
            }
            /**
             * get the position of the key in the piano
             * @param {number} idx index of the key
             * @return {number} position of the key
             */
            function getPosition(idx) {
                var pos = (whiteKeyCounter * keyWidth);
                if (isWhite(idx))
                    return pos;
                return pos - (keyWidth / 4);
            }
            pianoDiv.style.width = pianoWidth + "px";
            pianoDiv.style.height = (pianoHeight + 1) + "px";
            Blockly.DropDownDiv.setColour(this.colour_, this.colourBorder_);
            // Calculate positioning based on the field position.
            var scale = this.sourceBlock_.workspace.scale;
            var bBox = { width: this.size_.width, height: this.size_.height };
            bBox.width *= scale;
            bBox.height *= scale;
            var position = this.fieldGroup_.getBoundingClientRect();
            var primaryX = position.left + bBox.width / 2;
            var primaryY = position.top + bBox.height;
            var secondaryX = primaryX;
            var secondaryY = position.top;
            // Set bounds to workspace; show the drop-down.
            Blockly.DropDownDiv.setBoundsElement(this.sourceBlock_.workspace.getParentSvg().parentNode);
            Blockly.DropDownDiv.show(this, primaryX, primaryY, secondaryX, secondaryY, this.onHide.bind(this));
        };
        /**
         * Callback for when the drop-down is hidden.
         */
        FieldNote.prototype.onHide = function () {
        };
        ;
        /**
         * Close the note picker if this input is being deleted.
         */
        FieldNote.prototype.dispose = function () {
            Blockly.DropDownDiv.hideIfOwner(this);
            Blockly.FieldTextInput.superClass_.dispose.call(this);
        };
        FieldNote.prototype.updateColor = function () {
            if (this.sourceBlock_.parentBlock_ && (this.sourceBlock_.isShadow() || hasOnlyOneField(this.sourceBlock_))) {
                this.colour_ = this.sourceBlock_.parentBlock_.getColour();
                this.colourBorder_ = this.sourceBlock_.parentBlock_.getColourTertiary();
            }
            else {
                this.colour_ = this.sourceBlock_.getColourTertiary();
                this.colourBorder_ = this.sourceBlock_.getColourTertiary();
            }
        };
        return FieldNote;
    }(Blockly.FieldNumber));
    pxtblockly.FieldNote = FieldNote;
    function hasOnlyOneField(block) {
        return block.inputList.length === 1 && block.inputList[0].fieldRow.length === 1;
    }
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldNumberDropdown = /** @class */ (function (_super) {
        __extends(FieldNumberDropdown, _super);
        function FieldNumberDropdown(value, options, opt_validator) {
            var _this = _super.call(this, value, options.data, options.min, options.max, options.precision, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldNumberDropdown.prototype.getOptions = function () {
            var newOptions;
            if (this.menuGenerator_) {
                newOptions = JSON.parse(this.menuGenerator_).map(function (x) {
                    return (typeof x == 'object') ? x : [String(x), String(x)];
                });
            }
            return newOptions;
        };
        return FieldNumberDropdown;
    }(Blockly.FieldNumberDropdown));
    pxtblockly.FieldNumberDropdown = FieldNumberDropdown;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldProcedure = /** @class */ (function (_super) {
        __extends(FieldProcedure, _super);
        function FieldProcedure(funcname, opt_validator) {
            var _this = _super.call(this, null, opt_validator) || this;
            _this.setValue(funcname || '');
            return _this;
        }
        FieldProcedure.prototype.getOptions = function () {
            return this.dropdownCreate();
        };
        ;
        FieldProcedure.prototype.init = function () {
            if (this.fieldGroup_) {
                // Dropdown has already been initialized once.
                return;
            }
            _super.prototype.init.call(this);
        };
        ;
        FieldProcedure.prototype.setSourceBlock = function (block) {
            goog.asserts.assert(!block.isShadow(), 'Procedure fields are not allowed to exist on shadow blocks.');
            _super.prototype.setSourceBlock.call(this, block);
        };
        ;
        FieldProcedure.prototype.getValue = function () {
            return this.getText();
        };
        ;
        FieldProcedure.prototype.setValue = function (newValue) {
            if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
                Blockly.Events.fire(new Blockly.Events.Change(this.sourceBlock_, 'field', this.name, this.value_, newValue));
            }
            this.value_ = newValue;
            this.setText(newValue);
        };
        ;
        /**
         * Return a sorted list of variable names for procedure dropdown menus.
         * Include a special option at the end for creating a new function name.
         * @return {!Array.<string>} Array of procedure names.
         * @this {pxtblockly.FieldProcedure}
         */
        FieldProcedure.prototype.dropdownCreate = function () {
            var functionList = [];
            if (this.sourceBlock_ && this.sourceBlock_.workspace) {
                var blocks = this.sourceBlock_.workspace.getAllBlocks();
                // Iterate through every block and check the name.
                for (var i = 0; i < blocks.length; i++) {
                    if (blocks[i].getProcedureDef) {
                        var procName = blocks[i].getProcedureDef();
                        functionList.push(procName[0]);
                    }
                }
            }
            // Ensure that the currently selected variable is an option.
            var name = this.getText();
            if (name && functionList.indexOf(name) == -1) {
                functionList.push(name);
            }
            functionList.sort(goog.string.caseInsensitiveCompare);
            if (!functionList.length) {
                // Add temporary list item so the dropdown doesn't break
                functionList.push("Temp");
            }
            // Variables are not language-specific, use the name as both the user-facing
            // text and the internal representation.
            var options = [];
            for (var i = 0; i < functionList.length; i++) {
                options[i] = [functionList[i], functionList[i]];
            }
            return options;
        };
        FieldProcedure.prototype.onItemSelected = function (menu, menuItem) {
            var itemText = menuItem.getValue();
            if (this.sourceBlock_) {
                // Call any validation function, and allow it to override.
                itemText = this.callValidator(itemText);
            }
            if (itemText !== null) {
                this.setValue(itemText);
            }
        };
        return FieldProcedure;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldProcedure = FieldProcedure;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts"/>
/// <reference path="../../built/pxtsim.d.ts"/>
var pxtblockly;
(function (pxtblockly) {
    var FieldProtractor = /** @class */ (function (_super) {
        __extends(FieldProtractor, _super);
        /**
         * Class for a color wheel field.
         * @param {number|string} value The initial content of the field.
         * @param {Function=} opt_validator An optional function that is called
         *     to validate any constraints on what the user entered.  Takes the new
         *     text as an argument and returns either the accepted text, a replacement
         *     text, or null to abort the change.
         * @extends {Blockly.FieldNumber}
         * @constructor
         */
        function FieldProtractor(value_, params, opt_validator) {
            var _this = _super.call(this, String(value_), '0', '180', null, '15', lf("Angle"), opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.params = params;
            return _this;
        }
        FieldProtractor.prototype.createLabelDom_ = function (labelText) {
            var labelContainer = document.createElement('div');
            this.circleSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            pxsim.svg.hydrate(this.circleSVG, {
                viewBox: "0 0 200 100",
                width: "170"
            });
            labelContainer.appendChild(this.circleSVG);
            var outerCircle = pxsim.svg.child(this.circleSVG, "circle", {
                'stroke-dasharray': '565.48', 'stroke-dashoffset': '0',
                'cx': 100, 'cy': 100, 'r': '90', 'style': "fill:transparent; transition: stroke-dashoffset 0.1s linear;",
                'stroke': '#a8aaa8', 'stroke-width': '1rem'
            });
            this.circleBar = pxsim.svg.child(this.circleSVG, "circle", {
                'stroke-dasharray': '565.48', 'stroke-dashoffset': '0',
                'cx': 100, 'cy': 100, 'r': '90', 'style': "fill:transparent; transition: stroke-dashoffset 0.1s linear;",
                'stroke': '#f12a21', 'stroke-width': '1rem'
            });
            this.reporter = pxsim.svg.child(this.circleSVG, "text", {
                'x': 100, 'y': 80,
                'text-anchor': 'middle', 'dominant-baseline': 'middle',
                'style': 'font-size: 50px',
                'class': 'sim-text inverted number'
            });
            // labelContainer.setAttribute('class', 'blocklyFieldSliderLabel');
            var readout = document.createElement('span');
            readout.setAttribute('class', 'blocklyFieldSliderReadout');
            return [labelContainer, readout];
        };
        ;
        FieldProtractor.prototype.setReadout_ = function (readout, value) {
            this.updateAngle(parseFloat(value));
            // Update reporter
            this.reporter.textContent = value + "\u00B0";
        };
        FieldProtractor.prototype.updateAngle = function (angle) {
            angle = Math.max(0, Math.min(180, angle));
            var radius = 90;
            var pct = (180 - angle) / 180 * Math.PI * radius;
            this.circleBar.setAttribute('stroke-dashoffset', "" + pct);
        };
        return FieldProtractor;
    }(Blockly.FieldSlider));
    pxtblockly.FieldProtractor = FieldProtractor;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts"/>
/// <reference path="../../built/pxtsim.d.ts"/>
var pxtblockly;
(function (pxtblockly) {
    var FieldSpeed = /** @class */ (function (_super) {
        __extends(FieldSpeed, _super);
        /**
         * Class for a color wheel field.
         * @param {number|string} value The initial content of the field.
         * @param {Function=} opt_validator An optional function that is called
         *     to validate any constraints on what the user entered.  Takes the new
         *     text as an argument and returns either the accepted text, a replacement
         *     text, or null to abort the change.
         * @extends {Blockly.FieldNumber}
         * @constructor
         */
        function FieldSpeed(value_, params, opt_validator) {
            var _this = _super.call(this, String(value_), '-100', '100', null, '10', 'Speed', opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.params = params;
            if (_this.params['min'])
                _this.min_ = parseFloat(_this.params.min);
            if (_this.params['max'])
                _this.max_ = parseFloat(_this.params.max);
            if (_this.params['label'])
                _this.labelText_ = _this.params.label;
            return _this;
        }
        FieldSpeed.prototype.createLabelDom_ = function (labelText) {
            var labelContainer = document.createElement('div');
            this.speedSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            pxsim.svg.hydrate(this.speedSVG, {
                viewBox: "0 0 200 100",
                width: "170"
            });
            labelContainer.appendChild(this.speedSVG);
            var outerCircle = pxsim.svg.child(this.speedSVG, "circle", {
                'stroke-dasharray': '565.48', 'stroke-dashoffset': '0',
                'cx': 100, 'cy': 100, 'r': '90', 'style': "fill:transparent; transition: stroke-dashoffset 0.1s linear;",
                'stroke': '#a8aaa8', 'stroke-width': '1rem'
            });
            this.circleBar = pxsim.svg.child(this.speedSVG, "circle", {
                'stroke-dasharray': '565.48', 'stroke-dashoffset': '0',
                'cx': 100, 'cy': 100, 'r': '90', 'style': "fill:transparent; transition: stroke-dashoffset 0.1s linear;",
                'stroke': '#f12a21', 'stroke-width': '1rem'
            });
            this.reporter = pxsim.svg.child(this.speedSVG, "text", {
                'x': 100, 'y': 80,
                'text-anchor': 'middle', 'dominant-baseline': 'middle',
                'style': 'font-size: 50px',
                'class': 'sim-text inverted number'
            });
            // labelContainer.setAttribute('class', 'blocklyFieldSliderLabel');
            var readout = document.createElement('span');
            readout.setAttribute('class', 'blocklyFieldSliderReadout');
            // var label = document.createElement('span');
            // label.setAttribute('class', 'blocklyFieldSliderLabelText');
            // label.innerHTML = labelText;
            // labelContainer.appendChild(label);
            // labelContainer.appendChild(readout);
            return [labelContainer, readout];
        };
        ;
        FieldSpeed.prototype.setReadout_ = function (readout, value) {
            this.updateSpeed(parseFloat(value));
            // Update reporter
            this.reporter.textContent = value + "%";
        };
        FieldSpeed.prototype.updateSpeed = function (speed) {
            var sign = this.sign(speed);
            speed = (Math.abs(speed) / 100 * 50) + 50;
            if (sign == -1)
                speed = 50 - speed;
            var c = Math.PI * (90 * 2);
            var pct = ((100 - speed) / 100) * c;
            this.circleBar.setAttribute('stroke-dashoffset', "" + pct);
        };
        // A re-implementation of Math.sign (since IE11 doesn't support it)
        FieldSpeed.prototype.sign = function (num) {
            return num ? num < 0 ? -1 : 1 : 0;
        };
        return FieldSpeed;
    }(Blockly.FieldSlider));
    pxtblockly.FieldSpeed = FieldSpeed;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldStyledLabel = /** @class */ (function (_super) {
        __extends(FieldStyledLabel, _super);
        function FieldStyledLabel(value, options, opt_validator) {
            var _this = _super.call(this, value, getClass(options)) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        return FieldStyledLabel;
    }(Blockly.FieldLabel));
    pxtblockly.FieldStyledLabel = FieldStyledLabel;
    function getClass(options) {
        if (options) {
            if (options.bold && options.italics) {
                return 'blocklyBoldItalicizedText';
            }
            else if (options.bold) {
                return 'blocklyBoldText';
            }
            else if (options.italics) {
                return 'blocklyItalicizedText';
            }
        }
        return undefined;
    }
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldTextDropdown = /** @class */ (function (_super) {
        __extends(FieldTextDropdown, _super);
        function FieldTextDropdown(text, options, opt_validator) {
            var _this = _super.call(this, text, options.values, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        return FieldTextDropdown;
    }(Blockly.FieldTextDropdown));
    pxtblockly.FieldTextDropdown = FieldTextDropdown;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldTextInput = /** @class */ (function (_super) {
        __extends(FieldTextInput, _super);
        function FieldTextInput(value, options, opt_validator) {
            var _this = _super.call(this, value, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        return FieldTextInput;
    }(Blockly.FieldTextInput));
    pxtblockly.FieldTextInput = FieldTextInput;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggle = /** @class */ (function (_super) {
        __extends(FieldToggle, _super);
        function FieldToggle(state, params, opt_validator) {
            var _this = _super.call(this, state, opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.CURSOR = 'pointer';
            _this.params = params;
            _this.setValue(state);
            _this.addArgType('toggle');
            _this.type_ = params.type;
            return _this;
        }
        FieldToggle.prototype.init = function () {
            if (this.fieldGroup_) {
                // Field has already been initialized once.
                return;
            }
            // Build the DOM.
            this.fieldGroup_ = Blockly.utils.createSvgElement('g', {}, null);
            if (!this.visible_) {
                this.fieldGroup_.style.display = 'none';
            }
            // Add an attribute to cassify the type of field.
            if (this.getArgTypes() !== null) {
                if (this.sourceBlock_.isShadow()) {
                    this.sourceBlock_.svgGroup_.setAttribute('data-argument-type', this.getArgTypes());
                }
                else {
                    // Fields without a shadow wrapper, like square dropdowns.
                    this.fieldGroup_.setAttribute('data-argument-type', this.getArgTypes());
                }
            }
            // If not in a shadow block, and has more than one input, draw a box.
            if (!this.sourceBlock_.isShadow()
                && (this.sourceBlock_.inputList && this.sourceBlock_.inputList.length > 1)) {
                this.box_ = Blockly.utils.createSvgElement('rect', {
                    'rx': Blockly.BlockSvg.CORNER_RADIUS,
                    'ry': Blockly.BlockSvg.CORNER_RADIUS,
                    'x': 0,
                    'y': 0,
                    'width': this.size_.width,
                    'height': this.size_.height,
                    'fill': Blockly.Colours.textField,
                    'stroke': this.sourceBlock_.getColourTertiary()
                });
                this.fieldGroup_.insertBefore(this.box_, this.textElement_);
            }
            // Adjust X to be flipped for RTL. Position is relative to horizontal start of source block.
            var size = this.getSize();
            this.checkElement_ = Blockly.utils.createSvgElement('g', {
                'class': "blocklyToggle " + (this.state_ ? 'blocklyToggleOn' : 'blocklyToggleOff'),
                'transform': "translate(8, " + size.height / 2 + ")",
            }, this.fieldGroup_);
            switch (this.getOutputShape()) {
                case Blockly.OUTPUT_SHAPE_HEXAGONAL:
                    this.toggleThumb_ = Blockly.utils.createSvgElement('polygon', {
                        'class': 'blocklyToggleRect',
                        'points': '-7,-14 -21,0 -7,14 7,14 21,0 7,-14',
                        'cursor': 'pointer'
                    }, this.checkElement_);
                    break;
                case Blockly.OUTPUT_SHAPE_ROUND:
                    this.toggleThumb_ = Blockly.utils.createSvgElement('rect', {
                        'class': 'blocklyToggleCircle',
                        'x': -6, 'y': -14, 'height': 28,
                        'width': 28, 'rx': 14, 'ry': 14,
                        'cursor': 'pointer'
                    }, this.checkElement_);
                    break;
                case Blockly.OUTPUT_SHAPE_SQUARE:
                    this.toggleThumb_ = Blockly.utils.createSvgElement('rect', {
                        'class': 'blocklyToggleRect',
                        'x': -6, 'y': -14, 'height': 28,
                        'width': 28, 'rx': 3, 'ry': 3,
                        'cursor': 'pointer'
                    }, this.checkElement_);
                    break;
            }
            var fieldX = (this.sourceBlock_.RTL) ? -size.width / 2 : size.width / 2;
            /** @type {!Element} */
            this.textElement_ = Blockly.utils.createSvgElement('text', {
                'class': 'blocklyText',
                'x': fieldX,
                'dy': '0.6ex',
                'y': size.height / 2
            }, this.fieldGroup_);
            this.updateEditable();
            this.sourceBlock_.getSvgRoot().appendChild(this.fieldGroup_);
            this.switchToggle(this.state_);
            this.setValue(this.getValue());
            // Force a render.
            this.render_();
            this.size_.width = 0;
            this.mouseDownWrapper_ =
                Blockly.bindEventWithChecks_(this.getClickTarget_(), 'mousedown', this, this.onMouseDown_);
        };
        FieldToggle.prototype.getDisplayText_ = function () {
            return this.state_ ? this.getTrueText() : this.getFalseText();
        };
        FieldToggle.prototype.getTrueText = function () {
            return lf("True");
        };
        FieldToggle.prototype.getFalseText = function () {
            return lf("False");
        };
        FieldToggle.prototype.updateWidth = function () {
            var innerWidth = this.getInnerWidth();
            var halfInnerWidth = innerWidth / 2;
            switch (this.getOutputShape()) {
                case Blockly.OUTPUT_SHAPE_ROUND:
                    this.size_.width = this.getInnerWidth() * 2 - 7;
                    break;
                case Blockly.OUTPUT_SHAPE_HEXAGONAL:
                    this.size_.width = this.getInnerWidth() * 2 + 8 - Math.floor(this.getInnerWidth() / 2);
                    break;
                case Blockly.OUTPUT_SHAPE_SQUARE:
                    this.size_.width = 9 + this.getInnerWidth() * 2;
                    break;
            }
            this.arrowWidth_ = 0;
        };
        FieldToggle.prototype.getInnerWidth = function () {
            return this.getMaxLength() * 10;
        };
        FieldToggle.prototype.getMaxLength = function () {
            return Math.max(this.getTrueText().length, this.getFalseText().length);
        };
        FieldToggle.prototype.getOutputShape = function () {
            return this.sourceBlock_.isShadow() ? this.sourceBlock_.getOutputShape() : Blockly.OUTPUT_SHAPE_SQUARE;
        };
        /**
         * Return 'TRUE' if the toggle is ON, 'FALSE' otherwise.
         * @return {string} Current state.
         */
        FieldToggle.prototype.getValue = function () {
            return this.toVal(this.state_);
        };
        ;
        /**
         * Set the checkbox to be checked if newBool is 'TRUE' or true,
         * unchecks otherwise.
         * @param {string|boolean} newBool New state.
         */
        FieldToggle.prototype.setValue = function (newBool) {
            var newState = this.fromVal(newBool);
            if (this.state_ !== newState) {
                if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
                    Blockly.Events.fire(new Blockly.Events.BlockChange(this.sourceBlock_, 'field', this.name, this.state_, newState));
                }
                this.state_ = newState;
                this.switchToggle(this.state_);
                this.setText(this.getDisplayText_());
            }
        };
        FieldToggle.prototype.switchToggle = function (newState) {
            if (this.checkElement_) {
                this.updateWidth();
                var size = this.getSize();
                var innerWidth_1 = this.getInnerWidth();
                if (newState) {
                    pxtblockly.svg.addClass(this.checkElement_, 'blocklyToggleOn');
                    pxtblockly.svg.removeClass(this.checkElement_, 'blocklyToggleOff');
                }
                else {
                    pxtblockly.svg.removeClass(this.checkElement_, 'blocklyToggleOn');
                    pxtblockly.svg.addClass(this.checkElement_, 'blocklyToggleOff');
                }
                var outputShape = this.getOutputShape();
                var width = 0, halfWidth = 0;
                var leftPadding = 0, rightPadding = 0;
                switch (outputShape) {
                    case Blockly.OUTPUT_SHAPE_HEXAGONAL:
                        width = innerWidth_1;
                        halfWidth = width / 2;
                        var quarterWidth = halfWidth / 2;
                        // TODO: the left padding calculation is a hack, we should calculate left padding based on width (generic case)
                        leftPadding = this.getMaxLength() > 3 ? -4 : 1;
                        rightPadding = -quarterWidth;
                        var topLeftPoint = -quarterWidth;
                        var bottomRightPoint = quarterWidth;
                        this.toggleThumb_.setAttribute('points', topLeftPoint + ",-14 " + (topLeftPoint - 14) + ",0 " + topLeftPoint + ",14 " + bottomRightPoint + ",14 " + (bottomRightPoint + 14) + ",0 " + bottomRightPoint + ",-14");
                        break;
                    case Blockly.OUTPUT_SHAPE_ROUND:
                    case Blockly.OUTPUT_SHAPE_SQUARE:
                        width = 5 + innerWidth_1;
                        halfWidth = width / 2;
                        this.toggleThumb_.setAttribute('width', width);
                        this.toggleThumb_.setAttribute('x', "-" + halfWidth);
                        leftPadding = rightPadding = outputShape == Blockly.OUTPUT_SHAPE_SQUARE ? 2 : -6;
                        break;
                }
                this.checkElement_.setAttribute('transform', "translate(" + (newState ? rightPadding + innerWidth_1 + halfWidth : halfWidth + leftPadding) + ", " + size.height / 2 + ")");
            }
        };
        FieldToggle.prototype.updateTextNode_ = function () {
            _super.prototype.updateTextNode_.call(this);
            if (this.textElement_)
                pxtblockly.svg.addClass(this.textElement_, 'blocklyToggleText');
        };
        FieldToggle.prototype.render_ = function () {
            if (this.visible_ && this.textElement_) {
                // Replace the text.
                goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
                var textNode = document.createTextNode(this.getDisplayText_());
                this.textElement_.appendChild(textNode);
                pxtblockly.svg.addClass(this.textElement_, 'blocklyToggleText');
                this.updateWidth();
                // Update text centering, based on newly calculated width.
                var halfWidth = this.size_.width / 2;
                var centerTextX = this.state_ ? halfWidth + halfWidth / 2 : halfWidth / 2;
                // Apply new text element x position.
                var width = Blockly.Field.getCachedWidth(this.textElement_);
                var newX = centerTextX - width / 2;
                this.textElement_.setAttribute('x', "" + newX);
            }
            // Update any drawn box to the correct width and height.
            if (this.box_) {
                this.box_.setAttribute('width', "" + this.size_.width);
                this.box_.setAttribute('height', "" + this.size_.height);
            }
        };
        /**
         * Toggle the state of the toggle.
         * @private
         */
        FieldToggle.prototype.showEditor_ = function () {
            var newState = !this.state_;
            /*
            if (this.sourceBlock_) {
              // Call any validation function, and allow it to override.
              newState = this.callValidator(newState);
            }*/
            if (newState !== null) {
                this.setValue(this.toVal(newState));
            }
        };
        FieldToggle.prototype.toVal = function (newState) {
            if (this.type_ == "number")
                return String(newState ? '1' : '0');
            else
                return String(newState ? 'true' : 'false');
        };
        FieldToggle.prototype.fromVal = function (val) {
            if (typeof val == "string") {
                if (val == "1" || val.toUpperCase() == "TRUE")
                    return true;
                return false;
            }
            return !!val;
        };
        return FieldToggle;
    }(Blockly.FieldNumber));
    pxtblockly.FieldToggle = FieldToggle;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="./field_toggle.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggleHighLow = /** @class */ (function (_super) {
        __extends(FieldToggleHighLow, _super);
        function FieldToggleHighLow(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleHighLow.prototype.getTrueText = function () {
            return lf("HIGH");
        };
        FieldToggleHighLow.prototype.getFalseText = function () {
            return lf("LOW");
        };
        return FieldToggleHighLow;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleHighLow = FieldToggleHighLow;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="./field_toggle.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggleOnOff = /** @class */ (function (_super) {
        __extends(FieldToggleOnOff, _super);
        function FieldToggleOnOff(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleOnOff.prototype.getTrueText = function () {
            return lf("ON");
        };
        FieldToggleOnOff.prototype.getFalseText = function () {
            return lf("OFF");
        };
        return FieldToggleOnOff;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleOnOff = FieldToggleOnOff;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="./field_toggle.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggleUpDown = /** @class */ (function (_super) {
        __extends(FieldToggleUpDown, _super);
        function FieldToggleUpDown(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleUpDown.prototype.getTrueText = function () {
            return lf("UP");
        };
        FieldToggleUpDown.prototype.getFalseText = function () {
            return lf("DOWN");
        };
        return FieldToggleUpDown;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleUpDown = FieldToggleUpDown;
    var FieldToggleDownUp = /** @class */ (function (_super) {
        __extends(FieldToggleDownUp, _super);
        function FieldToggleDownUp(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleDownUp.prototype.getTrueText = function () {
            return lf("DOWN");
        };
        FieldToggleDownUp.prototype.getFalseText = function () {
            return lf("UP");
        };
        return FieldToggleDownUp;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleDownUp = FieldToggleDownUp;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="./field_toggle.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggleYesNo = /** @class */ (function (_super) {
        __extends(FieldToggleYesNo, _super);
        function FieldToggleYesNo(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleYesNo.prototype.getTrueText = function () {
            return lf("Yes");
        };
        FieldToggleYesNo.prototype.getFalseText = function () {
            return lf("No");
        };
        return FieldToggleYesNo;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleYesNo = FieldToggleYesNo;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldTsExpression = /** @class */ (function (_super) {
        __extends(FieldTsExpression, _super);
        function FieldTsExpression() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        /**
         * Same as parent, but adds a different class to text when disabled
         */
        FieldTsExpression.prototype.updateEditable = function () {
            var group = this.fieldGroup_;
            if (!this.EDITABLE || !group) {
                return;
            }
            if (this.sourceBlock_.isEditable()) {
                Blockly.utils.addClass(group, 'blocklyEditableText');
                Blockly.utils.removeClass(group, 'blocklyGreyExpressionBlockText');
                this.fieldGroup_.style.cursor = this.CURSOR;
            }
            else {
                Blockly.utils.addClass(group, 'blocklyGreyExpressionBlockText');
                Blockly.utils.removeClass(group, 'blocklyEditableText');
                this.fieldGroup_.style.cursor = '';
            }
        };
        return FieldTsExpression;
    }(Blockly.FieldTextInput));
    pxtblockly.FieldTsExpression = FieldTsExpression;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts"/>
/// <reference path="../../built/pxtsim.d.ts"/>
var pxtblockly;
(function (pxtblockly) {
    var FieldTurnRatio = /** @class */ (function (_super) {
        __extends(FieldTurnRatio, _super);
        /**
         * Class for a color wheel field.
         * @param {number|string} value The initial content of the field.
         * @param {Function=} opt_validator An optional function that is called
         *     to validate any constraints on what the user entered.  Takes the new
         *     text as an argument and returns either the accepted text, a replacement
         *     text, or null to abort the change.
         * @extends {Blockly.FieldNumber}
         * @constructor
         */
        function FieldTurnRatio(value_, params, opt_validator) {
            var _this = _super.call(this, String(value_), '-100', '100', null, '10', 'TurnRatio', opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.params = params;
            return _this;
        }
        FieldTurnRatio.prototype.createLabelDom_ = function (labelText) {
            var labelContainer = document.createElement('div');
            var svg = Blockly.utils.createSvgElement('svg', {
                'xmlns': 'http://www.w3.org/2000/svg',
                'xmlns:html': 'http://www.w3.org/1999/xhtml',
                'xmlns:xlink': 'http://www.w3.org/1999/xlink',
                'version': '1.1',
                'height': (FieldTurnRatio.HALF + FieldTurnRatio.HANDLE_RADIUS + 10) + 'px',
                'width': (FieldTurnRatio.HALF * 2) + 'px'
            }, labelContainer);
            var defs = Blockly.utils.createSvgElement('defs', {}, svg);
            var marker = Blockly.utils.createSvgElement('marker', {
                'id': 'head',
                'orient': "auto",
                'markerWidth': '2',
                'markerHeight': '4',
                'refX': '0.1', 'refY': '1.5'
            }, defs);
            var markerPath = Blockly.utils.createSvgElement('path', {
                'd': 'M0,0 V3 L1.5,1.5 Z',
                'fill': '#f12a21'
            }, marker);
            this.reporter_ = pxsim.svg.child(svg, "text", {
                'x': FieldTurnRatio.HALF, 'y': 96,
                'text-anchor': 'middle', 'dominant-baseline': 'middle',
                'style': 'font-size: 50px',
                'class': 'sim-text inverted number'
            });
            this.path_ = Blockly.utils.createSvgElement('path', {
                'x1': FieldTurnRatio.HALF,
                'y1': FieldTurnRatio.HALF,
                'marker-end': 'url(#head)',
                'style': 'fill: none; stroke: #f12a21; stroke-width: 10'
            }, svg);
            this.updateGraph_();
            var readout = document.createElement('span');
            readout.setAttribute('class', 'blocklyFieldSliderReadout');
            return [labelContainer, readout];
        };
        ;
        FieldTurnRatio.prototype.updateGraph_ = function () {
            if (!this.path_) {
                return;
            }
            var v = goog.math.clamp(parseFloat(this.getText()), -100, 100);
            if (isNaN(v)) {
                v = 0;
            }
            var x = goog.math.clamp(parseFloat(this.getText()), -100, 100) / 100;
            var theta = x * Math.PI / 2;
            var cx = FieldTurnRatio.HALF;
            var cy = FieldTurnRatio.HALF - 14;
            var gamma = Math.PI - 2 * theta;
            var r = FieldTurnRatio.RADIUS;
            var alpha = 0.2 + Math.abs(x) * 0.5;
            var x1 = 0;
            var y1 = r * alpha;
            var y2 = r * Math.sin(Math.PI / 2 - theta);
            var x2 = r * Math.cos(Math.PI / 2 - theta);
            var y3 = y2 - r * alpha * Math.cos(2 * theta);
            var x3 = x2 - r * alpha * Math.sin(2 * theta);
            var d = "M " + cx + " " + cy + " C " + cx + " " + (cy - y1) + " " + (cx + x3) + " " + (cy - y3) + " " + (cx + x2) + " " + (cy - y2);
            this.path_.setAttribute('d', d);
            this.reporter_.textContent = "" + v;
        };
        FieldTurnRatio.prototype.setReadout_ = function (readout, value) {
            this.updateGraph_();
        };
        FieldTurnRatio.HALF = 80;
        FieldTurnRatio.HANDLE_RADIUS = 30;
        FieldTurnRatio.RADIUS = FieldTurnRatio.HALF - FieldTurnRatio.HANDLE_RADIUS - 1;
        return FieldTurnRatio;
    }(Blockly.FieldSlider));
    pxtblockly.FieldTurnRatio = FieldTurnRatio;
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
    var FieldUserEnum = /** @class */ (function (_super) {
        __extends(FieldUserEnum, _super);
        function FieldUserEnum(opts) {
            var _this = _super.call(this, createMenuGenerator(opts)) || this;
            _this.opts = opts;
            return _this;
        }
        FieldUserEnum.prototype.init = function () {
            _super.prototype.init.call(this);
            this.initVariables();
        };
        FieldUserEnum.prototype.onItemSelected = function (menu, menuItem) {
            var _this = this;
            var value = menuItem.getValue();
            if (value === "CREATE") {
                promptAndCreateEnum(this.sourceBlock_.workspace, this.opts, lf("New {0}:", this.opts.memberName), function (newName) { return newName && _this.setValue(newName); });
            }
            else {
                _super.prototype.onItemSelected.call(this, menu, menuItem);
            }
        };
        FieldUserEnum.prototype.initVariables = function () {
            var _this = this;
            if (this.sourceBlock_ && this.sourceBlock_.workspace) {
                if (this.sourceBlock_.isInFlyout) {
                    // Can't create variables from within the flyout, so we just have to fake it
                    // by setting the text instead of the value
                    this.setText(this.opts.initialMembers[0]);
                }
                else {
                    var ws_1 = this.sourceBlock_.workspace;
                    var existing_1 = getMembersForEnum(ws_1, this.opts.name);
                    this.opts.initialMembers.forEach(function (memberName) {
                        if (!existing_1.some(function (_a) {
                            var name = _a[0], value = _a[1];
                            return name === memberName;
                        })) {
                            createNewEnumMember(ws_1, _this.opts, memberName);
                        }
                    });
                    if (this.getValue() === "CREATE") {
                        var newValue = getVariableNameForMember(ws_1, this.opts.name, this.opts.initialMembers[0]);
                        if (newValue) {
                            this.setValue(newValue);
                        }
                    }
                }
            }
        };
        return FieldUserEnum;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldUserEnum = FieldUserEnum;
    function createMenuGenerator(opts) {
        return function () {
            var res = [];
            var that = this;
            if (that.sourceBlock_ && that.sourceBlock_.workspace) {
                var options = that.sourceBlock_.workspace.getVariablesOfType(opts.name);
                options.forEach(function (model) {
                    // The format of the name is 10mem where "10" is the value and "mem" is the enum member
                    var withoutValue = model.name.replace(/^\d+/, "");
                    res.push([withoutValue, model.name]);
                });
            }
            res.push([lf("Add a new {0}...", opts.memberName), "CREATE"]);
            return res;
        };
    }
    function promptAndCreateEnum(ws, opts, message, cb) {
        Blockly.prompt(message, opts.promptHint, function (response) {
            if (response) {
                var nameIsValid = false;
                if (pxtc.isIdentifierStart(response.charCodeAt(0), 2)) {
                    nameIsValid = true;
                    for (var i = 1; i < response.length; i++) {
                        if (!pxtc.isIdentifierPart(response.charCodeAt(i), 2)) {
                            nameIsValid = false;
                        }
                    }
                }
                if (!nameIsValid) {
                    Blockly.alert(lf("Names must start with a letter and can only contain letters, numbers, '$', and '_'."), function () { return promptAndCreateEnum(ws, opts, message, cb); });
                    return;
                }
                var existing = getMembersForEnum(ws, opts.name);
                for (var i = 0; i < existing.length; i++) {
                    var _a = existing[i], name_7 = _a[0], value = _a[1];
                    if (name_7 === response) {
                        Blockly.alert(lf("A {0} named '{1}' already exists.", opts.memberName, response), function () { return promptAndCreateEnum(ws, opts, message, cb); });
                        return;
                    }
                }
                cb(createNewEnumMember(ws, opts, response));
            }
        });
    }
    function parseName(model) {
        var match = /^(\d+)([^0-9].*)$/.exec(model.name);
        if (match) {
            return [match[2], parseInt(match[1])];
        }
        return [model.name, -1];
    }
    function getMembersForEnum(ws, enumName) {
        var existing = ws.getVariablesOfType(enumName);
        if (existing && existing.length) {
            return existing.map(parseName);
        }
        else {
            return [];
        }
    }
    function getNextValue(members, opts) {
        var existing = members.map(function (_a) {
            var name = _a[0], value = _a[1];
            return value;
        });
        if (opts.isBitMask) {
            for (var i = 0; i < existing.length; i++) {
                var current = 1 << i;
                if (existing.indexOf(current) < 0) {
                    return current;
                }
            }
            return 1 << existing.length;
        }
        else {
            var start = opts.firstValue || 0;
            for (var i = 0; i < existing.length; i++) {
                if (existing.indexOf(start + i) < 0) {
                    return start + i;
                }
            }
            return start + existing.length;
        }
    }
    pxtblockly.getNextValue = getNextValue;
    function createNewEnumMember(ws, opts, newName) {
        var ex = getMembersForEnum(ws, opts.name);
        var val = getNextValue(ex, opts);
        var variableName = val + newName;
        Blockly.Variables.getOrCreateVariablePackage(ws, null, variableName, opts.name);
        return variableName;
    }
    function getVariableNameForMember(ws, enumName, memberName) {
        var existing = ws.getVariablesOfType(enumName);
        if (existing && existing.length) {
            for (var i = 0; i < existing.length; i++) {
                var name_8 = parseName(existing[i])[0];
                if (name_8 === memberName) {
                    return existing[i].name;
                }
            }
        }
        return undefined;
    }
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
    var svg;
    (function (svg) {
        function hasClass(el, cls) {
            if (el.classList)
                return el.classList.contains(cls);
            else
                return el.className.baseVal.indexOf(cls) > -1;
        }
        svg.hasClass = hasClass;
        function addClass(el, cls) {
            if (el.classList)
                el.classList.add(cls);
            else if (el.className.baseVal.indexOf(cls) < 0)
                el.className.baseVal += ' ' + cls;
        }
        svg.addClass = addClass;
        function removeClass(el, cls) {
            if (el.classList)
                el.classList.remove(cls);
            else
                el.className.baseVal = el.className.baseVal.replace(cls, '').replace(/\s{2,}/, ' ');
        }
        svg.removeClass = removeClass;
    })(svg = pxtblockly.svg || (pxtblockly.svg = {}));
    function parseColour(colour) {
        var hue = Number(colour);
        if (!isNaN(hue)) {
            return Blockly.hueToRgb(hue);
        }
        else if (goog.isString(colour) && colour.match(/^#[0-9a-fA-F]{6}$/)) {
            return colour;
        }
        else {
            return '#000';
        }
    }
    pxtblockly.parseColour = parseColour;
    var AudioContextManager;
    (function (AudioContextManager) {
        var _frequency = 0;
        var _context; // AudioContext
        var _vco; // OscillatorNode;
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
        }
        AudioContextManager.mute = mute;
        function stop() {
            if (!_context)
                return;
            _vco.disconnect();
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
                if (_vco) {
                    _vco.disconnect();
                    _vco = undefined;
                }
                _vco = ctx.createOscillator();
                _vco.frequency.value = frequency;
                _vco.type = 'triangle';
                _vco.connect(ctx.destination);
                _vco.start(0);
            }
            catch (e) {
                _vco = undefined;
                return;
            }
        }
        AudioContextManager.tone = tone;
    })(AudioContextManager = pxtblockly.AudioContextManager || (pxtblockly.AudioContextManager = {}));
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
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
        Bitmap.prototype.apply = function (change) {
            for (var c = 0; c < change.width; c++) {
                for (var r = 0; r < change.height; r++) {
                    this.set(change.x0 + c, change.y0 + r, change.get(c, r));
                }
            }
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
    pxtblockly.Bitmap = Bitmap;
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
    pxtblockly.Bitmask = Bitmask;
    function resizeBitmap(img, width, height) {
        var result = new Bitmap(width, height);
        result.apply(img);
        return result;
    }
    pxtblockly.resizeBitmap = resizeBitmap;
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
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
                .fill(this.props.selectedTextColor);
            this.leftElement.appendChild(this.leftText);
            // Draw the right option
            this.rightElement = this.root.group();
            this.rightText = mkText(this.props.rightText)
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
    pxtblockly.Toggle = Toggle;
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
            this.root.title(text);
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
    pxtblockly.Button = Button;
    var TextButton = /** @class */ (function (_super) {
        __extends(TextButton, _super);
        function TextButton(root, cx, cy, text, className) {
            var _this = _super.call(this, root, cx, cy) || this;
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
        return TextButton;
    }(Button));
    pxtblockly.TextButton = TextButton;
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
    pxtblockly.CursorButton = CursorButton;
    function mkIconButton(icon, width, height) {
        if (height === void 0) { height = width + BUTTON_BOTTOM_BORDER_WIDTH - BUTTON_BORDER_WIDTH; }
        var g = drawSingleButton(width, height);
        return new TextButton(g.root, g.cx, g.cy, icon, "sprite-editor-icon");
    }
    pxtblockly.mkIconButton = mkIconButton;
    function mkXIconButton(icon, width, height) {
        if (height === void 0) { height = width + BUTTON_BOTTOM_BORDER_WIDTH - BUTTON_BORDER_WIDTH; }
        var g = drawSingleButton(width, height);
        return new TextButton(g.root, g.cx, g.cy, icon, "sprite-editor-xicon");
    }
    pxtblockly.mkXIconButton = mkXIconButton;
    function mkTextButton(text, width, height) {
        var g = drawSingleButton(width, height);
        return new TextButton(g.root, g.cx, g.cy, text, "sprite-editor-text");
    }
    pxtblockly.mkTextButton = mkTextButton;
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
    pxtblockly.CursorMultiButton = CursorMultiButton;
    var UndoRedoGroup = /** @class */ (function () {
        function UndoRedoGroup(parent, host, width, height) {
            var _this = this;
            this.root = parent.group();
            this.host = host;
            var _a = buttonGroup(width, height, 2), undo = _a[0], redo = _a[1];
            this.undo = new TextButton(undo.root, undo.cx, undo.cy, "\uf118", "sprite-editor-xicon");
            this.undo.onClick(function () { return _this.host.undo(); });
            this.root.appendChild(this.undo.getElement());
            this.redo = new TextButton(redo.root, redo.cx, redo.cy, "\uf111", "sprite-editor-xicon");
            this.redo.onClick(function () { return _this.host.redo(); });
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
    pxtblockly.UndoRedoGroup = UndoRedoGroup;
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
            .setAttribute("dy", (pxt.BrowserUtils.isIE() || pxt.BrowserUtils.isEdge()) ? "0.3em" : "0");
    }
    pxtblockly.mkText = mkText;
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
    var alphaCellWidth = 5;
    var dropdownPaddding = 4;
    var lightModeBackground = "#dedede";
    var CanvasGrid = /** @class */ (function () {
        function CanvasGrid(palette, image, lightMode) {
            if (lightMode === void 0) { lightMode = false; }
            this.palette = palette;
            this.image = image;
            this.lightMode = lightMode;
            this.cellWidth = 16;
            this.cellHeight = 16;
            this.paintLayer = document.createElement("canvas");
            this.paintLayer.setAttribute("class", "sprite-editor-canvas");
            if (!this.lightMode) {
                this.backgroundLayer = document.createElement("canvas");
                this.backgroundLayer.setAttribute("class", "sprite-editor-canvas");
                this.overlayLayer = document.createElement("canvas");
                this.overlayLayer.setAttribute("class", "sprite-editor-canvas");
                this.context = this.paintLayer.getContext("2d");
            }
            else {
                this.context = this.paintLayer.getContext("2d", { alpha: false });
                this.context.fillStyle = lightModeBackground;
                this.context.fill();
            }
            this.hideOverlay();
        }
        CanvasGrid.prototype.repaint = function () {
            this.redraw();
        };
        CanvasGrid.prototype.applyEdit = function (edit, cursorCol, cursorRow) {
            edit.doEdit(this.image);
            this.drawCursor(edit, cursorCol, cursorRow);
        };
        CanvasGrid.prototype.drawCursor = function (edit, col, row) {
            var _this = this;
            this.context.strokeStyle = "#898989";
            this.repaint();
            edit.drawCursor(col, row, function (c, r) {
                _this.drawColor(c, r, edit.color);
                var x = c * _this.cellWidth;
                var y = r * _this.cellHeight;
                _this.context.strokeRect(x, y, _this.cellWidth, _this.cellHeight);
            });
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
        CanvasGrid.prototype.drawColor = function (col, row, color) {
            this.setCellColor(col, row, color === 0 ? undefined : this.palette[color - 1]);
        };
        CanvasGrid.prototype.restore = function (bitmap, repaint) {
            if (repaint === void 0) { repaint = false; }
            if (bitmap.height != this.image.height || bitmap.width != this.image.width) {
                this.image = bitmap.copy();
                this.resizeGrid(bitmap.width, bitmap.width * bitmap.height);
            }
            else {
                this.image.apply(bitmap);
            }
            if (repaint) {
                this.repaint();
            }
        };
        CanvasGrid.prototype.showOverlay = function () {
            var _this = this;
            if (this.lightMode)
                return;
            if (this.fadeAnimation) {
                this.fadeAnimation.kill();
            }
            this.overlayLayer.style.visibility = "visible";
            var w = this.overlayLayer.width;
            var h = this.overlayLayer.height;
            var context = this.overlayLayer.getContext("2d");
            var toastWidth = 100;
            var toastHeight = 40;
            var toastLeft = w / 2 - toastWidth / 2;
            var toastTop = h / 2 - toastWidth / 4;
            this.fadeAnimation = new Fade(function (opacity, dead) {
                if (dead) {
                    _this.hideOverlay();
                    return;
                }
                context.clearRect(0, 0, w, h);
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
        CanvasGrid.prototype.hideOverlay = function () {
            if (!this.lightMode) {
                this.overlayLayer.style.visibility = "hidden";
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
            if (!this.lightMode) {
                this.backgroundLayer.width = canvasWidth;
                this.backgroundLayer.height = canvasHeight;
                this.overlayLayer.width = canvasWidth;
                this.overlayLayer.height = canvasHeight;
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
        CanvasGrid.prototype.setCellColor = function (column, row, color, opacity) {
            var x = column * this.cellWidth;
            var y = row * this.cellHeight;
            if (color) {
                this.context.fillStyle = color;
                this.context.fillRect(x, y, this.cellWidth, this.cellHeight);
            }
            else if (!this.lightMode) {
                this.context.clearRect(x, y, this.cellWidth, this.cellHeight);
            }
            else {
                this.context.fillStyle = lightModeBackground;
                this.context.fillRect(x, y, this.cellWidth, this.cellHeight);
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
            if (!this.lightMode) {
                this.layoutCanvas(this.overlayLayer, top, left, width, height);
                this.layoutCanvas(this.backgroundLayer, top, left, width, height);
            }
            this.redraw();
            this.drawBackground();
            this.bounds = undefined;
        };
        CanvasGrid.prototype.render = function (parent) {
            if (!this.lightMode) {
                parent.appendChild(this.backgroundLayer);
            }
            parent.appendChild(this.paintLayer);
            if (!this.lightMode) {
                parent.appendChild(this.overlayLayer);
            }
        };
        CanvasGrid.prototype.redraw = function () {
            for (var c = 0; c < this.image.width; c++) {
                for (var r = 0; r < this.image.height; r++) {
                    this.drawColor(c, r, this.image.get(c, r));
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
        CanvasGrid.prototype.clientToCell = function (clientX, clientY) {
            if (!this.bounds)
                this.bounds = this.paintLayer.getBoundingClientRect();
            return [
                Math.floor((clientX - this.bounds.left) / this.cellWidth),
                Math.floor((clientY - this.bounds.top) / this.cellHeight)
            ];
        };
        CanvasGrid.prototype.initDragSurface = function () {
            var _this = this;
            if (!this.gesture) {
                this.gesture = new GestureState();
                this.paintLayer.addEventListener(pxsim.pointerEvents.move, function (ev) {
                    var _a = _this.clientToCell(ev.clientX, ev.clientY), col = _a[0], row = _a[1];
                    if (ev.buttons & 1) {
                        _this.gesture.handle(InputEvent.Down, col, row);
                    }
                    _this.gesture.handle(InputEvent.Move, col, row);
                });
                pxsim.pointerEvents.down.forEach(function (evId) {
                    _this.paintLayer.addEventListener(evId, function (ev) {
                        var _a = _this.clientToCell(ev.clientX, ev.clientY), col = _a[0], row = _a[1];
                        _this.gesture.handle(InputEvent.Down, col, row);
                    });
                });
                this.paintLayer.addEventListener(pxsim.pointerEvents.up, function (ev) {
                    var _a = _this.clientToCell(ev.clientX, ev.clientY), col = _a[0], row = _a[1];
                    _this.gesture.handle(InputEvent.Up, col, row);
                });
                this.paintLayer.addEventListener("click", function (ev) {
                    var _a = _this.clientToCell(ev.clientX, ev.clientY), col = _a[0], row = _a[1];
                    _this.gesture.handle(InputEvent.Down, col, row);
                    _this.gesture.handle(InputEvent.Up, col, row);
                });
                this.paintLayer.addEventListener(pxsim.pointerEvents.leave, function (ev) {
                    var _a = _this.clientToCell(ev.clientX, ev.clientY), col = _a[0], row = _a[1];
                    _this.gesture.handle(InputEvent.Leave, col, row);
                });
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
        return CanvasGrid;
    }());
    pxtblockly.CanvasGrid = CanvasGrid;
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
                this.draw(0, true);
                this.kill();
            }
        };
        Fade.prototype.kill = function () {
            this.dead = true;
        };
        return Fade;
    }());
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
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
        Gallery.prototype.buildDom = function () {
            var _this = this;
            pxsim.U.clear(this.contentDiv);
            var totalWidth = this.containerDiv.clientWidth - 17;
            var buttonWidth = (Math.floor(totalWidth / COLUMNS) - 8) + "px";
            this.getGalleryItems("Image").forEach(function (item, i) { return _this.mkButton(item.src, item.alt, item.qName, i, buttonWidth); });
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
            button.setAttribute('class', 'blocklyDropDownButton sprite-editor-card');
            button.title = alt;
            button.style.width = width;
            button.style.height = width;
            var backgroundColor = this.itemBackgroundColor;
            button.style.backgroundColor = backgroundColor;
            button.style.borderColor = this.itemBorderColor;
            Blockly.bindEvent_(button, 'click', this, function () { return _this.handleSelection(value); });
            var parentDiv = this.contentDiv;
            Blockly.bindEvent_(button, 'mouseover', button, function () {
                this.setAttribute('class', 'blocklyDropDownButton blocklyDropDownButtonHover sprite-editor-card');
                parentDiv.setAttribute('aria-activedescendant', this.id);
            });
            Blockly.bindEvent_(button, 'mouseout', button, function () {
                this.setAttribute('class', 'blocklyDropDownButton sprite-editor-card');
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
            var out = new pxtblockly.Bitmap(w, h);
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
            var syms = pxt.blocks.getFixedInstanceDropdownValues(this.info.apis, qName);
            pxt.blocks.generateIcons(syms);
            return syms.map(function (sym) {
                return {
                    qName: sym.qName,
                    src: sym.attributes.iconURL,
                    alt: sym.qName
                };
            });
        };
        return Gallery;
    }());
    pxtblockly.Gallery = Gallery;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="./buttons.ts" />
var pxtblockly;
(function (pxtblockly) {
    var svg = pxt.svgUtil;
    var SpriteHeader = /** @class */ (function () {
        function SpriteHeader(host) {
            var _this = this;
            this.host = host;
            this.div = document.createElement("div");
            this.div.setAttribute("id", "sprite-editor-header");
            this.root = new svg.SVG(this.div).id("sprite-editor-header-controls");
            this.toggle = new pxtblockly.Toggle(this.root, { leftText: "Editor", rightText: "Gallery", baseColor: "#4B7BEC" });
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
            var bounds = this.div.getBoundingClientRect();
            this.toggle.translate((bounds.width - this.toggle.width()) / 2, (bounds.height - this.toggle.height()) / 2);
        };
        return SpriteHeader;
    }());
    pxtblockly.SpriteHeader = SpriteHeader;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="./buttons.ts" />
var pxtblockly;
(function (pxtblockly) {
    var UNDO_REDO_WIDTH = 65;
    var SIZE_BUTTON_WIDTH = 65;
    var SIZE_CURSOR_MARGIN = 10;
    var ReporterBar = /** @class */ (function () {
        function ReporterBar(parent, host, height) {
            var _this = this;
            this.host = host;
            this.height = height;
            this.root = parent.group().id("sprite-editor-reporter-bar");
            this.undoRedo = new pxtblockly.UndoRedoGroup(this.root, host, UNDO_REDO_WIDTH, height);
            this.sizeButton = pxtblockly.mkTextButton("16x16", SIZE_BUTTON_WIDTH, height);
            this.sizeButton.onClick(function () {
                _this.nextSize();
            });
            this.root.appendChild(this.sizeButton.getElement());
            this.sizePresets = [
                [16, 16]
            ];
            this.cursorText = this.root.draw("text")
                .appendClass("sprite-editor-text")
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
            this.undoRedo.translate(width - UNDO_REDO_WIDTH, 0);
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
    pxtblockly.ReporterBar = ReporterBar;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="./buttons.ts" />
var pxtblockly;
(function (pxtblockly) {
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
    var PALETTE_TOP = TOOL_BUTTON_TOP + TOOL_BUTTON_WIDTH * 2 + INNER_BUTTON_MARGIN + COLOR_MARGIN;
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
            var buttonGroup = new pxtblockly.CursorMultiButton(this.sizeGroup, TOOLBAR_WIDTH);
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
            this.pencilTool = this.initButton(lf("Pencil"), "\uf040", pxtblockly.PaintTool.Normal);
            this.eraseTool = this.initButton(lf("Erase"), "\uf12d", pxtblockly.PaintTool.Erase);
            this.eraseTool.translate(1 + TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN, 0);
            this.fillTool = this.initButton(lf("Fill"), "\uf102", pxtblockly.PaintTool.Fill, true);
            this.fillTool.translate(0, TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN);
            this.rectangleTool = this.initButton(lf("Rectangle"), "\uf096", pxtblockly.PaintTool.Rectangle);
            this.rectangleTool.translate(1 + TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN, TOOL_BUTTON_WIDTH + INNER_BUTTON_MARGIN);
            this.setTool(pxtblockly.PaintTool.Normal);
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
            var _loop_3 = function (i) {
                var col = i % 2;
                var row = Math.floor(i / 2);
                var swatch = this_3.paletteGroup
                    .draw("rect")
                    .size(PALLETTE_SWATCH_WIDTH, PALLETTE_SWATCH_WIDTH)
                    .at(col ? PALETTE_BORDER_WIDTH * 2 + PALLETTE_SWATCH_WIDTH : PALETTE_BORDER_WIDTH, bgHeight + COLOR_MARGIN + PALETTE_BORDER_WIDTH + row * (PALETTE_BORDER_WIDTH + PALLETTE_SWATCH_WIDTH))
                    .fill(this_3.palette[i])
                    .clipPath("url(#sprite-editor-selected-color)")
                    .onClick(function () { return _this.setColor(i); });
                this_3.colorSwatches.push(swatch);
            };
            var this_3 = this;
            for (var i = 0; i < this.palette.length; i++) {
                _loop_3(i);
            }
            this.setColor(0);
        };
        SideBar.prototype.initButton = function (title, icon, tool, xicon) {
            var _this = this;
            if (xicon === void 0) { xicon = false; }
            var btn = xicon ? pxtblockly.mkXIconButton(icon, TOOL_BUTTON_WIDTH) : pxtblockly.mkIconButton(icon, TOOL_BUTTON_WIDTH);
            btn.title(title);
            btn.onClick(function () { return _this.setTool(tool); });
            this.buttonGroup.appendChild(btn.getElement());
            return btn;
        };
        SideBar.prototype.getButtonForTool = function (tool) {
            switch (tool) {
                case pxtblockly.PaintTool.Normal:
                case pxtblockly.PaintTool.Line: return this.pencilTool;
                case pxtblockly.PaintTool.Erase: return this.eraseTool;
                case pxtblockly.PaintTool.Fill: return this.fillTool;
                case pxtblockly.PaintTool.Rectangle:
                case pxtblockly.PaintTool.Circle: return this.rectangleTool;
                default: return undefined;
            }
        };
        return SideBar;
    }());
    pxtblockly.SideBar = SideBar;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="./bitmap.ts" />
var pxtblockly;
(function (pxtblockly) {
    var PaintTool;
    (function (PaintTool) {
        PaintTool[PaintTool["Normal"] = 0] = "Normal";
        PaintTool[PaintTool["Rectangle"] = 1] = "Rectangle";
        PaintTool[PaintTool["Outline"] = 2] = "Outline";
        PaintTool[PaintTool["Circle"] = 3] = "Circle";
        PaintTool[PaintTool["Fill"] = 4] = "Fill";
        PaintTool[PaintTool["Line"] = 5] = "Line";
        PaintTool[PaintTool["Erase"] = 6] = "Erase";
    })(PaintTool = pxtblockly.PaintTool || (pxtblockly.PaintTool = {}));
    var Cursor = /** @class */ (function () {
        function Cursor() {
        }
        return Cursor;
    }());
    pxtblockly.Cursor = Cursor;
    var Edit = /** @class */ (function () {
        function Edit(canvasWidth, canvasHeight, color, toolWidth) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.color = color;
            this.toolWidth = toolWidth;
        }
        Edit.prototype.doEdit = function (bitmap) {
            if (this.isStarted) {
                this.doEditCore(bitmap);
            }
        };
        Edit.prototype.start = function (cursorCol, cursorRow) {
            this.isStarted = true;
            this.startCol = cursorCol;
            this.startRow = cursorRow;
        };
        Edit.prototype.drawCursor = function (col, row, draw) {
            draw(col, row);
        };
        return Edit;
    }());
    pxtblockly.Edit = Edit;
    var SelectionEdit = /** @class */ (function (_super) {
        __extends(SelectionEdit, _super);
        function SelectionEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SelectionEdit.prototype.update = function (col, row) {
            this.endCol = col;
            this.endRow = row;
        };
        SelectionEdit.prototype.topLeft = function () {
            return [Math.min(this.startCol, this.endCol), Math.min(this.startRow, this.endRow)];
        };
        SelectionEdit.prototype.bottomRight = function () {
            return [Math.max(this.startCol, this.endCol), Math.max(this.startRow, this.endRow)];
        };
        return SelectionEdit;
    }(Edit));
    pxtblockly.SelectionEdit = SelectionEdit;
    /**
     * Regular old drawing tool
     */
    var PaintEdit = /** @class */ (function (_super) {
        __extends(PaintEdit, _super);
        function PaintEdit(canvasWidth, canvasHeight, color, toolWidth) {
            var _this = _super.call(this, canvasWidth, canvasHeight, color, toolWidth) || this;
            _this.mask = new pxtblockly.Bitmask(canvasWidth, canvasHeight);
            return _this;
        }
        PaintEdit.prototype.update = function (col, row) {
            var _this = this;
            this.drawCore(col, row, function (c, r) { return _this.mask.set(c, r); });
        };
        PaintEdit.prototype.drawCursor = function (col, row, draw) {
            this.drawCore(col, row, draw);
        };
        PaintEdit.prototype.doEditCore = function (bitmap) {
            for (var c = 0; c < bitmap.width; c++) {
                for (var r = 0; r < bitmap.height; r++) {
                    if (this.mask.get(c, r)) {
                        bitmap.set(c, r, this.color);
                    }
                }
            }
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
    pxtblockly.PaintEdit = PaintEdit;
    /**
     * Tool for drawing filled rectangles
     */
    var RectangleEdit = /** @class */ (function (_super) {
        __extends(RectangleEdit, _super);
        function RectangleEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        RectangleEdit.prototype.doEditCore = function (bitmap) {
            var tl = this.topLeft();
            var br = this.bottomRight();
            for (var c = tl[0]; c <= br[0]; c++) {
                for (var r = tl[1]; r <= br[1]; r++) {
                    bitmap.set(c, r, this.color);
                }
            }
        };
        return RectangleEdit;
    }(SelectionEdit));
    pxtblockly.RectangleEdit = RectangleEdit;
    /**
     * Tool for drawing empty rectangles
     */
    var OutlineEdit = /** @class */ (function (_super) {
        __extends(OutlineEdit, _super);
        function OutlineEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        OutlineEdit.prototype.doEditCore = function (bitmap) {
            var tl = this.topLeft();
            var br = this.bottomRight();
            for (var i = 0; i < this.toolWidth; i++) {
                this.drawRectangle(bitmap, [tl[0] + i, tl[1] + i], [br[0] - i, br[1] - i]);
            }
        };
        OutlineEdit.prototype.drawRectangle = function (bitmap, tl, br) {
            if (tl[0] > br[0] || tl[1] > br[1])
                return;
            for (var c = tl[0]; c <= br[0]; c++) {
                bitmap.set(c, tl[1], this.color);
                bitmap.set(c, br[1], this.color);
            }
            for (var r = tl[1]; r <= br[1]; r++) {
                bitmap.set(tl[0], r, this.color);
                bitmap.set(br[0], r, this.color);
            }
        };
        return OutlineEdit;
    }(SelectionEdit));
    pxtblockly.OutlineEdit = OutlineEdit;
    /**
     * Tool for drawing straight lines
     */
    var LineEdit = /** @class */ (function (_super) {
        __extends(LineEdit, _super);
        function LineEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        LineEdit.prototype.doEditCore = function (bitmap) {
            this.bresenham(this.startCol, this.startRow, this.endCol, this.endRow, bitmap);
        };
        LineEdit.prototype.drawCursor = function (col, row, draw) {
            this.drawCore(col, row, draw);
        };
        // https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
        LineEdit.prototype.bresenham = function (x0, y0, x1, y1, bitmap) {
            var _this = this;
            var dx = x1 - x0;
            var dy = y1 - y0;
            var draw = function (c, r) { return bitmap.set(c, r, _this.color); };
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
    pxtblockly.LineEdit = LineEdit;
    /**
     * Tool for circular outlines
     */
    var CircleEdit = /** @class */ (function (_super) {
        __extends(CircleEdit, _super);
        function CircleEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CircleEdit.prototype.doEditCore = function (bitmap) {
            var tl = this.topLeft();
            var br = this.bottomRight();
            var dx = br[0] - tl[0];
            var dy = br[1] - tl[1];
            var radius = Math.floor(Math.hypot(dx, dy));
            var cx = this.startCol;
            var cy = this.startRow;
            this.midpoint(cx, cy, radius, bitmap);
        };
        // https://en.wikipedia.org/wiki/Midpoint_circle_algorithm
        CircleEdit.prototype.midpoint = function (cx, cy, radius, bitmap) {
            var x = radius - 1;
            var y = 0;
            var dx = 1;
            var dy = 1;
            var err = dx - (radius * 2);
            while (x >= y) {
                bitmap.set(cx + x, cy + y, this.color);
                bitmap.set(cx + x, cy - y, this.color);
                bitmap.set(cx + y, cy + x, this.color);
                bitmap.set(cx + y, cy - x, this.color);
                bitmap.set(cx - y, cy + x, this.color);
                bitmap.set(cx - y, cy - x, this.color);
                bitmap.set(cx - x, cy + y, this.color);
                bitmap.set(cx - x, cy - y, this.color);
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
        return CircleEdit;
    }(SelectionEdit));
    pxtblockly.CircleEdit = CircleEdit;
    var FillEdit = /** @class */ (function (_super) {
        __extends(FillEdit, _super);
        function FillEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        FillEdit.prototype.start = function (col, row) {
            this.isStarted = true;
            this.col = col;
            this.row = row;
        };
        FillEdit.prototype.update = function (col, row) {
            this.col = col;
            this.row = row;
        };
        FillEdit.prototype.doEditCore = function (bitmap) {
            var replColor = bitmap.get(this.col, this.row);
            if (replColor === this.color) {
                return;
            }
            var mask = new pxtblockly.Bitmask(bitmap.width, bitmap.height);
            mask.set(this.col, this.row);
            var q = [[this.col, this.row]];
            while (q.length) {
                var _a = q.pop(), c = _a[0], r = _a[1];
                if (bitmap.get(c, r) === replColor) {
                    bitmap.set(c, r, this.color);
                    tryPush(c + 1, r);
                    tryPush(c - 1, r);
                    tryPush(c, r + 1);
                    tryPush(c, r - 1);
                }
            }
            function tryPush(x, y) {
                if (x >= 0 && x < mask.width && y >= 0 && y < mask.height && !mask.get(x, y)) {
                    mask.set(x, y);
                    q.push([x, y]);
                }
            }
        };
        return FillEdit;
    }(Edit));
    pxtblockly.FillEdit = FillEdit;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="./bitmap.ts" />
/// <reference path="./tools.ts" />
/// <reference path="./reporterBar.ts" />
/// <reference path="./sidebar.ts" />
/// <reference path="./gallery.ts" />
/// <reference path="./header.ts" />
var pxtblockly;
(function (pxtblockly) {
    var svg = pxt.svgUtil;
    var lf = pxt.Util.lf;
    var TOTAL_HEIGHT = 500;
    var PADDING = 10;
    var DROP_DOWN_PADDING = 4;
    // Height of toolbar (the buttons above the canvas)
    var HEADER_HEIGHT = 50;
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
    var CANVAS_HEIGHT = TOTAL_HEIGHT - HEADER_HEIGHT - HEADER_CANVAS_MARGIN
        - REPORTER_BAR_HEIGHT - REPORTER_BAR_CANVAS_MARGIN - PADDING + DROP_DOWN_PADDING * 2;
    var WIDTH = PADDING + SIDEBAR_WIDTH + SIDEBAR_CANVAS_MARGIN + CANVAS_HEIGHT + PADDING - DROP_DOWN_PADDING * 2;
    var SpriteEditor = /** @class */ (function () {
        function SpriteEditor(bitmap, blocksInfo, lightMode) {
            if (lightMode === void 0) { lightMode = false; }
            var _this = this;
            this.lightMode = lightMode;
            this.activeTool = pxtblockly.PaintTool.Normal;
            this.toolWidth = 1;
            this.color = 1;
            this.cursorCol = 0;
            this.cursorRow = 0;
            this.undoStack = [];
            this.redoStack = [];
            this.columns = 16;
            this.rows = 16;
            this.shiftDown = false;
            this.mouseDown = false;
            this.keyDown = function (event) {
                if (event.keyCode == 16) {
                    if (!_this.shiftDown) {
                        var btn = _this.sidebar.getButtonForTool(pxtblockly.PaintTool.Normal);
                        btn.setText("\uf07e");
                        btn.title(lf("Line"));
                        btn.onClick(function () { return _this.sidebar.setTool(pxtblockly.PaintTool.Line); });
                        if (_this.activeTool == pxtblockly.PaintTool.Normal) {
                            _this.setActiveTool(pxtblockly.PaintTool.Line);
                        }
                        btn = _this.sidebar.getButtonForTool(pxtblockly.PaintTool.Rectangle);
                        btn.setText("\uf10c");
                        btn.title(lf("Circle"));
                        btn.onClick(function () { return _this.sidebar.setTool(pxtblockly.PaintTool.Circle); });
                        if (_this.activeTool == pxtblockly.PaintTool.Rectangle) {
                            _this.setActiveTool(pxtblockly.PaintTool.Circle);
                        }
                    }
                    _this.shiftDown = true;
                }
            };
            this.keyUp = function (event) {
                // If not drawing a circle, switch back to Rectangle and Pencil
                if (event.keyCode == 16) {
                    _this.shiftDown = false;
                    if (_this.mouseDown) {
                        if (_this.activeTool != pxtblockly.PaintTool.Line) {
                            _this.switchIconBack(pxtblockly.PaintTool.Normal);
                        }
                        if (_this.activeTool != pxtblockly.PaintTool.Circle) {
                            _this.switchIconBack(pxtblockly.PaintTool.Rectangle);
                        }
                    }
                    else {
                        _this.switchIconBack(pxtblockly.PaintTool.Normal);
                        _this.switchIconBack(pxtblockly.PaintTool.Rectangle);
                    }
                }
            };
            this.colors = pxt.appTarget.runtime.palette.slice(1);
            this.columns = bitmap.width;
            this.rows = bitmap.height;
            this.state = bitmap.copy();
            this.root = new svg.SVG();
            this.group = this.root.group();
            this.createDefs();
            this.paintSurface = new pxtblockly.CanvasGrid(this.colors, this.state.copy(), this.lightMode);
            this.paintSurface.drag(function (col, row) {
                _this.debug("gesture (" + pxtblockly.PaintTool[_this.activeTool] + ")");
                _this.setCell(col, row, _this.color, false);
                _this.bottomBar.updateCursor(col, row);
            });
            this.paintSurface.up(function (col, row) {
                _this.debug("gesture end (" + pxtblockly.PaintTool[_this.activeTool] + ")");
                _this.commit();
                _this.mouseDown = false;
                if (_this.activeTool == pxtblockly.PaintTool.Circle && !_this.shiftDown) {
                    _this.switchIconBack(pxtblockly.PaintTool.Rectangle);
                }
                if (_this.activeTool == pxtblockly.PaintTool.Line && !_this.shiftDown) {
                    _this.switchIconBack(pxtblockly.PaintTool.Normal);
                }
            });
            this.paintSurface.down(function (col, row) {
                _this.setCell(col, row, _this.color, false);
                _this.mouseDown = true;
            });
            this.paintSurface.move(function (col, row) {
                _this.drawCursor(col, row);
                _this.bottomBar.updateCursor(col, row);
            });
            this.paintSurface.leave(function () {
                if (_this.edit) {
                    _this.paintSurface.repaint();
                }
                if (_this.edit.isStarted) {
                    _this.commit();
                }
                _this.bottomBar.hideCursor();
            });
            this.sidebar = new pxtblockly.SideBar(['url("#alpha-background")'].concat(this.colors), this, this.group);
            this.sidebar.setColor(1);
            this.header = new pxtblockly.SpriteHeader(this);
            this.gallery = new pxtblockly.Gallery(blocksInfo);
            this.bottomBar = new pxtblockly.ReporterBar(this.group, this, REPORTER_BAR_HEIGHT);
            this.updateUndoRedo();
            document.addEventListener("keydown", function (ev) {
                if (ev.key === "Undo" || (ev.ctrlKey && ev.key === "z")) {
                    _this.undo();
                }
                else if (ev.key === "Redo" || (ev.ctrlKey && ev.key === "y")) {
                    _this.redo();
                }
            });
        }
        SpriteEditor.prototype.setCell = function (col, row, color, commit) {
            if (commit) {
                this.state.set(col, row, color);
                this.paintCell(col, row, color);
            }
            else {
                if (!this.edit.isStarted) {
                    this.edit.start(col, row);
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
            var paintAreaTop = HEADER_HEIGHT + HEADER_CANVAS_MARGIN;
            var paintAreaLeft = PADDING + SIDEBAR_WIDTH + SIDEBAR_CANVAS_MARGIN;
            this.sidebar.translate(PADDING, paintAreaTop);
            this.paintSurface.updateBounds(paintAreaTop, paintAreaLeft, CANVAS_HEIGHT, CANVAS_HEIGHT);
            this.bottomBar.layout(paintAreaTop + CANVAS_HEIGHT + REPORTER_BAR_CANVAS_MARGIN, paintAreaLeft, CANVAS_HEIGHT);
            this.gallery.layout(0, HEADER_HEIGHT, TOTAL_HEIGHT - HEADER_HEIGHT);
            this.header.layout();
        };
        SpriteEditor.prototype.rePaint = function () {
            this.paintSurface.repaint();
        };
        SpriteEditor.prototype.setActiveColor = function (color, setPalette) {
            if (setPalette === void 0) { setPalette = false; }
            if (setPalette) {
            }
            else {
                this.color = color;
                // If the user is erasing, go back to pencil
                if (this.activeTool === pxtblockly.PaintTool.Erase) {
                    this.sidebar.setTool(pxtblockly.PaintTool.Normal);
                }
                else {
                    this.edit = this.newEdit(this.color);
                }
            }
        };
        SpriteEditor.prototype.setActiveTool = function (tool) {
            this.activeTool = tool;
            this.edit = this.newEdit(this.color);
        };
        SpriteEditor.prototype.setToolWidth = function (width) {
            this.toolWidth = width;
            this.edit = this.newEdit(this.color);
        };
        SpriteEditor.prototype.undo = function () {
            if (this.undoStack.length) {
                this.debug("undo");
                var todo = this.undoStack.pop();
                this.pushState(false);
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
            this.state = pxtblockly.resizeBitmap(this.cachedState, width, height);
            this.afterResize(true);
        };
        SpriteEditor.prototype.setSizePresets = function (presets) {
            this.bottomBar.setSizePresets(presets, this.columns, this.rows);
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
            return TOTAL_HEIGHT;
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
                    _this.restore(result);
                    _this.hideGallery();
                    _this.header.toggle.toggle(true);
                }
            });
        };
        SpriteEditor.prototype.hideGallery = function () {
            this.gallery.hide();
        };
        SpriteEditor.prototype.switchIconBack = function (tool) {
            var _this = this;
            var btn = this.sidebar.getButtonForTool(tool);
            if (tool == pxtblockly.PaintTool.Rectangle) {
                //Change icon back to square
                btn.setText("\uf096");
                btn.title(lf("Rectangle"));
            }
            else if (tool == pxtblockly.PaintTool.Normal) {
                //Change icon back to pencil
                btn.setText("\uf040");
                btn.title(lf("Pencil"));
            }
            btn.onClick(function () { return _this.sidebar.setTool(tool); });
            if ((this.activeTool == pxtblockly.PaintTool.Circle && tool == pxtblockly.PaintTool.Rectangle)
                || (this.activeTool == pxtblockly.PaintTool.Line && tool == pxtblockly.PaintTool.Normal)) {
                this.setActiveTool(tool);
            }
        };
        SpriteEditor.prototype.addKeyListeners = function () {
            document.addEventListener("keydown", this.keyDown);
            document.addEventListener("keyup", this.keyUp);
        };
        SpriteEditor.prototype.removeKeyListeners = function () {
            document.removeEventListener("keydown", this.keyDown);
            document.removeEventListener("keyup", this.keyUp);
        };
        SpriteEditor.prototype.afterResize = function (showOverlay) {
            this.columns = this.state.width;
            this.rows = this.state.height;
            this.paintSurface.restore(this.state, true);
            this.bottomBar.updateDimensions(this.columns, this.rows);
            this.layout();
            if (showOverlay)
                this.paintSurface.showOverlay();
            // Canvas size changed and some edits rely on that (like paint)
            this.edit = this.newEdit(this.color);
        };
        SpriteEditor.prototype.drawCursor = function (col, row) {
            if (this.edit) {
                this.paintSurface.drawCursor(this.edit, col, row);
            }
        };
        SpriteEditor.prototype.paintEdit = function (edit, col, row) {
            this.paintSurface.restore(this.state);
            this.paintSurface.applyEdit(edit, col, row);
        };
        SpriteEditor.prototype.commit = function () {
            if (this.edit) {
                if (this.cachedState) {
                    this.cachedState = undefined;
                }
                this.pushState(true);
                this.paintEdit(this.edit, this.cursorCol, this.cursorRow);
                this.state.apply(this.paintSurface.image);
                this.edit = this.newEdit(this.color);
                this.redoStack = [];
            }
        };
        SpriteEditor.prototype.pushState = function (undo) {
            var cp = this.state.copy();
            if (undo) {
                this.undoStack.push(cp);
            }
            else {
                this.redoStack.push(cp);
            }
            this.updateUndoRedo();
        };
        SpriteEditor.prototype.restore = function (bitmap) {
            if (bitmap.width !== this.state.width || bitmap.height !== this.state.height) {
                this.state = bitmap;
                this.afterResize(false);
            }
            else {
                this.state.apply(bitmap);
                this.paintSurface.restore(bitmap, true);
            }
        };
        SpriteEditor.prototype.updateUndoRedo = function () {
            this.bottomBar.updateUndoRedo(this.undoStack.length === 0, this.redoStack.length === 0);
        };
        SpriteEditor.prototype.paintCell = function (col, row, color) {
            this.paintSurface.writeColor(col, row, color);
        };
        SpriteEditor.prototype.newEdit = function (color) {
            switch (this.activeTool) {
                case pxtblockly.PaintTool.Normal: return new pxtblockly.PaintEdit(this.columns, this.rows, color, this.toolWidth);
                case pxtblockly.PaintTool.Rectangle: return new pxtblockly.OutlineEdit(this.columns, this.rows, color, this.toolWidth);
                case pxtblockly.PaintTool.Outline: return new pxtblockly.OutlineEdit(this.columns, this.rows, color, this.toolWidth);
                case pxtblockly.PaintTool.Line: return new pxtblockly.LineEdit(this.columns, this.rows, color, this.toolWidth);
                case pxtblockly.PaintTool.Circle: return new pxtblockly.CircleEdit(this.columns, this.rows, color, this.toolWidth);
                case pxtblockly.PaintTool.Erase: return new pxtblockly.PaintEdit(this.columns, this.rows, 0, this.toolWidth);
                case pxtblockly.PaintTool.Fill: return new pxtblockly.FillEdit(this.columns, this.rows, color, this.toolWidth);
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
    pxtblockly.SpriteEditor = SpriteEditor;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="./spriteEditor.ts" />
/// <reference path="../../../built/pxtlib.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var svg = pxt.svgUtil;
    // 32 is specifically chosen so that we can scale the images for the default
    // sprite sizes without getting browser anti-aliasing
    var PREVIEW_WIDTH = 32;
    var PADDING = 5;
    var BG_PADDING = 4;
    var BG_WIDTH = BG_PADDING * 2 + PREVIEW_WIDTH;
    var TOTAL_WIDTH = PADDING * 2 + BG_PADDING * 2 + PREVIEW_WIDTH;
    // These are the characters used to compile, for a list of every supported character see parseBitmap()
    var hexChars = [".", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    var FieldSpriteEditor = /** @class */ (function (_super) {
        __extends(FieldSpriteEditor, _super);
        function FieldSpriteEditor(text, params, validator) {
            var _this = _super.call(this, text, validator) || this;
            _this.isFieldCustom_ = true;
            _this.lightMode = params.lightMode;
            _this.params = parseFieldOptions(params);
            _this.blocksInfo = params.blocksInfo;
            if (!_this.state) {
                _this.state = new pxtblockly.Bitmap(_this.params.initWidth, _this.params.initHeight);
            }
            return _this;
        }
        FieldSpriteEditor.prototype.init = function () {
            if (this.fieldGroup_) {
                // Field has already been initialized once.
                return;
            }
            // Build the DOM.
            this.fieldGroup_ = Blockly.utils.createSvgElement('g', {}, null);
            if (!this.visible_) {
                this.fieldGroup_.style.display = 'none';
            }
            if (!this.state) {
                this.state = new pxtblockly.Bitmap(this.params.initWidth, this.params.initHeight);
            }
            this.redrawPreview();
            this.updateEditable();
            this.sourceBlock_.getSvgRoot().appendChild(this.fieldGroup_);
            // Force a render.
            this.render_();
            this.mouseDownWrapper_ = Blockly.bindEventWithChecks_(this.getClickTarget_(), "mousedown", this, this.onMouseDown_);
        };
        /**
         * Show the inline free-text editor on top of the text.
         * @private
         */
        FieldSpriteEditor.prototype.showEditor_ = function () {
            var _this = this;
            var windowSize = goog.dom.getViewportSize();
            var scrollOffset = goog.style.getViewportPageOffset(document);
            // If there is an existing drop-down someone else owns, hide it immediately and clear it.
            Blockly.DropDownDiv.hideWithoutAnimation();
            Blockly.DropDownDiv.clearContent();
            var contentDiv = Blockly.DropDownDiv.getContentDiv();
            this.editor = new pxtblockly.SpriteEditor(this.state, this.blocksInfo, this.lightMode);
            this.editor.render(contentDiv);
            this.editor.rePaint();
            this.editor.setActiveColor(this.params.initColor, true);
            this.editor.setSizePresets(this.params.sizes);
            goog.style.setHeight(contentDiv, this.editor.outerHeight() + 1);
            goog.style.setWidth(contentDiv, this.editor.outerWidth() + 1);
            goog.style.setStyle(contentDiv, "overflow", "hidden");
            goog.style.setStyle(contentDiv, "max-height", "500px");
            goog.dom.classlist.add(contentDiv.parentElement, "sprite-editor-dropdown");
            Blockly.DropDownDiv.setColour("#2c3e50", "#2c3e50");
            Blockly.DropDownDiv.showPositionedByBlock(this, this.sourceBlock_, function () {
                _this.state = _this.editor.bitmap();
                _this.redrawPreview();
                if (_this.sourceBlock_ && Blockly.Events.isEnabled()) {
                    Blockly.Events.fire(new Blockly.Events.BlockChange(_this.sourceBlock_, 'field', _this.name, _this.text_, _this.getText()));
                }
                goog.style.setHeight(contentDiv, null);
                goog.style.setWidth(contentDiv, null);
                goog.style.setStyle(contentDiv, "overflow", null);
                goog.style.setStyle(contentDiv, "max-height", null);
                goog.dom.classlist.remove(contentDiv.parentElement, "sprite-editor-dropdown");
                _this.editor.removeKeyListeners();
            });
            this.editor.addKeyListeners();
            this.editor.layout();
        };
        FieldSpriteEditor.prototype.isInFlyout = function () {
            return this.sourceBlock_.workspace.getParentSvg().className.baseVal == "blocklyFlyout";
        };
        FieldSpriteEditor.prototype.render_ = function () {
            _super.prototype.render_.call(this);
            this.size_.height = TOTAL_WIDTH;
            this.size_.width = TOTAL_WIDTH;
        };
        FieldSpriteEditor.prototype.getText = function () {
            if (!this.state) {
                return "img``";
            }
            var res = "img`";
            for (var r = 0; r < this.state.height; r++) {
                res += "\n";
                for (var c = 0; c < this.state.width; c++) {
                    res += hexChars[this.state.get(c, r)] + " ";
                }
            }
            res += "\n`";
            return res;
        };
        FieldSpriteEditor.prototype.setText = function (newText) {
            if (newText == null) {
                return;
            }
            this.parseBitmap(newText);
            this.redrawPreview();
            _super.prototype.setText.call(this, newText);
        };
        FieldSpriteEditor.prototype.redrawPreview = function () {
            if (!this.fieldGroup_)
                return;
            pxsim.U.clear(this.fieldGroup_);
            var bg = new svg.Rect()
                .at(PADDING, PADDING)
                .size(BG_WIDTH, BG_WIDTH)
                .fill("#dedede")
                .stroke("#898989", 1)
                .corner(4);
            this.fieldGroup_.appendChild(bg.el);
            if (this.state) {
                var data = this.renderPreview();
                var img = new svg.Image()
                    .src(data)
                    .at(PADDING + BG_PADDING, PADDING + BG_PADDING)
                    .size(PREVIEW_WIDTH, PREVIEW_WIDTH);
                this.fieldGroup_.appendChild(img.el);
            }
        };
        FieldSpriteEditor.prototype.parseBitmap = function (newText) {
            // Strip the tagged template string business and the whitespace. We don't have to exhaustively
            // replace encoded characters because the compiler will catch any disallowed characters and throw
            // an error before the decompilation happens. 96 is backtick and 9 is tab
            newText = newText.replace(/[ `]|(?:&#96;)|(?:&#9;)|(?:img)/g, "").trim();
            newText = newText.replace(/&#10;/g, "\n");
            var rows = newText.split("\n");
            // We support "ragged" sprites so not all rows will be the same length
            var sprite = [];
            var spriteWidth = 0;
            for (var r = 0; r < rows.length; r++) {
                var row = rows[r];
                var rowValues = [];
                for (var c = 0; c < row.length; c++) {
                    // This list comes from libs/screen/targetOverrides.ts
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
            if (spriteHeight === 0 || spriteWidth === 0) {
                // This isn't great because it changes the underlying code; the user entered
                // an empty/invalid sprite and we are converting it to an empty 16x16 sprite
                // next time the project saves. The best behavior would be to flag this in
                // the decompiler and return a grey block but that's not supported.
                return;
            }
            this.state = new pxtblockly.Bitmap(spriteWidth, spriteHeight);
            for (var r = 0; r < spriteHeight; r++) {
                var row = sprite[r];
                for (var c = 0; c < spriteWidth; c++) {
                    if (c < row.length) {
                        this.state.set(c, r, row[c]);
                    }
                    else {
                        this.state.set(c, r, 0);
                    }
                }
            }
        };
        /**
         * Scales the image to 32x32 and returns a data uri. In light mode the preview
         * is drawn with no transparency (alpha is filled with background color)
         */
        FieldSpriteEditor.prototype.renderPreview = function () {
            var colors = pxt.appTarget.runtime.palette.slice(1);
            var canvas = document.createElement("canvas");
            canvas.width = PREVIEW_WIDTH;
            canvas.height = PREVIEW_WIDTH;
            // Works well for all of our default sizes, does not work well if the size is not
            // a multiple of 2 or is greater than 32 (i.e. from the decompiler)
            var cellSize = Math.min(PREVIEW_WIDTH / this.state.width, PREVIEW_WIDTH / this.state.height);
            // Center the image if it isn't square
            var xOffset = Math.max(Math.floor((PREVIEW_WIDTH * (1 - (this.state.width / this.state.height))) / 2), 0);
            var yOffset = Math.max(Math.floor((PREVIEW_WIDTH * (1 - (this.state.height / this.state.width))) / 2), 0);
            var context;
            if (this.lightMode) {
                context = canvas.getContext("2d", { alpha: false });
                context.fillStyle = "#dedede";
                context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_WIDTH);
            }
            else {
                context = canvas.getContext("2d");
            }
            for (var c = 0; c < this.state.width; c++) {
                for (var r = 0; r < this.state.height; r++) {
                    var color = this.state.get(c, r);
                    if (color) {
                        context.fillStyle = colors[color - 1];
                        context.fillRect(xOffset + c * cellSize, yOffset + r * cellSize, cellSize, cellSize);
                    }
                    else if (this.lightMode) {
                        context.fillStyle = "#dedede";
                        context.fillRect(xOffset + c * cellSize, yOffset + r * cellSize, cellSize, cellSize);
                    }
                }
            }
            return canvas.toDataURL();
        };
        return FieldSpriteEditor;
    }(Blockly.Field));
    pxtblockly.FieldSpriteEditor = FieldSpriteEditor;
    function parseFieldOptions(opts) {
        var parsed = {
            sizes: [
                [8, 8],
                [8, 16],
                [16, 16],
                [16, 32],
                [32, 32],
            ],
            initColor: 1,
            initWidth: 16,
            initHeight: 16,
        };
        if (!opts) {
            return parsed;
        }
        if (opts.sizes != null) {
            var pairs = opts.sizes.split(";");
            var sizes = [];
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i].split(",");
                if (pair.length !== 2) {
                    continue;
                }
                var width = parseInt(pair[0]);
                var height = parseInt(pair[1]);
                if (isNaN(width) || isNaN(height)) {
                    continue;
                }
                var screenSize = pxt.appTarget.runtime && pxt.appTarget.runtime.screenSize;
                if (width < 0 && screenSize)
                    width = screenSize.width;
                if (height < 0 && screenSize)
                    height = screenSize.height;
                sizes.push([width, height]);
            }
            if (sizes.length > 0) {
                parsed.sizes = sizes;
                parsed.initWidth = sizes[0][0];
                parsed.initHeight = sizes[0][1];
            }
        }
        parsed.initColor = withDefault(opts.initColor, parsed.initColor);
        parsed.initWidth = withDefault(opts.initWidth, parsed.initWidth);
        parsed.initHeight = withDefault(opts.initHeight, parsed.initHeight);
        return parsed;
        function withDefault(raw, def) {
            var res = parseInt(raw);
            if (isNaN(res)) {
                return def;
            }
            return res;
        }
    }
})(pxtblockly || (pxtblockly = {}));
