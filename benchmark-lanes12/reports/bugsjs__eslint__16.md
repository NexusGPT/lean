# lean report: 975dacfdec9ee664e83337c1a8c360211a0efb28 → 90c9ff7bee7bd8474a9b1e736b5f6e08fd2a8171

Identity: a071779fd8c69fb516090121a3e6319f865b33ba1796ca3de39285cbaf368d3f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-regex-spaces.js | `(edit 0417a034614f)` (40-40) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-regex-spaces.js | `(edit dd18ed4b868f)` (40-40) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-regex-spaces.js | `(edit 82975742ea28)` (44-44) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-regex-spaces.js | `(edit 03354e59cdde)` (44-44) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 0417a034614fdc534399a91359753828534f3c3e42ff8900a91836bc813bcd96 | lib/rules/no-regex-spaces.js | text | 40+1 | 40+0 | unassigned: object-literal member |  |
| dd18ed4b868fe14234999a1961f0cde4b430d81537c725158f8b082cbbdca84d | lib/rules/no-regex-spaces.js | text | 40+0 | 40+1 | unassigned: object-literal member |  |
| 82975742ea28695f504cd848171fd91ffacd18a6b193d02bfab7793a7654cba9 | lib/rules/no-regex-spaces.js | text | 44+1 | 44+0 | unassigned: object-literal member |  |
| 03354e59cddeaee06d0233e2d08ffda563c87ec8c4c7f7ca69ad3989861da3d8 | lib/rules/no-regex-spaces.js | text | 44+0 | 44+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["0417a034614fdc534399a91359753828534f3c3e42ff8900a91836bc813bcd96","dd18ed4b868fe14234999a1961f0cde4b430d81537c725158f8b082cbbdca84d","82975742ea28695f504cd848171fd91ffacd18a6b193d02bfab7793a7654cba9","03354e59cddeaee06d0233e2d08ffda563c87ec8c4c7f7ca69ad3989861da3d8"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__16/run-FTwFnj/terminal.json