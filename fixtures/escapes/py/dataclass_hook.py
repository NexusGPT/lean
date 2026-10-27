# expect: dataclass-hook
from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    cents: int

    def __post_init__(self) -> None:
        if self.cents < 0:
            raise ValueError("negative")


def make(c: int) -> Money:
    return Money(c)
