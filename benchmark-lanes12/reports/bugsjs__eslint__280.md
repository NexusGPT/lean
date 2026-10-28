# lean report: cfb65c5ce3810ddba9455000712ef812589e2860 → 14ed048e6e41784da057a8643f22aa22cccc52c6

Identity: 3954d995cebef142f34d42cc6d0f3f273f23c598218357532989615c8e08cb32; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/testers/rule-tester.js | `(edit 3b9671a8931e)` (497-497) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit 9fda0d0ad71e)` (498-498) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit 35d7f719697a)` (499-499) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit 04024b20b266)` (500-500) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/testers/rule-tester.js | `(edit 594eda04998c)` (501-501) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit e2cbfd051dcf)` (502-502) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit ba661bd3f993)` (499-499) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit 533e447db8d8)` (500-500) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/testers/rule-tester.js | `(edit 106ba4367dbd)` (502-502) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3b9671a8931eeb7a8598ad1555794c6c872b55a1eb25d21849a4d11f6494e97f | lib/testers/rule-tester.js | text | 496+0 | 497+1 | unassigned: object-literal member |  |
| 9fda0d0ad71e82e1a3d5a9d77bb989a20ac3a0ec6a5e59b9f6576f8f38a29fc1 | lib/testers/rule-tester.js | text | 498+1 | 499+0 | unassigned: object-literal member |  |
| 35d7f719697a62a5b507bca4c768e4a9c1b953aeec508d4275cae9043d2de842 | lib/testers/rule-tester.js | text | 499+1 | 499+0 | unassigned: object-literal member |  |
| 04024b20b266e8c21f9d9c6b2a66331dcefc5fd171f718a5500d20f890bdc997 | lib/testers/rule-tester.js | text | 500+1 | 499+0 | unassigned: whitespace |  |
| 594eda04998c910d990aaa6ab8bb7da0083fec36667bf3e4accaebcb85c7e843 | lib/testers/rule-tester.js | text | 501+1 | 499+0 | unassigned: object-literal member |  |
| e2cbfd051dcf26b58bea89feaab0ac7f9dadbc17f1f95b82b0b89bc413350b6b | lib/testers/rule-tester.js | text | 502+1 | 499+0 | unassigned: object-literal member |  |
| ba661bd3f993fd45effc7b12392f8f3eba29cb3f1758d152f64a355d32b0d133 | lib/testers/rule-tester.js | text | 498+0 | 499+1 | unassigned: object-literal member |  |
| 533e447db8d8c1e824edec2ad8fa5f955d0a25560b41ae1ab9d193e9b7b60deb | lib/testers/rule-tester.js | text | 498+0 | 500+1 | unassigned: object-literal member |  |
| 106ba4367dbdedb10f0f5186073b0fa451a38d48f4c58ba1937349689c90de68 | lib/testers/rule-tester.js | text | 503+0 | 502+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["3b9671a8931eeb7a8598ad1555794c6c872b55a1eb25d21849a4d11f6494e97f","9fda0d0ad71e82e1a3d5a9d77bb989a20ac3a0ec6a5e59b9f6576f8f38a29fc1","35d7f719697a62a5b507bca4c768e4a9c1b953aeec508d4275cae9043d2de842","04024b20b266e8c21f9d9c6b2a66331dcefc5fd171f718a5500d20f890bdc997","594eda04998c910d990aaa6ab8bb7da0083fec36667bf3e4accaebcb85c7e843","e2cbfd051dcf26b58bea89feaab0ac7f9dadbc17f1f95b82b0b89bc413350b6b","ba661bd3f993fd45effc7b12392f8f3eba29cb3f1758d152f64a355d32b0d133","533e447db8d8c1e824edec2ad8fa5f955d0a25560b41ae1ab9d193e9b7b60deb","106ba4367dbdedb10f0f5186073b0fa451a38d48f4c58ba1937349689c90de68"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__280/run-S54ttB/terminal.json