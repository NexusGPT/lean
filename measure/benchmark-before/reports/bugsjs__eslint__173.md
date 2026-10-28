# lean report: 475d967864210587f3e778662280bdf801062a20 → abec8af4ac3f91b9e4511e843b11f4bcf9e30486

Identity: 32978eb5821cc23968b322f007f13759679e5464dca9a3810b24ad14ae1c0c56; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-invalid-this.js | `hasJSDocThisTag` (37-50) | **WITNESS** | refused:var | WITNESS |  | input 0: trace; lib/rules/no-invalid-this.js:38 [conditional] |
| lib/rules/no-invalid-this.js | `hasValidThis` (149-252) | **WITNESS** | checked | WITNESS |  | input 5: through hasJSDocThisTag (changed; its own row is WITNESS); this function's text is unchanged; lib/rules/no-invalid-this.js:38 |

## What would make the asks provable

### lib/rules/no-invalid-this.js · `hasJSDocThisTag`

- line 38, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 38, `global-read`: `astUtils` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 47, `global-read`: `astUtils` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 47, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.