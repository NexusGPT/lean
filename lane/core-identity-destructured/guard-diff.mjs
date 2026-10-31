// guard-diff.mjs <before units.jsonl> <after units.jsonl>: the identity guard's reading of each unit, before and after.
// A unit's guard state: 'not exposed' (layer1Risk empty: the guard does not read it), 'determinate' (exposed, one
// readable identity shape: the lemma goes to the two-sided comparison), 'unreadable' (exposed, no readable shape: the
// lemma is withheld). Counts per state, the moves between states, and among the moves the units whose parameters
// carry a destructuring or a rest (the construct of section 0b).
import fs from 'node:fs';
const read = (f) => new Map(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((r) => [`${r.repo}|${r.file}|${r.line}|${r.name}`, r]));
const state = (r) => (r.exposure.length === 0 ? 'not exposed' : r.determinate ? 'determinate' : 'unreadable');
const form = (r) => (r.params.some((p) => p.form === 'destructuring') ? 'destructuring' : r.params.some((p) => p.form === 'rest') ? 'rest' : 'other');
const [b, a] = process.argv.slice(2).map(read);
const count = (m) => { const c = {}; for (const r of m.values()) { const s = state(r); c[s] = (c[s] ?? 0) + 1; } return c; };
const moves = {}, examples = {};
let missing = 0;
for (const [k, rb] of b) {
  const ra = a.get(k); if (!ra) { missing++; continue; }
  const sb = state(rb), sa = state(ra); if (sb === sa) continue;
  const key = `${sb} -> ${sa} (${form(ra)})`; moves[key] = (moves[key] ?? 0) + 1;
  (examples[key] ??= []).length < 3 && examples[key].push(`${rb.file}:${rb.line} ${rb.name}`);
}
const exposedForm = (m) => { const c = {}; for (const r of m.values()) if (state(r) !== 'not exposed') { const k = `${state(r)} ${form(r)}`; c[k] = (c[k] ?? 0) + 1; } return c; };
console.log(JSON.stringify({ units: { before: b.size, after: a.size, missingAfter: missing }, before: count(b), after: count(a), exposedByForm: { before: exposedForm(b), after: exposedForm(a) }, moves, examples }, null, 1));
