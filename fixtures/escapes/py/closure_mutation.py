# expect: closure-mutation
COUNT = 0


def bump() -> int:
    global COUNT
    COUNT = COUNT + 1
    return COUNT
