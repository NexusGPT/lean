# expect: finally
from typing import Protocol


class Port(Protocol):
    def close(self) -> None: ...

    def read(self) -> int: ...


def read_once(p: Port) -> int:
    try:
        return p.read()
    finally:
        p.close()
