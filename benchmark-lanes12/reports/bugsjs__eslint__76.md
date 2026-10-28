# lean report: 57f16760058ae8b13f4a8bea126a51c82761f2d0 → a774d078246d061cb9e2187ce77a3b5b495699bb

Identity: 0b4f89283900028d376a1d01dde2cd8f3defed581e8f50f9b6dd850828721851; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/spaced-comment.js | `(edit 2f65e1393d5b)` (345-345) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/spaced-comment.js | `(edit 0a666e02e413)` (345-345) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/spaced-comment.js | `(edit a218f141a52a)` (357-357) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/spaced-comment.js | `(edit e315ea370c7d)` (357-357) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2f65e1393d5b511354e4354c16c516f2a7d87dec495ff53b0b950191c13d80ab | lib/rules/spaced-comment.js | text | 345+1 | 345+0 | unassigned: object-literal member |  |
| 0a666e02e413ee94b74def6f7bf3b2abb29e0ea4b7277567ba1073ac376681ae | lib/rules/spaced-comment.js | text | 345+0 | 345+1 | unassigned: object-literal member |  |
| a218f141a52a6286fac90c26c1242794b4c697baf5b24e38d37752b673aece53 | lib/rules/spaced-comment.js | text | 357+1 | 357+0 | unassigned: object-literal member |  |
| e315ea370c7d1faa21b63fdbd401f6136a5ac8d4de7f4552eb0813d8c639e31d | lib/rules/spaced-comment.js | text | 357+0 | 357+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["2f65e1393d5b511354e4354c16c516f2a7d87dec495ff53b0b950191c13d80ab","0a666e02e413ee94b74def6f7bf3b2abb29e0ea4b7277567ba1073ac376681ae","a218f141a52a6286fac90c26c1242794b4c697baf5b24e38d37752b673aece53","e315ea370c7d1faa21b63fdbd401f6136a5ac8d4de7f4552eb0813d8c639e31d"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__76/run-OXgazm/terminal.json