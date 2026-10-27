# expect: loop-var-assign
def skip(n: int) -> int:
    count = 0
    for i in range(n):
        i = i + 1
        count = count + i
    return count
