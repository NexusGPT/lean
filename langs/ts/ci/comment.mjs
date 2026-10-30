#!/usr/bin/env node
// lean comment: the pull-request table as one comment on the pull request. It runs pr.mjs between a base and a head
// sha, writes the markdown to a file, and with --post upserts ONE comment carrying the marker `<!-- lean-report -->`
// through the GitHub REST API: the comment that carries the marker is updated, else one is created.
//
//   node comment.mjs --repo <checkout> --base <sha> --head <sha> [--out report.md] [--json rows.json]
//                    [--paths 'src/**,lib/**'] [--max-functions 40] [--scope f,Class.m] [--n 100]
//                    [--time-budget seconds] [--unit-budget n]
//                    [--dafny-seconds 30] [--project <tsconfig>|--no-project]
//                    [--post [--pr <number>]] [--block none|witness|ask]
//                    [--inline [--iou 0.6] [--batch 50] [--dry-run]] [--runs-dir <dir>]
//
// --post reads what a GitHub Actions job carries: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), GITHUB_API_URL, and
// the pull request number from --pr, LEAN_PR or the event file at GITHUB_EVENT_PATH. The token goes into one request
// header and nowhere else: it is never printed, never written to a file, never part of an error.
//
// --inline posts one review comment per record of the run's refusals file (pr.mjs writes it as
// `<runs-dir>/<identity>.refusals.json`), on the head commit at the record's location. A record whose line range meets an
// existing review comment of the pull request on the same file at intersection over union --iou or more (0.6 by
// default; 0 turns the rule off) is not posted; two records of one run on such ranges share one comment. Requests go
// in batches of at most 50 (--batch lowers it) and each batch boundary is logged. --dry-run reads the existing comments
// and logs what would be posted, and writes nothing.
//
// Exit code: 0 always unless --block is given (a failed post is a warning, not a failure). --block witness exits 1
// when any row is WITNESS; --block ask exits 1 on WITNESS or ASK. Both block on a budget stop. A missing table exits 1
// too, since a gate that could not look must not pass. A row declared in scope never blocks. Usage errors exit 2.
// The gate reads every row of the report (function and intake rows, after --paths); --max-functions cuts the verdict
// table and nothing else, so a blocking row past the cap still fails the job and still gets its annotation. The work
// is bounded by --time-budget and --unit-budget, whose stop blocks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prReport, markdown, intakeMarkdown, reportJSON, stopNote, budgetValue, withRecord, intakeRow, verdictRows } from '../pr.mjs';

export const MARKER = '<!-- lean-report -->';
// a GitHub comment body holds at most 65,536 characters; the table is cut at a row boundary below that
export const MAX_BODY = 65000;
const BLOCKING = { none: [], witness: ['WITNESS'], ask: ['WITNESS', 'ASK'] };

const short = (sha) => (/^[0-9a-f]{40}$/.test(sha) ? sha.slice(0, 7) : sha);
const globs = (s) => (Array.isArray(s) ? s : String(s ?? '').split(/[,\n]/)).map((x) => x.trim()).filter(Boolean);

// a row's file is kept when no glob is given or one glob matches it
export function inPaths(file, patterns) {
  const ps = globs(patterns);
  return !ps.length || ps.some((p) => path.posix.matchesGlob(file, p));
}

// the rows that make the job fail under a blocking level; a row in scope never does
export function blockingRows(rows, block = 'none') {
  const kinds = BLOCKING[block];
  if (!kinds) throw new Error(`--block must be one of ${Object.keys(BLOCKING).join(', ')}`);
  return rows.filter((r) => !r['covered-by'] && kinds.includes(r.verdict)); // a nested row inherits its enclosing unit's verdict: that unit's row blocks, once
}

// the report as the comment tables it: every intake row, and the first `max` function rows (none dropped when `max` is
// not set). Presentation only: the gate reads the report, never this.
export function capTable(rows, max) {
  const functionRows = rows.filter((r) => !intakeRow(r)); // the rule of pr.mjs's verdictRows: an intake row never fills the cap
  const capped = !!(max && functionRows.length >= max);
  if (!capped) return { table: rows, capped };
  const kept = new Set(functionRows.slice(0, max));
  return { table: withRecord(rows, rows.filter((r) => intakeRow(r) || kept.has(r))), capped };
}

// the comment: the marker, the table, one line on what produced it; cut at a line boundary if it is too long
export function commentBody(md, { block = 'none', capped = false, extra = [], rows = null, stop = rows?.stop } = {}) {
  if (rows) {
    const firstBreak = md.indexOf('\n');
    const title = firstBreak < 0 ? md : md.slice(0, firstBreak);
    const verdicts = firstBreak < 0 ? '' : md.slice(firstBreak + 1);
    md = [title, '', intakeMarkdown(rows), '', '## Verdicts', verdicts].join('\n');
  }
  const tail = ['', `<sub>lean, blocking: ${block === 'none' ? 'off' : block}${stopNote(stop) ? '; ' + stopNote(stop) : ''}${capped ? '; the function cap was reached; the verdict table is capped and intake lists the change set' : ''}. This comment is updated on every push.</sub>`, ...extra];
  let body = [MARKER, md, ...tail].join('\n');
  if (body.length <= MAX_BODY) return body;
  const note = '\n\n(the table is longer than one comment holds; the full report is the job artifact)';
  const keep = [];
  let size = MARKER.length + 1 + tail.join('\n').length + note.length;
  for (const ln of md.split('\n')) { if (size + ln.length + 1 > MAX_BODY) break; keep.push(ln); size += ln.length + 1; }
  return [MARKER, keep.join('\n') + note, ...tail].join('\n');
}

// the pull request number: --pr, then LEAN_PR, then the event file a pull_request job carries
export function prNumber(explicit, env = process.env) {
  if (explicit) return Number(explicit);
  if (env.LEAN_PR) return Number(env.LEAN_PR);
  if (env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH)) {
    const ev = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    return ev.pull_request?.number ?? ev.number ?? null;
  }
  return null;
}

// the REST client of one pull request's repository: the token rides in one header, an error never carries it
function github({ api = 'https://api.github.com', repository, pr, token, fetchImpl = fetch }) {
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository ?? '')) throw new Error('GITHUB_REPOSITORY must be owner/name');
  if (!Number.isInteger(pr) || pr <= 0) throw new Error('no pull request number (--pr, LEAN_PR or the event file)');
  const base = `${(api ?? 'https://api.github.com').replace(/\/$/, '')}/repos/${repository}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lean-comment', 'Content-Type': 'application/json' };
  const call = async (method, url, payload) => {
    const res = await fetchImpl(url, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const text = await res.text();
    // the error names the method, the path and GitHub's message; never a header
    if (!res.ok) { let msg = text; try { msg = JSON.parse(text).message ?? text; } catch { /* plain text */ } throw new Error(`${method} ${new URL(url).pathname}: ${res.status} ${String(msg).slice(0, 200)}`); }
    return text ? JSON.parse(text) : null;
  };
  return { base, call };
}

// one comment per pull request: list the issue comments, update the first that starts with the marker, else create
export async function upsertComment({ api = 'https://api.github.com', repository, pr, token, body, fetchImpl = fetch }) {
  const { base, call } = github({ api, repository, pr, token, fetchImpl });
  let found = null;
  for (let page = 1; !found; page++) {
    const list = await call('GET', `${base}/issues/${pr}/comments?per_page=100&page=${page}`);
    found = list.find((c) => typeof c.body === 'string' && c.body.startsWith(MARKER)) ?? null;
    if (list.length < 100) break;
  }
  if (found) { const c = await call('PATCH', `${base}/issues/comments/${found.id}`, { body }); return { action: 'updated', id: c.id, url: c.html_url }; }
  const c = await call('POST', `${base}/issues/${pr}/comments`, { body });
  return { action: 'created', id: c.id, url: c.html_url };
}

export const INLINE_MARKER = '<!-- lean-refusal -->';
// a record whose range meets an existing comment's at this intersection over union or more is a duplicate
export const DEFAULT_IOU = 0.6;
// the most requests one batch sends
export const MAX_BATCH = 50;

// intersection over union of two inclusive line ranges
export function rangeIoU(a, b) {
  const inter = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start) + 1);
  const union = (a.end - a.start + 1) + (b.end - b.start + 1) - inter;
  return union > 0 ? inter / union : 0;
}

// an existing review comment's range from the API: `line` ends it and `start_line` opens a multi-line one. A comment
// with no current line (outdated, or on the whole file) and one on the base side (`side: LEFT`) hold no head range.
export function existingRange(c) {
  if (!c || typeof c.path !== 'string' || !Number.isInteger(c.line) || c.side === 'LEFT') return null;
  const start = Number.isInteger(c.start_line) && c.start_side !== 'LEFT' ? Math.min(c.start_line, c.line) : c.line;
  return { path: c.path, start, end: Math.max(c.line, start), id: c.id ?? null };
}

const quote = (text) => '`' + String(text).replace(/`/g, "'").replace(/\s+/g, ' ').slice(0, 200) + '`';
// the comment text of one record: what refused, where, the input and the advised rewrite
export function inlineBody(record) {
  const head = record.kind === 'witness' ? 'WITNESS' : record.kind === 'refuse' ? 'REFUSE' : record.check;
  const lines = [`**lean ${head}** on \`${record.unit}\` (${record.check}): ${record.reason}`];
  if (record.input !== undefined) lines.push('', `input: ${quote(JSON.stringify(record.input))}`);
  if (record.lines?.parent || record.lines?.candidate) lines.push('', `parent ${record.lines.parent ? quote(record.lines.parent.text) : '(no site)'} · candidate ${record.lines.candidate ? quote(record.lines.candidate.text) : '(no site)'}`);
  for (const a of (record.advice ?? []).slice(0, 3)) {
    const text = a.do ?? a.rewrite ?? a.msg ?? a.label;
    if (text) lines.push('', `do${a.rule ? ` (${a.rule})` : ''}: ${String(text).slice(0, 600)}`);
  }
  return lines.join('\n');
}

// which records become comments: a record is skipped when its range meets an existing comment's at `threshold` or more;
// a record that meets a comment already planned in this run joins that comment. Pure: no IO.
export function planInline(records, existing = [], { threshold = DEFAULT_IOU } = {}) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('--iou must be a number from 0 to 1');
  const ranges = existing.map(existingRange).filter(Boolean);
  const planned = [], skipped = [];
  const meets = (a, b) => threshold > 0 && a.path === b.path && rangeIoU(a, b) >= threshold;
  for (const record of records) {
    const start = Number(record.location?.start), end = Number(record.location?.end ?? record.location?.start);
    if (!record.file || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) { skipped.push({ record, against: null, why: 'no location' }); continue; }
    const range = { path: record.file, start, end };
    const prior = ranges.find((c) => meets(range, c));
    if (prior) { skipped.push({ record, against: prior.id, why: 'overlaps an existing comment' }); continue; }
    const mine = planned.find((c) => meets(range, c));
    if (mine) { mine.records.push(record); continue; }
    planned.push({ ...range, records: [record] });
  }
  return { planned: planned.map((c) => ({ ...c, body: [INLINE_MARKER, ...c.records.map(inlineBody)].join('\n\n') })), skipped };
}

// the review comments of the pull request, paged by 100
export async function reviewComments(client, pr) {
  const all = [];
  for (let page = 1; ; page++) {
    const list = await client.call('GET', `${client.base}/pulls/${pr}/comments?per_page=100&page=${page}`);
    all.push(...list);
    if (list.length < 100) return all;
  }
}

// post the planned comments on the head commit, at most `batch` requests per batch, each boundary logged; a failed
// request is a warning and the next one is sent
export async function postInline({ api, repository, pr, token, commit, records, threshold = DEFAULT_IOU, batch = MAX_BATCH, dryRun = false, fetchImpl = fetch, log = console.log, warn = console.error }) {
  if (!Number.isInteger(batch) || batch < 1) throw new Error('--batch must be a positive integer');
  const size = Math.min(batch, MAX_BATCH);
  if (!/^[0-9a-f]{7,64}$/i.test(commit ?? '')) throw new Error('--head must be a commit sha for inline comments');
  const client = github({ api, repository, pr, token, fetchImpl });
  const existing = await reviewComments(client, pr);
  const { planned, skipped } = planInline(records, existing, { threshold });
  log(`inline: ${records.length} record(s), ${existing.length} existing comment(s), ${planned.length} to post, ${skipped.length} skipped`);
  const result = { planned, skipped, posted: [], failed: [], batches: [] };
  if (dryRun) { for (const c of planned) log(`inline (dry run): ${c.path}:${c.start}-${c.end}`); return result; }
  const total = Math.ceil(planned.length / size);
  for (let k = 0; k < total; k++) {
    const slice = planned.slice(k * size, (k + 1) * size);
    log(`inline batch ${k + 1} of ${total}: ${slice.length} request(s)`);
    result.batches.push(slice.length);
    for (const c of slice) {
      const payload = { body: c.body, commit_id: commit, path: c.path, line: c.end, side: 'RIGHT', ...(c.start < c.end ? { start_line: c.start, start_side: 'RIGHT' } : {}) };
      try { const r = await client.call('POST', `${client.base}/pulls/${pr}/comments`, payload); result.posted.push({ path: c.path, start: c.start, end: c.end, id: r?.id ?? null }); }
      catch (e) { result.failed.push({ path: c.path, start: c.start, end: c.end }); warn(`::warning::lean could not post an inline comment at ${c.path}:${c.end}: ${String(e?.message ?? e).slice(0, 300)}`); }
    }
  }
  return result;
}

export async function main(argv, env = process.env, log = console.log, warn = console.error, report = prReport, fetchImpl = fetch) {
  const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const repo = opt('--repo'), base = opt('--base'), head = opt('--head');
  const block = opt('--block', 'none');
  if (!repo || !base || !head || !BLOCKING[block]) { warn('usage: comment.mjs --repo <checkout> --base <sha> --head <sha> [--out report.md] [--json rows.json] [--paths globs] [--max-functions N] [--scope f,Class.m] [--post [--pr N]] [--inline [--iou 0.6] [--batch 50] [--dry-run]] [--runs-dir dir] [--block none|witness|ask]'); return 2; }
  const paths = globs(opt('--paths', ''));
  const maxFunctions = opt('--max-functions') ? Number(opt('--max-functions')) : null;
  const scope = new Set(globs(opt('--scope', '')));
  const project = argv.includes('--no-project') ? false : opt('--project', true);
  const inline = argv.includes('--inline'), dryRun = argv.includes('--dry-run');
  const threshold = opt('--iou') === undefined ? DEFAULT_IOU : Number(opt('--iou'));
  const batch = opt('--batch') === undefined ? MAX_BATCH : Number(opt('--batch'));
  if (inline && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1 || !Number.isInteger(batch) || batch < 1)) { warn('usage: --iou takes a number from 0 to 1 and --batch a positive integer'); return 2; }
  let rows = null, error = null, refusalsFile = null;
  try {
    // Filter paths before checking and keep the report metadata after filtering.
    rows = await report({ repo: path.resolve(repo), base, head, n: Number(opt('--n', 100)), dafnySeconds: Number(opt('--dafny-seconds', 30)), project, scope, timeBudget: budgetValue(opt('--time-budget', null), '--time-budget'), unitBudget: budgetValue(opt('--unit-budget', null), '--unit-budget', true), paths: paths.length ? (f) => inPaths(f, paths) : null, runsDir: opt('--runs-dir') ? path.resolve(opt('--runs-dir')) : undefined });
    refusalsFile = rows.refusalsFile ?? null;
    rows = withRecord(rows, rows.filter((r) => inPaths(r.file, paths)));
  } catch (e) { error = String(e?.message ?? e).split('\n')[0].slice(0, 300); }
  // `rows` stays the whole report: the intake table, --json and the gate read it. The cap shapes the verdict table only.
  const { table, capped } = rows ? capTable(rows, maxFunctions) : { table: null, capped: false };
  const md = table ? markdown(table, short(base), short(head)) : `# lean report: ${short(base)} → ${short(head)}\n\nlean could not produce the table: ${error}`;
  const body = commentBody(md, { block, capped, rows });
  if (opt('--out')) { fs.writeFileSync(opt('--out'), body); log(`${table ? table.length : 0} function(s) -> ${opt('--out')}`); } else log(body);
  if (opt('--json') && rows) fs.writeFileSync(opt('--json'), JSON.stringify(reportJSON(rows), null, 1));
  if (error) warn(`::warning::lean could not produce the table: ${error}`);
  if (argv.includes('--post') && !dryRun) {
    try {
      const r = await upsertComment({ api: env.GITHUB_API_URL, repository: env.GITHUB_REPOSITORY, pr: prNumber(opt('--pr'), env), token: env.GITHUB_TOKEN, body, fetchImpl });
      log(`comment ${r.action}: ${r.url ?? r.id}`);
    } catch (e) { warn(`::warning::lean could not post the comment: ${String(e?.message ?? e).slice(0, 300)}`); }
  }
  // the inline comments come from the refusals file pr.mjs wrote, never from the markdown
  if (inline && rows && (argv.includes('--post') || dryRun)) {
    try {
      if (!refusalsFile) throw new Error('the run wrote no refusals file');
      const records = JSON.parse(fs.readFileSync(refusalsFile, 'utf8')).records.filter((r) => inPaths(r.file, paths));
      await postInline({ api: env.GITHUB_API_URL, repository: env.GITHUB_REPOSITORY, pr: prNumber(opt('--pr'), env), token: env.GITHUB_TOKEN, commit: head, records, threshold, batch, dryRun, fetchImpl, log, warn });
    } catch (e) { warn(`::warning::lean could not post the inline comments: ${String(e?.message ?? e).slice(0, 300)}`); }
  }
  if (block === 'none') return 0;
  if (!rows) return 1;
  const stop = stopNote(rows.stop);
  if (stop) warn(`::error::lean ${stop}`);
  const hits = blockingRows(rows, block);
  // an annotation's file is relative to the job's workspace, where the checkout may sit in a subfolder
  const prefix = env.GITHUB_WORKSPACE ? path.relative(env.GITHUB_WORKSPACE, path.resolve(repo)) : '';
  for (const r of hits) warn(`::error file=${prefix ? path.posix.join(prefix.split(path.sep).join('/'), r.file) : r.file},line=${r.lines?.[0] ?? 1}::lean ${r.verdict} on ${r.unit}`);
  return stop || hits.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
