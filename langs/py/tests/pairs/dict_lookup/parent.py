# a count, zero when the key is absent
def count_of(d: dict[str, int], k: str) -> int:
    return d.get(k, 0)


# the next count for a key
def next_count(d: dict[str, int], k: str) -> int:
    return d.get(k, 0) + 1


# a key present with a positive count
def has_positive(d: dict[str, int], k: str) -> bool:
    return k in d and d[k] > 0
