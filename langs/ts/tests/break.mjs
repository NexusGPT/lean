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
  'opaque-drop-write': 'translate/opaque.mjs opaqueForm and translate.mjs reachesOutside: the writes of an opaque step as its callers see them are dropped, its first written output and its reach to the world (lane w1a)',
  'opaque-drop-callees': 'translate/translate.mjs opaqueTail: the code the step reaches leaves its key and its CALLS line is not written (lane w1a)',
  'async-drop-reads': 'translate/translate.mjs opaqueExpression: an async-family step no longer reads the unit\'s locals (lane w1d)',
  'async-drop-origins': 'opaque-async.mjs stepWrites: a step writes the names it mentions only, not the names they share an object with (lane w1d)',
  'async-drop-callees': 'opaque-async.mjs reachedFunctions: the texts of the same-file functions a step reaches leave its key (lane w1d)',
  'async-drop-carry': 'translate/translate.mjs assignedOutside: a branch or a loop around an async-family step no longer carries its writes out (lane w1d)',
  'async-drop-pending': 'opaque-async.mjs pendingWork: a step whose pending work reaches the unit\'s bindings is admitted (lane w1d)',
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
