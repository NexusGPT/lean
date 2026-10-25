def sum_positive(xs: list[int]) -> int:
    total = 0
    for x in xs:
        if x > 0:
            total = total + x
    return total
