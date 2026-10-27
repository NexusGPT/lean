#!/usr/bin/env node
// lean comment: the pull-request table as one comment on the pull request. It runs pr.mjs between a base and a head
// sha, writes the markdown to a file, and with --post upserts ONE comment carrying the marker `<!-- lean-report -->`
// through the GitHub REST API: the comment that carries the marker is updated, else one is created.
//
//   node comment.mjs --repo <checkout> --base <sha> --head <sha> [--out report.md] [--json rows.json]
//                    [--paths 'src/**,lib/**'] [--max-functions 40] [--scope f,Class.m] [--n 100]
//                    [--dafny-seconds 30] [--project <tsconfig>|--no-project]
//                    [--post [--pr <number>]] [--block none|witness|ask]
//
// --post reads what a GitHub Actions job carries: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), GITHUB_API_URL, and
// the pull request number from --pr, LEAN_PR or the event file at GITHUB_EVENT_PATH. The token goes into one request
// header and nowhere else: it is never printed, never written to a file, never part of an error.
//
// Exit code: 0 always unless --block is given (a failed post is a warning, not a failure). --block witness exits 1
// when any row is WITNESS; --block ask exits 1 on WITNESS or ASK; under --block, a run that produced no table exits 1
// too, since a gate that could not look must not pass. A row declared in scope never blocks. Usage errors exit 2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prReport, markdown } from '../pr.mjs';

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
  return rows.filter((r) => kinds.includes(r.verdict));
}

// the comment: the marker, the table, one line on what produced it; cut at a line boundary if it is too long
export function commentBody(md, { block = 'none', capped = false, extra = [] } = {}) {
  const tail = ['', `<sub>lean, blocking: ${block === 'none' ? 'off' : block}${capped ? '; the function cap was reached, any later function is not in this table' : ''}. This comment is updated on every push.</sub>`, ...extra];
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

// one comment per pull request: list the issue comments, update the first that starts with the marker, else create
export async function upsertComment({ api = 'https://api.github.com', repository, pr, token, body, fetchImpl = fetch }) {
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository ?? '')) throw new Error('GITHUB_REPOSITORY must be owner/name');
  if (!Number.isInteger(pr) || pr <= 0) throw new Error('no pull request number (--pr, LEAN_PR or the event file)');
  const base = `${api.replace(/\/$/, '')}/repos/${repository}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lean-comment', 'Content-Type': 'application/json' };
  const call = async (method, url, payload) => {
    const res = await fetchImpl(url, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const text = await res.text();
    // the error names the method, the path and GitHub's message; never a header
    if (!res.ok) { let msg = text; try { msg = JSON.parse(text).message ?? text; } catch { /* plain text */ } throw new Error(`${method} ${new URL(url).pathname}: ${res.status} ${String(msg).slice(0, 200)}`); }
    return text ? JSON.parse(text) : null;
  };
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

export async function main(argv, env = process.env, log = console.log, warn = console.error) {
  const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const repo = opt('--repo'), base = opt('--base'), head = opt('--head');
  const block = opt('--block', 'none');
  if (!repo || !base || !head || !BLOCKING[block]) { warn('usage: comment.mjs --repo <checkout> --base <sha> --head <sha> [--out report.md] [--json rows.json] [--paths globs] [--max-functions N] [--scope f,Class.m] [--post [--pr N]] [--block none|witness|ask]'); return 2; }
  const paths = globs(opt('--paths', ''));
  const maxFunctions = opt('--max-functions') ? Number(opt('--max-functions')) : null;
  const scope = new Set(globs(opt('--scope', '')));
  const project = argv.includes('--no-project') ? false : opt('--project', true);
  let rows = null, error = null;
  try {
    // paths and maxUnits are passed for a prReport that filters before it checks; the rows are filtered here as well
    rows = await prReport({ repo: path.resolve(repo), base, head, n: Number(opt('--n', 100)), dafnySeconds: Number(opt('--dafny-seconds', 30)), project, scope, paths: paths.length ? (f) => inPaths(f, paths) : null, maxUnits: maxFunctions });
    rows = rows.filter((r) => inPaths(r.file, paths));
  } catch (e) { error = String(e?.message ?? e).split('\n')[0].slice(0, 300); }
  // the cap: a prReport that honours maxUnits stops there; one that does not has checked every function, and the
  // table still shows the first maxFunctions only, so the comment's length is bounded either way
  const capped = !!(rows && maxFunctions && rows.length >= maxFunctions);
  if (capped) rows = rows.slice(0, maxFunctions);
  const md = rows ? markdown(rows, short(base), short(head)) : `# lean report: ${short(base)} → ${short(head)}\n\nlean could not produce the table: ${error}`;
  const body = commentBody(md, { block, capped });
  if (opt('--out')) { fs.writeFileSync(opt('--out'), body); log(`${rows ? rows.length : 0} function(s) -> ${opt('--out')}`); } else log(body);
  if (opt('--json') && rows) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  if (error) warn(`::warning::lean could not produce the table: ${error}`);
  if (argv.includes('--post')) {
    try {
      const r = await upsertComment({ api: env.GITHUB_API_URL, repository: env.GITHUB_REPOSITORY, pr: prNumber(opt('--pr'), env), token: env.GITHUB_TOKEN, body });
      log(`comment ${r.action}: ${r.url ?? r.id}`);
    } catch (e) { warn(`::warning::lean could not post the comment: ${String(e?.message ?? e).slice(0, 300)}`); }
  }
  if (block === 'none') return 0;
  if (!rows) return 1;
  const hits = blockingRows(rows, block);
  // an annotation's file is relative to the job's workspace, where the checkout may sit in a subfolder
  const prefix = env.GITHUB_WORKSPACE ? path.relative(env.GITHUB_WORKSPACE, path.resolve(repo)) : '';
  for (const r of hits) warn(`::error file=${prefix ? path.posix.join(prefix.split(path.sep).join('/'), r.file) : r.file},line=${r.lines?.[0] ?? 1}::lean ${r.verdict} on ${r.unit}`);
  return hits.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
