// w8d measurement for the await fix: the entered async units of a census root (head census) with an await inside an if
// (a branch or the condition, outside a loop and a nested function), each checked as a self-pair at base and head.
//   node awaitif.mjs <root> [--jobs 4]   writes census/<root>-awaitif.jsonl, prints the counts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
const W = '/root/da-bench/w8d-translator-gaps';
const T = '/root/lanes/w8d-translator-gaps/tree/langs/ts';
const { ts, topLevelFunctions } = await import(`${T}/common.mjs`);
const TREES = { base: `${W}/base/langs/ts`, head: T };
const root = process.argv[2];
const jobs = Math.min(4, Number(process.argv[process.argv.indexOf('--jobs') + 1]) || 4);
const j = JSON.parse(fs.readFileSync(`${W}/census/${root}-head.json`, 'utf8'));
const isLoop = (n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);
// an await whose nearest enclosing if (below the unit, no loop or function between) holds it
const awaitInIf = (body) => { let hit = false; const w = (n, inIf) => { if (hit) return; if (ts.isFunctionLike(n) || isLoop(n)) return; if (ts.isAwaitExpression(n) && inIf) { hit = true; return; } ts.forEachChild(n, (c) => w(c, inIf || ts.isIfStatement(n))); }; ts.forEachChild(body, (c) => w(c, false)); return hit; };
const picked = [];
for (const r of j.records ?? []) {
  const entered = new Set((r.lowering ?? []).filter((u) => !u.refusal).map((u) => u.unit));
  if (!entered.size) continue;
  const file = path.join(j.root, r.file);
  let sf; try { sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS); } catch { continue; }
  for (const [name, u] of topLevelFunctions(sf)) {
    if (!entered.has(name)) continue;
    const fn = u.fn ?? u.node;
    if (!fn?.body || !(ts.getCombinedModifierFlags(fn) & ts.ModifierFlags.Async) || !awaitInIf(fn.body)) continue;
    picked.push({ file: r.file, unit: name });
  }
}
console.log(`${root}: ${picked.length} entered async units with an await inside an if`);
const outFile = `${W}/census/${root}-awaitif.jsonl`;
fs.writeFileSync(outFile, '');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `w8d-awaitif-${root}-`));
const loadOk = () => Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]) <= 64;
const waitLoad = async () => { while (!loadOk()) await new Promise((r) => setTimeout(r, 15000)); };
const run = (side, e, i) => new Promise((resolve) => {
  const out = path.join(tmp, `${side}-${i}.json`);
  const f = path.join(j.root, e.file);
  const c = spawn('node', [`${TREES[side]}/check.mjs`, '--parent', f, '--candidate', f, '--unit', e.unit, '--n', '30', '--out', out], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, LEAN_WORKER_HEAP_MB: '6144' } });
  let err = ''; c.stderr.on('data', (d) => { err += d; });
  c.on('close', (code, signal) => {
    let v = null; try { v = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { v = null; }
    const A = v?.certificate?.lanes?.A;
    const row = { side, ...e, code, signal, verdict: v?.verdict ?? null, laneA: A ? String(A.detail ?? A.reason ?? A.verdict ?? '').slice(0, 300) : null, reason: v?.reason ?? (v ? null : err.trim().split('\n').slice(-2).join(' | ').slice(0, 300)) };
    fs.appendFileSync(outFile, JSON.stringify(row) + '\n'); resolve(row);
  });
});
const queue = picked.flatMap((e, i) => ['base', 'head'].map((s) => [s, e, i]));
const rows = []; let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (next < queue.length) { const q = queue[next++]; await waitLoad(); rows.push(await run(...q)); } }));
for (const side of ['base', 'head']) console.log(`${root} ${side}: PASS-proved ${rows.filter((r) => r.side === side && r.verdict === 'PASS-proved').length} of ${picked.length} (verdicts: ${JSON.stringify(rows.filter((r) => r.side === side).reduce((m, r) => { const k = r.verdict ?? `none(${r.code})`; m[k] = (m[k] ?? 0) + 1; return m; }, {}))})`);
const key = (r) => `${r.file}\u0000${r.unit}`;
const P = (s) => new Set(rows.filter((r) => r.side === s && r.verdict === 'PASS-proved').map(key));
const pb = P('base'), ph = P('head');
for (const r of rows) if (r.side === 'head' && ph.has(key(r)) && !pb.has(key(r))) console.log(`  gained: ${r.file} ${JSON.stringify(r.unit)}`);
for (const r of rows) if (r.side === 'base' && pb.has(key(r)) && !ph.has(key(r))) console.log(`  LOST: ${r.file} ${JSON.stringify(r.unit)}`);
fs.rmSync(tmp, { recursive: true, force: true });
