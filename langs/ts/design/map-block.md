# A block callback's return is its own value

## The construct
`xs.map((x) => { ...; return v; })`, and every other pure callback with a block body read as a Dafny lambda (the
value reading of `map`, `filter`, `find`, `some`, `every`, `findIndex`, `reduce`), inside a unit whose own result
carries more than its value: a unit that changes a parameter (references layer 1, `mutatedOf`: the parameter is an
output), an effectful unit (the world rides first), a component with hook slots.

## JavaScript meaning
A `return` inside an arrow function ends that arrow's call and gives the arrow's result (ECMA-262, FunctionBody
evaluation: the completion of the body is the function's own completion). It never ends the enclosing function and
never carries the enclosing function's state. The callback reads an outer binding as it is when the callback runs;
`map` runs it after every statement before the call.

## The reading
The callback's body is its own function: a `return` gives the callback's value alone. The world, the changed
parameters and the hook slots stay with the unit: the lambda closes over their current Dafny names, so it reads them
as they are when `map` runs. A callback that writes a cell declared outside it already takes the loop reading
(`callbackValue`, stage 5 rank 19, `array-callback-cells.md`), where the cells ride as the loop's state; that path is
unchanged.

```dafny
function labels_parent(items: seq<Item>, seen: seq<int>): (seq<string>, seq<int>)
{ var seen := seen; var seen: seq<int> := seen + [|items|];
  (Map_Item_string(items, ((x: Item) => if x.ok then x.tag.label_ else "")), seen) }
```

Before, each `return` of the callback went through `wrapRet`, which adds the current unit's world, changed parameters
and slots: `((x: Item) => if x.ok then (x.tag.label_, seen) else ("", seen))`, a lambda `Item -> (string, seq<int>)`
where `Map_Item_string` takes `Item -> string`. Dafny refused to resolve the file, so no unit of the file proved
(ASK:translation-defect); never a false proof. The translator now holds a counter while `lambda` reads a block body,
and `wrapRet` gives the value alone while it is raised.

## What stays refused
Unchanged, by the lint: a callback that changes the unit's parameter itself (`items.map((x) => { seen.push(1); ... })`
is `param-mutation`: push on `seen`, which is not a local array). A callback with an effect or one that may throw is
still an opaque function value or the loop reading, as before.

## Soundness
The lambda is pure (the translator fails a block callback holding an effect), so its value depends only on its
argument and the names it closes over. The changed parameter's Dafny name at the call site is its value after every
statement before the call, which is what the callback reads in JavaScript; the callback cannot change it (lint
`param-mutation`), so the unit's output for the parameter is the name after the call, as before. A loop inside the
callback keeps its own helper and its own `(Some(v), state)` return; the value leaves through the callback's return,
which is now its own. A case where a wrong reading would prove two different things equal: a candidate whose callback
reads the parameter before the push and a parent reading it after: the lambda captures the name current at the call,
so the two read different values; measured, the lemma does not prove (with `items: string[]`; with `items: number[]`
the guard refuses it first, since `items` and `seen` may be one array).

Lint: unchanged; it already admitted these units, the translator failed them at Dafny resolution.
## What lane B sees
Nothing changes: lane B runs the JavaScript. Its typed inputs draw `Item[]` arrays (empty and non-empty) and the
`seen` array; the changed callback in pair `map_block` (`s + 2` for `s + 1`) is a WITNESS on any non-empty array.

## Measured
Pair `map_block`: `labels` (the callback holds an `if` with two returns; the candidate names the length and the map's
result, proved), `noted` (effectful, a `log.note` transition, the same refactor, proved), `sizes` (the callback adds
two, WITNESS, unproved), `width` (untouched, proved). On the base both proved units were ASK:translation-defect.
Differential case `cases/map_block.ts` (`scaleCount` calls a unit that pushes and maps): the same three answers in
Node and in Dafny.

Open, outside this reading: a refactor INSIDE the callback (`{ if (x.ok) return a; return b; }` against
`{ const l = x.ok ? a : b; return l; }`) does not prove in a unit whose result is a tuple: Dafny proves
`Map(s, f) == Map(s, g)` alone but not `(Map(s, f), seen) == (Map(s, g), seen)` (tuple equality does not reach the
sequence extensionality the prelude's `ensures` needs). Never a false proof; a lemma hint in the theorem would close it.

## Instances
Measured over the 374 files with a block-bodied `.map(` (59 langchainjs, 315 of the bench tree): each translated
`--core --tolerant --no-project --heap`, then `dafny resolve`, base `e0eceda` against this change. Resolution errors
of the form `found X -> (...)`: 31 in 28 files before, 3 in 2 files after (those 3 are a different defect: an
expression callback returning a tuple `[n.id, n]` whose element is not converted to `Any`); 8 files that did not
resolve now resolve; no file has more errors. Instances (the wrap error before, none after):
- `langchainjs libs/providers/langchain-cohere/src/rerank.ts:105`: a `typeof` branch with two returns in an async method (the world variant).
- `langchainjs libs/providers/langchain-ibm/src/document_compressors/ibm.ts`: two wrapped callbacks, both gone.
- `langchainjs libs/langchain-core/src/prompts/few_shot.ts:433`: `examples = examples.map((example) => {...})`.
- bench `packages/types/src/shared/analytics-export/analytics-result-to-json-text.ts:14`: the file now resolves (1 error, 0 after).
- bench `apps/frontend/src/common/auth/confined-routes.ts:65`: the file now resolves (1 error, 0 after).

## 2026-10-27: a tuple's collections are compared first (theorem hint)
The open item above is closed in the theorem, not the translator. A unit that changes a parameter returns a tuple
(value, parameter); Dafny proves `Map(s, f) == Map(s, g)` alone (an equality goal of type `seq` reaches the
sequence's extensionality, and the prelude's `ensures` gives each element) but not the same equality as one component
of a tuple goal. Scratch `/tmp/claude-501/mb/dx/t2.dfy`, before: "2 verified, 1 error"; with one assert on the first
component: "3 verified, 0 errors".

The rule (`spec/theorem.py`, `component_hints`): when the return type of a lemma's goal `f_parent(x) == f_candidate(x)`
is a Dafny tuple, the lemma body asserts, before the goal, `f_parent(x).i == f_candidate(x).i` for every component
whose type is a collection (`seq<..>`, `string`, `set`, `iset`, `multiset`, `map`, `imap`); a component that is itself
a tuple is walked the same way (`.i.j`). It is a rule over the goal's type, never over one unit. The `Equal_` lemma
and its `EqualDirect_` twin carry it, after the callee summaries.

Soundness: each assert is the goal's own equality on a projection, so it holds whenever the goal holds; Dafny proves
it, never assumes it. It can only guide the prover to a goal it could reach, never prove a goal that is false. A
failed assert is an error inside the lemma's span, so the lemma reads as unproved, as before (pair `map_block`,
`sizes`: the error moves from the postcondition to the assert on component 0).

Pair `map_block` gains `labelsInner`: it pushes `items.length` on `seen`, then maps with a block callback refactored
inside (`return x.tag.label` against `const t = x.tag; return t.label`). Base theorem: Equal_labels_inner not proved;
with the hint: proved.

Open: a collection inside a datatype or an `Option` (a record field holding a `seq`) gets no assert; the same limit
may hold there and would need a field walk.
