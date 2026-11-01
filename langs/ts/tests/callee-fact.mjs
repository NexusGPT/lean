#!/usr/bin/env node
// The per-callee fact "writes none of its arguments" (callee-facts.mjs, exec/callee-trace.mjs, design/w8e-callee-facts.md):
// checked on lane B's record of the unit's runs, never assumed. The pair pairs/callee_fact:
//   tags        the parent reads rec.tags.length before `isPlainObject(rec)` (shape.ts, a guard that writes nothing), the
//               candidate after it; both push to rec.tags after the call, which the reading refuses without the fact
//               (read-after-call). Lane B records every call of the guard writing nothing: the fact holds, the unit is
//               PASS-proved, and the certificate's lanes.A.assumptions names the fact with lane B's count.
//   tagsWriter  the same move across `isTagged(rec)` (writer.ts, which clears the tags): WITNESS.
//   sameWriter  no move, across isTagged: lane B records it writing, the fact does not hold, lane A stays refused
//               (read-after-call), the verdict is lane B's PASS-bounded and no assumption names isTagged.
// The mechanisms broken (LEAN_BREAK=callee-fact: the fact read as confirmed whatever lane B recorded;
// LEAN_BREAK=callee-fact-trace: lane B's record sees no write) turn sameWriter into a proof under a premise lane B saw
// broken: this check fails. Exit 1 on any failed check.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../check.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const pair = path.join(here, 'pairs/callee_fact');
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw !== undefined ? ': ' + saw : ''}`); if (!ok) fail++; };
const run = (unit) => check({ parent: path.join(pair, 'parent.ts'), candidate: path.join(pair, 'candidate.ts'), unit, n: 40, dafnySeconds: 60 });
const facts = (r, side) => r.certificate?.lanes?.B?.calleeFacts?.[side]?.confirmed ?? {};

const t = await run('tags'), ta = t.certificate?.lanes?.A ?? {};
say(t.verdict === 'PASS-proved' && ta.verdict === 'PASS-proved', 'tags is PASS-proved', `${t.verdict} (lane A ${ta.verdict})`);
say((ta.assumptions ?? []).some((s) => /^callee shape\.ts isPlainObject writes none of its arguments .*\(lane B: \d+ recorded call\(s\)/.test(s)), 'tags names the fact and lane B\'s record in lanes.A.assumptions', JSON.stringify(ta.assumptions ?? null));
say(!!facts(t, 'parent')['shape.ts isPlainObject'] && !!facts(t, 'candidate')['shape.ts isPlainObject'], 'lane B confirms isPlainObject on both sides', JSON.stringify(t.certificate?.lanes?.B?.calleeFacts ?? null));
say(!facts(t, 'parent')['writer.ts isTagged'] && !facts(t, 'candidate')['writer.ts isTagged'], 'lane B confirms no fact for isTagged (it writes)');

const w = await run('tagsWriter');
say(w.verdict === 'WITNESS', 'tagsWriter (the same move across a guard that writes) is WITNESS', w.verdict);

const s = await run('sameWriter'), sa = s.certificate?.lanes?.A ?? {};
const recorded = Object.values(s.certificate?.lanes?.B?.bound?.calleeFacts?.parent ?? {}).some((r) => r.wrote > 0);
say(recorded, 'lane B records isTagged writing what it is handed');
say(s.verdict !== 'PASS-proved' && !(sa.assumptions ?? []).some((x) => /isTagged/.test(x)), 'sameWriter is not proved under a fact lane B saw broken', `${s.verdict}; assumptions ${JSON.stringify(sa.assumptions ?? null)}`);
say(/read-after-call/.test(String(sa.detail ?? s.reason ?? '')), 'sameWriter\'s lane A stays refused read-after-call', String(sa.detail ?? '').split('\n').find((x) => /read-after-call/.test(x))?.trim().slice(0, 160));

if (fail) { console.log(`callee-fact: ${fail} failed`); process.exit(1); }
console.log(`callee-fact: all hold (tags PASS-proved under ${ta.assumptions.length} assumption(s), tagsWriter WITNESS, sameWriter ${s.verdict} with lane A refused)`);
