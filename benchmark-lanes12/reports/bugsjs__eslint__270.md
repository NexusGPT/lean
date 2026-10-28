# lean report: 6a607bd0a2ca455b16cb3bbf42443c5a5146eb71 → d0aa6c89efdf8d9cf659eef0624c359c8ec9a5d8

Identity: 5a5a7a870fcd61e8f8760d2d30d507416c3894f476ef0e7c10a4ce8937e12321; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 1 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/eslint.js | `prepareConfig` (369-425) | **ASK** | refused:ts-strict | ASK |  | parent: unit prepareConfig not exported |

## What would make the asks provable

### lib/eslint.js · `prepareConfig`

- line 371, `ts-strict`: TS2339: Property 'globals' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 371, `unsupported-member`: property .globals is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 371, `ts-strict`: TS2339: Property 'globals' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 371, `unsupported-member`: property .global is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 371, `ts-strict`: TS2339: Property 'global' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 372, `ts-strict`: TS2339: Property 'global' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 374, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 378, `unsupported-member`: property .rules is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 9cd45cdb3168e8b89d21a9e006ca39f5795ada68c4d9981fb670bed8065e8b52 | lib/eslint.js | text | 396+1 | 396+0 | unit: prepareConfig | old:prepareConfig |
| 39d04798c138528286201da7e4aa11a469b992b4c952f47c14bf9613ac2c3ec0 | lib/eslint.js | text | 396+0 | 396+1 | unit: prepareConfig | new:prepareConfig |

source: {"unit":["9cd45cdb3168e8b89d21a9e006ca39f5795ada68c4d9981fb670bed8065e8b52","39d04798c138528286201da7e4aa11a469b992b4c952f47c14bf9613ac2c3ec0"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__270/run-0qYxPg/terminal.json