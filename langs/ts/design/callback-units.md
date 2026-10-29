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
in-body callback is `callback-in-body`: loading the module cannot create that closure. The pair's module route is
WITNESS after its arithmetic changes; its sibling is PASS-bounded. Lane A separately proves the sibling and the
in-body callback over its captured inputs.

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
