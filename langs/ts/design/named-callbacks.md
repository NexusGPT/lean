# Named callbacks: a named function passed to an array method

**The construct.** `ids.map(toApiRow)`, `ip.split(".").map(Number)`, `names.filter(Boolean)`, `xs.some(isKnown)`: a
name, not an arrow, as the callback of `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap` or `reduce`.

**Its JavaScript meaning.** The method calls the function once per element, in index order, with three arguments:
the element, its index and the array (`reduce` passes the accumulator first, then those three). `this` is undefined.
So `xs.map(f)` is `xs.map((x, i, a) => f(x, i, a))`, and it differs from `xs.map((x) => f(x))` whenever f reads a
second argument: `["10", "10"].map(parseInt)` is `[10, NaN]`.

**The reading.** The eta-expansion, read by the existing effectful callback loop (`callbackLoop`, `coreLoop`):
- a same-file unit or a local arrow takes the arguments its declared parameters name (the lint refuses `arguments`
  and rest parameters, so it cannot read more), converted to its parameter types;
- an import, a module value or a function-typed parameter takes every argument JavaScript passes: a transition
  `call_args_<name>(World, x, i, a)` (or `call_args_invoke` on the function value), one per element, in order;
- `Boolean`, `String`, `Number`, `parseInt`, `parseFloat` read as their direct calls read (`String` of a number is
  `to_string`, `Boolean` the uninterpreted `call_args_Boolean`), as pure lambdas; `parseInt` takes the index as its
  radix, and a unit passing `Number` on non-numbers, `parseInt` or `parseFloat` is numeric-opaque, as a direct call is.
The loop's element takes the callee's own parameter name, so `ids.map(toLabel)` and `ids.map((id) => toLabel(id))`
emit the same helper text and the theorem aliases them. From the pair `named_callbacks`:

    function labels_loop0_parent(seq0: seq<string>, idx0: int, wld: World, cb1_: seq<string>): (World, seq<string>)
    { if idx0 >= |seq0| then (wld, cb1_)
      else (var id: string := seq0[idx0]; var (wld, t2_) := to_label_parent(wld, id);
            var cb1_: seq<string> := cb1_ + [t2_]; labels_loop0_parent(seq0, idx0 + 1, wld, cb1_)) }

**What stays refused.** `callback-form`: a method reference `xs.map(o.m)` (it loses its receiver); a generic
same-file callee; an optional, defaulted, rest or `this` parameter, or more parameters than the method passes; a
callee that changes its argument (the argument is the array's element); a local function value built in the unit
(`const f = make()`) whose call may make a transition; a global other than the five. `async-callback`: a named async
function, under `Promise.all` too. `exception-callback`: a throwing unit. `callback-result`: an effectful type
predicate, a flatMap callee with mixed array and scalar results. Escapes: `fixtures/escapes/ts/named_callback_*.ts`.

**Soundness.** The loop makes the same calls with the same arguments in the same order as JavaScript (SEMANTICS world
axiom; "Function values": a function passed to a library operation is the function it is). The cases a wrong reading
would prove equal: (1) dropping the index for a callee that reads it: a unit is passed its declared parameters, all
of which JavaScript fills, and an outside body is passed all three, so `xs.map(lookup)` and `xs.map((x) => lookup(x))`
are different transitions, never proved equal; (2) a default on the index: JavaScript passes the index, so the
default never applies; refused rather than modelled; (3) a mutated element: refused; (4) a receiver: only a plain
name is read, so no `this` is lost; (5) the five globals: the direct-call reading, which is already the same on both
sides. A local function value whose call the lint reads as pure keeps the existing pure lambda reading, unchanged.

**Lint.** `lint.mjs`, the array-method branch: a named callback whose body is read elsewhere (import, module value,
global, parameter) or whose call may make a transition goes to `namedCallback`, which admits it or names the rule
above; `mutatesParam` mirrors the translator's `syntacticMutations`. Advice (`callback-form`, conditional) now says
how to pass a named function the arguments JavaScript passes.

**What lane B sees.** The real JavaScript: the method calls the function with all its arguments, so a callee reading
the index differs from an arrow that passes a constant (`tagged`: WITNESS); fakes of an outside callee record every
argument it receives.

**Instances (units.jsonl, rule `callback-form:named-effectful`; lint with the project, after this change).**
- nexus `apps/backend/src/_common/network/private-ip.util.ts:16` `isPrivateIpv4` (`.map(Number)`): enters.
- nexus `apps/backend/src/roles/infrastructure/controllers/role-membership-api.presenter.ts:37` (`.map(toApiRoleMember)`, an import): enters; translates, 3 verified.
- nexus `packages/cli/src/util/version-check.ts:137` `compareSemver` (`.map(Number)`): enters.
- driftbench `packages/generate/src/extract/contract.ts:256` `firstIssue` (`.map(String)` on `PropertyKey[]`): enters the lint; the translator refuses the `string | number | symbol` element type, as for any arrow.
- driftbench `tools/docs/spec-reference.ts:434` `Page.values` (`.map(String)`): enters.
