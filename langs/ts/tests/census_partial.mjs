#!/usr/bin/env node
// An incomplete census is reported, never silent (design/2026-10-31-census-partial.md): the walk is killed after its
// first chunk (SIGKILL, what the kernel's OOM killer sends) or ends with exit 0 before its last one (the silent stop the
// nexus runs showed); either way census.mjs exits non-zero, names the files not walked on stderr, and its JSON carries
// `partial: true`, `filesNotWalked` (the count) and `notWalked` (the files). A whole run is unchanged: exit 0, complete.
//   node langs/ts/tests/census_partial.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const census = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'census.mjs');
let fail = 0;
const row = (name, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`); if (!ok) fail++; };

// four projects, one chunk each: the first chunk completes, the later ones are still to walk when the walk stops
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'census-partial-'));
  const planned = [];
  for (const dir of ['a', 'b', 'c', 'd']) {
    fs.mkdirSync(path.join(root, dir));
    fs.writeFileSync(path.join(root, dir, 'tsconfig.json'), '{}');
    for (const name of ['one.ts', 'two.ts']) {
      fs.writeFileSync(path.join(root, dir, name), 'export function f(n: number): number { return n + 1; }\n');
      planned.push(`${dir}/${name}`);
    }
  }
  return { root, planned: planned.sort() };
}

// runs the census; `onLine` sees each stderr line with the spawned process
function run(root, out, { execArgv = [], onLine = () => {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...execArgv, census, root, '--out', out], { env: { ...process.env, LEAN_CACHE: '0' } });
    let stderr = '', pending = '';
    child.stdout.on('data', (b) => process.stdout.write(b));
    child.stderr.on('data', (b) => {
      process.stderr.write(b); stderr += b; pending += b;
      const lines = pending.split('\n'); pending = lines.pop();
      for (const line of lines) onLine(line, child);
    });
    child.on('error', reject);
    child.on('close', (status, signal) => resolve({ status, signal, stderr }));
  });
}
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { unreadable: String(e.message) }; } };
const walkedIn = (journal) => {
  const files = new Set();
  if (!fs.existsSync(journal)) return files; // a walk without a journal: nothing it walked is recorded
  for (const line of fs.readFileSync(journal, 'utf8').split('\n')) { let r; try { r = JSON.parse(line); } catch { continue; } for (const rec of r.records ?? []) files.add(rec.file); }
  return files;
};
function partialRows(name, planned, out, r) {
  row(`${name}: exit non-zero`, typeof r.status === 'number' ? r.status !== 0 : !!r.signal, `status ${r.status} signal ${r.signal}`);
  const s = readJson(out);
  row(`${name}: JSON partial true, not complete`, s.partial === true && s.complete === false, JSON.stringify({ partial: s.partial, complete: s.complete, unreadable: s.unreadable }));
  const walked = walkedIn(out + '.records.jsonl');
  const expected = planned.filter((f) => !walked.has(f));
  row(`${name}: JSON names the files not walked`, expected.length > 0 && s.filesNotWalked === expected.length && JSON.stringify(s.notWalked) === JSON.stringify(expected), JSON.stringify({ filesNotWalked: s.filesNotWalked, notWalked: s.notWalked, expected }));
  row(`${name}: stderr names the files not walked`, expected.length > 0 && expected.every((f) => r.stderr.includes(f)) && /incomplete/.test(r.stderr), JSON.stringify(r.stderr.trim().split('\n').slice(-4)));
}

// 1. the walk killed by SIGKILL once its first chunk is journaled. The process killed is the one walking: the pid a
// census names in its `walker pid` line, else the census process itself (a census that walks in its own process).
{
  const { root, planned } = fixture();
  try {
    const out = path.join(root, 'result.json');
    let walker = null, killed = null;
    const r = await run(root, out, { onLine: (line, child) => {
      const m = /^walker pid (\d+)$/.exec(line); if (m) walker = Number(m[1]);
      if (killed === null && /heap chunk processed/.test(line)) { killed = walker ?? child.pid; process.kill(killed, 'SIGKILL'); }
    } });
    console.log(`killed walk ${killed} (census ${walker === null ? 'walks in its own process' : 'names its walker'}); census status ${r.status} signal ${r.signal}`);
    row('walk killed by SIGKILL: the kill came mid-run', killed !== null, 'no chunk was processed');
    partialRows('walk killed by SIGKILL', planned, out, r);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// 2. the walk ends with exit 0 right after journaling its first chunk (an import hook exits on the first chunk line)
{
  const { root, planned } = fixture();
  try {
    const out = path.join(root, 'result.json'), hook = path.join(root, 'exit-after-first-chunk.mjs');
    fs.writeFileSync(hook, `import fs from 'node:fs'; const append = fs.appendFileSync;
fs.appendFileSync = function (file, data, ...rest) { const r = append.call(this, file, data, ...rest); if (String(file).endsWith('.records.jsonl') && /"kind":"chunk"/.test(String(data))) process.exit(0); return r; };\n`);
    const r = await run(root, out, { execArgv: ['--import', hook] });
    console.log(`walk exited 0 after its first chunk; census status ${r.status} signal ${r.signal}`);
    partialRows('walk exits 0 early', planned, out, r);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// 3. a whole run: exit 0, complete, no partial flag
{
  const { root, planned } = fixture();
  try {
    const out = path.join(root, 'result.json');
    const r = await run(root, out);
    const s = readJson(out);
    row('whole run: exit 0, complete, not partial', r.status === 0 && s.complete === true && s.partial === undefined && s.files === planned.length, JSON.stringify({ status: r.status, complete: s.complete, partial: s.partial, files: s.files }));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// 4 and 5. the reach census (design/heap-reach-census.mjs --resolve, one chunk per project) under the same rule: its
// walk ended with exit 0 after its first chunk, then a whole run
const reach = path.join(path.dirname(census), 'design', 'heap-reach-census.mjs');
function reachRun(root, outDir, execArgv = []) {
  const base = path.join(root, 'baseline');
  fs.mkdirSync(path.join(base, 'concepts'), { recursive: true });
  fs.writeFileSync(path.join(base, 'concepts-all.json'), JSON.stringify({ perRepo: { fixture: {} } }));
  fs.writeFileSync(path.join(base, 'concepts', 'fixture.json'), JSON.stringify({ roots: [path.join(root, 'src')] }));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...execArgv, reach, path.join(base, 'concepts-all.json'), outDir, '--resolve'], { env: { ...process.env, LEAN_CACHE: '0' } });
    let stderr = '';
    child.stdout.on('data', (b) => process.stdout.write(b));
    child.stderr.on('data', (b) => { process.stderr.write(b); stderr += b; });
    child.on('error', reject);
    child.on('close', (status, signal) => resolve({ status, signal, stderr }));
  });
}
for (const early of [true, false]) {
  const { root } = fixture();
  try {
    fs.mkdirSync(path.join(root, 'src'));
    for (const dir of ['a', 'b', 'c', 'd']) fs.renameSync(path.join(root, dir), path.join(root, 'src', dir));
    const planned = ['a', 'b', 'c', 'd'].flatMap((d) => ['one.ts', 'two.ts'].map((n) => path.join(root, 'src', d, n)));
    const outDir = path.join(root, 'reach'), hook = path.join(root, 'exit-after-first-chunk.mjs');
    fs.writeFileSync(hook, `import fs from 'node:fs'; const append = fs.appendFileSync;
fs.appendFileSync = function (file, data, ...rest) { const r = append.call(this, file, data, ...rest); if (String(file).endsWith('.records.jsonl') && /"kind":"chunk"/.test(String(data))) process.exit(0); return r; };\n`);
    const r = await reachRun(root, outDir, early ? ['--import', hook] : []);
    const s = readJson(path.join(outDir, 'summary.json'));
    if (early) {
      const name = 'reach census walk exits 0 early';
      row(`${name}: exit non-zero`, typeof r.status === 'number' && r.status !== 0, `status ${r.status} signal ${r.signal}`);
      const walked = walkedIn(path.join(outDir, 'walk.records.jsonl'));
      const expected = planned.filter((f) => !walked.has(f)).sort();
      row(`${name}: summary partial true, names the files not walked`, s.partial === true && expected.length > 0 && s.filesNotWalked === expected.length && JSON.stringify([...s.notWalked].sort()) === JSON.stringify(expected), JSON.stringify({ partial: s.partial, filesNotWalked: s.filesNotWalked, notWalked: s.notWalked, expected }));
      row(`${name}: stderr names the files not walked`, expected.length > 0 && expected.every((f) => r.stderr.includes(f)) && /incomplete/.test(r.stderr), JSON.stringify(r.stderr.trim().split('\n').slice(-4)));
    } else row('reach census whole run: exit 0, summary not partial', r.status === 0 && s.partial === undefined && s.files === planned.length, JSON.stringify({ status: r.status, partial: s.partial, files: s.files, unreadable: s.unreadable }));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

console.log(fail ? `${fail} FAIL` : 'ALL PASS');
process.exit(fail ? 1 : 0);
