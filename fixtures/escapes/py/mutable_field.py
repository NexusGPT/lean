# expect: mutable-field
class Bag:
    def __init__(self, xs: list[int]) -> None:
        self.xs = xs

    def size(self) -> int:
        return len(self.xs)
