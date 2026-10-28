# lean report: d49d9d003579d0b11feab54ddac788b9526b3eec → bf793b1b89415fd7bb143ebfb58e4b3842636b84

Identity: e7bddf5a913a6091662b6c3afa66df63558f55a7a0b97bad1df43c0a317a7f5e; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/camelcase.js | `(edit 1bb7e4d6b9ba)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit b9851d7d38d2)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit a5a1dc0e3e2f)` (122-122) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit e859fc51a3e1)` (122-122) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 1bb7e4d6b9badc727c8bf8817bd65843e98dff6abdfa983b54d9d22644163692 | lib/rules/camelcase.js | text | 112+1 | 112+0 | unassigned: object-literal member |  |
| b9851d7d38d25e9728d6638627edc4251622bbd0befca2e2f7b11b00613aa903 | lib/rules/camelcase.js | text | 112+0 | 112+1 | unassigned: object-literal member |  |
| a5a1dc0e3e2fae40395e8be5f8994ad7a4d711406a9909760f03349b0d2cc542 | lib/rules/camelcase.js | text | 122+1 | 122+0 | unassigned: object-literal member |  |
| e859fc51a3e1d26bb90ddaaeb68c73c95978352fb98a88722bb0f18e8fe0d6f3 | lib/rules/camelcase.js | text | 122+0 | 122+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["1bb7e4d6b9badc727c8bf8817bd65843e98dff6abdfa983b54d9d22644163692","b9851d7d38d25e9728d6638627edc4251622bbd0befca2e2f7b11b00613aa903","a5a1dc0e3e2fae40395e8be5f8994ad7a4d711406a9909760f03349b0d2cc542","e859fc51a3e1d26bb90ddaaeb68c73c95978352fb98a88722bb0f18e8fe0d6f3"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__277/run-Qo4H4q/terminal.json