# lean report: 2dbb2c005738a69cf0e7160bc358e8a92505aa39 → 22dd2780285a3f6a9a090cba64ce70913db29225

Identity: 5d87684cf020889f5c5b510c2bb0b699136b77c624a656ce1ad297eedd99105a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/object.js | `(edit 01f983707614)` (24-24) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (comment) |
| lib/object.js | `(edit 1005c84dfb5a)` (26-26) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/v1/encoder.js | `(edit fad15d9e330a)` (330-330) | **ASK** | unassigned:comment |  |  | comment |
| lib/v1/encoder.js | `(edit 2610466b304c)` (331-331) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v1/encoder.js | `(edit e09465f7c295)` (330-330) | **ASK** | unassigned:comment |  |  | comment |
| lib/v1/encoder.js | `(edit cdc0018566b2)` (331-331) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 01f983707614d874056227f532d0c1f060d41ba0c911aff7fc2644bb064befaf | lib/object.js | text | 23+0 | 24+1 | unassigned: untyped JavaScript file |  |
| 1005c84dfb5ab5a489df4a319191238871b373d78c6f0fadc2e139a663dbccd0 | lib/object.js | text | 24+0 | 26+1 | unassigned: untyped JavaScript file |  |
| fad15d9e330af3357518d24a4f4b6e42d096086a7d4e90d238949c5e6eb0debd | lib/v1/encoder.js | text | 330+1 | 330+0 | unassigned: comment |  |
| 2610466b304cfa869ae7c9ff1391a43abf19ed19d8e097a300378887f38a962e | lib/v1/encoder.js | text | 331+1 | 330+0 | unassigned: module-level statement |  |
| e09465f7c2957e74f627b68759f1ab6a13123cf4c9a7da25f700b2453a2cc9dc | lib/v1/encoder.js | text | 330+0 | 330+1 | unassigned: comment |  |
| cdc0018566b2a12066e2e78c6a3002b55d48a0a79b4bb343be8eb4d50c113cb6 | lib/v1/encoder.js | text | 330+0 | 331+1 | unassigned: module-level statement |  |

source: {"unit":[],"artifact":[],"unassigned":["01f983707614d874056227f532d0c1f060d41ba0c911aff7fc2644bb064befaf","1005c84dfb5ab5a489df4a319191238871b373d78c6f0fadc2e139a663dbccd0","fad15d9e330af3357518d24a4f4b6e42d096086a7d4e90d238949c5e6eb0debd","2610466b304cfa869ae7c9ff1391a43abf19ed19d8e097a300378887f38a962e","e09465f7c2957e74f627b68759f1ab6a13123cf4c9a7da25f700b2453a2cc9dc","cdc0018566b2a12066e2e78c6a3002b55d48a0a79b4bb343be8eb4d50c113cb6"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hessian.js__7/run-Qb4dE7/terminal.json