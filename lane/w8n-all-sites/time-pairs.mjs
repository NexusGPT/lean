// Lane B's per-unit wall time before and after (design/w8n-all-sites.md), by w3c's method (tests/search-measure.mjs):
// every lane B unit of the pairs named (expect.json "b"), run as the suite runs it (exec/run.mjs --n 30, the pair's
// --project or --no-project), with the two lean trees alternately, `--reps` times each; a unit's time is the least wall
// time of its runs. The pairs are read from the before tree.
//   node time-pairs.mjs --before <lean> --after <lean> (--pairs a,b | --first 10 | --witness 10) [--reps 2] [--out f.json]
// --first k: the first k pairs by name that have lane B units (w3c's choice, no choice by result); --witness k: the
// first k pairs by name with a lane B unit the expectation names WITNESS (the units whose draws this lane lengthens)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const trees = { before: opt('--before'), after: opt('--after') };
const pairsDir = path.join(trees.before, 'langs/ts/tests/pairs');
const expOf = (n) => { const f = path.join(pairsDir, n, 'expect.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const names = fs.readdirSync(pairsDir).sort();
const withB = names.filter((n) => Object.keys(expOf(n)?.b ?? {}).length);
const witnessed = withB.filter((n) => Object.values(expOf(n).b).some((v) => String(v).startsWith('WITNESS')));
const pairs = opt('--pairs') ? opt('--pairs').split(',') : opt('--witness') ? witnessed.slice(0, Number(opt('--witness'))) : withB.slice(0, Number(opt('--first', 10)));
const reps = Number(opt('--reps', 2));
const side = (d, k) => (fs.existsSync(path.join(d, k + '.tsx')) ? path.join(d, k + '.tsx') : path.join(d, k + '.ts'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w8n-time-'));
const rows = [];
for (const name of pairs) {
  const d = path.join(pairsDir, name), exp = expOf(name);
  for (const unit of Object.keys(exp.b ?? {})) {
    const res = {};
    for (let r = 0; r < reps; r++) for (const k of ['before', 'after']) {
      const out = path.join(tmp, `${k}.json`); fs.rmSync(out, { force: true });
      const args = [path.join(trees[k], 'langs/ts/exec/run.mjs'), '--parent', side(d, 'parent'), '--candidate', side(d, 'candidate'), '--unit', unit, '--n', '30', ...(exp.project ? ['--project', path.join(d, exp.project)] : ['--no-project']), '--out', out];
      const t = process.hrtime.bigint();
      const p = spawnSync('node', args, { encoding: 'utf8', env: process.env, maxBuffer: 1 << 26 });
      const ms = Number(process.hrtime.bigint() - t) / 1e6;
      let j = null; try { j = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* no result: named below */ }
      res[k] ??= { ms: Infinity, verdict: j?.verdict ?? `no result (exit ${p.status}: ${(p.stderr || '').trim().split('\n').pop()})`, witnesses: (j?.witnesses ?? []).length };
      res[k].ms = Math.min(res[k].ms, ms);
    }
    rows.push({ pair: name, unit, expected: exp.b[unit], before: res.before.verdict, after: res.after.verdict, witnessesBefore: res.before.witnesses, witnessesAfter: res.after.witnesses, msBefore: Math.round(res.before.ms), msAfter: Math.round(res.after.ms) });
    const x = rows.at(-1); console.log(`${x.pair} ${x.unit}: ${x.before} -> ${x.after}, witnesses ${x.witnessesBefore} -> ${x.witnessesAfter}, ${x.msBefore} ms -> ${x.msAfter} ms (${(x.msAfter / x.msBefore).toFixed(2)}x)`);
  }
}
const tb = rows.reduce((s, r) => s + r.msBefore, 0), ta = rows.reduce((s, r) => s + r.msAfter, 0);
const worst = rows.reduce((m, r) => Math.max(m, r.msAfter / r.msBefore), 0);
const changed = rows.filter((r) => r.before !== r.after);
console.log(`units ${rows.length}; total ${tb} ms -> ${ta} ms, ratio ${(ta / tb).toFixed(2)}x; worst unit ${worst.toFixed(2)}x; verdicts changed ${changed.length}`);
if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify({ pairs, reps, rows, totalBefore: tb, totalAfter: ta, ratio: ta / tb, worst }, null, 1));
