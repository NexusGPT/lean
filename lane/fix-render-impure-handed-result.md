# fix-render-impure-handed: the purity check's second render starts from the state the first started from

Commit: `f7d2ad7cc1` on `lane/fix-render-impure-handed` (from v0.1.3, `dbe9a32fbe`).

## Cause

The purity check (`langs/ts/exec/run.mjs` observeWindow) renders a component twice from one state. It relies on one
invariant: the two renders see the same props and the same world answers. It restored the hook slots, the child
frames, the call counters and the demand before the second render. Since 59c02366e a fake's call also writes the
primitive fields of each plain object it is handed (`exec/fake.mjs` writeHanded), and nothing restored those writes.
BoardRow hands each card of `row.cards` to `runtime.cardRuntime(card)`. The first render read `{title: "a"}`, the
second read the world's write `{title: "a~~"}`, so lean's own write was refused as the parent's impure render.

## Fix (at the mechanism, no per-component rule, writeHanded unchanged)

- `exec/fake.mjs`: while a mark is open, writeHanded journals each write as (object, field, before, after). The new
  methods are `handedMark`, `handedTake`, `handedUndo` and `handedRedo`.
- `exec/run.mjs` observeWindow: the first render, settle included, is journaled. Its world writes are undone before the
  second render, whose world, counted from the same call index, writes them again. After the second render, its writes
  are undone and the first render's are replayed, so the observation keeps the first render's state, as before.
- A field is undone only while it still holds the world's value. A write the unit itself makes after the world's
  (to its own props) is never undone, so it still reads as an impure render. Pair unit `Marked` stays REFUSE.
- writeHanded runs as before everywhere else. `alias_after_call` and `blocker_opaque_receiver`, the pooled-view pairs it
  was added for, are ALL PASS.

## Tests

- New pair `tests/pairs/render_handed_card`: `Cards` PASS-bounded, `Row` (an effect dependency dropped) WITNESS,
  `Marked` REFUSE. **ALL PASS (3 checks)**. At the base (exec reverted to v0.1.3): `Row` and `Cards` read REFUSE,
  so **2 FAILED**.
- New runtime row `render-handed` (`tests/render-handed.mjs`, registered in `tests/run.mjs`): the journal's undo and
  replay, plus fixture `tests/fixtures/render-handed-boardrow`. The fixture is the census copy of BoardRow with R8's
  four mutant files from `/root/da/regress/b5c0745/20261031T015353.087036Z/mutations/27-BoardRow`.
  Result: `BoardRow parent PASS-bounded, drop-dep WITNESS, key-index WITNESS, flip-conditional WITNESS, change-text WITNESS`.
  At the base it fails: the journal API is missing there, and BoardRow is REFUSE as the r8-server-gap lane reproduced.
- Regression pairs, `node tests/run.mjs --pair <name>`, two at a time: alias_after_call, blocker_opaque_receiver,
  component, deep_render, definite_assignment, finite_components, fresh_local_handed, fresh_tree_handed,
  render_purity and render_row_fields. **ALL PASS**.
- Also every other pair with a `.tsx` parent (22 more, the same way): **ALL PASS**.
- Runtime scripts that import exec, each exit 0: certificate-timing, children-shapes, clock-read,
  linked-dependencies, no-silent-exit, no-silent-exit-importers, render-handed, same-error and wall-cap.
  Not run: self-pair and the full suite.

## R8

Command: `cd /root/da && JOBS=8 bash harness/regress.sh /root/lanes/fix-render-impure-handed/tree --only R8 --needs harness/regress-needs.server.json`.
It ran at `f7d2ad7`, on this server, and wrote `/root/da/regress/f7d2ad7/20261031T103145.686943Z/R8.log`:

    R8 PASS {"caught": 42, "applicable": 71}

The four BoardRow lines read `drop-dep: WITNESS (trace)`, `key-index: WITNESS (outcome)`,
`flip-conditional: WITNESS (outcome)` and `change-text: WITNESS (outcome)`. All 71 verdict lines match the Mac log
at 2a6c7bb (`harness/tests/fixtures/r8-boardrow/mac-2a6c7bb.R8.log`): the diff is empty. No refusal remains. Nothing
in DA was changed; the run only added its own `regress/f7d2ad7` output.

## Design note

`langs/ts/design/heap-stage5.md`, section 15c, under "Outside calls", where "the transition may write every object"
is read; it is dated 2026-10-31.
