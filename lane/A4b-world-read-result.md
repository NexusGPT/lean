# A4b-world-read: a field read after a transition is a world read

## The claim, probed first
The narrowing lane admitted a one-level write `x.f = v` after a call. It reasoned this was safe but never probed it.
It was a false proof. At the lane base, `check.mjs` proved two units equal: `const y = p.y; f(p); p.y = y` and
`const x = p.x; f(p); p.x = x` (p a `{ x, y }` record, f a function parameter). The result was `PASS-proved` with
`Equal_restore` verified. JavaScript tells them apart when f writes `q.x`.

The cause: the output p is rebuilt from p's value before the call, so every field the write leaves alone is stale. The
same happens to an output written before a call (`p.x = 1; f(p)`). This false proof is the `restore` unit of the new pair.

## What the lane did, and why
**The reading (lane A).** `common.mjs readAfterCall` keeps its one decision: which calls run outside code, what they are
handed, and which objects that reaches. Two forms of an occurrence after such a call are now recorded in `h.after`
instead of refused: a field read `x.f`, and a one-level write `x.f = v`. The translator then reads the object as the
world holds it at that point of the run:
- a read becomes `var nwK_ := ext_now_<T>(wld, x);` and then `nwK_.f`;
- a write becomes `x := ext_now_<T>(wld, x).(f := v)`;
- an output parameter that a call may reach leaves as `ext_now_<T>(wld, x)`.

A read moved across a call now names another world, so the proof fails with no textual guard. A unit that keeps its read
after the call is proved. Where the reading names no identity for the object (a new object, a name written more than
once, a choice between kinds), the form stays refused, and the message says why. `design/alias-result.md` (2026-10-30,
"world read") states why this is sound and what stays refused.

**The lint.** The lint passes no `h.after`, so it keeps the world forms and never refuses what the translator reads. Its
`opaque-mutation` test by receiver text (`e.m()` then a later `e.x`) is withdrawn: the shared decision covers it. A
destructuring `const { a } = x` was kept as an alias, which is a hole, because it reads the fields. It is now refused
like any other read.

**Lane B.** Lane B needed two inputs it could not make:
- An any argument that is the same object as a record argument. `exec/korat.mjs` makes an any or unknown argument range
  over its own draw and every pool object. A pool object is passed as a view.
- A fake that writes what it is handed. `exec/fake.mjs` `writeHanded` does this.

## Every element added, and why
- `common.mjs readAfterCall`:
  - `worldForm(occ)`: which occurrences the world read keeps.
  - `h.after`: where those occurrences are recorded.
  - `h.identity`: whether the decider names the object; if not, the form is refused with its own message.
  - `h.outputs` and `h.afterEnd`: the output parameters a call may reach before the end.
  - The one-level write cut is removed from `kept`, since it was the false proof.
  - An alias must be a plain name; a destructuring pattern no longer counts.
- `translate.mjs`:
  - `worldAfter`, `worldEnd` and `worldUsed`: the per-unit state.
  - `worldNow` and `nowOf`: the `ext_now` term. An `Option<T>` maps only `Some` through it, so an absent value stays absent.
  - `renameIn` and `worldBase`.
  - The wrapper at the top of `propAccess` (the read).
  - `nowRoot` in `pathUpdate` (the write, taken after the value is computed).
  - The `wrapRet` outputs.
  - Two guards, both refusing rather than reading the value from before the call:
    - a recorded form that the body translates another way is refused at the unit's end;
    - a read whose object the reading already holds under another name is refused.
- `lint/lint.mjs`: the `opaque-mutation` text scan in the `currentFn` branch is removed. The "used as a value" and "as a
  statement outside a function" branches stay.
- `exec/fake.mjs`:
  - `writeHanded`: on a seeded draw per call and per argument position, a fake's call gives every writable primitive
    field of each plain object it is handed another value of its kind. The receiver of a view's method is always written.
  - `view(path, obj)`: the object's own fields, plus a fake for every member the object lacks. That fake's call writes
    the object.
- `exec/korat.mjs`: a `view` argument slot for an any or unknown argument, including one whose reads refined it. A view
  drops the undeclared extra keys the any value is called for, so the object stays a legal value of its type.
- Pair `world_read_after_call`, new: one unit per transition kind (any method read through another any value; any method
  read through a record it may be; a record's method; a function value; an outside call; restore). Each kind has a
  must-prove row (against `refactor.ts`) and a must-witness row (against `candidate.ts`).
- Pairs `alias_after_call` and `blocker_opaque_receiver`: only the rows the brief names are changed, and the why texts
  extended.
- Design:
  - `design/alias-result.md`: a dated section.
  - `design/top-blockers.md`: class-and-this marked built.
  - `design/admission-contract.md`: the withdrawn site's row removed.
  - `subset.md`: the `opaque-mutation` row.

## Numbers before and after
**Pairs.** Each pair was run with `JOBS=4 node langs/ts/tests/run.mjs --pair <pair>`.
- `world_read_after_call`: 9 of 12 FAILED at the lane base (commit 50eac17f1); ALL PASS, 12 of 12, at the end.
- `alias_after_call`: 7 of 7 after.
  - typedAlias and passed (candidate.ts): PASS-bounded with read-after-call → WITNESS.
  - aliased and otherAny (refactor.ts): PASS-bounded with read-after-call → PASS-proved.
- `blocker_opaque_receiver`: 6 of 6 after. typedAlias and passed: PASS-bounded → WITNESS.

**Regression.** The 27 pairs the narrowing cleared are not listed anywhere I could reach; I asked and got no answer. So I
took a mechanical superset instead:
- I translated (`translate.mjs --core --heap --no-project`) and linted every `.ts` file of every pair with both the base
  tree (2a6c7bb62) and this tree, and diffed the outputs.
  - The translations differ in 8 pairs. Besides my three, those are promise_field (13 of 13), readme_ledger (15 of 15),
    spread_outside (47 of 47), cause_world_reach (5 of 5) and race_pure (5 of 5). All pass.
  - The lint output differs only in pairs from that same list.
  - The `tests/cases/*.ts` files are unchanged in both lint and translation.
- Lane B (`exec/run.mjs --n 30 --no-project`): I ran every `b` row of every pair (1,482 rows) and compared each against
  its expectation. callback_units' three rows came back without a result from my script (their unit names hold `/` and
  `(`). That pair, run through run.mjs, passes 9 of 9. The only other mismatches are copied_argument `hand` and
  `viaHelper` (see the defects below).
- I also ran lane B with both trees on every candidateOnly and check row (134 rows). Only the 8 intended rows changed:
  typedAlias and passed in the two existing pairs, and anyRecord, fnValue, outside and restore in the new pair.
- `node langs/ts/tests/withdrawal.mjs`: 573 site rows, 0 uncatalogued.

**Census.** Each root was run with `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs
/root/da/census/repos/<root> --out <json>`, first with the base tree (before) and then with this tree (after).
read-after-call counts units whose refusal it is; findings in parentheses.

| root | units inside, before → after | read-after-call refused units (findings) | opaque-mutation refused units (findings) | copied-argument refused units |
|---|---|---|---|---|
| blocks | 201 → 230 of 516 | 72 (95) → 35 (52) | 2 (31) → 0 (0) | 22 → 33 |
| driftbench | 1,602 → 1,737 of 5,479 | 662 (800) → 483 (601) | 11 (21) → 2 (2) | 47 → 65 |
| claude-skills | 110 → 115 of 355 | 90 (113) → 82 (98) | 4 (9) → 4 (7) | 6 → 9 |

`census.mjs --diff` shows gains and no losses in every reading on all three roots. Some units that pass read-after-call
now stop at copied-argument, a later refusal. The census JSON files are in `/tmp/a4b/census/`.

## Defects met
- **copied_argument, lane B (a finding, left red, not changed).** `hand` and `viaHelper` go from PASS-bounded to
  WITNESS. A fake g may now write its argument, so `g(p)` and `g({ ...p })` differ on p, as JavaScript says. The pair's
  why text says lane B passed them only because "its fake g neither writes nor keeps its argument". The rows are outside
  this brief's list, so I did not change them. I asked the lead and got no answer. Lane A is unchanged there (not
  proved). The lead decides whether the expectation rises.
- **A precision loss, not a soundness one.** The end-of-unit `ext_now` is added whenever a call may reach an output,
  even when a write after the last call already made it current (restore, promise_field park). Two related
  over-approximations come from the base rule:
  - A same-file call that reaches outside code counts as handing all its arguments out (readme_ledger `post`).
  - A spread argument counts as handing the array itself (spread_outside `snapshotCall`).

  Both sides get the same terms, so pairs that keep their order are still proved.
- **check.mjs compares the reads of an any value by parameter name** (`ASK:identity`, "identity shapes differ:
  ['@g.x'] vs ['@other.x']"). A refactor that renames an any parameter is not proved for that reason, independent of
  this lane. The new pair keeps the any parameter names in `refactor.ts` anyMethod.

## What is left
- These forms stay refused `read-after-call`:
  - after a reaching call: an element read `x[i]`, a copy or spread, a destructuring, a library method on the object
    itself, the object as the unit's result, a deeper write `x.a.b = v`, `x.f += v`, `delete`, `++`;
  - any form on an object with no named identity (a fresh local that is handed, `a ?? []`).

  Reading the object through `ext_now` at those sites would keep more units. The census shows 35, 483 and 82 such units.
- The precision losses above.
- The value stands for the identity of an existing object, as it already does for a handed argument (`identityOf`).
  The heap core reads cells by identity and needs none of this.

## Commits
50eac17f1 (red pair), 91a1384e5 (the reading), 59c02366e (lane B), f80153a5b (design, lint), 0a90f2b34 (name guard),
a1edf77a1 (design notes), and this file.
