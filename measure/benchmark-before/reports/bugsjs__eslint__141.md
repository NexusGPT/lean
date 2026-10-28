# lean report: 7f60186376d33d36176d7f205ead7a96d3b02d56 → d1253e50c78ccd2a10263af9e1a60b5397991a9c

Identity: e58334129c2e443f4a2eaf683a6d10579c0c2df7d03fffff4c78f76f08c20424; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 2 unchanged caller(s) checked through lane B, 2 with a WITNESS through a changed callee: **0 in scope · 3 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/util/npm-util.js | `check` (70-96) | **WITNESS** | refused:var | WITNESS |  | input 3: outcome; lib/util/npm-util.js:83 |
| lib/util/npm-util.js | `checkDeps` (109-111) | **WITNESS** | checked | WITNESS |  | input 3: through check (changed; its own row is WITNESS); this function's text is unchanged; lib/util/npm-util.js:83 |
| lib/util/npm-util.js | `checkDevDeps` (123-125) | **WITNESS** | checked | WITNESS |  | input 3: through check (changed; its own row is WITNESS); this function's text is unchanged; lib/util/npm-util.js:83 |

## What would make the asks provable

### lib/util/npm-util.js · `check`

- line 71, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 72, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 72, `unsupported-member`: property .startDir is not declared on { dependencies: boolean; devDependencies: boolean; startdir: boolean; }
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 72, `ts-strict`: TS2551: Property 'startDir' does not exist on type '{ dependencies: boolean; devDependencies: boolean; startdir: boolean; }'. Did you mean 'startdir'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 72, `unsupported-call`: findPackageJson takes 1 arguments
  do: [migration] This method has no translation; see langs/ts/subset.md for the covered methods.
- line 73, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 80, `global-read`: `fs` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 82, `global-read`: `log` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.