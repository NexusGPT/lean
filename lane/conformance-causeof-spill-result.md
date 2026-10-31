# conformance-causeof-spill: result (2026-10-31)

Base lead-09032a59; head: this branch. Logs (not committed): `/root/lanes/conformance-causeof-spill/work/`.

## Commits

- `bdba044cf` causeOf: two exact bigints that differ are a value difference, both values named; past 2^53 is a binary64 number (rule 1; `conformance/cause.mjs`, `cause.test.mjs`, row conformance/cause).
- `36008027c` The value reading carries a const second name of a parameter's instance: a write through either name rebinds the other (rule 2; `lower.mjs carriedAliases`, `translate.mjs partnerSync`, `heap.mjs` guard, `tests/carried-alias.mjs`, row runtime/carried-alias; class_handles/spill retired from `known-findings.json`).
- the commit holding this file: `design/conformance-readings.md` section 6 (dated note) and this result.

Rule 2's choice: **carry, not refuse.** At the base, `class_handles` FAILED (theorem generated: the translator made no parent.dfy). `sharedMutation` (dac8c5403) refused `spill`, and a translator refusal stops the whole file for the pair. A refusal could not have left `class_handles` green, and the lint already admits the form as the parameter's own cell (heldAlias). Carrying is exact for that form, so the value reading now holds one value under both names (conformance-readings.md section 6).

## Pairs (`JOBS=2 node langs/ts/tests/run.mjs --pair <p>`) at head

| pair | checks | base | head |
|---|---|---|---|
| class_handles | 26 | FAIL (1 check: theorem generated) | ALL PASS |
| heap_canonical | 13 | | ALL PASS |
| type_tests | 59 | | ALL PASS |
| copied_argument | 10 | | ALL PASS |
| types_symbol_bigint | 19 | | ALL PASS |
| array_copies_alias | 22 | | ALL PASS |

Tests: `conformance/cause.test.mjs` 3 of 6 at the base causeOf, 6 of 6 at head. `tests/carried-alias.mjs` 7 failed at the base, all hold at head. `conformance/select.test.mjs` 8 of 8.

`LEAN_PAIRS=class_handles,types_symbol_bigint node langs/ts/conformance/run.mjs`: exit 0, `| MODEL-CONFORMANCE TOTAL | 22 units in 2 pairs (0 skipped) | 9 executable: 9 agree, 0 disagree | ... | NO NEW FINDING |` (spill 8 agree, 0 disagree). At the base, class_handles was skipped (translation refused).

## Regression list

None found from this lane. Every pair file (595 files: parent and candidate of each pair) was translated with `--core --heap --no-project` at the base and at head. Only class_handles' two files differ.

## Full conformance row (`--jobs 8`, all pairs) at head

`| MODEL-CONFORMANCE TOTAL | 1769 units in 251 pairs (49 skipped) | 683 executable: 582 agree, 101 disagree | 881 not executable, 42 outside domain, 161 not bridged, 0 model error, 2 skipped | 22 coupling finding(s) (123 sampled) | 41 NEW FINDING(S) |`, exit 1. Known findings not seen: 0.

**The row is NOT green at head**, and its 41 NEW findings belong to the base. The ten pairs that hold them, run at the base (base tree, base conformance step, base known-findings), give the identical set: `41 NEW FINDING(S)`, the same units with the same counts. None of those pairs' translations changed in this lane. They are:

- array_copies_identity: spreadIdA, concatIdA, concatIdS, concatEmptyIdA, copiesBothA (array identity class).
- signed zero class: destructured_aliases/sweep, empty_literals/named, map_set_copy/hasTag, string_methods_real cut, half, tagged, tail and padded, template_literals status and shade, wider_record_argument/circ.
- class_fields_define: made, blank (record keys: the model has no key, Node `undefined`).
- identity_destructured/fallback (a record against null).
- this_method_override/Shifted.run: 22 coupling findings.

This lane added no entry for them: they come from other lanes' merges and are left to the lead. No cause in the row is a bigint value difference; "past 2^53" holds 2 (number side).

## Census

Not run: this lane's change reaches the value reading of `const h = b` on a file-class instance only. n8n and langchainjs were not run. nexus: not run, memory.

## Left

- The 41 NEW findings of the base full row (above): each needs triage, as a known class entry or a fix, by the lanes that added those pairs.
- The class_handles `expect.json` "why" still describes spill as a copy write withheld by the guard. That text is outside the rows this lane may change. The verdicts (`spill: false`, lane B WITNESS) still hold.
- An array or plain record bound to a second name (`const b = a`, array_copies_alias) could take the same carried reading exactly. Doing so would move array_copies_alias rows (sourcePushed lane A ASK), so it stays refused.
- The bigint cause carries both values, so each such difference is a cause of its own in the grouping. A known entry for one would have to name its cause per input, or leave `cause` unset.
