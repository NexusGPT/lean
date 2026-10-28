# lean report: c70b0eda8794e552bcbfccbc0d5f46dfb4ea7783 → 46f5f13fdea6c93826ead754d442fe6628490717

Identity: e4d75f713087e9bf39f0856ad451e1c0a48d396470049c84afe9948a0cfe6100; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

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