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
