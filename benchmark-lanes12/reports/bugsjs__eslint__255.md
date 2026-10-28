# lean report: f9b7544a449cf7ce9748f9316b535f29352130c4 → 099af555a96744ea96267475ef5588e9803b2b08

Identity: 76ef4ef02fac1cd311e1b25ed60e4f61dd845fb9c065e7f1dec3dbfe0106b0b6; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s); 2 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `addDeclaredGlobals` (173-251) | **WITNESS** | refused:assign-target | WITNESS |  | input 1: trace; lib/linter.js:181 [migration] |

## What would make the asks provable

### lib/linter.js · `addDeclaredGlobals`

- line 179, `assign-target`: `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources into a new object
  do: [migration] As a statement on a plain record the function owns or was handed (`Object.assign(t, s)`), the target is rebuilt with the sources' declared fields and a parameter target becomes an output. Anywhere else, copy into a fresh object: `Object.assign({}, a, b)` or `{ ...a, ...b }`.
- line 181, `unsupported-member`: property .env is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 181, `ts-strict`: TS2339: Property 'env' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 181, `unsupported-member`: property .env is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 181, `ts-strict`: TS2339: Property 'env' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 183, `unsupported-member`: property .globals is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 183, `ts-strict`: TS2339: Property 'globals' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 186, `assign-target`: `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources into a new object
  do: [migration] As a statement on a plain record the function owns or was handed (`Object.assign(t, s)`), the target is rebuilt with the sources' declared fields and a parameter target becomes an output. Anywhere else, copy into a fresh object: `Object.assign({}, a, b)` or `{ ...a, ...b }`.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d65469d2da0de32e93f1e42d70dff97961b7c795462a64e2ac31c7e41b830ea3 | lib/linter.js | text | 181+1 | 181+0 | unit: addDeclaredGlobals | old:addDeclaredGlobals |
| ca4df9da20b329fc655687e4141635e3c2b5504d911f38750e845ca33842c190 | lib/linter.js | text | 181+0 | 181+1 | unit: addDeclaredGlobals | new:addDeclaredGlobals |

source: {"unit":["d65469d2da0de32e93f1e42d70dff97961b7c795462a64e2ac31c7e41b830ea3","ca4df9da20b329fc655687e4141635e3c2b5504d911f38750e845ca33842c190"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__255/run-HtGleM/terminal.json