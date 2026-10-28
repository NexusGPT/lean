# lean report: 6cbee313019eb8b1ccc246bd4e5571e9d69cadb2 → ee3f9d16cb40a9d768859a23f4dccd562d9e0ab8

Identity: e9e02b0b48ee55e44fda59cd2c592a9cb791b7f17adee0d4b6dc01008066144f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/one-var.js | `(edit b288e73cf4da)` (289-289) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/one-var.js | `(edit e9f56418abd6)` (290-290) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/one-var.js | `(edit 2e471d6b089c)` (291-291) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b288e73cf4dad612b91746c9c4733f99dc96913729bb106b7019f9ab7b36b81e | lib/rules/one-var.js | text | 288+0 | 289+1 | unassigned: object-literal member |  |
| e9f56418abd608788633a894eeb192caaaa62ab709bcc83293015828967b0e85 | lib/rules/one-var.js | text | 288+0 | 290+1 | unassigned: object-literal member |  |
| 2e471d6b089c09035bd77b711c10397de5dd9ae657ec3e82a195f23cd6a073ec | lib/rules/one-var.js | text | 288+0 | 291+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["b288e73cf4dad612b91746c9c4733f99dc96913729bb106b7019f9ab7b36b81e","e9f56418abd608788633a894eeb192caaaa62ab709bcc83293015828967b0e85","2e471d6b089c09035bd77b711c10397de5dd9ae657ec3e82a195f23cd6a073ec"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__57/run-HSGzU5/terminal.json