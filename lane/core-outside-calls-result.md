# core-outside-calls: result

Branch `lane/core-outside-calls`, from lean `lead-b5c07450` (b5c074508). Specification: `langs/ts/design/heap-stage5.md`
section 15 (Outside calls).

## What was found

Section 15 was already read in `translate/heap.mjs` (`outsideCall`, the `Call_`/`HCall_` transitions keyed by import,
Dafny types and the reachable code). A pair written from the section's examples (an outside call's result used once,
used twice, passed on) was green at the base without a change. Writing the order the section states ("the arguments
are evaluated in order, then the transition ...; what follows reads the world it returned") into units found two
defects in the emission, both false proofs:

1. **A read before a transition was emitted after it.** A world read is code over `hw_` written where its value is
   used; the transition's line is pushed before that use. `total(i.qty, bump(i))` and `i.qty - bump(i)` read the
   quantity in the world `bump` returned. Parent `total(i.qty, bump(i))`, candidate
   `const b = bump(i); return total(i.qty, b);`: proved at the base, lane B WITNESS.
2. **The right operand of `&&`/`||` ran unconditionally.** Its lines (the transition) were pushed with the left
   operand's. Parent `c && bump(i) > 0`, candidate `const b = bump(i) > 0; return c && b;`: proved at the base,
   lane B WITNESS.

Defect 1 is the expression's, not the call's: the same order held wrongly for a same-file unit that writes its
argument (`i.qty - bump(i)` with `bump` in the file; the lint does not refuse it). The fix is at that mechanism and
covers both. The `&&` case of a same-file writer is already refused by the lint (`conditional-effect`).

## Every element added and why

- `translate/heap.mjs`, emission (`emit`):
  - `writesCells(n)`: whether a node may write an existing cell when evaluated: an outside call or method transition
    (`outsideCall`), a same-file unit (`calleeOf`), a constructor unit (`newClass` + `ctorUnitOf`), `Object.assign`,
    `reverse`, `splice`. Memoized per node.
  - `heldBefore(e)`: whether an operand after `e` in source order, inside the same enclosing statement, may write a
    cell (walks the parents up to the statement or function boundary).
  - `expr` is now a wrapper over the former body (`exprAt`): code that reads the world (`hw_`) and is `heldBefore` is
    bound to a fresh local where it stands, so it reads the world before the later operand's lines. Code that does
    not read the world, and every expression with no later writer, is emitted exactly as before.
  - The `&&`/`||` case: a right operand that emits lines runs in its branch,
    `var (hw_, q) := if l then (lines; (hw_, r)) else (hw_, false)` (`||`: `if l then (hw_, true) else (...)`), as
    the conditional expression's operands already did. A right operand with no lines is emitted as before.
- `tests/pairs/outside_calls/` (new; `store.ts` a sibling module whose `bump` writes its argument).
- `design/heap-stage5.md` 15b: the reading, what stays refused or unproved and why.
- `design/coverage-readings.json` and `design/coverage-matrix.md`: the CallExpression and BinaryExpression rows.

What stays as it was, and why:
- `written_back` (write the call's result into a field of the argument, return the field): unproved. The transition
  leaves no frame; the argument's cell after it is unknown in the model, as it is in JavaScript (a callee may install
  an accessor whose setter keeps nothing). Proving it would be a frame assumption the section refuses.
- The doubles reading does not encode an outside call; a number-bearing unit with one rests on its faithful
  congruence and real lemma, as before (not this construct's reading; reported, not changed).
- What enters the core is untouched (`checkExpr` and the reach census's mirror): only the translation changed.

## The pair: `outside_calls`

Units (parent / candidate), lane A expected, lane B expected:

| unit | change | lane A | lane B |
| --- | --- | --- | --- |
| usedOnce | result named before one use | proved | PASS-bounded |
| usedTwice | two fields of a returned reference, named or inline | proved | PASS-bounded |
| writtenBack | return the field written instead of the result | unproved | PASS-bounded |
| calledTwice | one call for two | unproved | PASS-bounded |
| passedOn | result passed on to another transition, named or inline | proved | PASS-bounded |
| passedLocal | result passed on to a function of this file | proved | PASS-bounded |
| passedSwapped | result passed in the other argument of a non-symmetric transition | unproved | WITNESS |
| passedRef | a returned reference's field read before the save instead of after | unproved | WITNESS |
| readFirst | an argument read before the call in the parent, after it in the candidate | unproved | WITNESS |
| readFirstNamed | the argument named before the call, the same order | proved | PASS-bounded |
| guarded | the call moved out of the `&&` | unproved | WITNESS |
| guardedIf | an early return instead of `&&`, the same transitions | proved | PASS-bounded |

Red at the base (`d6e7fba42` against base `heap.mjs`), `JOBS=1 node langs/ts/tests/run.mjs --pair outside_calls`:
26 checks, 4 FAILED: `Equal_read_first not proved` (got proved), `Equal_read_first_named proved` (got not proved),
`Equal_guarded not proved` (got proved), `Equal_guarded_if proved` (got not proved). Lane B rows passed (WITNESS on
read_first and guarded): two false proofs.

Green with the reading (`744d00554`): 26 checks, ALL PASS.

Three expectations of my first draft of the pair were wrong and corrected before the red run, not lowered after it:
scope names are the Dafny (snake_case) names; lane B runs the real sibling module, so a planted difference must be
observable there (`total` made non-symmetric, `passedRef` WITNESS since the real `save` writes); `writtenBack` (first
named `usedTwice`) cannot be proved soundly (above), so `usedTwice` became two reads of a returned reference.

## Regression

Each with `JOBS=1 node langs/ts/tests/run.mjs --pair <p>` from `744d00554` (the design commit after it changes no
code), one at a time; every one ALL PASS. The pairs sharing a word with the construct, the three the brief names, and
every `heap*` pair (the fix is in the heap core's shared expression emission). Checks per pair:

heap5_outside 9, override_outside 13, spread_outside 47, optional_calls 5, optional-call 15, heap_strings_calls 9,
conformance_call 8, alias_after_call 7, world_read_after_call 12, witness_args 13, callee_witness 14, two_callers 14,
heap_canonical 13, type_tests 59, copied_argument 10, heap_3 23, heap_3_refused 1, heap5_absences 7, heap5_arith 13,
heap5_arrays 13, heap5_cells 11, heap5_conditional 9, heap5_ctors 14, heap5_decorators 9, heap5_globals 13,
heap5_handles 12, heap5_literals 11, heap5_module 9, heap5_reach 7, heap5_regex 9, heap5_rest 7, heap5_step0 7,
heap5_strings 11, heap5_template 11, heap5_tuples 11, heap5_unions 9, heap5_void 9, heap_dicts 11,
heap_enumerated 9, heap_graph 9, heap_index 13, heap_loops 9, heap_methods 10, heap_nullable 5, heap_optional 11,
heap_shapes 36, heap_unions 9; outside_calls 26. 47 pairs, 596 checks besides outside_calls.

## Census, before and after

Before: a plain copy of `lead-b5c07450` (`git archive b5c074508`, under `work/base`); after: this branch at
`744d00554`. One root at a time, never beside a pair run, each with `NODE_OPTIONS=--max-old-space-size=12288`:

- `node langs/ts/census.mjs /root/da/census/repos/<root> --out <side>/<root>.json`, compared with
  `node langs/ts/census.mjs --diff before/<root>.json after/<root>.json` and per stop reason (`refusalRules`).
- `node langs/ts/design/heap-reach-census.mjs <cfg>/concepts-all.json <side>/reach --resolve --repos <root> --tag <root>`
  (the heap core's own reach: every unit's core admission, own-syntax fit and reason set; `<cfg>` names the census
  copy as the root), compared unit by unit (file, line, name -> core, own fit, first reason, reason set).

Expected: no unit moves. The reading changes what an admitted unit is translated to, not what enters the core
(`checkExpr` and the census mirror are untouched). Measured:

| root | census units | entered before / after | stop reasons changed | reach core before / after | own fit before / after | reach units changed |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| n8n | 9,610 | 2,680 / 2,680 | none (78 reasons) | 82 / 82 | 375 / 375 | 0 |
| langchainjs | 6,709 | 2,766 / 2,766 | none (78 reasons) | 30 / 30 | 115 / 115 | 0 |
| nexus (partial) | 4,277 on both sides | records identical | none on the overlap | 86 / 86 | 169 / 169 | 0 of 3,806 |

n8n and langchainjs are complete on both sides; their census records were also compared file by file (every file's
lowering and findings): 7,812 and 2,972 files, none differs. nexus did not finish on either side (below): the census
row is the 2,400 files (4,277 units) both journals hold, compared record by record, none differs; the reach row is the
3,806 units both reach runs read, unit by unit, none changed. Comparison scripts: `work/compare.py <root>` (census
totals, `refusalRules`, reach units) and `work/records.py <root>` (journal records), outside the repository.

Units this construct stopped, moved to entered or to another stop: none on any root read, as expected (the reading is
in the emission; admission is untouched). Its measure is the pair: two false proofs at the base, closed.

## Defects met

1. Two false proofs in the heap core (above; fixed in 744d00554).
2. nexus runs end early with exit 0 and no failure line: `census.mjs` on nexus wrote `"complete": false` after 4
   chunks (4,800 files, before side) and 2 chunks (2,400 files, after side); `heap-reach-census.mjs --resolve` stopped
   at 10,080 of 25,466 files with no summary line and exit 0. The census's stop has no message in its log (last line
   a progress line); not this lane's construct, reported, not fixed. The types-inventory census noted a partial
   nexus too.
3. Process: my first nexus "before" heap-reach run was started while I edited heap.mjs, so its side was uncertain; it
   was stopped by its pid and every before side rerun from a plain copy of the base. Early pair runs overlapped that
   first census run (against the brief's rule); the regression and the measured censuses never overlapped. One
   background job (both nexus sides in sequence) reached its 2-hour limit during the nexus after-side reach run; the
   overlap above is what the runs that ended hold.

## What is left

- A complete nexus census, before and after, once the silent early stop (defect 2) is understood.
- The doubles reading does not encode an outside call (number-bearing units with one rest on their real lemma).
- The full suite at the merge (the lead's).

## Commits

d6e7fba42 (pair, red at the base), 744d00554 (the reading), cce51ffdc (design note 15b, coverage rows), f058611b0,
2f9c689ab and the last commit (this file).
