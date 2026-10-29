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
  // A fresh process must serve the on-disk record, not the in-process memo.
  const source = path.join(tmp, 'producer'); fs.mkdirSync(source);
  const tsRoot = path.resolve(here, '..');
  for (const e of fs.readdirSync(tsRoot, { withFileTypes: true })) {
    if (e.isFile() && /\.(mjs|json|ts)$/.test(e.name)) fs.copyFileSync(path.join(tsRoot, e.name), path.join(source, e.name));
  }
  for (const dir of ['lint', 'translate']) fs.cpSync(path.join(tsRoot, dir), path.join(source, dir), { recursive: true });
  for (const dir of ['vendor', 'exec']) fs.symlinkSync(path.join(tsRoot, dir), path.join(source, dir), 'dir');
  const cache = path.join(tmp, 'cache');
  const probe = (label, { env = {}, options = {}, ranges = null, input = file } = {}) => {
    const code = `import { lowerFile, startLoweringProfile, loweringProfile, loweringCacheStats } from ${JSON.stringify(pathToFileURL(path.join(source, 'lower.mjs')).href)};
      startLoweringProfile(); const record = lowerFile(${JSON.stringify(input)}, ${JSON.stringify(ranges)}, ${JSON.stringify({ project: false, ...options })});
      console.log(JSON.stringify({ record, profile: loweringProfile(), stats: loweringCacheStats() }));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, LEAN_CACHE: '1', LEAN_CACHE_DIR: cache, LEAN_WITHDRAW: '', ...env }, maxBuffer: 16 * 1024 * 1024 });
    process.stderr.write(r.stderr ?? ''); console.log(`${label}: child exit ${r.status}`);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const out = JSON.parse(r.stdout);
    out.hits = out.profile.find(r => r.phase === 'disk cache hit')?.calls ?? 0;
    out.emissions = out.profile.find(r => r.phase.startsWith('phase 4 '))?.calls ?? 0;
    return out;
  };
  const cold = probe('cold'), warm = probe('warm');
  assert.equal(cold.hits, 0);
  assert.ok(cold.emissions > 0);
  assert.equal(warm.hits, 1, 'the second process serves the record from disk');
  assert.equal(warm.emissions, 0, 'a disk hit never translates again');
  assert.deepEqual(warm.record, cold.record);
  assert.ok(cold.stats.bytes > 0 && cold.stats.bytes <= cold.stats.limit);
  const plain = (v) => { if (v === null || typeof v !== 'object') { assert.notEqual(typeof v, 'function'); return; }
    assert.ok(Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype);
    for (const x of Object.values(v)) plain(x);
  };
  plain(cold.record);
  const files = fs.readdirSync(cache).filter(f => f.endsWith('.json'));
  assert.equal(files.length, 1);
  fs.writeFileSync(path.join(cache, files[0]), '{broken');
  const corrupt = probe('corrupt cache'); assert.equal(corrupt.hits, 0); assert.deepEqual(corrupt.record, cold.record);
  const disabled = probe('disabled', { env: { LEAN_CACHE: '0' } }); assert.equal(disabled.hits, 0); assert.ok(disabled.emissions > 0);
  const withdrawal = probe('withdrawal', { env: { LEAN_WITHDRAW: 'numbers=cache test' } });
  assert.equal(withdrawal.hits, 0); assert.ok(withdrawal.record.units.every(u => u.refusal?.rule === 'withdrawn'));
  assert.equal(probe('restored').hits, 1);
  const opts = probe('options', { options: { emission: false } }); assert.equal(opts.hits, 0);
  const range = probe('ranges', { ranges: [[1, 1]] }); assert.equal(range.hits, 0); assert.equal(range.record.units.length, 1);
  fs.appendFileSync(path.join(source, 'translate/translate.mjs'), '\n// cache source invalidation probe\n');
  const changedSource = probe('changed translator source'); assert.equal(changedSource.hits, 0); assert.ok(changedSource.emissions > 0); assert.deepEqual(changedSource.record, cold.record);
  assert.equal(probe('same changed translator source').hits, 1);
  fs.appendFileSync(file, '\nexport function added(): number { return 5; }\n');
  const changedText = probe('changed text'); assert.equal(changedText.hits, 0); assert.equal(changedText.record.units.length, names.length + 1);
  const dep = path.join(tmp, 'dep.ts'), dependent = path.join(tmp, 'dependent.ts');
  fs.writeFileSync(dep, 'export interface Input { value: string }\n');
  fs.writeFileSync(dependent, 'import { Input } from "./dep";\nexport function value(x: Input): string { return x.value; }\n');
  const depCold = probe('dependency cold', { input: dependent }); assert.equal(depCold.hits, 0);
  assert.equal(probe('dependency warm', { input: dependent }).hits, 1);
  fs.writeFileSync(dep, 'export interface Input { value: number }\n');
  const depChanged = probe('dependency changed', { input: dependent }); assert.equal(depChanged.hits, 0); assert.ok(depChanged.record.units[0].refusal);
  const large = path.join(tmp, 'large.ts');
  fs.writeFileSync(large, `export function ${'n'.repeat(3 * 1024 * 1024)}(): number { return 1; }`);
  const oversized = probe('oversized memo record', { input: large, options: { emission: false } });
  assert.ok(JSON.stringify(oversized.record).length * 2 > oversized.stats.limit);
  assert.equal(oversized.stats.bytes, 0, 'one oversized record cannot exceed the memo byte budget');
  assert.equal(oversized.stats.entries, 0);
  assert.ok(fs.readdirSync(cache).every(f => !f.endsWith('.next')), 'atomic writes leave no next files');
  console.log('lowering-cache: persistent serve, invalidation, corruption, opt-out and dependency checks pass');

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
