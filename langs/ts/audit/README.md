# Syntax frame audit at fea80f8

This folder is `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit`.
It contains an audit, not a listing implementation. The checked listing is `topLevelFunctions` imported unchanged from the parent common.mjs. Occurrence identity uses its `u.fn`, not the enclosing variable statement used by the units CLI for line display.

## Reproduce

Run from the named worktree, chaining the directory change:

```sh
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit" && npm ci --ignore-scripts
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && node langs/ts/audit/schema.mjs && node langs/ts/audit/test-schema.mjs
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && node langs/ts/audit/fixtures.mjs && node langs/ts/audit/test-fixtures.mjs && node langs/ts/audit/check-fixtures.mjs && node langs/ts/audit/challenge-exclusions.mjs && node langs/ts/audit/negative.mjs && node langs/ts/audit/context-regressions.mjs
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && node langs/ts/audit/reconcile.mjs && node langs/ts/audit/test-reconcile.mjs && node langs/ts/audit/typeonly.mjs
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && node langs/ts/audit/review-samples.mjs && node langs/ts/audit/adjudicate.mjs && node langs/ts/audit/summarize.mjs
```

A new repository snapshot requires new manual sample review. The adjudication assertions intentionally bind decisions to the reviewed evidence. The preferred nexus census root is selected only at reconciliation start; `reconciliation.json` records the actual absolute root and every included file hash.

## Artifact purposes

- `package.json`, `package-lock.json`, `.gitignore`: local pinned parsers; exclude installed dependencies. No lifecycle scripts. TypeScript declarations are absent from the vendored package; the matching package supplies the schema. Vendored and installed compiler hashes were compared.
- `schema.mjs`, `schema.json`, `test-schema.mjs`: compiler checker derives kinds from FunctionLikeDeclaration/SignatureDeclaration plus JSDocSignature; concrete node interfaces, inherited properties, generic substitutions and assignability derive candidate parent fields. Parent backlinks, brands, methods, and transform metadata are excluded. Refined interfaces with the same kind/field are merged with provenance. Structurally incompatible combinations remain explicit.
- `contexts.mjs`: independent handwritten source templates and explicit grammar exclusions. No absent template is silently treated as infeasible. Grammar exclusions are reviewed assertions, not formal proofs.
- `fixtures.mjs`, `fixtures.json`, `cells.json`, `test-fixtures.mjs`: minimal source witnesses, exact node/parent/field observations and listing verdicts. Sources reside as strings in the fixture ledger. Type-only omission is expected, not executable loss. Context changes can alter the verdict within a cell.
- `check-fixtures.mjs`, `bounded.json`: independent raw-property traversal comparison, Babel challenge of positive syntax, and exhaustive enumeration of the stated wrapper grammar. JSDoc attachments are explicitly traversed because forEachChild alone omits them. This is not all TypeScript programs through the stated depth. Nested generated programs are checked for parse diagnostics, not early errors or type correctness; module syntax inside a wrapper can therefore remain parser-accepted.
- `challenge-exclusions.mjs`, `exclusion-challenges.json`: counterexample search against every excluded cell for which source templates exist; independent compiler/Babel grammar checks.
- `negative.mjs`, `negative.json`: local pass/fail/early/pass-explicit partitions, with parse diagnostics and recovery listing retained. Spotlight found no indexed test262-parser-tests checkout; this is not a proof of its absence from unindexed storage.
- `context-regressions.mjs`, `context-regressions.json`: executable examples of context sensitivity, name collisions, declaration overloading, and intentional bodiless handling.
- `reconcile.mjs`, `reconciliation.json`, `disagreements-*.jsonl`, `test-reconcile.mjs`: census-compatible file walk with no symlink traversal; file hashes, parser failure accounting, exact span sets, normalized export-prefix comparison. Source bodies/literals are not copied. Babel type signatures are counted separately; bodiless declarations retaining runtime node kinds remain in the occurrence comparison.
- `samples.json`, `review-samples.mjs`, `adjudicate.mjs`, `adjudication.json`: pooled hash-ordered disagreement sample, redacted source-token display, manual decisions and checked evidence. A real omission here means absent from the syntactic occurrence frame; the intentional bodiless exclusions are separately marked.
- `typeonly.mjs`, `type-only-differences.json`: reconcile residual interface getter signatures with Babel's separate type-only node representation.
- `summarize.mjs`, `summary.json`, `cell-table.tsv`: measured aggregates and the full kind × holding-parent-field × language × goal table. Infeasible combinations have no listing verdict; they have reasons. No inferred population percentages.
- `TEST-LOG.md`: red/green evidence, commands, and known failures.
- `REPORT.md`: frozen copy of the lead-facing report.

## Certificate boundary

A representative per cell and bounded nesting cannot prove correctness of the grammar exclusions, arbitrary-depth traversal, context-independent listing, parser recognition of every valid program, or complete runtime behavior. The current listing visibly fails to enumerate all executable occurrences. Neither parser agreement nor a passing conservation test is a completeness certificate for lean.
