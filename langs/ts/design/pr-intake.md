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
skipped:budget is reserved and is never emitted here.
Preview prints a decision, reason and coverage for every row.
A selected unit has pending coverage until the run produces it.
The test rejects lane processes, sandbox execution and secret reads.
The sticky comment places intake before verdicts and respects its cap.
The fixture uses a module level JSON.parse failure for failed:loader.
Missing imports cannot provide this fixture: the harness fakes them.
The test requires six distinct coverage values and six preview rows.
Removing secretPath classification makes the fixture test fail.
