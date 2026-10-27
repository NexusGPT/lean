# Source lines on a witness

A witness names the statement that returned a value or requested an effect.
The syntax tree supplies the position.
The source file is never rewritten.
Each side keeps its own marker in its sandbox.

The statement transform lives in patch.mjs.
The loader applies it before TypeScript emits JavaScript.
Each function has a local statement frame.
Assignments before its statements set the current frame and site.
A nested call restores its caller's frame when it leaves.
An await restores its own frame when it resumes.
A return keeps its site while its expression runs.
A fallthrough uses the closing brace.
An escaping throw keeps the innermost recorded throw site.

Each fake request reads the marker when it appends its record.
The library recorder captures the marker before the library call.
Its callbacks cannot replace the call's site.
A trace site is a hidden property.
It does not participate in observation equality.
The certificate copies the selected sites to where.lines.
Each entry has file, start, end and text.
Lines start at one.
Text is the statement's exact source prefix, capped at 200 characters.
An absent trace record has a null site.
The other side is never invented.

A trace difference uses the two records at the first differing index.
An outcome difference uses the return or throw sites.
A pending difference uses the arm sites when both are known.
The graph does not record every writer.
Heap and receiver differences therefore use the completion site.
Pending differences without both arm sites use it too.
The kind field says completion fallback in these cases.
This is a location to inspect, not a claim that the return caused the mutation.

Sequence and finite witnesses keep their existing shape.
A differing trace adds lines.
A sequence throw adds lines when its completion site is available.
Tree, missing handler and race differences omit lines.
They do not have one statement that explains the difference.

Check runs lintFile once for a witnessed candidate unit.
It uses the selected project.
A finding that contains the candidate site's line range supplies rule, label and advice.
No matching advice means no advice field.
The pull request note prints the candidate file and start line.
It prints the advice label only when one exists.

Instrumentation must not change an observation.
The loader keeps the original emitted text of every function.
Function hashes read that original text.
Handler positions remain source positions.
The loader caches compilation by file and source text.
Every sandbox still owns its own marker and module instances.

The new suite section names ten pairs and a token for each statement.
The negative run replaces the selected site with the unit's first source line.
It must fail every listed assertion.
The evidence also compares complete observations before and after instrumentation.
It includes handlers and escaping functions.
Timing uses lane B alone and separate processes.
The report gives the logs and medians.

The planted mutation measure belongs to the lead's soundness run.
Record each mutant's source offset before its file is deleted.
Convert that offset to a line in the candidate file.
Count a witnessed mutant as covered when any candidate site spans that line.
Report the covered count and the witnessed count.
A missing site counts as uncovered.

The trace index also handles an extra record on either side.
The earlier search returned minus one when the parent trace was a prefix.
The witness now names the first extra index.
A null side says that the record is absent.
The kind field names which side is absent.
This correction changes the trace location metadata only.

The advice fixture lives in tests/fixtures/witness-lines.
Both versions return a field of a frozen object.
The value changes.
The assertion requires the freeze rule, its migration label and its exact rewrite text.
A clean lint site still carries no advice.

A return inside try keeps its return site while finally runs.
A finally return replaces that site.
A throw through finally keeps the statement that failed.
A caught exception does not label a later return.
The scratch edge check covers these cases and a labelled continue.
