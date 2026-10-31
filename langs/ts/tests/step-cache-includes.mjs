#!/usr/bin/env node
// The step cache keys a Dafny file by what it means: its own text and every file it `include`s, transitively. A step
// that reads parent.dfy (theorem.py merges the prelude parent.dfy includes) must miss when only the prelude changed,
// else it replays a theorem over the old prelude. Run: node langs/ts/tests/step-cache-includes.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-step-includes-'));
process.env.LEAN_STEP_CACHE_DIR = path.join(tmp, 'cache'); delete process.env.LEAN_STEP_CACHE; // the cache of this test alone, on
const { cachedRun } = await import('./stepcache.mjs');
const dir = path.join(tmp, 'step'); fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
const main = path.join(dir, 'parent.dfy'), pre = path.join(dir, 'parent.pre.dfy'), deep = path.join(dir, 'lib', 'deep.dfy'), out = path.join(dir, 'theorem.dfy');
fs.writeFileSync(main, 'include "parent.pre.dfy"\nfunction f_parent(): int { 0 }\n');
fs.writeFileSync(deep, '// deep 1\n');
let runs = 0;
const step = () => cachedRun(() => { runs++; fs.writeFileSync(out, fs.readFileSync(pre, 'utf8') + fs.readFileSync(deep, 'utf8')); return { status: 0, stdout: 'wrote', stderr: '', signal: null }; }, 'python3', ['-I', path.join(root, 'spec/theorem.py'), '--parent', main, '--out', out], { root, files: [main], outs: [out], normalise: [[tmp, '<tmp>']] });
let fail = 0;
const expect = (name, wantRuns, wantText) => { const text = fs.readFileSync(out, 'utf8'); const ok = runs === wantRuns && text.includes(wantText); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${runs} run(s), theorem ${JSON.stringify(text)}`); if (!ok) fail++; };
fs.writeFileSync(pre, 'include "lib/deep.dfy"\n// prelude 1\n');
step(); expect('first run', 1, 'prelude 1');
step(); expect('same inputs: replayed', 1, 'prelude 1');
fs.writeFileSync(pre, 'include "lib/deep.dfy"\n// prelude 2\n');
step(); expect('the included prelude changed: rerun', 2, 'prelude 2');
fs.writeFileSync(deep, '// deep 2\n');
step(); expect('a file the prelude includes changed: rerun', 3, 'deep 2');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `${fail} FAILED` : 'a Dafny input is keyed with every file it includes');
process.exit(fail ? 1 : 0);
