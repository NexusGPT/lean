class Guard:
    def __init__(self, x: int) -> None:
        if x < 0:
            raise ValueError("bad")

    def read(self, x: int) -> int:
        if x < 0:
            raise ValueError("negative")
        return x


def build(x: int) -> int:
    try:
        Guard(x)
        return x
    except ValueError:
        return -1


def ignored_new(x: int) -> int:
    Guard(x)
    return 42


def method_call(x: int) -> int:
    try:
        g = Guard(1)
        return g.read(x)
    except ValueError:
        return -2


def ignored_method(g: Guard, x: int) -> int:
    g.read(x)
    return 42


def untouched(x: int) -> int:
    return x + 1
