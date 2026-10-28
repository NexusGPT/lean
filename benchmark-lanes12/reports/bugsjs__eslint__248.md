# lean report: 605da180a1fc3c86ec002159934c4a0d4afca209 → a8812209b51b69ce46a063363cb4406aa6f7780c

Identity: 3f93e9ada5408737dadb766cd9ba55a4835edd8deabe9d20c7fc75142fa5e74f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 8 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/eslint.js | `modifyRulesFromComments` (152-181) | **ASK** | refused:var | ASK |  | parent: unit modifyRulesFromComments not exported |
| lib/util.js | `(edit b68c9deb3c9e)` (32-32) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/util.js | `(edit 3f8b8958e30e)` (32-32) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/util.js | `(edit 3662cbdd2844)` (33-33) | **ASK** | unassigned:comment |  |  | comment |
| lib/util.js | `(edit 7ac94062ab97)` (34-34) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/util.js | `(edit bf08db1031bb)` (35-35) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/util.js | `(edit 8790fe6f342f)` (36-36) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/util.js | `(edit 6029058c4b45)` (38-38) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

## What would make the asks provable

### lib/eslint.js · `modifyRulesFromComments`

- line 153, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 155, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 179, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 21 = 14 unit + 0 artifact + 7 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 7046c85cb8b7c8abefe0cfdb3728e9d975b154b0791c4799b4bdf961aa93242c | lib/eslint.js | text | 162+1 | 162+0 | unit: modifyRulesFromComments | old:modifyRulesFromComments |
| 4b00ce55e543ef49b1c6dcdd48518d67bf82233900edbc2dec3c2131a3404da1 | lib/eslint.js | text | 163+1 | 162+0 | unit: modifyRulesFromComments | old:modifyRulesFromComments |
| 143824c7197f8f0667591f41244c7341b609fe5a49e19e4d077d52916761341a | lib/eslint.js | text | 162+0 | 162+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 2109782236e90b8ad09bb18c079baa082fd398879b0e3c2e33d279786b54e9f5 | lib/eslint.js | text | 162+0 | 163+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 29a08b4b9dbe5c3ff9a283ced2fe9722e2a46faf30aadc296fc5a05e3f693057 | lib/eslint.js | text | 162+0 | 164+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 1a29766097856a1643c89c9454d9c299b3d0c88fc9063d7f0449bd19623d2d33 | lib/eslint.js | text | 162+0 | 165+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| e79a42d9fbe262cd26398c974987bd6c0e2b3a4ae8a78a3885bf7ead5cfce116 | lib/eslint.js | text | 162+0 | 166+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 21e7ecc97f1e8342793938a5d673fece62ae2d58ff6f22a869a0cdc22ddd25ee | lib/eslint.js | text | 162+0 | 167+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 378c11348ccf9479e41830601aff7325d54716aac7fe3e7aa40f1e92c2944a73 | lib/eslint.js | text | 162+0 | 168+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| a7e01af9e8266298eb7907844c9dbbef72bd3a479145cb6ffb95ea2e473082ed | lib/eslint.js | text | 162+0 | 169+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| b874e76c2e16dfd63100d6bd38a3b6340c68e3e4add113a95c5a523c34e976dd | lib/eslint.js | text | 162+0 | 170+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 2d3461e05ef31f449de7147fd968f91b29a245435be73ba5967fbec2b4a8b35f | lib/eslint.js | text | 162+0 | 171+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 3f2826470f1a49c73f0995eba5ddd164baeeafd9c339fcf368eb2a387c3fe2b0 | lib/eslint.js | text | 162+0 | 172+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| 422512210aca687ed0ec18d0eb9124f4b628e87e07b7b6361fb269503fa77b0d | lib/eslint.js | text | 162+0 | 173+1 | unit: modifyRulesFromComments | new:modifyRulesFromComments |
| b68c9deb3c9e91936e568b2d7d17ed8af1bd7bd322d41fe286d2ac77fa82a1b8 | lib/util.js | text | 32+1 | 32+0 | unassigned: exported property assignment |  |
| 3f8b8958e30ed9148e4c964d7884148b6821c50e40fdbfaa20a161b8893946fd | lib/util.js | text | 32+0 | 32+1 | unassigned: exported property assignment |  |
| 3662cbdd2844b2ab490b7442d744729a8fc53d625bb623261bfc5d70924e41f6 | lib/util.js | text | 32+0 | 33+1 | unassigned: comment |  |
| 7ac94062ab9726f04a99ba498ffe64551dd064cc0ba06efda65fe56c109be3da | lib/util.js | text | 32+0 | 34+1 | unassigned: exported property assignment |  |
| bf08db1031bb9796eb8418df3b146048be9ad4b8dcb97a414563fdd56f55d9aa | lib/util.js | text | 32+0 | 35+1 | unassigned: exported property assignment |  |
| 8790fe6f342f8229fc748f9808229d99715f1b305e04653a22dac02c5733215e | lib/util.js | text | 32+0 | 36+1 | unassigned: exported property assignment |  |
| 6029058c4b457ba94a6f3c5be4a4c7ac13e817fd3225222c110816dd6ae2719f | lib/util.js | text | 33+0 | 38+1 | unassigned: exported property assignment |  |

source: {"unit":["7046c85cb8b7c8abefe0cfdb3728e9d975b154b0791c4799b4bdf961aa93242c","4b00ce55e543ef49b1c6dcdd48518d67bf82233900edbc2dec3c2131a3404da1","143824c7197f8f0667591f41244c7341b609fe5a49e19e4d077d52916761341a","2109782236e90b8ad09bb18c079baa082fd398879b0e3c2e33d279786b54e9f5","29a08b4b9dbe5c3ff9a283ced2fe9722e2a46faf30aadc296fc5a05e3f693057","1a29766097856a1643c89c9454d9c299b3d0c88fc9063d7f0449bd19623d2d33","e79a42d9fbe262cd26398c974987bd6c0e2b3a4ae8a78a3885bf7ead5cfce116","21e7ecc97f1e8342793938a5d673fece62ae2d58ff6f22a869a0cdc22ddd25ee","378c11348ccf9479e41830601aff7325d54716aac7fe3e7aa40f1e92c2944a73","a7e01af9e8266298eb7907844c9dbbef72bd3a479145cb6ffb95ea2e473082ed","b874e76c2e16dfd63100d6bd38a3b6340c68e3e4add113a95c5a523c34e976dd","2d3461e05ef31f449de7147fd968f91b29a245435be73ba5967fbec2b4a8b35f","3f2826470f1a49c73f0995eba5ddd164baeeafd9c339fcf368eb2a387c3fe2b0","422512210aca687ed0ec18d0eb9124f4b628e87e07b7b6361fb269503fa77b0d"],"artifact":[],"unassigned":["b68c9deb3c9e91936e568b2d7d17ed8af1bd7bd322d41fe286d2ac77fa82a1b8","3f8b8958e30ed9148e4c964d7884148b6821c50e40fdbfaa20a161b8893946fd","3662cbdd2844b2ab490b7442d744729a8fc53d625bb623261bfc5d70924e41f6","7ac94062ab9726f04a99ba498ffe64551dd064cc0ba06efda65fe56c109be3da","bf08db1031bb9796eb8418df3b146048be9ad4b8dcb97a414563fdd56f55d9aa","8790fe6f342f8229fc748f9808229d99715f1b305e04653a22dac02c5733215e","6029058c4b457ba94a6f3c5be4a4c7ac13e817fd3225222c110816dd6ae2719f"]}

Task reconciliation: expected 8; terminal 8; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__248/run-audLtI/terminal.json