# Optional calls

The construct: `f?.(x)`, `r.m?.(x)`, `r?.m?.(x)`, `this.m?.(x)`. JavaScript evaluates the callee once; when it is
undefined or null the chain yields undefined and neither evaluates the arguments nor calls anything; otherwise it
evaluates the arguments left to right and calls the value, with `r` (or `this`) as receiver for a member callee.

## The reading

The callee is read once as an `Option`. The present branch is a branch with the world, so the arguments' transitions
and the call's transition happen only there; the absent branch keeps the world and yields the chain's absent value
(`None`, or `Unit` for a void call). The present branch is the ordinary reading of the same call:
- a local function value: `invoke(wld, f.value, args)`, as `f(args)` reads;
- a function field of a data record (a datatype, its field reads are values): `T_m(wld, r, args)`, as `r.m(args)`;
- a function field of an opaque receiver (`Ext_`) or of `this`: those field reads go through the outside, so the call
  applies the value read once with its receiver, `invoke_bound(wld, (value, r), args)`; the method-call transition
  folds in a second lookup the optional call never makes.

    var oc3_ := cb;  // relay: cb.onMessage?.(text)
    var (wld, t5_) := (if oc3_.onMessage.Some? then (var (wld, t4_) := ext_call_args_Callbacks_onMessage_World_Callbacks_string(wld, oc3_, text);
      (wld, Some(t4_))) else (wld, None));

An optional call's resolved signature already carries the chain's undefined; the transition takes the callee's own
single signature instead (`__plainReturn`) and the branch adds the absence once. The admitted `a?.m()` reading takes
the same fix: its void form failed Dafny resolution beside a plain `a.m()` (one external, two result types).

## What stays refused (`optional-chain`)

Imported, global or computed callees; `any`, generic or overloaded callees (no single result type); fields of a
same-file class instance, of a union or of a non-record (`s?.trim?.()`); a path with an inner `?.`; an optional call
beside an assignment, update or comma in one expression, whose value reading evaluates every operand before any
branch. Escapes: `optional_call_computed.ts`, `optional_call_value_step.ts`.

## Soundness

- Argument effects: `log?.(clock.next())` against `const t = clock.next(); log?.(t)` is not proved; lane B witnesses
  the clock read on the absent path (pair unit `tick`).
- Lookups: `if (h.m) h.m(x)` reads `h.m` twice, `h.m?.(x)` once. Lane B traces both reads on an opaque receiver, so a
  method-call present branch would prove two traces equal; `invoke_bound` keeps them apart (unit `announce`, WITNESS,
  not proved). On a data record lane B passes plain objects, reads are values in both lanes, and the forms prove
  equal (unit `relay`).
- A method of the class is never absent: `this.m?.()` on one is the ordinary call.
- TypeScript narrows the callee inside its own arguments (`cb.f?.(cb.f?.(k) ?? 0)`): the inner absent branch is
  unreachable, as the type says.

## Lint and lane B

`optionalCallRefusal` admits exactly the shapes above. Run through `translate --tolerant`, 60 nutshell and 38 apps-ui
files with optional calls had no unit failing on one; `dafny resolve` found one error on such a line, a narrowed
branded-type argument (`folders-page.tsx:40`) that resolves cleanly outside the project (open). Lane B runs the
JavaScript: optional function inputs are drawn absent and present, fakes record each call with its arguments, and
field reads of opaque values and `this` are traced as `get` requests.

## Instances (refusals-4a5bdec.json; verdicts by shape, the corpus trees are not kept)

- `chat-assistant/services/openai-streaming.service.ts:298` `callbacks.onMessage?.(message.content)`: record field; enters.
- `version-history/publish-draft-dialog.tsx:49` `onSuccess?.()`: a local; enters.
- `openai/openai-realtime.adapter.ts:399` `this.assistantAudioStartCallback?.()`: field of this; enters (`invoke_bound`).
- `browserbase-execution.service.ts:378` `request.progress?.onFailed?.(...)`: absent record and field; enters.
- `code-interpreter/daytona.service.ts:565` `options.onPtyReady?.((data) => ...)`: an arrow argument; enters.
- Refused: `server.mjs:102` `globalThis.__pyka_memo_stats?.()` (global), `whatsapp-executor.service.ts:762` `content?.trim?.()`.
