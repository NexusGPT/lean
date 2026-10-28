# expect: param-mutation
def add_tag(tags: list[str], t: str) -> int:
    tags.append(t)
    return len(tags)
