#!/usr/bin/env node
// lean-ts lint: refuses any function outside the TypeScript subset (see langs/ts/subset.md).
// Usage: node lint.mjs <file.ts> [--changed <ranges.json>] [--json]
// Exit 0: every checked function is inside the subset. Exit 1: violations printed. Exit 2: usage error.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, lineOf, colOf, overlaps, readRanges, hintsOf, topLevelFunctions, isArrayLike } from '../common.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

export function lintFile(file, ranges = null) {
  const { sf, checker, diagnostics } = loadProgram(file);
  const out = [];
  const fns = topLevelFunctions(sf);
  let current = null; // current top-level function node, for locality tests

  const v = (node, rule, msg) => {
    const pos = node.getStart(sf);
    out.push({ file, line: lineOf(sf, pos), col: colOf(sf, pos), rule, msg });
  };

  // ---------- types ----------
  function checkTypeNode(n) {
    switch (n.kind) {
      case K.NumberKeyword: case K.BigIntKeyword: case K.BooleanKeyword: case K.StringKeyword: case K.UndefinedKeyword:
        return;
      case K.AnyKeyword: return v(n, 'any', '`any` is outside the subset');
      case K.UnknownKeyword: return v(n, 'unknown', '`unknown` is outside the subset');
      case K.NullKeyword: return v(n, 'null', '`null` is outside the subset; use `T | undefined`');
      case K.LiteralType:
        if (n.literal.kind === K.NullKeyword) return v(n, 'null', '`null` is outside the subset; use `T | undefined`');
        return v(n, 'literal-type', 'literal types are outside the subset');
      case K.ParenthesizedType: return checkTypeNode(n.type);
      case K.ArrayType: return checkTypeNode(n.elementType);
      case K.TypeOperator:
        if (n.operator === K.ReadonlyKeyword && (ts.isArrayTypeNode(n.type) || ts.isTupleTypeNode(n.type))) return checkTypeNode(n.type);
        return v(n, 'unsupported-type', 'only `readonly` on array and tuple types is allowed');
      case K.TupleType:
        for (const e of n.elements) {
          if (ts.isOptionalTypeNode(e) || ts.isRestTypeNode(e)) v(e, 'unsupported-type', 'optional and rest tuple elements are outside the subset');
          else checkTypeNode(ts.isNamedTupleMember(e) ? e.type : e);
        }
        return;
      case K.UnionType: {
        const rest = n.types.filter((t) => t.kind !== K.UndefinedKeyword);
        if (n.types.length === 2 && rest.length === 1) return checkTypeNode(rest[0]);
        return v(n, 'union-type', 'only `T | undefined` is allowed as a union');
      }
      case K.TypeLiteral: return checkMembers(n, n.members);
      case K.TypeReference: {
        const name = n.typeName.getText(sf);
        if (name === 'Promise') return v(n, 'promise', '`Promise` is outside the subset');
        if (name === 'Array' || name === 'ReadonlyArray') {
          if (n.typeArguments?.length === 1) return checkTypeNode(n.typeArguments[0]);
          return v(n, 'unsupported-type', `${name} needs one type argument`);
        }
        if (n.typeArguments?.length) return v(n, 'generic', `generic type ${name} is outside the subset`);
        const sym = checker.getSymbolAtLocation(n.typeName);
        const decl = sym?.declarations?.[0];
        if (decl && (ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl)) && decl.getSourceFile() === sf) return;
        return v(n, 'unsupported-type', `type ${name} is not declared in this file`);
      }
      case K.FunctionType: case K.ConstructorType:
        return v(n, 'function-type', 'function types are outside the subset');
      default:
        return v(n, 'unsupported-type', `type syntax ${ts.SyntaxKind[n.kind]} is outside the subset`);
    }
  }
  function checkMembers(owner, members) {
    for (const m of members) {
      if (!ts.isPropertySignature(m) || !m.type || !ts.isIdentifier(m.name)) { v(m, 'unsupported-type', 'records hold plain `name: Type` fields only'); continue; }
      if (m.questionToken) v(m, 'optional-field', 'write `name: T | undefined`, not `name?: T`');
      checkTypeNode(m.type);
    }
  }
  function checkTypeDecl(d) {
    if (d.typeParameters?.length) return v(d, 'generic', 'generic types are outside the subset');
    if (ts.isInterfaceDeclaration(d)) {
      if (d.heritageClauses?.length) v(d, 'unsupported-type', 'interface inheritance is outside the subset');
      return checkMembers(d, d.members);
    }
    checkTypeNode(d.type);
  }

  // ---------- identifier resolution ----------
  const GLOBAL_RULES = {
    eval: 'dynamic-eval', Function: 'dynamic-eval', Promise: 'promise', Date: 'nondeterminism',
    Object: 'prototype', Reflect: 'prototype', Proxy: 'prototype', Symbol: 'prototype', globalThis: 'global-read',
  };
  const inFunction = (decl) => { for (let p = decl; p; p = p.parent) if (p === current) return true; return false; };
  function symInfo(id) {
    const sym = checker.getSymbolAtLocation(id);
    const decl = sym?.declarations?.[0];
    return { sym, decl, local: !!decl && inFunction(decl) };
  }
  function checkIdent(id, asCallee = false) {
    const name = id.text;
    if (name === 'undefined') return;
    const { decl, local } = symInfo(id);
    if (local) return;
    if (decl && ts.isFunctionDeclaration(decl) && decl.getSourceFile() === sf) {
      if (!asCallee) v(id, 'function-value', `function ${name} used as a value`);
      return;
    }
    v(id, GLOBAL_RULES[name] ?? 'global-read', `\`${name}\` is not a parameter, a local or a function of this file`);
  }

  // ---------- statements ----------
  const isArrayExpr = (e) => isArrayLike(checker, checker.getTypeAtLocation(e));
  const isParam = (decl) => !!decl && ts.isParameter(decl);

  function stmts(list) { for (const s of list) stmt(s); }
  function stmt(s) {
    switch (s.kind) {
      case K.Block: return stmts(s.statements);
      case K.EmptyStatement: return;
      case K.VariableStatement: {
        const list = s.declarationList;
        if (!(list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))) v(s, 'var', '`var` is outside the subset; use let or const');
        if (list.declarations.length !== 1) v(s, 'multi-decl', 'one declaration per statement');
        for (const d of list.declarations) varDecl(d);
        return;
      }
      case K.ExpressionStatement: return exprStmt(s.expression);
      case K.IfStatement:
        expr(s.expression); stmt(s.thenStatement); if (s.elseStatement) stmt(s.elseStatement); return;
      case K.ReturnStatement:
        if (!s.expression) return v(s, 'bare-return', 'return needs a value');
        return expr(s.expression);
      case K.ForOfStatement: {
        if (s.awaitModifier) v(s, 'async', '`for await` is outside the subset');
        const init = s.initializer;
        if (!ts.isVariableDeclarationList(init) || init.declarations.length !== 1 || !ts.isIdentifier(init.declarations[0].name)) v(s, 'destructuring', 'for-of binds one plain name');
        if (!isArrayExpr(s.expression)) v(s.expression, 'for-of-non-array', 'for-of runs over arrays only');
        expr(s.expression); return stmt(s.statement);
      }
      case K.ForStatement: return forStmt(s);
      case K.WhileStatement: {
        const h = hintsOf(sf, s);
        if (!h.decreases) v(s, 'unbounded-loop', 'a while loop needs a bound: put `// @decreases <expr>` before it');
        expr(s.expression); return stmt(s.statement);
      }
      case K.DoStatement: return v(s, 'do-while', 'do-while is outside the subset');
      case K.ForInStatement: return v(s, 'for-in', 'for-in reads dynamic property names');
      case K.BreakStatement: case K.ContinueStatement: return v(s, 'break-continue', 'break and continue are outside the subset');
      case K.ThrowStatement: return v(s, 'throw', 'throw is outside the subset');
      case K.TryStatement: return v(s, 'try-catch', 'try/catch is outside the subset');
      case K.SwitchStatement: return v(s, 'switch', 'switch is outside the subset; use if/else');
      case K.LabeledStatement: return v(s, 'label', 'labels are outside the subset');
      case K.FunctionDeclaration: return v(s, 'nested-function', 'nested functions are outside the subset');
      case K.ClassDeclaration: return v(s, 'class', 'classes are outside the subset');
      default: return v(s, 'unsupported-syntax', `statement ${ts.SyntaxKind[s.kind]} is outside the subset`);
    }
  }
  function varDecl(d) {
    if (!ts.isIdentifier(d.name)) return v(d, 'destructuring', 'destructuring is outside the subset');
    if (!d.initializer) return v(d, 'uninitialised', 'a variable needs an initial value');
    if (d.type) checkTypeNode(d.type);
    const t = checker.getTypeAtLocation(d.name);
    if (t.flags & TF.Any) v(d, 'any', 'variable has type any');
    if (t.flags & TF.Unknown) v(d, 'unknown', 'variable has type unknown');
    expr(d.initializer);
  }
  function exprStmt(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken || op === K.PlusEqualsToken || op === K.MinusEqualsToken || op === K.AsteriskEqualsToken) {
        const l = e.left;
        if (ts.isIdentifier(l)) {
          const { decl, local } = symInfo(l);
          if (!local) v(l, 'global-mutation', `assignment to \`${l.text}\`, which this function does not own`);
          else if (isParam(decl)) v(l, 'param-assign', `parameter \`${l.text}\` is assigned; copy it to a local first`);
        } else if (ts.isPropertyAccessExpression(l)) v(l, 'property-assign', 'records are immutable; build a new one with a spread');
        else if (ts.isElementAccessExpression(l)) v(l, 'index-assign', 'arrays change by push on a local only');
        else v(l, 'unsupported-syntax', 'assignment target');
        return expr(e.right);
      }
      if (op === K.SlashEqualsToken || op === K.PercentEqualsToken) return v(e, 'division', 'division is outside the subset');
      if (op >= K.FirstAssignment && op <= K.LastAssignment) return v(e, 'unsupported-operator', 'assignment operator is outside the subset');
    }
    if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken)) {
      if (!ts.isIdentifier(e.operand)) return v(e, 'unsupported-syntax', 'increment of a non-name');
      const { decl, local } = symInfo(e.operand);
      if (!local) v(e, 'global-mutation', `update of \`${e.operand.text}\`, which this function does not own`);
      else if (isParam(decl)) v(e, 'param-assign', 'parameter is assigned; copy it to a local first');
      return;
    }
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'push') {
      const r = e.expression.expression;
      if (!ts.isIdentifier(r)) return v(e, 'param-mutation', 'push works on a local array name only');
      const { decl, local } = symInfo(r);
      if (!local || isParam(decl)) v(e, 'param-mutation', `push on \`${r.text}\`, which is not a local array`);
      else if (!isArrayExpr(r)) v(e, 'unsupported-call', 'push on a non-array');
      else if (checker.getTypeAtLocation(r).symbol?.name === 'ReadonlyArray') v(e, 'param-mutation', 'push on a readonly array');
      if (e.arguments.length !== 1 || ts.isSpreadElement(e.arguments[0])) v(e, 'unsupported-call', 'push takes exactly one value');
      return e.arguments.forEach(expr);
    }
    return v(e, 'unsupported-syntax', 'only assignments, ++/--, and push may stand as statements');
  }
  function forStmt(s) {
    const i = s.initializer, c = s.condition, u = s.incrementor;
    let name = null;
    if (i && ts.isVariableDeclarationList(i) && (i.flags & ts.NodeFlags.Let) && i.declarations.length === 1 && ts.isIdentifier(i.declarations[0].name) && i.declarations[0].initializer) {
      name = i.declarations[0].name.text; expr(i.declarations[0].initializer);
    } else v(s, 'loop-form', 'for needs `let i = <expr>; i < <expr>; i++`');
    if (c && ts.isBinaryExpression(c) && ts.isIdentifier(c.left) && c.left.text === name && (c.operatorToken.kind === K.LessThanToken || c.operatorToken.kind === K.LessThanEqualsToken)) expr(c.right);
    else v(s, 'loop-form', 'for needs the condition `i < <expr>` or `i <= <expr>`');
    const okInc = u && ((ts.isPostfixUnaryExpression(u) || ts.isPrefixUnaryExpression(u)) && u.operator === K.PlusPlusToken && ts.isIdentifier(u.operand) && u.operand.text === name
      || ts.isBinaryExpression(u) && u.operatorToken.kind === K.PlusEqualsToken && ts.isIdentifier(u.left) && u.left.text === name && ts.isNumericLiteral(u.right) && u.right.text === '1');
    if (!okInc) v(s, 'loop-form', 'for needs the step `i++` or `i += 1`');
    // the loop variable must not be assigned in the body
    const scan = (n) => {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(n.left) && n.left.text === name) v(n, 'loop-var-assign', 'the loop variable is assigned in the body');
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) && ts.isIdentifier(n.operand) && n.operand.text === name) v(n, 'loop-var-assign', 'the loop variable is assigned in the body');
      ts.forEachChild(n, scan);
    };
    scan(s.statement);
    stmt(s.statement);
  }

  // ---------- expressions ----------
  const ARITH = new Set([K.PlusToken, K.MinusToken, K.AsteriskToken]);
  const CMP = new Set([K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken]);
  const EQ = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken]);
  const LOGIC = new Set([K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken]);
  const isPrim = (t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike | TF.StringLike | TF.BooleanLike | TF.Undefined));

  function expr(e) {
    switch (e.kind) {
      case K.Identifier: return checkIdent(e);
      case K.NumericLiteral: case K.BigIntLiteral: case K.StringLiteral: case K.TrueKeyword: case K.FalseKeyword: return;
      case K.NoSubstitutionTemplateLiteral: case K.TemplateExpression: case K.TaggedTemplateExpression:
        return v(e, 'template', 'template literals are outside the subset; join strings with +');
      case K.NullKeyword: return v(e, 'null', '`null` is outside the subset; use undefined');
      case K.RegularExpressionLiteral: return v(e, 'regex', 'regular expressions are outside the subset');
      case K.ParenthesizedExpression: return expr(e.expression);
      case K.AsExpression: case K.TypeAssertionExpression: case K.SatisfiesExpression:
        return v(e, 'cast', 'type assertions (`as`, `<T>x`, `satisfies`) are outside the subset');
      case K.NonNullExpression: return v(e, 'non-null', 'the non-null assertion `!` is outside the subset');
      case K.PrefixUnaryExpression:
        if (e.operator === K.ExclamationToken || e.operator === K.MinusToken) return expr(e.operand);
        if (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken) return v(e, 'update-expression', '++/-- is a statement only');
        if (e.operator === K.TildeToken) return v(e, 'bitwise', 'bitwise operators are outside the subset');
        return v(e, 'unary-coercion', 'unary + coerces; it is outside the subset');
      case K.PostfixUnaryExpression: return v(e, 'update-expression', '++/-- is a statement only');
      case K.TypeOfExpression: return v(e, 'typeof', '`typeof` is outside the subset');
      case K.DeleteExpression: return v(e, 'delete', '`delete` is outside the subset');
      case K.VoidExpression: return v(e, 'void', '`void` is outside the subset');
      case K.AwaitExpression: return v(e, 'async', '`await` is outside the subset');
      case K.YieldExpression: return v(e, 'generator', 'generators are outside the subset');
      case K.ThisKeyword: return v(e, 'this', '`this` is outside the subset');
      case K.SuperKeyword: return v(e, 'class', '`super` is outside the subset');
      case K.ClassExpression: return v(e, 'class', 'classes are outside the subset');
      case K.FunctionExpression: case K.ArrowFunction: return v(e, 'function-value', 'function values are allowed only as the callback of map, filter or reduce');
      case K.NewExpression: {
        const n = e.expression.getText(sf);
        return v(e, n === 'Function' ? 'dynamic-eval' : 'new', `\`new ${n}\` is outside the subset`);
      }
      case K.ConditionalExpression: expr(e.condition); expr(e.whenTrue); return expr(e.whenFalse);
      case K.BinaryExpression: return binary(e);
      case K.CallExpression: return call(e);
      case K.PropertyAccessExpression: return propAccess(e);
      case K.ElementAccessExpression: return elemAccess(e);
      case K.ArrayLiteralExpression:
        for (const el of e.elements) {
          if (ts.isSpreadElement(el)) { if (!isArrayExpr(el.expression)) v(el, 'spread', 'spread works on arrays only'); expr(el.expression); }
          else if (ts.isOmittedExpression(el)) v(el, 'unsupported-syntax', 'array holes are outside the subset');
          else expr(el);
        }
        return;
      case K.ObjectLiteralExpression:
        e.properties.forEach((p, idx) => {
          if (ts.isSpreadAssignment(p)) { if (idx !== 0) v(p, 'spread', 'a record spread must come first'); return expr(p.expression); }
          if (ts.isShorthandPropertyAssignment(p)) return checkIdent(p.name);
          if (ts.isPropertyAssignment(p)) {
            if (ts.isComputedPropertyName(p.name)) v(p, 'dynamic-key', 'computed property names are outside the subset');
            return expr(p.initializer);
          }
          return v(p, 'unsupported-syntax', 'methods and accessors are outside the subset');
        });
        return;
      case K.SpreadElement: return v(e, 'spread', 'spread is allowed in array and record literals only');
      case K.CommaListExpression: return v(e, 'comma', 'the comma operator is outside the subset');
      default: return v(e, 'unsupported-syntax', `expression ${ts.SyntaxKind[e.kind]} is outside the subset`);
    }
  }

  function binary(e) {
    const op = e.operatorToken.kind;
    if (op === K.EqualsToken || (op >= K.FirstAssignment && op <= K.LastAssignment)) return v(e, 'assignment-expression', 'assignment is a statement only');
    if (op === K.SlashToken || op === K.PercentToken) return v(e, 'division', '`/` and `%` are outside the subset: JavaScript division is not integer division');
    if (op === K.AsteriskAsteriskToken) return v(e, 'unsupported-operator', '`**` is outside the subset');
    if (op === K.EqualsEqualsToken || op === K.ExclamationEqualsToken) return v(e, 'loose-equality', 'use === and !==');
    if (op === K.InKeyword || op === K.InstanceOfKeyword) return v(e, 'in-instanceof', '`in` and `instanceof` read the prototype chain');
    if (op === K.CommaToken) return v(e, 'comma', 'the comma operator is outside the subset');
    if (!(ARITH.has(op) || CMP.has(op) || EQ.has(op) || LOGIC.has(op))) return v(e, 'bitwise', 'bitwise and shift operators are outside the subset');
    expr(e.left); expr(e.right);
    const lt = checker.getTypeAtLocation(e.left), rt = checker.getTypeAtLocation(e.right);
    if (op === K.PlusToken) {
      const ok = (lt.flags & TF.NumberLike && rt.flags & TF.NumberLike) || (lt.flags & TF.BigIntLike && rt.flags & TF.BigIntLike) || (lt.flags & TF.StringLike && rt.flags & TF.StringLike);
      if (!ok) v(e, 'mixed-types', '+ adds two numbers, two bigints, or joins two strings');
    }
    if (CMP.has(op) && (lt.flags & TF.StringLike || rt.flags & TF.StringLike)) v(e, 'string-order', 'string ordering is outside the subset');
    if (EQ.has(op) && !(isPrim(lt) || (lt.flags & TF.Union && lt.types.every(isPrim))) ) v(e, 'reference-equality', '=== on arrays and records compares references; compare fields');
  }

  function call(e) {
    const f = e.expression;
    if (ts.isIdentifier(f)) {
      checkIdent(f, true);
      const { decl } = symInfo(f);
      if (decl && ts.isFunctionDeclaration(decl) && decl.getSourceFile() === sf) {
        if (decl.parameters.length !== e.arguments.length) v(e, 'unsupported-call', `${f.text} takes ${decl.parameters.length} arguments`);
        e.arguments.forEach((a) => { if (ts.isSpreadElement(a)) v(a, 'spread', 'spread arguments are outside the subset'); else expr(a); });
        return;
      }
      return e.arguments.forEach((a) => ts.isArrowFunction(a) || expr(a));
    }
    if (ts.isPropertyAccessExpression(f)) {
      if (f.questionDotToken || e.questionDotToken) return v(e, 'optional-chain', 'optional chaining is outside the subset');
      const recv = f.expression, name = f.name.text;
      if (ts.isIdentifier(recv) && recv.text === 'Math') {
        const arity = { min: 2, max: 2, floor: 1 }[name];
        if (arity === undefined) return v(e, name === 'random' ? 'nondeterminism' : 'unsupported-call', `Math.${name} is outside the subset (allowed: min, max, floor)`);
        if (e.arguments.length !== arity) v(e, 'unsupported-call', `Math.${name} takes ${arity} arguments`);
        return e.arguments.forEach(expr);
      }
      if ((name === 'map' || name === 'filter' || name === 'reduce') && isArrayExpr(recv)) {
        expr(recv);
        const need = name === 'reduce' ? 2 : 1;
        if (e.arguments.length !== need) return v(e, 'unsupported-call', name === 'reduce' ? 'reduce needs a callback and an initial value' : `${name} takes one callback`);
        callback(e.arguments[0], name === 'reduce' ? 2 : 1);
        if (name === 'reduce') expr(e.arguments[1]);
        return;
      }
      if (ts.isIdentifier(recv)) { const { local } = symInfo(recv); if (!local) checkIdent(recv); }
      else expr(recv);
      return v(e, name === 'push' ? 'param-mutation' : 'unsupported-call', `method .${name}() is outside the subset (allowed: map, filter, reduce; push as a statement on a local)`);
    }
    return v(e, 'unsupported-call', 'calls through computed callees are outside the subset');
  }
  function callback(a, arity) {
    if (!ts.isArrowFunction(a)) return v(a, 'callback-form', 'the callback must be an arrow function');
    if (a.modifiers?.some((m) => m.kind === K.AsyncKeyword)) v(a, 'async', 'async callbacks are outside the subset');
    if (a.parameters.length !== arity || a.parameters.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken)) v(a, 'callback-form', `the callback takes exactly ${arity} plain parameter(s)`);
    if (a.parameters.some((p) => p.type)) a.parameters.forEach((p) => p.type && checkTypeNode(p.type));
    if (ts.isBlock(a.body)) return v(a, 'callback-form', 'the callback body is one expression');
    expr(a.body);
  }
  function propAccess(e) {
    if (e.questionDotToken) return v(e, 'optional-chain', 'optional chaining is outside the subset');
    const name = e.name.text;
    if (name === 'prototype' || name === '__proto__' || name === 'constructor') return v(e, 'prototype', `\`.${name}\` reaches the prototype chain`);
    const rt = checker.getTypeAtLocation(e.expression);
    expr(e.expression);
    if (name === 'length' && (isArrayLike(checker, rt) || rt.flags & TF.StringLike)) return;
    if (rt.flags & TF.Object && !isArrayLike(checker, rt) && rt.getProperty(name)) {
      const d = rt.getProperty(name).declarations?.[0];
      if (d && ts.isPropertySignature(d) && d.getSourceFile() === sf) return;
    }
    v(e, 'unsupported-member', `property .${name} is outside the subset`);
  }
  function elemAccess(e) {
    if (e.questionDotToken) return v(e, 'optional-chain', 'optional chaining is outside the subset');
    expr(e.expression); expr(e.argumentExpression);
    const rt = checker.getTypeAtLocation(e.expression), at = checker.getTypeAtLocation(e.argumentExpression);
    if (rt.flags & TF.StringLike) return v(e, 'string-index', 'indexing a string is outside the subset');
    if (!isArrayLike(checker, rt) || !(at.flags & TF.NumberLike)) return v(e, 'dynamic-key', 'only arrays indexed by a number are allowed; other keys are dynamic');
  }

  // ---------- top level ----------
  const checkedDiagSpans = [];
  for (const st of sf.statements) {
    const inScope = overlaps(sf, st, ranges);
    if (ts.isImportDeclaration(st)) {
      if (inScope && !st.importClause?.isTypeOnly) v(st, 'import', 'imports are outside the subset (only `import type`)');
      continue;
    }
    if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) { if (inScope) { checkTypeDecl(st); checkedDiagSpans.push(st); } continue; }
    if (ts.isFunctionDeclaration(st)) {
      if (!inScope) continue;
      checkedDiagSpans.push(st);
      current = st;
      if (!st.name) v(st, 'unsupported-syntax', 'anonymous function');
      if (st.modifiers?.some((m) => m.kind === K.AsyncKeyword)) v(st, 'async', '`async` is outside the subset');
      if (st.asteriskToken) v(st, 'generator', 'generators are outside the subset');
      if (st.typeParameters?.length) v(st, 'generic', 'generic functions are outside the subset');
      if (!st.body) v(st, 'unsupported-syntax', 'function without a body');
      if (!st.type) v(st, 'missing-return-type', 'declare the return type');
      else checkTypeNode(st.type);
      for (const p of st.parameters) {
        if (!ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken) v(p, 'param-form', 'parameters are plain `name: Type`');
        if (!p.type) v(p, 'missing-param-type', 'declare the parameter type'); else checkTypeNode(p.type);
      }
      if (st.body) stmts(st.body.statements);
      current = null;
      continue;
    }
    if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) continue;
    if (!inScope) continue;
    checkedDiagSpans.push(st);
    if (ts.isClassDeclaration(st)) v(st, 'class', 'classes are outside the subset');
    else if (ts.isEnumDeclaration(st)) v(st, 'enum', 'enums are outside the subset');
    else if (ts.isVariableStatement(st)) v(st, 'toplevel-state', 'module-level variables are outside the subset');
    else v(st, 'toplevel-effect', 'code at module level runs on import; it is outside the subset');
  }
  // compiler diagnostics (strict mode) that fall inside a checked region
  for (const d of diagnostics) {
    if (d.file !== sf || d.start === undefined) continue;
    const hit = !ranges || checkedDiagSpans.some((n) => d.start >= n.getStart(sf) && d.start <= n.getEnd());
    if (!hit) continue;
    out.push({ file, line: lineOf(sf, d.start), col: colOf(sf, d.start), rule: 'ts-strict', msg: `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}` });
  }
  out.sort((a, b) => a.line - b.line || a.col - b.col);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` || path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--changed');
  if (!file) { console.error('usage: lint.mjs <file.ts> [--changed <ranges.json>] [--json]'); process.exit(2); }
  const ci = args.indexOf('--changed');
  let ranges = null;
  if (ci >= 0) {
    if (!args[ci + 1]) { console.error('--changed needs a file'); process.exit(2); }
    ranges = (await import('../common.mjs')).readRanges(fs, args[ci + 1]);
  }
  const res = lintFile(file, ranges);
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else for (const r of res) console.log(`${r.file}:${r.line}:${r.col}  ${r.rule}  ${r.msg}`);
  if (res.length) { if (!args.includes('--json')) console.log(`${res.length} violation(s)`); process.exit(1); }
  if (!args.includes('--json')) console.log(`${file}: inside the subset`);
  process.exit(0);
}
