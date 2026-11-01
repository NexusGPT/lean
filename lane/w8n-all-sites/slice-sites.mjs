// The slice's witnessed mutant units (design/w8n-all-sites.md): pr.mjs on each mutant's unit alone (--units
// path::unit, the head the working tree: the PR head with the mutant's file written), with two lean trees (before: the
// lane's base, after: this tree), the bench's budgets (--n 30, --dafny-seconds 30, seed 1). The row's `witnesses`
// (what DA reads) are counted by site, and a site reports the mutation when its candidate statement overlaps the
// mutation's lines (truth[0].line_from..line_to).
//   node slice-sites.mjs --witnessed witnessed.json --root /root/da-bench/w8n-all-sites --before <lean> --after <lean>
//        --out table.json [--jobs 4] [--n 30] [--only id,id]
// witnessed.json: [{ id, unit, path, line_from, line_to, base }] (the mutants whose record's row of the truth unit has
// lane B WITNESS; base: the record's merge base); under root: <pr>/head (materialise.py --restore, at a mutant commit
// whose parent is the PR head) and mutants/<id>/candidate.<ext> (the materialiser's edited file). The mutants of one PR
// run one at a time (one checkout); both trees run per mutant, before first; each run has its own cache and runs dir.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const W = JSON.parse(fs.readFileSync(opt('--witnessed'), 'utf8')).filter((w) => !opt('--only') || opt('--only').split(',').includes(w.id));
const root = opt('--root'), out = opt('--out'), n = opt('--n', '30'), jobs = Math.min(4, Number(opt('--jobs', 4)));
const trees = { before: opt('--before'), after: opt('--after') };
const { siteKey } = await import(path.join(trees.after, 'langs/ts/exec/sites.mjs'));
const LOAD_MAX = 64;
const done = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
const git = (d, ...a) => { const r = spawnSync('git', ['-C', d, ...a], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: exit ${r.status}: ${r.stderr}`); return r.stdout.trim(); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = async () => { while (os.loadavg()[0] > LOAD_MAX) await sleep(30000); };

function readSites(file, w) {
  let j; try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { verdict: `no report (${String(e.message).slice(0, 80)})`, laneB: null, sites: 0, mutationSite: false, lines: [] }; }
  const row = (j.rows ?? []).find((r) => r.file === w.path && r.unit === w.unit);
  if (!row) return { verdict: 'no row', laneB: null, sites: 0, mutationSite: false, lines: [] };
  const ws = row.witnesses ?? (row.witness ? [row.witness] : []), keys = new Set(), lines = [];
  let hit = false;
  for (const x of ws) {
    const c = x.where?.lines?.candidate, k = siteKey(x.where);
    if (!keys.has(k)) { keys.add(k); lines.push(c ? `${c.start ?? c.line}` + (c.end && c.end !== c.start ? `-${c.end}` : '') : 'none'); }
    const a = c?.start ?? c?.line, b = c?.end ?? a;
    if (a != null && a <= w.line_to && b >= w.line_from) hit = true;
  }
  const B = row.certificate?.lanes?.B ?? {};
  return { verdict: row.verdict, laneB: row.laneB ?? null, sites: keys.size, mutationSite: hit, lines, stop: B.bound?.sites?.stop ?? null, differing: B.bound?.sites?.differing ?? null };
}

const run = (tree, args, file) => new Promise((resolve) => {
  const t = process.hrtime.bigint();
  const p = spawn('node', [path.join(tree, 'langs/ts/pr.mjs'), ...args], { stdio: ['ignore', fs.openSync(file + '.out', 'w'), fs.openSync(file + '.err', 'w')], env: process.env });
  p.on('exit', (code, signal) => resolve({ exit: code ?? signal, ms: Math.round(Number(process.hrtime.bigint() - t) / 1e6) }));
});

const byPr = new Map();
for (const w of W) { const pr = w.id.split('~')[0]; if (!byPr.has(pr)) byPr.set(pr, []); byPr.get(pr).push(w); }
const queue = [...byPr.entries()];
const save = () => fs.writeFileSync(out, JSON.stringify(done, null, 1));
async function slot() {
  for (;;) {
    const next = queue.shift(); if (!next) return;
    const [pr, ws] = next, head = path.join(root, pr, 'head');
    const prHead = git(head, 'log', '-1', '--format=%s').startsWith('DA-Bench mutant') ? git(head, 'rev-parse', 'HEAD^') : git(head, 'rev-parse', 'HEAD'); // the PR head: the mutant commit's parent, or HEAD once a run left it there
    for (const w of ws) {
      if (done[w.id]?.before && done[w.id]?.after) continue;
      git(head, '-c', 'advice.detachedHead=false', 'checkout', '-q', '--force', '--detach', prHead);
      fs.copyFileSync(path.join(root, 'mutants', w.id, 'candidate' + path.extname(w.path)), path.join(head, w.path));
      const dir = path.join(root, 'runs', w.id); fs.mkdirSync(dir, { recursive: true });
      const row = { id: w.id, unit: w.unit, path: w.path, lines: [w.line_from, w.line_to] };
      for (const side of ['before', 'after']) {
        await calm();
        const f = path.join(dir, `${side}.json`), work = path.join(dir, side); fs.rmSync(work, { recursive: true, force: true });
        const args = ['--repo', head, '--base', w.base, '--head', 'WORKTREE', '--units', `${w.path}::${w.unit}`, '--n', n, '--dafny-seconds', '30', '--fresh', '--cache-dir', path.join(work, 'cache'), '--runs-dir', path.join(work, 'runs'), '--json', f, '--out', path.join(dir, `${side}.md`)];
        const r = await run(trees[side], args, f);
        row[side] = { exit: r.exit, ms: r.ms, ...readSites(f, w) };
        console.log(`${w.id} ${side} exit=${r.exit} ${r.ms}ms ${row[side].verdict} B=${row[side].laneB} sites=${row[side].sites} mutation=${row[side].mutationSite} [${row[side].lines.join(',')}] ${row[side].stop ?? ''}`);
      }
      done[w.id] = row; save();
    }
    git(head, 'checkout', '-q', '--force', '--detach', prHead);
  }
}
await Promise.all(Array.from({ length: jobs }, slot));
save();
