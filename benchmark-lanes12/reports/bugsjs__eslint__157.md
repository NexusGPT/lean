# lean report: c70b0eda8794e552bcbfccbc0d5f46dfb4ea7783 → 46f5f13fdea6c93826ead754d442fe6628490717

Identity: 48c0681657b19a8f2fb4c9b4e9472ab02c89024a17500e579536f5174b560275; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/testers/rule-tester.js | `RuleTester.run` (250-558) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2696: The 'Object' type is assignable to very few other types. Did you mean to use the ' |

## What would make the asks provable

### lib/testers/rule-tester.js · `RuleTester.run`

- line 184, `ts-strict`: TS2696: The 'Object' type is assignable to very few other types. Did you mean to use the 'any' type instead?   Property 'rules' is missing in type 'Object' but required in type '{ rules: {}; }'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 214, `ts-strict`: TS2662: Cannot find name 'describe'. Did you mean the static member 'RuleTester.describe'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 214, `ts-strict`: TS2662: Cannot find name 'describe'. Did you mean the static member 'RuleTester.describe'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 219, `ts-strict`: TS2323: Cannot redeclare exported variable '__computed'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 225, `ts-strict`: TS2662: Cannot find name 'it'. Did you mean the static member 'RuleTester.it'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 225, `ts-strict`: TS2662: Cannot find name 'it'. Did you mean the static member 'RuleTester.it'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 230, `ts-strict`: TS2323: Cannot redeclare exported variable '__computed'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 262, `dynamic-key`: an open key may select a method; call a method by its declared name, and index records of data fields
  do: [migration] Only array indices, string indices and declared keys are readable; a computed key needs a `Record<string, T>` type. An open key (a string, a number) on a plain record of data fields is read as an uninterpreted lookup; on a union, a class instance, a record with a method or a getter, or with a symbol or a key call, narrow the receiver, name the field, or bind the key first. In a literal whose type has declared keys, a computed key of literal type names its field and a union of literals is a case split on the key; a `string` key there needs a `Record<string, T>` type.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 8 = 8 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 54713329b1695460c5a32ad65c6cbd872f835d45fa7801fcca97fced53074803 | lib/testers/rule-tester.js | text | 307+1 | 307+0 | unit: RuleTester.run | old:RuleTester.run |
| 6bc76b7b5102417cf937047503ffc46d74c3c222a7148ec2306dc891e305c8e2 | lib/testers/rule-tester.js | text | 308+1 | 307+0 | unit: RuleTester.run | old:RuleTester.run |
| 0cdd76ceb286213099ea11e83e89679eb5596fe0928d59a72f74abddda7e0d62 | lib/testers/rule-tester.js | text | 309+1 | 307+0 | unit: RuleTester.run | old:RuleTester.run |
| aac74d9ce5703d07ee4470828113d29d7968ae844e6f01e6f98883cff06da5f5 | lib/testers/rule-tester.js | text | 310+1 | 307+0 | unit: RuleTester.run | old:RuleTester.run |
| 77ed0db6520bda543023308536ecb23da228d0b16e55601cf301e6e87d61ef25 | lib/testers/rule-tester.js | text | 311+1 | 307+0 | unit: RuleTester.run | old:RuleTester.run |
| ba7ae0bc590043ae7b9b745191f3be1a3377b744b9a2f474cc82dda6916ebb5c | lib/testers/rule-tester.js | text | 307+0 | 307+1 | unit: RuleTester.run | new:RuleTester.run |
| c6f92d72e099f96d237c39762ac717b829fa78cbbf044c90687755a0efb8ec09 | lib/testers/rule-tester.js | text | 307+0 | 308+1 | unit: RuleTester.run | new:RuleTester.run |
| 1eeb77bdbdbc2eb86fdfb889d5c6d283679a3ddf7ed252b0073e40eb31698b3f | lib/testers/rule-tester.js | text | 307+0 | 309+1 | unit: RuleTester.run | new:RuleTester.run |

source: {"unit":["54713329b1695460c5a32ad65c6cbd872f835d45fa7801fcca97fced53074803","6bc76b7b5102417cf937047503ffc46d74c3c222a7148ec2306dc891e305c8e2","0cdd76ceb286213099ea11e83e89679eb5596fe0928d59a72f74abddda7e0d62","aac74d9ce5703d07ee4470828113d29d7968ae844e6f01e6f98883cff06da5f5","77ed0db6520bda543023308536ecb23da228d0b16e55601cf301e6e87d61ef25","ba7ae0bc590043ae7b9b745191f3be1a3377b744b9a2f474cc82dda6916ebb5c","c6f92d72e099f96d237c39762ac717b829fa78cbbf044c90687755a0efb8ec09","1eeb77bdbdbc2eb86fdfb889d5c6d283679a3ddf7ed252b0073e40eb31698b3f"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__157/run-XOpRfU/terminal.json