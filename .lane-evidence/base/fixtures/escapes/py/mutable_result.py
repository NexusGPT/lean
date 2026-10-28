# expect: mutable-result
from typing import Protocol


class Source(Protocol):
    def items(self) -> list[int]: ...

    def refresh(self) -> None: ...


def stale_count(s: Source) -> int:
    xs = s.items()
    s.refresh()
    return len(xs)
