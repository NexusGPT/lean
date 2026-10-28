# expect: shadowed-name
def total(xs: list[int]) -> int:
    n = 0
    for x in xs:
        n = n + x
    return n


def report(xs: list[int]) -> int:
    total = 0
    return total(xs)
