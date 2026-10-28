# lean report: d311a6229353e2b4e11c3339a6caed689c50e3e2 → 3624c0bfe724ee2db8688bdb1a5f3c81bc03970c

Identity: 3614bdb1540f3fa327f0aa91510caf0ccaf347ff793680d9d298051e089ec4c5; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-loop-func.js | `getTopLoopNode` (75-85) | **WITNESS** | refused:var | WITNESS |  | input 0: outcome; lib/rules/no-loop-func.js:84 |
| lib/rules/no-loop-func.js | `isSafe` (96-148) | **WITNESS** | checked | WITNESS |  | input 0: through getTopLoopNode (changed; its own row is WITNESS); this function's text is unchanged; lib/rules/no-loop-func.js:147 |

## What would make the asks provable

### lib/rules/no-loop-func.js · `getTopLoopNode`

- line 76, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 77, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.