# expect: with
from typing import Protocol


class Lock(Protocol):
    def __enter__(self) -> None: ...

    def __exit__(self, a: int, b: int, c: int) -> None: ...


def guarded(lock: Lock, n: int) -> int:
    with lock:
        return n + 1
