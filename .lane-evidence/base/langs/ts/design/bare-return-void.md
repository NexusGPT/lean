# A bare return where the result admits undefined (bare-return-void)

## The construct and its JavaScript meaning

`return;` ends the function. A call then yields `undefined`, the same value a path that ends without a return
yields. In a constructor it ends the body early, and `new C(...)` still yields the receiver: the fields the body
wrote before the return stay written, the writes after it never happen.

## The reading

The lint (`returnsVoid`) admits a bare return in a constructor, and in a unit or callback whose result, unwrapped
from a promise, is `void`, `undefined`, `any`, `unknown`, or a union with an `undefined` or `void` member (declared
or inferred: `function f(s) { if (!s) return; return s.length; }` has the result `number | undefined`). An effect
callback (`useEffect(() => { if (!on) return; ...; return () => ... })`) infers `(() => void) | undefined` and enters
by the same test. The translator reads it through one helper beside `retType` (`bareReturn`): `Unit` in a
constructor or a void unit; the absent value of the result's `Option` or `Nullish` where it admits undefined; the
uninterpreted undefined where the result is opaque (`any`, `unknown`, `T | void`), the term `return undefined;`
already had.

    function badge(s: string): Option<string>   // `if (s.length === 0) return; return s + "!";`
    { if |s| == 0 then None else Some(s + "!") }

## What stays refused (bare-return)

A result with no `undefined` member: `T`, `T | null` (TypeScript also reports TS2322 there). Escape fixtures
`fixtures/escapes/ts/bare_return_void.ts` and `bare_return_null.ts`.

## Soundness

`return;` and `return undefined;` are the same statement in JavaScript, and the translator reads both to one term,
so the reading adds no value lean did not already have for `return undefined;`. The admission is the type test
TypeScript itself applies: a bare return type-checks exactly when `undefined` is assignable to the result. A
constructor's output is `Unit` beside the world (the receiver is the handle the caller allocated), so ending it early
is the end of its transitions: the writes after the return are absent from the world, as they are at run time.

## What lane B sees

The value `undefined` in the outcome, and the trace without the effects after the return. In the pair
`tests/pairs/bare_return_void`, notify's bare return skips `out.send(n)` at `n = 0` in the parent only: lane B finds
the trace difference at input 0 (WITNESS) and lane A's `Equal_notify` fails on the same path.

## Real instances (units.jsonl, refused by bare-return alone)

Each refused by bare-return alone at the base; "now" is the census at this lane's head (records of
`census.mjs --out`, no finding inside the unit's lines).

| instance | shape | now |
|---|---|---|
| first party `apps/backend/src/_common/providers/pinecone/pinecone.service.ts:30` `PineconeService.constructor` | constructor, early return when unconfigured | enters |
| first party `apps/frontend/src/common/components/Chat/ChatMessagesView/scroll/use-scroll-affordance.ts:36` `useScrollAffordance` | effect callback, `(() => void) \| undefined` | enters |
| first party `apps/frontend/src/modules/Workflow/utils/node-to-iterate-on.ts:16` `getNodeToIterateOnWithOutputFormatAndFirstIteration` | inferred union with undefined | enters |
| n8n `packages/workflow/src/utils.ts:124` `fileTypeFromMimeType` | declared `BinaryFileType \| undefined` | enters |
| n8n `packages/cli/src/services/cache/cache.service.ts:165` `CacheService.get` | async, result through an unresolved store: `any` | enters |

n8n `packages/cli/src/services/events.service.ts:18` `EventsService.constructor` is admitted by this reading but still
refused here by `unresolved-module` (an environment fact of the bench tree, not a construct).
