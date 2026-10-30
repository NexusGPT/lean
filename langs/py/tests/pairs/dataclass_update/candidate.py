from dataclasses import dataclass


@dataclass(frozen=True)
class Account:
    owner: str
    balance: int


# a deposit as a new value built field by field
def deposit(a: Account, amount: int) -> Account:
    return Account(a.owner, a.balance + amount)


# the fee is now charged on a zero balance too
def charge_fee(a: Account) -> Account:
    if a.balance >= 0:
        return Account(owner=a.owner, balance=a.balance - 1)
    return a


# the comparison written the other way round
def same_owner(a: Account, b: Account) -> bool:
    return b.owner == a.owner
