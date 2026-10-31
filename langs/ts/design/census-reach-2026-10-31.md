# Census reach between lean f3cb5b41 and 2a6c7bb6 (2026-10-31)

The regression row R6 entered 45,309 of 91,344 units (49.6%) at f3cb5b41 and 33,064 (36.2%) at 2a6c7bb6, on the
same 39 roots and the same units. This note names, for every lost unit, the reading that stopped it, the commit that
made it stop, and whether the stop is a reading made stricter on purpose, a defect, the environment, or load.

## Method

Runs, read in place: `regress/f3cb5b4/20261030T101458.109218Z/` and `regress/2a6c7bb/20261030T171714.047500Z/` (DA).
A unit's state is the census's own (census.mjs): stopped by its first `unresolved-module` finding, else its first
language finding, else covered by a stopped enclosing unit. This rebuilds both totals exactly (45,309 and 33,064).
12,478 units entered at f3cb5b41 and not at 2a6c7bb6; 233 went the other way; net 12,245. Each group below was
bisected over the first-parent history f3cb5b41..2a6c7bb6 on one unit (`census.mjs <root> --include <file>`, the lean
tree of each commit by `git archive`), and every lost file was re-run at master 5f96f554 and at this branch.

## Not load

Every root is `complete: true` at both heads, no file is unreadable, and the per-root seconds fell, not rose. Each
lost unit carries a language finding at 2a6c7bb6, and the same finding comes back on an idle single-file run. Load
stopped nothing.

## The groups

| group | units (own + covered) | commit (merge) | class |
|---|---:|---|---|
| read-after-call | 10,152 (7,663 + 2,489) | f0047f87, merged 79be14b5; narrowed 91d8b609 | on purpose; mostly met through the environment; one over-count fixed here |
| copied-argument | 2,268 (2,011 + 257) | 417fe138, 1ac7ed49, 24736a05, merged c5f1be03 | on purpose; one over-count fixed here |
| type-assertion | 55 (42 + 13) | 4f73cf5b (lane A1), merged fc6c6498 | on purpose: a hole closed (type-assertions.md names GalleryView) |
| loops | 2 | read-after-call at 79be14b5, then 91d8b609 (merged def3f1d1) | on purpose; entered again at master and here |
| uncatalogued | 1 | the copied-argument merge | defect in naming, fixed here (the unit stays refused) |

Reproduced units (entered at f3cb5b41, stopped at 2a6c7bb6): agent-nexus `check-publish-pin.ts` readBundlePin
(read-after-call); agent-nexus `check-skills-lock.ts` writeCleanFixture (copied-argument); apps-ui `GalleryView.tsx`
GalleryView, pyka `queries.ts` toDeal, nexus-landing `WhitepaperArticle.tsx` parseHeadings (type-assertion, first
stopped by read-after-call at 79be14b5, by type-assertion from fc6c6498); nexus-landing `page 2.tsx`
CustomerSupportPage (uncatalogued).

### read-after-call: the rule is sound, the environment feeds it any values

The rule (alias-result.md, 2026-10-30) refuses a read without the world of an object a call may reach, and an any or
unknown value reaches anything. 7,223 of the 10,152 lost units sit in files where a module or a global does not
resolve (R6 runs with no install). At master, of the read-after-call refusals among the lost units, the value the
call is handed, or the value read, has the checker's error type (an unresolved name) in 2,899, is any or unknown in
489, is typed in 1,349, and the call sits on a path that leaves the function in 300.

The environment claim, probed: readBundlePin's file with `node:fs`, `node:path`, `node:url`, `console` and `process`
declared (a shim, scratch only) enters readBundlePin at f3cb5b41, at 2a6c7bb6 and at master, 4 of 8 units at each:
the same unit is lost to the census only because `fs`, `BUNDLE` and `console` are error-typed. Before the rule, lane A
read those any calls as transitions and the field reads after them from before the call, which is the false-proof
form pair `alias_after_call` records. The 49.6% counted such readings. The floor's baseline included them.

The typed refusals are the rule as designed: an object handed to an outside call and then copied, spread, indexed,
or returned. The world read (master, 91a1384e, after 2a6c7bb6) already takes the field reads back: master enters
2,379 of the lost units.

One over-count, fixed here (exitsBefore, common.mjs): text order counted a call on a branch that returns or throws
before every later read, `if (!project) throw new NotFoundError(...)` then `project.organizationId`. Pair
`exit_before_read`: guarded was unproved on master and is proved now; a `break` (broken) and a `catch` (caught) still
put the call before the read, and lane B witnesses both.

### A false proof found on the way, fixed here

readAfterCall skipped a fresh argument of primitive parts also when the argument was a name bound to the literal:
`const x = { n: 1 }; g(x); return x.n` was PASS-proved equal to `g({ n: 1 }); return 1` on master. Only a literal
written in the call itself is skipped now. Pair `fresh_local_handed`. Four census units go out with it, each of this
form (`const t = {...}; validateTenantConfig(t); return t`).

### copied-argument: identities inside a new object

2,055 of the 2,268 are "a new object holding objects". Where every object part is itself a literal written inside it,
no name of the unit holds an inner object and none is another's, so the handed site names every identity; such a tree
is handed as one new object now (translate.mjs freshTree). Pair `fresh_tree_handed`: nested was refused and is proved;
a caller's object inside the literal (existingInside) and one object in two slots (shared) stay refused, and lane B
witnesses both. The rest hold a name, a member, a spread or a `new`, whose identity the reading does not carry.
Carrying them (hand the literal with each inner object replaced by its own handed identity) is the next lever.

### loops

nexus-landing drawMesh, in two copies of one scene file. Bisected: entered to 4cf4e6f0 except where read-after-call
stopped it (6b15e649, 4cf4e6f0), and from def3f1d1 (91d8b609, one decider) stopped by the loop-counter finding of a
callee it reaches (`raised at line 378, outside this unit`), as the narrowed rule reads a same-file callee's body.
Both copies are entered at master and on this branch.

### uncatalogued

The translator prefixes its refusal with `<file>:<line>: `; the parse took the path as a run of non-space
characters, so `page 2.tsx` lost its rule. Now the path is the text before the first `.<ext>:<line>: ` with no `: `
in it (readings.mjs translatorText, lower.mjs gateFinding). Test `tests/refusal-path-space.mjs`, red on 9 of 12 checks
before.

## Measured on the files holding the lost units (38,062 units)

| head | entered |
|---|---:|
| f3cb5b41 | 24,992 |
| 2a6c7bb6 | 12,586 |
| master 5f96f554 | 15,025 |
| lane/census-drop | 15,977 |

Branch against master on these files: 956 units more, 4 fewer (the closed false proof). The other 53,282 units of
the row entered 20,317 at f3cb5b41 and 20,478 at 2a6c7bb6. If they read as at 2a6c7bb6, the row would be 35,503
(38.9%) at master and 36,455 (39.9%) at this branch: a projection, not a run of the row.

## The floor

"A row below its floor re-opens the mechanism, never the floor." The mechanism the row measures has two parts here.
The readings: two over-counts and a naming defect are fixed above. The environment: about 58% of the remaining
read-after-call stops rest on a value whose type does not resolve, because R6 runs with no install. The census counts
those as language refusals, although its own rule says a unit judged on unknown types is environment-blocked; it
counts that only for a unit holding the unresolved finding, not for one reading a module constant or an import whose
type did not resolve. Re-counting them moves no unit into the subset. Running R6 with the census's install
(`--install-under`) would read them on their real types. Both are harness decisions, outside this lane.
