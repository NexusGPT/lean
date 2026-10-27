from typing import TypeVar

T = TypeVar("T")


# generic functions: a type parameter is a value compared by its own equality
def first_or(xs: list[T], fallback: T) -> T:
    return fallback if len(xs) == 0 else xs[0]


def count_of(xs: list[T], x: T) -> int:
    n = 0
    for y in xs:
        if y == x:
            n = n + 1
    return n


def labels(xs: list[str]) -> str:
    return first_or(xs, "none") + ":" + str(count_of(xs, "a"))
