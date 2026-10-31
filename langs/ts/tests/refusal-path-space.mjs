#!/usr/bin/env node
// A translator refusal names its rule whatever the file's path holds. The translator prefixes its message with the
// file and line (`<file>:<line>: <rule>: ...`, or `outside the subset:\n  <file>:<line>:<col> <rule> <msg>` for the gate);
// a path with a space (`page 2.tsx`, a copy a file manager made) left the prefix unstripped, so the rule was not read and
// the census counted the unit under `uncatalogued` (design/census-reach-2026-10-31.md). Run: node langs/ts/tests/refusal-path-space.mjs
import { translatorText, readingOfRefusal, readingOfFinding } from '../readings.mjs';
import { gateFinding } from '../lower.mjs';
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw !== undefined ? ': ' + JSON.stringify(saw) : ''}`); if (!ok) fail++; };
const body = 'copied-argument: a new object holding objects is handed to a call that may write or keep it';
const want = readingOfRefusal(`app/page.tsx:51: ${body}`);
say(want === 'mutation', 'a plain path: the rule is read', want);
for (const p of ['app/(site)/customer-support/page 2.tsx', 'C:\\Users\\a b\\x.ts', 'a b/c d.mts']) {
  const msg = `${p}:51: ${body}`;
  say(translatorText(msg) === body, `prefix stripped for ${p}`, translatorText(msg));
  say(readingOfRefusal(msg) === want, `rule read for ${p}`, readingOfRefusal(msg));
  const g = gateFinding(`outside the subset:\n  ${p}:12:3 var \`var\` is outside the subset; use let or const`);
  say(!!g && g.line === 12 && g.rule === 'var', `gate finding read for ${p}`, g);
}
say(translatorText(`${body} at x.ts:3: y`) === `${body} at x.ts:3: y`, 'a message without a leading path is kept whole');
say(gateFinding('outside the subset:\n  x.ts:4:1 var msg')?.rule === 'var' && readingOfFinding('var', 'msg') !== undefined, 'a plain gate line still reads');
console.log(fail ? `refusal-path-space: ${fail} failed` : 'refusal-path-space: a path with a space keeps its refusal rule');
process.exit(fail ? 1 : 0);
