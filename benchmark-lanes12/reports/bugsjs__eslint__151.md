# lean report: fea8fe6d25365d0e5dedbd503e8bbba5c4258f83 → 6cef6c1aa530a3cebf480ddcafb5d8f1aa0c15fc

Identity: 8ebe3e264664dbddb9a5717252b45080ab668225709e7d797e465bc44042ee40; lean 815fc01fec5f51af99003faa686f25330e7c33ad

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

## Change ledger

Edit reconciliation: 9 = 9 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| a9bacd371455ca8993bafd5a102e83680c555c40126f0f4577f97390f99e9811 | lib/ignored-paths.js | text | 127+1 | 126+0 | unit: IgnoredPaths | old:IgnoredPaths |
| 880a1e36feaaf8b9d686e135c6900c7f0bff80b5d8e0abbb98f0b776f581eb45 | lib/ignored-paths.js | text | 128+1 | 126+0 | unit: IgnoredPaths | old:IgnoredPaths |
| 11c4ca9475aaafce0b79e4b8bfbce064660e395201d8a631408a9390f8abc571 | lib/ignored-paths.js | text | 129+1 | 126+0 | unit: IgnoredPaths | old:IgnoredPaths |
| fa2f5b4bf5c64249be873144cdb40324332a7c4a907e8564276172c690d6916b | lib/ignored-paths.js | text | 130+1 | 126+0 | unit: IgnoredPaths | old:IgnoredPaths |
| e4f946349226239dd89ab9a295fc57793edf1a7d4d037e7285638fbbf6d22fe8 | lib/ignored-paths.js | text | 131+1 | 126+0 | unit: IgnoredPaths | old:IgnoredPaths |
| da11ca251efda86f1e5579b1209c62962aa683a5041287292ae6836f6891be45 | lib/ignored-paths.js | text | 161+0 | 157+1 | unit: IgnoredPaths | new:IgnoredPaths |
| 172424d8bcc6e41b728a97ffb33b42954a46aad61eb537468b8adcbcbeb4adfc | lib/ignored-paths.js | text | 161+0 | 158+1 | unit: IgnoredPaths | new:IgnoredPaths |
| 727e43d6ea98ae0b51f628dd3bd16d63e5beeceb014ac9db9ee383597d03f1b7 | lib/ignored-paths.js | text | 161+0 | 159+1 | unit: IgnoredPaths | new:IgnoredPaths |
| 1fe3ab7d320fc40a8e89db7d9967b511e51b47118245affd1660730019e4cd7f | lib/ignored-paths.js | text | 161+0 | 160+1 | unit: IgnoredPaths | new:IgnoredPaths |

source: {"unit":["a9bacd371455ca8993bafd5a102e83680c555c40126f0f4577f97390f99e9811","880a1e36feaaf8b9d686e135c6900c7f0bff80b5d8e0abbb98f0b776f581eb45","11c4ca9475aaafce0b79e4b8bfbce064660e395201d8a631408a9390f8abc571","fa2f5b4bf5c64249be873144cdb40324332a7c4a907e8564276172c690d6916b","e4f946349226239dd89ab9a295fc57793edf1a7d4d037e7285638fbbf6d22fe8","da11ca251efda86f1e5579b1209c62962aa683a5041287292ae6836f6891be45","172424d8bcc6e41b728a97ffb33b42954a46aad61eb537468b8adcbcbeb4adfc","727e43d6ea98ae0b51f628dd3bd16d63e5beeceb014ac9db9ee383597d03f1b7","1fe3ab7d320fc40a8e89db7d9967b511e51b47118245affd1660730019e4cd7f"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__151/run-FzdIAU/terminal.json