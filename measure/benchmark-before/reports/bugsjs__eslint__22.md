# lean report: d727f17f4efc888ed0e59259a4e4cac01a42f0d9 → 0341cb87f3e7f76bc9514c7eb1ce0b3fac150bf1

Identity: 0d066b0fe8e3e74b37f9a094b8ef418d7ee83c356030b423d03173cdb845d991; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 1 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-validator.js | `validateRuleOptions` (65-120) | **PASS-bounded** | refused:var | PASS-bounded |  | `var` is outside the subset; use let or const |

## What would make the asks provable

### lib/config/config-validator.js · `validateRuleOptions`

- line 66, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 66, `toplevel-effect`: move the effectful module initializer into a function
  do: [migration] Code at module level runs on import.
- line 74, `global-read`: `schemaValidator` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 75, `index-assign`: write a record field by name, or use a local Record<string, T> dictionary
  do: [migration] Only a local array changes by index. Return a new array otherwise.
- line 105, `global-read`: `util` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 111, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.