#!/usr/bin/env node
// The w1d pairs (design/w1d-opaque-async.md), with the --break convention of amendment A6 (tests/break.mjs, LEAN_BREAK):
//   lint      the lint labels each construct as its pair states (`opaque`: the unit's findings of the family are graded
//             `expression`; `opaqueLint` none: they keep their refusal with the column's reason), and the generator rules
//             keep their refusals with their reasons (tests/w1d-fixtures/generators.ts)
//   pairs     every row of every w1d pair passes through `run.mjs --pair`, its break rows included: the per-rule
//             pairs' upstream unit under async-drop-reads (a change outside the construct, A1), opaque_async_origin under
//             async-drop-origins (A2), opaque_async_callee under async-drop-callees (A3), each a false PASS-proved
//   pending   LEAN_BREAK=async-drop-pending: a step whose pending work reads a local rebound after it is read anyway;
//             opaque_capture's lane A proves falsely, so its check row must fail (that pair is lane B's: no lemma row)
// Pairs start only while the one-minute load is at most 40. Exit 0 when every line holds.
// Usage: node langs/ts/tests/w1d-opaque-async.mjs [--jobs N] [--only plain,pending]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import { dafnyVerifyArgs } from '../exec/dafny-args.mjs'; // the one bound of every dafny verify
import { fileURLToPath } from 'node:url';
import { admissionFindings } from '../lint/lint.mjs';
import { ASYNC_OPAQUE } from '../opaque-async.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pairsDir = path.join(here, 'pairs');
const W1D = /^opaque_(async|promise|generator|capture)/;
const pairs = fs.readdirSync(pairsDir).filter((n) => W1D.test(n)).sort();
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const jobs = String(Math.min(4, Number(arg('--jobs')) || 2));
const only = arg('--only')?.split(',') ?? null;
const want = (k) => !only || only.includes(k);
// the load discipline: a pair starts only while the one-minute load is at most 40 (else it waits)
const loadGate = async () => { while (Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]) > 40) await new Promise((r) => setTimeout(r, 5000)); };
// each pair through `run.mjs --pair <name>` (its own table), at most `jobs` at once
const run = async (names, env) => {
  const one = (name) => new Promise((resolve) => {
    const c = spawn('node', [path.join(here, 'run.mjs'), '--pair', name], { env: { ...process.env, ...env } });
    let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
    c.on('close', () => {
      const rows = out.split('\n').filter((l) => /^\|\s*pair\s*\|/.test(l)).map((l) => { const x = l.split('|').map((y) => y.trim()); return { pair: x[2], check: x[3], ok: x[4] === 'PASS', detail: x.slice(6).join('|').slice(0, 200) }; });
      if (!rows.length) console.error(`${name}: no rows\n${out.slice(-1500)}`);
      resolve(rows);
    });
  });
  const all = []; const queue = [...names];
  await Promise.all(Array.from({ length: Number(jobs) }, async () => { while (queue.length) { const name = queue.shift(); await loadGate(); all.push(...await one(name)); } }));
  return all;
};
let bad = 0;
const say = (ok, text) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${text}`); };
const expectOf = (p) => JSON.parse(fs.readFileSync(path.join(pairsDir, p, 'expect.json'), 'utf8'));

// the lint's labels: a unit the pair reads through steps has every finding of the family labelled opaque; a unit of a
// `none` pair keeps each refusal with the column's reason
for (const p of pairs) {
  const exp = expectOf(p);
  const fs_ = admissionFindings(path.join(pairsDir, p, 'candidate.ts')).filter((f) => ASYNC_OPAQUE[f.rule]);
  for (const u of Object.keys(exp.opaque ?? {})) {
    const mine = fs_.filter((f) => f.unit === u);
    say(mine.length > 0 && mine.every((f) => f.opaque === 'expression'), `lint ${p} ${u}: ${mine.length} finding(s) of the family, ${mine.filter((f) => f.opaque).length} labelled opaque${mine.filter((f) => !f.opaque).map((f) => ` (${f.rule}: ${f.opaqueWhy ?? f.msg})`).join('')}`);
  }
  for (const [u, label] of Object.entries(exp.opaqueLint ?? {})) {
    const mine = fs_.filter((f) => f.unit === u);
    say(label === 'none' && mine.length > 0 && mine.every((f) => !f.opaque && f.opaqueWhy), `lint ${p} ${u}: ${mine.length} finding(s) of the family keep their refusal with the column's reason`);
  }
}

// the generator rules stay `none` by design: each finding of tests/w1d-fixtures/generators.ts keeps its refusal with the column's reason
{
  const fx = admissionFindings(path.join(here, 'w1d-fixtures/generators.ts')).filter((f) => ASYNC_OPAQUE[f.rule]);
  for (const rule of ['generator-bound', 'generator-effect', 'generator']) {
    const mine = fx.filter((f) => f.rule === rule);
    say(mine.length > 0 && mine.every((f) => !f.opaque && !f.advisory && f.opaqueWhy === ASYNC_OPAQUE[rule].why), `lint fixture ${rule}: ${mine.length} finding(s) keep their refusal with the reason`);
  }
}
if (want('plain')) {
  const plain = await run(pairs, {});
  say(plain.length > 0 && plain.every((r) => r.ok), `as written: ${plain.filter((r) => r.ok).length} of ${plain.length} rows pass over ${pairs.length} pairs`);
  for (const r of plain.filter((x) => !x.ok)) console.log(`        ${r.pair}: ${r.check}: ${r.detail}`);
}
// a break run: the rows named must fail (the false proof the pair refuses), every other row of those pairs must pass
// except the units the dropped mechanism may also flip (`mayFlip`)
const breakRun = async (mechanism, names, mustFail, mayFlip = () => false) => {
  const rows = await run(names, { LEAN_BREAK: mechanism, LEAN_STEP_CACHE: '0' });
  const hit = rows.filter(mustFail);
  say(hit.length > 0 && hit.every((r) => !r.ok), `${mechanism}: ${hit.filter((r) => !r.ok).length} of ${hit.length} named rows fail (${hit.map((r) => `${r.pair} ${r.check}`).join('; ')})`);
  const others = rows.filter((r) => !mustFail(r) && !r.ok && !mayFlip(r));
  say(rows.length > 0 && others.length === 0, `${mechanism}: no other row fails (${others.map((r) => `${r.pair} ${r.check}`).join('; ') || 'none'})`);
};
// pending: lane A on opaque_capture directly (check.mjs stops at lane B's WITNESS, so its row cannot show lane A): as
// written the translator refuses the unit, naming its rule; under LEAN_BREAK=async-drop-pending it translates and Dafny
// proves Equal_capture, the false proof the mechanism refuses (the pending put reads m after the step ended)
if (want('pending')) {
  await loadGate();
  const d = path.join(pairsDir, 'opaque_capture'), work = fs.mkdtempSync(path.join(os.tmpdir(), 'w1d-pending-'));
  const lane = (env) => {
    const e = { ...process.env, ...env };
    const tr = ['parent', 'candidate'].map((w) => spawnSync('node', [path.join(here, '../translate/translate.mjs'), path.join(d, `${w}.ts`), '--core', '--suffix', w, '--heap', '--no-project', '--out', path.join(work, `${w}.dfy`), '--prelude', path.join(work, `${w}.pre.dfy`)], { encoding: 'utf8', env: e }));
    if (tr.some((t) => t.status !== 0)) return { translated: false, text: tr.map((t) => t.stdout + t.stderr).join('\n') };
    fs.writeFileSync(path.join(work, 'scope.json'), JSON.stringify({ functions: { capture: { in_scope: 'false' } }, summaries: true })); fs.writeFileSync(path.join(work, 'edit.json'), '{}');
    const th = spawnSync('python3', ['-I', path.join(here, '../../../spec/theorem.py'), '--parent', path.join(work, 'parent.dfy'), '--candidate', path.join(work, 'candidate.dfy'), '--scope', path.join(work, 'scope.json'), '--edit', path.join(work, 'edit.json'), '--out', path.join(work, 'theorem.dfy')], { encoding: 'utf8', env: e });
    if (th.status !== 0) return { translated: true, proved: false, text: th.stdout + th.stderr };
    const v = spawnSync('dafny', ['verify', ...dafnyVerifyArgs(), '--cores', '1', path.join(work, 'theorem.dfy')], { encoding: 'utf8', env: e, maxBuffer: 1 << 26 });
    const out = v.stdout + v.stderr;
    return { translated: true, proved: v.status === 0 && /finished with \d+ verified, 0 errors/.test(out), text: out.slice(-300) };
  };
  const plain = lane({}), broke = lane({ LEAN_BREAK: 'async-drop-pending' });
  say(!plain.translated && /async-callback/.test(plain.text), `pending: as written lane A refuses capture (${plain.translated ? 'translated' : 'refused, naming async-callback'})`);
  say(broke.translated && broke.proved, `pending: under LEAN_BREAK=async-drop-pending lane A ${broke.proved ? 'proves Equal_capture (a false proof: the mechanism is what refuses it)' : `does not prove it (${String(broke.text).replace(/\s+/g, ' ').slice(-160)})`}`);
  fs.rmSync(work, { recursive: true, force: true });
}

console.log(bad ? `${bad} FAILED` : 'ALL PASS');
process.exit(bad ? 1 : 0);
