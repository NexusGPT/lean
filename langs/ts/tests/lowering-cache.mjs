// File preparation and persistent lowering are optimizations: every unit keeps its own emission.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ts, loadProgram } from '../common.mjs';
import { translate } from '../translate/translate.mjs';
import { lowerFile, startLoweringProfile, loweringProfile } from '../lower.mjs';
import { census } from '../census.mjs';
import { admissionFindings } from '../lint/lint.mjs';

if (process.argv.includes('--type-child')) {
  const root = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.type-'));
  try {
    const file = path.join(root, 'cycle.ts');
    const fields = Array.from({ length: 100 }, (_, i) => `f${i}: (a: Self, b: Self) => Self`).join(';');
    fs.writeFileSync(file, `type Self = { ${fields} } & { brand: string };\nexport function inspect(x: Self): number { return 1; }`);
    const start = performance.now();
    const findings = admissionFindings(file, null, { project: false });
    console.log(JSON.stringify({ seconds: (performance.now() - start) / 1000, heapUsed: process.memoryUsage().heapUsed, findings }));
    assert.deepEqual(findings, []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  process.exit(0);
}

// Measure at construction of the next chunk, before the old loop binding is replaced.
// A second live compiler graph costs ~12 MiB in this fixture; allow 8 MiB for
// compiler warmup and the plain results, but not an overlapping Program.
if (process.argv.includes('--heap-child')) {
  const root = fs.mkdtempSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '.heap-'));
  try {
    const files = Array.from({ length: 200 }, (_, i) => {
      const f = path.join(root, `f${i}.ts`);
      fs.writeFileSync(f, `export function f${i}(n: number): number { return n + 1; }`); return f;
    });
    const curve = [];
    const result = census(root, { chunk: 20, log: message => {
      if (!message.startsWith('project ')) return;
      global.gc(); const used = process.memoryUsage().heapUsed; curve.push(used);
      console.log(JSON.stringify({ chunk: curve.length, heapUsed: used }));
    } });
    assert.equal(result.files, 200);
    assert.equal(curve.length, 10);
    const bound = 8 * 1024 * 1024;
    for (let k = 1; k < curve.length; k++) assert.ok(curve[k] - curve[0] <= bound,
      `chunk ${k + 1} retained ${curve[k] - curve[0]} extra bytes; bound ${bound}`);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(here, '.lowering-cache-'));
try {
  const file = path.join(tmp, 'many.ts');
  const names = ['one', 'two', 'three', 'four'];
  fs.writeFileSync(file, names.map((n, i) => `export function ${n}(n: number): number { return n + ${i}; }`).join('\n'));
  ts.performance.enable(); ts.performance.clearMarks(); ts.performance.clearMeasures();
  const loaded = loadProgram(file, { project: false });
  const fileAnalysis = new Map(), counts = new Map();
  for (const unit of names) translate(file, null, { core: true, heap: true, project: false, only: [unit], loaded, fileAnalysis,
    onAnalysis: (name) => counts.set(name, (counts.get(name) ?? 0) + 1) });
  assert.equal(ts.performance.getCount('beforeProgram'), 1, 'one Program and checker for the file, none per unit');
  console.log('analysis executions: ' + JSON.stringify(Object.fromEntries(counts)));
  const repeated = [...counts].filter(([, count]) => count !== 1);
  assert.deepEqual(repeated, [], 'every per-file analysis executes once across admitted units');
  const expected = ['normalization', 'number-mode', 'units', 'exceptions', 'generators', 'classes', 'accessors', 'reach', 'react-slots', 'declarations', 'parameter-mutations', 'class-field-index', 'static-cell-index', 'reference-index', 'hook-bindings'];
  assert.deepEqual([...counts.keys()].sort(), expected.sort(), 'all named analyses are counted');
  startLoweringProfile();
  assert.equal(lowerFile(file, null, { project: false }).units.filter(u => !u.refusal).length, names.length);
  const rows = loweringProfile().filter(r => r.phase.startsWith('analysis '));
  assert.deepEqual(Object.fromEntries(rows.map(r => [r.phase.slice(9), r.calls])), Object.fromEntries(expected.map(name => [name, 1])), 'lowerFile shares the same analyses across its units');
  console.log('lowering-cache: program sharing and per-file analyses pass');
  const cycle = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--type-child'], { encoding: 'utf8', timeout: 20_000 });
  process.stdout.write(cycle.stdout ?? ''); process.stderr.write(cycle.stderr ?? '');
  console.log(`type cycle child exit ${cycle.status}; signal ${cycle.signal}; error ${cycle.error?.code ?? 'none'}`);
  assert.equal(cycle.status, 0, 'recursive intersection/signature graph finishes within 20 seconds');
  const disk = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
  process.stdout.write(disk.stdout); process.stderr.write(disk.stderr); console.log(`df exit ${disk.status}`);
  assert.equal(disk.status, 0);
  assert.ok(Number(disk.stdout.trim().split('\n').at(-1).split(/\s+/)[3]) >= 10 * 1024 * 1024, 'stop below 10 GiB free');
  const heap = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), '--heap-child'], { encoding: 'utf8', env: { ...process.env, LEAN_CACHE: '0' } });
  process.stdout.write(heap.stdout); process.stderr.write(heap.stderr); console.log(`heap child exit ${heap.status}`);
  assert.equal(heap.status, 0, 'chunk construction releases the previous compiler graph');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
