// The one --break convention of the suite (W1 amendment A6; every lane uses it, nobody invents a second one).
//
// A mechanism that keeps a proof sound has a name. The code under test reads `LEAN_BREAK` (a comma-separated list of
// names) through `broken(name)` and, when its name is listed, skips that mechanism. A suite row runs a named pair with
// the variable set and asserts the verdict flips: a lemma the pair expects not proved becomes proved (a false
// PASS-proved the suite refuses to count as a pass), so the row shows the mechanism is what keeps the pair honest.
//
// In a pair's expect.json, one shape (an array of rows, each naming its mechanism), whichever lane the row reads:
//   "break": [{ "mechanism": "<name>", "equal": { "<lemma unit>": true }, "b": { "<unit>": "<verdict>" } }]
// `equal` (lane A) lists the lemmas the broken run proves; each must be expected `false` in the pair's own `equal` (a
// flip). A mechanism that keeps a reading well-formed rather than honest flips the other way: `"<lemma unit>": false`
// lists a lemma the pair expects proved that the broken run does not prove (refused or unproved), so the row shows the
// mechanism is what makes the proof. The runner (tests/run.mjs) translates both sides again with LEAN_BREAK=<name> and
// checks each listed lemma.
// `b` (lane B) lists the verdicts lane B gives under the break; each unit is in the pair's own `b` with another verdict
// (a flip). tests/lib-break.mjs runs lane B on each such unit as is and under the break. A row carries either or both.
// Why the array: a pair's rows may share a mechanism (opaque_async_origin) and a row may name two (below); keyed by
// mechanism, the second row of a name has no place, and both readers read every row through breakRows below.
// When a second mechanism also refuses the unit, `mechanism` lists both ("<name>,<other>"): every guard off, the false
// proof shows, and the row stays a break of each name it lists.
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
  'handed-key-order': 'translate/translate.mjs orderedArg and translate/heap.mjs: a record handed to an outside call is handed bare, without its key order (lane w8c; tests/handed-key-order.mjs, pair handed_key_order)',
  'world-write': 'common.mjs readAfterCall write points: a write through an object the world may hold is a write to a local copy, not told to the world (lane w8c; pair lib_lodash_get)',
  'async-branch-exit': 'translate/translate.mjs awaitExits: an await inside an if of an async unit no longer leaves the unit: the branches merge as values before what follows and an awaited condition is not tested for a fault (the rejection read as a branch\'s state; lane w8d, pairs async_branch_exit, async_branch_exit_arms)',
  'faithful-steps': 'translate/translate.mjs early (site-steps) and translate/faithful.mjs steps: the faithful rewrite reads the statements the lint reads as opaque steps too, rewriting their numbers and finding reasons inside them (lane w8d, pairs opaque_iterator-protocol, opaque_operator-value-context)',
  'faithful-lines': 'translate/faithful.mjs keepLines: a rewritten operation keeps the line breaks of its arguments no longer, so a multi-line Math call moves the lines after it and the faithful text of the whole file is refused (lane w8d, pair faithful_lines)',
  'lexical-this': 'lint/lint.mjs callback loop: an arrow callback under an instance member does not read the member\'s receiver (lane w1e; tests/w1e-opaque-this-globals.mjs)',
  'held-key': 'translate/translate.mjs: the classes\' code leaves the name of a request on a held receiver (lane w1e)',
  'unresolved-global': 'lint/lint.mjs unresolvedGlobal: a global nothing declares is not read as the world value keyed by its name (lane w1e)',
  'environment-handle': 'lint/lint.mjs environmentHandle: an unresolved name read as an opaque handle sets its unit aside again (lane w1e)',
  'incomplete-member': 'lint/lint.mjs: a member of a type that reaches the error type keeps its ts-strict refusal (lane w1e)',
  'effectful-cell': 'lint/lint.mjs: a module let/var with an effectful initializer keeps its toplevel-effect refusal (lane w1e)',
  'cell-key': 'translate/translate.mjs: the declaration leaves a module cell\'s name (lane w1e)',
  'opaque-drop-sharing': 'translate/translate.mjs opaqueStep: a statement step that changes or compares an object is admitted after a statement that may share one (lane w1b; no pair flips: the heap identity guard refuses first, design/w1b-opaque-statements.md)',
  'async-drop-reads': 'translate/translate.mjs opaqueExpression: an async-family step no longer reads the unit\'s locals (lane w1d)',
  'async-drop-origins': 'opaque-async.mjs stepWrites: a step writes the names it mentions only, not the names they share an object with (lane w1d)',
  'async-drop-callees': 'opaque-async.mjs reachedFunctions: the texts of the same-file functions a step reaches leave its key (lane w1d)',
  'async-drop-carry': 'translate/translate.mjs assignedOutside: a branch or a loop around an async-family step no longer carries its writes out (lane w1d)',
  'async-drop-pending': 'opaque-async.mjs pendingWork: a step whose pending work reaches the unit\'s bindings is admitted (lane w1d)',
  'converted-text': 'exec/spec.mjs boundaryOf CONVERTED_TEXT: a string leaf the unit reads as a number (usage.mjs converted) is drawn without the texts the conversions disagree on (lane w9o; pair converted_text)',
  'core-string-args': 'exec/usage.mjs pathModuleOf: a parameter handed to a node:path function is not read as a string (lane w9o; pair core_string_args)',
  'module-await': 'exec/run.mjs sandbox loadInner: a module whose top level awaits is not run as an async body, so its load fails (lane w9o; pair module_await)',
  'programs-share': 'exec/programs.mjs runPrograms maxCpuMs: the method programs of a class unit have no share of the unit\'s CPU bound, so slow commands spend all of it before any draw runs (lane w9o; tests/programs-share.mjs --break, suite row programs-share --break)',
};
// the switch itself is product code (../break.mjs), so the product never imports from tests/
export { BREAK_ENV, broken } from '../break.mjs';
// a pair's break rows, checked for shape: a mechanism must be registered, a lemma or a verdict must flip. One reader for
// both runners: lane A rows ({ lane: 'A', mechanism, unit }) for tests/run.mjs, lane B rows ({ lane: 'B', mechanism,
// unit, verdict }) for tests/lib-break.mjs
export function breakRows(exp) {
  const rows = [];
  if (exp.break !== undefined && !Array.isArray(exp.break)) throw new Error('break: the key is an array of rows ({ mechanism, equal, b }), tests/break.mjs');
  for (const b of exp.break ?? []) {
    // a unit two mechanisms guard is broken by both: `mechanism` may list them ("a,b"), each registered
    for (const m of String(b.mechanism).split(',')) if (!MECHANISMS[m]) throw new Error(`break: ${m} is not a registered mechanism (tests/break.mjs MECHANISMS)`);
    if (!b.equal && !b.b) throw new Error(`break ${b.mechanism}: the row lists no lemma (equal) and no verdict (b)`);
    for (const [unit, want] of Object.entries(b.equal ?? {})) {
      if (typeof want !== 'boolean' || exp.equal?.[unit] !== !want) throw new Error(`break ${b.mechanism}: ${unit} must be expected not proved and proved under the break, or proved and not proved under it (a flip)`);
      rows.push({ lane: 'A', mechanism: b.mechanism, unit, proves: want });
    }
    for (const [unit, verdict] of Object.entries(b.b ?? {})) {
      if (!(unit in (exp.b ?? {})) || exp.b[unit] === verdict) throw new Error(`break ${b.mechanism}: lane B ${unit} must be in the pair's b with another verdict than ${verdict} (a flip)`);
      rows.push({ lane: 'B', mechanism: b.mechanism, unit, verdict });
    }
  }
  return rows;
}
