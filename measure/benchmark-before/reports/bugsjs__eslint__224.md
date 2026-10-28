# lean report: bcea0f3015738f7f45ad10f6627bf13fbc6d4e2b → b39d6d84e7344aa45f0b8a225bc32958990ca84b

Identity: 54e0ba64a948aca52983bf758cf2e25222108822fe6ac6733ab3417010eab29c; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

2 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/operator-assignment.js | `isCommutativeOperatorWithShorthand` (19-21) | **PASS-bounded** | checked | PASS-bounded | ASK:unproved |  |
| lib/rules/operator-assignment.js | `isNonCommutativeOperatorWithShorthand` (30-32) | **WITNESS** | checked | WITNESS |  | input 2: outcome; lib/rules/operator-assignment.js:31 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.