# Lane B holds every differing site, not the first three inputs (lane w8n-all-sites, 2026-11-01)

## Why

Lane B ended a WITNESS run at its third differing input (`exec/run.mjs`, `diffs.length >= 3`, in the function loop and
the module unit's loop). Since w7a, a `pr.mjs` row names one witness per site (design/w7a-lean-witnesses.md), but it
could name only the sites those three inputs reached. When a change differs at two statements and most inputs reach
the first, the second is not named. On the DA-Bench slice, the pull request's own change is usually the first
difference lane B meets, and an injected regression elsewhere in the same unit was named only when one of the first
three differing inputs reached it.

## Mechanism 1: sites, not inputs

`exec/sites.mjs`:

- `siteKey(where)`: the site of a witness is `where.field`, the two sides' operations (`where.parent.op`,
  `where.candidate.op`) and the candidate line (`where.lines.candidate.start`, else `.line`). This is w7a's key, moved
  here so lane B and `pr.mjs siteWitnesses` share one definition;
- `keepDifference(diffs, w)`: a difference is kept when its site is new, so the list holds one witness per site, in
  order of discovery. It returns true once `WITNESS_SITES` sites are held.

`exec/run.mjs`, at both loops (the function unit's draws and the module unit's inputs), takes these steps:

- every difference goes through `keepDifference`, and the loop stops when it returns true;
- past the first witness the loop goes on drawing (`extraDraws`). It stops when the `n` inputs are spent, when
  `WITNESS_SITES` (8) sites are held, or when `WITNESS_SHARE` (a quarter) of the unit's seconds has passed since the first
  witness. The time stop exists because the unit's bound (`--unit-seconds`, the worker's CPU watch) kills the worker and
  reports `spin-bound` ASK. Without the stop, draws added after a WITNESS could turn that WITNESS into an ASK;
- past the first witness, a harness stop on an input (the module loop returned ASK there before) or an error escaping an
  input ends the draws. The witnesses already held stand;
- a rendered unit keeps feeding the styles layer after the stop, as it did after the third input (`treeDone`);
- `lanes.B.bound.sites`: `held` (the sites), `differing` (the inputs that differed), `cap`, `stop` (which of the stops
  ended the draws), `key`.

The certificate's `lanes.B.witnesses` lists one witness per site, in order of discovery. Before, it listed up to three
per input, which could include repeats of one site. `witness` (the first) is unchanged. So is the verdict: any WITNESS
before is a WITNESS now, with its first witness at the same input. The rule needs no knowledge of the change: it does not
compare a site with the diff's lines and prefers no site over another.

## Mechanism 2: every field an input differs on

One differing input can differ on several fields (`differenceField` reads, in order, the outcome, the object graph, the
receiver, the trace, the pending work, the drives and the module). `firstDifference` names the first only. When every
differing input also differs on an earlier field, a later field is never named, however many inputs are drawn. On the
slice, a changed request argument at one statement (a trace difference) stayed hidden behind a receiver difference that
every input showed, located at the statement where the call completed (typescript-go 3834~m1).

`exec/run.mjs fieldDifferences(a, b)` locates every differing field as `firstDifference` locates the first
(`firstDifference(a, b, field)`). The first is the input's first difference, as before. A later field is kept when it
names a candidate statement that no field before it named; a field with no candidate line adds no place to look. The
function loop passes each one to `keepDifference`, so a site is the same site whichever field or input found it, and the
cap counts them all. The input's first field is still its first witness, so `witness` is unchanged. The module unit's
loop names one field per input, as before.

`LEAN_BREAK=w8n-fields` names the first field of each input only. `tests/pairs/field_sites` goes red: Counter.save
writes another count (line 7) before it requests another key (line 8). Every input differs on the object graph first,
at the statement where the call completed, and line 7 is not named.

The search (`search.mjs`), the class programs, the races and the environment programs run only when the draws found no
difference. They are unchanged.

A stack-overflow difference has no candidate line when it is kept (its completion lines are added after lane B), so all
of one unit's stack overflows on one side are one site.

## Break switches

- `LEAN_BREAK=w8n-all-sites` restores the earlier rule whole: one field per input, every differing input kept, the draws
  stop at the third, and there is no `bound.sites`. `tests/pairs/three_sites` goes red (two sites, not three), and so
  does `field_sites`;
- `LEAN_BREAK=w8n-fields` removes mechanism 2 only. `tests/pairs/field_sites` goes red.

## Validators

- `tests/pairs/three_sites` (`prOnly`): `band` changes at lines 2, 3 and 4. The first three differing inputs complete at
  lines 3, 4, 3 (two sites). The row's `witnesses` must name three sites.
- `tests/pairs/field_sites` (`prOnly`): the row's `witnesses` name candidate lines 7 and 8 (the harness's `siteLines`
  form). `lane/w8n-all-sites/pairs-break.mjs` runs the three site pairs plain and under each break.
- The slice's witnessed mutant units, the ten-pair time ratio and the regression suite:
  `lane/w8n-all-sites-result.md`.
