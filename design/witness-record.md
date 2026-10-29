# Witness record

`witness.record` is additive evidence with schema `witness-record/v2`, version 2. Existing witness fields are untouched. The input is serialized before execution using tagged values and graph references; handles have stable paths. Each side carries its own ordered events, import names, clock answers, random answers, timer-fire timeline, and environment seed. The enclosing record carries the input index, run seed, lean commit and invocation kind. The replayer must never invoke lean or regenerate seeded answers.

## Capture boundary

The lead authorized transparent capture wrappers on the environment's public surface, installed at `sandbox` entry. `record.mjs` wraps fake handles and memoizes the wrapper in the environment cache. Calls, construction, reads, writes, membership and key queries preserve the underlying return or thrown object; serialization is separate and suppresses capture. Clock, primitive and random calls preserve their exact answers. Module-load capture starts before the loader and survives the v1 trace clear. Draw-time capture is disabled so the replay consumes only runtime random answers. Serialization uses descriptors rather than invoking accessors.

Owned run.mjs changes: import; `sandbox` entry; `runPair` commit metadata before the restricted worker; `mountSides` capture suppression during drawing and pre-call snapshot; `drawnOf` additive record; `observeSide` capture activation. Argument application is untouched. The parent supplies the commit to the worker because its sandbox cannot start git.

## Honest gaps

A value that cannot be serialized carries `t: unrecorded` and a reason, never an invented answer. Exact sites: `fake.mjs` fake.get returns real functions for `catch`, `finally` and iterationMethod (including `map`, `reduce`); fake.apply invokes real callback arguments without exposing invocation records; these functions/callback arguments are unrecorded. Anonymous promise settlements, symbols, accessors and class-instance prototypes are unrecorded. `fake.get` special identity properties and non-thenability are the handle protocol, not recorded calls. Primitive coercion uses recorded primitive answers; iterator yields use recorded answer-boundary entries. Native functions and source hashes are never executable record content.

A program/race/React sequence without captured invocation data must be marked unrecorded rather than silently treated as a single call. A missing, mismatched or exhausted event is `not-replayable: unrecorded call`. Both sides must consume their records; a record does not license a new request. Replay comparisons use the independent runner's existing observation model.

## Tests

`node --test langs/ts/exec/record.test.mjs` failed first with ERR_MODULE_NOT_FOUND, then the emission test failed with missing witness.record. It exercises repeated return/throw, the clock, rng, v1 trace equality, load capture and graph sharing. Full pair/v1 evidence is reported in the lane report.

## Every unit, including bounded and refused rows

The same schema has `invocation.kind: unit` for a run certificate. It holds each primary draw's input and answers, per-parameter shape, draw count and generator-route counts (enumerated heaps, listed values, boundary walk, seeded type-directed draw). Auxiliary program/sequence environments retain their answer events separately, with initialization explicitly not recorded. No draws is not represented as a measured zero when the input plan was never reached: its status says not recorded. The compiler settings and clock epoch are included in each replay record.

`runPairInFlight` attaches the unit record to the result and its existing bound; `check.mjs` already passes that bound through unchanged. The findings branch of `prReport` now retains its existing lane B result in the certificate instead of dropping it. Statement markers expose only the current/completed site, not a visit accumulator. `reach` therefore explicitly says not recorded and names the absent bitmap; it does not equate reaching the body with reaching changed lines.

Red controls: the bounded test failed on the absent bound.record; removing the findings-branch certificate made the refused-row test fail on absent certificate. Both pass with capture and pass-through. The independent emission test failed on omitted compiler options (load-time import navigation was not replayed); preserving the actual compiler options made it pass.

## Method-program extension

The lead also authorized output-only hooks in `exec/programs.mjs`: snapshot constructor inputs immediately before the existing `Reflect.construct`, snapshot each command's inputs before the existing observation, and pass the divergent run's record out through shrinking. Those hooks do not alter constructor/method invocation or argument application. The record's `program` invocation carries constructor `args` and ordered `{method,args}` commands for each side. Constructor answers survive the subsequent v1 trace clear. Races and React sequences still explicitly lack invocation protocols. Red: the program emission test saw `unrecorded` instead of `program`; the independent program test refused the invocation until its consumer was added.

## Capture purity and interrupted workers

Snapshotting uses intrinsic brand checks and property descriptors. Real proxies, symbol-keyed properties, array accessors/holes, extended arrays, non-enumerable object fields, and promises without a settlement protocol are explicitly unrecorded. No user getter or proxy trap is invoked to discover a tag or an array item. The regression control observed getter/trap hits before the fix and zero afterward. A worker stopped by the existing wall-clock bound now returns a v2 unit certificate whose draw domain and reach say not recorded, with the stop reason; no in-worker history is reconstructed. That test first failed on the absent version. The fallback changes only additive record fields and never changes the bound.

## One home for the unit certificate; summaries, not transcripts

The unit certificate has exactly one home: `record` on lane B's result (`runPair`). `check.mjs` copies it into
`certificate.lanes.B.record` (one additive line beside its existing projection), and the refused branch of `prReport`
builds the same projection (`verdict`, `reason`, `bound`, `record`) instead of embedding the whole lane B result, whose
witnesses already ride in the row. Before this, the record sat in both `res.record` and `res.bound.record`, so every
checked row serialised it twice, and a checked row whose lane B result had no `bound` (an ASK before the draws) lost it.

A certificate draw is accounting, not a replay transcript. Each draw keeps its input index, generator family,
completion, drawn arguments, and per side: the number of answers, their counts by operation and by fake path, the import
names, and the reasons of any answer that was not recorded. Program runs and auxiliary environments are summarised the
same way. The replayable transcript (every event with its arguments and outcome) rides only in a witness record, the one
artifact a replayer consumes. Measured cause: at aaa78b8, `bugsjs:eslint:105` `resolve` (PASS-bounded, 100 draws) carried
a 3.8 MB unit record, written twice in its row (7.6 MB), of which 2.9 MB were per-draw event transcripts.

The generator family is a property of the draw, so it is the same for every parameter; per parameter the certificate
counts draws by family. In the listed-values phase a parameter without a listed value is still drawn: the family names
the phase, not how that one parameter was produced.

Red controls: the bounded test failed on `r.record` (undefined: the record was only in `bound`), the refused-row test
counted the unit certificate twice, the program test found full records instead of summaries, and the new checked-row
test found no `record` in `certificate.lanes.B`.

## Key queries are not wrapped

The capture wrapper has no `ownKeys` trap. After an `ownKeys` trap returns, the engine asks the target for its keys
again to check the Proxy invariants; the target is the fake, which logs every query, so the trap put a second `keys`
entry in the v1 trace (`record_rest_any` `Sized`, found by the v1 comparison over 1,345 pair units). A key query now
reaches the fake once, and `witnessRecord` lists each `keys` entry of the side's trace under `unrecorded` with that
reason, so a replayer refuses the row instead of meeting an unexplained gap. Red control: the trace with capture had 4
`keys` entries against 2 without.

## The CLI result reaches its reader whole

`run.mjs` run as a command exits in the callback of its stdout write instead of right after `console.log`. On macOS a
pipe write is asynchronous, so `process.exit` dropped any result larger than the pipe buffer when the reader was slower
than the writer. Records made the self-pair fixture's result 68,767 bytes, and the pair step's self-pair row read
nothing. The bytes written are unchanged. Red control: a reader that sleeps 3 s received 65,536 bytes.
