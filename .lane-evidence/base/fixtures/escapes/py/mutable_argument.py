# expect: mutable-argument
from typing import Protocol


class Store(Protocol):
    def save(self, xs: list[int]) -> None: ...


def save_and_count(s: Store, xs: list[int]) -> int:
    s.save(xs)
    return len(xs)
