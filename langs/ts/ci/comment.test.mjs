#!/usr/bin/env node
// the checks of comment.mjs, with no network and no real token: a scratch two-commit repository made from pairs, a
// second one whose only change is a new file (an ASK), and a fake GitHub on localhost that answers the comment calls
// and records every request. The last line says how many checks passed.
//
//   node langs/ts/ci/comment.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { main, MARKER, MAX_BODY, commentBody, inPaths, blockingRows, prNumber } from './comment.mjs';
import { pairsRepo } from './pairs-repo.mjs';
import { intakeRepo } from '../tests/fixtures/pr-intake/build.mjs';

let passed = 0; const failed = [];
const printed = []; // every line any run printed, searched for the token at the end
const ok = (cond, name) => { if (cond) passed++; else failed.push(name); };

const scratchRoot = fs.existsSync('/tmp/claude-501') ? '/tmp/claude-501' : os.tmpdir();
const tmp = fs.mkdtempSync(path.join(scratchRoot, 'ci-comment-test-'));
const TOKEN = `ghs_fake_${crypto.randomBytes(12).toString('hex')}`;

// a run of main with its output captured
async function run(argv, env = {}, report) {
  const out = [], err = [];
  const code = await main(argv, env, (s) => out.push(String(s)), (s) => err.push(String(s)), report);
  printed.push(...out, ...err);
  return { code, out: out.join('\n'), err: err.join('\n') };
}

// a fake GitHub: issue comments of one pull request, paged by 100; `fail` answers every call with that status
function fakeGitHub({ comments = [], fail = null } = {}) {
  const requests = []; let nextId = 9000;
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: data ? JSON.parse(data) : null });
      const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (fail) return send(fail, { message: 'Resource not accessible by integration' });
      const u = new URL(req.url, 'http://x');
      let m;
      if (req.method === 'GET' && (m = u.pathname.match(/^\/repos\/o\/r\/issues\/(\d+)\/comments$/))) {
        const page = Number(u.searchParams.get('page') ?? 1), per = Number(u.searchParams.get('per_page') ?? 30);
        return send(200, comments.slice((page - 1) * per, page * per));
      }
      if (req.method === 'PATCH' && (m = u.pathname.match(/^\/repos\/o\/r\/issues\/comments\/(\d+)$/))) {
        const c = comments.find((x) => x.id === Number(m[1])); if (!c) return send(404, { message: 'Not Found' });
        c.body = JSON.parse(data).body; return send(200, { id: c.id, html_url: `http://fake/c/${c.id}` });
      }
      if (req.method === 'POST' && (m = u.pathname.match(/^\/repos\/o\/r\/issues\/(\d+)\/comments$/))) {
        const c = { id: nextId++, body: JSON.parse(data).body }; comments.push(c); return send(201, { id: c.id, html_url: `http://fake/c/${c.id}` });
      }
      return send(404, { message: 'Not Found' });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, comments, url: `http://127.0.0.1:${server.address().port}` })));
}

const git = (repo, args) => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@localhost', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
  if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim();
};

try {
  const reportAt = process.argv.indexOf('--budget-report');
  const stopped = reportAt < 0 ? {
    rows: [{ file: 'later.ts', unit: 'later', lines: [1, 1], coverage: 'skipped:budget', verdict: null, reason: 'stop at unit 1 of 1' }],
    order: [{ group: 'changed', units: [{ file: 'later.ts', unit: 'later' }] }, { group: 'callers', units: [] }, { group: 'heap', units: [] }],
    stop: { reason: 'unit-budget', reached: 0, total: 1 },
  } : JSON.parse(fs.readFileSync(process.argv[reportAt + 1], 'utf8'));
  const replay = async () => Object.assign([...stopped.rows], { stop: stopped.stop, order: stopped.order });
  const args = ['--repo', tmp, '--base', 'base', '--head', 'head', '--max-functions', '1'];
  for (const block of ['ask', 'witness', 'none']) {
    const r = await run([...args, '--block', block], {}, replay);
    ok(r.code === (block === 'none' ? 0 : 1), 'a stop respects block ' + block);
    ok(r.out.includes('stopped: ' + stopped.stop.reason), 'the footer names the stop under ' + block);
    ok(block === 'none' || r.err.includes('::error::lean stopped:'), 'the annotation names the stop under ' + block);
  }
  const timeRows = Object.assign([], { stop: { reason: 'time-budget', reached: 0, total: 1 } });
  const timeStop = await run([...args, '--block', 'ask'], {}, async () => timeRows);
  ok(timeStop.code === 1 && timeStop.err.includes('time-budget'), 'a time stop blocks with no verdict rows');
  const longStop = commentBody('# lean report\n' + 'row\n'.repeat(20000), { rows: stopped.rows, stop: stopped.stop });
  ok(longStop.length <= MAX_BODY && longStop.includes('stopped: ' + stopped.stop.reason), 'a truncated comment keeps its stop');
  const silent = structuredClone(stopped);
  delete silent.stop;
  const scratch = path.join(tmp, 'silent.json');
  fs.writeFileSync(scratch, JSON.stringify(silent));
  const red = await run([...args, '--block', 'ask'], {}, async () => {
    const saved = JSON.parse(fs.readFileSync(scratch, 'utf8'));
    return Object.assign(saved.rows, { order: saved.order, stop: saved.stop });
  });
  ok(red.code === 0, 'dropping the stop makes the gate silent');
  const redLog = 'Scratch report: stop field removed\ncomment.mjs --block ask\nEXIT ' + red.code + '\n';
  if (process.argv.includes('--budget-only')) {
    fs.mkdirSync('/tmp/claude-501', { recursive: true });
    fs.writeFileSync('/tmp/claude-501/budgets-red.log', redLog);
    fs.copyFileSync(scratch, '/tmp/claude-501/budgets-red.json');
    console.log(redLog.trimEnd());
  }
  if (!process.argv.includes('--budget-only')) {
  const fixture = intakeRepo(path.join(tmp, 'intake'));
  const intakeOut = path.join(tmp, 'intake.md');
  const intakeRun = await run(['--repo', fixture.repo, '--base', fixture.base, '--head', fixture.head, '--dafny-seconds', '1', '--out', intakeOut]);
  const intakeBody = fs.readFileSync(intakeOut, 'utf8');
  const intakeTable = intakeBody.split('## Intake')[1]?.split('## Verdicts')[0] ?? '';
  ok(intakeRun.code === 0 && intakeBody.startsWith(MARKER) && intakeBody.length <= MAX_BODY, 'intake comment has marker and fits the cap');
  ok(intakeBody.indexOf('## Intake') < intakeBody.indexOf('## Verdicts'), 'intake comes before verdicts');
  ok((intakeTable.match(/^\| \x60/gm) ?? []).length === 6, 'intake has six rows: three units, one unassigned hunk, two artifact hunks');
  ok(['checked', 'refused:alias-mutation', 'failed:loader', 'unassigned:untyped JavaScript file', 'artifact:binary', 'artifact:secret-path'].every((c) => intakeTable.includes(c)), 'intake comment has unit, artifact and unassigned coverage values');
  const terminalRows = ['crash', 'timeout', 'lost-worker', 'incomplete-artifact'].map(state => ({ file: 'failed.ts', unit: state, lines: [1, 1], verdict: 'ASK', coverage: `failed:${state}`, reason: state }));
  const terminalBody = commentBody('# lean report', { rows: terminalRows });
  ok(terminalRows.every(r => terminalBody.includes(r.coverage)) && blockingRows(terminalRows, 'ask').length === terminalRows.length, 'terminal failures retain their vocabulary and block as ASK');
  const longIntake = commentBody('# lean report', { rows: Array.from({ length: 4000 }, (_, i) => ({ file: `source${i}.ts`, unit: 'f', coverage: 'checked' })) });
  ok(longIntake.length <= MAX_BODY && longIntake.includes('longer than one comment holds'), 'long intake respects the character cap');
  const cappedIntake = commentBody('# lean report\n\none verdict', { capped: true, rows: [{ file: 'later.ts', unit: 'later', coverage: 'checked' }] });
  ok(cappedIntake.includes('later.ts') && cappedIntake.includes('intake lists the change set'), 'the verdict cap keeps the intake rows');
  console.log('intake comment: ' + (failed.length ? 'FAIL' : 'pass'));
  if (!process.argv.includes('--intake-only')) {
  // the pure parts
  ok(inPaths('src/a/b.ts', '') && inPaths('src/a/b.ts', 'src/**') && !inPaths('lib/b.ts', 'src/**,test/**') && inPaths('lib/b.ts', 'src/**\nlib/*.ts'), 'paths globs');
  const rowsOf = (...v) => v.map((verdict) => ({ verdict }));
  ok(blockingRows(rowsOf('WITNESS', 'ASK', 'IN-SCOPE', 'PASS-proved'), 'none').length === 0, 'block none');
  ok(blockingRows(rowsOf('WITNESS', 'ASK', 'IN-SCOPE', 'PASS-bounded'), 'witness').length === 1, 'block witness');
  ok(blockingRows(rowsOf('WITNESS', 'ASK', 'IN-SCOPE', 'REFUSE'), 'ask').length === 2, 'block ask');
  ok((() => { try { blockingRows([], 'all'); return false; } catch { return true; } })(), 'block level unknown');
  const long = commentBody(Array.from({ length: 3000 }, (_, i) => `| f${i}.ts | \`g\` | **ASK** | | | ${'x'.repeat(30)} |`).join('\n'));
  ok(long.length <= MAX_BODY && long.startsWith(MARKER) && long.includes('longer than one comment holds'), 'long body cut under the limit');
  const ev = path.join(tmp, 'event.json'); fs.writeFileSync(ev, JSON.stringify({ pull_request: { number: 17 } }));
  ok(prNumber(null, { GITHUB_EVENT_PATH: ev }) === 17 && prNumber('5', { LEAN_PR: '6' }) === 5 && prNumber(null, { LEAN_PR: '6' }) === 6, 'pull request number');

  // repository 1: two pairs, every changed function a WITNESS
  const r1 = path.join(tmp, 'pairs');
  const p = pairsRepo({ out: r1, pairs: ['counter', 'callbacks'] });
  const base = ['--repo', r1, '--base', p.base, '--head', p.head, '--no-project', '--n', '30'];
  const md1 = path.join(tmp, 'r1.md');
  let r = await run([...base, '--out', md1]);
  const text1 = fs.readFileSync(md1, 'utf8');
  ok(r.code === 0 && text1.startsWith(`${MARKER}\n# lean report: ${p.base.slice(0, 7)}`) && /\| counter\/index\.ts \| `Counter\.bump` \(\d+-\d+\) \| \*\*WITNESS\*\*/.test(text1), 'file mode writes the table');
  ok(text1.includes('blocking: off'), 'footer says blocking is off');
  r = await run([...base, '--out', md1, '--block', 'witness']);
  ok(r.code === 1 && /::error file=counter\/index\.ts,line=\d+::lean WITNESS on Counter\.bump/.test(r.err), 'block witness exits 1 with annotations');
  r = await run([...base, '--out', md1, '--block', 'witness', '--scope', 'subscribe,Counter.bump,Counter.step']);
  ok(r.code === 0 && fs.readFileSync(md1, 'utf8').includes('3 in scope'), 'rows in scope never block');
  r = await run([...base, '--out', md1, '--paths', 'callbacks/**']);
  ok(r.code === 0 && !fs.readFileSync(md1, 'utf8').includes('counter/index.ts') && fs.readFileSync(md1, 'utf8').includes('callbacks/index.ts'), 'paths keep only matching files');
  r = await run([...base, '--out', md1, '--max-functions', '1']);
  ok(r.code === 0 && (fs.readFileSync(md1, 'utf8').match(/^\| (counter|callbacks)\//gm) ?? []).length === 1 && fs.readFileSync(md1, 'utf8').includes('cap was reached'), 'the cap bounds the table');
  r = await run([...base, '--out', md1, '--block', 'witness'], { GITHUB_WORKSPACE: tmp });
  ok(r.err.includes('::error file=pairs/counter/index.ts'), 'annotation path is relative to the workspace');

  // repository 2: a new file only (ASK)
  const r2 = path.join(tmp, 'newfile'); fs.mkdirSync(r2);
  git(r2, ['init', '-q', '-b', 'main']); fs.writeFileSync(path.join(r2, 'a.ts'), 'export function a(x: number): number { return x + 1; }\n'); git(r2, ['add', '-A']); git(r2, ['commit', '-q', '-m', 'a']);
  const b2 = git(r2, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(r2, 'b.ts'), 'export function b(x: number): number { return x * 2; }\n'); git(r2, ['add', '-A']); git(r2, ['commit', '-q', '-m', 'b']);
  const h2 = git(r2, ['rev-parse', 'HEAD']);
  const base2 = ['--repo', r2, '--base', b2, '--head', h2, '--no-project', '--n', '30', '--out', path.join(tmp, 'r2.md')];
  r = await run([...base2, '--block', 'witness']);
  ok(r.code === 0 && fs.readFileSync(path.join(tmp, 'r2.md'), 'utf8').includes('**ASK**'), 'an ASK does not block under witness');
  r = await run([...base2, '--block', 'ask']);
  ok(r.code === 1 && r.err.includes('lean ASK on b'), 'an ASK blocks under ask');

  // a run that cannot produce the table: exit 0 without blocking, 1 with
  const bad = ['--repo', r2, '--base', '0000000', '--head', h2, '--no-project', '--out', path.join(tmp, 'bad.md')];
  r = await run(bad);
  ok(r.code === 0 && r.err.includes('::warning::lean could not produce the table') && fs.readFileSync(path.join(tmp, 'bad.md'), 'utf8').startsWith(MARKER), 'no table: exit 0, the comment says why');
  r = await run([...bad, '--block', 'witness']);
  ok(r.code === 1, 'no table under block: exit 1');
  ok((await run(['--repo', r2])).code === 2 && (await run([...base2, '--block', 'some'])).code === 2, 'usage errors exit 2');

  // --post against the fake GitHub
  const env = (url) => ({ GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: url, LEAN_PR: '12' });
  let g = await fakeGitHub({ comments: [{ id: 1, body: 'a human comment' }] });
  r = await run([...base, '--out', md1, '--post'], env(g.url));
  ok(r.code === 0 && g.requests.map((q) => q.method).join(',') === 'GET,POST' && g.requests[1].url === '/repos/o/r/issues/12/comments', 'no marked comment: one is created');
  ok(g.requests.every((q) => q.auth === `Bearer ${TOKEN}`), 'every request carries the token in its header');
  ok(g.requests[1].body.body === fs.readFileSync(md1, 'utf8') && g.comments.length === 2, 'the posted body is the written report');
  r = await run([...base, '--out', md1, '--post', '--block', 'witness'], env(g.url));
  ok(r.code === 1 && g.requests.slice(2).map((q) => q.method).join(',') === 'GET,PATCH' && g.requests[3].url === '/repos/o/r/issues/comments/9000' && g.comments.length === 2, 'a second run updates the same comment');
  g.server.close();

  // the marked comment on the second page of comments
  const many = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, body: `comment ${i}` })).concat([{ id: 555, body: `${MARKER}\nold table` }]);
  g = await fakeGitHub({ comments: many });
  r = await run([...base, '--out', md1, '--post'], env(g.url));
  ok(g.requests.map((q) => `${q.method} ${q.url.replace(/\?.*page=(\d+).*/, ' p$1')}`).join(',') === 'GET /repos/o/r/issues/12/comments p1,GET /repos/o/r/issues/12/comments p2,PATCH /repos/o/r/issues/comments/555' && many.find((c) => c.id === 555).body.startsWith(`${MARKER}\n# lean report`), 'the marked comment is found on page two');
  g.server.close();

  // GitHub refuses: a warning, exit 0, no token anywhere
  g = await fakeGitHub({ fail: 403 });
  r = await run([...base, '--out', md1, '--post'], env(g.url));
  ok(r.code === 0 && /::warning::lean could not post the comment: GET \/repos\/o\/r\/issues\/12\/comments: 403 Resource not accessible/.test(r.err), 'a refused post is a warning');
  g.server.close();
  r = await run([...base, '--out', md1, '--post'], { GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: 'http://127.0.0.1:9', LEAN_PR: '12' });
  ok(r.code === 0 && r.err.includes('GITHUB_TOKEN is not set'), 'no token: a warning, no request');

  const written = fs.readdirSync(tmp).filter((f) => f.endsWith('.md')).map((f) => fs.readFileSync(path.join(tmp, f), 'utf8')).join('\n');
  ok(printed.length > 20 && ![...printed, written].some((s) => s.includes(TOKEN)), 'the token is in no output and no file');
  }
  }
} catch (e) {
  failed.push(`threw: ${e.message}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
for (const f of failed) console.log(`FAIL ${f}`);
console.log(`comment.test: ${passed} of ${passed + failed.length} checks pass`);
process.exitCode = failed.length ? 1 : 0;
