# A method called through apply or call is the direct call

The construct: `returnData.push.apply(returnData, list)`, `a.push.call(a, x)`, `Array.prototype.push.apply(c, b)`.
Before this reading the lint refused every mutator reached through `.apply`, `.call` or `.bind` (`unsupported-member`,
row `push-apply-value`), because about 40 sites in the lint, the translator, the heap core and `common.mjs` know a
mutator by its name as the callee (`MUT_NAMES`, `PARAM_MUTATORS`, `MUTATOR_NAMES`, `MUTATORS`, `MUT`, `isMutCall`,
`isEffectCall`, `syntacticMutations`, the heap core's `MUTATORS`, `BUCKET_MUTATORS`, `CHANGERS`, `RECEIVER_WRITERS`,
inline `['push', 'unshift']` tests); a site that misses the form treats a changed array as unchanged.

## The reading: one desugaring at the source
As lean desugars a for header to init and while (`design/for-desugar.md`), it desugars an exact apply/call to the
direct call once, before any analysis. `applyCall(n, checker)` (end of `common.mjs`) decides; `normaliseApplyCalls`
rewrites each exact call in the text and re-creates the program (other files are the old program's own). The lint
(`lintFile`) and the translator (`translate`) read that program, so every name-keyed site sees `a.push(...b)`, already
read, and a site added later cannot miss the form. Only the span from `.apply(` to the list changes, to `(`, blanks and
`...`: the text keeps its length and line breaks, so every position, line, unit and diagnostic is the owner's
(`langs/ts/apply-call.test.mjs` asserts it). Pair unit `appendAll`, `a.push.apply(a, b)` on a parameter:
```
function append_all_parent(a: seq<string>, b: seq<string>): (seq<string>, seq<string>)
{ var a := a; var a: seq<string> := a + b; (a, a) }
```

## The equivalence conditions (ECMA-262)
`F.apply(thisArg, list)` calls F with `this` = thisArg and the arguments CreateListFromArrayLike(list) (20.2.3.1);
`F.call(thisArg, ...args)` with the remaining arguments (20.2.3.3); `r.m(...b)` evaluates `r.m` (13.3.2, the base is
`this`) and the arguments by iterating b (13.3.8.1). They are one transition when:
1. thisArg is the method's own base, one path in both positions (a name, property names, literal or name indexes;
   parentheses, casts and `!` aside) with no call and no accessor in it: the apply form reads it twice, the direct form
   once, which is one value only for such a path, and no code runs between the two reads (the callee read, then thisArg).
2. That path is not rooted at `this` or at a module binding: those are cells of the world, read as a transition per
   mention (lane B traces each read of a receiver field), so two reads are not one. Refused by name.
3. For apply, the list's static type is a non-nullable array or tuple: CreateListFromArrayLike reads `length` and the
   indexes where a spread iterates (a string, a Set or an array-like record differ), and on null or undefined it passes
   nothing where a spread throws.
4. `.apply`/`.call` is the lib's own member of Function; `bind` makes a value and is refused.
5. Borrowed: an Array.prototype method of the lib, reached through `[]`, `Array.prototype` or such a path, with thisArg
   such a path to an array or tuple, is that array's method (23.1.3: every array reaches the same intrinsic): read as
   `c.push(...)`. Onto another value it is generic over `length` and indexes: refused.
Refused forms keep their text; the lint names them (`unsupported-member`, `applyCall`'s reason) and the translator
fails on them (`translate.mjs`, at the call), the same decider: escapes `push_apply` (this not an array),
`push_apply_list` (a list typed any), `push_apply_this` (a receiver through `this`), `library_members_push_apply`
(bind), and the lane B pair `push_apply_refused`, where `listAny` and `Bag.addAll` are WITNESSes against the direct call.

## What quotes the source
A finding's `text`, line and column come from the owner's text (`lintFile` keeps it beside the normalised program).
A message built from a node that contains a rewritten call (a few rules print the call) shows the direct form with its
blanks: the form the rule judged, the one the message tells the owner to write. The converter plans its edits on its
own, un-normalised program and copies source from it: `tests/fixtures/convert/apply-site` converts two forEach whose
callbacks call push through apply and call, and the result keeps those calls byte for byte. Lane B runs the file as
written; Dafny names built from a block's text (an opaque block) differ between the apply and direct forms, which
leaves such a block unproved, never wrongly proved.

## Soundness
Considered: a getter on the path, a call or effectful index in it (not a path: unread); a receiver field of `this` or a
module cell (world reads: refused); a callable with its own `apply` (the symbol must be Function's); a list that may be
undefined, a string, a Set (refused); `a.push.apply(a, (a = c, b))` (both forms fix `this` before the list); a borrowed
push onto an array-like record (refused); a method whose declared `this` differs (the direct form fails the checker).

## What lane B sees
The real call, recorded as `Array.prototype.push` operations. Pair unit `dropped` (a parameter changed only through
apply, the call dropped) is a WITNESS on lane B and a withheld lemma on lane A (the parent returns the changed `a`),
where the scratch reading that left `a` out of `syntacticMutations` would have proved it.

## Measurement
See the lane report: census before and after on both trees with the entering units by rule, and the sweep of every
pair side, base against branch.
