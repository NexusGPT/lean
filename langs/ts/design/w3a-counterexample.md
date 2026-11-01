# The solver's counterexample, replayed as a witness (2026-11-01, lane w3a-counterexample)

## What

When the equality lemma of a unit fails, check.mjs asks Dafny once more for a counterexample to that lemma alone
(`dafny verify --extract-counterexample --filter-symbol Equal_<unit>`, under the same resource limit as every other
`dafny verify`, exec/dafny-args.mjs), reads the model into values of the unit's parameter types, and runs that one input
on both sides in lane B. The step (solve/counterexample.mjs `counterexample`, check.mjs `counterexampleStep`) ends in
one of three records on `certificate.lanes.A.counterexample`:

| status | when | the unit's verdict |
| --- | --- | --- |
| `witness` | the replay in lane B differs | `WITNESS`, `witness.source: counterexample`, `witness.value` (the input by value), `witness.args` (its rendering), both observations, `witness.replayed: true` |
| `unconfirmed` | the model gave an input and the replay does not separate the sides, or the input is not bridged, or the replay did not run | unchanged (PASS-bounded or ASK), with `unconfirmed: {input, reason}` beside it |
| `none` | the solver printed no model for the lemma's lines; the extraction passed its wall cap; every failed condition of the lemma ran out of the resource limit (the step is then not asked) | unchanged, the reason kept |

The step runs only when lane A's own lemma failed on a condition of its own span, lane B is not already a WITNESS (that
returns before translation), no adapter is declared (under an adapter the claim is not the same-input comparison the
replay makes) and the identity guard did not withhold the lemma.

## Why

A failed lemma used to end lane A at ASK:unproved (or ASK:doubles-unknown) and the unit at lane B's PASS-bounded. The
solver had already searched the whole input space for a separating input and found one; the verdict threw it away.
Lane B's 30 typed draws find a difference behind a literal the text holds (exec/gen.mjs harvests literals: measured,
`x === 7919` on a `number` is already a lane B WITNESS) and the doubles reading finds one in a number-bearing unit
(solve/fp.mjs, its own model replayed in Node). What neither reaches is a difference behind a value the text does not
spell out in a type the doubles reading does not read: a bigint (`id === 7919n`), a string built from parts
(`PREFIX + 'debug'`), a record field (`o.id === VIP + '-0001'`). The equality lemma's model holds it.

## The model format

Dafny prints a counterexample per failed condition as Dafny text: the error line, `Related counterexample:`, then the
state at the lemma's entry (`initial state:`) and after each statement, each state one `assume` of a conjunction
(`assume HWorld.HWorld(map[], 2437, false) == hw_ && 7919 == id;`). The reader takes the initial state of the first
error inside the lemma's own lines (`initialState`), splits the conjunction at top level (`splitDafny`, minding
brackets, quotes and `|t|`), and keeps two kinds of fact (`factsOf`): `term == value` either way round, and the
constructor tests `term.Ctor?`. A value is an integer, a real (decimal or a quotient), a boolean, a character with
Dafny's escapes (`'\U{0005}'`), a string, a sequence, set or map display, or a datatype constructor; anything else is a
term, followed to its value through the equalities.

Two measured defects of the printed model and what the reader does about each:

1. A sequence is often held by its length alone (`11 == |path|`): the solver had no reason to name the elements. The
   reader then runs a second extraction (`probeTheorem`): the same lemma with the first state assumed
   (`assume {:axiom} <conjunction>;`) and one ghost read per element (`ghost var cex_j_i := term[i];`), so the second
   model is a model of the first state in which every element is a term. At most 64 elements per sequence
   (`CEX_ELEMENTS`), at most these two extractions per unit.
2. In the second model the initial state's own `term[i]` facts are not kept consistent with the reads: measured on
   three record pairs, element 0 of a heap field's string came back as a control character (`'\b' == ...id_f[0]`)
   while the ghost read of the same element, in the state after it, held the right one (`'v' == cex_0_0`). The reader
   takes every element from the state after the last ghost read (`stateAfter`), where the model has evaluated each
   read, and never from the initial state's rendering. This is the reading of the model's value of the term, not a
   repair of a particular input: every element of every probed sequence is read the same way.

## The bridge

The values are read by the lemma's parameter types (`lemmaParams`, `modelReader`): the type synonyms, datatypes and
opaque types the theorem declares are read as conformance/dafny-text.mjs reads them (`declarations`, `parseType`), a
part the model leaves free takes its type's first value (0, false, 'a', the empty sequence, the first constructor).
Into JavaScript (`jsOf`) they go as conformance/bridge.mjs maps JavaScript into the model, inverted: an integer of a
`number` parameter is a number, of a `BigInt` one a bigint; a `string` a string; `Option`, `Nullish`, `Absent` and
`Pres` the absences the TypeScript type names (as conformance/pair.mjs `absenceIn`); a record datatype its fields under
their TypeScript keys. A heap reference (a `Ref` parameter) is rebuilt from the model's cell `hw_.heap[r]` by the
`// SHAPES` legend (conformance/heap.mjs `legendOf`, the same reading as heap.mjs's rebuild: a record's fields in the
legend's order, an array its elements, a dictionary its keys and values), the shape named by the `// HYP` line's
`IsK(hw_, p)`, sharing and cycles kept. A receiver, a fuel or slots parameter, an opaque type, or a type with no
JavaScript reading is not bridged: the step records `unconfirmed` with the input null and the part named.

## The replay, by value

The model's input is encoded once (`encodeValue`: JSON, with undefined, bigints, numbers JSON loses, Maps, Sets and
Dates tagged, an object seen twice written once with an id), and that value is what the certificate carries
(`witness.value`) and what the replay reads (`replayInput`): for each side a fresh sandbox, the module loaded, the unit
picked, the load's trace cleared, then `decodeValue(value)` (a fresh copy per side, so a call that writes its arguments
writes its own) entered into the world as lane B enters a drawn input (exec/fake.mjs `enterWorld`), and observed by
exec/run.mjs `observe`. The judgement is lane B's: equal observations agree; a difference only in an undriven
callback (`undecidedDrives`), only in requests to a module that did not load (run.mjs `unloadableOnly`) or only in
function text (`restsOnFunctionText`) is no difference; any other difference is a WITNESS with run.mjs
`firstDifference`'s location. Never a seed and an index: a reader replays the WITNESS from the certificate alone
(`replayWitness`), and the suite does exactly that for every counterexample WITNESS it accepts.

## Why a replayed divergence is the only WITNESS (the argument)

The model is a model of the theorem lean wrote, not of the program: Dafny's own counterexample is documented as possibly
inconsistent, the prelude's axioms leave some operations free (measured: `a + b === 'feature-x'` gets strings the
concatenation axioms do not tie to the result, and `s + 'x' === 'admx'` likewise), and the lemma reads JavaScript
through modelling choices (subset.md, the axioms). So the model alone proves nothing about the two programs. The
replay does: it runs the two real modules, in the sandbox and with the fakes lane B uses for every draw, on one concrete
input, and compares the observations by lane B's own comparison. A WITNESS from the step is therefore exactly as sound
as a lane B WITNESS on a drawn input: an input exists, it is recorded by value, and both sides observed differently on
it. Where the input came from (a draw, the doubles model, this model) does not enter the argument, which is why the
step changes no verdict word. Conversely a model that does not replay is never promoted: it stays beside the verdict
the unit already had, as `unconfirmed: {input, reason}`, for a reader to see what the solver proposed and why it did
not count. A lemma that ran out of its resource limit has no model at all; the step is not asked and lane A keeps
ASK:resource-limit with its reason.

The suite holds both directions: each counterexample pair's row replays the certificate's value in the test process
and refuses unless the replay differs and observes what the certificate records. `LEAN_BREAK=cex-replay` (the step
takes the model's input as the WITNESS without running it) and `LEAN_BREAK=cex-replay-by-index` (the replay draws lane
B's seeded input at the replay's index instead of decoding the value) are each run on the pairs and the same
acceptance must refuse: a WITNESS that was not replayed (no observation recorded), or one whose input is not the
model's, does not pass.

## The pairs

| pair | unit | the difference | before (lead-vm 4747022f) | after |
| --- | --- | --- | --- | --- |
| cex_branch_literal | classify | `id === 7919n` on a bigint | see the result file | WITNESS, value `[7919n]` |
| cex_string_literal | route | `path === PREFIX + 'debug'` | see the result file | WITNESS, value `['admin/debug']` |
| cex_record_field | lane | `!o.express && o.id === VIP + '-0001'` | see the result file | WITNESS, value `[{express: false, id: 'vip-0001'}]` |
| cex_no_witness | flag | `a + b === 'feature-x'` | see the result file | PASS-bounded, `unconfirmed` (the model's strings agree when replayed) |
| cex_no_witness | cube | none (equal); the lemma runs out of resources | see the result file | PASS-bounded, lane A ASK:resource-limit, step `none`, not asked |

## The measurement

The population is read from the pairs' expect.json alone (solve/cex-measure.mjs `--population`: every unit lane B
passes bounded whose equality lemma is listed not proved), so the same 83 units in 48 pairs are measured before and
after. The numbers, the commands and the time per unit are in lane/w3a-counterexample-result.md.

## Limits

- One unit's lemma, one or two extractions; the step does not iterate over models (a second model after a non-replaying
  one would need the first input excluded, which is the search of w3c, not this step).
- A receiver (`self`, `this_`), a fuel or slots parameter, and an opaque type are not bridged: such a unit's model
  stays `unconfirmed` with the part named.
- A sequence longer than 64 elements is not probed; its elements stay free (the type's first value) and the replay
  decides.
- The step does not run under a declared adapter.
