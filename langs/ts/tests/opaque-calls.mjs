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
const pairsDirs = [path.join(here, 'pairs'), path.join(here, 'opaque-calls-pairs')]; // the suite's pairs, and the pairs the suite's pair step cannot state (a theorem refusal)
const pairDir = (p) => pairsDirs.map((d) => path.join(d, p)).find((d) => fs.existsSync(d)) ?? path.join(pairsDirs[0], p);
const args = process.argv.slice(2);
const only = args.includes('--pair') ? args[args.indexOf('--pair') + 1] : null;
const breakOnly = args.includes('--break');

// the break rows: the pair, the mechanism removed, and the units it guards (each must flip from not proved to proved)
export const BREAKS = [
  { pair: 'opaque_delete', mechanism: 'drop-read', units: ['read_del'] }, // the key changed before the step, read by it
  { pair: 'opaque_alias-origin', mechanism: 'drop-write', units: ['count'] }, // A2: the origin `user` of the alias `t` the step may change
  { pair: 'opaque_callee-text', mechanism: 'drop-callees', units: ['via_callee'] }, // A3: a callee changed only at x === 7919 behind one statement
  { pair: 'opaque_dynamic-key', mechanism: 'drop-read', units: ['read_key'] },
];

// lane A on one pair, under the environment given: { unit: proved } for every lemma of the pair's units
function laneA(pair, env = {}) {
  const d = pairDir(pair);
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
    const withheld = Object.fromEntries(lines.map((ln) => ln.match(/^\/\/ UNGUARDED Equal_(\w+): (.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])); // the identity guard withheld the lemma: nothing is proved
    return { withheld, proved: Object.fromEntries(exp.scope.map((u) => [u, provedLemma(`Equal_${dafnyName(u)}`, clean, rests)])), lemma: Object.fromEntries(exp.scope.map((u) => [u, !!spans[`Equal_${dafnyName(u)}`]])), opaque, finished, tail: finished ? '' : text.trim().slice(-400) };
  } finally { if (process.env.W1C_KEEP) console.error(`kept ${tmp}`); else fs.rmSync(tmp, { recursive: true, force: true }); }
}

const rows = [];
const add = (name, ok, detail) => { rows.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const pairs = [...Object.keys(OPAQUE_CALLS).map((r) => `opaque_${r}`), ...BREAKS.map((b) => b.pair), 'opaque_param-output'].filter((p, i, xs) => xs.indexOf(p) === i && fs.existsSync(path.join(pairDir(p), 'expect.json'))).filter((p) => !only || p === only).sort(); // the pairs of this lane: one per rule of the column, and the break pairs
// the site decision (lint/opaque-calls.mjs callsOpaqueSite), read off the lint: each snippet's finding of the rule is
// labelled opaque or keeps its refusal with the reason
const LINT_ROWS = [
  { name: 'delete of an optional member is a step', rule: 'delete', opaque: true, src: 'export function f(o: { a?: number }, x: number): number { const r = delete o.a; return r ? x : 0; }' },
  { name: 'delete of an index entry is a step', rule: 'delete', opaque: true, src: 'export function f(o: { [k: string]: number }, k: string): number { const r = delete o[k]; return r ? 1 : 0; }' },
  { name: 'delete of a member no type declares optional keeps its refusal (A4)', rule: 'delete', opaque: false, why: /not declared|required/, src: 'export function f(o: { a: number }, x: number): number { const s = delete (o as any).b; return s ? x : 0; }' },
  { name: 'delete by a literal key naming a required member keeps its refusal (A4)', rule: 'delete', opaque: false, why: /required member/, src: 'export function f(o: { a: number; b?: number }, k: "a" | "b"): number { const s = delete o[k]; return s ? 1 : 0; }' },
  { name: 'delete of a required member through a widening assertion keeps its refusal (A4)', rule: 'delete', opaque: false, why: /required member/, src: 'type R = { status: number; config: { a: number } };\nexport function f(e: { response: R }): number { const s = delete (e.response as Partial<R>).config; return s ? e.response.status : 0; }' },
  { name: 'a finding in a parameter default keeps its refusal (never the unit, A5)', rule: 'callback-form', opaque: false, why: /no statement/, src: 'export function f(xs: number[], ys = xs.map(function (y) { return y + 1; })): number { return ys.length; }' },
  { name: 'a finding in a nested (hoisted) function declaration keeps its refusal', rule: 'callback-form', opaque: false, why: /no statement/, src: 'export function f(xs: number[]): number { return g().length; function g() { return xs.map(function (y) { return y + 1; }); } }' },
  { name: 'exception-binding is sited at its try', rule: 'exception-binding', opaque: true, src: 'export function f(x: number): number { let y = x; try { const y = 1; if (x > 0) return y; } finally { y += 1; } return y; }' },
  { name: 'freeze keeps its refusal (A4)', rule: 'freeze', opaque: false, src: 'export function f(o: { a: number }): number { Object.freeze(o); return o.a; }' },
];
if (!breakOnly && (!only || only === "lint")) {
  const { lintFile } = await import('../lint/lint.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1c-lint-'));
  try {
    for (const [i, r] of LINT_ROWS.entries()) {
      const f = path.join(dir, `s${i}.ts`); fs.writeFileSync(f, r.src + '\n');
      const hits = lintFile(f, null, { project: false }).filter((x) => x.rule === r.rule);
      const ok = hits.length > 0 && hits.every((x) => !!x.opaque === r.opaque && (r.opaque || !r.why || r.why.test(x.opaqueWhy ?? '')));
      add(`lint: ${r.name}`, ok, hits.map((x) => `${x.rule}${x.opaque ? ' [opaque]' : ''}${x.opaqueWhy ? ': ' + x.opaqueWhy.slice(0, 80) : ''}`).join('; ') || 'no finding of the rule');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
if (!breakOnly) for (const p of pairs) {
  const exp = JSON.parse(fs.readFileSync(path.join(pairDir(p), 'expect.json'), 'utf8'));
  if (exp.refused) { // a rule whose column is none: every finding of it keeps its refusal, no opaque label
    for (const side of ['parent', 'candidate']) { const r = spawnSync('node', [path.join(root, 'lint/lint.mjs'), path.join(pairDir(p), `${side}.ts`), '--no-project', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }); let fs_ = []; try { fs_ = JSON.parse(r.stdout); } catch { /* none */ } const hits = fs_.filter((f) => f.rule === exp.refused); add(`${p} ${side}: every ${exp.refused} finding refuses`, hits.length > 0 && hits.every((f) => !f.opaque && !f.advisory) && r.status === 1, `${hits.length} finding(s), ${hits.filter((f) => f.opaque).length} labelled opaque`); }
    continue;
  }
  const got = laneA(p);
  if (got.error) { add(`${p} lane A`, false, got.error); continue; }
  for (const [u, want] of Object.entries(exp.equal)) add(`${p} ${u} ${want === 'real-only' ? 'real lemma proved' : want ? 'proved' : 'not proved'}`, (got.proved[dafnyName(u)] ?? got.proved[u]) === (want === 'real-only' ? true : want), `${got.proved[u] ? 'proved' : got.lemma[u] ? 'not proved' : got.withheld?.[dafnyName(u)] ? `withheld: ${got.withheld[dafnyName(u)].slice(0, 100)}` : 'no lemma'}${got.finished ? '' : ': ' + got.tail.slice(-160)}`);
  // every unit the pair proves holds at least one opaque step, each step's span is its finding's span (A5)
  for (const [u, want] of Object.entries(exp.equal)) if (want === true) { const o = got.opaque[dafnyName(u)]; add(`${p} ${u} lists its opaque steps`, !!o && o.steps.length > 0 && o.steps.every((s) => s.span && s.span.line === s.line), o ? `${o.steps.length} step(s), rules ${[...new Set(o.steps.map((s) => s.rule))].join(',')}, fraction ${o.fraction}` : 'no OPAQUE line'); }
}
for (const b of BREAKS.filter((x) => !only || x.pair === only)) {
  if (!fs.existsSync(pairDir(b.pair))) { add(`break ${b.mechanism} on ${b.pair}`, false, 'no such pair'); continue; }
  const intact = laneA(b.pair), broken = laneA(b.pair, { LEAN_OPAQUE_BREAK: b.mechanism });
  for (const u of b.units) {
    add(`break ${b.mechanism}: ${b.pair} ${u} not proved with the mechanism`, !intact.error && intact.proved[u] === false && intact.lemma[u], intact.error ?? (intact.proved[u] ? 'PROVED' : intact.lemma[u] ? 'not proved' : 'no lemma'));
    add(`break ${b.mechanism}: ${b.pair} ${u} a false proof without it (the row refuses it)`, !broken.error && broken.proved[u] === true, broken.error ?? (broken.proved[u] ? 'proved: the mechanism is what stops it' : 'still not proved: the break tests nothing'));
  }
}
const bad = rows.filter((r) => !r.ok);
console.log(`${rows.length - bad.length}/${rows.length} rows hold`);
process.exit(bad.length ? 1 : 0);
