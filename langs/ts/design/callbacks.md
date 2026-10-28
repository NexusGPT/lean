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