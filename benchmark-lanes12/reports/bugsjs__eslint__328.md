# lean report: c6718f2d6ff84b09e0c349921d748ca06c1355c7 → 0c338e86b6e4a07c3139df2c44a87c81d38e25c2

Identity: 6f9acc7ebbae864b44fb1123b923171999be6e7184b85df6cc2c0d5dbb343242; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/lines-around-comment.js | `(edit 9cfcfd920c60)` (61-61) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/lines-around-comment.js | `(edit 796984773fb5)` (62-62) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/lines-around-comment.js | `(edit 1f6e55b3127a)` (61-61) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/lines-around-comment.js | `(edit a012f688bb57)` (62-62) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 9cfcfd920c600dfff62a07e3f306afab95d80bc2869b6f7d1a97fe72f5fe5ffc | lib/rules/lines-around-comment.js | text | 61+1 | 61+0 | unassigned: exported property assignment |  |
| 796984773fb5cc983820ba9dfa59cd15e2da051f1cc0b283cbf44e78b398f681 | lib/rules/lines-around-comment.js | text | 62+1 | 61+0 | unassigned: exported property assignment |  |
| 1f6e55b3127a44a4ea34adac5051fe1fcdfdf6e5bbc3324c4c618e4cc350442a | lib/rules/lines-around-comment.js | text | 61+0 | 61+1 | unassigned: exported property assignment |  |
| a012f688bb571ace8cec7d8f8abd89de8e87d95d9bbd0a7d1f101ba962765d2d | lib/rules/lines-around-comment.js | text | 61+0 | 62+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["9cfcfd920c600dfff62a07e3f306afab95d80bc2869b6f7d1a97fe72f5fe5ffc","796984773fb5cc983820ba9dfa59cd15e2da051f1cc0b283cbf44e78b398f681","1f6e55b3127a44a4ea34adac5051fe1fcdfdf6e5bbc3324c4c618e4cc350442a","a012f688bb571ace8cec7d8f8abd89de8e87d95d9bbd0a7d1f101ba962765d2d"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__328/run-tuDb2Y/terminal.json