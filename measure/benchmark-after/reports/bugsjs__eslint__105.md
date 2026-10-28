# lean report: af8f8b997a6823dea97eea73bb8b6b3f7adf3a8c → 385061a7bcd64fcc176a4bcecf4a845076db44e1

Identity: 6752542a4bc3d9c6c4c40b9178c2b2578371f6b990e744e8d6a7d5994ba76330; lean 1c55a2c94d2d07e20053c70d24c38d6221e2c819

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

5 changed function(s); 1 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-file.js | `configMissingError` (192-200) | **ASK** | refused:ts-strict | ASK |  | /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/be |
| lib/config/config-file.js | `loadConfigFile` (209-245) | **PASS-bounded** | refused:unsupported-member | PASS-bounded |  | property .filePath is not declared on Object |
| lib/config/config-file.js | `getEslintCoreConfigPath` (368-387) | **ASK** | refused:global-read | ASK |  | /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/be |
| lib/config/config-file.js | `applyExtends` (399-440) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 0: outcome; lib/config/config-file.js:434 |
| lib/config/config-file.js | `resolve` (497-520) | **WITNESS** | refused:ts-strict | WITNESS |  | input 0: outcome; lib/config/config-file.js:511 |

## What would make the asks provable

### lib/config/config-file.js · `configMissingError`

- line 195, `ts-strict`: TS2339: Property 'messageTemplate' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 196, `ts-strict`: TS2339: Property 'messageData' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.

### lib/config/config-file.js · `loadConfigFile`

- line 210, `unsupported-member`: property .filePath is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 210, `ts-strict`: TS2339: Property 'filePath' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 216, `unsupported-member`: property .configName is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 216, `ts-strict`: TS2339: Property 'configName' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 217, `unsupported-member`: property .configs is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 217, `ts-strict`: TS2339: Property 'configs' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 217, `unsupported-member`: property .configName is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 217, `ts-strict`: TS2339: Property 'configName' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.

### lib/config/config-file.js · `getEslintCoreConfigPath`

- line 375, `global-read`: `__dirname` cannot be resolved
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 375, `unresolved-module`: TS2304: Cannot find name '__dirname'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 383, `global-read`: `__dirname` cannot be resolved
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 383, `unresolved-module`: TS2304: Cannot find name '__dirname'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.

### lib/config/config-file.js · `applyExtends`

- line 400, `unsupported-member`: property .extends is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 400, `ts-strict`: TS2339: Property 'extends' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 403, `unsupported-member`: property .extends is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 403, `ts-strict`: TS2339: Property 'extends' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 404, `unsupported-member`: property .extends is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 404, `ts-strict`: TS2339: Property 'extends' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 411, `param-assign`: `parentPath` is a parameter of a callback or a local function; copy it to a local first
  do: [conditional: every use of the parameter after the copy, nested functions included, names the local, and the function does not read `arguments`] Copy the parameter to a local first (`let n = x`), then change the local. A parameter reassigned in the unit's own body is already read as that local; the copy is needed inside a callback, for a rest or generator parameter, for a parameter also changed in place, and when a closure reads it before a later write.
- line 411, `type-assertion`: `parentPath` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result

### lib/config/config-file.js · `resolve`

- line 510, `ts-strict`: TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.   Type 'undefined' is not assignable to type 'string'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 515, `ts-strict`: TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.   Type 'undefined' is not assignable to type 'string'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.