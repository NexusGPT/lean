# lean report: da77eb4bfd42cf84bfcd8c490811152a533055f2 → dedae45bc03c800adf77e449aa8fba037f17a173

Identity: 00e933a467e017b8e463aa11320137794be20255ddeed8cec558d52d2bd98444; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-constant-condition.js | `(edit 3b16c1b0b410)` (141-141) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-constant-condition.js | `(edit c15dd83af31e)` (141-141) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-constant-condition.js | `(edit a65a68806fe5)` (153-153) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-constant-condition.js | `(edit ee6491aaec64)` (153-153) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3b16c1b0b4107b62dec5f08817ad9a2e5d2ac4c15e12f2f88799019b36072e13 | lib/rules/no-constant-condition.js | text | 141+1 | 141+0 | unassigned: object-literal member |  |
| c15dd83af31e790325e3071ab020b3f7edf56e2e9f6317ebd1bcc9b4a6ec73f6 | lib/rules/no-constant-condition.js | text | 141+0 | 141+1 | unassigned: object-literal member |  |
| a65a68806fe59a1f0d0b5a2ed11b2a773cca7972817464d7247020a05d938d31 | lib/rules/no-constant-condition.js | text | 153+1 | 153+0 | unassigned: object-literal member |  |
| ee6491aaec64037142e514597da3c8e57ea292317e17f45258b58be5835b4a33 | lib/rules/no-constant-condition.js | text | 153+0 | 153+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["3b16c1b0b4107b62dec5f08817ad9a2e5d2ac4c15e12f2f88799019b36072e13","c15dd83af31e790325e3071ab020b3f7edf56e2e9f6317ebd1bcc9b4a6ec73f6","a65a68806fe59a1f0d0b5a2ed11b2a773cca7972817464d7247020a05d938d31","ee6491aaec64037142e514597da3c8e57ea292317e17f45258b58be5835b4a33"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__305/run-Ep5HgQ/terminal.json