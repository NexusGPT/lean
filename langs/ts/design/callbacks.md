# Callbacks are observed by behaviour, never by text

Lane B compared a function value that reaches the outside by a hash of its source text (`fake.mjs` render:
`{ $fn: name, src: fnHash(v) }`). Any refactor inside a callback was then a WITNESS although nothing the language
defines differs: the DA+lean benchmark (lane benchmark-v1, base 92eebd9) counted 2 false alarms in 109 clean changes,
both of this kind (eslint `promptUser`: `when` callbacks inside the question list handed to `inquirer.prompt`;
nexus `ChatHeaderRedux`: the selector handed to `useAppSelector`). The principle: an escaping function is observed by
what happens when it is called (the arguments it is given, its result, the requests it makes, what it throws). A text
hash is at most an internal identity key.

## Inventory: every site where lane B turns a function value into an observation (base 92eebd9)

The root is one function, `render` in `exec/fake.mjs`; every other site reaches a function value through it, except
the four marked "direct", which call `fnHash` themselves.

| site | what reaches the observation |
|---|---|
| `exec/fake.mjs:298` render | a non-fake function: `{ $fn: name, src: fnHash(v) }`; the root of every row below |
| `exec/fake.mjs:346` fnHash, `:343` rememberFunctionSource, `exec/run.mjs:99` (direct) | the text hash, comments and whitespace folded, of the unit's own emitted text |
| `exec/fake.mjs:140` fake `.catch` / `.finally` (direct) | the handler as `fn:<hash>` in the trace |
| `exec/fake.mjs:154` set, `:157` apply, `:171` construct, `:47` clock | each argument rendered into the trace record |
| `exec/fake.mjs:174` to `:183` | the one partial drive that existed: a callback that is a top-level argument or a member of an object argument, with at most two parameters, called once with fakes during the call; its result discarded |
| `exec/fake.mjs:287` to `:313` renderBody | a function inside an array, a record, a Map, a Set or a promise's settled value |
| `exec/fake.mjs:327` renderDrawn, `:343` stable | the input as drawn |
| `exec/graph.mjs:39` | a function is a leaf of the heap graph, rendered |
| `exec/handlers-interp.mjs:397` handlerKey (direct) | a tree-held function the descriptor reader cannot read: `{ $fn, src, escape }` |
| `exec/handlers-interp.mjs:287`, `:298`, `:367` | a capture or a ref box holding a function, rendered into a handler descriptor |
| `exec/handlers-interp.mjs:235`, `:237` | predicted against actual hook slots (the interpreter's own check, not a verdict) |
| `exec/handlers-interp.mjs:462` heldTextOnly, `exec/run.mjs:831`, `:952` | two sides differing only in text keys: ASK held-handler |
| `exec/run.mjs:231`, `:239`, `:251` | effect deps and a state's first value in pending and trace records |
| `exec/run.mjs:263` renderTree, `:609` | a function prop of the rendered tree (after keyHandlers) |
| `exec/run.mjs:273`, `:274` | what a fired handler returned or threw, and the slots it left |
| `exec/run.mjs:354`, `:400`, `:557` | metadata, pipe and receiver writes |
| `exec/run.mjs:615` | a mount effect's cleanup: `{ op: 'react:cleanup', handler: render(cleanup) }` in pending |
| `exec/run.mjs:623`, `:633`, `:644`, `:648` | the outcome (a returned closure), a thrown value, the receiver's fields, the heap |
| `exec/run.mjs:713` to `:735`, `:757` | sequence observations (trace, pending, a thrown value); a tree prop is erased to `fn` (`:693`) |
| `exec/run.mjs:950` to `:956`, `:747`, `:1124` | the comparisons: the main loop, the sequences, the first-difference reader |
| `exec/program.mjs:29`, `:30`, `:32` | environment-program steps: a returned or thrown value, compared by `both` |
| `exec/program.mjs:111`, `:124` | race observations |
| `exec/finite.mjs:87`, `:94`, `:97`; `exec/programs.mjs:59` (outside this lane) | hook slots, traces and drawn arguments through render |
| `patch.mjs:30` isFnValue (outside this lane) | a function prop is `fn` in the patch: any `$fn` object |
</content>
</invoke>
<invoke name="Bash">
<parameter name="command">cd /Users/assem/nexus/nexus-organisation/work/lean-lanes/callback-behaviour && git add langs/ts/design/callbacks.md && git commit -q -m "callbacks: the inventory of every site where lane B turns a function value into an observation (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
## The mechanism: one handle, one drive, for every escape point

**Handle** (`exec/fake.mjs` escapeHandle, through `render`). A function value of the unit renders as `{ $fn: '#k' }`,
k its side's number for that function object, in order of first sight after the module loaded (resetEscapes at the
end of the outermost load: what a module hands out while loading is not the unit's, and a module that hands out one
more function at its top level must not renumber the unit's). Two positions holding one function object show one
number; the same code on both sides numbers its functions alike. A function's side is its realm: each side's sandbox
has its own `Function.prototype` (bindRealm in `exec/run.mjs` sandbox); a function lean's harness makes for one side
(a useState setter, a useReducer dispatch) is that side's (ownFunction). A function of no side is a host built-in the
unit handed on (`Math.max`): `{ $fn: 'host:<name>' }`, never driven, the same code on both sides. Why: the observation
must name which function stands where (identity is observable, `===`) without reading its text.

**Window and drive** (`exec/run.mjs` driveWindow). An observation is a window (openEscapes / closeEscapes): every
function first rendered inside it is driven at its end, once per function object. A drive calls the function on three
drawn arguments `drive#k.arg0..2` with a fake `this`, then again up to DRIVE_CALLS 3 calls in all, each on its own drawn
arguments `drive#k.call<j>.arg0..2`, so state a function carries between calls shows (a counter, a limit on the second
event) (a class is constructed on them, then each method of its prototype
is called on the instance; an awaited result is awaited; an iterator is stepped up to four times). The record is
`{ $fn, args, returned | threw, trace, pending, slots }`: what it returned or threw, the requests it made, the work it
armed and the hook slots it left; a timer the drive arms fires inside it, in due order (runTimers on the drive's own
queue), so a callback handed to `setTimeout` or `requestAnimationFrame` by a driven function is observed too. Then the trace, the pending work, the armed timers and the slots are put back, so a
drive never becomes part of the window's own observation. A function a drive hands out is driven in turn (breadth
first, up to DRIVE_DEPTH 3); at most MAX_DRIVES 64 per window. Windows: `observe` (the main loop, the class programs
through it), each sequence path (`runSequences`, drives after the unmount), each environment-program command
(`program.mjs` step). Drives run outside the library recorder: the table is validated on the unit's own run, and a
stack capture per built-in call of every drive cost 5.6 times the main loop on the heaviest case (eslint promptUser,
60 inputs: 3.3 s base, 6.0 s with drives outside the recorder).

**Drawn arguments** (`exec/fake.mjs` drawn). An argument, and every answer read through it, is a fake about two times in
five, otherwise a value of the unit's own pools (the strings and numbers its source compares against, `spec.mjs`) or a
plain edge (null, undefined, true, false, 0, '', an empty list), chosen by the seed and the path: both sides are handed
the same values and another input hands other ones. Why: a callback that compares against a constant (`answers.source
=== 'guide'`) must meet the constant on some input, or a changed constant is never seen; with fakes alone it never is.

**Undecided is not a difference** (`exec/fake.mjs` undecidedDrives, undrivenOf). A drive that could not run (the
budget spent, the drive depth, its time limit, a budget or stack stop of the harness) is `{ $fn, undriven: why }`.
From the first such record on either side the two sides' drives are undecided: never a WITNESS. The main loop and the
sequences mask them; an environment program does not diverge on them. When no rung finds a WITNESS and a drive was
undriven, lane B's verdict is `ASK` kind `callback-undriven` naming why and where (`runPairInFlight`); `check.mjs`
gives that reason too, unless lane A proves the unit, in which case PASS-proved stands (lane A reads the body).

**Engine messages** (`exec/fake.mjs` withoutPrintedSource). A drive on drawn arguments meets many errors the engine
raises (`n.toUpperCase is not a function`), and V8 prints the source expression into the message (its CallPrinter), so a
renamed local inside a callback changed a drive's throw. ECMA-262 leaves an engine error's message to the
implementation, so the printed expression is text, not behaviour. An error the engine raised in the unit's code is an
instance of the sandbox realm's intrinsic class, while the unit's own `new TypeError(m)` uses the host's class the
sandbox hands it: only the former is read through the templates that print source (`<expr> is not a function`, `is not
a constructor`, `is not iterable`, `is not async iterable`, `is not a function or its return value is not iterable`,
`Cannot destructure '<expr>' as it is undefined.`), the expression replaced by `<expression>`. The same leak existed
for the unit's own throw on 92eebd9 (`const n = o.name; return n.toUpperCase()` against a renamed `label`: WITNESS);
it is now PASS-bounded.

**The error rule (decided by the lead; owner row f0d879ac).** An error is observed by its provenance, tagged at its
construction in the sandbox. An error the engine raised while the unit's code ran is an instance of the sandbox realm's
own intrinsic class: its class is observed, with the source V8 prints into the message normalised (the CallPrinter
templates above and the property-access templates `Cannot read|set properties of undefined|null (reading|setting
'<key>')`; undefined or null stays, it is the value's). A program-constructed error (`new TypeError(m)`, `class X
extends Error`) is built from the host's classes the sandbox hands the unit, so its message is program data and is
observed whole. The two cases, run with `exec/run.mjs --no-project` on files extracted by `git show`:
- `bugsjs:eslint:291` `isES5Constructor` (`=== name[0].toLocaleUpperCase()` against `!== name[0].toLocaleLowerCase()`):
  on 92eebd9 its witness rested on `Cannot read properties of undefined (reading 'toLocaleUpperCase')` against `(reading
  'toLocaleLowerCase')`, an engine text (the replay lane's `refuted_disputed`). Now that throw compares equal, and the
  witness the head reports rests on returned values (`false` against `true` on input 15), which the two expressions
  do differ on for a first character with no case.
- `nexus43:pyka-000da30` `resolveContenders`: `CompareInputError` messages the program builds (`entre 2 et 6 magasins ou
  enseignes` against `entre 2 et -100 ...`) are program data and stay a WITNESS.

**The render-purity check** compares the two renders of one state with handles renamed by first sight in each render
(canonHandles): each render makes its own closures, so a function is compared there by where it stands; the second
render's functions are numbered but not driven (pauseEscapes), since the observation never shows them.

**What the text hash still is.** `fnHash` stays the internal key of a handle for a reader (`escapeKey`); it is in no
observation. `restsOnFunctionText` is the detector: a WITNESS whose two observations stop differing once every `src` of
a `$fn` rendering is removed rests on text alone. The pair step runs it on every lane B WITNESS it wrote, and a planted
text-only witness must be caught (`tests/run.mjs`, "text-only witness").

## What changed for tree-held functions

`handlers-interp.mjs` keyed a function the tree holds and lane B never fires by its descriptor, and by its text with an
`escape` when the reader stopped (ASK held-handler, `heldTextOnly`). A held function is an escaped function: it now
renders as its handle and is driven like any other, so there is one mechanism and no text key. The descriptor reading
stays the interpreter's for fired handlers (interpretFire, ASK:handler-model). In the re-render machine a held function
is also a command (`treeHandlers`: every `on[A-Z]` handler first, then every other function the tree holds), and at
each step every held function of the current tree is driven by its place (`#held<p>`, `withHeldDrives`), never by
which closure object the render made, so a re-render or a memoised callback compares alike. Why: what a held function
does after a re-render is reached only by calling it, letting React re-render, and calling the new one. Pair
`handler_identity`: PickerBranch (braces around an `if` body, ASK held-handler before) is PASS-bounded by its drives;
PickerSetter (one more `setLast(picked)`) is a WITNESS on the sequence select, select (a single drive at the mount
state sees `setLast(0)` on a slot holding 0). Pair `handler_capture_unknown` (`api.push(1)` against `api.push(2)`):
WITNESS by the drive, ASK naming the escape before.

## Gaps, named

- `exec/finite.mjs` and `exec/programs.mjs` are outside this lane: the finite lane's observations show handles and are
  never driven (its tree props are erased to `fn` as before, and the main observation of the unit drives what the mount
  hands out); a class program compares through `observe`, which drives, but its raw comparison does not mask an
  undriven record, so a drive that times out on one side only could diverge there.
- The drawn arguments carry no type: a callback whose parameters must be a shape the pools never produce is driven on
  values it rejects (a throw on both sides), and a difference behind that shape is not seen by the drive.
