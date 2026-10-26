# Candidate-only lane B harness patch

Apply `run_b.diff` with `patch -p1` from the harness directory. This lane applied it only
to `/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/harness-copy`. The original harness was never modified.
`/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/results-bench/new-unit-load/harness-test.json` records runs with a missing parent file and with a
parent file lacking the function. Both enumerate the candidate and return `NEW`.

The patch rescans actual exported candidate and parent files with `units.mjs`, so an
empty corpus function list does not hide an addition. It removes the export's parent-only
filter, passes no `--parent` for an absent file, and forwards candidate-only result fields.
An existing parent file is passed through; lane B detects an absent unit by syntax.
Candidate absence remains `ASK`. Existing changed-unit filters still apply, including the
harness's requested classes and line bound. The separate census has neither filter.

The default concurrency is capped at three. The script's main guard permits testing its
functions on a copy without running or writing the real corpus. Use `REDO=1` when old
cached ASK records exist; changing the runner does not invalidate old harness results.
The patch does not change `run_a.py` or its export implementation.

The applied test command was:

```sh
patch -d "/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/harness-copy" -p1 < "/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/harness-patches/run_b.diff"
```
