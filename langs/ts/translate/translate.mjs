#!/usr/bin/env node
// lean-ts translate: turns ONE function of the TypeScript subset (and the same-file functions it calls)
// into Dafny, the shared core form. number is `int` by default, `real` with --real.
// Usage: node translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real]
//          [--requires <dafny expr>]... [--ensures <dafny expr>]... [--invariant [N:]<dafny expr>]...
// `result` in --ensures names the returned value. An --invariant without N applies to every loop;
// with N it applies to loop N (0-based, source order). Loop variables of loop N are seqN / idxN.
// Exit 0: file written. Exit 1: the function is outside the subset or the translator does not cover it.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, lineOf, hintsOf, topLevelFunctions, isArrayLike } from '../common.mjs';
import { lintFile } from '../lint/lint.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

class Unsupported extends Error {}

const RESERVED = new Set(['abstract', 'allocated', 'as', 'assert', 'assume', 'bool', 'break', 'by', 'calc', 'case', 'char', 'class', 'codatatype',
  'const', 'constructor', 'datatype', 'decreases', 'else', 'ensures', 'exists', 'expect', 'export', 'extends', 'false', 'forall', 'fp', 'function',
  'ghost', 'if', 'import', 'in', 'include', 'inductive', 'int', 'invariant', 'is', 'iterator', 'label', 'lemma', 'map', 'match', 'method', 'modifies',
  'modify', 'module', 'multiset', 'nameonly', 'nat', 'new', 'newtype', 'null', 'object', 'old', 'opaque', 'predicate', 'print', 'provides', 'reads',
  'real', 'refines', 'requires', 'return', 'returns', 'reveal', 'seq', 'set', 'static', 'string', 'then', 'this', 'trait', 'true', 'type', 'unchanged',
  'var', 'while', 'witness', 'yield', 'yields', 'result', 'Min', 'Max', 'MinR', 'MaxR', 'Filter', 'Map', 'Fold', 'Option', 'None', 'Some']);
const dn = (name) => (RESERVED.has(name) ? `${name}_` : name);

export function translate(file, fnName, opts = {}) {
  const { real = false, requires = [], ensures = [], invariants = [] } = opts;
  const { sf, checker } = loadProgram(file);
  const fns = topLevelFunctions(sf);
  const target = fns.get(fnName);
  if (!target) throw new Unsupported(`no top-level function named ${fnName} in ${file}`);

  const where = (n) => `${path.basename(file)}:${lineOf(sf, n.getStart(sf))}`;
  const fail = (n, msg) => { throw new Unsupported(`${where(n)}: ${msg}`); };

  // ----- which functions to emit: the target and its same-file callees, callees first -----
  const order = [];
  const visiting = new Set();
  function collect(fn) {
    if (order.includes(fn)) return;
    if (visiting.has(fn)) fail(fn, `recursion through ${fn.name.text} is outside the translator`);
    visiting.add(fn);
    const walk = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const callee = fns.get(n.expression.text);
        if (callee) collect(callee);
      }
      ts.forEachChild(n, walk);
    };
    walk(fn.body);
    visiting.delete(fn);
    order.push(fn);
  }
  collect(target);

  // ----- the subset gate: refuse before translating -----
  const gate = lintFile(file, order.map((f) => [lineOf(sf, f.getStart(sf)), lineOf(sf, f.getEnd())]));
  if (gate.length) {
    throw new Unsupported(`outside the subset:\n${gate.map((g) => `  ${g.file}:${g.line}:${g.col}  ${g.rule}  ${g.msg}`).join('\n')}`);
  }

  // ----- shared state -----
  const records = new Map(); // name -> [{name, type}]
  const used = { option: false, min: false, max: false, filter: false, map: false, fold: false };
  let loopCount = 0;
  const intVars = new Set(); // real mode: counters of `for (let i ...)` loops stay int
  const NUM = real ? 'real' : 'int';

  // ----- types -----
  const isOptional = (t) => !!(t.flags & TF.Union) && t.types.some((x) => x.flags & TF.Undefined) && !(t.flags & TF.BooleanLike && !t.types.some((x) => x.flags & TF.Undefined));
  function dtype(t, n) {
    const f = t.flags;
    if (f & TF.NumberLike) return NUM;
    if (f & TF.BigIntLike) return 'int';
    if (f & TF.BooleanLike) return 'bool';
    if (f & TF.StringLike) return 'string';
    if (f & TF.Union) {
      const parts = t.types.filter((x) => !(x.flags & TF.Undefined));
      if (parts.length !== t.types.length) {
        used.option = true;
        const inner = parts.every((x) => x.flags & TF.BooleanLiteral) ? 'bool' : parts.length === 1 ? dtype(parts[0], n) : fail(n, 'unsupported union');
        return `Option<${inner}>`;
      }
      fail(n, 'unsupported union type');
    }
    if (f & TF.Object) {
      if (checker.isTupleType(t)) return `(${checker.getTypeArguments(t).map((a) => dtype(a, n)).join(', ')})`;
      if (checker.isArrayType(t)) return `seq<${dtype(checker.getTypeArguments(t)[0], n)}>`;
      const name = t.aliasSymbol?.name ?? (t.symbol && t.symbol.name !== '__type' && t.symbol.name !== '__object' ? t.symbol.name : null);
      if (!name) fail(n, 'anonymous record type; give it a name with `type Name = {...}`');
      if (!records.has(name)) {
        records.set(name, []); // reserve first: allows nested use
        const fields = checker.getPropertiesOfType(t).map((p) => ({ name: p.name, type: dtype(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n), n) }));
        records.set(name, fields);
      }
      return name;
    }
    return fail(n, `type ${checker.typeToString(t)} is not translatable`);
  }
  const typeOf = (n) => checker.getTypeAtLocation(n);

  // ----- literals / coercion -----
  function numLit(text, n) {
    if (!real) { if (!/^\d+$/.test(text)) fail(n, `number literal ${text} is not an integer; use --real`); return text; }
    const v = Number(text);
    return Number.isInteger(v) ? `${v}.0` : String(v);
  }
  const outerParens = (s) => {
    if (!s.startsWith('(') || !s.endsWith(')')) return s;
    let d = 0;
    for (let i = 0; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') d--; if (d === 0 && i < s.length - 1) return s; }
    return s.slice(1, -1);
  };
  function coerce(code, node, expected) {
    if (!expected || !isOptional(expected)) return code;
    const nt = typeOf(node);
    if (isOptional(nt)) return code;
    if (nt.flags & TF.Undefined) return 'None';
    used.option = true;
    return `Some(${code})`;
  }

  // ----- expressions -----
  function expr(n, expected) {
    switch (n.kind) {
      case K.ParenthesizedExpression: return expr(n.expression, expected);
      case K.ConditionalExpression:
        return `(if ${outerParens(expr(n.condition))} then ${outerParens(expr(n.whenTrue, expected))} else ${outerParens(expr(n.whenFalse, expected))})`;
      default: return coerce(rawExpr(n, expected), n, expected);
    }
  }
  function ident(n) {
    if (n.text === 'undefined') return 'None';
    const sym = checker.getSymbolAtLocation(n);
    let code = dn(n.text);
    if (sym) {
      const declT = checker.getTypeOfSymbol ? checker.getTypeOfSymbol(sym) : checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration);
      if (isOptional(declT) && !isOptional(typeOf(n))) code += '.value';
    }
    if (real && intVars.has(n.text)) return `(${code} as real)`;
    return code;
  }
  function index(arg) {
    if (ts.isIdentifier(arg) && intVars.has(arg.text)) return dn(arg.text);
    return real ? `(${expr(arg)}).Floor` : outerParens(expr(arg));
  }
  const lenOf = (s) => (real ? `(|${s}| as real)` : `|${s}|`);

  function rawExpr(n, expected) {
    switch (n.kind) {
      case K.Identifier: return ident(n);
      case K.NumericLiteral: return numLit(n.text, n);
      case K.BigIntLiteral: return n.text.replace(/n$/, '');
      case K.StringLiteral: return JSON.stringify(n.text);
      case K.TrueKeyword: return 'true';
      case K.FalseKeyword: return 'false';
      case K.PrefixUnaryExpression:
        if (n.operator === K.ExclamationToken) return `!${expr(n.operand)}`;
        return `(-${expr(n.operand)})`;
      case K.BinaryExpression: return binary(n);
      case K.PropertyAccessExpression: {
        const name = n.name.text;
        const recvT = typeOf(n.expression);
        if (name === 'length' && (isArrayLike(checker, recvT) || recvT.flags & TF.StringLike)) return lenOf(expr(n.expression));
        return `${expr(n.expression)}.${dn(name)}`;
      }
      case K.ElementAccessExpression: {
        const recvT = typeOf(n.expression);
        if (checker.isTupleType(recvT)) {
          if (!ts.isNumericLiteral(n.argumentExpression)) fail(n, 'tuple index must be a literal');
          return `${expr(n.expression)}.${n.argumentExpression.text}`;
        }
        return `${expr(n.expression)}[${index(n.argumentExpression)}]`;
      }
      case K.ArrayLiteralExpression: {
        const ctx = expected ?? checker.getContextualType(n) ?? typeOf(n);
        if (checker.isTupleType(typeOf(n)) || checker.isTupleType(ctx)) {
          const targs = checker.isTupleType(ctx) ? checker.getTypeArguments(ctx) : [];
          return `(${n.elements.map((e, i) => expr(e, targs[i])).join(', ')})`;
        }
        const et = checker.isArrayType(ctx) ? checker.getTypeArguments(ctx)[0] : undefined;
        const segs = []; let cur = [];
        for (const e of n.elements) {
          if (ts.isSpreadElement(e)) { if (cur.length) segs.push(`[${cur.join(', ')}]`); cur = []; segs.push(expr(e.expression)); }
          else cur.push(expr(e, et));
        }
        if (cur.length || !segs.length) segs.push(`[${cur.join(', ')}]`);
        return segs.length === 1 ? segs[0] : `(${segs.join(' + ')})`;
      }
      case K.ObjectLiteralExpression: return objectLit(n, expected);
      case K.CallExpression: return call(n);
      default: return fail(n, `expression ${ts.SyntaxKind[n.kind]} is not translated`);
    }
  }
  function binary(n) {
    const op = n.operatorToken.kind;
    const isUndef = (e) => ts.isIdentifier(e) && e.text === 'undefined';
    if ((op === K.EqualsEqualsEqualsToken || op === K.ExclamationEqualsEqualsToken) && (isUndef(n.left) || isUndef(n.right))) {
      const other = isUndef(n.left) ? n.right : n.left;
      return `${rawOperand(other)}.${op === K.EqualsEqualsEqualsToken ? 'None?' : 'Some?'}`;
    }
    if (op === K.QuestionQuestionToken) {
      const l = rawOperand(n.left);
      return `(if ${l}.Some? then ${l}.value else ${outerParens(expr(n.right))})`;
    }
    const map = { [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=' };
    const o = map[op] ?? n.operatorToken.getText(sf);
    // numeric operands against a bigint-free int/real context: both sides share the type, so no conversion
    return `(${expr(n.left)} ${o} ${expr(n.right)})`;
  }
  // an operand compared against undefined keeps its declared (Option) form
  function rawOperand(e) {
    if (ts.isParenthesizedExpression(e)) return rawOperand(e.expression);
    if (ts.isIdentifier(e)) return dn(e.text);
    return expr(e);
  }
  function objectLit(n, expected) {
    const ctx = expected ?? checker.getContextualType(n);
    const first = n.properties[0];
    let recT = ctx && !isOptional(ctx) ? ctx : null;
    if (ctx && isOptional(ctx)) recT = ctx.types.find((x) => !(x.flags & TF.Undefined));
    if (first && ts.isSpreadAssignment(first)) recT = typeOf(first.expression);
    if (!recT) fail(n, 'record literal without a known record type');
    const rname = dtype(recT, n);
    const propT = (name) => { const p = checker.getPropertyOfType(recT, name); return p ? checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n) : undefined; };
    const fields = [];
    for (const p of n.properties) {
      if (ts.isSpreadAssignment(p)) continue;
      if (ts.isShorthandPropertyAssignment(p)) fields.push([p.name.text, expr(p.name, propT(p.name.text))]);
      else if (ts.isPropertyAssignment(p)) fields.push([ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf).replace(/^["']|["']$/g, ''), expr(p.initializer, propT(ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf)))]);
    }
    if (first && ts.isSpreadAssignment(first)) {
      const base = expr(first.expression);
      if (!fields.length) return base;
      return `${base}.(${fields.map(([k, v]) => `${dn(k)} := ${outerParens(v)}`).join(', ')})`;
    }
    return `${rname}(${fields.map(([k, v]) => `${dn(k)} := ${outerParens(v)}`).join(', ')})`;
  }
  function lambda(cb) {
    const ps = cb.parameters.map((p) => `${dn(p.name.text)}: ${dtype(typeOf(p.name), p)}`);
    return `(${ps.join(', ')}) => ${outerParens(expr(cb.body))}`;
  }
  function call(n) {
    const f = n.expression;
    if (ts.isIdentifier(f)) {
      const callee = fns.get(f.text);
      if (kindOf.get(callee) === 'method') fail(n, `${f.text} loops, so it is a Dafny method and cannot be called inside an expression`);
      const sig = checker.getResolvedSignature(n);
      const args = n.arguments.map((a, i) => expr(a, checker.getTypeOfSymbolAtLocation(sig.parameters[i], a)));
      return `${dn(f.text)}(${args.join(', ')})`;
    }
    const recv = f.expression, name = f.name.text;
    if (ts.isIdentifier(recv) && recv.text === 'Math') {
      const [a, b] = n.arguments;
      if (name === 'floor') return real ? `((${expr(a)}).Floor as real)` : expr(a);
      used[name] = true;
      return `${name === 'min' ? 'Min' : 'Max'}${real ? 'R' : ''}(${expr(a)}, ${expr(b)})`;
    }
    if (name === 'filter') { used.filter = true; return `Filter(${expr(recv)}, ${lambda(n.arguments[0])})`; }
    if (name === 'map') { used.map = true; return `Map(${expr(recv)}, ${lambda(n.arguments[0])})`; }
    if (name === 'reduce') {
      used.fold = true;
      const cb = n.arguments[0];
      return `Fold(${expr(recv)}, ${lambda(cb)}, ${expr(n.arguments[1], typeOf(cb.parameters[0].name))})`;
    }
    return fail(n, `call .${name}() is not translated`);
  }

  // ----- statements -----
  const retType = (fn) => checker.getSignatureFromDeclaration(fn).getReturnType();
  const exprInfix = (n) => outerParens(n);
  const hasLoopOrMutation = (body) => {
    let found = false;
    const walk = (x) => {
      if (ts.isForStatement(x) || ts.isForOfStatement(x) || ts.isWhileStatement(x)) found = true;
      if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment) found = true;
      if ((ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken)) found = true;
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'push') found = true;
      if (!found) ts.forEachChild(x, walk);
    };
    ts.forEachChild(body, walk);
    return found;
  };
  const flatten = (s) => (ts.isBlock(s) ? [...s.statements] : [s]);
  const terminates = (s) => {
    if (ts.isReturnStatement(s)) return true;
    if (ts.isBlock(s)) return s.statements.length > 0 && terminates(s.statements[s.statements.length - 1]);
    if (ts.isIfStatement(s)) return !!s.elseStatement && terminates(s.thenStatement) && terminates(s.elseStatement);
    return false;
  };
  // A body without loops or assignments becomes one Dafny expression.
  function bodyExpr(list, fn) {
    if (!list.length) fail(fn, 'a path ends without a return');
    const [s, ...rest] = list;
    if (ts.isReturnStatement(s)) return expr(s.expression, retType(fn));
    if (ts.isVariableStatement(s)) {
      const d = s.declarationList.declarations[0];
      const t = typeOf(d.name);
      return `var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};\n${bodyExpr(rest, fn)}`;
    }
    if (ts.isIfStatement(s)) {
      const thenL = [...flatten(s.thenStatement), ...(terminates(s.thenStatement) ? [] : rest)];
      const elseS = s.elseStatement;
      const elseL = [...(elseS ? flatten(elseS) : []), ...(elseS && terminates(elseS) ? [] : rest)];
      return `if ${outerParens(expr(s.expression))} then\n${indentBlock(bodyExpr(thenL, fn))}\nelse\n${indentBlock(bodyExpr(elseL, fn))}`;
    }
    if (ts.isBlock(s)) return bodyExpr([...s.statements, ...rest], fn);
    return fail(s, `statement ${ts.SyntaxKind[s.kind]} cannot be an expression`);
  }
  const indentBlock = (s) => s.split('\n').map((l) => '  ' + l).join('\n');

  function assignedIn(node) {
    const names = new Set();
    const walk = (x) => {
      if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(x.left)) names.add(x.left.text);
      if ((ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken) && ts.isIdentifier(x.operand)) names.add(x.operand.text);
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'push' && ts.isIdentifier(x.expression.expression)) names.add(x.expression.expression.text);
      ts.forEachChild(x, walk);
    };
    walk(node);
    return names;
  }

  const one = () => (real ? '1.0' : '1');
  function stmts(list, ind, fn, out) { for (const s of list) stmt(s, ind, fn, out); }
  function stmt(s, ind, fn, out) {
    const pad = '  '.repeat(ind);
    const emit = (line) => out.push(pad + line);
    switch (s.kind) {
      case K.Block: return stmts(s.statements, ind, fn, out);
      case K.EmptyStatement: return;
      case K.VariableStatement: {
        const d = s.declarationList.declarations[0];
        const t = typeOf(d.name);
        return emit(`var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};`);
      }
      case K.ExpressionStatement: return exprStmt(s.expression, emit);
      case K.ReturnStatement: return emit(`return ${outerParens(expr(s.expression, retType(fn)))};`);
      case K.IfStatement: {
        emit(`if ${outerParens(expr(s.expression))} {`);
        stmts(flatten(s.thenStatement), ind + 1, fn, out);
        let e = s.elseStatement;
        while (e && ts.isIfStatement(e)) {
          emit(`} else if ${outerParens(expr(e.expression))} {`);
          stmts(flatten(e.thenStatement), ind + 1, fn, out);
          e = e.elseStatement;
        }
        if (e) { emit('} else {'); stmts(flatten(e), ind + 1, fn, out); }
        return emit('}');
      }
      case K.ForOfStatement: {
        const id = loopCount++;
        const x = s.initializer.declarations[0].name;
        const xt = typeOf(x);
        emit(`var seq${id} := ${outerParens(expr(s.expression))};`);
        emit(`var idx${id} := 0;`);
        loopHeader(id, s, ind, out, [`0 <= idx${id} <= |seq${id}|`], `|seq${id}| - idx${id}`, `idx${id} < |seq${id}|`, new Set([x.text]));
        emit(`  var ${dn(x.text)}: ${dtype(xt, x)} := seq${id}[idx${id}];`);
        stmts(flatten(s.statement), ind + 1, fn, out);
        emit(`  idx${id} := idx${id} + 1;`);
        return emit('}');
      }
      case K.ForStatement: {
        const id = loopCount++;
        const decl = s.initializer.declarations[0];
        const i = decl.name.text;
        const upper = s.condition.right;
        const le = s.condition.operatorToken.kind === K.LessThanEqualsToken;
        emit(`var ${dn(i)}: int := ${real ? (() => { const v = decl.initializer; if (!ts.isNumericLiteral(v) || !/^\d+$/.test(v.text)) fail(v, 'in --real mode a for-loop counter starts at an integer literal'); return v.text; })() : outerParens(expr(decl.initializer))};`);
        const wasInt = intVars.has(i);
        if (real) intVars.add(i);
        const cond = `${real ? `(${dn(i)} as real)` : dn(i)} ${le ? '<=' : '<'} ${outerParens(expr(upper))}`;
        const dec = real ? `if ${cond} then (${outerParens(expr(upper))} - (${dn(i)} as real)).Floor + 1 else 0` : `if ${cond} then ${outerParens(expr(upper))} - ${dn(i)} + 1 else 0`;
        loopHeader(id, s, ind, out, [`${dn(i)} >= ${real ? decl.initializer.text : outerParens(expr(decl.initializer))}`], dec, cond, new Set([i]));
        stmts(flatten(s.statement), ind + 1, fn, out);
        emit(`  ${dn(i)} := ${dn(i)} + 1;`);
        emit('}');
        if (real && !wasInt) intVars.delete(i);
        return;
      }
      case K.WhileStatement: {
        const id = loopCount++;
        const h = hintsOf(sf, s);
        loopHeader(id, s, ind, out, h.invariants, h.decreases, outerParens(expr(s.expression)), new Set());
        stmts(flatten(s.statement), ind + 1, fn, out);
        return emit('}');
      }
      default: return fail(s, `statement ${ts.SyntaxKind[s.kind]} is not translated`);
    }
  }
  function loopHeader(id, s, ind, out, auto, decreases, cond, skip) {
    const pad = '  '.repeat(ind);
    out.push(`${pad}while ${cond}`);
    for (const a of auto) out.push(`${pad}  invariant ${a}`);
    const given = [...invariants.filter((x) => x.loop === null || x.loop === id).map((x) => x.expr), ...hintsOf(sf, s).invariants.filter((x) => !auto.includes(x))];
    for (const g of given) out.push(`${pad}  invariant ${g}`);
    const changed = [...assignedIn(s.statement)].filter((v) => !skip.has(v));
    if (!given.length && changed.length) out.push(`${pad}  // INVARIANT NEEDED: say what the loop keeps true about ${changed.map(dn).join(', ')}`);
    out.push(`${pad}  decreases ${decreases ?? '/* DECREASES NEEDED */ 0'}`);
    out.push(`${pad}{`);
  }
  function exprStmt(e, emit) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isBinaryExpression(e)) {
      const name = dn(e.left.text);
      const lt = typeOf(e.left);
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken) return emit(`${name} := ${outerParens(expr(e.right, lt))};`);
      const sym = op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : '*';
      return emit(`${name} := ${name} ${sym} ${expr(e.right)};`);
    }
    if (ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) {
      const name = dn(e.operand.text);
      return emit(`${name} := ${name} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()};`);
    }
    if (ts.isCallExpression(e)) { // push
      const r = e.expression.expression;
      const et = checker.getTypeArguments(typeOf(r))[0];
      return emit(`${dn(r.text)} := ${dn(r.text)} + [${outerParens(expr(e.arguments[0], et))}];`);
    }
    return fail(e, 'statement expression is not translated');
  }

  // ----- emit functions -----
  const kindOf = new Map();
  for (const fn of order) kindOf.set(fn, hasLoopOrMutation(fn.body) ? 'method' : 'function');

  const sigParams = (fn) => fn.parameters.map((p) => `${dn(p.name.text)}: ${dtype(typeOf(p.name), p)}`).join(', ');
  const chunks = [];
  for (const fn of order) {
    const isTarget = fn === target;
    const rt = dtype(retType(fn), fn);
    const specs = [];
    if (isTarget) {
      for (const r of requires) specs.push(`  requires ${r}`);
      for (const e of ensures) specs.push(`  ensures ${e}`);
    }
    const name = dn(fn.name.text);
    if (kindOf.get(fn) === 'function') {
      const body = bodyExpr(fn.body.statements, fn);
      chunks.push([`function ${name}(${sigParams(fn)}): (result: ${rt})`, ...specs, '{', indentBlock(body), '}'].join('\n'));
    } else {
      const lines = [];
      stmts(fn.body.statements, 1, fn, lines);
      chunks.push([`method ${name}(${sigParams(fn)}) returns (result: ${rt})`, ...specs, '{', ...lines, '}'].join('\n'));
    }
  }

  // ----- prelude -----
  const pre = [];
  if (used.option) pre.push('datatype Option<T> = None | Some(value: T)');
  for (const [name, fields] of records) pre.push(`datatype ${name} = ${name}(${fields.map((f) => `${dn(f.name)}: ${f.type}`).join(', ')})`);
  if (used.min) pre.push(real ? 'function MinR(a: real, b: real): real { if a < b then a else b }' : 'function Min(a: int, b: int): int { if a < b then a else b }');
  if (used.max) pre.push(real ? 'function MaxR(a: real, b: real): real { if a > b then a else b }' : 'function Max(a: int, b: int): int { if a > b then a else b }');
  if (used.filter) pre.push(`function Filter<T>(s: seq<T>, p: T -> bool): (r: seq<T>)
  ensures |r| <= |s|
  ensures forall i :: 0 <= i < |r| ==> p(r[i])
  decreases |s|
{
  if |s| == 0 then []
  else (if p(s[0]) then [s[0]] else []) + Filter(s[1..], p)
}`);
  if (used.map) pre.push(`function Map<T, U>(s: seq<T>, f: T -> U): (r: seq<U>)
  ensures |r| == |s|
  ensures forall i :: 0 <= i < |s| ==> r[i] == f(s[i])
  decreases |s|
{
  if |s| == 0 then [] else [f(s[0])] + Map(s[1..], f)
}`);
  if (used.fold) pre.push(`function Fold<T, U>(s: seq<T>, f: (U, T) -> U, init: U): U
  decreases |s|
{
  if |s| == 0 then init else Fold(s[1..], f, f(init, s[0]))
}`);

  const header = `// Generated by lean-ts translate from ${path.basename(file)}, function ${fnName}. number is ${NUM}.\n// Do not edit: the gate regenerates this file.`;
  return [header, ...pre, ...chunks].join('\n\n') + '\n';
}

const isMain = path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const opts = { real: false, requires: [], ensures: [], invariants: [] };
  let file = null, fn = null, out = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--fn') fn = args[++i];
    else if (a === '--out') out = args[++i];
    else if (a === '--real') opts.real = true;
    else if (a === '--requires') opts.requires.push(args[++i]);
    else if (a === '--ensures') opts.ensures.push(args[++i]);
    else if (a === '--invariant') {
      const v = args[++i]; const m = v.match(/^(\d+):(.*)$/);
      opts.invariants.push(m ? { loop: Number(m[1]), expr: m[2] } : { loop: null, expr: v });
    } else if (!a.startsWith('--') && !file) file = a;
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  if (!file || !fn || !out) { console.error('usage: translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real] [--requires E] [--ensures E] [--invariant [N:]E]'); process.exit(2); }
  try {
    const dfy = translate(file, fn, opts);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, dfy);
    console.log(`wrote ${out}`);
  } catch (e) {
    if (e instanceof Unsupported) { console.error(`translate: ${e.message}`); process.exit(1); }
    throw e;
  }
}
