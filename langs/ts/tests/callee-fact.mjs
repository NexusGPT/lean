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
//   kept / keptWriter / sameKeptWriter  remember (keep.ts) keeps rec, a later call follows: isSmall writes nothing
//               (PASS-proved under both facts), touchKept clears what remember kept (WITNESS; no move: not proved).
//   keptWrite   hold (keep.ts) keeps b and writes none of it: a fact. A write b.n = w after it is a write the world sees
//               (common.mjs heldBy, design/world-write.md): heldN, a later call, reads what hold kept. The candidate
//               writes another value: WITNESS, and lane A alone (read with the facts lane B confirmed) does not prove it.
// The mechanisms broken (LEAN_BREAK=callee-fact: the fact read as confirmed whatever lane B recorded;
// LEAN_BREAK=callee-fact-trace: lane B's record sees no write; LEAN_BREAK=callee-fact-prior: lane B reads only the
// call's own arguments) turn sameWriter or sameKeptWriter into a proof under a premise lane B saw broken: this check
// fails; LEAN_BREAK=callee-fact-held (a value a fact call was handed is taken for one the world does not hold) proves
// keptWrite on lane A. Exit 1 on any failed check.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { check, dafnyName } from '../check.mjs';
import { dafnyVerifyArgs } from '../exec/dafny-args.mjs';
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

const k = await run('kept'), ka = k.certificate?.lanes?.A ?? {};
say(k.verdict === 'PASS-proved' && ['keep.ts remember', 'keep.ts isSmall'].every((key) => (ka.assumptions ?? []).some((x) => x.startsWith(`callee ${key} writes none`))), 'kept (a later fact call after a call that kept rec) is PASS-proved under both facts', `${k.verdict}; ${JSON.stringify(ka.assumptions ?? null)}`);
const kw = await run('keptWriter');
say(kw.verdict === 'WITNESS', 'keptWriter (the same move across touchKept, which writes what remember kept) is WITNESS', kw.verdict);
const sk = await run('sameKeptWriter'), ska = sk.certificate?.lanes?.A ?? {};
say(sk.verdict !== 'PASS-proved' && !(ska.assumptions ?? []).some((x) => /touchKept/.test(x)), 'sameKeptWriter is not proved under touchKept\'s fact (it writes what the run handed remember)', `${sk.verdict}; assumptions ${JSON.stringify(ska.assumptions ?? null)}`);

// lane A alone on a unit lane B witnesses (check.mjs stops at the witness): the translation of each side with the facts
// lane B confirmed on it (the certificate's lanes.B.calleeFacts, the record, never assumed), the theorem, Dafny
const laneAOnly = (unit, cert) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-callee-fact-'));
  const sh = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }); return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? String(r.error) : ''}` }; };
  for (const side of ['parent', 'candidate']) {
    fs.writeFileSync(path.join(dir, `${side}.facts.json`), JSON.stringify({ keys: cert?.lanes?.B?.calleeFacts?.[side]?.confirmed ?? {} }));
    const t = sh('node', [path.join(here, '../translate/translate.mjs'), path.join(pair, `${side}.ts`), '--core', '--only', unit, '--suffix', side, '--callee-facts', path.join(dir, `${side}.facts.json`), '--out', path.join(dir, `${side}.dfy`), '--prelude', path.join(dir, `${side}.pre.dfy`), '--heap']);
    if (t.status !== 0) return { proved: false, why: `translate ${side}: ${t.out.trim().slice(-200)}` };
  }
  fs.writeFileSync(path.join(dir, 'scope.json'), JSON.stringify({ functions: { [dafnyName(unit)]: { in_scope: 'false' } }, summaries: true })); fs.writeFileSync(path.join(dir, 'edit.json'), '{}');
  const th = sh('python3', ['-I', path.join(here, '../../../spec/theorem.py'), '--parent', path.join(dir, 'parent.dfy'), '--candidate', path.join(dir, 'candidate.dfy'), '--scope', path.join(dir, 'scope.json'), '--edit', path.join(dir, 'edit.json'), '--out', path.join(dir, 'theorem.dfy')]);
  if (th.status !== 0) return { proved: false, why: `theorem: ${th.out.trim().slice(-200)}` };
  const v = sh('dafny', ['verify', ...dafnyVerifyArgs({ seconds: 60 }), path.join(dir, 'theorem.dfy')]);
  const lines = fs.readFileSync(path.join(dir, 'theorem.dfy'), 'utf8').split('\n'), main = `Equal_${dafnyName(unit)}`;
  const a = lines.findIndex((ln) => ln.startsWith(`lemma ${main}(`) || new RegExp(`^lemma (\\{[^}]*\\}\\s+)*${main}\\(`).test(ln)) + 1, b = lines.findIndex((ln, i) => i >= a && ln.startsWith(`} // END ${main}`)) + 1;
  const errs = [...v.out.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1]));
  const finished = /finished with \d+ verified/.test(v.out);
  return { assumed: fs.readFileSync(path.join(dir, 'parent.dfy'), 'utf8').split('\n').filter((ln) => /^\/\/ ASSUME .*keep\.ts hold/.test(ln)).length, ran: finished && a > 0 && b >= a, proved: finished && a > 0 && b >= a && !errs.some((L) => a <= L && L <= b), why: finished ? `${errs.length} error line(s), lemma ${a ? "present" : "absent"} in ${dir}` : v.out.trim().slice(-200) };
};
const kw2 = await run('keptWrite');
say(kw2.verdict === 'WITNESS', 'keptWrite (another value written through what hold kept, heldN reads it) is WITNESS', kw2.verdict);
say(!!facts(kw2, 'parent')['keep.ts hold'] && !!facts(kw2, 'candidate')['keep.ts hold'], 'lane B confirms hold (it keeps b, writes none of it)', JSON.stringify(kw2.certificate?.lanes?.B?.calleeFacts ?? null));
const kwa = laneAOnly('keptWrite', kw2.certificate);
say(!!kwa.ran && kwa.assumed > 0 && !kwa.proved, 'keptWrite is not proved by lane A under the facts lane B confirmed (the write is told to the world)', `${kwa.proved ? 'PROVED' : 'not proved'} (${kwa.why})`);

if (fail) { console.log(`callee-fact: ${fail} failed`); process.exit(1); }
console.log(`callee-fact: all hold (tags PASS-proved under ${ta.assumptions.length} assumption(s), tagsWriter WITNESS, sameWriter ${s.verdict} with lane A refused; kept PASS-proved under ${ka.assumptions.length}, keptWriter WITNESS, sameKeptWriter ${sk.verdict}; keptWrite WITNESS, lane A not proved)`);
