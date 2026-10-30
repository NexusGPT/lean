# A6-faithful-held: the faithful number reading respects held values

## What was wrong
`translate/faithful.mjs` decided which nodes are numbers from the checker's type. A held value has the type `number` to
the checker but may be anything at run time. A held value is an `as` that narrows, or an any or unknown value in a
number slot; `common.mjs assertionHeld` decides it. So `(x as number) + 1` with x: any became `Math.__lean_add(x as number, 1)`.
That operation is commutative (design/doubles.md, 2026-10-29), so lane A proved it equal to `1 + (x as number)`. In
JavaScript, x = "a" gives "a1" against "1a". Lane B witnessed the difference, but lane A's reading was unsound.

## What changed and why
- `translate/faithful.mjs` `typeAt`: a node's type is now `assertionHeld(checker, n) ?? checker.getTypeAtLocation(n)`,
  memoised per node. This is the same decision the translator's `typeOf` makes, so the faithful reading and the
  translation can no longer disagree about what is a number. An opaque held value has the any type: it is not a number,
  so the reading neither rewrites, refuses nor counts it as exact, and the translator reads `+` on it as the
  non-commutative operation on Any. A value held at its own primitive family (`n as 1 | 2`) is still a number and is
  read as before. Every `isNum`, `hasNumT` and `isSeqT` check reads through `typeAt`, so they all follow the one decision.
- New pair `tests/pairs/faithful_held`. heldSum (a template of the held sum) and heldNum (the sum as the result) must not
  be proved, and lane B gives a WITNESS for each. familySum (a number held at its own family) and plainSum are controls
  that must stay proved, with lane B PASS-bounded. The pair has its own file because a row in type_assertions cannot go
  red: other units there make that file's faithful text fail on both sides, so the reading never runs for the row.
- The row the brief names, type_assertions `held_sum` (not proved; lane B `heldSum` WITNESS), was added as well. It is
  green both before and after the fix, for the reason above.
- design/doubles.md, section "A held value is no number to the faithful reading (2026-10-30)".

## Numbers (each from `JOBS=4 node langs/ts/tests/run.mjs --pair <pair>`)
- faithful_held, base reading (faithful.mjs at 2a6c7bb62): 9 checks, 2 FAILED. held_sum and held_num read "faithful
  congruence proved".
- faithful_held, after the fix: 9 checks, ALL PASS.
- After the fix: numbers 9/9 PASS, numbers_bits 39/39 PASS, fake_throw 5/5, proof_hunt_10 9/9, strict_fixer 8/8.
- type_assertions after the fix: 41 checks, 1 FAILED (opt_checked, see below). On the base reading with the new row: 41/41.
- numbers_doubles does not exist in this tree (`ls langs/ts/tests/pairs | grep -i doub` finds nothing), so it was not run.
- Reach: I ran faithfulNumbers with the base and the new faithful.mjs over every pair file (509 files) and compared
  each file's rewritten text, ops and unit placement. Exactly 8 files differ, in the 5 pairs listed above, and all 5
  were run. The script was a throwaway in /tmp, not committed.

## Defects met / left open
- **type_assertions opt_checked, expected "real-only", now FAILs.** Lane A's verdict is unchanged: it is not proved,
  before and after. What changed is the internal signal: the real lemma no longer proves. `translate()`
  (translate.mjs:89) falls back to the exact reading per side when that side's faithful text fails. Before the fix,
  both sides failed (twice's `__lean_add(n, n)` on a held n), so both sides were exact and `n + 0 == n` proved. Now
  only the parent fails, at `dbl`, a same-file callee that is read again at Any for paramHeld's call. The candidate is
  read faithfully, so the lemma compares exact `n` against `__lean_add(n, 0)`. A mixed reading can only lose proofs,
  and the units do differ on -0 in JavaScript (lane B WITNESS). I asked the lead whether to set the row to false and
  got no answer. The standing rule says no expectation changes outside the named rows, so I left the row as it is and
  report it here. Two structural levers, neither done: (1) read a pair at one reading whenever either side falls back
  (in run.mjs and check.mjs); (2) let the faithful reading follow the per-call reading of a callee at Any (heldParams),
  so `dbl`'s text translates.
- The per-side, whole-file fallback also hides findings like this one in any file where some other unit breaks the
  faithful text. That is why the type_assertions row could not be red.
- The worktree has no git identity configured. The commits pass the branch's existing author with `git -c`; no
  config was changed.

## Commits
67655be8c the pair and the row (red on the base), c2b2a3486 the fix, 6e0b1ead6 the design section, then this file.
