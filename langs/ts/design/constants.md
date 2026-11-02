# Lean's numbers

The named constants that bound or shape a run, where each lives, and why it has its value. A constant added to lean
gets a row here, naming the design note that argues for it.

| constant | value | where | what it bounds | why |
|---|---|---|---|---|
| `WITNESS_SITES` | 8 | `exec/sites.mjs` | distinct witness sites lane B holds before it stops drawing | a unit with more changed statements than this is a rewrite, and eight sites already name where to look; below it, every site the budget reaches is named (design/w8n-all-sites.md) |
| `WITNESS_SHARE` | 0.25 | `exec/sites.mjs` | the share of the unit's seconds lane B may draw past its first witness | the extra draws must never turn a WITNESS into a spin-bound ASK; a quarter is the share the input search takes (design/w3c-search-inputs.md, design/w8n-all-sites.md) |
| `SEARCH_SHARE` | 0.25 | `exec/search.mjs` | the share of the unit's seconds lane B's input search may take | the share w3c measured at 1.02x per unit; the draws and the search together stay inside the unit's bound (design/w3c-search-inputs.md) |
| `REACH_CEILING` | 0.75 | `exec/search.mjs` | past a witness, the search for the changed statements ends by this share of the unit's seconds since the unit began | the draws past the first witness take up to `WITNESS_SHARE`; with the search inside three quarters, a quarter is left before the unit's bound, which must never turn the WITNESS into an ASK (design/w9i-reach.md) |
| `UNIT_SECONDS` | 120 | `exec/run.mjs` | one unit's lane B bound when no flag or run budget names one | design/microtask-worker.md, design/suite.md |
| `FAR_GUARD`, `CPU_POLL_MS`, `CONTENTION_CAP` | 10, 1000, 3 | `exec/run.mjs` | the wall-clock guard over the CPU bound, its poll, the largest CPU slowdown believed | the comment at their definition |
| `MAX_DRIVES`, `DRIVE_DEPTH`, `DRIVE_ARGS`, `DRIVE_STEPS`, `DRIVE_METHODS`, `DRIVE_CALLS` | 64, 3, 3, 4, 16, 3 | `exec/run.mjs` | how far lane B drives functions a unit hands out | design/callbacks.md |
| `--n` default | 200 (30 in the suite and the bench) | `check.mjs`, `exec/run.mjs` | lane B's inputs per unit | the input budget every other bound sits under |
