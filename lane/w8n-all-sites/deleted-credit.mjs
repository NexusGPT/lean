// A second reading of the slice table (design/w8n-all-sites.md): for a mutant that deletes statements (every line of
// truth's line_from..line_to is blank in the mutated file and not blank at the PR head), whether a witness of the row
// names a deleted statement on its parent side (where.lines.parent.text, trimmed, equals one of the deleted lines,
// trimmed). The candidate has no line for a deleted statement, so lane B locates the difference at the next candidate
// statement; its parent side is the deleted statement itself. Exact text only, never a distance.
//   node deleted-credit.mjs --witnessed witnessed.json --root /root/da-bench/w8n-all-sites --side before|after
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const W = JSON.parse(fs.readFileSync(opt('--witnessed'), 'utf8')), root = opt('--root'), side = opt('--side', 'after');
const git = (d, ...a) => { const r = spawnSync('git', ['-C', d, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout; };
let deletions = 0, named = 0;
for (const w of W) {
  const head = path.join(root, w.id.split('~')[0], 'head');
  const prHead = git(head, 'log', '-1', '--format=%s').startsWith('DA-Bench mutant') ? git(head, 'rev-parse', 'HEAD^').trim() : git(head, 'rev-parse', 'HEAD').trim();
  const was = git(head, 'show', `${prHead}:${w.path}`).split('\n'), now = fs.readFileSync(path.join(root, 'mutants', w.id, 'candidate' + path.extname(w.path)), 'utf8').split('\n');
  const range = []; for (let l = w.line_from; l <= w.line_to; l++) range.push(l);
  if (!range.every((l) => !(now[l - 1] ?? '').trim() && (was[l - 1] ?? '').trim())) continue;
  deletions++;
  const deleted = new Set(range.map((l) => was[l - 1].trim()));
  let j; try { j = JSON.parse(fs.readFileSync(path.join(root, 'runs', w.id, `${side}.json`), 'utf8')); } catch { j = { rows: [] }; }
  const row = (j.rows ?? []).find((r) => r.file === w.path && r.unit === w.unit);
  const hit = (row?.witnesses ?? []).some((x) => (x.where?.lines?.parent?.text ?? '').split('\n').some((t) => deleted.has(t.trim())));
  if (hit) named++;
  console.log(`${w.id} deletes ${[...deleted].join(' | ').slice(0, 80)}: ${hit ? 'named on the parent side' : 'not named'}`);
}
console.log(`${side}: deletion mutants ${deletions}, the deleted statement named on a witness's parent side ${named}`);
