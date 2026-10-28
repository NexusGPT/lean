# lean report: b3b95b8033172a206c79dd7daadee205e395e9b6 → 4401fcc9613854f030daeb3bc4587708fd5536bd

Identity: 32f6522c4ce2ae5c35821c7f29c7d3d3dcc57197935cd3ee5b5a779ec30a625d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s); 2 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `createStubRule` (513-536) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2339: Property 'report' does not exist on type 'Object'. |

## What would make the asks provable

### lib/linter.js · `createStubRule`

- line 523, `ts-strict`: TS2339: Property 'report' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 7 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| a9561215ba83c6a8e3afd7a5851b1bdd3c13a8ee765ef44f652c092e13fff6bc | lib/linter.js | text | 522+1 | 522+0 | unit: createStubRule | old:createStubRule |
| e011e5bfc6fafa17ff2489b3842cd08930bff6726824ff730e4829e12a8b57d1 | lib/linter.js | text | 523+1 | 522+0 | unit: createStubRule | old:createStubRule |
| 814e75bbe2a38bde79fa0730868353792074d28bb5592fcd6d67aa5e0c02060f | lib/linter.js | text | 522+0 | 522+1 | unit: createStubRule | new:createStubRule |
| af59abc7fe773e3450c91094aec85e345cfef1334eb343b7b4354c2bf8805f07 | lib/linter.js | text | 522+0 | 523+1 | unit: createStubRule | new:createStubRule |
| 10713682110e432b645920cbc22dd309ae95b714942bfdd76912e21d8c37654d | lib/linter.js | text | 522+0 | 524+1 | unit: createStubRule | new:createStubRule |
| c3a20bf9769d333fb081e7ee8ecd2bfe2e1a76093388b788ea85dca39df74406 | lib/linter.js | text | 522+0 | 525+1 | unit: createStubRule | new:createStubRule |
| 601632a41d0465d81cb34b672de636c44b06923c6451872a161da0f5634a3b45 | lib/linter.js | text | 522+0 | 526+1 | unit: createStubRule | new:createStubRule |

source: {"unit":["a9561215ba83c6a8e3afd7a5851b1bdd3c13a8ee765ef44f652c092e13fff6bc","e011e5bfc6fafa17ff2489b3842cd08930bff6726824ff730e4829e12a8b57d1","814e75bbe2a38bde79fa0730868353792074d28bb5592fcd6d67aa5e0c02060f","af59abc7fe773e3450c91094aec85e345cfef1334eb343b7b4354c2bf8805f07","10713682110e432b645920cbc22dd309ae95b714942bfdd76912e21d8c37654d","c3a20bf9769d333fb081e7ee8ecd2bfe2e1a76093388b788ea85dca39df74406","601632a41d0465d81cb34b672de636c44b06923c6451872a161da0f5634a3b45"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__62/run-tWA7hK/terminal.json