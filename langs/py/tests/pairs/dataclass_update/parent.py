from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Account:
    owner: str
    balance: int


# a deposit as a field update
def deposit(a: Account, amount: int) -> Account:
    return replace(a, balance=a.balance + amount)


# a monthly fee, charged on a positive balance only
def charge_fee(a: Account) -> Account:
    if a.balance > 0:
        return replace(a, balance=a.balance - 1)
    return a


# two accounts of one owner
def same_owner(a: Account, b: Account) -> bool:
    return a.owner == b.owner
