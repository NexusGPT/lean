#!/usr/bin/env node
// Replay of a WITNESS's drawn input: does a reader who starts from the witness's args start where both runs started?
//
//   node replay-args.mjs --parent p.ts --candidate c.ts --unit <name> --result <lane B or check.mjs json> [--kind writes|pure] [--project <tsconfig>]
//
// For every witness of a single call (a numeric input), input i is drawn again on a fresh environment seeded as the
// parent's side was (run.mjs inputPlan), the parent is loaded and run on it (run.mjs observe), and three things are
// read: the witness's args equal the fresh draw rendered before the call (renderDrawn); the replay's observation equals
// the witness's parent observation; every argument position the parent's call wrote (its rendering after the call
// differs from the draw) shows, in the witness's args, its value before the write. With --kind writes at least one
// witness must have a written position; with --kind pure none may. Prints one JSON line; exit 0 when every read holds.
import fs from 'node:fs';
import { inputPlan, sandbox, pickUnit, observe, findRoot } from './run.mjs';
import { Environment, renderDrawn } from './fake.mjs';

const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const parent = opt('--parent'), candidate = opt('--candidate'), unit = opt('--unit'), kind = opt('--kind', null);
const project = opt('--project', false);
const res = JSON.parse(fs.readFileSync(opt('--result'), 'utf8'));
const witnesses = (res.witnesses ?? (res.witness ? [res.witness] : [])).filter((w) => Number.isInteger(w.input));
const bound = res.bound ?? res.certificate?.lanes?.B?.bound ?? {};
const seed = bound.seed ?? 1, ms = bound.ms ?? 2000;
const text = (v) => JSON.stringify(v);
// what a written position gained, for the report: the keys of a Map or a record, the elements past an array's length
const keysOf = (r) => (r && r.$ref !== undefined && r.value !== undefined ? keysOf(r.value) : Array.isArray(r) ? null : r && r.$map ? r.$map.map(([k]) => text(k)) : r && typeof r === 'object' ? Object.keys(r) : null);
const unwrap = (r) => (r && r.$ref !== undefined && r.value !== undefined ? r.value : r);
function gained(before, after) {
  const b = unwrap(before), c = unwrap(after);
  if (Array.isArray(b) && Array.isArray(c)) return c.length > b.length ? c.slice(b.length).map((x) => `element ${text(x)}`) : [];
  const kb = keysOf(b), kc = keysOf(c);
  if (!kb || !kc) return [];
  const added = kc.filter((k) => !kb.includes(k)).map((k) => `key ${k}`);
  const changed = b && c && !b.$map && !c.$map ? kb.filter((k) => kc.includes(k) && text(b[k]) !== text(c[k])).map((k) => `field ${k} changed`) : [];
  return [...added, ...changed];
}

const out = { unit, seed, witnesses: [] };
let ok = witnesses.length > 0;
try { // run.mjs keeps late errors as observations (its process hooks): an error of this script is printed and exits 2, never swallowed
const plan = inputPlan(parent, candidate, unit, { project, seed });
for (const w of witnesses) {
  const i = w.input;
  const env = new Environment(seed * 7919 + i); env.shapes = plan.spec;
  const u = pickUnit(sandbox(env, findRoot(parent)).load(parent), plan.spec, env);
  if (!u) { out.witnesses.push({ input: i, error: 'unit not found in the parent' }); ok = false; continue; }
  await new Promise((r) => setImmediate(r));
  env.trace.length = 0; env.pending.length = 0; env.calls.clear(); // as run.mjs mountSides: what the module did while loading is not the unit's
  const inputs = plan.draw(i, env);
  env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
  const drawn = renderDrawn(inputs);
  const obs = await observe({ env, unit: u }, plan.spec, inputs, ms);
  const after = renderDrawn(inputs);
  const sameDraw = text(drawn) === text(w.args);
  const sameObservation = text(obs) === text(w.parent);
  const written = [];
  for (let k = 0; k < drawn.length; k++) {
    if (text(drawn[k]) === text(after[k])) continue;
    const shownBefore = text((w.args ?? [])[k]) === text(drawn[k]) && text((w.args ?? [])[k]) !== text(after[k]);
    written.push({ position: k, gained: gained(drawn[k], after[k]), shownBefore });
  }
  const good = sameDraw && sameObservation && written.every((x) => x.shownBefore);
  if (!good) ok = false;
  out.witnesses.push({ input: i, sameDraw, sameObservation, written, ...(sameDraw ? {} : { args: w.args, drawn }) });
}
} catch (e) { console.log(JSON.stringify({ unit, ok: false, error: String(e && e.stack || e).slice(0, 400) })); process.exit(2); }
const anyWritten = out.witnesses.some((x) => x.written?.length);
if (kind === 'writes' && !anyWritten) { ok = false; out.why = 'no witness had an argument the parent wrote'; }
if (kind === 'pure' && anyWritten) { ok = false; out.why = 'a pure unit wrote an argument'; }
out.ok = ok;
console.log(JSON.stringify(out));
process.exit(ok ? 0 : 1);
