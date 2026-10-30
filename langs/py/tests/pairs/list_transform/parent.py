# keep the positive elements
def positives(xs: list[int]) -> list[int]:
    return [x for x in xs if x > 0]


# every element doubled
def doubled(xs: list[int]) -> list[int]:
    return [x * 2 for x in xs]


# the sum of every element after the first
def tail_sum(xs: list[int]) -> int:
    return sum(xs[1:])
