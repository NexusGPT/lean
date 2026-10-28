# lean report: c3fb7e5adc1fd40e301ed1e25f0d5b5a393d0295 → 7446cb4af9d917d1801863116c65fb2fe2da0036

Identity: 4a452fb4bea11d70855f9a9ce745d64bda74dbb5b3656840930df7303a6fe19d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/view.js | `View` (52-95) | **PASS-bounded** | refused:var | PASS-bounded |  | `var` is outside the subset; use let or const |

## What would make the asks provable

### lib/view.js · `View`

- line 53, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 55, `unsupported-member`: property .defaultEngine on object is outside the subset
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 55, `ts-strict`: TS2339: Property 'defaultEngine' does not exist on type 'object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 56, `toplevel-effect`: move the effectful module initializer into a function
  do: [migration] Code at module level runs on import.
- line 58, `unsupported-member`: property .root on object is outside the subset
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 58, `ts-strict`: TS2339: Property 'root' does not exist on type 'object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 64, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 75, `unsupported-member`: property .engines on object is outside the subset
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 10 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 638fb1e2476bc55f9cbd16c7eea83d3b766f5900022af494c79fc2539aa5d539 | lib/view.js | text | 79+1 | 79+0 | unit: View | old:View |
| d1b5f67b3bc3791aa229b759576b764a5ce07cd540ffec9edd7f48474deae7ca | lib/view.js | text | 79+0 | 79+1 | unit: View | new:View |
| 37cb11c1bfd89760b817842fd814b8a89bd97ea78faf3e720a409cbc75f1af3e | lib/view.js | text | 79+0 | 80+1 | unit: View | new:View |
| 584419ad02231a510bc5ebc93aa70159b54a29da9e316d42c8a7feb5ffa20bc4 | lib/view.js | text | 79+0 | 81+1 | unit: View | new:View |
| d13d99e91951327610f855483bae300a8d686c93accfa711aaad400495c78519 | lib/view.js | text | 79+0 | 82+1 | unit: View | new:View |
| 1e92fdb31de78b84d82f00dbed68729773584fd29d553565f000acc5591410c3 | lib/view.js | text | 79+0 | 83+1 | unit: View | new:View |
| 4cb492230333ceb1864fa88ad5ff06a2fa1b5a687ae2ec181dff4ad4e81568bc | lib/view.js | text | 79+0 | 84+1 | unit: View | new:View |
| 34cf435270494a49e3be3b2a85591d0b8f3c83aba63e8ad9d44a91c50082741a | lib/view.js | text | 79+0 | 85+1 | unit: View | new:View |
| 97516ed4afd08d9b5594d3cc6d3662009ac4a00d5585a1e1ff6cfa474a393f27 | lib/view.js | text | 79+0 | 86+1 | unit: View | new:View |
| 0c9d2ec221d8b9399fbcd823a9b7aec88198277e5bce68d177b018e3acf9a751 | lib/view.js | text | 79+0 | 87+1 | unit: View | new:View |

source: {"unit":["638fb1e2476bc55f9cbd16c7eea83d3b766f5900022af494c79fc2539aa5d539","d1b5f67b3bc3791aa229b759576b764a5ce07cd540ffec9edd7f48474deae7ca","37cb11c1bfd89760b817842fd814b8a89bd97ea78faf3e720a409cbc75f1af3e","584419ad02231a510bc5ebc93aa70159b54a29da9e316d42c8a7feb5ffa20bc4","d13d99e91951327610f855483bae300a8d686c93accfa711aaad400495c78519","1e92fdb31de78b84d82f00dbed68729773584fd29d553565f000acc5591410c3","4cb492230333ceb1864fa88ad5ff06a2fa1b5a687ae2ec181dff4ad4e81568bc","34cf435270494a49e3be3b2a85591d0b8f3c83aba63e8ad9d44a91c50082741a","97516ed4afd08d9b5594d3cc6d3662009ac4a00d5585a1e1ff6cfa474a393f27","0c9d2ec221d8b9399fbcd823a9b7aec88198277e5bce68d177b018e3acf9a751"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__17/run-k3xkQz/terminal.json