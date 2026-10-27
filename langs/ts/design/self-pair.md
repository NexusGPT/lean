# A unit compared against itself never witnesses

## The defect

Lane B compared `getAdminToken` of a maintenance script with itself and answered WITNESS. The witness was an
environment program `[settle, return(4, 4)]` diverging at the settle step: the parent's trace held
`PrismaClient#1.$disconnect` and `console.error("Fatal:", ...)`, the candidate's trace was empty. Neither request
belongs to the unit: they are the script's own entry, `main().catch(...)` with a `finally { await prisma.$disconnect() }`,
run by the module body when the file loads. The witness reproduced on 3 runs of 3: a schedule defect, not a draw.

## The cause

The environment programs (`exec/program.mjs`) mounted both sides synchronously and cleared their traces at once, so
the continuations the two module bodies queued while loading were still waiting when the first command ran. The two
sides run in one process and share one event loop. The settle command took the parent's mark, drained the loop, took
the parent's slice, then did the same for the candidate: the parent's drain ran BOTH sides' queued work, so the
parent's records fell after its mark and the candidate's records before its own. One side observed work the other
side had already done off the record. The class is "an observation window that is per side over a loop that is
shared": a drain is never one side's window.

## The fix

- The setup of a program mounts both sides, drains the loop once, and clears what loading recorded on both. What a
  module does while loading is the starting state of every command, as the main run (`mountSides`), the re-render
  sequences and the class programs already treat it ("what the module did while loading is not the unit's
  behaviour").
- A settle takes both marks first, drains the shared loop once, then slices both traces.

## The invariant and the standing check

A file compared against itself is PASS-bounded by construction: the same seed, the same fakes, and windows that
cover the same work on both sides. Two checks keep it:
- the suite's runtime row "self-pair": every fixture under `tests/fixtures/self-pair/` runs against itself and must
  be PASS-bounded (`load-time-work.ts`, a module that starts asynchronous work on load beside a pure unit; WITNESS
  at the settle step before the fix, PASS-bounded after);
- the sweep `lean-v3/results/self-pair-<sha>/sweep.mjs`: every unit of every pair parent and the lane B sample units,
  each against itself, `--n 30`; any WITNESS fails it.
A difference in a module's load-time behaviour between parent and candidate is not this unit's observation in any
runner; the lane that owns the file body reports it. The one-input observation, the timers and the hook runtime are
unchanged: each already drained per side before the other side loaded.
