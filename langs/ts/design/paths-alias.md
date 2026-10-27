# A project's `paths` alias, resolved as TypeScript resolves it

## The construct
A tsconfig may declare `paths` (`{"@/*": ["./src/*"]}`) with or without a `baseUrl`. TypeScript's rule
(`getPathsBasePath` in the vendored compiler): a `paths` target is relative to `baseUrl` when one is declared, else to
`pathsBasePath`, the folder of the tsconfig that declares `paths` (set by `parseConfig` for each file of an
`extends` chain).

## The defect it replaces
`loadProgram` and `loadProgramOptions` set `baseUrl` to the pnpm workspace root whenever the tsconfig declared none,
so the project's own `@/*` resolved from the repository root, not from the app's folder: every `@/` import was a
missing module (TS2307, the `unresolved-module` rule), and the names it imported were typed as errors.

## The reading
- `workspaceResolution(options, configFile)` in `common.mjs`, called by both loaders: a declared `baseUrl` is kept;
  with none, none is set, so TypeScript's `pathsBasePath` decides.
- A workspace package (the pnpm or npm workspace above the tsconfig) is added to `paths` as an ABSOLUTE target
  (`<pkg>/src/index.ts` or `<pkg>/index.ts`; `<name>/*` to `<pkg>/src/*` then `<pkg>/*`), so it holds whatever the
  base; it resolves to its source in this tree, never to a built dist or a node_modules link.
- It is added only for a name no declared `paths` key already matches (TypeScript's pattern test: an exact key, or
  one `*` with its prefix and suffix around the name). A project that maps its own packages keeps its mapping.
- `aliasTarget(fromAbs, spec)`: a non-relative import the project's own `paths` map to a source file of the tree
  (not a declaration file, not under node_modules), with the options above; null otherwise.

## Lane B
The sandbox loader compiles relative imports inside the package and fakes every other import, aliases included: an
aliased same-package helper was a recording fake, so a refactor that inlines its body was a false WITNESS. The loader
rule that follows (a hunk for `exec/run.mjs`, applied by the lead): an alias whose target is inside the package root
is loaded for real, like a relative import; an alias that leaves the package is a fake, like a package.

## Soundness
Resolution changes which declaration a name has, never how a construct is read. A wrong root made an import
missing, which the lint reports as the checkout's (`unresolved-module`, `env`), never as equal. Lane B's real load
of a same-package file is the rule relative imports already follow; a fake was never more faithful than the code.

## The fixture
`tests/fixtures/paths-alias/`: a two-package workspace, `apps/web/tsconfig.json` with `paths` and no `baseUrl`, and
`tsconfig.base-url.json` with one. The suite's `runtime paths-alias` rows load `src/index.ts` under each: no
diagnostic, `baseUrl` none and kept. At the base the first row reports TS2307 on `@/util`.
