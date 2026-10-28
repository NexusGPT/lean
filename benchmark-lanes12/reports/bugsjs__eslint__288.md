# lean report: 4448cec2b6c4334b570b7408e1d91399a273ae41 → cf3d53abaa4bbbe7ee422986ad7f47d4fdb0cba8

Identity: d89c46eca6a9b31a22f780ca2b7c6df1cd35b2c020db6b5a2a4a88b6c45a9401; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-unused-vars.js | `(edit ec4d5dc663d8)` (431-431) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-unused-vars.js | `(edit 3ce527e2878c)` (431-431) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-unused-vars.js | `(edit 0afa2147537f)` (436-436) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-unused-vars.js | `(edit a55b51689ff5)` (436-436) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| ec4d5dc663d83af32d166f664b4aa0089fbeab97db443f52b54d10694a967415 | lib/rules/no-unused-vars.js | text | 431+1 | 431+0 | unassigned: comment |  |
| 3ce527e2878c0d921669514ffceb0a81851befcd3bfe8adf7b7cee78df7f3149 | lib/rules/no-unused-vars.js | text | 431+0 | 431+1 | unassigned: comment |  |
| 0afa2147537ff2e6bf630be5dc10491be4057142b474964966eaaeec5abe347b | lib/rules/no-unused-vars.js | text | 436+1 | 436+0 | unassigned: object-literal member |  |
| a55b51689ff5066193ef642f2f629856939f7276bef8ac91e03f5f6b5ca4f8d6 | lib/rules/no-unused-vars.js | text | 436+0 | 436+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["ec4d5dc663d83af32d166f664b4aa0089fbeab97db443f52b54d10694a967415","3ce527e2878c0d921669514ffceb0a81851befcd3bfe8adf7b7cee78df7f3149","0afa2147537ff2e6bf630be5dc10491be4057142b474964966eaaeec5abe347b","a55b51689ff5066193ef642f2f629856939f7276bef8ac91e03f5f6b5ca4f8d6"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__288/run-nhqZpY/terminal.json