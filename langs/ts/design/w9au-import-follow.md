# w9au: an import the reach cannot follow is followed as the repository resolves it

Lane w9au, on top of w9al (design/w9al-world-stubs.md) and the unit reach of lane w9k (exec/new-unit.mjs `unitWorld`).
`unitWorld` said `an import lean cannot follow: \`name\`` whenever `checker.getAliasedSymbol` gave an imported binding no
declaration. On the 8 dev PRs w9al measured, 10 of the 101 world-limited NEW units stopped there.

## The cause, per import

The census checks out each PR's head **without an install** (no `node_modules`). Every one of the 10 units stops at an
import of a file the run never linked: the reach enters it through a **type** (`this.hosts.origin(...)`, where `hosts:
AppHostService` is a constructor parameter, so the import is elided at emit; gemini-cli's type guards take `value:
unknown`, which reach.mjs reads as possibly an instance of any class in the file, and the classes' members lead on
through typed members). In that file:

| import | where | what the checker lacks | what lean's loader links it as |
|---|---|---|---|
| `logs` from `@opentelemetry/api-logs` | gemini-cli loggers.ts:483 | the package's declarations (not installed) | a declared package: a recording fake |
| `SemanticAttributes` from `@opentelemetry/semantic-conventions` | gemini-cli types.ts:553 | the same | the same |
| `v7 as uuidv7` from `uuid` | n8n app.repository.ts:91 | the same | the same |
| `z` from `zod` | n8n apps.config.ts:4 | the same | the same |
| `isIP` from `node:net` | n8n app-host.service.ts:36 | Node's declarations (`@types/node`, not installed) | a builtin: the node fakes |

The specifier was also missing from `loaded.fakes`, the packages the load actually linked, because the file was never
loaded. None of the 10 is a `paths`, `exports`, `.js`→`.ts` or workspace failure: the reading's program already uses the
candidate's tsconfig and the workspace's `paths` (common.mjs `loadProgram`, `workspaceResolution`), and TypeScript maps
a relative `./x.js` to `./x.ts`/`.tsx` under every `moduleResolution` (checked under classic, node10, node16 and bundler).
The resolution gaps the lane brief named are still real outside these 10, and they are built and checked here:

- a file of **another project** (a workspace package's source, reached from the candidate's program) resolved its own
  imports with the *candidate's* options, so an alias of its own tsconfig (`@lib/*`) did not resolve;
- a workspace package whose entry is not `src/index.ts`/`index.ts` resolved only through `node_modules` (absent, or a
  link to an unbuilt `dist/*.d.ts`), never to the source its manifest's build entry comes from.

## The mechanisms (each behind a break; checks in tests/new-unit-test.mjs, fixtures/new-unit-test/imports)

1. **Resolution** (`reach-resolve`; common.mjs `resolveFrom`, `fileProjectOptions`, `projectHost`, `workspaceEntry`,
   `manifestSources`). There is one resolver for the reading's program (loadProgram's compiler host, under a project)
   and for lean's loader (exec/new-unit.mjs `resolveModule`, which called `ts.resolveModuleName` before). An import
   resolves with the options of **its own file's** nearest tsconfig when that is not the program's, and falls back to
   the program's options. A specifier naming a workspace package (or a subpath of its manifest) that resolves to nothing,
   to a `.d.ts` or under `node_modules` is the package's **source**: the entry its manifest names (`exports` conditions
   in the order TypeScript and Node read them, then `source`, `types`/`typings`, `module`, `main`). A built target is read
   back through the package's own tsconfig: `outDir` maps to `rootDir` (or the common folder of its sources), and the
   emitted extension maps to the source's. The `.js` → `.ts`/`.tsx` step is part of that read-back. A `node_modules`
   link into the monorepo resolves the same way, because TypeScript's realpath lands on the package's folder. Checks:
   `later` (Clock.now in `@fx/lib`, whose `@lib/tick` alias is lib's own tsconfig's) gets a test; `gauge` (Meter in
   `@fx/meter`, entry `dist/main.js` built from `src/main.ts`) is read from its source, and the source's read of
   `document` is seen.
2. **Packages** (`reach-packages`; exec/new-unit.mjs `importSurface`). An import the checker cannot follow is read as
   lean's loader links it (`resolveModule`, the same function the run uses). A package the repository declares is a
   package lean fakes, under the same trap rule as a linked one. The rule also applies to the bindings a file taints
   (`taintedNames` takes the classification through `fakedIn`). Check: `label` (`v7` of the declared, uninstalled `uuid`)
   gets a test.
3. **Builtins** (`reach-builtins`; `importSurface`). `node:x`, or a bare name Node holds, is a world surface named
   `node:x`, answered by lean's node fakes. Read without a trap, it is refused as `a node:x binding ... is read without a
   trap`. Called by the unit itself, the load links it, and w9al's writer mocks it (`vi.mock("node:net", ...)` with
   lean's answers: the plain check `isAddress`). Check: `hostKind` (`isIP` in a class reached through a type) gets a test.
4. **The reason** (`reach-reason`; `unitWorld`). An import still not followed names why: `no file './x' beside f.ts`,
   `the tsconfig path for '@/x' names no file`, `no tsconfig path for 'x', and no package 'x' is declared or installed`,
   `'x' names generated output the checkout does not hold`, `'x' is a build asset`, `'node:x' is a Node builtin without
   its declarations` (only under the builtins break), `package 'y' has no declarations the checker reads` (only under
   the packages break), or `the loader reads f.ts, which the checker's program does not hold`. Check: `bannerText`.

A plain check (no mechanism of this lane): `quad` imports `./twice.js`, which names `twice.ts`, and gets a test.

## What it does not do

- It does not narrow the reach. When an import is now followed, the walk goes on: on the 10 units the next refusal is
  another surface (`ApiError` read without a trap in an `instanceof`, a class extending `node:events`' `EventEmitter`,
  generated output `../../generated/git-commit.js`, a TypeORM base class). The type guards are reached through
  reach.mjs's rule that a value of type `unknown` may be an instance of any class of the file. With the unit's own
  reach alone (a diagnostic, not built), `isString` passes the reach and stops at `not exported`, the writer's limit.
- A solution-style tsconfig (`files: []`, `references`) is not read for the referenced project that holds the file.
