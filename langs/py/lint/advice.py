"""What to write instead, per rule: one source for the command line, `--json` and `--agent`.

The labels are the TypeScript lint's (langs/ts/lint/advice.mjs), because a person or an agent applies a rewrite blind:
  proved:      the rewrite keeps behaviour on every input;
  conditional: it keeps behaviour when the precondition holds (one sentence a reader can check);
  migration:   it changes the meaning on some input, or there is no rewrite inside the subset; a person decides.
Every rule the lint or the translator can name has an entry here; `tests/run.py` checks that statically (the rule
names are read from the sources), so a new rule without a rewrite fails the suite.
"""

ADVICE = {
    # types
    'untyped-parameter': {'label': 'migration', 'text': 'Write the parameter\'s type hint (`x: int`, `xs: list[str]`, `p: Port` for a Protocol). The hint is the typed surface: lane B draws inputs from it and the proof reads it as the Dafny type.'},
    'untyped-return': {'label': 'migration', 'text': 'Write the return hint (`-> int`, `-> None` for a procedure).'},
    'untyped': {'label': 'migration', 'text': 'Name the type: `Any` and `object` have no reading, and an empty literal needs its element type (`xs: list[int] = []`, `d: dict[str, int] = {}`).'},
    'unsupported-type': {'label': 'migration', 'text': 'Use a type the subset reads: int, bool, str, list[T], tuple[...], dict[K, V], Optional[T], a dataclass, a Protocol or a plain class of the file.'},
    'unresolved-type': {'label': 'migration', 'text': 'Define the type in the file or in a sibling module the file imports, so its fields and methods are known; a type from a package is outside the subset.'},
    'type-test': {'label': 'migration', 'text': '`isinstance` and `type()` tests read the runtime class. Give the value one type, or use an Optional and test `is None`.'},
    'float': {'label': 'migration', 'text': 'A float has no exact reading. Keep the quantity in integer units (cents, milliseconds) and use `//` and `%`.'},
    'division': {'label': 'migration', 'text': '`/` is true division and returns a float. Write `a // b` for floor division on ints; it rounds toward negative infinity, which changes the result when the quotient is not whole.'},
    'mixed-types': {'label': 'migration', 'text': 'Keep one type per value: a bool is not a number here (`n + int(flag)` is refused too; write `n + (1 if flag else 0)`), and `+` joins two strs or adds two ints.'},
    'truthiness': {'label': 'conditional', 'precondition': 'the operand is a list, a str, a dict or an Optional, never a value with its own `__bool__` or `__len__`', 'text': 'Write the test the truthiness stands for: `len(xs) > 0` for a list, str or dict, `x is not None` for an Optional. For `a or b` on non-bools write `a if <test of a> else b`.'},
    # equality and identity
    'identity': {'label': 'conditional', 'precondition': 'the type\'s `__eq__` is the generated one of a dataclass or a built-in value type', 'text': '`is` compares object identity. Compare values with `==`, or test absence with `is None` / `is not None`.'},
    'value-equality': {'label': 'migration', 'text': 'This value has its own `__eq__`. Compare the fields you mean (`a.id == b.id`), or make it a dataclass with the generated `__eq__`.'},
    # mutation
    'param-mutation': {'label': 'migration', 'text': 'This changes what the caller handed in. Return a new value instead: `xs + [v]`, `{**d, k: v}`, `replace(r, f=v)`.'},
    'collection-mutation': {'label': 'migration', 'text': 'Build a new collection instead of changing one in place: `xs = xs + [v]`, `d = {**d, k: v}`, a comprehension for a filter.'},
    'receiver-mutation': {'label': 'migration', 'text': 'A dataclass method may not assign `self`. Return `replace(self, f=v)`; in a plain class assign the field itself (`self.f = v`), not a field of a field.'},
    'property-assign': {'label': 'migration', 'text': 'A value you do not own is immutable here. Build a new one: `replace(r, f=v)` for a dataclass.'},
    'index-assign': {'label': 'migration', 'text': 'Build a new value instead of assigning an item: `xs[:i] + [v] + xs[i + 1:]`, `{**d, k: v}`.'},
    'delete': {'label': 'migration', 'text': '`del` changes a value in place. Build the value without the item: `xs[:i] + xs[i + 1:]` for a list; for a dict, keep the key and test it where it is read.'},
    'assign-target': {'label': 'proved', 'text': 'Assign one plain name per statement: `a = v` then `b = a` for `a = b = v`.'},
    'destructuring': {'label': 'proved', 'text': 'Unpack a tuple of the same length into plain names, or index it: `a = t[0]`, `b = t[1]`.'},
    'mutable-argument': {'label': 'migration', 'text': 'The outside could keep this list or dict and change it later. Hand it a tuple (`tuple(xs)`), a frozen dataclass, or a copy the function never reads again.'},
    'mutable-result': {'label': 'migration', 'text': 'A mutable value returned by the outside may be shared with it. Declare the method to return a tuple or a frozen dataclass.'},
    'mutable-field': {'label': 'migration', 'text': 'A list or dict stored in a field of a plain class is shared with whoever holds the instance. Store a tuple or a frozen dataclass.'},
    'loop-var-assign': {'label': 'proved', 'text': 'Copy the loop variable to a new name and change that: `y = x` then `y += 1`.'},
    # dicts and strings
    'dict-order': {'label': 'migration', 'text': 'A dict is read as a map without insertion order. Iterate a list of keys you keep beside it (`for k in keys: d[k]`), or read single keys with `d[k]`, `d.get(k)` and `k in d`.'},
    'string-order': {'label': 'migration', 'text': '`<` on str is outside the subset. Compare a key you compute (`len(a) < len(b)`), or keep the strings in a list in the order you need.'},
    'string-method': {'label': 'migration', 'text': 'This str method has no reading. The exact ones are `startswith`, `endswith`, `in`, `join`, `+`, slicing; `upper`, `lower`, `strip`, `replace` and friends are read as the same unknown function on both sides.'},
    'string-format': {'label': 'migration', 'text': 'Format specs (`{x:>4}`, `%` formatting, `.format`) have no reading. Write an f-string of plain values and pad with `+`.'},
    'string-iteration': {'label': 'conditional', 'precondition': 'the loop reads only `s[i]`', 'text': 'Iterate the indices: `for i in range(len(s)): c = s[i]`.'},
    'string-code-unit': {'label': 'migration', 'text': 'A lone surrogate is not a Unicode scalar value. Use the pair it was meant to be, or bytes outside the function.'},
    # loops and control
    'unbounded-while': {'label': 'conditional', 'precondition': 'the expression is an int that is never negative at the loop head and drops on every pass', 'text': 'Write `# @decreases <expr>` on the `while` line or the line above, or rewrite the loop as `for i in range(n)`.'},
    'loop-form': {'label': 'migration', 'text': 'Loops are `for x in <list>`, `for i in range(stop)` or `range(start, stop)` and `while` with `# @decreases`. A `for ... else` is a flag set before `break`; a range step is `for j in range(n): i = start + j * step`.'},
    'break-continue': {'label': 'proved', 'text': '`break` and `continue` belong inside a loop; move the statement into the loop or return.'},
    'missing-return': {'label': 'conditional', 'precondition': 'the end of the function is reached only where `None` is the value meant', 'text': 'Return on every path; a function typed `-> T` that falls off its end returns None. Write the last `return` explicitly.'},
    'comparison-chain': {'label': 'proved', 'text': 'Bind the call to a name first, then compare: `v = f(x)` then `a < v < b`.'},
    # exceptions
    'exception-value': {'label': 'migration', 'text': 'Raise a built-in exception class with at most one argument (`raise ValueError("bad")`). A custom exception class, several arguments and `raise ... from` are outside the subset.'},
    'finally': {'label': 'migration', 'text': '`finally` runs on every exit. Repeat its statements before each return and in an `except` that re-raises.'},
    'try-else': {'label': 'proved', 'text': 'Move the `else` block after the `try` statement, behind a flag set at the end of the `try` body, or into the `try` body when it cannot raise.'},
    'assert': {'label': 'migration', 'text': '`assert` disappears under `python -O`. Write `if not cond: raise AssertionError("...")` when the check is behaviour.'},
    'with': {'label': 'migration', 'text': 'A `with` block runs `__enter__` and `__exit__`. Keep the resource handling in a caller outside the proved function and pass the value in.'},
    # functions, classes, modules
    'rest-parameters': {'label': 'migration', 'text': 'Type `*args` with its element type (`*xs: int`); `**kwargs` and keyword-only parameters are outside the subset: name the parameters.'},
    'param-form': {'label': 'migration', 'text': 'Use positional parameters with literal defaults; a call passes the parameters the function names. A default other than a literal is evaluated once at definition: default to None and fill it in the body.'},
    'spread': {'label': 'proved', 'text': 'Concatenate instead of unpacking: `xs + ys` for `[*xs, *ys]`; `{**a, **b}` takes two dicts; a starred argument goes to a `*args` parameter.'},
    'function-value': {'label': 'migration', 'text': 'A lambda or a nested function is a function value. Write a top-level function and call it, or write the loop out.'},
    'generator': {'label': 'migration', 'text': 'A generator is lazy. Return a list: `[f(x) for x in xs]` for `(f(x) for x in xs)`, append to a local list for `yield`.'},
    'async': {'label': 'migration', 'text': 'async and await are outside the subset; keep the awaiting in a caller and pass the awaited value in.'},
    'closure-mutation': {'label': 'migration', 'text': '`global` and `nonlocal` write state outside the function. Pass the value in and return the new one.'},
    'toplevel-state': {'label': 'migration', 'text': 'A module variable is a literal constant bound once. Build other values inside a function, or pass them in.'},
    'toplevel-effect': {'label': 'migration', 'text': 'A module-level statement runs on import. Move it into a function, or under `if __name__ == "__main__":`.'},
    'global-read': {'label': 'migration', 'text': 'A module value read as data has no reading. Pass it in as a parameter, or make it a literal constant of this file.'},
    'dynamic-eval': {'label': 'migration', 'text': 'Code built at run time has no reading. Replace it with explicit code whose meaning a person approves.'},
    'prototype': {'label': 'migration', 'text': 'The object model (`getattr`, `type`, `super`, `__dict__`, a metaclass) has no reading. Use the value\'s declared fields and methods.'},
    'inheritance': {'label': 'migration', 'text': 'A base class other than `Protocol` brings methods the file does not show. Compose (hold the other object in a field) or copy the methods you call.'},
    'decorator': {'label': 'migration', 'text': 'A decorator wraps the function. Keep `@dataclass` and `@staticmethod`; call the wrapper explicitly from a caller outside the proved function.'},
    'dataclass-hook': {'label': 'migration', 'text': 'A dataclass with `__post_init__`, its own `__eq__` or `__hash__`, `ClassVar`, `InitVar` or `field()` is not plain data. Do the work in a function that builds the value, with literal defaults.'},
    'class': {'label': 'migration', 'text': 'Define the class at the top level of the module.'},
    'import': {'label': 'proved', 'text': 'Import at the top of the module, by name (`from m import f`), not inside the function or with `*`.'},
    'unresolved-import': {'label': 'migration', 'text': 'The called module is not a sibling file, so its type is unknown. Declare a Protocol for what you call and take it as a parameter, or wrap the call in a sibling module with type hints.'},
    'shadowed-name': {'label': 'proved', 'text': 'Rename the local so it does not hide the function it calls.'},
    'uninitialised': {'label': 'conditional', 'precondition': 'the value given before the branch is the one the code meant on the path that did not assign', 'text': 'Assign the name before the branches (`total = 0`), so every path reaches the read with a value.'},
    # operators, calls, syntax
    'bitwise': {'label': 'migration', 'text': 'Bitwise and shift operators are outside the subset. Write the arithmetic you mean (`x % 2` for `x & 1`, `x * 2` for `x << 1`).'},
    'power': {'label': 'migration', 'text': 'Write `**` with a non-negative int literal exponent, or a loop multiplying `n` times.'},
    'slice-step': {'label': 'migration', 'text': 'A slice with a step is outside the subset. Write a loop over `range(len(xs))` that keeps `xs[i]` when `i % k == 0`.'},
    'tuple-index': {'label': 'proved', 'text': 'Index a tuple with an int literal in range, or unpack it into names.'},
    'comprehension': {'label': 'migration', 'text': 'A comprehension is one `for` over a list with at most one `if`. Write nested loops out with a local list, or iterate a list instead of a dict or str.'},
    'comprehension-effect': {'label': 'migration', 'text': 'The element and the condition of a comprehension must be pure. Write the loop out so each call to the outside is a statement in order.'},
    'list-method': {'label': 'migration', 'text': 'This list method has no reading. Use `len`, `in`, indexing, slicing, `+` and comprehensions.'},
    'unsupported-call': {'label': 'migration', 'text': 'This call has no reading; see langs/py/subset.md for the built-ins read exactly, the uninterpreted ones, and calls of units of the file.'},
    'unsupported-member': {'label': 'migration', 'text': 'This attribute is not declared on the type. Declare the field, or narrow the Optional first (`if x is not None:`).'},
    'unsupported-operator': {'label': 'migration', 'text': 'This operator has no reading on these types; see langs/py/subset.md. Repetition `s * n` is a loop joining `n` copies.'},
    'unsupported-syntax': {'label': 'migration', 'text': 'This statement form has no reading; see langs/py/subset.md for the statements the subset reads.'},
    'assignment-expression': {'label': 'proved', 'text': 'Assign first, then use the name: `n = len(xs)` then `if n > 3:` for `if (n := len(xs)) > 3:`.'},
    'match': {'label': 'proved', 'text': 'Write `match` as `if`/`elif` on the value it tests.'},
    'syntax': {'label': 'migration', 'text': 'The file does not parse as Python 3. Fix the syntax error first.'},
}


def label_tag(label, precondition=None):
    """The tag a rewrite carries in the text form: `[proved]`, `[conditional: <precondition>]`, `[migration]`."""
    return f'[{label}: {precondition}]' if label == 'conditional' and precondition else f'[{label}]'


def advise(rule):
    """(label, precondition or None, the tagged rewrite text or None). A rule without an entry suggests nothing."""
    a = ADVICE.get(rule)
    if a is None:
        return 'migration', None, None
    pre = a.get('precondition') if a['label'] == 'conditional' else None
    return a['label'], pre, f'{label_tag(a["label"], pre)} {a["text"]}'
