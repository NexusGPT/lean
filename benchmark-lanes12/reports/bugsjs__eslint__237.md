# lean report: 427543afb4bf024869b8a243c793824eca73ad67 → 4c4f1a628852aa877c89270d66f539c7646eb1ae

Identity: 1e99e01af15c4dfb73b04902ff866ff1d904a24567cbffdbedadc4a01eb2230e; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/brace-style.js | `(edit 58d2297962b9)` (143-143) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/brace-style.js | `(edit e6a66c4f462e)` (144-144) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/brace-style.js | `(edit 737f4607282a)` (145-145) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 58d2297962b945a0a571d5c04b68395a502f606d0d6d5b083f7d617cef2f5c7c | lib/rules/brace-style.js | text | 142+0 | 143+1 | unassigned: object-literal member |  |
| e6a66c4f462e13def78e7937e313c8c8f5eae70773d6e6376c5fbbf334d181ba | lib/rules/brace-style.js | text | 142+0 | 144+1 | unassigned: object-literal member |  |
| 737f4607282a9c035431f2feb6d289661d5be55b02fd838e5d120a59f4d3b6db | lib/rules/brace-style.js | text | 142+0 | 145+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["58d2297962b945a0a571d5c04b68395a502f606d0d6d5b083f7d617cef2f5c7c","e6a66c4f462e13def78e7937e313c8c8f5eae70773d6e6376c5fbbf334d181ba","737f4607282a9c035431f2feb6d289661d5be55b02fd838e5d120a59f4d3b6db"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__237/run-3K8xIf/terminal.json