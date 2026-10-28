# lean report: c5b405280409698d14b62cbf3c87b7cf6cf71391 → de6d46296426a9181cdcbbe5398099fb5f48ae11

Identity: 99d0b0f9f9c04c71b262dbd273cda21417df83667983e7c6e5c38c7a7ee4efbc; lean 815fc01fec5f51af99003faa686f25330e7c33ad

7 changed function(s); 2 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `prepareConfig` (456-506) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2339: Property 'globals' does not exist on type 'Object'. |
| conf/default-config-options.js | `(edit 438b4f02d7f3)` (28-28) | **ASK** | artifact:config |  |  | config |
| conf/default-config-options.js | `(edit 1bb094898158)` (29-29) | **ASK** | artifact:config |  |  | config |
| conf/default-config-options.js | `(edit e8739b341e3c)` (30-30) | **ASK** | artifact:config |  |  | config |
| conf/default-config-options.js | `(edit 4309a4d9a805)` (31-31) | **ASK** | artifact:config |  |  | config |
| conf/default-config-options.js | `(edit c14205faf9b0)` (32-32) | **ASK** | artifact:config |  |  | config |
| conf/default-config-options.js | `(edit 39b802eb7dfb)` (28-28) | **ASK** | artifact:config |  |  | config |

## What would make the asks provable

### lib/linter.js · `prepareConfig`

- line 457, `ts-strict`: TS2339: Property 'globals' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 457, `unsupported-member`: property .globals is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 461, `unsupported-member`: property .rules is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 461, `ts-strict`: TS2339: Property 'rules' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 462, `unsupported-member`: property .rules is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 462, `ts-strict`: TS2339: Property 'rules' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 463, `unsupported-member`: property .rules is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 463, `ts-strict`: TS2339: Property 'rules' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 4 unit + 6 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 438b4f02d7f36306da4a94162a3fd9579879f61b1bfd2beaff658940f4603e1f | conf/default-config-options.js | text | 28+1 | 28+0 | artifact: config |  |
| 1bb0948981584553c931ab3a3a11d733753996c81e227f4d43cbd66fd8530575 | conf/default-config-options.js | text | 29+1 | 28+0 | artifact: config |  |
| e8739b341e3cab0080b4f22b50e22dd47276d0f2b083b0535628e3e5f965ce30 | conf/default-config-options.js | text | 30+1 | 28+0 | artifact: config |  |
| 4309a4d9a80518583e72b15896e8341662db08f9eab1f5a6e84dabe786605ac7 | conf/default-config-options.js | text | 31+1 | 28+0 | artifact: config |  |
| c14205faf9b0d006b0119ea011e2e61e93ffb7e4b7adbebecb10df98efd42d4a | conf/default-config-options.js | text | 32+1 | 28+0 | artifact: config |  |
| 39b802eb7dfb889bb43160da7323cb823c951913a9c13138cd628db601efa714 | conf/default-config-options.js | text | 28+0 | 28+1 | artifact: config |  |
| d068df5989c429e10d82323d6f162761fc8e8f54f8f634f4737cb3755f0c0399 | lib/linter.js | text | 458+1 | 458+0 | unit: prepareConfig | old:prepareConfig |
| f9fa019b4f9ecf55582fb7dc7477ca34f58d2727ef39c778ce8c5a50c6442f9d | lib/linter.js | text | 459+1 | 458+0 | unit: prepareConfig | old:prepareConfig |
| 27bda34f413472d590637f9629c73fc8e0e57f13d0e2cc9eb52d35f1422de1aa | lib/linter.js | text | 458+0 | 458+1 | unit: prepareConfig | new:prepareConfig |
| 018a0fc5eb62e93d893fe9c24e674273c0ec38f54ea9dd2f20dd59fac1a81ae0 | lib/linter.js | text | 458+0 | 459+1 | unit: prepareConfig | new:prepareConfig |

config: {"unit":[],"artifact":["438b4f02d7f36306da4a94162a3fd9579879f61b1bfd2beaff658940f4603e1f","1bb0948981584553c931ab3a3a11d733753996c81e227f4d43cbd66fd8530575","e8739b341e3cab0080b4f22b50e22dd47276d0f2b083b0535628e3e5f965ce30","4309a4d9a80518583e72b15896e8341662db08f9eab1f5a6e84dabe786605ac7","c14205faf9b0d006b0119ea011e2e61e93ffb7e4b7adbebecb10df98efd42d4a","39b802eb7dfb889bb43160da7323cb823c951913a9c13138cd628db601efa714"],"unassigned":[]}

source: {"unit":["d068df5989c429e10d82323d6f162761fc8e8f54f8f634f4737cb3755f0c0399","f9fa019b4f9ecf55582fb7dc7477ca34f58d2727ef39c778ce8c5a50c6442f9d","27bda34f413472d590637f9629c73fc8e0e57f13d0e2cc9eb52d35f1422de1aa","018a0fc5eb62e93d893fe9c24e674273c0ec38f54ea9dd2f20dd59fac1a81ae0"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__145/run-wx5aYH/terminal.json