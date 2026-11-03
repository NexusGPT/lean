#!/usr/bin/env node
// The w9bb checks: the hard set's ASK and unlisted causes, one mechanism each (design/w9bb-hard-ask-census.md).
//   w9bb-source-nul  ci/ledger.mjs binaryBytes: a TypeScript file holding a raw NUL byte in a template literal (n8n's
//                    quickjs-bridge.ts) is text, its changed unit listed and run; a real binary stays binary, and so does
//                    a source file .gitattributes declares binary. Under the break the file is artifact:binary and no unit of it is listed (the hard set's `unit not listed`).
//   w9bb-runner-bound  exec/run.mjs boundedChild: the new unit's runner is bounded by its CPU time with a far wall guard,
//                    as lane B's paired worker is: a child that waits 3 s burning no CPU (a loaded machine's wait) outlives
//                    a 1 s budget, and a child that spins is stopped at its 1 s of CPU. Under the break: a wall bound alone
//                    kills the waiting child (the hard set's 25 `spawnSync /usr/bin/node ETIMEDOUT` units, load 60-117).
//   w9bb-runner-reason exec/new-unit.mjs runnerReason: a runner that gives no result says why: the bound, its budget and
//                    the load, or its exit and its stderr's last words. Under the break, `candidate runner exited 1: `.
//   w9bb-platform-events exec/run.mjs platformEvents: a module whose class extends Event (react#36253's
//                    LegacySyntheticEvent) loads, and its constructor's changed field is a WITNESS; a dispatch through an
//                    EventTarget of a CustomEvent is the same on both sides. Under the break: `ASK(platform global): Event
//                    is not defined` at the load.
//   w9bb-types-declared exec/new-unit.mjs resolveModule: a script importing `bun` and `bun:sqlite`, in a package that
//                    declares only `@types/bun` (cline#14303's build-sidecar-bin.ts), loads with the runtime's module as
//                    the recording fake; its new unit is NEW. Under the break: `ASK(undeclared external package): Cannot
//                    find module 'bun'`.
//   w9bb-vendored-range exec/fakes/lib/index.mjs declaredAdmits: a module on zod 4 (`z.email()`, Checkmate#3288's
//                    settings schema) in a package declaring `"zod": "^4.1.11"` loads, zod the recording proxy, since the
//                    vendored zod is 3.25.76; a range on the vendored major keeps it, an exact pin too (range.mjs cases). Under
//                    the break: `ASK(fake answering at module evaluation): z.email is not a function`.
//
//   node tests/w9bb-hard-ask.mjs           each check green
//   node tests/w9bb-hard-ask.mjs --break   each check once with its mechanism switched off: every one must be red
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boundedChild } from '../exec/run.mjs';
import { runnerReason } from '../exec/new-unit.mjs';
import { compatible } from '../exec/fakes/lib/range.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const brk = process.argv.includes('--break');
const envOf = (m) => { const env = { ...process.env }; if (m) env.LEAN_BREAK = m; else delete env.LEAN_BREAK; return env; };
const git = (cwd, args) => { const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${args[0]}: exit ${r.status}: ${r.stderr}`); return r.stdout.trim(); };

// a repository with a base commit and a head commit that edits one function of a file holding raw NULs, and a binary
function nulRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w9bb-nul-'));
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'w9bb@lean']); git(dir, ['config', 'user.name', 'w9bb']);
  const file = (cmp) => `export function key(name: string, locale: string): string {\n  return \`\${name}\0\${locale}\`;\n}\n\nexport function wrap(value: number): boolean {\n  return ${cmp};\n}\n`;
  fs.writeFileSync(path.join(dir, 'bridge.ts'), file('isNaN(value)'));
  fs.writeFileSync(path.join(dir, 'blob.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 0xff, 0xfe]));
  fs.writeFileSync(path.join(dir, '.gitattributes'), 'declared.ts binary\n'); // the author's declaration stays binary
  fs.writeFileSync(path.join(dir, 'declared.ts'), file('isNaN(value)'));
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'base']);
  const base = git(dir, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(dir, 'bridge.ts'), file('Number.isNaN(value)'));
  fs.writeFileSync(path.join(dir, 'blob.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 3, 4, 0xff, 0xfe]));
  fs.writeFileSync(path.join(dir, 'declared.ts'), file('Number.isNaN(value)'));
  git(dir, ['commit', '-q', '-am', 'head']);
  return { dir, base, head: git(dir, ['rev-parse', 'HEAD']) };
}

const checks = [
  ['w9bb-source-nul', 'a TypeScript file with a raw NUL in a template literal is text, its changed unit listed', (m) => {
    const { dir, base, head } = nulRepo();
    const out = path.join(dir, 'out.json');
    const r = spawnSync(process.execPath, [path.join(here, '..', 'pr.mjs'), '--repo', dir, '--base', base, '--head', head, '--no-project', '--n', '2', '--dafny-seconds', '1', '--runs-dir', path.join(dir, 'runs'), '--json', out], { encoding: 'utf8', env: envOf(m), maxBuffer: 1 << 26 });
    let rows = [];
    try { const j = JSON.parse(fs.readFileSync(out, 'utf8')); rows = j.lean_rows ?? j.rows ?? []; } catch (e) { return { ok: false, detail: `no result (exit ${r.status}): ${String(r.stderr).slice(-300)}` }; }
    const bridge = rows.filter((x) => x.file === 'bridge.ts'), blob = rows.filter((x) => x.file === 'blob.bin' || x.file === 'declared.ts');
    const ok = bridge.some((x) => x.unit === 'wrap' && !/^artifact/.test(String(x.coverage))) && !bridge.some((x) => x.coverage === 'artifact:binary') && new Set(blob.map((x) => x.file)).size === 2 && blob.every((x) => x.coverage === 'artifact:binary');
    fs.rmSync(dir, { recursive: true, force: true });
    return { ok, detail: `exit ${r.status}; bridge.ts: ${bridge.map((x) => `${x.unit} ${x.coverage} ${x.verdict}`).join(', ') || 'no row'}; blob.bin, declared.ts: ${blob.map((x) => `${x.file} ${x.coverage}`).join(', ') || 'no row'}` };
  }],
  ['w9bb-runner-bound', 'a runner waiting without CPU outlives its budget; a spinning one stops at its CPU bound, the reason naming it', async (m) => {
    const wait = await withBreak(m, () => boundedChild(process.execPath, ['-e', 'setTimeout(() => console.log(JSON.stringify({ verdict: "NEW" })), 3000)'], { seconds: 1, env: process.env }));
    const spin = await withBreak(m, () => boundedChild(process.execPath, ['-e', 'for (;;) {}'], { seconds: 1, env: process.env }));
    const reason = runnerReason(spin, { n: 2, ms: 100, seconds: 1 });
    const ok = wait.status === 0 && !wait.stop && /"NEW"/.test(wait.stdout) && spin.stop?.why === 'CPU-time' && /passed its CPU-time bound of 1 s .*trial runs.*one-minute load/.test(reason);
    return { ok, detail: `waiting child: ${wait.stop ? `stopped at ${wait.stop.why} after ${wait.stop.wallSeconds} s` : `exit ${wait.status}, ${wait.stdout.trim()}`}; spinning child: ${reason.slice(0, 200)}` };
  }],
  ['w9bb-runner-reason', 'a runner that exits with no result names its stderr', async (m) => {
    const child = await boundedChild(process.execPath, ['-e', 'console.error("Error: Cannot read properties of undefined (reading \'sandbox\')"); process.exit(1)'], { seconds: 5, env: process.env });
    const reason = await withBreak(m, () => runnerReason(child, { n: 2, ms: 100, seconds: 5 }));
    const ok = /^candidate runner exited 1: Error: Cannot read properties of undefined \(reading 'sandbox'\)$/.test(reason);
    return { ok, detail: JSON.stringify(reason) };
  }],
  ['w9bb-platform-events', 'a class extending Event loads; its changed constructor is a WITNESS, an EventTarget dispatch PASS', (m) => {
    const fx = path.join(here, 'fixtures', 'w9bb-hard-ask');
    const lean = (unit, cand) => { const r = spawnSync(process.execPath, [path.join(here, '..', 'check.mjs'), '--parent', path.join(fx, 'synthetic-event.js'), '--candidate', path.join(fx, cand), '--unit', unit, '--n', '8', '--no-project', '--dafny-seconds', '5'], { encoding: 'utf8', env: envOf(m), maxBuffer: 1 << 26 }); try { return JSON.parse(r.stdout); } catch { return { verdict: `unparsed (exit ${r.status})`, certificate: { lanes: { B: { reason: String(r.stderr).slice(-300) } } } }; } };
    const ctor = lean('SyntheticEvent.constructor', 'synthetic-event-swapped.js'), relay = lean('relay', 'synthetic-event-swapped.js');
    const b = (r) => r.certificate?.lanes?.B ?? {};
    const ok = b(ctor).verdict === 'WITNESS' && /^PASS/.test(String(b(relay).verdict));
    return { ok, detail: `constructor: ${b(ctor).verdict}${b(ctor).verdict === 'WITNESS' ? '' : ` ${String(b(ctor).reason).slice(0, 160)}`}; relay: ${b(relay).verdict}${/^PASS/.test(String(b(relay).verdict)) ? '' : ` ${String(b(relay).reason).slice(0, 160)}`}` };
  }],
  ['w9bb-types-declared', 'a module declared by its @types package (bun) is the recording fake; the script\'s new unit runs', (m) => {
    const f = path.join(here, 'fixtures', 'w9bb-hard-ask', 'bun-script', 'scripts', 'build-bin.ts');
    const r = spawnSync(process.execPath, [path.join(here, '..', 'check.mjs'), '--candidate', f, '--unit', 'compileTarget', '--n', '8', '--dafny-seconds', '5'], { encoding: 'utf8', env: envOf(m), maxBuffer: 1 << 26 });
    let j; try { j = JSON.parse(r.stdout); } catch { return { ok: false, detail: `unparsed (exit ${r.status}): ${String(r.stderr).slice(-300)}` }; }
    const b = j.certificate?.lanes?.B ?? {};
    return { ok: j.verdict === 'NEW' && b.loaded !== false, detail: `${j.verdict}${j.verdict === 'NEW' ? '' : `: ${String(b.reason ?? j.reason).slice(0, 200)}`}` };
  }],
  ['w9bb-vendored-range', 'a vendored library answers only a range on its major: zod 3 never answers zod ^4', (m) => {
    const f = path.join(here, 'fixtures', 'w9bb-hard-ask', 'zod4', 'src', 'settings.ts');
    const r = spawnSync(process.execPath, [path.join(here, '..', 'check.mjs'), '--candidate', f, '--unit', 'portOrDefault', '--n', '8', '--dafny-seconds', '5'], { encoding: 'utf8', env: envOf(m), maxBuffer: 1 << 26 });
    let j; try { j = JSON.parse(r.stdout); } catch { return { ok: false, detail: `unparsed (exit ${r.status}): ${String(r.stderr).slice(-300)}` }; }
    const b = j.certificate?.lanes?.B ?? {};
    const ranges = [['^4.1.11', false], ['^3.22.0', true], ['~3.25.0', true], ['3.24.1', true], ['>=3 <4', true], ['4.x', false], ['^3.25.0 || ^4.0.0', true], ['2.x', false], ['workspace:*', null], ['catalog:', null]];
    const wrong = ranges.filter(([r, want]) => compatible(r, '3.25.76') !== want);
    return { ok: j.verdict === 'NEW' && !wrong.length, detail: `${j.verdict}${j.verdict === 'NEW' ? '' : `: ${String(b.reason ?? j.reason).slice(0, 200)}`}; zod 3.25.76 against ${ranges.map(([r]) => r).join(', ')}: ${wrong.length ? `wrong at ${wrong.map(([r]) => r).join(', ')}` : 'as npm reads them'}` };
  }],
];

// the break read in this process (boundedChild and runnerReason read LEAN_BREAK at each use)
async function withBreak(m, f) { const saved = process.env.LEAN_BREAK; if (m) process.env.LEAN_BREAK = m; else delete process.env.LEAN_BREAK; try { return await f(); } finally { if (saved === undefined) delete process.env.LEAN_BREAK; else process.env.LEAN_BREAK = saved; } }

let red = 0;
for (const [mechanism, what, run] of checks) {
  const r = await run(brk ? mechanism : null);
  const pass = brk ? !r.ok : r.ok;
  if (!pass) red++;
  console.log(`| ${mechanism} | ${what} | ${brk ? `LEAN_BREAK=${mechanism}: ` : ''}${r.detail} | ${pass ? (brk ? 'RED as it must be' : 'PASS') : 'FAIL'} |`);
}
console.log(`w9bb-hard-ask${brk ? ' --break' : ''}: ${checks.length} checks, ${red} failed`);
process.exit(red ? 1 : 0);
