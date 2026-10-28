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
