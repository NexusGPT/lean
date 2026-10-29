# Tests and commands

All node commands below were run as `cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" && <command>`. Audit-only files were changed. No pair expectations were changed or pair suite run, because this lane changes no checker behavior.

| Command | Observed result |
|---|---|
| `node langs/ts/audit/test-schema.mjs` before schema implementation | exit 1, ERR_MODULE_NOT_FOUND for schema.mjs |
| `node langs/ts/audit/test-schema.mjs` after implementation | exit 0; version 5.9.3, 15 kinds, 148 fields, 3224 candidates |
| `node langs/ts/audit/schema.mjs` | exit 0; also 14536 structurally infeasible combinations |
| `node langs/ts/audit/test-fixtures.mjs` before generation | exit 1, ENOENT cells.json |
| `node langs/ts/audit/fixtures.mjs` during template completion | exit 1 while 136 obligations were unresolved; none silently excluded |
| `node langs/ts/audit/test-fixtures.mjs` first complete generation | exit 1: test incorrectly treated fixture index 0 as absent; assertion corrected to integer test |
| `node langs/ts/audit/check-fixtures.mjs` first independent challenge | exit 0 but reported 8 Babel UnsupportedImportTypeArgument challenges; repaired feasibility classification: import type argument must be literal |
| `node langs/ts/audit/fixtures.mjs` before decorator correction | exit 0; 3224 candidates, 1348 feasible, 0 unresolved |
| `node langs/ts/audit/test-fixtures.mjs` before decorator correction | exit 0; 1348 feasible fixtures, 1876 grammar-infeasible candidates; 56 listed, 1292 not listed |
| `node langs/ts/audit/test-fixtures.mjs --drop-fixture` mutation | exit 1, 1347 !== 1348; proves conservation fails when a feasible fixture disappears |
| `node langs/ts/audit/check-fixtures.mjs` before decorator correction | exit 0; 40 wrapper words per seed, 53920 attempts, 53920 parse-accepted, 0 parse-rejected; 35280 listed and 113672 unlisted function-like occurrences; 0 Babel positive-fixture challenges |
| `node langs/ts/audit/negative.mjs` | exit 0; 64 cases: 8 pass, 8 pass-explicit, 24 fail, 24 early; TypeScript parse-failed 24, Babel rejected 48; listing still returned 16 units from parse-failed fixtures |
| `node langs/ts/audit/context-regressions.mjs` | exit 0; 17 cases, 24 function-like occurrences, 5 listed, 19 unlisted |
| `node langs/ts/audit/test-reconcile.mjs` before reconciliation | exit 1, ENOENT reconciliation.json |
| `node langs/ts/audit/reconcile.mjs` initial | exit 1, isIdentifier(undefined); fixed audit-only optional-name guard |
| `node langs/ts/audit/reconcile.mjs` final | exit 0; full per-root output in summary.json, 47710 raw disagreements, 100 sampled |
| `node langs/ts/audit/test-reconcile.mjs` | exit 0; per-root set conservation and file records, sample cardinalities |
| `node langs/ts/audit/review-samples.mjs` | exit 0; all sampled source headers inspected, comments/literals redacted |
| `node langs/ts/audit/adjudicate.mjs` | exit 0; lean-only 50 identity; Babel-only 12 identity, 38 syntactic omissions (36 executable, 2 deliberately bodiless); neither sample had a parser-dialect disagreement |
| `node langs/ts/audit/summarize.mjs` | exit 0; all report aggregates and table generated from saved ledgers |

Dependency installation: `cd "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit" && npm install --ignore-scripts --save-exact typescript@5.9.3 @babel/parser@7.28.5` exited 0. Babel LICENSE was read (MIT). No dependency install outside the audit folder.

`shasum -a 256 "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/vendor/typescript/lib/typescript.js" "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit/langs/ts/audit/node_modules/typescript/lib/typescript.js"` exited 0: both hashes are `3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675`.

`mdfind -name test262-parser-tests` exited 0 with no path results; Spotlight emitted locale diagnostics on stderr, preserved. The local negative partitions were used; unindexed disk locations remain unsearched.

The requested `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/nexus` root did not exist when reconciliation began; its `ls` diagnostic was preserved. The lead explicitly authorized the recorded fallback `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/nexus/tree`.

`git -C "/Users/assem/nexus/nexus-organisation/work/lean-lanes/syntax-frame-audit" diff --exit-code fea80f8 -- langs/ts/common.mjs langs/ts/units.mjs langs/ts/census.mjs langs/ts/exec langs/ts/translate langs/ts/lint langs/ts/tests/pairs` exited 0 without a diff.

Final feasibility correction: an in-memory TypeScript program with `allowJs`, `experimentalDecorators`, `noLib`, and `noResolve` reported no syntactic diagnostics for `@function(){} class C {}` in JavaScript. The first exclusion rule had incorrectly treated decorators as TypeScript-only. `node langs/ts/audit/test-fixtures.mjs` was extended with this obligation and ran RED (exit 1, `legacy decorators are accepted by the pinned parser in JavaScript mode`) before fixing that general mode rule. Positive-fixture checks now require compiler syntactic diagnostics to be empty as well as independent Babel acceptance.

Final commands (same absolute working directory):

- `node langs/ts/audit/fixtures.mjs && node langs/ts/audit/test-fixtures.mjs && node langs/ts/audit/check-fixtures.mjs`: exit 0; 1352 feasible cells, 1872 grammar-infeasible cells, 56 listed and 1296 not listed; 54080 bounded attempts, all parser-accepted, 35384 listed and 114000 unlisted occurrences, no independent Babel challenges.
- `node langs/ts/audit/challenge-exclusions.mjs`: exit 0; 1676 template attempts on excluded cells, 848 exact-field parse witnesses, all rejected by the mode/grammar cross-check, no contradictions. This searches for counterexamples; it does not prove exclusion rules.
- `node langs/ts/audit/test-fixtures.mjs --drop-fixture`: exit 1, 1351 !== 1352 on the final fixture ledger.

The finite candidate and table dimensions never changed. The correction increased witnessed feasible cells by 4; it changed no lean listing behavior. Historical pre-correction results above remain explicitly historical.

`node langs/ts/audit/typeonly.mjs` exited 0: 4 residual TypeScript GetAccessor occurrences are Babel TSMethodSignature/get nodes at identical spans, all in interfaces and already counted in the separate type-only population.

Final full green sweep: `node langs/ts/audit/test-schema.mjs && node langs/ts/audit/test-fixtures.mjs && node langs/ts/audit/challenge-exclusions.mjs && node langs/ts/audit/check-fixtures.mjs && node langs/ts/audit/negative.mjs && node langs/ts/audit/context-regressions.mjs && node langs/ts/audit/test-reconcile.mjs && node langs/ts/audit/adjudicate.mjs && node langs/ts/audit/typeonly.mjs` from the named worktree exited 0. The forbidden-path diff check also exited 0. A separate comparison verified the external report equals REPORT.md and the TSV contains 17760 unique cells; git diff --check exited 0.

Package metadata was read directly with node from the local parser package.json files, confirming Babel 7.28.5, MIT; TypeScript 5.9.3.

`find "/Users/assem/nexus" "/Users/assem/Downloads" "/Users/assem/Documents/GitHub" "/private/tmp" -type d -name test262-parser-tests -print` produced no matching path before cancellation. Only the find process started by this audit was terminated, by its confirmed PID 22427 with SIGTERM; command exit 143 was retained. A dependency-pruned search was then started. No global absence claim follows from an incomplete scan.

The follow-up command was `find "/Users/assem/nexus" "/Users/assem/Downloads" "/Users/assem/Documents/GitHub" "/private/tmp" -type d \( -name node_modules -o -name .git \) -prune -o -type d -name test262-parser-tests -print`. It also returned no path before cancellation; confirmed own PID 16901 received SIGTERM, exit 143. The local negative partitions are therefore used with corpus availability explicitly unverified beyond the completed Spotlight lookup; neither interrupted scan is reported as an exhaustive absence check.
