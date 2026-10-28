# lean report: c778676204bfbb135edaa8a12ed5958c844d9492 → 22b9bba1ad6899c232039226d3b0a69ccf02811b

Identity: a53aa0c1244837687a94112d47c3d883fa191592ef7fe276e9d9587e9ccef6fe; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/ignored-paths.js | `IgnoredPaths.contains` (178-194) | **WITNESS** | refused:ts-strict | WITNESS |  | input 0: receiver; lib/ignored-paths.js:185 |
| lib/ignored-paths.js | `IgnoredPaths.getIgnoredFoldersGlobChecker` (200-227) | **WITNESS** | refused:ts-strict | WITNESS |  | input 14: receiver; lib/ignored-paths.js:218 |

## What would make the asks provable

### lib/ignored-paths.js · `IgnoredPaths.contains`

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

Edit reconciliation: 12 = 12 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 6f20e3101bcbed5810b3e7ffb25c97ffa9b92a1b83eee3cc9e94b8cadfabc9f0 | lib/ignored-paths.js | text | 182+1 | 182+0 | unit: IgnoredPaths.contains | old:IgnoredPaths.contains |
| ab63c6558a3f39944ce6b1ab3e6abe64231a55df3b66bb762ee0ae13af725b1b | lib/ignored-paths.js | text | 182+0 | 182+1 | unit: IgnoredPaths.contains | new:IgnoredPaths.contains |
| e757bb140f0b25edd924f287177ebe9ef69c9e67881ff6fefa16ce6c8bcd4a00 | lib/ignored-paths.js | text | 216+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 79d1efe654f41cac275195c126322a3146b346ea65df0129b50c6d6b7f2cd0f6 | lib/ignored-paths.js | text | 217+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| afe0eec861eb42fb9b4d887b455ce9b86874b8e90414e8c053fdd82c1bbe69ef | lib/ignored-paths.js | text | 218+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 7bad63a9852a7cf39e2edf26dc7dfd782c958c15ffee5df978bb1af4a4c4e7b8 | lib/ignored-paths.js | text | 219+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 49680825fa1299f07ded7d2dd21f9db1c22e65a5300f736751a38000c213dcef | lib/ignored-paths.js | text | 220+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| be3dccca878444a56ef35a26b1cd19dedc10e960db3f8ac0f13dcc95f7968daa | lib/ignored-paths.js | text | 221+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| f18f6ff47b01f2a2adf7e7b78450560ff8c65afbc57c9ddf97b2f4766dac0a43 | lib/ignored-paths.js | text | 222+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 52c567e9070c8e5300da9ecbd025e60410f6a288f7d96d1f0522f1e5bd9c52ca | lib/ignored-paths.js | text | 223+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 9896b90106ea8ef6b81060a00fec15bfd680e2e735df3dbc192d0364c47c374e | lib/ignored-paths.js | text | 224+1 | 216+0 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | old:IgnoredPaths.getIgnoredFoldersGlobChecker |
| 3d00bc94d54de2c0e05900d7ef2c353b909fd48bc7e9c6b5b4a09eaaf6a2207f | lib/ignored-paths.js | text | 216+0 | 216+1 | unit: IgnoredPaths.getIgnoredFoldersGlobChecker | new:IgnoredPaths.getIgnoredFoldersGlobChecker |

source: {"unit":["6f20e3101bcbed5810b3e7ffb25c97ffa9b92a1b83eee3cc9e94b8cadfabc9f0","ab63c6558a3f39944ce6b1ab3e6abe64231a55df3b66bb762ee0ae13af725b1b","e757bb140f0b25edd924f287177ebe9ef69c9e67881ff6fefa16ce6c8bcd4a00","79d1efe654f41cac275195c126322a3146b346ea65df0129b50c6d6b7f2cd0f6","afe0eec861eb42fb9b4d887b455ce9b86874b8e90414e8c053fdd82c1bbe69ef","7bad63a9852a7cf39e2edf26dc7dfd782c958c15ffee5df978bb1af4a4c4e7b8","49680825fa1299f07ded7d2dd21f9db1c22e65a5300f736751a38000c213dcef","be3dccca878444a56ef35a26b1cd19dedc10e960db3f8ac0f13dcc95f7968daa","f18f6ff47b01f2a2adf7e7b78450560ff8c65afbc57c9ddf97b2f4766dac0a43","52c567e9070c8e5300da9ecbd025e60410f6a288f7d96d1f0522f1e5bd9c52ca","9896b90106ea8ef6b81060a00fec15bfd680e2e735df3dbc192d0364c47c374e","3d00bc94d54de2c0e05900d7ef2c353b909fd48bc7e9c6b5b4a09eaaf6a2207f"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__294/run-x5fFkO/terminal.json