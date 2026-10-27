# The Python subset (milestone 1)

A function inside the subset is read as mathematics: every value is a mathematical value (an int, a string, a
sequence, a map, an optional, a datatype), every call into the outside is a **transition of an explicit world**
(`ext_f(world, args): (world', result)`), and a raised exception is a **fault on the world**. The proof then means: on
every input and in every world, the parent and the candidate return the same value, make the same transitions in the
same order, and raise the same faults. `lint/lint.py` enforces the rules below; `translate/translate.py` gives them
meaning, and the two cannot disagree: the lint runs the translator on every unit and reports what it cannot read by
the rule it names, and the translator runs the lint's rules before it writes a line.

The typed surface is the type hints. A parameter without a hint, a hint the subset has no reading for, or a function
without a return hint is refused by name. Rule names are the TypeScript lint's where the construct is the same.

## What is exact

| Part | Allowed | Example |
|---|---|---|
| Types | `int` (an exact Dafny `int`; Python ints are unbounded), `bool`, `str` (a `string`: a sequence of Unicode scalar values), `None` as a return type, `TypeVar` parameters | `def first_or(xs: list[T], fallback: T) -> T` |
| Collections | `list[T]` and `Sequence[T]` as `seq<T>`, `tuple[A, B]` as a Dafny tuple, `tuple[T, ...]` as `seq<T>`, `dict[K, V]` as `map<K, V>` with a key compared by value | `xs: list[int]` |
| Optionals | `Optional[T]`, `T \| None`, `Union[T, None]` as `Option<T>` (`Optional[Optional[T]]` is one absence); `is None` / `is not None` narrow in `if`, in a conditional expression and after an early return | `x.value if x is not None else 0` |
| Dataclasses | a `@dataclass` with annotated fields and literal defaults is a datatype; construction by position or keyword; `dataclasses.replace(v, f=...)` is a field update; `==` compares fields | `replace(a, balance=a.balance + amount)` |
| Statements | assignment to a name (annotated or not), tuple unpacking of a tuple value, `+=`, `-=`, `*=` on an int or str name, `if`/`elif`/`else` (a branch join, or the continuation in each branch when a branch leaves), `return`, `pass`, `break`, `continue` | `label = "zero"` |
| Loops | `for x in <list>`, `for i in range(stop)`, `for i in range(start, stop)`, `while` with `# @decreases <expr>` on its line or the line above; a loop is a private recursive helper with that measure; a non-negative accumulator gets its invariant | `while True:  # @decreases i` |
| Expressions | `+ - *` on ints, `//` and `%` (floor division, the sign of the divisor), `**` with a non-negative int literal exponent, unary `-`, `not`, `and`/`or` on bools, comparisons (chained when pure), `in` on a list, a dict or a str, conditional expressions, f-strings of str, int and bool | `(total + size - 1) // size` |
| Comprehensions | one `for` over a list with at most one `if`, pure element and condition: a map and a filter | `[x for x in xs if x > 0]` |
| Indexing | `xs[i]` on a list or str (negative indices count from the end), `d[k]` on a dict, `t[0]` on a tuple, slices `xs[a:b]` without a step (clamped as Python clamps) | `xs[-1]` |
| Built-ins | `len`, `abs`, `min` and `max` of two ints, `sum` of a list of ints, `str` of an int or bool, `list(xs)` and `dict(d)` (copies, the same value), `d.get(k)` and `d.get(k, default)`, `str.startswith`, `str.endswith`, `sep.join(xs)` | `d.get(k, 0)` |
| Calls | a unit of the file (positional, keyword and literal defaults, `*args` typed as a list), a method of `self`, a static method, a method of a dataclass value | `sum(a, b) + sum(*rest)` |

## What is a transition of the world

| Construct | Reading |
|---|---|
| A method of a Protocol-typed value (`p.send(to, text)`), a function or static method imported from a sibling module | `ext_call_<Type>_<m>(wld, recv, args): (World, R)`, typed from the Protocol's or the module's hints |
| A field of `self` in a plain class | read `ext_<C>_get_<f>(wld, self)`, write `ext_<C>_set_<f>(wld, self, v): World`: the field lives in the world |
| Constructing a plain class of the file | `ext_alloc_Ext_<C>_World(wld)` then `<c>_constructor(wld, o, args)` |
| `print(...)` | `ext_print_string(wld, text): World` |

A unit that makes a transition, raises, may raise, or calls such a unit takes `wld: World` first and returns
`(World, R)`. Parent and candidate agree on which units take the world before the theorem is written (`--effectful`).

## What is uninterpreted

The same unknown function on both sides: `str(int)` and f-string ints (`ext_str_of_int`), `str.upper`, `lower`,
`strip`, `lstrip`, `rstrip`, `title`, `capitalize`, `casefold` and `replace` (Python's case and whitespace tables),
`int(s)` (whether `s` parses, and its value), `==` on values of a type parameter (`ext_eq`: Python's `__eq__` is the
argument's own), whether an exception matches an `except` class (`ext_exc_is_<C>`), `str(e)` of a caught exception.

## What is a fault

`raise E` and `raise E("message")` with a built-in exception class, an index out of range (`IndexError`), a missing
dict key (`KeyError`), `//` or `%` by zero (`ZeroDivisionError`), `int(s)` on a string that does not parse
(`ValueError`), and a fault coming back from a transition. Each sets the world's fault; the unit leaves at once with
`(wld, ext_fault_result_R())`, or the enclosing `try` takes it: `except C`, `except (A, B)`, `except C as e` and a bare
`except` dispatch in order, an unmatched fault is raised again, and a bare `raise` inside a handler re-raises it.

## What is refused

| Rule | Refused | Example that is refused |
|---|---|---|
| `untyped-parameter`, `untyped-return`, `untyped` | a parameter or a return without a hint; `Any`, `object`; an empty literal without an element type | `def double(x) -> int` |
| `rest-parameters` | `**kwargs`, an untyped `*args`, keyword-only parameters | `def count(**options: int)` |
| `float`, `division` | `float`, a float literal, `/` (true division) | `x * 0.5` |
| `truthiness` | a non-bool condition or `and`/`or`/`not` operand, `bool(x)` | `if xs:` |
| `mixed-types` | `bool` used as an int, two types meeting in one value, arithmetic on other types | `flag + n` |
| `identity` | `is` between two values other than `None` | `a is b` |
| `value-equality` | `==` or `in` on a value with its own `__eq__` (a Protocol, a plain class, a dataclass with `eq=False`); a dict keyed by such a value | `a == b` with `a: Port` |
| `param-mutation`, `collection-mutation`, `receiver-mutation`, `property-assign`, `index-assign`, `delete` | changing a value in place: a mutator method, `xs += ys` on a list or dict, a field or item assignment, `del`; a dataclass method assigning `self` | `tags.append(t)` |
| `mutable-argument`, `mutable-result`, `mutable-field` | a mutable value (a list, a dict, a non-frozen dataclass, or one holding these) handed to the outside, returned by it, or stored in a field of a plain class | `store.save(xs)` |
| `dict-order` | iterating a dict, `keys`, `values`, `items`, `list(d)`, a dict comprehension: a map keeps no insertion order | `for k in d:` |
| `unbounded-while`, `loop-form`, `loop-var-assign`, `string-iteration` | a `while` without `# @decreases`, a loop `else`, a `range` with a step, a condition calling out, assigning the loop variable, iterating a str | `while n > 1:` |
| `closure-mutation`, `toplevel-state`, `toplevel-effect`, `global-read` | `global`, `nonlocal`, module state other than literal constants, statements run at import, a name bound twice at module level | `global COUNT` |
| `dynamic-eval`, `prototype` | `eval`, `exec`, `compile`, `__import__`; `getattr`, `setattr`, `hasattr`, `vars`, `type`, `super`, `__class__`, `__dict__`, a metaclass | `getattr(r, field)` |
| `inheritance`, `decorator`, `dataclass-hook`, `class` | a class with a base other than `Protocol`, a decorator other than `@dataclass` and `@staticmethod`, a dataclass with `__post_init__`, `__eq__`, `__hash__`, `ClassVar`, `InitVar` or `field()`, a nested class | `class Child(Base)` |
| `generator`, `async`, `function-value` | `yield`, generator expressions, `async`/`await`, `lambda`, nested functions, `Callable` | `lambda x: x * 2` |
| `exception-value`, `finally`, `try-else`, `assert`, `with` | raising a non-built-in class or with more than one argument, `raise ... from`, `finally`, `try ... else`, `assert`, `with` | `raise Fail()` |
| `string-order`, `string-method`, `string-format`, `string-code-unit` | `<` on str, str methods outside the exact and uninterpreted lists, format specs, a lone surrogate | `a < b` with `a: str` |
| `shadowed-name`, `uninitialised` | calling a name the function binds locally; reading a name not assigned on every path | `total = 0; total(xs)` |
| `unresolved-import`, `unresolved-type` | a call into a module that is not a sibling file, a method of a type the file cannot see | `requests.get(url)` |
| `bitwise`, `power`, `slice-step`, `comprehension`, `comprehension-effect`, `list-method`, `type-test`, `unsupported-call`, `unsupported-syntax` | milestone 2 readings | `x & 1` |

Each file under `fixtures/escapes/py/` names one rule on its first line (`# expect: <rule>`); `tests/run.py` checks that
the lint refuses it by that rule and that the translator refuses it too.
