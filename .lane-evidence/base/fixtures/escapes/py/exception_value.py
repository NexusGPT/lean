# expect: exception-value
class Fail:
    pass


def check(n: int) -> int:
    if n < 0:
        raise Fail()
    return n
