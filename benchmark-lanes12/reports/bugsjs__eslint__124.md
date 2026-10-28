# lean report: f8153ad226b2a2465fe339d7719bf3664dae8df6 → 857ad1dcf5735e9ba8037aa830d91ed0ec3e6b32

Identity: 426d8b6be79ddbe028bc415ddf1ee4880028563f15a30d7702129c9fafe852ea; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit aee3201068b7)` (650-650) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/indent.js | `(edit 8421b389f103)` (651-651) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 81ae2d3aab8e)` (652-652) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 39ced7267200)` (650-650) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/indent.js | `(edit fb6d35933c7f)` (651-651) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit b7bbf6f74a81)` (652-652) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 458efc9b7a2f)` (653-653) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 8396be8f3d92)` (654-654) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit e26b8390848e)` (655-655) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 72f103c3b95b)` (656-656) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| aee3201068b7b5e6f6252b2e70fa28316f72fc7e480bb0847a93fce5161f2464 | lib/rules/indent.js | text | 650+1 | 650+0 | unassigned: comment |  |
| 8421b389f10332a2beafd529a17df0b1e2a66552250ec87f53396bf2b15cd178 | lib/rules/indent.js | text | 651+1 | 650+0 | unassigned: object-literal member |  |
| 81ae2d3aab8e5a1ece295963986c4237c54868990b08605887166cfe94c2263a | lib/rules/indent.js | text | 652+1 | 650+0 | unassigned: object-literal member |  |
| 39ced726720050e47bb592aa1be7f3b8c0419efddd07cce6cbcbe3999f5b4d16 | lib/rules/indent.js | text | 650+0 | 650+1 | unassigned: comment |  |
| fb6d35933c7f60042e2653f9d13ca73c25aceddac1d682be0720ab6d5653cc91 | lib/rules/indent.js | text | 650+0 | 651+1 | unassigned: object-literal member |  |
| b7bbf6f74a81cc4eebfb005a40c839769042a278b0393a27be0af29ea7db6470 | lib/rules/indent.js | text | 650+0 | 652+1 | unassigned: object-literal member |  |
| 458efc9b7a2f18d364d09eb8a33f6c8bd59a5ac965a5ade974cbca1a3bf2ab36 | lib/rules/indent.js | text | 650+0 | 653+1 | unassigned: object-literal member |  |
| 8396be8f3d92727986eda3cfb6d690dc9f486240f0485a05b6972480034797e5 | lib/rules/indent.js | text | 650+0 | 654+1 | unassigned: object-literal member |  |
| e26b8390848e6d56dda48a6c1820fd9599777bab2e81047921aafad130f8c392 | lib/rules/indent.js | text | 650+0 | 655+1 | unassigned: object-literal member |  |
| 72f103c3b95b349afdf502a392fd51c59eabc5c14facca3802e870dc3589c72f | lib/rules/indent.js | text | 650+0 | 656+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["aee3201068b7b5e6f6252b2e70fa28316f72fc7e480bb0847a93fce5161f2464","8421b389f10332a2beafd529a17df0b1e2a66552250ec87f53396bf2b15cd178","81ae2d3aab8e5a1ece295963986c4237c54868990b08605887166cfe94c2263a","39ced726720050e47bb592aa1be7f3b8c0419efddd07cce6cbcbe3999f5b4d16","fb6d35933c7f60042e2653f9d13ca73c25aceddac1d682be0720ab6d5653cc91","b7bbf6f74a81cc4eebfb005a40c839769042a278b0393a27be0af29ea7db6470","458efc9b7a2f18d364d09eb8a33f6c8bd59a5ac965a5ade974cbca1a3bf2ab36","8396be8f3d92727986eda3cfb6d690dc9f486240f0485a05b6972480034797e5","e26b8390848e6d56dda48a6c1820fd9599777bab2e81047921aafad130f8c392","72f103c3b95b349afdf502a392fd51c59eabc5c14facca3802e870dc3589c72f"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__124/run-LwA68o/terminal.json