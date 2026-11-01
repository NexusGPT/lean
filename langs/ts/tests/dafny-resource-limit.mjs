// A proof's verdict must not depend on the machine's load (design/suite.md, 2026-10-31, lane dafny-resource-limit).
// 1. Every `dafny verify` lean's source starts passes exec/dafny-args.mjs dafnyVerifyArgs: the resource limit, and a
//    per-batch wall-clock bound no lower than the time that limit takes at the slowest rate measured, times three.
// 2. The string helpers' heaviest proof (CheckReplace, 12.6 M resources) verified once alone and eleven times at once:
//    the same verdict line every time and the same resource count within a quarter (the count moves by a few percent
//    with the solver process's history, never with the load).
// --break: the arguments before the lane (Dafny's 30 s time limit, no resource limit): part 1 fails; part 2 then rests
// on the wall clock and is green or red as the machine's load decides (an idle 32-core box: green).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnCollect } from '../exec/capped.mjs';
import { dafnyVerifyArgs, DAFNY_RESOURCE_LIMIT, DAFNY_SLOWEST_RATE, DAFNY_TIME_LIMIT_S } from '../exec/dafny-args.mjs';
import { dafnySolverArgs } from '../solve/z3.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), ts = path.join(here, '..');
const BREAK = process.argv.includes('--break');
const args = BREAK ? ['--verification-time-limit', '30', ...dafnySolverArgs()] : dafnyVerifyArgs();
const valueOf = (a, k) => (a.includes(k) ? Number(a[a.indexOf(k) + 1]) : null);

// 1. the arguments, read from the module, and every call site that starts a `dafny verify`
assert.equal(valueOf(args, '--resource-limit'), DAFNY_RESOURCE_LIMIT, `dafny verify is bounded by the resource limit (args: ${args.join(' ')})`);
assert.ok(valueOf(args, '--verification-time-limit') >= 3 * DAFNY_RESOURCE_LIMIT / DAFNY_SLOWEST_RATE, 'the wall-clock bound cannot fire before the resource limit at three times the slowest rate measured');
assert.equal(valueOf(dafnyVerifyArgs({ seconds: 1 }), '--verification-time-limit'), DAFNY_TIME_LIMIT_S, 'a caller\'s shorter bound never lowers it');
const sources = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!['node_modules', 'pairs', 'fixtures', 'design'].includes(e.name)) walk(p); } else if (e.name.endsWith('.mjs')) sources.push(p); } };
walk(ts);
const FAKES = new Set([path.join(here, 'wall-cap.mjs'), fileURLToPath(import.meta.url)]); // fake Dafny executables, and this test's --break
let sites = 0;
for (const f of sources) {
  if (FAKES.has(f)) continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (!/['"]dafny['"]/.test(line) || !/['"]verify['"]/.test(line)) return;
    sites++;
    assert.ok(line.includes('dafnyVerifyArgs('), `${path.relative(ts, f)}:${i + 1} starts a dafny verify without exec/dafny-args.mjs dafnyVerifyArgs`);
    assert.ok(!line.includes('--verification-time-limit'), `${path.relative(ts, f)}:${i + 1} names its own wall-clock limit`);
  });
}
assert.ok(sites >= 5, `the call sites were found (${sites})`);

// 2. one proof alone and eleven at once
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-rlimit-'));
const gen = await spawnCollect(process.execPath, [path.join(here, 'strings/run.mjs'), path.join(tmp, 'helpers.dfy')], { dir: tmp, maxBuffer: 1 << 26, wallCapMs: 1200 * 1000 });
assert.equal(gen.status, 0, `strings/run.mjs: ${(gen.stdout + gen.stderr).trim().split('\n').pop()}`);
const once = async (k) => {
  const csv = path.join(tmp, `run-${k}.csv`);
  const r = await spawnCollect('dafny', ['verify', ...args, '--cores', '1', '--filter-symbol', 'CheckReplace', '--log-format', `csv;LogFileName=${csv}`, path.join(tmp, 'helpers.dfy')], { dir: tmp, maxBuffer: 1 << 26 });
  const text = r.stdout + r.stderr;
  const row = fs.existsSync(csv) ? fs.readFileSync(csv, 'utf8').split('\n').find((l) => l.startsWith('CheckReplace (correctness),')) : null;
  return { verdict: (text.match(/Dafny program verifier finished with [^\n]*/) ?? [text.trim().split('\n').pop()])[0], resources: row ? Number(row.split(',')[3]) : null, seconds: row ? row.split(',')[2] : null };
};
const alone = await once('alone');
const crowd = await Promise.all(Array.from({ length: 11 }, (_, k) => once(k)));
fs.rmSync(tmp, { recursive: true, force: true });
const report = `alone: ${alone.verdict} (${alone.resources} resources, ${alone.seconds}); eleven at once: ${[...new Set(crowd.map((c) => c.verdict))].join(' / ')} (resources ${Math.min(...crowd.map((c) => c.resources))}..${Math.max(...crowd.map((c) => c.resources))}, durations ${crowd.map((c) => c.seconds).sort()[0]}..${crowd.map((c) => c.seconds).sort().at(-1)})`;
console.log(report);
assert.match(alone.verdict, /finished with 1 verified, 0 errors$/, 'CheckReplace proves alone');
for (const c of crowd) {
  assert.equal(c.verdict, alone.verdict, `the verdict under load: ${report}`);
  assert.ok(c.resources && alone.resources && Math.max(c.resources, alone.resources) / Math.min(c.resources, alone.resources) <= 1.25, `the resource count under load: ${report}`);
}
// 3. the verdict's word: a unit whose own lemma runs out of the limit is ASK:resource-limit, its reason naming the
// limit. The checker runs from a copy of lean's langs/ts (its audit, design and tests left out, 17 MB) whose limit is
// 2,000 resources, on a pair the real limit proves; with the real limit it proves.
const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-rlimit-copy-')), cts = path.join(copy, 'langs/ts');
fs.mkdirSync(cts, { recursive: true });
fs.symlinkSync(path.join(ts, '../../spec'), path.join(copy, 'spec')); // the theorem generator, read only
for (const e of fs.readdirSync(ts)) if (!['audit', 'design', 'tests'].includes(e)) fs.cpSync(path.join(ts, e), path.join(cts, e), { recursive: true });
fs.mkdirSync(path.join(cts, 'tests')); fs.copyFileSync(path.join(ts, 'tests/break.mjs'), path.join(cts, 'tests/break.mjs')); // the one --break convention the deciders import
const small = fs.readFileSync(path.join(ts, 'exec/dafny-args.mjs'), 'utf8').replace(/^export const DAFNY_RESOURCE_LIMIT = [\d_]+;/m, 'export const DAFNY_RESOURCE_LIMIT = 2_000;');
assert.ok(small.includes('DAFNY_RESOURCE_LIMIT = 2_000;'), 'the copy\'s limit was set');
fs.writeFileSync(path.join(cts, 'exec/dafny-args.mjs'), small);
fs.writeFileSync(path.join(copy, 'parent.ts'), 'export function f(a: boolean, b: boolean, c: string): string { if (a && b) { return c; } return "no"; }\n');
fs.writeFileSync(path.join(copy, 'candidate.ts'), 'export function f(a: boolean, b: boolean, c: string): string { if (b && a) { return c; } return "no"; }\n');
const checkWith = async (leanTs, out) => {
  const r = await spawnCollect(process.execPath, [path.join(leanTs, 'check.mjs'), '--parent', path.join(copy, 'parent.ts'), '--candidate', path.join(copy, 'candidate.ts'), '--unit', 'f', '--n', '3', '--no-project', '--dafny-seconds', '30', '--out', path.join(copy, out)], { cwd: copy, dir: copy, maxBuffer: 1 << 26, wallCapMs: 1200 * 1000 });
  assert.equal(r.status, 0, (r.stdout + r.stderr).trim().split('\n').slice(-3).join('\n'));
  return JSON.parse(fs.readFileSync(path.join(copy, out), 'utf8'));
};
const [out, real] = await Promise.all([checkWith(cts, 'small.json'), checkWith(ts, 'real.json')]);
fs.rmSync(copy, { recursive: true, force: true });
assert.equal(real.certificate.lanes.A.verdict, 'PASS-proved', `the real limit proves the pair: ${real.certificate.lanes.A.dafny}`);
assert.equal(out.certificate?.lanes?.A?.verdict, 'ASK:resource-limit', `lane A under 2,000 resources: ${out.certificate?.lanes?.A?.verdict} (${out.certificate?.lanes?.A?.dafny ?? out.reason})`);
assert.equal(out.certificate.lanes.A.resourceLimit, 2000);
assert.match(out.reason ?? '', /^not proved: the proof needs more than 2000 resources\b/, `the reason names the limit: ${out.reason}`);
console.log(`${sites} dafny verify call sites pass the resource limit ${DAFNY_RESOURCE_LIMIT}; CheckReplace's verdict and resource count the same alone and eleven at once; a proof past the limit reads ASK:resource-limit (${out.certificate.lanes.A.dafny.replace(/^Dafny program verifier /, '')})`);
