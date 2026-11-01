// The input search's cost and reach on existing pairs (design/w3c-search-inputs.md): every lane B unit of the pairs named
// (expect.json "b"), run as the suite runs it (exec/run.mjs --n 30, the pair's --project or --no-project) without the
// search and with it, alternately, `--reps` times each; a unit's time is the least wall time of its runs (the run the
// machine's load disturbed least). Prints, per unit and in total: both verdicts, both times, and with the search the
// branches of the diff (search.mjs targets) the draws reached and the branches reached after the search.
//   node langs/ts/tests/search-measure.mjs --pairs a,b,c | --first 10  [--reps 2] [--out measure.json]
// --first k: the first k pairs, by name, that have lane B units (no choice of pairs by their result)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const pairsDir = path.join(here, 'pairs');
const withB = fs.readdirSync(pairsDir).sort().filter((n) => { const f = path.join(pairsDir, n, 'expect.json'); return fs.existsSync(f) && Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')).b ?? {}).length; });
const pairs = opt('--pairs') ? opt('--pairs').split(',') : withB.slice(0, Number(opt('--first', 10)));
const reps = Number(opt('--reps', 2));
const side = (d, k) => (fs.existsSync(path.join(d, k + '.tsx')) ? path.join(d, k + '.tsx') : path.join(d, k + '.ts'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'search-measure-'));
const rows = [];
for (const name of pairs) {
  const d = path.join(pairsDir, name), exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  for (const unit of Object.keys(exp.b ?? {})) {
    const res = {};
    for (let r = 0; r < reps; r++) for (const on of [false, true]) {
      const out = path.join(tmp, `${on ? 'on' : 'off'}.json`); fs.rmSync(out, { force: true });
      const args = [path.join(here, '../exec/run.mjs'), '--parent', side(d, 'parent'), '--candidate', side(d, 'candidate'), '--unit', unit, '--n', '30', ...(exp.project ? ['--project', path.join(d, exp.project)] : ['--no-project']), on ? '--search' : '--no-search', '--out', out];
      const t = process.hrtime.bigint();
      const p = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, LEAN_SEARCH: on ? '1' : '0' }, maxBuffer: 1 << 26 });
      const ms = Number(process.hrtime.bigint() - t) / 1e6;
      let j = null; try { j = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* no result */ }
      const k = on ? 'on' : 'off';
      res[k] ??= { ms: Infinity, verdict: j?.verdict ?? `no result (exit ${p.status}: ${(p.stderr || '').trim().split('\n').pop()})`, search: j?.bound?.search ?? null };
      res[k].ms = Math.min(res[k].ms, ms);
    }
    const s = res.on.search;
    rows.push({ pair: name, unit, expected: exp.b[unit], off: res.off.verdict, on: res.on.verdict, msOff: Math.round(res.off.ms), msOn: Math.round(res.on.ms), targets: s?.targets ?? 0, reachedByDraws: s?.reachedByDraws ?? null, reached: s?.reached ?? null, tried: s?.tried ?? 0, kept: s?.kept ?? 0, stop: s?.stop ?? null });
    const x = rows.at(-1);
    console.log(`${name} ${unit}: ${x.off} ${x.msOff} ms | ${x.on} ${x.msOn} ms | branches ${x.reachedByDraws ?? '-'} -> ${x.reached ?? '-'} of ${x.targets}, tried ${x.tried}, kept ${x.kept}, ${x.stop}`);
  }
}
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
const total = { units: rows.length, msOff: sum('msOff'), msOn: sum('msOn'), ratio: +(sum('msOn') / sum('msOff')).toFixed(3), meanRatio: +(rows.reduce((a, r) => a + r.msOn / r.msOff, 0) / rows.length).toFixed(3), maxRatio: +Math.max(...rows.map((r) => r.msOn / r.msOff)).toFixed(3), targets: sum('targets'), reachedByDraws: rows.reduce((a, r) => a + (r.reachedByDraws ?? 0), 0), reached: rows.reduce((a, r) => a + (r.reached ?? 0), 0), searched: rows.filter((r) => r.tried > 0).length, verdictChanged: rows.filter((r) => r.off !== r.on).map((r) => `${r.pair} ${r.unit}: ${r.off} -> ${r.on}`) };
console.log(JSON.stringify(total));
if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify({ pairs, reps, total, rows }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
