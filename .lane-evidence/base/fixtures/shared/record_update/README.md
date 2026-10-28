# record_update

Add an amount to an account balance and keep every other field. Every language writes it in its subset; every translator must produce the same core form (`core.dfy`).


Theorem the conformance run proves: `deposit(a, amount).id == a.id && deposit(a, amount).balance == a.balance + amount` for every account `a` and amount.

The TypeScript form copies the fields by name (`{ id: a.id, balance: ... }`), the built record of its declared fields, which is the core form's datatype update. A spread of the parameter (`{ ...a, balance: ... }`) is read as an uninterpreted copy of a value that may carry keys the type does not name, so a theorem about a field read through it waits for the record datatype that carries that rest explicitly; that form lives in the open_datatype pair.
