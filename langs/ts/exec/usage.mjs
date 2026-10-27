// Lane B input usage: what one unit reads off each of its parameters (and off `this` for a method), and the literal
// values it compares those reads against. A read is a property chain from a parameter (`node.attrs.isActive`); the
// chain is followed through local aliases (`const id = node.attrs?.collectionId`, a destructuring, `x ?? "default"`),
// through the element parameter of an array callback (`xs.find((v) => v.name === K)`) and a `for ... of`, and into the
// same-file functions and methods the unit calls, one level down, with the callee's parameters bound to the argument
// chains. The result is a tree per root:
//   { fields: {name: node}, elem: node|null, len: node|null, compares: [lit], typeofs: [name], includes: [lit],
//     truthy, numeric, string, array, called: arity|null }
// A literal is a string, a finite number, a boolean, null, or { undefined: true }, written in the source or bound to a
// module constant, an enum member or a property of a constant object literal of the file. Nothing here is a claim
// about the input: spec.mjs only uses the tree to choose which inputs to draw first.
//   node usage.mjs <file.ts> --unit <name> [--no-project]   -> JSON on stdout
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';

const ARRAY_CALLBACK = new Set(['find', 'findLast', 'filter', 'some', 'every', 'map', 'flatMap', 'forEach', 'findIndex', 'findLastIndex', 'sort', 'toSorted']);
const ARRAY_ONLY = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'join', 'reverse', 'flat', 'fill', 'keys', 'values', 'entries', 'reduce', 'reduceRight', ...ARRAY_CALLBACK]);
const STRING_ONLY = new Set(['startsWith', 'endsWith', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'split', 'replace', 'replaceAll', 'match', 'matchAll', 'charAt', 'charCodeAt', 'codePointAt', 'padStart', 'padEnd', 'substring', 'substr', 'normalize', 'localeCompare', 'repeat', 'search']);
const COMPARE = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken]);
const ORDER = new Set([ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken]);
const ARITH = new Set([ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken, ts.SyntaxKind.AsteriskAsteriskToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken]);

export const newNode = () => ({ fields: {}, elem: null, len: null, compares: [], typeofs: [], includes: [], truthy: false, numeric: false, string: false, array: false, called: null, inTested: false });
const UNDEF = { undefined: true };
const sameLit = (a, b) => a === b || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && a.undefined && b.undefined);
const addLit = (xs, v) => { if (!xs.some((x) => sameLit(x, v)) && xs.length < 32) xs.push(v); };

// the usage of one unit of a loaded file: { params: [node per parameter, in order], this: node|null }
export function usage(sf, unitName, checker, opts = {}) {
  const fns = topLevelFunctions(sf);
  const u = fns.get(unitName);
  if (!u) throw new Error(`no unit ${unitName}`);
  // a literal written in the source, or the literal a name or `CONST.field` is bound to in this file
  const constOf = (n) => { try {
    const sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(n) ? n.name : n); const d = sym?.valueDeclaration; if (!d) return null;
    const init = (ts.isVariableDeclaration(d) && d.parent && (d.parent.flags & ts.NodeFlags.Const)) || ts.isPropertyDeclaration(d) || ts.isPropertyAssignment(d) || ts.isEnumMember(d) ? d.initializer : null;
    return init ? litOf(init, false) : null;
  } catch { return null; } };
  function litOf(e, follow = true) {
    while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || ts.isTypeAssertionExpression(e)) e = e.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { v: e.text };
    if (ts.isNumericLiteral(e)) { const v = Number(e.text); return Number.isFinite(v) ? { v } : null; }
    if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand)) return { v: -Number(e.operand.text) };
    if (e.kind === ts.SyntaxKind.TrueKeyword) return { v: true };
    if (e.kind === ts.SyntaxKind.FalseKeyword) return { v: false };
    if (e.kind === ts.SyntaxKind.NullKeyword) return { v: null };
    if (ts.isIdentifier(e) && e.text === 'undefined') return { v: UNDEF };
    if (follow && (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e))) return constOf(e);
    return null;
  }
  const strip = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || ts.isTypeAssertionExpression(e))) e = e.expression; return e; };
  // an own field only: a read of `x.constructor` or `x.__proto__` must not answer with Object.prototype's member
  const field = (n, name) => (Object.hasOwn(n.fields, name) ? n.fields[name] : name === '__proto__' ? newNode() : (n.fields[name] = newNode()));
  const elemOf = (n) => { n.array = true; return (n.elem ??= newNode()); };
  const symOf = (id) => { try { return checker.getSymbolAtLocation(id) ?? null; } catch { return null; } };

  const roots = u.params.map(() => newNode());
  const thisNode = u.cls ? newNode() : null;
  const classMethods = new Map();
  if (u.cls) for (const [name, m] of fns) if (m.cls === u.cls && !m.isStatic && !m.accessor && m.method) classMethods.set(m.method, m);
  const visitedCallees = new Set();

  // bind a declaration name (an identifier or a binding pattern) to a node
  function bind(env, name, node) {
    if (!node || !name) return;
    if (ts.isIdentifier(name)) { const s = symOf(name); if (s) env.set(s, node); return; }
    if (ts.isObjectBindingPattern(name)) for (const el of name.elements) {
      if (el.dotDotDotToken) continue;
      const key = el.propertyName ? (ts.isIdentifier(el.propertyName) || ts.isStringLiteral(el.propertyName) ? el.propertyName.text : null) : (ts.isIdentifier(el.name) ? el.name.text : null);
      if (key == null) continue;
      const child = field(node, key);
      if (el.initializer) { const l = litOf(el.initializer); if (l) addLit(child.compares, l.v); }
      bind(env, el.name, child);
    }
    else if (ts.isArrayBindingPattern(name)) for (const el of name.elements) if (ts.isBindingElement(el) && !el.dotDotDotToken) bind(env, el.name, elemOf(node));
  }

  // the node an expression reads, when it is a chain from a root; null otherwise
  function nodeOf(e, env) {
    e = strip(e);
    if (!e) return null;
    if (ts.isIdentifier(e)) { const s = symOf(e); return s ? env.get(s) ?? null : null; }
    if (e.kind === ts.SyntaxKind.ThisKeyword) return env.get('this') ?? null;
    if (ts.isPropertyAccessExpression(e)) {
      const n = nodeOf(e.expression, env); if (!n) return null;
      if (!ts.isIdentifier(e.name)) return null;
      if (e.name.text === 'length') return (n.len ??= newNode());
      return field(n, e.name.text);
    }
    if (ts.isElementAccessExpression(e)) {
      const n = nodeOf(e.expression, env); if (!n) return null;
      const a = strip(e.argumentExpression);
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) return field(n, a.text);
      if (a && ts.isNumericLiteral(a)) return elemOf(n);
      const l = a && litOf(a); if (l && typeof l.v === 'string') return field(n, l.v);
      return null; // a computed key: the read names no field
    }
    // `x ?? d` and `x || d` read x; the default is a value x is drawn beside
    if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      const n = nodeOf(e.left, env); if (n) { n.truthy = true; addLit(n.compares, e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ? UNDEF : false); } return n;
    }
    return null;
  }

  function compare(n, lit) { if (!n || !lit) return; addLit(n.compares, lit.v); if (typeof lit.v === 'number') n.numeric = true; else if (typeof lit.v === 'string') n.string = true; }

  function walk(node, env, depth) {
    // declarations bind their names first, so later reads of the alias reach the chain
    if (ts.isVariableDeclaration(node) && node.initializer) { walk(node.initializer, env, depth); bind(env, node.name, nodeOf(node.initializer, env)); return; }
    if (ts.isForOfStatement(node)) {
      walk(node.expression, env, depth);
      const n = nodeOf(node.expression, env);
      const decl = node.initializer && ts.isVariableDeclarationList(node.initializer) ? node.initializer.declarations[0] : null;
      if (n && decl) bind(env, decl.name, elemOf(n));
      walk(node.statement, env, depth);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      const k = node.operatorToken.kind;
      if (COMPARE.has(k)) {
        const l = strip(node.left), r = strip(node.right);
        // typeof x === "object"
        for (const [a, b] of [[l, r], [r, l]]) if (ts.isTypeOfExpression(a)) { const n = nodeOf(a.expression, env); const lit = litOf(b); if (n && lit && typeof lit.v === 'string') addLit(n.typeofs, lit.v); }
        const nl = nodeOf(l, env), nr = nodeOf(r, env);
        const ll = litOf(l), lr = litOf(r);
        if (nl && lr) compare(nl, lr);
        if (nr && ll) compare(nr, ll);
        if (ORDER.has(k)) { if (nl) nl.numeric ||= !lr || typeof lr.v === 'number'; if (nr) nr.numeric ||= !ll || typeof ll.v === 'number'; }
      } else if (ARITH.has(k)) { for (const s of [node.left, node.right]) { const n = nodeOf(s, env); if (n) n.numeric = true; } }
      else if (k === ts.SyntaxKind.PlusToken) { const ll = litOf(node.left), lr = litOf(node.right); if ((ll && typeof ll.v === 'number') || (lr && typeof lr.v === 'number')) for (const s of [node.left, node.right]) { const n = nodeOf(s, env); if (n) n.numeric = true; } }
      else if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken) { for (const s of [node.left, node.right]) { const n = nodeOf(s, env); if (n) n.truthy = true; } }
      else if (k === ts.SyntaxKind.InKeyword) { const lit = litOf(node.left); const n = nodeOf(node.right, env); if (n && lit && typeof lit.v === 'string') field(n, lit.v).inTested = true; } // a key tested with `in`: its presence is what the unit reads
    }
    if (ts.isPrefixUnaryExpression(node)) { const n = nodeOf(node.operand, env); if (n) { if (node.operator === ts.SyntaxKind.ExclamationToken) n.truthy = true; else if (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) n.numeric = true; } }
    if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) { const n = nodeOf(node.expression, env); if (n) n.truthy = true; }
    if (ts.isConditionalExpression(node)) { const n = nodeOf(node.condition, env); if (n) n.truthy = true; }
    if (ts.isSwitchStatement(node)) { const n = nodeOf(node.expression, env); if (n) for (const c of node.caseBlock.clauses) if (ts.isCaseClause(c)) compare(n, litOf(c.expression)); }
    if (ts.isCallExpression(node)) call(node, env, depth);
    // a chain read anywhere names its fields (a method callee is the call's, not a field read)
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && !(ts.isCallExpression(node.parent) && strip(node.parent.expression) === node)) nodeOf(node, env);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) nodeOf(node, env);
    ts.forEachChild(node, (c) => walk(c, env, depth));
  }

  function call(node, env, depth) {
    const callee = strip(node.expression);
    const args = node.arguments;
    // Math.max(x, ...) and friends read numbers
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Math') { for (const a of args) { const n = nodeOf(a, env); if (n) n.numeric = true; } return; }
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
      const m = callee.name.text;
      // [lit, lit].includes(x): x is compared against each literal
      const recv = strip(callee.expression);
      if (m === 'includes' && ts.isArrayLiteralExpression(recv) && args[0]) { const n = nodeOf(args[0], env); if (n) for (const el of recv.elements) compare(n, litOf(el)); return; }
      const n = nodeOf(callee.expression, env);
      if (n) {
        if (ARRAY_CALLBACK.has(m) || m === 'reduce' || m === 'reduceRight') {
          const fn = strip(args[0]);
          if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) { const p = fn.parameters[m === 'reduce' || m === 'reduceRight' ? 1 : 0]; if (p) bind(env, p.name, elemOf(n)); if (m === 'sort' || m === 'toSorted') { const q = fn.parameters[1]; if (q) bind(env, q.name, elemOf(n)); } }
          else elemOf(n);
        } else if (ARRAY_ONLY.has(m)) n.array = true;
        else if (STRING_ONLY.has(m)) { n.string = true; if ((m === 'startsWith' || m === 'endsWith') && args[0]) { const l = litOf(args[0]); if (l && typeof l.v === 'string') addLit(n.includes, l.v); } }
        else if (m === 'includes' || m === 'indexOf' || m === 'lastIndexOf') { const l = args[0] && litOf(args[0]); if (l) { addLit(n.includes, l.v); compare(elemOf(n), l); } }
        else if (m === 'slice' || m === 'at' || m === 'concat') { /* a string or an array: the read says no more */ }
        else if (m === 'has' || m === 'get' || m === 'set' || m === 'delete') { /* a Map or a Set: no field */ }
        else { const f = field(n, m); f.called = Math.max(f.called ?? 0, args.length); }
      }
      // this.method(...) of the unit's own class, one level down
      if (ts.isPropertyAccessExpression(callee) && strip(callee.expression).kind === ts.SyntaxKind.ThisKeyword && classMethods.has(m)) into(classMethods.get(m), args, env, depth, true);
      return;
    }
    const n = nodeOf(callee, env);
    if (n) { n.called = Math.max(n.called ?? 0, args.length); return; }
    // a same-file top-level function, one level down
    if (ts.isIdentifier(callee)) { const g = fns.get(callee.text); if (g && !g.cls && g.body) into(g, args, env, depth, false); }
  }

  // a same-file callee: its parameters bound to the argument chains, its body read once, never deeper than one level
  function into(g, args, env, depth, method) {
    if (depth >= 1 || !g.body || g === u || visitedCallees.has(g)) return;
    const env2 = new Map();
    if (method && env.get('this')) env2.set('this', env.get('this'));
    let bound = false;
    g.params.forEach((p, i) => { const n = args[i] && nodeOf(args[i], env); if (n) { bind(env2, p.name, n); bound = true; } });
    if (!bound && !env2.has('this')) return;
    visitedCallees.add(g);
    walk(g.body, env2, depth + 1);
  }

  const env = new Map();
  u.params.forEach((p, i) => bind(env, p.name, roots[i]));
  // a caller may name local identifiers of the unit (a parsed value, a `let` without a type) as extra roots, read like parameters
  const extraRoots = (opts.roots ?? []).filter((id) => id && ts.isIdentifier(id));
  const localNodes = extraRoots.map(() => newNode());
  extraRoots.forEach((id, i) => bind(env, id, localNodes[i]));
  if (thisNode) env.set('this', thisNode);
  if (u.body) walk(u.body, env, 0);
  const out = { unit: unitName, params: u.params.map((p, i) => ({ name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf), node: roots[i] })), this: thisNode };
  if (extraRoots.length) out.locals = extraRoots.map((id, i) => ({ name: id.text, node: localNodes[i] }));
  return out;
}

// the union of two usage trees of one unit (the parent's and the candidate's): a field either side reads, a literal
// either side compares against
export function mergeNodes(a, b) {
  if (!a) return b; if (!b) return a;
  const o = newNode();
  for (const k of new Set([...Object.keys(a.fields), ...Object.keys(b.fields)])) o.fields[k] = mergeNodes(a.fields[k], b.fields[k]);
  o.elem = mergeNodes(a.elem, b.elem); o.len = mergeNodes(a.len, b.len);
  for (const key of ['compares', 'typeofs', 'includes']) { for (const v of a[key]) addLit(o[key], v); for (const v of b[key]) addLit(o[key], v); }
  for (const key of ['truthy', 'numeric', 'string', 'array', 'inTested']) o[key] = a[key] || b[key];
  o.called = a.called == null ? b.called : b.called == null ? a.called : Math.max(a.called, b.called);
  return o;
}
export function mergeUsage(a, b) {
  if (!a) return b; if (!b) return a;
  const byName = new Map(b.params.map((p) => [p.name, p.node]));
  const out = { unit: a.unit, params: a.params.map((p, i) => ({ name: p.name, node: mergeNodes(p.node, byName.get(p.name) ?? b.params[i]?.node ?? null) })), this: mergeNodes(a.this, b.this) };
  if (a.locals || b.locals) { const bl = new Map((b.locals ?? []).map((l) => [l.name, l.node])); const names = [...new Set([...(a.locals ?? []).map((l) => l.name), ...bl.keys()])]; const al = new Map((a.locals ?? []).map((l) => [l.name, l.node])); out.locals = names.map((name) => ({ name, node: mergeNodes(al.get(name) ?? null, bl.get(name) ?? null) })); }
  return out;
}

if (process.argv[1] && new URL(import.meta.url).pathname === (await import('node:path')).resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const { sf, checker } = loadProgram(a[0], { project: a.includes('--no-project') ? false : true });
  console.log(JSON.stringify(usage(sf, a[a.indexOf('--unit') + 1], checker), null, 1));
}
