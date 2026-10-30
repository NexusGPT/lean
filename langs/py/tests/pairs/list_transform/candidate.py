# the same filter, the comparison mirrored
def positives(xs: list[int]) -> list[int]:
    return [x for x in xs if 0 < x]


# the same map, written as an addition
def doubled(xs: list[int]) -> list[int]:
    return [x + x for x in xs]


# the sum minus the head: raises IndexError on an empty list, where the slice was empty
def tail_sum(xs: list[int]) -> int:
    return sum(xs) - xs[0]
