# lean report: dcd4ad76e48b698f9a2a6197a34458509e69d2c1 → 60d7469530c9e1d652501163be7e9de51e4eb633

Identity: f847ce27e080ba74c279cb9a2ad4acb2e48b952e9e7767ea68e0b68f64b8c54f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/max-len.js | `(edit 68a14fc74de6)` (160-160) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit f5335c75dfb4)` (160-160) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit 9a90ab65b747)` (161-161) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit ea14aa41d98c)` (163-163) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit 93c26f4dcad6)` (164-164) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 68a14fc74de6c74cd51114238dc2a04de155a2359ab3732af46d160ade821e85 | lib/rules/max-len.js | text | 160+1 | 160+0 | unassigned: object-literal member |  |
| f5335c75dfb46272555b3709e02deb55dd3e782e2472b1bcc9b662a19eacb6a9 | lib/rules/max-len.js | text | 160+0 | 160+1 | unassigned: object-literal member |  |
| 9a90ab65b7479a02212d69b0a5ca76d3d49f16e822cbec546f4c4c79ec14a202 | lib/rules/max-len.js | text | 160+0 | 161+1 | unassigned: object-literal member |  |
| ea14aa41d98c56cd650b3db6fd490ce044ba178edd8dceb2735bfb9df4e5690e | lib/rules/max-len.js | text | 163+1 | 164+0 | unassigned: object-literal member |  |
| 93c26f4dcad66b442f9c5686201b05d3008f9e40f03538734a48e8ef8b2d42a9 | lib/rules/max-len.js | text | 163+0 | 164+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["68a14fc74de6c74cd51114238dc2a04de155a2359ab3732af46d160ade821e85","f5335c75dfb46272555b3709e02deb55dd3e782e2472b1bcc9b662a19eacb6a9","9a90ab65b7479a02212d69b0a5ca76d3d49f16e822cbec546f4c4c79ec14a202","ea14aa41d98c56cd650b3db6fd490ce044ba178edd8dceb2735bfb9df4e5690e","93c26f4dcad66b442f9c5686201b05d3008f9e40f03538734a48e8ef8b2d42a9"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__48/run-eDuNkl/terminal.json