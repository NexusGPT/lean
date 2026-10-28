# lean report: ea1b15d3f996f10b63fcaec2efb44efdb7cda3a0 → 52badc0bbbbb55896d4153af53d37d10e64e6340

Identity: 5fe0e2e66ca0ead9dd0110e3617867fe6a15c511e9f9ae6a830ec5d08e578ccb; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `OffsetStorage.getDesiredIndent` (415-456) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2531: Object is possibly 'null'. |

## What would make the asks provable

### lib/rules/indent.js · `OffsetStorage.getDesiredIndent`

- line 254, `ts-strict`: TS2531: Object is possibly 'null'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 261, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 262, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 329, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 330, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 335, `ts-strict`: TS2554: Expected 4 arguments, but got 3.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 359, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 383, `ts-strict`: TS2531: Object is possibly 'null'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.