// The decorator contract table (translate/decorators.json, research 2026-10-27 section 1): a framework decorator,
// keyed by its package and export, read by the wrapper relation its row names, and the metadata APIs read as one
// cell of the world keyed by (key, target). This module is the table's reader for the lint, the translator and lane
// B, beside the two prototype idioms read exactly on records (the plain-object test and the own-key test).
//
// The readings it serves:
//   a guard row      the call runs only when each guard answers true: an uninterpreted verdict (a transition of the
//                    world in an effectful unit), the body under it, an uninterpreted denial otherwise
//   a pipe row       the parameter is the pipe's result: an uninterpreted function of the extracted value
//   a metadata read  a transition of the world and of the file's decoration (every decorator of the file, by its
//                    text and the text of the same-file declarations it names): a decorator changed anywhere in the
//                    file changes what every reader of the file reads
//   a metadata write a transition of the world
// Every guard, pipe and decoration is named by a sha256 of its text and of its same-file closure, never by a short
// hash: two different guards named alike would be one function, and a proof over it would be unsound.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ts } from './common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let table = null;
// LEAN_DECORATOR_TABLE names another table (a contradicted row, for the negative check)
export function decoratorTable() { if (!table) table = JSON.parse(fs.readFileSync(process.env.LEAN_DECORATOR_TABLE || path.join(here, 'translate/decorators.json'), 'utf8')); return table; }
const allRows = () => [...decoratorTable().decorators, ...decoratorTable().metadata];
export const rowById = (id) => allRows().find((r) => r.id === id) ?? null;
// a row's fixture status: the table's own, or the harness runner's results (LEAN_DECORATOR_FIXTURES names its --out
// file, {rows: {id: agree | disagree | pending}}); a disagreement in either is a contradiction
let fixtureResults;
const fixtureResultsOf = () => { if (fixtureResults === undefined) { try { fixtureResults = process.env.LEAN_DECORATOR_FIXTURES ? JSON.parse(fs.readFileSync(process.env.LEAN_DECORATOR_FIXTURES, 'utf8')).rows ?? {} : {}; } catch { fixtureResults = {}; } } return fixtureResults; };
export const rowStatus = (id) => (fixtureResultsOf()[id] === 'disagree' || rowById(id)?.fixture?.status === 'disagree' ? 'disagree' : fixtureResultsOf()[id] ?? rowById(id)?.fixture?.status ?? 'pending');
// a row whose fixture the real framework contradicts: the proof lane withholds every reading that used it
export const rowContradicted = (id) => rowStatus(id) === 'disagree';

const fold = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const unparen = (x) => { while (x && (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x))) x = x.expression; return x; };

// the package export an identifier is bound to by a named import, or null
export function importOf(checker, id) {
  if (!id || !ts.isIdentifier(id)) return null;
  const sym = checker.getSymbolAtLocation(id); const d = sym?.declarations?.[0];
  if (!d || !ts.isImportSpecifier(d)) return null;
  let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
  if (!imp || !ts.isStringLiteral(imp.moduleSpecifier)) return null;
  return { pkg: imp.moduleSpecifier.text, name: (d.propertyName ?? d.name).text };
}
// a global the file does not declare or import (Reflect, Object)
export function isGlobal(checker, id, sf) {
  if (!id || !ts.isIdentifier(id)) return false;
  const sym = checker.getSymbolAtLocation(id); if (!sym) return true;
  return !(sym.declarations ?? []).some((d) => d.getSourceFile() === sf || ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d));
}
const decoratorsOf = (n) => (ts.canHaveDecorators && ts.canHaveDecorators(n) ? (ts.getDecorators(n) ?? []) : []);

// the row of a decorator (`@X(...)` or `@X`, X imported from the row's package under the row's export)
export function decoratorRow(checker, dec) {
  const e = dec.expression; const call = ts.isCallExpression(e) ? e : null; const callee = call ? call.expression : e;
  const imp = importOf(checker, callee); if (!imp) return null;
  const row = allRows().find((r) => r.package === imp.pkg && r.export === imp.name);
  return row ? { row, args: call ? [...call.arguments] : [], call } : null;
}

// Decorators read as metadata (design/heap-stage5.md step 20): a decorator runs once, when its class is defined, and its
// result may replace what it decorates (TypeScript's legacy __decorate and the ECMAScript decorators alike): a class
// decorator's result is the class the binding holds, a method or accessor decorator's result the member's descriptor
// (an accessor pair is one property, so a decorator on either half replaces both). So the member `name` (static or not)
// of an instance or of the class cls is not its declared text when cls or a class it extends is decorated, or when a
// member of that name on that chain carries a replacing decorator. A parameter decorator's result is discarded, so it
// never replaces. A decorator of the table whose row says the body is unchanged (vocabulary: no listed decorator
// replaces it) is metadata while its fixture does not contradict the row; any other decorator may replace.
export const replacingDecorator = (checker, dec) => { const r = decoratorRow(checker, dec); return !(r && r.row.body === 'unchanged' && !rowContradicted(r.row.id)); };
export const replacinglyDecorated = (checker, n) => decoratorsOf(n).some((d) => replacingDecorator(checker, d));
export function decoratorMayReplace(checker, cls, name, isStatic = false) {
  const K = ts.SyntaxKind;
  const decorated = (n) => replacinglyDecorated(checker, n);
  const own = (m) => m.name && !ts.isComputedPropertyName(m.name) && m.name.text === name && !!m.modifiers?.some((x) => x.kind === K.StaticKeyword) === isStatic && (ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m) || ts.isPropertyDeclaration(m));
  for (let c = cls, seen = new Set(); c && !seen.has(c); ) {
    seen.add(c);
    if (decorated(c) || c.members.some((m) => own(m) && decorated(m))) return true;
    const ext = c.heritageClauses?.find((h) => h.token === K.ExtendsKeyword)?.types[0]?.expression;
    const d = ext && checker.getSymbolAtLocation(ext)?.valueDeclaration;
    c = d && ts.isClassLike(d) ? d : null;
  }
  return false;
}
// ---------- the closure of a node: its text and the text of every same-file top-level declaration it names ----------
function topStatementOf(d, sf) { let x = d; while (x && x.parent && x.parent !== sf) x = x.parent; return x && x.parent === sf ? x : null; }
export function closureKey(checker, sf, node, extra = '') {
  const seen = new Set(); const texts = [];
  const visit = (n) => {
    const w = (x) => {
      if (ts.isIdentifier(x)) {
        const sym = checker.getSymbolAtLocation(x);
        for (const d of sym?.declarations ?? []) {
          if (d.getSourceFile() !== sf || ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d)) continue;
          const st = topStatementOf(d, sf); if (!st || seen.has(st) || st.pos <= n.pos && n.end <= st.end) continue; // the statement that holds the node is the node's own text
          seen.add(st); texts.push([st.pos, fold(st.getText(sf))]); visit(st);
        }
      }
      ts.forEachChild(x, w);
    };
    w(n);
  };
  visit(node);
  texts.sort((a, b) => a[0] - b[0]);
  return sha(`${fold(node.getText(sf))}\n${extra}\n${texts.map((t) => t[1]).join('\n')}`);
}

// ---------- the file's decoration: every decorator site of the file and every top-level statement that runs at load ----------
// sorted [key, value] pairs; the value is the decorator's text and the sha of its closure. A metadata read takes it as
// an argument, so a decorator changed anywhere in the file (listed or not, a metadata writer or not) changes the read.
export function decorationTable(checker, sf) {
  const out = [];
  const add = (key, dec) => out.push([key, `${fold(dec.getText(sf))}#${closureKey(checker, sf, dec)}`]);
  sf.statements.forEach((st, si) => {
    if (ts.isExpressionStatement(st)) out.push([`init|${si}`, `${fold(st.getText(sf))}#${closureKey(checker, sf, st)}`]); // module initialisation: it may write a cell
    if (!ts.isClassDeclaration(st)) return;
    const cls = st.name ? st.name.text : `class${si}`;
    decoratorsOf(st).forEach((d, i) => add(`${cls}||${i}`, d));
    for (const m of st.members) {
      const mname = m.name && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name) || ts.isPrivateIdentifier(m.name)) ? m.name.text : ts.isConstructorDeclaration(m) ? 'constructor' : `member${st.members.indexOf(m)}`;
      decoratorsOf(m).forEach((d, i) => add(`${cls}|${mname}|${i}`, d));
      for (const [pi, p] of (m.parameters ?? []).entries()) decoratorsOf(p).forEach((d, i) => add(`${cls}|${mname}#${pi}|${i}`, d));
    }
  });
  return out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

// ---------- the route wrapper of a method unit: its guards (class first, then method) and its pipes per parameter ----------
// { guards: [{ row, key, node }], pipes: Map<index, [{ row, key, node }]>, rows: [row ids], unreadable: reason | null }
export function routeWrapper(checker, sf, u) {
  const out = { guards: [], pipes: new Map(), rows: [], unreadable: null };
  if (!u || !u.cls || u.isCtor || u.isStatic || u.accessor) return out;
  const use = (id) => { if (!out.rows.includes(id)) out.rows.push(id); };
  const guardsOf = (decs) => {
    for (const d of [...decs].reverse()) { // decorators apply bottom up: the lowest UseGuards extends the list first
      const r = decoratorRow(checker, d); if (!r || r.row.kind !== 'guard') continue;
      use(r.row.id);
      for (const a of r.args) { if (ts.isSpreadElement(a)) { out.unreadable = `a spread guard list in ${fold(d.getText(sf))}`; continue; } out.guards.push({ row: r.row.id, key: closureKey(checker, sf, a), node: a }); }
    }
  };
  guardsOf(decoratorsOf(u.cls));
  guardsOf(decoratorsOf(u.fn));
  u.params.forEach((p, i) => {
    for (const d of decoratorsOf(p)) {
      const r = decoratorRow(checker, d); if (!r || r.row.kind !== 'pipe') continue;
      const args = [...r.args];
      if (args.length && (ts.isStringLiteral(unparen(args[0])) || ts.isNoSubstitutionTemplateLiteral(unparen(args[0])) || (checker.getTypeAtLocation(args[0]).flags & ts.TypeFlags.StringLike))) args.shift(); // the extracted property's name
      if (!args.length) continue;
      use(r.row.id);
      const list = out.pipes.get(i) ?? [];
      // a pipe's meaning may depend on the parameter's declared type (a validation pipe reads it): the type's text and closure join the key
      const typeKey = p.type ? `${fold(p.type.getText(sf))}#${closureKey(checker, sf, p.type)}` : '';
      for (const a of args) { if (ts.isSpreadElement(a)) { out.unreadable = `a spread pipe list in ${fold(d.getText(sf))}`; continue; } list.push({ row: r.row.id, key: closureKey(checker, sf, a, typeKey), node: a }); }
      out.pipes.set(i, list);
    }
  });
  return out;
}

// ---------- the metadata APIs at a call ----------
// `Reflect.getMetadata(key, target)` and `Reflect.defineMetadata(key, value, target)` on the global Reflect, with the
// row's arity; `<r>.get(key, target)` and the read family on a receiver declared with the type Reflector imported from
// @nestjs/core. { row, op: 'read' | 'write', api, method, args } or null (anything else of Reflect stays refused).
function declaredTypeImport(checker, recv) {
  const sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(recv) ? recv.name : recv); const d = sym?.valueDeclaration ?? sym?.declarations?.[0];
  if (!d || !(ts.isPropertyDeclaration(d) || ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isPropertySignature(d)) || !d.type || !ts.isTypeReferenceNode(d.type) || !ts.isIdentifier(d.type.typeName)) return null;
  return importOf(checker, d.type.typeName);
}
export function metadataCall(checker, n, sf) {
  if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return null;
  const f = n.expression, recv = unparen(f.expression), name = f.name.text;
  if (ts.isIdentifier(recv) && recv.text === 'Reflect' && isGlobal(checker, recv, sf)) {
    const row = decoratorTable().metadata.find((r) => r.export === `Reflect.${name}`);
    if (!row || n.arguments.length !== row.arity || n.arguments.some(ts.isSpreadElement)) return null;
    return { row, op: row.op, api: `Reflect.${name}`, method: name, args: [...n.arguments] };
  }
  const imp = (ts.isIdentifier(recv) || (ts.isPropertyAccessExpression(recv) && recv.expression.kind === ts.SyntaxKind.ThisKeyword)) ? declaredTypeImport(checker, recv) : null;
  if (!imp) return null;
  for (const row of decoratorTable().metadata) {
    const via = (row.via ?? []).find((x) => x.package === imp.pkg && x.export === imp.name && x.method === name);
    if (via && n.arguments.length === via.arity && !n.arguments.some(ts.isSpreadElement)) return { row, op: row.op, api: `${imp.name}.${name}`, method: name, exact: true, args: [...n.arguments] };
    const fam = (row.family ?? []).find((x) => x.package === imp.pkg && x.export === imp.name && x.method === name);
    if (fam && n.arguments.length === 2 && !n.arguments.some(ts.isSpreadElement)) return { row, op: row.op, api: `${imp.name}.${name}`, method: name, exact: false, args: [...n.arguments] };
  }
  return null;
}

// ---------- the two prototype idioms, exact on records ----------
// a record: an object type of declared data properties (an interface, a type literal, an object literal's type), not a
// class instance, a built-in, a callable or a dictionary. The record invariant lean's value reading already holds: a
// record value is a plain object whose own keys are its declared keys.
const BUILTINS = new Set(['Date', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'RegExp', 'Error', 'Array', 'ReadonlyArray', 'Function', 'Object', 'Number', 'String', 'Boolean', 'Symbol']);
export function recordKeys(checker, t) {
  if (!t || t.flags & (ts.TypeFlags.Union | ts.TypeFlags.Intersection) || !(t.flags & ts.TypeFlags.Object)) return null;
  if (checker.isArrayType(t) || checker.isTupleType(t)) return null;
  if (checker.getSignaturesOfType(t, ts.SignatureKind.Call).length || checker.getSignaturesOfType(t, ts.SignatureKind.Construct).length) return null;
  const sym = t.symbol ?? t.aliasSymbol;
  if (sym && (sym.flags & ts.SymbolFlags.Class || BUILTINS.has(sym.name))) return null;
  if (checker.getIndexInfoOfType(t, ts.IndexKind.String) || checker.getIndexInfoOfType(t, ts.IndexKind.Number)) return null;
  const props = checker.getPropertiesOfType(t);
  if (!props.length) return null;
  if (props.some((p) => (p.declarations ?? []).some((d) => ts.isMethodSignature(d) || ts.isMethodDeclaration(d) || ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)))) return null;
  return props.map((p) => ({ name: p.name, optional: !!(p.flags & ts.SymbolFlags.Optional) }));
}
export function isDictionary(checker, t) {
  if (!t || t.flags & (ts.TypeFlags.Union | ts.TypeFlags.Intersection) || !(t.flags & ts.TypeFlags.Object)) return false;
  return !!checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getPropertiesOfType(t).length;
}
// a pure path: a name, or field reads of a name (no call, no index)
const purePath = (x) => { x = unparen(x); while (ts.isPropertyAccessExpression(x)) x = unparen(x.expression); return ts.isIdentifier(x) || x.kind === ts.SyntaxKind.ThisKeyword; };
const isObjectMember = (checker, sf, x, member) => { x = unparen(x); return ts.isPropertyAccessExpression(x) && x.name.text === member && ts.isIdentifier(unparen(x.expression)) && unparen(x.expression).text === 'Object' && isGlobal(checker, unparen(x.expression), sf); };
// `Object.getPrototypeOf(x) === Object.prototype` (or `!==`, `==`, `!=`, either order) with x a record: { subject,
// value } (the test's value on a record), { refuse } when the shape matches on a non-record, or null. A comparison
// with `null` is no part of the idiom and stays refused: it asks for an object made without a prototype
export function plainObjectTest(checker, n, sf) {
  if (!ts.isBinaryExpression(n)) return null;
  const op = n.operatorToken.kind, K = ts.SyntaxKind;
  if (![K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(op)) return null;
  const protoCall = (x) => { x = unparen(x); return ts.isCallExpression(x) && x.arguments.length === 1 && !ts.isSpreadElement(x.arguments[0]) && isObjectMember(checker, sf, x.expression, 'getPrototypeOf') ? x : null; };
  const pc = protoCall(n.left) ?? protoCall(n.right); if (!pc) return null;
  const other = unparen(protoCall(n.left) ? n.right : n.left);
  if (!isObjectMember(checker, sf, other, 'prototype')) return null;
  const subject = pc.arguments[0];
  if (!purePath(subject)) return { refuse: 'the plain-object test reads a named value; bind the expression to a const first' };
  if (!recordKeys(checker, checker.getTypeAtLocation(subject))) return { refuse: 'the plain-object test is read exactly on a record value (declared data fields); on any other type the prototype chain stays outside the subset' };
  const positive = op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken;
  return { subject, value: positive };
}
// `Object.prototype.hasOwnProperty.call(o, k)`: { obj, key, kind: 'dict' } on a dictionary, { obj, key, kind:
// 'record', keys } on a record whose fields are all required, { refuse } otherwise, null when the shape does not match
export function ownKeyTest(checker, n, sf) {
  if (!ts.isCallExpression(n)) return null;
  const f = unparen(n.expression);
  if (!ts.isPropertyAccessExpression(f) || f.name.text !== 'call') return null;
  const h = unparen(f.expression);
  if (!ts.isPropertyAccessExpression(h) || h.name.text !== 'hasOwnProperty' || !isObjectMember(checker, sf, h.expression, 'prototype')) return null;
  if (n.arguments.length !== 2 || n.arguments.some(ts.isSpreadElement)) return { refuse: '`Object.prototype.hasOwnProperty.call` takes the object and one key' };
  const [obj, key] = n.arguments;
  if (!purePath(obj)) return { refuse: 'the own-key test reads a named value; bind the object to a const first' };
  if (!(checker.getTypeAtLocation(key).flags & ts.TypeFlags.StringLike)) return { refuse: 'the own-key test is read exactly for a string key' };
  const t = checker.getTypeAtLocation(obj);
  if (isDictionary(checker, t)) return { obj, key, kind: 'dict' };
  const keys = recordKeys(checker, t);
  if (keys && keys.every((k) => !k.optional)) return { obj, key, kind: 'record', keys: keys.map((k) => k.name) };
  return { refuse: 'the own-key test is read exactly on a dictionary or on a record whose fields are all required; an optional field may be absent or present as undefined' };
}
