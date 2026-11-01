// The callee census (design/w2a-callee-census.md, 2026-11-01): per unit the calls whose target lies outside the file, keyed
// by the module (or `global`) and the member path, with their count; per refused unit whether every refusal it carries
// names such a call that translate/library.json has no row for (the unit's only blocker is an unmodelled call); and the
// ranked table over one census or many: callee -> units blocked only by it, units calling it. The table is the build order
// of the world library (W2): an entry that removes every refusal of a unit is ranked by the units it alone would let in.
//
// A callee's key, read off the call site first and the declaration second:
//   1. the callee is an access path (`a.b.c`) whose root is an import: the import's module (a Node built-in written
//      `node:<name>`, a package by its name, a file of the project by its path from the root) and the path below the
//      binding (`fs.readFileSync` of `import fs from 'node:fs'` is `node:fs readFileSync`; `readFileSync` of
//      `import { readFileSync } from 'fs'` is the same key);
//   2. the root is a global (declared only outside the project's sources and outside this file): `global` and the path
//      (`global JSON.parse`, `global fetch`, `global new Date`);
//   3. otherwise the declaration the checker resolves the call to: its module (an ambient `declare module "x"`, the
//      package whose folder holds the declaration, `global` for the language's and the host's own declaration files, the
//      project file) and its containers (`Array.prototype.push`, `Map.prototype.get`, `Client.prototype.send`, `Object.keys`).
// A call whose target is declared in the file itself is no outside callee. A call the checker resolves to nothing and whose
// root names no import or global (a method of an `any` value) is keyed `(untyped)` by its last name.
// The origin says whose the callee is: `ecmascript` (lib.es*), `web` (lib.dom, lib.webworker), `node` (a Node built-in,
// @types/node), `package`, `project` (a source file of the repository), `untyped`, `unresolved` (a name nothing declares).
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ts } from './common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// the library table's operations, read once: `Array.prototype.push`, `new Date / Date.prototype.set*`
export const LIBRARY_OPS = JSON.parse(fs.readFileSync(path.join(here, 'translate', 'library.json'), 'utf8')).operations.map((o) => o.op);
const opPatterns = (ops) => ops.flatMap((op) => op.split(' / ')).map((p) => new RegExp('^' + p.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[A-Za-z0-9_$]*') + '$'));
let LIBRARY = opPatterns(LIBRARY_OPS);
// tests only: read another library table (the --break variant reads an empty one)
export function useLibraryOps(ops) { LIBRARY = opPatterns(ops); }
// a callee has a row when it is the language's own (`global`) and its member path matches an operation of the table
export const inLibrary = (c) => c.module === 'global' && LIBRARY.some((re) => re.test(c.member));

const NODE = new Set(builtinModules.map((m) => m.replace(/^node:/, '')));
const nodeName = (spec) => { const s = spec.replace(/^node:/, ''); return NODE.has(s) || NODE.has(s.split('/')[0]) ? `node:${s}` : null; };
// the package a declaration file belongs to: the last node_modules folder of its path; @types/x is x, @types/a__b is @a/b
function packageOfFile(file) {
  const parts = file.split(/[\\/]/), i = parts.lastIndexOf('node_modules');
  if (i < 0) return null;
  let name = parts[i + 1]?.startsWith('@') ? `${parts[i + 1]}/${parts[i + 2]}` : parts[i + 1];
  if (name?.startsWith('@types/')) { const t = name.slice(7); name = t.includes('__') ? `@${t.replace('__', '/')}` : t; }
  return name ?? null;
}
const LIB_FILE = /[\\/]typescript[\\/]lib[\\/]lib\.[^\\/]*\.d\.ts$/;
const WEB_LIB = /[\\/]lib\.(dom|webworker|scripthost)[^\\/]*\.d\.ts$/;
// a module specifier as the table names it
function moduleName(spec, fromFile, root) {
  const n = nodeName(spec); if (n) return { module: n, origin: 'node' };
  if (spec.startsWith('.') || path.isAbsolute(spec)) return { module: path.relative(root, path.resolve(path.dirname(fromFile), spec)).split(path.sep).join('/'), origin: 'project' };
  return { module: spec, origin: 'package' };
}
// the owner of a declaration file: the language, the host, Node, a package or the project
function originOfFile(file) {
  if (LIB_FILE.test(file)) return WEB_LIB.test(file) ? 'web' : 'ecmascript';
  const p = packageOfFile(file);
  if (p === 'node' || p === 'undici-types') return 'node';
  return p ? 'package' : 'project';
}
const unwrap = (x) => { while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x)) x = x.expression; return x; };
// the access path of a callee, root first, or null when a step is not a plain name (a call, an element, `this`)
function accessPath(e) {
  const names = [];
  e = unwrap(e);
  while (ts.isPropertyAccessExpression(e)) { names.unshift(e.name.text); e = unwrap(e.expression); }
  return ts.isIdentifier(e) ? { root: e, names } : null;
}
const importSpecOf = (d) => {
  let p = d; while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p)) p = p.parent;
  const spec = p && (ts.isImportEqualsDeclaration(p) ? (ts.isExternalModuleReference(p.moduleReference) ? p.moduleReference.expression : null) : p.moduleSpecifier);
  return spec && ts.isStringLiteral(spec) ? spec : null;
};
// the member path of a declaration inside its module: its containers' names, `X.prototype.m` for an instance member of a
// class or an interface (`XConstructor` and a ReadonlyX of the language read as X, so `Array.from` and
// `Array.prototype.map` are the table's names), and the ambient module it sits in, if any
function declarationPath(d) {
  const names = []; let ambient = null, instance = false;
  const name = d.name && (ts.isIdentifier(d.name) || ts.isStringLiteral(d.name) || ts.isPrivateIdentifier(d.name)) ? d.name.text : ts.isConstructorDeclaration(d) || ts.isConstructSignatureDeclaration(d) ? 'constructor' : null;
  if (name) names.push(name);
  const member = ts.isMethodDeclaration(d) || ts.isMethodSignature(d) || ts.isPropertyDeclaration(d) || ts.isPropertySignature(d) || ts.isGetAccessor(d);
  const isStatic = (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Static) !== 0;
  for (let p = d.parent; p; p = p.parent) {
    if (ts.isClassLike(p) || ts.isInterfaceDeclaration(p)) {
      let n = p.name?.text ?? '(anonymous)';
      const lib = LIB_FILE.test(p.getSourceFile().fileName);
      if (lib && /Constructor$/.test(n)) n = n.replace(/Constructor$/, '');
      else if (member && !isStatic && names.length === 1) instance = true;
      if (lib) n = n.replace(/^Readonly(?=Array|Map|Set)/, '');
      if (instance && names.length === 1) names.unshift('prototype');
      names.unshift(n);
    } else if (ts.isModuleDeclaration(p)) {
      if (ts.isStringLiteral(p.name)) { ambient = p.name.text; break; }
      if (p.name.text !== 'global') names.unshift(p.name.text);
    }
  }
  return { ambient, member: names.join('.') };
}
// the callee of a call, a `new` or a tagged template: { module, member, origin } or null when its target is in the file
export function calleeOf(checker, sf, call, root) {
  const isNew = ts.isNewExpression(call);
  const callee = ts.isTaggedTemplateExpression(call) ? call.tag : call.expression;
  const prefix = isNew ? 'new ' : '';
  const p = accessPath(callee);
  if (p) {
    const s = checker.getSymbolAtLocation(p.root);
    if (s && (s.flags & ts.SymbolFlags.Alias)) { // rule 1: an import
      const d = s.declarations?.[0], specNode = d && importSpecOf(d);
      if (specNode) {
        // the module the import resolves to: a source file of the repository (a relative import, a workspace package
        // linked to its sources) is the project's, named by its path from the root
        const target = checker.getSymbolAtLocation(specNode)?.declarations?.[0]?.getSourceFile();
        const m = target && !nodeName(specNode.text) && !target.isDeclarationFile && originOfFile(target.fileName) === 'project'
          ? { module: path.relative(root, target.fileName).split(path.sep).join('/'), origin: 'project' }
          : moduleName(specNode.text, sf.fileName, root);
        // a named import names its member; a default or a namespace import is the module itself
        const own = ts.isImportSpecifier(d) ? [(d.propertyName ?? d.name).text] : [];
        const names = [...own, ...p.names];
        return { ...m, member: prefix + (names.join('.') || (ts.isImportClause(d) ? 'default' : '(module)')) };
      }
    }
    const decls = s?.declarations ?? [];
    if (!s) { // a name nothing declares
      return { module: 'global', member: prefix + [p.root.text, ...p.names].join('.'), origin: 'unresolved' };
    }
    if (decls.length && decls.every((d) => d.getSourceFile() !== sf && d.getSourceFile().isDeclarationFile && originOfFile(d.getSourceFile().fileName) !== 'project' && !ts.isParameter(d))) { // rule 2: a global
      const amb = declarationPath(decls[0]).ambient;
      if (!amb) return { module: 'global', member: prefix + [p.root.text, ...p.names].join('.'), origin: originOfFile(decls[0].getSourceFile().fileName) };
    }
  }
  // rule 3: the declaration the call resolves to
  let d = checker.getResolvedSignature(call)?.declaration;
  if (!d || ts.isJSDocSignature?.(d)) {
    const at = ts.isPropertyAccessExpression(unwrap(callee)) ? unwrap(callee).name : unwrap(callee);
    let s = checker.getSymbolAtLocation(at);
    if (s && (s.flags & ts.SymbolFlags.Alias)) s = checker.getAliasedSymbol(s);
    d = s?.valueDeclaration ?? s?.declarations?.[0];
  }
  if (!d) {
    const e = unwrap(callee), last = ts.isPropertyAccessExpression(e) ? e.name.text : ts.isIdentifier(e) ? e.text : null;
    return last ? { module: '(untyped)', member: prefix + last, origin: 'untyped' } : null;
  }
  const dsf = d.getSourceFile();
  if (dsf === sf) return null;
  const { ambient, member } = declarationPath(ts.isConstructorDeclaration(d) && d.parent ? d.parent : d);
  const origin = originOfFile(dsf.fileName);
  const m = ambient && !ambient.startsWith('.') ? moduleName(ambient, dsf.fileName, root)
    : origin === 'project' ? { module: path.relative(root, dsf.fileName).split(path.sep).join('/'), origin }
    : origin === 'ecmascript' || origin === 'web' || (!ts.isExternalModule(dsf) && !ambient) ? { module: 'global', origin }
    : { module: nodeName(packageOfFile(dsf.fileName) ?? '') ?? packageOfFile(dsf.fileName), origin };
  return { ...m, origin: m.origin === 'project' ? 'project' : origin === 'node' || m.origin === 'node' ? 'node' : origin, member: prefix + (member || '(anonymous)') };
}
export const calleeKey = (c) => `${c.module} ${c.member}`;
const isCall = (n) => ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n);
const strip = (n) => { while (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isAwaitExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isTypeAssertionExpression(n)) n = n.expression; return n; };
// the call a value a finding names stands for: the value is the call (under parentheses, `!`, `await` and assertions), or
// the value is the call's callee. A value that merely holds a call inside it (a statement `on && (n = f())` refused for
// its form) names no call: the refusal judged the larger value, which no library entry changes.
export function namedCall(n) {
  const s = strip(n);
  if (isCall(s)) return s;
  let c = n; while (c.parent && (ts.isParenthesizedExpression(c.parent) || ts.isNonNullExpression(c.parent))) c = c.parent;
  const p = c.parent;
  if (p && (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.expression === c) return p;
  if (p && ts.isTaggedTemplateExpression(p) && p.tag === c) return p;
  return null;
}
// per unit of the file, its outside callees and their counts: unit -> Map(key -> { callee, calls }); a call belongs to
// the innermost unit holding it (a callback is a unit of its own)
export function unitCallees(checker, sf, inventory, root) {
  const byNode = new Map([...inventory.values()].map((u) => [u.node, u]));
  const out = new Map();
  const visit = (n, unit) => {
    const u = byNode.get(n); if (u) unit = u;
    if (unit && isCall(n)) {
      let c = null; try { c = calleeOf(checker, sf, n, root); } catch { c = null; }
      if (c) {
        const m = out.get(unit.name) ?? new Map(), k = calleeKey(c), e = m.get(k) ?? { callee: c, calls: 0 };
        e.calls++; m.set(k, e); out.set(unit.name, m);
      }
    }
    ts.forEachChild(n, (x) => visit(x, unit));
  };
  visit(sf, null);
  return out;
}
// tests only (tests/census_callees.mjs --break): attribute a refusal to every call inside the values it names, the
// containment namedCall replaces
let CONTAINMENT = false;
export function attributeByContainment(on) { CONTAINMENT = !!on; }
const callsInside = (n) => { const out = []; const w = (x) => { if (isCall(x)) out.push(x); if (!ts.isFunctionLike(x)) ts.forEachChild(x, w); }; w(n); return out; };
// the unmodelled outside callees a finding names (namedValues of census.mjs): keys of calls outside the file with no row
export function findingCallees(checker, sf, values, root) {
  const keys = new Map();
  for (const n of values) {
    for (const call of CONTAINMENT ? callsInside(n) : [namedCall(n)]) {
      if (!call) continue;
      let c = null; try { c = calleeOf(checker, sf, call, root); } catch { c = null; }
      if (c && !inLibrary(c)) keys.set(calleeKey(c), c);
    }
  }
  return keys;
}

// ---- the ranked table, over the records of one census or of many ----
// A record carries `callees: { <unit>: [[module, member, origin, calls], ...] }` and `calleeBlocked: { <unit>: { keys:
// [<key>, ...], rules: [<rule>, ...] } }` for each unit whose every refusal names an unmodelled outside call. A unit is
// blocked only by C when C is the one key its refusals name; a unit whose refusals name several keys needs them all.
export function calleeTable(results, { top = 50, includeOrigins = null } = {}) {
  const rows = new Map(); // key -> row
  const row = (key, module, member, origin) => { let r = rows.get(key); if (!r) rows.set(key, r = { key, module, member, origin, callers: 0, calls: 0, onlyBy: 0, among: 0, rules: {} }); return r; };
  let units = 0, refused = 0, calleeOnly = 0, multi = 0, roots = 0;
  const blockedSets = [];
  for (const res of results) {
    roots++; units += res.units ?? 0; refused += (res.units ?? 0) - (res.entered ?? 0);
    for (const rec of res.records ?? []) {
      const origins = new Map();
      for (const list of Object.values(rec.callees ?? {})) for (const [module, member, origin, calls] of list) { const r = row(`${module} ${member}`, module, member, origin); r.callers++; r.calls += calls; origins.set(r.key, origin); }
      for (const [, b] of Object.entries(rec.calleeBlocked ?? {})) {
        calleeOnly++; if (b.keys.length > 1) multi++;
        blockedSets.push(b.keys);
        for (const [i, k] of b.keys.entries()) {
          const [module, ...rest] = k.split(' ');
          const r = rows.get(k) ?? row(k, module, rest.join(' '), b.origins?.[i] ?? origins.get(k) ?? 'unknown');
          r.among++; if (b.keys.length === 1) r.onlyBy++;
          for (const rule of b.rules) r.rules[rule] = (r.rules[rule] ?? 0) + 1;
        }
      }
    }
  }
  const keep = (r) => !includeOrigins || includeOrigins.includes(r.origin);
  const ranked = [...rows.values()].filter(keep).sort((a, b) => b.onlyBy - a.onlyBy || b.among - a.among || b.callers - a.callers || a.key.localeCompare(b.key));
  // cumulative: the units every key of which is among the first k entries of the ranking (all blocked units, not only the
  // view's origins: a unit that also needs a project callee is not let in by the world library alone)
  const position = new Map(ranked.map((r, i) => [r.key, i]));
  const firstNeeded = blockedSets.map((ks) => ks.reduce((m, k) => Math.max(m, position.has(k) ? position.get(k) : Infinity), -1));
  const cumulative = (k) => firstNeeded.filter((p) => p < k).length;
  const shown = ranked.slice(0, top).map((r, i) => ({ rank: i + 1, ...r, cumulative: cumulative(i + 1), rules: Object.fromEntries(Object.entries(r.rules).sort((a, b) => b[1] - a[1])) }));
  const byOrigin = {};
  for (const ks of blockedSets) { const os = [...new Set(ks.map((k) => rows.get(k)?.origin ?? 'unknown'))].sort().join('+'); byOrigin[os] = (byOrigin[os] ?? 0) + 1; }
  return { roots, units, refused, calleeOnly, multiCallee: multi, byOrigin: Object.fromEntries(Object.entries(byOrigin).sort((a, b) => b[1] - a[1])), callees: rows.size, origins: includeOrigins, top20: cumulative(20), top50: cumulative(50), rows: shown };
}
export function calleeTableReport(t, title = 'Callee census') {
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const pct = (a, b) => (b ? `${Math.round((1000 * a) / b) / 10}%` : 'n/a');
  const lines = [`# ${title}`, '',
    `Roots: ${t.roots}. Units: ${t.units}. Refused (not entered): ${t.refused}. Units whose every refusal names an unmodelled outside call: ${t.calleeOnly} (${pct(t.calleeOnly, t.refused)} of refused), of which ${t.multiCallee} name more than one callee. Distinct outside callees: ${t.callees}.`, '',
    `Callee-only units by origin of their callees: ${Object.entries(t.byOrigin).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}.`, '',
    `${t.origins ? `View: callees of origin ${t.origins.join(', ')}. ` : ''}The first 20 entries let in ${t.top20} of the ${t.calleeOnly} callee-only units (${pct(t.top20, t.calleeOnly)}); the first 50, ${t.top50} (${pct(t.top50, t.calleeOnly)}).`, '',
    '"Only by it": units whose refusals name this callee and no other. "Among": units whose refusals name it, alone or beside others. "Cumulative": units every callee of which ranks at or above this row. "Callers": units calling it at all.', '',
    '| # | Callee | Origin | Only by it | Among | Cumulative | Callers | Calls | Refusals naming it |', '| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...t.rows.map((r) => `| ${r.rank} | \`${esc(r.module)} ${esc(r.member)}\` | ${r.origin} | ${r.onlyBy} | ${r.among} | ${r.cumulative} | ${r.callers} | ${r.calls} | ${Object.entries(r.rules).slice(0, 3).map(([k, n]) => `${k} ${n}`).join(', ')} |`), ''];
  return lines.join('\n');
}
