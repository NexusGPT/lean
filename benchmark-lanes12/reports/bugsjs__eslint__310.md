# lean report: b678535f26f6d75e980d23d4699d6c710d41b0cb → a40ae209a1211e47c9ce6317ffb11e15eafbbfe5

Identity: 4aa238ec2d608952df58bdaf27acf9c3f4a16ce4251bda5488fea05bd18638fa; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/cli.js | `quietFixPredicate` (38-40) | **ASK** | failed:loader | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/cli.js | `translateOptions` (48-69) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 1: outcome; lib/cli.js:49 |
| lib/cli.js | `(edit 4cf2af648ec7)` (31-31) | **ASK** | unassigned:comment |  |  | comment |
| lib/cli.js | `(edit 0d230635ea42)` (32-32) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli.js | `(edit 6357f28d7252)` (33-33) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli.js | `(edit ce42342af6f1)` (34-34) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli.js | `(edit 38fca14e4093)` (35-35) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli.js | `(edit 078fea1a2a61)` (36-36) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli.js | `(edit b7bcc683367c)` (37-37) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli.js | `(edit d20858750cbb)` (41-41) | **ASK** | unassigned:whitespace |  |  | whitespace |

## What would make the asks provable

### lib/cli.js · `translateOptions`

- line 50, `unsupported-member`: property .env is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 50, `ts-strict`: TS2339: Property 'env' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 51, `unsupported-member`: property .ext is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 51, `ts-strict`: TS2339: Property 'ext' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 52, `unsupported-member`: property .rule is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 52, `ts-strict`: TS2339: Property 'rule' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 53, `unsupported-member`: property .plugin is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 53, `ts-strict`: TS2339: Property 'plugin' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 13 = 5 unit + 0 artifact + 8 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 4cf2af648ec71e315db610c3344aa30d138eb6a165cef94cc051c5c84c1ab287 | lib/cli.js | text | 30+0 | 31+1 | unassigned: comment |  |
| 0d230635ea42c45514d5a14d387fc511b9299461e31f0fecf41ebcf2a48f1d3a | lib/cli.js | text | 30+0 | 32+1 | unassigned: module-level statement |  |
| 6357f28d72527b2db417eef7b6f161457f07b12d087c1d2334655d67cadaa776 | lib/cli.js | text | 30+0 | 33+1 | unassigned: module-level statement |  |
| ce42342af6f17ff7743139f4e16f1cbb30971702b0f6653f442729a3617481ed | lib/cli.js | text | 30+0 | 34+1 | unassigned: module-level statement |  |
| 38fca14e40939c0d520b97dbc1e54c1cc9761582f3caac6f01e93f2be0984a72 | lib/cli.js | text | 30+0 | 35+1 | unassigned: module-level statement |  |
| 078fea1a2a619e844b5bf4aec0e265056e6c73ae841160980ece0a9ebedd3cac | lib/cli.js | text | 30+0 | 36+1 | unassigned: module-level statement |  |
| b7bcc683367cb67044908725c39a6e36c778e4deca22e2e93cf5ed3f13a72b39 | lib/cli.js | text | 30+0 | 37+1 | unassigned: module-level statement |  |
| 36e6653354f1052f90811579a9b5d427db9763d2e3ef8bca1c30e3c57a3b5d83 | lib/cli.js | text | 30+0 | 38+1 | unit: quietFixPredicate | new:quietFixPredicate |
| f18e678c066a5b43592b4ee2b7ef4cb6c8b2baaa3074f9762e52ee1f54bb0181 | lib/cli.js | text | 30+0 | 39+1 | unit: quietFixPredicate | new:quietFixPredicate |
| c49befccdc74b44106a643851f8d4493f486373716d869f5d69c6d7e86922db1 | lib/cli.js | text | 30+0 | 40+1 | unit: quietFixPredicate | new:quietFixPredicate |
| d20858750cbb276d32915e4ef3647713fadff508b6595d37d044fd7db9384337 | lib/cli.js | text | 30+0 | 41+1 | unassigned: whitespace |  |
| b73f176a75bdeacb68248aaf59f13b2fdb48720285852b23842f9e3b42d682ee | lib/cli.js | text | 55+1 | 66+0 | unit: translateOptions | old:translateOptions |
| 377573fd63ba19fe1b91127b1a920b910199fc2c11d14aaddb476a855769bb97 | lib/cli.js | text | 55+0 | 66+1 | unit: translateOptions | new:translateOptions |

source: {"unit":["36e6653354f1052f90811579a9b5d427db9763d2e3ef8bca1c30e3c57a3b5d83","f18e678c066a5b43592b4ee2b7ef4cb6c8b2baaa3074f9762e52ee1f54bb0181","c49befccdc74b44106a643851f8d4493f486373716d869f5d69c6d7e86922db1","b73f176a75bdeacb68248aaf59f13b2fdb48720285852b23842f9e3b42d682ee","377573fd63ba19fe1b91127b1a920b910199fc2c11d14aaddb476a855769bb97"],"artifact":[],"unassigned":["4cf2af648ec71e315db610c3344aa30d138eb6a165cef94cc051c5c84c1ab287","0d230635ea42c45514d5a14d387fc511b9299461e31f0fecf41ebcf2a48f1d3a","6357f28d72527b2db417eef7b6f161457f07b12d087c1d2334655d67cadaa776","ce42342af6f17ff7743139f4e16f1cbb30971702b0f6653f442729a3617481ed","38fca14e40939c0d520b97dbc1e54c1cc9761582f3caac6f01e93f2be0984a72","078fea1a2a619e844b5bf4aec0e265056e6c73ae841160980ece0a9ebedd3cac","b7bcc683367cb67044908725c39a6e36c778e4deca22e2e93cf5ed3f13a72b39","d20858750cbb276d32915e4ef3647713fadff508b6595d37d044fd7db9384337"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__310/run-Iq5fBT/terminal.json