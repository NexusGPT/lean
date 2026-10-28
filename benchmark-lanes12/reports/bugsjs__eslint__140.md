# lean report: a8766730ff6057a2d1d5d3802b1d172469abb454 → 0b3ee066d98dbd7c9a892c73062819ebfba7b18d

Identity: 5616a4dcce72d9a85902cbed0013a9e291f34cd69a82dbff4adee8b6467cbda8; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit 9bbb7da604b1)` (657-657) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit df98d3c25590)` (657-657) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 9b6c057350ab)` (658-658) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 9bbb7da604b14da5f91b3581a429f457def0e21e1a37351153801e17107b8f52 | lib/rules/indent.js | text | 657+1 | 657+0 | unassigned: object-literal member |  |
| df98d3c25590ab92ad0d7a28ae106e9e8bc516f7938af3ea93ba8255529e45c0 | lib/rules/indent.js | text | 657+0 | 657+1 | unassigned: object-literal member |  |
| 9b6c057350abd8d6526ad24de81355a87620f8ed694c6d079e39f109e288aca3 | lib/rules/indent.js | text | 657+0 | 658+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["9bbb7da604b14da5f91b3581a429f457def0e21e1a37351153801e17107b8f52","df98d3c25590ab92ad0d7a28ae106e9e8bc516f7938af3ea93ba8255529e45c0","9b6c057350abd8d6526ad24de81355a87620f8ed694c6d079e39f109e288aca3"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__140/run-37aR9g/terminal.json