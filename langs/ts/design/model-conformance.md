# Model conformance: each model against Node, on lane B's inputs

A translator defect both sides of a pair share is invisible to the pair: the parent's model and the candidate's model
are wrong alike, the lemma holds, and lane B, which runs the TypeScript, never reads the model. This step reads the
model itself. It is the report's "add model execution now" (section 11, step 3) and its relation check (section 5):
for an exact reading compare observations; for an over-approximate one, check the concrete value is admitted; for a
shared unknown, check the pair of executions under the product model.

## The step

`conformance/run.mjs` (a block of `tests/run.mjs`, on the pairs "Where it runs" selects) runs each selected pair in
its own process (`conformance/pair.mjs`, three at a time; `--jobs` sets it), and each unit in a process of its own under lane B's bound
of 120 s per unit: a unit whose awaits spin in microtasks holds its process, which is killed, and the unit is counted
skipped with that reason, as lane B's spin-bound:

1. Translate both sides exactly as the suite's pair step (`--core --suffix --heap --prelude`, check.mjs `agreeCore`).
2. Compile each side's model to JavaScript (`dafny translate js --include-runtime`, wrapper erasure off so a value keeps
   its declared shape). Every part with no body (a bodiless function or predicate, an opaque type) becomes an extern of
   one module, `LeanOpaque`; no body is ever written for it (`dafny-text.mjs compilable`).
3. For every unit of the pair's scope both files hold, draw every input lane B draws (`run.mjs inputPlan`, seed 1, the
   suite's n = 30: the enumerated small heaps, then the seeded draws). Node runs each side in lane B's sandbox and lane
   B's `observe` renders the result (`fake.mjs render`, the shared value format). A third copy of the input, never run,
   goes to the models.
4. Each model runs on it. Per input and side, one status:
   - agree: the model's answer is Node's, SameValue at every number (`-0`, NaN and the infinities render apart);
   - disagree: it is not (the result, an argument the unit returns rebound, a heap argument after the call, a thrown
     value against a returned one, or a request Node made where the model reached no transition);
   - not executable: the run reached a part with no body (the extern stops it and names the symbol);
   - outside the model domain: the input is not a value of the model's declared type (NaN or an infinity in the finite
     number model, a fraction where `number` is `int`, a lone surrogate in a string), or the unit's stated hypothesis
     (`requires`, `// HYP`) is false on it, or an in-range unit set the oob flag (`// INRANGE`);
   - not bridged: the bridge has no reading for the input's type (a generic unit, callback slots, a data type with no
     input reading). Counted apart, never merged with the others.
5. The product check: on an input where a model reached a part with no body, both models run again with one table for
   those parts, keyed by the symbol and the canonical text of its arguments (a function value by its code), under eight
   seeds. A concrete return type is drawn from the seed (every constructor; small integers and strings, and the
   integer and string constants of the two models' own text); an opaque one is a term of the symbol and its arguments.
   When both models make the same applications, agree under every seed, and Node's two observations differ, the shared
   symbols may have coupled two different behaviours. The seeds only sample the theorem's "every reading of the shared
   symbols": under a lemma lane A proves (the pair's `expect.equal`, which the suite holds), the case is a coupling
   finding; under a lemma lane A does not prove or withholds, Dafny already found the reading the seeds missed, and the
   case is listed as sampled agreement, no finding.

A unit's status: disagree if any input disagrees on either side; agree if one input ran to the end and none disagreed;
else not executable, outside the domain, or not bridged, in that order. A disagreement is a finding even when the
pair's verdict is right. The step exits 1 on a disagreement or a coupling finding not listed in
`conformance/known-findings.json` (pair, unit, cause, board row).

## The bridge (`bridge.mjs`, `heap.mjs`): read from the model's own declared types

- int: an integral double, exactly (a bigint too); `-0` is the model's one zero, so a `-0` the unit returns is a
  disagreement. real: the double's exact rational; the model's real result rounded once, then SameValue.
- Option: the single absence of the declared union; the unit's TypeScript signature (`// SIG`) says null or undefined.
  A missing optional field and one holding undefined are one value, None (design/open-datatype.md), so None admits both.
- A record: its declared fields by key; the rest is MoreBuilt when the object has no other key, else MoreFrom of one
  name per set of undeclared keys and values, and compares equal only to those same keys and values.
- An opaque type (Ext_, Any) and a class receiver: a term named by lane B's rendering of the input. The model can only
  pass it on (compared to the input as drawn) or apply a bodiless part to it. An input function: a part with no body.
- The heap core: every object a Ref argument reaches is one cell, its constructor the shape the `// SHAPES` legend
  names, an object reached twice one cell. Out of the model, the cell is rebuilt as the value it stands for and rendered
  by lane B's own render, so cycles, sharing and the six-level bound compare as lane B observes them.

## What it does not see

- An exact reading of `number` as `int` cannot be told apart from Node on `-0` input when the reading is wrong only
  there (`x + 0` read as `x` gives the model's 0 for Node's +0): the int model holds no `-0` to disagree with. A
  disagreement shows only where Node returns `-0` and the model 0.
- Lane B's rendering sorts a plain object's keys: key order is compared for a Map and a Set, not for a plain object.
- A thrown value is compared only as thrown: the model's fault holds an opaque value.
- Arguments after the call are compared with their sharing expanded (two positions holding one object show its contents
  twice); a second sight of one object inside Node's result renders as a cycle in lane B's observation and is not
  compared past it (counted).
- A generator's result (lane B renders the iterator object, not what it yields) and a constructor's result (the
  instance built on a receiver of fakes) are not bridged.
- Units that are not executable or not bridged are counted, never run through an invented body.

## Where it runs (`conformance/select.mjs`, tested by `conformance/select.test.mjs`, a row of the pair step)

Over every pair the step costs hours under load (see "Cost"), so it runs in full only where a full run pays:

- `LEAN_PAIRS` given: those pairs, as the pair step itself.
- `LEAN_CONFORMANCE=full`: every pair. The admission suite sets it, and `W/harness/regress.sh` sets it on its full run:
  `LEAN_CONFORMANCE=full node langs/ts/tests/run.mjs`.
- Neither: the pairs whose files changed since the baseline commit, the last commit of `known-findings.json`
  (`git diff --name-only <sha> -- langs/ts/tests/pairs`, plus untracked files there); none when none did. The pair step
  prints the selection and the row's detail repeats it.
- Any other value of `LEAN_CONFORMANCE` is an error, never a silent rule; outside a git work tree every pair runs, with
  the reason.

Why changed pairs and not changed translator files: a translator change moves models without moving a pair file, and
then every pair may move; only a full run sees that, which is why the admission runs in full and a lane that touches
`translate/` runs `LEAN_CONFORMANCE=full` before it reports. Why the baseline commit and not a fixed sha: rewriting the
baseline resets the changed set by itself, with no second place to keep in step.

## Cost

`run.mjs` times every pair (wall, and CPU of the pair and every process it waited for, by `/usr/bin/time -p`), its
translation and the compilation of its two models, and every unit (wall from spawn to exit, CPU of the unit's own
process); it prints the step's wall, the sums, the load average at start and end and the 20 slowest pairs, and writes
all of it to `--json` under `cost`. Each pair runs in its own process group, so the pair bound kills the pair and what
it started (its unit's process, dafny, the translator), not the pair's process alone.

## The baseline on 600dd759 (`known-findings.json`)

The full run on 600dd759 (`--jobs 2`, all 221 pairs): 1333 units in 197 pairs (24 skipped), 719 executable (540
agree, 179 disagree), 0 coupling findings, 7 findings not in the f409bd8 baseline, 0 of its 184 gone. Each of the 7 is
one of the two known causes on a unit the old run never executed; none is a moved translation of a known finding:

| pair/unit | cause | why it is new |
|---|---|---|
| exported_object_methods/ops.add, ops.viaSibling | an integer past 2^53 | new pair (600dd759, exported-units) |
| exported_object_methods/ops.scale | signed zero | new pair (600dd759) |
| opaque_values/flowFixed, mapPresent | signed zero | new pair (fea80f88, opaque-values) |
| proof_hunt_0/thrower, proof_hunt_2/bang | signed zero | pair unchanged; lane A refused `x!` before fea80f88 and translates it since, so the units run |

Each of the 7 carries a named class (`class` in `known-findings.json`, printed beside `[known: ...]`): the five signed-zero
units are "signed-zero: model collapses -0" (the number model has one zero; the fix is the number-model lane's,
doubles), the two 2^53 units "2^53: the model is exact, Node rounds to binary64". A class names the cause; it never
widens the match, which stays per (pair, unit, cause): a unit of the class not listed is NEW. Checked: with
`proof_hunt_0/thrower` removed from the file, `LEAN_PAIRS=proof_hunt_0` exits 1 with that unit `[NEW]`.

Vanished: none. The rest-parameter entries were retired before (af9678b2); every other old entry was seen again. The
step lists a known finding of a pair that ran and was not seen ("Known findings not seen"), never as a failure: a fix
must not fail the step, and the list says the baseline needs rewriting.

## Measurement

See the lane reports under W: `harness/lanes/model-conformance.md` (the step) and `harness/lanes/oracle-cost.md` (its
cost and the baseline on 600dd759).
