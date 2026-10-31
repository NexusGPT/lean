# conformance-new-41: result (2026-10-31)

Base lead-09032a59; head: this branch. Logs and JSON (not committed): `/root/lanes/conformance-new-41/conf-base.{log,json}`,
`conf-head.{log,json}`; attribution runs `attr-<commit>.log`.

| run | units | executable | agree | disagree | coupling findings | new | exit |
|---|---|---|---|---|---|---|---|
| base 09032a59, all pairs, --jobs 8 | 1756 (250 pairs, 50 skipped) | 682 | 581 | 101 | 22 | 41 NEW FINDING(S) | 1 |
| head, all pairs, --jobs 8 | 1756 (250 pairs, 50 skipped) | 682 | 584 | 98 | 0 (123 sampled) | NO NEW FINDING | 0 |

Known findings not seen in a pair that ran: 0 at both. Unit rows that moved between base and head (status and detail
compared word for word over all 1756): class_fields_define made, blank and identity_destructured fallback, DISAGREE to
agree; nothing else.

## Commits

- 726edad78 conformance: the pair's project in both lanes (pair.mjs, node-side.mjs, exec/run.mjs setFieldsProject), an
  optional mark's absence is undefined (pair.mjs absenceIn), a lemma under a cell obligation is withheld (pair.mjs
  laneAOf, run.mjs laneAText); 16 known-findings entries.
- the commit carrying this file: conformance-readings.md section 6 (the per-group table and the three readings).

## Groups (41 new = 19 units + 22 coupling inputs)

Attribution: each of the ten pairs is absent at 30569d74 and added by one first-parent merge; `LEAN_PAIRS=<pair>` at that
merge shows the same finding (attr logs), except destructured_aliases, wider_record_argument and template_literals,
whose translation crashed at their own merge (`matchGroupRead is not defined`) and which show it from d2b005b95 on.

| pair | units | count (input, side) | kind | merge | resolution |
|---|---|---|---|---|---|
| this_method_override | Shifted.run | 22 coupling inputs | a number | c75543f83 | fixed: lane A is ASK:obligation (cell audit), read as proved by conformance |
| class_fields_define | made, blank | 60 (parent) | a record key holding undefined | 5bb79e921 | fixed: conformance translated at --no-project, lane B at the pair's tsconfig (ES2022) |
| identity_destructured | fallback | 2 | a record against null | e6b00fe0b | fixed: null drawn into `tag?:` is outside the model domain |
| array_copies_identity | spreadIdA, concatIdA, concatIdS, concatEmptyIdA, copiesBothA | 120 | a boolean (array identity) | 7f4831e74 | known, class array identity (Node right) |
| string_methods_real | cut, half, tagged, tail, padded | 9 | a number (-0) | 0f0baff3f | known, class signed-zero (Node right) |
| template_literals | status, shade | 4 | a number (-0) | a6d9dc82a (visible from d2b005b95) | known, class signed-zero |
| destructured_aliases | sweep | 2 | a number (-0) | 7856986cf (visible from d2b005b95) | known, class signed-zero |
| wider_record_argument | circ | 2 | a number (-0) | 7856986cf (visible from d2b005b95) | known, class signed-zero |
| empty_literals | named | 2 | a number (-0) | eeefd6532 | known, class signed-zero |
| map_set_copy | hasTag | 2 | a number (-0) | 6e30d4abf | known, class signed-zero |

First suspects: no new finding is a bitwise or bigint value. arithmetic_core's bitwise units (clearlow among them) are
not executable at every input (bitwise operations are bodiless parts of the executable model): no input differs, so
neither side is wrong at one. types_symbol_bigint: every executable unit agrees.

Who is right, per fixed group: class_fields_define, Node (the pair states ES2022; the model was translated at other
options); identity_destructured/fallback input 0 `[{"none":"","tag":null}]`, the model, on its type (strict `tag?: Tag`
admits no null; Node returns null, the model the default); Shifted.run input `[420]`, Node (842 against 844: #base
changed), which is the content of the cell obligation that withholds the lemma.

## Pairs (`JOBS=2 node langs/ts/tests/run.mjs --pair <p>`) at head

class_fields_define 7, identity_destructured 19, this_method_override 34 checks: ALL PASS each.
`conformance/select.test.mjs`: 8 of 8 PASS. No expect.json changed.

## Regression

None: the full row at head moves only the three unit rows named above; 0 known findings vanished.

## Left

- The signed-zero class (85 units at head) and the array identity class (9 units) stay per-unit known findings until
  the number model carries -0 and the value reading carries identity.
- absenceIn reads a whole parameter's type text: a type naming both an optional mark and null (`{a?: X; b: Y | null}`)
  stays `either` at every position; a per-position absence would need the TypeScript type of each field in the model.
- Shifted.run: lane A could read a same-file `#m` method as a unit of its own, which would make the coupling a
  difference the lemma sees; that changes named_run/shifted_run rows, outside this lane.
