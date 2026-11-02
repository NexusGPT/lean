# w9o-hard36, round 0: why 25 of the 36 hard mutants have no WITNESS at lead-v4 2df7b01b

Read before any code. Sources per mutant: the instance (`bench/hard/instances/<id>.json`: `edit.mutation`, `edit.lean_was`
-> `edit.lean_text`, the unit), the parent file at the instance commit (a kept checkout of each PR), lane B's verdict and
bound from `check.mjs --parent <file> --candidate <mutant> --unit <unit> --n 30 --dafny-seconds 30` with LEAN_SEARCH=1 at
2df7b01b (this lane's rerun of the 25 reproduces the lead's `check/lead36-2df7b01b.jsonl` exactly: 17 PASS-bounded, 8 ASK).

Classes: the brief's five, (a) to (e), and one more the reading needs:

- (a) the bounded inputs never execute the mutated statement (a gate the draws and the search do not pass);
- (b) both effects run but the trace does not record their order, or the fake swallows them;
- (c) the conversion differs only on values lean never tries;
- (d) the effect sits after an exit and the exit path is the only one the inputs take;
- (e) ASK: lean stops before an observation (split below: e-load, the module does not load; e-budget, a bound is spent
  before the draws or a callback cannot be driven);
- (f) equivalent: no input of the unit tells the two versions apart (an argument per mutant below). A WITNESS here would be
  a false witness, so these stay PASS by design; they are the ceiling, not a gap.

In (a) and (d) one cause recurs and is named "world-decided": the gate is a value lean's world answers (a field of a fake,
a call's answer, a module member, a Map built from what the world returned), and the search changes only the unit's
parameters, so the gate falls the same way on every input.

| # | id | kind | at 2df7b01b | class | the cause, in one line |
|---|---|---|---|---|---|
| 1 | cline__cline#14303~h1 | effect-after-exit | PB | d, world-decided | `!Bun.which("upx")` is never true: `Bun` is a host global lean hands as the bridge fake, whose call answers a thenable (never null); the dropped `console.warn` sits in that arm |
| 2 | microsoft__typescript-go#3834~h3 | effect-after-exit | PB | d, world-decided | `exe.path !== this.exe?.path` is always true (two independent world answers never equal), so `return false` is the only path; the dropped `appendLine` is after it (search: "no change left", 0 tried) |
| 3 | n8n-io__n8n#42117~h3 | effect-after-exit | PB | a, world-decided | `existing.get(folder.sourceFolderId)` is a real Map keyed by ids the world answered (`findExisting`); a drawn id never equals one, so every folder takes the first `continue`; the dropped `items.push` is four gates further (5 targets unreached) |
| 4 | n8n-io__n8n#42677~h2 | effect-after-exit | ASK | e-budget | spin-bound: the class's method programs (run before the draws) spend the 120 s CPU bound; no draw runs |
| 5 | nodejs__node#66154~h2 | effect-after-exit | ASK | e-load | `primordials is not defined`: Node's internal modules read the free name `primordials` at load (lane w9j's `free-global` covers this class on its branch, not on lead-v4) |
| 6 | sveltejs__svelte#17728~h2 | effect-after-exit | PB | d, world-decided | `current_target === handler_element` is always true, so the unit returns before the dropped `define_property` (search: "no change left", 0 tried) |
| 7 | sveltejs__svelte#18326~h2 | effect-after-exit | PB | d, world-decided | `(parent.f & DESTROYED) !== 0` is always true (`parent` is the module member `active_effect`, a world value), so `finish` returns before the dropped `restore()` |
| 8 | sveltejs__svelte#18330~h3 | effect-after-exit | PB | a | the dropped `parser.allow_whitespace()` follows a real `parse_statement_at` of `parser.template` and an error helper that throws; drawn templates never hold a declaration that parses, so the line is not run (the one target is reached, the statement is not) |
| 9 | google-gemini__gemini-cli#29612~h2 | numeric-conversion | PB | f | `Math.floor(listHeight / 4)` vs `Math.trunc`: `listHeight = Math.max(5, ...)` is at least 5, or NaN, or Infinity; floor and trunc agree on all of them |
| 10 | immich-app__immich#32498~h3 | numeric-conversion | PB | a + c | `Number(event.key)` vs `parseFloat` sits in an action's `onAction` callback behind `event instanceof KeyboardEvent` (no `KeyboardEvent` in the sandbox, the event a fake); and it differs only on keys like `''`, `' '`, `'1a'` |
| 11 | mrdoob__three.js#34309~h3 | numeric-conversion | PB | a + c | `parseFloat(frameKey)` vs `Number` runs only for a data key matching `ATTR_MATCH_REGEX` that ends in `.timeSamples` with an object value, and differs only on frame keys like `'1a'` or `''`; 18 of 20 targets unreached |
| 12 | mrdoob__three.js#34978~h3 | numeric-conversion | PB | c | `(this._activeRenders.get(scene) \|\| 0) - 1` vs `?? 0`: the two differ only when the lookup answers NaN (0, '', false and -0 give -1 both ways); the lookup never answers a truthy value or NaN |
| 13 | n8n-io__n8n#41825~h3 | numeric-conversion | ASK | e-budget | callback-undriven: the returned middleware cannot be driven (a fake path past 400 characters); `Math.ceil` vs `Math.trunc` of a positive fraction is inside it |
| 14 | n8n-io__n8n#41890~h1 | numeric-conversion | PB | c | `Number.parseInt(limit ?? '', 10)` vs `Number(limit ?? '')` differ only on numeric text such as `'1.5'`, `'12px'`, `'0x10'`, `'1e3'`; every drawn string (`''`, `'0'`, `'-1'`, words) gives the default page size both ways |
| 15 | n8n-io__n8n#41940~h1 | numeric-conversion | PB | f | `Math.trunc(t)` vs `Math.floor(t)` then `if (timeout <= 0) throw`: they differ only for negative fractions, where both are <= 0 and both throw the same error; NaN and positives agree |
| 16 | n8n-io__n8n#41943~h2 | numeric-conversion | PB | a + c | `pairedItemData.input \|\| 0` vs `?? 0` is six gates deep in a loop over world items with error data (14 targets, 0 reached by the search), and differs only for a falsy non-nullish `input` |
| 17 | n8n-io__n8n#42608~h2 | numeric-conversion | PB | f | `Number.isFinite(x)` vs `isFinite(x)` where `x = Number(...)` is already a number: identical |
| 18 | n8n-io__n8n#42766~h1 | numeric-conversion | PB | f | `isNaN(value.getTime())` vs `Number.isNaN(...)` on a `Date`: `getTime` answers a number (only a Date subclass overriding `getTime` with a non-number could tell them apart) |
| 19 | facebook__react#36253~h1 | swapped-effects | ASK | f (and e-load) | two writes to fields of `this` with independent right sides, nothing between: equivalent; the module also does not load (`Event is not defined`: `extends Event`, no `Event` in the sandbox) |
| 20 | facebook__react#36859~h1 | swapped-effects | ASK | e-load | the script runs its own top level at load and throws (`No bundles matched for BUNDLES_FILTER=...`) |
| 21 | google-gemini__gemini-cli#26338~h1 | swapped-effects | ASK | e-load | the workspace package `@google/gemini-cli-core` resolves without its build output, so `ApprovalMode.YOLO` reads a member of undefined at load |
| 22 | n8n-io__n8n#41864~h2 | swapped-effects | ASK | e-budget | spin-bound: the class's method programs spend the 120 s CPU bound before any draw; the swapped `telemetry.init()` / `setupListeners(...)` order is a trace order the draws would see |
| 23 | n8n-io__n8n#41990~h3 | swapped-effects | ASK | e-load | `sink.mjs` holds a top-level `await`; lean compiles it as CommonJS, so the load fails ("await is only valid in async functions and the top level bodies of modules") |
| 24 | sveltejs__svelte#17885~h2 | swapped-effects | PB | f | `component_context.function = fn` and `dev_current_component_function = fn` swapped: a field of a literal the line before made and a module variable, nothing runs between them |
| 25 | sveltejs__svelte#17921~h2 | swapped-effects | PB | f | `stack.push(derived)` and `derived.f &= ~WAS_MARKED` swapped: `stack` is module-private, neither statement reads what the other writes |

## Counts

| class | n | ids (#) |
|---|---|---|
| world-decided (d 4, a 1) | 5 | 1, 2, 3, 6, 7 |
| a, other gates (+ c) | 4 | 8, 10, 11, 16 |
| c, values never tried | 2 | 12, 14 |
| b, order not recorded or swallowed | 0 | none: every swap that changes behaviour is a trace order lean records; the PB swaps are equivalent (f) |
| e-load | 4 | 5, 20, 21, 23 |
| e-budget | 3 | 4, 13, 22 |
| f, equivalent | 7 | 9, 15, 17, 18, 19, 24, 25 |
| total | 25 | |

So the ceiling without a false witness is 36 - 7 = 29 of 36, not 36: the seven equivalent mutants stay PASS-bounded, and
the parent check (parent against parent) is the guard that no mechanism turns them into witnesses.

## The order of the mechanisms (largest actionable class first)

1. world-decided (5): the search changes the world's answers too, within the values the world model already answers for
   that path (an untyped answer's own set: a handle, null, undefined, an empty list, '', 0, false, true; a typed answer only
   values of its declared type), and a value the world answered elsewhere in the run (an id the world returned, so a
   lookup or an equality meets it); both sides of a pair get the same world, so a difference is the unit's.
2. e-budget (3): the method programs get a share of the unit's bound, not all of it, so the draws run.
3. c (2): a string leaf the unit hands to a numeric conversion is tried on the conversion's own boundaries (numeric text).
4. e-load (4): one cause each; 5 is w9j's (not duplicated here); 23 (top-level await) is a module-body mechanism.
