# Run identity and reuse

A run has an identity in its JSON report and Markdown header.
It is a SHA256 of canonical JSON.
The fields are base, head, unitSet, leanVersion, libraryTableHash,
adviceTableHash and dafnyVersion.
Git refs resolve to commits. WORKTREE remains the literal WORKTREE.
The unit set has sorted file and unit pairs from selection and caller discovery.
The lean version is this checkout's git head.
The library hash reads LEAN_LIBRARY_TABLE when set.
Otherwise it reads langs/ts/translate/library.json.
The advice hash reads langs/ts/lint/advice.mjs.
The identity reads the Dafny version once. A missing Dafny is absent.
The checker still makes its own existing version reads for proof certificates.
Preview keeps its intake array and starts no version process.

## Unit key

A unit key is a SHA256 of canonical JSON.
It has five source parts plus flags.
They are unit texts, same file callee texts, the file outside its functions,
directly imported files and the resolved tsconfig.
Parent and candidate text retain their comments and whitespace.
Both texts are needed because either side can change the comparison.
The callee summaries field holds callee names and texts on both sides.
These are the transitive same file callees from calleesOf.
That is the discovery which callersOf inverts.
Both sides matter when a call is removed or added.
A callee change therefore invalidates every dependent caller.
The fileContext field hashes the text outside top level functions and methods.
It retains types, constants, imports and module code.
It covers both sides.
Changing another function alone leaves that hash unchanged.
Changing a type or constant invalidates every unit in that file.
The imports field holds direct imports from each side's file.
Resolution uses the same project options as loadProgram.
Each project import contributes its specifier, relative file name and content SHA256.
An unresolved or external module contributes its specifier only.
Project files here are resolved sources inside the judged checkout.
External libraries and node_modules are outside that boundary.
The tsconfig field holds the content SHA256 of each side's resolved config.
It hashes that file only, not files reached through extends.
It is null when no readable config resolves.
These hashes invalidate results when imported definitions or config contents change.

The flags field holds n, seed, dafnySeconds, project and deep.
They control the input bound, input sequence, proof time, types and exploration.
It also holds the unit's scope entry and the supplied adapters.
Scope changes the question. Adapters change the compared interface.
Adapter declarations in comments are retained in unit or outer file text.
File, unit and caller mode bind a cached row to its place and checking path.
The defaults are n 100, seed 1, dafnySeconds 30, project true and deep false.
Scope is false and adapters are null unless supplied.
Seed and deep are prReport options. This change adds no CLI flags for them.

The cache also checks a schema and tool context digest.
That digest holds the lean commit, library hash, advice hash and Dafny version.
A tool change must miss even when the unit key stays the same.
The run identity is not a unit key.
A new head commit can keep an unrelated unit reusable.

## Cache contract

The default cache is <repo>/.lean/cache/<unitKey>.json.
The repo is the checkout being judged.
Each file holds the key, tool context and the checked row with its certificate.
Writes use a temporary file and rename.
An unreadable or malformed record is a miss.
A write failure reports its error class.
Failed checks, refusals and budget skips are not cached.

A hit carries the original certificate without rewriting it.
Its verdict comes from the certificate.
Its coverage is reused. Its note says reused from and the key prefix.
Line ranges reflect the current intake.
The certificate identity names the run which produced that evidence.
The report identity names the current run.
These identities may differ after another push.
Paths and whole file hashes in reused certificates remain original evidence too.
Caller witnesses retain the existing lane B path and receive its certificate.
A caller without a witness still has no row. Its probe is not cached.
A direct check call without an identity writes no identity field.

The flag --reuse is on by default.
The flag --fresh reads no cache and still writes checked results.
Fresh wins when both flags are present.
A cached WITNESS follows the same rule.
The flag --cache-dir <dir> overrides the default directory.
A relative override resolves from the current working directory.
Add .lean/cache/ to the judged repository's .gitignore.
Deleting that directory removes its saved verdicts.

## Limits and verification

Reuse does not expand intake. It applies only to selected units.
This key covers unit text and same file callees.
The remaining limits are transitive imports beyond one level,
module initialization order and anything outside the project.
Use --fresh when those inputs change.
The lean commit does not describe uncommitted checker edits.
The current identity does not distinguish separate WORKTREE edits.
The unit key still reads their unit and callee text.

The intake fixture checks complete reuse, identical certificate bytes,
direct and transitive callee invalidation and a fresh run.
Its red copy omits callee texts and must fail the invalidation assertion.
The fixture prints both wall times and their ratio.
The lead measures the corpus separately.
A fresh certificate can have new temporary paths and a new origin identity.
Before a fresh against reused diff, strip lanes.A.dir and every /var/folders path.
The report identity and original certificate identity remain separate evidence.
Compare the latter separately when comparing distinct head commits.
