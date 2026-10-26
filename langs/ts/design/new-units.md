# A unit without a parent

A named function, arrow const, constructor or class method absent from the parent has
no equality proposition. The caller may omit `--parent`; an existing parent file is
inspected by syntax for the requested unit. Existing paired execution is unchanged.

JavaScript links imports before evaluating module bodies. This ordering is the verdict
boundary: REFUSE(load) is only a repository-owned local linkage failure, either an
unresolved local source specifier or a missing named export from a local source module.
The Node resolver/linker supplies the original error text and stack. The result records
`phase: link` and the owned edge: importer, specifier, target or missing export.
A failure is never classified as linkage merely because its message mentions imports.

Every evaluation exception is ASK with an `environmentClass`: CommonJS wrapper,
test-runner globals, build-injected env, platform global, fake answering at module
evaluation, or module evaluation when no more specific environmental evidence exists.
CommonJS and missing-global classes use the observed error; import.meta.env has an
explicit missing-build-environment accessor. Recorded fake calls distinguish an
evaluation under fake answers. These labels do not prove which answer caused a throw.
The original evaluation error remains in the result. Load budgets are ASK as well.
A missing ESM export on a CommonJS target is also ASK(CommonJS wrapper).

Files matching *.spec.*, *.test.* or an __tests__ path segment are ASK(test module)
before reading, linking, evaluating or drawing inputs. Imported test modules also stop
the standalone graph with ASK. Their test-runner setup and mock hoisting are out of scope.

Declared external packages, including declared workspace packages, are recording fakes
and never need installed node_modules. Local and aliased source uses TypeScript's
resolver and Node's VM linker. Undeclared external packages use Node resolution, but
failure is ASK(undeclared external package), not a repository-owned source refusal.
The availability and named exports of declared packages remain assumptions.

Missing conventional generated output is ASK(missing generated output): generated,
__generated__, dist or build path segments, .generated or .bundle output names, and
resolution to a declaration file without runtime source. This conservative boundary
can leave a genuine defect in such a path undecided. Missing assets are ASK(build asset)
because the source resolver does not implement a bundler's asset transforms or aliases.
These rules depend on path and module provenance, never on corpus keys or verdict labels.

Literal dynamic import specifiers are resolved before drawing inputs, even on branches
not drawn. Their modules are not evaluated early. Computed imports resolve when drawn.
Type-only imports are erased. External fake namespaces expose syntax-referenced import,
property-read and destructuring names; they do not enumerate installed package exports.

NEW, never PASS, records loaded, inputs, seed, fakes, faults, fault examples, trace shapes
and bounds. Throws on drawn inputs remain observations: new functions may throw by design.
Trace shapes summarize ordered operations, outcome kinds and pending work. Each input
gets a fresh graph and seeded environment, with the paired boundary-first input generator.
The preliminary load's effects are discarded. The existing sandbox, React protocol,
decorator policy, selection and observation helpers are reused. A child process supplies
the overall timeout when the caller has not enabled VM modules.

No Dafny translation or equality lemma is constructed; an invented empty parent would
assert a proposition the request does not contain. Ordinary proof lint and translation
keep their admission rules. Candidate-only lint emits NEW, ASK(class), or REFUSE(load),
and check preserves the result and assumptions in its certificate without entering lane A.

Fixtures distinguish local link failures from evaluation throws, including an evaluation
throw whose text mimics a missing-export linker error. They cover test exclusion before
load, CommonJS, build env, platform globals, fake filesystem answers, generated output,
declared and undeclared packages, dynamic imports and intentional input faults.

The unchanged census population is 118 defect sides and 115 fix sides, including test
units as ASK rows. Raw inventory and traces are under the ignored results-bench directory;
results-new-unit contains only the census report, validation and file deltas.
Five inspected nexus-800 locations, all new files, enter standalone execution:
apps/backend/src/agents/favorites/application/use-cases/favorite-agent.use-case.ts:16
(constructor) and :21 (execute);
apps/backend/src/agents/favorites/application/use-cases/unfavorite-agent.use-case.ts:15
(constructor) and :20 (execute);
apps/backend/src/agents/favorites/infrastructure/adapters/delete-agent-favorite.prisma.adapter.ts:11
(constructor). The ten-unit bench reports ordinary lint/translation separately from
standalone verdicts. Three real local import breaks must refuse, then return to NEW
after exact source restoration. A witness score has no meaning without a parent.

Paths into `node_modules` are external recording fakes, including absolute paths and aliases.
