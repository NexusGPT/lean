#!/usr/bin/env node
// The step cache keys a step by the switches it inherits that change what a producer does: LEAN_BREAK (amendment A6,
// the mechanism a --break run removes) and LEAN_LIBRARY_FAKES. A step run under LEAN_BREAK=<mechanism> after the same
// step without it must run, never replay the unbroken result, else a --break row reads the mechanism's own verdict.
// Run: node langs/ts/tests/step-cache-break.mjs   (--break: the key without the inherited switches: red)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-step-break-'));
process.env.LEAN_STEP_CACHE_DIR = path.join(tmp, 'cache'); delete process.env.LEAN_STEP_CACHE; delete process.env.LEAN_BREAK; delete process.env.LEAN_LIBRARY_FAKES;
if (process.argv.includes('--break')) process.env.LEAN_STEP_CACHE_INHERITED = 'off'; // the test's own break: the inherited switches left out of the key
const { cachedRun } = await import('./stepcache.mjs');
const input = path.join(tmp, 'unit.ts'); fs.writeFileSync(input, 'export const x = 1;\n');
let runs = 0;
const step = () => cachedRun(() => { runs++; return { status: 0, stdout: `break=${process.env.LEAN_BREAK ?? ''} fakes=${process.env.LEAN_LIBRARY_FAKES ?? ''}`, stderr: '', signal: null }; }, 'node', [path.join(root, 'langs/ts/translate/translate.mjs'), input], { root, files: [input], normalise: [[tmp, '<tmp>']] });
let fail = 0;
const expect = (name, wantRuns, wantOut, r) => { const ok = runs === wantRuns && r.stdout === wantOut; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${runs} run(s), ${JSON.stringify(r.stdout)}`); if (!ok) fail++; };
expect('as is', 1, 'break= fakes=', step());
expect('as is again: replayed', 1, 'break= fakes=', step());
process.env.LEAN_BREAK = 'package-rows';
expect('LEAN_BREAK=package-rows: run', 2, 'break=package-rows fakes=', step());
expect('LEAN_BREAK=package-rows again: replayed', 2, 'break=package-rows fakes=', step());
delete process.env.LEAN_BREAK; process.env.LEAN_LIBRARY_FAKES = '0';
expect('LEAN_LIBRARY_FAKES=0: run', 3, 'break= fakes=0', step());
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} FAILED` : 'a step is keyed by the producer switches it inherits');
process.exit(fail ? 1 : 0);
