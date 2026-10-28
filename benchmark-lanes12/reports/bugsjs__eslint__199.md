# lean report: 6f05546cb271553b9c58151738e47bf566b75bc9 → 9cf1e0b113db558d64fbb51b405010ae8210218e

Identity: 343d8af25d4583ff662111d6bf2607591b40a4cdf5a7ac71aa1c1e76af89c07f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

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

## Change ledger

Edit reconciliation: 6 = 6 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| adee80b3c5281bfd22ccd453e314033424432621e8b9378715cadc91ea398444 | lib/ignored-paths.js | text | 203+0 | 204+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 6333e3fb9e5a4c3282464535d25362c16667fc2708652679cdab99621f70e2df | lib/ignored-paths.js | text | 203+0 | 205+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |
| d79c80cdb285e5aff16bcbfa9e19ff2ce240e66d1618b1ddff9709152aa297d2 | lib/ignored-paths.js | text | 203+0 | 206+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |
| ce37aa490286ece48823ee26941162054f0ed348db203c778685e5e50474c117 | lib/ignored-paths.js | text | 203+0 | 207+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |
| a0f1bf49c7088da85f19e65f21285e1778d14d68b62b3669ea97b693041543ec | lib/ignored-paths.js | text | 203+0 | 208+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |
| e99de72b3a1f4f8fd1805c84d3eea4ab266a0cff7d1ead2d10c5d53c49a1431a | lib/ignored-paths.js | text | 203+0 | 209+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |

source: {"unit":["adee80b3c5281bfd22ccd453e314033424432621e8b9378715cadc91ea398444","6333e3fb9e5a4c3282464535d25362c16667fc2708652679cdab99621f70e2df","d79c80cdb285e5aff16bcbfa9e19ff2ce240e66d1618b1ddff9709152aa297d2","ce37aa490286ece48823ee26941162054f0ed348db203c778685e5e50474c117","a0f1bf49c7088da85f19e65f21285e1778d14d68b62b3669ea97b693041543ec","e99de72b3a1f4f8fd1805c84d3eea4ab266a0cff7d1ead2d10c5d53c49a1431a"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__199/run-M5RmSD/terminal.json