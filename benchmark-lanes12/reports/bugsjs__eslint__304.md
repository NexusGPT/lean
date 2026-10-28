# lean report: bfaaac5f160bb86b83781afa7b524bee8b28fde7 → 5e44b507827f1762ceacd604d78dbe36c25bf1c6

Identity: a1af68c06f6a9da393e3e43cb17a7eea953ddfc112ab752142f2863d0d9ce2c7; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-cond-assign.js | `(edit 599d25d7f5d4)` (41-41) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-cond-assign.js | `(edit 0945675cbe0c)` (41-41) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-cond-assign.js | `(edit f29eff6e9cf4)` (45-45) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-cond-assign.js | `(edit 25e24a94154d)` (45-45) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 599d25d7f5d422b185f1e147fae71820b06ca07ec0af2b91dfbc5b5394c0464c | lib/rules/no-cond-assign.js | text | 41+1 | 41+0 | unassigned: exported property assignment |  |
| 0945675cbe0cdbad9bb51c9f8ae07fe9ff9d9bcea52f72ac1b1898c004256de6 | lib/rules/no-cond-assign.js | text | 41+0 | 41+1 | unassigned: exported property assignment |  |
| f29eff6e9cf47760366ea773dc0dd9f4848d3e4724f991a58399448383055f6a | lib/rules/no-cond-assign.js | text | 45+1 | 45+0 | unassigned: exported property assignment |  |
| 25e24a94154dee9624bb95cf9d2e2eeeb8909ef857db40c9ea2475861c3e6a64 | lib/rules/no-cond-assign.js | text | 45+0 | 45+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["599d25d7f5d422b185f1e147fae71820b06ca07ec0af2b91dfbc5b5394c0464c","0945675cbe0cdbad9bb51c9f8ae07fe9ff9d9bcea52f72ac1b1898c004256de6","f29eff6e9cf47760366ea773dc0dd9f4848d3e4724f991a58399448383055f6a","25e24a94154dee9624bb95cf9d2e2eeeb8909ef857db40c9ea2475861c3e6a64"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__304/run-2Xp4i7/terminal.json