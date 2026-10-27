# expect: truthiness
def first_or_zero(xs: list[int]) -> int:
    if xs:
        return 1
    return 0
