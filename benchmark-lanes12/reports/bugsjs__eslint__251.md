# lean report: cb1c91a336e338a84ce5ceaaa8fe4b07444c49cc → 1efbc26e37005ad8025b2cca7ca548826aa49c70

Identity: 1e7f71e3ef35a30d839ea46217bc30ea791f309ec02a764182e6aea928a8e5ef; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/newline-per-chained-call.js | `(edit db8f02d2e862)` (39-39) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/newline-per-chained-call.js | `(edit 7a75e9091bc2)` (39-39) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| db8f02d2e86270c6f1b708cb4fcedbc1b002cca5facae8936f138a6ffb4da552 | lib/rules/newline-per-chained-call.js | text | 39+1 | 39+0 | unassigned: exported property assignment |  |
| 7a75e9091bc2b2eade9c2f5e2bebf80ab4099d0b8d3a9610b2018d4405c0674a | lib/rules/newline-per-chained-call.js | text | 39+0 | 39+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["db8f02d2e86270c6f1b708cb4fcedbc1b002cca5facae8936f138a6ffb4da552","7a75e9091bc2b2eade9c2f5e2bebf80ab4099d0b8d3a9610b2018d4405c0674a"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__251/run-kEzZCd/terminal.json