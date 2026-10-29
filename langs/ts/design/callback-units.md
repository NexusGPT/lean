# Call arguments as units

`callbackUnits` is the one inventory and name builder used by `topLevelFunctions` and the reach-gap prediction.
A direct arrow or function-expression argument of a call or constructor is a unit in module scope or inside an
already listed unit, recursively. A callback in an unlisted function, class initializer or static block remains a
measured `otherScope` gap. Wrappers consisting of parentheses, assertions, satisfies and non-null assertions do not
change identity. Names use the callee source, the preceding literal arguments (quoted strings, numeric source
spellings), and the zero-based argument index. Only collisions within the same enclosing scope get `@1`, `@2`, etc.
The enclosing unit name prefixes an in-body callback. No consumer rebuilds the name.

JavaScript evaluates an argument closure in its lexical environment. Lane A makes that environment explicit:
`callbackEnvironment` joins identifier uses and assignments by checker symbol. A referenced parameter or local of
an enclosing unit becomes an additional input, in first-use order. Its original identifier retains the checker's
type; it has no optional or default initializer. A module binding retains the existing module-state reading.
The parameter list and signature metadata both include captures. The translator classifies those bindings as local
inputs, so a captured constant is a parameter, never a module constant keyed by its initializer's text.

A const binding is stable. A let or parameter is stable only when it has no possible write after callback creation.
Later source writes, writes in other closures and writes in a containing loop all count as possible later writes;
this is conservative about execution order. Destructuring writes, updates and for-in/of binding writes count too.
Otherwise `captured-mutable` refuses the callback. The enclosing unit's existing reading is unchanged. Object inputs
retain the ordinary parameter/heap rules; stability concerns the captured binding, not deep immutability.

The lint checks each callback's signature and body using the same primitives as other units. JavaScript callbacks
may use a contextual type supplied by the checker; any/unknown parameters retain `untyped-js`. Findings carry the
unit whose reading produced them. An unnamed finding belongs to the smallest containing range, including columns;
an import-time call surrounding a callback is outside that callback. Census and the translator use this same
attribution. The translator's `--only` parser splits commas only outside parentheses and quoted strings.

## Evidence

`tests/pairs/callback_units/measure.mjs prediction .lean/cache/callback-units/base` scans the 39-root manifest plus
the ten BugsJS roots, running `df -k /` before each. The base copy is `git archive 2f303ccf`. Saved commands, statuses,
per-root counts and totals are in `design/callback-units-evidence/prediction*`; prediction was committed before
`topLevelFunctions` called the new inventory. The same runner's `before` and `after` phases execute census sequentially.

Red evidence: prediction tests initially failed twice (`callbacks` missing); listing tests failed twice (only
`describe`, `defineConfig`, `outer` were listed); the contextual-JS test failed against the frozen base (no named
`untyped-js` callback); capture tests failed (no `captured-mutable` finding); the CLI failed with
`no top-level function or class method named app.get('/a'`; the parser test failed (`splitUnitNames is not a function`).
Each command was `node --test langs/ts/tests/pairs/callback_units/<name>.test.mjs`; contextual baseline used
`LEAN_CALLBACK_BASE=.lean/cache/callback-units/base`. Green tests exercise exact inventories, unrelated insertion,
collision ordinals, contextual types, explicit captured parameters, callback-only refusal, named census attribution,
and comma-containing names in each position in a list. Initial census-probe setup accidentally put its source under
the walk's excluded `tests` directory; the corrected probe uses `probes/census`.

## Runtime and origin

The module loader wraps each module callback argument in a capture operation that returns the same function. It
does not replace the call, evaluate the callee twice, change its receiver or reorder other arguments. Each sandbox
has its own capture table. `pickUnit` uses that recorded closure. No instance is `callback-not-created`; multiple
instances of the same call site are `callback-multiple-instances` rather than an arbitrary chosen closure. An
nested callback inherits its enclosing unit verdict, labelled `covered-by: <enclosing unit>`: lane B runs the enclosing unit, not the closure on invented inputs. The pair's module route is
WITNESS after its arithmetic changes; its sibling is PASS-bounded. Lane A separately proves the sibling and the
in-body callback over its captured inputs.

The capture table lives in the harness environment, not in enumerable module exports. A red/green reflection test
checks that registering callbacks adds no observable export. `units.mjs` reports an in-body callback as `top: false`.
The JavaScript untyped-input check examines the callback's own parameters; an opaque captured input does not become
an invented untyped callback argument. Control characters in string-literal identities are escaped for CLI transport.

The evidence runner and the dedicated census test share `census-lock.mjs`. Each root takes the machine-wide lock,
records its child PID, checks free disk space, streams stdout/stderr and releases immediately on exit. A live owner's
lock causes a 10-second retry; a dead owner's lock can be removed. A completed root yields 60 seconds before the runner takes the lock again. Langchainjs's syntax prediction remains included,
but census runs exclude it at the owner's direction pending the separate memory fix. The interrupted Nutshell run
used only this lane's PID and retains its SIGTERM log; its complete retry is a separate recorded attempt.

Internal rewrites carry their source origin. `normaliseApplyCalls` retains the original SourceFile in a WeakMap.
The callback name builder joins through TypeScript's original-node link when present; the current reparse preserves
text length and lines by padding, so its fallback is the unchanged start/end range. The red/green normalization
test includes both the callback in `xs.map.call(xs, ...)` and a callback AFTER that rewrite in the same file.
Only the source inventory constructs identity; neither lint, translator nor runtime renames it.

`artifactName` is a reversible URI-component encoding used only for the pair runner's artifact basenames. Writers
and readers use it for b_, deep_, check_, lib_, libw_, and libc_ results. The red CLI probe failed ENOENT writing
`b_app.get('/changed')#1.json`; the helper test failed before the helper existed. Green tests round-trip `/`, `'`,
`(`, `#`, distinguish a slash from its encoded spelling, retain `plain` and `ops.add`, and write/read every existing
pair's unit artifact. Counts and exact site line numbers are in the lane report.

## Catalogue rows for readings.mjs

Paste this row into `READINGS` after merging the admission contract. `ArrowFunction` and `FunctionExpression`
already belong to `callbacks`; `Parameter` to `declarations`; `Identifier` to `names`; `Block` and return statements
to `control-flow`. This row claims the listed callback-unit form within those kinds, without duplicating a kind owner.
The gate already resolves `captured-mutable` through `readingOfFinding`, so there is no extra translator-message
pattern. This lane's base has no `readings.mjs`; no partial catalogue is created here.

```javascript
{
  id: 'callback-units',
  construct: 'a direct function argument listed as a unit, with stable bindings of enclosing units made explicit inputs',
  kinds: [],
  uses: (n, ts, ctx) => ctx.unit?.form === 'callback' && n === ctx.unit.body,
  lint: ['captured-mutable'],
  translate: [],
  assumptions: {
    runtime: 'identity comes from the original source call, its preceding literal arguments and argument index; callback parameters use their checker types; captured enclosing-unit bindings become explicit inputs, while module bindings retain the module-state reading; lane B records the single closure created at module load and inherits the enclosing verdict for nested callbacks and refuses absent or multiply instantiated module callbacks',
    aliasing: 'a const binding is stable; a let or parameter is an input only if no possible write follows closure creation, including writes in another closure or a containing loop; object inputs retain the ordinary parameter and heap alias rules, not a deep-immutability assumption',
    exceptions: 'the callback body uses the ordinary unit exception reading; no capture operation invokes the callback or changes the surrounding call evaluation order; a mutable capture is refused before emission',
    termination: 'the callback body uses ordinary unit termination obligations; capturing a module-load argument terminates immediately and runs no callback body; lane B never invokes an enclosing unit to manufacture a closure',
  },
  refusal: 'an enclosing-unit binding may be written after this callback is created; capture a stable value',
  design: ['design/callback-units.md'],
  versions: [{ version: 1, status: 'current' }],
},
```

Phase 2 (`lower.mjs`, `unitReadings`): add this field to the existing `ctx` object. The existing traversal visits every
callback body, including an empty block, so its `USES` loop records the row even for a callback without parameters.
No syntax kinds need a second owner, and the existing callback-expression reading stays intact for enclosing units.

```javascript
unit: u,
```

The post-merge refusal attribution must also use the shared rule: the admission contract's `lowerFile` currently
selects a finding by line containment, which would charge the callback's refusal to its enclosing unit. In that
function, create `const inventory = topLevelFunctions(L.sf);` before constructing the per-unit records, import
`findingUnit` from `common.mjs`, and replace the existing `findings.find(...)` with:

```javascript
const f = findings.find(x => refusing(x) && findingUnit(L.sf, inventory, x)?.name === r.unit);
```

This is merge guidance only; `lower.mjs` remains untouched in this lane.

## Raw unit-name lists

`common.mjs parseUnitList(text)` is the sole reader of raw unit-name lists. It splits only at commas outside quotes and balanced parentheses/brackets/braces (a callee itself can contain an array literal). Translate's `--only`, `--heap-units`, and `--effectful`, and check's heap agreement and certificate use it. HEAP/EFFECTFUL and CLI list writers use `formatUnitList`, the parser's inverse: ordinary names remain raw, while source names containing newlines or ambiguous quotes/comments/brackets take a JSON string token. The parser decodes that token to the unchanged source identity. Dafny identifier and decorator lists retain their separate meaning. `unit-lists.test.mjs` exercises actual translator emission, agreement, and the certificate with `app.get('/a',1)#2`; `unit-list-readers-red.log` records the split name and consequent interface refusal before the reader substitutions, and `unit-lists-green.log` records all four checks passing.

## Named-function consumers

The construct loop and differential helper in `tests/run.mjs` select their named function. Construct lint uses `findingUnit` against the shared inventory; differential passes `--only` for its entries. Whole-file intake fixtures are unchanged. The original pair-step log records the red captured-mutable failures on nested callbacks and index_callbacks' extra standalone callback producing a bodiless signed-zero helper. Selecting the actual tested function removes those unrelated standalone units; `consumers.test.mjs` checks every affected construct and executes each selected model. The importer failure at `no-silent-exit-importers.mjs:44` was caused by the lane setting TMPDIR inside a git worktree, not a production defect; reruns use a scratch directory outside git.

## Nested verdicts

A nested callback remains independently listed and linted, including captured-mutable refusals in the census. Its verdict belongs to its enclosing body. `enclosingUnitName` reads that relation from the shared source inventory. `check` delegates both lanes to the enclosing check and preserves the requested source unit name with `covered-by`; direct lane B requests delegate to the enclosing run. `pr.mjs` attributes findings with `findingUnit`, retains nested intake/refusal rows, excludes them from independent checks, then copies the enclosing verdict and certificate with the same label. This also handles callbacks nested inside callbacks in inventory order. Module-level callbacks remain independent. Red/green logs cover direct lane B, certificate identity and a PR containing a captured-mutable nested callback whose outer function has a WITNESS. Only this pair's expectation changed from ASK to the inherited PASS-bounded under the owner's revised contract.

## Conformance findings

The measured four-pair conformance run produced six new (pair, unit, cause) findings. `conformance-classes.json` records each exact first counterexample, its cause and class. Four are `2^53: the model is exact, Node rounds to binary64` (callback_units outer and changed route; exported_object_methods ops.add and ops.viaSibling); two are `signed-zero: model collapses -0` (unchanged route; ops.scale). They are added to the known-findings baseline with class fields, following oracle-cost's format. No other cause was baselined. Exact matching against every saved finding leaves zero unclassified; removing one added entry reopens the finding. The numeric defects remain for the number-model lane.

## Conversion identity

The converter's single identity check recognizes a removed nested callback only when its enclosing unit has a head verdict. It copies that verdict with `covered-by`, then applies the existing WITNESS/ASK control rules. An independent lost unit still takes the original refusal text. `convert.test.mjs` records foreach conversion red on the exact identity-loss reason, then green: both rewrites applied and all reported verdicts PASS-bounded. No other converter policy changed.

The raw-list reader audit also found PR CLI `--scope`. Its comma-containing callback scope was red (WITNESS instead of IN-SCOPE) and is now read by the same `parseUnitList`; no new parser was added. The census helper follows the updated shared fairness rule: waiters retry every 10 seconds and holders yield 60 seconds between roots. The pair-step conformance subprocess receives JOBS explicitly, so the requested parallelism is honored there too.

The initial focused command `node --test --test-concurrency=2 langs/ts/tests/pairs/callback_units/*.test.mjs` passes 25/25 tests (exit 0), recorded in `unit-tests-final.log`. The artifact compatibility test enumerates 222 pair specifications and 1079 distinct source unit names, checking filesystem writer/reader round trips; this supplements the required four-pair integration step without running the full pair suite.

## Census attribution class

The owner accepted raw admission changes caused solely by assigning a retained nested-body refusal to the newly listed callback: `attribution: a refusal inside a nested callback now belongs to the callback`. The comparator retains all raw moves and separately classifies only refused→inside moves where every former refusal remains at the same line with exactly the same rule/message, now owned by a newly listed nested callback. A disappeared/changed diagnostic or newly refused old unit remains an unexplained move and fails the command. The report lists each source unit, range, diagnostic code and destination. The invariant is no admission/refusal changed except by this attribution; the report must not claim zero raw moves.

## Source-text transport audit

A saved-inventory audit exposed multiline callee text and comments with unmatched quote/bracket characters. Raw comma joining was not an inverse for those names, and literal newlines broke the one-line HEAP header. The new source fixture was red with a parent/candidate hypothesis mismatch, then PASS-proved after `formatUnitList` and its decoding in `parseUnitList`. Check's `--only` argument, heap agreement list/equality, translator HEAP/EFFECTFUL headers and the differential list writer all use the inverse. It preserves ordinary raw names, confirmed for every existing pair unit. `unit-list-audit.mjs` checks every saved census name in a list between two other tokens, plus header line safety, without rescanning a repository. Source identity and prediction counts are unchanged.

The same inverse protects `--fn`'s generated header comment: the red multiline fixture produced a Dafny parse error at source-fn.dfy:3, then verifies successfully. PR's `unitCell` uses that serialized source identity in table cells and headings, escaping Markdown-sensitive characters without mutating `row.unit` or certificate fields. Its red test showed a name and covered-by owner splitting one verdict across several table lines; the green test preserves one cell, literal backticks/pipes, and the old plain-name display.

The inverse also escapes the two Unicode line separators explicitly: JSON.stringify leaves U+2028/U+2029 literal, but one-line comment readers treat them as line endings. The red/green separator check verifies their exact decoded identity and absence from emitted header text.

The required four-pair integration rerun (`LEAN_PAIRS=callback_units,exported_object_methods,object_methods,handler_identity JOBS=2 TMPDIR=/tmp/callback-units-tests node langs/ts/tests/run.mjs`) passed all 873 checks, exit 0 (`pairs-green.log`). This supersedes the initial 865-check run's 35 failures. The rerun preceded the final source-transport changes; those changes have separate red/green evidence and leave all 1079 existing pair names unchanged. No full pair step was run. `self-pair.json` records 47 PASS-bounded and no WITNESS across the selected four pairs; `conformance-final.json` retains the numeric-model findings under their two named classes.

The saved-census comparator also audits a still-refused unit whose first refusal changes when an earlier finding moves to its callback. Every old finding must remain identical under its former owner or a newly listed nested callback, and no new finding may appear under the old owner. `rule-attribution-red.log` demonstrates the missing audit; `rule-attribution-green.log` records the initial six fully classified cases. Final counts and exhaustive destinations are generated by `report.mjs` from the completed inventories; it checks gain and admission accounting independently.

The expanded focused suite, using the same command, passes 29/29 tests (exit 0), recorded in `unit-tests-transport.log`. It includes source-text list transport and Markdown rendering, plus the locked census attribution test. The final Unicode-separator change also has its isolated red/green check.
