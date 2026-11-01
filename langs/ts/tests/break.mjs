// The one --break convention of the suite (W1 amendment A6; every lane uses it, nobody invents a second one).
//
// A mechanism that keeps a proof sound has a name. The code under test reads `LEAN_BREAK` (a comma-separated list of
// names) through `broken(name)` and, when its name is listed, skips that mechanism. A suite row runs a named pair with
// the variable set and asserts the verdict flips: a lemma the pair expects not proved becomes proved (a false
// PASS-proved the suite refuses to count as a pass), so the row shows the mechanism is what keeps the pair honest.
//
// In a pair's expect.json:
//   "break": [{ "mechanism": "<name>", "equal": { "<lemma unit>": true } }]
// `equal` lists the lemmas the broken run proves; each must be expected `false` in the pair's own `equal` (a flip).
// The runner (tests/run.mjs) translates both sides again with LEAN_BREAK=<name> and checks each listed lemma.
//
// Mechanisms registered here, one line each, by the lane that owns them:
export const MECHANISMS = {
  'opaque-drop-read': 'translate/opaque.mjs opaqueForm: the first scalar read of an opaque step is dropped (lane w1a)',
  'opaque-drop-write': 'translate/opaque.mjs opaqueForm: the first written output of an opaque step is dropped (lane w1a)',
  'opaque-drop-callees': 'translate/translate.mjs opaqueTail: the code the step reaches leaves its key and its CALLS line is not written (lane w1a)',
  'handle-value': 'translate/translate.mjs handleNow: a read of a handed object after the call takes it as it was before the call, not ext_now (lane w1g)',
  'reach-closure': 'common.mjs readAfterCall share: a read through a holder of what the call was handed is not counted as reached (lane w1g)',
  'handed-skeleton': 'translate/translate.mjs handedArg: which parts of a handed literal are new leaves the handed term\'s name (lane w1g)',
  'assertion-read': 'translate/translate.mjs convertToD: the outside slot\'s conversion of a value whose type nothing checked stops reading the value (lane w1g)',
  'outside-slot': 'common.mjs outsideSlot: every callee taken for the outside, a same-file callee with a body included (lane w1g; tests/w1g-opaque-handed.mjs)',
};
export const BREAK_ENV = 'LEAN_BREAK';
export const broken = (name) => String(process.env[BREAK_ENV] ?? '').split(',').map((x) => x.trim()).includes(name);
// a pair's break rows, checked for shape: a mechanism must be registered, a lemma must flip
export function breakRows(exp) {
  const rows = [];
  for (const b of exp.break ?? []) {
    if (!MECHANISMS[b.mechanism]) throw new Error(`break: ${b.mechanism} is not a registered mechanism (tests/break.mjs MECHANISMS)`);
    for (const [unit, want] of Object.entries(b.equal ?? {})) {
      if (exp.equal?.[unit] !== false || want !== true) throw new Error(`break ${b.mechanism}: ${unit} must be expected not proved and proved under the break (a flip)`);
      rows.push({ mechanism: b.mechanism, unit });
    }
  }
  return rows;
}
