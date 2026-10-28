# lean report: 88d5d4dbd09dd7f23e9fff79087bc13adaac051b → 3715d96915434dc3ac0334f4992c84c6f4b24fea

Identity: c4452e6a9d95c5ea68ba6b4b74b47b1cb2de3858df224c2ed844b729d5bc2619; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/formatters/codeframe.js | `formatMessage` (48-71) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 0: trace; lib/formatters/codeframe.js:50 [migration] |
| lib/formatters/stylish.js | `(edit 4f94d1c057fe)` (68-68) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/stylish.js | `(edit df5bb572acf8)` (68-68) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

## What would make the asks provable

### lib/formatters/codeframe.js · `formatMessage`

- line 49, `unsupported-member`: property .fatal is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 49, `ts-strict`: TS2339: Property 'fatal' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 49, `unsupported-member`: property .severity is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 49, `ts-strict`: TS2339: Property 'severity' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 50, `unsupported-member`: property .message is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 50, `ts-strict`: TS2339: Property 'message' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 51, `unsupported-member`: property .fatal is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 51, `ts-strict`: TS2339: Property 'fatal' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 2 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3d17f9039a4f8f328612fb46ea7cdff7230d272048f83a1ab113510ff685dab1 | lib/formatters/codeframe.js | text | 50+1 | 50+0 | unit: formatMessage | old:formatMessage |
| 74dd2be9fdd7a6eb4dc1643fede9fce8827b5b58fcc71f43c0c1c2c514ffffab | lib/formatters/codeframe.js | text | 50+0 | 50+1 | unit: formatMessage | new:formatMessage |
| 4f94d1c057fe7bfba169f87149e089fa017816e7706ba777a8798406f770eaa3 | lib/formatters/stylish.js | text | 68+1 | 68+0 | unassigned: exported property assignment |  |
| df5bb572acf8210b5137e3035a74792f9d94b57c68307022b847c9da55258b3c | lib/formatters/stylish.js | text | 68+0 | 68+1 | unassigned: exported property assignment |  |

source: {"unit":["3d17f9039a4f8f328612fb46ea7cdff7230d272048f83a1ab113510ff685dab1","74dd2be9fdd7a6eb4dc1643fede9fce8827b5b58fcc71f43c0c1c2c514ffffab"],"artifact":[],"unassigned":["4f94d1c057fe7bfba169f87149e089fa017816e7706ba777a8798406f770eaa3","df5bb572acf8210b5137e3035a74792f9d94b57c68307022b847c9da55258b3c"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__95/run-ay7yGS/terminal.json