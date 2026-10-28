# lean report: 601f8518ab2ba3fb6bcc00062b1fdca5f369c042 → 784f3ed579bc566290aa2ba6401a3ba8151a5833

Identity: 5a73b1616ad80a8827cee977318553cb0e575345ddff5103d5f6381c3a6ebe86; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-destructuring.js | `(edit d620f47e5c61)` (168-168) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit d1fce70d2fa5)` (169-169) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 27623fb343bd)` (168-168) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 5cfe523bd23d)` (169-169) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 6d0a9dd047ee)` (170-170) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit dfcf05300f1e)` (171-171) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d620f47e5c6125e009d28e0fcf3e0076184c0f63b772c2bb1041603f342f5ec5 | lib/rules/prefer-destructuring.js | text | 168+1 | 168+0 | unassigned: object-literal member |  |
| d1fce70d2fa5e17724f028fbceb9873f55d060ed8074621a178a489d82d0b0d5 | lib/rules/prefer-destructuring.js | text | 169+1 | 168+0 | unassigned: object-literal member |  |
| 27623fb343bd142efdd4acca9ebdd69601219ff4407e57e19d752082c1c0c8b0 | lib/rules/prefer-destructuring.js | text | 168+0 | 168+1 | unassigned: object-literal member |  |
| 5cfe523bd23dd68995033d113fb1b0e16fda8e3fdae49274d482a0f73292d61e | lib/rules/prefer-destructuring.js | text | 168+0 | 169+1 | unassigned: object-literal member |  |
| 6d0a9dd047ee887977858432d9cd5400009de65082f83be55cdad021ab312a1c | lib/rules/prefer-destructuring.js | text | 168+0 | 170+1 | unassigned: object-literal member |  |
| dfcf05300f1ebbefb3335c98c65af95a238e254f066488aec61948fdb27ea297 | lib/rules/prefer-destructuring.js | text | 168+0 | 171+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["d620f47e5c6125e009d28e0fcf3e0076184c0f63b772c2bb1041603f342f5ec5","d1fce70d2fa5e17724f028fbceb9873f55d060ed8074621a178a489d82d0b0d5","27623fb343bd142efdd4acca9ebdd69601219ff4407e57e19d752082c1c0c8b0","5cfe523bd23dd68995033d113fb1b0e16fda8e3fdae49274d482a0f73292d61e","6d0a9dd047ee887977858432d9cd5400009de65082f83be55cdad021ab312a1c","dfcf05300f1ebbefb3335c98c65af95a238e254f066488aec61948fdb27ea297"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__119/run-TBSAJM/terminal.json