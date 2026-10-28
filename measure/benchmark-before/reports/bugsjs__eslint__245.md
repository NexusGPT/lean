# lean report: ee3bcea71fe8f826e7c0494f5388ad80542fbc35 → 3bba76497c18439184edf18a96654a08b3664ed2

Identity: b24961464bd20a4d8272fbdb3c5fe655e7cde899c4cc327de5dda4bc6f3402d6; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

8 changed function(s); 5 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 2 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-file.js | `normalizePackageName` (416-451) | **PASS-bounded** | checked | PASS-bounded | ASK:unproved |  |
| lib/eslint.js | `parseJsonConfig` (88-128) | **ASK** | refused:type-assertion | ASK |  | parent: unit parseJsonConfig not exported |
| lib/rules/no-empty-character-class.js | `(file)` (1-1) | **** | skipped:not-typescript |  |  | not-typescript |
| lib/rules/no-lonely-if.js | `(file)` (1-1) | **** | skipped:not-typescript |  |  | not-typescript |
| lib/rules/no-useless-escape.js | `union` (18-23) | **ASK** | refused:unsupported-call | ASK |  | /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/be |
| lib/rules/no-useless-escape.js | `parseRegExp` (92-115) | **ASK** | refused:callback-form | ASK |  | /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/be |
| lib/util/glob-util.js | `processPath` (42-75) | **WITNESS** | refused:unresolved-module | WITNESS |  | input 0: outcome; lib/util/glob-util.js:65 [conditional] |
| lib/util/glob-util.js | `listFilesToProcess` (106-180) | **PASS-bounded** | refused:unresolved-module | PASS-bounded |  | TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try  |

## What would make the asks provable

### lib/eslint.js · `parseJsonConfig`

- line 99, `type-assertion`: `items` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result
- line 121, `unsupported-member`: property .start is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 121, `ts-strict`: TS2339: Property 'start' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 122, `unsupported-member`: property .start is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 122, `ts-strict`: TS2339: Property 'start' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.

### lib/rules/no-useless-escape.js · `union`

- line 19, `unsupported-call`: new Set(...) reads an array, a Map, a Set or one of their iterators; build the entries as an array first
  do: [migration] This method has no translation; see langs/ts/subset.md for the covered methods.

### lib/rules/no-useless-escape.js · `parseRegExp`

- line 95, `callback-form`: an effectful array callback takes the element (and an index), or the accumulator and the element; an extra parameter is outside the subset
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.

### lib/util/glob-util.js · `processPath`

- line 43, `unresolved-module`: TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 46, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 65, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.

### lib/util/glob-util.js · `listFilesToProcess`

- line 111, `unresolved-module`: TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 127, `ts-strict`: TS18048: 'options' is possibly 'undefined'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 131, `ts-strict`: TS18048: 'options' is possibly 'undefined'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 145, `dynamic-key`: use a finite union of declared string keys, or a Record<string, T> dictionary
  do: [migration] Only array indices, string indices and declared keys are readable; a computed key needs a `Record<string, T>` type. An open key (a string, a number) on a plain record of data fields is read as an uninterpreted lookup; on a union, a class instance, a record with a method or a getter, or with a symbol or a key call, narrow the receiver, name the field, or bind the key first. In a literal whose type has declared keys, a computed key of literal type names its field and a union of literals is a case split on the key; a `string` key there needs a `Record<string, T>` type.
- line 148, `param-mutation`: push on `files`, which is not a local array
  do: [migration] This changes what the caller handed in through an alias or a callback. Change it through the parameter itself, or return a new value: `[...xs, v]`, `{ ...r, f: v }`. An array kept in a Map the function builds itself (`const m = new Map<K, T[]>()`, filled with array literals) takes `m.get(k)?.push(x)` while no other name holds its arrays.
- line 149, `index-assign`: write a record field by name, or use a local Record<string, T> dictionary
  do: [migration] Only a local array changes by index. Return a new array otherwise.
- line 153, `foreach`: forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the loop, or pass an arrow with one parameter
  do: [migration] Write `for (const x of xs) { ... }`; a loop may update a local, a callback may not.
- line 165, `ts-strict`: TS2339: Property 'dotfiles' does not exist on type '{ cwd?: string | undefined; ignore?: boolean | undefined; ignorePath?: string | undefined; ignorePattern?: string | undefined; }'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.