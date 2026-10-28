# lean report: 27616a81ff0636f94e2ea15c977b56e7c7e23a19 → d0fb38929a95273568c717de150b38fb06adde87

Identity: ffe53722c6131102eedc2dd36d6796827428f4913fe9aa58c5c4606663a39217; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/util/glob-util.js | `resolveFileGlobPatterns` (85-90) | **PASS-bounded** | refused:callback-form | PASS-bounded |  | an effectful array callback needs an inline arrow so its world transitions are read in arr |

## What would make the asks provable

### lib/util/glob-util.js · `resolveFileGlobPatterns`

- line 89, `callback-form`: an effectful array callback needs an inline arrow so its world transitions are read in array order
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 89, `ts-strict`: TS2345: Argument of type 'Function' is not assignable to parameter of type '(value: string, index: number, array: string[]) => string'.   Type 'Function' provides no match for the signature '(value: string, index: number, array: string[]): string'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| bb3f42102b7909b2105ac0d9a9e6a6b8c05882838c48df59081b830d31e9c22a | lib/util/glob-util.js | text | 89+1 | 89+0 | unit: resolveFileGlobPatterns | old:resolveFileGlobPatterns |
| 96b08d371097dcc94d8321b8f08da42ba92b63258fc5f7668c62a8e54ab088c3 | lib/util/glob-util.js | text | 89+0 | 89+1 | unit: resolveFileGlobPatterns | new:resolveFileGlobPatterns |

source: {"unit":["bb3f42102b7909b2105ac0d9a9e6a6b8c05882838c48df59081b830d31e9c22a","96b08d371097dcc94d8321b8f08da42ba92b63258fc5f7668c62a8e54ab088c3"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__23/run-T3mGwT/terminal.json