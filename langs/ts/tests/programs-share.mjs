// The method programs' share of the unit's CPU bound (exec/programs.mjs runPrograms maxCpuMs, lane w9o). A class unit's
// programs run before the draws; a class whose commands are slow spent the whole bound there, and the unit ended
// spin-bound before any draw ran (the hard set: n8n TelemetryEventRelay.init, ExecutionPersistence.hardDeleteByWorkflowId).
// On the fixture tests/fixtures/programs_share, with a CPU meter of the test's own (each read one second later, so the
// share is the same on every machine):
// 1. with no share the stage runs all its programs and none diverges (the constructed instance holds no bus);
// 2. with a share of 5 s it stops between commands once the meter passes it: fewer programs, PASS-bounded, the share
//    named in `stop`, so the caller goes on to the draws;
// 3. run.mjs hands the stage a quarter of the bound the parent enforces (boundSeconds), not of the 120 s default.
// --break: the share is not applied (as LEAN_BREAK=programs-share); part 2 fails.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPrograms } from '../exec/programs.mjs';
import { sandbox, observe, guardedCall, firstDifference, findRoot } from '../exec/run.mjs';
import { specOf } from '../exec/spec.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BREAK = process.argv.includes('--break');
const dir = path.join(here, 'fixtures', 'programs_share');
const files = { parent: path.join(dir, 'parent.ts'), candidate: path.join(dir, 'candidate.ts') };
const roots = { parent: findRoot(files.parent), candidate: findRoot(files.candidate) };
const spec = specOf(files.candidate, 'Relay.init', { project: false });
const rt = { sandbox, observe, guardedCall, firstDifference };
const meter = () => { let t = 0; return () => (t += 1000); };
const go = (maxCpuMs) => runPrograms({ files, roots, spec, seed: 1, ms: 2000, rt, project: false, maxCpuMs, cpuMs: meter() });

const full = await go(Infinity);
assert.equal(full.verdict, 'PASS-bounded', `no share: ${JSON.stringify(full).slice(0, 300)}`);
assert.equal(full.programs, 12, 'no share: every program runs');
assert.equal(full.stop, undefined, 'no share: the stage runs to its own end');

const cut = await go(BREAK ? Infinity : 5000);
assert.equal(cut.verdict, 'PASS-bounded', `share: ${JSON.stringify(cut).slice(0, 300)}`);
assert.ok(cut.programs < full.programs && cut.commands < full.commands, `share: the stage stops early (${cut.programs} programs, ${cut.commands} commands, against ${full.programs} and ${full.commands})`);
assert.match(cut.stop ?? '', /share of the unit's CPU bound, 5 s/, 'share: the stop names the share');

const runSrc = fs.readFileSync(path.join(here, '../exec/run.mjs'), 'utf8');
assert.match(runSrc, /boundSeconds: seconds/, 'run.mjs hands the worker the bound it enforces');
assert.match(runSrc, /maxCpuMs: broken\('programs-share'\) \? Infinity : \(opts\.boundSeconds \?\? unitSecondsValue\(opts\.unitSeconds\)\) \* 1000 \/ 4/, 'run.mjs: the programs take a quarter of that bound');

console.log(`programs-share: no share ${full.programs} programs, ${full.commands} commands; a 5 s share stops at ${cut.programs} programs, ${cut.commands} commands (${cut.stop})`);
