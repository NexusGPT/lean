# What "equal" means (lean-py, milestone 2)

The definition is the TypeScript one (`langs/ts/SEMANTICS.md`): one call observes its **outcome** (the returned value
or the raised exception), the **reachable state** of the arguments and the receiver after the call, the ordered
**effect trace** (each request to the outside and its answer), and **pending work**. Two versions are equal outside
the scope S when these observations agree on every input outside S and every environment history. The world axiom
holds unchanged: an effect is `effect(world, op, args) = (world', result)`, and the proof lane threads the world
through every unit that touches it. Below is what differs for Python.

## Values

- **Integers** are unbounded in Python and in Dafny: `int` is exact, no overflow, no rounding. `//` is floor division
  and `%` takes the sign of the divisor (Dafny's own `/` and `%` are Euclidean; the translator writes
  `PyFloorDiv` and `PyMod`). `bool` is a subclass of `int` in Python; the subset keeps them apart and refuses a bool
  used as a number (`mixed-types`). `float` is refused at milestone 1.
- **Strings** are sequences of code points in Python and sequences of Unicode scalar values in Dafny (`char` with
  Unicode semantics). The two agree on every string without a lone surrogate (U+D800 to U+DFFF); a literal holding
  one is refused (`string-code-unit`). Unlike TypeScript (UTF-16 code units), `len`, indexing and slicing count code
  points, so they are exact for text outside the Basic Multilingual Plane too. The exact methods are those whose
  meaning is plain sequence arithmetic (`startswith`, `endswith`, `in`, `join`, concatenation, slicing); case
  mapping and whitespace stripping depend on Unicode tables and stay uninterpreted. `<` on strings compares code
  points and is refused at milestone 1 (Dafny's `<` on sequences is the proper-prefix order).
- **None** is the one absence: `Optional[T]` is `Option<T>`, and `Optional[Optional[T]]` is `Option<T>` too. `is None`
  and `is not None` are the only uses of `is`; `x == None` is refused (`identity`): it calls `__eq__`.
- **Truthiness** is refused everywhere except on a `bool`: `if xs:`, `not s`, `a or b` on non-bools say ASK
  (`truthiness`), because they call `__bool__` or `__len__` and return an operand, not a bool.
- **Equality** `==` is exact on ints, bools, strings, `None`, and lists, tuples, dicts and optionals of these, and on
  a dataclass whose generated `__eq__` compares such fields. On a value with an `__eq__` of its own (a Protocol, a plain
  class, a dataclass with `eq=False`) it is refused (`value-equality`). On a value of a type parameter it is the
  uninterpreted `ext_eq`, the same function on both sides: the argument's own `__eq__` decides, and lean claims
  nothing about it.
- **Dicts** keep insertion order in Python and a `map` keeps none, so every operation that observes the order
  (iteration, `keys`, `values`, `items`, `list(d)`) is refused (`dict-order`). Lookup, membership, size, `get` and
  `{**a, **b}` (the right side wins) are exact. **Known gap (milestone 3):** the refusal covers the unit's own reads,
  not its caller's. A dict the unit returns (or leaves in an argument) carries an order the caller can iterate, and
  the proof does not see it: `{"a": x, "b": y}` against `{"b": y, "a": x}` is proved equal, and lane B, which keeps
  dict order in its observation, gives a WITNESS on the first input. Lane B is the faithful reading here.

## Exceptions

A raised exception is a fault on the world, read the way the TypeScript translator reads an exact `try`: the unit
leaves at once with the fault set, or the innermost `try` dispatches it to its handlers in order. Which `except` class
matches a fault is uninterpreted (`ext_exc_is_<C>`), the same on both sides; the class hierarchy is a milestone 2
reading. Operations that raise in Python are faults here: an index out of range, a missing key, a division by zero,
an `int(s)` that does not parse. A unit that may raise therefore takes the world even when it calls nothing outside.

## Values and the outside

Values in the proof lane are mathematical: a list is a `seq`. That is exact only when no one changes the list while
the function holds it. The subset refuses changing a value in place (`param-mutation`, `collection-mutation`, `del`,
item and field assignment), and refuses a mutable value crossing to the outside: handed to a transition, returned by
one, or stored in a field of a plain class (`mutable-argument`, `mutable-result`, `mutable-field`), since the outside
could keep it and change it later. The heap reading of shared mutable values is milestone 2.

## Assumptions of the model

Lane B lists each in the `assumptions` of its result; each is a place where the proof lane could otherwise be wrong:

1. The arguments of a unit are not reachable from the world: the outside holds no reference to a list or dict the
   caller passes in. (Lane B's fakes never keep one.)
2. A method of a plain class of the file is read for an instance of that exact class: a subclass defined elsewhere
   that overrides a method called through `self` is outside the model.
3. A module-level literal constant is its value: a write to it from another module is outside the model.
4. Recursion has no depth limit (a fuel, quantified over, as in TypeScript); Python's `RecursionError` is not read.

## Lane B

Both versions are imported as modules from a temporary copy, in one process. Every import that leaves the file is a
recording stub in `sys.modules`: a sibling module keeps its dataclasses and Protocols (shapes), and its functions and
plain classes become recording fakes; any other module answers `None`. Inputs come from the type hints, boundary
values first, then seeded draws; a Protocol-typed parameter is a recording fake, a parameter of a plain class of the
file is built by that side's own constructor. A fake answers from the seed and the position of the call, the same on
both sides; one input in three runs with fake faults (an exception, `FakeFault`). An input whose setup raises on a
side (a receiver's constructor) is skipped and counted, since the difference belongs to the constructor's own unit.
The observation compares the outcome, the reachable state (identities renamed in first-reach order, dict order kept),
the trace and pending work (none at milestone 1: no async, no generators). A difference is a `WITNESS` with the input;
none on n inputs is `PASS-bounded`, which states n and the seed and never becomes a proof. The record is the
TypeScript lane B's: a witness gives the input's index, the arguments as drawn, both sides' whole observations and
`where.field` (the first observation that differs); the bound gives `n`, `seed` and `ms`; `spec` gives the typed
surface. Programs of several commands on one instance (the TypeScript `programs.mjs`) are milestone 3.
