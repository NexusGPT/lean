# Escaping functions: what lean takes from each named element

Scope: every system or method the research result "Deciding Equivalence When Programs Export Future Control" names (33 numbered systems plus closure conversion and defunctionalization from its prose). Source for the list: `/Users/assem/Downloads/Deciding Equivalence When Programs Export Future Control.md`.

Evidence rule used here. "Opened" means this session fetched the primary artifact. Where the fetch tool could not read a PDF, the entry says UNVERIFIED and gives only the metadata that was readable. No claim from the research result is repeated as verified.

Dates and licences are as the artifact states them. GitHub metadata came from the GitHub API on 2026-10-26.

## Summary table

| # | Name | Verdict | Where in lean | One-line how |
|---|---|---|---|---|
| 1 | HECTOR | REFERENCE | check.mjs:58 (Dafny call) | Separating-context extraction shape for the witness format; no code taken |
| 2 | HOMER | REFERENCE | run.mjs witness output | Operational separating context from a distinguishing play; idea only |
| 3 | CONEQCT | IRRELEVANT | none | No licence, F#/.NET, last push 2021-02-15 |
| 4 | SyTeCi | REFERENCE | translate.mjs:2112 (opaqueFn) | Symbolic closure and store model; artifact not verified |
| 5 | HOBBIT | PORT | fake.mjs:137, fake.mjs:205 | Opponent-known callable table with an explicit ASK on bound exhaustion |
| 6 | PDNF-BISIM | REFERENCE | none | Stackless saturation; no tool link, so design input only |
| 7 | Operational algorithmic game semantics | REFERENCE | none | Trace-alphabet refinement; no runnable tool |
| 8 | F* reified relational verification | REFERENCE | none | Relational proof for effects needs annotation; not usable here |
| 9 | ReLoC Reloaded | REFERENCE | none | Coq/Iris, not node or python |
| 10 | Iris relational continuations | REFERENCE | none | Coq, not node or python |
| 11 | Interaction Trees | REFERENCE | none | Coq library (MIT); event-tree model of exported calls |
| 12 | Choice Trees | REFERENCE | none | Coq; explicit nondeterminism; DOI resolved only |
| 13 | OCPL | IRRELEVANT | none | Capability safety, not equality (judged from the research text; paper unread) |
| 14 | Loring-Marron-Leijen Node.js semantics | REFERENCE | lane B timers (run.mjs:117-120) | Queue policy as part of the theorem; paper unread |
| 15 | lambda_p promise graphs | REFERENCE | promise-forms.mjs | Promise reaction graph model; paper unread |
| 16 | P | REFERENCE | none | Ghost environment as state machine; paper unread |
| 17 | Ivy | REFERENCE | none | First-order invariants; paper unread |
| 18 | mCRL2 ltscompare | REFERENCE | none | Exact LTS backend if a licence is stated; licence not on the opened page |
| 19 | Coyote | REFERENCE | run.mjs:248 (replay record) | .NET library (MIT); replay trace as a witness record idea |
| 20 | Nekara | REFERENCE | none | Scheduler separated from integrations; repository not found |
| 21 | CHESS | REFERENCE | none | Preemption-bounded search idea; paper unread |
| 22 | NodeRacer | REFERENCE | lane B timers | Event postponement; Apache-2.0 repo, paper unread |
| 23 | nacd | REFERENCE | lane B timers | Delay injection; repo has no licence |
| 24 | QuickCheck Fun | IRRELEVANT | gen.mjs | Haskell library; shrinkable function tables covered by fast-check |
| 25 | fast-check Scheduler | REFERENCE | none (part of item 26's package) | Controlled promise order; warns about uncontrolled async, so not used |
| 26 | fast-check model-based commands | DEPENDENCY | new file langs/ts/exec/program.mjs (lane B) | `fc.commands` plus `modelRun` generate and shrink environment programs |
| 27 | Jest fake timers | PORT | run.mjs:117-120, fake.mjs | Virtual clock with `tick`, `runOnlyPendingTimers` and a stated budget |
| 28 | Node test MockTimers | PORT | run.mjs:113 (fixedNow), run.mjs:117-120 | Clock semantics: `tick` runs due timers, `setTime` runs nothing until `tick(0)` |
| 29 | Rust closure traits | REFERENCE | none | `FnOnce` does not prove exactly-once invocation |
| 30 | OCaml 5 effects | REFERENCE | none | One-shot continuations; no runtime use |
| 31 | Koka | REFERENCE | none | Effect rows say what a callback may do, not how often |
| 32 | Effekt | REFERENCE | none | Purity contracts for callback parameters |
| 33 | Ownership-restricted translation with MoCHi | REFERENCE | none | Closed reachability is not contextual equivalence |
| 34 | Closure conversion | PORT | translate.mjs:189-210, translate.mjs:807, translate.mjs:1381-1384, translate.mjs:2112 | A function value becomes `Fn(code, env)`, replacing the text-keyed opaque value |
| 35 | Defunctionalization | REFERENCE | none (settles item 34's dispatcher) | Dispatcher over a closed set of code ids; an unknown function is ASK |

Count by verdict: DEPENDENCY 1 (item 26). PORT 4 (items 5, 27, 28, 34). IRRELEVANT 3 (items 3, 13, 24). REFERENCE 27 (all others). Total 35.

Blocker: none that stops the dossier. Four PDF papers (items 1, 2, 12, 21) and several more (items 7-10, 13-17, 29, 30) were not readable through the fetch tool. Those entries are marked UNVERIFIED, and their verdicts rest on the research text alone where stated.

---

## Per-item notes

### 1. HECTOR

1. **What it is.** Contextual-equivalence checker for an O-strict fragment of RML, via visibly pushdown automata. Opened: `https://www.cs.ox.ac.uk/files/4786/cav12.pdf`. The fetch returned compressed PDF bytes, so the title, authors and licence are UNVERIFIED. Repository, licence and last-release date: not located, UNVERIFIED.
2. **Mechanism.** Compiles a game-semantic interaction model of an O-strict program and its context into visibly pushdown automata, then compares them. A negative answer can be turned into a separating context. Per the research text (CLAIM, not read): sound and complete for its fragment, EXPTIME-complete.
3. **Lean today.** check.mjs:58 runs `dafny verify` on one theorem per unit. No automata are built.
4. **Verdict.** REFERENCE. It settles that a separating context is a usable witness format.
5. **How.** Not applicable.
6. **Open questions.** Read the paper text to confirm the separating-context claim before lean's witness format cites it.

### 2. HOMER

1. **What it is.** A fully abstract game model for third-order Idealized Algol with iteration. Opened: `https://www.cs.ox.ac.uk/files/2593/RR-09-14.pdf`. Title read: "Homer: a Higher-order Observational equivalence Model checkER", D. Hopkins, 2009 (year read from document metadata). The fetched text stopped after the title and author. Licence: not stated in what was read.
2. **Mechanism.** Per the research text (CLAIM, not read in the artifact): it compiles call-by-name game models to visibly pushdown automata and produces separating contexts from distinguishing plays.
3. **Lean today.** run.mjs witness output (run.mjs:287-291) gives an input index and two observations, not a program.
4. **Verdict.** REFERENCE. The separating-context idea motivates the program witness in section (d).
5. **How.** Not applicable.
6. **Open questions.** Is the Idealized Algol fragment close enough to call-by-value TypeScript to matter? Expected answer: no, but UNVERIFIED.

### 3. CONEQCT

1. **What it is.** Contextual equivalence for an interface object calculus IMJ*. Opened: `https://api.github.com/repos/sjrsay/coneqct` (metadata). Licence: none stated (GitHub reports no licence). Last push: 2021-02-15. Description: empty.
2. **Mechanism.** Per the research text (CLAIM): game interaction with fresh-register pushdown automata. Not read in source.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT. It has no licence, so lean cannot take code. It is also a 2021 research artifact in a different language family, so the theory adds nothing lean can run.
5. **How.** Not applicable.
6. **Open questions.** None for lean.

### 4. SyTeCi

1. **What it is.** Symbolic contextual-equivalence checker for call-by-value higher-order programs with integer references. Artifact: prototype, DOI in the research text. The body of the research cites `10.1145/3373111`; the reference list cites `10.1145/3371127`. The ACM page returned HTTP 403, so neither DOI resolved. Title and licence: UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): reduces equivalence to non-reachability over memory configurations, with a constrained-Horn-clause route for programs without reference allocation in function bodies.
3. **Lean today.** translate.mjs:2112 (`opaqueFn`) treats a non-pure function value as an opaque text token.
4. **Verdict.** REFERENCE. The symbolic-store model matches lean's ledger idea, but no artifact was opened.
5. **How.** Not applicable.
6. **Open questions.** Which DOI is correct? Does the artifact build? Both UNVERIFIED.

### 5. HOBBIT

1. **What it is.** Higher-order bounded bisimulation tool for an ML-like language. Opened: `https://github.com/LaifsV1/Hobbit` (README via fetch, metadata via GitHub API). Licence: MIT. Default branch `main`, last push 2024-06-18, not archived.
2. **Mechanism.** From the README: input is two ML-like expressions separated by `|||`. Options include `-b` (exploration bound, default 6), `-u` (up-to techniques), `-t` (BFS or DFS), `-p` (max pending configurations) and `-m` (max remembered). The README says a bound hit gives an inconclusive result, and exceeding `-p` is a runtime error. It maintains an opponent-known collection of functions and alternates program and opponent moves.
3. **Lean today.** fake.mjs:137 invokes a callback argument once, synchronously, with two fake arguments, then never again. fake.mjs:186 and fake.mjs:205 identify a function value by its source hash (`fnHash`), so the same text stands for every closure. That is the text-token problem the research describes.
4. **Verdict.** PORT. The tool is OCaml with opam and Z3, not node or python, so it cannot be called as a DEPENDENCY from lane B.
5. **How.**
   - Files: fake.mjs (a new `knownCallables` table next to `pending` at fake.mjs:32), run.mjs (`observe` at run.mjs:248 gets the table in its observation).
   - Data in: each escaped function, with a logical id and its captured cells. Data out: a retained handle the program can invoke again, and an ASK when the program exceeds the bound.
   - What it gains: a repeated invocation is a logged transition, not a single call. Exhausted bounds become ASK, as HOBBIT does.
   - Cost: 8 to 12 days (CLAIM).
   - Validation: the callbacks, function_values and promise_forms pairs under langs/ts/tests/pairs/.
6. **Open questions.** HOBBIT's `-p` limit is an error, not an ASK. lean should map that to ASK, not copy the error.

### 6. PDNF-BISIM

1. **What it is.** Pushdown normal-form bisimulation for contextual equivalence with local state. Opened: `https://arxiv.org/abs/2311.01325`. Title: "Pushdown Normal-Form Bisimulation: A Nominal Context-Free Approach to Program Equivalence". Authors: Koutavas, Lin, Tzevelekos. Submitted 2 November 2023. Licence: CC BY 4.0 (arXiv page). No tool link on the page.
2. **Mechanism.** From the abstract: saturates possible call-stack behaviour instead of tracking one concrete stack. Sound and complete for contextual equivalence. Decidable for terms with bounded configurations and unbounded stacks. The authors built a prototype, not linked.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. No prototype is available, so there is nothing to call or port.
5. **How.** Not applicable.
6. **Open questions.** Does the prototype exist publicly? Not stated on the arXiv page.

### 7. Operational algorithmic game semantics

1. **What it is.** Operational game semantics for a finitary call-by-push-value language. Source: research text cites `https://www.cs.ox.ac.uk/andrzej.murawski/papers/oags-aam.pdf`; not opened. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): visibly pushdown automata for a refined interaction model.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** Read the paper before any claim about trace alphabets is used.

### 8. F* reified relational verification

1. **What it is.** Relational verification of effectful F* programs through reified effects. Not opened. The research text cites arXiv 1703.00055 for the monadic framework; that paper was not fetched. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): state computations as `memory -> Tot(result * memory)`, with relational properties proved by SMT.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. Relational proofs per callback need annotations, which lean's per-unit Dafny lemmas (check.mjs:58) already avoid.
5. **How.** Not applicable.
6. **Open questions.** None for now.

### 9. ReLoC Reloaded

1. **What it is.** Relational logic in Coq and Iris for concurrent components. Not opened: the LMCS URL in the research text was not fetched. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): contextual refinement for concurrent components.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. Coq and Iris are not node or python, and a proof per changed callback would cost far more than lane A.
5. **How.** Not applicable.
6. **Open questions.** None.

### 10. Iris relational continuations

1. **What it is.** 2019 Coq development with first-class continuations. Opened: `https://iris-project.org/pdfs/2019-icfp-logrelcc-final.pdf`. The PDF was not readable through the fetch tool. UNVERIFIED beyond the URL.
2. **Mechanism.** Per the research text (CLAIM): an Iris logical relation with continuations as part of the relation.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It is the right reference if lean ever admits re-entry of continuations.
5. **How.** Not applicable.
6. **Open questions.** The research text gives about 15,800 lines of Coq (CLAIM, not read).

### 11. Interaction Trees

1. **What it is.** Coq library for recursive impure programs with event trees. Opened: `https://api.github.com/repos/DeepSpec/InteractionTrees` (metadata). Licence: MIT. Last push: 2026-10-18.
2. **Mechanism.** Per the research text (CLAIM): represents exported calls as visible events with resumptions, and proves strong and weak bisimulation. Repository not read beyond metadata.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. Coq is not node or python. The event-with-resumption shape is the closest model for item 34's `Fn` plus `invoke`.
5. **How.** Not applicable.
6. **Open questions.** None.

### 12. Choice Trees

1. **What it is.** Coq model of nondeterministic recursive programs. Opened only the DOI annotation: `https://doi.org/10.1145/3571254`. ACM metadata reads 2023. Title and authors: UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): explicit nondeterministic branching with strong and weak bisimulation.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It would matter if lean models environment choice as a branch rather than as a command.
5. **How.** Not applicable.
6. **Open questions.** Confirm the title and venue from the DOI page.

### 13. OCPL

1. **What it is.** Object-capability safety logic in Coq and Iris. Not opened: the PDF URL in the research text was not fetched. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): robust safety and invariant preservation, not equality.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT as a standalone equality checker. This verdict rests on the research text's description, not on the paper, and is labelled as such.
5. **How.** Not applicable.
6. **Open questions.** None for lean.

### 14. Loring-Marron-Leijen Node.js semantics

1. **What it is.** Operational semantics for asynchronous Node.js in a 2017 technical report. Source URL: `https://www.microsoft.com/en-us/research/wp-content/uploads/2017/08/asyncNodeSemantics.pdf`. Not opened. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): priority-sensitive callback and promise structures with scheduling categories.
3. **Lean today.** run.mjs:117-120 records `setTimeout`, `setInterval` and `setImmediate` into `env.pending` with no ordering. That is a flat bag, which is the gap this model addresses.
4. **Verdict.** REFERENCE. It is the spec to read before lane B models timer order.
5. **How.** Not applicable.
6. **Open questions. Which Node version does the report describe?** It is dated 2017, so it cannot describe current Node. UNVERIFIED.

### 15. lambda_p promise graphs

1. **What it is.** Promise semantics for ES6 with a promise graph. Research text cites OOPSLA 2017, "A Model for Reasoning About JavaScript Promises". The fetched PDF was unreadable. A DOI annotation resolved to `10.1145/3133910`. Title confirmed only by the research text. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): promise reactions are asynchronous and their results settle dependent promises.
3. **Lean today.** promise-forms.mjs (`promiseForm`, line 6) recognizes promise shapes in lane A.
4. **Verdict.** REFERENCE. It settles that a promise executor is a protocol, not a single call.
5. **How.** Not applicable.
6. **Open questions.** Read the paper before lane A models a dependent promise.

### 16. P

1. **What it is.** Asynchronous event-driven language with ghost machines. Opened: `https://people.csail.mit.edu/zufferey/files/2013_P_safe_asynchronous_event-driven_programming.pdf`. Not readable through the fetch tool. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): communicating state machines with nondeterministic ghost machines as the environment.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. The ghost machine is the environment-program idea in section (d).
5. **How.** Not applicable.
6. **Open questions.** None.

### 17. Ivy

1. **What it is.** Protocol verification tool for first-order relational state. Opened: `https://www.wisdom.weizmann.ac.il/~padon/ivy.pdf`. Not readable through the fetch tool. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): bounded invariance and inductive reasoning with finite countermodels.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. Callback handles would need an encoding as protocol state first.
5. **How.** Not applicable.
6. **Open questions.** None.

### 18. mCRL2 ltscompare

1. **What it is.** Equivalence checker for explicit labelled transition systems. Opened: `https://mcrl2.org/web/user_manual/tools/release/ltscompare.html`. Version shown: 202607.0. Licence: the page gives only a copyright line (TU/e, 2011-2026) and no licence. Repository metadata via GitHub: not found under the name tried.
2. **Mechanism.** From the page: reads `.aut`, `.fsm` and `.lts` inputs. Equivalences include `bisim` (several algorithms), `branching-bisim`, `dpbranching-bisim`, `weak-bisim`, `dpweak-bisim`, `sim`, `trace` and `weak-trace`. With `-c` it writes a Hennessy-Milner formula for `bisim`, `branching-bisim` and `trace`.
3. **Lean today.** Not applicable. lean has no LTS export.
4. **Verdict.** REFERENCE, blocked. It would be a DEPENDENCY if its licence allows use, but the opened page does not state one.
5. **How.** If the licence is confirmed permissive: lane B exports the extracted interaction system as `.aut`, runs `ltscompare -c`, and reads the formula as the witness. Cost 5 to 7 days (CLAIM). Validation: the callbacks pair.
6. **Open questions. What licence does mCRL2 ship under?** The page does not say. Blocker for DEPENDENCY.

### 19. Coyote

1. **What it is.** Controlled concurrency testing and deterministic replay for C# and .NET. Opened: `https://api.github.com/repos/microsoft/coyote` (metadata) and the repository LICENSE file, which reads MIT. Last push: 2026-10-24. Description: "a library and tool for testing concurrent C# code".
2. **Mechanism.** From the repository description: controls concurrency operations of compiled .NET binaries, reproduces failures from a recorded schedule. Source code beyond the description not read.
3. **Lean today.** run.mjs:248 records the observation (outcome, graph, receiver, trace, pending). It does not record a schedule.
4. **Verdict.** REFERENCE. The runtime is .NET, so it cannot be called from node or python. The schedule-replay record is the idea to take.
5. **How.** Not applicable.
6. **Open questions.** None.

### 20. Nekara

1. **What it is.** Library for building systematic concurrency testers, with separate scheduler and integrations. Opened: `https://github.com/microsoft/nekara` returned HTTP 404; a GitHub search found no main repository; `p-org/ControlledFolly` (archived 2022-08-26) is the only related repository found. Paper URL in the research text not fetched. UNVERIFIED.
2. **Mechanism.** From the web search summary (not the paper): a scheduler explores interleavings of operations, with a server-client split between testing logic and the programming interface.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. The separation of scheduler from frontend supports the design of lane B's command set. No code is taken.
5. **How.** Not applicable.
6. **Open questions. Where is the main repository, and under what licence?** Not found.

### 21. CHESS

1. **What it is.** Systematic interleaving search for .NET tests. Opened: `https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/osdi2008-CHESS.pdf`. Not readable through the fetch tool. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): explores interleavings with bounded preemptions and replays a found bug.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. Preemption bounds are the search-priority idea for lane B. A finite search that finds nothing stays ASK.
5. **How.** Not applicable.
6. **Open questions. The research text's interleaving counts are UNVERIFIED.**

### 22. NodeRacer

1. **What it is.** Event-race detection for Node.js by postponing asynchronous events. Opened: `https://api.github.com/repos/andreendo/noderacer` (metadata). Licence: Apache-2.0. Last push: 2023-03-03. Paper URL `https://users-cs.au.dk/~amoeller/papers/noderacer/paper.pdf` not readable through the fetch tool. UNVERIFIED beyond metadata.
2. **Mechanism.** Per the research text (CLAIM): selective postponement of asynchronous events, using happens-before information.
3. **Lean today.** run.mjs:117-120 has no postponement at all. Timers are only recorded.
4. **Verdict.** REFERENCE. Lane B has no event queue that postponement could act on yet.
5. **How.** Not applicable.
6. **Open questions. Does the repository run on the node v24.18.0 this machine has?** UNVERIFIED.

### 23. nacd

1. **What it is.** Node.js event race detector using delay injection. Opened: `https://github.com/andreendo/nacd` (README via fetch) and the GitHub API. Licence: none stated (README and API). Last push: 2025-06-25.
2. **Mechanism.** From the README: JavaScript, installed with `npm install` and `npm link`. Modes include `nacd never` (instrumentation only) and `nacd plain2` (default, with delays). `npm test` takes about 2 minutes. The benchmark is the NodeRacer study, and the motivating example is a fs-extra flaky test. The README recommends Node v10 for some benchmarks.
3. **Lean today.** run.mjs:117-120 has no delays.
4. **Verdict.** REFERENCE. It has no licence, so lean cannot take code. The delay-injection idea can still be taken.
5. **How.** Not applicable.
6. **Open questions.** The research text names a transform-stream limitation. The README does not mention it. That claim is not verified here. The ECOOP 2025 paper was not readable.

### 24. QuickCheck Fun

1. **What it is.** Haskell generator for function-typed inputs in QuickCheck. Opened: `https://hackage-content.haskell.org/package/QuickCheck-2.16.0.0/docs/Test-QuickCheck-Function.html` was in the research text but not fetched. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): generates functions with a printable table form and a default case.
3. **Lean today.** gen.mjs generates typed inputs from a spec, seeded (gen.mjs:1-5). It does not generate callable inputs as tables.
4. **Verdict.** IRRELEVANT as a library: lean does not run Haskell. The table-of-function idea is covered by fast-check's `fc.func` in item 26's package. This is an inference, not checked.
5. **How.** Not applicable.
6. **Open questions.** None.

### 25. fast-check Scheduler

1. **What it is.** Controlled ordering of promise resolution, from fast-check. Opened: `https://fast-check.dev/docs/api/interfaces/Scheduler/` (fetch) and `https://api.github.com/repos/dubzzz/fast-check` (MIT, last push 2026-10-26). npm `fast-check` 4.10.2, MIT, modified 2026-09-19 (npm view with a scratch cache).
2. **Mechanism.** From the page: `schedule` wraps a promise, `scheduleFunction` wraps an async function, `waitNext(n)` runs exactly n tasks, `waitIdle()` runs until no scheduled or reachable task remains, `report()` lists tasks in execution order. The page warns that uncontrolled async work cannot be detected or awaited, so `waitIdle` may be incomplete.
3. **Lean today.** run.mjs:235-237 drains microtasks with two `setImmediate` turns, a fixed approximation. lean has no controlled queue.
4. **Verdict.** REFERENCE. lean needs a pending model with enabling rules. The Scheduler cannot see uncontrolled async work, so it does not give the claim that lean needs. It ships in the same package as item 26, so it comes for free if item 26 is adopted, but it is not used.
5. **How.** Not applicable.
6. **Open questions. Does the Scheduler's report format help the witness log?** Possibly, for timer and promise order. Not decided.

### 26. fast-check model-based commands

1. **What it is.** Model-based command testing with shrinking and replay, from fast-check. Opened: `https://fast-check.dev/docs/advanced/model-based-testing` (fetch) and the npm package (4.10.2, MIT).
2. **Mechanism.** From the page: `fc.commands(commands)` generates a sequence. Each command has `check(model)`, `run(model, real)` and `toString()`. Runners are `fc.modelRun` (synchronous), `fc.asyncModelRun` (asynchronous) and `fc.scheduledModelRun` (scheduled). Failures report a seed, a path and a `replayPath`, and shrinking skips commands that did not run. The page's example reports "Property failed after 97 tests" with one shrink.
3. **Lean today.** Lane B runs one call per input (run.mjs:265-290). It has no command sequence, no retained handles and no shrinking of a program.
4. **Verdict.** DEPENDENCY. The package is node, MIT, and runs under the node v24.18.0 on this machine.
5. **How.**
   - Vendor the package under langs/ts/vendor/fast-check, with its MIT licence file, the same way langs/ts/vendor/typescript is kept. The repository root has no package.json.
   - New file langs/ts/exec/program.mjs: one `ICommand` class per legal operation (`call`, `retain`, `invoke`, `tick`, `settle`, `fire`, `next`, `throw`, `return`). Each command runs on the sandbox from run.mjs:110-121.
   - Data in: the unit spec (spec.mjs) and the seed. Data out: a program, its `replayPath`, and the two observations.
   - What it gains: shrinking of environment programs and a replayable failure, neither of which lane B has.
   - Cost: 8 to 12 days (CLAIM).
   - Validation: the callbacks, function_values, effectful_callbacks and promise_forms pairs under langs/ts/tests/pairs/. The research text's 262 return/store/compare cases are its own count, not measured here.
6. **Open questions.** Does fast-check need a Node version newer than v24? UNVERIFIED. Does `fc.modelRun` run a vm sandbox correctly? Test first.

### 27. Jest fake timers

1. **What it is.** Fake timer controls in the Jest test framework. Opened: `https://jestjs.io/docs/timer-mocks` (fetch; page states version 30.5), npm `jest` 30.5.2 (MIT, modified 2026-09-18), GitHub `jestjs/jest` (MIT, last push 2026-10-24).
2. **Mechanism.** From the page: `jest.useFakeTimers` replaces timer globals. `advanceTimersByTime(ms)` runs timers due within the window, including ones they arm inside it. `runAllTimers` runs all timers and throws "Aborting after running 100000 timers, assuming an infinite loop!". `runOnlyPendingTimers` runs only the timers pending at the call.
3. **Lean today.** Timers are recorded, never run (run.mjs:117-119). `clearTimeout` and `clearInterval` are recorded as calls and do not remove the pending entry (run.mjs:120). The date is fixed (run.mjs:113).
4. **Verdict.** PORT. Jest is a test framework, and the package is not a clock for lean's vm sandbox. The semantics are what to copy.
5. **How.**
   - Files: fake.mjs (a `clock` on `Environment`, next to `pending` at fake.mjs:32) and run.mjs (the `setTimeout` lines 117-119 push to the clock instead of `pending`).
   - Data in: a command `tick(ms)`. Data out: due timers fire in order, each firing is a trace entry, and the pending set shrinks.
   - Budget: `runAll` gets a count limit. Hitting it is ASK, the same discipline as the 100000 limit.
   - Cost: 3 to 5 days (CLAIM).
   - Validation: the pairs `clock` and `promise_fallback` under langs/ts/tests/pairs/.
6. **Open questions.** Should `clearTimeout` remove the pending entry? Yes in the ledger model. This changes today's observation, so it needs a re-run of the pairs first.

### 28. Node test MockTimers

1. **What it is.** Mock timers in Node's built-in test runner. Opened: `https://nodejs.org/api/test.html` (fetch). The page shows Node v26.12.1. This machine runs Node v24.18.0, so the page is not the local version. The text read stopped before the reference section on `MockTimers`.
2. **Mechanism.** From the page: `timers.enable({ apis, now })`. `tick(ms)` advances mocked time and runs due timers. `setTime(ms)` moves the clock without running timers in the past, which run on the next `tick(0)`. `runAll()` runs every queued timer. `reset()` clears them. The example uses `context.mock.timers.enable({ apis: ['setTimeout'] })`.
3. **Lean today.** run.mjs:113 fixes the date to a constant. run.mjs:117-120 records timers without firing them.
4. **Verdict.** PORT. The mock patches the host's timers, not the vm sandbox that lane B uses. Its clock semantics are the model.
5. **How.** The same change as item 27, with the `setTime` / `tick(0)` split as the rule for a clock that moves without firing. Cost counted with item 27. Validation: the clock pair.
6. **Open questions.** The async-generator interval example was not read (text cut at 100000 characters). UNVERIFIED. Check whether Node v24.18.0 supports the same API.

### 29. Rust closure traits

1. **What it is.** Rust closure traits (`Fn`, `FnMut`, `FnOnce`). Source: `https://doc.rust-lang.org/book/ch13-01-closures.html`, cited in the research text. Not opened. UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): `FnOnce` restricts how a callable is consumed, not how often the environment calls it.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It supports the rule that a consuming call type proves no exactly-once invocation.
5. **How.** Not applicable.
6. **Open questions.** None.

### 30. OCaml 5 effects

1. **What it is.** Effect handlers and one-shot continuations in OCaml 5. Source: `https://ocaml.org/manual/effects.html`, cited in the research text. Not opened. The repository `ocaml/ocaml` is LGPL-2.1 with a linking exception and last pushed 2026-10-26 (GitHub). UNVERIFIED for the manual.
2. **Mechanism.** Per the research text (CLAIM): resuming a continuation twice raises `Continuation_already_resumed`.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It is the model for a generator's `next` that can only run once per suspension.
5. **How.** Not applicable.
6. **Open questions.** Confirm the exception name in the manual before citing it.

### 31. Koka

1. **What it is.** Effect-typed functional language. Opened: `https://api.github.com/repos/koka-lang/koka` (metadata) and the LICENSE file (Apache-2.0). Last push 2026-10-15. Book at `https://koka-lang.github.io/koka/doc/book.html` not opened; the research text's version claim is UNVERIFIED.
2. **Mechanism.** Per the research text (CLAIM): effect rows in function types, handlers, and a resource-cleanup problem with repeated resumption.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. An effect row is the label lean would need to tell a pure callback from a stateful one. It does not decide invocation count.
5. **How.** Not applicable.
6. **Open questions.** None.

### 32. Effekt

1. **What it is.** Research language with effect handlers and purity contracts. Opened: `https://api.github.com/repos/effekt-lang/effekt` (metadata). Licence: MIT. Last push 2026-10-26. Site `https://effekt-lang.org/` cited in the research text, not opened.
2. **Mechanism.** Per the research text (CLAIM): checks that parameters declared pure are pure.
3. **Lean today.** Lane A already restricts lambdas to pure bodies (translate.mjs:189-210).
4. **Verdict.** REFERENCE. It shows the same purity contract in a typed setting.
5. **How.** Not applicable.
6. **Open questions.** None.

### 33. Ownership-restricted translation with MoCHi

1. **What it is.** Kobayashi's reference translation for an ownership-restricted language. Opened: `https://arxiv.org/abs/2411.06086`. Title: "On Decidable and Undecidable Extensions of Simply Typed Lambda Calculus". Submitted 9 November 2024, revised 10 February 2025. Licence: arXiv non-exclusive licence 1.0. The page lists no code artifact. The abstract says the paper proves four extensions of finitary PCF undecidable and gives a decidable fragment with references by a type system.
2. **Mechanism.** The abstract's fragment is decidable through a type system. The research text's "closed Boolean reachability" wording is not confirmed by the abstract. The MoCHi experiments (12 OCaml programs) are not read.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. The abstract shows that undecidability holds for extensions of finitary PCF, which supports the research's general boundary.
5. **How.** Not applicable.
6. **Open questions. Does the ownership fragment decide closed reachability as the research text says?** UNVERIFIED.

### 34. Closure conversion

1. **What it is.** A transformation that lifts a function's captured variables into an explicit environment, leaving the code separate. The research describes it in prose. Lean's current code: translate.mjs:189-210 (a local bound to an arrow literal is a pure lambda; any other local function value is opaque), translate.mjs:807 (callback arguments are lambdas for arrow literals and `opaqueFn` for others), translate.mjs:1381-1384 (function expressions, lambda or opaque), translate.mjs:2112 (`opaqueFn`).
2. **Mechanism.** The integration design (research-integration.md section 4) defines `Fn(code: id, env: seq<Ref>)`. Two closures are equal in lane A when code ids and captured cells agree. Different bodies are ASK.
3. **Lean today.** translate.mjs:2112 makes every non-pure function an opaque value keyed by text. fake.mjs:186 and fake.mjs:205 identify functions by source hash. Two closures from `make(k)` have the same text, so the text token cannot tell them apart. That is the research's first problem.
4. **Verdict.** PORT. lean reimplements the representation (not a library): `Fn` replaces `opaqueFn` for function values that escape.
5. **How.**
   - Files: translate.mjs (`opaqueFn` at 2112 gets a `Fn` branch; the arrow case at 189-210 stays for non-escaping lambdas), and the prelude emitted by translate.mjs with a `Fn` datatype.
   - Data in: a function value with its captured variables. Data out: a Dafny `Fn(code, env)` value, and an ASK when a captured value has no ledger model.
   - What it gains: `make(k) { return () => k }` produces two closures that differ in their captured cell. The current gate cannot tell them apart.
   - Cost: 10 to 15 days (CLAIM).
   - Validation: the function_values and callbacks pairs, plus heap_graph for captured cells.
6. **Open questions.** Does the Dafny prelude merge in check.mjs stay consistent for `Fn` datatypes? That is how the gate refuses differing declarations. Needs a test.

### 35. Defunctionalization

1. **What it is.** A transformation that replaces a known family of function values with data constructors and one dispatcher. The research describes it in prose. No source opened; the transformation is standard and the research text gives no citation for it.
2. **Mechanism.** Per the research text (CLAIM): a dispatcher over a closed set of code identities. An unknown environment-provided function needs its own representation.
3. **Lean today.** Not applicable. The dispatcher question is open in lean's design.
4. **Verdict.** REFERENCE. It settles item 34's dispatcher: `Apply(f, args)` matches on a finite list of code ids from the translated file, and any id outside the list is ASK.
5. **How.** Not applicable.
6. **Open questions. Can a dispatcher over an open world be finite?** No. A function the environment builds is outside the list, so the verdict must be ASK.

---

## Special depth (a): fast-check

**Opened.** The Scheduler docs (`https://fast-check.dev/docs/api/interfaces/Scheduler/`), the model-based docs (`https://fast-check.dev/docs/advanced/model-based-testing`), the GitHub repository `dubzzz/fast-check` (MIT, pushed 2026-10-26), and npm `fast-check` 4.10.2 (MIT, modified 2026-09-19).

**APIs that matter.**
- `fc.commands(commands)` generates a scenario. Each command has `check(model)`, `run(model, real)` and `toString()`.
- `fc.modelRun(s, cmds)` runs a synchronous scenario. `fc.asyncModelRun` runs async commands. `fc.scheduledModelRun` runs them in a controlled order.
- `replayPath` on `fc.commands` plus `{ seed, path, endOnFailure: true }` on `fc.assert` replays a shrunk failure.

**How lane B would use it.**
- Command set: `call op(args)`, `retain h`, `invoke h(args)`, `tick t`, `settle p`, `fire e`, `next g`, `throw g`, `return g`. Each is one ICommand.
- `check(model)` gates legality. For example, `invoke h` is legal only after `retain h`. A `settle p` is legal only while the promise is pending.
- `run(model, real)` executes the command on the sandbox from run.mjs:110-121. It records the observation for each side.
- `scheduledModelRun` is not used. The Scheduler cannot see uncontrolled async work, and lane B needs its own pending model with enabling rules. The research text makes the same point, and the docs confirm it.

**Why adopt, not port.** The shrinking and `replayPath` are tested code that lean would otherwise write from scratch. The cost is one vendored package with a licence file.

**Caveats.** fast-check needs the model to be simpler than the real system. The model here is the ledger, which is simpler, so this fits. Node version support is UNVERIFIED.

---

## Special depth (b): timers in the sandbox, and what a virtual clock adds

**What lane B does today.**
- The sandbox's `setTimeout`, `setInterval` and `setImmediate` push `{ op, ms }` onto `env.pending` and return its length as the id (run.mjs:117-119).
- `clearTimeout` and `clearInterval` are recorded in the trace (run.mjs:120). The pending entry stays. A cleared timer still shows as pending.
- The date is frozen at 1700000000000 (run.mjs:113), so two reads of the date agree.
- Each call is numbered by fake.mjs:141, so two reads of a clock are two values.
- `pending` is part of the observation (run.mjs:248), so arming one timer or two differs.
- `queueMicrotask` runs its callback (run.mjs:120). No timer ever fires.

**What a virtual clock adds.**
- A `tick(ms)` command that fires due timers in arm order and records each firing in the trace.
- `setInterval` that re-arms after each firing.
- `clearTimeout` that removes the pending entry, so a cleared timer does not fire and does not show as pending.
- A `runAll` with a count limit. Hitting it is ASK. Jest's limit is 100000 (item 27).
- `setTime` that moves the clock without firing, and `tick(0)` that fires what is due (item 28).

**Note.** The current clear behaviour is a real gap. A candidate that arms and then clears a timer differs from the parent only through the trace, not through `pending`.

---

## Special depth (c): HOBBIT and PDNF-BISIM in Dafny

**What a callable record `Fn(code, env)` needs from their interaction model.**
- A finite code identity. Each translated function in the file gets an id. Dafny dispatches `Apply(f, args)` over that finite list.
- Captured cells as ledger references. HOBBIT's opponent-known collection maps to a `seq<Ref>` of escaped cells.
- An invocation transition. `Apply` reads the cells and runs the code's body with them as extra parameters.
- An ASK for any function outside the list. This is the defunctionalization point (item 35).

**What HOBBIT adds.** The opponent-known collection of functions, the alternation of program and opponent moves, and the up-to techniques that make some equivalences provable. The bound-exhaustion ASK is the verdict discipline lean takes (item 5).

**What PDNF-BISIM adds.** Stackless configurations and saturation. This answers the nested-call problem that HOBBIT's concrete stack creates. The research text reports that one nested inequivalence is missed (CLAIM, not read).

**What stays out.**
- The ML-like source grammar. lean's input is TypeScript.
- The store concretization and the symbolic value solver.
- The bounded search itself. lean's Dafny proof does not search. It proves one step per unit.
- Any claim that a bisimulation closes over an unbounded depth. lean does not prove that.

**Dafny consequence.** `Fn` is a value, not a bisimulation. Two `Fn` values are equal in lane A when their code ids agree and their captured cells agree. That is a one-step proof, which lane A already produces per unit.

---

## Special depth (d): environment-program witness format

**What a program is.** A JSON list of commands. Each command has an op (`call`, `retain`, `invoke`, `tick`, `settle`, `fire`, `next`, `throw`, `return`), a logical handle (`h0`, `h1` ... in retain order), arguments, and a time where relevant. Schedule choices name logical events (arm order index), not raw seed numbers. This follows the research text's point on coupling.

**How lane B generates one from a seed.**
- A seeded RNG from fake.mjs (`makeRng`, imported by gen.mjs).
- Program length drawn from the seed, then one command per draw, with each command's `check` gating legality.
- Arguments drawn by gen.mjs from the unit's spec, with boundary values first, so the same seed gives the same inputs to both sides.
- Each side runs in its own `Environment` seeded `seed * 7919 + i` (run.mjs:265), as today.

**How it shrinks.** fast-check's shrinker on the command list: delete commands, lower invocation counts, shorten `tick` values, simplify arguments. A shrink step that makes a command illegal is rejected by its `check`.

**How it replays.** Re-run the same program on both sides with the same seeds. The shrunk program is replayed with `replayPath`, so a skipped command is not re-run.

**What the certificate records.**
- The program JSON and its SHA-256.
- The seed and the fake policy string (run.mjs:287 already records one).
- Both observations and the first difference (the `firstDifference` helper in run.mjs already records `where`).
- The `replayPath`.
- The verdict: WITNESS only after a replayed separating run. Otherwise ASK.

**Recheck.** A minimized program is replayed against the original parent and candidate before it counts as a witness, as the research text requires (CLAIM from the research text, not an extracted result).

---

## Open questions for the lead

- Confirm the mCRL2 licence before adopting ltscompare (item 18).
- Decide whether fast-check is vendored under langs/ts/vendor (item 26). Lean has no root package.json, so vendoring is the existing pattern.
- Fix the `clearTimeout` gap in run.mjs:120 before writing the virtual clock (item 27).
- Confirm the two SyTeCi DOIs (item 4).
- Read the PDF papers that the fetch tool could not decode (items 1, 2, 12, 13, 14, 15, 16, 17, 21, 22). Their verdicts are provisional until then.
