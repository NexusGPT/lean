# lean report: d311a6229353e2b4e11c3339a6caed689c50e3e2 → 3624c0bfe724ee2db8688bdb1a5f3c81bc03970c

Identity: 623caad018178f060545f78849e9b164a24a8d5a2bf7a744c02399a45024def8; lean 815fc01fec5f51af99003faa686f25330e7c33ad

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

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| da87f50959393c3c2940d09157d38c0e5b3762e859e68ad3e35dad19ed42ffc9 | lib/rules/no-loop-func.js | text | 76+1 | 76+0 | unit: getTopLoopNode | old:getTopLoopNode |
| a008515806a96c4adb793f3eb6099a448aaa95a2cbd5fd1aa6bef94bc447c056 | lib/rules/no-loop-func.js | text | 76+0 | 76+1 | unit: getTopLoopNode | new:getTopLoopNode |

source: {"unit":["da87f50959393c3c2940d09157d38c0e5b3762e859e68ad3e35dad19ed42ffc9","a008515806a96c4adb793f3eb6099a448aaa95a2cbd5fd1aa6bef94bc447c056"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__116/run-c8ke6v/terminal.json