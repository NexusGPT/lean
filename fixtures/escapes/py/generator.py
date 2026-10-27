# expect: generator
def evens(n: int) -> list[int]:
    out: list[int] = []
    for i in range(n):
        yield i * 2
    return out
