# lean report: 927ca0dca7485b99ae8fd6a2b2b8f1f7156eeed0 → dc7fba8a77182d1d6084d0215013af7029fbec53

Identity: ebb84cf507b2a53e5417d9af4a7cb8a954884a5a7c936ca59e37adcc2a30c519; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit 8bf8889dca7a)` (1042-1042) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 193f8ec1c104)` (1043-1043) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit debed743a7a4)` (1044-1044) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 8bf8889dca7a77236bb2d7650efbae6d98fff6d2ece638682682298c0215033f | lib/rules/indent.js | text | 1041+0 | 1042+1 | unassigned: object-literal member |  |
| 193f8ec1c1048a15144cce58ed89bf4342b33c69a1f1e06d916b4f08ab51ff58 | lib/rules/indent.js | text | 1041+0 | 1043+1 | unassigned: whitespace |  |
| debed743a7a4d6a1728375af00451cca69d3fbaf0db9ee8dbe5ad5e86cb07185 | lib/rules/indent.js | text | 1041+0 | 1044+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["8bf8889dca7a77236bb2d7650efbae6d98fff6d2ece638682682298c0215033f","193f8ec1c1048a15144cce58ed89bf4342b33c69a1f1e06d916b4f08ab51ff58","debed743a7a4d6a1728375af00451cca69d3fbaf0db9ee8dbe5ad5e86cb07185"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__285/run-OZMcZK/terminal.json