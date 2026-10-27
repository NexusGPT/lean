# expect: try-else
def parse(s: str) -> int:
    try:
        n = int(s)
    except ValueError:
        return 0
    else:
        return n
