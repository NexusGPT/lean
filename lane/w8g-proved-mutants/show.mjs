// prints, for every PASS-proved row, the unit's text with the site marked and the mutant's text at the site
import fs from 'node:fs';
import path from 'node:path';
const ts_ = '/root/lanes/w8g-proved-mutants/tree/langs/ts';
const { sitesOf } = await import(ts_ + '/exec/mutate.mjs');
const d = JSON.parse(fs.readFileSync('/root/lanes/w8g-proved-mutants/tree/lane/w3b-mutant-study/baseline.json', 'utf8'));
const pp = d.rows.filter((r) => r.verdict === 'PASS-proved');
const only = process.argv[2] ? new Set(process.argv[2].split(',').map(Number)) : null;
pp.forEach((r, i) => {
  if (only && !only.has(i)) return;
  let file, project = false;
  if (r.source === 'pairs') {
    const dir = path.join(ts_, 'tests/pairs', r.where);
    file = fs.existsSync(path.join(dir, 'candidate.tsx')) ? path.join(dir, 'candidate.tsx') : path.join(dir, 'candidate.ts');
    const exp = JSON.parse(fs.readFileSync(path.join(dir, 'expect.json'), 'utf8'));
    if (exp.project) project = path.join(dir, exp.project);
  } else file = path.join('/root/da/census/repos', r.source.split(':')[1], r.where);
  const { sites, text, unit } = sitesOf(file, r.unit, { project });
  const s = sites[r.index];
  const ok = s && s.kind === r.kind && String(s.was).slice(0, 60) === r.was;
  const u0 = unit.node ? unit.node.getStart() : unit.body.getStart();
  const n = unit.node ?? unit.body;
  const a = n.getFullStart(), b = n.getEnd();
  const body = text.slice(a, s.start) + '⟦' + text.slice(s.start, s.end) + ' ⇒ ' + s.text + '⟧' + text.slice(s.end, b);
  console.log(`=== #${i} ${r.where} ${r.unit} site ${r.index} ${r.kind} ${ok ? '' : 'SITE-MISMATCH'}\n${body.trim()}\n`);
});
