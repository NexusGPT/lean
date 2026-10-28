# lean report: 0cf081ef7249c8e3b9e2cba4710f6205ef996b02 → 8bd49ebaff895a62553ef141b7d66f00f5ecdf4d

Identity: ac656221752e5a861f91ed4885a41c7134f6a837ecea2f69b6a702fe095d60a0; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-destructuring.js | `(edit 1f77b54ace9a)` (148-148) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 0f2f256c5c2f)` (148-148) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 1f77b54ace9ac66769d30825e1fe4768e2a27da7df3d4f4d0124687f7b79603e | lib/rules/prefer-destructuring.js | text | 148+1 | 148+0 | unassigned: object-literal member |  |
| 0f2f256c5c2f6f0930be5e1787f19143b69581130e2a3fd63e319f38718d2f8f | lib/rules/prefer-destructuring.js | text | 148+0 | 148+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["1f77b54ace9ac66769d30825e1fe4768e2a27da7df3d4f4d0124687f7b79603e","0f2f256c5c2f6f0930be5e1787f19143b69581130e2a3fd63e319f38718d2f8f"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__193/run-OZtdwO/terminal.json