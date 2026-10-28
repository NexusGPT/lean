# lean report: a61c35994ae4f37e6c71f73f592ba5ea22a9ead0 → 2f4b024fa821898b3f83c807253162524bbbf242

Identity: 87488fa2a8a8b86bd109af3661bafdb73012714ef234bc3da86b9f00012f9a64; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/code-path-analysis/code-path-analyzer.js | `processCodePathToExit` (421-520) | **WITNESS** | refused:type-assertion | WITNESS |  | input 4: trace; lib/code-path-analysis/code-path-analyzer.js:138 |
| lib/code-path-analysis/code-path-analyzer.js | `CodePathAnalyzer.leaveNode` (614-628) | **WITNESS** | checked | WITNESS |  | input 4: through processCodePathToExit (changed; its own row is WITNESS); this function's text is unchanged; lib/code-path-analysis/code-path-analyzer.js:138 |

## What would make the asks provable

### lib/code-path-analysis/code-path-analyzer.js · `processCodePathToExit`

- line 423, `type-assertion`: `codePath` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.