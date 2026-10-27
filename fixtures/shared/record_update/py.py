from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Account:
    id: int
    balance: int


def deposit(a: Account, amount: int) -> Account:
    return replace(a, balance=a.balance + amount)
