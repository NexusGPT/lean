# The fifteen battery rows the gate loop stopped on, read on 6589b7d

## What was asked
The gate's producer loop (run file `gate/loop/v7-143.json`, lean pinned at b1ea2ca) stopped on 15 rows of the 143 planted
mutants of the v7 battery: 10 where lean answered ASK or PASS-bounded on a mutant the battery had witnessed, 3 where a
repaired unit identical to the parent got ASK, 2 where the WITNESS carried no source lines. Each row was planted again on
a clone of its corpus tree with `mutate.mjs`'s own index (the battery planted indices 0, 1, 2 of each unit) and run with
`check.mjs --n 60 --dafny-seconds 30` on 6589b7d. Classes: (a) witnessed again on this head, no fix; (b) a reading
merged tonight stops the witness, fix here; (c) a load failure or a bound, named; (d) a witness without lines; (e) a
lane A obligation. Results are under `results-ten-mutants/` of the lean-v3 folder.

## The table
| row | unit | mutation | v7 | gate pin b1ea2ca | 6589b7d | class |
|---|---|---|---|---|---|---|
| 5 | ProfileContentPanel | `===` to `!==` | W | ASK, parent load failed (emit failure) | W, input 4 | a (c at the pin) |
| 6, 7 | ProfileContentPanel | literal 0 to 1 (one mutant, indices 1 and 2) | W | ASK, same | W, input 4 | a (c at the pin) |
| 31 | DaytonaSandboxRegistry.registerLiveRunner | two arguments swapped | W | ASK, parent load failed (`safeParse`) | W, program 6 | a (c at the pin) |
| 32 | same unit | `sessionCostTotals.reset` dropped | W | ASK, same | W, program 0 | a (c at the pin) |
| 33 | same unit | `storePtyInput` dropped | W | ASK, same | W, program 0, lines kind "completion fallback" | a (c at the pin) |
| 104 | isRecord | returned test negated | W | ASK, parent load failed (`import.meta.env`) | W, input 0 | a (c at the pin) |
| 106 | isRecord | `&&` to `\|\|` | W | ASK, same | W, input 0 | a (c at the pin) |
| 67, 68 | PrismaDeploymentCrudRepository.create | `===` to `!==` (one mutant, indices 1 and 2) | W | PASS-bounded | W, program 0 | a (a mis-planted site, below) |
| 22, 23, 24 | EnhancedPluginNode.buildConstraintAwarePrompt | string literal gets a suffix | W | W, then the repaired draft ASK | W, program 3; identical pair ASK:obligation | a, and e |
| 80, 81 | AdminHealthController.checkEcho | string literal gets a suffix | W | W without lines | W, race program 0, no lines | d |

## No class (b)
No reading merged tonight stops a witness. Two causes were found by running the rows at the commits between the pin and
the head (lane B only, rows 5 and 104 at six merge commits, row 31 at 765b05d):
- Rows 5 to 7, 31 to 33, 104 and 106 are `parent: load failed` at b1ea2ca and at cdbd48d, WITNESS from 765b05d on. The
  merge is lane bench-drops, reading 1: an aliased same-package module whose top level cannot run in the sandbox is the
  environment's module (design/bench-drops.md; its pair `bench_drops`). A bundler's `import.meta.env`, a schema built
  at load, and a file TypeScript cannot emit alone are the three load failures of these rows.
- Rows 67 and 68: the loop planted the wrong site. `loop-demo.mjs` finds a row's site by the row's kind and text,
  counting the indices past 2 (3 and 4), where the battery used indices 0, 1, 2 (`soundness.py --per 3`). In
  `PrismaDeploymentCrudRepository.create` indices 0 and 1 skip a site that breaks the types, so rows 66, 67 and 68 are
  the same mutant, the first `===` (offset 9710); the loop planted the second `===` (`error.code === "P2002"`) for 67 and
  68. The battery's mutant is WITNESS on 6589b7d (row-67s2). The loop's mutant is PASS-bounded at every commit from
  8a8c960 to 3e15478, b1ea2ca, cdbd48d, da25333, b26653d and 6589b7d (lane B only, twelve runs): the catch branch needs an error that is an instance of an imported
  class with a given code, which no drawn fault is. That is a gap of an input the loop planted by mistake, not a
  regression, and it is left as it is.
The thirteen other mutants were checked against `mutate.mjs --index`: the text planted is the text of the battery's
index, character for character (rows 5 to 33, 80, 81, 104, 106, 67 and 68).

## Rows left open, with their owner
- Rows 80 and 81 (d): the witness is a race witness (`where.field` is `race`). The unit is an async method; the
  class race explorer runs only when the ordinary draws found no difference (`exec/run.mjs`), and it finds this one, a
  witness the design leaves without lines ("race differences omit lines", design/witness-lines.md).
  A string literal changed in a returned object is one statement. A fix gives the race witness the completion sites of
  the two runs of its distinguishing order; it belongs with the witness-lines lane, which was asked and had not answered by the report.
- Row 33 (d): its lines kind is "completion fallback", a location to inspect, not a statement (design/witness-lines.md:
  the graph does not record every writer of a receiver field).
- Rows 22 to 24 (e): the draft identical to the parent (the parent's file copied) is ASK:obligation, "this
  replaceVariablesAndExtractText: read without a transition". The lemma is proved (13 verified, 0 errors); the method is
  inherited from the base class in another file, so the proof cannot tell the base unchanged. The ASK is sound for a
  base that may differ; a tree whose base file is byte-equal on both sides could read it as the same transition. The owner
  is lane A (translate, check.mjs), outside this lane.

## The pair `ten_mutants` (lane B only)
There is no fix to pair. The pair holds the shape of rows 80 and 81 so that a later change cannot lose the witness:
`Health.checkEcho` (an async method whose collaborator answers a boolean, one string literal of the first branch changed)
is a WITNESS; `checkEchoNamed` (the status named in a local) and `untouched` are PASS-bounded. The pair's witness is an
ordinary program witness with lines; the corpus unit's is a race witness, which this pair does not reproduce.
