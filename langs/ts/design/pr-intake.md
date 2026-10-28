# Pull request intake

Every changed callable has a coverage row.
A skipped file has one row named (file).
Unchanged callers appear only when they expose a witness.
Ordinary documentation files are outside this callable change set.

The reader gets file names from git with zero byte separators.
It collects source text, line ranges, units and lint findings.
Secret names are classified before their contents are read.
Binary files are identified by git or a zero byte in their contents.
The reader uses project types when it reads TypeScript.
The reader makes one TypeScript program per tsconfig per side: the head files of the change are its roots, and the intake, the lint and the cache key of every unit share it.
The parent side is read the same way, from the materialised base files, when the run reaches its first unit.
A file that cannot load in the program is a failed:loader row by itself; the other files keep their reading.
A file with no readable tsconfig, and every file under --no-project, is read alone and let go, so another changed file's declarations never reach it.
The earlier reader kept one program per changed file for the whole run. On a 68-file backend change (project types, 8 GB heap) it aborted at a peak of 9.07 GB after 67 s; with one program it finishes in 12.8 s at 2.34 GB.
Of that, the program holds 8,169 source files (4,026 declaration files) and 1.29 GB of heap once created, and typing the changed files adds 0.45 GB; one program per side still holds that much on the largest change.
JavaScript with declared JSDoc types can enter the same reader.

selectUnits(changedFiles, opts) returns [{unit, decision, reason}].
Each input holds file, binary, hasTypes, units and optional error.
Each unit holds name, start, end and findings in lint order.
Selection does no IO, changes no input and runs no lane.
Both preview and the run use this selection.

checked means a verdict exists, including ASK, NEW and IN-SCOPE.
reused is reserved and is never emitted here.
refused:<rule> names the first lint rule for that unit.
A refused unit runs only lane B and keeps its verdict.
failed:loader means source reading or runtime loading failed.
failed:timeout means a timeout left no usable verdict.
failed:translation-defect names the proof harness failure.
failed:harness names an exception caught outside a lane.
A bounded or stronger verdict survives a proof lane timeout.
skipped:not-typescript covers JavaScript without declared types.
skipped:binary and skipped:secret-path name excluded files.
skipped:budget names a unit left after a budget stop.
Preview prints a decision, reason and coverage for every row.
A selected unit has pending coverage until the run produces it.
The test rejects lane processes, sandbox execution and secret reads.
The sticky comment places intake before verdicts and respects its cap.
The fixture uses a module level JSON.parse failure for failed:loader.
Missing imports cannot provide this fixture: the harness fakes them.
The test requires six distinct coverage values and six preview rows.
Removing secretPath classification makes the fixture test fail.


## Run budgets

The flags `--time-budget <seconds>` and `--unit-budget <n>` default to no budget.
Zero stops before the first unit. Values must be finite and nonnegative.
The unit count must be an integer.
Time starts when prReport begins, before intake discovery.
Time is checked before each unit starts.
A unit already running finishes. The budget never kills a check midway.
A slow unit can take the run beyond the time budget.
If both limits apply at the same boundary, the unit limit names the stop.

The full spending list is built before the first check.
The changed group holds selected changed units in git file order and source order.
The callers group holds unchanged callers of changed callees.
A changed caller is not added twice.
The heap group comes last.
no extra heap units are discovered by pr.mjs today; the group is empty until that discovery exists
The JSON order list names all three groups, even when a group is empty.
Each group holds units with file, unit and lines.

The run JSON is {rows, order, stop}.
The stop is {reason, reached, total}.
Its reason is time-budget, unit-budget or none.
Reached counts processed units, including refusals and failed checks.
A new or deleted unit counts when its ASK row is produced.
Files excluded by intake spend no units.
A run that processes the full list reports none and reached equals total.
Each remaining unit gets skipped:budget and reason stop at unit k of N.
Here k is the first unit not reached, starting at one.
Unreached callers get rows even though reached callers need a witness to get a row.
The report title names the stop.
Preview keeps its JSON array and starts no lane, even with a zero budget.

The sticky comment accepts both flags.
Its footer and error annotation name a stop.
Both witness and ask block on a stop. None exits zero.
Filtering and the verdict table cap preserve the stop and spending order.
The comment JSON keeps all intake rows, including rows beyond the display cap.
The cap limits display only. Use the unit budget to limit work.

## Run identity

Run reports now carry identity alongside rows, order and stop.
The earlier reserved reused value is now emitted for a cache hit.
See [Run identity and reuse](run-identity.md) for keys, flags and evidence.

## Refusals file

A run writes its refusals to .lean/runs/<identity>.refusals.json, or under --runs-dir.
A WITNESS row, a REFUSE row and a refused or failed coverage row each give one record.
A skipped row gives none, since lean did not look; the intake table names it.
On the fixture: inside and refused give witness records, loader and refused coverage records.
ci/comment.mjs --inline builds its review comments from this file (design/ci.md).
