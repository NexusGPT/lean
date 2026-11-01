// Units lean read nowhere before (design/w1f-module-units.md, lane w1f-module-units): the module unit, the types unit
// with the typed reading, directive records, JavaScript units. Each of the four pairs read as a pull request
// (tests/pr-pair.mjs): every expectation holds, and with each mechanism removed (LEAN_BREAK=<mechanism>, the suite's
// one break convention) the pair that tests it goes red.
//
//   node tests/w1f-module-units.mjs            the four pairs, then every break (each must turn its pair red)
//   node tests/w1f-module-units.mjs --breaks     every break alone (the suite's row: its pairs section runs them green)
//   node tests/w1f-module-units.mjs --break <m>  one mechanism removed: its pair is red, exit 1 (as it must be)
//
// The mechanisms: w1f-module (ci/ledger.mjs: the module unit's route), w1f-js (ci/ledger.mjs: a JavaScript file's
// top-level code is its module unit's, not an unassigned untyped-JavaScript edit), w1f-types (ci/ledger.mjs: the types
// unit's route), w1f-emit (typed.mjs: no emit compared), w1f-closure (typed.mjs: the importers' closure removed, the
// changed file's own emit alone), w1f-directive (lint/directives.mjs: directives matched by line number, not by what
// they govern).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prPair } from './pr-pair.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = ['module_unit', 'type_only', 'directive', 'js_unit'];
const BREAKS = { 'w1f-module': 'module_unit', 'w1f-js': 'js_unit', 'w1f-types': 'type_only', 'w1f-emit': 'type_only', 'w1f-closure': 'type_only', 'w1f-directive': 'directive' };
const argAt = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const only = argAt('--break');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-w1f-'));
const run = async (pair, env = {}) => prPair(path.join(here, 'pairs', pair), { tmp, env });
const lines = [];
let failed = false;
try {
  if (only) {
    if (!BREAKS[only]) throw new Error(`--break: one of ${Object.keys(BREAKS).join(', ')}`);
    const rs = await run(BREAKS[only], { LEAN_BREAK: only });
    const red = rs.filter((r) => !r.ok);
    for (const r of red) console.log(`red: ${BREAKS[only]}: ${r.check}: ${r.detail}`);
    console.log(`--break ${only}: ${red.length} of ${rs.length} check(s) of ${BREAKS[only]} red`);
    process.exit(red.length ? 1 : 0);
  }
  // --breaks: the breaks alone (the suite's pairs section already runs the four pairs green)
  const green = process.argv.includes('--breaks') ? [] : await Promise.all(PAIRS.map((p) => run(p)));
  if (green.length) PAIRS.forEach((p, i) => { const bad = green[i].filter((r) => !r.ok); for (const r of bad) { failed = true; console.log(`FAIL ${p}: ${r.check}: ${r.detail}`); } lines.push(`${p} ${green[i].length - bad.length}/${green[i].length}`); });
  const broken = await Promise.all(Object.entries(BREAKS).map(([m, p]) => run(p, { LEAN_BREAK: m })));
  Object.keys(BREAKS).forEach((m, i) => { const red = broken[i].filter((r) => !r.ok).length; if (!red) { failed = true; console.log(`FAIL --break ${m}: ${BREAKS[m]} stayed green`); } lines.push(`--break ${m} ${red} red`); });
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`w1f-module-units: ${lines.join('; ')}${failed ? ' — FAILED' : ''}`);
process.exit(failed ? 1 : 0);
