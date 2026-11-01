# Every witness of a row, and `--units` (lane w7a-lean-witnesses, 2026-11-01)

## Why

Lane B ends a WITNESS run with the differing inputs it found (`exec/run.mjs`: `witnesses: diffs`, up to three by
input). The `pr.mjs` row kept the first only (`witness: b.witnesses[0]`). When a change differs at two statements of
one unit, and the first differing input reaches the first statement, the row never names the second. A reader that
looks for a difference near a given edit (DA, which renders a comment per difference) then sees only the first one.
On the DA-Bench slice this happened in 12 of the 16 misses: the PR's own change was lane B's first difference and the
mutation's difference was dropped.

## Mechanism 1: `witnesses` on every WITNESS row

`check()` takes `witnesses: true` (pr.mjs passes it). On a lane B WITNESS run every result of that check carries lane
B's witnesses whole beside the certificate (`check.mjs`: a WeakMap from the certificate to lane B's list, read by
`finish`). Without the option `check()` returns what it did before, so `node check.mjs` output is unchanged.

`pr.mjs siteWitnesses(list)` turns that list into the row's `witnesses`:

- each entry has the row's witness form: `input`, `args`, `where`, plus `through` and `patch`/`patchSummary` when
  present. The `record` is dropped (it is the replay record, kept once on `witness` and in the certificate). The
  parent and candidate observations are not copied either, since the row's `witness` never carried them;
- two witnesses are **one site** when these are equal: `where.field`, the two sides' operations
  (`where.parent.op`, `where.candidate.op`, null for a non-trace field), and the candidate line
  (`where.lines.candidate.start`, else `where.lines.candidate.line`, else null). Only the first witness of a site is
  kept, and the order is lane B's;
- so `witnesses[0]` is `witness` without its record, and every reader of `witness` keeps working.

Rows that carry it, whenever their lane B verdict is WITNESS: the checked row (from `res.witnesses`, else the
certificate's lane B summary), the row of a unit the lint refused (lane B ran directly), the `IN-SCOPE` row, and the
caller row. The certificate, the verdict, the cache key and `witness` are unchanged.

The rule needs no knowledge of the change. It does not compare a witness with the diff's lines and does not prefer
one site over another, so it adds facts lane B already established and drops none.

## Mechanism 2: `pr.mjs --units <list>`

The list is comma separated (`common.mjs parseUnitList`, so a unit name with commas inside brackets or quotes works).
Each entry is `path::unit` (the path relative to the repo, a leading `./` dropped) or a bare unit name. A unit is kept
when its name or `file::name` is listed (`unitFilter`). It applies at two places:

- `prReport`: a ledger link to an unlisted unit gets no task, so the supervisor expects no row for it, and the
  reconciliation stays complete;
- `selectUnits`: the intake keeps the listed units only, so the worker runs lanes on those only. Callers are
  still found from the listed units, as before. An unlisted *changed* unit of the same file is not treated as an
  unchanged caller (it is changed; it was left out on purpose).

**No row, not a `filtered` row.** A `--units` run answers a narrower question than a whole PR run. A row with no
verdict for each unit left out would put "not checked" in the rows and the intake table, where a reader such as DA,
or a blocking level, would count it as an ASK the change raised. The ledger (`change.json`, the report's ledger
table) still lists every edit and the units it touches, so nothing is hidden from a reader of the run. Artifact rows
(non-unit edits) still appear, since they run no lane.

Without the flag nothing changes. The DA fast path (lane w7b) uses it to re-run lean on one mutated unit in seconds.

## Break switches

- `LEAN_BREAK=w7a-witnesses`: `siteWitnesses` keeps the first site only. `tests/pairs/two_sites` goes red
  (grade's row has one witness, not two).
- `LEAN_BREAK=w7a-units`: `unitFilter` ignores the list. The two `--units` runs of `two_sites` go red (the
  unlisted unit has a row).

## Validators

`tests/pairs/two_sites` (`prOnly`): grade changes at line 2 (`n > 100`) and line 3 (long `s`). Lane B finds three
differing inputs, at lines 2, 3, 2. The row has two `witnesses` at lines 2 and 3, and `witness` is the first. half
changes too. `--units index.ts::grade` gives grade's row and none for half; `--units half` gives the reverse;
without the flag both appear. The harness form (`tests/pr-pair.mjs`): a row's `sites: n`, and `pr.units: [{ units,
rows, absent }]`.

## Open

- Lane B stops after three differing inputs (`exec/run.mjs`, `diffs.length >= 3`). If the first three all reach the
  same statement, a second site is still not found. Raising the cap, or counting distinct sites rather than inputs,
  would change certificates (their lane B witness list), so this lane left it alone.
- A nested unit (`covered-by`) takes its enclosing unit's verdict. `--units` keeps exactly the listed names: list
  the enclosing unit too. Otherwise the nested row has no owner to take a verdict from, and its coverage reads
  `skipped:preview`. Listing the enclosing unit alone gives no rows for its nested units.
