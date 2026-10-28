# lean report: 6f9e15514e7a6b880b7c735ac9e8b43aed3cc67e → c3a8bec975430719a24df1e31bb93ef4c62d1e58

Identity: 9386c51662bd5ba62147febd3e6ae6df467ec76c71bd21064758721a5a31cc3a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/object-curly-newline.js | `areLineBreaksRequired` (111-129) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 4: outcome; lib/rules/object-curly-newline.js:120 |

## What would make the asks provable

### lib/rules/object-curly-newline.js · `areLineBreaksRequired`

- line 123, `unsupported-member`: property .minProperties is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 123, `ts-strict`: TS2339: Property 'minProperties' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 125, `unsupported-member`: property .multiline is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 125, `ts-strict`: TS2339: Property 'multiline' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 3 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| bd0b6328705fd0cae322343b16545c747515007515f1b9ce79777d66bae469ff | lib/rules/object-curly-newline.js | text | 119+1 | 119+0 | unit: areLineBreaksRequired | old:areLineBreaksRequired |
| 4b514235c9906cae5ec59713fc2adf87ef95de8ea88092bd536f6f7f036c09b7 | lib/rules/object-curly-newline.js | text | 119+0 | 119+1 | unit: areLineBreaksRequired | new:areLineBreaksRequired |
| 14a9f609b1a95b497d69afbb9745320e625f48c112475ba626c04d0a5d604e1e | lib/rules/object-curly-newline.js | text | 119+0 | 120+1 | unit: areLineBreaksRequired | new:areLineBreaksRequired |

source: {"unit":["bd0b6328705fd0cae322343b16545c747515007515f1b9ce79777d66bae469ff","4b514235c9906cae5ec59713fc2adf87ef95de8ea88092bd536f6f7f036c09b7","14a9f609b1a95b497d69afbb9745320e625f48c112475ba626c04d0a5d604e1e"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__207/run-mUDcBP/terminal.json