# lean report: f76403b717dc59d0fea41e5da68bd50d95b42fdf → fb63378293c82c8842c8af250365cb26e201c8e8

Identity: bd7520134bf27ae2ca0390d060c57d1521d8138194de39583e4b743c06a9c3a1; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/response.js | `sendfile` (908-990) | **PASS-bounded** | refused:var | PASS-bounded |  | `var` is outside the subset; use let or const |

## What would make the asks provable

### lib/response.js · `sendfile`

- line 909, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 910, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 915, `closure-mutation`: `done` is declared outside this callback; a callback cannot change it
  do: [migration] A callback handed away (an outside call, a timer, an event) may compute, not assign an outer variable; use `for (const x of xs)` and let the state come out of the loop. A synchronous array-method callback (map, filter, reduce, some, every, find, findIndex, flatMap, forEach) is a loop body and may write the enclosing function's locals, arrays and records; so may a local procedure (a const arrow or nested function only ever called as a statement) whose parameters and locals shadow none of the function's own names.
- line 917, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 918, `ts-strict`: TS2339: Property 'code' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 926, `closure-mutation`: `done` is declared outside this callback; a callback cannot change it
  do: [migration] A callback handed away (an outside call, a timer, an event) may compute, not assign an outer variable; use `for (const x of xs)` and let the state come out of the loop. A synchronous array-method callback (map, filter, reduce, some, every, find, findIndex, flatMap, forEach) is a loop body and may write the enclosing function's locals, arrays and records; so may a local procedure (a const arrow or nested function only ever called as a statement) whose parameters and locals shadow none of the function's own names.
- line 933, `closure-mutation`: `done` is declared outside this callback; a callback cannot change it
  do: [migration] A callback handed away (an outside call, a timer, an event) may compute, not assign an outer variable; use `for (const x of xs)` and let the state come out of the loop. A synchronous array-method callback (map, filter, reduce, some, every, find, findIndex, flatMap, forEach) is a loop body and may write the enclosing function's locals, arrays and records; so may a local procedure (a const arrow or nested function only ever called as a statement) whose parameters and locals shadow none of the function's own names.
- line 939, `global-read`: `onFinished` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 23 = 23 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 009e16793e0fb1e6dfcc4ca0f0b3ad6dddad9bfc946d5487f13631084bd6cb57 | lib/response.js | text | 909+0 | 910+1 | unit: sendfile | new:sendfile |
| f11dd6565cfbaeb67db0e5bc4bade376b1bdd3a2d75fdba0f7651d426d9d444e | lib/response.js | text | 922+0 | 924+1 | unit: sendfile | new:sendfile |
| ac7081f9866b692fb3e8f237eebb800c14d6480a23155ca92e90ace10615e089 | lib/response.js | text | 934+0 | 937+1 | unit: sendfile | new:sendfile |
| 5a646be6d1ade660a6ddf0a267afb1a694224cb8a0a6401a6b5adff54d910fbb | lib/response.js | text | 934+0 | 938+1 | unit: sendfile | new:sendfile |
| d7da8d91bc2ccc2209c7159b41ab1217136464405535a5a81f3fa423b9ea7dd0 | lib/response.js | text | 934+0 | 939+1 | unit: sendfile | new:sendfile |
| ac17fea2fbb13a11de16597aeab5a4cae06d73f28cf5950105d8ea73bc0f51c8 | lib/response.js | text | 934+0 | 940+1 | unit: sendfile | new:sendfile |
| a4b75ba4617120c8e3b8516a572692cda32e6e6043a055239cd174d5b4803baf | lib/response.js | text | 934+0 | 941+1 | unit: sendfile | new:sendfile |
| 0058dc9e4200aa1400275f443de10807917b403e4c49a6fdab54cd524259791b | lib/response.js | text | 943+0 | 951+1 | unit: sendfile | new:sendfile |
| 82db2824c652ac792949e5b06da50284b9f1bc8bb161ce8910aa91306202a053 | lib/response.js | text | 943+0 | 952+1 | unit: sendfile | new:sendfile |
| a142f6694b09ae1a87a43c1e0ac2b70fee6fa296269337d4d3ed0f0357bd3f6d | lib/response.js | text | 943+0 | 953+1 | unit: sendfile | new:sendfile |
| 32835e87ff2223bf54fe193421f262ce4f105bc01ae143fbf4b62fb9f16f5e7d | lib/response.js | text | 943+0 | 954+1 | unit: sendfile | new:sendfile |
| 55c034f40e38781350e46e2351d1dcba964982ef93288e2e728d3681396d9be2 | lib/response.js | text | 943+0 | 955+1 | unit: sendfile | new:sendfile |
| 89c1fdfc3707e052ca127997933dad736cab2b30d2ddb19a3d32f21d3f5bad3f | lib/response.js | text | 950+0 | 963+1 | unit: sendfile | new:sendfile |
| 187300aa25355a5120a99a8eeb2c89e8666287a8795a8f3d0569030cf0f6d903 | lib/response.js | text | 950+0 | 964+1 | unit: sendfile | new:sendfile |
| 6f8f77e5ffc25499840833f38fcc29f2c0ffc5c413e8feb404bf841038623e43 | lib/response.js | text | 950+0 | 965+1 | unit: sendfile | new:sendfile |
| be88befc0d480b6ae42a5ffb0c6b8ced1838f3f833cd27e0948f043997c9b28c | lib/response.js | text | 950+0 | 966+1 | unit: sendfile | new:sendfile |
| fd1dda8959949912d668b94dd3546e9b0854118a8b0096d16d2dd093b79710bd | lib/response.js | text | 950+0 | 967+1 | unit: sendfile | new:sendfile |
| a2f227e76759ac07d7532a2c3b3597b3df521a13550842efbf1f981fdeb95c8c | lib/response.js | text | 950+0 | 968+1 | unit: sendfile | new:sendfile |
| 2dc4711d4930cff80dbc4139e16049aa641e06a96c111e024006ca7f2fe8545b | lib/response.js | text | 953+1 | 971+0 | unit: sendfile | old:sendfile |
| 2a4f5b9855da05adc7eae66d1381eb814ae69282baba285d02ca600fa7e7b38c | lib/response.js | text | 954+1 | 971+0 | unit: sendfile | old:sendfile |
| 0c867461797198eadca5486ca8f8ec22516143ebf385d023175899d3ac885a25 | lib/response.js | text | 953+0 | 971+1 | unit: sendfile | new:sendfile |
| fcde99beb95c92a656989449806237f11113383e8b58e590f156e11d3b84287c | lib/response.js | text | 953+0 | 972+1 | unit: sendfile | new:sendfile |
| ae3655c633c2c7bcc314fc70eabba0ef19956d7ecba47428ee2040b7ada4984d | lib/response.js | text | 953+0 | 973+1 | unit: sendfile | new:sendfile |

source: {"unit":["009e16793e0fb1e6dfcc4ca0f0b3ad6dddad9bfc946d5487f13631084bd6cb57","f11dd6565cfbaeb67db0e5bc4bade376b1bdd3a2d75fdba0f7651d426d9d444e","ac7081f9866b692fb3e8f237eebb800c14d6480a23155ca92e90ace10615e089","5a646be6d1ade660a6ddf0a267afb1a694224cb8a0a6401a6b5adff54d910fbb","d7da8d91bc2ccc2209c7159b41ab1217136464405535a5a81f3fa423b9ea7dd0","ac17fea2fbb13a11de16597aeab5a4cae06d73f28cf5950105d8ea73bc0f51c8","a4b75ba4617120c8e3b8516a572692cda32e6e6043a055239cd174d5b4803baf","0058dc9e4200aa1400275f443de10807917b403e4c49a6fdab54cd524259791b","82db2824c652ac792949e5b06da50284b9f1bc8bb161ce8910aa91306202a053","a142f6694b09ae1a87a43c1e0ac2b70fee6fa296269337d4d3ed0f0357bd3f6d","32835e87ff2223bf54fe193421f262ce4f105bc01ae143fbf4b62fb9f16f5e7d","55c034f40e38781350e46e2351d1dcba964982ef93288e2e728d3681396d9be2","89c1fdfc3707e052ca127997933dad736cab2b30d2ddb19a3d32f21d3f5bad3f","187300aa25355a5120a99a8eeb2c89e8666287a8795a8f3d0569030cf0f6d903","6f8f77e5ffc25499840833f38fcc29f2c0ffc5c413e8feb404bf841038623e43","be88befc0d480b6ae42a5ffb0c6b8ced1838f3f833cd27e0948f043997c9b28c","fd1dda8959949912d668b94dd3546e9b0854118a8b0096d16d2dd093b79710bd","a2f227e76759ac07d7532a2c3b3597b3df521a13550842efbf1f981fdeb95c8c","2dc4711d4930cff80dbc4139e16049aa641e06a96c111e024006ca7f2fe8545b","2a4f5b9855da05adc7eae66d1381eb814ae69282baba285d02ca600fa7e7b38c","0c867461797198eadca5486ca8f8ec22516143ebf385d023175899d3ac885a25","fcde99beb95c92a656989449806237f11113383e8b58e590f156e11d3b84287c","ae3655c633c2c7bcc314fc70eabba0ef19956d7ecba47428ee2040b7ada4984d"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__7/run-8d3KU8/terminal.json