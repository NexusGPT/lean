# expect: collection-mutation
def extend(xs: list[int], ys: list[int]) -> int:
    zs = xs
    zs += ys
    return len(xs)
