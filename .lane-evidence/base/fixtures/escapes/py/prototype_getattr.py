# expect: prototype
from dataclasses import dataclass


@dataclass(frozen=True)
class Row:
    a: int
    b: int


def pick(r: Row, field: str) -> int:
    return getattr(r, field)
