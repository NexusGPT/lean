// File preparation and persistent lowering are optimizations: every unit keeps its own emission.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { ts, loadProgram, loadManyChunks } from '../common.mjs';
import { translate } from '../translate/translate.mjs';
import { lowerFile, startLoweringProfile, loweringProfile } from '../lower.mjs';
import { census, censusDiff } from '../census.mjs';
import { admissionFindings } from '../lint/lint.mjs';

async function withCensusLock(run) {
  const lock = '/tmp/claude-501/census.lock', owner = path.join(lock, 'owner');
  const queue = '/tmp/claude-501/census.queue'; fs.mkdirSync(queue, { recursive: true });
  const ticketName = `${Math.floor(Date.now() / 1000)}-lowering-cache`;
  const ticket = path.join(queue, ticketName); fs.writeFileSync(ticket, '');
  const token = `lowering-cache-test ${process.pid}\n`;
  for (;;) {
    const tickets = fs.readdirSync(queue).filter(n => /^\d+(?:\.\d+)?-.+/.test(n)).sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]) || a.localeCompare(b));
    if (tickets[0] !== ticketName) {
      console.log(`census queue: older ticket ${tickets[0]}; retry in 10 seconds`);
      await new Promise(resolve => setTimeout(resolve, 10_000)); continue;
    }
    try { fs.mkdirSync(lock); fs.writeFileSync(owner, token); fs.unlinkSync(ticket); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const text = fs.readFileSync(owner, 'utf8');
        let pid; try { pid = Number(JSON.parse(text).pid); } catch { pid = Number(/(?:pid[=: ]+)(\d+)/i.exec(text)?.[1] ?? /\b(\d+)\b/.exec(text)?.[1]); }
        if (pid) try { process.kill(pid, 0); } catch (err) {
          if (err.code === 'ESRCH' && fs.readFileSync(owner, 'utf8') === text) { fs.unlinkSync(owner); fs.rmdirSync(lock); continue; }
        }
      } catch (err) { if (err.code !== 'ENOENT') throw err; }
      console.log('census lock held; retry in 10 seconds');
      await new Promise(resolve => setTimeout(resolve, 10_000));
    }
  }
  try { return await run(); } finally { if (fs.readFileSync(owner, 'utf8') === token) { fs.unlinkSync(owner); fs.rmdirSync(lock); } console.log('released census lock; yielding 60 seconds'); await new Promise(resolve => setTimeout(resolve, 60_000)); }
}

if (process.argv.includes('--summary-test')) {
  await withCensusLock(() => {
    const space = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
    process.stdout.write(space.stdout); process.stderr.write(space.stderr); console.log(`df exit ${space.status}`);
    assert.equal(space.status, 0);
    assert.ok(Number(space.stdout.trim().split('\n').at(-1).split(/\s+/)[3]) >= 10 * 1024 * 1024);
    const root = fs.mkdtempSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '.summary-'));
    try {
      fs.writeFileSync(path.join(root, 'input.ts'), 'export function unit(n: number): number { return n + 1; }');
      const out = path.join(root, 'result.json'), guard = path.join(root, 'guard.mjs');
      // A reader must always see either the incomplete marker or the complete
      // summary, never an in-place rewrite after publication.
      fs.writeFileSync(guard, `import fs from 'node:fs'; const write = fs.writeFileSync;
        fs.writeFileSync = function(file, ...args) { if (String(file) === ${JSON.stringify(out)}) throw new Error('published summary rewritten in place'); return write.call(this, file, ...args); };`);
      const child = spawnSync(process.execPath, ['--import', guard, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../census.mjs'), root, '--out', out], { encoding: 'utf8', env: { ...process.env, LEAN_CACHE: '0' } });
      process.stdout.write(child.stdout); process.stderr.write(child.stderr); console.log(`atomic summary child exit ${child.status}`);
      assert.equal(child.status, 0, 'all summary publication is atomic');
      const summary = JSON.parse(fs.readFileSync(out, 'utf8'));
      assert.equal(summary.complete, true); assert.equal(summary.units, 1);
      const journal = fs.readFileSync(out + '.records.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(journal.at(-1).complete, true);
      assert.deepEqual(journal.flatMap(r => r.records ?? []), summary.records);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  process.exit(0);
}

if (process.argv.includes('--checkpoint-test')) {
  await withCensusLock(async () => {
    const space = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
    process.stdout.write(space.stdout); process.stderr.write(space.stderr); console.log(`df exit ${space.status}`);
    assert.equal(space.status, 0);
    assert.ok(Number(space.stdout.trim().split('\n').at(-1).split(/\s+/)[3]) >= 10 * 1024 * 1024);
    const root = fs.mkdtempSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '.checkpoint-'));
    try {
      for (const dir of ['first', 'second']) {
        fs.mkdirSync(path.join(root, dir));
        fs.writeFileSync(path.join(root, dir, 'tsconfig.json'), '{}');
        fs.writeFileSync(path.join(root, dir, 'input.ts'), (dir === 'first' ? `/*${'x'.repeat(13 * 1024 * 1024)}*/\n` : '') + 'export function unit(n: number): number { return n + 1; }');
      }
      const out = path.join(root, 'result.json');
      const child = spawn(process.execPath, [path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../census.mjs'), root, '--out', out], { env: { ...process.env, LEAN_CACHE: '0' } });
      let stderr = '', killed = false;
      child.stdout.on('data', b => process.stdout.write(b));
      child.stderr.on('data', b => { process.stderr.write(b); stderr += b; if (!killed && stderr.includes('heap chunk processed')) { killed = true; child.kill('SIGTERM'); } });
      const result = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', (code, signal) => resolve({ code, signal })); });
      console.log('interrupted census: ' + JSON.stringify(result));
      assert.ok(killed); assert.equal(result.signal, 'SIGTERM');
      assert.ok(fs.existsSync(out + '.records.jsonl'), 'interrupted census preserves an incomplete record journal');
      const journal = fs.readFileSync(out + '.records.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(journal[0].complete, false);
      assert.ok(journal.some(r => r.records?.length), 'completed first chunk survives');
      assert.ok(!journal.some(r => r.complete === true));
      assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).complete, false, 'an interrupted run never publishes a complete summary');
      assert.throws(() => censusDiff(JSON.parse(fs.readFileSync(out, 'utf8')), { records: [] }), /incomplete census/);
      const chunk = journal.find(r => r.records?.length);
      assert.equal(chunk.oversizedClosures, 1);
      assert.ok(chunk.records[0].closure.totalBytes > chunk.records[0].closure.budgetBytes);
      console.log('partial checkpoint: ' + JSON.stringify({ complete: journal[0].complete, files: chunk.files, units: chunk.units, records: chunk.records.length, closure: chunk.records[0].closure }));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  process.exit(0);
}

if (process.argv.includes('--closure-test')) {
  const root = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.closure-'));
  try {
    fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { noLib: true } }));
    fs.writeFileSync(path.join(root, 'shared.d.ts'), `/*${'d'.repeat(16 * 1024)}*/\nexport interface Shared { n: number }`);
    const files = [12, 12, 12, 36].map((size, i) => {
      const file = path.join(root, `f${i}.ts`);
      fs.writeFileSync(file, `/*${'s'.repeat(size * 1024)}*/\nimport type { Shared } from './shared'; export function f(x: Shared): number { return x.n; }`); return file;
    });
    const budget = 32 * 1024, chunks = [...loadManyChunks(files, { sourceByteBudget: budget })];
    assert.equal(chunks.length, 4, 'source plus imported declaration bytes split the multi-root chunk');
    for (const chunk of chunks) {
      const L = chunk.values().next().value;
      const sources = L.program.getSourceFiles();
      const sourceBytes = sources.filter(s => !s.isDeclarationFile).reduce((n, s) => n + Buffer.byteLength(s.text), 0);
      const declarationBytes = sources.filter(s => s.isDeclarationFile).reduce((n, s) => n + Buffer.byteLength(s.text), 0);
      if (sourceBytes + declarationBytes > budget) {
        assert.equal(chunk.size, 1, 'an indivisible closure is read whole');
        assert.deepEqual(L.closure, { sourceBytes, declarationBytes, totalBytes: sourceBytes + declarationBytes, budgetBytes: budget });
      } else assert.equal(L.closure, undefined);
      chunk.clear();
    }
    console.log('closure byte budget: four chunks, one indivisible closure, declarations preserved');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  process.exit(0);
}

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
  const space = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
  process.stdout.write(space.stdout); process.stderr.write(space.stderr); console.log(`df exit ${space.status}`);
  assert.equal(space.status, 0);
  assert.ok(Number(space.stdout.trim().split('\n').at(-1).split(/\s+/)[3]) >= 10 * 1024 * 1024);
  const root = fs.mkdtempSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '.heap-'));
  try {
    const files = Array.from({ length: 200 }, (_, i) => {
      const f = path.join(root, `f${i}.ts`);
      fs.writeFileSync(f, `export function f${i}(n: number): number { return n + 1; }`); return f;
    });
    const curve = [];
    const result = census(root, { chunk: 20, log: message => {
      if (!message.startsWith('project ')) return;
      global.gc(); global.gc(); // finish any active collection, then measure retained bytes in a fresh one
      const used = process.memoryUsage().heapUsed; curve.push(used);
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
  const missing = path.join(tmp, 'shadowed-promise.ts');
  fs.writeFileSync(missing, 'export class Promise { constructor(public value: number) {} }');
  assert.doesNotThrow(() => admissionFindings(missing, null, { project: false }), 'a missing checker type is an opaque walk result, never an exception');
  const missingRecord = lowerFile(missing, null, { project: false });
  assert.equal(missingRecord.units.length, 1);
  assert.ok(missingRecord.units.every(u => u.refusal?.rule !== 'translator-crash'));
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
  // These scans are lazy: plain numeric functions above never request them.
  const lazyCounts = {};
  for (const [analysis, sourceText] of [
    ['decorations', `/// <reference path=${JSON.stringify(path.join(here, 'pairs/decorators/types.d.ts'))} />\n` + names.map(n => `export function ${n}(handler: object): boolean { return Reflect.getMetadata("role", handler) === "admin"; }`).join('\n')],
    ['value-names', names.map(n => `export function ${n}(n: number): number { return n++ + n; }`).join('\n')],
  ]) {
    const lazy = path.join(tmp, analysis + '.ts'); fs.writeFileSync(lazy, sourceText);
    const L = loadProgram(lazy, { project: false }), analyses = new Map(); let executions = 0;
    for (const unit of names) translate(lazy, null, { core: true, heap: true, project: false, only: [unit], loaded: L,
      fileAnalysis: process.env.LEAN_TEST_ISOLATE_ANALYSES ? undefined : analyses,
      onAnalysis: name => { if (name === analysis) executions++; } });
    console.log(`${analysis}: ${executions} executions for ${names.length} units`);
    lazyCounts[analysis] = executions;
  }
  assert.deepEqual(lazyCounts, { decorations: 1, 'value-names': 1 }, 'lazy analyses are also shared');
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
  const pkg = path.join(tmp, 'node_modules/pkg'); fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'tsconfig.json'), JSON.stringify({ compilerOptions: { module: 'commonjs', moduleResolution: 'node', target: 'es2020' } }));
  fs.writeFileSync(path.join(pkg, 'string.d.ts'), 'export interface Input { value: string }');
  fs.writeFileSync(path.join(pkg, 'map.d.ts'), 'export interface Input { value: Map<any, number> }');
  const resolved = path.join(tmp, 'resolved.ts');
  fs.writeFileSync(resolved, 'import type { Input } from "pkg"; import type { Input as S } from "./node_modules/pkg/string"; import type { Input as M } from "./node_modules/pkg/map"; export function value(x: Input) { return x.value; }');
  const packageFile = path.join(pkg, 'package.json');
  fs.writeFileSync(packageFile, JSON.stringify({ name: 'pkg', version: '1.0.0', types: 'string.d.ts' }));
  const resolutionOptions = { input: resolved, options: { project: true } };
  const resolutionCold = probe('resolution cold', resolutionOptions);
  assert.equal(resolutionCold.record.units[0].refusal, null);
  assert.equal(probe('resolution warm', resolutionOptions).hits, 1);
  fs.writeFileSync(packageFile, JSON.stringify({ name: 'pkg', version: '1.0.0', types: 'map.d.ts' }));
  const resolutionChanged = probe('resolution changed, same source set', resolutionOptions);
  assert.equal(resolutionChanged.hits, 0, 'resolved import edges are part of the key even when both declarations were already loaded');
  assert.deepEqual(resolutionChanged.record, probe('resolution uncached', { ...resolutionOptions, env: { LEAN_CACHE: '0' } }).record);
  assert.ok(resolutionChanged.record.units[0].refusal);
  const large = path.join(tmp, 'large.ts');
  fs.writeFileSync(large, `export function ${'n'.repeat(3 * 1024 * 1024)}(): number { return 1; }`);
  const oversized = probe('oversized memo record', { input: large, options: { emission: false } });
  assert.ok(JSON.stringify(oversized.record).length * 2 > oversized.stats.limit);
  assert.equal(oversized.stats.bytes, 0, 'one oversized record cannot exceed the memo byte budget');
  assert.equal(oversized.stats.entries, 0);
  assert.ok(fs.readdirSync(cache).every(f => !f.endsWith('.next')), 'atomic writes leave no next files');
  console.log('lowering-cache: persistent serve, invalidation, corruption, opt-out and dependency checks pass');
  if (!process.argv.includes('--cache-only')) {
  const cycle = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--type-child'], { encoding: 'utf8', timeout: 20_000 });
  process.stdout.write(cycle.stdout ?? ''); process.stderr.write(cycle.stderr ?? '');
  console.log(`type cycle child exit ${cycle.status}; signal ${cycle.signal}; error ${cycle.error?.code ?? 'none'}`);
  assert.equal(cycle.status, 0, 'recursive intersection/signature graph finishes within 20 seconds');
  const closure = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--closure-test'], { encoding: 'utf8' });
  process.stdout.write(closure.stdout); process.stderr.write(closure.stderr); console.log(`closure child exit ${closure.status}`);
  assert.equal(closure.status, 0);
  const disk = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
  process.stdout.write(disk.stdout); process.stderr.write(disk.stderr); console.log(`df exit ${disk.status}`);
  assert.equal(disk.status, 0);
  assert.ok(Number(disk.stdout.trim().split('\n').at(-1).split(/\s+/)[3]) >= 10 * 1024 * 1024, 'stop below 10 GiB free');
  const heap = await withCensusLock(() => spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), '--heap-child'], { encoding: 'utf8', env: { ...process.env, LEAN_CACHE: '0' } }));
  process.stdout.write(heap.stdout); process.stderr.write(heap.stderr); console.log(`heap child exit ${heap.status}`);
  assert.equal(heap.status, 0, 'chunk construction releases the previous compiler graph');
  const checkpoint = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--checkpoint-test'], { encoding: 'utf8' });
  process.stdout.write(checkpoint.stdout); process.stderr.write(checkpoint.stderr); console.log(`checkpoint child exit ${checkpoint.status}`);
  assert.equal(checkpoint.status, 0);
  const summary = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--summary-test'], { encoding: 'utf8' });
  process.stdout.write(summary.stdout); process.stderr.write(summary.stderr); console.log(`summary child exit ${summary.status}`);
  assert.equal(summary.status, 0);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
