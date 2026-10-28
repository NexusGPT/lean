# lean report: 03213bb2b76f53008fe104c473542e71066aafcc → 619fd45239ce489b64732ee62f38e222fd106da9

Identity: 8580c1e39f8a6f4954126bcf716532077eaa43e7d7fcc7334fef5d1f7510427f; lean 1c55a2c94d2d07e20053c70d24c38d6221e2c819

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

2 changed function(s): **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config.js | `Config.constructor` (57-120) | **WITNESS** | refused:unresolved-module | WITNESS |  | input 1: heap; lib/config.js:120 |
| lib/config/config-file.js | `loadObject` (567-569) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 0: outcome; lib/config/config-file.js:431 |

## What would make the asks provable

### lib/config.js · `Config.constructor`

- line 55, `unresolved-module`: TS2304: Cannot find name 'Linter'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 64, `unsupported-member`: property .ignore is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 64, `ts-strict`: TS2339: Property 'ignore' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 65, `unsupported-member`: property .ignorePath is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 65, `ts-strict`: TS2339: Property 'ignorePath' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 66, `unsupported-member`: property .parser is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 66, `ts-strict`: TS2339: Property 'parser' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 67, `unsupported-member`: property .parserOptions is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.

### lib/config/config-file.js · `loadObject`

- line 568, `unsupported-member`: property .extends is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 568, `ts-strict`: TS2339: Property 'extends' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 568, `unsupported-call`: applyExtends takes 4 arguments
  do: [migration] This method has no translation; see langs/ts/subset.md for the covered methods.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.