# A number that may be absent

The construct: a number the type allows to be missing (`number | null`, `number | undefined`, an optional field, a
dictionary entry), read behind a guard or `??`, and a result built from it. JavaScript: a strict test or `??` decides
the absence and a later read of a narrowed name is the number itself. A dictionary read `d[k]` of a key the object does
not own reads its prototype (ECMA-262 OrdinaryGet): `undefined` for most keys, a function for an `Object.prototype` name
(`toString`), the prototype object for `__proto__`. TypeScript types `d[k]` as `V` unless `noUncheckedIndexedAccess`
is on, so the type claims a value a missing key does not give.

## The defect reproduced

A self-contained readMechanic (a record with a `Record<string, number> | null` field, `pick` over it, `??` and guards,
a result built with shorthand fields) against itself: `ASK:translation-defect`, 6 Dafny type errors
(`expected int, found Option<int>` at `free := free`, `nth := nth`, ...). The pyka unit under its own tsconfig
(`noUncheckedIndexedAccess`): 7 (`expected real, found Option<real>`, plus pick's `var v: Option<real> := ... m[k]`).
Causes: (1) a shorthand `{ free }` resolved to the property symbol, whose type is the narrowed `number`, so the read
never unwrapped the local's stored `Option`; (2) the dictionary read typed `V | undefined` emitted the bare `V`.

## The reading

- A shorthand property reads its local (`getShorthandAssignmentValueSymbol`): the stored type is the local's
  declared one, and a narrowed read takes `.value` as any other read does.
- A loop helper that captures an Option read only where a guard before the loop narrowed it (every read of it in the
  loop has the narrowed type) requires it present; the caller proves it from its guard. Without it the helper's
  `p.value` was not well formed.
- A dictionary read typed `V | undefined` is exact: `Some(d[k])` on an owned key, None on any other key, and on an
  `Object.prototype` name `Some(ext_absent_V())`, the value the existing read gives that name.
- `typeof`, `??`, the truth test, `&&`/`||` and the null/undefined comparisons of a dictionary read typed `V` test the
  key: owned, the value; `__proto__` an object, another prototype name a function (truthy, kept by `??`); any other key
  undefined. They apply to the read itself or to a `const` binding of it in the same loop step or body whose
  dictionary and key nothing writes (no assignment, index write, delete or method call rooted at them).

```dafny
(if (if k in m.m then "number" else (if k == "__proto__" then "object"
   else if k in ObjectProtoNames_ then "function" else "undefined")) == "number" then 1 else 0)
```

## What stays out

An absence test of a `let` copy of such a read, or of a name assigned a read again: no single read stands behind it.
The unit is one uninterpreted function of its inputs keyed by its source and its same-file dependencies
(`absent_number_<hash>`, the whole-unit opacity of `numbers-bitwise-nan.md`); a changed unit is never equal to it, and
lane B decides it (PASS-bounded). The translator refuses the shape by name (`absent-number:`) if it ever reaches a
reader. No lint rule is added, so no escape fixture: the shape is admitted through opacity, as number-special is.

## Soundness

At base, `typeof d[k] === "number" ? 1 : 0` proved equal to `1`, and `d[k] ?? -1` to `d[k]` (probe `present`,
`coalesced`): the read typed `V` made the absence test a constant. Both are now unproved. A `let` copy carries no read
the tests could restate, so it is opaque rather than tested on the key. The prototype clause keeps `typeof` exact
for `toString`; a prototype name's value used as a number (`d[k] + 1`) still reads `ext_absent_V()` as before (a gap,
unchanged). The narrowed-local requires only restricts the helper: a guard Dafny cannot see makes the call unproved.

## The aliased theorem (spec/theorem.py)

In the heap core a missing key marks the world (`oob`) and an in-range lemma requires that neither side marks it.
`m[k] ? 1 : 0` and `m[k] !== 0 ? 1 : 0` translate to the same Dafny body, so the theorem aliased them and dropped that
obligation: proved, while lane B witnesses them (0 against 1 on a missing key). An aliased unit now keeps the
obligation unless the two sources agree: each in-range unit carries `// SOURCE <name>: <key>`, the hash of its text and
every same-file unit it reaches (the whole file when it reads another same-file declaration), each text with its own
parameters and locals renamed by first occurrence (as `_canon_locals` renames the Dafny side), grouping parentheses,
comments and whitespace dropped: a rename keys the same (`rename_parameter` total proves). Pair `theorem_alias`:
`truth`, `letTruth` WITNESS and unproved, `same` (one source) aliased and proved.

## Lane B
Lane B runs JavaScript; its missing-key witnesses: `entryKind` and `truth` on `{"k0": -254, "k1": 0}, "a"`.
## Instances

- `/tmp/claude-501/pyka-convert/src/engine/multibuy.ts:127` readMechanic: enters; against itself under its tsconfig
  PASS-proved (was ASK:translation-defect).
- `/tmp/claude-501/pyka-convert/src/engine/multibuy.ts:114` pick: enters (exact read, loop requires, typeof on key).
- `.../multibuy.ts:102` mechanicFields: 4 errors remain (a record literal widened into a dictionary field).
Census repos (W/census/repos):
- `langchainjs/libs/langchain-core/src/messages/base.ts:528` `typeof merged[key] === "number"`: value `any`, the Any
  reading stays.
- `nexus-learning-landing/lib/notify/nexus.ts:86` `const v = fields[key]; v === undefined`: `unknown` values, unchanged.
- `orange-checkout-automation/src/url-parser.ts:112` `const mapping = OPTION_MAP[val]; if (mapping)`: the module
  dictionary is not a steady local, so the scan makes the unit opaque (read off the code, the unit not run).
- `apps-ui/src/lib/hitTest.ts:57` `return { band, index }` with `band: number | null`: a shorthand of an Option the
  result keeps optional; the stored Option passes through unchanged.
