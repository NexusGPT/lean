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
| 0 | Concept bench | the tool itself | `concepts.mjs --instances`, `concept_bench.py`, scorecard `results/concept-bench.md` | smoke on 8 concepts | done (harness) |
| 1 | Callbacks as loops | sync inline `forEach`, `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap`, `reduce`; a callback return ends one step | array-order transitions with method results and short-circuit exits; captured mutation and unsupported callback control refused | `for_each`, `effectful_callbacks` | partial (lane): sync inline callbacks read; wider shapes remain |
| 2 | Promise forms | `await Promise.all(xs.map(cb))`, `await Promise.all([a(), b()])`; `.then` chains and `new Promise` | a collecting loop in array order for map and async flatMap with no observable continuation after suspension; awaited elements in order (tuple or sequence); `.then(f)` with a pure lambda as `f(await p)`; `new Promise(executor)` as a transition whose result is the resolve argument | `promise_forms`, `effectful_callbacks` | map/async-flatMap order guarded (lane), literal done (dev); `.then`, `new Promise` next |
| 3 | Mixed logic values | `a && b`, `a \|\| b`, `a ?? b` of different types; a transition inside `?:` or on the right of `&&` | a conditional on truthiness with both sides lifted to the result type; the branch's transitions only when taken | `logic_values` | done (dev) |
| 4 | Numbers per unit | `/`, float literals, `**`, bitwise, `NaN`, `-0` | a unit with a float literal or a bare `/` is a real unit; `Pow` on integers; bitwise on `bv32`; IEEE specials as an extended real | `numbers` | division and floats per file done (dev); `**` uninterpreted (dev); bitwise and `NaN` next |
| 5 | Small operators | `??=`, `x++` and `a = b` as values, comma, unary `+`, `T["k"]` types | `x = x ?? v`; the value after the update; sequence; `ext_number_of`; opaque types | `operators` | `??=`, `\|\|=`, `&&=`, `**`, types done (dev); values of `++` and `=` next |
| 6 | Record operations | `delete`, computed keys, dynamic record reads, `Object.assign/freeze/fromEntries/keys/entries`, spread into a dictionary | optional field to `None` or map removal; dictionary literal; finite dynamic record keys select fields; known record enumeration order is exact | `small_forms`, `dynamic_reads` | delete, computed keys and dictionary spread done (dev); finite dynamic reads and fresh-record enumeration done (lane); unrestricted reads and assign/freeze/fromEntries remain |
| 7 | Rest and spread | rest parameters, spread in calls, array pattern defaults, rest patterns | a sequence parameter; spread to a rest callee; `xs[i]` with a bound; slices | `operators`, `spread_outside` | partial (lane): outside call sequences, nonempty min/max folds, multiargument push/unshift and scalar record rest; other rest shapes and iterators remain |
| 8 | Loop forms | `do..while`, `for..in`, labels, `switch` fall-through | body once then while (done); keys of a dictionary; named exits; clause chains | `small_forms` | `do..while` done (dev); the rest next |
| 9 | Exceptions across calls | a same-file callee's `throw`, `try/finally`, pure calls that may fault | a `Result` channel the call site tests; `finally` on both paths; a stated may-fault set | `exceptions_across` | next |
| 10 | Generators and iterators | `function*`, `yield`, `for await`, `Symbol.iterator` | a bounded sequence; a loop of transitions; `next` transitions | `generators` | next |
| 11 | Class forms | `super`, `new C()` of a same-file class, getter bodies, field of a field of `this`, module-level `let` | the parent's method; the constructor's record; the accessor's body; a path update; a world field | `class_super`, `class_new`, `class_forms` | `super.m()`, `super(...)` and `new C()` of a same-file class done (dev); getters, field of a field, module-level `let` next |
| 12 | Exact type tests | `typeof`, `instanceof`, `in` by static type; `never`, `object`, symbols | exact where the checker decides; opaque otherwise (done for the types) | `type_tests` | types done (dev); exact tests next |
| 13 | Strings | UTF-16 length and indexing, `trim`, case, `split`, `pad*`, ordering | a sequence of code units; exact common methods; ordering by code unit | `strings` | next |
| 14 | React handler bodies | handler arrows in the subset, `useMemo`, `useCallback`, `useEffect` | the handler as a lambda; `useMemo(() => e)` is `e`; `useCallback(f)` is `f` | `jsx_handlers` | next |
| 15 | Function values everywhere | returned, stored, compared functions; nested declarations (done); object literals with methods | opaque values keyed by text | `function_values` | nested declarations done (dev); the rest next |
| 16 | Module forms | dynamic `import()`, `require()`, `globalThis` | transitions whose result is a module handle; the world | `module_forms` | next |
| 17 | Null versus undefined | `=== null` against `=== undefined` on one value | a two-constructor `Absent` where a unit distinguishes them | `null_undefined` | next |
| 18 | Clock read | `new Date()` without arguments | a transition of the world | `clock` (escape) | done (dev) |
| 19 | Heap layer | aliases, objects from the world, `===` on objects | world heap refs; anchored observations up to fresh-ref bijection; canonical allocation order supplies an identity certificate; safe value specialisation ([design](design/heap-layer.md)) | [standalone toy](design/heap-layer-toy.dfy), execution/graph probes | design + verified toy (lane/heap-layer); translator and lane B migration pending; screened core: 4 alias units, 0 closure units |

## Order and gates

Rows 4 to 8 and 11 to 12 are small and independent: one day. Rows 9, 10, 13, 14 need a design note each before
code. Row 19 is its own milestone with its own measurement (the alias locals of the concept census: 4,620 units).

After every merge to master: the census over 39 repos, the battery, the corpus chain, and the fix-commit miner
(`harness/mine_fixes.py`, 66 fix commits from five repos today, 37 witnessed) re-run at the merged commit; the
README's numbers table and the paper's tables take their numbers from that run only.
