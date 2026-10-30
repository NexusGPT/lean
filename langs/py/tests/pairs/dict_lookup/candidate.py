# the same count, membership first
def count_of(d: dict[str, int], k: str) -> int:
    return d[k] if k in d else 0


# the default dropped: an absent key raises KeyError
def next_count(d: dict[str, int], k: str) -> int:
    return d[k] + 1


# the same test through get
def has_positive(d: dict[str, int], k: str) -> bool:
    return d.get(k, 0) > 0
