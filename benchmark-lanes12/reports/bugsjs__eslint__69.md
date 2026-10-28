# lean report: cc534819c739006a9d2680635b90fae9fbdec58e → c6536448378eb5f7c57762755f5361e0f16668ae

Identity: a7036f8a70c0f199854500c343e443b038e8515b98a2b744dd11084acabbbf00; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-multi-spaces.js | `(edit 2e2b5c1dd502)` (146-146) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-multi-spaces.js | `(edit bcfb8bceff0b)` (147-147) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-multi-spaces.js | `(edit d8b6bfe1aa4a)` (146-146) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2e2b5c1dd50289d05a3c78b4125bde4c5fe43700c43f83d380e035d3523f5bd7 | lib/rules/no-multi-spaces.js | text | 146+1 | 146+0 | unassigned: object-literal member |  |
| bcfb8bceff0b6dc0c03ddc20bdcabd70a339d162c6f75d40862cc8467c86f856 | lib/rules/no-multi-spaces.js | text | 147+1 | 146+0 | unassigned: object-literal member |  |
| d8b6bfe1aa4abace5d6d5df0bd69ff6c3a463c4ca9afa445116e19bfa9c41309 | lib/rules/no-multi-spaces.js | text | 146+0 | 146+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["2e2b5c1dd50289d05a3c78b4125bde4c5fe43700c43f83d380e035d3523f5bd7","bcfb8bceff0b6dc0c03ddc20bdcabd70a339d162c6f75d40862cc8467c86f856","d8b6bfe1aa4abace5d6d5df0bd69ff6c3a463c4ca9afa445116e19bfa9c41309"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__69/run-erUb8q/terminal.json