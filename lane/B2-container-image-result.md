# B2-container-image: result

## What was done and why

The repository now has a container image with both lanes and nothing to install. `Dockerfile` at the root builds it from
pinned inputs: node 24.22.2 (bookworm-slim), the distribution's python3, the Dafny 4.11.0 release zip checked against
its sha256, and the Z3 that release bundles. Built on this server with `docker build -t lean:local .`. Inside the image,
the README quickstart prints a ledger `WITNESS`, and ten lane-A pairs plus `readme_ledger` pass. A job in
`.github/workflows/lean-self.yml` builds the image and runs the same ten pairs inside it. That workflow was not run;
the lead runs it. Nothing under `langs/` changed, and no `expect.json` changed.

There is no red pair. This lane changes no reading, so the before/after pair for this lane is the image itself. Before
the two fixes below, `nested_ternary` was red inside the image and the quickstart gave `ASK` there. After the fixes,
both pass.

## Elements added, and why each one is needed

- `Dockerfile`
  - Base image `node:24.22.2-bookworm-slim`, not node 20. Lane B forks its worker with Node's permission model:
    `langs/ts/exec/run.mjs:1061` passes `--permission`. node 20.20.2 rejects that flag ("bad option"), so on node 20
    the quickstart reports `ASK` instead of `WITNESS`. This is a fact of the code, so the brief's "node 20" cannot
    hold. node 24 is what the host and `lean-self.yml` already use.
  - `python3`: `spec/theorem.py` writes the theorem.
  - `libicu72`: the .NET runtime that Dafny runs on needs it.
  - `git`: `pr.mjs` and the pair repositories use it.
  - `jq`: the README quickstart's second line uses it.
  - `curl` and `unzip` are removed again after the download.
  - Dafny 4.11.0 from the release zip, with `DAFNY_SHA256` pinned and checked by `sha256sum -c`.
  - `/usr/local/bin/z3` is a link to the bundled `z3-4.12.1`.
    - Why it is needed: `solve/fp.mjs` (the doubles rung) runs `z3` from PATH. Without the link, `nested_ternary`
      failed inside the image on `Equal_wrong witness (doubles)` with "solver error". On the host it passes because
      `/usr/bin/z3` exists.
    - Why 4.12.1: it is the binary Dafny 4.11.0 verifies with. Checked by removing it in a throwaway container: Dafny
      then fails with "trying to start process '/usr/local/bin/z3'". With 4.14.1 removed instead, Dafny still
      verifies. 4.12.1 is also the Z3 that `check.mjs` `z3Record` writes into the certificate ("bundled beside
      dafny"). The proof lane and the doubles rung therefore use one pinned solver.
- `scripts/lean-docker.sh` is the entrypoint.
  - `docker run <image> check|pr|convert|census|patch …` runs `langs/ts/<tool>.mjs`.
  - `lint|translate` runs `langs/ts/<tool>/<tool>.mjs`.
  - `help` or no argument prints the usage.
  - Any other first word runs as a command inside `/lean`.
- `.dockerignore` excludes `.git`, `node_modules`, caches and `lane/`.
- `.github/workflows/lean-self.yml`
  - New job `image`: `docker build -t lean:ci .`, then the ten pairs in a single `docker run`. It fails if any pair
    fails.
  - The trigger paths now also include `Dockerfile`, `.dockerignore` and `scripts/lean-docker.sh`. When only those
    change, the existing `pairs` job finds no touched pairs and skips its two real steps.
- `README.md`
  - The quickstart comment now says node ≥ 24. It said node ≥ 20, which is false (see above). Only node 24 was run;
    node 22.13+ also has `--permission` but was not tried.
  - New paragraph under "Using it": the image, its pinned toolchain, its size, and three commands. Each command was
    run in the image.

## Commands and outputs (all on this server)

- Build: `docker build -t lean:local .` gives exit 0, `Successfully tagged lean:local`.
- Size: `docker image ls lean:local` gives `lean:local da3ccb346d0b 873MB (disk usage) 216MB (content size)`.
- Toolchain inside: `dafny --version` gives `4.11.0+fcb2042d…`. `z3 --version` gives `Z3 version 4.12.1 - 64 bit`.
  `node --version` gives `v24.22.2`. `python3 --version` gives `Python 3.11.2`.
- README quickstart inside:
  `docker run --rm lean:local sh -c 'node langs/ts/check.mjs --parent langs/ts/tests/pairs/readme_ledger/parent.ts --candidate langs/ts/tests/pairs/readme_ledger/candidate.ts --unit applyAll --no-project --n 60 --seed 3 --out ledger.json; jq -c ".witness | {input, floor: .args[3], parent: .parent.outcome.returned.posted, candidate: .candidate.outcome.returned.posted}" ledger.json'`
  - Output: `WITNESS -> ledger.json`, then `{"input":17,"floor":-1,"parent":1,"candidate":0}`.
  - The same command on the host prints the same line (see defects).
- The same quickstart on node 20.20.2, before the fix: `/usr/local/bin/node: bad option: --permission`, then
  `ASK -> ledger.json`.
- The entrypoint form:
  `docker run --rm -v /tmp/b2dl/work:/work -w /work lean:local check --parent parent.ts --candidate candidate.ts --unit statement --no-project --n 60 --seed 3 --dafny-seconds 30 --out statement.json`
  - Output: `PASS-proved -> statement.json`.
  - The certificate's tools: `{"node":"v24.22.2","dafny":"4.11.0+fcb2042d…","z3":"Z3 version 4.12.1 - 64 bit","z3Source":"bundled beside dafny"}`.
- The ten pairs inside. Every chosen pair's `expect.json` carries `PASS-proved` rows:
  `docker run --rm -e PAIRS="…" lean:local sh -c 'for p in $PAIRS; do JOBS=4 node langs/ts/tests/run.mjs --pair "$p"; done'`
  - Overall: exit 0, 3 min 4 s wall.

  | pair | checks | result |
  |---|---|---|
  | cheap_rungs_congruence | 2 | ALL PASS |
  | cheap_rungs_normalised | 2 | ALL PASS |
  | cheap_rungs_parsed | 2 | ALL PASS |
  | nested_ternary | 7 | ALL PASS |
  | prelude_unit_added | 5 | ALL PASS |
  | definite_assignment | 4 | ALL PASS |
  | prelude_unit | 9 | ALL PASS |
  | non_null | 5 | ALL PASS |
  | narrow_in | 11 | ALL PASS |
  | known_values | 13 | ALL PASS |

  - Before the z3 link: `nested_ternary` gave 1 FAILED of 7 (`Equal_wrong witness (doubles)`, "doubles unknown:
    solver error"). The other nine passed.
  - Host comparison: `JOBS=4 node langs/ts/tests/run.mjs --pair nested_ternary` gives 7 checks ALL PASS.
- `readme_ledger` pair inside: `docker run --rm lean:local sh -c 'JOBS=4 node langs/ts/tests/run.mjs --pair readme_ledger'`
  gives 15 checks ALL PASS, 25 s.

## Defects met (findings, not fixed here)

1. **The README quickstart output is stale on this head.** The README shows
   `{"input":12,"floor":1,"parent":2,"candidate":0}`. The host and the image both print
   `{"input":17,"floor":-1,"parent":1,"candidate":0}`. It is still a `WITNESS` of the same slip. The prose below the
   output describes the old witness ("a floor of 1 and two credits of 1"), so the output line and that prose need
   rewriting together from the new witness. I left it to the README's owner.
2. **The README claimed node ≥ 20.** Lane B needs `--permission`. Fixed in the README line. `docs/` has no other
   node-version claim.
3. **Without git history inside the image, lane B prints "witness record head unavailable (this copy of lean has no git
   history of its own)" on stderr.** `.git` is excluded from the image; in a worktree it is only a pointer file anyway.
   Verdicts are unaffected.
4. **Files the container writes to a mounted directory belong to root.** Pass `--user "$(id -u):$(id -g)"` if that
   matters.

## What is left

- Publishing to `ghcr.io/nexusgpt/lean` needs a workflow with `packages: write` and a push. Nothing was pushed.
- The existing `pairs` job of `lean-self.yml` could then run in that published image (`container:`) instead of
  `brew install dafny`. That only makes sense once the image is published, so I did not change it.
- The README quickstart output and its prose (defect 1).
- Node 22.13+ was not tried. The README says ≥ 24 because only 24 was run.
