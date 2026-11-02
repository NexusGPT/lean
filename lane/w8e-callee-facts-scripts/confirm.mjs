// w8e: of the units a census run admitted on a pending callee fact, how many does lane B's record confirm when the unit is
// checked (check.mjs, parent = candidate = the file as it is: the unit against itself, so lane A must prove it)?
//   node confirm.mjs <tree> <census.json> <root> <n> <out.jsonl>
// The units are taken in the census's file order, the first n; each check runs in its own child (a crash is a row).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const [tree, censusFile, root, n, out] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(censusFile, 'utf8'));
const units = [];
for (const rec of r.records) for (const [u, keys] of Object.entries(rec.calleeFacts ?? {})) if (!u.includes('/')) units.push({ file: path.join(root, rec.file), unit: u, keys });
fs.writeFileSync(out, '');
let i = 0;
for (const x of units.slice(0, Number(n))) {
  i++;
  const tmp = path.join(path.dirname(out), `confirm-${i}.json`);
  const t0 = Date.now();
  const c = spawnSync('node', [path.join(tree, 'langs/ts/check.mjs'), '--parent', x.file, '--candidate', x.file, '--unit', x.unit, '--n', '60', '--out', tmp], { encoding: 'utf8', timeout: 900000, env: { ...process.env, LEAN_WORKER_HEAP_MB: '6144' } });
  let row = { ...x, file: path.relative(root, x.file), exit: c.status, seconds: Math.round((Date.now() - t0) / 1000) };
  try {
    const v = JSON.parse(fs.readFileSync(tmp, 'utf8')), cf = v.certificate?.lanes?.B?.calleeFacts;
    const confirmed = Object.keys(cf?.candidate?.confirmed ?? {});
    row = { ...row, verdict: v.verdict, laneA: v.certificate?.lanes?.A?.verdict ?? null, laneB: v.certificate?.lanes?.B?.verdict ?? null, confirmed, allConfirmed: x.keys.every((k) => confirmed.includes(k)), assumptions: v.certificate?.lanes?.A?.assumptions ?? [], detail: String(v.certificate?.lanes?.A?.detail ?? v.reason ?? '').split('\n').find((l) => /read-after-call|: /.test(l))?.slice(0, 200) ?? null, sites: v.certificate?.lanes?.B?.bound?.calleeFacts?.candidate ?? null };
  } catch (e) { row.error = String(e.message).slice(0, 200); row.stderr = (c.stderr ?? '').slice(-300); }
  fs.appendFileSync(out, JSON.stringify(row) + '\n');
  console.log(`${i} ${row.file} ${row.unit} ${row.verdict ?? 'error'} A=${row.laneA ?? '-'} confirmed=${row.allConfirmed ?? '-'} ${row.seconds}s`);
}
