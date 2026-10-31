# census-environment: result (2026-10-31)

Branch `lane/census-environment` from lean `lead-688a5a3e`. Commits:
- 1475df62c: test `langs/ts/tests/census_environment.mjs` (row census-environment in run.mjs, fixture
  `tests/fixtures/census-environment`) **and** the rule in census.mjs (`environmentOf`). They were meant as two commits
  (the test first, red), but the rule was staged during a failed first commit attempt (no git identity), and I did not
  amend. Red at the base: with census.mjs of 688a5a3e the test fails 3 of 9 checks (describe counted read-after-call,
  no reason, 0 environment-blocked); with the branch it holds 9 of 9.
- fa89e99d4: an exception while reading a finding's values is logged, and the finding keeps its reading.
- the design note commit (dated section in `langs/ts/design/census-reach-2026-10-31.md`) and this file.

## The rule
A stopping finding is the environment's when a value it names (its own node, or a `code` its message quotes, with
`(line N)` giving the line) has the checker's error type, traced to a name that does not resolve: a module that does not
resolve, an import its module lacks, a name with no declaration, or a member a dependency's declaration lacks. A unit all
of whose stopping findings are the environment's is `environment: <kind>`, and its reason names the value, the symbol,
the import and the refusal. A unit with even one finding on resolved types is stopped by that finding. No corpus name is
in the rule.

## Tests run
- census_environment.mjs: green (9/9); red on the base census.mjs (3 failures).
- census_example_message.mjs, census_usage.mjs, refusal-path-space.mjs: green.
- No pair expectation changed; the full suite was not run (the lead runs it at the merge).

## Measurement: nexus, one root, 25,466 files, 43,949 units, both complete

| class | no install | no install, old classing | install | install, old classing |
| --- | ---: | ---: | ---: | ---: |
| entered | 17,329 | 17,329 | 22,760 | 22,760 |
| environment | 6,227 | 4,596 | 283 | 70 |
| of which on an unresolved type | 1,631 | | 213 | |
| read-after-call | 1,444 | 2,813 | 2,026 | 2,216 |
| copied-argument | 2,312 | 2,312 | 2,244 | 2,244 |
| type-assertion | 1,812 | 1,850 | 2,046 | 2,066 |
| ts-strict | 2,556 | 2,528 | 2,201 | 2,193 |
| every other class | 3,591 | 3,843 | 4,344 | 4,355 |

Stopped units per class; the covered nested units are left out (8,678 no install, 8,045 install). The "old classing"
columns recompute the old rule from the same run's records. Run times: 2,036 s without install, 9,227 s with it.

- No install: the sources copied to `/root/lanes/census-environment/scratch/nexus-bare` without any `node_modules`.
- Install: `npm ci --ignore-scripts` does not apply, because nexus has a pnpm lockfile. The census's own install
  (`census-env.mjs install`: pinned `corepack pnpm@10.33.0 install --frozen-lockfile --ignore-scripts`) fetched 3,282
  of 3,288 packages, then failed with a 404 on the private `@agent-nexus/console-ui` (it needs registry credentials; none
  were used), and linked nothing. I asked the lead, got no answer in 120 s, and decided myself: the install run reads the
  census copy's own complete pnpm tree (the same lockfile), copied to `scratch/nexus-install`. The source files of the
  two copies are identical.
- The environment count moves: 6,227 → 283 (unresolved type 1,631 → 213).
- **The reading counts do not hold** between the two runs: read-after-call 1,444 → 2,026, types 82 → 221, names
  38 → 210, mutation 264 → 66. Of the 1,631 units that move into environment, the install lets 564 enter; 153 stay
  environment; the rest are refused by a reading on their real types (477 read-after-call, 123 copied-argument, 79
  type-assertion). Of the 11,715 units a reading stops without install, 8,790 keep their class with the install and
  2,925 change. Values the message does not quote change type too.
- Within one run, the rule moves units only into environment, or (for a unit with both kinds of finding) to its first
  finding on resolved types (ts-strict 2,528 → 2,556 without install).

Results: `scratch/runs/nexus-bare.json`, `nexus-install.json` (+ `.md` reports); tallies `scratch/tools/classes.mjs`,
`crosstab.mjs`.

## Left / findings
- With the install, 213 units are still unresolved, 113 of them on the generated Prisma client
  (`@nexus/prisma/client`): the generator has not run in the copy (stage-5 rule: generators run in the harness copies).
- 397 of the 1,631 units carry the kind `unresolved`: the import sits in another file the value's type comes from,
  and the kind is read only from the unit's own file's diagnostics. Reading it from the origin's file is the next fix
  (labels only; counts unchanged).
- The census copies hold macOS AppleDouble files (`._*.ts`, e.g. `apps/backend/._jest.setup.ts`). The census walks
  them as sources (`TS1490: File appears to be binary`, `Cannot find name 'Mac'`). The same files are in both runs here;
  the walk's skip rule is outside this lane.
- The rule reads the values a finding names from its span and its message's quoted code. Findings that quote nothing
  (the translator's line-only refusals with no quote) keep their reading. Carrying the decided nodes as structured sites
  on every finding would make it exact.
- Commit lines end with `Co-Authored-By: Claude Fable 5.1` as the brief requires. Commits carry the owner's git
  identity, passed per command (`git -c`), since this machine has none configured.
