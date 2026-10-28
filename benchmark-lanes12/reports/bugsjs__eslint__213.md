# lean report: 8c237d8be368798acea876adedd3533a99e30368 → 21eed5e4d15addabb4e92a08f8345e5fd1061c4c

Identity: 24663d50d210ebf8ea37b47dc3f400b355069d2530d92f6a808dcb2dfadad520; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/max-len.js | `(edit 0a0cda85e256)` (216-216) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit eb901076bcfd)` (216-216) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit afe44a72887a)` (217-217) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 0a0cda85e256292fd135d6fa5e0d760e7b1b04baccd717a3802847f565a7f69a | lib/rules/max-len.js | text | 216+1 | 216+0 | unassigned: object-literal member |  |
| eb901076bcfd8d25f879b6007cbeff832a7dc99de2317a1b7bbf3864166fb1ca | lib/rules/max-len.js | text | 216+0 | 216+1 | unassigned: object-literal member |  |
| afe44a72887a9c45c434be5f6cf14fe88971795322c10fbdac469aaa42184566 | lib/rules/max-len.js | text | 216+0 | 217+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["0a0cda85e256292fd135d6fa5e0d760e7b1b04baccd717a3802847f565a7f69a","eb901076bcfd8d25f879b6007cbeff832a7dc99de2317a1b7bbf3864166fb1ca","afe44a72887a9c45c434be5f6cf14fe88971795322c10fbdac469aaa42184566"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__213/run-COStQB/terminal.json