# expect: string-iteration
def vowels(s: str) -> int:
    n = 0
    for c in s:
        if c == "a":
            n = n + 1
    return n
