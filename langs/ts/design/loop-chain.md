# A loop that only guards and pushes is a filter and a map

## The construct
A `for (const x of xs)` over an array whose body is only guards (`if (c) continue;`, or `if (p) { ... }` around the
rest), `const` declarations, and one final `acc.push(v)` into a local array; the same body as a `forEach` callback
(`if (c) return;` as the guard). Its usual refactor is the chain `xs.filter(p).map(f)` (or `filter` or `map` alone).

## JavaScript meaning
The for-of visits the array's elements in index order (ECMA-262 14.7.5, the array iterator 23.1.5.1); `continue` ends
one iteration; `push` appends at the end (23.1.3.23). `filter` (23.1.3.8) calls its callback once per element in index
order and keeps those that return a truthy value; `map` (23.1.3.21) calls its callback once per kept element, in order.
With pure, total callbacks the two evaluate the same expressions on the same elements and append in the same order.

## The reading
`guardPushLoop` in `translate/translate.mjs`, tried first by `coreLoop`: when the shape holds, the loop is the binding
`acc := acc + Map(Filter(xs, p), f)`, built from the prelude's `Filter_<T>` and `Map_<T>_<U>`, the vocabulary the chain
already reads. `p` is the conjunction of the guards in order (a `continue` guard negated, a wrapping guard as written),
each with the `const` declarations before it in scope; `f` is the pushed value with every declaration in scope. No guard
drops `Filter`; an identity push drops `Map`. Before and after, from pair `readme_ledger`, unit `statement`:

```dafny
var lines: seq<string> := [];
var lines := lines + Map_Event_string(Filter_Event(events, ((e: Event) => !(e.account != account))),
  ((e: Event) => if e.kind == "credit" then "+" + ext_to_string_int(e.amount) else "-" + ext_to_string_int(e.amount)));
```

`Map` proves against a pointwise-equal callback alone (its `ensures` gives each element, the goal reaches sequence
extensionality). `Filter` does not: two predicates written differently are two lambdas under a recursion. So the
prelude's `Filter_<T>` carries a proved lemma `Filter_<T>_same` (predicates equal on every element keep the same
elements, by induction on the sequence), and `spec/theorem.py` (`filter_hints`) states it in every `Equal_<f>` whose two
sides both use that `Filter_<T>`: a `forall` over sequences and predicates, each instance proved by a call of the lemma.
It is a rule over the vocabulary, never over a unit. Scratch `/tmp/claude-501/lc/x`: the normalized parent against the
chain, "2 verified, 1 error"; with the hint, "5 verified, 0 errors"; with the predicate changed, "4 verified, 1 error".

## What keeps its loop helper (nothing is refused; the lint is unchanged)
A second write (another local, a field, the world), an effect, a possible throw, `break`, `return`, a label, a read of
the accumulator in the body, a push of several values or a spread, a statement after the push, a `let`, `this`, an
element access or a non-null assertion (the map's callback runs without the guard's facts), a name a guard narrows used
at a narrowed type (`if (!t.tag) continue; out.push(t.tag.label)`), an iterable that is not an array (a string, a Set, a
Map, `any`), an iterable from a `filter` the loop relies on, an element or pushed type that is a tuple or a function
(the prelude's `A -> bool` would read a tuple as two parameters), a forEach callback with an index.

## Soundness
The binding is the same value the helper computed, under the conditions: the accumulator is the only state and is only
appended to, so `acc + Map(Filter(...))` is the helper's fold; every expression is pure and total (no effect, no throw,
nothing hoisted, no element access, no non-null), so evaluating all guards before all pushes changes nothing; the map's
callback sees the element at its declared type, since a guard that could narrow a name keeps that name out. The cases
considered: a guard whose narrowing a later read needs (kept as a helper; probe `narrowed` and `unionNarrowed`, the
file verifies "18 verified, 0 errors"); a guard reading the accumulator (`readsAcc`, helper); a `break` (helper); a
changed predicate (pair unit `large`, and an object-pattern probe `namesOff`: "4 verified, 1 error", not proved). The
congruence lemma is a translator-written prelude fact with its own proof, the class of the prelude's `ensures`.

## What it loses, and the theorem route
(a) was chosen over (b) because the shape is syntactic and clean: once the loop is read as the chain, every refactor
among loop, chain and reshaped loop compares in one vocabulary, with no induction per shape. It loses a loop whose body
is more than guards and one push: pair unit `numbered` (a counter in a second local) keeps two helpers whose bodies
differ in shape, not proved, PASS-bounded; that needs an induction over two helpers, which neither route writes. (b) is
not needed for the sign-hoisted variant: its `const sign` enters the shape. That probe stays unproved for another
reason: its template literal is written `"" + sign + ...` and the prover does not drop the empty head (scratch: the
same file with `sign + ...` proves, "5 verified, 0 errors"; with `("" + sign) + ...`, "4 verified, 1 error").

## Measured (lane B is unchanged: it runs the JavaScript; `large` witnesses an order at the minimum)
Probes on the base (`check.mjs`, unit `statement`): `readme_ledger` ASK:unproved, chain ASK:unproved, sign hoisted
ASK:unproved, concatenation ASK:unproved, rename PASS-proved. With this reading: PASS-proved, PASS-proved,
PASS-bounded (the template head above), PASS-proved, PASS-proved. Pair `loop_chain`: `labels`, `doubled`, `positives`,
`openNames`, `totalQty` proved; `large` WITNESS; `numbered` not proved, PASS-bounded. Differential case
`cases/loop_chain.ts` (three functions, a forEach among them): the same answers in Node and in Dafny.

## Instances
A text search for a for-of whose body is only `const`, `if ... continue`, a wrapping `if` and one push (script
`/tmp/claude-501/lc/find2.py`) over both census roots found 79 loops; each unit translated with `--core --fn` (script
`/tmp/claude-501/lc/enter.sh`): 6 enter the reading, 39 keep a helper (another write, a non-array iterable, an element
access, a narrowing guard, `this`), 34 fail to translate for reasons outside this reading (counted from
`/tmp/claude-501/lc/enter.out` with the 12 rows run first). Examples:
- bench `packages/vibe-stack-detect/src/dockerfile/render.ts:65` `installStageLines`: a push of a template: enters (Map).
- bench `apps/backend/src/_common/providers/pptx/pptx-parser.service.ts:182` `parseSlide`: `const trimmed = text.trim(); if (trimmed) push`: enters.
- bench `apps/backend/src/_common/streaming/utils/tool-call-pairing.util.ts:37` and `:85` `computeToolCallPairing`: a wrapping guard: enters.
- bench `packages/vibe-sdk/src/wire.ts:231` `readCardVariables`: an `unknown` iterable and a narrowing guard: keeps its helper.
- langchainjs `libs/langchain-classic/src/chains/router/utils.ts:31` `zipEntries`: `array[i]`, an element access: keeps its helper.
- bench `packages/types/src/api/public/v1/scopes.ts:1088` `validateScopes`: a regular expression test is an effect: keeps its helper.
