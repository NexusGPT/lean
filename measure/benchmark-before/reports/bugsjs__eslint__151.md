# lean report: fea8fe6d25365d0e5dedbd503e8bbba5c4258f83 → 6cef6c1aa530a3cebf480ddcafb5d8f1aa0c15fc

Identity: 1d217ca7dd41af37ee35084fa8ef0b08a18080ab6a6bf209479c201530cf4b53; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/ignored-paths.js | `IgnoredPaths` (75-165) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2552: Cannot find name 'array'. Did you mean 'Array'? |

## What would make the asks provable

### lib/ignored-paths.js · `IgnoredPaths`

- line 83, `ts-strict`: TS2552: Cannot find name 'array'. Did you mean 'Array'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 86, `unsupported-call`: method .addPattern() on object is outside the subset
  do: [migration] This method has no translation; see langs/ts/subset.md for the covered methods.
- line 86, `ts-strict`: TS2339: Property 'addPattern' does not exist on type 'object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 93, `ts-strict`: TS2552: Cannot find name 'array'. Did you mean 'Array'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 96, `unsupported-member`: property .ignoreFiles on object is outside the subset
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 96, `ts-strict`: TS2339: Property 'ignoreFiles' does not exist on type 'object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 97, `unsupported-call`: method .add() on object is outside the subset
  do: [migration] This method has no translation; see langs/ts/subset.md for the covered methods.
- line 97, `ts-strict`: TS2339: Property 'add' does not exist on type 'object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.