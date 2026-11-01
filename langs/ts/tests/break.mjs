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
// A mechanism that keeps a reading well-formed rather than honest flips the other way: `"<lemma unit>": false` lists a
// lemma the pair expects proved that the broken run does not prove (refused or unproved), so the row shows the
// mechanism is what makes the proof. The runner (tests/run.mjs) translates both sides again with LEAN_BREAK=<name> and
// checks each listed lemma.
//
// Mechanisms registered here, one line each, by the lane that owns them:
export const MECHANISMS = {
  'opaque-drop-read': 'translate/opaque.mjs opaqueForm: the first scalar read of an opaque step is dropped (lane w1a; lane w1b: a statement site\'s step is the same opaqueForm, its read-only values first)',
  'opaque-drop-write': 'translate/opaque.mjs opaqueForm and translate.mjs reachesOutside: the writes of an opaque step as its callers see them are dropped, its first written output and its reach to the world (lanes w1a, w1b)',
  'opaque-drop-callees': 'translate/translate.mjs opaqueTail, opaqueStep: the code the step reaches leaves its key and its CALLS line is not written (lanes w1a, w1b)',
  'opaque-calls-drop-write': 'translate/opaque-calls.mjs reachWrites: a statement step writes only the names it assigns, no reference in scope, no closure-written name (A2; lane w1c, tests/opaque-calls.mjs)',
  'opaque-calls-drop-callees': 'translate/opaque-calls.mjs calleeTexts and translate.mjs siteStep: a statement step\'s key is its own text alone and its CALLS line is not written (A3; lane w1c, tests/opaque-calls.mjs)',
  'handle-value': 'translate/translate.mjs handleNow: a read of a handed object after the call takes it as it was before the call, not ext_now (lane w1g)',
  'reach-closure': 'common.mjs readAfterCall share: a read through a holder of what the call was handed is not counted as reached (lane w1g)',
  'handed-skeleton': 'translate/translate.mjs handedArg: which parts of a handed literal are new leaves the handed term\'s name (lane w1g)',
  'assertion-read': 'translate/translate.mjs convertToD: the outside slot\'s conversion of a value whose type nothing checked stops reading the value (lane w1g)',
  'fresh-site': 'translate/translate.mjs namedSite: a new object a name holds is named by its value alone, not its site (lane w1g)',
  'handle-write': 'translate/translate.mjs pathUpdate: a one-level write to a handle after the call is not told to the world (lane w1g)',
  'sealed-collection': 'common.mjs readAfterCall sealedCollection: a primitive collection is sealed whatever its uses, one handed to a call too (lane w1g)',
  'unhanded-collection': 'common.mjs readAfterCall unhandedCollection: a collection a call was handed is taken for one no call holds (lane w1g; tests/w1g-opaque-handed.mjs)',
  'handed-call': 'translate/translate.mjs handedArg: a same-file call\'s result is handed without the code its callee reaches in its key (lane w1g)',
  'outside-slot': 'common.mjs outsideSlot: every callee taken for the outside, a same-file callee with a body included (lane w1g; tests/w1g-opaque-handed.mjs)',
  // the mechanisms of the lanes merged before the registry held every name (they read LEAN_BREAK through ../break.mjs
  // now; each lane's own test drives them: w1h tests/w1h-new-units.mjs, w1f tests/w1f-module-units.mjs, w3a the pair
  // runner's `counterexample` rows, w2d tests/package-rows.test.mjs and tests/lib-break.mjs)
  'platform-gap': 'exec/new-tests.mjs platformGlobal and exec/new-unit.mjs: a ReferenceError for a platform global is not read as the platform\'s gap (lane w1h)',
  'closed-test': 'exec/new-tests.mjs: a test that touched the world is read as closed (lane w1h)',
  'declared-edges': 'exec/declared.mjs edgePlan: the declared type\'s edge inputs are not drawn (lane w1h)',
  'declared-throws': 'exec/declared.mjs declaredThrow: a declared throw is not read as the declaration\'s (lane w1h)',
  'admitted-input': 'exec/new-unit.mjs: every input is taken as admitted by the declared type (lane w1h)',
  'closed-call': 'exec/new-unit.mjs: the world the unit touched is not counted, so every admitted input reads as a closed call (lane w1h)',
  'declared-shape': 'exec/new-unit.mjs: the result is not checked against the declared shape (lane w1h)',
  'shape-drives': 'exec/new-unit.mjs: the shape check runs although the observer drove functions the unit handed out (lane w1h)',
  'pr-tests': 'exec/new-unit.mjs: the tests the change adds are not run (lane w1h)',
  'w1f-module': 'ci/ledger.mjs: the module unit\'s route is removed (lane w1f)',
  'w1f-js': 'ci/ledger.mjs: a JavaScript file takes the route before the JavaScript module unit (lane w1f)',
  'w1f-types': 'ci/ledger.mjs: a type-only or directive edit is not routed to the types unit (lane w1f)',
  'w1f-emit': 'typed.mjs: the typed reading compares no emit (it never decides; lane w1f)',
  'w1f-closure': 'typed.mjs: the typed reading\'s reach is the changed file alone (lane w1f)',
  'w1f-directive': 'lint/directives.mjs: directives matched by their line number, not their anchor (lane w1f)',
  'cex-replay': 'solve/counterexample.mjs: the model\'s input is taken as the WITNESS without running it (lane w3a)',
  'cex-replay-by-index': 'solve/counterexample.mjs: lane B\'s draw at the replay\'s index is replayed instead of the model\'s value (lane w3a)',
  'package-rows': 'library-rows.mjs: every package call keeps the outside call\'s reading (lane w2d)',
  'library-fakes': 'exec/fakes/lib/index.mjs libraryFakesOn: every library fake is off, the recording proxy answers (lane w2d)',
  'async-branch-exit': 'translate/translate.mjs awaitExits: an await inside an if of an async unit no longer leaves the unit: the branches merge as values before what follows and an awaited condition is not tested for a fault (the rejection read as a branch\'s state; lane w8d, pairs async_branch_exit, async_branch_exit_arms)',
  'faithful-steps': 'translate/translate.mjs early (site-steps) and translate/faithful.mjs steps: the faithful rewrite reads the statements the lint reads as opaque steps too, rewriting their numbers and finding reasons inside them (lane w8d, pairs opaque_iterator-protocol, opaque_operator-value-context)',
  'opaque-drop-sharing': 'translate/translate.mjs opaqueStep: a statement step that changes or compares an object is admitted after a statement that may share one (lane w1b; no pair flips: the heap identity guard refuses first, design/w1b-opaque-statements.md)',
};
// the switch itself is product code (../break.mjs), so the product never imports from tests/
export { BREAK_ENV, broken } from '../break.mjs';
// a pair's break rows, checked for shape: a mechanism must be registered, a lemma must flip
export function breakRows(exp) {
  const rows = [];
  for (const b of exp.break ?? []) {
    if (!MECHANISMS[b.mechanism]) throw new Error(`break: ${b.mechanism} is not a registered mechanism (tests/break.mjs MECHANISMS)`);
    for (const [unit, want] of Object.entries(b.equal ?? {})) {
      if (typeof want !== 'boolean' || exp.equal?.[unit] !== !want) throw new Error(`break ${b.mechanism}: ${unit} must be expected not proved and proved under the break, or proved and not proved under it (a flip)`);
      rows.push({ mechanism: b.mechanism, unit, proves: want });
    }
  }
  return rows;
}
