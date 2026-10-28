# A method called through apply or call is the direct call

The construct: `returnData.push.apply(returnData, list)`, `a.push.call(a, x)`, `Array.prototype.push.apply(c, b)`.
Before this reading the lint refused every mutator reached through `.apply`,
`.call` or `.bind` (`unsupported-member`, row `push-apply-value` of `library-rows.mjs`), because about 40 sites in the
lint, the translator, the heap core and `common.mjs` know a mutator by its name as the callee (`MUT_NAMES`,
`PARAM_MUTATORS`, `MUTATOR_NAMES`, `MUTATORS`, `MUT` and `isMutCall`, `isEffectCall`, `syntacticMutations`, the heap
core's `MUTATORS`, `BUCKET_MUTATORS`, `CHANGERS`, `RECEIVER_WRITERS`, and the inline `['push', 'unshift']` tests), and
a site that misses the form treats a changed array as unchanged.

## The meaning
`F.apply(thisArg, list)` calls F with `this` = thisArg and the elements of list as its arguments (ECMA-262 20.2.3.1,
CreateListFromArrayLike); `F.call(thisArg, ...args)` likewise with the remaining arguments (20.2.3.3). With F = `r.m`
and thisArg the same `r`, that is the method call `r.m(...list)` / `r.m(...args)`: the receiver is changed, the effect
happens, the result is the method's result (the new length for push). An Array.prototype method reached through `[]`,
`Array.prototype` or another array is the same intrinsic every array reaches, so `[].push.call(c, x)` is `c.push(x)`.

## The reading
One normalisation, before any analysis reads the file. `applyCall(n, checker)` (end of `common.mjs`) returns
`{ receiver, method, args, spread, via, exact, why }` for a call through the lib's own `Function` members `apply` and
`call`. `normaliseApplyCalls(loaded)` rewrites every exact one in the source text to the direct call and re-creates the
program from it (the other files are the old program's own, so nothing else is parsed or bound again); the lint
(`lintFile`) and the translator (`translate`) read that program. Only the span from `.apply(` to the list changes, to
`(` plus blanks plus `...`, so the text keeps its length and its line breaks: every other position, line, unit and
diagnostic is where it was. Every name-keyed site then sees `a.push(...b)`, already read: no site keys on the callee
twice, and a site added later cannot miss the form. `a.push.apply(a, b)` on a parameter (pair unit `appendAll`):

```
function append_all_parent(a: seq<string>, b: seq<string>): (seq<string>, seq<string>)
{
  var a := a;
  var a: seq<string> := a + b;
  (a, a)
}
```

Exact means: (1) thisArg is the method's own base, one path (a name, `this`, property names, literal or name indexes;
parentheses, casts and `!` aside) whose every step is a plain property and not an accessor, so reading it twice (the
apply form) or once (the direct form) is one value, and no code runs between the two reads; or (2) the method is the
lib's `Array`/`ReadonlyArray` member reached through such a path, `[]` or `Array.prototype`, and thisArg is such a path
to an array or tuple type. For apply the list must be a non-nullable array or tuple type: apply on `null` or
`undefined` passes no argument where a spread throws, and an array-like that is not an array is listed by its length
where a spread iterates.

## What stays refused
By name, through the same function, in the lint (the block of `unsupported-member` at the `push-apply-value` row,
whose message is now `applyCall`'s `why`) and in the translator (`fail` at the call, for an array method whose apply
or call is not exact): a borrowed method whose `this` is not a plain path to an array (`a.push.apply(c, b)` with `c`
an array-like record writes `length` and indexes of any object: `fixtures/escapes/ts/push_apply.ts`), a list that is
not a non-nullable array (`a.push.apply(a, b)` with `b: T[] | undefined`), and a bound value (`a.push.bind(a)`:
`fixtures/escapes/ts/library_members_push_apply.ts`, rewritten from the apply form this reading now admits). A
direct form the lint refuses (push used as a value, splice with spread items, a spread into a method of `this`) stays
refused through apply by the same rule, since the lint reads the direct form.

## Soundness
A wrong reading would prove different behaviours equal if the rewritten call were not the same transition. The cases
considered: a getter on the receiver path (read twice against once: refused, accessors fail the path test); a
receiver with a call or an index expression with effects (not a path: unread); `.apply`/`.call` that is not
Function's own (a callable with its own `apply` member: the symbol must be the lib's interface member); a list that may
be `undefined` (refused); an assignment inside the list to the receiver's name (`a.push.apply(a, (a = c, b))`: in both
forms `this` is fixed when the callee is read, before the list); a borrowed push onto an array-like object (refused);
a method whose declared `this` differs (the direct form fails the type checker: `ts-strict`). The rewritten text is
read only by lane A; lane B runs the file as written.

## What lane B sees
The real call, recorded as `Array.prototype.push` operations. The pair's `dropped` unit (a parameter changed only
through apply, the call dropped on the candidate) is a WITNESS on lane B and a withheld lemma on lane A (the parent
returns the changed `a`, the candidate does not), where the scratch reading would have proved it.

## Measurement
Census (`langs/ts/census.mjs`, base 41ba9b1 against this branch): nexus 23,848 to 23,848 of 26,520 (the form does
not occur there); n8n 4,338 to 4,479 of 6,337. The 141 n8n units that enter all had the apply row as their only
refusal; none leaves. `unsupported-member` on n8n: 402 findings in 257 units to 180 in 70; the direct form's own rules
now name what the direct call would meet (`param-mutation` 200 to 205, `mutator-value` 12 to 15). Instances, each
entering: `nodes/Cisco/Webex/GenericFunctions.ts:78`, `nodes/Autopilot/GenericFunctions.ts:71`,
`nodes/Jenkins/Jenkins.node.ts:638`, `nodes/Trello/GenericFunctions.ts:55`, `nodes/Xero/GenericFunctions.ts:65`
(`returnData.push.apply(returnData, ...)`); `nodes/Google/Calendar/GoogleCalendar.node.ts:232`
(`body.attendees!.push.apply(body.attendees!, ...)`) is now refused as the direct `param-mutation` it is. Every pair
side translated by the base and by this branch: the Dafny differs only in the new pair `push_apply`.
