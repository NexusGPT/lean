# A signature compared by what a caller sees

The construct: a function's TypeScript signature, compared across parent and candidate before a lemma is written.
A caller passes arguments by position. A parameter's name is a binding inside the body, invisible to every caller, so
renaming it (`region` to `_region`) changes no call site and, with the body renamed with it, no behaviour.

The reading. The translator's `// SIG <unit>: <json>` line holds the compared form: the method's decorators, the
`this` type when one is declared, per position the parameter's decorators, type as written, optionality, rest-ness
and default, and the return type. The names sit in `names`, which nothing compares; the certificate still shows them.
`spec/theorem.py` reads the compared form and, when it differs, withholds the lemma with what differs in a caller's
words (`parameter 1 type number | undefined became number | null`); `check.mjs` reports that text after
`ASK:interface:`. The Dafny signatures are compared by parameter type and position: the lemma binds the parent's
names and passes them to the candidate by position, so a renamed Dafny parameter is the same signature. A heap-core
unit's hypothesis names its parameters; both sides' hypotheses are compared with each parameter replaced by its
position. Identity aliasing (a candidate function equal to the parent's is a call of it) compares the two texts with
each parameter replaced by its position, so a function renamed throughout, its loop helpers too, is equal by identity.

Example (pair `rename_parameter`, `total`): parent `total(items, rate)`, candidate `total(values, factor)`, body renamed
with them. The candidate becomes `{ total_parent(values, factor) } // identical to the parent: equal by identity`.

Soundness. Replacing a parameter by its position is a renaming of a bound name. Two texts equal after it differ only by
that renaming, provided no other token is touched: every identifier that is not a parameter is kept as written on both
sides, so a candidate name that means something else in the parent (a global, a field of the same spelling read
without a dot) makes the texts differ, never agree. A name after a dot is a field and is never replaced. Swapped names
over an unchanged body (`diff(a, b) { a - b }` against `diff(b, a) { a - b }`) map to `p0 - p1` against `p1 - p0`:
not equal, not aliased, the lemma not proved, lane B's witness stands (pair unit `diff`). A rename may also
capture: `f(a) { { const b = 1; return a + b } }` against `f(b) { { const b = 1; return b + b } }`. A renamed position
is therefore admitted only when the candidate's new name does not occur in the parent text, the parent's old name does
not occur in the candidate text, and neither side binds its name again (`var`, a name before `:=` or `=>`, a
quantifier, a match pattern); otherwise the texts must agree as written and the lemma decides (pair unit `shadow`:
not aliased, not proved, WITNESS). A field read after a dot is not an occurrence (`fieldname`, `p.b` with `a` renamed
`b`: aliased, proved). A default or a type that
mentions another parameter's name is compared as written, so a rename there stays `ASK:interface`: safe, not complete.

What stays ASK:interface: a parameter type, optionality, rest-ness, default or decorator change; a method decorator
change; a `this` type change; a return type change; a change in the parameter count (pair `signature_change`, and
`width` and `Routes.close` in `rename_parameter`).

Lane B runs real JavaScript and passes arguments by position already; it needs nothing. In `rename_parameter` it
answers PASS-bounded on every renamed unit and WITNESS on `diff`.
