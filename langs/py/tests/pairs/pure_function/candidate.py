# a distance: the larger minus the smaller
def abs_diff(a: int, b: int) -> int:
    return a - b if a >= b else b - a


# a clamp written with branches: the upper bound wins when the bounds cross (lo > hi)
def clamp(x: int, lo: int, hi: int) -> int:
    if x < lo:
        return lo
    if x > hi:
        return hi
    return x


# the middle of two ints, without the sum: floor(a + (b - a) / 2) is floor((a + b) / 2)
def midpoint(a: int, b: int) -> int:
    return a + (b - a) // 2
