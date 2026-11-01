// debug: run each candidateOnly row of a pair through check.mjs directly, print records
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const [pair, only] = process.argv.slice(2);
const d = path.join('/root/lanes/w1h-new-units/tree/langs/ts/tests/pairs', pair);
const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
for (const [i, w] of exp.candidateOnly.entries()) {
  if (only && w.unit !== only) continue;
  const out = `/tmp/w1h/dbg/${pair}_${i}.json`;
  const args = ['/root/lanes/w1h-new-units/tree/langs/ts/check.mjs', '--candidate', path.join(d, w.file), '--unit', w.unit, '--n', '30', '--no-project', ...(w.tests ? ['--tests', w.tests.map((t) => path.join(d, t)).join(',')] : []), '--out', out];
  const r = spawnSync('node', args, { encoding: 'utf8' });
  let g = {}; try { g = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { console.log(r.stderr.slice(-800)); }
  console.log(`${w.unit}: ${g.verdict} inputs=${g.inputs} faults=${g.faults}`, JSON.stringify(g.certificate?.newUnit?.records?.map((r) => ({ k: r.kind, i: r.input, e: r.edge, a: r.args, err: r.error, how: r.how, decl: r.declared, ret: r.returned, test: r.test, reason: r.reason }))).slice(0, 700), JSON.stringify(g.certificate?.newUnit?.tests ?? ''));
}
