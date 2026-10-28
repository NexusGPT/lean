# lean report: 8e960642b914314abd2ea4478584b53ebe88132e → c777510f31574035ee77f7b534079007290826be

Identity: 3d8ef92457a7b5a45718abe2c90b6841b2eaf0b41ee14212aad2a02bd3cd6ac7; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-sequences.js | `(edit 7dc26bd42687)` (34-34) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-sequences.js | `(edit a839415624f2)` (34-34) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-sequences.js | `(edit 6c91e84d9a19)` (35-35) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 7dc26bd426873fbb4002882810191cb2ea275e7c53f182e021aa9daa18d04083 | lib/rules/no-sequences.js | text | 34+1 | 34+0 | unassigned: object-literal member |  |
| a839415624f2e6022d8ac7fbf89507ba9c7c311397ab4a51a94d19bf78798392 | lib/rules/no-sequences.js | text | 34+0 | 34+1 | unassigned: object-literal member |  |
| 6c91e84d9a19c6edd21331ee9ff3f339263336f4cf725678c4dd6c647ddee097 | lib/rules/no-sequences.js | text | 34+0 | 35+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["7dc26bd426873fbb4002882810191cb2ea275e7c53f182e021aa9daa18d04083","a839415624f2e6022d8ac7fbf89507ba9c7c311397ab4a51a94d19bf78798392","6c91e84d9a19c6edd21331ee9ff3f339263336f4cf725678c4dd6c647ddee097"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__66/run-aAMeDI/terminal.json