# lean report: a989a7c299ab6fddaa44fdbe196add405061a912 → f0f89be0fb095c2c80dcdde5ff23fe5c63771a17

Identity: 94718f4a7d8206a29cbbca5164d650d9c3d7b06bed6ba84a2ceaf9903617febd; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/key-spacing.js | `initOptions` (120-147) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 1: trace; lib/rules/key-spacing.js:137 |
| lib/rules/key-spacing.js | `(edit 7aa981b0ffef)` (292-292) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/key-spacing.js | `(edit 5d74289a9951)` (293-293) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/key-spacing.js | `(edit 77ba56dc8530)` (294-294) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

## What would make the asks provable

### lib/rules/key-spacing.js · `initOptions`

- line 121, `unsupported-member`: property .align is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 121, `ts-strict`: TS2339: Property 'align' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 124, `ts-strict`: TS2339: Property 'align' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 124, `unsupported-member`: property .align is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 124, `ts-strict`: TS2339: Property 'align' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 125, `ts-strict`: TS2339: Property 'align' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 125, `unsupported-member`: property .align is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 125, `ts-strict`: TS2339: Property 'align' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 2 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| a64f231e6c34455c1de9f0c151294336b98a23d52bca8b7185b609390ef8bdeb | lib/rules/key-spacing.js | text | 139+1 | 139+0 | unit: initOptions | old:initOptions |
| d24b15d9094fbdbf76d3aa77b33c811f7680e32bcd0e879a98b0979d9a8a69dd | lib/rules/key-spacing.js | text | 139+0 | 139+1 | unit: initOptions | new:initOptions |
| 7aa981b0ffef981bd9110c918b315c64dd17f4e4dc1eed59e4f675964e7dfa83 | lib/rules/key-spacing.js | text | 291+0 | 292+1 | unassigned: object-literal member |  |
| 5d74289a995126205d4ec652fefeff9d959e49d5123b3223a8b8aa0878dd96d8 | lib/rules/key-spacing.js | text | 291+0 | 293+1 | unassigned: object-literal member |  |
| 77ba56dc8530b3d80d1d58b0738d904c5b6b1c2b99b137e4d2d8eb7d08aec33f | lib/rules/key-spacing.js | text | 291+0 | 294+1 | unassigned: object-literal member |  |

source: {"unit":["a64f231e6c34455c1de9f0c151294336b98a23d52bca8b7185b609390ef8bdeb","d24b15d9094fbdbf76d3aa77b33c811f7680e32bcd0e879a98b0979d9a8a69dd"],"artifact":[],"unassigned":["7aa981b0ffef981bd9110c918b315c64dd17f4e4dc1eed59e4f675964e7dfa83","5d74289a995126205d4ec652fefeff9d959e49d5123b3223a8b8aa0878dd96d8","77ba56dc8530b3d80d1d58b0738d904c5b6b1c2b99b137e4d2d8eb7d08aec33f"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__39/run-OOLyV8/terminal.json