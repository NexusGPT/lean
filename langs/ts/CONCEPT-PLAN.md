# Concept plan: how each reading of COVERAGE.md is built, tested and integrated

One row per reading group. A group is DONE when its reading is in the translator and the lint, its pair test is under
`tests/pairs/`, the suite is green, and the concept bench shows its sample inside and witnessed. Status words:
**done (dev)** on the dev branch, suite green · **merged** on master · **next** written, not started.

## The contract of every row

1. **Reading.** The translation rule (what the verifier sees) and the lint rule (what the editor says), both in one
   commit; the lint is the program that decides entry into the proof lane, so the two cannot disagree.
2. **Test, three checks on real code** (`harness/concept_bench.py`, 10 real units per concept drawn from the 39
   reference repos, at most 3 per repo, units of at most 120 lines):
   - lint: the unit enters the subset;
   - translate: the translator finishes the unit (`--tolerant --report`, per unit);
   - witness: up to three planted mutants in the unit (`mutate.mjs`) are caught by lane B.
   Plus one pair test per reading (`tests/pairs/<name>`: a changed version that must be a WITNESS and a refactor
   that must be PASS-proved, with lane B's verdict per unit in `expect.json`) and, for what stays refused, an escape
   fixture under `fixtures/escapes/ts/` naming the rule.
3. **Integration.** The dev branch; `node langs/ts/tests/run.mjs` green; commit and push; merge to master when the
   corpus chain is not running; then the 39-repo census (`census.mjs`), the battery (`soundness.py`), and the
   corpus chain re-run at the merged commit, so every number in the README and the paper comes from one commit.

## The rows

| # | group | concepts | reading | pair test | status |
|---|---|---|---|---|---|
| 0 | Concept bench | the tool itself | `concepts.mjs --instances`, `concept_bench.py`, scorecard `results/concept-bench.md` | full run at master 03ec3bc, 205 concepts (section "Bench at master 03ec3bc") | done (full bench) |
| 1 | Callbacks as loops | sync inline `forEach`, `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap`, `reduce`; a callback return ends one step | array-order transitions with method results and short-circuit exits; captured mutation and unsupported callback control refused | `for_each`, `effectful_callbacks` | partial (lane): sync inline callbacks read; wider shapes remain |
| 2 | Promise forms | `await Promise.all(xs.map(cb))`, `await Promise.all([a(), b()])`; `.then` chains and `new Promise` | a collecting loop in array order for map and async flatMap with no observable continuation after suspension; awaited elements in order (tuple or sequence); consumed `.then`/`.catch`/`.finally` continuations; terminal synchronous executors resolve/raise; outside callback bridges opaque; existing calls retain opaque fallback | `promise_forms`, `effectful_callbacks` | merged (dev 3690ede); map/async-flatMap order guarded (lane), literal done (dev); chains and terminal executors partial (lane), `promise_then` and `promise_fallback` pairs |
| 3 | Mixed logic values | `a && b`, `a \|\| b`, `a ?? b` of different types; a transition inside `?:` or on the right of `&&` | a conditional on truthiness with both sides lifted to the result type; the branch's transitions only when taken | `logic_values`, `mixed_logic_values` | merged (dev 4853fd2); partial (lane): single evaluation and conditional world transitions; conditional argument mutation refused |
| 4 | Numbers per unit | `/`, float literals, `**`, bitwise, `NaN`, `-0` | a unit with a float literal or a bare `/` is a real unit; uninterpreted power; finite bitwise on `bv32`; special-producing observers opaque, extended IEEE numbers pending | `numbers`, `numbers_bits` | merged (dev 7ed048b); division and floats per file done (dev); `**` uninterpreted (dev); finite bitwise/coercions/rounding done (lane), special values conservatively opaque or refused; extended IEEE numbers remain |
| 5 | Small operators | `??=`, `x++` and `a = b` as values, comma, unary `+`, `T["k"]` types | `x = x ?? v`; old postfix value, new prefix/assigned value; ordered sequence; `ext_number_of`; opaque types | `operators`, `operators_values` | merged (dev 19106db); `??=`, `\|\|=`, `&&=`, `**`, types done (dev); eager update/assignment values and comma partial (lane), conditional value state remains |
| 6 | Record operations | `delete`, computed keys, dynamic record reads, `Object.assign/freeze/fromEntries/keys/entries`, spread into a dictionary | optional field to `None` or map removal; dictionary literal; finite dynamic record keys select fields; known record enumeration order is exact | `small_forms`, `dynamic_reads` | delete, computed keys and dictionary spread done (dev); finite dynamic reads and fresh-record enumeration done (lane); unrestricted reads and assign/freeze/fromEntries remain |
| 7 | Rest and spread | rest parameters, spread in calls, array pattern defaults, rest patterns | a sequence parameter; spread to a rest callee; `xs[i]` with a bound; slices | `operators`, `spread_outside` | partial (lane): outside call sequences, nonempty min/max folds, multiargument push/unshift and scalar record rest; other rest shapes and iterators remain |
| 8 | Loop forms | `do..while`, `for..in`, labels, `switch` fall-through, inferred while bounds | first-step helper; keys of a dictionary; named completion channels; first-match clause suffixes; stable counter distance | `small_forms`, `loop_forms` | merged (dev 0922824); partial (lane): loop labels, scalar fall-through and inferred bounds read; unknown bounds stay opaque; block labels refused; `for..in` done (dev) |
| 9 | Exceptions across calls | a same-file callee's `throw`, `try/finally`, pure calls that may fault | a result channel in the world fault cell, checked at calls; finally on normal, return and throw paths; throwing units and their callers, with checks local to exact try regions | `exceptions_across` | partial (lane); local opaque fallbacks preserve admission; cleanup alias/shadowing conflicts and throwing function values remain refused |
| 10 | Generators and iterators | `function*`, `yield`, `for await`, `Symbol.iterator` | a bounded sequence; a loop of transitions; `next` transitions | `generators` | merged (dev c951e8e); partial (lane): scalar sequences, async next transitions, opaque suspended async programs; exact state machines and heap captures remain |
| 11 | Class forms | `super`, `new C()` of a same-file class, getter bodies, field of a field of `this`, module-level `let` | the parent's method; the constructor's record; the accessor's body; a path update; a world field | `class_super`, `class_new`, `class_forms` | merged (dev 03ec3bc); `super.m()`, `super(...)` and `new C()` of a same-file class done (dev); getter/setter units and data-record receiver paths done (lane, `object_methods`); module-level `let` world fields done (lane) |
| 12 | Exact type tests | `typeof`, `instanceof`, `in` by static type; `never`, `object`, symbols | exact where the checker decides; opaque otherwise (done for the types) | `type_tests` | partial (lane): nominal tests, tagged sums, array/typeof/required-key tests; assertion-derived tests and open structural membership uninterpreted |
| 13 | Strings | UTF-16 length and indexing, `trim`, case, `split`, `pad*`, ordering | BMP scalar envelope stated as a model axiom; exact common helpers, guarded ASCII case, lexicographic ordering | `strings` | partial (lane); full UTF-16 remains |
| 14 | React handler bodies | handler arrows in the subset, `useMemo`, `useCallback`, `useEffect` | pure lambdas and symbolic deferred calls with captures; pure scalar memo and callback erasure with dependency coverage; opaque effect registration | `jsx_handlers` | partial (lane) |
| 15 | Function values everywhere | returned, stored, compared functions; nested declarations (done); object literals with methods | opaque values keyed by text | `function_values` | nested declarations done (dev); immutable method literals exact/opaque (lane, `object_methods`); mutable literal receivers and literal setters remain |
| 16 | Module forms | dynamic `import()`, `require()`, `globalThis` | transitions whose result is a module handle; the world | `module_forms` | merged (dev 1ece2b2); partial (lane): module get/set, loader handles and global reads; nested writes remain |
| 17 | Null versus undefined | `=== null` against `=== undefined` on one value | type-directed Nullish tags, single-absence Option retained, undefined-only defaults and tag-preserving same-file boundaries; JSON stays uninterpreted with absence schema | `null_undefined` | merged (dev 0c4b2b0); done (lane) |
| 18 | Clock read | no-argument `new Date()`, `Date.now()`, `performance.now()`, `process.hrtime()` | ordered world transitions with seeded recorded clock answers in lane B; fixed Date construction stays a value | `clock_read`, `clock_read_integer`, `clock`; `clock_initializer` escape | merged (dev c479c02); done (lane) |
| 19 | Heap layer | aliases, objects from the world, `===` on objects | world heap refs; anchored observations up to fresh-ref bijection; canonical allocation order supplies an identity certificate; safe value specialisation ([design](design/heap-layer.md)) | [standalone toy](design/heap-layer-toy.dfy), execution/graph probes | design + verified toy (lane/heap-layer); translator and lane B migration pending; screened core: 4 alias units, 0 closure units |
| 20 | Candidate-only units | a new file or a function absent from its parent file | link and load under recording fakes, then run alone; `NEW` records bounds and faults, `REFUSE(load)` names local link failures; evaluation and test modules are ASK; no theorem | `new_unit` | done (lane) |

## Order and gates

Rows 4 to 8 and 11 to 12 are small and independent: one day. Rows 9, 10, 13, 14 need a design note each before
code. Row 19 is its own milestone with its own measurement (the alias locals of the concept census: 4,620 units).

After every merge to master: the census over 39 repos, the battery, the corpus chain, and the fix-commit miner
(`harness/mine_fixes.py`, 66 fix commits from five repos today, 37 witnessed) re-run at the merged commit; the
README's numbers table and the paper's tables take their numbers from that run only.

## Bench at master 03ec3bc (results/concept-bench.md, 2026-10-26)

Full run: 205 concepts, K=10, 1,796 instances; 849 inside the lint, 770 translated, 1,481 of 2,031 planted mutants witnessed. Per group, the bench rows it covers (instances / inside / translated / witnessed of planted); a concept absent from the bench instance list has no row.

| group | bench rows | n | inside | translated | witnessed |
|---|---|---:|---:|---:|---|
| 1 | 2 rows: `async callback`, `nested function value` | 20 | 12 | 12 | 23/35 |
| 2 | 10 rows: `await`, `async unit`, `new Promise`, `Promise.resolve`, `Promise.reject`, `Promise.all`, `Promise.race`, `Promise.allSettled`, `.then/.catch chain`, `Promise.withResolvers` | 93 | 31 | 26 | merged (dev 3690ede); 37/59 |
| 3 | 3 rows: `??`, `?:`, `assignment as a value` | 30 | 19 | 18 | merged (dev 4853fd2); 42/47 |
| 4 | 31 rows: `/ division`, `float literal`, `**`, `bitwise`, `Number.isNaN`, `Number.isFinite`, `Number.isInteger`, `Number.isSafeInteger`, `Math.round`, `Math.floor`, `Math.ceil`, `Math.trunc`, `Math.abs`, `Math.sqrt`, `Math.pow`, `Math.log`, `Math.log2`, `Math.sin`, `Math.cos`, `Math.tan`, `Math.asin`, `Math.atan2`, `Math.exp`, `Math.hypot`, `Math.cbrt`, `Math.imul`, `% modulo`, `Number.parseInt`, `Number.parseFloat`, `unary + coercion`, `bigint` | 247 | 175 | 172 | merged (dev 7ed048b); 377/502 |
| 5 | 8 rows: `++ as a value`, `comma operator`, `as cast`, `as const`, `satisfies`, `x!`, `void`, `typeof` | 77 | 40 | 40 | merged (dev 19106db); 74/105 |
| 6 | 12 rows: `delete property`, `computed member access`, `computed property name`, `Object.keys`, `Object.entries`, `Object.values`, `Object.fromEntries`, `Object.assign`, `Object.freeze`, `Object.is`, `Object.hasOwn`, `spread in object` | 105 | 51 | 39 | 70/92 |
| 7 | 9 rows: `rest parameter`, `rest pattern`, `spread in call or array`, `destructuring`, `destructured parameter`, `destructuring default`, `default parameter`, `Array.from`, `Array.isArray` | 90 | 36 | 33 | 61/82 |
| 8 | 7 rows: `for (;;)`, `for-of`, `for-in`, `while`, `do-while`, `switch`, `labelled statement` | 64 | 31 | 27 | 61/78 |
| 9 | 4 rows: `throw`, `try/catch`, `try/finally only`, `finally block` | 40 | 19 | 18 | 32/45 |
| 10 | 3 rows: `generator`, `yield`, `for await` | 29 | 1 | 1 | 3/3 |
| 11 | 12 rows: `class method`, `static method`, `super`, `method of a class that extends`, `assigns a field of this`, `mutating method on a field of this`, `this`, `#private field`, `getter/setter`, `class expression`, `new`, `object literal with methods` | 108 | 65 | 52 | 101/116 |
| 12 | 5 rows: `instanceof`, `in`, `type predicate`, `generic unit`, `generic parameter` | 50 | 26 | 23 | 40/61 |
| 13 | 5 rows: `template string`, `tagged template`, `String.fromCharCode`, `String.fromCodePoint`, `regex literal` | 44 | 24 | 24 | 51/69 |
| 14 | 5 rows: `JSX element`, `JSX fragment`, `JSX handler attribute`, `JSX spread attribute`, `React hook call` | 50 | 23 | 22 | 50/56 |
| 15 | 3 rows: `nested function declaration`, `closure assigns outer variable`, `closure mutates outer object` | 30 | 2 | 2 | 3/6 |
| 16 | 5 rows: `dynamic import()`, `require()`, `global globalThis`, `global global`, `global process` | 45 | 20 | 20 | merged (dev 1ece2b2); 40/51 |
| 17 | 2 rows: `== loose equality`, `===` | 20 | 10 | 9 | merged (dev 0c4b2b0); 10/20 |
| 18 | 5 rows: `new Date`, `Date.now`, `Date.parse`, `Date.UTC`, `Math.random` | 50 | 29 | 26 | merged (dev c479c02); 61/70 |
| 19 | 6 rows: `local bound to another name (alias)`, `mutates a parameter`, `mutates a local object`, `mutating method on a parameter`, `mutating method on a local or result`, `mutates a computed target` | 60 | 22 | 18 | 39/50 |
| 20 | 0 rows:  | 0 | 0 | 0 | 0/0 |
