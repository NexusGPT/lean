# lean report: 4536241b06e47e76c3f198e6b380994fe32bc64c → 5c830363838dcbbf11680c94164ec0f4758ad73b

Identity: f861496d58dd1727c196df3e946012d82e9bafc0af8bc511106313eeea19de18; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-sequences.js | `(edit 51ab5f1db4a2)` (88-88) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-sequences.js | `(edit 30793e8faaa7)` (88-88) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-sequences.js | `(edit e8144514630e)` (89-89) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/space-after-keywords.js | `(edit 2bcb5251f7b3)` (36-36) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/space-after-keywords.js | `(edit 191ac7b6e90d)` (53-53) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 51ab5f1db4a23707085cc533e2e41cbf033a3ae0c7b3a677e0632167f5c8caf5 | lib/rules/no-sequences.js | text | 88+1 | 88+0 | unassigned: object-literal member |  |
| 30793e8faaa761a6e5b947725fb31018b3f52faac65325db3369b85ea33f0093 | lib/rules/no-sequences.js | text | 88+0 | 88+1 | unassigned: object-literal member |  |
| e8144514630e9f6a128f5edf0425efd97a9df004455b9ecae35ff37f4012de08 | lib/rules/no-sequences.js | text | 88+0 | 89+1 | unassigned: object-literal member |  |
| 2bcb5251f7b36e870760e1fd609401571c168fd983a39442f93753b5524bfa38 | lib/rules/space-after-keywords.js | text | 35+0 | 36+1 | unassigned: object-literal member |  |
| 191ac7b6e90d5920ffeefea033a856298499638f54f30767ebb0102bc128e3a0 | lib/rules/space-after-keywords.js | text | 51+0 | 53+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["51ab5f1db4a23707085cc533e2e41cbf033a3ae0c7b3a677e0632167f5c8caf5","30793e8faaa761a6e5b947725fb31018b3f52faac65325db3369b85ea33f0093","e8144514630e9f6a128f5edf0425efd97a9df004455b9ecae35ff37f4012de08","2bcb5251f7b36e870760e1fd609401571c168fd983a39442f93753b5524bfa38","191ac7b6e90d5920ffeefea033a856298499638f54f30767ebb0102bc128e3a0"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__34/run-CSUAep/terminal.json