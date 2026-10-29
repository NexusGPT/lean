# A method of an exported object literal is a unit; a JavaScript file is listed unit by unit

The construct: `export const ops = { add(x) {...}, label: (s) => ... }`, `export default {...}`,
`module.exports = { meta, create(context) {...} }` (every ESLint rule), `exports.x = {...}`. Lean listed only
top-level functions, arrow consts and class methods, so these functions were in no census denominator and a change to
one produced no row at all. A JavaScript file without JSDoc tags was skipped whole (`skipped:not-typescript`).

## JavaScript meaning

An object literal evaluates its property definitions in order (ECMA-262 13.2.5.5); a method definition and a function
or arrow held by a property are function objects stored under the key. `ops.add(x)` reads the property and calls it
with `this` bound to `ops` (13.3.6.1, EvaluateCall: the base of the property reference is the this value); an arrow
has no own `this` (10.2.1, lexical this). `module.exports = {...}` replaces the CommonJS module's export object with
the literal; `exports.x = {...}` stores it under `x` of the existing one.

## The reading

One listing function. `common.mjs` `moduleLiterals(st)` names the literal a module statement exports or binds to a
module-level const, with its binding: `export const X` and `const X` (X), `export default` (default),
`module.exports` (exports), `exports.x` and `module.exports.x` (exports.x: the path code reaches it by, so a class or function named `x` in the same module keeps its own units). `literalMemberUnits(st)` lists its methods and its
function- or arrow-valued properties with a static key (an identifier, or a string that is one) as units named
`<binding>.<key>`. `topLevelFunctions` returns them with the other units, so the census, `pr.mjs`'s changed-unit
detection, the lint, the translator and lane B's unit spec all read the same list. A getter or setter of a literal is
not a unit (reading the key runs it: a property read, not a call), nor is a computed key; a generator member is a unit as a generator function is.

The receiver is the literal, read as a class method's receiver is read:

- `translate.mjs`: `selfType(u)` of a literal unit is the Dafny type of the literal's type; the unit takes the `self`
  operand when its code reads `this` (a nested non-arrow function binds its own `this`). A literal unit that never
  reads `this` is a plain function of its parameters, as a free function is (it may join the heap core).
- `this.f` is a field of the receiver operand. `this.m(args)` where `m` is a method of the same literal is the sibling
  unit `<binding>.m`, called with `self` when that sibling reads `this` (`ownUnit`, the class path's `this.m()`
  generalised); the call graph, the effect analysis and the heap core's planning graph (`heap.mjs` `callsOf`) see the
  same edge, so a sibling outside the heap core keeps its caller out too.
- The lint checks a literal unit like any unit, under the literal receiver's rules the lint already had for a method
  of a local literal (`literalThisRules`, extracted from the object-literal case): `this` read only as a direct scalar
  field or a sibling method, never written. Calling a sibling whose name is also a mutator's (`this.add(x)`) is a call,
  not a container mutation: that false refusal is fixed for local literals too.
- `module.exports = {...}` and `exports.x = {...}` are the CommonJS form of `export default` and `export const`: the
  lint reads them as it reads those statements (the literal's values are the module constant's initialiser), not as
  `toplevel-effect`.

```dafny
function ops_shift_candidate(self: Ext_base_number_add_..., x: int): int      // reads this.base
{ (ext_Ext_..._base_Ext_...(self) + x) }
function ops_via_sibling_candidate(self: Ext_base_number_add_..., x: int): int // this.add(x): the sibling unit
{ (ops_add_candidate(x) * 3) }
```

## JavaScript files

`pr.mjs` no longer skips a JavaScript file: it loads it in its project (allowJs and checkJs are on) and lists its
units. `common.mjs` `untypedJsUnit(sf, u)`, one predicate read by the lint's unit loop (rule `untyped-js`) and at the
head of `emitUnit`, refuses a JavaScript unit with a parameter that has neither a TypeScript annotation nor a JSDoc
type. The owner's rule: implicit any becomes an any-type proposal, so the refusal names the parameter and its advice
(`advice.mjs` `untyped-js`, conditional) points to `--any-type`. A unit whose parameters are typed by JSDoc, or which
has none, is read by the proof lane as a TypeScript unit is. Lane B runs every unit either way, so the row of a
refused unit keeps lane B's verdict. The census reads JavaScript files only with `--js`, counted apart under
`languages`, so a TypeScript census stays comparable.

## Lane B

`exec/run.mjs` `pickUnit` resolves `<binding>.<key>` on the literal itself (`exports` is the module's export object,
`default` its default export, any other binding the module const or export) and calls the member with the literal as
`this`, as `ops.add(x)` does; `unitShim` lists a module const that holds literal units. Lane B therefore runs the real
module: `ops.add` and `ops.viaSibling` WITNESS, the untouched members PASS-bounded, the changed ESLint rule `create`
WITNESS.

## Soundness

- A literal unit's claim is over every receiver of the literal's type, as a class method's is over every instance: a
  data field read through `this` is an input. A change to a data value of the literal (`base: 10` to `11`) changes no
  unit's text; it is the module constant's initialiser, as a class field initialiser is the constructor's. Lane B runs
  the real module, so where the field decides the result it sees the difference.
- A call through the binding from another unit (`ops.add(x)` in `useOps`) stays a read of the module constant, keyed
  by its initialiser's text: a changed member changes that key, so the caller is not proved (pair
  `exported_object_methods`, `useOps`).
- A sibling call reaches the sibling's own unit, so a changed sibling makes its caller unproved (`ops.viaSibling`).
  The assumption, stated as for a class: nothing reassigns the literal's method property before the call.
- An untyped JavaScript input is never given a type: the proof lane refuses the unit by name.

## Measured

`reach-gap.mjs` counts every function-like node `topLevelFunctions` does not list, by its syntactic parent, before and
after (`design/reach-gap/`). Pairs `exported_object_methods` and `exported_units_js`; the intake fixture's `plain.js`
is `refused:untyped-js`. Numbers and commands: the lane report `harness/lanes/exported-units.md` of the round's harness.
