#!/usr/bin/env node
// readme-check: every command the README shows is run again on this checkout, and what it shows is compared with
// what the command prints now. A README line that no longer matches the product is the defect this script names.
//   node scripts/readme-check.mjs            exits 0 when every shown line holds, 1 otherwise, 2 on a harness error
// What is checked: every fenced line starting with `$ node langs/ts/check.mjs` (its verdict word against the next
// line's first word), the quickstart (its jq projection against the shown JSON line), every `$ node langs/ts/lint/lint.mjs`
// line (exit 1 with findings, 0 when the next line says "inside the subset"), and the pull-request summary line.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8').split('\n');
const tmp = fs.mkdtempSync(path.join(root, '.readme-check-'));
const failures = []; let checks = 0;
const say = (ok, what) => { checks++; if (!ok) failures.push(what); console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const resolveArgs = (args, cwdHint) => args.map((a) => {
  if (!/\.(ts|tsx|json)$/.test(a) || a.startsWith('--')) return a;
  for (const base of [cwdHint, root, path.join(root, 'langs/ts/tests/pairs'), path.join(root, 'examples/showcase'), path.join(root, 'docs/examples/limits')]) {
    if (base && fs.existsSync(path.join(base, a))) return path.join(base, a);
  }
  return a;
});
const run = (argv, cwd) => spawnSync('node', argv, { cwd, encoding: 'utf8', env: { ...process.env, LEAN_STEP_CACHE_DIR: process.env.LEAN_STEP_CACHE_DIR ?? path.join(tmp, 'cache') }, timeout: 600000 });
let cwdHint = root;
for (let i = 0; i < readme.length; i++) {
  const line = readme[i];
  const fromFolder = line.match(/run the commands from that folder|Files: \[`([^`]+)`\]/);
  if (fromFolder && fromFolder[1]) cwdHint = path.join(root, fromFolder[1].replace(/\/$/, ''));
  if (line.startsWith('## ')) cwdHint = root;
  const m = line.match(/^\$ node (langs\/ts\/(?:check\.mjs|lint\/lint\.mjs)) (.*)$/);
  if (!m) continue;
  const script = m[1]; const rawArgs = m[2].split(/\s+/);
  const isCheck = script.endsWith('check.mjs');
  const args = resolveArgs(rawArgs, cwdHint).filter((a, k, arr) => !(arr[k - 1] === '--out'));
  const outIdx = args.indexOf('--out'); if (outIdx >= 0) args.splice(outIdx, 1);
  const outFile = path.join(tmp, `${i}.json`);
  const argv = [path.join(root, script), ...args, ...(isCheck ? ['--out', outFile] : [])];
  const r = run(argv, root);
  const shown = readme[i + 1] ?? '';
  if (isCheck) {
    const wantVerdict = shown.split(/\s|->/)[0];
    const got = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')).verdict : `(no certificate; exit ${r.status}; ${(r.stdout + r.stderr).trim().slice(-160)})`;
    say(got === wantVerdict, `README line ${i + 1}: ${wantVerdict} shown, ${got} now  [${m[2].slice(0, 70)}]`);
    const comment = shown.match(/#\s*(.*)$/);
    if (comment && /decided: \d+ state pairs over \d+ assignment/.test(comment[1]) && fs.existsSync(outFile)) {
      const renders = JSON.parse(fs.readFileSync(outFile, 'utf8')).certificate?.lanes?.B?.bound?.frontEnd?.renders ?? '';
      const want = comment[1].match(/decided: \d+ state pairs over \d+ assignment\(s\)/)[0];
      say(renders.includes(want), `README line ${i + 1}: "${want}" shown, certificate says "${renders.slice(0, 120)}"`);
    }
  } else {
    const inside = /inside the subset/.test(shown);
    say(inside ? r.status === 0 : r.status === 1, `README line ${i + 1}: lint exit ${r.status}, shown ${inside ? 'inside the subset' : 'findings'}  [${m[2].slice(0, 70)}]`);
  }
}
// the quickstart: the check.mjs line, the jq projection and the shown JSON line
const qi = readme.findIndex((l) => l.startsWith('node langs/ts/check.mjs --parent langs/ts/tests/pairs/readme_ledger'));
if (qi >= 0) {
  const args = readme[qi].replace(/^node langs\/ts\/check\.mjs /, '').split(/\s+/).map((a) => (a === 'ledger.json' ? path.join(tmp, 'ledger.json') : a));
  run([path.join(root, 'langs/ts/check.mjs'), ...args], root);
  const jqLine = readme[qi + 1]; const filter = jqLine.match(/jq -c '(.*)' ledger\.json/)?.[1];
  const jq = spawnSync('jq', ['-c', filter, path.join(tmp, 'ledger.json')], { encoding: 'utf8' });
  const shown = readme.slice(qi + 2, qi + 8).find((l) => l.startsWith('{"input"'));
  say(jq.stdout.trim() === shown, `quickstart: shown ${shown}, now ${jq.stdout.trim() || jq.stderr.trim()}`);
}
// the pull-request summary line
const pi = readme.findIndex((l) => l.startsWith('$ node langs/ts/pr.mjs'));
if (pi >= 0) {
  const args = readme[pi].replace(/^\$ node langs\/ts\/pr\.mjs /, '').split(/\s+/);
  const r = run([path.join(root, 'langs/ts/pr.mjs'), ...args], path.join(root, 'examples/booking'));
  const shown = readme.slice(pi + 1, pi + 6).find((l) => l.startsWith('> '))?.replace(/\*\*/g, '') ?? '';
  const counts = shown.match(/\d+ in scope · .*?0 NEW/)?.[0] ?? '';
  const out = (r.stdout + r.stderr).replace(/\*\*/g, '');
  say(counts && out.includes(counts), `pull request: shown "${counts}", output ${out.includes(counts) ? 'matches' : 'differs: ' + out.trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${checks} checks, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
