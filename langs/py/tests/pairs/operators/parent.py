from typing import Optional


def sum(*xs: int) -> int:
    t = 0
    for x in xs:
        t += x
    return t


def total(a: int, b: int, rest: list[int]) -> int:
    return sum(a, b) + sum(*rest)


def head_tail(xs: list[int]) -> int:
    first = xs[0] if len(xs) > 0 else 0
    others = xs[1:]
    return first + len(others)


def with_default(label: Optional[str], fallback: str) -> str:
    l = label if label is not None else fallback
    return l


def area(side: int) -> int:
    return side ** 2
