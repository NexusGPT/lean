#!/usr/bin/env node
// census.mjs classes a unit refused only on a value whose type does not resolve as environment-blocked, its reason naming
// the unresolved symbol and its import; a unit refused on a value whose type resolves keeps its reading
// (census.mjs environmentOf, design/census-reach-2026-10-31.md). The fixture fixtures/census-environment/repo imports a
// module, `handle-source`: describe hands a value of its type to its function and reads the value after the call; keep does
// the same with a typed callback of its own. Run once with the module absent and once with it present (its declarations
// copied into node_modules). Run: node langs/ts/tests/census_environment.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const census = path.join(here, '..', 'census.mjs');
const fixture = path.join(here, 'fixtures', 'census-environment');
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw ? ': ' + saw : ''}`); if (!ok) fail++; };
// the census skips paths under tests or fixtures: each run reads a copy outside them
function run(label, present) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), `lean-census-environment-${label}-`));
  const json = `${repo}.json`;
  try {
    fs.cpSync(path.join(fixture, 'repo'), repo, { recursive: true });
    if (present) fs.cpSync(path.join(fixture, 'handle-source'), path.join(repo, 'node_modules', 'handle-source'), { recursive: true });
    const r = spawnSync(process.execPath, [census, repo, '--out', json], { encoding: 'utf8' });
    say(r.status === 0, `${label}: census exits 0`, r.status === 0 ? '' : `exit ${r.status} ${(r.stderr ?? '').slice(-300)}`);
    return JSON.parse(fs.readFileSync(json, 'utf8'));
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    for (const p of [json, `${json}.records.jsonl`]) fs.rmSync(p, { force: true });
  }
}
// each unit's class from the record: environment (refused only on an unresolved type), else the rule of its first language
// finding (the census's own stop), else entered
const classes = (res) => { const rec = res.records[0]; return Object.fromEntries(rec.units.map(({ name }) => { const e = (rec.unresolvedTypes ?? []).find((x) => x.unit === name); return [name, e ? `environment: ${e.kind}` : rec.findings.find((f) => f.unit === name && !f.env)?.rule ?? 'entered']; })); };

const A = run('absent', false), absent = classes(A);
say(absent.describe === 'environment: absent', 'absent: describe, refused on a value of an unresolved import, is environment-blocked', absent.describe);
const m = A.refusalRules.find((g) => g.rule === 'environment: absent')?.directories[0].example.message ?? '';
say(m.includes('`Handle`') && m.includes("'handle-source'") && m.includes('read-after-call'), 'absent: the reason names the unresolved symbol, its import and the refusal', JSON.stringify(m.slice(0, 120)));
say(absent.keep === 'read-after-call', 'absent: keep, refused on values whose types resolve, keeps its reading', absent.keep);
say(A.environmentBlocked === 1 && A.languageRefused === 1, 'absent: one unit environment-blocked, one language-refused', `${A.environmentBlocked}, ${A.languageRefused}`);

const P = run('present', true), present = classes(P);
say(!present.describe.startsWith('environment'), 'present: describe is classed by its reading', present.describe);
say(present.keep === 'read-after-call', 'present: keep keeps its reading', present.keep);
say(P.environmentBlocked === 0, 'present: no unit environment-blocked', String(P.environmentBlocked));

console.log(`census-environment: ${fail ? fail + ' failed' : 'all hold'}`);
process.exit(fail ? 1 : 0);
