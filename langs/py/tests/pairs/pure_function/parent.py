# a distance: abs of the difference
def abs_diff(a: int, b: int) -> int:
    return abs(a - b)


# a clamp written with min and max: the lower bound wins when the bounds cross
def clamp(x: int, lo: int, hi: int) -> int:
    return max(lo, min(x, hi))


# the middle of two ints, floor division
def midpoint(a: int, b: int) -> int:
    return (a + b) // 2
