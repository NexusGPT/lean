# census-unresolved-origin: result (2026-10-31)

Branch `lane/census-unresolved-origin` from lean `lead-09032a59`.

## Commits
- 4c37607e9: test (red). `tests/census_environment.mjs` gets the case `origin`, with fixture
  `tests/fixtures/census-environment/origin`: `unbox` in `use.ts` reads a field typed through `types.ts`'s unresolved
  import of `handle-source`, and the copy also holds `src/._use.ts` and a binary `src/blob.ts`. At the base, 4 of 15
  checks fail.
- 7680c0b5b: rules 1 and 2 in census.mjs.
  - `unresolvedOrigin` carries the origin's file (`site`). `kindOf` reads the checker's diagnostic in that file first,
    then in the unit's own file, and classifies by the origin's file.
  - `walk` skips `._*` files (`APPLEDOUBLE`). A file with TS1490 gets a record `skipped: 'binary'` (so the supervisor
    counts it walked) and is no file, unit or finding.
  - `res.skipped` and the summary line `skipped: appledouble/binary N (a appledouble, b binary)`; also in the report.
- 7e69bf9f5: test (red at 7680c0b5b). `origin/src/relay.ts` and a direct `environmentOf` check: a quoted `state` names
  the parameter, not the error-typed member `b.h.setting.state` on its line.
- 1ed1c855b: `namedValues` skips the name of a property access. `site` is now a file name, looked up in the program.
  The first dated design paragraph went into this commit too (`git commit -a`).
- the final commit: the measurement in `design/census-reach-2026-10-31.md`, and this file.

## Pairs and tests (check counts)
- census_environment.mjs: 17/17 (red at the base: 4 of 15; the member check red at 7680c0b5b).
- census_partial.mjs ALL PASS; census_example_message.mjs all hold; census_usage.mjs green; lowering-cache.mjs green
  (summary child exit 0); refusal-path-space.mjs green.
- pair callback_units (uses census()): 9 checks, ALL PASS.
- No `expect.json` changed. The full suite was not run (the lead runs it at the merge).

## Regression list
- None in the pairs.
- n8n census: units and entered unchanged. Three units change class:
  - 1 unit, `HighLevel/v2/GenericFunctions.ts:highLevelApiRequest`, goes environment → alias-mutation. This is the
    member-name fix: the refusal names the parameter `body: IDataObject`, and the old match was `options.body`'s name.
  - 2 units, `@n8n/client-oauth2/src/CodeFlow.ts` getUri/getToken, go `environment: global-lib` → ts-strict. This is a
    side effect of skipping the AppleDouble files, not of a rule. TypeScript offers at most 10 spelling suggestions per
    checker, and the AppleDouble garbage names used them up. Without those files, `URL` gets TS2552 ("Did you mean
    'url'?") instead of TS2304, and 2552 is not in common.mjs `RESOLUTION_CODES`. I asked the lead (no answer in
    120 s) and decided to report it instead of changing the lint's classes. See "Left".

## Census lines (n8n, no install, one root; base census.mjs of 09032a59 vs. this branch)
- before: `n8n: 7812 files, 9610 units, 2752 inside the subset (28.6 percent), 603 environment-blocked (242 on an unresolved type), 4634 language-refused, 0 files unreadable, 0 oversized closures, 502 s`
- after: `n8n: 3906 files, 9610 units, 2752 inside the subset (28.6 percent), 600 environment-blocked (241 on an unresolved type), 4637 language-refused, 0 files unreadable, 0 oversized closures, 261 s`
  and `skipped: appledouble/binary 3906 (3906 appledouble, 0 binary)`
- Unresolved-type stops per label:
  - before: lockfile 190, unresolved 31, builtin 17, absent 2, global-node 1, alias 1.
  - after: lockfile 219, builtin 18, absent 2, global-node 1, alias 1, unresolved 0.
  - The 31 `unresolved` units: 29 → lockfile (convict, samlify, typedi), 1 → builtin (http), 1 → alias-mutation (above).
- Environment-blocked by kind:
  - before: global-node 232, lockfile 203, global-lib 76, unresolved 31, alias 22, relative 19, builtin 18, absent 2.
  - after: lockfile 232, global-node 232, global-lib 74, alias 22, builtin 19, relative 19, absent 2.
- Readings (`--diff`): mutation refused 1153 → 1154, types 426 → 428. No gains, no losses.
- langchainjs: not run (n8n is the census the brief names). nexus: not run, memory.
- Runs: `/root/lanes/census-unresolved-origin/scratch/runs/n8n-{before,after2}.json` (`after.json` is the run at
  7680c0b5b); tallies `scratch/tools/labels.mjs`, `moved.mjs`.

## Left
- TS2552 ("Cannot find name 'X'. Did you mean 'Y'?") is TS2304 plus a suggestion, and TypeScript offers suggestions
  only while its budget of 10 per checker lasts. Whether an unresolved name is `unresolved-module` or `ts-strict`
  therefore depends on the walk's order. Adding 2552 to `RESOLUTION_CODES` would make it consistent. That changes the
  lint's classes, so it is for a lane that owns them.
- A finding that quotes nothing and has no span keeps its reading (`relay`'s `mutation` finding in the fixture), as
  census-environment noted. Structured sites on findings would make it exact.
- Commits carry the owner's git identity, passed per command (`git -c`), and end with the brief's Co-Authored-By line.
