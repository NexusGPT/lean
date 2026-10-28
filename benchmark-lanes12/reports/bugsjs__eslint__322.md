# lean report: 461b015ea8e4109b22be77d271b1c96f34169310 → d041315aa9566cced92bca3cf9ae2cd68e3e57d5

Identity: 49eb0b924438c15703b85e42297a121b09123d9785ccae7d6c8f69d89aa86ed9; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/array-callback-return.js | `(edit 733199c4055a)` (188-188) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-callback-return.js | `(edit 2b06936332b9)` (188-188) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-callback-return.js | `(edit 5f260046a9c4)` (189-189) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/array-callback-return.js | `(edit e553a5a30687)` (190-190) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 733199c4055a25db2a9542081578cbbee93c63143da12fd54e4946eaaf40401b | lib/rules/array-callback-return.js | text | 188+1 | 188+0 | unassigned: object-literal member |  |
| 2b06936332b9138b7be20642956e997078672d8c3aaf2b9cabfbf586ee8cd688 | lib/rules/array-callback-return.js | text | 188+0 | 188+1 | unassigned: object-literal member |  |
| 5f260046a9c4291da9c4a72428ed04cb58e9ece03941a2121470f5422b4ca13e | lib/rules/array-callback-return.js | text | 188+0 | 189+1 | unassigned: object-literal member |  |
| e553a5a3068727bac513b5e1aa898d1ecc3222a0ec258dbc94407e3190a9d5e4 | lib/rules/array-callback-return.js | text | 188+0 | 190+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["733199c4055a25db2a9542081578cbbee93c63143da12fd54e4946eaaf40401b","2b06936332b9138b7be20642956e997078672d8c3aaf2b9cabfbf586ee8cd688","5f260046a9c4291da9c4a72428ed04cb58e9ece03941a2121470f5422b4ca13e","e553a5a3068727bac513b5e1aa898d1ecc3222a0ec258dbc94407e3190a9d5e4"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__322/run-vFL66R/terminal.json