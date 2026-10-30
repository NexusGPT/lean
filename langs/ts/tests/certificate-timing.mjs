#!/usr/bin/env node
// The certificate carries its timings: check.mjs records the wall-clock seconds of each lane that ran in
// certificate.timing (B: exec/run.mjs; doubles: solve/fp.mjs; lane A as translate, theorem and dafny; correspondence:
// the certified rungs before translation). A lane that did not run is an absent key, never a zero. Three units: a
// number-bearing unit (the doubles reading runs), a unit lane B witnesses (lane A translates and states its theorem,
// then the witness ends the question before Dafny), and a component. Exit 1 when a timing is missing, not a positive
// number, or present for a lane that did not run.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../check.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const LANES = ['B', 'correspondence', 'doubles', 'translate', 'theorem', 'dafny'];
const cases = [
  { pair: 'numbers', ext: 'ts', unit: 'average', present: ['B', 'doubles'] },
  { pair: 'readme_ledger', ext: 'ts', unit: 'applyAll', n: 60, seed: 3, present: ['B', 'translate', 'theorem'], absent: ['dafny', 'doubles'] },
  { pair: 'component', ext: 'tsx', unit: 'Counter', present: ['B'] },
];
let bad = 0;
for (const c of cases) {
  const dir = path.join(here, 'pairs', c.pair);
  const r = await check({ parent: path.join(dir, `parent.${c.ext}`), candidate: path.join(dir, `candidate.${c.ext}`), unit: c.unit, n: c.n ?? 30, seed: c.seed ?? 1, project: false, dafnySeconds: 30 });
  const t = r.certificate?.timing;
  const why = [];
  if (!t || typeof t !== 'object') why.push('no certificate.timing');
  else {
    for (const [k, v] of Object.entries(t)) {
      if (!LANES.includes(k)) why.push(`unknown key ${k}`);
      if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) why.push(`${k} is ${JSON.stringify(v)}`);
    }
    for (const k of c.present) if (!(k in t)) why.push(`${k} absent`);
    for (const k of c.absent ?? []) if (k in t) why.push(`${k} present for a lane that did not run`);
    if (!LANES.slice(1).some((k) => k in t) && r.certificate?.lanes?.A) why.push('lane A ran with no lane A timing');
  }
  const line = `${c.pair}::${c.unit} ${r.verdict} timing ${JSON.stringify(t ?? null)}`;
  if (why.length) { bad++; console.error(`FAIL ${line}: ${why.join('; ')}`); } else console.log(line);
}
if (bad) process.exit(1);
console.log(`certificate-timing: ${cases.length} units, every lane that ran timed in seconds, none that did not`);
