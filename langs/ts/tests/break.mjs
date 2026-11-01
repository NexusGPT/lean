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
  'opaque-drop-read': 'translate/opaque.mjs opaqueForm: the first read of an opaque step is dropped (lanes w1a, w1b: a statement site\'s step is the same opaqueForm, its read-only values first)',
  'opaque-drop-write': 'translate/opaque.mjs opaqueForm: the first written output of an opaque step is dropped (lanes w1a, w1b)',
  'opaque-drop-callees': 'translate/translate.mjs opaqueTail, opaqueStep: the same-file callee texts leave the step\'s key, and a statement step\'s CALLS line is not written (lanes w1a, w1b)',
  'opaque-drop-sharing': 'translate/translate.mjs opaqueStep: a statement step that changes or compares an object is admitted after a statement that may share one (lane w1b; no pair flips: the heap identity guard refuses first, design/w1b-opaque-statements.md)',
};
export { BREAK_ENV, broken } from '../break.mjs'; // the switch lives beside the product (langs/ts/break.mjs, w1a)
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
