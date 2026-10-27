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
