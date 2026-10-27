# expect: delete
def drop(m: dict[str, int], k: str) -> int:
    del m[k]
    return len(m)
