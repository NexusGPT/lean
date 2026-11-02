// A pair read as a pull request (design/w1f-module-units.md): expect.json's `pr` names the rows pr.mjs must give and
// the directive records it must list when the pair's parent and candidate are two commits of one repository.
//
// The pair's files: `parent.<ext>` and `candidate.<ext>` are `index.<ext>` on their side; `<name>.parent.<ext>` and
// `<name>.candidate.<ext>` are `<name>.<ext>` on theirs (a file present on one side only is added or deleted); every
// other file but expect.json is on both. `pr.project` names the pair's tsconfig (copied with the rest; pr.mjs finds it),
// else the run is --no-project.
//
//   pr: { project?, rows: [{ file, unit, verdict?, notVerdict?, coverage?, reason?, sites?, siteLines?, leadLine?, siteReach? }], absent: [{ file, unit }],
//         directives: [{ file, directive, change, line?, suppresses?: [code], exposes?: [code] }] (exactly these),
//         unassigned: false (no row of the ledger is unassigned:*, an inert comment row excepted),
//         units: [{ units: 'index.ts::f,g', rows, absent }] (each a second run of pr.mjs with --units, its rows and absences) }
//
// `sites: n` (design/w7a-lean-witnesses.md): the row's `witnesses` holds n entries at n different candidate lines, and
// its `witness` is the first of them (the record aside). `siteLines: [l]` (design/w8n-all-sites.md): each listed
// candidate line is the line of one of the row's `witnesses` (two fields may differ at one line, so lines may repeat).
// `leadLine: l` (design/w9i-reach.md): the row's `witness`, the one lane B leads with, is at candidate line l;
// `siteReach: ['candidate l']`: one of the row's `witnesses` has `where.reach` (the changed statements it completed
// first) holding each.
//
// prPair(dir, { tmp, env }) -> [{ check, ok, detail }]; tests/run.mjs adds them to the pair's rows, and
// tests/w1f-module-units.mjs runs them under each --break.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { spawnCollect } from './pool.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const prTool = path.join(here, '../pr.mjs');
const GIT_ENV = { ...process.env, LC_ALL: 'C', GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@localhost', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (repo, args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: GIT_ENV }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`); return r.stdout.trim(); };

// the pair's files on one side: target name -> source path
export function sideFiles(dir, side) {
  const out = new Map();
  for (const f of fs.readdirSync(dir).sort()) {
    if (f === 'expect.json' || !fs.statSync(path.join(dir, f)).isFile()) continue;
    const main = f.match(/^(parent|candidate)(\.[cm]?[jt]sx?)$/), named = f.match(/^(.+)\.(parent|candidate)(\.[cm]?[jt]sx?)$/);
    if (main) { if (main[1] === side) out.set('index' + main[2], path.join(dir, f)); }
    else if (named) { if (named[2] === side) out.set(named[1] + named[3], path.join(dir, f)); }
    else out.set(f, path.join(dir, f));
  }
  return out;
}

export function pairRepo(dir, repo) {
  fs.rmSync(repo, { recursive: true, force: true });
  fs.mkdirSync(repo, { recursive: true });
  git(repo, ['init', '-q', '-b', 'main']);
  const commit = (side) => {
    for (const f of fs.readdirSync(repo)) if (f !== '.git') fs.rmSync(path.join(repo, f), { recursive: true, force: true });
    for (const [to, from] of sideFiles(dir, side)) fs.copyFileSync(from, path.join(repo, to));
    git(repo, ['add', '-A']); git(repo, ['commit', '-q', '--allow-empty', '-m', side]);
    return git(repo, ['rev-parse', 'HEAD']);
  };
  return { base: commit('parent'), head: commit('candidate') };
}

export async function prPair(dir, { tmp, env = {} } = {}) {
  const exp = JSON.parse(fs.readFileSync(path.join(dir, 'expect.json'), 'utf8')).pr;
  if (!exp) return [];
  const work = path.join(tmp, `pr_${path.basename(dir)}${env.LEAN_BREAK ? '_break_' + env.LEAN_BREAK : ''}`);
  fs.rmSync(work, { recursive: true, force: true });
  const repo = path.join(work, 'repo');
  const { base, head } = pairRepo(dir, repo);
  const runPr = async (tag, extra = []) => {
    const out = path.join(work, `report${tag}.json`);
    const r = await spawnCollect(process.execPath, [prTool, '--repo', repo, '--base', base, '--head', head, '--json', out, '--out', path.join(work, `report${tag}.md`),
      '--runs-dir', path.join(work, 'runs'), '--cache-dir', path.join(work, 'cache'), '--fresh', '--n', '30', '--dafny-seconds', '30', ...(exp.project ? [] : ['--no-project']), ...extra],
    { cwd: work, env: { ...process.env, ...env }, maxBuffer: 1 << 26, dir: work });
    let report = null; try { report = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* the rows below fail */ }
    return { r, report };
  };
  const { r, report } = await runPr('');
  const name = (x) => `${x.file} ${x.unit}`;
  const results = [];
  if (!report) return [{ check: 'pr report', ok: false, detail: `pr.mjs exit ${r.status}: ${(r.stderr ?? '').trim().split('\n').slice(-3).join(' | ').slice(0, 300)}` }];
  const lineOf = (w) => w?.where?.lines?.candidate?.start ?? w?.where?.lines?.candidate?.line ?? null;
  const unrecorded = (w) => { if (!w) return w; const { record, ...rest } = w; return rest; };
  const rowChecks = (rows, spec, label = '') => {
    for (const want of spec.rows ?? []) {
      const got = rows.find((x) => x.file === want.file && x.unit === want.unit);
      const ok = !!got && (!want.verdict || got.verdict === want.verdict) && (!want.notVerdict || got.verdict !== want.notVerdict) && (!want.coverage || got.coverage === want.coverage) && (!want.reason || String(got.reason ?? '').includes(want.reason));
      results.push({ check: `pr${label} ${name(want)} ${want.verdict ?? 'not ' + want.notVerdict}${want.coverage ? ' ' + want.coverage : ''}`, ok, detail: got ? `${got.verdict} | ${got.coverage} | ${String(got.reason ?? '').slice(0, 160)}` : `no row (rows: ${rows.map((x) => `${x.file}:${x.unit}`).join(', ').slice(0, 300)})` });
      if (want.sites !== undefined) {
        const ws = got?.witnesses ?? [], lines = new Set(ws.map(lineOf));
        const first = !!ws.length && JSON.stringify(ws[0]) === JSON.stringify(unrecorded(got.witness));
        results.push({ check: `pr${label} ${name(want)} witnesses at ${want.sites} site(s), witness the first`, ok: ws.length === want.sites && lines.size === want.sites && !lines.has(null) && first, detail: `${ws.length} witness(es) at candidate line(s) ${[...lines].join(', ') || 'none'}; witness ${first ? 'is' : 'is not'} witnesses[0]` });
      }
      if (want.leadLine !== undefined) { // design/w9i-reach.md: the witness the row leads with (the one that completed the most changed statements)
        const line = lineOf(got?.witness);
        results.push({ check: `pr${label} ${name(want)} witness (the lead) at candidate line ${want.leadLine}`, ok: line === want.leadLine, detail: `witness at candidate line ${line ?? 'none'} of ${(got?.witnesses ?? []).map(lineOf).join(', ') || 'no witnesses'}` });
      }
      if (want.siteReach !== undefined) { // design/w9i-reach.md: a witness kept for the changed statements it first completed
        const ws = got?.witnesses ?? [], held = ws.flatMap((w) => w.where?.reach ?? []), missing = want.siteReach.filter((x) => !held.includes(x));
        results.push({ check: `pr${label} ${name(want)} a witness kept for first completing ${want.siteReach.join(', ')}`, ok: !missing.length, detail: `where.reach ${held.length ? held.join(', ') : 'absent'} over ${ws.length} witness(es)` });
      }
      if (want.siteLines !== undefined) {
        const ws = got?.witnesses ?? [], lines = new Set(ws.map(lineOf)), missing = want.siteLines.filter((l) => !lines.has(l));
        results.push({ check: `pr${label} ${name(want)} witnesses name candidate line(s) ${want.siteLines.join(', ')}`, ok: !missing.length, detail: `${ws.length} witness(es) at candidate line(s) ${[...lines].join(', ') || 'none'}${missing.length ? `; missing ${missing.join(', ')}` : ''}` });
      }
    }
    for (const want of spec.absent ?? []) {
      const got = rows.find((x) => x.file === want.file && x.unit === want.unit);
      results.push({ check: `pr${label} ${name(want)} absent`, ok: !got, detail: got ? `${got.verdict} | ${got.coverage}` : 'absent' });
    }
  };
  const rows = report.rows ?? [];
  rowChecks(rows, exp);
  for (const [i, run] of (exp.units ?? []).entries()) {
    const label = ` --units ${run.units}`;
    const got = await runPr(`_units${i}`, ['--units', run.units]);
    if (!got.report) { results.push({ check: `pr${label} report`, ok: false, detail: `pr.mjs exit ${got.r.status}: ${(got.r.stderr ?? '').trim().split('\n').slice(-3).join(' | ').slice(0, 300)}` }); continue; }
    rowChecks(got.report.rows ?? [], run, label);
  }
  if (exp.unassigned === false) {
    const bad = rows.filter((x) => /^unassigned:/.test(x.coverage ?? '') && !x.inert);
    results.push({ check: 'pr no undecided unassigned row', ok: !bad.length, detail: bad.length ? bad.map((x) => `${x.file}:${x.coverage}`).join(', ') : 'none' });
  }
  if (exp.directives) {
    const got = report.directives ?? [];
    const match = (w, d) => d.file === w.file && d.directive === w.directive && d.change === w.change && (w.line === undefined || d.line === w.line)
      && (!w.suppresses || JSON.stringify((d.suppresses ?? []).map((e) => e.code).sort()) === JSON.stringify([...w.suppresses].sort()))
      && (!w.exposes || JSON.stringify((d.exposes ?? []).map((e) => e.code).sort()) === JSON.stringify([...w.exposes].sort()));
    for (const w of exp.directives) {
      const d = got.find((x) => match(w, x));
      results.push({ check: `pr directive ${w.file}:${w.line ?? '?'} ${w.change} ${w.directive}${w.suppresses ? ' hides ' + (w.suppresses.join(',') || 'nothing') : ''}`, ok: !!d, detail: d ? d.msg : `not listed (${got.map((x) => `${x.change} ${x.directive}@${x.line}`).join(', ') || 'none'})` });
    }
    const extra = got.filter((d) => !exp.directives.some((w) => match(w, d)));
    results.push({ check: 'pr directive records: no other', ok: !extra.length, detail: extra.length ? extra.map((d) => d.msg).join(' | ').slice(0, 300) : `${got.length} record(s)` });
    // a directive is a rule record in the refusals file, never a unit verdict
    let refusals = null; try { refusals = JSON.parse(fs.readFileSync(path.join(report.runDir ?? '', `${report.identity}.refusals.json`), 'utf8')); } catch { /* none */ }
    const ruleRecords = (refusals?.records ?? []).filter((x) => x.kind === 'rule');
    results.push({ check: 'pr directive records in the refusals file (kind rule)', ok: ruleRecords.length === got.length, detail: `${ruleRecords.length} rule record(s) for ${got.length} directive(s)` });
  }
  if (!env.LEAN_W1F_KEEP) fs.rmSync(work, { recursive: true, force: true });
  return results;
}
