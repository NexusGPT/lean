# Lean's numbers

The named constants that bound or shape a run, where each lives, and why it has its value. A constant added to lean
gets a row here, naming the design note that argues for it.

| constant | value | where | what it bounds | why |
|---|---|---|---|---|
| `WITNESS_SITES` | 8 | `exec/sites.mjs` | distinct witness sites lane B holds before it stops drawing | a unit with more changed statements than this is a rewrite, and eight sites already name where to look; below it, every site the budget reaches is named (design/w8n-all-sites.md) |
| `WITNESS_SHARE` | 0.25 | `exec/sites.mjs` | the share of the unit's seconds lane B may draw past its first witness | the extra draws must never turn a WITNESS into a spin-bound ASK; a quarter is the share the input search takes (design/w3c-search-inputs.md, design/w8n-all-sites.md) |
| `UNIT_SECONDS` | 120 | `exec/run.mjs` | one unit's lane B bound when no flag or run budget names one | design/microtask-worker.md, design/suite.md |
| `FAR_GUARD`, `CPU_POLL_MS`, `CONTENTION_CAP` | 10, 1000, 3 | `exec/run.mjs` | the wall-clock guard over the CPU bound, its poll, the largest CPU slowdown believed | the comment at their definition |
| `MAX_DRIVES`, `DRIVE_DEPTH`, `DRIVE_ARGS`, `DRIVE_STEPS`, `DRIVE_METHODS`, `DRIVE_CALLS` | 64, 3, 3, 4, 16, 3 | `exec/run.mjs` | how far lane B drives functions a unit hands out | design/callbacks.md |
| `--n` default | 200 (30 in the suite and the bench) | `check.mjs`, `exec/run.mjs` | lane B's inputs per unit | the input budget every other bound sits under |
