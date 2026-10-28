# lean report: 51c8cf057a56f87d0b6416006da672ea8cb48315 → 69ccd1641f7b666a3bc07585a72ff76fef791498

Identity: 3d0d5df84cfee4a9e0415392a3730fd016983d701d4a81be07e8d6cde11a85a0; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 3 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-validator.js | `validateRuleSchema` (80-97) | **WITNESS** | refused:index-assign | WITNESS |  | input 40: outcome; lib/config/config-validator.js:92 |

## What would make the asks provable

### lib/config/config-validator.js · `validateRuleSchema`

- line 84, `index-assign`: write a record field by name, or use a local Record<string, T> dictionary
  do: [migration] Only a local array changes by index. Return a new array otherwise.
- line 92, `type-assertion`: `validateRule.errors.map(
                error => `\tValue $` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.