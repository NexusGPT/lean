# expect: dict-order
def first_key(d: dict[str, int]) -> str:
    out = ""
    for k in d:
        out = out + k
    return out
