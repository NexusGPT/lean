# expect: value-equality
from typing import Protocol


class Port(Protocol):
    def name(self) -> str: ...


def same_port(a: Port, b: Port) -> bool:
    return a == b
