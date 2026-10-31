// The slots of the enumerated small heaps (exec/korat.mjs) that the suite's first inputs never draw.
//   node langs/ts/tests/korat-slots.mjs [--tree <lean root>] [--n 30] [--pairs a,b] [--json out.json]
// For every unit lane B runs in a pair (expect.json "b"), the spec (exec/run.mjs inputPlan, as the suite's --no-project
// or --project run builds it) names the record shapes reachable from the arguments; a SLOT is an argument or a record
// field whose type holds records: a record (or a nullable one), an array of records, a Set whose items are records, a
// Map whose keys or values are records (a nullable item, key or value included). The slot is DRAWN when one of the
// first n inputs that are enumerated heaps (i < builders.length) holds a record in it: the object itself, an element,
// an item, a key or a value. A slot whose item, key or value type admits null is also asked to hold null once. The
// measure reads the built inputs only, so it runs the same on any tree (--tree: the lean root whose exec/run.mjs builds
// them). It is pool-blind: a record the generator drew fresh in a slot counts as drawn too.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const tree = path.resolve(opt('--tree', path.join(here, '..', '..', '..')));
const N = Number(opt('--n', 30));
const only = opt('--pairs', null)?.split(',') ?? null;
const pairs = path.join(here, 'pairs');
const { inputPlan } = await import(pathToFileURL(path.join(tree, 'langs', 'ts', 'exec', 'run.mjs')).href);

const DEPTH = 4; // exec/korat.mjs: a field past this depth is drawn as a primitive, no slot
export function slotsOf(spec) {
  const defs = spec.defs ?? {};
  const resolve = (s, d = 0) => (s && s.kind === 'ref' && defs[s.key] && d < DEPTH ? resolve(defs[s.key], d + 1) : s);
  const absent = (o) => o.kind === 'null' || o.kind === 'undefined';
  const inner = (s) => { const r = resolve(s); if (r && r.kind === 'union') { const os = r.options.filter((o) => !absent(o)); return os.length === 1 ? resolve(os[0]) : null; } return r; };
  const admitsNull = (s) => { const r = resolve(s); return !!(r && r.kind === 'union' && r.options.some(absent)); };
  const rec = (s) => inner(s)?.kind === 'record';
  const kindOf = (s, f = {}) => {
    const r = inner(s); if (!r) return null;
    if (r.kind === 'record') return { kind: 'ref', of: [s] };
    if (r.kind === 'array' && rec(r.of) && !admitsNull(r.of)) return { kind: 'list', of: [r.of] };
    if (f.optional || admitsNull(s)) return null; // an optional or nullable Set or Map field: the generator's
    const c = resolve(s);
    if (c.kind === 'set' && rec(c.of)) return { kind: 'set', of: [c.of], nul: admitsNull(c.of) };
    if (c.kind === 'map' && (rec(c.key) || rec(c.value))) return { kind: 'map', of: [c.key, c.value].filter(rec), nul: (rec(c.key) && admitsNull(c.key)) || (rec(c.value) && admitsNull(c.value)) };
    return null;
  };
  const shapes = new Map(); const slots = [];
  const sig = (r) => Object.keys(r.fields).sort().join(',');
  const visit = (s, d) => {
    if (d > DEPTH) return; const r = inner(s); if (!r || r.kind !== 'record') return;
    const key = sig(r); if (shapes.has(key)) return; shapes.set(key, r);
    for (const [name, f] of Object.entries(r.fields)) {
      if (d + 1 > DEPTH) continue;
      const k = kindOf(f.spec ?? f, f); if (!k) continue;
      slots.push({ id: `{${key}}.${name}`, shape: key, extra: Object.keys(r.fields).filter((x) => r.fields[x].extra).sort().join(','), name, kind: k.kind, nul: !!k.nul });
      for (const o of k.of) visit(o, d + 1);
    }
  };
  spec.params.forEach((p, ai) => { const k = kindOf(p.spec, p); if (!k || p.optional) return; slots.push({ id: `arg${ai}`, arg: ai, kind: k.kind, nul: !!k.nul }); for (const o of k.of) visit(o, k.kind === 'ref' ? 0 : 1); });
  return slots;
}

const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Set) && !(v instanceof Map) && !(v instanceof Date);
const holds = (kind, v) => kind === 'ref' ? plain(v) : kind === 'list' ? Array.isArray(v) && v.some(plain) : kind === 'set' ? v instanceof Set && [...v].some(plain) : kind === 'map' ? v instanceof Map && [...v].some(([a, b]) => plain(a) || plain(b)) : false;
const holdsNull = (kind, v) => kind === 'set' ? v instanceof Set && [...v].some((x) => x == null) : kind === 'map' ? v instanceof Map && [...v].some(([a, b]) => a == null || b == null) : false;
// every plain object reachable from the arguments, by its sorted own keys
function records(args) {
  const out = []; const seen = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
    if (Array.isArray(v)) v.forEach(walk); else if (v instanceof Set) v.forEach(walk); else if (v instanceof Map) v.forEach((b, a) => { walk(a); walk(b); });
    else if (plain(v)) { out.push(v); for (const k of Object.keys(v)) walk(v[k]); }
  };
  args.forEach(walk); return out;
}
const matches = (o, s) => { const ks = Object.keys(o).sort().join(','); if (ks === s.shape) return true; const all = s.shape.split(','), ex = new Set(s.extra.split(',').filter(Boolean)); return ex.size > 0 && ks === all.filter((x) => !ex.has(x)).join(','); };

export function measure(plan, n = N) {
  const slots = slotsOf(plan.spec); const B = plan.heaps.builders; const m = Math.min(n, B.length);
  const drawn = new Set(), nulled = new Set();
  for (let i = 0; i < m; i++) {
    const args = B[i](null); const recs = records(args);
    for (const s of slots) {
      const vals = s.arg !== undefined ? [args[s.arg]] : recs.filter((o) => matches(o, s)).map((o) => o[s.name]);
      if (vals.some((v) => holds(s.kind, v))) drawn.add(s.id);
      if (s.nul && vals.some((v) => holdsNull(s.kind, v))) nulled.add(s.id);
    }
  }
  const never = slots.filter((s) => !drawn.has(s.id)).map((s) => s.id);
  const neverNull = slots.filter((s) => s.nul && !nulled.has(s.id)).map((s) => `${s.id} (null)`);
  return { slots: slots.length, nullable: slots.filter((s) => s.nul).length, heaps: B.length, used: m, never: [...never, ...neverNull] };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rows = []; let total = 0, never = 0, units = 0;
  for (const name of fs.readdirSync(pairs).sort()) {
    if (only && !only.includes(name)) continue;
    const d = path.join(pairs, name); const ef = path.join(d, 'expect.json'); if (!fs.existsSync(ef)) continue;
    const exp = JSON.parse(fs.readFileSync(ef, 'utf8'));
    const side = (k) => (fs.existsSync(path.join(d, k + '.tsx')) ? path.join(d, k + '.tsx') : path.join(d, k + '.ts'));
    for (const unit of Object.keys(exp.b ?? {})) {
      let r; try { r = measure(inputPlan(side('parent'), side('candidate'), unit, { project: exp.project ? path.join(d, exp.project) : false })); } catch (e) { rows.push({ pair: name, unit, error: String(e?.message ?? e).slice(0, 200) }); continue; }
      if (!r.slots) continue;
      units++; total += r.slots + r.nullable; never += r.never.length;
      rows.push({ pair: name, unit, ...r });
      if (r.never.length) console.log(`${name} ${unit}: ${r.never.length} never drawn of ${r.slots} slots (${r.heaps} heaps, ${r.used} used): ${r.never.join('; ')}`);
    }
  }
  const errors = rows.filter((r) => r.error);
  for (const e of errors) console.log(`${e.pair} ${e.unit}: error ${e.error}`);
  console.log(`tree ${tree}, n ${N}: ${units} units with slots, ${total} slots (null draws included), ${never} never drawn; ${errors.length} spec errors`);
  if (opt('--json', null)) fs.writeFileSync(opt('--json'), JSON.stringify({ tree, n: N, units, total, never, rows }, null, 1));
}
