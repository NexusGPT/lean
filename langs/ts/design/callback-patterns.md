# Destructured and defaulted element parameters of effectful array callbacks (stage 5, rank 13)

The construct: an arrow passed to `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap` or `reduce` whose
body has an effect (a port call, a write the loop carries) and whose element parameter is an object or array pattern,
`xs.map(({ id, n }) => svc.send(id, n))`, `entries.map(([k, v]) => ...)`, or carries a default,
`xs.map((x = fallback) => ...)`.

JavaScript's meaning: at each step the method calls the arrow with the element (and the index, and for `reduce` the
accumulator first); a pattern parameter binds its names from that element exactly as `for (const { id, n } of xs)`
binds them; a default on a parameter applies only when the argument is `undefined`.

The reading. The translator already reads an effectful arrow callback as a loop (`callbackLoop`, a synthetic for-of
over the receiver's sequence, `design/effectful-callbacks.md`). This reading lets the for-of's binding be the arrow's
pattern: `arrayCallbackShape` admits an element parameter that is an object or array pattern without a rest element,
or a plain name with a default whose declared type never holds undefined; the loop's `bind` already destructures a
pattern (`destructure(x, seq[idx], typeOf(x))`), and the collected element (`filter`'s kept value, `find`'s result)
reads `seq[idx]` when the element is a pattern. A default on the element is not read: by the admission condition the
element type excludes `undefined`, `void`, `any` and `unknown`, so the default can never apply and the element is the
parameter's value. The lint admits the same shapes (`effectfulParamWhy`) and keeps the index and `reduce`'s
accumulator as plain names. The pure-callback path (`callback(a, arity)`) admits a defaulted parameter under the same
type condition; it already destructured patterns.

One Dafny step of `xs.map(({ id, n }) => { sink.note(id); return n; })` (pair unit `noteKeys`'s shape):

```
var id := seq0[idx0].id;
var n := seq0[idx0].n;
var (wld, t1_) := ext_Sink_note_World_Sink_string(wld, sink, id);
var cb0_: seq<int> := cb0_ + [n];
```

What stays refused, each with an escape fixture (`fixtures/escapes/ts/callback_patterns_*.ts`), rule `callback-form`:
a rest element inside the pattern (`({ id, ...rest })`: the rest is a fresh record whose keys the element type must
enumerate; the record-rest reading of a parameter is stage 5 rank 2 and is not composed with the loop here); a default
on an element whose type admits undefined (`(Item | undefined)[]`: the default applies, and reading it needs a
conditional the loop step does not carry yet); a third parameter (the array itself); a rest parameter; an optional
parameter; a pattern or default on the index or the accumulator.

Soundness. The loop reads the element once per step from the snapshot sequence; the pattern's names are projections of
that element in declaration order, which is JavaScript's binding order for a parameter pattern (getters are excluded by
the element type being a plain record, the existing loop condition). A default that cannot apply changes nothing. A
changed pattern (a renamed field, a reordered tuple element) changes the projection and so the step; lane B sees the
same loop on real elements.

A guard gap met on the way, fixed generally (`translate/heap.mjs`, `layer1Risk` and `identitySkeleton`): a call of
`map`, `filter`, `flatMap`, `slice`, `concat`, `flat`, `toSorted`, `toReversed`, `toSpliced` or `with` on an array
whose result's element type holds no reference was an unknown node to the identity reader, so a unit returning
`entries.map(([k, v]) => ...)` as `string[]` was withheld as "identity shape unreadable" whenever its two translations
were not textually aliased. The library table marks those results fresh; a fresh array of primitives carries no input
reference, so it exposes nothing and is one node in the skeleton. `noteKeys` proves after the fix; `ids` and `labels`
proved before it only through aliasing.

What lane B sees: nothing new; the sandbox runs the arrow as JavaScript does. The pair's changed units witness on the
trace (`above`: a different note) and on the result (`sendAll`: one more kept element at n = 0).

Five real instances (`lean-v3/architecture/estate-coverage/units.jsonl` at 607de20, rule `callback-form`, the "plain
element/index names" message):
- nexus `apps/backend/src/_common/sse/sanitize-sse-error.ts:50` `sanitizeSseError`: `SAFE_SSE_ERROR_PATTERNS.find(({ pattern }) => pattern.test(raw))`: enters (an object pattern; the body's effect is the regular expression's test).
- nexus `apps/backend/src/admin/metrics/application/use-cases/get-ai-usage.use-case.ts:96` `GetAiUsageUseCase.execute`: `Array.from(providers.entries()).map(([provider, data]) => ...)`: enters when the receiver is an array (it is, through `Array.from`).
- nexus `apps/backend/src/admin/metrics/application/use-cases/get-workflow-stats.use-case.ts:123` `createTimeSeries`: `.map(([timestamp, value]) => ({ timestamp: new Date(timestamp).toISOString(), ... }))`: the pattern enters; `new Date(...)` keeps its own reading (a Date cell).
- nexus `apps/backend/src/ai-models/application/services/ai-model-seed.service.ts:66` `seedNewModelsFromCatalog`: `entries.map(({ modelId, ...entry }) => ...)`: stays out, a rest element (`callback_patterns_rest`).
- nexus `apps/backend/src/ai-models/application/use-cases/reset-all-models.use-case.ts:39` `ResetAllModelsUseCase.execute`: the same rest shape: stays out.

Measurement (`node langs/ts/census.mjs`, base heap/stage1 2c31b23 exported to /tmp/claude-501/l13-base against this
branch; `--max-old-space-size=12288`; logs /tmp/claude-501/l13-{before,after}-{nexus,langchainjs}.log, every exit 0):

| root | inside before | inside after | callback-form units |
|---|---|---|---|
| nexus (`work/bench/nexus/tree`), 26,520 units | 23,657 (89.2 percent) | 23,691 (89.3 percent) | 104 to 54 |
| langchainjs (`census/repos/langchainjs`), 4,871 units | 3,446 (70.7 percent) | 3,461 (71.1 percent) | 73 to 45 |
