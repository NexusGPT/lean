# 17. Dynamic JavaScript features: what lean takes from the research result

Source result: `/Users/assem/Downloads/Sound Boundaries for Dynamic JavaScript Equivalence Checking.md` (40 items).
Each item below was opened from its own artifact where the fetch allowed. Anything not opened is marked UNVERIFIED with the attempt.

## Verified lean behaviour (run in this session, not copied from the result)

Probe files sit in the scratchpad. Commands: `node langs/ts/lint/lint.mjs <file> --no-project` and `node langs/ts/check.mjs --parent <p> --candidate <c> --unit f --no-project`.

| Probe | Lint result | Checker result | Reading |
|---|---|---|---|
| `Object.getPrototypeOf(x)` | inside the subset (no rule) | parent `Object.getPrototypeOf(x) === null` vs candidate `return false`: **PASS-bounded** | **False PASS.** Lint admits it and the input generator never builds a null-prototype object. |
| `Object.create(p)` | inside the subset | not run | Admitted by the same route as above. |
| `Object.defineProperty(o, "b", …)` on a parameter, then `return 0` vs `return 0` | inside the subset | **WITNESS** (lane B sees the parameter change) | Caught here. Not caught in general. |
| `h.call(o, 1)` with `h(this: …)` | inside the subset (no call rule) | translate refuses: "`this` outside a class method" | Lint and translator disagree. The refusal holds. |
| `Reflect.get`, `new Proxy` | refused, `prototype` | not run | `lint.mjs:28` (EFFECT_GLOBALS). |
| `eval(s)` | refused, `dynamic-eval` | not run | `lint.mjs:28`. |
| `new Function(s)` alone | refused, `dynamic-eval` | not run | `lint.mjs:722`. |
| `arguments.length`, `arguments[0]` | refused, `global-read` (and `dynamic-key` on `arguments[0]`) | not run | `lint.mjs:236` (global), `:1189` area (keys). |
| `x.__proto__` on `any` | refused, `prototype` | not run | `lint.mjs:1164`. |
| `a == b` (number, string) | refused, `loose-equality` plus `ts-strict` | not run | `lint.mjs:809`. |
| `r[k]`, `k: string`, record with string index | admitted (dictionary read) | not run | Dictionary rule, `subset.md` "Dictionaries". |
| `{ [k]: 1 }` on a `Record<string, T>` return | admitted | not run | Dictionary literal, `lint.mjs:748`. |
| `x instanceof A` (same-file class) | admitted | not run | Type-test rule, `subset.md`. |

**Two findings to act on.**

1. **Object-level prototype calls pass lint.** `lint.mjs:28` lists only `eval`, `Function`, `Reflect`, and `Proxy` as refused globals. `Object` sits in `EFFECT_WORLD` (`lint.mjs:24`). The translator then treats `Object` as a pure receiver (`translate.mjs:170`, `PURE_RECEIVERS`). Its comment says "the lint refuses the prototype ones", and that is not true for `getPrototypeOf`, `create`, or `defineProperty`. The false PASS in the table above is the observed consequence. Fix: refuse `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Object.create`, `Object.defineProperty`, `Object.getOwnPropertyDescriptor`, `Object.defineProperties` by name in the lint, with the `prototype` rule, until the ledger has a `proto` operand.
2. **Lane B has no null-prototype input.** `langs/ts/exec/run.mjs` never constructs `Object.create(null)` (grep finds none). A bounded PASS therefore says nothing about null-prototype records. Fix: add a null-prototype and a prototype-replaced generator, or downgrade bounded verdicts that depend on prototype reads to ASK.

## Summary table (all 40 items)

| # | Item | Verdict | Where in lean | One-line how |
|---|---|---|---|---|
| 1 | Richards 2010, dynamic behaviour | REFERENCE | `lint.mjs:1164` (prototype rule) | Keep prototype and field-addition assumptions explicit in the heap model. |
| 2 | Richards 2011, `eval` study | REFERENCE | `lint.mjs:28` (dynamic-eval) | Classify eval purpose before proposing a replacement. |
| 3 | To Type or Not to Type, 2022 | REFERENCE | none | Denominator warning only. Do not weight `any` as a refusal cost. |
| 4 | DiTU feature combinations, 2026 | REFERENCE | none | Measure rule combinations, not single API names. UNVERIFIED (ACM 403). |
| 5 | TAJS | REFERENCE | none | Borrow recency abstraction for prototype heaps. Not a PASS oracle. |
| 6 | TAJS DOM | REFERENCE | `design/heap-layer.md` | Environment effects belong inside the proof boundary. |
| 7 | Unevalizer | PORT | `lint.mjs:28`; new pass in `translate/` | Eliminate `eval` of a constant string, refuse otherwise. |
| 8 | WALA JavaScript | REFERENCE | `translate/translate.mjs` call lowering | Explicit receiver and argument array as the call model. |
| 9 | SAFE 2.0 | REFERENCE | none | Framework candidate only. Coverage unverified. |
| 10 | JSAI | REFERENCE | `lint.mjs:28` | Separate supported semantics, precision, and refusal. |
| 11 | Gillian, Part II | REFERENCE | `design/heap-layer.md` | Heap contracts for effects the record model omits. |
| 12 | lambdaJS | REFERENCE | `SEMANTICS.md` | Core semantics before source spellings. |
| 13 | S5 | REFERENCE | `design/object-methods-getters.md` | Accessors and eval are modelable computations. |
| 14 | JSCert / JSRef | REFERENCE | `translate/heap.mjs` | An object record needs a prototype field. Trust ledger. |
| 15 | TypeScript compatibility | REFERENCE | `subset.md` "Records" | Declared fields are not a closed runtime record. |
| 16 | Flow | REFERENCE | none | Imported refinements need their own proof. |
| 17 | Safe TypeScript | REFERENCE | `design/exact-type-tests.md` | Checked boundaries change failure behaviour; keep them distinct. |
| 18 | StrongScript | REFERENCE | `design/exact-type-tests.md` | Optional and concrete annotations carry different guarantees. |
| 19 | Dependent JavaScript | REFERENCE | `design/dynamic-record-reads.md` | Explicit receivers and key-set refinements. |
| 20 | Siek and Taha, gradual typing | REFERENCE | `design/exact-type-tests.md` | Casts are semantic operations, not annotations. |
| 21 | Typed Scheme, occurrence typing | REFERENCE | `design/exact-type-tests.md` | Predicate refinement inside its proved scope. |
| 22 | Strict mode | REFERENCE | `subset.md` | TypeScript modules are strict. Not a receiver model. |
| 23 | ADsafety | REFERENCE | `translate/heap.mjs` (prelude) | Verify the runtime helpers that lean's prelude trusts. |
| 24 | Core-Cajita | REFERENCE | none | Authority bounding. UNVERIFIED (download failed). |
| 25 | SES | REFERENCE | `exec/run.mjs` (vm sandbox) | Harden the lane B sandbox. Licence NR. |
| 26 | ESLint `eqeqeq` | PORT | `lint.mjs:806-809`, `lint/advice.mjs` `loose-equality` | Rewrite `==` only when both operands are one proven primitive type. |
| 27 | ESLint `prefer-rest-params` | PORT | `lint.mjs:236` (`arguments`), `advice.mjs` | Advice only, with its own precondition. ESLint has no fix. |
| 28 | ESLint `no-useless-call` | PORT | `lint.mjs` (no rule yet) | Receiver-token check as the precondition for a `call` rewrite. ESLint has no fix. |
| 29 | Feldthaus refactoring | REFERENCE | `lint/advice.mjs` | Attach a precondition and a named rejection to each suggestion. |
| 30 | Livshits reflection | REFERENCE | `lint.mjs:28` | Conservative supplied summaries only. UNVERIFIED (not fetched). |
| 31 | SOLAR | REFERENCE | `lint/lint.mjs` report format | Name the failed obligation at the operation. |
| 32 | TamiFlex | REFERENCE | none | Logs give witnesses, not PASS. UNVERIFIED (ACM 403). |
| 33 | Python MOPSA | REFERENCE | none | State unsupported boundaries. UNVERIFIED (fetch failed). |
| 34 | Hummingbird | REFERENCE | `design/research-integration.md` section 5 | Staged admission with invalidation on definition change. |
| 35 | .NET trim analysis | REFERENCE | `lint/advice.mjs` | Operation-specific requirements; suppression is not proof. |
| 36 | Jelly | REFERENCE | none | Discovery and slicing only. Its README says it is unsound. |
| 37 | Eq@DFuzz | REFERENCE | `exec/run.mjs` | Strengthen WITNESS generation; ASK after agreement. |
| 38 | TypeScript fault study | IRRELEVANT | none | Fault classes do not bear on feature bans. |
| 39 | Occurrence-typing soundness revisit | REFERENCE | `design/exact-type-tests.md` | Track exact theorem versions. |
| 40 | Modern-feature adoption | IRRELEVANT | none | Adoption frequency is not semantic preservation. |

Counts: DEPENDENCY 0, PORT 4, REFERENCE 34, IRRELEVANT 2. Total 40.

No item earns DEPENDENCY. TAJS is an archived Java jar. Jelly states it is unsound. SES has no stated licence on the page. WALA and SAFE are JVM and Scala tools that analyse for call graphs, not equality.

## Per-item entries

Each entry gives: (1) what it is with the artifact opened, (2) mechanism, (3) lean today, (4) verdict, (5) how, (6) open questions.

### 1. Richards et al., 2010

1. Paper PDF `https://sss.cs.purdue.edu/projects/dynjs/pldi275-richards.pdf` opened. Title confirmed. Licence NR. Date 2010.
2. Instrumented browser traces replayed into an abstract heap. Measures executed operations, not static counts.
3. `lint.mjs:1164` refuses `.prototype`, `.constructor`, `__proto__`. Dynamic prototype chains have no reading.
4. REFERENCE: it settles that prototype assumptions must be explicit.
5. The "2,785 eval calls" figure appears in the PDF text. The "81% monomorphic" figure was not found by grep (UNVERIFIED).
6. Open: do modern prototype-chain lengths differ? No modern measurement exists in the result.

### 2. Richards et al., 2011 (`eval` study)

1. Paper PDF `https://janvitek.org/pubs/ecoop11.pdf` opened. Title "The Eval that Men Do" confirmed. Licence NR.
2. Records string arguments of eval calls by dataset; classifies purposes.
3. `lint.mjs:28` maps `eval` to `dynamic-eval`. Every eval refuses.
4. REFERENCE: purpose classes decide which replacement is valid.
5. Verified in the PDF: 550,358 calls, 337 MB of strings. The 82% and 50% website rates were not grepped (CLAIM).
6. Open: a current typed-repository rate.

### 3. "To Type or Not to Type?", 2022

1. arXiv `https://arxiv.org/abs/2203.11115` opened. 604 projects, 305 TypeScript, over 16M LOC confirmed.
2. Repository mining of ESLint-detected quality issues. Correlational.
3. No lean rule uses it.
4. REFERENCE: a denominator warning only.
5. The 79,735 violation total is CLAIM (not checked in the abstract).
6. Open: none that changes a decision.

### 4. DiTU, 2026 (feature combinations)

1. ACM `https://dl.acm.org/doi/10.1145/3744916.3764521` returned HTTP 403. UNVERIFIED.
2. Query-based feature combinations on AST and call graphs (from the result, CLAIM).
3. None.
4. REFERENCE: count rule combinations.
5. None until the paper opens.
6. Open: access route to the paper.

### 5. TAJS

1. GitHub `https://github.com/cs-au-dk/TAJS` opened. Apache-2.0. Archived, read-only since 2025-02-11. "No longer maintained." Java jar built with Ant. No release shown.
2. Abstract interpretation with recency abstraction over a heap (from the result, CLAIM; the paper PDF `tajs/paper.pdf` was downloaded and its title confirmed).
3. None. Lean does not call it.
4. REFERENCE: heap domain technique, not a PASS oracle.
5. Not used. An archived Java jar cannot carry a PASS.
6. Open: none that changes the verdict.

### 6. TAJS DOM

1. Paper `https://cs.au.dk/~amoeller/papers/dom/paper.pdf` downloaded. Title "Modeling the HTML DOM and Browser API in Static Analysis of JavaScript Web Applications" confirmed.
2. Models the browser event system and DOM inheritance (from the result, CLAIM).
3. `design/heap-layer.md` describes the heap but no environment model.
4. REFERENCE: environment belongs in the proof boundary.
5. Use as the argument for an explicit environment contract in `SEMANTICS.md`.
6. Open: none.

### 7. Unevalizer (2012)

1. `https://cs.au.dk/~amoeller/papers/unevalizer/` opened. "Remedying the Eval that Men Do", Jensen, Jonsson, Møller, 2012. No artifact link. No licence stated.
2. Dataflow analysis plus transformation removes `eval` calls when the code string is known and the context is safe (from the result, CLAIM for the 33 of 44 figure).
3. `lint.mjs:28` refuses every `eval`.
4. PORT: a narrow pass that rewrites `eval(<constant string>)` to its parsed expression, else refuses.
5. Input: the call and its string argument from the TypeScript AST. Output: the rewritten expression, or a `dynamic-eval` refusal with the failed condition. Cost: 2 to 3 days (CLAIM). Measurement: pair in `langs/ts/tests/pairs` with a constant-string eval; corpus count of `eval` in `corpus.json` changed functions.
6. Open: the constant-string case may be near zero in the corpus. Count first.

### 8. WALA JavaScript

1. `https://github.com/wala/WALA` opened. EPL-2.0 (sidebar, EPL-1.0 link in README). No release shown. Java.
2. Flow-insensitive prototypes; explicit receiver and argument array (from the result, CLAIM, tutorial PDF not opened).
3. `translate/translate.mjs` lowers calls with an explicit world argument, not a receiver.
4. REFERENCE: receiver and argument vector as the call model.
5. Not called. The model is copied into the ledger design.
6. Open: none.

### 9. SAFE 2.0

1. `https://github.com/kaist-plrg/safe` opened. Scala, sbt. Licence not named on the page (LICENSE file exists). The result's BSD claim is UNVERIFIED.
2. Pluggable JavaScript analysis framework (from the page).
3. None.
4. REFERENCE.
5. Not used. Coverage of TypeScript is "may not be integrated".
6. Open: the licence text.

### 10. JSAI, 2014

1. arXiv `https://arxiv.org/pdf/1403.3996` downloaded. Title confirmed. "28 benchmarks" and "56 configurations" confirmed in the text.
2. Reduced product of abstract domains; `eval` is excluded with a warning (from the result, CLAIM).
3. `lint.mjs:28`.
4. REFERENCE: configuration and refusal kept apart.
5. None.
6. Open: the ES3 exclusion statement was not grepped.

### 11. Gillian, Part II

1. PDF `https://vtss.doc.ic.ac.uk/publications/Maksimovic2021Gillian.pdf` downloaded. Title confirmed. "two bugs" confirmed in the text.
2. Symbolic execution over separation logic with explicit heap resources (from the result, CLAIM).
3. None.
4. REFERENCE: heap contracts for omitted effects.
5. None.
6. Open: the "prototype poisoning" bug was not grepped.

### 12. lambdaJS, "The Essence of JavaScript"

1. PDF `https://cs.brown.edu/research/plt/dl/jssem/v1/gsk-essence-javascript-r5.pdf` downloaded. Title confirmed.
2. Small-step core with desugaring (from the abstract).
3. `SEMANTICS.md` is lean's own semantics.
4. REFERENCE.
5. None.
6. Open: none.

### 13. S5

1. PDF `https://cs.brown.edu/research/plt/dl/s5/s5.pdf` downloaded. Title "A Tested Semantics for Getters, Setters, and Eval in JavaScript" confirmed. "under 35 syntactic forms" confirmed.
2. Strict ES5.1 core; accessors and eval as computations.
3. `design/object-methods-getters.md` covers getters inside lean's subset.
4. REFERENCE: accessors and eval are modelable.
5. None.
6. Open: the strict-mode test pass rate was not grepped.

### 14. JSCert / JSRef

1. PDF `https://www.doc.ic.ac.uk/~pg/publications/Bodin2014Trusted.pdf` downloaded. "A Trusted Mechanised JavaScript Specification" confirmed.
2. Coq specification and an interpreter proved against it. An object record has 25 fields, including the prototype (confirmed in the text).
3. `translate/heap.mjs` has no prototype field.
4. REFERENCE: a faithful object record needs a prototype field, and a trust ledger.
5. Input to the admission table (the `proto` operand).
6. Open: which of the 25 fields lean needs.

### 15. TypeScript compatibility

1. `https://www.typescriptlang.org/docs/handbook/type-compatibility.html` opened. Last updated 2026-10-26.
2. The type system is unsound by design. Structural compatibility needs at least the target members.
3. `subset.md` "Records" treats a type as a datatype.
4. REFERENCE: declared fields are not a closed runtime record.
5. None.
6. Open: none.

### 16. Flow, 2017

1. arXiv `https://arxiv.org/abs/1708.08021` opened. Formal fragment proved sound. Scale "millions of lines" confirmed. Release v0.337.0 on GitHub, year not shown. Licence NR.
2. Constraint inference with refinements and effects.
3. None.
4. REFERENCE.
5. None.
6. Open: none.

### 17. Safe TypeScript

1. Microsoft Research PDF `https://www.microsoft.com/en-us/research/wp-content/uploads/2014/07/safets.pdf` downloaded. Title "Safe & Efficient Gradual Typing for TypeScript" (MSR-TR-2014-99) confirmed. "more than 100,000" confirmed.
2. Static checks plus runtime type information with simulation.
3. `design/exact-type-tests.md`.
4. REFERENCE: a boundary check changes failure behaviour.
5. None.
6. Open: none.

### 18. StrongScript

1. PDF `https://janvitek.org/pubs/ecoop15a.pdf` downloaded. "Concrete Types for TypeScript" confirmed. "Trace preservation" confirmed.
2. Dynamic, optional and concrete annotations.
3. `design/exact-type-tests.md`.
4. REFERENCE.
5. None.
6. Open: none.

### 19. Dependent JavaScript

1. PDF `https://cseweb.ucsd.edu/~rchugh/research/nested/djs.pdf` downloaded. Title "Dependent Types for JavaScript" confirmed. The "6,600" line count was not found in the text.
2. Nested refinements, strong updates, heap unrolling; explicit receiver in application (from the paper abstract).
3. `design/dynamic-record-reads.md`.
4. REFERENCE: receiver operand and key-set refinement.
5. None.
6. Open: the implementation size.

### 20. Siek and Taha, gradual typing

1. `https://scheme2006.cs.uchicago.edu/13-siek.pdf` downloaded. "Gradual Typing for Functional Languages" confirmed.
2. Casts inserted at the unknown-type boundary.
3. `design/exact-type-tests.md`.
4. REFERENCE: a cast is an operation with a failure.
5. None.
6. Open: none.

### 21. Typed Scheme, occurrence typing

1. PDF `https://www.cs.tufts.edu/~nr/cs257/archive/sam-tobin-hochstadt/typed-racket-popl-08.pdf` downloaded. "The Design and Implementation of Typed Scheme" confirmed. "2,700" line game confirmed.
2. Predicates refine a variable's type along control paths.
3. `design/exact-type-tests.md`.
4. REFERENCE, with item 39 as a caveat.
5. None.
6. Open: which refinements survive an effect.

### 22. Strict mode

1. `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode` opened. Arguments aliasing, `this` not boxed, and undeclared assignment throws, all confirmed.
2. Syntactic and runtime restrictions.
3. `subset.md` assumes module strictness through TypeScript.
4. REFERENCE: strict mode removes sloppy aliasing, which is the premise of item 27.
5. None.
6. Open: none.

### 23. ADsafety

1. USENIX PDF `https://www.usenix.org/event/sec11/tech/full_papers/Politz.pdf` downloaded. "1,800 LOC" and "20 seconds" confirmed. The "two cheats, 11 lines" figure was not found.
2. Type system plus a verified runtime (from the paper).
3. `translate/heap.mjs` prelude is trusted, not checked.
4. REFERENCE: verify the prelude helpers lean trusts. Residual trusted lines must be listed.
5. None now.
6. Open: which prelude functions carry trust.

### 24. Core-Cajita

1. `https://cs.stanford.edu/~ataly/Papers/sp10.pdf` download failed. UNVERIFIED.
2. Capability restriction (from the result, CLAIM).
3. None.
4. REFERENCE.
5. None.
6. Open: fetch the PDF from another mirror.

### 25. SES

1. `https://github.com/endojs/endo/tree/master/packages/ses` opened. npm `ses`. Stated limits quoted (indefinite run time, arbitrary memory). Licence not stated on the page.
2. Lockdown freezes intrinsics; compartments limit ambient authority.
3. `exec/run.mjs` runs candidates in a vm sandbox.
4. REFERENCE: harden lane B's sandbox. Adoption blocked until the licence is read.
5. Not adopted.
6. Open: the licence text in `LICENSE`.

### 26. ESLint `eqeqeq`

1. `https://eslint.org/docs/latest/rules/eqeqeq` and the source `https://github.com/eslint/eslint/blob/main/lib/rules/eqeqeq.js` opened. MIT.
2. The source decides the fix with `isTypeOfBinary(node) || areLiteralsAndSameType(node)`. Only then does it report a fix. Otherwise it reports a suggestion (`replaceOperator`).
3. `lint.mjs:806-809` refuses every `==` except against `null` or `undefined`. Rule `loose-equality`, message "use === and !==". `advice.mjs` `loose-equality` suggests `===`.
4. PORT of the precondition.
5. Input: the binary node and the two operand types. Output: a `proved` rewrite to `===` when one operand is a `typeof` expression or both are literals of one type, else a `migration` label. Cost: 1 day (CLAIM). Measurement: a pair with `typeof x == "number"`; corpus count of `loose-equality` findings on changed functions.
6. Open: whether the `null` exemption should also get a label.

### 27. ESLint `prefer-rest-params`

1. `https://eslint.org/docs/latest/rules/prefer-rest-params` and source `https://github.com/eslint/eslint/blob/main/lib/rules/prefer-rest-params.js` opened. The source has no `fixable` and no `hasSuggestions`. ESLint offers no fix.
2. Flags `arguments` except as `arguments.length`. Does not check aliasing or writes.
3. `lint.mjs:236` gives `global-read` for `arguments`. `arguments[0]` also gives `dynamic-key` (probe).
4. PORT of the advice, with a precondition ESLint does not check.
5. Input: the function's `arguments` uses. Output: a rewrite to a rest parameter only when every use is `arguments.length` or `arguments[<literal index>]` and the module is strict. Cost: 1 to 2 days (CLAIM). Measurement: corpus count of changed functions whose only refusal is `global-read` on `arguments`.
6. Open: rest parameters are still refused by `param-form` (`subset.md`). The rewrite needs that rule relaxed first.

### 28. ESLint `no-useless-call`

1. `https://eslint.org/docs/latest/rules/no-useless-call` and source opened. No `fixable`, no `hasSuggestions`. ESLint reports only.
2. Flags `.call` and `.apply` whose `thisArg` token-equals the object, or is `null` or `undefined`. Compares tokens statically.
3. Lean has no rule. Probe: `h.call(o, 1)` is admitted by lint and refused by translate ("`this` outside a class method").
4. PORT of the precondition.
5. Input: the call node and the receiver expression. Output: a direct call when the `thisArg` is the same token as the receiver. Otherwise a `migration` label. Cost: 2 days (CLAIM). Measurement: a pair with `h.call(o, 1)` and `o.h(1)`; corpus count of `.call` or `.apply` in changed functions.
6. Open: `bind` has no ESLint rule. The lean rule for `bind` is still open.

### 29. Feldthaus et al., refactoring

1. PDF `https://cs.au.dk/~amoeller/papers/jsrefactor/paper.pdf` downloaded. "Tool-supported Refactoring for JavaScript" confirmed. "50 benchmark programs" not found by grep.
2. Analysis-derived preconditions gate each codemod.
3. `lint/advice.mjs` gives text, not preconditions.
4. REFERENCE: attach a precondition and a named rejection to each rewrite.
5. None.
6. Open: none.

### 30. Livshits, Whaley and Lam, 2005

1. `https://suif.stanford.edu/~jwhaley/papers/aplas05r.pdf`: fetch with the summarizer failed with a certificate error. Not opened. UNVERIFIED.
2. Reflection analysis with user specifications (from the result, CLAIM).
3. `lint.mjs:28`.
4. REFERENCE: conservative summaries only.
5. None.
6. Open: fetch the PDF.

### 31. SOLAR, 2015

1. PDF `https://cs.nju.edu.cn/yueli/papers/SAS15.pdf` downloaded. Title "Effective Soundness-Guided Reflection Analysis" confirmed. "all 13 unsound" phrase confirmed in the text.
2. Conditional soundness with per-call checks (from the result, CLAIM).
3. `lint/lint.mjs` report names the rule and line only.
4. REFERENCE: name the failed obligation at each operation.
5. None.
6. Open: none.

### 32. TamiFlex, 2011

1. `https://dl.acm.org/doi/pdf/10.1145/1985793.1985827` returned HTTP 403. UNVERIFIED.
2. Logs reflective targets and materializes them (from the result, CLAIM).
3. None.
4. REFERENCE: logs give witnesses, not PASS.
5. None.
6. Open: access route.

### 33. Python abstract interpretation (MOPSA)

1. `https://mopsa.lip6.fr/publications/nfm18`: fetch failed. UNVERIFIED.
2. Abstract interpretation of a Python subset (from the result, CLAIM).
3. None.
4. REFERENCE: state unsupported boundaries.
5. None.
6. Open: fetch the paper.

### 34. Hummingbird, 2016

1. arXiv `https://arxiv.org/abs/1604.03641` opened. "Just-in-Time Static Type Checking for Dynamic Languages" confirmed. Claim quoted: "When a method is called, Hummingbird statically type checks the method body against current type signatures."
2. Checks at method entry, so generated methods gain types before use.
3. `design/research-integration.md` section 5 and the phases in `exact-type-tests.md`.
4. REFERENCE: staged admission, invalidated when a definition changes.
5. None.
6. Open: none.

### 35. .NET trim analysis

1. `https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings` opened. Updated 2025-11-19. `DynamicallyAccessedMembers`, `RequiresUnreferencedCode`, and suppression as last resort all confirmed.
2. Preservation annotations for reflective access.
3. `lint/advice.mjs` gives text.
4. REFERENCE: operation-specific requirements. A suppression is not a proof.
5. None.
6. Open: none.

### 36. Jelly

1. `https://github.com/cs-au-dk/jelly` opened. BSD-3-Clause. "intentionally not fully soundly" confirmed. Install via `npm install -g @cs-au-dk/jelly`. Release 0.13.0, year not shown.
2. Flow-insensitive call graph with access paths (from the README).
3. None.
4. REFERENCE: discovery and slicing only.
5. Not used for PASS. A future triage step could list the functions a changed unit reaches.
6. Open: none that changes the verdict.

### 37. Eq@DFuzz, February 2026

1. arXiv `https://arxiv.org/abs/2602.15761` opened. "about 21% of these non-equivalent refactorings remain undetected by the existing test suites" confirmed. Dates 17 February 2026. Dataset sizes not stated on the page.
2. Differential fuzzing over generated inputs.
3. `exec/run.mjs` is lane B's runner.
4. REFERENCE: strengthen WITNESS generation; keep ASK after agreement.
5. None.
6. Open: the dataset sizes the result cites are UNVERIFIED.

### 38. TypeScript fault study, 2026

1. `https://arxiv.org/abs/2601.21186` opened. 633 bug reports, 16 repositories confirmed. Dominant faults are tooling and configuration.
2. Classifies bug reports.
3. None.
4. IRRELEVANT: the study does not test feature bans.
5. None.
6. Open: none.

### 39. Occurrence-typing soundness revisit, 2026

1. `https://arxiv.org/abs/2609.16299` opened. Submitted 14 September 2026. Flaws in the 2010 calculus confirmed. Lean formalization confirmed.
2. Semantic soundness with step-indexed logical relations.
3. `design/exact-type-tests.md`.
4. REFERENCE: track the exact theorem version.
5. None.
6. Open: which theorem version lean relies on.

### 40. Modern-feature adoption, 2025

1. Springer PDF `https://link.springer.com/content/pdf/10.1007/s10664-025-10663-9.pdf` returned HTML, not PDF. UNVERIFIED.
2. Mines histories of 158 projects (from the result, CLAIM).
3. None.
4. IRRELEVANT: adoption is not semantic preservation.
5. None.
6. Open: none.

## Per-feature admission table

Lint column is verified by probe unless marked CLAIM. Dafny operands are proposals over lean's World and HWorld (`translate/heap.mjs`).

| Feature | Lint today (rule, file:line) | Explicit operand that admits it | Precondition | ESLint fix precondition | Measurement |
|---|---|---|---|---|---|
| Prototype read `getPrototypeOf` | Admitted (no rule). Gap. | `proto: Ref` on each record cell; `getPrototypeOf` reads it | Object provenance known; the proto is in the ledger and never changed after escape | none | Refuse-by-rule count plus the false-PASS pair above |
| Prototype read `x.__proto__`, `.prototype`, `.constructor` | Refused, `prototype`, `lint.mjs:1164`, `:1189` | same as above | same | none | count of `prototype` refusals on changed functions |
| Prototype mutation `setPrototypeOf` | CLAIM: admitted by the `Object` route (not probed) | `proto` written by a transition | Mutation before first escape, or the full set of possible prototypes modeled | none | probe needed |
| `Object.create(p)` | Admitted (probe `create.ts`). Gap. | Allocation with `proto := p` | Fixed known `p`, including `null` | none | count of `Object.create` in changed functions |
| `Object.defineProperty` | Admitted (probe). Lane B catches a parameter change (WITNESS). | Descriptor cell per key, or refuse | Data descriptor with covered attributes; no accessor | none | WITNESS count plus refusal count |
| `Proxy` | Refused, `prototype`, `lint.mjs:28` | Not modeled | Refuse until an interception summary exists | none | count of `Proxy` refusals |
| `Reflect` | Refused, `prototype`, `lint.mjs:28` | Operation-specific: `Reflect.get` as a dictionary read with receiver | Per-operation contract; not all of `Reflect` | none | count per operation |
| `eval` / `Function` | Refused, `dynamic-eval`, `lint.mjs:28`, `:722` | Constant-string parse only (Unevalizer PORT) | String is a literal; scope is the module | none | count of `eval` in changed functions; probably near zero |
| `call` / `apply` | Admitted by lint (no rule). Translate refuses on `this` in a free function. Lint and translator disagree. | `receiver: Value` as a call operand; the argument sequence as `seq` | Receiver token-equal to the declared receiver, else a migration label | eqeqeq-style: none. ESLint `no-useless-call` checks token equality of `thisArg` with the receiver; ESLint has no fix | count of `.call`/`.apply` in changed functions |
| `bind` | Admitted by lint (no rule). Translator untested. | A bound closure: `Fn(code, env, receiver, args)` | Explicit bound target and arguments; covered uses only | none | UNVERIFIED |
| `arguments` | Refused, `global-read`, `lint.mjs:236`; `arguments[0]` also `dynamic-key` | `args: seq<Value>` (actual vector) | Module is strict; uses are `arguments.length` or literal-index reads | ESLint `prefer-rest-params` checks only `arguments` uses (`isNotNormalMemberAccess`); no fix; no aliasing check | count of changed functions refused only by `global-read` on `arguments` |
| Computed read `r[k]`, `k: string`, record with no string index | Refused, `dynamic-key`, `lint.mjs:1189` area; `subset.md` | Finite-key switch, or a dictionary cell with a missing-key default | Key set is a finite union, or the type has a string index and no declared fields | none | count of `dynamic-key` on reads |
| Computed read on a dictionary | Admitted (probe `compkey.ts`) | Dictionary map read with missing-key default | Missing key returns the default, never a fault | none | count |
| Computed creation `{ [k]: v }` on a `Record<string, T>` | Admitted (probe). On a non-dictionary type refused, `lint.mjs:748`. | Dictionary cell: `Dict(map: map<string, Value>)` | Literal typed as a dictionary; keys are strings | none | count |
| Loose equality `==` / `!=` | Refused, `loose-equality`, `lint.mjs:806-809`, except against `null`/`undefined` | `Coerce(a, b)`: the exact ECMAScript primitive table; an object operand is an obligation | Both operands are one proven primitive type (then `===`); or an object operand is refused | ESLint `eqeqeq`: fix only if one operand is `typeof` or both are literals of one type; else suggestion | count of `loose-equality` on changed functions; split by fixable and not |
| Class-based abstraction (inheritance, `super` as value) | Refused, `class` / `inheritance`, `lint.mjs:307`, `:716`, `:717`; same-file classes admitted with fields in the world (`subset.md` "Classes") | `proto` edge to the parent class prototype, fixed | Fixed prototype chain; no mutation after escape | none | count of `class` and `inheritance` refusals |

## Measurement: rule-alone refusal count

`harness/score_lean.py` does not count refusals per rule. It counts defects caught as WITNESS on fix functions (43 design, 101 held-out). It cannot answer the refusal-economics question.

Proposed script, not written: for each key in `corpus.json` (144 entries), run `lint.mjs <file> --changed <ranges.json> --json` on the parent and candidate files, collect the changed-function findings, and tabulate per rule. Count a function as "refused by rule R alone" when R is its only finding. Report per rule: functions refused alone, functions also refused by another rule, and the share of changed functions in the corpus. Keep this out of `score_lean.py` so the defect score is unchanged.

## Open questions

- Should `Object.getPrototypeOf`, `Object.create`, `Object.setPrototypeOf`, and `Object.defineProperty` be refused by name now? This is the one finding that changes a PASS.
- The `this`-in-free-function gap: should lint refuse `this` in a function with a `this` parameter, to match the translator?
- Does lane B need a null-prototype and a replaced-prototype generator before any prototype-reading unit may return PASS-bounded?
- Which corpus functions use `.call`, `.apply`, `.bind` on same-file functions? Unmeasured.
- Unfetched sources: DiTU, TamiFlex (ACM 403); MOPSA (fetch failed); Core-Cajita (download failed); Livshits (not fetched); the 2025 modern-feature study (HTML only).

## Blocker

Blocked on primary sources: ACM (DiTU, TamiFlex) returned HTTP 403; Core-Cajita, MOPSA, Livshits and the 2025 adoption study were not opened. Their entries are UNVERIFIED. No edits were made to any other file.
