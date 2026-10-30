#!/usr/bin/env node
// census.mjs carries the finding's message in each refusal example (refusalRules[].directories[].example.message): the
// rule alone does not say which form stopped a unit (a `types` refusal names its type only in the message,
// design/types-inventory.md). The fixture fixtures/census-message holds a unit refused by the type reading and one
// refused by a lint rule. Run: node langs/ts/tests/census_example_message.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const census = path.join(here, '..', 'census.mjs');
// The census skips paths under tests or fixtures. Copy the tree outside those folders.
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-census-message-'));
fs.cpSync(path.join(here, 'fixtures', 'census-message'), repo, { recursive: true });
const json = `${repo}.json`;
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw ? ': ' + saw : ''}`); if (!ok) fail++; };
try {
  const r = spawnSync(process.execPath, [census, repo, '--out', json], { encoding: 'utf8' });
  say(r.status === 0, 'census exits 0', r.status === 0 ? '' : `exit ${r.status} ${(r.stderr ?? '').slice(-300)}`);
  const res = JSON.parse(fs.readFileSync(json, 'utf8'));
  const want = { types: 'union type string | symbol is not translatable', var: '`var` is outside the subset; use let or const' };
  for (const [rule, message] of Object.entries(want)) {
    const g = res.refusalRules.find((x) => x.rule === rule);
    const e = g?.directories[0]?.example;
    say(e?.message === message, `${rule}: the example carries the finding's message`, JSON.stringify(e?.message ?? null));
    // the message is the one the record holds for the finding at the example's line
    const rec = res.records.find((x) => x.file === e?.file);
    const f = rec?.findings.find((x) => x.rule === rule && x.line === e?.line);
    say(!!f && f.msg === e?.message, `${rule}: the example's message is its record's finding`, f ? JSON.stringify(f.msg) : 'no finding');
  }
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
  for (const p of [json, `${json}.records.jsonl`]) fs.rmSync(p, { force: true });
}
console.log(`census-example-message: ${fail ? fail + ' failed' : 'all hold'}`);
process.exit(fail ? 1 : 0);
