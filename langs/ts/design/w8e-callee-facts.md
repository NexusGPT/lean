# The per-callee fact "writes none of its arguments" (lane w8e, 2026-11-01)

Code: `callee-facts.mjs` (eligibility, the key, the confirmed facts, the translator's decider), `common.mjs readAfterCall`
(the `fact`/`factUsed` hooks), `exec/callee-trace.mjs` (lane B's record and the loader's mark), `exec/run.mjs`
(`factFiles`, `env.factLog`, `bound.calleeFacts`), `check.mjs` (`--callee-facts` per side), `lower.mjs` (admission under
`pending`), `translate/translate.mjs` (`--callee-facts`, the `ASSUME` line). Pair `tests/pairs/callee_fact`, check
`tests/callee-fact.mjs` (suite row `callee-fact`). Breaks `callee-fact`, `callee-fact-trace` (tests/break.mjs).

## Why

w2a's callee census (`design/w2a-callee-census.md`): of the units refused only by calls outside the file, 76.9 % are
refused by read-after-call alone. A call that runs outside code may change what it is handed, so a read of a handed
object after the call either reads through the world (w1g's world forms) or, for a form the world read does not take (a
mutating method, a compound or nested write, `delete`, a rebinding), is refused. When the callee writes none of what it is
handed, the read after the call is the value before it: the fact lifts the refusal for any callee, project files included,
where a library row lifts one callee at a time.

## The fact and its check

For a call `C(a, ...)` or `o.C(a, ...)`: C writes no object reachable from its receiver and arguments, and its answer is
or reaches none of them. It is never assumed:

1. **Eligible** (`factCallee`): a plain call (no `?.`, no spread, no `new`), handed no function value (a callback is the
   unit's own code and may write what the callee was never handed), resolved to a function with a body declared in another
   source file of the unit's own package (nearest package.json, lane B's `findRoot`): the files lane B compiles and runs.
   A package, a Node module or a workspace package elsewhere is a fake in lane B, and a fake writes what it is handed
   (`fake.mjs writeHanded`), so no record can confirm it: not eligible. The key is the census's (`callees.mjs calleeOf`).
2. **Recorded** (`callee-trace.mjs`): lane B marks every call site of the pair's two files
   (`typeof f === "function" ? S.f(pos, void 0, f, a) : f(a)`, and `(t = o, typeof (g = t.m) === "function" ? S.f(pos,
   t, g, a) : t.m(a))`: the evaluation order unchanged, a non-function called as written so its TypeError is the
   engine's). Per call, the graph reachable from the receiver, the arguments and what the site was handed earlier in the run
   (the callee may have kept it) is read before and after (own data properties through Reflect, Map and Set entries, a
   Date's time; never a getter, never a patched method), and the answer is compared against it. A site counts calls,
   checked calls (64 per side), `wrote`, `shared`, `outside` (a fake called), `unrecorded` (an accessor, a proxy, a typed
   array, a WeakMap, a class with private names, more than 5,000 objects) and `async` (a promise answered: the callee's
   work goes on). Built-ins run unrecorded (no fact names them).
3. **Confirmed** (`confirmedFacts`, in check.mjs on each side's own text): a key holds on a side when no recorded site of
   the key wrote, shared, called a fake, held what the record cannot read or answered a promise, and some site was checked.
4. **Read** (`readAfterCall`): what a fact call is handed is no change at that call (only at later calls: the callee may
   keep it). Under check.mjs only confirmed keys are read; each fact used is an `// ASSUME <unit>: callee <key> writes
   none of its arguments ... (lane B: n recorded call(s) at k site(s), none wrote or shared)` line, so the certificate's
   `lanes.A.assumptions` names it and the verdict's reason says the proof holds under it. Without a confirming record
   the read stays refused as before.

Admission (`lower.mjs`, so the lint and the census) reads eligible calls as `pending`: the unit enters the proof lane on
the fact's condition, and the record says which (`unit.calleeFacts`). The census's `entered` therefore counts units
whose entry still depends on lane B confirming the fact when the unit is checked.

## What it does not claim

The fact is checked on the unit's runs: lane B's inputs, at most 64 calls per site and side. A callee that writes only
on inputs lane B never draws passes the record, and a proof under it holds under that assumption, named in the
certificate; that is the reading of every bounded check (exec/transitions.mjs validates the library rows the same way).

## Red

- `tests/callee-fact.mjs` against the base (5d44ac3360, the pair and the check copied in): tags PASS-bounded (lane A
  ASK), 4 checks fail, exit 1.
- `LEAN_BREAK=callee-fact` (facts read whatever lane B recorded) and `LEAN_BREAK=callee-fact-trace` (the record sees no
  write): sameWriter PASS-proved under "isTagged writes none of its arguments", a premise lane B saw broken: 3 checks
  fail, exit 1.
