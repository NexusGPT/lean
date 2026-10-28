// the inline posting rules of ci/comment.mjs against a fake GitHub API object: no network, no real token. The fake
// records every request and serves a recorded set of existing review comments (fixtures/existing-comments.json); the
// records come from fixtures/records.json, in the shape pr.mjs writes.
//
//   node --test langs/ts/tests/ci/
//
// The red run sets LEAN_CI_THRESHOLD=0 (the overlap rule off): the dry run then plans duplicates and its test fails.
// Its log is kept in logs/red-threshold-0.log and read by the last test here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main, planInline, rangeIoU, existingRange, DEFAULT_IOU, MAX_BATCH, INLINE_MARKER, MARKER } from '../../ci/comment.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RED = process.env.LEAN_CI_THRESHOLD;
const threshold = RED === undefined ? undefined : Number(RED);
const iouArgs = RED === undefined ? [] : ['--iou', RED];
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(here, 'fixtures', name), 'utf8'));
const TOKEN = 'ghs_fake_inline_test_token';
const HEAD = 'a'.repeat(40);

// the fake API: a fetch the poster calls, one pull request (7) of the repository o/r
function fakeApi({ review = fixture('existing-comments.json'), events = [] } = {}) {
  const issue = [];
  const requests = [];
  let nextId = 5000;
  const reply = (status, obj) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });
  const fetchImpl = async (url, { method = 'GET', headers = {}, body } = {}) => {
    const u = new URL(url);
    const request = { method, path: u.pathname, query: u.search, auth: headers.Authorization, body: body ? JSON.parse(body) : null };
    requests.push(request); events.push({ type: 'request', ...request });
    const page = Number(u.searchParams.get('page') ?? 1), per = Number(u.searchParams.get('per_page') ?? 30);
    if (method === 'GET' && u.pathname === '/repos/o/r/pulls/7/comments') return reply(200, review.slice((page - 1) * per, page * per));
    if (method === 'POST' && u.pathname === '/repos/o/r/pulls/7/comments') { const c = { id: nextId++, ...request.body }; review.push(c); return reply(201, { id: c.id }); }
    if (method === 'GET' && u.pathname === '/repos/o/r/issues/7/comments') return reply(200, issue.slice((page - 1) * per, page * per));
    if (method === 'POST' && u.pathname === '/repos/o/r/issues/7/comments') { const c = { id: nextId++, body: request.body.body }; issue.push(c); return reply(201, { id: c.id, html_url: 'http://fake/' + c.id }); }
    if (method === 'PATCH' && /^\/repos\/o\/r\/issues\/comments\/\d+$/.test(u.pathname)) return reply(200, { id: 1, html_url: 'http://fake/1' });
    return reply(404, { message: 'Not Found' });
  };
  return { fetchImpl, requests, review, issue, events };
}

// main with a fake report: the rows of a run and the refusals file it wrote
async function withRun(records, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-ci-inline-'));
  try {
    const file = path.join(tmp, 'fixture.refusals.json');
    fs.writeFileSync(file, JSON.stringify({ identity: 'fixture', records }));
    const report = async () => Object.assign([{ file: 'src/a.ts', unit: 'first', lines: [10, 10], verdict: 'WITNESS', coverage: 'checked', laneB: 'WITNESS', witness: { input: 0 }, advice: [] }],
      { identity: 'fixture', stop: { reason: 'none', reached: 1, total: 1 }, order: [], callersChecked: 0, refusalsFile: file });
    return await fn(report, tmp);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
async function runMain(argv, api, report, events = api.events) {
  const out = [], err = [];
  const code = await main(['--repo', '.', '--base', 'b'.repeat(40), '--head', HEAD, '--pr', '7', ...argv],
    { GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: 'https://fake.invalid' },
    (s) => { out.push(String(s)); events.push({ type: 'log', line: String(s) }); }, (s) => err.push(String(s)), report, api.fetchImpl);
  return { code, out: out.join('\n'), err: err.join('\n') };
}
const rangesOf = (planned) => planned.map((c) => `${c.path}:${c.start}-${c.end}`);
const POSTED = ['src/a.ts:30-33', 'src/b.ts:10-10', 'src/a.ts:40-40', 'src/a.ts:50-50', 'src/a.ts:70-72'];

test('the overlap threshold defaults to 0.6 and the batch to 50', () => {
  assert.equal(DEFAULT_IOU, 0.6);
  assert.equal(MAX_BATCH, 50);
  assert.equal(rangeIoU({ start: 60, end: 64 }, { start: 60, end: 62 }), 0.6);
  assert.equal(rangeIoU({ start: 30, end: 33 }, { start: 32, end: 35 }), 2 / 6);
  assert.equal(rangeIoU({ start: 1, end: 1 }, { start: 2, end: 2 }), 0);
  assert.deepEqual(existingRange({ path: 'a.ts', line: 23, start_line: 21, side: 'RIGHT', id: 1 }), { path: 'a.ts', start: 21, end: 23, id: 1 });
  assert.equal(existingRange({ path: 'a.ts', line: null, original_line: 40 }), null, 'an outdated comment holds no head range');
  assert.equal(existingRange({ path: 'a.ts', line: 50, side: 'LEFT' }), null, 'a base-side comment holds no head range');
});

test('a dry run adds only the non-overlapping records', async () => {
  const { records } = fixture('records.json');
  const plan = planInline(records, fixture('existing-comments.json'), { threshold });
  assert.deepEqual(rangesOf(plan.planned), POSTED, 'duplicate inline comments planned on ranges that already carry one');
  assert.deepEqual(plan.skipped.map((s) => [s.record.unit, s.against]), [['first', 101], ['second', 102], ['seventh', 106]]);
  const joined = plan.planned.find((c) => c.start === 70);
  assert.deepEqual(joined.records.map((r) => r.kind), ['coverage', 'witness'], 'two records of one run on one range share a comment');
  assert.ok(plan.planned.every((c) => c.body.startsWith(INLINE_MARKER)));
  await withRun(records, async (report) => {
    const api = fakeApi();
    const r = await runMain(['--post', '--inline', '--dry-run', ...iouArgs], api, report);
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(api.requests.filter((q) => q.method !== 'GET'), [], 'a dry run writes nothing');
    assert.ok(api.requests.every((q) => q.auth === `Bearer ${TOKEN}`));
    assert.match(r.out, /inline: 9 record\(s\), 6 existing comment\(s\), 5 to post, 3 skipped/);
    assert.deepEqual(r.out.split('\n').filter((l) => l.startsWith('inline (dry run): ')).map((l) => l.slice(18)), POSTED);
    assert.ok(!r.out.includes(TOKEN) && !r.err.includes(TOKEN));
  });
});

test('a posting run sends the planned comments on the head commit, and a second push adds none', async () => {
  const { records } = fixture('records.json');
  await withRun(records, async (report) => {
    const api = fakeApi();
    const first = await runMain(['--post', '--inline', ...iouArgs], api, report);
    assert.equal(first.code, 0, first.err);
    const posts = api.requests.filter((q) => q.method === 'POST' && q.path === '/repos/o/r/pulls/7/comments');
    assert.deepEqual(posts.map((q) => `${q.body.path}:${q.body.start_line ?? q.body.line}-${q.body.line}`), POSTED);
    assert.ok(posts.every((q) => q.body.commit_id === HEAD && q.body.side === 'RIGHT'));
    assert.deepEqual(posts.find((q) => q.body.line === 33).body.start_line, 30);
    assert.equal(posts.find((q) => q.body.line === 10).body.start_line, undefined);
    assert.equal(api.issue.length, 1, 'the sticky summary is one issue comment');
    assert.ok(api.issue[0].body.startsWith(MARKER) && api.issue[0].body.includes('## Intake'));
    const before = api.requests.length;
    const second = await runMain(['--post', '--inline', ...iouArgs], api, report);
    assert.equal(second.code, 0, second.err);
    assert.deepEqual(api.requests.slice(before).filter((q) => q.method === 'POST' && q.path.startsWith('/repos/o/r/pulls/')), [], 'a re-push posts no inline duplicate');
    assert.match(second.out, /0 to post, 9 skipped/);
  });
});

test('the batch size is respected: at most 50 requests between two logged boundaries', async () => {
  const records = Array.from({ length: 120 }, (_, i) => ({ check: 'lane-B', unit: 'u' + i, file: 'src/c.ts', location: { start: i + 1, end: i + 1 }, kind: 'witness', input: [i], reason: 'the two versions differ on outcome' }));
  for (const [args, want] of [[[], [50, 50, 20]], [['--batch', '80'], [50, 50, 20]], [['--batch', '7'], [...Array(17).fill(7), 1]]]) {
    await withRun(records, async (report) => {
      const events = [];
      const api = fakeApi({ events });
      const r = await runMain(['--post', '--inline', ...args], api, report, events);
      assert.equal(r.code, 0, r.err);
      const segments = [];
      for (const e of events) {
        if (e.type === 'log' && /^inline batch \d+ of \d+: \d+ request\(s\)$/.test(e.line)) segments.push(0);
        else if (e.type === 'request' && e.method === 'POST' && e.path === '/repos/o/r/pulls/7/comments') {
          assert.ok(segments.length, 'an inline request before the first logged boundary');
          segments[segments.length - 1]++;
        }
      }
      assert.deepEqual(segments, want);
      assert.ok(segments.every((n) => n <= 50));
    });
  }
  await withRun(records, async (report) => {
    const r = await runMain(['--post', '--inline', '--batch', '0'], fakeApi(), report);
    assert.equal(r.code, 2);
  });
});

test('the red run (threshold 0) is kept and shows duplicates posted', { skip: RED !== undefined ? 'this is the red run' : false }, () => {
  const log = fs.readFileSync(path.join(here, 'logs', 'red-threshold-0.log'), 'utf8');
  assert.match(log, /LEAN_CI_THRESHOLD=0/);
  assert.match(log, /✖ a dry run adds only the non-overlapping records/);
  assert.match(log, /duplicate inline comments planned on ranges that already carry one/);
  assert.match(log, /ℹ fail [1-9]/);
  assert.match(log, /# EXIT 1$/m);
});
