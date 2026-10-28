# The in refusal follows a made prototype

The construct: `k in o` in a file that also makes an object whose prototype is not Object.prototype (`Object.create`,
`Object.setPrototypeOf`, `Reflect.setPrototypeOf`, a `__proto__:` literal member, `.__proto__ = p`, a dictionary write
`d[k] = v` whose key may be `'__proto__'` with an object or null value). `design/in-prototype.md` refused every `in` of
such a file. This reading refuses `in` only in the units such an object can reach.

## The JavaScript meaning

ECMA-262 HasProperty walks [[GetPrototypeOf]]. On a plain object `k in o` is an own key or a name of Object.prototype
(the in-prototype reading); on a made object it is an own key or a key of the new chain. A unit tells the two apart only
when a made object is the right operand of its `in`, so only a unit the object can reach needs the refusal.

## The reading

`common.mjs` `prototypeReach(checker, sf)` is a fixed point over the file, computed once and shared by the lint (`in`)
and the translator (`in`, and the absence test of a dictionary read, which keeps the own-key reading in a reached unit).
The made object reaches the unit that makes it, then follows:
- an argument of a call to a unit of the file (that unit's parameter, `has(bare(), k)`);
- a returned or yielded value (every unit calling it, `fresh()` returns `bare()`);
- a changed parameter (the caller's object: `put(d, k)` writes `d[k] = { n: 1 }`, so the caller's `d` is made);
- a module cell holding it (every unit reading the cell);
- inside a unit: bindings, assignments, destructuring, literals and closures holding it, aliases of the object a write
  changes (a local's initializers and assignments, a for-of element, a callback of a built-in), and built-in calls of
  the default library (they keep no reference beyond their receiver, arguments and result; `push`, `set`, `add`,
  `Object.assign` write the first operand; a callback receives the other operands).
A property read yields a made object only once some object holds one (a store, a literal, a built-in's result, a rest
parameter): until then a read off a made object is a plain value. A unit no path reaches keeps the in-prototype reading:

```
function known_parent(k: string): int
{ var r: OMap<string, int> := DictPut(DictPut((var m0: OMap<string, int> := OMap([], map[]); m0), "a", 1), "b", 2);
  (if var ik0_ := k; ik0_ in r.m || ik0_ in ObjectProtoNames_ then 1 else 0) }
```

## The wide rule stays (every `in` of the file refused) when the object leaves what the file can follow

- it is passed to a call the file does not read (an import, a parameter's function, an outside constructor, a super
  call): the outside may hand it back to any unit;
- it is returned by, or changes an argument of, a unit code outside the file can call (exported, a class method, a
  unit used as a value or from module code): the same;
- it is stored into a field of `this`, onto a class or function, into a caught value, a nested function's parameter
  that is not a built-in's callback, or a value the reach cannot name (an imported function's result);
- it is thrown, or handed to a rejection (`Promise.reject`, `reject`, `abort`): a handler anywhere may catch it;
- it reaches an element (`<C d={o} />`) or module code, or an exported module cell holds it;
- its new prototype may hold functions (its type is `any`, `unknown`, a type parameter, a class, has a method or an
  accessor): those functions run with the made object as `this`. Every method, accessor and non-arrow function of the
  file is then reached with `this` holding the object, and a `this` in a function outside the units is wide;
- an `in` outside every unit (module code), or a reach that does not settle.

## Soundness

A made object can be the right operand of an `in` in unit U only through a value U reads: a parameter, a call result, a
module cell, a closure capture, `this`, a caught value, or a read off one of these. Each is covered: parameters and
results by the call graph of the file's units (both directions), cells by their readers, captures and reads by the
deep rule, `this` by the function-prototype case, caught values by the throw case. Code the file does not read is the
only other source of values, and every path to it is wide. Lane B draws plain objects (never a made one), so
lane A must be sound alone. Cases checked: argument, two calls away, caller's object, module cell, Map and array
storage, `Object.assign` target, a callback of a built-in, a generator, rest arguments, a closure returned, an
exported maker, a maker used as a value, a function parameter called with it, a nested holder (`holder.inner`): all
refused (escapes `narrow_in_*.ts`, `in_prototype_maker.ts`); a maker whose object only feeds `Object.keys` or
`JSON.stringify` leaves the other units inside. It relies on the record invariant, as in-prototype does: a value typed
as a data record holds no methods.

## Instances (census repos)

- `nexus .../packages/types/scripts/generate-schema-manifest.ts`: only `main` is reached; the other units enter.
- `langchainjs/libs/langchain-core/src/utils/tiktoken.ts:14`: the module cell `cache` is read by `getEncoding` only.
- `nexus .../apps/backend/src/_common/prisma/sanitize-empty-uuid.ts:230`: `sanitizeQueryArgs` returns the made object
  to its callers outside the file: wide.
- `langchainjs/libs/langchain-core/src/prompts/chat.ts:1094`: an `any` value written under a dynamic key; its methods
  run with `this`, and `this._callWithConfig` is outside: wide.
- `langchainjs/libs/langchain-classic/src/memory/stores/entity/in_memory.ts:14`: `this.store = Object.create(null)`: wide.

## Measurement

`census.mjs`, units inside the subset, compared unit by unit on the units both runs read: nexus bench tree 23,733 to
23,734 of 26,520 (`isZodSchema` in generate-schema-manifest.ts enters); langchainjs 3,486 to 3,486 of 4,871. In every
other file with a maker the object leaves what the file can follow (an outside call, a return from an exported unit, a
prototype that may hold functions), so the wide rule stands. The lint message names the path: rule `prototype`.
