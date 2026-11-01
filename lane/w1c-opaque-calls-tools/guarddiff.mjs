// For every pair of the suite: translate both sides and generate the theorem with the base tree (scratch/base) and the
// lane's tree, and compare the lemmas the identity guard withholds (`// UNGUARDED`) and the lemmas generated. A change is a
// unit whose lane A reading the lane moved outside its own pairs (the heap guard's fresh operators, the read-after-call
// rebinds hook, the lint labels).   node guarddiff.mjs [pair...]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const trees = { base: '/root/lanes/w1c-opaque-calls/scratch/base/langs/ts', head: '/root/lanes/w1c-opaque-calls/tree/langs/ts' };
const pairsDir = path.join(trees.head, 'tests/pairs');
const pairs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(pairsDir).filter((p) => fs.existsSync(path.join(pairsDir, p, 'expect.json'))).sort();
const lemmasOf = (tree, p) => {
  const d = path.join(pairsDir, p); const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  if (exp.laneBOnly || exp.candidateOnly || !exp.scope) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w1c-gd-'));
  try {
    const file = (w) => { for (const e of ['.ts', '.tsx']) if (fs.existsSync(path.join(d, w + e))) return path.join(d, w + e); return path.join(d, w + '.ts'); };
    const proj = exp.project ? ['--project', path.join(d, exp.project)] : ['--no-project'];
    for (const w of ['parent', 'candidate']) { const r = spawnSync('node', [path.join(tree, 'translate/translate.mjs'), file(w), '--core', '--suffix', w, '--out', path.join(tmp, `${w}.dfy`), '--prelude', path.join(tmp, `${w}.pre.dfy`), ...proj, ...(exp.heap !== false ? ['--heap'] : [])], { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) return { error: `${w}: ${(r.stderr || r.stdout).trim().split('\n').pop().slice(0, 160)}` }; }
    fs.writeFileSync(path.join(tmp, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(exp.scope.map((f) => [f, { in_scope: 'false' }])), summaries: true }));
    fs.writeFileSync(path.join(tmp, 'edit.json'), '{}');
    const th = spawnSync('python3', ['-I', path.join(tree, '../../spec/theorem.py'), '--parent', path.join(tmp, 'parent.dfy'), '--candidate', path.join(tmp, 'candidate.dfy'), '--scope', path.join(tmp, 'scope.json'), '--edit', path.join(tmp, 'edit.json'), '--out', path.join(tmp, 'theorem.dfy')], { encoding: 'utf8' });
    if (th.status !== 0) return { error: `theorem: ${(th.stderr || th.stdout).trim().slice(-160)}` };
    const t = fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8');
    return { unguarded: [...t.matchAll(/^\/\/ UNGUARDED (Equal_\w+): (.{0,90})/gm)].map((m) => `${m[1]}: ${m[2]}`).sort(), lemmas: [...t.matchAll(/^lemma (?:\{[^}]*\}\s+)*(Equal\w*_\w+)/gm)].map((m) => m[1]).sort() };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
let changed = 0;
for (const p of pairs) {
  const a = lemmasOf(trees.base, p), b = lemmasOf(trees.head, p);
  if (!a && !b) continue;
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) { changed++; console.log(`CHANGED ${p}\n  base ${A.slice(0, 600)}\n  head ${B.slice(0, 600)}`); }
}
console.log(`${pairs.length} pairs, ${changed} changed`);
