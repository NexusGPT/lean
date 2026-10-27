# Promise handles

**The construct.** A function, arrow const or method that is not `async`, whose declared or inferred result is a
`Promise`, and that returns a promise it did not build: `getAllFolders(id) { return this.folders.getAllFolders(id); }`,
`parse(text): Promise<string> { return Promise.resolve(text); }`, a chain `c.get(id).then(f)`, a held name, a
conditional of these. Before this reading the lint refused every such unit (`promise`, "must be async").

**JavaScript meaning.** The body runs synchronously and returns the object the callee returned: the caller holds that
same promise, which settles when the outside settles it. Nothing waits inside the unit. A synchronous throw before the
return is a throw to the caller, not a rejection. An `async` rewrite of the same body differs: it returns a new
promise that adopts the outcome one tick later, and a synchronous throw becomes a rejection.

**The reading.** The returned handle is the value of the transition that produced it, carried out of the unit as a
value. No new translation is needed: an outside call is already the transition `ext_call_args_...(wld, ...)` whose
value names its result; a chain or a Promise static in a non-async unit is unconsumed (`promiseConsumed` is false), so
it keeps the opaque outside-call reading of design/promise-forms.md and is never settled inside the unit. A same-file
non-async handle unit is its Dafny function. Example (pair promise_handle, `Repo.find`):

```dafny
function repo_find(wld: World, self: Ext_Repo, id: string): (World, int)
{
  var (wld, t12_) := ext_call_args_Ext_Store_load_World_Ext_Store_string(wld, ext_Ext_Repo_store_Ext_Repo(self), id);
  (wld, t12_)
}
```

Two further marks keep it sound. The `// SIG` line of such a unit carries `"handle": true`, so an async rewrite (whose
`return c.get(id)` reads the very same term) is an interface change and never a proof. The identity guard drops its
"result may carry an input or shared reference" risk for a handle unit: the term of the transition, or the input
name, is the one promise object, so equal terms are the same promise.

**What stays refused (rule `promise`, an escape each).** `new Promise(executor)` returned (rank 23's row,
`promise_handle_new.ts`); a call of a same-file async function (it runs on after its first await, which the unit
reading would settle inside; `promise_handle_async_callee.ts`); a promise read out of an array, set, map or string
(`ps.reduce(...)`; `promise_handle_element.ts`); a field or any other expression (`x.ready`; `promise_type.ts`); a held
name whose result type has no identity in Dafny, such as `Promise<void>` read as `Unit`
(`promise_handle_void_name.ts`). Stored or dangling chains keep `promise-pending` as before.

**Soundness.** (1) Equal results need the same term: the same transition, same arguments, same world, which in
JavaScript is the same call returning the same object. (2) A held name of a void result would make two different
handles the one value `Unit`; it is refused, and a returned call of a void result is always the last transition of its
path, so the world tells two of them apart. (3) A collection read is a pure value, not a transition, so with a
degenerate element type two elements would read as one; refused. (4) An async callee would be read to completion
while the caller's later effects run before its continuation; refused. (5) Handle against async: the signature mark.
(6) Inherited gap: a synchronous throw of the outside call is not on the fault channel (subset.md, "What is a fault").
(7) Inherited, not widened here: a held `Promise<void>` passed as an argument loses identity in any unit (dtype of a
promise is the dtype of its value); reported to the lead.

**Lint.** `promiseHandle(u, at)` replaces the two `promise` refusals: each returned leaf (through conditionals) must be a handle.

**Lane B.** Real JavaScript: the fake returns a promise, the harness awaits the returned promise and compares the
outcome, the trace and pending work; seeded rejection draws reach the chains. Pair promise_handle: `load` (a `.then`
added) is a WITNESS (-432 against -431); the refactors are PASS-bounded.

**Instances** (from units.jsonl and sites.jsonl at 607de20; "enters" read from the after census records):
- nexus `apps/backend/src/document-template/services/document-template-folders.service.ts:27` getAllFolders, a field's call: enters (promise before, no finding after)
- nexus `apps/backend/src/permissions/application/services/permission-checker.service.ts:334` listGrantedRoleIdsByOrg, a conditional of two calls: enters
- nexus `apps/backend/src/_common/streaming/stream-log/infrastructure/adapters/read-stream-log.in-memory.adapter.ts:11` execute, `Promise.resolve` of a call: enters
- pipedream `packages/sdk/src/shared/index.ts:1532` BaseClient.actionRun, a same-file non-async handle method: enters
- nexus `apps/backend/src/admin/metrics/infrastructure/adapters/bull-queue-stats.adapter.ts:75` withTimeout, `new Promise` and a race: stays out (promise and promise-pending before and after)
