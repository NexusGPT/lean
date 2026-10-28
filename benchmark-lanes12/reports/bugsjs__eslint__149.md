# lean report: 8581f4fb8bf0bc9f49dee5fb06b00a0c78ae4b2b → c7e69beca9b05f011f7107898131e769c007b233

Identity: e3ba6be10a54b69f5c79f0eed6fc05d0522c3b23b1e12b28d112d239eb9ba84b; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-initializer.js | `(edit 83649863adcc)` (270-270) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 5c1f2dc71657)` (270-270) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 2 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 83649863adcc5410562ec6d203dadc2667c154dedf37b3679aba06c02f05d6bb | lib/config/config-initializer.js | text | 270+1 | 270+0 | artifact: config | old:getConfigForStyleGuide |
| 5c1f2dc716574f583cef2181df91febf175b79bfad682b20090257d4b408a986 | lib/config/config-initializer.js | text | 270+0 | 270+1 | artifact: config | new:getConfigForStyleGuide |

config: {"unit":[],"artifact":["83649863adcc5410562ec6d203dadc2667c154dedf37b3679aba06c02f05d6bb","5c1f2dc716574f583cef2181df91febf175b79bfad682b20090257d4b408a986"],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__149/run-GhwrqH/terminal.json