# lean report: 6f9e15514e7a6b880b7c735ac9e8b43aed3cc67e → c3a8bec975430719a24df1e31bb93ef4c62d1e58

Identity: ef5802d9ea921613e033dc07ff22c8980485d6eb70356c61f4be12719847dc67; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/object-curly-newline.js | `areLineBreaksRequired` (111-129) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 4: outcome; lib/rules/object-curly-newline.js:120 |

## What would make the asks provable

### lib/rules/object-curly-newline.js · `areLineBreaksRequired`

- line 123, `unsupported-member`: property .minProperties is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 123, `ts-strict`: TS2339: Property 'minProperties' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 125, `unsupported-member`: property .multiline is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 125, `ts-strict`: TS2339: Property 'multiline' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.