# the check dropped: a zero divisor now raises ZeroDivisionError, not ValueError
def safe_ratio(a: int, b: int) -> int:
    return a // b


# the same range check, as one chained comparison
def checked_at(xs: list[int], i: int) -> int:
    if not (0 <= i < len(xs)):
        raise IndexError("out of range")
    return xs[i]


# the same parse, the fallback bound first
def parse_or(s: str, fallback: int) -> int:
    result = fallback
    try:
        result = int(s)
    except ValueError:
        pass
    return result
