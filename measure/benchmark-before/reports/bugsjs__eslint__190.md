# lean report: 2f36f92e1c8d7000252f905c0a90764ff06e7249 → e100017fef43bc4fa134dc259bd9e5c01f986415

Identity: a1a614c445b3bb1f2c9aba61baabf7020b5d5a0a1fc861e996b4b679ba8b4139; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 1 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/init-declarations.js | `isInitialized` (18-26) | **ASK** | refused:var | ASK |  | /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/be |

## What would make the asks provable

### lib/rules/init-declarations.js · `isInitialized`

- line 19, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 20, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.