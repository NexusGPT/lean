# expect: receiver-mutation
from dataclasses import dataclass


@dataclass
class Counter:
    n: int

    def bump(self) -> int:
        self.n = self.n + 1
        return self.n
