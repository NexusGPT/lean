# expect: index-assign
def pair(a: int, b: int) -> dict[str, int]:
    d: dict[str, int] = {}
    d["a"] = a
    d["b"] = b
    return d
