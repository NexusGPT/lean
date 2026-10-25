# record_update

Add an amount to an account balance and keep every other field. Every language writes it in its subset; every translator must produce the same core form (`core.dfy`).


Theorem the conformance run proves: `deposit(a, amount).id == a.id && deposit(a, amount).balance == a.balance + amount` for every account `a` and amount.
