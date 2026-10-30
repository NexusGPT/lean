# B1-certificate-timing: result

Branch `lane/B1-certificate-timing`, from lead head 6421be639. Commits: 7d3e79f8d (timing), 07b98b8e5 (bin/lean and
the README quickstart), 43f63b408 (design note, assurance case), and the commit that adds this file. No verdict was
changed and no pair expectation was touched.

## What was done and why

**certificate.timing.** `check.mjs` now writes the wall-clock seconds of each lane that ran into `certificate.timing`:
`B` (exec/run.mjs runPair), `correspondence` (the certified rungs before translation), `doubles` (solve/fp.mjs, recorded
when the reading applies to the unit, the same condition under which `lanes.A.doubles` is recorded), `translate`
(both sides, summed over the heap-core agreement's rounds), `theorem` (spec/theorem.py) and `dafny` (dafny verify).
One timer (`timer` in check.mjs) wraps the call that runs each lane and adds its seconds under that lane's key. Since a
key is only written when its lane runs, a lane that did not run has no key, never a zero. The brief named B, doubles,
translate, theorem and dafny. I added `correspondence` as well: a unit those rungs decide never translates, so without
that key its lane A cost would be missing from the certificate. No decision in check.mjs reads `timing`.

**bin/lean.** An executable node script. `lean check | lint | pr | census` runs `langs/ts/check.mjs`,
`langs/ts/lint/lint.mjs`, `langs/ts/pr.mjs` or `langs/ts/census.mjs` from the caller's directory with every following
argument passed through. It returns the script's exit code, or 128 + the signal number if the script was stopped. No
command or an unknown one exits 2 with usage; `--help` exits 0.

**The README quickstart was stale.** It was already stale on the base 6421be639: `node langs/ts/check.mjs ...
--seed 3` gives `{"input":17,"floor":-1,"parent":1,"candidate":0}`, while the README showed input 12, floor 1. It is
still an event landing exactly on the floor (a debit of 1 from a new account, floor -1). With the lead's agreement I
changed only the README's shown line and the sentence describing that input. The new row reads the quickstart from the
README, so the next time they drift apart the suite goes red.

**Assurance case.** `docs/ASSURANCE.md` section 3 now lists `timing` and names the check `runtime certificate-timing`.
Two fixes came out of running `scripts/assurance-check.mjs`:
- The certificate allowlist test (`tests/assurance/certificate.test.mjs`) rejects any certificate field not on its list. `timing` is added to the list, and the test now also asserts every timing value is a number, so no text can reach the certificate through that field.
- Found on the base: the assurance check looked for suite rows by the literal prefix `add('<kind>', '<name>'`. Since 582a99b0a, runtime rows are written as `scriptRow('<kind>', '<name>', ...)`, so `runtime clock-read` and `runtime no-silent-exit` were reported missing. It now accepts either form.

## Elements added

- `langs/ts/check.mjs`: `timer`, the `timing: {}` field on the certificate, and timed wrappers around runPair, certifyCorrespondence, solveUnit, the translate closure, theorem.py and dafny verify.
- `langs/ts/tests/certificate-timing.mjs` plus the runtime row `certificate-timing` in run.mjs. It checks three units:
  - `numbers::average` must have B and doubles.
  - `readme_ledger::applyAll` must have B, translate and theorem, and must not have dafny or doubles (the witness ends the run before Dafny).
  - `component::Counter` must have B.
  - Every key must be one of the six lanes and every value a positive finite number. If lane A ran, at least one lane A key must be present.
- `bin/lean`.
- `langs/ts/tests/bin-lean.mjs` plus the runtime row `bin-lean`. It runs the README quickstart through `bin/lean check` and checks the usage exits, the lint's exit 1 on findings, pr's usage exit 2 and census's `--help` exit 0.
- `langs/ts/design/certificate-timing.md`: the dated section.
- `docs/ASSURANCE.md`: one line. `scripts/assurance-check.mjs`: the `certificate-timing` entry and the scriptRow form.
- `lane/B1-certificate-timing-R10.py`: a replacement for `def R10` in DA `harness/regress.sh`, described below.

## Before and after

- `node langs/ts/tests/certificate-timing.mjs`:
  - Before (6421be639 plus the test): exit 1, all three units `no certificate.timing`.
  - After: exit 0. For example, `readme_ledger::applyAll WITNESS timing {"B":1.26,"translate":1.60,"theorem":0.085}` and `numbers::average PASS-proved timing {"B":0.64,"correspondence":0.13,"doubles":0.14,"translate":1.39,"theorem":0.061,"dafny":2.50}`.
- `node langs/ts/tests/bin-lean.mjs`: first run red, because the README showed input 12 where the product gives input 17 (on the base too). After the README fix: exit 0, 7 of 7 ok.
- `JOBS=4 node langs/ts/tests/run.mjs --pair numbers | readme_ledger | component`: 9, 15 and 5 checks, all pass, verdicts unchanged.
- `node langs/ts/tests/fixtures/pr-intake/test.mjs`: exit 0. A reused certificate is byte-identical, carrying the timing of the run that produced it.
- `node scripts/assurance-check.mjs`:
  - Before: 4 of 20 failed. clock-read and no-silent-exit were reported missing on the base; certificate-timing was missing; the allowlist test failed on `timing`.
  - After: 20 of 20 pass.
- `node --test langs/ts/tests/assurance/certificate.test.mjs`: 5 pass, 0 fail.
- R10 replacement, driven against this head with DA's suite step stubbed and DA's own R10 parse rule applied (null baseline, tolerance 0.1). Command: `python3 -I /root/lanes/B1-certificate-timing/r10/drive.py <tree> <out> full lane/B1-certificate-timing-R10.py`. Result: parse True on all 20 manifest units. B is 1.03 to 1.25 s per unit. A is 1.67 to 8.65 s; the high end is `numbers_bits::coerce`, of which doubles is 3.9 s.

## What is left

- **R10 on the Mac (lead).** Replace `def R10` in DA `harness/regress.sh` with `lane/B1-certificate-timing-R10.py` (its `LANE_A_KEYS` line and its function), then re-cut both the smoke and full baselines:
  - A no longer means the old soundness.py pipeline. A is now what the product ran. For a unit lane B witnesses, that is translate + theorem only. The old row ran lane A to Dafny on every unit and required `PASS-proved` or `ASK:unproved` from it.
  - B is now runPair inside check.mjs, not a separate exec/run.mjs process, so it excludes Node startup.
  - The TIMING line keeps its keys and adds `lanes`, the per-unit timing record. DA's parser ignores extra keys.
- **The full suite** runs at the merge, by the lead.

## Defects met

- The README quickstart output was stale on the base (fixed, as above).
- `scripts/assurance-check.mjs` reported two existing suite rows missing since 582a99b0a (fixed, as above).
- No git identity is configured on this machine. Commits carry the repository's existing author through `GIT_AUTHOR_*` / `GIT_COMMITTER_*` environment variables, with the lead's agreement; no config was written.
- Observed, not touched: at `--n 30`, check.mjs gives `numbers::discounted` ASK, while the pair's expect.json lists it as a lane B WITNESS at the pair's own n. The `numbers` pair passes at its own n; this is only a note for whoever reads R10's VERDICT lines.
