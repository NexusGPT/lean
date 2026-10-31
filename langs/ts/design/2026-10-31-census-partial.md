# An incomplete census is partial, named and non-zero (2026-10-31)

Lane fix-census-exit, plan 2026-10-30-next-read, board row 7e3e3c27.

## What was wrong

Lane core-outside-calls (`lane/core-outside-calls-result.md`, finding 2) saw the nexus census end early twice:
`census.mjs` left `"complete": false` after 4 chunks (4,800 files) and after 2 chunks (2,400 files), and
`design/heap-reach-census.mjs --resolve` stopped at 10,080 of 25,466 files, both with exit 0 and no line saying so.
The census walked in its own process. That process holds the compiler's programs, so it is the one the kernel's OOM
killer takes, and a process killed that way writes nothing: whatever exit its caller reports, the run's own output
carries no statement of what was not read. A run that ended with exit 0 before its last chunk was indistinguishable,
by its exit, from a whole one.

## The rule

A walk is complete exactly when its journal holds the `complete` record its walker appends last. Any other end (a
signal, a non-zero exit, an exit 0 before that record) is partial.

`walk-supervisor.mjs` holds the rule once. The census CLI is a supervisor: it plans the files (`censusFiles`, the
same list `census()` walks), writes the journal header and a pending summary, and runs the walk as a child of
itself (`--walker-journal <file>`, the same script). The supervisor holds no program, so it outlives the walk. When
the walk ends without the `complete` record, the supervisor:

- writes the `--out` JSON (atomically, as before) with `complete: false`, `partial: true`, `filesNotWalked` (the
  count), `notWalked` (the files, relative to the root as the records name them), `walked` (files, chunks, the units
  and entered of the last journaled chunk) and `walker` (pid, exit, signal); the summary carries no top-level `units`,
  so a reader keyed on the counts finds none;
- appends `{kind: 'partial'}` to the journal;
- prints `census incomplete: the walk was killed by SIGKILL; N of M files not walked (partial: true in <out>):` and
  the files (the first 50 when there is an `--out`, every one otherwise);
- exits non-zero: the walk's own non-zero code, 128 plus the signal's number for a walk killed by a signal, 1 for a
  walk that exited 0 early. A signal the supervisor itself received (SIGTERM, SIGINT, SIGHUP) is forwarded to the walk
  and, once the partial summary is written, raised again on the supervisor, so its caller sees what it sent.

The pending summary written before the walk already says `partial: true` with every planned file not walked: if the
supervisor is killed too, the summary still says partial. A walker whose supervisor is gone (reparented) stops at its
next file. `design/heap-reach-census.mjs` runs under the same supervisor: its `summary<-tag>.json` takes the same
fields (`notWalked` as absolute paths, its walk spans several roots), its journal is `walk<-tag>.records.jsonl`.

## The flag for readers

`partial: true` in the census JSON; `filesNotWalked` the count. DA's regress table (harness/regress.sh R6, not in
this repository) runs the census through `command`, which refuses a non-zero exit, and reads `units` from the JSON,
which a partial summary does not carry; a reader that wants the reason reads `partial`. `censusDiff` already refused
`complete: false`.

## Test

`tests/census_partial.mjs` (runtime row `census-partial`): four one-chunk projects; the walk is killed by SIGKILL
once its first chunk is journaled (the pid the census names in its `walker pid` line, the census process itself on a
census that walks in its own process), and in a second run an import hook makes the walk exit 0 right after its
first chunk line. Each must exit non-zero, write `partial: true` with `filesNotWalked` equal to the planned files no
journal record names and `notWalked` those files, and name them on stderr. The reach census takes the exit-0 case. A
whole run of each stays exit 0 and not partial. 18 rows; 10 fail on lean-30569d74, all pass after.
