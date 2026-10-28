# lean report: 1d0d61d81959d9897a71f5196c9d4804f0437d85 → 7334ad0a2cb7cb74cda291cd283ede671030f554

Identity: 265de906f43e4419e09ca3f94965b2f03e3e097b7f5f6e5dfa5c1af8d9cc7ec6; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-const.js | `getIdentifierIfShouldBeConst` (89-147) | **WITNESS** | checked | WITNESS |  | input 1: trace; lib/rules/prefer-const.js:101 |
| lib/rules/prefer-const.js | `groupByDestructuring` (186-220) | **WITNESS** | checked | WITNESS |  | input 1: through getIdentifierIfShouldBeConst (changed; its own row is WITNESS); this function's text is unchanged; lib/rules/prefer-const.js:101 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.