# lean report: d9edcda1ac25238e7daed3fde6492f9c4c274a61 → e44a44aaa31bbe3cf44072fd03821085a43f148d

Identity: 5eff19dbecdc6dad9370441a2c279a24ec5508ae50f9d3fb05057457bb643fb1; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/quote-props.js | `(edit 091811bd41ae)` (144-144) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/quote-props.js | `(edit be07eebe184f)` (145-145) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/quote-props.js | `(edit d5cb1f03b95c)` (146-146) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 091811bd41ae245d5bba27260a434ecf5a4c6a2b5d32690beaaeec34d70c9582 | lib/rules/quote-props.js | text | 143+0 | 144+1 | unassigned: exported property assignment |  |
| be07eebe184ff6b375d1611d979406cd31801d62216e82ad4248671a724b5115 | lib/rules/quote-props.js | text | 143+0 | 145+1 | unassigned: exported property assignment |  |
| d5cb1f03b95c33464343aa605bc9bbbaf6346f0f6ca7008545e9bec26531aa86 | lib/rules/quote-props.js | text | 143+0 | 146+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["091811bd41ae245d5bba27260a434ecf5a4c6a2b5d32690beaaeec34d70c9582","be07eebe184ff6b375d1611d979406cd31801d62216e82ad4248671a724b5115","d5cb1f03b95c33464343aa605bc9bbbaf6346f0f6ca7008545e9bec26531aa86"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__67/run-PMwAOM/terminal.json