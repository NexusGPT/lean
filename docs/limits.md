# What lean refuses, asks about and leaves to others, with runs

The README states each limit in a line. This page keeps the runs behind them. Every command runs from the root of this checkout. Every check ran with `--no-project --n 30 --dafny-seconds 30` unless it says otherwise; the `#` lines are read from the certificate.

## A loop with no measure

The lint admits a loop whose end it cannot show, and the translator reads the loop as one opaque step named by its text. The same loop on both sides is the same step. A changed loop is two different steps, so lane A asks and lane B bounds. A proof that cannot show a loop ends would be a false proof. To get a proof, write a counted `for` or an index walk, or put a `// @decreases` hint before the loop ([`langs/ts/subset.md`](../langs/ts/subset.md), "Proof hints").

`halvings` counts how many times `n` halves before it reaches 1 ([`docs/examples/limits/`](examples/limits/)). `halvings.next.ts` rewrites the loop's text (`m >= 2` for `m > 1`, `steps = steps + 1`). `halvings.tidy.ts` leaves the loop alone and changes only the return.

```
$ node langs/ts/check.mjs --parent docs/examples/limits/halvings.ts --candidate docs/examples/limits/halvings.next.ts --unit halvings --no-project --n 30 --dafny-seconds 30
PASS-bounded -> halvings.json      # lanes.A: ASK:unproved, Equal_halvings: false; lane B: no difference in 30 inputs
$ node langs/ts/check.mjs --parent docs/examples/limits/halvings.ts --candidate docs/examples/limits/halvings.tidy.ts --unit halvings --no-project --n 30 --dafny-seconds 30
PASS-proved -> halvings-tidy.json  # the loop is the same text: Equal_halvings: true; Dafny: 1 verified, 0 errors
```

## A changed signature

A different signature is a different function until you state the mapping. Without it lean answers `ASK:interface`, even when lane B sees the two sides differ on raw inputs, because that comparison is not a behaviour change. With the mapping declared, as a `// lean-adapter` comment on the candidate or as an `adapters` entry in the scope file, lean proves the candidate on the adapted inputs equal to the parent on the original ones. The pair is [`adapters`](../langs/ts/tests/pairs/adapters/).

```ts
// parent                                     // candidate
export function pad(x: number): number {      // lean-adapter {"from": ["x"], "to": ["x"], "map": ["Some(x)"]}
  return x + 1;                               export function pad(x: number | null): number {
}                                               if (x === null) return 0;
                                                return x + 1;
                                              }
```
```
$ node langs/ts/check.mjs --parent langs/ts/tests/pairs/adapters/parent.ts --candidate langs/ts/tests/pairs/adapters/candidate.ts --unit pad --no-project --n 30 --dafny-seconds 30
PASS-proved -> pad.json            # the adapter is in the certificate; Equal_pad: true; Dafny: 13 verified, 0 errors
$ node langs/ts/check.mjs --parent langs/ts/tests/pairs/adapters/parent.ts --candidate langs/ts/tests/pairs/adapters/candidate.ts --unit shift --no-project --n 30 --dafny-seconds 30
ASK -> shift.json                  # lanes.A: ASK:interface, no adapter declared; the reason names both ways to declare one
```

## A call into code outside the repository

A call into code lean does not read is one unknown, the same on both sides. A standard-library member is read exactly, from a table validated by run. Any other call (a package, an injected service, a module outside the repository) is a step of the world, the same for the same arguments in the parent and in the candidate. A proof therefore holds modulo the outside: if the outside answers alike when asked alike, the two versions are equal. Moving, adding or dropping such a call changes the sequence of steps, so it is never proved equal. The pair is [`heap5_outside`](../langs/ts/tests/pairs/heap5_outside/).

```
$ node langs/ts/check.mjs --parent langs/ts/tests/pairs/heap5_outside/parent.ts --candidate langs/ts/tests/pairs/heap5_outside/candidate.ts --unit cost --no-project --n 30 --dafny-seconds 30
PASS-proved -> cost.json           # price() is called once, in the same place; Equal_cost: true; Dafny: 26 verified, 0 errors
$ node langs/ts/check.mjs --parent langs/ts/tests/pairs/heap5_outside/parent.ts --candidate langs/ts/tests/pairs/heap5_outside/candidate.ts --unit order --no-project --n 30 --dafny-seconds 30
PASS-bounded -> order.json         # save() moved before price(); lanes.A: ASK:unproved, the outside may answer differently
```

`ASK` is for one case only. The two versions differ, and the only trace of the difference passes through a module lean could not load. Lean never ran that module's code, so it cannot say that a call differs from the inlined body of that call. A difference anywhere else (the returned value, a thrown error, a call to a module that loaded, the heap) stays a `WITNESS`. In [`bench_drops`](../langs/ts/tests/pairs/bench_drops/), `report` calls a helper of a module that reads a browser global when it loads, and the candidate inlines the helper's body. This one runs with the pair's own `tsconfig.json`, so it has no `--no-project`:

```
$ node langs/ts/check.mjs --parent langs/ts/tests/pairs/bench_drops/parent.tsx --candidate langs/ts/tests/pairs/bench_drops/candidate.tsx --unit report --n 30 --dafny-seconds 30
ASK -> report.json                 # lane B: unloadable module settings.ts: Cannot read properties of undefined (reading 'getItem'); the difference passes through it
```

## A prototype write

`d[k] = v` with `k` possibly `"__proto__"`, `Object.create` and `setPrototypeOf` are refused by the rule `prototype`. A `__proto__` write can change the behaviour of any object, so a proof would need the whole prototype chain as state. Write a `Map`, or `{ ...d, [k]: v }`, which makes an own key. The fixture is [`fixtures/escapes/ts/proto_write_object.ts`](../fixtures/escapes/ts/proto_write_object.ts). Lane B still runs such a function: in [`proto_write`](../langs/ts/tests/pairs/proto_write/), `mark` is a `WITNESS` on the key `"__proto__"`.

## An orchestration around a model call

The code around a model call is lean's object: retries, routing, parsing the reply, error handling, timers. The reply is an outside call, so both versions must make the same call with the same arguments, or lean witnesses the difference. In [`docs/examples/limits/`](examples/limits/), `retry.next.ts` loops `i <= tries` where `retry.ts` looped `i < tries`: one call to the model more than the caller allowed. `label`, which parses the reply, is untouched.

```
$ node langs/ts/check.mjs --parent docs/examples/limits/retry.ts --candidate docs/examples/limits/retry.next.ts --unit askUntilOk --no-project --n 30 --dafny-seconds 30
WITNESS -> retry.json              # input 0, tries is 0: the parent never calls model.complete, the candidate calls it once
$ node langs/ts/check.mjs --parent docs/examples/limits/retry.ts --candidate docs/examples/limits/retry.next.ts --unit label --no-project --n 30 --dafny-seconds 30
PASS-proved -> label.json          # Equal_label_: true; Dafny: 15 verified, 0 errors
```
