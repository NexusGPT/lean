# Python, milestone 1: the design note

## The construct

Python functions with type hints: top-level `def`s and methods of top-level classes, in a subset that has a reading
as mathematics (`../subset.md`), through the same theorem, prelude merge and conformance run as TypeScript.

## The readings, in one example

`def pages(total: int, size: int) -> int: return (total + size - 1) // size` may raise (a division by zero), so it
takes the world and the division is a step with a fault:

    function pages_parent(wld: World, total: int, size: int): (World, int)
    {
      var wld := ext_clear_fault_World(wld);
      var d2_ := size;
      var (wld, t1_) := if d2_ != 0 then (wld, PyFloorDiv(((total + size) - 1), d2_))
        else (ext_raise_World_Any(wld, ext_exc_ZeroDivisionError()), ext_fault_result_int());
      if ext_faulted_World(wld) then (wld, ext_fault_result_int()) else (wld, t1_)
    }

Exact: ints, strings, lists, tuples, dicts without order, optionals, dataclasses. Transition: a Protocol method, an
imported function, a field of `self` in a plain class, construction of a plain class, `print`. Uninterpreted: Unicode
case and whitespace tables, `str(int)`, `int(str)`, `==` on a type parameter, `except` class matching. Refused: the
rules of `../subset.md`, each with an escape under `fixtures/escapes/py/`.

## Soundness: the cases considered

- Floor division and modulo on negative operands: `PyFloorDiv` corrects Dafny's Euclidean `/` when the divisor is
  negative and the remainder is not zero; `PyMod` is `a - b * PyFloorDiv(a, b)`, the sign of the divisor.
- A raise discarded by later code (`len([xs[5]])` against `1`): faults live on the world and every faulting step is
  followed by a check that leaves the unit, so a fault never turns into a value.
- Two different exceptions at one point: the exception values are distinct uninterpreted constructors, and the first
  fault leaves at once, so a later raise cannot overwrite it.
- A list shared with the outside (`port.save(xs)` then `len(xs)`): refused (`mutable-argument`, `mutable-result`,
  `mutable-field`), and in-place changes are refused, so a `seq` value is what the program holds.
- Dict insertion order (`list({**a, **b})` against `list({**b, **a})`): equal maps, different lists; every operation
  that observes order is refused (`dict-order`).
- `==` with a user `__eq__`, and `==` on a type parameter: refused, or the uninterpreted `ext_eq`.
- A local name shadowing a function, a read before assignment, a reassigned loop variable: refused by name.
- A dataclass hook (`__post_init__`, `__eq__`, `field()`): refused (`dataclass-hook`).
- A proof the execution contradicts: `tests/run.py` runs lane B on every proved unit and fails the row on a witness.
  An adversarial pair of eleven subtle changes (effect order, exception class, `except` class, floor rounding, case
  mapping, `min` against `max`, an earlier raise, `is None` against `is not None`, `<` against `<=`, a dropped
  transition) left every changed lemma unproved.

## What lane B sees

Both sides in one process; recording stubs for every outside import; typed inputs from the hints (boundary first);
fake faults on one input in three, which is how the `except` paths are reached; the four observations. See
`../SEMANTICS.md`, "Lane B".

## The ten pairs, and why each is in the first ten

| Pair | Ported from | Why it is in the first ten |
|---|---|---|
| `generics` | `ts/pairs/generics` | type parameters: instantiation at a call, `==` on a type parameter |
| `recursion` | `ts/pairs/recursion` | a recursive dataclass, fuel through a loop helper, an honest not-proved |
| `statements` | `ts/pairs/statements` | an `if`/`elif` join, one effectful unit (a Protocol port), a `return` inside a loop |
| `operators` | `ts/pairs/operators` | `*args` and a starred call, indexing and slicing, an Optional fallback, `**` |
| `optional_calls` | `ts/pairs/optional_calls` | Optional receivers narrowed by `is not None`, a transition only when present |
| `exceptions_rebase` | `ts/pairs/exceptions_rebase` | `raise`, `try`/`except`, a raising constructor reaching its callers |
| `service` | `ts/pairs/service` | a plain class with fields in the world, a static method into a sibling module |
| `small_forms` | `ts/pairs/small_forms` | a dict literal, an Optional before `break`, `while` with `# @decreases`, a comprehension |
| `numbers` | `ts/pairs/numbers` (integer port) | floor division: an algebraic rewrite proved, a rounding change not |
| `try_catch` | `ts/pairs/try_catch` | faults from a port reaching a handler, `raise` inside `try`, `int(s)` |

Units of the TypeScript pairs left out, by rule: `small_forms` `clearNote` (`param-mutation`), `drop`
(`delete`), `Reg.forget` (`collection-mutation`); `operators` `headTail`'s default pattern (written as a conditional);
`statements` `firstBig`'s callback (written as a loop).

## Milestone 2 and after

Milestone 2 is the lint's rewrites, lane B's record and the conformance pairs (`milestone-2.md`). Milestone 3:
generators and async; inheritance and the exception class hierarchy; float; the heap reading of shared mutable
values (lists and dicts handed to the outside, in-place updates); dict iteration in insertion order; `finally`;
programs of several commands on one instance in lane B; the concept bench for Python.
