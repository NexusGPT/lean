# lean report: 6f05546cb271553b9c58151738e47bf566b75bc9 → 9cf1e0b113db558d64fbb51b405010ae8210218e

Identity: 2e8e8cea8d81a792b6ec111422149ba3969b22fc109128079559cc4aefeb8e51; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/ignored-paths.js | `IgnoredPaths.getIgnoredFoldersGlobChecker` (200-235) | **WITNESS** | refused:ts-strict | WITNESS |  | input 6: receiver; lib/ignored-paths.js:207 |

## What would make the asks provable

### lib/ignored-paths.js · `IgnoredPaths.getIgnoredFoldersGlobChecker`

- line 89, `ts-strict`: TS2552: Cannot find name 'array'. Did you mean 'Array'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 92, `ts-strict`: TS2339: Property 'addPattern' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 99, `ts-strict`: TS2552: Cannot find name 'array'. Did you mean 'Array'?
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 102, `ts-strict`: TS2339: Property 'ignoreFiles' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 103, `ts-strict`: TS2339: Property 'add' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 106, `ts-strict`: TS2769: No overload matches this call.   Overload 1 of 2, '(...items: ConcatArray<never>[]): never[]', gave the following error.     Argument of type 'string[]' is not assignable to parameter of type 'ConcatArray<never>'.       The types returned by 'slice(...)' are incompatible between these types.         Type 'string[]' is not assignable to type 'never[]'.           Type 'string' is not assignable to type 'never'.   Overload 2 of 2, '(...items: ConcatArray<never>[]): never[]', gave the following error.     Argument of type 'string[]' is not assignable to parameter of type 'ConcatArray<never>'.       The types returned by 'slice(...)' are incompatible between these types.         Type 'string[]' is not assignable to type 'never[]'.           Type 'string' is not assignable to type 'never'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 106, `ts-strict`: TS2339: Property 'patterns' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 107, `ts-strict`: TS2339: Property 'cwd' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.