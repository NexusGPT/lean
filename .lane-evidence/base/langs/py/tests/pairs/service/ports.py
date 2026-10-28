from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass(frozen=True)
class Row:
    id: str
    n: int


class Repo(Protocol):
    def find(self, id: str) -> Optional[Row]: ...


class Audit(Protocol):
    def log(self, tag: str, who: str) -> None: ...
