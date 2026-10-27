# expect: function-value
def doubled(xs: list[int]) -> list[int]:
    f = lambda x: x * 2
    return [f(x) for x in xs]
