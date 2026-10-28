# lean report: c5b405280409698d14b62cbf3c87b7cf6cf71391 → de6d46296426a9181cdcbbe5398099fb5f48ae11

Identity: c78998496ef5919c40664edcddced749270d37b753d22eece7e176f3f41c19c0; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 2 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `prepareConfig` (456-506) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2339: Property 'globals' does not exist on type 'Object'. |

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