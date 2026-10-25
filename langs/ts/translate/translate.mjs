#!/usr/bin/env node
// lean-ts translate: turns functions of the TypeScript subset into Dafny, the shared core form.
// number is `int` by default, `real` with --real.
//
// Two shapes of output:
//   proof shape (default)  one function per run (--fn); a function with loops becomes a Dafny `method`
//                          so the loop keeps its invariants. --ensures/--requires/--invariant add the theorem.
//   --core                 what conformance/run.py expects: every top-level function of the file becomes a pure
//                          Dafny `function` named <snake_case>[_<suffix>]; a loop becomes a recursive helper function.
//
// Usage: node translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real]
//          [--requires E]... [--ensures E]... [--invariant [N:]E]...
//        node translate.mjs <file.ts> --core --out <file.dfy> [--suffix parent|candidate] [--real]
// `result` in --ensures names the returned value. An --invariant without N applies to every loop; with N to loop N
// (0-based, source order). Loop variables of loop N are seqN / idxN. Hints in the source (`// @invariant E`,
// `// @decreases E` right before a loop) are read too; they are untrusted: Dafny checks them.
// Exit 0: file written. Exit 1: outside the subset, or not covered by the translator.
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
  'var', 'while', 'witness', 'yield', 'yields', 'result', 'Option', 'None', 'Some']);
const dn = (name) => (RESERVED.has(name) ? `${name}_` : name);
const snake = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const mangle = (t) => t.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
const indentBlock = (s, n = 1) => s.split('\n').map((l) => '  '.repeat(n) + l).join('\n');
// a Dafny let-expression inside an if/else branch needs parentheses
const wrapLet = (s) => (/^\s*var /.test(s) ? `(\n${indentBlock(s)}\n)` : s);

export function translate(file, fnName, opts = {}) {
  const { real = false, requires = [], ensures = [], invariants = [], core = false, suffix = '' } = opts;
  const sfx = core && suffix ? `_${suffix}` : '';
  const { sf, checker } = loadProgram(file);
  const fns = topLevelFunctions(sf);
  const target = fnName ? fns.get(fnName) : null;
  if (fnName && !target) throw new Unsupported(`no top-level function named ${fnName} in ${file}`);
  if (!fnName && !core) throw new Unsupported('--fn is required unless --core is given');

  const where = (n) => `${path.basename(file)}:${lineOf(sf, n.getStart(sf))}`;
  const fail = (n, msg) => { throw new Unsupported(`${where(n)}: ${msg}`); };

  // ----- which functions to emit: the target (or all, with --core) and same-file callees, callees first -----
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
  if (target) collect(target); else for (const f of fns.values()) collect(f);

  // ----- the subset gate: refuse before translating -----
  const gate = lintFile(file, order.map((f) => [lineOf(sf, f.getStart(sf)), lineOf(sf, f.getEnd())]));
  if (gate.length) {
    throw new Unsupported(`outside the subset:\n${gate.map((g) => `  ${g.file}:${g.line}:${g.col}  ${g.rule}  ${g.msg}`).join('\n')}`);
  }

  // ----- shared state -----
  const records = new Map(); // name -> [{name, type}]
  const helpers = new Map(); // name -> Dafny text of a monomorphic prelude function
  let usesOption = false;
  let curBase = ''; // snake_case name of the top-level function being translated (--core)
  let loopCount = 0;
  const intVars = new Set(); // real mode: counters of `for (let i ...)` loops stay int
  const NUM = real ? 'real' : 'int';
  const fname = (tsName) => (core ? dn(snake(tsName)) + sfx : dn(tsName));

  // ----- types -----
  const isOptional = (t) => !!(t.flags & TF.Union) && t.types.some((x) => x.flags & TF.Undefined);
  function dtype(t, n) {
    const f = t.flags;
    if (f & TF.NumberLike) return NUM;
    if (f & TF.BigIntLike) return 'int';
    if (f & TF.BooleanLike) return 'bool';
    if (f & TF.StringLike) return 'string';
    if (f & TF.Union) {
      const parts = t.types.filter((x) => !(x.flags & TF.Undefined));
      if (parts.length !== t.types.length) {
        usesOption = true;
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
  const symType = (sym, n) => (checker.getTypeOfSymbol ? checker.getTypeOfSymbol(sym) : checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? n));

  // ----- monomorphic prelude functions (the generator refuses generic functions) -----
  function helper(kind, types) {
    // --core: a private helper of the function that uses it, named <f>_<helper>_<suffix> (see spec/README.md)
    const name = core ? `${curBase}_${kind.toLowerCase()}_${types.map(mangle).join('_')}${sfx}` : `${kind}_${types.map(mangle).join('_')}`;
    if (helpers.has(name)) return name;
    const [A, B] = types;
    let text;
    if (kind === 'Filter') {
      text = `function ${name}(s: seq<${A}>, p: ${A} -> bool): (r: seq<${A}>)
  ensures |r| <= |s|
  ensures forall i :: 0 <= i < |r| ==> p(r[i])
  decreases |s|
{
  if |s| == 0 then []
  else (if p(s[0]) then [s[0]] else []) + ${name}(s[1..], p)
}`;
    } else if (kind === 'Map') {
      text = `function ${name}(s: seq<${A}>, f: ${A} -> ${B}): (r: seq<${B}>)
  ensures |r| == |s|
  ensures forall i :: 0 <= i < |s| ==> r[i] == f(s[i])
  decreases |s|
{
  if |s| == 0 then [] else [f(s[0])] + ${name}(s[1..], f)
}`;
    } else if (kind === 'Fold') {
      text = `function ${name}(s: seq<${A}>, f: (${B}, ${A}) -> ${B}, init: ${B}): ${B}
  decreases |s|
{
  if |s| == 0 then init else ${name}(s[1..], f, f(init, s[0]))
}`;
    } else if (kind === 'Min') {
      text = `function ${name}(a: ${A}, b: ${A}): ${A} { if a < b then a else b }`;
    } else {
      text = `function ${name}(a: ${A}, b: ${A}): ${A} { if a > b then a else b }`;
    }
    helpers.set(name, text);
    return name;
  }

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
    usesOption = true;
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
    if (sym && sym.valueDeclaration && !ts.isFunctionDeclaration(sym.valueDeclaration)) {
      if (isOptional(symType(sym, n)) && !isOptional(typeOf(n))) code += '.value';
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
    const keyOf = (p) => (ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf).replace(/^["']|["']$/g, ''));
    const fields = [];
    for (const p of n.properties) {
      if (ts.isSpreadAssignment(p)) continue;
      if (ts.isShorthandPropertyAssignment(p)) fields.push([p.name.text, expr(p.name, propT(p.name.text))]);
      else if (ts.isPropertyAssignment(p)) fields.push([keyOf(p), expr(p.initializer, propT(keyOf(p)))]);
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
  const elemType = (arrNode) => checker.getTypeArguments(typeOf(arrNode))[0];
  function call(n) {
    const f = n.expression;
    if (ts.isIdentifier(f)) {
      const callee = fns.get(f.text);
      if (!core && kindOf.get(callee) === 'method') fail(n, `${f.text} loops, so it is a Dafny method and cannot be called inside an expression`);
      const sig = checker.getResolvedSignature(n);
      const args = n.arguments.map((a, i) => expr(a, checker.getTypeOfSymbolAtLocation(sig.parameters[i], a)));
      return `${fname(f.text)}(${args.join(', ')})`;
    }
    const recv = f.expression, name = f.name.text;
    if (ts.isIdentifier(recv) && recv.text === 'Math') {
      const [a, b] = n.arguments;
      if (name === 'floor') return real ? `((${expr(a)}).Floor as real)` : expr(a);
      return `${helper(name === 'min' ? 'Min' : 'Max', [NUM])}(${expr(a)}, ${expr(b)})`;
    }
    const A = () => dtype(elemType(recv), n);
    if (name === 'filter') return `${helper('Filter', [A()])}(${expr(recv)}, ${lambda(n.arguments[0])})`;
    if (name === 'map') {
      const cb = n.arguments[0];
      return `${helper('Map', [A(), dtype(typeOf(cb.body), cb)])}(${expr(recv)}, ${lambda(cb)})`;
    }
    if (name === 'reduce') {
      const cb = n.arguments[0];
      const U = dtype(typeOf(cb.parameters[0].name), cb);
      return `${helper('Fold', [A(), U])}(${expr(recv)}, ${lambda(cb)}, ${expr(n.arguments[1], typeOf(cb.parameters[0].name))})`;
    }
    return fail(n, `call .${name}() is not translated`);
  }

  // ----- shared statement analysis -----
  const retType = (fn) => checker.getSignatureFromDeclaration(fn).getReturnType();
  const isAssign = (x) => ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment;
  const isUpdate = (x) => (ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken);
  const isPush = (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'push';
  const hasLoopOrMutation = (body) => {
    let found = false;
    const walk = (x) => {
      if (ts.isForStatement(x) || ts.isForOfStatement(x) || ts.isWhileStatement(x) || isAssign(x) || isUpdate(x) || isPush(x)) found = true;
      if (!found) ts.forEachChild(x, walk);
    };
    ts.forEachChild(body, walk);
    return found;
  };
  const containsReturn = (node) => { let f = false; const w = (x) => { if (ts.isReturnStatement(x)) f = true; if (!f) ts.forEachChild(x, w); }; w(node); return f; };
  const flatten = (s) => (ts.isBlock(s) ? [...s.statements] : [s]);
  const terminates = (s) => {
    if (ts.isReturnStatement(s)) return true;
    if (ts.isBlock(s)) return s.statements.length > 0 && terminates(s.statements[s.statements.length - 1]);
    if (ts.isIfStatement(s)) return !!s.elseStatement && terminates(s.thenStatement) && terminates(s.elseStatement);
    return false;
  };
  const insideNode = (decl, node) => decl.pos >= node.pos && decl.end <= node.end;
  // names assigned inside `node` whose variable is declared outside it, in order of first assignment
  function assignedOutside(node) {
    const names = [];
    const note = (id) => {
      if (names.some((m) => m.name === id.text)) return;
      const sym = checker.getSymbolAtLocation(id);
      const d = sym?.valueDeclaration;
      if (!d || insideNode(d, node)) return;
      names.push({ name: id.text, sym, node: id });
    };
    const walk = (x) => {
      if (isAssign(x) && ts.isIdentifier(x.left)) note(x.left);
      if (isUpdate(x) && ts.isIdentifier(x.operand)) note(x.operand);
      if (isPush(x) && ts.isIdentifier(x.expression.expression)) note(x.expression.expression);
      ts.forEachChild(x, walk);
    };
    walk(node);
    return names;
  }

  // ===== proof shape: methods with loops =====
  const kindOf = new Map();
  const bodyExpr = (list, fn) => {
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
      return `if ${outerParens(expr(s.expression))} then\n${indentBlock(wrapLet(bodyExpr(thenL, fn)))}\nelse\n${indentBlock(wrapLet(bodyExpr(elseL, fn)))}`;
    }
    if (ts.isBlock(s)) return bodyExpr([...s.statements, ...rest], fn);
    return fail(s, `statement ${ts.SyntaxKind[s.kind]} cannot be an expression`);
  };
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
      case K.ExpressionStatement: return emit(assignText(s.expression));
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
        emit(`var seq${id} := ${outerParens(expr(s.expression))};`);
        emit(`var idx${id} := 0;`);
        loopHeader(id, s, ind, out, [`0 <= idx${id} <= |seq${id}|`], `|seq${id}| - idx${id}`, `idx${id} < |seq${id}|`, new Set([x.text]));
        emit(`  var ${dn(x.text)}: ${dtype(typeOf(x), x)} := seq${id}[idx${id}];`);
        stmts(flatten(s.statement), ind + 1, fn, out);
        emit(`  idx${id} := idx${id} + 1;`);
        return emit('}');
      }
      case K.ForStatement: {
        const id = loopCount++;
        const L = forParts(s);
        emit(`var ${dn(L.i)}: int := ${L.start};`);
        const wasInt = intVars.has(L.i);
        if (real) intVars.add(L.i);
        const cond = forCond(L);
        const dec = forDecreases(L, cond);
        loopHeader(id, s, ind, out, [`${dn(L.i)} >= ${L.start}`], dec, cond, new Set([L.i]));
        stmts(flatten(s.statement), ind + 1, fn, out);
        emit(`  ${dn(L.i)} := ${dn(L.i)} + 1;`);
        emit('}');
        if (real && !wasInt) intVars.delete(L.i);
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
    const changed = assignedOutside(s).map((m) => m.name).filter((v) => !skip.has(v));
    if (!given.length && changed.length) out.push(`${pad}  // INVARIANT NEEDED: say what the loop keeps true about ${changed.map(dn).join(', ')}`);
    out.push(`${pad}  decreases ${decreases ?? '/* DECREASES NEEDED */ 0'}`);
    out.push(`${pad}{`);
  }
  // text of `x = e`, `x += e`, `x++`, `xs.push(e)` as a Dafny statement `x := ...;`
  function newValue(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isBinaryExpression(e)) {
      const name = dn(e.left.text);
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken) return [e.left.text, outerParens(expr(e.right, typeOf(e.left)))];
      const sym = op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : '*';
      return [e.left.text, `${name} ${sym} ${expr(e.right)}`];
    }
    if (isUpdate(e)) { const name = dn(e.operand.text); return [e.operand.text, `${name} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`]; }
    if (isPush(e)) {
      const r = e.expression.expression;
      return [r.text, `${dn(r.text)} + [${outerParens(expr(e.arguments[0], checker.getTypeArguments(typeOf(r))[0]))}]`];
    }
    return fail(e, 'statement expression is not translated');
  }
  function assignText(e) { const [n, v] = newValue(e); return `${dn(n)} := ${v};`; }
  function forParts(s) {
    const decl = s.initializer.declarations[0];
    const i = decl.name.text;
    const init = decl.initializer;
    let start;
    if (real) { if (!ts.isNumericLiteral(init) || !/^\d+$/.test(init.text)) fail(init, 'in --real mode a for-loop counter starts at an integer literal'); start = init.text; }
    else start = outerParens(expr(init));
    return { i, start, upper: s.condition.right, le: s.condition.operatorToken.kind === K.LessThanEqualsToken };
  }
  function forCond(L) {
    return `${real ? `(${dn(L.i)} as real)` : dn(L.i)} ${L.le ? '<=' : '<'} ${outerParens(expr(L.upper))}`;
  }
  function forDecreases(L, cond) {
    const up = outerParens(expr(L.upper));
    return real ? `if ${cond} then (${up} - (${dn(L.i)} as real)).Floor + 1 else 0` : `if ${cond} then ${up} - ${dn(L.i)} + 1 else 0`;
  }

  // ===== --core shape: pure functions, loops as recursive helpers =====
  const coreHelpers = []; // loop helper function texts, in order

  // sign facts: which names are known >= 0 under the guards of the path
  const guardFacts = (c) => {
    const out = new Set();
    const lit = (e) => ts.isNumericLiteral(e) && Number(e.text) >= 0;
    const walk = (e) => {
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if (!ts.isBinaryExpression(e)) return;
      const op = e.operatorToken.kind;
      if (op === K.AmpersandAmpersandToken) { walk(e.left); walk(e.right); return; }
      if ((op === K.GreaterThanToken || op === K.GreaterThanEqualsToken) && ts.isIdentifier(e.left) && lit(e.right)) out.add(e.left.text);
      if ((op === K.LessThanToken || op === K.LessThanEqualsToken) && ts.isIdentifier(e.right) && lit(e.left)) out.add(e.right.text);
    };
    walk(c);
    return out;
  };
  const nonneg = (e, facts) => {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isNumericLiteral(e)) return true;
    if (ts.isIdentifier(e)) return facts.has(e.text);
    if (ts.isPropertyAccessExpression(e)) return e.name.text === 'length';
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.PlusToken || op === K.AsteriskToken) return nonneg(e.left, facts) && nonneg(e.right, facts);
    }
    if (ts.isConditionalExpression(e)) return nonneg(e.whenTrue, facts) && nonneg(e.whenFalse, facts);
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Math') {
      const [a, b] = e.arguments;
      if (e.expression.name.text === 'max') return nonneg(a, facts) || nonneg(b, facts);
      if (e.expression.name.text === 'min') return nonneg(a, facts) && nonneg(b, facts);
    }
    return false;
  };
  // the elements of `for (const x of p)` where `const p = ....filter((x) => x > k)` satisfy the predicate
  function filterProvenance(iterNode) {
    if (!ts.isIdentifier(iterNode)) return null;
    const sym = checker.getSymbolAtLocation(iterNode);
    const d = sym?.valueDeclaration;
    if (!d || !ts.isVariableDeclaration(d) || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return null;
    const init = d.initializer;
    if (!init || !ts.isCallExpression(init) || !ts.isPropertyAccessExpression(init.expression) || init.expression.name.text !== 'filter') return null;
    const cb = init.arguments[0];
    if (!ts.isArrowFunction(cb) || cb.parameters.length !== 1) return null;
    return cb;
  }
  function elementFacts(s) {
    const facts = new Set();
    const cb = filterProvenance(s.expression);
    if (cb) { const p = cb.parameters[0].name.text; for (const f of guardFacts(cb.body)) if (f === p) facts.add(s.initializer.declarations[0].name.text); }
    return facts;
  }
  // do all updates of `v` inside `node` keep v >= 0?
  function keepsNonneg(v, node, facts) {
    let ok = true, seen = false;
    const visit = (x, f) => {
      if (!ok) return;
      if (ts.isIfStatement(x)) { visit(x.thenStatement, new Set([...f, ...guardFacts(x.expression)])); if (x.elseStatement) visit(x.elseStatement, f); return; }
      if (ts.isForOfStatement(x)) { visit(x.statement, new Set([...f, ...elementFacts(x)])); return; }
      if (ts.isForStatement(x)) {
        const L = x.initializer.declarations[0]; const nf = new Set(f);
        if (ts.isNumericLiteral(L.initializer)) nf.add(L.name.text);
        visit(x.statement, nf); return;
      }
      if (ts.isExpressionStatement(x)) {
        let e = x.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
        if (ts.isBinaryExpression(e) && ts.isIdentifier(e.left) && e.left.text === v) {
          seen = true;
          const op = e.operatorToken.kind;
          if (op === K.PlusEqualsToken) ok = nonneg(e.right, f);
          else if (op === K.EqualsToken) {
            const r = (() => { let y = e.right; while (ts.isParenthesizedExpression(y)) y = y.expression; return y; })();
            if (ts.isBinaryExpression(r) && r.operatorToken.kind === K.PlusToken) {
              const isV = (z) => ts.isIdentifier(z) && z.text === v;
              ok = (isV(r.left) && nonneg(r.right, f)) || (isV(r.right) && nonneg(r.left, f)) || nonneg(r, f);
            } else ok = nonneg(r, f);
          } else ok = false;
        } else if (isUpdate(e) && ts.isIdentifier(e.operand) && e.operand.text === v) { seen = true; ok = e.operator === K.PlusPlusToken; }
        return;
      }
      ts.forEachChild(x, (c) => visit(c, f));
    };
    visit(node, facts);
    return ok && seen;
  }

  const paramNamesOf = (list) => list.map((p) => p.name);
  // identifiers used inside `node` whose variable is declared outside it (parameters and earlier locals)
  function freeVars(node, skipNode) {
    const out = [];
    const walk = (x) => {
      if (x === skipNode) return;
      if (ts.isIdentifier(x) && x.text !== 'undefined') {
        const par = x.parent;
        const isName = (ts.isPropertyAccessExpression(par) && par.name === x) || (ts.isPropertyAssignment(par) && par.name === x) || (ts.isParameter(par) && par.name === x) || (ts.isVariableDeclaration(par) && par.name === x);
        if (!isName) {
          const sym = checker.getSymbolAtLocation(x);
          const d = sym?.valueDeclaration;
          if (d && !ts.isFunctionDeclaration(d) && !insideNode(d, node) && !out.some((o) => o.name === x.text)) out.push({ name: x.text, sym, node: x });
        }
      }
      ts.forEachChild(x, walk);
    };
    ts.forEachChild(node, walk);
    return out;
  }
  const tupleOf = (names) => (names.length === 1 ? names[0] : `(${names.join(', ')})`);

  // translate a statement list to ONE Dafny expression; `fin()` gives the value when the list ends
  function tr(list, fin, fn) {
    if (!list.length) return fin();
    const [s, ...rest] = list;
    const more = (r = rest) => tr(r, fin, fn);
    switch (s.kind) {
      case K.Block: return tr([...s.statements, ...rest], fin, fn);
      case K.EmptyStatement: return more();
      case K.ReturnStatement: return expr(s.expression, retType(fn));
      case K.VariableStatement: {
        const d = s.declarationList.declarations[0];
        const t = typeOf(d.name);
        return `var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};\n${more()}`;
      }
      case K.ExpressionStatement: {
        const [n, v] = newValue(s.expression);
        const sym = checker.getSymbolAtLocation(s.expression.left ?? s.expression.operand ?? s.expression.expression.expression);
        return `var ${dn(n)}: ${dtype(symType(sym, s), s)} := ${v};\n${more()}`;
      }
      case K.IfStatement: {
        if (containsReturn(s)) {
          const thenL = [...flatten(s.thenStatement), ...(terminates(s.thenStatement) ? [] : rest)];
          const elseS = s.elseStatement;
          const elseL = [...(elseS ? flatten(elseS) : []), ...(elseS && terminates(elseS) ? [] : rest)];
          return `if ${outerParens(expr(s.expression))} then\n${indentBlock(wrapLet(tr(thenL, fin, fn)))}\nelse\n${indentBlock(wrapLet(tr(elseL, fin, fn)))}`;
        }
        const M = assignedOutside(s);
        if (!M.length) return more();
        const names = M.map((m) => dn(m.name));
        const state = () => tupleOf(names);
        const thenE = tr(flatten(s.thenStatement), state, fn);
        const elseE = s.elseStatement ? tr(flatten(s.elseStatement), state, fn) : state();
        return `var ${tupleOf(names)} := if ${outerParens(expr(s.expression))} then\n${indentBlock(wrapLet(thenE))}\nelse\n${indentBlock(wrapLet(elseE))};\n${more()}`;
      }
      case K.ForOfStatement: case K.ForStatement: case K.WhileStatement: return coreLoop(s, rest, fin, fn);
      default: return fail(s, `statement ${ts.SyntaxKind[s.kind]} is not translated`);
    }
  }

  function coreLoop(s, rest, fin, fn) {
    const id = loopCount++;
    if (containsReturn(s)) fail(s, 'return inside a loop is not translated in --core mode; compute the value and return after the loop');
    const M = assignedOutside(s).map((m) => ({ ...m, d: dtype(symType(m.sym, m.node), m.node) }));
    if (!M.length) return tr(rest, fin, fn);
    const isOf = ts.isForOfStatement(s), isFor = ts.isForStatement(s);
    const userHints = [...hintsOf(sf, s).invariants, ...invariants.filter((x) => x.loop === null || x.loop === id).map((x) => x.expr)];
    // names a hint mentions must be parameters of the helper too (for example a bound `n` the body never reads)
    const hintWords = new Set(userHints.flatMap((h) => h.match(/[A-Za-z_]\w*/g) ?? []));
    const inScopeVars = [];
    const scan = (x) => {
      if (ts.isParameter(x) || ts.isVariableDeclaration(x)) {
        if (ts.isIdentifier(x.name) && x.end <= s.pos && !insideNode(x, s)) inScopeVars.push({ name: x.name.text, sym: checker.getSymbolAtLocation(x.name), node: x.name });
      }
      ts.forEachChild(x, scan);
    };
    scan(fn);
    const free = freeVars(s, isOf ? s.expression : null);
    for (const v of inScopeVars) if (hintWords.has(v.name) && !free.some((f) => f.name === v.name)) free.push(v);
    const freeTyped = free.filter((v) => !M.some((m) => m.name === v.name)).map((v) => ({ ...v, d: dtype(symType(v.sym, v.node), v.node) }));
    free.length = 0; free.push(...freeTyped);
    const hn = `${curBase}_loop${id}${sfx}`;
    const mNames = M.map((m) => dn(m.name));
    const constParams = free.map((v) => `${dn(v.name)}: ${v.d}`);
    const stateParams = M.map((m) => `${dn(m.name)}: ${m.d}`);
    const constArgs = free.map((v) => dn(v.name));
    const sA = (m) => mNames; // state args
    const requiresL = [];
    let lead = [], leadArgsNext = [], leadArgsFirst = [], exit, bind = '', decreases, factsIn = new Set();
    let lp = null;
    if (isOf) {
      const x = s.initializer.declarations[0].name;
      const T = dtype(typeOf(x), x);
      const sq = `seq${id}`, ix = `idx${id}`;
      lead = [`${sq}: seq<${T}>`, `${ix}: int`];
      leadArgsNext = [sq, `${ix} + 1`];
      leadArgsFirst = [outerParens(expr(s.expression)), '0'];
      requiresL.push(`0 <= ${ix} <= |${sq}|`);
      const cb = filterProvenance(s.expression);
      if (cb) requiresL.push(`forall k :: 0 <= k < |${sq}| ==> (${lambda(cb)})(${sq}[k])`);
      exit = `${ix} >= |${sq}|`;
      bind = `var ${dn(x.text)}: ${T} := ${sq}[${ix}];\n`;
      decreases = `|${sq}| - ${ix}`;
      factsIn = elementFacts(s);
    } else if (isFor) {
      lp = forParts(s);
      lead = [`${dn(lp.i)}: int`];
      leadArgsNext = [`${dn(lp.i)} + 1`];
      leadArgsFirst = [lp.start];
      if (real) intVars.add(lp.i);
      const cond = forCond(lp);
      exit = `!(${cond})`;
      decreases = forDecreases(lp, cond);
      if (ts.isNumericLiteral(s.initializer.declarations[0].initializer)) factsIn = new Set([lp.i]);
    } else {
      const h = hintsOf(sf, s);
      exit = `!(${outerParens(expr(s.expression))})`;
      decreases = h.decreases ?? fail(s, 'while needs `// @decreases <expr>`');
    }
    const next = () => `${hn}(${[...leadArgsNext, ...constArgs, ...mNames].join(', ')})`;
    const bodyE = tr(flatten(s.statement), next, fn);
    const params = [...lead, ...constParams, ...stateParams];
    const selfArgs = [...lead.map((p) => p.split(':')[0]), ...constArgs, ...mNames];
    const call = `${hn}(${selfArgs.join(', ')})`;
    const resT = M.length === 1 ? M[0].d : `(${M.map((m) => m.d).join(', ')})`;
    // hints: the loop keeps an inductive property of its state: I(in) ==> I(out)
    const hints = [...userHints];
    for (const m of M) {
      if ((m.d === 'int' || m.d === 'real') && keepsNonneg(m.name, s.statement, factsIn)) hints.push(`${dn(m.name)} >= ${m.d === 'real' ? '0.0' : '0'}`);
    }
    // a while loop ends only when its condition is false: say so about the final state
    const exitFact = !isOf && !isFor ? [`  ensures (var ${tupleOf(mNames)} := ${call}; ${exit})`] : [];
    const specs = [...requiresL.map((r) => `  requires ${r}`),
      ...hints.map((h) => `  ensures (${h}) ==> (var ${tupleOf(mNames)} := ${call}; ${h})`),
      ...exitFact,
      `  decreases ${decreases}`];
    coreHelpers.push([`function ${hn}(${params.join(', ')}): ${resT}`, ...specs, '{',
      indentBlock(`if ${exit} then ${tupleOf(mNames)}\nelse\n${indentBlock(wrapLet(bind + bodyE))}`), '}'].join('\n'));
    if (isFor && real) intVars.delete(lp.i);
    const first = `${hn}(${[...leadArgsFirst, ...constArgs, ...mNames].join(', ')})`;
    return `var ${tupleOf(mNames)} := ${first};\n${tr(rest, fin, fn)}`;
  }

  // ----- emit functions -----
  for (const fn of order) kindOf.set(fn, hasLoopOrMutation(fn.body) ? 'method' : 'function');
  const sigParams = (fn) => fn.parameters.map((p) => `${dn(p.name.text)}: ${dtype(typeOf(p.name), p)}`).join(', ');
  const chunks = [];
  for (const fn of order) {
    const isTarget = fn === target || (core && !target);
    const rt = dtype(retType(fn), fn);
    const name = fname(fn.name.text);
    const specs = [];
    const argNames = fn.parameters.map((p) => dn(p.name.text)).join(', ');
    // in --core the result is not named (the generator reads the return type), so `result` becomes the call
    const sub = (e) => (core ? e.replace(/\bresult\b/g, `${name}(${argNames})`) : e);
    if (fn === target) {
      for (const r of requires) specs.push(`  requires ${sub(r)}`);
      for (const e of ensures) specs.push(`  ensures ${sub(e)}`);
    }
    if (core) {
      curBase = dn(snake(fn.name.text));
      const body = tr(fn.body.statements, () => fail(fn, 'a path ends without a return'), fn);
      chunks.push(...coreHelpers.splice(0), [`function ${name}(${sigParams(fn)}): ${rt}`, ...specs, '{', indentBlock(body), '}'].join('\n'));
    } else if (kindOf.get(fn) === 'function') {
      chunks.push([`function ${name}(${sigParams(fn)}): (result: ${rt})`, ...specs, '{', indentBlock(bodyExpr(fn.body.statements, fn)), '}'].join('\n'));
    } else {
      const lines = [];
      stmts(fn.body.statements, 1, fn, lines);
      chunks.push([`method ${name}(${sigParams(fn)}) returns (result: ${rt})`, ...specs, '{', ...lines, '}'].join('\n'));
    }
  }

  const pre = [];
  if (usesOption) pre.push('datatype Option<T> = None | Some(value: T)');
  for (const [name, fields] of records) pre.push(`datatype ${name} = ${name}(${fields.map((f) => `${dn(f.name)}: ${f.type}`).join(', ')})`);
  pre.push(...helpers.values());
  const what = fnName ? `function ${fnName}` : 'all functions';
  const header = `// Generated by lean-ts translate from ${path.basename(file)}, ${what}. number is ${NUM}.\n// Do not edit: the gate regenerates this file.`;
  return [header, ...pre, ...chunks].join('\n\n') + '\n';
}

const isMain = path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const opts = { real: false, requires: [], ensures: [], invariants: [], core: false, suffix: '' };
  let file = null, fn = null, out = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--fn') fn = args[++i];
    else if (a === '--out') out = args[++i];
    else if (a === '--real') opts.real = true;
    else if (a === '--core') opts.core = true;
    else if (a === '--suffix') opts.suffix = args[++i] ?? '';
    else if (a === '--requires') opts.requires.push(args[++i]);
    else if (a === '--ensures') opts.ensures.push(args[++i]);
    else if (a === '--invariant') {
      const v = args[++i]; const m = v.match(/^(\d+):(.*)$/);
      opts.invariants.push(m ? { loop: Number(m[1]), expr: m[2] } : { loop: null, expr: v });
    } else if (!a.startsWith('--') && !file) file = a;
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  if (!file || !out || (!fn && !opts.core)) {
    console.error('usage: translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real] [--requires E] [--ensures E] [--invariant [N:]E]\n       translate.mjs <file.ts> --core --out <file.dfy> [--suffix parent|candidate] [--real]');
    process.exit(2);
  }
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
