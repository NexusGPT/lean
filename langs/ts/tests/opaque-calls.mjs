// The opacity ladder for calls, members, syntax and callbacks (design/w1c-opaque-calls.md): lane A on the opaque_<rule>
// pairs, and the --break rows. Each break removes one mechanism of the opaque step (LEAN_OPAQUE_BREAK, the convention
// translate/opaque.mjs set: drop-read there, drop-write and drop-callees in translate/opaque-calls.mjs) and names the
// units whose verdict that mechanism guards: with the mechanism they are not proved, without it they become a false
// PASS-proved, which the row refuses. A row that stays green when the mechanism is removed tests nothing, so each break
// row asserts both readings.
//
//   node tests/opaque-calls.mjs              every pair's lane A against its expect.json `equal`, then every break row
//   node tests/opaque-calls.mjs --break      the break rows alone
//   node tests/opaque-calls.mjs --pair <p>   one pair (its lane A, and its break rows)
// Exit 0 when every row holds.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { restsOf, provedLemma, agreeCore } from '../check.mjs';
import { dafnyVerifyArgs } from '../exec/dafny-args.mjs';
import { dafnyName } from '../check.mjs';
import { OPAQUE_CALLS } from '../lint/opaque-calls.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const pairsDir = path.join(here, 'pairs');
const args = process.argv.slice(2);
const only = args.includes('--pair') ? args[args.indexOf('--pair') + 1] : null;
const breakOnly = args.includes('--break');

// the break rows: the pair, the mechanism removed, and the units it guards (each must flip from not proved to proved)
export const BREAKS = [
  { pair: 'opaque_delete', mechanism: 'drop-read', units: ['read_del'] }, // the key changed before the step, read by it
  { pair: 'opaque_alias-origin', mechanism: 'drop-write', units: ['count'] }, // A2: the origin `user` of the alias `t` the step may change
  { pair: 'opaque_callee-text', mechanism: 'drop-callees', units: ['via_callee'] }, // A3: a callee changed only at x === 7919 behind one statement
  { pair: 'opaque_dynamic-key', mechanism: 'drop-read', units: ['read_key'] },
  { pair: 'opaque_assign-target', mechanism: 'drop-write', units: ['write_assign'] },
];

// lane A on one pair, under the environment given: { unit: proved } for every lemma of the pair's units
function laneA(pair, env = {}) {
  const d = path.join(pairsDir, pair);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `w1c-${pair}-`));
  try {
    const run = (cmd, a) => spawnSync(cmd, a, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 26 });
    const tr = (side, extra) => run('node', [path.join(root, 'translate/translate.mjs'), path.join(d, `${side}.ts`), '--core', '--suffix', side, '--out', path.join(tmp, `${side}.dfy`), '--prelude', path.join(tmp, `${side}.pre.dfy`), '--no-project', '--heap', ...extra]);
    const agreed = agreeCore({ files: { parent: path.join(d, 'parent.ts'), candidate: path.join(d, 'candidate.ts') }, dfyOf: (side) => path.join(tmp, `${side}.dfy`), heap: true, tr: (side, eff, units) => { const r = tr(side, [...(eff ? ['--effectful', eff] : []), ...(units !== undefined ? ['--heap-units', units || '-'] : [])]); return { status: r.status, out: r.stdout + r.stderr }; } });
    if (agreed.failed) return { error: `translate ${agreed.failed}: ${agreed.run?.out?.trim().slice(-300)}` };
    const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
    fs.writeFileSync(path.join(tmp, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(exp.scope.map((f) => [f, { in_scope: 'false' }])), summaries: true }));
    fs.writeFileSync(path.join(tmp, 'edit.json'), '{}');
    const th = run('python3', ['-I', path.join(root, '../../spec/theorem.py'), '--parent', path.join(tmp, 'parent.dfy'), '--candidate', path.join(tmp, 'candidate.dfy'), '--scope', path.join(tmp, 'scope.json'), '--edit', path.join(tmp, 'edit.json'), '--out', path.join(tmp, 'theorem.dfy')]);
    const why = (th.stderr || th.stdout).trim();
    if (th.status !== 0 && /differs|opaque block calls/.test(why)) return { proved: Object.fromEntries(exp.scope.map((u) => [u, false])), lemma: Object.fromEntries(exp.scope.map((u) => [u, true])), opaque: {}, finished: true, tail: '', refused: why.slice(-200) }; // the theorem refuses the comparison (check.mjs: ASK:interface): nothing is proved
    if (th.status !== 0) return { error: `theorem: ${why.slice(-300)}` };
    const v = run('dafny', ['verify', ...dafnyVerifyArgs(), '--cores', '2', path.join(tmp, 'theorem.dfy')]);
    const text = v.stdout + v.stderr;
    const lines = fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').split('\n');
    const spans = {}; let cur = null;
    lines.forEach((ln, i) => { const m = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon|Direct)?_\w+)(?:<[^>]*>)?\(/); if (m) { cur = m[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon|Direct)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
    const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1]));
    const finished = /finished with \d+ verified/.test(text);
    const clean = (k) => finished && !!spans[k] && !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]);
    const rests = restsOf(lines);
    const opaque = {}; for (const m of fs.readFileSync(path.join(tmp, 'candidate.dfy'), 'utf8').matchAll(/^\/\/ OPAQUE (\w+)_candidate: (.*)$/gm)) opaque[m[1]] = JSON.parse(m[2]);
    return { proved: Object.fromEntries(exp.scope.map((u) => [u, provedLemma(`Equal_${dafnyName(u)}`, clean, rests)])), lemma: Object.fromEntries(exp.scope.map((u) => [u, !!spans[`Equal_${dafnyName(u)}`]])), opaque, finished, tail: finished ? '' : text.trim().slice(-400) };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const rows = [];
const add = (name, ok, detail) => { rows.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const pairs = [...Object.keys(OPAQUE_CALLS).map((r) => `opaque_${r}`), ...BREAKS.map((b) => b.pair)].filter((p, i, xs) => xs.indexOf(p) === i && fs.existsSync(path.join(pairsDir, p, 'expect.json'))).filter((p) => !only || p === only).sort(); // the pairs of this lane: one per rule of the column, and the break pairs
if (!breakOnly) for (const p of pairs) {
  const exp = JSON.parse(fs.readFileSync(path.join(pairsDir, p, 'expect.json'), 'utf8'));
  const got = laneA(p);
  if (got.error) { add(`${p} lane A`, false, got.error); continue; }
  for (const [u, want] of Object.entries(exp.equal)) add(`${p} ${u} ${want ? 'proved' : 'not proved'}`, got.proved[dafnyName(u)] === want || got.proved[u] === want, `${got.proved[u] ? 'proved' : got.lemma[u] ? 'not proved' : 'no lemma'}${got.finished ? '' : ': ' + got.tail.slice(-160)}`);
  // every unit the pair proves holds at least one opaque step, each step's span is its finding's span (A5)
  for (const [u, want] of Object.entries(exp.equal)) if (want) { const o = got.opaque[dafnyName(u)]; add(`${p} ${u} lists its opaque steps`, !!o && o.steps.length > 0 && o.steps.every((s) => s.span && s.span.line === s.line), o ? `${o.steps.length} step(s), rules ${[...new Set(o.steps.map((s) => s.rule))].join(',')}, fraction ${o.fraction}` : 'no OPAQUE line'); }
}
for (const b of BREAKS.filter((x) => !only || x.pair === only)) {
  if (!fs.existsSync(path.join(pairsDir, b.pair))) { add(`break ${b.mechanism} on ${b.pair}`, false, 'no such pair'); continue; }
  const intact = laneA(b.pair), broken = laneA(b.pair, { LEAN_OPAQUE_BREAK: b.mechanism });
  for (const u of b.units) {
    add(`break ${b.mechanism}: ${b.pair} ${u} not proved with the mechanism`, !intact.error && intact.proved[u] === false && intact.lemma[u], intact.error ?? (intact.proved[u] ? 'PROVED' : intact.lemma[u] ? 'not proved' : 'no lemma'));
    add(`break ${b.mechanism}: ${b.pair} ${u} a false proof without it (the row refuses it)`, !broken.error && broken.proved[u] === true, broken.error ?? (broken.proved[u] ? 'proved: the mechanism is what stops it' : 'still not proved: the break tests nothing'));
  }
}
const bad = rows.filter((r) => !r.ok);
console.log(`${rows.length - bad.length}/${rows.length} rows hold`);
process.exit(bad.length ? 1 : 0);
