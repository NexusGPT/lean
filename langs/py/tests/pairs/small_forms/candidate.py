from typing import Optional


# a dict literal with a computed key: the later entry wins on a clash
def build(k: str, v: int) -> dict[str, int]:
    d: dict[str, int] = {k: v, "total": v}
    return d


# an optional assigned inside a loop, then break
def first_positive(xs: list[int]) -> int:
    found: Optional[int] = None
    for x in xs:
        if x > 0:
            found = x
            break
    return found if found is not None else -1


# a loop that runs at least once, with its measure
def count_down(n: int) -> int:
    i = n
    steps = 0
    while True:  # @decreases i
        i -= 1
        steps += 2
        if i <= 0:
            break
    return steps


# a comprehension is a map over the list
def twice(xs: list[int]) -> list[int]:
    return [x * 2 for x in xs]
