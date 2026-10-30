# a ratio that refuses a zero divisor by name
def safe_ratio(a: int, b: int) -> int:
    if b == 0:
        raise ValueError("zero divisor")
    return a // b


# an index checked before it is read
def checked_at(xs: list[int], i: int) -> int:
    if i < 0 or i >= len(xs):
        raise IndexError("out of range")
    return xs[i]


# a parse with a fallback
def parse_or(s: str, fallback: int) -> int:
    try:
        return int(s)
    except ValueError:
        return fallback
