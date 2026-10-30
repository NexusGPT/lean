#!/usr/bin/env node
// The inventory of the `types` refusals (design/types-inventory.md): every finding a census records under rule `types`
// (a translator refusal the type reading owns, readings.mjs), grouped by the type form its message names.
//   node langs/ts/design/types-inventory.mjs <census.json>... [--out inventory.json]
// Each census JSON is census.mjs output (its `records` hold every finding with its message). A unit is counted under
// `types` as the census counts it: its first finding that is not an environment finding, after the units an
// unresolved module blocks (census.mjs stop); the script checks its count against the census's own refusalRules. A
// census that stopped before its summary (complete: false) is read from its journal's finished chunks, marked partial.
// The message names the form for every refusal but one: `type nesting too deep` names no type. For those the script
// opens the file in its project (common.mjs loadManyChunks, as the census does), takes the declarations and
// expressions on the raised line, and walks each one's type along the edges the translator's dtype descends (union
// members, record fields and string index, tuple and array elements, Set, Map and Promise arguments, a call
// signature's parameters and result), a record expanded once per walk as the translator's prelude reserves it. The
// first path past depth 8 names the form: a recursive type when a type recurs on the path (by its declaration), else
// a finite nesting; the declaration's package (node_modules/<pkg>) or `own` says where the type is written. The walk
// mirrors dtype's descent, not its every early return, so a nesting row is a description, never a verdict.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadManyChunks } from '../common.mjs';

const TF = ts.TypeFlags;
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const inputs = args.filter((a, i) => a !== '--out' && i !== outAt + 1);
if (!inputs.length) { console.error('usage: node types-inventory.mjs <census.json>... [--out inventory.json]'); process.exit(2); }

// the form a message names (the nesting form is refined below)
function formOf(msg, unitFile) {
  const m0 = msg.replace(/ \(raised at line \d+, outside this unit: .*\)$/, '');
  if (/^type nesting too deep$/.test(m0)) return 'nesting';
  let m;
  if ((m = /^type parameter (.+) is not one of this function's$/.exec(m0))) {
    // the polymorphic `this` of a class reads as a type parameter named by the class
    return new RegExp(`\\bclass\\s+${m[1].replace(/[^\w$]/g, '')}\\b`).test(unitFile) ? 'type parameter: `this` type of a class' : 'type parameter: of an enclosing class or function';
  }
  if ((m = /^union type (.+) is not translatable$/.exec(m0))) {
    const parts = m[1].split(' | ');
    if (parts.some((p) => p === 'symbol' || p === 'unique symbol')) return 'union: with symbol (a property key)';
    if (parts.some((p) => /^\(.*\) => /.test(p) || /^new \(/.test(p))) return 'union: a function with other members';
    if (parts.some((p) => p === 'bigint' || /^-?\d+n$/.test(p))) return 'union: with a bigint member (bigint or a bigint literal)';
    const prim = parts.filter((p) => /^(string|number|boolean|true|false|"[^"]*"|-?\d[\d.e+-]*)$/.test(p)).length;
    if (prim && prim < parts.length) return 'union: primitives beside records or arrays (no runtime discriminator)';
    return 'union: other';
  }
  if ((m = /^type (.+) is not translatable$/.exec(m0))) {
    const t = m[1];
    if (/^symbol$|^unique symbol$|^typeof /.test(t)) return 'type: symbol';
    if (/^`/.test(t)) return 'type: template literal';
    return `type: ${t.length > 40 ? 'other' : t}`;
  }
  if (/^array-like type /.test(m0)) return 'array-like type without an element type';
  if (/^reference-key: /.test(m0)) return 'reference-key: a Set or Map keyed by an object';
  if (/^builtin-type: /.test(m0)) return 'builtin-type: Set or Map without a library declaration or arguments';
  if (/^a field named .* is the open record's own slot$/.test(m0)) return "a field named as the open record's slot";
  if (/^untyped-js: /.test(m0)) return 'untyped-js';
  return 'other';
}

// census.mjs's attribution: environment-blocked units first, then each unit under its first non-environment finding
function stopped(rec) {
  const first = new Map();
  for (const f of rec.findings) if (f.rule === 'unresolved-module' && f.unit && !first.has(f.unit)) first.set(f.unit, null);
  for (const f of rec.findings) if (f.unit && !f.env && !first.has(f.unit)) first.set(f.unit, f);
  return first;
}

const rows = new Map(); // form -> { units, files:Set, roots:Set, examples:[] }
const perRoot = [];
const nestingSites = []; // { root, file, line, unit, row }
const add = (form, root, file, f) => {
  const r = rows.get(form) ?? { form, units: 0, files: new Set(), roots: new Set(), perRoot: {}, examples: [] };
  r.units++; r.files.add(`${root}/${file}`); r.roots.add(root); r.perRoot[root] = (r.perRoot[root] ?? 0) + 1;
  if (r.examples.length < 3 && !r.examples.some((e) => e.root === root)) r.examples.push({ root, at: `${file}:${raisedLine(f)}`, unit: f.unit, message: f.msg.slice(0, 160) });
  rows.set(form, r);
};
const raisedLine = (f) => Number(/raised at line (\d+)/.exec(f.msg)?.[1] ?? f.line);

for (const input of inputs) {
  const res = JSON.parse(fs.readFileSync(input, 'utf8'));
  // a census that stopped before its summary keeps its finished chunks in its journal: read those, marked partial
  let partial = false;
  if (res.complete === false) {
    if (!res.recordsFile || !fs.existsSync(res.recordsFile)) { console.error(`! ${input}: incomplete census without a journal, skipped`); continue; }
    const chunks = fs.readFileSync(res.recordsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((o) => o.kind === 'chunk');
    res.records = chunks.flatMap((c) => c.records);
    res.units = chunks.length ? chunks[chunks.length - 1].units : 0;
    partial = true;
  }
  const root = path.basename(res.root);
  let units = 0, anyTypes = new Set();
  for (const rec of res.records ?? []) {
    if (!rec.findings) continue;
    let text = null;
    const fileText = () => (text ??= fs.readFileSync(path.join(res.root, rec.file), 'utf8'));
    for (const f of rec.findings) if (f.rule === 'types' && f.unit) anyTypes.add(`${rec.file}:${f.unit}`);
    for (const [unit, f] of stopped(rec)) {
      if (!f || f.rule !== 'types') continue;
      units++;
      const form = formOf(f.msg, fileText());
      if (form === 'nesting') nestingSites.push({ root, base: res.root, file: rec.file, f });
      else add(form, root, rec.file, f);
    }
  }
  const census = partial ? null : res.refusalRules?.find((r) => r.rule === 'types')?.units ?? 0;
  if (!partial && census !== units) console.error(`! ${root}: ${units} units counted under types, the census says ${census}`);
  // the top language rule: the census's own table, or for a partial census each unit under its first finding
  let top = res.refusalRules?.find((r) => !r.rule.startsWith('environment: '));
  if (partial) { const c = new Map(); for (const rec of res.records) if (rec.findings) for (const f of stopped(rec).values()) if (f) c.set(f.rule, (c.get(f.rule) ?? 0) + 1); const [rule, n] = [...c].sort((a, b) => b[1] - a[1])[0] ?? []; top = rule ? { rule, units: n } : null; }
  perRoot.push({ root, ...(partial ? { partial: `journal: ${res.records.length} files read before the run stopped` } : {}), units: res.units, typesStopped: units, censusTypes: census, anyTypesFinding: anyTypes.size, topRule: top ? `${top.rule} ${top.units}` : null });
}

// ---- the nesting sites: the type on the raised line, walked as dtype descends ----
function pkgOf(decl) {
  const f = decl?.getSourceFile().fileName ?? '';
  const m = [...f.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)].pop(); // the last one: a pnpm store nests the package under node_modules/.pnpm/<pkg@version>/node_modules/<pkg>
  return f.includes('/typescript/lib/') ? 'lib' : m ? m[1] : 'own';
}
function walkNesting(checker, t0, at) {
  const seenRecords = new Set();
  const declOf = (t) => (t.aliasSymbol ?? t.symbol)?.declarations?.[0] ?? null;
  const nameOf = (t) => (t.aliasSymbol ?? t.symbol)?.name ?? checker.typeToString(t).slice(0, 40);
  let found = null;
  const go = (t, depth, pathTypes) => {
    if (found) return;
    if (depth > 8) { found = pathTypes; return; }
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown | TF.NumberLike | TF.BigIntLike | TF.BooleanLike | TF.StringLike | TF.EnumLike | TF.Undefined | TF.Null | TF.Void | TF.TypeParameter | TF.IndexedAccess | TF.Conditional | TF.Substitution | TF.TemplateLiteral | TF.StringMapping | TF.Index | TF.ESSymbolLike | TF.NonPrimitive | TF.Never)) return;
    const step = (u) => go(u, depth + 1, [...pathTypes, u]);
    if (f & TF.Union) { const ps = t.types.filter((p) => !(p.flags & (TF.Undefined | TF.Null))); for (const p of ps) (ps.length === t.types.length ? step : (x) => go(x, depth + 1, [...pathTypes, x]))(p); return; }
    if (!(f & (TF.Object | TF.Intersection))) return;
    if (checker.isTupleType(t) || checker.isArrayType(t)) { for (const a of checker.getTypeArguments(t)) step(a); return; }
    const sym = t.symbol?.name;
    if ((sym === 'Set' || sym === 'Map' || sym === 'Promise' || sym === 'ReadonlyArray' || sym === 'ReadonlySet' || sym === 'ReadonlyMap') && t.objectFlags & ts.ObjectFlags.Reference) { for (const a of checker.getTypeArguments(t)) step(a); return; }
    const sig = checker.getSignaturesOfType(t, ts.SignatureKind.Call)[0];
    if (sig) { for (const p of sig.getParameters()) step(checker.getTypeOfSymbolAtLocation(p, at)); step(sig.getReturnType()); return; }
    const props = checker.getPropertiesOfType(t);
    const ix = checker.getIndexInfoOfType(t, ts.IndexKind.String);
    if (seenRecords.has(t)) return; seenRecords.add(t); // the translator's prelude reservation: a record is expanded once
    if (props.some((p) => checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(p, at), ts.SignatureKind.Call).length)) return; // a record with methods is opaque
    for (const p of props) step(checker.getTypeOfSymbolAtLocation(p, at));
    if (ix) step(ix.type);
  };
  go(t0, 0, [t0]);
  if (!found) return null;
  // a type recurs on the path when two of its types share a declaration (an instantiation of the same generic, a
  // self-referring alias or interface)
  const decls = found.map(declOf);
  let recurs = null;
  // (the standard library's generic containers recur by instantiation, Array<A> inside Array<B>, without recursion)
  for (let i = 0; i < decls.length && !recurs; i++) for (let j = i + 1; j < decls.length; j++) if (found[i] === found[j] || (decls[i] && decls[i] === decls[j] && pkgOf(decls[i]) !== 'lib')) { recurs = found[i]; break; }
  const named = recurs ?? found.find((x) => declOf(x) && pkgOf(declOf(x)) !== 'lib') ?? found[0];
  return { recursive: !!recurs, name: nameOf(named), pkg: pkgOf(declOf(named)), chain: found.map(nameOf).join(' > ').slice(0, 300) };
}

if (nestingSites.length) {
  const byRoot = new Map();
  for (const s of nestingSites) { if (!byRoot.has(s.base)) byRoot.set(s.base, []); byRoot.get(s.base).push(s); }
  for (const [base, sites] of byRoot) {
    const files = [...new Set(sites.map((s) => path.join(base, s.file)))];
    for (const loaded of loadManyChunks(files, { log: () => {} })) {
      for (const [abs, L] of loaded) {
        for (const s of sites.filter((x) => path.join(base, x.file) === abs)) {
          let form = 'nesting: the site could not be read again';
          if (L && !L.error) {
            const { sf, checker } = L;
            const line = raisedLine(s.f);
            const cands = [];
            const visit = (n) => {
              const l = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
              if (l === line && (ts.isParameter(n) || ts.isVariableDeclaration(n) || ts.isPropertyDeclaration(n) || ts.isFunctionLike(n) || ts.isExpression(n) || ts.isBindingElement(n))) cands.push(n);
              ts.forEachChild(n, visit);
            };
            visit(sf);
            let w = null;
            for (const n of cands) {
              let t;
              try { t = ts.isFunctionLike(n) ? (checker.getSignatureFromDeclaration(n)?.getReturnType() ?? null) : checker.getTypeAtLocation(n); } catch { t = null; }
              if (!t) continue;
              w = walkNesting(checker, t, n);
              if (w) break;
            }
            form = w ? `nesting: ${w.recursive ? 'a recursive type' : 'a finite type deeper than 8'} (${w.pkg === 'own' ? 'the repository\'s own' : w.pkg === 'lib' ? 'the standard library' : 'package ' + w.pkg})` : 'nesting: no path past depth 8 found on the raised line';
            if (w) s.f = { ...s.f, msg: `${s.f.msg} [${w.name}: ${w.chain}]` };
          }
          add(form, s.root, s.file, s.f);
        }
      }
      loaded.clear();
    }
  }
}

const table = [...rows.values()].sort((a, b) => b.units - a.units).map((r) => ({ form: r.form, units: r.units, files: r.files.size, roots: r.roots.size, perRoot: r.perRoot, examples: r.examples }));
const total = table.reduce((n, r) => n + r.units, 0);
const result = { inputs: inputs.map((p) => path.basename(p)), total, perRoot, forms: table };
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`types-stopped units: ${total}`);
for (const r of table) console.log(`${String(r.units).padStart(6)}  ${String(r.files).padStart(5)} files  ${String(r.roots).padStart(3)} roots  ${r.form}`);
