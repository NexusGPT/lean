# lean report: c581b77e15e0f62782fd58a4d6adfcead8bc4b6f → 81494b2e9de5f57ae22fd8e2ded7066710e8e2f8

Identity: 07c8148a3c2092d5240e712d9936130e6cfad9a9dd33e786f4dbaf71290ada35; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/array-bracket-newline.js | `(edit e99f0be78040)` (197-197) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-bracket-newline.js | `(edit 5dca42c9189b)` (198-198) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-bracket-newline.js | `(edit 01608bb65f4c)` (199-199) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-bracket-newline.js | `(edit 2e6b373e9cae)` (200-200) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-bracket-newline.js | `(edit d49a19048b6b)` (201-201) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-bracket-newline.js | `(edit baec482042dc)` (202-202) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| e99f0be78040920c446b98e660ef3624c1197b43dec78c88aafbcdb0a5b995cc | lib/rules/array-bracket-newline.js | text | 196+0 | 197+1 | unassigned: object-literal member |  |
| 5dca42c9189b16ec0f0eeab9ddd7d07b88a86700706ec5d987dece6f7dac2eb8 | lib/rules/array-bracket-newline.js | text | 196+0 | 198+1 | unassigned: object-literal member |  |
| 01608bb65f4cd5124daa2563a843cd9d22b5b978064bed6be0f83d448314fcd7 | lib/rules/array-bracket-newline.js | text | 196+0 | 199+1 | unassigned: object-literal member |  |
| 2e6b373e9cae4935b274329f357e51cbd715188743780f2a2cfebaaf29b69353 | lib/rules/array-bracket-newline.js | text | 196+0 | 200+1 | unassigned: object-literal member |  |
| d49a19048b6b602feea1e57d45cc2b2ca732d31556036908bc6a6e747c591068 | lib/rules/array-bracket-newline.js | text | 196+0 | 201+1 | unassigned: object-literal member |  |
| baec482042dccf3acc9217d058a203fd16b95a1d2a32235c7dbb0a436b435872 | lib/rules/array-bracket-newline.js | text | 196+0 | 202+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["e99f0be78040920c446b98e660ef3624c1197b43dec78c88aafbcdb0a5b995cc","5dca42c9189b16ec0f0eeab9ddd7d07b88a86700706ec5d987dece6f7dac2eb8","01608bb65f4cd5124daa2563a843cd9d22b5b978064bed6be0f83d448314fcd7","2e6b373e9cae4935b274329f357e51cbd715188743780f2a2cfebaaf29b69353","d49a19048b6b602feea1e57d45cc2b2ca732d31556036908bc6a6e747c591068","baec482042dccf3acc9217d058a203fd16b95a1d2a32235c7dbb0a436b435872"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__167/run-INqD7w/terminal.json