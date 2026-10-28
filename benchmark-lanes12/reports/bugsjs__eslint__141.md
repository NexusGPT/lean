# lean report: 7f60186376d33d36176d7f205ead7a96d3b02d56 → d1253e50c78ccd2a10263af9e1a60b5397991a9c

Identity: 916eae71bb95221da9ac07a9525548efd10153f8c9826af6f8d74600b6d79935; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s); 2 unchanged caller(s) checked through lane B, 2 with a WITNESS through a changed callee: **0 in scope · 3 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/util/npm-util.js | `check` (70-96) | **WITNESS** | refused:var | WITNESS |  | input 3: outcome; lib/util/npm-util.js:83 |
| lib/util/npm-util.js | `(edit 65e1a1141bbb)` (14-14) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit 74cd3ba5b6dc)` (14-14) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit bf2f03a52d10)` (15-15) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
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
- line 83, `type-assertion`: `e` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 12 = 9 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 65e1a1141bbb049a7fd700c29a1c226280dd83c5345f998b7979fc8c18fd5844 | lib/util/npm-util.js | text | 14+1 | 14+0 | unassigned: module-level statement |  |
| 74cd3ba5b6dc4efe93fb83abef9453989d9ff490ac5f65d2310c2386f7cc505f | lib/util/npm-util.js | text | 14+0 | 14+1 | unassigned: module-level statement |  |
| bf2f03a52d10d4e439b72f89b19c4f8a2f3b4804f1aee1c839d8a5e551fef583 | lib/util/npm-util.js | text | 14+0 | 15+1 | unassigned: module-level statement |  |
| 3ef1e683c7c4cfca13ea1dab30093fbdc52a925846bb9742b3595e00d03134d8 | lib/util/npm-util.js | text | 71+0 | 73+1 | unit: check | new:check |
| aa0c09ecde7f352e155c5164003fb1719b80db3e7e04d23b6223c6b3e33b383a | lib/util/npm-util.js | text | 76+1 | 78+0 | unit: check | old:check |
| 53a117880dd3377e6ba2b35ecc423198b42a4085d1e50d6fb1bfc9ffeaca188f | lib/util/npm-util.js | text | 76+0 | 78+1 | unit: check | new:check |
| 25963f1ef323bbaeaf8d81f9102e344ef0d328df47a9fd472434e532f545e22c | lib/util/npm-util.js | text | 76+0 | 79+1 | unit: check | new:check |
| f5f0e7259d7b43286a8cfffd32ef8f7f81445d7e144fc4480b282ba95ddb55e1 | lib/util/npm-util.js | text | 76+0 | 80+1 | unit: check | new:check |
| d1fb51202a492f6f71814fb838b5f34010ab0dce8f8725779cd6b65e5a6818c0 | lib/util/npm-util.js | text | 76+0 | 81+1 | unit: check | new:check |
| e5afcd37d8e85d2eb0faf2870420ef8e0bff7e250ad285acd99e9cc07882769c | lib/util/npm-util.js | text | 76+0 | 82+1 | unit: check | new:check |
| 39131ef343cdf646267023172fcbdf0b3c70f607425b7379622330bd6602df76 | lib/util/npm-util.js | text | 76+0 | 83+1 | unit: check | new:check |
| 534d91d5a1daceb6c3108354539f2a8608991d802f3c28374602e875633ba71d | lib/util/npm-util.js | text | 76+0 | 84+1 | unit: check | new:check |

source: {"unit":["3ef1e683c7c4cfca13ea1dab30093fbdc52a925846bb9742b3595e00d03134d8","aa0c09ecde7f352e155c5164003fb1719b80db3e7e04d23b6223c6b3e33b383a","53a117880dd3377e6ba2b35ecc423198b42a4085d1e50d6fb1bfc9ffeaca188f","25963f1ef323bbaeaf8d81f9102e344ef0d328df47a9fd472434e532f545e22c","f5f0e7259d7b43286a8cfffd32ef8f7f81445d7e144fc4480b282ba95ddb55e1","d1fb51202a492f6f71814fb838b5f34010ab0dce8f8725779cd6b65e5a6818c0","e5afcd37d8e85d2eb0faf2870420ef8e0bff7e250ad285acd99e9cc07882769c","39131ef343cdf646267023172fcbdf0b3c70f607425b7379622330bd6602df76","534d91d5a1daceb6c3108354539f2a8608991d802f3c28374602e875633ba71d"],"artifact":[],"unassigned":["65e1a1141bbb049a7fd700c29a1c226280dd83c5345f998b7979fc8c18fd5844","74cd3ba5b6dc4efe93fb83abef9453989d9ff490ac5f65d2310c2386f7cc505f","bf2f03a52d10d4e439b72f89b19c4f8a2f3b4804f1aee1c839d8a5e551fef583"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__141/run-D14zAO/terminal.json