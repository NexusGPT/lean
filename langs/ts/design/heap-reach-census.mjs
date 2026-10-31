// Every reason a census unit stays out of the heap core (translate/heap.mjs, stage 2), not only the first one.
// heap-core-census.mjs records the FIRST reason heap.mjs meets: the core test stops at a method, a parameter or the
// first expression outside the core. This census runs the same test without stopping, through a mirror of
// `coreUnit` whose every check emits a reason of a finer class (a union of literals apart from a union of records,
// a call by the receiver's kind, an `any` by its cause), and records per unit the whole reason set, the layer-1
// exposure (`layer1Risk`), the identity skeleton (`identitySkeleton`), the unit kind, async/generator, the parameter
// and result shapes, the same-file calls (the core's call-graph rule) and, for an `any`, where it comes from (an
// import the program did not resolve, by import kind, against an `any` written in the code). The mirror is checked
// against heap.mjs on every unit: an empty reason set must be exactly heap.mjs's own-syntax fit, and a disagreement
// is counted and listed in the summary. It translates and proves nothing.
//   node heap-reach-census.mjs <census/concepts-all.json> <out-dir> [--resolve] [--repos a,b] [--tag t] [--limit n]
// Default: modules unresolved (an imported shape is unknown), as heap-core-census.mjs. --resolve: each file's
// project options as the gate reads them (common.mjs loadProgramOptions: the tsconfig, the paths rule, the workspace
// packages). Writes <out-dir>/units<-tag>.jsonl (one unit per line) and <out-dir>/summary<-tag>.json.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, topLevelFunctions, COMPILER_OPTIONS, loadProgramOptions, callbackEnvironment } from '../common.mjs';
import { makeHeap } from '../translate/heap.mjs';
import { fileURLToPath } from 'node:url';
import { walkerJournal, superviseWalk, assertSupervised, walkEnd, exitAfter } from '../walk-supervisor.mjs';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const census = args[0], outDir = args[1];
const resolve = args.includes('--resolve');
const onlyRepos = flag('--repos') ? new Set(flag('--repos').split(',')) : null;
const tag = flag('--tag') ? '-' + flag('--tag') : '';
const limit = flag('--limit') ? Number(flag('--limit')) : Infinity;
if (!census || !outDir || !path.isAbsolute(census) || !path.isAbsolute(outDir)) throw Error('pass absolute census and output paths');
fs.mkdirSync(outDir, { recursive: true });
const baseline = JSON.parse(fs.readFileSync(census, 'utf8'));
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo', '.cache']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(dir, e.name)); continue; }
    if (/\.(ts|tsx|mts)$/.test(e.name)) { const p = path.join(dir, e.name); if (!SKIP_FILE.test(p)) yield p; }
  }
}
const repos = [];
for (const name of Object.keys(baseline.perRepo).sort()) {
  if (onlyRepos && !onlyRepos.has(name)) continue;
  const report = JSON.parse(fs.readFileSync(path.join(path.dirname(census), 'concepts', name + '.json'), 'utf8'));
  repos.push({ name, roots: report.roots });
}
// The walk runs under a supervisor (walk-supervisor.mjs): an end without its `complete` record writes the summary with
// `partial: true`, `filesNotWalked` and `notWalked` (absolute paths), names them on stderr and exits non-zero.
const summaryFile = path.join(outDir, `summary${tag}.json`);
const journal = walkerJournal();
if (journal === null) {
  const recordsFile = path.join(outDir, `walk${tag}.records.jsonl`);
  const planned = repos.flatMap((repo) => repo.roots.filter((root) => fs.existsSync(root)).flatMap((root) => [...walk(root)]));
  const pending = { census, resolve, complete: false, files: planned.length };
  fs.writeFileSync(recordsFile, JSON.stringify({ kind: 'reach-census', ...pending }) + '\n');
  fs.writeFileSync(summaryFile, JSON.stringify({ ...pending, partial: true, filesNotWalked: planned.length, notWalked: planned }, null, 1) + '\n');
  const end = await superviseWalk({ script: fileURLToPath(import.meta.url), args, journal: recordsFile, planned });
  if (!end.complete) {
    const walker = { pid: end.pid, exit: end.code, signal: end.signal };
    fs.writeFileSync(summaryFile, JSON.stringify({ ...pending, partial: true, filesNotWalked: end.notWalked.length, notWalked: end.notWalked, walked: { files: end.walked }, walker }, null, 1) + '\n');
    fs.appendFileSync(recordsFile, JSON.stringify({ kind: 'partial', complete: false, filesNotWalked: end.notWalked.length, walker }) + '\n');
    console.error(`reach census incomplete: the walk ${walkEnd(end)}; ${end.notWalked.length} of ${planned.length} files not walked (partial: true in ${summaryFile}):`);
    for (const f of end.notWalked.slice(0, 50)) console.error(`  ${f}`);
    if (end.notWalked.length > 50) console.error(`  ... and ${end.notWalked.length - 50} more, every one under notWalked in ${summaryFile}`);
  }
  exitAfter(end);
  await new Promise(() => {}); // exitAfter ends the process
}
const walked = (files) => fs.appendFileSync(journal, JSON.stringify({ kind: 'chunk', records: files.map((file) => ({ file })) }) + '\n');
const K = ts.SyntaxKind, TF = ts.TypeFlags;
const HW = 'hw_';
const coarse = (r) => r.replace(/^(calls|called by) .*, outside the core$/, '$1 a unit outside the core').replace(/^(parameter type|return type|value type|local type|receiver type|array literal type|object literal type): .*$/, '$1').replace(/^property \S+$/, 'property outside the shape').replace(/^operator .*$/, 'operator outside the core').replace(/^call \.\S+$/, 'method call').replace(/^(expression|statement|expression statement) \S+$/, '$1 outside the core');

// ----- an import's kind, resolved as the project would: relative, a paths alias, a package found, a package missing -----
const optionsByCfg = new Map();
const kindCache = new Map();
function importKind(file, spec) {
  const key = path.dirname(file) + '\0' + spec;
  if (kindCache.has(key)) return kindCache.get(key);
  let kind;
  if (spec.startsWith('.')) kind = 'relative';
  else {
    const cfg = ts.findConfigFile(path.dirname(file), ts.sys.fileExists, 'tsconfig.json') ?? '';
    if (!optionsByCfg.has(cfg)) { let o = { ...COMPILER_OPTIONS }; try { if (cfg) o = loadProgramOptions(file, cfg).options; } catch { /* default options */ } optionsByCfg.set(cfg, o); }
    const o = optionsByCfg.get(cfg);
    const keys = Object.keys(o.paths ?? {});
    const aliased = keys.some((k) => { const i = k.indexOf('*'); if (i < 0) return k === spec; const pre = k.slice(0, i), suf = k.slice(i + 1); return spec.length >= pre.length + suf.length && spec.startsWith(pre) && spec.endsWith(suf); });
    if (/^node:|^(fs|path|os|crypto|http|https|url|util|stream|events|child_process|zlib|buffer|net|tls|dns|readline|assert|worker_threads|perf_hooks|querystring|timers|vm|module|process)(\/|$)/.test(spec)) kind = 'node-builtin';
    else if (aliased) kind = 'alias';
    else { let r = null; try { r = ts.resolveModuleName(spec, file, o, ts.sys).resolvedModule; } catch { r = null; } kind = r ? 'package-installed' : 'package-missing'; }
  }
  kindCache.set(key, kind);
  return kind;
}

// ----- the mirror of heap.mjs's core test, every reason, finer classes -----
function makeMirror({ checker, sf, fns, recursive, file }) {
  const typeOf = (n) => checker.getTypeAtLocation(n);
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);
  // shapeOf: heap.mjs's, verbatim but for the closure (isReal false, as the census)
  function shapeOf(t, depth = 0) {
    if (!t || depth > 6) return null;
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' };
    const parts = nonNull(t);
    if (parts.length !== 1) return null;
    t = parts[0];
    if (t.flags & TF.NumberLike) return { kind: 'prim', d: 'int' };
    if (t.flags & TF.StringLike) return { kind: 'prim', d: 'string' };
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' };
    if (checker.isArrayType(t)) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e ? { kind: 'arr', elem: e, key: `A_${keyOf(e)}` } : null; }
    const symName = t.symbol?.name;
    if (symName === 'Map' && checker.getTypeArguments(t).length === 2) { const [kt, vt] = checker.getTypeArguments(t); const k = shapeOf(kt, depth + 1), v = shapeOf(vt, depth + 1); return k && k.kind === 'prim' && v ? { kind: 'map', k, v, key: `M_${keyOf(k)}_${keyOf(v)}` } : null; }
    if (symName === 'Date') return { kind: 'date', key: 'D' };
    if (symName === 'Set' && checker.getTypeArguments(t).length === 1) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e && e.kind === 'prim' ? { kind: 'set', elem: e, key: `S_${keyOf(e)}` } : null; }
    if (t.flags & TF.Object) {
      if (t.getCallSignatures().length || t.getConstructSignatures().length) return null;
      const props = checker.getPropertiesOfType(t);
      if (!props.length) return null;
      const fields = [];
      for (const p of props) {
        if (p.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.Optional | ts.SymbolFlags.Accessor)) return null;
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)) return null;
        const ft = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf);
        if (ft.getCallSignatures().length) return null;
        const s = shapeOf(ft, depth + 1); if (!s) return null;
        fields.push({ name: p.name, shape: s });
      }
      fields.sort((a, b) => (a.name < b.name ? -1 : 1));
      return { kind: 'rec', fields, key: `R_${fields.map((f) => `${f.name}:${keyOf(f.shape)}`).join(',')}` };
    }
    return null;
  }
  const keyOf = (s) => (s.kind === 'prim' ? s.d : s.key);
  const fieldOf = (s, name) => (s.kind === 'rec' ? s.fields.find((f) => f.name === name) : null);
  const isLit = (x) => !!(x.flags & (TF.StringLiteral | TF.NumberLiteral | TF.BooleanLiteral | TF.EnumLiteral | TF.BigIntLiteral));
  const isPrimBase = (x) => !!(x.flags & (TF.String | TF.Number | TF.Boolean | TF.BigInt));
  // every leaf that keeps a type out of shapeOf, with the type node it was written with when known
  // memoised per (type, depth) and deduplicated by leaf: a resolved library type (a React prop bag) has thousands of
  // members, and the walk would otherwise repeat every shared member type
  const leafMemo = new Map();
  function leaves(t, node, depth = 0, seen = new Set()) {
    if (!t) return [{ leaf: 'none', node }];
    const mk = `${t.id}:${depth}`;
    if (leafMemo.has(mk)) return leafMemo.get(mk).map((x) => ({ leaf: x.leaf, node: x.node ?? node }));
    leafMemo.set(mk, [{ leaf: 'depth', node: null }]); // a cycle met while this type is open reads as recursive
    const r = leavesOf(t, node, depth, seen);
    const uniq = []; const seenLeaf = new Set();
    for (const x of r) if (!seenLeaf.has(x.leaf)) { seenLeaf.add(x.leaf); uniq.push(x); }
    leafMemo.set(mk, uniq.map((x) => ({ leaf: x.leaf, node: x.node === node ? null : x.node })));
    return uniq;
  }
  function leavesOf(t, node, depth, seen) {
    if (shapeOf(t, depth)) return [];
    if (depth > 6) return [{ leaf: 'depth', node }];
    if (seen.has(t)) return [{ leaf: 'depth', node }];
    seen = new Set(seen); seen.add(t);
    const all = t.flags & TF.Union ? t.types : [t];
    const parts = nonNull(t);
    const hadNull = all.length !== parts.length;
    if (parts.length === 0) return [{ leaf: 'null-only', node }];
    if (parts.length > 1) {
      if (parts.length === 2 && parts.every((x) => x.flags & TF.BooleanLiteral)) return [{ leaf: hadNull ? 'optional-boolean' : 'boolean', node }];
      if (parts.every(isLit) || parts.every((x) => isLit(x) || (x.flags & TF.BooleanLiteral))) return [{ leaf: 'literal-union', node }];
      if (parts.every((x) => (x.flags & TF.Object) && !x.getCallSignatures().length)) return [{ leaf: 'record-union', node }];
      if (parts.every((x) => isLit(x) || isPrimBase(x))) return [{ leaf: 'primitive-union', node }];
      return [{ leaf: 'mixed-union', node }];
    }
    const u = parts[0];
    const out = (leaf) => [{ leaf, node }];
    if (u.flags & TF.Any) return out('any');
    if (u.flags & TF.Unknown) return out('unknown');
    if (u.flags & TF.TypeParameter) return out('type-parameter');
    if (u.flags & (TF.Void | TF.Undefined | TF.Null | TF.Never)) return out('void');
    if (u.flags & TF.BigIntLike) return out('bigint');
    if (u.flags & TF.ESSymbolLike) return out('symbol');
    if (checker.isTupleType(u)) return out('tuple');
    const elemNode = (n) => (n && ts.isArrayTypeNode(n) ? n.elementType : n && ts.isTypeReferenceNode(n) && n.typeArguments?.length === 1 ? n.typeArguments[0] : null);
    if (checker.isArrayType(u)) return leaves(checker.getTypeArguments(u)[0], elemNode(node), depth + 1, seen);
    const name = u.symbol?.name;
    if (name === 'Map' && checker.getTypeArguments(u).length === 2) { const [kt, vt] = checker.getTypeArguments(u); const r = []; if (!shapeOf(kt, depth + 1) || shapeOf(kt, depth + 1).kind !== 'prim') r.push({ leaf: 'map-key', node }); for (const x of leaves(vt, null, depth + 1, seen)) r.push(x); return r.length ? r : out('map-set'); }
    if (name === 'Set' && checker.getTypeArguments(u).length === 1) return out('set-elem');
    if (name === 'ReadonlyArray' || name === 'ReadonlyMap' || name === 'ReadonlySet') return out('readonly-collection');
    if (u.flags & TF.Intersection) return out('intersection');
    if (u.flags & TF.Object) {
      if (u.getCallSignatures().length) return out('function');
      if (u.getConstructSignatures().length) return out('class-value');
      if (name === 'Promise') return out('promise');
      if (name && /^(RegExp|Error|WeakMap|WeakSet|WeakRef|ArrayBuffer|Uint8Array|Buffer|URL|URLSearchParams|Headers|Response|Request|Blob|File|FormData|AbortController|AbortSignal|Intl|Symbol|Function|Object|Iterator|Generator|AsyncGenerator|AsyncIterable|Iterable|IterableIterator)$/.test(name)) return out('builtin:' + name);
      if (u.symbol && (u.symbol.flags & ts.SymbolFlags.Class)) return out('class-instance');
      const props = checker.getPropertiesOfType(u);
      if (!props.length) return out(checker.getIndexInfoOfType(u, ts.IndexKind.String) || checker.getIndexInfoOfType(u, ts.IndexKind.Number) ? 'dictionary' : 'empty-object');
      const r = [];
      for (const p of props.slice(0, 400)) {
        const decl = p.valueDeclaration;
        const fnode = decl && (ts.isPropertySignature(decl) || ts.isPropertyDeclaration(decl) || ts.isParameter(decl)) ? decl.type : null;
        if (p.flags & ts.SymbolFlags.Method) { r.push({ leaf: 'method-field', node }); continue; }
        if (p.flags & ts.SymbolFlags.Accessor) { r.push({ leaf: 'accessor-field', node }); continue; }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)) r.push({ leaf: 'odd-key', node });
        if (p.flags & ts.SymbolFlags.Optional) r.push({ leaf: 'optional-field', node });
        const ft = checker.getTypeOfSymbolAtLocation(p, decl ?? sf);
        if (ft.getCallSignatures().length) { r.push({ leaf: 'function', node: fnode }); continue; }
        for (const x of leaves(ft, fnode, depth + 1, seen)) r.push(x);
      }
      return r.length ? r : out('other');
    }
    return out('other');
  }
  // an import the program resolved: its target has a declaration (an unresolved one aliases the unknown symbol)
  const aliasResolved = (sym) => { let t = null; try { t = checker.getAliasedSymbol(sym); } catch { t = null; } return !!(t && t !== sym && t.declarations?.length); };
  // where an `any` comes from: an import the program did not resolve (by kind), a global type it lacks, `any` written
  function anyCause(node, depth = 0) {
    if (!node) return 'inferred';
    let found = null;
    const visit = (n) => {
      if (found) return;
      if (n.kind === K.AnyKeyword) { found = 'explicit-any'; return; }
      if (n.kind === K.UnknownKeyword) { found = 'explicit-unknown'; return; }
      if (ts.isTypeReferenceNode(n) || ts.isExpressionWithTypeArguments(n) || ts.isTypeQueryNode(n)) {
        const nameNode = ts.isTypeReferenceNode(n) ? n.typeName : ts.isTypeQueryNode(n) ? n.exprName : n.expression;
        let left = nameNode; while (left && (ts.isQualifiedName(left) || ts.isPropertyAccessExpression(left))) left = ts.isQualifiedName(left) ? left.left : left.expression;
        const sym = left ? checker.getSymbolAtLocation(left) : null;
        let ty = null; try { ty = checker.getTypeFromTypeNode(n); } catch { ty = null; }
        if (ty && (ty.flags & (TF.Any | TF.Unknown))) {
          if (!sym) { found = 'missing-global-type'; return; }
          if (sym.flags & ts.SymbolFlags.Alias) {
            const d = sym.declarations?.[0]; let imp = d; while (imp && !ts.isImportDeclaration(imp) && !ts.isImportEqualsDeclaration(imp)) imp = imp.parent;
            const spec = imp && ts.isImportDeclaration(imp) && ts.isStringLiteral(imp.moduleSpecifier) ? imp.moduleSpecifier.text : null;
            found = spec ? `${aliasResolved(sym) ? 'import-of-any' : 'unresolved-import'}:${importKind(file, spec)}` : 'unresolved-import:other'; return;
          }
          // a local type alias or interface over an unresolved name: the cause is the name it is written with
          const d = sym.declarations?.[0];
          if (depth < 4 && d && ts.isTypeAliasDeclaration(d) && d.type) { const c = anyCause(d.type, depth + 1); if (c !== 'inferred') { found = c; return; } }
          if (depth < 4 && d && (ts.isInterfaceDeclaration(d) || ts.isClassDeclaration(d)) && d.heritageClauses?.length) { for (const h of d.heritageClauses) for (const t of h.types) { const c = anyCause(t, depth + 1); if (c !== 'inferred') { found = c; return; } } }
          found = 'resolved-any'; return;
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return found ?? 'inferred';
  }
  // the cause of an `any` value with no type written: the import its initializer comes from, else inferred
  function valueAnyCause(id) {
    const s = checker.getSymbolAtLocation(id); const d = s?.valueDeclaration ?? s?.declarations?.[0];
    if (!d) return 'inferred';
    if (d.type) return anyCause(d.type);
    if (ts.isVariableDeclaration(d) && d.initializer) {
      let r = d.initializer; while (r && (ts.isCallExpression(r) || ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r) || ts.isAwaitExpression(r) || ts.isNonNullExpression(r) || ts.isParenthesizedExpression(r) || ts.isNewExpression(r) || ts.isAsExpression(r))) r = ts.isAsExpression(r) ? null : r.expression;
      if (ts.isAsExpression(d.initializer)) return anyCause(d.initializer.type);
      if (r && ts.isIdentifier(r)) { const rs = checker.getSymbolAtLocation(r); if (rs && (rs.flags & ts.SymbolFlags.Alias)) { const imp = (() => { let x = rs.declarations?.[0]; while (x && !ts.isImportDeclaration(x)) x = x.parent; return x; })(); const spec = imp && ts.isStringLiteral(imp.moduleSpecifier) ? imp.moduleSpecifier.text : null; return spec ? `${aliasResolved(rs) ? 'import-of-any' : 'unresolved-import'}:${importKind(file, spec)}` : 'unresolved-import:other'; } }
    }
    return 'inferred';
  }
  const LEAF_CLASS = { any: 'any', unknown: 'any', 'literal-union': 'literal-union', boolean: 'literal-union', 'record-union': 'record-union', 'mixed-union': 'mixed-union', 'primitive-union': 'mixed-union', 'optional-boolean': 'optional', 'optional-field': 'optional', 'null-only': 'optional', dictionary: 'dictionary', 'map-key': 'map-set', 'set-elem': 'map-set', 'map-set': 'map-set', 'readonly-collection': 'map-set', 'class-instance': 'class-instance', 'method-field': 'class-instance', 'class-value': 'function-type', function: 'function-type', promise: 'async', 'type-parameter': 'generic', depth: 'recursive-type', tuple: 'tuple', 'accessor-field': 'accessor', 'odd-key': 'dynamic-key', 'empty-object': 'other-type', intersection: 'intersection', bigint: 'other-type', symbol: 'other-type', other: 'other-type', none: 'other-type' };
  const leafClass = (leaf, position) => (leaf === 'void' ? (position === 'return' ? 'void-return' : 'optional') : leaf.startsWith('builtin:') ? 'builtin-object' : LEAF_CLASS[leaf] ?? 'other-type');
  // a summary of a parameter or result type: its shape kind, else its first leaf
  function shapeKind(t) {
    if (!t) return 'none';
    const s = shapeOf(t);
    const nullable = !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null));
    if (s) return (s.kind === 'prim' ? 'primitive' : s.kind === 'rec' ? 'record' : s.kind === 'arr' ? 'array' : s.kind) + (nullable ? '?' : '');
    const l = leaves(t, null);
    return l.length ? l[0].leaf : 'other';
  }

  function allReasons(u) {
    const R = new Set(); const notes = new Set();
    const no = (cls, detail) => R.add(detail ? `${cls}|${detail}` : cls);
    const typeReasons = (t, position, node, lit = null) => {
      for (const { leaf, node: n } of leaves(t, node)) {
        // an empty literal (`[]`, `{}`) has no element or field to type it: its type comes from where it goes
        const c = lit && ((ts.isArrayLiteralExpression(lit) && !lit.elements.length && leaf === 'void') || (ts.isObjectLiteralExpression(lit) && !lit.properties.length && leaf === 'empty-object')) ? 'empty-literal' : leafClass(leaf, position);
        R.add(`${c}|${position}: ${leaf === 'any' || leaf === 'unknown' ? `${leaf} (${anyCause(n)})` : leaf}`);
      }
    };
    const inMethod = !!u.cls;
    if (u.isCtor) no('constructor');
    else if (u.accessor) no('accessor', u.accessor);
    else if (u.cls) { if (u.isStatic) no('method-static'); else no(usesThis(u.body) ? 'method-this' : 'method-no-this'); }
    if (u.fn.asteriskToken) no('generator');
    if (u.isAsync) no('async');
    if (u.generics?.length) no('generic', 'type parameters');
    if (recursive.has(u.name)) no('recursive');
    if (!ts.isBlock(u.body)) no('expression-body');
    const names = new Set(); let lambdaDepth = 0;
    for (const p of u.params) {
      const ident = ts.isIdentifier(p.name);
      if (!ident) no('binding-forms', 'parameter destructuring');
      if (p.initializer) no('binding-forms', 'parameter default');
      if (p.questionToken) no('optional', 'optional parameter');
      if (p.dotDotDotToken) no('binding-forms', 'rest parameter');
      const t = ident ? typeOf(p.name) : typeOf(p);
      if (!shapeOf(t)) typeReasons(t, 'param', p.type);
      if (ident) names.add(p.name.text);
    }
    if (!u.isCtor && u.accessor !== 'set') {
      let rt = checker.getSignatureFromDeclaration(u.fn)?.getReturnType();
      if (u.fn.asteriskToken) rt = null; // a generator's result is its iterator: the generator reading
      else if (u.isAsync && rt) { const aw = checker.getAwaitedType(rt); rt = aw ?? rt; } // an async unit's result, awaited: the async reading carries the promise
      if (rt === null) { /* generator */ } else if (!rt || !shapeOf(rt)) typeReasons(rt, 'return', u.typeNode);
    }
    const declaredInside = (id) => { const s = checker.getSymbolAtLocation(id); const d = s?.valueDeclaration ?? s?.declarations?.[0]; return !!d && d.getSourceFile() === sf && d.pos >= u.fn.pos && d.end <= u.fn.end; };
    const outsideName = (id) => {
      const s = checker.getSymbolAtLocation(id);
      if (id.text === 'undefined') return no('optional', 'undefined');
      if (!s) return no('module-scope', 'unresolved name');
      if (s.flags & ts.SymbolFlags.Alias) return no('module-scope', 'imported name');
      const d = s.valueDeclaration ?? s.declarations?.[0];
      if (d && d.getSourceFile() === sf) return no('module-scope', (s.flags & ts.SymbolFlags.Function) || fns.has(id.text) ? 'same-file function as a value' : (s.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Enum)) ? 'class or enum name' : 'module binding');
      return no('global-name', id.text);
    };
    const callClass = (e) => { // a call heap.mjs leaves out, by the callee
      const c = unparen(e.expression);
      if (e.typeArguments && ts.isIdentifier(c) && fns.has(c.text)) return no('generic', 'explicit type arguments');
      if (ts.isPropertyAccessExpression(c)) {
        const m = c.name.text; const recv = unparen(c.expression);
        if (recv.kind === K.ThisKeyword) return no(inMethod ? 'method-this' : 'this-escape', `this.${m}()`);
        if (recv.kind === K.SuperKeyword) return no('constructor', 'super call');
        if (ts.isIdentifier(recv) && /^(Math|JSON|Object|Array|Number|String|Boolean|Promise|Date|Reflect|Symbol|BigInt|Intl|console|process|crypto|Buffer|URL|window|document|globalThis)$/.test(recv.text) && !declaredInside(recv)) return no('global-call', `${recv.text}.${m}`);
        const rt = typeOf(recv); const rs = shapeOf(rt);
        if (rs && rs.kind === 'prim') return no(rs.d === 'string' ? 'string-method' : 'primitive-method', m);
        if (rs && rs.kind === 'arr') return no(/^(map|filter|reduce|reduceRight|find|findIndex|findLast|findLastIndex|some|every|forEach|flatMap|sort|toSorted)$/.test(m) ? 'array-callback' : 'array-method', m);
        if (rs) return no('cell-method', `${rs.kind}.${m}`);
        const lf = leaves(rt, null); const l0 = lf[0]?.leaf ?? 'other';
        if (ts.isIdentifier(recv) && !declaredInside(recv)) { const s = checker.getSymbolAtLocation(recv); if (s && (s.flags & ts.SymbolFlags.Alias)) return no('outside-call', `import.${m}`); }
        if (l0 === 'any' || l0 === 'unknown') return no('any', `call .${m} on ${l0} (${ts.isIdentifier(recv) ? valueAnyCause(recv) : 'inferred'})`);
        if (/^(class-instance|method-field)$/.test(l0)) return no('handle-call', `object.${m}`);
        if (checker.isArrayType(nonNull(rt)[0] ?? rt)) return no(/^(map|filter|reduce|reduceRight|find|findIndex|findLast|findLastIndex|some|every|forEach|flatMap|sort|toSorted)$/.test(m) ? 'array-callback' : 'array-method', m);
        if (nonNull(rt).every((x) => x.flags & TF.StringLike)) return no('string-method', m);
        const lc = leafClass(l0, 'receiver');
        return no(lc === 'other-type' ? 'method-call' : lc, `call .${m} on ${l0}`);
      }
      if (ts.isIdentifier(c)) {
        const s = checker.getSymbolAtLocation(c);
        if (declaredInside(c)) return no('function-type', 'call of a function value');
        if (!s) return no('global-call', c.text);
        if (s.flags & ts.SymbolFlags.Alias) return no('outside-call', 'imported function');
        const d = s.valueDeclaration ?? s.declarations?.[0];
        if (d && d.getSourceFile() === sf) return no('outside-call', 'same-file function not a unit');
        return no('global-call', c.text);
      }
      return no('function-type', 'call of a computed callee');
    };
    const elementClass = (e, write) => {
      const rt = typeOf(e.expression); const rs = shapeOf(rt); const kt = typeOf(e.argumentExpression);
      const arr = (rs && rs.kind === 'arr') || checker.isArrayType(nonNull(rt)[0] ?? rt) || checker.isTupleType(nonNull(rt)[0] ?? rt);
      if (arr && (kt.flags & TF.NumberLike)) return no('element-access', write ? 'array index write' : 'array index read');
      if (ts.isStringLiteral(e.argumentExpression) || ts.isNumericLiteral(e.argumentExpression)) return no('dynamic-key', write ? 'literal key write' : 'literal key read');
      return no('dynamic-key', write ? 'computed key write' : 'computed key read');
    };
    const opClass = (k, text) => {
      if ([K.AsteriskToken, K.SlashToken, K.PercentToken, K.AsteriskAsteriskToken].includes(k)) return no('arithmetic', text);
      if ([K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(k)) return no('loose-equality', text);
      if (k === K.QuestionQuestionToken) return no('optional', '??');
      if ([K.InKeyword, K.InstanceOfKeyword].includes(k)) return no('type-test', text);
      if ([K.AmpersandToken, K.BarToken, K.CaretToken, K.LessThanLessThanToken, K.GreaterThanGreaterThanToken, K.GreaterThanGreaterThanGreaterThanToken].includes(k)) return no('bitwise', text);
      if (k >= K.FirstAssignment && k <= K.LastAssignment) return no('assignment-expression', text);
      if (k === K.CommaToken) return no('other-expression', 'comma');
      return no('other-expression', `operator ${text}`);
    };
    const exprKindClass = (e) => {
      switch (e.kind) {
        case K.ConditionalExpression: return no('conditional-expression');
        case K.TemplateExpression: case K.TaggedTemplateExpression: return no('template');
        case K.ThisKeyword: return no(inMethod ? 'this-escape' : 'this-escape', 'this as a value');
        case K.SuperKeyword: return no('constructor', 'super');
        case K.NullKeyword: return no('optional', 'null');
        case K.ArrowFunction: case K.FunctionExpression: case K.ClassExpression: return no('closure', K[e.kind]);
        case K.AwaitExpression: return no('async', 'await');
        case K.YieldExpression: return no('generator', 'yield');
        case K.AsExpression: case K.TypeAssertionExpression: case K.SatisfiesExpression: case K.NonNullExpression: return no('type-assertion', K[e.kind]);
        case K.NewExpression: { const c = e.expression.getText(sf); return no(/^(Map|Set|WeakMap|WeakSet)$/.test(c) ? 'map-set' : /Error$/.test(c) ? 'throw' : c === 'Date' ? 'date' : c === 'RegExp' ? 'regexp' : c === 'Promise' ? 'async' : /^(URL|URLSearchParams|Headers|Response|Request|Blob|FormData|AbortController|TextEncoder|TextDecoder|Uint8Array|ArrayBuffer|Buffer|Intl\..*)$/.test(c) ? 'builtin-object' : 'class-instance', `new ${c.slice(0, 40)}`); }
        case K.TypeOfExpression: return no('type-test', 'typeof');
        case K.RegularExpressionLiteral: return no('regexp');
        case K.JsxElement: case K.JsxSelfClosingElement: case K.JsxFragment: return no('jsx');
        case K.PostfixUnaryExpression: return no('increment', 'postfix');
        case K.DeleteExpression: return no('dynamic-key', 'delete');
        case K.BigIntLiteral: return no('other-type', 'bigint literal');
        case K.SpreadElement: return no('binding-forms', 'spread argument');
        default: return no('other-expression', K[e.kind]);
      }
    };
    const checkExpr = (e0) => {
      const e = unparen(e0);
      if (ts.isIdentifier(e)) { if (e.text === HW) no('other-expression', 'name hw_'); else if (!declaredInside(e)) outsideName(e); else if (!shapeOf(typeOf(e))) { const t = typeOf(e); for (const { leaf } of leaves(t, null)) R.add(`${leafClass(leaf, 'value')}|value: ${leaf === 'any' || leaf === 'unknown' ? `${leaf} (${valueAnyCause(e)})` : leaf}`); } return; }
      if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return;
      if (ts.isPropertyAccessExpression(e)) {
        if (e.questionDotToken) notes.add('optional chain read as a plain read');
        const recv = unparen(e.expression);
        const s = shapeOf(typeOf(e.expression));
        if (!s) {
          if (recv.kind === K.ThisKeyword) { no(inMethod ? 'method-this' : 'this-escape', 'this field read'); const ft = typeOf(e); if (!shapeOf(ft) && !ft.getCallSignatures().length) typeReasons(ft, 'this-field', null); return; }
          if (recv.kind === K.SuperKeyword) return no('constructor', 'super member');
          const rt = typeOf(e.expression);
          if (nonNull(rt).length === 1 && (nonNull(rt)[0].flags & TF.StringLike) && e.name.text === 'length') no('string-method', 'length');
          else for (const { leaf } of leaves(rt, null)) R.add(`${leafClass(leaf, 'receiver')}|receiver: ${leaf === 'any' || leaf === 'unknown' ? `${leaf} (${ts.isIdentifier(recv) ? valueAnyCause(recv) : 'inferred'})` : leaf}`);
          return checkExpr(e.expression);
        }
        if (s.kind === 'arr' ? e.name.text !== 'length' : (s.kind === 'map' || s.kind === 'set') ? e.name.text !== 'size' : !fieldOf(s, e.name.text)) {
          if (s.kind === 'prim' && s.d === 'string' && e.name.text === 'length') no('string-method', 'length');
          else if (s.kind === 'prim' || s.kind === 'arr') no('method-call', `function value .${e.name.text}`);
          else no('other-expression', `property outside the shape .${e.name.text}`);
        }
        return checkExpr(e.expression);
      }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set') && !(e.arguments ?? []).length) { if (!shapeOf(typeOf(e))) typeReasons(typeOf(e), 'new cell', null); return; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.expression.expression)); if (!s || (s.kind !== 'map' && s.kind !== 'set')) { callClass(e); } checkExpr(e.expression.expression); return checkExpr(e.arguments[0]); }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'Date') { if ((e.arguments ?? []).length !== 1 || !(typeOf(e.arguments[0]).flags & TF.NumberLike)) no('date', 'new Date form (the clock or a parse)'); else if (!shapeOf(typeOf(e))) no('date', 'new Date type'); for (const a of e.arguments ?? []) checkExpr(a); return; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && shapeOf(typeOf(e.expression.expression))?.kind === 'date') { const g = e.expression.name.text; if (e.arguments.length) no('date', 'date method with arguments'); else if (!(g === 'getTime' || g === 'valueOf' || /^getUTC(FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds)$/.test(g))) no('date', `date method ${g}`); for (const a of e.arguments) checkExpr(a); return checkExpr(e.expression.expression); }
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'structuredClone' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.arguments[0])); if (!s || s.kind === 'prim') no('clone', 'clone of a non-cell'); else { const flat = s.kind === 'rec' ? s.fields.every((f) => f.shape.kind === 'prim') : s.kind === 'arr' ? s.elem.kind === 'prim' : true; if (!flat) no('clone', 'clone of a nested graph'); } return checkExpr(e.arguments[0]); }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (e.expression.name.text === 'map' || e.expression.name.text === 'filter') && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0])) {
        const m = e.expression.name.text;
        const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') { callClass(e); checkExpr(e.expression.expression); return checkLambda(e.arguments[0], false); }
        const cb = e.arguments[0]; if (cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name) || ts.isBlock(cb.body) || cb.modifiers?.length) { no('callback-body', `${m} callback form`); checkExpr(e.expression.expression); return checkLambda(cb, false); }
        if (m === 'map') { const rs = shapeOf(typeOf(e)); if (!rs || rs.kind !== 'arr') typeReasons(typeOf(e), 'map result', null); }
        const x = cb.parameters[0].name.text; if (names.has(x) || x === HW) no('shadowing', 'callback parameter'); if (!shapeOf(typeOf(cb.parameters[0].name))) typeReasons(typeOf(cb.parameters[0].name), 'callback parameter', cb.parameters[0].type);
        checkExpr(e.expression.expression); names.add(x); lambdaDepth++; checkExpr(cb.body); lambdaDepth--; names.delete(x); return;
      }
      if (ts.isBinaryExpression(e)) { const BIN = [K.PlusToken, K.MinusToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken]; if (!BIN.includes(e.operatorToken.kind)) opClass(e.operatorToken.kind, e.operatorToken.getText(sf)); else if ((e.operatorToken.kind === K.AmpersandAmpersandToken || e.operatorToken.kind === K.BarBarToken) && !(typeOf(e.left).flags & TF.BooleanLike && typeOf(e.right).flags & TF.BooleanLike)) no('truthiness', e.operatorToken.getText(sf)); if (e.operatorToken.kind >= K.FirstAssignment && e.operatorToken.kind <= K.LastAssignment) checkTarget(e.left); else checkExpr(e.left); checkExpr(e.right); return; }
      if (ts.isPrefixUnaryExpression(e)) { if (e.operator !== K.ExclamationToken) no(e.operator === K.MinusToken ? 'negation' : e.operator === K.PlusToken ? 'numeric-conversion' : e.operator === K.TildeToken ? 'bitwise' : 'increment', 'prefix'); return checkExpr(e.operand); }
      if ((ts.isArrayLiteralExpression(e) || ts.isObjectLiteralExpression(e) || ts.isNewExpression(e)) && lambdaDepth) no('callback-body', 'allocation inside a callback');
      if (ts.isArrayLiteralExpression(e)) { if (!shapeOf(typeOf(e))) typeReasons(typeOf(e), 'array literal', null, e); for (const x of e.elements) checkExpr(ts.isSpreadElement(x) ? x.expression : x); return; }
      if (ts.isObjectLiteralExpression(e)) {
        const s = shapeOf(typeOf(e)); if (!s || s.kind !== 'rec') typeReasons(typeOf(e), 'object literal', null, e);
        const given = new Set(); let spread = false;
        for (const p of e.properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) { given.add(p.name.text); checkExpr(p.initializer); }
          else if (ts.isShorthandPropertyAssignment(p)) { given.add(p.name.text); checkExpr(p.name); }
          else if (ts.isSpreadAssignment(p)) { spread = true; const ss = shapeOf(typeOf(p.expression)); if (!ss || ss.kind !== 'rec') typeReasons(typeOf(p.expression), 'spread source', null); checkExpr(p.expression); }
          else if (ts.isPropertyAssignment(p) && ts.isComputedPropertyName(p.name)) { no('dynamic-key', 'computed key in a literal'); checkExpr(p.initializer); }
          else if (ts.isPropertyAssignment(p)) { no('dynamic-key', 'quoted or numeric key in a literal'); checkExpr(p.initializer); }
          else if (ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p)) no('closure', 'method or accessor in a literal');
          else no('other-expression', 'object member form');
        }
        if (s && s.kind === 'rec' && !spread && s.fields.some((f) => !given.has(f.name))) no('other-expression', 'object literal misses a field');
        return;
      }
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && !e.typeArguments) { for (const a of e.arguments) checkExpr(a); return; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['slice', 'concat', 'reverse', 'splice'].includes(e.expression.name.text)) {
        const m = e.expression.name.text; const s = shapeOf(typeOf(e.expression.expression));
        if (!s || s.kind !== 'arr') callClass(e);
        else if ((m === 'slice' && e.arguments.length > 2) || (m === 'reverse' && e.arguments.length !== 0) || (m === 'splice' && e.arguments.length < 2)) no('array-method', `${m} arity`);
        else if (m === 'concat') { if (e.arguments.length !== 1) no('array-method', 'concat arity'); else { const q = shapeOf(typeOf(e.arguments[0])); if (!q || q.kind !== 'arr' || q.key !== s.key) no('array-method', 'concat of a different shape'); } }
        checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); return;
      }
      if (ts.isCallExpression(e)) { callRest(e); return; }
      if (ts.isElementAccessExpression(e)) { elementClass(e, false); checkExpr(e.expression); return checkExpr(e.argumentExpression); }
      exprKindClass(e);
      if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return checkLambda(e);
      if (ts.isNewExpression(e)) { for (const a of e.arguments ?? []) { if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) checkLambda(a); else checkExpr(ts.isSpreadElement(a) ? a.expression : a); } return; } // the constructor's name is the construction's, not a read
      ts.forEachChild(e, (c) => { if (ts.isExpression(c) && !ts.isTypeNode(c)) checkExpr(c); });
    };
    // a callback or closure body heap.mjs does not read: its own expressions, so their reasons are counted; a callback
    // of an array operation is that operation's reading (array-callback), any other function value a closure
    const checkLambda = (fn, closure = true) => { if (closure) no('closure', ts.isArrowFunction(fn) ? 'arrow argument' : 'function argument'); lambdaDepth++; if (ts.isBlock(fn.body)) checkStmts([...fn.body.statements], true); else checkExpr(fn.body); lambdaDepth--; };
    const ARRAY_CB = /^(map|filter|reduce|reduceRight|find|findIndex|findLast|findLastIndex|some|every|forEach|flatMap|sort|toSorted)$/;
    // a call heap.mjs does not read: its reason, then its receiver and arguments
    const callRest = (e) => {
      callClass(e);
      const c = unparen(e.expression);
      let arrayCb = false;
      if (ts.isPropertyAccessExpression(c)) {
        const r = unparen(c.expression);
        arrayCb = ARRAY_CB.test(c.name.text) && (checker.isArrayType(nonNull(typeOf(r))[0] ?? typeOf(r)) || shapeOf(typeOf(r))?.kind === 'arr');
        if (r.kind === K.ThisKeyword || r.kind === K.SuperKeyword) { /* the receiver is the method's own */ }
        else if (ts.isPropertyAccessExpression(r) && unparen(r.expression).kind === K.ThisKeyword) no(inMethod ? 'method-this' : 'this-escape', 'this field read');
        else if (!(ts.isIdentifier(r) && !declaredInside(r))) checkExpr(r);
      } else if (!ts.isIdentifier(c)) checkExpr(c);
      for (const a of e.arguments) { if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) checkLambda(a, !arrayCb); else checkExpr(ts.isSpreadElement(a) ? a.expression : a); }
    };
    const checkTarget = (t0) => {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return checkExpr(t);
      if (ts.isPropertyAccessExpression(t)) {
        if (unparen(t.expression).kind === K.ThisKeyword) return no(inMethod ? 'method-this' : 'this-escape', 'this field write');
        const s = shapeOf(typeOf(t.expression)); if (!s || s.kind !== 'rec' || !fieldOf(s, t.name.text)) { if (!s) for (const { leaf } of leaves(typeOf(t.expression), null)) R.add(`${leafClass(leaf, 'receiver')}|write receiver: ${leaf}`); else no('other-expression', 'write target'); }
        return checkExpr(t.expression);
      }
      if (ts.isElementAccessExpression(t)) { elementClass(t, true); checkExpr(t.expression); return checkExpr(t.argumentExpression); }
      if (ts.isObjectLiteralExpression(t) || ts.isArrayLiteralExpression(t)) return no('binding-forms', 'destructuring assignment');
      no('other-expression', 'write target');
    };
    const block = (s) => (ts.isBlock(s) ? [...s.statements] : [s]);
    const endsWithReturn = (list) => { const s = list[list.length - 1]; if (!s) return false; if (ts.isReturnStatement(s)) return true; if (ts.isIfStatement(s) && s.elseStatement) return endsWithReturn(block(s.thenStatement)) && endsWithReturn(block(s.elseStatement)); return false; };
    const MUTATORS = new Set(['push', 'unshift', 'pop', 'shift', 'reverse', 'splice', 'sort']);
    const MUTATOR_ARITY = { push: [1, 1], unshift: [1, 1], pop: [0, 0], shift: [0, 0], reverse: [0, 0], splice: [2, Infinity], sort: [1, 1] };
    const isAssignCall = (e) => ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Object' && e.expression.name.text === 'assign';
    function checkStmts(list, nested = false) {
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) {
            if (!ts.isIdentifier(d.name)) no('binding-forms', 'local destructuring');
            else if (!d.initializer) no('binding-forms', 'binding without initializer');
            else { if (d.name.text === HW || names.has(d.name.text)) no('shadowing', 'local'); names.add(d.name.text); }
            const t = ts.isIdentifier(d.name) ? typeOf(d.name) : typeOf(d);
            if (!shapeOf(t)) typeReasons(t, 'local', d.type ?? (d.initializer && ts.isAsExpression(d.initializer) ? d.initializer.type : null) ?? null);
            if (d.initializer) { if (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) checkLambda(d.initializer); else checkExpr(d.initializer); }
          }
          continue;
        }
        if (ts.isReturnStatement(s)) { if (!s.expression) no('void-return', 'bare return'); else checkExpr(s.expression); if (i !== list.length - 1) no('if-join', 'statement after return'); continue; }
        if (ts.isIfStatement(s)) {
          checkExpr(s.expression);
          const t = block(s.thenStatement); checkStmts(t, nested); if (!endsWithReturn(t)) no('if-join', 'if branch without return');
          if (s.elseStatement) { const el = block(s.elseStatement); checkStmts(el, nested); if (!endsWithReturn(el)) no('if-join', 'if branch without return'); if (i !== list.length - 1) no('if-join', 'statement after if/else'); }
          continue;
        }
        if (ts.isExpressionStatement(s)) {
          const e = unparen(s.expression);
          if (ts.isBinaryExpression(e) && [K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken].includes(e.operatorToken.kind)) { checkTarget(e.left); if (ts.isArrowFunction(e.right) || ts.isFunctionExpression(e.right)) checkLambda(e.right); else checkExpr(e.right); continue; }
          if (ts.isBinaryExpression(e) && e.operatorToken.kind >= K.FirstAssignment && e.operatorToken.kind <= K.LastAssignment) { opClass(e.operatorToken.kind, e.operatorToken.getText(sf)); checkTarget(e.left); checkExpr(e.right); continue; }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['set', 'add', 'delete'].includes(e.expression.name.text) && (() => { const sc = shapeOf(typeOf(e.expression.expression)); return sc && (sc.kind === 'map' || sc.kind === 'set'); })()) {
            const sc = shapeOf(typeOf(e.expression.expression)); const m = e.expression.name.text;
            if (sc.kind === 'map' ? !((m === 'set' && e.arguments.length === 2) || (m === 'delete' && e.arguments.length === 1)) : !((m === 'add' || m === 'delete') && e.arguments.length === 1)) no('cell-method', 'cell mutator arity');
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text) && shapeOf(typeOf(e.expression.expression))?.kind === 'arr') {
            const m = e.expression.name.text; const [lo, hi] = MUTATOR_ARITY[m];
            if (e.arguments.length < lo || e.arguments.length > hi) no('array-method', `${m} arity`);
            if (m === 'sort') {
              const cb = e.arguments[0];
              if (!cb || !ts.isArrowFunction(cb) || cb.parameters.length !== 2 || !cb.parameters.every((p) => ts.isIdentifier(p.name)) || ts.isBlock(cb.body) || cb.modifiers?.length) { no('array-callback', 'comparator form'); checkExpr(e.expression.expression); if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) checkLambda(cb, false); continue; }
              const [a, b] = cb.parameters.map((p) => p.name.text); if (a === b || names.has(a) || names.has(b) || a === HW || b === HW) no('shadowing', 'comparator parameter');
              if (!cb.parameters.every((p) => shapeOf(typeOf(p.name)))) no('array-callback', 'comparator parameter type'); if (!(typeOf(cb.body).flags & TF.NumberLike)) no('array-callback', 'comparator result type');
              checkExpr(e.expression.expression); names.add(a); names.add(b); lambdaDepth++; checkExpr(cb.body); lambdaDepth--; names.delete(a); names.delete(b); continue;
            }
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (isAssignCall(e)) { if (e.arguments.length !== 2) no('global-call', 'Object.assign arity'); else { const st = shapeOf(typeOf(e.arguments[0])), ss = shapeOf(typeOf(e.arguments[1])); if (!st || !ss || st.kind !== 'rec' || st.key !== ss.key) no('global-call', 'Object.assign shapes'); } for (const a of e.arguments) checkExpr(a); continue; }
          if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && !e.typeArguments) { for (const a of e.arguments) checkExpr(a); continue; }
          if (ts.isCallExpression(e)) { callRest(e); continue; } // heap.mjs reads no other call as a statement
          if (ts.isPostfixUnaryExpression(e) || (ts.isPrefixUnaryExpression(e) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken))) { no('increment', 'statement'); checkTarget(e.operand); continue; }
          if (ts.isAwaitExpression(e)) { no('async', 'await statement'); checkExpr(e.expression); continue; }
          if (ts.isDeleteExpression(e)) { no('dynamic-key', 'delete'); checkExpr(e.expression); continue; }
          no('other-statement', `expression statement ${K[e.kind]}`); checkExpr(e); continue;
        }
        if (ts.isForStatement(s) || ts.isForOfStatement(s) || ts.isForInStatement(s) || ts.isWhileStatement(s) || ts.isDoStatement(s)) {
          no('loop', K[s.kind]);
          if (ts.isForOfStatement(s) && s.awaitModifier) no('async', 'for await');
          const loopDecls = (list) => { for (const d of list.declarations) { if (ts.isIdentifier(d.name)) names.add(d.name.text); else no('binding-forms', 'loop destructuring'); const t = ts.isIdentifier(d.name) ? typeOf(d.name) : typeOf(d); if (!shapeOf(t)) typeReasons(t, 'local', d.type ?? null); if (d.initializer) checkExpr(d.initializer); } };
          if (ts.isForStatement(s)) {
            if (s.initializer) { if (ts.isVariableDeclarationList(s.initializer)) loopDecls(s.initializer); else checkExpr(s.initializer); }
            if (s.condition) checkExpr(s.condition);
            if (s.incrementor) { const inc = unparen(s.incrementor); if (!((ts.isPostfixUnaryExpression(inc) || ts.isPrefixUnaryExpression(inc)) && (inc.operator === K.PlusPlusToken || inc.operator === K.MinusMinusToken))) checkExpr(inc); } // a counter step is the loop's own
          }
          if (ts.isForOfStatement(s) || ts.isForInStatement(s)) { if (ts.isVariableDeclarationList(s.initializer)) loopDecls(s.initializer); else checkTarget(s.initializer); }
          if (ts.isForOfStatement(s) || ts.isForInStatement(s) || ts.isWhileStatement(s) || ts.isDoStatement(s)) checkExpr(s.expression);
          checkLoopBody(s.statement);
          continue;
        }
        if (ts.isTryStatement(s)) { no('try'); checkStmts([...s.tryBlock.statements], true); if (s.catchClause) checkStmts([...s.catchClause.block.statements], true); if (s.finallyBlock) checkStmts([...s.finallyBlock.statements], true); continue; }
        if (ts.isThrowStatement(s)) { no('throw'); if (s.expression) checkExpr(s.expression); continue; }
        if (ts.isSwitchStatement(s)) { no('switch'); checkExpr(s.expression); for (const c of s.caseBlock.clauses) { if (ts.isCaseClause(c)) checkExpr(c.expression); checkStmts(c.statements.filter((x) => !ts.isBreakStatement(x)), true); } continue; }
        if (ts.isBlock(s)) { no('other-statement', 'nested block'); checkStmts([...s.statements], true); continue; }
        if (ts.isBreakStatement(s) || ts.isContinueStatement(s)) { no('break-continue', K[s.kind]); continue; }
        if (ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)) { no('closure', `nested ${K[s.kind]}`); continue; }
        if (ts.isLabeledStatement(s)) { no('other-statement', 'label'); checkStmts([s.statement], true); continue; }
        if (ts.isEmptyStatement(s)) { no('other-statement', 'empty'); continue; }
        if (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isEnumDeclaration(s)) { no('other-statement', K[s.kind]); continue; }
        no('other-statement', K[s.kind]);
      }
    }
    function checkLoopBody(st) {
      const b = block(st);
      // break and continue inside the loop, not inside a nested function
      const w = (n) => { if (ts.isBreakStatement(n) || ts.isContinueStatement(n)) no('break-continue', K[n.kind]); if (ts.isFunctionLike(n)) return; ts.forEachChild(n, w); };
      for (const x of b) w(x);
      checkStmts(b.filter((x) => !(ts.isBreakStatement(x) || ts.isContinueStatement(x))), true);
    }
    if (ts.isBlock(u.body)) {
      const body = [...u.body.statements];
      checkStmts(body);
      if (!endsWithReturn(body)) {
        const last = body[body.length - 1];
        const rt = u.isCtor || u.accessor === 'set' ? null : checker.getSignatureFromDeclaration(u.fn)?.getReturnType();
        const awaited = rt && u.isAsync ? checker.getAwaitedType(rt) ?? rt : rt;
        if (last && ts.isThrowStatement(last)) no('throw', 'ends in a throw');
        else if (u.isCtor || u.accessor === 'set' || !awaited || (awaited.flags & (TF.Void | TF.Undefined)) || u.fn.asteriskToken) no('void-return', 'falls off the end');
        else no('if-join', 'path without return');
      }
    } else checkExpr(u.body);
    return { reasons: [...R].sort(), notes: [...notes] };
  }
  const unparen = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
  // constructs no reading can admit (SEMANTICS, the world axiom), a closure rebinding an outer local, and a type whose
  // null or undefined part shapeOf drops (the core then reads `T | undefined` as T)
  function unitNotes(u) {
    const notes = new Set();
    const declIn = (id, node) => { const s = checker.getSymbolAtLocation(id); const d = s?.valueDeclaration ?? s?.declarations?.[0]; return !!d && d.getSourceFile() === sf && d.pos >= node.pos && d.end <= node.end; };
    const fnStack = [];
    const w = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'eval') notes.add('forbidden: eval');
      if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 'Function' || n.expression.text === 'Proxy')) notes.add(`forbidden: new ${n.expression.text}`);
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Function') notes.add('forbidden: Function');
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && /^(Object|Reflect)$/.test(n.expression.text) && /^(setPrototypeOf|defineProperty|defineProperties|construct)$/.test(n.name.text)) notes.add(`forbidden: ${n.expression.text}.${n.name.text}`);
      if (ts.isPropertyAccessExpression(n) && (n.name.text === '__proto__' || n.name.text === 'prototype') && n.parent && ts.isBinaryExpression(n.parent) && n.parent.left === n) notes.add('forbidden: prototype write');
      if (ts.isPropertyAccessExpression(n) && n.parent && ts.isBinaryExpression(n.parent) && n.parent.left === n && ts.isPropertyAccessExpression(n.expression) && (n.expression.name.text === 'prototype' || n.expression.name.text === '__proto__')) notes.add('forbidden: prototype write');
      if (n.kind === K.WithStatement) notes.add('forbidden: with');
      if (ts.isIdentifier(n) && n.text === 'arguments' && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) notes.add('arguments object');
      const nested = ts.isArrowFunction(n) || ts.isFunctionExpression(n) || (ts.isFunctionDeclaration(n) && n !== u.fn);
      if (nested) fnStack.push(n);
      if (fnStack.length) {
        const top = fnStack[fnStack.length - 1];
        const target = ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment ? unparen(n.left) : (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) ? unparen(n.operand) : null;
        if (target && ts.isIdentifier(target) && declIn(target, u.fn) && !declIn(target, top)) notes.add('closure rebinds an outer local');
        if (target && ts.isIdentifier(target) && !declIn(target, u.fn)) { const s = checker.getSymbolAtLocation(target); const d = s?.valueDeclaration; if (d && d.getSourceFile() === sf) notes.add('closure rebinds a module binding'); }
      } else {
        const target = ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment ? unparen(n.left) : (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) ? unparen(n.operand) : null;
        if (target && ts.isIdentifier(target) && !declIn(target, u.fn)) { const s = checker.getSymbolAtLocation(target); const d = s?.valueDeclaration; if (d && d.getSourceFile() === sf) notes.add('rebinds a module binding'); }
      }
      ts.forEachChild(n, w);
      if (nested) fnStack.pop();
    };
    if (u.body) w(u.body);
    const stripped = (t) => !!t && !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null)) && !!shapeOf(t);
    for (const p of u.params) if (ts.isIdentifier(p.name) && !p.questionToken && stripped(typeOf(p.name))) notes.add('nullable parameter read as its non-null part');
    try { const rt = checker.getSignatureFromDeclaration(u.fn)?.getReturnType(); if (!u.isAsync && stripped(rt)) notes.add('nullable result read as its non-null part'); } catch { /* none */ }
    return [...notes];
  }
  function usesThis(body) { let found = false; const w = (n) => { if (found) return; if (n.kind === K.ThisKeyword) { found = true; return; } if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isClassDeclaration(n) || ts.isClassExpression(n)) return; ts.forEachChild(n, w); }; if (body) w(body); return found; }
  return { allReasons, shapeOf, shapeKind, leaves, usesThis, unitNotes };
}

const reasonClass = (r) => r.split('|')[0];
// what a class declaration is beyond its members: the conditions stage 4 row 1 reads (a decorator may replace what it
// decorates; a subclass's override changes what `this.m()` runs; an abstract or generic class has no one shape)
function classTraits(cd, sf) {
  const t = [];
  const decorated = (n) => !!(ts.canHaveDecorators?.(n) && ts.getDecorators?.(n)?.length);
  if (decorated(cd) || cd.members.some((m) => decorated(m) || (ts.isConstructorDeclaration(m) && m.parameters.some((p) => decorated(p))))) t.push('decorated');
  if (cd.modifiers?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword)) t.push('abstract');
  if (cd.heritageClauses?.some((h) => h.token === ts.SyntaxKind.ExtendsKeyword)) t.push('extends');
  if (cd.typeParameters?.length) t.push('generic');
  if (cd.name && sf.statements.some((st) => ts.isClassDeclaration(st) && st !== cd && st.heritageClauses?.some((h) => h.token === ts.SyntaxKind.ExtendsKeyword && h.types.some((x) => ts.isIdentifier(x.expression) && x.expression.text === cd.name.text)))) t.push('extended in the file');
  if (cd.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) t.push('exported');
  return t;
}
const out = fs.openSync(path.join(outDir, `units${tag}.jsonl`), 'w');
const perRepo = {}, firstCoarse = Object.create(null), classAlone = Object.create(null), mismatches = [], planErrors = [];
let files = 0, units = 0, core = 0, own = 0, mismatch = 0, written = 0;
const t0 = Date.now();
for (const repo of repos) {
  const list = []; for (const root of repo.roots) if (fs.existsSync(root)) list.push(...walk(root));
  const row = { files: list.length, units: 0, core: 0, ownFit: 0, mirrorOwnFit: 0, mismatch: 0, planErrorFiles: 0 };
  // chunks: 80 files, one program each; with --resolve, files of one tsconfig together under that project's options
  const chunks = [];
  if (resolve) {
    const groups = new Map();
    for (const f of list) { const cfg = ts.findConfigFile(path.dirname(f), ts.sys.fileExists, 'tsconfig.json') ?? ''; if (!groups.has(cfg)) groups.set(cfg, []); groups.get(cfg).push(f); }
    for (const [cfg, fl] of groups) for (let i = 0; i < fl.length; i += 80) chunks.push([cfg, fl.slice(i, i + 80)]);
  } else for (let i = 0; i < list.length; i += 80) chunks.push([null, list.slice(i, i + 80)]);
  let done = 0;
  for (const [cfg, chunk] of chunks) {
    if (units >= limit) break;
    assertSupervised();
    let options = { ...COMPILER_OPTIONS }, host;
    if (resolve) { if (cfg) options = loadProgramOptions(chunk[0], cfg).options; host = ts.createCompilerHost(options); }
    else { host = ts.createCompilerHost(options); host.resolveModuleNames = (names) => names.map(() => undefined); }
    let program;
    try { program = ts.createProgram(chunk, options, host); } catch (e) { planErrors.push(`${chunk[0]}: program ${String(e.message).slice(0, 120)}`); walked(chunk); continue; }
    const checker = program.getTypeChecker();
    for (const file of chunk) {
      const sf = program.getSourceFile(file); if (!sf) continue;
      const fns = topLevelFunctions(sf);
      // a callback unit's captured bindings are its parameters, as the translator plans the core (translate.mjs, the
      // 'units' analysis): without them every callback that reads an outer name is out, and so is the unit around it
      for (const u of fns.values()) if (u.form === 'callback') { let caps = []; try { caps = callbackEnvironment(checker, u); } catch { caps = []; } u.params = [...u.params, ...caps.map((c) => Object.assign(Object.create(c.decl), { name: c.decl.name, initializer: undefined, questionToken: undefined, dotDotDotToken: undefined, modifiers: undefined }))]; }
      const order = [...fns.values()];
      const calls = new Map(order.map((u) => [u.name, new Set()]));
      for (const u of order) { const w = (n) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text)) calls.get(u.name).add(n.expression.text); ts.forEachChild(n, w); }; w(u.body); }
      const recursive = new Set();
      for (const u of order) { const seen = new Set(); const stack = [...calls.get(u.name)]; while (stack.length) { const c = stack.pop(); if (c === u.name) { recursive.add(u.name); break; } if (!seen.has(c)) { seen.add(c); for (const d of calls.get(c) ?? []) stack.push(d); } } }
      let heapT;
      try { heapT = makeHeap({ ts, checker, sf, fns, dn: (x) => x, fname: (x) => x, isReal: false, recursive, helper: (k) => k }); heapT.plan(order); } // helper: the translator's exact helpers by name (the core reads string methods through them); the census emits nothing, a name is enough
      catch (e) { planErrors.push(`${file}: ${String(e.message).slice(0, 120)}`); row.planErrorFiles++; continue; }
      const mirror = makeMirror({ checker, sf, fns, recursive, file });
      // the core's call graph: same-file calls (callsOf in heap.mjs) and units named as a value
      const sameFileCall = (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text) && !n.typeArguments;
      const asValue = new Set();
      for (const u of order) { const w = (n) => { if (ts.isIdentifier(n) && fns.has(n.text) && !(n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && (ts.isFunctionDeclaration(n.parent) || ts.isVariableDeclaration(n.parent)) && n.parent.name === n)) asValue.add(n.text); ts.forEachChild(n, w); }; w(u.body); }
      const rel = path.relative(repo.roots.find((r) => file.startsWith(r)) ?? '/', file);
      for (const u of order) {
        units++; row.units++;
        const why = heapT.whyNot(u.name);
        const isCore = heapT.isCore(u);
        const heapOwn = why.every((r) => r === 'named as a value' || /^(calls|called by) .*, outside the core$/.test(r));
        if (isCore) { core++; row.core++; }
        if (heapOwn) { own++; row.ownFit++; }
        if (!isCore) { const c = coarse(why[0] ?? 'unknown'); firstCoarse[c] = (firstCoarse[c] ?? 0) + 1; }
        let ar; try { ar = mirror.allReasons(u); } catch (e) { ar = { reasons: [`mirror-error|${String(e.message).slice(0, 80)}`], notes: [] }; }
        const mirrorOwn = ar.reasons.length === 0;
        if (mirrorOwn) row.mirrorOwnFit++;
        if (mirrorOwn !== heapOwn) { mismatch++; row.mismatch++; if (mismatches.length < 60) mismatches.push({ repo: repo.name, file: rel, unit: u.name, heap: why, mirror: ar.reasons }); }
        let exposure = [], determinate = false, skErr = null;
        try { exposure = heapT.layer1Risk(u); } catch (e) { exposure = [`unreadable: ${String(e.message).slice(0, 60)}`]; }
        try { determinate = !!heapT.identitySkeleton(u).determinate; } catch (e) { skErr = String(e.message).slice(0, 60); }
        const params = u.params.map((p) => { try { return { name: ts.isIdentifier(p.name) ? p.name.text : '{}', form: !ts.isIdentifier(p.name) ? 'destructuring' : p.dotDotDotToken ? 'rest' : p.initializer ? 'default' : p.questionToken ? 'optional' : 'plain', shape: mirror.shapeKind(ts.isIdentifier(p.name) ? checker.getTypeAtLocation(p.name) : checker.getTypeAtLocation(p)) }; } catch (e) { return { name: '?', form: '?', shape: `error: ${String(e.message).slice(0, 40)}` }; } });
        let rt = null; try { rt = u.isCtor ? null : checker.getSignatureFromDeclaration(u.fn)?.getReturnType(); if (rt && u.isAsync) rt = checker.getAwaitedType(rt) ?? rt; } catch { rt = null; }
        const kind = u.isCtor ? 'constructor' : u.accessor ? (u.accessor === 'get' ? 'getter' : 'setter') : u.cls ? (u.isStatic ? 'static-method' : 'method') : u.isArrow ? 'arrow' : ts.isFunctionExpression(u.fn) ? 'function-expression' : 'function';
        const rec = {
          repo: repo.name, file: rel, line: sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1, name: u.name, kind,
          async: !!u.isAsync, generator: !!u.fn.asteriskToken, usesThis: u.cls ? mirror.usesThis(u.body) : false,
          core: isCore, heapOwnFit: heapOwn, heapFirst: isCore ? null : coarse(why[0] ?? 'unknown'), heapWhy: why,
          reasons: ar.reasons, classes: [...new Set(ar.reasons.map(reasonClass))].sort(), notes: [...ar.notes, ...(() => { try { return mirror.unitNotes(u); } catch (e) { return [`notes error: ${String(e.message).slice(0, 60)}`]; } })()],
          exposure, determinate, skeletonError: skErr,
          params, ret: u.isCtor ? 'instance' : u.fn.asteriskToken ? 'iterator' : rt ? mirror.shapeKind(rt) : 'none',
          calls: [...calls.get(u.name)], asValue: asValue.has(u.name),
          classTraits: u.cls ? classTraits(u.cls, sf) : null,
        };
        fs.writeSync(out, JSON.stringify(rec) + '\n'); written++;
        const cl = rec.classes.join('+') || '(none)'; classAlone[cl] = (classAlone[cl] ?? 0) + 1;
      }
    }
    files += chunk.length; done += chunk.length; walked(chunk);
    process.stderr.write(`${repo.name}: ${done}/${list.length} files, units ${row.units}, core ${row.core}, own ${row.ownFit}, mismatch ${row.mismatch}, ${Math.round((Date.now() - t0) / 1000)} s\n`);
  }
  perRepo[repo.name] = row;
}
fs.closeSync(out);
const sortDesc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
const summary = { census, resolve, repos: repos.map((r) => r.name), files, units, written, core, heapOwnFit: own, mirrorMismatch: mismatch, mismatches, planErrors: planErrors.slice(0, 50), planErrorCount: planErrors.length, perRepo, firstReasonCoarse: sortDesc(firstCoarse), topClassSets: Object.fromEntries(Object.entries(sortDesc(classAlone)).slice(0, 40)), seconds: Math.round((Date.now() - t0) / 1000), digest: createHash('sha256').update(JSON.stringify({ perRepo, firstCoarse })).digest('hex') };
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 1) + '\n');
fs.appendFileSync(journal, JSON.stringify({ kind: 'complete', complete: true, files, units }) + '\n');
console.log(JSON.stringify({ files, units, core, heapOwnFit: own, mirrorMismatch: mismatch, planErrorCount: planErrors.length, seconds: summary.seconds }));
