# expect: rest-parameters
def count(**options: int) -> int:
    return len(options)
