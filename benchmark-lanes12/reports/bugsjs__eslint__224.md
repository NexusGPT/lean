# lean report: bcea0f3015738f7f45ad10f6627bf13fbc6d4e2b → b39d6d84e7344aa45f0b8a225bc32958990ca84b

Identity: 89abbe7dcb4b54f3cd311d703edf8e50c48f14ee75d119fcaa1fddf05ddaeb93; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/operator-assignment.js | `isCommutativeOperatorWithShorthand` (19-21) | **PASS-bounded** | checked | PASS-bounded | ASK:unproved |  |
| lib/rules/operator-assignment.js | `isNonCommutativeOperatorWithShorthand` (30-32) | **WITNESS** | checked | WITNESS |  | input 2: outcome; lib/rules/operator-assignment.js:31 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 4 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| f99cd0f5d594de1435c1c0f27ad54f7890d7723f5f16ad0b14c68475b2100716 | lib/rules/operator-assignment.js | text | 20+1 | 20+0 | unit: isCommutativeOperatorWithShorthand | old:isCommutativeOperatorWithShorthand |
| 14ebbb6b70c91f65011b02e78c819697e12836cf7fd7e6611505539897d202b4 | lib/rules/operator-assignment.js | text | 20+0 | 20+1 | unit: isCommutativeOperatorWithShorthand | new:isCommutativeOperatorWithShorthand |
| 27f695085afd674f431a0c0bddf1014e03d4414537e7a71140c4ab945756c88c | lib/rules/operator-assignment.js | text | 31+1 | 31+0 | unit: isNonCommutativeOperatorWithShorthand | old:isNonCommutativeOperatorWithShorthand |
| 070aecf3e8381249658e4d3b3c00270117077923f6c0db9ddfb8674fac2969b7 | lib/rules/operator-assignment.js | text | 31+0 | 31+1 | unit: isNonCommutativeOperatorWithShorthand | new:isNonCommutativeOperatorWithShorthand |

source: {"unit":["f99cd0f5d594de1435c1c0f27ad54f7890d7723f5f16ad0b14c68475b2100716","14ebbb6b70c91f65011b02e78c819697e12836cf7fd7e6611505539897d202b4","27f695085afd674f431a0c0bddf1014e03d4414537e7a71140c4ab945756c88c","070aecf3e8381249658e4d3b3c00270117077923f6c0db9ddfb8674fac2969b7"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__224/run-WeZbsQ/terminal.json