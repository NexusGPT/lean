# lean report: be29599c6e12175c5a48e117526bd204bf82fda5 → 4c83ddd4902f21b36178a4dc05b96143625cf686

Identity: d0b42efa87f83be900535cc526d7172eb99a2bf48ed335556f277ac1c05ccf01; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-magic-numbers.js | `(edit d28d71bbe5bb)` (134-134) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-magic-numbers.js | `(edit 7fdd6b34b826)` (135-135) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-magic-numbers.js | `(edit 7c4366e44609)` (134-134) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-magic-numbers.js | `(edit cfafc32ee28a)` (135-135) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-magic-numbers.js | `(edit 9fb7d7326e86)` (136-136) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-magic-numbers.js | `(edit acde8c3d87c3)` (137-137) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d28d71bbe5bb434677e91958df4ee1aadd755b2b99ebeee2661bb5eb96973675 | lib/rules/no-magic-numbers.js | text | 134+1 | 134+0 | unassigned: object-literal member |  |
| 7fdd6b34b826362c9eb2c30d5e9c3a77d4b6c2986d49b5b54c701ada00841bc0 | lib/rules/no-magic-numbers.js | text | 135+1 | 134+0 | unassigned: object-literal member |  |
| 7c4366e446097a792919c4d864102c1c8545be34fd67e344c88b41143ef97064 | lib/rules/no-magic-numbers.js | text | 134+0 | 134+1 | unassigned: object-literal member |  |
| cfafc32ee28accab446a8d813467e787d0b5e791f41e30b0ca86d93a96268dfa | lib/rules/no-magic-numbers.js | text | 134+0 | 135+1 | unassigned: object-literal member |  |
| 9fb7d7326e86b76cf96edc2339d276778ae17bec8235df18209786f5eba97d16 | lib/rules/no-magic-numbers.js | text | 134+0 | 136+1 | unassigned: object-literal member |  |
| acde8c3d87c37fa8f0072006bc7dfb234ad319a7f7852fd43b7601ea82862558 | lib/rules/no-magic-numbers.js | text | 134+0 | 137+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["d28d71bbe5bb434677e91958df4ee1aadd755b2b99ebeee2661bb5eb96973675","7fdd6b34b826362c9eb2c30d5e9c3a77d4b6c2986d49b5b54c701ada00841bc0","7c4366e446097a792919c4d864102c1c8545be34fd67e344c88b41143ef97064","cfafc32ee28accab446a8d813467e787d0b5e791f41e30b0ca86d93a96268dfa","9fb7d7326e86b76cf96edc2339d276778ae17bec8235df18209786f5eba97d16","acde8c3d87c37fa8f0072006bc7dfb234ad319a7f7852fd43b7601ea82862558"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__36/run-aSR3pq/terminal.json