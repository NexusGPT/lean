# Syntax-frame audit: lean listing is incomplete at fea80f8

Audit branch: `lane/syntax-frame-audit`, based on `fea80f8`. The exported-units lane is changing a different listing; none of those changes is measured here. Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit`. All code and evidence are under `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit`. Only that folder and this requested report were written. No learned model was added to any mechanism; no owner clone was modified, no push, and no reported commit amended.

The listing is not complete over executable occurrences. Object-literal methods/accessors and function-valued properties are absent. Other measured gaps include callbacks, nested declarations, namespace functions, class expressions/fields, computed/string method names, parenthesized and mutable bindings, multiple declarators, and anonymous default declarations. Name-keyed overwrites lose duplicate methods and a getter whose generated name collides with an explicit method. Type-only syntax is separated from executable omissions.

## Measured frame and fixtures

All numbers in this section are produced by:

```sh
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && node langs/ts/audit/schema.mjs && node langs/ts/audit/fixtures.mjs && node langs/ts/audit/test-fixtures.mjs && node langs/ts/audit/check-fixtures.mjs && node langs/ts/audit/challenge-exclusions.mjs && node langs/ts/audit/summarize.mjs
```

Pinned TypeScript **5.9.3**; locally installed Babel **7.28.5**, MIT. Installation used `--ignore-scripts --save-exact`, solely in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit`. The installed TypeScript compiler and vendored compiler have identical SHA-256 hashes (command and hash in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/TEST-LOG.md`); the installed matching package supplies the missing vendored `typescript.d.ts`.

The compiler schema yields **15 function/signature kinds** and **148 holding parent fields**, including inherited fields and generic substitutions. Crossing those with TS/TSX/JS/JSX and script/module yields **17760 cells**: **14536 structurally incompatible**, **1872 explicitly grammar-infeasible**, **1352 witnessed feasible**. No unresolved default remains. The full cell table, including reasons, type-only marking, source-fixture index and verdict, is `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/cell-table.tsv`; schema provenance is `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/schema.json` and source witnesses are `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/fixtures.json`.

Every feasible cell has a checked fixture and verdict: **56 listed; 1296 not listed; none crashed or parse-failed**. There are **828 executable representatives**, **524 type-only/bodiless representatives**, and **772 executable representatives not listed**. These are representative counts, not a language coverage percentage. A const initializer and a nested or mutable initializer can occupy the same cell but have different listing results. The context ledger makes that limitation visible.

| Kind | Feasible representatives | Listed | Not listed |
|---|---:|---:|---:|
| FunctionExpression | 400 | 8 | 392 |
| ArrowFunction | 292 | 8 | 284 |
| FunctionType | 202 | 0 | 202 |
| ConstructorType | 202 | 0 | 202 |
| JSDocFunctionType | 48 | 0 | 48 |
| JSDocSignature | 16 | 0 | 16 |
| FunctionDeclaration | 48 | 8 | 40 |
| MethodDeclaration | 24 | 8 | 16 |
| GetAccessor | 32 | 8 | 24 |
| SetAccessor | 32 | 8 | 24 |
| Constructor | 16 | 8 | 8 |
| IndexSignature | 16 | 0 | 16 |
| CallSignature | 8 | 0 | 8 |
| ConstructSignature | 8 | 0 | 8 |
| MethodSignature | 8 | 0 | 8 |

All object-literal method/accessor cells read **not listed**. `context-regressions.mjs` additionally measures **17 cases, 24 function-like occurrences, 5 listed, 19 unlisted**; see `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/context-regressions.json`.

Conservation passes; deleting a feasible fixture makes `node langs/ts/audit/test-fixtures.mjs --drop-fixture` fail with **1351 != 1352** (exit 1). Exact occurrence/field checks use a raw-property walk independent of `forEachChild`, with explicit JSDoc attachment traversal. Positive fixtures pass TypeScript compiler syntactic diagnostics and independent Babel parsing. The exclusions were challenged by **1676 template attempts**, **848 exact-field parse witnesses**, and **no surviving contradiction** after mode/compiler/Babel grammar checks. Exclusion rules remain reviewed grammar arguments, not formally proved facts.

Bounded exhaustion covers every word in the declared grammar (block, ordinary function body, arrow block body) through depth **3** for each feasible seed: **40 words per seed**, **54080 attempts**, all parse-accepted. The saved ledger records **35384 listed** and **114000 unlisted** occurrences. This finite wrapper grammar is not all TypeScript nesting. Nested cases are parse-checked; early-error/type correctness is not asserted for wrapped programs.

Local negative partitions: `node langs/ts/audit/negative.mjs` measures **64 cases** (pass/fail/early/pass-explicit), **24 TypeScript parse failures**, **48 Babel rejections**, and **16 units still returned from parse-failed sources**. They are not valid-language coverage. No indexed test262-parser-tests checkout was found; broader filesystem searches were interrupted, so availability outside the index remains unverified. Disk-search scope and stderr/exit records are in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/TEST-LOG.md`.

## Occurrence reconciliation

Command:

```sh
cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && node langs/ts/audit/reconcile.mjs && node langs/ts/audit/test-reconcile.mjs && node langs/ts/audit/summarize.mjs
```

Actual read-only roots:

- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/nexus/tree` — lead-authorized fallback because `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/nexus` did not exist at reconciliation start.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/langchainjs`.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/agent-nexus`.

The file walker follows the census extension/exclusion policy and never follows symlinks. Each included file has its hash and parser outcome recorded in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/reconciliation.json`. Identity is relative file plus UTF-16 start, exclusive end, and normalized function kind. Lean uses `u.fn`; using its enclosing variable statement would invent span disagreements. TypeScript and Babel are parsed independently; Babel function/signature enumeration does not call the lean listing.

| Root | Files | Lean | Babel function-kind occurrences | Exact common | Lean-only | Babel-only | Babel-only after export-span normalization |
|---|---:|---:|---:|---:|---:|---:|---:|
| nexus | 12733 | 26520 | 54649 | 22020 | 4500 | 32629 | 28129 |
| langchainjs | 1486 | 4871 | 8272 | 4073 | 798 | 4199 | 3401 |
| agent-nexus | 2074 | 2911 | 4563 | 945 | 1966 | 3618 | 1652 |

Totals: **16293 files**, **34302 lean occurrences**, **67484 Babel function-kind occurrences**. Every listed lean occurrence matches Babel after normalization of only whitespace and export/default prefixes; there are **33182 additional Babel occurrences**. The latter include bodiless declarations and must not all be called missing runtime behavior. No corpus file had a TypeScript parse failure, Babel failure, or Babel recovered error. Separate Babel type-signature count: **7315**.

`node langs/ts/audit/typeonly.mjs` adjudicates the remaining **4** TS-versus-Babel all-function-kind differences: interface getter signatures are TS `GetAccessor` but Babel `TSMethodSignature`, already counted in the type-only ledger. This is a representation/population difference, not missing executable code.

Raw disagreements are preserved individually in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/disagreements-nexus.jsonl`, `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/disagreements-langchainjs.jsonl`, and `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/disagreements-agent-nexus.jsonl`.

## Manual disagreement review

Commands: `node langs/ts/audit/review-samples.mjs` then `node langs/ts/audit/adjudicate.mjs`, from the same absolute worktree. Hash-sorted samples are pooled across the roots, **50 per raw stratum**. All sampled source headers, exact spans, parent fields, bodies and counterpart spans were reviewed. Source literals/comments are redacted by the review renderer. Decisions are frozen and evidence-checked in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/adjudication.json`.

| Stratum | Reviewed | Real syntactic omission | Parser dialect difference | Identity mismatch |
|---|---:|---:|---:|---:|
| Lean-only | 50 | 0 | 0 | 50 |
| Babel-only | 50 | 38 | 0 | 12 |

Of the **38** syntactic omissions, **36** have executable bodies; **2** are deliberately excluded bodiless members (constructor overload, abstract method). The latter are explicitly marked intentional type-only exclusions, not checker defects. Identity mismatches in the sample are exported declarations whose TypeScript span includes `export` and Babel span does not. These sample counts are not extrapolated to a population omission rate.

## Certificate the lead can use

> For TypeScript 5.9.3, this audit records a complete classification of the finite schema-derived node-kind × holding-parent-field × parse-mode cell frame under its stated grammar rules. Every cell marked feasible has a source witness and a listing verdict. This does **not** certify complete classification of all relevant occurrences by lean at fea80f8: executable occurrences outside its top-level/named-class policy are omitted, name collisions overwrite occurrences, type-only/bodiless forms require separate policy, and malformed source can still yield listed recovery units. Grammar exclusions are reviewed rather than formally proved; nesting exhaustion is bounded to the declared wrapper grammar; parser correctness, arbitrary source contexts/depth, census-excluded files, and dynamically created runtime functions remain outside this certificate.

No listing fix is included. Before/after checker behavior is unchanged; `git diff --exit-code fea80f8` over all forbidden checker/pair paths exits 0. The finite audit has full row accounting, but the requested universal listing completeness claim is disproved. A future listing must reconcile occurrence identities before applying admission/refusal policy, and it must retain explicit type-only and parse-failure outcomes.

## Deliverables and commits

Every added element and its purpose is documented in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/README.md`; exact commands, red tests, mutation failures, corrected audit assumptions and green outputs are in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/TEST-LOG.md`. Scope is report-only; no pair expectation changes.

Green commits already made: `daeac18` (schema derivation), `444810e` (fixtures/conservation/bounded checks), `908796d` (reconciliation/manual evidence). The final report commit additionally contains the independently found JavaScript decorator-mode correction, strengthened syntax checks, exclusion challenges, full TSV and report. No prior commit was amended. The final response supplies its hash.
