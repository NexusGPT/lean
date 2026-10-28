def sum_of_positives(xs: list[int]) -> int:
    positives = [x for x in xs if x > 0]
    total = 0
    for x in positives:
        total = total + x
    return total
