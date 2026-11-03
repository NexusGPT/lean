# w9bb: the hard set's ASK and unlisted causes, by class

The hard run hard36-9873874f64-1 lost six edits to `no-witness/other-verdict` (five ASK) and `no-witness/unit-not-listed`
(one). Each reason was traced to its construct, the construct named as a class, and the class counted on the dev set
(s75-9873874f64-dab363-1) and on the hard run's own 32 records. The census is the result file's table
(`lane/w9bb-hard-ask-census-result.md`); here, what each mechanism does and why it is general. Every mechanism has a
`LEAN_BREAK` name (tests/break.mjs) and a check in `tests/w9bb-hard-ask.mjs`, red under its break.

## F. A source file with a NUL byte read as binary (`w9bb-source-nul`)

n8n's `quickjs-bridge.ts` builds a cache key with two raw NUL characters inside a template literal. Lean called a file
binary when either side held a NUL anywhere (`ci/ledger.mjs`, `pr.mjs`); git called it text (its own guess reads the
first 8000 bytes only), so the file's edits became one `artifact:binary` row and no unit was listed.

The rule (`ci/ledger.mjs binaryBytes`): a NUL is binary, except in a JavaScript or TypeScript file whose bytes are valid
UTF-8. A NUL is a legal character of source text; the parser reads it. Git's own verdict on such a file is its NUL
guess too, so it yields to the same rule unless an attribute declares the path (`binary`, `-diff`; `git check-attr
--source <head>`): an author's declaration stays binary. Such a file is diffed with `--text`. Not affected: every other
file (an image, a key, a data file) keeps the NUL test and git's verdict.

## D and E. The new unit's runner: its bound, its reason, its late errors (`w9bb-runner-bound`, `w9bb-runner-reason`, `w9bb-runner-late-errors`)

A unit no parent holds (a file the PR adds) runs in `exec/new-unit.mjs runNew`, in a child of its own. That child was a
`spawnSync` under a wall bound, max(30 s, (n + 78 trial runs) x ms + 10 s): 226 s at the bench's n = 30, ms = 2000. The
paired lane B worker has been bounded by its own CPU time since lane bench-scoring (a wall bound under a load of 100 had
killed 15 of 21 clean-lane units); the new-unit runner was the spawn that change did not reach. Under a load of 60 to
117 on 32 cores the hard run lost 25 units of three three.js records to `spawnSync /usr/bin/node ETIMEDOUT`.

- **The budget** is the same number, now of the runner's main-thread CPU time: (n + 78) x ms + 10 s, at least 30 s. It
  depends on n (the draws), ms (one call's bound) and the 78 parameter trials (BASES x (1 + TRIAL_PARAMS x DONORS)),
  never on the machine. A wall guard FAR_GUARD (10) times longer stays for a child that burns no CPU and never answers;
  a host with no CPU reading keeps the wall bound at the CPU bound, as the paired worker does (`exec/run.mjs
  boundedChild`, `watchCpu`).
- **Under load** the runner is not killed for the machine's slowness: CPU time does not stretch with load. A runner that
  does pass its budget is ASK with the budget it hit as its reason: `runner-bound: the candidate runner passed its
  CPU-time bound of 226 s (max(30 s, (n 30 + 78 trial runs) x 2000 ms + 10 s)) after W s of wall time and C s of CPU
  time, one-minute load L on K cores`, and the bound in the result's `bound`. A longer wall timeout alone was not the
  change: the bound is now the one quantity the unit controls.
- **An exit with no result** (`candidate runner exited 1: `, empty: the reason held the stdout, the stderr went to lean's
  stderr only) now says why: `candidate runner exited <status>: <stderr's last words>`, a V8 `FATAL ERROR` or an
  uncaught error's line first (`exec/run.mjs stderrCause`).
- **The exit's cause in n8n#41805** (reproduced byte-equal on lean 5d6fef8ef1: `candidate runner exited 1: `; its stderr:
  `lean: unhandled rejection outside a unit run: Error: Sandbox "N8nSandboxServiceSandbox" failed to start (status:
  pending)`) was lean's, not the checker's. The mutant moves `await this.recoveryPromise` before the assignment, so the
  recovery promise rejects with nobody awaiting it. Lean's late-error hooks record such an error while a unit run is in
  flight (design/no-silent-exit.md, 2026-10-28), but only `runPairInProcess` counted a run: the runner child of a new unit
  called `runNew` uncounted, took the unit's rejection for its own and exited 1. The child now counts its run
  (`exec/run.mjs inUnitRun`, `w9bb-runner-late-errors`): the rejection is the unit's `late-error` record and the unit is
  NEW. The checker needs no change.

## C. The WHATWG event classes in the sandbox (`w9bb-platform-events`)

`class LegacySyntheticEvent extends Event` (react-native-renderer) failed at its load: the sandbox held no `Event`.
design/lib-globals.md keeps the host names a program's world sets (`navigator`, `location`) absent. `Event`,
`EventTarget`, `CustomEvent` and `DOMException` are not such names: every host a program runs on (Node >= 15, every
browser, React Native) holds them with one standard behaviour, as it holds `URL` and `TextEncoder`, which the sandbox
already gives. They are Node's own classes; the one world read in them, an event's `timeStamp`, reads the input's clock
(`performance.now`), so both sides of a pair read the same instant. `primordials` (node's own lib, node#66154) stays
ASK: it is node's bootstrap binding, no host's global.

## B. A module declared through its types package (`w9bb-types-declared`)

`import { $ } from "bun"` in a package that declares `"@types/bun"`; `import * as vscode from "vscode"` in one that
declares `"@types/vscode"`. These modules are the host runtime's, never installed; their types package is how a project
declares them. A declared package is the recording fake (`exec/new-unit.mjs resolveModule`); a package declared through
`@types/<name>` (DefinitelyTyped naming: `@a/b` is `@types/a__b`) is now declared too, and a scheme specifier
(`bun:sqlite`) is its scheme's package. For `vscode` this is the lead's decision C (exec/fakes/lib/index.mjs): its
import stays the recording proxy, never the model. Not affected: a package neither the package.json nor its types
declare stays `ASK(undeclared external package)` (`tinycolor2`), and an unresolved path alias (`$lib/...`) is another
construct.

## A. A vendored library outside its compatibility line (`w9bb-vendored-range`)

Lean vendors zod 3.25.76; Checkmate declares `"zod": "^4.1.11"` and calls `z.email()` (zod 4), so its schema module
threw at its load: the fake answered for a version it is not. A vendored row now answers only when the range the nearest
package.json above the unit declares for the package is compatible with the vendored version (`exec/fakes/lib/range.mjs
compatible`): the range admits it, or one of its sets starts on its line (the same major; the same major.minor below
1.0.0), where semver keeps the API: an exact pin `dayjs@1.11.13` keeps the vendored 1.11.23. Another major falls back to
the recording proxy, as for any declared package; a range lean cannot read (`catalog:`, `workspace:`, a tag, a URL)
keeps the row as before. In the six hard checkouts, three declarations leave the row: zod 4 (Checkmate, cline) and
date-fns 4 (cline). The row back for them is a second vendored major (zod 4, date-fns 4), a vendor.mjs task.

## What was not changed

- `exec/new-unit.mjs runNewFile` (the census batch child) keeps its wall bound; its reason already names it.
- No longer timeout anywhere; no set of names, packages or files special-cased: each rule reads the construct (a NUL in
  UTF-8 source, a CPU budget, a standard host class, a types declaration, a version range).
