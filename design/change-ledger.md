# Change ledger contract

The root is Git's NUL-delimited raw diff between resolved commits, or a resolved base and the tracked working tree. Untracked files are outside Git diff's universe. Every file has an identity, kind, artifact class and nonempty edit identity list. Text edits are individual deleted/added line intervals, each retaining its hunk identity and old/new span. Nontext changes and metadata changes have their own records. Rename pairs retain both paths. A mode change accompanying text is separately recorded. Read failures survive as records. Secret paths are classified by name without reading their contents; symlinks are not followed. No source text is serialized into the manifest.

Classes are deterministic path/content rules, ordered lockfile, generated, schema, test, doc, build, config, data, source, non-source. Generated markers are inspected only in the initial source prefix. These classes describe routing, never semantic equivalence.

## Verification

Working directory for all commands: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger`.

- `node langs/ts/ci/ledger.test.mjs`: red on the original runner with `AssertionError: an unlisted object member must have a named ASK` (exit 1).
- `node langs/ts/ci/ledger.test.mjs --frame-only`: red with `ERR_MODULE_NOT_FOUND` for ledger.mjs (exit 1), green after the change-frame implementation (exit 0).

## Routing and consumer contract

`routeChanges` attaches the old/new syntax listings without changing `topLevelFunctions`. Every edit gets one primary route (unit, artifact, unassigned), plus side-specific links to all overlapping listed units. Deletions are owned by the old syntax. Additions are owned by the new syntax. Parse diagnostics retain code and offsets without source text. Contexts name object-literal members, exported property assignments, class fields, type-only declarations, comments, whitespace, module-level statements and untyped JavaScript.

`pr.mjs` selects work from those links and emits ASK rows for artifact/unassigned edits, including their edit identities. Artifact ASK means no equivalence check was performed for that artifact. `reportJSON` adds `ledger` (files, edits, units and routing reconciliation). Markdown prints edit identities and per-class identity sets. Existing unit verdicts retain their meaning.

`node langs/ts/ci/ledger.test.mjs` now exits 0, including the previously red missing-object-member assertion and duplicate-identity rejection.

## Supervision protocol

`supervise.mjs` creates a unique run directory and writes the change/task manifest before starting a checker process. Every task has an attempt UUID and private directory. Artifacts are fsynced, renamed, hashed and receipted before the supervisor marks an attempt done. Only the outer process writes terminal status. Abnormal exit, deadline termination, launch loss, missing completion and invalid artifacts become crash, timeout, lost-worker or incomplete-artifact. Reconciliation compares task identities and their named lane identities; repeat reconciliation returns the same terminal result. Optional caller tasks are registered before those checks start. Non-witness caller outcomes remain durable but do not add presentation rows.

The supervisor commits `terminal.json` before generating Markdown, JSON projections or refusal annotations. Each report names that file. `reportJSON` exposes `runDir`, `terminalFile` and `reconciliation`, including the expected/terminal identity sets. A failed report writer cannot destroy an earlier artifact.

`materializeSources` reads Git blobs into the private run, preserving relative source/configuration paths. It excludes secret paths and symlinks; existing dependency installations are read through node_modules links. Nothing is installed. For WORKTREE the tracked files are copied; the checker rejects a change frame that moves between registration and dispatch.

`node langs/ts/ci/supervise.test.mjs`: red before implementation (no private run directory, exit 1); green after implementation (exit 0). The fixture injects worker/report crashes, deadline expiry, absent output, abandoned work and a corrupted artifact. The worker-crash fixture retains a named ASK and exact reconciliation; the report-crash fixture retains its WITNESS and artifact hash while the CLI exits 1.

## Additional adversarial checks

- A line containing a listed function and an exported property mutation must preserve both obligations. The test was red (`a same-line unit must not swallow a module-level edit`, exit 1), then green after splitting line intervals at unit/top-level syntax boundaries. Offset spans identify the resulting pieces; their common hunk retains both original line spans.
- `node langs/ts/ci/report.test.mjs` reproduced the benchmark report exception `(v.children ?? []).map is not a function` (exit 1). The report boundary now names an unavailable patch display and retains the raw operation. The test passes (exit 0); rendering does not mutate its input. `patch.mjs` is unchanged.
- `node langs/ts/ci/comment.test.mjs --intake-only` was red at the old intake cardinality/status expectations (16 of 18 passed, exit 1). The vocabulary now includes artifact/unassigned rows and crash, timeout, lost-worker, incomplete-artifact ASK statuses. A whole-file language skip has become separate old/new edit records.

Commands for focused verification: `node langs/ts/ci/ledger.test.mjs && node langs/ts/ci/supervise.test.mjs && node langs/ts/ci/report.test.mjs`. All exit 0. Baseline full-suite comparison uses the detached source tree `/Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/.baseline-fea80f8`; the earlier mutable-tree baseline was terminated and is not a measurement.
